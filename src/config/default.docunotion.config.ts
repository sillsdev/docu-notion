import {
  gifEmbed,
  imgurGifEmbed,
  vimeoEmbed,
  youtubeEmbed,
} from "../DocusaurusEmbeds";
import { standardImageTransformer } from "../images";
import { standardLinkConversion } from "../plugins/internalLinks";
import { standardCalloutTransformer } from "../plugins/CalloutTransformer";
import { standardColumnListTransformer } from "../plugins/ColumnListTransformer";
import { standardColumnTransformer } from "../plugins/ColumnTransformer";
import { escapeHtmlBlockModifier } from "../plugins/EscapeHtmlBlockModifier";
import { standardHeadingTransformer } from "../plugins/HeadingTransformer";
import { standardNumberedListTransformer } from "../plugins/NumberedListTransformer";
import { standardTableTransformer } from "../plugins/TableTransformer";
import { IDocuNotionConfig } from "./configuration";

const defaultConfig: IDocuNotionConfig = {
  plugins: [
    // Notion "Block" JSON modifiers
    escapeHtmlBlockModifier,
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
    standardLinkConversion,

    // Regexps plus javascript `import`s that operate on the Markdown output
    imgurGifEmbed,
    gifEmbed,
    youtubeEmbed,
    vimeoEmbed,
  ],
};

export default defaultConfig;
