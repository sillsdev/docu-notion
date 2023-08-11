import { NotionBlock } from "../types";
import { IPlugin } from "./pluginTypes";
import { setLogLevel } from "../log";
import { blocksToMarkdown } from "./pluginTestRun";
import { gifEmbed, imgurGifEmbed } from "./embedTweaks";

test("imgur", async () => {
  setLogLevel("verbose");
  const config = { plugins: [imgurGifEmbed] };
  const result = await blocksToMarkdown(config, [
    {
      object: "block",
      id: "e36710d8-98ad-40dc-b41b-b376ebdd6894",
      type: "bookmark",
      bookmark: { caption: [], url: "https://imgur.com/gallery/U8TTNuI" },
    } as unknown as NotionBlock,
  ]);
  expect(result.trim()).toBe(`![](https://imgur.com/gallery/U8TTNuI.gif)`);
});

test("gif", async () => {
  setLogLevel("verbose");
  const config = { plugins: [gifEmbed] };
  const result = await blocksToMarkdown(config, [
    {
      object: "block",
      id: "e36710d8-98ad-40dc-b41b-b376ebdd6894",
      type: "bookmark",
      bookmark: {
        caption: [],
        url: "https://en.wikipedia.org/wiki/GIF#/media/File:Rotating_earth_(large).gif",
      },
    } as unknown as NotionBlock,
  ]);
  expect(result.trim()).toBe(
    `![](https://en.wikipedia.org/wiki/GIF#/media/File:Rotating_earth_(large).gif)`
  );
});

test("tweaks are not applied inside code blocks", async () => {
  setLogLevel("verbose");
  const p: IPlugin = {
    name: "test",
    regexMarkdownModifications: [
      {
        regex: /find/,
        replacementPattern: `found`,
      },
    ],
  };
  const config = { plugins: [p] };
  const result = await blocksToMarkdown(config, [
    {
      type: "code",
      code: {
        caption: [],
        rich_text: [
          {
            type: "text",
            text: {
              content: "don't find me",
              link: null,
            },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "don't find me",
            href: null,
          },
        ],
        language: "",
      },
    } as unknown as NotionBlock,
    {
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: { content: "find this", link: null },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: true,
              color: "default",
            },
            plain_text: "find this",
            href: null,
          },
        ],
      },
    } as unknown as NotionBlock,
  ]);
  // we should not change the code one
  expect(result.trim()).toContain("don't find me");
  // but we should change the non-code block one
  expect(result.trim()).toContain("found this");
});

test("simplest possible", async () => {
  setLogLevel("verbose");
  const p: IPlugin = {
    name: "test",
    regexMarkdownModifications: [
      {
        regex: /find/,
        replacementPattern: `found`,
      },
    ],
  };
  const config = { plugins: [p] };
  const result = await blocksToMarkdown(config, [
    {
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: { content: "find this", link: null },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: true,
              color: "default",
            },
            plain_text: "find this",
            href: null,
          },
        ],
      },
    } as unknown as NotionBlock,
  ]);

  expect(result.trim()).toContain("found this");
});

test("use match in output", async () => {
  setLogLevel("verbose");
  const p: IPlugin = {
    name: "test",
    regexMarkdownModifications: [
      {
        regex: /(find)/,
        replacementPattern: `found $1`,
      },
    ],
  };
  const config = { plugins: [p] };
  const result = await blocksToMarkdown(config, [
    {
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: { content: "find this", link: null },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: true,
              color: "default",
            },
            plain_text: "find this",
            href: null,
          },
        ],
      },
    } as unknown as NotionBlock,
  ]);

  expect(result.trim()).toContain("found find");
});
