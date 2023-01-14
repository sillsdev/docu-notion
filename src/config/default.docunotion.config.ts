import { imgurGifTweak } from "../DocusaurusTweaks";
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

    // Notion to Markdown transformers
    standardColumnTransformer,
    standardColumnListTransformer,
    standardImageTransformer,
    standardCalloutTransformer,
    standardTableTransformer,
    standardNumberedListTransformer,

    // Link modifiers, which are special because they can read all the pages
    standardLinkConversion,

    // Regexps that operate on the Markdown output
    imgurGifTweak,
    // TODO: add the rest of the existing ones
  ],
};

export default defaultConfig;
