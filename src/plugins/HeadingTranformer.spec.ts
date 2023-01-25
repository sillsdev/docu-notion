import { NotionBlock } from "../types";
import { blocksToMarkdown } from "./pluginTestRun";
import { standardHeadingTransformer } from "./HeadingTransformer";

test("Adds anchor to headings", async () => {
  //setLogLevel("verbose");
  const headingBlockId = "86f746f4-1c79-4ba1-a2f6-a1d59c2f9d23";
  const config = { plugins: [standardHeadingTransformer] };
  const result = await blocksToMarkdown(config, [
    {
      object: "block",
      id: headingBlockId,
      type: "heading_1",
      heading_1: {
        rich_text: [
          {
            type: "text",
            text: { content: "Heading One", link: null },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "Heading One",
            href: null,
          },
        ],
        is_toggleable: false,
        color: "default",
      },
    } as unknown as NotionBlock,
  ]);
  expect(result.trim()).toBe(
    `# Heading One {#${headingBlockId.replaceAll("-", "")}}`
  );
});
