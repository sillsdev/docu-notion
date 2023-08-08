import { IPlugin } from "./pluginTypes";

export const standardVideoTransformer: IPlugin = {
  name: "video",
  notionToMarkdownTransforms: [
    {
      type: "video",
      getStringFromBlock: async (context, block) => {
        const blockAsAny = block as any;
        if (blockAsAny?.video?.external?.url) {
          context.imports = [`import ReactPlayer from "react-player";`];
          return `<ReactPlayer controls url="${
            blockAsAny.video.external.url as string
          }" />`;
        } else return await context.notionToMarkdown.blockToMarkdown(block);
      },
    },
  ],
};
