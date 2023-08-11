import * as fs from "fs-extra";
import sanitize from "sanitize-filename";
import { LayoutStrategy } from "./LayoutStrategy";
import { NotionPage } from "./NotionPage";

// This strategy gives us a file tree that mirrors that of notion.
// Each level in the outline becomes a directory, and each file bears the name of the Notion document.
// As long as you use slugs, the urls is still just something like https://site/slug

export class HierarchicalNamedLayoutStrategy extends LayoutStrategy {
  public newLevel(
    dirRoot: string,
    order: number,
    context: string,
    levelLabel: string
  ): string {
    const path = context + "/" + sanitize(levelLabel).replaceAll(" ", "-");

    //console.log("Creating level " + path);
    const newPath = dirRoot + "/" + path;
    fs.mkdirSync(newPath, { recursive: true });
    // const indexFileContent = "import DocCardList from '@theme/DocCardList';\n\n<DocCardList />";
    // const indexFilePath = (newPath + "/index.md").replaceAll("//", "/");
    // fs.writeFileSync(indexFilePath, indexFileContent, {});

    this.addCategoryMetadata(newPath, order, levelLabel);
    return path;
  }

  public getPathForPage(page: NotionPage, extensionWithDot: string): string {
    const sanitizedName = sanitize(page.nameForFile())
      .replaceAll("//", "/")
      .replaceAll("%20", "-")
      .replaceAll(" ", "-")
      // crowdin complains about some characters in file names. I haven't found
      // the actual list, so these are from memory.
      .replaceAll('"', "")
      .replaceAll("“", "")
      .replaceAll("”", "")
      .replaceAll("'", "")
      .replaceAll("?", "-");

    const context = ("/" + page.layoutContext + "/").replaceAll("//", "/");
    const path =
      this.rootDirectory + context + sanitizedName + extensionWithDot;

    return path;
  }

  //{
  //   "position": 2.5,
  //   "label": "Tutorial",
  //   "collapsible": true,
  //   "collapsed": false,
  //   "className": "red",
  //   "link": {
  //     "type": "generated-index",
  //     "title": "Tutorial overview"
  //   },
  //   "customProps": {
  //     "description": "This description can be used in the swizzled DocCard"
  //   }
  // }
  private addCategoryMetadata(dir: string, order: number, label: string) {
    const data = `{"position":${order}, "label":"${label}", "link": {"type": "generated-index","title": "${label}"}}`;
    fs.writeFileSync(dir + "/_category_.json", data);
  }
}
