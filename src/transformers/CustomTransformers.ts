import { Client } from "@notionhq/client";
import { ListBlockChildrenResponse } from "@notionhq/client/build/src/api-endpoints";
import { NotionToMarkdown } from "notion-to-md";
import {
  ListBlockChildrenResponseResult,
  ListBlockChildrenResponseResults,
} from "notion-to-md/build/types";
import { notionCalloutToAdmonition } from "./CalloutTransformer";
import { numberedListTransformer } from "./NumberedListTransformer";
import { notionColumnToMarkdown } from "./ColumnTransformer";
import { notionColumnListToMarkdown } from "./ColumnListTransformer";
import { tableTransformer } from "./TableTransformer";
import { headingTransformer } from "./HeadingTransformer";

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

  notionToMarkdown.setCustomTransformer(
    "table",
    (block: ListBlockChildrenResponseResult) =>
      tableTransformer(notionToMarkdown, notionClient, block)
  );

  notionToMarkdown.setCustomTransformer(
    "callout",
    (block: ListBlockChildrenResponseResult) =>
      notionCalloutToAdmonition(notionToMarkdown, notionClient, block)
  );

  notionToMarkdown.setCustomTransformer(
    "numbered_list_item",
    (block: ListBlockChildrenResponseResult) =>
      numberedListTransformer(notionToMarkdown, notionClient, block)
  );

  const headingCustomTransformer = (block: ListBlockChildrenResponseResult) =>
    headingTransformer(notionToMarkdown, notionClient, block);
  notionToMarkdown.setCustomTransformer(
    "my_heading_1",
    headingCustomTransformer
  );
  notionToMarkdown.setCustomTransformer(
    "my_heading_2",
    headingCustomTransformer
  );
  notionToMarkdown.setCustomTransformer(
    "my_heading_3",
    headingCustomTransformer
  );

  // Note: Pull.ts also adds an image transformer, but has to do that for each
  // page so we don't do it here.
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
