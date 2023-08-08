import { gifEmbed, imgurGifEmbed } from "../plugins/embedTweaks";
import { standardImageTransformer } from "../images";
import { standardInternalLinkConversion } from "../plugins/internalLinks";
import { standardCalloutTransformer } from "../plugins/CalloutTransformer";
import { standardColumnListTransformer } from "../plugins/ColumnListTransformer";
import { standardColumnTransformer } from "../plugins/ColumnTransformer";
import { standardEscapeHtmlBlockModifier } from "../plugins/EscapeHtmlBlockModifier";
import { standardHeadingTransformer } from "../plugins/HeadingTransformer";
import { standardNumberedListTransformer } from "../plugins/NumberedListTransformer";
import { standardTableTransformer } from "../plugins/TableTransformer";
import { standardVideoTransformer } from "../plugins/VideoTransformer";
import { standardExternalLinkConversion } from "../plugins/externalLinks";
import { IDocuNotionConfig } from "./configuration";

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
    standardVideoTransformer,

    // Link modifiers, which are special because they can read metadata from all the pages in order to figure out the correct url
    standardInternalLinkConversion,
    standardExternalLinkConversion,

    // Regexps plus javascript `import`s that operate on the Markdown output
    imgurGifEmbed,
    gifEmbed,
  ],
};

export default defaultConfig;
