import * as Cosmic from "cosmiconfig";
import defaultConfig from "./default.docunotion.config";
import { error, verbose } from "../log";
import { TypeScriptLoader } from "cosmiconfig-typescript-loader";
import { IPlugin } from "../plugins/pluginTypes";
import { exit } from "process";
import { PluginLoader } from "../plugins/pluginLoader";

export type IDocuNotionConfig = {
  plugins: IPlugin[];
  customPluginPaths?: string[];
};

// read the plugins from the config file
// and add them to the map
export async function loadConfigAsync(): Promise<IDocuNotionConfig> {
  let config: IDocuNotionConfig = defaultConfig;
  try {
    const cosmic = Cosmic.cosmiconfig("docu-notion", {
      loaders: {
        ".ts": TypeScriptLoader(),
      },
      searchPlaces: [`docu-notion.config.ts`],
    });
    const found = await cosmic.search();
    if (found) {
      verbose(`Loading config from ${found.filepath}`);
    } else {
      verbose(`Did not find configuration file, using defaults.`);
    }

    // Load custom plugins if specified
    const customPluginPaths = found?.config?.customPluginPaths || [];
    const pluginLoader = new PluginLoader({ customPluginPaths });
    const customPlugins = await pluginLoader.loadAllPlugins();

    const pluginsWithInitializers = [...(found?.config?.plugins || []), ...customPlugins].filter(
      (p: IPlugin) => p.init !== undefined
    );
    const initializers = pluginsWithInitializers?.map(
      (p: IPlugin) => () => p!.init!(p)
    );

    await Promise.all(initializers || []);

    [...(found?.config?.plugins || []), ...customPlugins].forEach(async (plugin: IPlugin) => {
      if (plugin.init !== undefined) {
        verbose(`Initializing plugin ${plugin.name}...`);
        await plugin.init(plugin);
      }
    });

    // Combine default plugins with config plugins and custom plugins
    config = {
      plugins: defaultConfig.plugins.concat(found?.config?.plugins || []).concat(customPlugins),
      customPluginPaths,
    };
  } catch (e: any) {
    error(e.message);
    exit(1);
  }
  verbose(`Active plugins: [${config.plugins.map(p => p.name).join(", ")}]`);
  return config;
}
