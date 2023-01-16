import chalk from "chalk";
import {
  IDocuNotionConfig,
  IDocuNotionContext,
  IRegexMarkdownModification,
  NotionBlock,
} from "./config/configuration";
import { info, logDebug, verbose } from "./log";
import { NotionPage } from "./NotionPage";

export async function getMarkdownForPage(
  config: IDocuNotionConfig,
  context: IDocuNotionContext,
  page: NotionPage
): Promise<string> {
  info(
    `Reading & converting page ${page.layoutContext}/${
      page.nameOrTitle
    } (${chalk.blue(
      page.hasExplicitSlug
        ? page.slug
        : page.foundDirectlyInOutline
        ? "Descendant of Outline, not Database"
        : "NO SLUG"
    )})`
  );

  const blocks = await context.getBlockChildren(page.pageId);

  logDebug("pull", JSON.stringify(blocks));

  const body = await getMarkdownFromNotionBlocks(context, config, blocks);
  const frontmatter = getFrontMatter(page); // todo should be a plugin
  return `${frontmatter}\n${body}`;
}

// this is split off from getMarkdownForPage so that unit tests can provide the block contents
export async function getMarkdownFromNotionBlocks(
  context: IDocuNotionContext,
  config: IDocuNotionConfig,
  blocks: Array<NotionBlock>
): Promise<string> {
  // changes to the blocks we get from notion API
  doNotionBlockTransforms(blocks, config);

  // overrides for the default notion-to-markdown conversions
  registerNotionToMarkdownCustomTransforms(config, context);

  // the main conversion to markdown, using the notion-to-md library
  let markdown = await doNotionToMarkdown(context, blocks); // ?

  // corrections to links after they are converted to markdown,
  // with access to all the pages we've seen
  markdown = doLinkFixes(context, markdown, config);

  //console.log("markdown after link fixes", markdown);

  // simple regex-based tweaks. These are usually related to docusaurus
  const { imports, body } = doTransformsOnMarkdown(config, markdown);

  // console.log("markdown after regex fixes", markdown);
  // console.log("body after regex", body);

  return `${imports}\n${body}`;
}

// operations on notion blocks before they are converted to markdown
function doNotionBlockTransforms(
  blocks: Array<NotionBlock>,
  config: IDocuNotionConfig
) {
  for (const block of blocks) {
    config.plugins.forEach(plugin => {
      if (plugin.notionBlockModifications) {
        plugin.notionBlockModifications.forEach(transform => {
          logDebug("transforming block with plugin: ", plugin.name);
          transform.modify(block);
        });
      }
    });
  }
}

function doTransformsOnMarkdown(config: IDocuNotionConfig, input: string) {
  const regexMods: IRegexMarkdownModification[] = config.plugins
    .filter(plugin => !!plugin.regexMarkdownModifications)
    .map(plugin => plugin.regexMarkdownModifications!)
    .flat();

  let body = input;
  //console.log("body before regex: " + body);
  let match;
  const imports = new Set<string>();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  regexMods.forEach(mod => {
    //verbose(`Trying [${mod.label}]`);
    while ((match = mod.regex.exec(input)) !== null) {
      const string = match[0];
      const url = match[1];
      verbose(`[${mod.label}] ${string} --> ${mod.output.replace("$1", url)}`);
      body = body.replace(string, mod.output.replace("$1", url));
      // add any library imports
      mod.imports?.forEach(imp => imports.add(imp));
    }
  });
  return { body, imports: [...imports].join("\n") };
}

async function doNotionToMarkdown(
  docunotionContext: IDocuNotionContext,
  blocks: Array<NotionBlock>
) {
  const mdBlocks = await docunotionContext.notionToMarkdown.blocksToMarkdown(
    blocks
  );

  let markdown = docunotionContext.notionToMarkdown.toMarkdownString(mdBlocks);
  return markdown;
}

// corrections to links after they are converted to markdown
// Note: from notion (or notion-md?) we get slightly different hrefs depending on whether the links is "inline"
// (has some other text that's been turned into a link) or "raw".
// Raw links come in without a leading slash, e.g. [link_to_page](4a6de8c0-b90b-444b-8a7b-d534d6ec71a4)
// Inline links come in with a leading slash, e.g. [pointer to the introduction](/4a6de8c0b90b444b8a7bd534d6ec71a4)
function doLinkFixes(
  context: IDocuNotionContext,
  markdown: string,
  config: IDocuNotionConfig
): string {
  const linkRegExp = /\[.*\]\(.*\)/g;

  console.log("markdown before link fixes", markdown);
  // if (pages && pages.length) {
  //   console.log(pages[0].matchesLinkId);
  //   console.log(docunotionContext.pages[0].matchesLinkId);
  // }

  // The key to understanding this while is that linkRegExp actually has state, and
  // it gives you a new one each time. https://stackoverflow.com/a/1520853/723299
  let match: RegExpExecArray | null;

  while ((match = linkRegExp.exec(markdown)) !== null) {
    const originalLinkMarkdown = match[0]; // ?
    const originalLinkText = match[1] || "";
    const originalUrl = match[2];

    // We only use the first plugin that matches and makes a change to the link.
    // Enhance: we could take the time to see if multiple plugins match, and
    // and point this out in verbose logging mode.
    config.plugins.some(plugin => {
      if (!plugin.linkModifier) return false;
      if (plugin.linkModifier.match.exec(originalLinkMarkdown) === null) {
        return false;
      }
      verbose(`plugin "${plugin.name}" receiving ${originalUrl}`);

      const newMarkdown = plugin.linkModifier.convert(
        context,
        originalLinkMarkdown
      );

      if (newMarkdown !== originalLinkMarkdown) {
        markdown = markdown.replace(originalLinkMarkdown, newMarkdown);
        verbose(
          `plugin "${plugin.name}" transformed link: ${originalLinkMarkdown}-->${newMarkdown}`
        );
        return true; // the first plugin that matches and does something wins
      } else {
        verbose(`plugin "${plugin.name}" did not change this url`);
        return false;
      }
    });
  }
  return markdown;
}

// overrides for the conversions that notion-to-md does
function registerNotionToMarkdownCustomTransforms(
  config: IDocuNotionConfig,
  docunotionContext: IDocuNotionContext
) {
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
}

// enhance:make this built-in plugin so that it can be overridden
function getFrontMatter(page: NotionPage): string {
  let frontmatter = "---\n";
  frontmatter += `title: ${page.nameOrTitle.replaceAll(":", "-")}\n`; // I have not found a way to escape colons
  frontmatter += `sidebar_position: ${page.order}\n`;
  frontmatter += `slug: ${page.slug ?? ""}\n`;
  if (page.keywords) frontmatter += `keywords: [${page.keywords}]\n`;

  frontmatter += "---\n";
  return frontmatter;
}
