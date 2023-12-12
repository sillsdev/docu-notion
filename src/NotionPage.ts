/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { GetPageResponse } from "@notionhq/client/build/src/api-endpoints";
import { parseLinkId } from "./plugins/internalLinks";
import { ListBlockChildrenResponseResults } from "notion-to-md/build/types";

// Notion has 2 kinds of pages: a normal one which is just content, and what I'm calling a "database page", which has whatever properties you put on it.
// docu-notion supports the later via links from outline pages. That is, you put the database pages in a database, then separately, in the outline, you
// create pages for each node of the outline and then add links from those to the database pages. In this way, we get the benefits of database
// pages (metadata, workflow, etc) and also normal pages (order, position in the outline).
export enum PageType {
  CategoryIndex,
  DatabasePage,
  Simple,
}

export class NotionPage {
  public metadata: GetPageResponse;
  public pageId: string;
  public order: number;
  public layoutContext: string; // where we found it in the hierarchy of the outline
  public foundDirectlyInOutline: boolean; // the page was found as a descendent of /outline instead of being linked to

  public constructor(args: {
    layoutContext: string;
    pageId: string;
    order: number;
    metadata: GetPageResponse;
    foundDirectlyInOutline: boolean;
  }) {
    this.layoutContext = args.layoutContext;
    this.pageId = args.pageId;
    this.order = args.order;
    this.metadata = args.metadata;
    this.foundDirectlyInOutline = args.foundDirectlyInOutline;

    // review: this is expensive to learn as it takes another api call... I
    // think? We can tell if it's a database because it has a "Name" instead of a
    // "tile" and "parent": "type": "database_id". But do we need to differentiate
    //this.type = PageType.Unknown;
  }

  public matchesLinkId(id: string): boolean {
    const { baseLinkId } = parseLinkId(id);

    const match =
      baseLinkId === this.pageId || // from a link_to_page.pageId, which still has the dashes
      baseLinkId === this.pageId.replaceAll("-", ""); // from inline links, which are lacking the dashes

    // logDebug(
    //   `matchedLinkId`,
    //   `comparing pageId:${this.pageId} to id ${id} --> ${match.toString()}`
    // );
    return match;
  }

  public get type(): PageType {
    /*
    {
        "object": "page",
        "parent": {
            ("isCategory": "true")
            "type": "page_id",
            or
            "type": "database_id",
            ...
        },
    */

     // Check IsCategory flag under parent for level pages with index content
    if (this.metadata.parent.IsCategory) {
      return PageType.CategoryIndex;
    }
    return (this.metadata as any).parent.type === "database_id"
      ? PageType.DatabasePage
      : PageType.Simple;
  }

  // In Notion, pages from the Database have names and simple pages have titles.
  public get nameOrTitle(): string {
    return this.type === PageType.DatabasePage ? this.name : this.title;
  }

  public nameForFile(): string {
    // In Notion, pages from the Database have names and simple pages have titles. We use "index" by default for Level page with content.
    if (this.type === PageType.CategoryIndex) {
      return "index";
    }
    return this.type === PageType.Simple
      ? this.title
      : // if it's a Database page, then we'll use the slug unless there is none, then we'd rather have the
        // page name than an ugly id for the file name
        this.explicitSlug()?.replace(/^\//, "") || this.name;
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

  private explicitSlug(): string | undefined {
    const explicitSlug = this.getPlainTextProperty("Slug", "");
    if (explicitSlug) {
      if (explicitSlug === "/") return explicitSlug;
      // the root page
      else
        return (
          "/" +
          encodeURIComponent(
            explicitSlug
              .replace(/^\//, "")
              // If for some reason someone types in a slug with special characters,
              //we really don't want to see ugly entities in the URL, so first
              // we replace a bunch of likely suspects with dashes. This will not
              // adequately handle the case where there is one pag with slug:"foo-bar"
              // and another with "foo?bar". Both will come out "foo-bar"
              .replaceAll(" ", "-")
              .replaceAll("?", "-")
              .replaceAll("/", "-")
              .replaceAll("#", "-")
              .replaceAll("&", "-")
              .replaceAll("%", "-")
              // remove consecutive dashes
              .replaceAll("--", "-")
          )
        );
      return undefined; // this page has no slug property
    }
  }

  public get slug(): string {
    return this.explicitSlug() ?? "/" + this.pageId;
  }
  public get hasExplicitSlug(): boolean {
    return this.explicitSlug() !== undefined;
  }
  public get keywords(): string | undefined {
    return this.getPlainTextProperty("Keywords", "");
  }
  public get status(): string | undefined {
    return this.getSelectProperty("Status");
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
          },
          {
            ...
            "plain_text": " to Notion",
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
      ? (textArray
          .map((item: { plain_text: any }) => item.plain_text)
          .join("") as string)
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

  public getDateProperty(
    property: string,
    defaultIfEmpty: string,
    start = true
  ): string {
    /* Notion dates look like this
   "properties": {
      "published_date":
      {
        "id":"a%3Cql",
        "type":"date",
        "date":{
          "start":"2021-10-24",
          "end":null,
          "time_zone":null
        }
      }
    }
    */

    // console.log("metadata:\n" + JSON.stringify(this.metadata, null, 2));
    const p = (this.metadata as any).properties?.[property];

    // console.log(`prop ${property} = ${JSON.stringify(p)}`);
    if (!p) return defaultIfEmpty;
    if (start) {
      return p?.date?.start ? (p.date.start as string) : defaultIfEmpty;
    } else {
      return p?.date?.end ? (p.date.end as string) : defaultIfEmpty;
    }
  }

  public async getContentInfo(
    children: ListBlockChildrenResponseResults
  ): Promise<{
    childPageIdsAndOrder: { id: string; order: number }[];
    linksPageIdsAndOrder: { id: string; order: number }[];
    hasParagraphs: boolean;
  }> {
    for (let i = 0; i < children.length; i++) {
      (children[i] as any).order = i;
    }
    return {
      childPageIdsAndOrder: children
        .filter((b: any) => b.type === "child_page")
        .map((b: any) => ({ id: b.id, order: b.order })),
      linksPageIdsAndOrder: children
        .filter((b: any) => b.type === "link_to_page")
        .map((b: any) => ({ id: b.link_to_page.page_id, order: b.order })),
      hasParagraphs: children.some(
        b =>
          (b as any).type === "paragraph" &&
          (b as any).paragraph.rich_text.length > 0
      ),
    };
  }
}
