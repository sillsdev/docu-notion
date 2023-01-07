import { IPlugin, NotionBlock } from "../config/configuration";

export const escapeHtmlBlockModifier: IPlugin = {
  name: "escapeHtmlBlockModifier",

  notionBlockModifications: [
    {
      label: "escapeHtmlBlockModifier",
      modify: (blocks: NotionBlock[]) => {
        blocks.forEach(block => escapeHtml(block));
      },
    },
  ],
};

function escapeHtml(block: any): void {
  const blockContent = block[block.type];

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
