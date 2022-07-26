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
  imageSet: ImageSet,
  imageFolderPath: string
): Promise<string> {
  const response = await fetch(imageSet.primaryUrl);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileType = await FileType.fromBuffer(buffer);
  if (fileType?.ext) {
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
    const outputFileName = `${hash}.${fileType.ext}`;
    const primaryFilePath = writeImageIfNew(
      imageFolderPath,
      outputFileName,
      buffer
    );

    // if there are localized images, save them too, using the same
    // name as the primary but with their language code attached
    for (const localizedImage of imageSet.localizedUrls) {
      const outputFileName = `${hash}-${localizedImage.iso632Code}.${fileType.ext}`;
      console.log("Saving localized image to " + outputFileName);
      const response = await fetch(localizedImage.url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      writeImageIfNew(imageFolderPath, outputFileName, buffer);
    }

    return primaryFilePath;
  } else {
    console.error(
      `Something wrong with the filetype extension on the blob we got from ${imageSet.primaryUrl}`
    );
    return "error";
  }
}
function writeImageIfNew(
  imageFolderPath: string,
  outputFileName: string,
  buffer: Buffer
) {
  const path = imageFolderPath + "/" + outputFileName;
  imageWasSeen(path);
  if (!fs.pathExistsSync(path)) {
    console.log("Adding image " + path);
    fs.createWriteStream(path).write(buffer); // async but we're not waiting
  }
  return outputFileName;
}

function hashOfString(s: string) {
  let hash = 0;
  for (let i = 0; i < s.length; ++i)
    hash = Math.imul(31, hash) + s.charCodeAt(i);

  return Math.abs(hash);
}

// we parse a notion image and its caption into what we need, which includes any urls to localized versions of the image that may be embedded in the caption
type ImageSet = {
  primaryUrl: string;
  caption?: string;
  localizedUrls: Array<{ iso632Code: string; url: string }>;
};
export function parseImageBlock(b: any): ImageSet {
  const imageSet: ImageSet = {
    primaryUrl: "",
    caption: "",
    localizedUrls: [],
  };

  if ("file" in b.image) {
    imageSet.primaryUrl = b.image.file.url; // image saved on notion (actually AWS)
  } else {
    imageSet.primaryUrl = b.image.external.url; // image still pointing somewhere else. I've see this happen when copying a Google Doc into Notion. Notion kep pointing at the google doc.
  }

  const mergedCaption: string = b.image.caption
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    .map((c: any) => c.plain_text)
    .join("");
  const lines = mergedCaption.split("\n");

  // Example:
  // Caption before images.\nfr https://i.imgur.com/pYmE7OJ.png\nES  https://i.imgur.com/8paSZ0i.png\nCaption after images

  lines.forEach(l => {
    const match = /\s*(..)\s*(https:\/\/.*)/.exec(l);
    if (match) {
      imageSet.localizedUrls.push({
        iso632Code: match[1].toUpperCase(),
        url: match[2],
      });
    } else {
      imageSet.caption += l + "\n";
    }
  });
  imageSet.caption = imageSet.caption?.trim();
  //console.log(JSON.stringify(imageSet, null, 2));

  return imageSet;
}

// Download the image if we don't have it, give it a good name, and
// change the src to point to our copy of the image.
export async function processImageBlock(b: any): Promise<void> {
  //console.log(JSON.stringify(b));
  const img = parseImageBlock(b);

  const newPath = imagePrefix + "/" + (await saveImage(img, imageOutputPath));

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
