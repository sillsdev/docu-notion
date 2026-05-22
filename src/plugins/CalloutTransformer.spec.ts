import { NotionBlock } from "../types";
import { NotionPage } from "../NotionPage";
import { blocksToMarkdown, makeSamplePageObject } from "./pluginTestRun";
import { standardCalloutTransformer } from "./CalloutTransformer";
import { standardExternalLinkConversion } from "./externalLinks";
import { standardInternalLinkConversion } from "./internalLinks";

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
  const config = {
    plugins: [
      standardCalloutTransformer,
      standardInternalLinkConversion,
      standardExternalLinkConversion,
    ],
  };
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
    `:::warning[Caution]

Callouts inline [**great page**](https://github.com).

:::`
  );
});

test("internal link inside callout, bold preserved", async () => {
  const config = {
    plugins: [
      standardCalloutTransformer,
      standardInternalLinkConversion,
      standardExternalLinkConversion,
    ],
  };
  const slugTargetPage: NotionPage = makeSamplePageObject({
    slug: "hello-world",
    name: "Hello World",
    id: "123",
  });
  const results = await blocksToMarkdown(
    config,
    [
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
                link: { url: `/123#456` },
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
              href: `/123#456`,
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
              plain_text: " the end.",
              href: null,
            },
          ],
          icon: { type: "emoji", emoji: "⚠️" },
          color: "gray_background",
        },
      } as unknown as NotionBlock,
    ],
    [slugTargetPage]
  );
  expect(results.trim()).toBe(
    `:::warning[Caution]

Callouts inline [**great page**](/hello-world#456) the end.

:::`
  );
});

test("unknown emoji callout falls back to note with title in docusaurus v3 mode", async () => {
  const config = { plugins: [standardCalloutTransformer] };
  block.callout.icon.emoji = "🧪";
  const results = await blocksToMarkdown(config, [
    block as unknown as NotionBlock,
  ]);
  expect(results.trim()).toBe(
    `:::note[🧪]

This is the callout

:::`
  );
});

test("named notion icon callout falls back to plain note in docusaurus v3 mode", async () => {
  const config = { plugins: [standardCalloutTransformer] };
  block.callout.icon = {
    type: "icon",
    icon: { name: "airplane", color: "purple" },
  };
  const results = await blocksToMarkdown(config, [
    block as unknown as NotionBlock,
  ]);
  expect(results.trim()).toBe(
    `:::note

This is the callout

:::`
  );
});

test("docusaurus-v2 flag keeps legacy callout syntax", async () => {
  const config = { plugins: [standardCalloutTransformer] };
  block.callout.icon.emoji = "⚠️";
  const results = await blocksToMarkdown(
    config,
    [block as unknown as NotionBlock],
    undefined,
    undefined,
    undefined,
    { docusaurusV2: true }
  );
  expect(results.trim()).toBe(
    `:::caution

This is the callout

:::`
  );
});
