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

import { tweakForDocusaurus } from "./DocusaurusTweaks";
import { setupCustomTransformers } from "./CustomTranformers";
import * as Path from "path";
import { error, info, verbose, warning } from "./log";

//import { FlatGuidLayoutStrategy } from "./FlatGuidLayoutStrategy";

export type Options = {
  notionToken: string;
  rootPage: string;
  markdownOutputPath: string;
  imgOutputPath: string;
  imgPrefixInMarkdown: string;
  statusTag: string;
};

let options: Options;

let currentSidebarPosition = 0;
let layoutStrategy: LayoutStrategy;
let notionToMarkdown: NotionToMarkdown;
const pages = new Array<NotionPage>();

export async function notionPull(incomingOptions: Options): Promise<void> {
  options = incomingOptions;

  // It's helpful when troubleshooting CI secrets and environment variables to see what options actually made it to notion-pull-mdx.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const optionsForLogging = { ...incomingOptions };
  // Just show the first few letters of the notion token, which start with "secret" anyhow.
  optionsForLogging.notionToken =
    optionsForLogging.notionToken.substring(0, 3) + "...";

  verbose(JSON.stringify(optionsForLogging, null, 2));
  await initImageHandling(
    options.imgPrefixInMarkdown || options.imgOutputPath || "",
    options.imgOutputPath || ""
  );

  const notionClient = initNotionClient(options.notionToken);
  notionToMarkdown = new NotionToMarkdown({ notionClient });
  setupCustomTransformers(notionToMarkdown, notionClient);
  layoutStrategy = new HierarchicalNamedLayoutStrategy();
  //layoutStrategy = new FlatGuidLayoutStrategy();

  await fs.mkdir(options.markdownOutputPath, { recursive: true });
  layoutStrategy.setRootDirectoryForMarkdown(options.markdownOutputPath);

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
  rootLevel: boolean
) {
  const pageInTheOutline = await NotionPage.fromPageId(incomingContext, pageId);

  info(
    `Reading Outline Page ${incomingContext}/${pageInTheOutline.nameOrTitle}`
  );

  const pageInfo = await pageInTheOutline.getContentInfo();

  if (!rootLevel && pageInfo.hasParagraphs && pageInfo.childPages.length) {
    error(
      `Skipping "${pageInTheOutline.nameOrTitle}"  and its children. notion-pull-mdx does not support pages that are both levels and have content at the same time.`
    );

    return;
  }
  if (!rootLevel && pageInfo.hasParagraphs) {
    pages.push(pageInTheOutline);
    if (pageInfo.linksPages)
      warning(
        `Ambiguity: The page "${pageInTheOutline.nameOrTitle}" is in the outline, has content, and also points at other pages. It will be treated as a simple content page.`
      );
  }
  // a normal outline page that exists just to create the level, pointing at database pages that belong in this level
  else if (pageInfo.childPages.length || pageInfo.linksPages.length) {
    let context = incomingContext;
    // don't make a level for "Outline" page at the root
    if (!rootLevel && pageInTheOutline.nameOrTitle !== "Outline") {
      context = layoutStrategy.newLevel(
        options.markdownOutputPath,
        incomingContext,
        pageInTheOutline.nameOrTitle
      );
    }
    for (const id of pageInfo.childPages) {
      await getPagesRecursively(context, id, false);
    }

    for (const id of pageInfo.linksPages) {
      pages.push(await NotionPage.fromPageId(context, id));
    }
  } else {
    console.info(
      warning(
        `Warning: The page "${pageInTheOutline.nameOrTitle}" is in the outline but appears to not have content, links to other pages, or child pages. It will be skipped.`
      )
    );
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
    return;
  }

  info(`Reading Page ${page.context}/${page.nameOrTitle}`);
  layoutStrategy.pageWasSeen(page);

  const mdPath = layoutStrategy.getPathForPage(page, ".md");
  const directoryContainingMarkdown = Path.dirname(mdPath);

  const blocks = (await page.getBlockChildren()).results;

  const relativePathToFolderContainingPage = Path.dirname(
    layoutStrategy.getLinkPathForPage(page)
  );
  await outputImages(
    blocks,
    directoryContainingMarkdown,
    relativePathToFolderContainingPage
  );

  currentSidebarPosition++;

  const mdBlocks = await notionToMarkdown.blocksToMarkdown(blocks);

  // if (page.nameOrTitle.startsWith("Embed")) {
  //   console.log(JSON.stringify(blocks, null, 2));
  //   console.log(JSON.stringify(mdBlocks, null, 2));
  // }
  let frontmatter = "---\n";
  frontmatter += `title: ${page.nameOrTitle.replaceAll(":", "&#58;")}\n`; // markdown can't handle the ":" here
  frontmatter += `sidebar_position: ${currentSidebarPosition}\n`;
  frontmatter += `slug: ${page.slug ?? ""}\n`;
  if (page.keywords) frontmatter += `keywords: [${page.keywords}]\n`;

  frontmatter += "---\n";

  let markdown = notionToMarkdown.toMarkdownString(mdBlocks);
  markdown = convertInternalLinks(markdown);

  const { body, imports } = tweakForDocusaurus(markdown);
  const output = `${frontmatter}\n${imports}\n${body}`;

  fs.writeFileSync(mdPath, output, {});
}

async function outputImages(
  blocks: (
    | ListBlockChildrenResponse
    | /* not avail in types: BlockObjectResponse so we use any*/ any
  )[],
  fullPathToDirectoryContainingMarkdown: string,
  relativePathToThisPage: string
): Promise<void> {
  for (const b of blocks) {
    if ("image" in b) {
      await processImageBlock(
        b,
        fullPathToDirectoryContainingMarkdown,
        relativePathToThisPage
      );
    }
  }
}

function convertInternalLinks(markdown: string): string {
  //console.log(JSON.stringify(pages, null, 2));

  return transformLinks(markdown, (url: string) => {
    const p = pages.find(p => {
      return p.matchesLinkId(url);
    });
    if (p) {
      verbose(
        `Convering Link ${url} --> ${layoutStrategy.getLinkPathForPage(p)}`
      );
      return layoutStrategy.getLinkPathForPage(p);
    }

    warning(
      `Could not find the target of this link. Note that links to outline sections are not supported. ${url}`
    );

    return url;
  });
}
// function convertInternalLinks(
//   blocks: (
//     | ListBlockChildrenResponse
//     | /* not avail in types: BlockObjectResponse so we use any*/ any
//   )[]
// ): void {
//   // Note. Waiting on https://github.com/souvikinator/notion-to-md/issues/31 before we can get at raw links to other pages.
//   // But we can do the conversion now... they just won't actually make it out to the markdown until that gets fixed.
//   // blocks
//   //   .filter((b: any) => b.type === "link_to_page")
//   //   .forEach((b: any) => {
//   //     const targetId = b.link_to_page.page_id;
//   //   });

//     blocks
//     .filter((b: any) => b.paragraph.rich_text. === "link_to_page")
//     .forEach((b: any) => {
//       const targetId = b.text.link.url;
//     });
// }

function transformLinks(input: string, transform: (url: string) => string) {
  const linkRegExp = /\[([^\]]+)?\]\(\/([^),^/]+)\)/g;
  let output = input;
  let match;

  // The key to understanding this while is that linkRegExp actually has state, and
  // it gives you a new one each time. https://stackoverflow.com/a/1520853/723299
  while ((match = linkRegExp.exec(input)) !== null) {
    const string = match[0];
    const text = match[1] || "";
    const url = match[2];

    const replacement = transform(url);

    if (replacement) {
      output = output.replace(string, `[${text}](${replacement})`);
    }
  }

  return output;
}
