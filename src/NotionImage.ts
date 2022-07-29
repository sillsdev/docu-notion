import * as fs from "fs-extra";
import FileType, { FileTypeResult } from "file-type";
import fetch from "node-fetch";
import * as Path from "path";
import { makeImagePersistencePlan } from "./MakeImagePersistencePlan";
import { logDebug, verbose, info } from "./log";

let existingImagesNotSeenYetInPull: string[] = [];
let imageOutputPath = ""; // default to putting in the same directory as the document referring to it.
let imagePrefix = ""; // default to "./"

// we parse a notion image and its caption into what we need, which includes any urls to localized versions of the image that may be embedded in the caption
export type ImageSet = {
  // We get these from parseImageBlock():
  primaryUrl: string;
  caption?: string;
  localizedUrls: Array<{ iso632Code: string; url: string }>;

  // then we fill this in from processImageBlock():
  pathToParentDocument?: string;
  relativePathToParentDocument?: string;

  // then we fill these in readPrimaryImage():
  primaryBuffer?: Buffer;
  fileType?: FileTypeResult;

  // then we fill these in from makeImagePersistencePlan():
  primaryFileOutputPath?: string;
  outputFileName?: string;
  filePathToUseInMarkdown?: string;
};

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
  if (imageOutputPath) {
    await fs.mkdir(imageOutputPath, { recursive: true });
  }
}

async function readPrimaryImage(imageSet: ImageSet) {
  const response = await fetch(imageSet.primaryUrl);
  const arrayBuffer = await response.arrayBuffer();
  imageSet.primaryBuffer = Buffer.from(arrayBuffer);
  imageSet.fileType = await FileType.fromBuffer(imageSet.primaryBuffer);
}

async function saveImage(imageSet: ImageSet): Promise<void> {
  writeImageIfNew(imageSet.primaryFileOutputPath!, imageSet.primaryBuffer!);

  let foundLocalizedImage = false;

  // if there are localized images, save them too, using the same
  // name as the primary but with their language code attached
  for (const localizedImage of imageSet.localizedUrls) {
    verbose(`Retrieving ${localizedImage.iso632Code} version...`);
    const response = await fetch(localizedImage.url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const directory = `./i18n/${
      localizedImage.iso632Code
    }/docusaurus-plugin-content-docs/current/${imageSet.relativePathToParentDocument!}`;
    if (!foundLocalizedImage) {
      foundLocalizedImage = true;
      info(
        "*** found at least one localized image, so /i18n directory will be created and filled with localized image files."
      );
    }
    writeImageIfNew(directory + "/" + imageSet.outputFileName!, buffer);
  }
}

function writeImageIfNew(path: string, buffer: Buffer) {
  imageWasSeen(path);
  if (!fs.pathExistsSync(path)) {
    verbose("Adding image " + path);
    fs.mkdirsSync(Path.dirname(path));
    fs.createWriteStream(path).write(buffer); // async but we're not waiting
  } else {
    verbose(`image already filled: ${path}`);
  }
}

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
        iso632Code: match[1].toLowerCase(),
        url: match[2],
      });
    } else {
      // NB: carriage returns seem to mess up the markdown, so should be removed
      imageSet.caption += l + " ";
    }
  });
  // NB: currently notion-md puts the caption in Alt, which noone sees (unless the image isn't found)
  // We could inject a custom element handler to emit a <figure> in order to show the caption.
  imageSet.caption = imageSet.caption?.trim();
  //console.log(JSON.stringify(imageSet, null, 2));

  return imageSet;
}

// Download the image if we don't have it, give it a good name, and
// change the src to point to our copy of the image.
export async function processImageBlock(
  b: any,
  pathToParentDocument: string,
  relativePathToThisPage: string
): Promise<void> {
  logDebug("processImageBlock", JSON.stringify(b));

  // this is broken into all these steps to facilitate unit testing without IO
  const imageSet = parseImageBlock(b);
  imageSet.pathToParentDocument = pathToParentDocument;
  imageSet.relativePathToParentDocument = relativePathToThisPage;

  await readPrimaryImage(imageSet);
  makeImagePersistencePlan(imageSet, imageOutputPath, imagePrefix);
  await saveImage(imageSet);

  // change the src to point to our copy of the image
  if ("file" in b.image) {
    b.image.file.url = imageSet.filePathToUseInMarkdown;
  } else {
    b.image.external.url = imageSet.filePathToUseInMarkdown;
  }
  // put back the simplified caption, stripped of the meta information
  if (imageSet.caption) {
    b.image.caption = [
      {
        type: "text",
        text: { content: imageSet.caption, link: null },
        plain_text: imageSet.caption,
      },
    ];
  } else {
    b.image.caption = [];
  }
}

function imageWasSeen(path: string) {
  existingImagesNotSeenYetInPull = existingImagesNotSeenYetInPull.filter(
    p => p !== path
  );
}

export async function cleanupOldImages(): Promise<void> {
  for (const p of existingImagesNotSeenYetInPull) {
    verbose(`Removing old image: ${p}`);
    await fs.rm(p);
  }
}
