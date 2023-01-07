import chalk from "chalk";
import {
  IDocuNotionConfig,
  IDocuNotionContext,
  IPlugin,
  IRegexMarkdownModification,
  NotionBlock,
} from "./config/configuration";
import { info, logDebug, verbose } from "./log";
import { NotionPage, PageType } from "./NotionPage";
import * as Path from "path";
import * as fs from "fs-extra";

export async function outputPage(config:IDocuNotionConfig, context:IDocuNotionContext , page: NotionPage):Promise<void> {
  if (
    page.type === PageType.DatabasePage &&
    context.options.statusTag != "*" &&
    page.status !== context.options.statusTag
  ) {
    verbose(
      `Skipping page because status is not '${context.options.statusTag}': ${page.nameOrTitle}`
    );
    ++context.counts.skipped_because_status;
    return;
  }

  info(
    `Reading & converting page ${page.context}/${
      page.nameOrTitle
    } (${chalk.blue(
      page.hasExplicitSlug
        ? page.slug
        : page.foundDirectlyInOutline
        ? "Descendant of Outline, not Database"
        : "NO SLUG"
    )})`
  );
  context.layoutStrategy.pageWasSeen(page);

  const mdPath = context.layoutStrategy.getPathForPage(page, ".md");
  context.directoryContainingMarkdown = Path.dirname(mdPath);

  const blocks = (await page.getBlockChildren()).results;

  const relativePathToFolderContainingPage = Path.dirname(
    context.layoutStrategy.getLinkPathForPage(page)
  );
  logDebug("pull", JSON.stringify(blocks));

  const body = await getMarkdownStringFromNotionBlocks(context, config, page.blocks);
  const frontmatter = getFrontMatter(page); // todo should be a plugin
  const output = `${frontmatter}\n${body}`;
  verbose(`writing ${mdPath}`);
  fs.writeFileSync(mdPath, output, {});

  ++context.counts.output_normally;
}

export async function getMarkdownStringFromNotionBlocks(
  docunotionContext: IDocuNotionContext,
  config: IDocuNotionConfig,
  blocks: Array<NotionBlock>
): Promise<string> {

    // -- notionTransforms -- 
  // operations on notion blocks before they are converted to markdown
  for (const block of blocks) {
    config.plugins.forEach(plugin => {
      if (plugin.notionBlockModifications) {
        plugin.notionBlockModifications.forEach(transform => {
          logDebug("transforming block with plugin: ", plugin.name);
          transform.modify(blocks);
        });
      }
    });
  }

  // -- notionToMarkdownTransforms --
  // overrides for the conversions that notionToMarkdown does
  config.plugins.forEach(plugin => {
    if (plugin.notionToMarkdownTransforms) {
      plugin.notionToMarkdownTransforms.forEach(transform => {
        docunotionContext.notionToMarkdown.setCustomTransformer(
          transform.type,
          (block: any) => {
            logDebug(
              "notion to MD conversion of ",
              `${transform.type} with plugin: ${plugin.name}`
            );
            return transform.getStringFromBlock(docunotionContext, block);
          }
        );
      });
    }
  });

  const mdBlocks = await docunotionContext.notionToMarkdown.blocksToMarkdown(
    blocks
  );

  let markdown = docunotionContext.notionToMarkdown.toMarkdownString(mdBlocks);

  // -- linkModifier --
  // corrections to links after they are converted to markdown
  // Note: from notion (or notion-md?) we get slightly different hrefs depending on whether the links is "inline"
  // (has some other text that's been turned into a link) or "raw".
  // Raw links come in without a leading slash, e.g. [link_to_page](4a6de8c0-b90b-444b-8a7b-d534d6ec71a4)
  // Inline links come in with a leading slash, e.g. [pointer to the introduction](/4a6de8c0b90b444b8a7bd534d6ec71a4)
  const linkRegExp = /\[([^\]]+)?\]\(\/?([^),^/]+)\)/g;
  
  // The key to understanding this while is that linkRegExp actually has state, and
  // it gives you a new one each time. https://stackoverflow.com/a/1520853/723299
  let match:RegExpExecArray | null;
  let output = markdown;
  while ((match = linkRegExp.exec(markdown)) !== null) {
    const originalLink = match[0];
    const textFromNotion = match[1] || "";
    const hrefFromNotion = match[2];
    config.plugins.forEach(plugin => {
      if (plugin.linkModifier) {
        const text = plugin.linkModifier.convertLinkText(textFromNotion, hrefFromNotion);
        const hrefForDocusaurus = plugin.linkModifier.convertHref(hrefFromNotion);

        if (hrefForDocusaurus) {
          output = output.replace(originalLink, `[${text}](${hrefForDocusaurus})`);
          verbose(`transformed link: ${originalLink}-->${hrefForDocusaurus}`);
        } else {
          verbose(`Maybe problem with link ${JSON.stringify(match)}`);
        }
      }
  })}

  // -- regexMarkdownTransforms --
  // simple regex replacements on the markdown output
  // collect all the regexMarkdownModifications from the plugins into one array
  const regexMods = config.plugins.filter(plugin => (!!plugin.regexMarkdownModifications)).map(plugin => plugin.regexMarkdownModifications!).flat();
  
  const {body,imports} =doRegex(markdown, regexMods);
  return `${imports}\n${body}`;
}

function doRegex(input:string, mods:IRegexMarkdownModification[]){
  
  let body = input;
  let match;
  const imports = new Set<string>();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (c) {
    while ((match = v.regex.exec(input)) !== null) {
      const string = match[0];
      const url = match[1];
      logDebug(
        "DocusaurusTweaks",
        `${string} --> ${v.output.replace("$1", url)}`
      );
      body = body.replace(string, v.output.replace("$1", url));
      imports.add(v.import);
    }
  }

  return { body, imports: [...imports].join("\n") };
}


// todo:make this plugin
function getFrontMatter(page:NotionPage){
  let frontmatter = "---\n";
  frontmatter += `title: ${page.nameOrTitle.replaceAll(":", "-")}\n`; // I have not found a way to escape colons
  frontmatter += `sidebar_position: ${page.order}\n`;
  frontmatter += `slug: ${page.slug ?? ""}\n`;
  if (page.keywords) frontmatter += `keywords: [${page.keywords}]\n`;

  frontmatter += "---\n";
}