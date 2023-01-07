import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import { ListBlockChildrenResponseResults } from "notion-to-md/build/types";
import {
  IDocuNotionConfig,
  IDocuNotionContext,
  NotionBlock,
} from "./config/configuration";
import { getMarkdownStringFromNotionBlocks } from "./transform";

export async function convertBlocks(
  config: IDocuNotionConfig,
  blocks: Array<NotionBlock>
): Promise<string> {
  const notionClient = new Client({ auth: "foo" });
  const notionToMD = new NotionToMarkdown({ notionClient });

  const docunotionContext: IDocuNotionContext = {
    notionToMarkdown: notionToMD,
    // TODO when does this actually need to do get some children?
    // We can add a children argument to this method, but for the tests
    // I have so far, it's not needed.
    getBlockChildren: (id: string) => {
      return new Promise<ListBlockChildrenResponseResults>(
        (resolve, reject) => {
          resolve([]);
        }
      );
    },
    //TODO might be needed for some tests, e.g. the image transformer...
    directoryContainingMarkdown: "not yet",
    relativePathToFolderContainingPage: "not yet",
  };
  return getMarkdownStringFromNotionBlocks(docunotionContext, config, blocks);
}
