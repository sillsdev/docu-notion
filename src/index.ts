#!/usr/bin/env node

import { Option, program } from "commander";
import { setLogLevel } from "./log";

import { notionPull, Options } from "./pull";
const pkg = require("../package.json");
// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
console.log(`docu-notion version ${pkg.version}`);

program.name("docu-notion").description("");
program.usage("-n <token> -r <root> [options]");
program
  .requiredOption(
    "-n, --notion-token <string>",
    "notion api token, which looks like secret_3bc1b50XFYb15123RHF243x43450XFY33250XFYa343"
  )
  .requiredOption(
    "-r, --root-page <string>",
    "The 31 character ID of the page which is the root of your docs page in notion. The code will look like 9120ec9960244ead80fa2ef4bc1bba25. This page must have a child page named 'Outline'"
  )
  .option(
    "-s, --slug-prefix  <string>",
    "Prefix to add to all slugs. This is useful if you want to host your docs on a subdomain, e.g. docs.example.com.",
    ""
  )
  .option(
    "-m, --markdown-output-path  <string>",
    "Root of the hierarchy for md files. WARNING: node-pull-mdx will delete files from this directory. Note also that if it finds localized images, it will create an i18n/ directory as a sibling.",
    "./docs"
  )
  .option(
    "-t, --status-tag  <string>",
    "Database pages without a Notion page property 'status' matching this will be ignored. Use '*' to ignore status altogether.",
    "Publish"
  )
  .option(
    "--locales  <codes>",
    "Comma-separated list of iso 639-2 codes, the same list as in docusaurus.config.js, minus the primary (i.e. 'en'). This is needed for image localization.",
    parseLocales,
    []
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
    "Path to directory where images will be stored. If this is not included, images will be placed in the same directory as the document that uses them, which then allows for localization of screenshots."
  )
  .option(
    "-p, --img-prefix-in-markdown <string>",
    "When referencing an image from markdown, prefix with this path instead of the full img-output-path. Should be used only in conjunction with --img-output-path."
  );

program.showHelpAfterError();
program.parse();
setLogLevel(program.opts().logLevel);

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
void notionPull(program.opts() as Options).then(() =>
  console.log("docu-notion Finished.")
);

function parseLocales(value: string): string[] {
  return value.split(",").map(l => l.trim().toLowerCase());
}
