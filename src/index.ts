#!/usr/bin/env node

import { program } from "commander";
import { notionPull } from "./pull";

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
  );

program.showHelpAfterError();
program.parse();

void notionPull(program.opts()).then(() =>
  console.log("Notion-pull Finished.")
);
