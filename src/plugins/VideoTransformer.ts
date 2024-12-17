import * as Path from "path";
import { VideoBlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { ListBlockChildrenResponseResult } from "notion-to-md/build/types";
import { IDocuNotionContext, IPlugin } from "./pluginTypes";
import { warning } from "../log";
import { NotionBlock } from "../types";
import { writeAsset } from "../assets";

export const standardVideoTransformer: IPlugin = {
  name: "video",
  notionToMarkdownTransforms: [
    {
      type: "video",
      getStringFromBlock: (context: IDocuNotionContext, block: NotionBlock) =>
        markdownToMDVideoTransformer(block, context),
    },
  ],
};

async function markdownToMDVideoTransformer(
  block: ListBlockChildrenResponseResult,
  context: IDocuNotionContext
): Promise<string> {
  const videoBlock = block as VideoBlockObjectResponse;
  const video = videoBlock.video;
  let url = "";
  switch (video.type) {
    case "external":
      url = `"${video.external.url}"`;
      break;
    case "file":
      // The url we get for a Notion-hosted asset expires after an hour, so we have to download it locally.
      url = await downloadVideoAndConvertUrl(
        context,
        video.file.url,
        videoBlock.id
      );
      break;
    default:
      // video.type can only be "external" or "file" as of the writing of this code, so typescript
      // isn't happy trying to turn video.type into a string. But this default in our switch is
      // just attempting some future-proofing. Thus the strange typing/stringifying below.
      warning(
        `[standardVideoTransformer] Found Notion "video" block with type ${JSON.stringify(
          (video as any).type
        )}. The best docu-notion can do for now is ignore it.`
      );
      return "";
  }

  context.imports.push(`import ReactPlayer from "react-player";`);
  return `<ReactPlayer controls url=${url} />`;
}

// ENHANCE: One day, we may want to allow for options of where to place the files, how
// to name them, etc. Or we could at least follow the image options.
// But for now, I'm just trying to fix the bug that Notion-hosted videos don't work at all.
async function downloadVideoAndConvertUrl(
  context: IDocuNotionContext,
  notionVideoUrl: string,
  blockId: string
): Promise<string> {
  // Get the file name from the url. Ignore query parameters and fragments.
  let newFileName = notionVideoUrl.split("?")[0].split("#")[0].split("/").pop();

  if (!newFileName) {
    // If something went wrong, fall back to the block ID.
    // But at least try to get the extension from the url.
    const extension = notionVideoUrl
      .split("?")[0]
      .split("#")[0]
      .split(".")
      .pop();
    newFileName = blockId + (extension ? "." + extension : "");
  }

  const newPath = Path.posix.join(
    context.pageInfo.directoryContainingMarkdown,
    newFileName
  );

  const response = await fetch(notionVideoUrl);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  writeAsset(newPath, buffer);

  // Add an import statement for the video file.
  // Otherwise, the docusaurus build won't include the video file in the build.
  const countVideoImports = context.imports.filter(i => {
    return /import video\d+/.exec(i);
  }).length;
  const importName = `video${countVideoImports + 1}`;
  context.imports.push(`import ${importName} from "./${newFileName}";`);

  return `{${importName}}`;
}
