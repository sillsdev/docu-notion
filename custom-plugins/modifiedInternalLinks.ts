// current docu-notion does not prefix the slug with
// e.g. /docs which breaks links
import { IDocuNotionContext, IPlugin } from "../src/plugins/pluginTypes";

export const modifiedStandardInternalLinkConversion: IPlugin = {
  name: "modified standard internal link conversion",
  regexMarkdownModifications: [
    {
      regex: /\[([^\]]+)?\]\((?!mailto:)(\/?[^),^\/]+)\)/,
      getReplacement: async (
        context: IDocuNotionContext,
        match: RegExpExecArray
      ): Promise<string> => {
        const slugPrefix = context.options.markdownOutputPath.split("/").pop();
        const label = match[1];
        let url = match[2];
        if (!url.startsWith(`/${slugPrefix}`)) {
          url = `/${slugPrefix}${url}`;
        }
        return `[${label}](${url})`;
      },
    },
  ],
};
