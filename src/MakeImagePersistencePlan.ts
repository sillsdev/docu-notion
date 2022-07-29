import { ImageSet } from "./NotionImage";
import * as Path from "path";
import { error } from "./log";

export function makeImagePersistencePlan(
  imageSet: ImageSet,
  imageOutputRootPath: string,
  imagePrefix: string
): void {
  if (imageSet.fileType?.ext) {
    // Since most images come from pasting screenshots, there isn't normally a filename. That's fine, we just make a hash of the url
    // Images that are stored by notion come to us with a complex url that changes over time, so we pick out the UUID that doesn't change. Example:
    //    https://s3.us-west-2.amazonaws.com/secure.notion-static.com/d1058f46-4d2f-4292-8388-4ad393383439/Untitled.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAT73L2G45EIPT3X45%2F20220516%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20220516T233630Z&X-Amz-Expires=3600&X-Amz-Signature=f215704094fcc884d37073b0b108cf6d1c9da9b7d57a898da38bc30c30b4c4b5&X-Amz-SignedHeaders=host&x-id=GetObject

    let thingToHash = imageSet.primaryUrl;
    const m = /.*secure\.notion-static\.com\/(.*)\//gm.exec(
      imageSet.primaryUrl
    );
    if (m && m.length > 1) {
      thingToHash = m[1];
    }

    const hash = hashOfString(thingToHash);
    imageSet.outputFileName = `${hash}.${imageSet.fileType.ext}`;

    imageSet.primaryFileOutputPath = Path.posix.join(
      imageOutputRootPath?.length > 0
        ? imageOutputRootPath
        : imageSet.pathToParentDocument!,
      imageSet.outputFileName
    );

    if (imageOutputRootPath && imageSet.localizedUrls.length) {
      error(
        "imageOutputPath was declared, but one or more localizedUrls were found too. If you are going to localize screenshots, then you can't declare an imageOutputPath."
      );
    }

    imageSet.filePathToUseInMarkdown =
      (imagePrefix?.length > 0 ? imagePrefix : ".") +
      "/" +
      imageSet.outputFileName;
  } else {
    error(
      `Something wrong with the filetype extension on the blob we got from ${imageSet.primaryUrl}`
    );
  }
}

function hashOfString(s: string) {
  let hash = 0;
  for (let i = 0; i < s.length; ++i)
    hash = Math.imul(31, hash) + s.charCodeAt(i);

  return Math.abs(hash);
}
