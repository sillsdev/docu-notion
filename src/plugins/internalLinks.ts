import { IDocuNotionContext, IPlugin } from "./pluginTypes";
import { error, warning } from "../log";
import { NotionPage } from "../NotionPage";

const kNotionUrlRegExp =
  /^https?:\/\/(?:www\.)?notion\.so\/|^https?:\/\/app\.notion\.com\//;

function getLegacyTrailingSegment(pathOrId: string): string | undefined {
  const trimmedPath = pathOrId.replace(/^\/+|\/+$/g, "");
  const lastPathSegment = trimmedPath.split("/").at(-1);
  if (!lastPathSegment) return undefined;

  const trailingDashSegment = lastPathSegment.split("-").at(-1);
  return trailingDashSegment || lastPathSegment;
}

function normalizeLinkBaseId(baseLinkId: string): string {
  const withoutQuery = baseLinkId.split("?")[0];

  if (kNotionUrlRegExp.test(withoutQuery)) {
    try {
      const url = new URL(withoutQuery);
      const trimmedPath = url.pathname.replace(/^\/+|\/+$/g, "");
      const appPathWithoutPrefix = trimmedPath.startsWith("p/")
        ? trimmedPath.substring(2)
        : trimmedPath;
      return (
        getLegacyTrailingSegment(appPathWithoutPrefix) || appPathWithoutPrefix
      );
    } catch {
      return withoutQuery;
    }
  }

  const withoutLeadingSlash = withoutQuery.replace(/^\/+/, "");
  return withoutLeadingSlash;
}

// converts a url to a local link, if it is a link to a page in the Notion site
// only here for plugins, notion won't normally be giving us raw urls (at least not that I've noticed)
// If it finds a URL but can't find the page it points to, it will return undefined.
// If it doesn't find a match at all, it returns undefined.
export function convertInternalUrl(
  context: IDocuNotionContext,
  url: string
): string | undefined {
  const { baseLinkId } = parseLinkId(url);
  if (baseLinkId === url) {
    warning(
      `[standardInternalLinkConversion] Could not parse link ${url} as a Notion URL`
    );
    return undefined;
  }

  const pages = context.pages;
  // find the page where pageId matches hrefFromNotion
  const targetPage = pages.find(p => {
    return p.matchesLinkId(baseLinkId);
  });

  if (!targetPage) {
    // About this situation. See https://github.com/sillsdev/docu-notion/issues/9
    warning(
      `[standardInternalLinkConversion] Could not find the target of this link. Note that links to outline sections are not supported. ${url}. https://github.com/sillsdev/docu-notion/issues/9`
    );
    return undefined;
  }
  return convertLinkHref(context, targetPage, url);
}

// handles the whole markdown link, including the label
function convertInternalLink(
  context: IDocuNotionContext,
  markdownLink: string
): string {
  // match both [foo](/123) and [bar](https://app.notion.com/p/123) mention-style links
  const linkRegExp = /\[([^\]]+)?\]\(([^)]+)\)/;
  const match = linkRegExp.exec(markdownLink);
  if (match === null) {
    warning(
      `[standardInternalLinkConversion] Could not parse link ${markdownLink}`
    );
    return markdownLink;
  }

  const labelFromNotion = match[1] || "";
  const hrefFromNotion = match[2];

  // verbose(
  //   `[standardInternalLinkConversion] Converting ${markdownLink} with has url ${hrefFromNotion}`
  // );

  const pages = context.pages;
  // find the page where pageId matches hrefFromNotion
  const targetPage = pages.find(p => {
    return p.matchesLinkId(hrefFromNotion);
  });

  if (!targetPage) {
    // About this situation. See https://github.com/sillsdev/docu-notion/issues/9
    warning(
      `[standardInternalLinkConversion] Could not find the target of this link. Note that links to outline sections are not supported. ${markdownLink}. https://github.com/sillsdev/docu-notion/issues/9`
    );
    return "**[Problem Internal Link]**";
  }

  const label = convertLinkLabel(targetPage, labelFromNotion);
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

  /*****************************
  NOTE: as of this writing, the official Notion API completely drops links
  to headings, unless they are part of a inline link.
  *******************************/

  // Include the fragment (# and after) if it exists
  const { fragmentId } = parseLinkId(url);
  //verbose(`Parsed ${url} and got Fragment ID: ${fragmentId}`);
  convertedLink += fragmentId;

  //verbose(`Converting Link ${url} --> ${convertedLink}`);
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
      baseLinkId: normalizeLinkBaseId(fullLinkId.substring(0, iHash)),
      fragmentId: fullLinkId.substring(iHash),
    };
  }
  return { baseLinkId: normalizeLinkBaseId(fullLinkId), fragmentId: "" };
}

export const standardInternalLinkConversion: IPlugin = {
  name: "standard internal link conversion",
  linkModifier: {
    // from notion (or notion-md?) we get slightly different hrefs depending on whether the links is "inline"
    // (has some other text that's been turned into a link) or "raw".
    // Raw links come in without a leading slash, e.g. [link_to_page](4a6de8c0-b90b-444b-8a7b-d534d6ec71a4)
    // Inline links come in with a leading slash, e.g. [pointer to the introduction](/4a6de8c0b90b444b8a7bd534d6ec71a4)
    // "Mention" links come in as full URLs, e.g. [link_to_page](https://www.notion.so/62f1187010214b0883711a1abb277d31)
    // Newer Notion links can also use app.notion.com, including /p/<page-id> URLs.
    // YOu can create them either with @+the name of a page, or by pasting a URL and then selecting the "Mention" option.
    match:
      /\[([^\]]+)?\]\((?!mailto:)(https?:\/\/(?:www\.)?notion\.so\/[^),^/]+|https?:\/\/app\.notion\.com\/(?:p\/)?[^),^/]+|\/?[^),^/]+)\)/,
    convert: convertInternalLink,
  },
};
