import { NotionBlock } from "../types";
import { IPlugin } from "./pluginTypes";
import { setLogLevel } from "../log";
import { blocksToMarkdown } from "./pluginTestRun";
import { gifEmbed, imgurGifEmbed } from "./embedTweaks";
import { standardExternalLinkConversion } from "./externalLinks";
import defaultConfig from "../config/default.docunotion.config";
import { NotionBlock as NB } from "../types";

function paragraph(text: string): NB {
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
  } as unknown as NB;
}

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

// Regression test for the "!![](...)" bug: with both plugins active (the
// default config order), the imgur mod turns a bare imgur link into an image,
// then the gif mod sees that ".gif" image and must not prepend a second "!".
test("imgur + gif together produce a single leading bang", async () => {
  setLogLevel("verbose");
  const config = { plugins: [imgurGifEmbed, gifEmbed] };
  const result = await blocksToMarkdown(config, [
    {
      object: "block",
      id: "e36710d8-98ad-40dc-b41b-b376ebdd6894",
      type: "bookmark",
      bookmark: { caption: [], url: "https://imgur.com/E83qLj6" },
    } as unknown as NotionBlock,
  ]);
  expect(result.trim()).toBe(`![](https://imgur.com/E83qLj6.gif)`);
  expect(result).not.toContain("!![]");
});

// An inline link the user gave real text to must stay a clickable link: we must
// not turn it into an image (which also discards the text). Uses the default
// config order so both mods get a crack at it.
test("imgur link with author text is left as a clickable link", async () => {
  setLogLevel("verbose");
  const config = { plugins: [imgurGifEmbed, gifEmbed] };
  const result = await blocksToMarkdown(config, [
    paragraph(
      "all at once ([see animation](https://imgur.com/gcrxl5k))."
    ),
    paragraph(
      "(See an animation of these [new overlay features](https://imgur.com/E83qLj6))"
    ),
  ]);
  expect(result).toContain("[see animation](https://imgur.com/gcrxl5k)");
  expect(result).toContain(
    "[new overlay features](https://imgur.com/E83qLj6)"
  );
  // nothing should have been turned into an image
  expect(result).not.toContain("![]");
  expect(result).not.toContain(".gif");
});

// Production-realistic: standardExternalLinkConversion runs in an earlier phase
// and rewrites a Notion `[bookmark](url)` into `[url](url)` before the embed
// regexes run. The embed must still recognize that as an auto-label and embed it.
test("imgur bookmark still embeds after external-link conversion", async () => {
  setLogLevel("verbose");
  const config = {
    plugins: [standardExternalLinkConversion, imgurGifEmbed, gifEmbed],
  };
  const result = await blocksToMarkdown(config, [
    {
      object: "block",
      id: "e36710d8-98ad-40dc-b41b-b376ebdd6894",
      type: "bookmark",
      bookmark: { caption: [], url: "https://imgur.com/gallery/U8TTNuI" },
    } as unknown as NotionBlock,
  ]);
  expect(result.trim()).toBe(`![](https://imgur.com/gallery/U8TTNuI.gif)`);
  expect(result).not.toContain("!![]");
});

// ...but an authored inline link must survive that same pipeline as a link.
test("authored imgur link survives external-link conversion as a link", async () => {
  setLogLevel("verbose");
  const config = {
    plugins: [standardExternalLinkConversion, imgurGifEmbed, gifEmbed],
  };
  const result = await blocksToMarkdown(config, [
    paragraph("all at once ([see animation](https://imgur.com/gcrxl5k))."),
  ]);
  expect(result).toContain("[see animation](https://imgur.com/gcrxl5k)");
  expect(result).not.toContain("![]");
  expect(result).not.toContain(".gif");
});

// Strongest guard: run the ACTUAL default production config (full plugin set
// and order) rather than a hand-picked subset, so future config drift (plugin
// reordering, the external-link converter changing) can't silently reopen the
// bug. A Notion bookmark to imgur must embed; an authored inline link must stay
// a clickable link.
test("default production config: bookmark embeds, authored link stays a link", async () => {
  setLogLevel("verbose");
  const result = await blocksToMarkdown(defaultConfig, [
    {
      object: "block",
      id: "e36710d8-98ad-40dc-b41b-b376ebdd6894",
      type: "bookmark",
      bookmark: { caption: [], url: "https://imgur.com/gallery/U8TTNuI" },
    } as unknown as NotionBlock,
    paragraph("all at once ([see animation](https://imgur.com/gcrxl5k))."),
  ]);
  // the bookmark became an embedded gif...
  expect(result).toContain("![](https://imgur.com/gallery/U8TTNuI.gif)");
  expect(result).not.toContain("!![]");
  // ...while the authored link is untouched
  expect(result).toContain("[see animation](https://imgur.com/gcrxl5k)");
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
