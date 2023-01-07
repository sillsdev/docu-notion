import { NotionBlock } from "../config/configuration";
import { convertBlocks } from "../TestRun";
import { standardCalloutTransformer } from "./CalloutTransformer";
import { standardColumnTransformer } from "./ColumnTransformer";

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
  let results = await convertBlocks(config, [block as unknown as NotionBlock]);
  expect(results).toContain("\n:::note\n\nThis is the callout\n\n:::\n");
  block.callout.icon.emoji = "❗";
  results = await convertBlocks(config, [block as unknown as NotionBlock]);
  expect(results).toContain(":::info");
});
