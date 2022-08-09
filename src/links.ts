import { LayoutStrategy } from "./LayoutStrategy";
import { verbose, warning } from "./log";
import { NotionPage } from "./NotionPage";

export function convertInternalLinks(
  markdown: string,
  pages: NotionPage[],
  layoutStrategy: LayoutStrategy
): string {
  //console.log(JSON.stringify(pages, null, 2));

  return transformLinks(markdown, (url: string) => {
    const p = pages.find(p => {
      return p.matchesLinkId(url);
    });
    if (p) {
      verbose(
        `Converting Link ${url} --> ${layoutStrategy.getLinkPathForPage(p)}`
      );
      return layoutStrategy.getLinkPathForPage(p);
    }

    warning(
      `Could not find the target of this link. Note that links to outline sections are not supported. ${url}`
    );

    return url;
  });
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

function transformLinks(input: string, transform: (url: string) => string) {
  // Note: from notion (or notion-md?) we get slightly different hrefs depending on whether the links is "inline"
  // (has some other text that's been turned into a link) or "raw".
  // Raw links come in without a leading slash, e.g. [link_to_page](4a6de8c0-b90b-444b-8a7b-d534d6ec71a4)
  // Inline links come in with a leading slash, e.g. [pointer to the introduction](/4a6de8c0b90b444b8a7bd534d6ec71a4)
  const linkRegExp = /\[([^\]]+)?\]\(\/?([^),^/]+)\)/g;
  let output = input;
  let match;

  // The key to understanding this while is that linkRegExp actually has state, and
  // it gives you a new one each time. https://stackoverflow.com/a/1520853/723299
  verbose(`transformLinks ${input}`);
  while ((match = linkRegExp.exec(input)) !== null) {
    const string = match[0];
    const text = match[1] || "";
    const url = match[2];

    const replacement = transform(url);

    if (replacement) {
      output = output.replace(string, `[${text}](${replacement})`);
    } else {
      verbose(`Maybe problem with link ${JSON.stringify(match)}`);
    }
  }

  return output;
}
