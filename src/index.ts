#!/usr/bin/env node

import { program } from "commander";
import { notionPull } from "./pull";
// note: just getting process.en.npm_package_version will return the version of the client package!
// So in our npm scripts we write out this version info and then pull it in here (tsc can
// handle json more readily than just txt)
const version = require("./version.json");

// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
console.log(`notion-pull version ${version.version}`);

program.name("notion-pull").description("");
program
  .requiredOption("-n, --notion-token <string>", "notion api token")
  .requiredOption(
    "-r, --root-page <string>",
    "the 31 character ID of the page which is the root of your notion docs"
  )
  .requiredOption(
    "-m, --markdown-output-path  <string>",
    "root of the hierarchy for md files. WARNING: node-pull will delete this directory."
  )
  .requiredOption(
    "-i, --img-output-path  <string>",
    "path to directory where images will be stored"
  )
  // .option(
  //   "-l, --internal-link-prefix <string>",
  //   "when converting a link from one page to another, prefix the with this path instead of the default, which is rooted at the markdown-output-path."
  // )
  .option(
    "-p, --img-prefix-in-markdown <string>",
    "when referencing an image from markdown, prefix with this path instead of the full img-output-path"
  );

program.showHelpAfterError();
program.parse();

void notionPull(program.opts()).then(() =>
  console.log("Notion-pull Finished.")
);
