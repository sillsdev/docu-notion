import { NotionBlock } from "../types";
import { IPlugin } from "./pluginTypes";

export const standardEscapeHtmlBlockModifier: IPlugin = {
  name: "standardEscapeHtmlBlockModifier",

  notionBlockModifications: [
    {
      modify: (block: NotionBlock) => {
        escapeHtml(block);
      },
    },
  ],
};

function escapeHtml(block: NotionBlock): void {
  //console.log("escapeHtml called with\n", JSON.stringify(block, null, 2));
  const blockContent = (block as any)[block.type]; // e.g. block["paragraph"] gives an array of the strings that make up the paragraph
  if (blockContent.rich_text?.length) {
    for (let i = 0; i < blockContent.rich_text.length; i++) {
      const rt = blockContent.rich_text[i];

      // See https://github.com/sillsdev/docu-notion/issues/21.
      // For now, we just do a simple replace of < an > with &lt; and &gt;
      // but only if the text will not be displayed as code.
      // If it will be displayed as code,
      // a) nothing will be trying to parse it, so it is safe.
      // b) at no point does anything interpret the escaped character **back** to html;
      //    so it will be displayed as "&lt;" or "&gt;".
      // We may have to add more complex logic here in the future if we
      // want to start letting html through which we **do** want to parse.
      // For example, we could assume that text in a valid html structure should be parsed.
      if (
        rt?.plain_text &&
        block.type !== "code" &&
        rt.type !== "code" &&
        !rt.annotations?.code
      ) {
        rt.plain_text = rt.plain_text
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;");
      }
    }
  }
}
