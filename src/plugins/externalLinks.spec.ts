import { setLogLevel } from "../log";
import { oneBlockToMarkdown } from "./pluginTestRun";
import { standardExternalLinkConversion } from "./externalLinks";

// If you paste a link in notion and then choose "Create bookmark", the markdown
// would normally be [bookmark](https://example.com)]. Instead of seeing "bookmark",
// we change to the url.
test("links turned into bookmarks", async () => {
  setLogLevel("debug");
  const results = await getMarkdown({
    type: "bookmark",
    bookmark: { caption: [], url: "https://github.com" },
  });
  expect(results.trim()).toBe("[https://github.com](https://github.com)");
});

test("video links turned into bookmarks", async () => {
  setLogLevel("debug");
  const results = await getMarkdown({
    object: "block",
    type: "bookmark",
    bookmark: {
      caption: [],
      url: "https://vimeo.com/4613611xx",
    },
  });
  expect(results).toContain(
    "[https://vimeo.com/4613611xx](https://vimeo.com/4613611xx)"
  );
  expect(results).not.toContain(`import`);
});

test("external link inside callout", async () => {
  const results = await getMarkdown({
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
            bold: false,
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
  });
  expect(results.trim()).toBe(
    "> ⚠️ Callouts inline [great page](https://github.com)."
  );
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

async function getMarkdown(block: Record<string, unknown>) {
  const config = {
    plugins: [standardExternalLinkConversion],
  };
  return await oneBlockToMarkdown(config, block);
}
