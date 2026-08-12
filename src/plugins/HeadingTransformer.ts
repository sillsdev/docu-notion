import { NotionBlock } from "../types";
import { IDocuNotionContext, IPlugin } from "./pluginTypes";
import { logDebug } from "../log";

type HeadingContent = {
  type: string;
  plain_text: string;
  annotations: Parameters<
    IDocuNotionContext["notionToMarkdown"]["annotatePlainText"]
  >[1];
  href?: string | null;
  equation?: {
    expression: string;
  };
};

type HeadingBlockData = {
  text?: HeadingContent[];
  rich_text?: HeadingContent[];
};

function renderHeadingText(
  context: IDocuNotionContext,
  block: NotionBlock,
  type: string
): string {
  // Work around notion-to-md only shipping built-in heading renderers for
  // heading_1 through heading_3. For heading_4 and above we still reuse its
  // inline annotation logic, but we assemble the heading markdown ourselves.
  const headingBlock = (block as Record<string, HeadingBlockData | unknown>)[
    type
  ] as HeadingBlockData | undefined;
  const blockContent = headingBlock?.text || headingBlock?.rich_text || [];

  return blockContent
    .map((content: HeadingContent) => {
      if (content.type === "equation" && content.equation) {
        return `$${content.equation.expression}$`;
      }

      let plainText = context.notionToMarkdown.annotatePlainText(
        content.plain_text,
        content.annotations
      );

      if (content.href) {
        plainText = `[${plainText}](${content.href})`;
      }

      return plainText;
    })
    .join("");
}

// Makes links to headings work in docusaurus
// https://github.com/sillsdev/docu-notion/issues/20
async function headingTransformer(
  context: IDocuNotionContext,
  block: NotionBlock
): Promise<string> {
  // First, remove the prefix we added to the heading type
  const type = block.type.replace("DN_", "");
  (block as any).type = type;

  const headingLevel = Number(type.replace("heading_", ""));
  const markdown =
    headingLevel <= 3
      ? await context.notionToMarkdown.blockToMarkdown(block)
      // notion-to-md 3.1.1 falls through on heading_4+ and crashes trying to
      // read block[type].text, so render those levels locally.
      : `${"#".repeat(headingLevel)} ${renderHeadingText(context, block, type)}`;

  logDebug(
    "headingTransformer, markdown of a heading before adding id",
    markdown
  );

  // To make heading links work in Docusaurus, we add a stable block-id anchor.
  // Docusaurus v2 uses explicit heading IDs, while the v3 default can use the
  // MDX comment syntax at the end of the heading.

  // For some reason, inline links come in without the dashes, so we have to strip
  // dashes here to match them.
  //console.log("block.id", block.id)
  const blockIdWithoutDashes = block.id.replaceAll("-", "");

  // Finally, append the block id so that it can be the target of a link.
  if (context.options.docusaurusV2)
    return `${markdown} {#${blockIdWithoutDashes}}`;
  return `${markdown} {/* #${blockIdWithoutDashes} */}`;
}

export const standardHeadingTransformer: IPlugin = {
  name: "standardHeadingTransformer",

  // AP wrote: We have to do this because if
  // we simply set a custom transformer to heading_n, it will keep
  // recursively calling this code, with blockToMarkdown using the custom transformer
  // over and over. Instead, we want blockToMarkdown to give us the normal
  // result, to which we will append the block ID to enable heading links.
  notionBlockModifications: [
    {
      modify: (block: NotionBlock): void => {
        // "as any" needed because we're putting a value in that is not allowed by the real type
        (block as any).type = block.type.replace("heading", "DN_heading");
      },
    },
  ],
  // then when it comes time to do markdown conversions, we'll get called for each of these
  notionToMarkdownTransforms: [
    {
      type: "DN_heading_1",
      getStringFromBlock: (context, block) =>
        headingTransformer(context, block),
    },
    {
      type: "DN_heading_2",
      getStringFromBlock: (context, block) =>
        headingTransformer(context, block),
    },
    {
      type: "DN_heading_3",
      getStringFromBlock: (context, block) =>
        headingTransformer(context, block),
    },
    {
      type: "DN_heading_4",
      // Keep this explicit so H4 blocks take the local workaround path instead
      // of being handed back to notion-to-md's unsupported default branch.
      getStringFromBlock: (context, block) =>
        headingTransformer(context, block),
    },
  ],
};
