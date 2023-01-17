// an extension manager that uses cosmicconfig to get a list of plugin functions
// and then runs them in sequence

import { ListBlockChildrenResponseResult } from "notion-to-md/build/types";
import * as Cosmic from "cosmiconfig";
import { CosmiconfigResult } from "cosmiconfig/dist/types";
import { NotionPage } from "../NotionPage";
import { NotionToMarkdown } from "notion-to-md";
import { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { DocuNotionOptions } from "../pull";
import { LayoutStrategy } from "../LayoutStrategy";
import defaultConfig from "./default.docunotion.config";

// wrap this into something with a bit better name than the raw thing
export type NotionBlock = BlockObjectResponse;

type linkConversionFunction = (
  context: IDocuNotionContext,
  markdownLink: string
) => string;

export type IPlugin = {
  // this is just for display when debugging
  name: string;
  // operations on notion blocks before they are converted to markdown
  notionBlockModifications?: {
    modify: (block: NotionBlock) => void;
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
    match: RegExp; // does this plugin apply to this link?
    convert: linkConversionFunction;
  };

  // simple regex replacements on the markdown output
  regexMarkdownModifications?: IRegexMarkdownModification[];
};

export type IRegexMarkdownModification = {
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

export type ICounts = {
  output_normally: number;
  skipped_because_empty: number;
  skipped_because_status: number;
  skipped_because_level_cannot_have_content: number;
};
export type IGetBlockChildrenFn = (id: string) => Promise<NotionBlock[]>;

export type IDocuNotionContext = {
  layoutStrategy: LayoutStrategy;
  options: DocuNotionOptions;
  getBlockChildren: IGetBlockChildrenFn;
  notionToMarkdown: NotionToMarkdown;
  directoryContainingMarkdown: string;
  relativeFilePathToFolderContainingPage: string;
  pages: NotionPage[];
  counts: ICounts;
};

// read the plugins from the config file
// and add them to the map
export function loadConfig(): IDocuNotionConfig {
  // return Cosmic.cosmiconfigSync("docunotion").search()

  return defaultConfig;
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
