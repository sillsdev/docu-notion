import { setLogLevel, verbose } from "../log";
import { NotionPage } from "../NotionPage";
import { oneBlockToMarkdown } from "../TestRun";
import { standardExternalLinkConversion } from "./externalLinks";

// If you paste a link in notion and then choose "Create bookmark", the markdown
// would normally be [bookmark](https://example.com)]. Instead of seeing "bookmark",
// we change to the url.
test("links turned into bookmarks", async () => {
  setLogLevel("debug");
  const results = await getMarkdown({
    type: "bookmark",
    bookmark: { caption: [], url: "https://github.com/" },
  });
  expect(results).toBe("[github.com](https://github.com)");
});

test("links inside callouts", async () => {
  const results = await getMarkdown({});
});

async function getMarkdown(block: object, targetPage?: NotionPage) {
  const config = {
    plugins: [standardExternalLinkConversion],
  };
  return await oneBlockToMarkdown(config, block, targetPage);
}
