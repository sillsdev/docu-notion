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

export type DocuNotionOptions = {
  notionToken: string;
  rootPage: string;
  locales: string[];
  markdownOutputPath: string;
  imgOutputPath: string;
  imgPrefixInMarkdown: string;
  statusTag: string;
};

let layoutStrategy: LayoutStrategy;
let notionToMarkdown: NotionToMarkdown;
const pages = new Array<NotionPage>();
const counts = {
  output_normally: 0,
  skipped_because_empty: 0,
  skipped_because_status: 0,
  skipped_because_level_cannot_have_content: 0,
};

export async function notionPull(options: DocuNotionOptions): Promise<void> {
  // It's helpful when troubleshooting CI secrets and environment variables to see what options actually made it to docu-notion.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const optionsForLogging = { ...options };
  // Just show the first few letters of the notion token, which start with "secret" anyhow.
  optionsForLogging.notionToken =
    optionsForLogging.notionToken.substring(0, 3) + "...";

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

  group(
    "Stage 1: walk children of the page named 'Outline', looking for pages..."
  );
  await getPagesRecursively(options, "", options.rootPage, 0, true);
  logDebug("getPagesRecursively", JSON.stringify(pages, null, 2));
  info(`Found ${pages.length} pages`);
  endGroup();
  group(
    `Stage 2: convert ${pages.length} Notion pages to markdown and save locally...`
  );
  await outputPages(options, config, pages);
  endGroup();
  group("Stage 3: clean up old files & images...");
  await layoutStrategy.cleanupOldFiles();
  await cleanupOldImages();
  endGroup();
}

async function outputPages(
  options: DocuNotionOptions,
  config: IDocuNotionConfig,
  pages: Array<NotionPage>
) {
  const context: IDocuNotionContext = {
    getBlockChildren: getBlockChildren,
    directoryContainingMarkdown: "", // this changes with each page
    relativeFilePathToFolderContainingPage: "", // this changes with each page
    layoutStrategy: layoutStrategy,
    notionToMarkdown: notionToMarkdown,
    options: options,
    pages: pages,
    counts: counts, // review will this get copied or pointed to?
  };
  for (const page of pages) {
    layoutStrategy.pageWasSeen(page);
    const mdPath = layoutStrategy.getPathForPage(page, ".md");

    // most plugins should not write to disk, but those handling image files need these paths
    context.directoryContainingMarkdown = Path.dirname(mdPath);
    // TODO: This needs clarifying: getLinkPathForPage() is about urls, but
    // downstream images.ts is using it as a file system path
    context.relativeFilePathToFolderContainingPage = Path.dirname(
      layoutStrategy.getLinkPathForPage(page)
    );

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
      const markdown = await getMarkdownForPage(config, context, page);
      writePage(page, markdown);
    }
  }

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
  const pageInfo = await pageInTheOutline.getContentInfo(r);

  if (
    !rootLevel &&
    pageInfo.hasParagraphs &&
    pageInfo.childPageIdsAndOrder.length
  ) {
    error(
      `Skipping "${pageInTheOutline.nameOrTitle}"  and its children. docu-notion does not support pages that are both levels and have content at the same time.`
    );
    ++counts.skipped_because_level_cannot_have_content;
    return;
  }
  if (!rootLevel && pageInfo.hasParagraphs) {
    pages.push(pageInTheOutline);

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
      pages.push(
        await fromPageId(
          layoutContext,
          linkPageInfo.id,
          linkPageInfo.order,
          false
        )
      );
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
  await rateLimit();

  return await notionClient.pages.retrieve({
    page_id: id,
  });
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
  let start_cursor = undefined;

  // Note: there is a now a collectPaginatedAPI() in the notion client, so
  // we could switch to using that (I don't know if it does rate limiting?)
  do {
    await rateLimit();

    const response: ListBlockChildrenResponse =
      await notionClient.blocks.children.list({
        start_cursor: start_cursor,
        block_id: id,
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
  return (overallResult?.results as BlockObjectResponse[]) ?? [];
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
