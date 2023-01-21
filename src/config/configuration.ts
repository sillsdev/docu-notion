import * as Cosmic from "cosmiconfig";
import defaultConfig from "./default.docunotion.config";
import { error, verbose } from "../log";
import { TypeScriptLoader } from "cosmiconfig-typescript-loader";
import { IDocuNotionConfig, IPlugin } from "../plugins/pluginTypes";

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

    const pluginsWithInitializers = found?.config?.plugins?.filter(
      (p: IPlugin) => p.init !== undefined
    );
    const initializers = pluginsWithInitializers?.map(
      (p: IPlugin) => () => p!.init!(p)
    );

    await Promise.all(initializers || []);

    found?.config?.plugins?.forEach(async (plugin: IPlugin) => {
      if (plugin.init !== undefined) {
        verbose(`Initializing plugin ${plugin.name}...`);
        await plugin.init(plugin);
      }
    });
    // for now, all we have is plugins
    config = {
      plugins: defaultConfig.plugins.concat(found?.config?.plugins || []),
    };
  } catch (e: any) {
    error(e.message);
  }
  verbose(`Active plugins: [${config.plugins.map(p => p.name).join(", ")}]`);
  return config;
}
