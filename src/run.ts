import * as fs from "fs-extra";
import { Option, program } from "commander";
import { setLogLevel } from "./log";

import { notionPull } from "./pull";
import path from "path";

export async function run(): Promise<void> {
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
      "-m, --markdown-output-path  <string>",
      "Root of the hierarchy for md files. WARNING: docu-notion will delete files from this directory. Note also that if it finds localized images, it will create an i18n/ directory as a sibling.",
      "./docs"
    )
    .option(
      "--css-output-directory  <string>",
      "docu-notion has a docu-notion-styles.css file that you will need to use to get things like notion columns to look right. This option specifies where that file should be copied to.",
      "./css"
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
    )
    .option(
      "--require-slugs",
      "If set, docu-notion will fail if any pages it would otherwise publish are missing a slug in Notion.",
      false
    )
    .addOption(
      new Option(
        "--image-file-name-format <format>",
        "format:\n- default: {page slug (if any)}.{image block ID}\n- content-hash: Use a hash of the image content.\n- legacy: Use the legacy (before v0.16) method of determining file names. Set this to maintain backward compatibility.\nAll formats will use the original file extension."
      )
        .choices(["default", "content-hash", "legacy"])
        .default("default")
    );

  program.showHelpAfterError();
  program.parse();
  setLogLevel(program.opts().logLevel);
  console.log(JSON.stringify(program.opts()));

  // copy in the this version of the css needed to make columns (and maybe other things?) work
  let pathToCss = "";
  try {
    pathToCss = require.resolve(
      "@sillsdev/docu-notion/dist/docu-notion-styles.css"
    );
  } catch (e) {
    // when testing from the docu-notion project itself:
    pathToCss = "./src/css/docu-notion-styles.css";
  }
  // make any missing parts of the path exist
  fs.ensureDirSync(program.opts().cssOutputDirectory);
  fs.copyFileSync(
    pathToCss,
    path.join(program.opts().cssOutputDirectory, "docu-notion-styles.css")
  );

  // pull and convert
  await notionPull(program.opts()).then(() =>
    console.log("docu-notion Finished.")
  );
}
function parseLocales(value: string): string[] {
  return value.split(",").map(l => l.trim().toLowerCase());
}
