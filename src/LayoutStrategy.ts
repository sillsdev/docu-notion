import * as fs from "fs-extra";
import { NotionPage } from "./NotionPage";

// Here a fuller name would be File Tree Layout Strategy. That is,
// as we walk the Notion outline and create files, where do we create them, what do we name them, etc.
export abstract class LayoutStrategy {
  protected rootDirectory = "";
  protected existingPagesNotSeenYetInPull: string[] = [];

  public setRootDirectoryForMarkdown(markdownOutputPath: string): void {
    this.rootDirectory = markdownOutputPath;
    this.existingPagesNotSeenYetInPull =
      this.getListOfExistingFiles(markdownOutputPath);
  }

  public async cleanupOldFiles(): Promise<void> {
    // Remove any pre-existing files that aren't around anymore; this indicates that they were removed or renamed in Notion.
    for (const p of this.existingPagesNotSeenYetInPull) {
      console.log(`Removing old doc: ${p}`);
      await fs.rm(p);
    }
  }

  public abstract newLevel(
    rootDir: string,
    ontext: string,
    levelLabel: string
  ): string;
  public abstract getPathForPage(
    page: NotionPage,
    extensionWithDot: string
  ): string;

  public pageWasSeen(page: NotionPage): void {
    const path = this.getPathForPage(page, ".md");
    this.existingPagesNotSeenYetInPull =
      this.existingPagesNotSeenYetInPull.filter(p => p !== path);
  }

  protected getListOfExistingFiles(dir: string): string[] {
    return fs.readdirSync(dir).flatMap(item => {
      const path = `${dir}/${item}`;
      if (fs.statSync(path).isDirectory()) {
        return this.getListOfExistingFiles(path);
      }
      if (path.endsWith(".md")) {
        // we could just notice all files, and maybe that's better. But then we lose an debugging files like .json of the raw notion, on the second run.
        return [path];
      } else return [];
    });
  }
}
