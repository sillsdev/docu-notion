import { ImageSet } from "./images";
import * as Path from "path";
import { error } from "./log";
import { exit } from "process";

export function makeImagePersistencePlan(
  imageSet: ImageSet,
  imageOutputRootPath: string,
  imagePrefix: string
): void {
  if (imageSet.fileType?.ext) {
    // Since most images come from pasting screenshots, there isn't normally a filename. That's fine, we just make a hash of the url
    // Images that are stored by notion come to us with a complex url that changes over time, so we pick out the UUID that doesn't change. Example:
    //    https://s3.us-west-2.amazonaws.com/secure.notion-static.com/d1058f46-4d2f-4292-8388-4ad393383439/Untitled.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAT73L2G45EIPT3X45%2F20220516%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20220516T233630Z&X-Amz-Expires=3600&X-Amz-Signature=f215704094fcc884d37073b0b108cf6d1c9da9b7d57a898da38bc30c30b4c4b5&X-Amz-SignedHeaders=host&x-id=GetObject
    // But around Sept 2023, they changed the url to be something like:
    //    https://prod-files-secure.s3.us-west-2.amazonaws.com/d9a2b712-cf69-4bd6-9d65-87a4ceeacca2/d1bcdc8c-b065-4e40-9a11-392aabeb220e/Untitled.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAT73L2G45EIPT3X45%2F20230915%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20230915T161258Z&X-Amz-Expires=3600&X-Amz-Signature=28fca48e65fba86d539c3c4b7676fce1fa0857aa194f7b33dd4a468ecca6ab24&X-Amz-SignedHeaders=host&x-id=GetObject
    // The thing we want is the last UUID before the ?

    const urlBeforeQuery = imageSet.primaryUrl.split("?")[0];
    const thingToHash = findLastUuid(urlBeforeQuery) ?? urlBeforeQuery;

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
      exit(1);
    }

    imageSet.filePathToUseInMarkdown =
      (imagePrefix?.length > 0 ? imagePrefix : ".") +
      "/" +
      imageSet.outputFileName;
  } else {
    error(
      `Something wrong with the filetype extension on the blob we got from ${imageSet.primaryUrl}`
    );
    exit(1);
  }
}

function findLastUuid(url: string): string | null {
  // Regex for a UUID surrounded by slashes
  const uuidPattern =
    /(?<=\/)[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}(?=\/)/gi;

  // Find all UUIDs
  const uuids = url.match(uuidPattern);
  // Return the last UUID if any exist, else return null
  return uuids ? uuids[uuids.length - 1].trim() : null;
}

export function hashOfString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; ++i)
    hash = Math.imul(31, hash) + s.charCodeAt(i);

  return Math.abs(hash);
}
