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

const dummyBlockModifier2: IPlugin = {
  name: "dummyBlockModifier2",

  notionBlockModifications: [
    {
      modify: (block: NotionBlock) => {
        verbose("dummyBlockModifier2 was called");
      },
    },
  ],
};

const dummyBlockModifier2Plugin: IPlugin = {
  name: "dummyBlockModifier2Plugin",

  init: (p: IPlugin): Promise<void> => {
    return new Promise((resolve, reject) => {
      verbose("****dummyBlockModifier2Plugin init was called");
      p.notionBlockModifications = dummyBlockModifier2.notionBlockModifications;
      resolve();
    });
  },
};

const config: IDocuNotionConfig = {
  plugins: [dummyBlockModifier, dummyBlockModifier2Plugin],
};

export default config;
