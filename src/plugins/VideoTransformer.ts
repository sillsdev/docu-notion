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
        let url = "";
        switch (video.type) {
          case "external":
            url = video.external.url;
            break;
          case "file":
            url = video.file.url;
            break;
          default:
            warning(
              `[standardVideoTransformer] Found Notion "video" block with type ${video.type}. The best docu-notion can do for now is ignore it.`
            );
            return "";
            break;
        }

        context.imports.push(`import ReactPlayer from "react-player";`);
        return `<ReactPlayer controls url="${url}" />`;
      },
    },
  ],
};
