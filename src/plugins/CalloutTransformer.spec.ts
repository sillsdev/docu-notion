import { NotionBlock } from "../config/configuration";
import { blocksToMarkdown } from "../TestRun";
import { standardCalloutTransformer } from "./CalloutTransformer";
import { standardColumnTransformer } from "./ColumnTransformer";

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

test("smoketest callout", async () => {
  const config = { plugins: [standardCalloutTransformer] };
  block.callout.icon.emoji = "ℹ️";
  let results = await blocksToMarkdown(config, [
    block as unknown as NotionBlock,
  ]);
  expect(results).toContain("\n:::note\n\nThis is the callout\n\n:::\n");
  block.callout.icon.emoji = "❗";
  results = await blocksToMarkdown(config, [block as unknown as NotionBlock]);
  expect(results).toContain(":::info");
});

test("external link inside callout, bold preserved", async () => {
  const config = { plugins: [standardCalloutTransformer] };
  const results = await blocksToMarkdown(config, [
    {
      type: "callout",
      callout: {
        rich_text: [
          {
            type: "text",
            text: { content: "Callouts inline ", link: null },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "Callouts inline ",
            href: null,
          },
          {
            type: "text",
            text: {
              content: "great page",
              link: { url: `https://github.com` },
            },
            annotations: {
              bold: true,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "great page",
            href: `https://github.com`,
          },
          {
            type: "text",
            text: { content: ".", link: null },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: ".",
            href: null,
          },
        ],
        icon: { type: "emoji", emoji: "⚠️" },
        color: "gray_background",
      },
    } as unknown as NotionBlock,
  ]);
  expect(results.trim()).toBe(
    `:::caution

Callouts inline [**great page**](https://github.com).

:::`
  );
});
