import { Client } from "@notionhq/client";
import { NotionAPI } from "notion-client";
import { NotionToMarkdown } from "notion-to-md";
import { ListBlockChildrenResponseResult } from "notion-to-md/build/types";
import { getBlockChildren } from "./CustomTransformers";

export async function notionColumnToMarkdown(
  notionToMarkdown: NotionToMarkdown,
  notionClient: Client,
  block: ListBlockChildrenResponseResult
): Promise<string> {
  //console.log(JSON.stringify(block));
  const { id, has_children } = block as any; // "any" because the notion api type system is complex with a union that don't know how to help TS to cope with

  if (!has_children) return "";

  const children = await getBlockChildren(notionClient, id, 100);

  const childrenPromise = children.map(
    async column => await notionToMarkdown.blockToMarkdown(column)
  );

  const childrenStrings: string[] = await Promise.all(childrenPromise);

  const style = await getStyleInJsxFormat(id);

  // note: it would look better in the markup with \n, but that
  // causes notion-to-md to give us ":::A" instead of \n for some reason.
  return `<div class='notion-column' style=${style}>\n\n${childrenStrings.join(
    "\n\n"
  )}\n\n</div>
  <div className='notion-spacer' />`;
}

// This is a hack.
// The official API doesn't give us access to the format information, including column_ratio.
// So we use 'notion-client' which uses the unofficial API.
// Once the official API gives us access to the format information, we can remove this
// and the 'notion-client' dependency.
async function getStyleInJsxFormat(blockId: string): Promise<string> {
  const notion = new NotionAPI();
  // Yes, it is odd to call 'getPage' for a block, but that's how we access the format info.
  const recordMap = await notion.getPage(blockId);
  const columnFormat = recordMap.block[blockId]?.value?.format as any;
  const columnRatio = (columnFormat?.column_ratio as string) || 0.5;
  const spacerWidth = `min(32px, 4vw)`; // This matches the value in css.
  const width = `calc((100% - ${spacerWidth}) * ${columnRatio})`;
  const style = `{{width:'${width}'}}`; // JSX
  return style;
}
