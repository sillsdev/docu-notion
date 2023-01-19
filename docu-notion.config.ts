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

const config: IDocuNotionConfig = {
  plugins: [dummyBlockModifier],
};

export default config;
