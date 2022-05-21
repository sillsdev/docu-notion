import * as fs from "fs-extra";

import { NotionToMarkdown } from "notion-to-md";
import { ListBlockChildrenResponse } from "@notionhq/client/build/src/api-endpoints";
import { HierarchicalNamedLayoutStrategy } from "./HierarchicalNamedLayoutStrategy";
import { LayoutStrategy } from "./LayoutStrategy";
import { initNotionClient, NotionPage, PageType } from "./NotionPage";
import {
  initImageHandling,
  processImageBlock,
  cleanupOldImages,
} from "./NotionImage";

let markdownOutputPath = "not set yet";

let currentSidebarPosition = 0;
let layoutStrategy: LayoutStrategy;
let notionToMarkdown: NotionToMarkdown;
const pages = new Array<NotionPage>();

export async function notionPull(options: any): Promise<void> {
  console.log("Notion-Pull");

  // It's helpful when troubleshooting CI secrets and environment variables to see what options actually made it to notion-pull.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const optionsForLogging = { ...options };
  // Just show the first few letters of the notion token, which start with "secret" anyhow.
  optionsForLogging.notionToken =
    (optionsForLogging.notionToken as string).substring(0, 3) + "...";
  console.log(JSON.stringify(optionsForLogging, null, 2));

  markdownOutputPath = options.markdownOutputPath;
  await initImageHandling(
    options.imgPrefixInMarkdown || options.imgOutputPath,
    options.imgOutputPath
  );

  const notionClient = initNotionClient(options.notionToken);
  notionToMarkdown = new NotionToMarkdown({ notionClient });
  layoutStrategy = new HierarchicalNamedLayoutStrategy();
  //layoutStrategy = new FlatGuidLayoutStrategy();

  layoutStrategy.setRootDirectoryForMarkdown(markdownOutputPath);
  await fs.mkdir(markdownOutputPath, { recursive: true });
  console.log("Connecting to Notion...");
  // About the complication here of getting all the pages first and then output
  // them all. It would be simpler to just do it all in one pass, however the
  // two passes are required in order to change links between
  // pages in Notion to be changed to point to the equivalent page
  // in the markdown. Unless the LayoutStrategy we're using does not
  // introduce any hierarchy in the resulting page urls, we can't
  // do this link fixing until we've already seen all the pages and
  // figured out what their eventual relative url will be.
  await getPagesRecursively("", options.rootPage, true);
  // console.log("***Pages***");
  // console.log(JSON.stringify(pages, null, 2));
  await outputPages(pages);
  await layoutStrategy.cleanupOldFiles();
  await cleanupOldImages();
}

async function outputPages(pages: Array<NotionPage>) {
  for (const page of pages) {
    await outputPage(page);
    // if (page.type === PageType.DatabasePage) await processDatabasePage(page);
    // if (page.type === PageType.Simple) await processSimplePage(page);
  }
}

// This walks the "Outline" page and creates a list of all the nodes that will
// be in the sidebar, including the directories, the pages that are linked to
// that are parented in from the "Database", and any pages we find in the
// outline that contain content (which we call "Simple" pages).
// It does not generate any files. Later, we can
// then step through this list creating the directories and files we need, and,
// crucially, be able to figure out what the url will be for any links between
// content pages.
//  FIX comment above: actually, the HierarchicalNamedLayoutStrategy does create directories.
async function getPagesRecursively(
  incomingContext: string,
  pageId: string,
  hideThisLevel: boolean
) {
  const pageInTheOutline = await NotionPage.fromPageId(incomingContext, pageId);

  console.log(
    `Reading Outline Page ${incomingContext}/${pageInTheOutline.nameOrTitle}`
  );
  const children = await pageInTheOutline.getChildren();

  // Is this an outline page that just creates a level and points to database pages?
  if (
    children &&
    children.results.some(b => "child_page" in b || "link_to_page" in b)
  ) {
    let context = incomingContext;
    // don't make a level for "Outline"
    if (!hideThisLevel && pageInTheOutline.nameOrTitle !== "Outline") {
      context = layoutStrategy.newLevel(
        markdownOutputPath,
        incomingContext,
        pageInTheOutline.nameOrTitle
      );
    }
    for (const b of children.results) {
      if ("child_page" in b) {
        await getPagesRecursively(context, b.id, false);
      } else if ("link_to_page" in b && "page_id" in b.link_to_page) {
        pages.push(
          await NotionPage.fromPageId(context, b.link_to_page.page_id)
        );
      } else {
        // skipping this block
        //console.log("skipping block:" + JSON.stringify(b, null, 2));
      }
    }
  }
  // ..or a content page sitting in the outline (unusual, but supported)
  else {
    pages.push(pageInTheOutline);
  }
}

async function outputPage(page: NotionPage) {
  const blocks = (await page.getBlockChildren()).results;

  await processBlocks(blocks);

  currentSidebarPosition++;

  console.log(`Reading Page ${page.context}/${page.nameOrTitle}`);

  if (page.type === PageType.DatabasePage && page.status !== "Publish") {
    console.log(
      `Skipping page because status is not Publish: ${page.nameOrTitle}`
    );
    return;
  }
  const path = layoutStrategy.getPathForPage(page, ".md");
  layoutStrategy.pageWasSeen(page);

  const mdBlocks = await notionToMarkdown.blocksToMarkdown(blocks);
  let mdString = "---\n";
  mdString += `title: ${page.nameOrTitle}\n`;
  mdString += `sidebar_position: ${currentSidebarPosition}\n`;
  mdString += `slug: ${page.slug ? page.slug : page.pageId}\n`;

  mdString += "---\n\n";
  mdString += notionToMarkdown.toMarkdownString(mdBlocks);

  fs.writeFileSync(path, mdString, {});
}

async function processBlocks(
  blocks: (
    | ListBlockChildrenResponse
    | /* not avail in types: BlockObjectResponse so we use any*/ any
  )[]
): Promise<void> {
  for (const b of blocks) {
    if ("image" in b) {
      await processImageBlock(b);
    }
  }
}
