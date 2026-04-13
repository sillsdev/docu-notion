import { NotionToMarkdown } from "notion-to-md";
import { NotionBlock } from "../types";
import { IPlugin } from "./pluginTypes";

async function notionColumnListToMarkdown(
  notionToMarkdown: NotionToMarkdown,
  getBlockChildren: (id: string) => Promise<NotionBlock[]>,
  block: NotionBlock
): Promise<string> {
  // Enhance: The @notionhq/client, which uses the official API, cannot yet get at column formatting information (column_ratio)
  // However https://github1s.com/NotionX/react-notion-x/blob/master/packages/react-notion-x/src/block.tsx#L528 can get it.
  const { id, has_children } = block as any; // "any" because the notion api type system is complex with a union that don't know how to help TS to cope with

  if (!has_children) return "";

  const column_list_children = await getBlockChildren(id);
  const columns: string[] = [];
  for (const column of column_list_children) {
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
