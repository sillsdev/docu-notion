import { NotionToMarkdown } from "notion-to-md";
import { ListBlockChildrenResponseResult } from "notion-to-md/build/types";
import { IPlugin, NotionBlock } from "../config/configuration";

export async function headingTransformer(
  notionToMarkdown: NotionToMarkdown,
  block: ListBlockChildrenResponseResult
): Promise<string> {
  (block as any).type = (block as any).type.replace("my_", "");

  const unmodifiedMarkdown = await notionToMarkdown.blockToMarkdown(block);
  // For some reason, inline links come in without the dashes, so we have to strip
  // dashes here to match them.
  const blockIdSansDashes = block.id.replaceAll("-", "");
  // To make heading links work in docusaurus, you make them look like:
  //  ### Hello World {#my-explicit-id}
  // See https://docusaurus.io/docs/markdown-features/toc#heading-ids.
  return `${unmodifiedMarkdown} {#${blockIdSansDashes}}`;
}

export const standardHeadingTransformer: IPlugin = {
  name: "standardHeadingTransformer",

  // AP wrote: We have to do this because if
  // we simply set a custom transformer to heading_n, it will keep
  // recursively calling this code, with blockToMarkdown using the custom transformer
  // over and over. Instead, we want blockToMarkdown to give us the normal
  // result, to which we will append the block ID to enable heading links.
  notionBlockModifications: [
    {
      label: "headingTransformer",
      modify: (blocks: NotionBlock[]) => {
        blocks.forEach(
          block =>
            // "as any" needed because we're putting a value in that is not allowed by the real type
            ((block as any).type = block.type.replace("heading", "my_heading"))
        );
      },
    },
  ],
  // then convert those later
  notionToMarkdownTransforms: [
    {
      type: "my_heading_1",
      getStringFromBlock: (context, block) =>
        headingTransformer(context.notionToMarkdown, block),
    },
    {
      type: "my_heading_2",
      getStringFromBlock: (context, block) =>
        headingTransformer(context.notionToMarkdown, block),
    },
    {
      type: "my_heading_3",
      getStringFromBlock: (context, block) =>
        headingTransformer(context.notionToMarkdown, block),
    },
  ],
};
