/* This file is only used when testing docu-notion itself, not when it is used as a library.
  E.g., if you run `yarn pull-test-tagged`, docu-notion will read this file and use it to configure itself,
  using these example plugins.
 */

import { IPlugin, IDocuNotionConfig, Log, NotionBlock } from "./dist";

const dummyBlockModifier: IPlugin = {
  name: "dummyBlockModifier",

  notionBlockModifications: [
    {
      modify: (block: NotionBlock) => {
        Log.verbose("dummyBlockModifier was called");
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
