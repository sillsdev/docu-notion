import { NotionAPI } from "notion-client";
import { NotionToMarkdown } from "notion-to-md";
import { ListBlockChildrenResponseResult } from "notion-to-md/build/types";
import { IGetBlockChildrenFn, IPlugin } from "./pluginTypes";

export const standardColumnTransformer: IPlugin = {
  name: "standardColumnTransformer",
  notionToMarkdownTransforms: [
    {
      type: "column",
      getStringFromBlock: (context, block) =>
        notionColumnToMarkdown(
          context.notionToMarkdown,
          context.getBlockChildren,
          block
        ),
    },
  ],
};

// This runs when notion-to-md encounters a column block
export async function notionColumnToMarkdown(
  notionToMarkdown: NotionToMarkdown,
  getBlockChildren: IGetBlockChildrenFn,
  block: ListBlockChildrenResponseResult
): Promise<string> {
  //console.log(JSON.stringify(block));
  const { id, has_children } = block as any; // "any" because the notion api type system is complex with a union that don't know how to help TS to cope with

  if (!has_children) return "";

  const children = await getBlockChildren(id);

  const childrenPromises = children.map(
    async column => await notionToMarkdown.blockToMarkdown(column)
  );

  const childrenStrings: string[] = await Promise.all(childrenPromises);

  const columnWidth = await getColumnWidth(block);

  // note: it would look better in the markup with \n, but that
  // causes notion-to-md to give us ":::A" instead of \n for some reason.
  return (
    `<div class='notion-column' style={{width: '${columnWidth}'}}>\n\n${childrenStrings.join(
      "\n\n"
    )}\n\n</div>` +
    // Spacer between columns. CSS takes care of hiding this for the last column
    // and when the screen is too narrow for multiple columns.
    `<div className='notion-spacer' />`
  );
}

// The official API doesn't give us access to the format information, including column_ratio.
// So we use 'notion-client' which uses the unofficial API.
// Once the official API gives us access to the format information, we can remove this
// and the 'notion-client' dependency.
// This logic was mostly taken from react-notion-x (sister project of notion-client).
async function getColumnWidth(
  block: ListBlockChildrenResponseResult
): Promise<string> {
  const unofficialNotionClient = new NotionAPI();
  const blockId = block.id;
  // Yes, it is odd to call 'getPage' for a block, but that's how we access the format info.
  const recordMap = await unofficialNotionClient.getPage(blockId);
  const blockResult = recordMap.block[blockId];

  // ENHANCE: could we use https://github.com/NotionX/react-notion-x/tree/master/packages/notion-types
  // to get away from "any", which might be particularly helpful in the future
  // since this is using the unofficial (reverse engineered?) API.

  const columnFormat = blockResult?.value?.format as any;
  const columnRatio = (columnFormat?.column_ratio as number) || 0.5;

  const parentBlock = recordMap.block[blockResult?.value?.parent_id]?.value;
  // I'm not sure why we wouldn't get a parent, but the react-notion-x has
  // this fallback to a guess based on the columnRatio.
  const columnCount =
    parentBlock?.content?.length || Math.max(2, Math.ceil(1.0 / columnRatio));

  const spacerWidth = `min(32px, 4vw)`; // This matches the value in css for 'notion-spacer'.
  return `calc((100% - (${spacerWidth} * ${
    columnCount - 1
  })) * ${columnRatio})`;
}
