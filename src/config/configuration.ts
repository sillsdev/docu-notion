// an extension manager that uses cosmicconfig to get a list of plugin functions
// and then runs them in sequence

import {
  ListBlockChildrenResponseResult,
  ListBlockChildrenResponseResults,
} from "notion-to-md/build/types";
import * as Cosmic from "cosmiconfig";
import { CosmiconfigResult } from "cosmiconfig/dist/types";
import { NotionPage } from "../NotionPage";
import { NotionToMarkdown } from "notion-to-md";
import { Client } from "@notionhq/client";
import { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { DocuNotionOptions } from "../pull";
import { LayoutStrategy } from "../LayoutStrategy";

// wrap this into something with a bit better name than the raw thing
export type NotionBlock = BlockObjectResponse;

export type IPlugin = {
  // this is just for display when debugging
  name: string;
  // operations on notion blocks before they are converted to markdown
  notionBlockModifications?: {
    label: string;
    modify: (blocks: Array<NotionBlock>) => void;
  }[];
  // overrides for the default notion-to-markdown conversions
  notionToMarkdownTransforms?: {
    type: string;
    getStringFromBlock: (
      context: IDocuNotionContext,
      block: NotionBlock
    ) => string | Promise<string>;
  }[];

  // corrections to links after they are converted to markdown
  linkModifier?: {
    convertHref(hrefFromNotion: string): unknown;
    convertLinkText(arg0: string, hrefFromNotion: string): unknown;
    label: string;
    match: RegExp;
    modify: (link: string, pages: NotionPage[]) => string;
  };

  // simple regex replacements on the markdown output
  regexMarkdownModifications?: IRegexMarkdownModification[];
};

export type IRegexMarkdownModification = {
  label: string;
  regex: RegExp;
  output: string;
  imports?: string[];
};

export type IDocuNotionConfig = {
  plugins: IPlugin[];
};
export type ICustomNotionToMarkdownConversion = (
  block: ListBlockChildrenResponseResult,
  context: IDocuNotionContext
) => () => Promise<string>;

export type IDocuNotionContext = {
  layoutStrategy: LayoutStrategy;
  options: DocuNotionOptions;
  //instead of a notionApiClient: Client, we just give whatever methods they would use,
  // so that at for unit-tests we can mock them
  getBlockChildren: (id: string) => Promise<ListBlockChildrenResponseResults>;
  notionToMarkdown: NotionToMarkdown;
  //toodo probably this goes elsewhere
  directoryContainingMarkdown: string;
  relativePathToFolderContainingPage: string;

  counts: {
    output_normally: 0;
    skipped_because_empty: 0;
    skipped_because_status: 0;
    skipped_because_level_cannot_have_content: 0;
  };
};

let config: IDocuNotionConfig | undefined;

// read the plugins from the config file
// and add them to the map
export function init(): void {
  config = Cosmic.cosmiconfigSync("docunotion").search()
    ?.config as IDocuNotionConfig;
}

// export function getMDConversions(): Array<{
//   type: string;
//   transformer: ICustomNotionToMarkdownConversion;
// }> {
//   if (!config || !config.plugins) {
//     return [];
//   }
//   // for each plugin that has a markdownConversion property, return the array of conversions
//   return config.plugins.reduce((acc, plugin) => {
//     if (plugin.notionToMarkdownTransforms) {
//       acc.push(...plugin.notionToMarkdownTransforms);
//     }
//     return acc;
//   }, [] as Array<{ type: string; transformer: ICustomNotionToMarkdownConversion }>);
// }
