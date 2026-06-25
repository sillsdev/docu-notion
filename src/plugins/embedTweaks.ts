import { IPlugin } from "./pluginTypes";

export const gifEmbed: IPlugin = {
  name: "gif",
  regexMarkdownModifications: [
    {
      // I once saw a gif coming from Notion that wasn't a full
      // url, which wouldn't work, hence the "http" requirement.
      //
      // We only embed when the link has no author-written text: either empty
      // `[]` (an embed) or the literal `[bookmark]` placeholder notion-to-md
      // emits for bookmark blocks. A link the user gave real text, e.g.
      // `[see animation](...gif)`, is left as a clickable link instead of being
      // turned into an image (which would also throw the text away).
      //
      // The optional leading "!" lets us match (and replace) a link that
      // another mod has already turned into an image, instead of prepending
      // a second "!" and producing "!![](...)".
      regex: /!?\[(?:bookmark)?\]\((http.*?(\.(gif|GIF)))\)/,
      replacementPattern: `![]($1)`,
    },
  ],
};

export const imgurGifEmbed: IPlugin = {
  name: "imgur",
  regexMarkdownModifications: [
    {
      // Only embed textless (`[]`) or bookmark (`[bookmark]`) links, so that a
      // link the user gave real text to is kept as a clickable link rather than
      // converted to an image. The optional leading "!" lets us match a link
      // that's already an image without prepending a second "!" (see the longer
      // note in gifEmbed above).
      regex: /!?\[(?:bookmark)?\]\((.*?imgur\.com\/.*?)\)/, // imgur.com
      // imgur links to gifs need a .gif at the end, but the url they give you doesn't have one.
      replacementPattern: `![]($1.gif)`,
    },
  ],
};
