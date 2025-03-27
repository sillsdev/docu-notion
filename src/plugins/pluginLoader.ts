import { IPlugin } from './pluginTypes';
import fs from 'fs';
import path from 'path';

export interface PluginLoaderOptions {
  customPluginPaths?: string[];
}

export class PluginLoader {
  private defaultPluginPath: string;
  private customPluginPaths: string[];

  constructor(options: PluginLoaderOptions = {}) {
    this.defaultPluginPath = __dirname;
    this.customPluginPaths = options.customPluginPaths || [];
  }

  /**
   * Loads all plugins from both default and custom plugin directories
   */
  async loadAllPlugins(): Promise<IPlugin[]> {
    const plugins: IPlugin[] = [];

    // Load default plugins
    const defaultPlugins = await this.loadPluginsFromDirectory(this.defaultPluginPath);
    plugins.push(...defaultPlugins);

    // Load custom plugins from each custom plugin path
    for (const customPath of this.customPluginPaths) {
      if (fs.existsSync(customPath)) {
        const customPlugins = await this.loadPluginsFromDirectory(customPath);
        plugins.push(...customPlugins);
      }
    }

    return plugins;
  }

  /**
   * Loads plugins from a specific directory
   */
  private async loadPluginsFromDirectory(dirPath: string): Promise<IPlugin[]> {
    const plugins: IPlugin[] = [];
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      if (file.endsWith('.ts') && !file.endsWith('.spec.ts') && !file.includes('pluginTypes') && !file.includes('pluginLoader')) {
        const modulePath = path.join(dirPath, file);
        try {
          const module = await import(modulePath);
          const plugin = module.default || module;
          if (this.isValidPlugin(plugin)) {
            plugins.push(plugin);
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn(`Failed to load plugin from ${modulePath}:`, error);
        }
      }
    }

    return plugins;
  }

  /**
   * Validates if a loaded module is a valid plugin
   */
  private isValidPlugin(plugin: any): plugin is IPlugin {
    return (
      plugin &&
      typeof plugin === 'object' &&
      typeof plugin.name === 'string' &&
      (
        Array.isArray(plugin.notionBlockModifications) ||
        Array.isArray(plugin.notionToMarkdownTransforms) ||
        plugin.linkModifier ||
        Array.isArray(plugin.regexMarkdownModifications)
      )
    );
  }
} 