import { NotionPage } from "../NotionPage";
import { makeSamplePageObject, oneBlockToMarkdown } from "../TestRun";

import { standardLinkConversion } from "./internalLinks";

test("urls that show up as raw text get left that way", async () => {
  const results = await getMarkdown({
    type: "paragraph",
    paragraph: {
      rich_text: [
        {
          type: "text",
          text: { content: "https://github.com", link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: "default",
          },
          plain_text: "https://github.com",
          href: null,
        },
      ],
    },
  });
  expect(results.trim()).toBe("https://github.com");
});

test("inline links to external site", async () => {
  const results = await getMarkdown({
    type: "paragraph",
    paragraph: {
      rich_text: [
        {
          type: "text",
          text: { content: "Inline ", link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: "default",
          },
          plain_text: "Inline ",
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
            italic: false,
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
  });
  expect(results.trim()).toBe("Inline [github](https://github.com)");
});

test("link to an existing page on this site that has no slug", async () => {
  const targetPageId = "123";
  const targetPage: NotionPage = makeSamplePageObject({
    slug: undefined,
    name: "Hello World",
    id: targetPageId,
  });

  const results = await getMarkdown(
    {
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: { content: "Inline ", link: null },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "Inline ",
            href: null,
          },
          {
            type: "text",
            text: {
              content: "great page",
              link: { url: `/${targetPageId}` },
            },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "great page",
            href: `/${targetPageId}`,
          },
        ],
        color: "default",
      },
    },
    targetPage
  );
  expect(results.trim()).toBe(`Inline [great page](/${targetPageId})`);
});
test("link to an existing page on this site uses slug", async () => {
  const targetPageId = "123";
  const targetPage: NotionPage = makeSamplePageObject({
    slug: "hello-world",
    name: "Hello World",
    id: targetPageId,
  });

  const results = await getMarkdown(
    {
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: { content: "Inline ", link: null },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "Inline ",
            href: null,
          },
          {
            type: "text",
            text: {
              content: "great page",
              link: { url: `/${targetPageId}` },
            },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "great page",
            href: `/${targetPageId}`,
          },
        ],
        color: "default",
      },
    },
    targetPage
  );
  expect(results.trim()).toBe("Inline [great page](/hello-world)");
});

test("links to other notion pages that are not in this site give PROBLEM LINK", async () => {
  const results = await getMarkdown({
    type: "paragraph",
    paragraph: {
      rich_text: [
        {
          type: "text",
          text: { content: "Inline ", link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: "default",
          },
          plain_text: "Inline ",
          href: null,
        },
        {
          type: "text",
          text: {
            content: "links page",
            link: { url: "/pretendidofpagewedonothaveinthissite" },
          },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: "default",
          },
          plain_text: "links page",
          href: "/pretendidofpagewedonothaveinthissite",
        },
      ],
      color: "default",
    },
  });
  expect(results.trim()).toBe("Inline **[Problem Link]**");
});

test("internal link inside callout", async () => {
  const targetPageId = "123";
  const targetPage: NotionPage = makeSamplePageObject({
    slug: "hello-world",
    name: "Hello World",
    id: targetPageId,
  });

  const results = await getMarkdown(
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
              link: { url: `/${targetPageId}` },
            },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "great page",
            href: `/${targetPageId}`,
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
    },
    targetPage
  );
  expect(results.trim()).toBe(
    "> ⚠️ Callouts inline [great page](/hello-world)."
  );
});

async function getMarkdown(block: object, targetPage?: NotionPage) {
  const config = {
    plugins: [standardLinkConversion],
  };
  return await oneBlockToMarkdown(config, block, targetPage);
}
