import { setLogLevel } from "../log";
import { NotionPage } from "../NotionPage";
import { makeSamplePageObject, oneBlockToMarkdown } from "../TestRun";
import { standardCalloutTransformer } from "./CalloutTransformer";
import { standardExternalLinkConversion } from "./externalLinks";

import { standardInternalLinkConversion } from "./internalLinks";
import { standardNumberedListTransformer } from "./NumberedListTransformer";

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
          {
            type: "text",
            text: { content: " the end.", link: null },
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
        color: "default",
      },
    },
    targetPage
  );
  expect(results.trim()).toBe(`Inline [great page](/${targetPageId}) the end.`);
});

test("link to a heading block on a page", async () => {
  const targetPageId = "123";
  const blocks = {
    type: "paragraph",
    paragraph: {
      rich_text: [
        {
          type: "text",
          text: { content: "(Inline ", link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: "default",
          },
          plain_text: "(Inline ",
          href: null,
        },
        {
          type: "text",
          text: {
            content: "heading on some page",
            link: { url: `/${targetPageId}#456` },
          },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: "default",
          },
          plain_text: "heading on some page",
          href: `/${targetPageId}#456`,
        },
        {
          type: "text",
          text: { content: " the end.)", link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: "default",
          },
          plain_text: " the end.)",
          href: null,
        },
      ],
      color: "default",
    },
  };
  setLogLevel("verbose");
  const noSlugTargetPage: NotionPage = makeSamplePageObject({
    slug: undefined,
    name: "Hello World",
    id: targetPageId,
  });

  const noSlugResults = await getMarkdown(blocks, noSlugTargetPage);

  // the ending parentheses messed up a regex at one point.
  expect(noSlugResults.trim()).toBe(
    `(Inline [heading on some page](/${targetPageId}#456) the end.)`
  );

  const slugTargetPage: NotionPage = makeSamplePageObject({
    slug: "hello-world",
    name: "Hello World",
    id: targetPageId,
  });
  const slugResults = await getMarkdown(blocks, slugTargetPage);
  expect(slugResults.trim()).toBe(
    `(Inline [heading on some page](/hello-world#456) the end.)`
  );
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
              content: "It’s good",
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
            plain_text: "It’s good",
            href: `/${targetPageId}`,
          },
        ],
        color: "default",
      },
    },
    targetPage
  );
  expect(results.trim()).toBe("Inline [It’s good](/hello-world)");
});

test("link in a bulleted list", async () => {
  const targetPageId = "123";
  const targetPage: NotionPage = makeSamplePageObject({
    slug: "the-page",
    name: "Something",
    id: targetPageId,
  });

  const results = await getMarkdown(
    {
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          {
            type: "text",
            text: {
              content: "item",
              link: { url: "/123" },
            },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "item",
            href: "/123",
          },
        ],
        color: "default",
      },
    },
    targetPage
  );
  expect(results.trim()).toBe("- [item](/the-page)");
});

test("link to an a heading on a page on this site uses slug", async () => {
  const targetPageId = "123";
  const headingBlockId = "456";
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
            text: {
              content: "see this heading",
              link: { url: `/${targetPageId}#${headingBlockId}` },
            },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "see this heading",
            href: `/${targetPageId}#${headingBlockId}`,
          },
        ],
        color: "default",
      },
    },
    targetPage
  );
  expect(results.trim()).toBe(
    `[see this heading](/hello-world#${headingBlockId})`
  );
});

test("does not interfere with mailto links", async () => {
  const results = await getMarkdown({
    type: "paragraph",
    paragraph: {
      rich_text: [
        {
          type: "text",
          text: {
            content: "mailme",
            link: { url: `mailto:foo@example.com` },
          },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: "default",
          },
          plain_text: "mailme",
          href: `mailto:foo@example.com`,
        },
      ],
      color: "default",
    },
  });
  expect(results.trim()).toBe(`[mailme](mailto:foo@example.com)`);
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
  expect(results.trim()).toBe("Inline **[Problem Internal Link]**");
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
    `:::caution

Callouts inline [great page](/hello-world).

:::`
  );
});

async function getMarkdown(block: object, targetPage?: NotionPage) {
  const config = {
    plugins: [
      standardCalloutTransformer,
      standardNumberedListTransformer,
      standardInternalLinkConversion,
      standardExternalLinkConversion,
    ],
  };
  return await oneBlockToMarkdown(config, block, targetPage);
}
