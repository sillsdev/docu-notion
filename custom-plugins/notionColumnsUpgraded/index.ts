import {
  IDocuNotionContext,
  IPlugin,
  NotionBlock,
} from "@sillsdev/docu-notion";

import { renderMarkdown } from "./markdown_renderer";

async function notionColumnListToMarkdown(
  context: IDocuNotionContext,
  block: NotionBlock
): Promise<string> {
  const n2m = context.notionToMarkdown;
  const mdBlocks_temp = await n2m.pageToMarkdown(block.id);
  let finalMdString = `\n<div className="custom-docunotion-row">\n`;
  for (const one_block of mdBlocks_temp) {
    const blockChildren = await context.getBlockChildren(
      (one_block as any).blockId
    );

    let htmlString: string = "";

    for (const blockChild of blockChildren) {
      const blockMarkdown = await n2m.blocksToMarkdown([blockChild]);
      const mdString = n2m.toMarkdownString(blockMarkdown);

      // console.log(`START [blockChild]=${JSON.stringify(blockChild)}`);
      // console.log(`blockMarkdown=${JSON.stringify(blockMarkdown)}`);
      // console.log(`mdString=${JSON.stringify(mdString)  }`);
      // console.log(`mdString.parent=${mdString.parent}`);
      // console.log(`END`)
      
      // @ts-ignore
      if (mdString?.parent?.startsWith("\n```")) {
        // @ts-ignore
        htmlString += "\n\n" + mdString.parent + "\n\n";
      } else {
        // @ts-ignore
        htmlString += mdString?.parent
          ? await renderMarkdown(
              // @ts-ignore
              mdString?.parent as string,
              markdownToHtmlRenderOptions
            )
          : "\n<br/>";
      }
    }

    if (htmlString.trim().startsWith("<p>")) {
      htmlString = htmlString.trim().replace("<p>", "").replace("</p>", "");
    }

    finalMdString += `  <div className="custom-docunotion-row-cell">\n\n${htmlString}\n  </div>\n`;
  }
  return finalMdString + "\n</div>\n\n";
}

export const notionColumnsUpgraded: IPlugin = {
  name: "notionColumnsUpgraded",
  notionToMarkdownTransforms: [
    // custom column list transformer, better than the docu-notion default
    {
      type: "column_list",
      getStringFromBlock: (context, block) =>
        notionColumnListToMarkdown(context, block),
    },
    // Force notion-to-md default column rendering (not docu-notion's default)
    {
      type: "column",
      // @ts-ignore
      getStringFromBlock: async (context, block) => {
        return false;
      },
    },
  ],
  regexMarkdownModifications: [
    // // replace image links with require() statements for docusaurus
    // {
    //   regex:
    //     /"(https?:\/\/www\.|https?:\/\/)?(\.\/)?[a-zA-Z0-9]{2,}(\.[a-zA-Z0-9]{2,})(\.[a-zA-Z0-9]{2,})?(\/[a-zA-Z0-9]{2,})?"/,
    //   getReplacement: async (
    //     context: IDocuNotionContext,
    //     match: RegExpExecArray
    //   ): Promise<string> => {
    //     const url = match[0];
    //     return `{require(${url}).default}`;
    //   },
    // },
  ],
};

const markdownToHtmlRenderOptions = {
  allowedTags: [
    "a",
    "abbr",
    "address",
    "article",
    "aside",
    "b",
    "bdi",
    "bdo",
    "blockquote",
    "br",
    "caption",
    "cite",
    "code",
    "col",
    "colgroup",
    "data",
    "dd",
    "dfn",
    "div",
    "dl",
    "dt",
    "em",
    "figcaption",
    "figure",
    "footer",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "header",
    "hgroup",
    "hr",
    "i",
    "img",
    "kbd",
    "li",
    "main",
    "main",
    "mark",
    "nav",
    "ol",
    "p",
    "pre",
    "q",
    "rb",
    "rp",
    "rt",
    "rtc",
    "ruby",
    "s",
    "samp",
    "section",
    "small",
    "span",
    "strong",
    "sub",
    "sup",
    "table",
    "tbody",
    "td",
    "tfoot",
    "th",
    "thead",
    "time",
    "tr",
    "u",
    "ul",
    "var",
    "wbr",
  ],
  allowedAttributes: {
    a: ["href", "title", "rel", "tabindex", "aria-hidden", "class", "src"],
    img: ["height", "width", "alt", "src", "style"],
    div: ["height", "width", "style"],
    h1: ["id", "class"],
    h2: ["id", "class"],
    h3: ["id", "class"],
    h4: ["id", "class"],
    h5: ["id", "class"],
    h6: ["id", "class"],
  },
  allowedClasses: {
    a: ["anchor"],
    pre: ["highlight", "language-*"],
    span: [
      "atrule-id",
      "attr-name",
      "boolean",
      "cdata",
      "class-name",
      "comment",
      "control",
      "doctype",
      "function",
      "keyword",
      "namespace",
      "number",
      "operator",
      "plain-text",
      "prolog",
      "property",
      "punctuation",
      "regex",
      "regex-delimiter",
      "script",
      "script-punctuation",
      "selector",
      "statement",
      "string",
      "tag",
      "tag-id",
      "token",
      "unit",
    ],
  },
};
