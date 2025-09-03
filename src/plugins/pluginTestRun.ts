import { Client } from "@notionhq/client";
import { GetPageResponse } from "@notionhq/client/build/src/api-endpoints";
import { NotionToMarkdown } from "notion-to-md";
import { IDocuNotionContext } from "./pluginTypes";
import { HierarchicalNamedLayoutStrategy } from "../HierarchicalNamedLayoutStrategy";
import { NotionPage } from "../NotionPage";
import { getMarkdownFromNotionBlocks } from "../transform";
import { IDocuNotionConfig } from "../config/configuration";
import { NotionBlock } from "../types";
import { convertInternalUrl } from "./internalLinks";
import { numberChildrenIfNumberedList } from "../pull";

export const kTemporaryTestDirectory = "tempTestFileDir";

export async function blocksToMarkdown(
  config: IDocuNotionConfig,
  blocks: NotionBlock[],
  pages?: NotionPage[],
  // Notes on children:
  //   - These children will apply to each block in blocks. (could enhance but not needed yet)
  //   - If you are passing in children, it is probably because your parent block has has_children=true.
  //     In that case, notion-to-md will make an API call... you'll need to set any validApiKey.
  children?: NotionBlock[],
  validApiKey?: string
): Promise<string> {
  const notionClient = new Client({
    auth: validApiKey || "unused",
  });
  const notionToMD = new NotionToMarkdown({
    notionClient,
  });

  // if (pages && pages.length) {
  //   console.log(pages[0]);
  //   console.log(pages[0].matchesLinkId);
  // }
  const docunotionContext: IDocuNotionContext = {
    notionToMarkdown: notionToMD,
    getBlockChildren: (id: string) => {
      // We call numberChildrenIfNumberedList here because the real getBlockChildren does
      if (children) numberChildrenIfNumberedList(children);

      return new Promise<NotionBlock[]>((resolve, reject) => {
        resolve(children ?? []);
      });
    },
    convertNotionLinkToLocalDocusaurusLink: (url: string) => {
      return convertInternalUrl(docunotionContext, url);
    },
    imports: [],

    //TODO might be needed for some tests, e.g. the image transformer...
    pageInfo: {
      directoryContainingMarkdown: kTemporaryTestDirectory,
      relativeFilePathToFolderContainingPage: "not yet",
      slug: "not yet",
    },
    layoutStrategy: new HierarchicalNamedLayoutStrategy(),
    options: {
      notionToken: "",
      rootPage: "",
      locales: [],
      markdownOutputPath: "",
      imgOutputPath: "",
      imgPrefixInMarkdown: "",
      statusTag: "",
    },
    pages: pages ?? [],
    counts: {
      output_normally: 0,
      skipped_because_empty: 0,
      skipped_because_status: 0,
      skipped_because_level_cannot_have_content: 0,
    },
    // enhance: this needs more thinking, how we want to do logging in tests
    // one thing is to avoid a situation where we break people's tests that
    // have come to rely on logs that we later tweak in some way.
    // log: {
    //   error: (s: string) => {
    //     error(s);
    //   },
    //   warning: (s: string) => {
    //     warning(s);
    //   },
    //   info: (s: string) => {
    //     // info(s);
    //   },
    //   verbose: (s: string) => {
    //     // verbose(s);
    //   },
    //   debug: (s: string) => {
    //     // logDebug("Testrun-TODO", s);
    //   },
    // },
  };

  if (pages && pages.length) {
    // console.log(pages[0].matchesLinkId);
    // console.log(docunotionContext.pages[0].matchesLinkId);
  }
  const r = await getMarkdownFromNotionBlocks(
    docunotionContext,
    config,
    blocks
  );
  //console.log("blocksToMarkdown", r);
  return r;
}

// This is used for things like testing links to other pages and frontmatter creation,
// when just testing what happens to individual blocks is not enough.
// after getting this, you can make changes to it, then pass it to blocksToMarkdown
export function makeSamplePageObject(options: {
  slug?: string;
  name?: string;
  id?: string;
}): NotionPage {
  let slugObject: any = {
    Slug: {
      id: "%7D%3D~K",
      type: "rich_text",
      rich_text: [],
    },
  };

  if (options.slug)
    slugObject = {
      id: "%7D%3D~K",
      type: "rich_text",
      rich_text: [
        {
          type: "text",
          text: {
            content: options.slug,
            link: null,
          },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: "default",
          },
          plain_text: options.slug,
          href: null,
        },
      ],
    };

  const id = options.id || "4a6de8c0-b90b-444b-8a7b-d534d6ec71a4";
  const m: GetPageResponse = {
    object: "page",
    id: id,
    created_time: "2022-08-08T21:07:00.000Z",
    last_edited_time: "2023-01-03T14:38:00.000Z",
    created_by: {
      object: "user",
      id: "11fb7f16-0560-4aee-ab88-ed75a850cfc4",
    },
    last_edited_by: {
      object: "user",
      id: "11fb7f16-0560-4aee-ab88-ed75a850cfc4",
    },
    cover: null,
    icon: null,
    parent: {
      type: "database_id",
      database_id: "c13f520c-06ad-41e4-a021-bdc2841ab24a",
    },
    archived: false,
    properties: {
      Keywords: {
        id: "%3F%7DLZ",
        type: "rich_text",
        rich_text: [],
      },
      Property: {
        id: "GmKE",
        type: "rich_text",
        rich_text: [],
      },
      Label: {
        id: "Phor",
        type: "multi_select",
        multi_select: [],
      },
      Status: {
        id: "oB~%3D",
        type: "select",
        select: {
          id: "1",
          name: "Ready For Review",
          color: "red",
        },
      },
      Authors: {
        id: "tA%3BF",
        type: "multi_select",
        multi_select: [],
      },
      Slug: slugObject,
      Name: {
        id: "title",
        type: "title",
        title: [
          {
            type: "text",
            text: {
              content: options.name || "Hello World",
              link: null,
            },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: options.name || "Hello World",
            href: null,
          },
        ],
      },
    },
    url: `https://www.notion.so/Hello-World-${id}`,
  };

  const p = new NotionPage({
    layoutContext: "/Second-Level/Third-Level",
    pageId: id,
    order: 0,
    metadata: m,
    foundDirectlyInOutline: false,
  });

  // console.log(p.matchesLinkId);

  return p;
}

export async function oneBlockToMarkdown(
  config: IDocuNotionConfig,
  block: Record<string, unknown>,
  targetPage?: NotionPage,
  targetPage2?: NotionPage
): Promise<string> {
  // just in case someone expects these other properties that aren't normally relevant,
  // we merge the given block properties into an actual, full block
  const fullBlock = {
    ...{
      object: "block",
      id: "937e77e5-f058-4316-9805-a538e7b4082d",
      parent: {
        type: "page_id",
        page_id: "d20d8391-b365-42cb-8821-cf3c5382c6ed",
      },
      created_time: "2023-01-13T16:33:00.000Z",
      last_edited_time: "2023-01-13T16:33:00.000Z",
      created_by: {
        object: "user",
        id: "11fb7f16-0560-4aee-ab88-ed75a850cfc4",
      },
      last_edited_by: {
        object: "user",
        id: "11fb7f16-0560-4aee-ab88-ed75a850cfc4",
      },
      has_children: false,
      archived: false,
    },
    ...block,
  };

  const dummyPage1 = makeSamplePageObject({
    slug: "dummy1",
    name: "Dummy1",
  });
  const dummyPage2 = makeSamplePageObject({
    slug: "dummy2",
    name: "Dummy2",
  });
  return await blocksToMarkdown(
    config,
    [fullBlock as NotionBlock],
    targetPage ? [dummyPage1, targetPage, targetPage2 ?? dummyPage2] : undefined
  );
}
