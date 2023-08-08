import { VideoBlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { IDocuNotionContext, IPlugin } from "./pluginTypes";
import { warning } from "../log";
import { NotionBlock } from "../types";

export const standardVideoTransformer: IPlugin = {
  name: "video",
  notionToMarkdownTransforms: [
    {
      type: "video",
      getStringFromBlock: (
        context: IDocuNotionContext,
        block: NotionBlock
      ): string => {
        const video = (block as VideoBlockObjectResponse).video;
        if (video.type === "external") {
          if (!context.imports) context.imports = [];
          context.imports.push(`import ReactPlayer from "react-player";`);
          return `<ReactPlayer controls url="${video.external.url}" />`;
        } else {
          warning(
            `[standardVideoTransformer] Found Notion "video" block with type ${video.type}. The best docu-notion can do for now is ignore it.`
          );
        }
        return "";
      },
    },
  ],
};
