import { ColumnBlockObjectResponse } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import { NotionBlock } from "../types";
import { IPlugin } from "./pluginTypes";
import {
  isColumnListBlock,
  rememberColumnListChildren,
} from "./ColumnTransformer";

async function notionColumnListToMarkdown(
  notionToMarkdown: NotionToMarkdown,
  getBlockChildren: (id: string) => Promise<NotionBlock[]>,
  block: NotionBlock
): Promise<string> {
  if (!isColumnListBlock(block) || !block.has_children) return "";

  const column_list_children = await getBlockChildren(block.id);
  rememberColumnListChildren(column_list_children);
  const columnsToRender = column_list_children.filter(
    (child): child is ColumnBlockObjectResponse => child.type === "column"
  );
  const columns: string[] = [];
  for (const column of columnsToRender) {
    // Keep column rendering sequential. A column block can trigger more Notion
    // reads downstream, so Promise.all() here would turn one page into a burst
    // of concurrent API requests during stage 2.
    columns.push(await notionToMarkdown.blockToMarkdown(column));
  }

  return `<div class='notion-row'>\n${columns.join("\n\n")}\n</div>`;
}

export const standardColumnListTransformer: IPlugin = {
  name: "standardColumnListTransformer",
  notionToMarkdownTransforms: [
    {
      type: "column_list",
      getStringFromBlock: (context, block) =>
        notionColumnListToMarkdown(
          context.notionToMarkdown,
          context.getBlockChildren,
          block
        ),
    },
  ],
};
