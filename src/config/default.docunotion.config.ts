import { standardImageTransformer } from "../images";
import { standardLinkConversion } from "../links";
import { standardColumnTransformer } from "../transformers/ColumnTransformer";
import { IDocuNotionConfig, IPlugin } from "./configuration";

const imgur: IPlugin = {
  name: "imgur",
  regexMarkdownTransformers: [
    {
      label: "imgur",
      regex: /\[embed\]\((.*imgur\.com\/.*)\)/gm, // imgur.com
      output: `![]($1.gif)`, // note: imgur links to gifs need a .gif at the end, but the url they give you doesn't have one.
    },
  ],
};

const config: IDocuNotionConfig = {
  plugins: [
    // Notion to Markdown transformers
    standardColumnTransformer,
    standardImageTransformer,
    // Regexes that operate on Markdown outpus
    imgur,
    // Link transformations
    standardLinkConversion,
  ],
};

export default config;
