import { LayoutStrategy } from "./LayoutStrategy";

// This strategy creates a flat list of files that have notion-id for file names.
// Pros: the urls will never change so long as the notion pages are not delete and re-recreated.
// Cons: the names are human readable, so:
//    * troubleshooting is more difficult
//    * is less "future" proof, in the sense that if you someday take these files and move them
//    * to a new system, maybe you will wish the files had names.

// TODO: for this to be viable, we'd also have to emit info on how to build the sidebar, because
// the directory/file structure itself is no longer representative of the outline we want.
export class FlatGuidLayoutStrategy extends LayoutStrategy {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public newLevel(context: string, _levelLabel: string): string {
    // In this strategy, we ignore context and don't create any directories to match the levels.
    // Just return the following for the benefit of logging.
    return context + "/" + _levelLabel;
  }

  public getPathForPage(
    _context: string,
    pageId: string,
    _title: string,
    extensionWithDot: string
  ): string {
    // In this strategy, we don't care about the location or the title
    return this.rootDirectory + "/" + pageId + extensionWithDot;
  }
}
