import {
  IDocuNotionConfig,
  IPlugin,
  NotionBlock,
} from "./dist/config/configuration";
import { verbose } from "./dist/log";

const dummyBlockModifier: IPlugin = {
  name: "dummyBlockModifier",

  notionBlockModifications: [
    {
      modify: (block: NotionBlock) => {
        verbose("dummyBlockModifier was called");
      },
    },
  ],
};

const dummyMarkdownModifier: IPlugin = {
  name: "dummyMarkdownModifier",

  regexMarkdownModifications: [
    {
      regex: /aaa(.*)aaa/,
      replacementPattern: "bbb$1bbb",
    },
  ],
};

const config: IDocuNotionConfig = {
  plugins: [dummyBlockModifier, dummyMarkdownModifier],
};

export default config;
