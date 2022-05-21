import * as fs from "fs-extra";
import sanitize from "sanitize-filename";
import { LayoutStrategy } from "./LayoutStrategy";
import { NotionPage } from "./NotionPage";

// This strategy gives us a file tree that mirrors that of notion.
// Each level in the outline becomes a directory, and each file bears the name of the Notion document.
// Pros: Easy to read and understand. The URLs are perhaps better for SEO.
// Cons: The URLs become fragile. Moving a file, enclosing it in a new level, or tweaking
// the title means the url will change. This may or may not be worth it to you.
//
// Note that I tried getting a readable file tree while generating slugs based on the notion page id.
// However Docusaurus still makes the url be the "hierarchical path"/slug. So the using the slug as an id
// doesn't buy us much... it would give protection against name changes, but not changes to the outline structure.

export class HierarchicalNamedLayoutStrategy extends LayoutStrategy {
  public newLevel(
    dirRoot: string,
    context: string,
    levelLabel: string
  ): string {
    const path = context + "/" + sanitize(levelLabel);

    //console.log("Creating level " + path);
    fs.mkdirSync(dirRoot + "/" + path, { recursive: true });
    return path;
  }

  public getPathForPage(page: NotionPage, extensionWithDot: string): string {
    let path =
      this.rootDirectory +
      "/" +
      page.context +
      "/" +
      sanitize(page.nameOrTitle) +
      extensionWithDot;

    path = path.replace("//", "/");
    // console.log(
    //   `getPathForPage(${context}, ${pageId}, ${title}) with  root ${this.rootDirectory} --> ${path}`
    // );
    return path;
  }
}
