/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  GetPageResponse,
  ListBlockChildrenResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { RateLimiter } from "limiter";
import { Client } from "@notionhq/client";

const notionLimiter = new RateLimiter({
  tokensPerInterval: 3,
  interval: "second",
});

let notionClient: Client;

// Notion has 2 kinds of pages: a normal one which is just content, and what I'm calling a "database page", which has whatever properties you put on it.
// notion-pull supports the later via links from outline pages. That is, you put the database pages in a database, then separately, in the outline, you
// create pages for each node of the outline and then add links from those to the database pages. In this way, we get the benefits of database
// pages (metadata, workflow, etc) and also normal pages (order, position in the outline).
export enum PageType {
  DatabasePage,
  Simple,
}
export function initNotionClient(notionToken: string): Client {
  notionClient = new Client({
    auth: notionToken,
  });
  return notionClient;
}

export class NotionPage {
  private metadata: GetPageResponse;
  public readonly pageId: string;
  public context: string; // where we found it in the hierarchy of the outline

  private constructor(
    context: string,
    pageId: string,
    metadata: GetPageResponse
  ) {
    this.context = context;
    this.pageId = pageId;
    this.metadata = metadata;
    // review: this is expensive to learn as it takes another api call... I
    // think? We can tell if it's a database because it has a "Name" instead of a
    // "tile" and "parent": "type": "database_id". But do we need to differentiate
    //this.type = PageType.Unknown;
  }
  public static async fromPageId(
    context: string,
    pageId: string
  ): Promise<NotionPage> {
    const metadata = await getPageMetadata(pageId);
    //console.log(JSON.stringify(metadata));
    return new NotionPage(context, pageId, metadata);
  }

  public get linkTargetId(): string {
    return this.pageId.replace(/-/g, ""); // notion has dashes in the page_id but then no dashes in links that point to the page
  }

  public get type(): PageType {
    /*
    {
        "object": "page",
        "parent": {
            "type": "page_id",
            or
            "type": "database_id",
            ...
        }, 
    */
    return (this.metadata as any).parent.type === "database_id"
      ? PageType.DatabasePage
      : PageType.Simple;
  }

  // In Notion, pages from the Database have names and simple pages have titles.
  public get nameOrTitle(): string {
    return this.type === PageType.DatabasePage ? this.name : this.title;
  }

  // TODO: let's go farther in hiding this separate title vs name stuff. This seems like an implementation detail on the Notion side.

  // In Notion, pages from the Outline have "title"'s.
  private get title(): string {
    return this.getPlainTextProperty("title", "title missing");
  }
  // In Notion, pages from the Database have "Name"s.
  private get name(): string {
    return this.getPlainTextProperty("Name", "name missing");
  }
  public get slug(): string | undefined {
    return this.getPlainTextProperty("slug", "");
  }
  public get status(): string | undefined {
    return this.getSelectProperty("Status");
  }

  private async getChildren(): Promise<ListBlockChildrenResponse> {
    const children = await notionClient.blocks.children.list({
      block_id: this.pageId,
      page_size: 100, // max hundred links in a page
    });

    return children;
  }

  public getPlainTextProperty(
    property: string,
    defaultIfEmpty: string
  ): string {
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

    //console.log("metadata:\n" + JSON.stringify(this.metadata, null, 2));
    const p = (this.metadata as any).properties?.[property];

    //console.log(`prop ${property} = ${JSON.stringify(p)}`);
    if (!p) return defaultIfEmpty;
    const textArray = p[p.type];
    //console.log("textarray:" + JSON.stringify(textArray, null, 2));
    return textArray && textArray.length
      ? (textArray[0].plain_text as string)
      : defaultIfEmpty;
  }

  public getSelectProperty(property: string): string | undefined {
    /* Notion select values look like this
     "properties": {
        "Status": {
          "id": "oB~%3D",
          "type": "select",
          "select": {
            "id": "1",
            "name": "Ready For Review",
            "color": "red"
          }
        },
        */

    const p = (this.metadata as any).properties?.[property];
    if (!p) {
      throw new Error(
        `missing ${property} in ${JSON.stringify(this.metadata, null, 2)}`
      );
      return undefined;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return p.select?.name || undefined;
  }

  public async getBlockChildren(): Promise<ListBlockChildrenResponse> {
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
          block_id: this.pageId,
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

  public async getContentInfo(): Promise<{
    childPages: any[];
    linksPages: any[];
    hasParagraphs: boolean;
  }> {
    const children = await this.getChildren();

    return {
      childPages: children.results
        .filter((b: any) => b.type === "child_page")
        .map((b: any) => b.id),
      linksPages: children.results
        .filter((b: any) => b.type === "link_to_page")
        .map((b: any) => b.link_to_page.page_id),
      hasParagraphs: children.results.some(
        b =>
          (b as any).type === "paragraph" &&
          (b as any).paragraph.rich_text.length > 0
      ),
    };
  }
}

async function getPageMetadata(id: string): Promise<GetPageResponse> {
  await rateLimit();

  return await notionClient.pages.retrieve({
    page_id: id,
  });
}

async function rateLimit() {
  if (notionLimiter.getTokensRemaining() < 1) {
    console.log("*** delaying for rate limit");
  }
  await notionLimiter.removeTokens(1);
}
