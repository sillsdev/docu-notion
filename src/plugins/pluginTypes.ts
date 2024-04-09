import { ListBlockChildrenResponseResult } from "notion-to-md/build/types";
import { NotionPage } from "../NotionPage";
import { NotionToMarkdown } from "notion-to-md";
import { DocuNotionOptions } from "../pull";
import { LayoutStrategy } from "../LayoutStrategy";
import { ICounts, NotionBlock } from "../index";

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

  // Allow a plugin to perform an async operation at the start of docu-notion.
  // Notice that the plugin itself is given, so you can add things to it.
  init?(plugin: IPlugin): Promise<void>;
};

export type IRegexMarkdownModification = {
  // Should match on markdown that you want to replace
  regex: RegExp;
  // Based on that regex, the outputPattern will be used to replace the matched text
  replacementPattern?: string;
  // Instead of a pattern, you can use this if you have to ask a server somewhere for help in getting the new markdown
  getReplacement?(
    context: IDocuNotionContext,
    match: RegExpExecArray
  ): Promise<string>;
  // normally, anything in code blocks is will be ignored. If you want to make changes inside of code blocks, set this to true.
  includeCodeBlocks?: boolean;

  // If the output is creating things like react elements, you can append their import definitions
  // to this array so they get added to the page.
  // e.g. mod.imports.push(`import ReactPlayer from "react-player";`);
  imports?: string[];
};

export type ICustomNotionToMarkdownConversion = (
  block: ListBlockChildrenResponseResult,
  context: IDocuNotionContext
) => () => Promise<string>;

export type IGetBlockChildrenFn = (id: string) => Promise<NotionBlock[]>;

export type IDocuNotionContext = {
  layoutStrategy: LayoutStrategy;
  options: DocuNotionOptions;
  getBlockChildren: IGetBlockChildrenFn;
  notionToMarkdown: NotionToMarkdown;
  pageInfo: IDocuNotionContextPageInfo;
  convertNotionLinkToLocalDocusaurusLink: (url: string) => string | undefined;
  pages: NotionPage[];
  counts: ICounts;

  // If the output is creating things like react elements, you can append their import definitions
  // to this array so they get added to the page.
  // e.g. context.imports.push(`import ReactPlayer from "react-player";`);
  imports: string[];
};

export type IDocuNotionContextPageInfo = {
  directoryContainingMarkdown: string;
  relativeFilePathToFolderContainingPage: string;
  slug: string;
};
