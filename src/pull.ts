import * as fs from "fs-extra";

import { NotionToMarkdown } from "notion-to-md";
import { HierarchicalNamedLayoutStrategy } from "./HierarchicalNamedLayoutStrategy";
import { LayoutStrategy } from "./LayoutStrategy";
import { initNotionClient, NotionPage, PageType } from "./NotionPage";
import {
  initImageHandling,
  cleanupOldImages,
  markdownToMDImageTransformer,
} from "./images";

import { tweakForDocusaurus } from "./DocusaurusTweaks";
import { setupCustomTransformers } from "./transformers/CustomTransformers";
import * as Path from "path";
import { error, heading, info, logDebug, verbose, warning } from "./log";
import { convertInternalLinks } from "./links";
import { ListBlockChildrenResponseResult } from "notion-to-md/build/types";
import chalk from "chalk";

export type Options = {
  notionToken: string;
  rootPage: string;
  locales: string[];
  markdownOutputPath: string;
  imgOutputPath: string;
  imgPrefixInMarkdown: string;
  statusTag: string;
};

let options: Options;
let layoutStrategy: LayoutStrategy;
let notionToMarkdown: NotionToMarkdown;
const pages = new Array<NotionPage>();
const counts = {
  output_normally: 0,
  skipped_because_empty: 0,
  skipped_because_status: 0,
  skipped_because_level_cannot_have_content: 0,
};

export async function notionPull(incomingOptions: Options): Promise<void> {
  options = incomingOptions;

  // It's helpful when troubleshooting CI secrets and environment variables to see what options actually made it to docu-notion.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const optionsForLogging = { ...incomingOptions };
  // Just show the first few letters of the notion token, which start with "secret" anyhow.
  optionsForLogging.notionToken =
    optionsForLogging.notionToken.substring(0, 3) + "...";

  verbose(JSON.stringify(optionsForLogging, null, 2));
  await initImageHandling(
    options.imgPrefixInMarkdown || options.imgOutputPath || "",
    options.imgOutputPath || "",
    options.locales
  );

  const notionClient = initNotionClient(options.notionToken);
  notionToMarkdown = new NotionToMarkdown({ notionClient });
  setupCustomTransformers(notionToMarkdown, notionClient);
  layoutStrategy = new HierarchicalNamedLayoutStrategy();

  await fs.mkdir(options.markdownOutputPath, { recursive: true });
  layoutStrategy.setRootDirectoryForMarkdown(
    options.markdownOutputPath.replace(/\/+$/, "") // trim any trailing slash
  );

  info("Connecting to Notion...");

  heading(
    "Stage 1: walk children of the page named 'Outline', looking for pages..."
  );
  await getPagesRecursively("", options.rootPage, 0, true);
  logDebug("getPagesRecursively", JSON.stringify(pages, null, 2));
  info(`Found ${pages.length} pages`);
  info(``);
  heading(
    `Stage 2: convert ${pages.length} Notion pages to markdown and save locally...`
  );
  await outputPages(pages);
  info(`Finished processing ${pages.length} pages`);
  info(JSON.stringify(counts));
  info(``);
  heading("Stage 3: clean up old files & images...");
  await layoutStrategy.cleanupOldFiles();
  await cleanupOldImages();
}

async function outputPages(pages: Array<NotionPage>) {
  for (const page of pages) {
    await outputPage(page);
  }
}

// This walks the "Outline" page and creates a list of all the nodes that will
// be in the sidebar, including the directories, the pages that are linked to
// that are parented in from the "Database", and any pages we find in the
// outline that contain content (which we call "Simple" pages). Later, we can
// then step through this list creating the files we need, and, crucially, be
// able to figure out what the url will be for any links between content pages.
async function getPagesRecursively(
  incomingContext: string,
  pageIdOfThisParent: string,
  orderOfThisParent: number,
  rootLevel: boolean
) {
  const pageInTheOutline = await NotionPage.fromPageId(
    incomingContext,
    pageIdOfThisParent,
    orderOfThisParent,
    true
  );

  info(
    `Looking for children and links from ${incomingContext}/${pageInTheOutline.nameOrTitle}`
  );

  const pageInfo = await pageInTheOutline.getContentInfo();

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
    let context = incomingContext;
    // don't make a level for "Outline" page at the root
    if (!rootLevel && pageInTheOutline.nameOrTitle !== "Outline") {
      context = layoutStrategy.newLevel(
        options.markdownOutputPath,
        pageInTheOutline.order,
        incomingContext,
        pageInTheOutline.nameOrTitle
      );
    }
    for (const childPageInfo of pageInfo.childPageIdsAndOrder) {
      await getPagesRecursively(
        context,
        childPageInfo.id,
        childPageInfo.order,
        false
      );
    }

    for (const linkPageInfo of pageInfo.linksPageIdsAndOrder) {
      pages.push(
        await NotionPage.fromPageId(
          context,
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

async function outputPage(page: NotionPage) {
  if (
    page.type === PageType.DatabasePage &&
    options.statusTag != "*" &&
    page.status !== options.statusTag
  ) {
    verbose(
      `Skipping page because status is not '${options.statusTag}': ${page.nameOrTitle}`
    );
    ++counts.skipped_because_status;
    return;
  }

  info(
    `Reading & converting page ${page.context}/${
      page.nameOrTitle
    } (${chalk.blue(
      page.hasExplicitSlug
        ? page.slug
        : page.foundDirectlyInOutline
        ? "Descendant of Outline, not Database"
        : "NO SLUG"
    )})`
  );
  layoutStrategy.pageWasSeen(page);

  const mdPath = layoutStrategy.getPathForPage(page, ".md");
  const directoryContainingMarkdown = Path.dirname(mdPath);

  const blocks = (await page.getBlockChildren()).results;

  const relativePathToFolderContainingPage = Path.dirname(
    layoutStrategy.getLinkPathForPage(page)
  );
  logDebug("pull", JSON.stringify(blocks));

  // we have to set this one up for each page because we need to
  // give it two extra parameters that are context for each page
  notionToMarkdown.setCustomTransformer(
    "image",
    (block: ListBlockChildrenResponseResult) =>
      markdownToMDImageTransformer(
        block,
        directoryContainingMarkdown,
        relativePathToFolderContainingPage
      )
  );

  // One half of a horrible hack to make heading links work.
  // See the other half and explanation in CustomTransformers.ts => headingCustomTransformer.
  for (const block_t of blocks) {
    const block = block_t as any;
    if (block.type.startsWith("heading"))
      block.type = block.type.replace("heading", "my_heading");
  }

  const mdBlocks = await notionToMarkdown.blocksToMarkdown(blocks);

  // if (page.nameOrTitle.startsWith("Embed")) {
  //   console.log(JSON.stringify(blocks, null, 2));
  //   console.log(JSON.stringify(mdBlocks, null, 2));
  // }
  let frontmatter = "---\n";
  frontmatter += `title: ${page.nameOrTitle.replaceAll(":", "-")}\n`; // I have not found a way to escape colons
  frontmatter += `sidebar_position: ${page.order}\n`;
  frontmatter += `slug: ${page.slug ?? ""}\n`;
  if (page.keywords) frontmatter += `keywords: [${page.keywords}]\n`;

  frontmatter += "---\n";

  let markdown = notionToMarkdown.toMarkdownString(mdBlocks);

  // Improve: maybe this could be another markdown-to-md "custom transformer"
  markdown = convertInternalLinks(markdown, pages, layoutStrategy);

  // Improve: maybe this could be another markdown-to-md "custom transformer"
  const { body, imports } = tweakForDocusaurus(markdown);
  const output = `${frontmatter}\n${imports}\n${body}`;
  verbose(`writing ${mdPath}`);
  fs.writeFileSync(mdPath, output, {});

  ++counts.output_normally;
}
