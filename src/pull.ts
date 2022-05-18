import { Client } from "@notionhq/client";
import FileType from "file-type";
import * as Path from "path";
import * as fs from "fs-extra";

import { NotionToMarkdown } from "notion-to-md";
import {
  GetPageResponse,
  ListBlockChildrenResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { RateLimiter } from "limiter";
import fetch from "node-fetch";
import sanitize from "sanitize-filename";
import { exit } from "process";

const notionLimiter = new RateLimiter({
  tokensPerInterval: 3,
  interval: "second",
});

let imageOutputPath = "not set yet";
let imagePrefix = "not set yet";
let markdownOutputPath = "not set yet";
let notionToMarkdown: NotionToMarkdown;
let notionClient: Client;

export async function notionPull(options: any): Promise<void> {
  console.log("Notion-Pull");
  console.log(JSON.stringify(options, null, 2));

  markdownOutputPath = options.markdownOutputPath;
  imageOutputPath = options.imgOutputPath;
  imagePrefix = options.imgPrefixInMarkdown || imageOutputPath;

  // If they gave us a trailing slash, remove it because we add it back later.
  // Note that it's up to the caller to have a *leading* slash or not.
  imagePrefix = imagePrefix.replace(/\/$/, "");

  notionClient = new Client({
    auth: options.notionToken,
  });
  notionToMarkdown = new NotionToMarkdown({ notionClient: notionClient });

  console.log(`Deleting existing markdown in ${markdownOutputPath}`);
  deleteDirectorySync(markdownOutputPath);
  await fs.mkdir(markdownOutputPath, { recursive: true });
  // Currently we don't delete the image directory, because if an image
  // changes, it gets a new id. This way can then prevent downloading
  // and image after the 1st time. The downside is currently we don't
  // have the smarts to remove unused images.
  await fs.mkdir(imageOutputPath, { recursive: true });
  if (!fs.pathExistsSync(imageOutputPath)) fs.mkdirSync(imageOutputPath);

  console.log("Connecting");

  await getPagesRecursively(options.rootPage, markdownOutputPath);
}

async function getPagesRecursively(id: string, parentPath: string) {
  const outlinePage = await getDatabasePageMetadata(id);

  // A note on all these `if()` statements. Notion API's GetPageResponse type is union,
  // and Typescript will give type errors unless it sees code that proves that your
  // object is an instance of the union element that you are using.
  if ("properties" in outlinePage) {
    const title = getPlainTextProperty(outlinePage, "title");
    if (title) {
      console.log(`Reading "${parentPath}/${title}"`);
      const children = await notionClient.blocks.children.list({
        block_id: id,
        page_size: 100, // max hundred links in a page
      });
      let path = parentPath;

      if (
        children.results.some(b => "child_page" in b || "link_to_page" in b)
      ) {
        // don't make a level for "Outline"
        if (title !== "Outline") {
          path = parentPath + "/" + title;
          //console.log("parentPath: " + parentPath);
          //console.log("will mk dir " + path);
          fs.mkdirSync(path);
        }
        for (const b of children.results) {
          if ("child_page" in b) {
            //console.log(JSON.stringify(b, null, 2));
            //console.log("getting one child of " + title);

            await getPagesRecursively(b.id, path);
          } else if ("link_to_page" in b && "page_id" in b.link_to_page) {
            await getDatabasePage(b.link_to_page.page_id, path);
            //          console.log(JSON.stringify(children, null, 2));
          } else {
            // skipping this block
            //console.log("skipping block:" + JSON.stringify(b, null, 2));
          }
        }
      } else {
        path = parentPath + "/" + sanitize(title);
        await geContentPageInOutline(id, path);
      }
    }
  }
}

async function getDatabasePageMetadata(id: string): Promise<GetPageResponse> {
  await rateLimit();

  return await notionClient.pages.retrieve({
    page_id: id,
  });
}

// Notion has 2 kinds of pages: a normal one which is just content, and what I'm calling a "database page", which has whatever properties you put on it.
// notion-pull supports the later via links from outline pages. That is, you put the database pages in a database, then separately, in the outline, you
// create pages for each node of the outline and then add links from those to the database pages. In this way, we get the benefits of database
// pages (metadata, workflow, etc) and also normal pages (order, position in the outline).
async function getDatabasePage(id: string, parentPath: string) {
  const contentPage = await getDatabasePageMetadata(id);
  const blocks = (await getBlockChildren(id)).results;

  await processBlocks(blocks);

  const title = getPlainTextProperty(contentPage, "Name") || "missing title";
  const slug = getPlainTextProperty(contentPage, "slug");
  const mdBlocks = await notionToMarkdown.blocksToMarkdown(blocks);
  let mdString = "---\n";
  mdString += `title: ${title}\n`;
  if (slug) {
    mdString += `slug: ${slug}\n`;
  }
  mdString += "---\n\n";
  mdString += notionToMarkdown.toMarkdownString(mdBlocks);

  //helpful when debugging changes we make before serializing to markdown
  // fs.writeFileSync(
  //   parentPath + "/" + id + ".json",
  //   JSON.stringify({ contentPage, blocks }, null, 2)
  // );

  fs.writeFileSync(parentPath + "/" + sanitize(title) + ".md", mdString);
}

async function geContentPageInOutline(id: string, path: string) {
  //console.log(`****geContentPageInOutline(${id},${path})`);
  const blocks = (await getBlockChildren(id)).results;
  await processBlocks(blocks);

  //const title = getPlainTextProperty(outlinePage, "title");
  const mdBlocks = await notionToMarkdown.blocksToMarkdown(blocks);
  const mdString = notionToMarkdown.toMarkdownString(mdBlocks);

  //helpful when debugging changes we make before serializing to markdown
  // fs.writeFileSync(
  //   parentPath + "/" + id + ".json",
  //   JSON.stringify({ contentPage, blocks }, null, 2)
  // );

  //console.log(`writing to ${path}`);
  fs.writeFileSync(path + ".md", mdString);
}

/**
 * Remove directory recursively
 * @see https://stackoverflow.com/a/42505874/3027390
 */
function deleteDirectorySync(directory: string) {
  if (fs.existsSync(directory)) {
    fs.readdirSync(directory).forEach(entry => {
      const entryPath = Path.join(directory, entry);
      if (fs.lstatSync(entryPath).isDirectory()) {
        deleteDirectorySync(entryPath);
      } else {
        fs.unlinkSync(entryPath);
      }
    });
    fs.rmdirSync(directory);
  }
}

async function processBlocks(
  blocks: (
    | ListBlockChildrenResponse
    | /* not avail in types: BlockObjectResponse so we use any*/ any
  )[]
): Promise<void> {
  for (const b of blocks) {
    if ("image" in b) {
      await processImageBlock(b);
    }
  }
}

async function getBlockChildren(
  block_id: string
): Promise<ListBlockChildrenResponse> {
  // we can only get so many responses per call, so we set this to
  // the first response we get, then keep adding to its array of blocks
  // with each subsequent response
  let overallResult: ListBlockChildrenResponse | undefined = undefined;
  let start_cursor = undefined;

  do {
    await rateLimit();

    const response: ListBlockChildrenResponse =
      await notionClient.blocks.children.list({
        start_cursor: start_cursor,
        block_id: block_id,
      });
    if (!overallResult) {
      overallResult = response;
    } else {
      overallResult.results.push(...response.results);
    }

    start_cursor = response?.next_cursor;
  } while (start_cursor != null);
  return overallResult;
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
    if (!fs.pathExistsSync(path)) {
      // // I think that this ok that this is writing async as we continue
      console.log("Adding image " + path);
      fs.createWriteStream(path).write(buffer);
    } else {
      console.log("Already have image " + path);
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
async function processImageBlock(b: any) {
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

function getPlainTextProperty(
  o: Record<string, unknown>,
  property: string
): string | undefined {
  /* Notion strings look like this
   "properties": {
      "slug": {
        "type": "rich_text",
        ...
        "rich_text": [
          {
            ...
            "plain_text": "/",
          }
        ]
      },
       "Name": {
        "type": "title",
        "title": [
          {
            ...
            "plain_text": "Intro",
          }
        ]
      */

  const p = (o as any).properties?.[property];
  if (!p) return undefined;
  const textArray = p[p.type];
  return textArray && textArray.length
    ? (textArray[0].plain_text as string)
    : undefined;
}

async function rateLimit() {
  if (notionLimiter.getTokensRemaining() < 1) {
    console.log("*** delaying for rate limit");
  }
  await notionLimiter.removeTokens(1);
}
