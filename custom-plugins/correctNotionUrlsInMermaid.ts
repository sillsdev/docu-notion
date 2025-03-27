import { CodeBlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import {
  IDocuNotionContext,
  IPlugin,
  Log,
  NotionBlock,
} from "../src/plugins/pluginTypes";

// Helper function to join URL paths properly
function joinPaths(...parts: string[]): string {
  return parts
    .map(part => part.replace(/^\/+|\/+$/g, "")) // Remove leading/trailing slashes
    .filter(part => part.length > 0) // Remove empty parts
    .join("/"); // Join with a single slash
}

// The mermaid interactive click syntax:
// https://mermaid.js.org/syntax/flowchart.html#interaction
// NB this processing is just for internal link navigation
export function correctNotionUrlsInMermaid(args?: {
  slugPrefix?: string;
}): IPlugin {
  const { slugPrefix: slugPrefixFromArgs } = args || {};
  return {
    name: "correctNotionUrlsInMermaid",

    notionToMarkdownTransforms: [
      {
        type: "code",
        getStringFromBlock: (
          context: IDocuNotionContext,
          block: NotionBlock
        ) => {
          const slugPrefix =
            slugPrefixFromArgs !== undefined
              ? slugPrefixFromArgs
              : context.options.markdownOutputPath.split("/").pop();
          const codeBlock = block as CodeBlockObjectResponse;
          let text: string = codeBlock.code.rich_text[0].plain_text;
          let language: string = codeBlock.code.language;

          if (language === "plain text") {
            language = "text";
          }

          if (language === "mermaid") {
            text = transformMermaidLinks(text, url =>
              convertHref({ url, context, slugPrefix })
            );
          }

          // HACK JUST FOR ME
          // HACK use notion code type "coffeescript" to render jsx live
          if (language === "coffeescript") {
            language = "jsx live";
          }

          return `\`\`\`${language}\n${text}\n\`\`\``;
        },
      },
    ],
  };
}

const convertHref = (args: {
  url: string;
  context: IDocuNotionContext;
  slugPrefix?: string;
}) => {
  const { url, context, slugPrefix } = args;

  // Do not convert non-notion links
  if (!url.startsWith("https://www.notion.so/")) {
    return url;
  }
  const notionId = new URL(url).pathname.split("-").pop() || "";

  const page = context.pages.find(p => {
    return p.matchesLinkId(notionId);
  });
  if (page) {
    let convertedLink = context.layoutStrategy.getLinkPathForPage(page);
    // console.log("convertedLink", convertedLink);

    if (slugPrefix) {
      // Ensure the path starts with a slash if needed
      convertedLink = "/" + joinPaths(slugPrefix, convertedLink);
      // Remove duplicate leading slash if slugPrefix already had one
      convertedLink = convertedLink.replace(/^\/+/, "/");
    }

    Log.verbose(`Converting Link ${url} --> ${convertedLink}`);
    return convertedLink;
  }

  // About this situation. See https://github.com/sillsdev/docu-notion/issues/9
  Log.warning(
    `Could not find the target of this link. Note that links to outline sections are not supported. ${url}. https://github.com/sillsdev/docu-notion/issues/9`
  );

  return url;
};

const transformMermaidLinks = (
  pageMarkdown: string,
  convertHref: (url: string) => string
) => {
  // The mermaid interactive click syntax:
  // https://mermaid.js.org/syntax/flowchart.html#interaction
  // NB this processing is just for internal link navigation
  const linkRegExp =
    /\s*click\s+([A-za-z][A-za-z0-9_-]*)\s+"?(https:\/\/www\.notion\.so\/\S*)"/g;
  let output = pageMarkdown;
  let match: RegExpExecArray | null;

  // The key to understanding this while is that linkRegExp actually has state, and
  // it gives you a new one each time. https://stackoverflow.com/a/1520853/723299

  while ((match = linkRegExp.exec(pageMarkdown)) !== null) {
    const originalLink = match[0];

    const hrefFromNotion = match[2];
    const hrefForDocusaurus = convertHref(hrefFromNotion);

    if (hrefForDocusaurus) {
      output = output.replace(
        match[0],
        `\n  click ${match[1]} "${hrefForDocusaurus}"`
      );
      Log.verbose(`transformed link: ${originalLink}-->${hrefForDocusaurus}`);
    } else {
      Log.verbose(`Maybe problem with link ${JSON.stringify(match)}`);
    }
  }

  return output;
};
