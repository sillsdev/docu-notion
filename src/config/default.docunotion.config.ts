import {
  gifEmbed,
  imgurGifEmbed,
  vimeoEmbed,
  youtubeEmbed,
} from "../plugins/embedTweaks";
import { standardImageTransformer } from "../images";
import { standardInternalLinkConversion } from "../plugins/internalLinks";
import { standardCalloutTransformer } from "../plugins/CalloutTransformer";
import { standardColumnListTransformer } from "../plugins/ColumnListTransformer";
import { standardColumnTransformer } from "../plugins/ColumnTransformer";
import { standardEscapeHtmlBlockModifier } from "../plugins/EscapeHtmlBlockModifier";
import { standardHeadingTransformer } from "../plugins/HeadingTransformer";
import { standardNumberedListTransformer } from "../plugins/NumberedListTransformer";
import { standardTableTransformer } from "../plugins/TableTransformer";
import { standardExternalLinkConversion } from "../plugins/externalLinks";
import { IDocuNotionConfig } from "./configuration";
import { standardFrontmatterTransformer } from "../plugins/FrontMatterTransformer";

const defaultConfig: IDocuNotionConfig = {
  plugins: [
    // Notion "Block" JSON modifiers
    standardEscapeHtmlBlockModifier,
    standardHeadingTransformer, // does operations on both the Notion JSON and then later, on the notion to markdown transform

    // Notion to Markdown transformers. Most things get transformed correctly by the notion-to-markdown library,
    // but some things need special handling.
    standardColumnTransformer,
    standardColumnListTransformer,
    standardImageTransformer,
    standardCalloutTransformer,
    standardTableTransformer,
    standardNumberedListTransformer,

    // Link modifiers, which are special because they can read metadata from all the pages in order to figure out the correct url
    standardInternalLinkConversion,
    standardExternalLinkConversion,

    // Frontmatter transformers, add information to the page frontMatter
    standardFrontmatterTransformer,

    // Regexps plus javascript `import`s that operate on the Markdown output
    imgurGifEmbed,
    gifEmbed,
    youtubeEmbed,
    vimeoEmbed,
  ],
};

export default defaultConfig;
