import { IPlugin } from "./config/configuration";
import { LayoutStrategy } from "./LayoutStrategy";
import { error, verbose, warning } from "./log";
import { NotionPage } from "./NotionPage";

export function convertInternalLinks(
  markdown: string,
  pages: NotionPage[],
  layoutStrategy: LayoutStrategy
): string {
  const convertHref = (url: string) => {
    const page = pages.find(p => {
      return p.matchesLinkId(url);
    });
    if (page) {
      let convertedLink = layoutStrategy.getLinkPathForPage(page);

      // Include the fragment (# and after) if it exists
      const { fragmentId } = parseLinkId(url);
      convertedLink += fragmentId;

      verbose(`Converting Link ${url} --> ${convertedLink}`);
      return convertedLink;
    }

    // About this situation. See https://github.com/sillsdev/docu-notion/issues/9
    warning(
      `Could not find the target of this link. Note that links to outline sections are not supported. ${url}. https://github.com/sillsdev/docu-notion/issues/9`
    );

    return url;
  };
  const convertLinkText = (text: string, url: string) => {
    // In Notion, if you just add a link to a page without linking it to any text, then in Notion
    // you see the name of the page as the text of the link. But when Notion gives us that same
    // link, it uses "link_to_page" as the text. So we have to look up the name of the page in
    // order to fix that.
    if (text !== "link_to_page") {
      return text;
    }

    const p = pages.find(p => {
      return p.matchesLinkId(url);
    });
    if (p) {
      return p.nameOrTitle;
    } else {
      error(`Encountered a link to page ${url} but could not find that page.`);
      return "Problem Link";
    }
  };
  return transformLinks(markdown, convertHref, convertLinkText);
}

// function convertInternalLinks(
//   blocks: (
//     | ListBlockChildrenResponse
//     | /* not avail in types: BlockObjectResponse so we use any*/ any
//   )[]
// ): void {
//   // Note. Waiting on https://github.com/souvikinator/notion-to-md/issues/31 before we can get at raw links to other pages.
//   // But we can do the conversion now... they just won't actually make it out to the markdown until that gets fixed.
//   // blocks
//   //   .filter((b: any) => b.type === "link_to_page")
//   //   .forEach((b: any) => {
//   //     const targetId = b.link_to_page.page_id;
//   //   });

//     blocks
//     .filter((b: any) => b.paragraph.rich_text. === "link_to_page")
//     .forEach((b: any) => {
//       const targetId = b.text.link.url;
//     });
// }

function transformLinks(
  pageMarkdown: string,
  convertHref: (url: string) => string,
  convertLinkText: (text: string, url: string) => string
) {
  // Note: from notion (or notion-md?) we get slightly different hrefs depending on whether the links is "inline"
  // (has some other text that's been turned into a link) or "raw".
  // Raw links come in without a leading slash, e.g. [link_to_page](4a6de8c0-b90b-444b-8a7b-d534d6ec71a4)
  // Inline links come in with a leading slash, e.g. [pointer to the introduction](/4a6de8c0b90b444b8a7bd534d6ec71a4)
  const linkRegExp = /\[([^\]]+)?\]\(\/?([^),^/]+)\)/g;
  let output = pageMarkdown;
  let match;

  // The key to understanding this while is that linkRegExp actually has state, and
  // it gives you a new one each time. https://stackoverflow.com/a/1520853/723299

  while ((match = linkRegExp.exec(pageMarkdown)) !== null) {
    const originalLink = match[0];

    const hrefFromNotion = match[2];
    const text = convertLinkText(match[1] || "", hrefFromNotion);
    const hrefForDocusaurus = convertHref(hrefFromNotion);

    if (hrefForDocusaurus) {
      output = output.replace(originalLink, `[${text}](${hrefForDocusaurus})`);
      verbose(`transformed link: ${originalLink}-->${hrefForDocusaurus}`);
    } else {
      verbose(`Maybe problem with link ${JSON.stringify(match)}`);
    }
  }

  return output;
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
  name: "standard link conversion",
  linkResolvers: [
    {
      label: "standard link conversion",
      resolveFn: (link: string, pages: NotionPage[]) => {
        return "todo... make use of the above";
      },
    },
  ],
};
