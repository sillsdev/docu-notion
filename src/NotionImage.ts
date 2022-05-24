import * as fs from "fs-extra";
import FileType from "file-type";
import fetch from "node-fetch";

let existingImagesNotSeenYetInPull: string[] = [];
let imageOutputPath = "not set yet";
let imagePrefix = "not set yet";

export async function initImageHandling(
  prefix: string,
  outputPath: string
): Promise<void> {
  // If they gave us a trailing slash, remove it because we add it back later.
  // Note that it's up to the caller to have a *leading* slash or not.
  imagePrefix = prefix.replace(/\/$/, "");
  imageOutputPath = outputPath;

  // Currently we don't delete the image directory, because if an image
  // changes, it gets a new id. This way can then prevent downloading
  // and image after the 1st time. The downside is currently we don't
  // have the smarts to remove unused images.
  await fs.mkdir(imageOutputPath, { recursive: true });
}

async function saveImage(
  url: string,
  imageFolderPath: string
): Promise<string> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileType = await FileType.fromBuffer(buffer);
  if (fileType?.ext) {
    // Since most images come from pasting screenshots, there isn't normally a filename. That's fine, we just make a hash of the url
    // Images that are stored by notion come to us with a complex url that changes over time, so we pick out the UUID that doesn't change. Example:
    //    https://s3.us-west-2.amazonaws.com/secure.notion-static.com/d1058f46-4d2f-4292-8388-4ad393383439/Untitled.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAT73L2G45EIPT3X45%2F20220516%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20220516T233630Z&X-Amz-Expires=3600&X-Amz-Signature=f215704094fcc884d37073b0b108cf6d1c9da9b7d57a898da38bc30c30b4c4b5&X-Amz-SignedHeaders=host&x-id=GetObject

    let thingToHash = url;
    const m = /.*secure\.notion-static\.com\/(.*)\//gm.exec(url);
    if (m && m.length > 1) {
      thingToHash = m[1];
    }

    const hash = hashOfString(thingToHash);
    const outputFileName = `${hash}.${fileType.ext}`;
    const path = imageFolderPath + "/" + outputFileName;
    imageWasSeen(path);
    if (!fs.pathExistsSync(path)) {
      // // I think that this ok that this is writing async as we continue
      console.log("Adding image " + path);
      fs.createWriteStream(path).write(buffer);
    }
    return outputFileName;
  } else {
    console.error(
      `Something wrong with the filetype extension on the blob we got from ${url}`
    );
    return "error";
  }
}
function hashOfString(s: string) {
  let hash = 0;
  for (let i = 0; i < s.length; ++i)
    hash = Math.imul(31, hash) + s.charCodeAt(i);

  return Math.abs(hash);
}

// Download the image if we don't have it, give it a good name, and
// change the src to point to our copy of the image.
export async function processImageBlock(b: any): Promise<void> {
  let url = "";
  if ("file" in b.image) {
    url = b.image.file.url; // image saved on notion (actually AWS)
  } else {
    url = b.image.external.url; // image still pointing somewhere else. I've see this happen when copying a Google Doc into Notion. Notion kep pointing at the google doc.
  }

  const newPath = imagePrefix + "/" + (await saveImage(url, imageOutputPath));

  // change the src to point to our copy of the image
  if ("file" in b.image) {
    b.image.file.url = newPath;
  } else {
    b.image.external.url = newPath;
  }
}

function imageWasSeen(path: string) {
  existingImagesNotSeenYetInPull = existingImagesNotSeenYetInPull.filter(
    p => p !== path
  );
}

export async function cleanupOldImages(): Promise<void> {
  for (const p of existingImagesNotSeenYetInPull) {
    console.log(`Removing old image: ${p}`);
    await fs.rm(p);
  }
}
