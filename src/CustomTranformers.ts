import { Client } from "@notionhq/client";
import { ListBlockChildrenResponse } from "@notionhq/client/build/src/api-endpoints";
import { NotionToMarkdown } from "notion-to-md";
import {
  ListBlockChildrenResponseResult,
  ListBlockChildrenResponseResults,
} from "notion-to-md/build/types";

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
}

async function notionColumnListToMarkdown(
  notionToMarkdown: NotionToMarkdown,
  notionClient: Client,
  block: ListBlockChildrenResponseResult
): Promise<string> {
  const { id, has_children } = block as any; // "any" because the notion api type system is complex with a union that don't know how to help TS to cope with

  if (!has_children) return "";

  const column_list_children = await getBlockChildren(notionClient, id, 100);

  const column_list_promise = column_list_children.map(
    async column => await notionToMarkdown.blockToMarkdown(column)
  );

  const columns: string[] = await Promise.all(column_list_promise);

  return `<div class='column_list'>${columns.join("\n\n")}</div>`;
}

async function notionColumnToMarkdown(
  notionToMarkdown: NotionToMarkdown,
  notionClient: Client,
  block: ListBlockChildrenResponseResult
): Promise<string> {
  const { id, has_children } = block as any; // "any" because the notion api type system is complex with a union that don't know how to help TS to cope with

  if (!has_children) return "";

  const children = await getBlockChildren(notionClient, id, 100);

  const childrenPromise = children.map(
    async column => await notionToMarkdown.blockToMarkdown(column)
  );

  const childrenStrings: string[] = await Promise.all(childrenPromise);

  return `<div class='column'>${childrenStrings.join("\n\n")}</div>`;
}

async function getBlockChildren(
  notionClient: Client,
  block_id: string,
  totalPage: number | null
) {
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
