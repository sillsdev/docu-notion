import * as fs from "fs-extra";
import * as Path from "path";
import { verbose } from "./log";

export enum AssetType {
  Image = "image",
  Video = "video",
}

export function writeAsset(path: string, buffer: Buffer): void {
  // Note: it's tempting to not spend time writing this out if we already have
  // it from a previous run. But we don't really know it's the same. A) it
  // could just have the same name, B) it could have been previously
  // unlocalized and thus filled with a copy of the primary language image
  // while and now is localized.
  if (fs.pathExistsSync(path)) {
    verbose("Replacing asset " + path);
  } else {
    verbose("Adding asset " + path);
    fs.mkdirsSync(Path.dirname(path));
  }
  fs.createWriteStream(path).write(buffer); // async but we're not waiting
}
