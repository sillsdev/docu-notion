import {
  ColumnBlockObjectResponse,
  ColumnListBlockObjectResponse,
} from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import {
  ListBlockChildrenResponseResult,
  MdBlock,
} from "notion-to-md/build/types";
import { IGetBlockChildrenFn, IPlugin } from "./pluginTypes";
import { NotionBlock } from "../types";

const columnCountById = new Map<string, number>();
const normalizedColumnRatioById = new Map<string, number>();

function isColumnBlock(
  block: NotionBlock | ListBlockChildrenResponseResult
): block is ColumnBlockObjectResponse {
  return "type" in block && block.type === "column";
}

export function isColumnListBlock(
  block: NotionBlock | ListBlockChildrenResponseResult
): block is ColumnListBlockObjectResponse {
  return "type" in block && block.type === "column_list";
}

function getRawColumnRatio(
  block: NotionBlock | ListBlockChildrenResponseResult
) {
  if (!isColumnBlock(block)) return undefined;
  const ratio = block.column.width_ratio;
  return typeof ratio === "number" && Number.isFinite(ratio)
    ? ratio
    : undefined;
}

function approximatelyEqual(left: number, right: number, epsilon = 0.000001) {
  return Math.abs(left - right) < epsilon;
}

function isDefinedNumber(value: number | undefined): value is number {
  return value !== undefined;
}

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

export function rememberColumnListChildren(columnBlocks: NotionBlock[]): void {
  const columns = columnBlocks.filter(isColumnBlock);
  const columnCount = columns.length;
  const explicitRatios = columns.map(getRawColumnRatio);
  const allExplicit = explicitRatios.every(isDefinedNumber);
  const explicitSum = explicitRatios.reduce<number>(
    (sum, ratio) => sum + (ratio ?? 0),
    0
  );

  const normalizedRatios =
    allExplicit && approximatelyEqual(explicitSum, 1)
      ? explicitRatios
      : (() => {
          const weights = explicitRatios.map(ratio => ratio ?? 1);
          const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

          return totalWeight > 0
            ? weights.map(weight => weight / totalWeight)
            : weights.map(() => 1 / Math.max(columnCount, 1));
        })();

  for (const [index, columnBlock] of columns.entries()) {
    columnCountById.set(columnBlock.id, columnCount);
    normalizedColumnRatioById.set(columnBlock.id, normalizedRatios[index]);
  }
}

// This runs when notion-to-md encounters a column block
async function notionColumnToMarkdown(
  notionToMarkdown: NotionToMarkdown,
  getBlockChildren: IGetBlockChildrenFn,
  block: ListBlockChildrenResponseResult
): Promise<string> {
  if (!isColumnBlock(block) || !block.has_children) return "";

  const columnChildren: NotionBlock[] = await getBlockChildren(block.id);
  const childrenMdBlocksArray: MdBlock[][] = [];
  for (const child of columnChildren) {
    // Intentionally serialize these subtree conversions. notion-to-md will fetch
    // nested block children during blocksToMarkdown(), and parallelizing sibling
    // columns creates bursts that can exceed Notion's per-integration rate limit.
    childrenMdBlocksArray.push(
      await notionToMarkdown.blocksToMarkdown([child])
    );
  }
  const childrenMarkdown = childrenMdBlocksArray.map(
    mdBlockArray => notionToMarkdown.toMarkdownString(mdBlockArray).parent
  );

  const columnWidth = getColumnWidth(block);
  return (
    `<div class='notion-column' style={{width: '${columnWidth}'}}>\n\n${childrenMarkdown.join(
      "\n"
    )}\n</div>` +
    // Spacer between columns. CSS takes care of hiding this for the last column
    // and when the screen is too narrow for multiple columns.
    `<div className='notion-spacer'></div>`
  );
}

export function getColumnWidth(block: ListBlockChildrenResponseResult): string {
  const columnRatio =
    normalizedColumnRatioById.get(block.id) ?? getRawColumnRatio(block) ?? 0.5;

  // The spacer width depends on how many sibling columns are present. We record
  // that when the parent column_list is converted, then fall back to the older
  // estimate when a column is converted without that context.
  const columnCount =
    columnCountById.get(block.id) || Math.max(2, Math.ceil(1.0 / columnRatio));

  const spacerWidth = `min(32px, 4vw)`; // This matches the value in css for 'notion-spacer'.
  return `calc((100% - (${spacerWidth} * ${
    columnCount - 1
  })) * ${columnRatio})`;
}
