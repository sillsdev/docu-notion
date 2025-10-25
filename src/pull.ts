import * as fs from "fs-extra";

import { NotionToMarkdown } from "notion-to-md";
import { HierarchicalNamedLayoutStrategy } from "./HierarchicalNamedLayoutStrategy";
import { LayoutStrategy } from "./LayoutStrategy";
import { NotionPage, PageType } from "./NotionPage";
import { initImageHandling, cleanupOldImages } from "./images";

import * as Path from "path";
import {
  endGroup,
  error,
  group,
  info,
  logDebug,
  verbose,
  warning,
} from "./log";
import { IDocuNotionContext } from "./plugins/pluginTypes";
import { getMarkdownForPage } from "./transform";
import {
  BlockObjectResponse,
  GetPageResponse,
  ListBlockChildrenResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { RateLimiter } from "limiter";
import { Client, isFullBlock } from "@notionhq/client";
import { exit } from "process";
import { IDocuNotionConfig, loadConfigAsync } from "./config/configuration";
import { NotionBlock } from "./types";
import { convertInternalUrl } from "./plugins/internalLinks";
import { ListBlockChildrenResponseResults } from "notion-to-md/build/types";
import {
  loadIncrementalState,
  saveIncrementalState,
  canDoIncrementalPull,
  createIncrementalState,
  updateIncrementalState,
  removeDeletedPagesFromState,
  IncrementalState,
  needsProcessing,
  OutlineStructure,
} from "./IncrementalState";

type ImageFileNameFormat = "default" | "content-hash" | "legacy";
export type DocuNotionOptions = {
  notionToken: string;
  rootPage: string;
  locales: string[];
  markdownOutputPath: string;
  imgOutputPath: string;
  imgPrefixInMarkdown: string;
  statusTag: string;
  requireSlugs?: boolean;
  imageFileNameFormat?: ImageFileNameFormat;
  incremental?: boolean;
};

let layoutStrategy: LayoutStrategy;
let notionToMarkdown: NotionToMarkdown;
const pages = new Array<NotionPage>();
const counts = {
  output_normally: 0,
  skipped_because_empty: 0,
  skipped_because_status: 0,
  skipped_because_level_cannot_have_content: 0,
  error_because_no_slug: 0,
};

export async function notionPull(options: DocuNotionOptions): Promise<void> {
  // It's helpful when troubleshooting CI secrets and environment variables to see what options actually made it to docu-notion.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const optionsForLogging = { ...options };
  // Just show the first few letters of the notion token, which start with "secret" anyhow.
  optionsForLogging.notionToken =
    optionsForLogging.notionToken.substring(0, 10) + "...";

  const config = await loadConfigAsync();

  verbose(`Options:${JSON.stringify(optionsForLogging, null, 2)}`);
  await initImageHandling(
    options.imgPrefixInMarkdown || options.imgOutputPath || "",
    options.imgOutputPath || "",
    options.locales
  );

  const notionClient = initNotionClient(options.notionToken);
  notionToMarkdown = new NotionToMarkdown({ notionClient });

  layoutStrategy = new HierarchicalNamedLayoutStrategy();

  await fs.mkdir(options.markdownOutputPath, { recursive: true });
  layoutStrategy.setRootDirectoryForMarkdown(
    options.markdownOutputPath.replace(/\/+$/, "") // trim any trailing slash
  );

  info("Connecting to Notion...");

  // Do a  quick test to see if we can connect to the root so that we can give a better error than just a generic "could not find page" one.
  try {
    await executeWithRateLimitAndRetries("retrieving root page", async () => {
      await notionClient.pages.retrieve({ page_id: options.rootPage });
    });
  } catch (e: any) {
    error(
      `docu-notion could not retrieve the root page from Notion. \r\na) Check that the root page id really is "${
        options.rootPage
      }".\r\nb) Check that your Notion API token (the "Integration Secret") is correct. It starts with "${
        optionsForLogging.notionToken
      }".\r\nc) Check that your root page includes your "integration" in its "connections".\r\nThis internal error message may help:\r\n    ${
        e.message as string
      }`
    );
    exit(1);
  }

  // Load state if exists
  let state: IncrementalState | null = null;
  let isIncrementalMode = false;
  const stateFile = "./docu-notion-state.json";

  if (options.incremental) {
    state = await loadIncrementalState(stateFile);
    isIncrementalMode = canDoIncrementalPull(state, {
      rootPage: options.rootPage,
      statusTag: options.statusTag,
      markdownOutputPath: options.markdownOutputPath,
    });

    if (!isIncrementalMode && state) {
      warning(
        "Cannot perform incremental pull (configuration changed). Falling back to full pull."
      );
      state = null;
    } else if (!state) {
      info(
        "No state file found. Performing full pull to initialize incremental state."
      );
    }
  }

  // Full pull: delete old state file
  if (!isIncrementalMode && (await fs.pathExists(stateFile))) {
    info(`Deleting old state file: ${stateFile}`);
    await fs.remove(stateFile);
  }

  info(isIncrementalMode ? "🔄 Incremental pull..." : "📥 Full pull...");

  // Stage 1: Discover all pages (same for both modes)
  group("Stage 1: Discovering pages...");
  await getPagesRecursively(options, "", options.rootPage, 0, true);
  logDebug("getPagesRecursively", JSON.stringify(pages, null, 2));

  // Filter to changed pages if incremental
  let pagesToProcess = pages;
  let deletedPageIds: string[] = [];

  if (isIncrementalMode && state) {
    const changeSet = detectChanges(pages, state);
    pagesToProcess = [...changeSet.newPages, ...changeSet.modifiedPages];
    deletedPageIds = changeSet.deletedPageIds;

    info(
      `Changes: ${changeSet.newPages.length} new, ${changeSet.modifiedPages.length} modified, ${deletedPageIds.length} deleted`
    );

    if (pagesToProcess.length === 0 && deletedPageIds.length === 0) {
      info("✨ No changes detected!");
      endGroup();
      return;
    }
  } else {
    info(`Found ${pages.length} pages`);
  }
  endGroup();

  // Stage 2: Convert pages to markdown (same for both modes)
  group(
    `Stage 2: Converting ${pagesToProcess.length} Notion pages to markdown...`
  );

  // Track output paths for state update
  const outputPaths = new Map<string, string>();
  for (const page of pagesToProcess) {
    layoutStrategy.pageWasSeen(page);
    const mdPath = layoutStrategy.getPathForPage(page, ".md");
    outputPaths.set(page.pageId, mdPath);
  }

  await outputPages(options, config, pagesToProcess, state);
  endGroup();

  // Stage 3: Cleanup (conditional logic)
  group("Stage 3: Cleaning up...");
  if (isIncrementalMode && state) {
    // Incremental cleanup: only remove deleted/moved files
    await cleanupDeletedFiles(state, deletedPageIds, pagesToProcess);
  } else {
    // Full cleanup: remove all orphaned files
    await layoutStrategy.cleanupOldFiles();
    await cleanupOldImages();
  }
  endGroup();

  // Always save state for next run
  info("Saving state for future incremental pulls...");
  const outlineStructure: { [pageId: string]: any } = {};

  // Build outline structure from all discovered pages (excluding deleted ones)
  const deletedPageIdSet = new Set(deletedPageIds);
  const existingPages = pages.filter(p => !deletedPageIdSet.has(p.pageId));

  for (const page of existingPages) {
    const blocks = await getBlockChildren(page.pageId);
    outlineStructure[page.pageId] = buildOutlineStructure(page.pageId, blocks);
  }

  const newState = createIncrementalState(
    {
      rootPage: options.rootPage,
      statusTag: options.statusTag,
      markdownOutputPath: options.markdownOutputPath,
    },
    pages,
    outlineStructure,
    state?.images || {} // Preserve existing image tracking
  );

  // Update state for processed pages
  if (isIncrementalMode && state) {
    updateIncrementalState(newState, pagesToProcess, outputPaths);
    removeDeletedPagesFromState(newState, deletedPageIds);
  }

  await saveIncrementalState(stateFile, newState);
  info(`✅ State saved to ${stateFile}`);
}

/**
 * Detect what has changed since the last pull
 */
function detectChanges(
  allDiscoveredPages: NotionPage[],
  state: IncrementalState
): {
  newPages: NotionPage[];
  modifiedPages: NotionPage[];
  deletedPageIds: string[];
} {
  const lastPullTime = new Date(state.lastPullTimestamp);
  const modifiedPages: NotionPage[] = [];
  const newPages: NotionPage[] = [];
  const discoveredPageIds = new Set<string>();

  // Check each discovered page
  for (const page of allDiscoveredPages) {
    discoveredPageIds.add(page.pageId);

    if (!state.pages[page.pageId]) {
      newPages.push(page);
      verbose(`New page detected: ${page.nameOrTitle}`);
    } else if (needsProcessing(page, state, lastPullTime)) {
      modifiedPages.push(page);
      verbose(`Modified page detected: ${page.nameOrTitle}`);
    }
  }

  // Detect deleted pages
  const deletedPageIds: string[] = [];
  for (const pageId in state.pages) {
    if (!discoveredPageIds.has(pageId)) {
      const pageState = state.pages[pageId];
      deletedPageIds.push(pageId);
      verbose(`Deleted page detected: ${pageState.outputPath}`);
    }
  }

  return {
    modifiedPages,
    newPages,
    deletedPageIds,
  };
}

/**
 * Clean up files for deleted or moved pages (incremental mode)
 */
async function cleanupDeletedFiles(
  state: IncrementalState,
  deletedPageIds: string[],
  processedPages: NotionPage[]
): Promise<void> {
  // Remove files for deleted pages
  for (const pageId of deletedPageIds) {
    const pageState = state.pages[pageId];
    if (pageState && pageState.outputPath) {
      if (await fs.pathExists(pageState.outputPath)) {
        verbose(`Deleting file for deleted page: ${pageState.outputPath}`);
        await fs.remove(pageState.outputPath);
      }
    }
  }

  // Remove old files for pages that moved (slug changed)
  for (const page of processedPages) {
    const oldState = state.pages[page.pageId];
    if (oldState) {
      const newPath = layoutStrategy.getPathForPage(page, ".md");
      if (oldState.outputPath !== newPath) {
        if (await fs.pathExists(oldState.outputPath)) {
          verbose(`Deleting old file after move: ${oldState.outputPath}`);
          await fs.remove(oldState.outputPath);
        }
      }
    }
  }

  // Clean up empty directories
  const dirsToCheck = new Set<string>();
  for (const pageId of deletedPageIds) {
    const pageState = state.pages[pageId];
    if (pageState?.outputPath) {
      dirsToCheck.add(Path.dirname(pageState.outputPath));
    }
  }

  for (const dir of dirsToCheck) {
    await cleanupEmptyDirectories(dir);
  }
}

/**
 * Recursively remove empty directories
 */
async function cleanupEmptyDirectories(dir: string): Promise<void> {
  if (!(await fs.pathExists(dir))) return;

  const entries = await fs.readdir(dir);
  if (entries.length === 0) {
    verbose(`Removing empty directory: ${dir}`);
    await fs.rmdir(dir);
    // Try parent directory
    const parent = Path.dirname(dir);
    if (parent !== dir) {
      await cleanupEmptyDirectories(parent);
    }
  }
}

/**
 * Build outline structure from blocks
 */
function buildOutlineStructure(
  pageId: string,
  blocks: NotionBlock[]
): OutlineStructure {
  const structure: OutlineStructure = {
    children: [],
    links: [],
  };

  for (const block of blocks) {
    if ((block as any).type === "child_page") {
      structure.children.push((block as any).id);
    } else if ((block as any).type === "link_to_page") {
      const linkTo = (block as any).link_to_page;
      if (linkTo.type === "page_id") {
        structure.links.push(linkTo.page_id as string);
      }
    }
  }

  return structure;
}

async function outputPages(
  options: DocuNotionOptions,
  config: IDocuNotionConfig,
  pages: Array<NotionPage>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _state: IncrementalState | null = null // Will be used for image checking in future
) {
  const context: IDocuNotionContext = {
    getBlockChildren: getBlockChildren,
    // this changes with each page
    pageInfo: {
      directoryContainingMarkdown: "",
      relativeFilePathToFolderContainingPage: "",
      slug: "",
    },
    layoutStrategy: layoutStrategy,
    notionToMarkdown: notionToMarkdown,
    options: options,
    pages: pages,
    counts: counts, // review will this get copied or pointed to?
    imports: [],
    convertNotionLinkToLocalDocusaurusLink: (url: string) =>
      convertInternalUrl(context, url),
  };
  for (const page of pages) {
    layoutStrategy.pageWasSeen(page);
    const mdPath = layoutStrategy.getPathForPage(page, ".md");

    // most plugins should not write to disk, but those handling image files need these paths
    context.pageInfo.directoryContainingMarkdown = Path.dirname(mdPath);
    // TODO: This needs clarifying: getLinkPathForPage() is about urls, but
    // downstream images.ts is using it as a file system path
    context.pageInfo.relativeFilePathToFolderContainingPage = Path.dirname(
      layoutStrategy.getLinkPathForPage(page)
    );
    context.pageInfo.slug = page.slug;

    if (
      page.type === PageType.DatabasePage &&
      context.options.statusTag != "*" &&
      page.status !== context.options.statusTag
    ) {
      verbose(
        `Skipping page because status is not '${context.options.statusTag}': ${page.nameOrTitle}`
      );
      ++context.counts.skipped_because_status;
    } else {
      if (options.requireSlugs && !page.hasExplicitSlug) {
        error(
          `Page "${page.nameOrTitle}" is missing a required slug. (--require-slugs is set.)`
        );
        ++counts.error_because_no_slug;
      }

      const markdown = await getMarkdownForPage(config, context, page);
      writePage(page, markdown);
    }
  }

  if (counts.error_because_no_slug > 0) exit(1);

  info(`Finished processing ${pages.length} pages`);
  info(JSON.stringify(counts));
}

// This walks the "Outline" page and creates a list of all the nodes that will
// be in the sidebar, including the directories, the pages that are linked to
// that are parented in from the "Database", and any pages we find in the
// outline that contain content (which we call "Simple" pages). Later, we can
// then step through this list creating the files we need, and, crucially, be
// able to figure out what the url will be for any links between content pages.
async function getPagesRecursively(
  options: DocuNotionOptions,
  incomingContext: string,
  pageIdOfThisParent: string,
  orderOfThisParent: number,
  rootLevel: boolean
) {
  const pageInTheOutline = await fromPageId(
    incomingContext,
    pageIdOfThisParent,
    orderOfThisParent,
    true
  );

  info(
    `Looking for children and links from ${incomingContext}/${pageInTheOutline.nameOrTitle}`
  );

  const r = await getBlockChildren(pageInTheOutline.pageId);
  const pageInfo = pageInTheOutline.getContentInfo(r);

  if (
    !rootLevel &&
    pageInfo.hasParagraphs &&
    pageInfo.childPageIdsAndOrder.length
  ) {
    error(
      `Skipping "${pageInTheOutline.nameOrTitle}"  and its children. docu-notion does not support pages that are both levels and have text content (paragraphs) at the same time. Normally outline pages should just be composed of 1) links to other pages and 2) child pages (other levels of the outline). Note that @-mention style links appear as text paragraphs to docu-notion so must not be used to form the outline.`
    );
    ++counts.skipped_because_level_cannot_have_content;
    return;
  }
  if (!rootLevel && pageInfo.hasParagraphs) {
    // Check if this page was already added to avoid duplicates
    if (!pages.some(p => p.pageId === pageInTheOutline.pageId)) {
      pages.push(pageInTheOutline);
    }

    // The best practice is to keep content pages in the "database" (e.g. kanban board), but we do allow people to make pages in the outline directly.
    // So how can we tell the difference between a page that is supposed to be content and one that is meant to form the sidebar? If it
    // has only links, then it's a page for forming the sidebar. If it has contents and no links, then it's a content page. But what if
    // it has both? Well then we assume it's a content page.
    if (pageInfo.linksPageIdsAndOrder?.length) {
      warning(
        `Note: The page "${pageInTheOutline.nameOrTitle}" is in the outline, has content, and also points at other pages. It will be treated as a simple content page. This is no problem, unless you intended to have all your content pages in the database (kanban workflow) section.`
      );
    }
  }
  // a normal outline page that exists just to create the level, pointing at database pages that belong in this level
  else if (
    pageInfo.childPageIdsAndOrder.length ||
    pageInfo.linksPageIdsAndOrder.length
  ) {
    let layoutContext = incomingContext;
    // don't make a level for "Outline" page at the root
    if (!rootLevel && pageInTheOutline.nameOrTitle !== "Outline") {
      layoutContext = layoutStrategy.newLevel(
        options.markdownOutputPath,
        pageInTheOutline.order,
        incomingContext,
        pageInTheOutline.nameOrTitle
      );
    }
    for (const childPageInfo of pageInfo.childPageIdsAndOrder) {
      await getPagesRecursively(
        options,
        layoutContext,
        childPageInfo.id,
        childPageInfo.order,
        false
      );
    }

    for (const linkPageInfo of pageInfo.linksPageIdsAndOrder) {
      const linkedPage = await fromPageId(
        layoutContext,
        linkPageInfo.id,
        linkPageInfo.order,
        false
      );
      // Check if this page was already added to avoid duplicates
      if (!pages.some(p => p.pageId === linkedPage.pageId)) {
        pages.push(linkedPage);
      }
    }
  } else {
    console.info(
      warning(
        `Warning: The page "${pageInTheOutline.nameOrTitle}" is in the outline but appears to not have content, links to other pages, or child pages. It will be skipped.`
      )
    );
    ++counts.skipped_because_empty;
  }
}

function writePage(page: NotionPage, finalMarkdown: string) {
  const mdPath = layoutStrategy.getPathForPage(page, ".md");
  verbose(`writing ${mdPath}`);
  fs.writeFileSync(mdPath, finalMarkdown, {});
  ++counts.output_normally;
}

const notionLimiter = new RateLimiter({
  tokensPerInterval: 3,
  interval: "second",
});

let notionClient: Client;

async function getPageMetadata(id: string): Promise<GetPageResponse> {
  return await executeWithRateLimitAndRetries(`pages.retrieve(${id})`, () => {
    return notionClient.pages.retrieve({
      page_id: id,
    });
  });
}

// While everything works fine locally, on Github Actions we are getting a lot of timeouts, so
// we're trying this extra retry-able wrapper.
export async function executeWithRateLimitAndRetries<T>(
  label: string,
  asyncFunction: () => Promise<T>
): Promise<T> {
  await rateLimit();
  const kRetries = 10;
  let lastException = undefined;
  for (let i = 0; i < kRetries; i++) {
    try {
      return await asyncFunction();
    } catch (e: any) {
      lastException = e;
      if (
        e?.code === "notionhq_client_request_timeout" ||
        e.message.includes("timeout") ||
        e.message.includes("Timeout") ||
        e.message.includes("limit") ||
        e.message.includes("Limit") ||
        e?.code === "notionhq_client_response_error" ||
        e?.code === "service_unavailable"
      ) {
        const secondsToWait = i + 1;
        warning(
          `While doing "${label}", got error "${
            e.message as string
          }". Will retry after ${secondsToWait}s...`
        );
        await new Promise(resolve => setTimeout(resolve, 1000 * secondsToWait));
      } else {
        throw e;
      }
    }
  }

  error(`Error: could not complete "${label}" after ${kRetries} retries.`);
  throw lastException;
}

async function rateLimit() {
  if (notionLimiter.getTokensRemaining() < 1) {
    logDebug("rateLimit", "*** delaying for rate limit");
  }
  await notionLimiter.removeTokens(1);
}

async function getBlockChildren(id: string): Promise<NotionBlock[]> {
  // we can only get so many responses per call, so we set this to
  // the first response we get, then keep adding to its array of blocks
  // with each subsequent response
  let overallResult: ListBlockChildrenResponse | undefined = undefined;
  let start_cursor: string | undefined | null = undefined;

  // Note: there is a now a collectPaginatedAPI() in the notion client, so
  // we could switch to using that (I don't know if it does rate limiting?)
  do {
    const response: ListBlockChildrenResponse =
      await executeWithRateLimitAndRetries(`getBlockChildren(${id})`, () => {
        return notionClient.blocks.children.list({
          start_cursor: start_cursor as string | undefined,
          block_id: id,
        });
      });

    if (!overallResult) {
      overallResult = response;
    } else {
      overallResult.results.push(...response.results);
    }

    start_cursor = response?.next_cursor;
  } while (start_cursor != null);

  if (overallResult?.results?.some(b => !isFullBlock(b))) {
    error(
      `The Notion API returned some blocks that were not full blocks. docu-notion does not handle this yet. Please report it.`
    );
    exit(1);
  }

  const result = (overallResult?.results as BlockObjectResponse[]) ?? [];
  numberChildrenIfNumberedList(result);
  return result;
}
export function initNotionClient(notionToken: string): Client {
  notionClient = new Client({
    auth: notionToken,
  });
  return notionClient;
}
async function fromPageId(
  context: string,
  pageId: string,
  order: number,
  foundDirectlyInOutline: boolean
): Promise<NotionPage> {
  const metadata = await getPageMetadata(pageId);

  //logDebug("notion metadata", JSON.stringify(metadata));
  return new NotionPage({
    layoutContext: context,
    pageId,
    order,
    metadata,
    foundDirectlyInOutline,
  });
}

// This function is copied (and renamed from modifyNumberedListObject) from notion-to-md.
// They always run it on the results of their getBlockChildren.
// When we use our own getBlockChildren, we need to run it too.
export function numberChildrenIfNumberedList(
  blocks: ListBlockChildrenResponseResults
): void {
  let numberedListIndex = 0;

  for (const block of blocks) {
    if ("type" in block && block.type === "numbered_list_item") {
      // add numbers
      // @ts-ignore
      block.numbered_list_item.number = ++numberedListIndex;
    } else {
      numberedListIndex = 0;
    }
  }
}
