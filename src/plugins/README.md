# Plugins (Advanced & Experimental)

If your project needs some processing that docu-notion doesn't already provide, you can provide a plugin that does it. If there is call for it, we'll add more documentation in the future. But for now, here's the steps:

1. Add a `docu-notion.config.ts` to the root level of your project directory.
1. Add something like this:

```ts
import { IDocuNotionConfig } from "docu-notion";

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
  plugins: [dummyMarkdownModifier],
};
export default config;

```

For other available plugin points, see [pluginTypes.ts](pluginTypes.ts). All of the built-in processing is also done via built-in plugins, so those files and their unit tests should serve as good examples.

Once you have your plugin working, you have three options:

- just keep it as part of your Docusaurus project.
- publish it to NPM so that others can use it. Let us know so that we can advertise it here.
- talk to us about making it a built-in part of `docu-notion`
