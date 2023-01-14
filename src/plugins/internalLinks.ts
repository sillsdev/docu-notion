import { IDocuNotionContext, IPlugin } from "../config/configuration";
import { error, verbose, warning } from "../log";
import { NotionPage } from "../NotionPage";

export function convertInternalLink(
  context: IDocuNotionContext,
  markdownLink: string
): string {
  const linkRegExp = /\[([^\]]+)?\]\(\/?([^),^/]+)\)/g;
  const match = linkRegExp.exec(markdownLink);
  if (match === null) {
    error(`[standardLinkConversion] Could not parse link ${markdownLink}`);
    return markdownLink;
  }

  const originalLink = match[0];
  const hrefFromNotion = match[2];

  const pages = context.pages;
  // find the page where pageId matches hrefFromNotion
  const targetPage = pages.find(p => {
    return p.matchesLinkId !== undefined;
  });

  if (!targetPage) {
    // About this situation. See https://github.com/sillsdev/docu-notion/issues/9
    error(
      `[standardLinkConversion] Could not find the target of this link. Note that links to outline sections are not supported. ${originalLink}. https://github.com/sillsdev/docu-notion/issues/9`
    );
    return "**[Problem Link]**";
  }

  const label = convertLinkLabel(targetPage, match[1] || "");
  const url = convertLinkHref(context, targetPage, hrefFromNotion);
  return `[${label}](${url})`;
}

function convertLinkLabel(targetPage: NotionPage, text: string): string {
  // In Notion, if you just add a link to a page without linking it to any text, then in Notion
  // you see the name of the page as the text of the link. But when Notion gives us that same
  // link, it uses "link_to_page" as the text. So we have to look up the name of the page in
  // order to fix that.;
  if (text !== "link_to_page") return text;
  else return targetPage.nameOrTitle;
}
function convertLinkHref(
  context: IDocuNotionContext,
  targetPage: NotionPage,
  url: string
): string {
  let convertedLink = context.layoutStrategy.getLinkPathForPage(targetPage);

  // Include the fragment (# and after) if it exists
  const { fragmentId } = parseLinkId(url);
  convertedLink += fragmentId;

  verbose(`Converting Link ${url} --> ${convertedLink}`);
  return convertedLink;
}
// Parse the link ID to get the base (before the #) and the fragment (# and after).
export function parseLinkId(fullLinkId: string): {
  baseLinkId: string; // before the #
  fragmentId: string; // # and after
} {
  const iHash: number = fullLinkId.indexOf("#");
  if (iHash >= 0) {
    return {
      baseLinkId: fullLinkId.substring(0, iHash),
      fragmentId: fullLinkId.substring(iHash),
    };
  }
  return { baseLinkId: fullLinkId, fragmentId: "" };
}

export const standardLinkConversion: IPlugin = {
  name: "standard internal link conversion",
  linkModifier: {
    label: "standard internal link conversion",
    // from notion (or notion-md?) we get slightly different hrefs depending on whether the links is "inline"
    // (has some other text that's been turned into a link) or "raw".
    // Raw links come in without a leading slash, e.g. [link_to_page](4a6de8c0-b90b-444b-8a7b-d534d6ec71a4)
    // Inline links come in with a leading slash, e.g. [pointer to the introduction](/4a6de8c0b90b444b8a7bd534d6ec71a4)
    // we only want the inline ones for this plugin
    match: /\[([^\]]+)?\]\(\/?([^),^/]+)\)/,
    convert: convertInternalLink,
  },
};
