import { NotionToMarkdown } from "notion-to-md";
import { ListBlockChildrenResponseResult } from "notion-to-md/build/types";
import { Client } from "@notionhq/client";
import { getBlockChildren } from "./CustomTranformers";

export async function notionCalloutToAdmonition(
  notionToMarkdown: NotionToMarkdown,
  notionClient: Client,
  block: ListBlockChildrenResponseResult
): Promise<string> {
  // In this case typescript is not able to index the types properly, hence ignoring the error
  // @ts-ignore
  const blockContent = block.callout.text || block.callout.rich_text || [];
  // @ts-ignore
  const icon = block.callout.icon;
  let parsedData = "";
  blockContent.map((content: Text) => {
    const annotations = content.annotations;
    let plain_text = content.plain_text;

    plain_text = notionToMarkdown.annotatePlainText(plain_text, annotations);

    // if (content["href"])
    //   plain_text = md.link(plain_text, content["href"]);

    parsedData += plain_text;
  });

  let callout_string = "";
  const { id, has_children } = block as any;
  if (!has_children) {
    const result1 = callout(parsedData, icon);
    return result1;
  }

  const callout_children_object = await getBlockChildren(notionClient, id, 100);

  // // parse children blocks to md object
  const callout_children = await notionToMarkdown.blocksToMarkdown(
    callout_children_object
  );

  callout_string += `${parsedData}\n`;
  callout_children.map(child => {
    callout_string += `${child.parent}\n\n`;
  });

  const result = callout(callout_string.trim(), icon);
  return result;
}

// types copied from notion-to-md to allow compilation of copied code.
type TextRequest = string;

type Annotations = {
  bold: boolean;
  italic: boolean;
  strikethrough: boolean;
  underline: boolean;
  code: boolean;
  color:
    | "default"
    | "gray"
    | "brown"
    | "orange"
    | "yellow"
    | "green"
    | "blue"
    | "purple"
    | "pink"
    | "red"
    | "gray_background"
    | "brown_background"
    | "orange_background"
    | "yellow_background"
    | "green_background"
    | "blue_background"
    | "purple_background"
    | "pink_background"
    | "red_background";
};
export type Text = {
  type: "text";
  text: {
    content: string;
    link: {
      url: TextRequest;
    } | null;
  };
  annotations: Annotations;
  plain_text: string;
  href: string | null;
};

type CalloutIcon =
  | { type: "emoji"; emoji?: string }
  | { type: "external"; external?: { url: string } }
  | { type: "file"; file: { url: string; expiry_time: string } }
  | null;

const calloutsToAdmonitions = {
  /* prettier-ignore */ "ℹ️": "note",
  "💡": "tip",
  "❗": "info",
  "⚠️": "caution",
  "🔥": "danger",
};

// This is the main change from the notion-to-md code.
function callout(text: string, icon?: CalloutIcon) {
  let emoji: string | undefined;
  if (icon?.type === "emoji") {
    emoji = icon.emoji;
  }
  let docusaurusAdmonition = "note";
  if (emoji) {
    // the keyof typeof magic persuades typescript that it really is OK to use emoji as a key into calloutsToAdmonitions
    docusaurusAdmonition =
      calloutsToAdmonitions[emoji as keyof typeof calloutsToAdmonitions] ??
      // For Notion callouts with other emojis, pass them through using hte emoji as the name.
      // For this to work on a Docusaurus site, it will need to define that time on the remark-admonitions options in the docusaurus.config.js.
      // See https://github.com/elviswolcott/remark-admonitions and https://docusaurus.io/docs/using-plugins#using-presets.
      emoji;
  }
  return `:::${docusaurusAdmonition}\n\n${text}\n\n:::\n\n`;
}
