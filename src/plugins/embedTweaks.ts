import { IPlugin } from "./pluginTypes";

export const gifEmbed: IPlugin = {
  name: "gif",
  regexMarkdownModifications: [
    {
      // I once saw a gif coming from Notion that wasn't a full
      // url, which wouldn't work, hence the "http" requirement.
      // The optional leading "!" lets us match (and replace) a link that
      // another mod has already turned into an image, instead of prepending
      // a second "!" and producing "!![](...)".
      regex: /!?\[.*?\]\((http.*?(\.(gif|GIF)))\)/,
      replacementPattern: `![]($1)`,
    },
  ],
};

export const imgurGifEmbed: IPlugin = {
  name: "imgur",
  regexMarkdownModifications: [
    {
      // the optional leading "!" lets us match a link that's already an image
      // without prepending a second "!" (see the note in gifEmbed above).
      regex: /!?\[.*?\]\((.*?imgur\.com\/.*?)\)/, // imgur.com
      // imgur links to gifs need a .gif at the end, but the url they give you doesn't have one.
      replacementPattern: `![]($1.gif)`,
    },
  ],
};
