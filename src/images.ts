import * as fs from "fs-extra";
import FileType, { FileTypeResult } from "file-type";
import { makeImagePersistencePlan } from "./MakeImagePersistencePlan";
import { logDebug, verbose } from "./log";
import { ListBlockChildrenResponseResult } from "notion-to-md/build/types";
import {
  IDocuNotionContext,
  IDocuNotionContextPageInfo,
  IPlugin,
} from "./plugins/pluginTypes";
import { writeAsset } from "./assets";

// We handle several things here:
// 1) copy images locally instead of leaving them in Notion
// 2) change the links to point here
// 3) read the caption and if there are localized images, get those too
// 4) prepare for localized documents, which need a copy of every image

let existingImagesNotSeenYetInPull: string[] = [];
let imageOutputPath = ""; // default to putting in the same directory as the document referring to it.
let imagePrefix = ""; // default to "./"
let locales: string[];

// we parse a notion image and its caption into what we need, which includes any urls to localized versions
// of the image that may be embedded in the caption.
export type ImageSet = {
  // We get these from parseImageBlock():
  primaryUrl: string;
  // caption may contain a caption and/or URLs to localized versions
  caption?: string;
  // We use entries in localizedUrls whether or not we have a url, because if we don't have
  // a localized image, we then need to copy the primary image in, instead, to
  // get image fallback. In that case, the placeholder at least tells us what languages
  // are being supported.
  localizedUrls: Array<{ iso632Code: string; url: string }>;

  // then we fill this in from processImageBlock():
  pageInfo?: IDocuNotionContextPageInfo;

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
  outputPath: string,
  incomingLocales: string[]
): Promise<void> {
  // If they gave us a trailing slash, remove it because we add it back later.
  // Note that it's up to the caller to have a *leading* slash or not.
  imagePrefix = prefix.replace(/\/$/, "");
  imageOutputPath = outputPath;
  locales = incomingLocales;

  // Currently we don't delete the image directory, because if an image
  // changes, it gets a new id. This way can then prevent downloading
  // and image after the 1st time. The downside is currently we don't
  // have the smarts to remove unused images.
  if (imageOutputPath) {
    await fs.mkdir(imageOutputPath, { recursive: true });
  }
}

export const standardImageTransformer: IPlugin = {
  name: "DownloadImagesToRepo",
  notionToMarkdownTransforms: [
    {
      type: "image",
      // we have to set this one up for each page because we need to
      // give it two extra parameters that are context for each page
      getStringFromBlock: (
        context: IDocuNotionContext,
        block: ListBlockChildrenResponseResult
      ) => markdownToMDImageTransformer(block, context),
    },
  ],
};

// This is a "custom transformer" function passed to notion-to-markdown
// eslint-disable-next-line @typescript-eslint/require-await
export async function markdownToMDImageTransformer(
  block: ListBlockChildrenResponseResult,
  context: IDocuNotionContext
): Promise<string> {
  const image = (block as any).image;

  await processImageBlock(block, context);

  // just concatenate the caption text parts together
  const altText: string = image.caption
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    .map((item: any) => item.plain_text)
    .join("");

  const href: string =
    image.type === "external" ? image.external.url : image.file.url;
  return `![${altText}](${href})`;
}

async function processImageBlock(
  block: any,
  context: IDocuNotionContext
): Promise<void> {
  const imageBlock = block.image;
  logDebug("processImageBlock", JSON.stringify(imageBlock));

  const imageSet = parseImageBlock(imageBlock);
  imageSet.pageInfo = context.pageInfo;

  // enhance: it would much better if we could split the changes to markdown separately from actual reading/writing,
  // so that this wasn't part of the markdown-creation loop. It's already almost there; we just need to
  // save the imageSets somewhere and then do the actual reading/writing later.
  await readPrimaryImage(imageSet);
  makeImagePersistencePlan(
    context.options,
    imageSet,
    block.id,
    imageOutputPath,
    imagePrefix
  );
  await saveImage(imageSet);

  // change the src to point to our copy of the image
  if ("file" in imageBlock) {
    imageBlock.file.url = imageSet.filePathToUseInMarkdown;
  } else {
    imageBlock.external.url = imageSet.filePathToUseInMarkdown;
  }
  // put back the simplified caption, stripped of the meta information
  if (imageSet.caption) {
    imageBlock.caption = [
      {
        type: "text",
        text: { content: imageSet.caption, link: null },
        plain_text: imageSet.caption,
      },
    ];
  } else {
    imageBlock.caption = [];
  }
}

async function readPrimaryImage(imageSet: ImageSet) {
  // In Mar 2024, we started having a problem getting a particular gif from imgur using
  // node-fetch. Switching to axios resolved it. I don't know why.
  // Then, in Apr 2025, we started getting 429 responses from imgur through axios,
  // so we switched to node's built-in fetch (different than the node-fetch package).
  // Just a guess, but probably imgur keeps locking down what it suspects as code running
  // to scrape images.
  // Apparently, imgur is getting to be more and more of a liability,
  // so we should probably stop using it.
  const response = await fetch(imageSet.primaryUrl);
  const arrayBuffer = await response.arrayBuffer();
  imageSet.primaryBuffer = Buffer.from(arrayBuffer);
  imageSet.fileType = await FileType.fromBuffer(imageSet.primaryBuffer);
}

async function saveImage(imageSet: ImageSet): Promise<void> {
  const path = imageSet.primaryFileOutputPath!;
  imageWasSeen(path);
  writeAsset(path, imageSet.primaryBuffer!);

  for (const localizedImage of imageSet.localizedUrls) {
    let buffer = imageSet.primaryBuffer!;
    // if we have a url for the localized screenshot, download it
    if (localizedImage?.url.length > 0) {
      verbose(`Retrieving ${localizedImage.iso632Code} version...`);
      const response = await fetch(localizedImage.url);
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      verbose(
        `No localized image specified for ${localizedImage.iso632Code}, will use primary image.`
      );
      // otherwise, we're going to fall back to outputting the primary image here
    }
    const directory = `./i18n/${
      localizedImage.iso632Code
    }/docusaurus-plugin-content-docs/current/${
      imageSet.pageInfo!.relativeFilePathToFolderContainingPage
    }`;

    const newPath = (directory + "/" + imageSet.outputFileName!).replaceAll(
      "//",
      "/"
    );
    imageWasSeen(newPath);
    writeAsset(newPath, buffer);
  }
}

export function parseImageBlock(image: any): ImageSet {
  if (!locales) throw Error("Did you call initImageHandling()?");
  const imageSet: ImageSet = {
    primaryUrl: "",
    caption: "",
    localizedUrls: locales.map(l => ({ iso632Code: l, url: "" })),
  };

  if ("file" in image) {
    imageSet.primaryUrl = image.file.url; // image saved on notion (actually AWS)
  } else {
    imageSet.primaryUrl = image.external.url; // image still pointing somewhere else. I've see this happen when copying a Google Doc into Notion. Notion kep pointing at the google doc.
  }

  const mergedCaption: string = image.caption
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
