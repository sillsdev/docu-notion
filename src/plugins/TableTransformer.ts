import { NotionToMarkdown } from "notion-to-md";
import { ListBlockChildrenResponseResult } from "notion-to-md/build/types";
import markdownTable from "markdown-table";
import { IGetBlockChildrenFn, IPlugin, NotionBlock } from "./pluginTypes";

// This is mostly a copy of the table handler from notion-to-md. The change is to handle newlines in the
// notion cell content.
export async function tableTransformer(
  notionToMarkdown: NotionToMarkdown,
  getBlockChildren: IGetBlockChildrenFn,
  block: NotionBlock
): Promise<string> {
  const { id, has_children } = block as any;
  const tableArr: string[][] = [];
  if (has_children) {
    const tableRows = await getBlockChildren(id);
    // console.log(">>", tableRows);
    const rowsPromise = tableRows?.map(async row => {
      const { type } = row as any;
      const cells = (row as any)[type]["cells"];

      /**
       * this is more like a hack since matching the type text was
       * difficult. So converting each cell to paragraph type to
       * reuse the blockToMarkdown function
       */
      const cellStringPromise = cells.map(
        async (cell: any) =>
          await notionToMarkdown.blockToMarkdown({
            type: "paragraph",
            paragraph: { rich_text: cell },
          } as ListBlockChildrenResponseResult)
      );

      const cellStringArrRaw: string[] = await Promise.all(cellStringPromise);
      // This is our patch to the original notion-to-md code.
      const cellStringArr = cellStringArrRaw.map(c =>
        c
          // Trailing newlines are almost certainly not wanted, and converting to br's gives weird results
          .replace(/[\r\n]+$/, "")
          // Preserving line breaks within cells can't be done in stock markdown. Since we're producing
          // mdx, which supports embedded HTML, we can handle it with <br/>.
          // I'm not sure exactly what line breaks might occur in the input, depending on platform,
          // so handle all the common cases.
          .replaceAll("\r\n", "<br/>")
          .replaceAll("\n", "<br/>")
          .replaceAll("\r", "<br/>")
      );
      // console.log("~~", cellStringArr);
      tableArr.push(cellStringArr);
      // console.log(tableArr);
    });
    await Promise.all(rowsPromise || []);
  }
  return markdownTable(tableArr);
}

export const standardTableTransformer: IPlugin = {
  name: "standardTableTransformer",
  notionToMarkdownTransforms: [
    {
      type: "table",
      getStringFromBlock: (context, block) =>
        tableTransformer(
          context.notionToMarkdown,
          context.getBlockChildren,
          block
        ),
    },
  ],
};
