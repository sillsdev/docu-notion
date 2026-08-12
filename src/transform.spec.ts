import { NotionBlock } from "./types";
import { IPlugin } from "./plugins/pluginTypes";
import { setLogLevel } from "./log";
import { blocksToMarkdown } from "./plugins/pluginTestRun";

function paragraph(text: string): NotionBlock {
  return {
    type: "paragraph",
    paragraph: {
      rich_text: [
        {
          type: "text",
          text: { content: text, link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: "default",
          },
          plain_text: text,
          href: null,
        },
      ],
    },
  } as unknown as NotionBlock;
}

// Regression test for the bug where doTransformsOnMarkdown matched against the
// original `input` but sliced/replaced the mutating `body`. Once the first
// replacement changes the string length, every subsequent match.index is wrong.
// We make the first replacement SHRINK the text so the second match.index lands
// past the real match, and the inner .replace silently drops the transformation.
test("applies every match even after a length-changing replacement", async () => {
  setLogLevel("verbose");
  const p: IPlugin = {
    name: "test",
    regexMarkdownModifications: [
      {
        regex: /REMOVE/,
        replacementPattern: `X`, // shorter than the match, so the body shrinks
      },
    ],
  };
  const config = { plugins: [p] };

  // Produces markdown: "REMOVE\n\nREMOVE keep"
  const result = await blocksToMarkdown(config, [
    paragraph("REMOVE"),
    paragraph("REMOVE keep"),
  ]);

  // Both occurrences must be transformed; none should survive.
  expect(result).not.toContain("REMOVE");
  expect((result.match(/X/g) || []).length).toBe(2);
  expect(result).toContain("keep");
});
