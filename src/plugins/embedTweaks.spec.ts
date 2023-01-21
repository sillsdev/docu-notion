import { IPlugin, NotionBlock } from "../config/configuration";
import { setLogLevel } from "../log";
import { blocksToMarkdown } from "../TestRun";
import {
  gifEmbed,
  imgurGifEmbed,
  vimeoEmbed,
  youtubeEmbed,
} from "./embedTweaks";

test("youtube", async () => {
  const config = { plugins: [youtubeEmbed] };
  const result = await blocksToMarkdown(config, [
    {
      object: "block",
      id: "e6ddd1d4-36d4-4925-94c1-5dff4662c1f3",
      has_children: false,
      archived: false,
      type: "video",
      video: {
        caption: [
          {
            type: "text",
            text: {
              content: "A video about editing in Notion",
              link: null,
            },
            plain_text: "A video about editing in Notion",
            href: null,
          },
        ],
        type: "external",
        external: { url: "https://www.youtube.com/watch?v=FXIrojSK3Jo" },
      },
    } as unknown as NotionBlock,
  ]);
  expect(result).toContain(`import ReactPlayer from "react-player";`);
  expect(result).toContain(
    `<ReactPlayer controls url="https://www.youtube.com/watch?v=FXIrojSK3Jo" />`
  );
});

test("vimeo", async () => {
  setLogLevel("verbose");
  const config = { plugins: [vimeoEmbed] };
  const result = await blocksToMarkdown(config, [
    {
      object: "block",
      id: "39ff83a3-2fb5-4411-a715-960656a177ff",
      type: "video",
      video: {
        caption: [],
        type: "external",
        external: { url: "https://vimeo.com/4613611xx" },
      },
    } as unknown as NotionBlock,
  ]);
  expect(result).toContain(`import ReactPlayer from "react-player";`);
  expect(result).toContain(
    `<ReactPlayer controls url="https://vimeo.com/4613611xx" />`
  );
});

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
