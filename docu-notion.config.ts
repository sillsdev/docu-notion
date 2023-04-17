/* This file is only used when testing docu-notion itself, not when it is used as a library.
  E.g., if you run `npm run pull-test-tagged`, docu-notion will read this file and use it to configure itself,
  using these example plugins.
 */

import { IPlugin, IDocuNotionConfig, Log, NotionBlock } from "./dist";

// This is an example of a plugin that needs customization by the end user.
// It uses a closure to supply the plugin with the customization parameter.
function dummyBlockModifier(customParameter: string): IPlugin {
  return {
    name: "dummyBlockModifier",

    notionBlockModifications: [
      {
        modify: (block: NotionBlock) => {
          Log.verbose(
            `dummyBlockModifier has customParameter:${customParameter}.`
          );
        },
      },
    ],
  };
}

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
  plugins: [
    // here we're adding a plugin that needs a parameter for customization
    dummyBlockModifier("foobar"),
    // here's we're adding a plugin that doesn't take any customization
    dummyMarkdownModifier,
  ],
};

export default config;
