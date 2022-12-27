import { join } from "path";
import { LayoutStrategy } from "./LayoutStrategy";
import { verbose, warning } from "./log";
import { NotionPage } from "./NotionPage";

export function convertMermaidInternalLinks(
  markdown: string,
  pages: NotionPage[],
  layoutStrategy: LayoutStrategy,
  slugPrefix: string
): string {
  // Eg url="https://www.notion.so/Introduction-to-docu-notion-779f83504bd94642a9b87b2afc810a97"
  const convertHref = (url: string) => {
    // Do not convert non-notion links
    if (!url.startsWith("https://www.notion.so/")) {
      return url;
    }
    const notionId = url.split("-").pop() || "";

    const page = pages.find(p => {
      return p.matchesLinkId(notionId);
    });
    if (page) {
      let convertedLink = layoutStrategy.getLinkPathForPage(page);

      if (slugPrefix) {
        convertedLink =
          (slugPrefix.startsWith("/") ? "" : "/") +
          join(slugPrefix, convertedLink);
      }

      verbose(`Converting Link ${url} --> ${convertedLink}`);
      return convertedLink;
    }

    // About this situation. See https://github.com/sillsdev/docu-notion/issues/9
    warning(
      `Could not find the target of this link. Note that links to outline sections are not supported. ${url}. https://github.com/sillsdev/docu-notion/issues/9`
    );

    return url;
  };

  return transformMermaidLinks(markdown, convertHref);
}

function transformMermaidLinks(
  pageMarkdown: string,
  convertHref: (url: string) => string
) {
  // The mermaid interactive click syntax:
  // https://mermaid.js.org/syntax/flowchart.html#interaction
  // NB this processing is just for internal link navigation
  const linkRegExp =
    /\s*click\s+([A-za-z][A-za-z0-9_-]*)\s+"(https:\/\/www\.notion\.so\/\S*)"/g;
  let output = pageMarkdown;
  let match;

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
      verbose(`transformed link: ${originalLink}-->${hrefForDocusaurus}`);
    } else {
      verbose(`Maybe problem with link ${JSON.stringify(match)}`);
    }
  }

  return output;
}
