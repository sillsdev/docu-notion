import { NotionBlock } from "../types";
import { blocksToMarkdown } from "./pluginTestRun";
import { standardHeadingTransformer } from "./HeadingTransformer";

function makeHeadingBlock(
  headingBlockId: string,
  text: string,
  type: "heading_1" | "heading_2" | "heading_3" = "heading_1"
): NotionBlock {
  return {
    object: "block",
    id: headingBlockId,
    type,
    [type]: {
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
      is_toggleable: false,
      color: "default",
    },
  } as unknown as NotionBlock;
}

function makeCodeBlock(text: string, language = ""): NotionBlock {
  return {
    object: "block",
    id: "33333333-3333-3333-3333-333333333333",
    type: "code",
    code: {
      caption: [],
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
      language,
    },
  } as unknown as NotionBlock;
}

test("Adds anchor to headings", async () => {
  //setLogLevel("verbose");
  const headingBlockId = "86f746f4-1c79-4ba1-a2f6-a1d59c2f9d23";
  const config = { plugins: [standardHeadingTransformer] };
  const result = await blocksToMarkdown(config, [
    makeHeadingBlock(headingBlockId, "Heading One"),
  ]);
  expect(result.trim()).toBe(
    `# Heading One {/* #${headingBlockId.replaceAll("-", "")} */}`
  );
});

test("docusaurus-v2 flag keeps legacy heading id syntax", async () => {
  const headingBlockId = "86f746f4-1c79-4ba1-a2f6-a1d59c2f9d23";
  const config = { plugins: [standardHeadingTransformer] };
  const result = await blocksToMarkdown(
    config,
    [makeHeadingBlock(headingBlockId, "Heading One")],
    undefined,
    undefined,
    undefined,
    { docusaurusV2: true }
  );
  expect(result.trim()).toBe(
    `# Heading One {#${headingBlockId.replaceAll("-", "")}}`
  );
});

test("warns when more than one H1 is generated for a page", async () => {
  const consoleLogSpy = vi
    .spyOn(console, "log")
    .mockImplementation(() => undefined);

  try {
    await blocksToMarkdown({ plugins: [standardHeadingTransformer] }, [
      makeHeadingBlock("11111111-1111-1111-1111-111111111111", "Heading One"),
      makeHeadingBlock("22222222-2222-2222-2222-222222222222", "Heading Two"),
    ]);
  } finally {
    expect(
      consoleLogSpy.mock.calls.some(call =>
        String(call[0]).includes(
          'contains 2 H1 headings. Docusaurus pages should have at most one H1. H1 headings: "Heading One", "Heading Two".'
        )
      )
    ).toBe(true);
    consoleLogSpy.mockRestore();
  }
});

test("does not warn when multiple markdown-style H1 lines appear inside a code block", async () => {
  const consoleLogSpy = vi
    .spyOn(console, "log")
    .mockImplementation(() => undefined);

  try {
    await blocksToMarkdown({ plugins: [standardHeadingTransformer] }, [
      makeCodeBlock("# Not a heading\n# Still not a heading", "markdown"),
    ]);
  } finally {
    expect(
      consoleLogSpy.mock.calls.some(call =>
        String(call[0]).includes("H1 headings")
      )
    ).toBe(false);
    consoleLogSpy.mockRestore();
  }
});

test("does not count markdown-style H1 lines inside code blocks toward the page H1 warning", async () => {
  const consoleLogSpy = vi
    .spyOn(console, "log")
    .mockImplementation(() => undefined);

  try {
    await blocksToMarkdown({ plugins: [standardHeadingTransformer] }, [
      makeHeadingBlock("11111111-1111-1111-1111-111111111111", "Heading One"),
      makeCodeBlock("# Not a heading", "markdown"),
    ]);
  } finally {
    expect(
      consoleLogSpy.mock.calls.some(call =>
        String(call[0]).includes("H1 headings")
      )
    ).toBe(false);
    consoleLogSpy.mockRestore();
  }
});
