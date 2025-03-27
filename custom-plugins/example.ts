import { IPlugin } from '../src/plugins/pluginTypes';

const examplePlugin: IPlugin = {
  name: 'Example Custom Plugin',
  regexMarkdownModifications: [
    {
      regex: /\[\[(.*?)\]\]/g,
      replacementPattern: '[[$1]]',
      includeCodeBlocks: false,
    },
  ],
};

export default examplePlugin; 