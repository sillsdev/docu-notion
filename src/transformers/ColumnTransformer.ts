import { Client } from "@notionhq/client";
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

  // note: it would look better in the markup with \n, but that
  // causes notion-to-md to give us ":::A" instead of \n for some reason.
  return `<div class='notion-column'>\n\n${childrenStrings.join(
    "\n\n"
  )}\n\n</div>`;
}
