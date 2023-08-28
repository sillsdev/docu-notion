import { NotionBlock } from "../types";
import { blocksToMarkdown } from "./pluginTestRun";
import { standardColumnTransformer } from "./ColumnTransformer";

// Even though we can set up most tests with our own children
// so that we aren't relying on real data from Notion,
// we can't prevent the notion-to-md library from making an API call
// every time it processes a block with has_children:true.
// So for these tests with children, we need any valid API key.
const runTestsWhichRequireAnyValidApiKey =
  !!process.env.DOCU_NOTION_INTEGRATION_TOKEN;

// To test grandchildren, we can't get around notion-to-md making an API call
// to get real children. So we need a specific notion record.
// For that reason, we don't try to run these tests unless the user changes this flag.
// But it is an important test; grandchildren in columns were broken.
// See https://github.com/sillsdev/docu-notion/issues/70.
const runManualTestsWhichRequireSpecificNotionRecords = false;

const columnBlock = {
  object: "block",
  id: "e6d2d7b7-b1ed-464a-86d2-bb5f6be78a03",
  has_children: true,
  type: "column",
  column: {},
} as unknown as NotionBlock;
async function getResults(children: NotionBlock[]) {
  return await blocksToMarkdown(
    { plugins: [standardColumnTransformer] },
    [columnBlock],
    undefined,
    children,
    process.env.DOCU_NOTION_INTEGRATION_TOKEN
  );
}

const columnWrapperStart =
  "<div class='notion-column' style=\\{\\{width: '.*?'\\}\\}>\\n\\n";
const columnWrapperEnd =
  "\\n\\n<\\/div><div className='notion-spacer'><\\/div>";

if (runTestsWhichRequireAnyValidApiKey) {
  columnBlock.has_children = true;

  test("requires API key - column with paragraph", async () => {
    const results = await getResults([getTestParagraphBlock()]);
    expect(results).toMatch(
      new RegExp(
        `${columnWrapperStart}\\s*?my paragraph\\s*?${columnWrapperEnd}`
      )
    );
  }, 20000);

  test("requires API key - column with two paragraphs", async () => {
    const results = await getResults([
      getTestParagraphBlock(1),
      getTestParagraphBlock(2),
    ]);
    expect(results).toMatch(
      new RegExp(
        `${columnWrapperStart}\\s*?my paragraph 1\\s+?my paragraph 2\\s*?${columnWrapperEnd}`
      )
    );
  }, 20000);

  test("requires API key - column with numbered list", async () => {
    const results = await getResults([
      getNumberedListItemBlock(1),
      getNumberedListItemBlock(2),
    ]);
    expect(results).toMatch(
      new RegExp(
        `${columnWrapperStart}\\s*?1\\. Numbered list item 1\\s+?2\\. Numbered list item 2\\s*?${columnWrapperEnd}`,
        "s"
      )
    );
  }, 20000);

  if (runManualTestsWhichRequireSpecificNotionRecords) {
    test("manual test - requires specific notion record and API key - column with numbered list with sublist", async () => {
      const realNumberedListBlock = getNumberedListItemBlock(1);
      realNumberedListBlock.id = "ca08d14b-9b70-4f6f-9d17-9fd74b57afeb";
      realNumberedListBlock.has_children = true;

      const results = await getResults([realNumberedListBlock]);
      expect(results).toMatch(
        new RegExp(
          `${columnWrapperStart}\\s*?1\\. Numbered list item 1\\s+?- unordered sub-bullet\\s*?${columnWrapperEnd}`,
          "s"
        )
      );
    }, 20000);
  }
} else {
  // This test prevents an error when runTestsWhichRequireAnyValidApiKey is false
  // due to having a test suite with no tests.
  test("no column transformer tests were run because there is no API key provided", () => {
    expect(true).toBe(true);
  });
}

function getNumberedListItemBlock(identifier?: number) {
  const content = identifier
    ? `Numbered list item ${identifier}`
    : `Numbered list item`;
  return {
    object: "block",
    type: "numbered_list_item",
    numbered_list_item: {
      rich_text: [
        {
          type: "text",
          text: { content: content },
          annotations: {
            code: false,
          },
          plain_text: content,
        },
      ],
    },
  } as unknown as NotionBlock;
}

function getTestParagraphBlock(identifier?: number) {
  const content = identifier ? `my paragraph ${identifier}` : `my paragraph`;
  return {
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [
        {
          type: "text",
          text: {
            content: content,
          },
          annotations: {
            code: false,
          },
          plain_text: content,
        },
      ],
    },
  } as unknown as NotionBlock;
}
