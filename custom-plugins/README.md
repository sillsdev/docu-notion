# Custom Plugins Directory

This directory contains custom plugins for docu-notion. These plugins will be loaded in addition to the default plugins.

## Plugin Structure

Each plugin should be a TypeScript file that exports a plugin object conforming to the `IPlugin` interface. Here's an example:

```typescript
import { IPlugin } from '../src/plugins/pluginTypes';

const myPlugin: IPlugin = {
  name: 'My Custom Plugin',
  // Add your plugin functionality here
  regexMarkdownModifications: [
    {
      regex: /pattern/g,
      replacementPattern: 'replacement',
      includeCodeBlocks: false,
    },
  ],
};

export default myPlugin;
```

## Available Plugin Features

You can implement any of the following features in your plugin:

1. `notionBlockModifications`: Modify Notion blocks before they are converted to markdown
2. `notionToMarkdownTransforms`: Override default Notion-to-markdown conversions
3. `linkModifier`: Modify links after they are converted to markdown
4. `regexMarkdownModifications`: Perform regex replacements on the markdown output
5. `init`: Perform async initialization when the plugin is loaded

See the `IPlugin` interface in `src/plugins/pluginTypes.ts` for more details.

## Loading Custom Plugins

Custom plugins in this directory will be automatically loaded when running docu-notion. You can also specify additional custom plugin directories in your configuration.

## Example

See `example.ts` in this directory for a simple example plugin. 