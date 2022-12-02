import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import { ListBlockChildrenResponseResult } from "notion-to-md/build/types";

export async function headingTransformer(
  notionToMarkdown: NotionToMarkdown,
  notionClient: Client,
  block: ListBlockChildrenResponseResult
): Promise<string> {
  // This is the other half of the horrible hack in pull.ts which sets the type
  // of every heading_n to my_heading_n. We have to do this because if
  // we simply set a custom transformer to heading_n, it will keep
  // recursively calling this code, with blockToMarkdown using the custom transformer
  // over and over. Instead, we want blockToMarkdown to give us the normal
  // result, to which we will append the block ID to enable heading links.
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
