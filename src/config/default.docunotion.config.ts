import { imgur } from "../DocusaurusTweaks";
import { standardImageTransformer } from "../images";
import { standardLinkConversion } from "../links";
import { standardColumnTransformer } from "../transformers/ColumnTransformer";
import { escapeHtmlBlockModifier } from "../transformers/EscapeHtmlBlockModifier";
import { standardHeadingTransformer } from "../transformers/HeadingTransformer";
import { IDocuNotionConfig } from "./configuration";

const config: IDocuNotionConfig = {
  plugins: [
    // Notion JSON modifiers
    escapeHtmlBlockModifier,
    standardHeadingTransformer, // does operations on both the Notion JSON and then later, on the notion to markdown transform

    // Notion to Markdown transformers
    standardColumnTransformer,
    standardImageTransformer,

    // Regexps that operate on the Markdown output
    imgur,

    // Link modifiers, which are special because they can read all the pages
    standardLinkConversion,
  ],
};

export default config;
