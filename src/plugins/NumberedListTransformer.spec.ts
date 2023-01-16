import { NotionBlock } from "../config/configuration";
import { blocksToMarkdown } from "../TestRun";
import { standardNumberedListTransformer } from "./NumberedListTransformer";

let block: any;
beforeEach(() => {
  block = {
    has_children: false,
    archived: false,
    type: "callout",
    callout: {
      rich_text: [
        {
          type: "text",
          text: { content: "This is information callout", link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: "default",
          },
          plain_text: "This is the callout",
          href: null,
        },
      ],
      icon: { type: "emoji", emoji: "ℹ️" },
      color: "gray_background",
    },
  };
});

test("external link inside numbered list, italic preserved", async () => {
  const config = { plugins: [standardNumberedListTransformer] };
  const results = await blocksToMarkdown(config, [
    {
      type: "numbered_list_item",
      numbered_list_item: {
        rich_text: [
          {
            type: "text",
            text: { content: "link ", link: null },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "link ",
            href: null,
          },
          {
            type: "text",
            text: {
              content: "github",
              link: { url: "https://github.com" },
            },
            annotations: {
              bold: false,
              italic: true,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "github",
            href: "https://github.com",
          },
        ],
        color: "default",
      },
    } as unknown as NotionBlock,
  ]);
  expect(results.trim()).toBe(`1. link [_github_](https://github.com)`);
});
