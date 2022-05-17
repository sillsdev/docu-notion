import { program } from "commander";
import { notionPull } from "./pull";

program.name("notion-pull").description("");
program
  .requiredOption("-n, --notion-token <string>", "notion api token")
  .requiredOption(
    "-r, --root-page <string>",
    "the 31 character ID of the page which is the root of your notion docs"
  )
  .option(
    "-m, --markdown-output-path  <string>",
    "root of the hierarchy for md files",
    "./docs" // this default works for Docusaurus
  )
  .option(
    "-i, --img-output-path  <string>",
    "path to directory where images will be stored",
    "/static/notion_img" // this default works for Docusaurus
  );

program.showHelpAfterError();
program.parse();

void notionPull(program.opts()).then(() =>
  console.log("Notion-pull Finished.")
);
