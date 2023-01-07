// an extension manager that uses cosmicconfig to get a list of plugin functions
// and then runs them in sequence

import {
  CustomTransformer,
  ListBlockChildrenResponseResult,
} from "notion-to-md/build/types";
import * as Cosmic from "cosmiconfig";
import { CosmiconfigResult } from "cosmiconfig/dist/types";
import { NotionPage } from "../NotionPage";
import { NotionToMarkdown } from "notion-to-md";
import { Client } from "@notionhq/client";

export type IPlugin = {
  name: string;
  notionToMarkdownConversions?: [
    {
      type: string;
      transformer: ICustomNotionToMarkdownConversion;
    }
  ];
  linkResolvers?: [
    { label: string; resolveFn: (link: string, pages: NotionPage[]) => string }
  ];
  regexMarkdownTransformers?: [
    { label: string; regex: RegExp; output: string; imports?: string[] }
  ];
};

export type IDocuNotionConfig = {
  plugins: IPlugin[];
};
export type ICustomNotionToMarkdownConversion = (
  block: ListBlockChildrenResponseResult,
  context: IDocuNotionContext
) => Promise<string>;

export type IDocuNotionContext = {
  notionToMarkdown: NotionToMarkdown;
  notionApiClient: Client;
  //toodo probably this goes elsewhere
  directoryContainingMarkdown: string;
  relativePathToFolderContainingPage: string;
};

let config: IDocuNotionConfig | undefined;

// read the plugins from the config file
// and add them to the map
export function init(): void {
  config = Cosmic.cosmiconfigSync("docunotion").search()
    ?.config as IDocuNotionConfig;
}

export function getMDConversions(): Array<{
  type: string;
  transformer: ICustomNotionToMarkdownConversion;
}> {
  if (!config || !config.plugins) {
    return [];
  }
  // for each plugin that has a markdownConversion property, return the array of conversions
  return config.plugins.reduce((acc, plugin) => {
    if (plugin.notionToMarkdownConversions) {
      acc.push(...plugin.notionToMarkdownConversions);
    }
    return acc;
  }, [] as Array<{ type: string; transformer: ICustomNotionToMarkdownConversion }>);
}
