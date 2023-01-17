import { IDocuNotionContext, IPlugin } from "../config/configuration";
import { error, warning } from "../log";

export const standardExternalLinkConversion: IPlugin = {
  name: "standard external link conversion",
  linkModifier: {
    match: /\[.*\]\(http.*\)/,
    convert: (context: IDocuNotionContext, markdownLink: string) => {
      const linkRegExp = /\[([^\]]+)?\]\((http.*)\)/;
      const match = linkRegExp.exec(markdownLink);
      if (match === null) {
        error(
          `[standardExternalLinkConversion] Could not parse link ${markdownLink}`
        );
        return markdownLink;
      }
      const label = match[1];
      const url = match[2];
      if (label === "bookmark") {
        const replacement = `[${url}](${url})`;
        warning(
          `[standardExternalLinkConversion] Found Notion "Bookmark" link. In Notion this would show as an embed. The best docu-notion can do at the moment is replace "Bookmark" with the actual URL: ${replacement}`
        );
        return replacement;
      }
      return `[${label}](${url})`;
    },
  },
};
