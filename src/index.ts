#!/usr/bin/env node

import { Option, program } from "commander";
import { setLogLevel } from "./log";

import { notionPull, Options } from "./pull";
const pkg = require("../package.json");
// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
console.log(`notion-pull-mdx version ${pkg.version}`);

program.name("notion-pull-mdx").description("");
program
  .requiredOption("-n, --notion-token <string>", "notion api token")
  .requiredOption(
    "-r, --root-page <string>",
    "the 31 character ID of the page which is the root of your notion docs"
  )
  .requiredOption(
    "-m, --markdown-output-path  <string>",
    "root of the hierarchy for md files. WARNING: node-pull-mdx will delete files from this directory. Note also that if it finds localized images, it will create an i18n/ directory as a sibling.",
    "./docs"
  )
  .option(
    "-t, --status-tag  <string>",
    "Database pages without a Notion page property 'status' matching this will be ignored. Use '*' to ignore status altogether.",
    "Publish"
  )
  .addOption(
    new Option("-l, --log-level <level>", "Log level").choices([
      "info",
      "verbose",
      "debug",
    ])
  )
  .option(
    "-i, --img-output-path  <string>",
    "path to directory where images will be stored. If this is not included, images will be placed in the same directory as the document that uses them, which then allows for localization of screenshots."
  )
  // .option(
  //   "-l, --internal-link-prefix <string>",
  //   "when converting a link from one page to another, prefix the with this path instead of the default, which is rooted at the markdown-output-path."
  // )
  .option(
    "-p, --img-prefix-in-markdown <string>",
    "when referencing an image from markdown, prefix with this path instead of the full img-output-path. Should be used only in conjunction with --img-output-path."
  );

program.showHelpAfterError();
program.parse();
setLogLevel(program.opts().logLevel);

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
void notionPull(program.opts() as Options).then(() =>
  console.log("notion-pull-mdx Finished.")
);
