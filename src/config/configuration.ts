// an extension manager that uses cosmicconfig to get a list of plugin functions
// and then runs them in sequence

import { ListBlockChildrenResponseResult } from "notion-to-md/build/types";
import * as Cosmic from "cosmiconfig";
import { NotionPage } from "../NotionPage";
import { NotionToMarkdown } from "notion-to-md";
import { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { DocuNotionOptions } from "../pull";
import { LayoutStrategy } from "../LayoutStrategy";
import defaultConfig from "./default.docunotion.config";
import { error, info, logDebug, verbose } from "../log";
import { TypeScriptLoader } from "cosmiconfig-typescript-loader";

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

  // allow a plugin to perform an async operation before it can deliver its operations
  init?(plugin: IPlugin): Promise<void>;
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
export async function loadConfigAsync(): Promise<IDocuNotionConfig> {
  let config: IDocuNotionConfig = defaultConfig;
  try {
    const cosmic = Cosmic.cosmiconfig("docu-notion", {
      loaders: {
        ".ts": TypeScriptLoader(),
      },
      searchPlaces: [`docu-notion.config.ts`],
    });
    const found = await cosmic.search();
    if (found) {
      verbose(`Loading config from ${found.filepath}`);
    } else {
      verbose(`Did not find configuration file, using defaults.`);
    }

    const pluginsWithInitializers = found?.config?.plugins?.filter(
      (p: IPlugin) => p.init !== undefined
    );
    const initializers = pluginsWithInitializers?.map(
      (p: IPlugin) => () => p!.init!(p)
    );

    await Promise.all(initializers || []);

    found?.config?.plugins?.forEach(async (plugin: IPlugin) => {
      if (plugin.init !== undefined) {
        verbose(`Initializing plugin ${plugin.name}...`);
        await plugin.init(plugin);
      }
    });
    // for now, all we have is plugins
    config = {
      plugins: defaultConfig.plugins.concat(found?.config?.plugins || []),
    };
  } catch (e: any) {
    error(e.message);
  }
  verbose(`Active plugins: [${config.plugins.map(p => p.name).join(", ")}]`);
  return config;
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
