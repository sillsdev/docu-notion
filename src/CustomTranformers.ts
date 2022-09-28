import { Client } from "@notionhq/client";
import { ListBlockChildrenResponse } from "@notionhq/client/build/src/api-endpoints";
import { NotionToMarkdown } from "notion-to-md";
import markdownTable from "markdown-table";
import {
  ListBlockChildrenResponseResult,
  ListBlockChildrenResponseResults,
} from "notion-to-md/build/types";
import { notionCalloutToAdmonition } from "./CalloutTransformer";

export function setupCustomTransformers(
  notionToMarkdown: NotionToMarkdown,
  notionClient: Client
): void {
  notionToMarkdown.setCustomTransformer(
    "column_list",
    (block: ListBlockChildrenResponseResult) =>
      notionColumnListToMarkdown(notionToMarkdown, notionClient, block)
  );

  notionToMarkdown.setCustomTransformer(
    "column",
    (block: ListBlockChildrenResponseResult) =>
      notionColumnToMarkdown(notionToMarkdown, notionClient, block)
  );

  // This is mostly a copy of the table handler from notion-to-md. The change is to handle newlines in the
  // notion cell content.
  notionToMarkdown.setCustomTransformer(
    "table",
    async (block: ListBlockChildrenResponseResult) => {
      const { id, has_children } = block as any;
      const tableArr: string[][] = [];
      if (has_children) {
        const tableRows = await getBlockChildren(notionClient, id, 100);
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

          const cellStringArrRaw: string[] = await Promise.all(
            cellStringPromise
          );
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
  );

  // In Notion, you can make a callout and change its emoji. We map 5 of these
  // to the 5 Docusaurus admonition styles.
  // This is mostly a copy of the callout code from notion-to-md. The change is to output docusaurus
  // admonitions instead of emulating a callout with markdown > syntax.
  // Note: I haven't yet tested this with any emoji except "💡"/"tip", nor the case where the
  // callout has-children. Not even sure what that would mean, since the document I was testing
  // with has quite complex markup inside the callout, but still takes the no-children branch.
  notionToMarkdown.setCustomTransformer(
    "callout",
    (block: ListBlockChildrenResponseResult) =>
      notionCalloutToAdmonition(notionToMarkdown, notionClient, block)
  );

  // Note: Pull.ts also adds an image transformer, but has to do that for each
  // page so we don't do it here.
}

async function notionColumnListToMarkdown(
  notionToMarkdown: NotionToMarkdown,
  notionClient: Client,
  block: ListBlockChildrenResponseResult
): Promise<string> {
  // Enhance: The @notionhq/client, which uses the official API, cannot yet get at column formatting information (column_ratio)
  // However https://github1s.com/NotionX/react-notion-x/blob/master/packages/react-notion-x/src/block.tsx#L528 can get it.

  const { id, has_children } = block as any; // "any" because the notion api type system is complex with a union that don't know how to help TS to cope with

  if (!has_children) return "";

  const column_list_children = await getBlockChildren(notionClient, id, 100);

  const column_list_promise = column_list_children.map(
    async column => await notionToMarkdown.blockToMarkdown(column)
  );

  const columns: string[] = await Promise.all(column_list_promise);

  return `<div class='notion-row'>\n${columns.join("\n\n")}\n</div>`;
}
async function notionColumnToMarkdown(
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

  // note: it would look better in the markup with \n, but that
  // causes notion-to-md to give us ":::A" instead of \n for some reason.
  return `<div class='notion-column'>\n\n${childrenStrings.join(
    "\n\n"
  )}\n\n</div>`;
}

export async function getBlockChildren(
  notionClient: Client,
  block_id: string,
  totalPage: number | null
): Promise<ListBlockChildrenResponseResults> {
  try {
    const result: ListBlockChildrenResponseResults = [];
    let pageCount = 0;
    let start_cursor = undefined;

    do {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const response = (await notionClient.blocks.children.list({
        start_cursor: start_cursor,
        block_id: block_id,
      })) as ListBlockChildrenResponse;
      result.push(...response.results);

      start_cursor = response?.next_cursor;
      pageCount += 1;
    } while (
      start_cursor != null &&
      (totalPage == null || pageCount < totalPage)
    );

    //TODO: copied this in, what is it for? modifyNumberedListObject(result);
    return result;
  } catch (e) {
    console.error(e);
    return [];
  }
}
