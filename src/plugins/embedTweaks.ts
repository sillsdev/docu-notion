import { IPlugin } from "./pluginTypes";

export const gifEmbed: IPlugin = {
  name: "gif",
  regexMarkdownModifications: [
    {
      // I once saw a gif coming from Notion that wasn't a full
      // url, which wouldn't work, hence the "http" requirement.
      //
      // We only embed when the link's text is an AUTO-GENERATED label, not
      // something the author typed. By the time this regex runs the label can
      // take three auto shapes:
      //   - empty `[]` (an embed)
      //   - the literal `[bookmark]` placeholder notion-to-md emits for
      //     bookmark blocks (seen when standardExternalLinkConversion isn't in
      //     the config, e.g. the unit tests)
      //   - the URL repeated as the label, `[http...gif](http...gif)`, which is
      //     what standardExternalLinkConversion rewrites `[bookmark]` into in
      //     the production config (it runs in an earlier phase, see transform.ts)
      // A link the author gave real text, e.g. `[see animation](...gif)`, is
      // none of these, so it's left as a clickable link rather than turned into
      // an image (which would also throw the text away).
      //
      // The optional leading "!" lets us match (and replace) a link that
      // another mod has already turned into an image, instead of prepending
      // a second "!" and producing "!![](...)".
      regex: /!?\[(?:bookmark|https?:\/\/[^\]]*\.(?:gif|GIF)[^\]]*)?\]\((http.*?(\.(gif|GIF)))\)/,
      replacementPattern: `![]($1)`,
    },
  ],
};

export const imgurGifEmbed: IPlugin = {
  name: "imgur",
  regexMarkdownModifications: [
    {
      // Only embed links whose text is an auto-generated label (empty `[]`,
      // `[bookmark]`, or the URL repeated as the label `[http...imgur.com/...]`),
      // so that a link the author gave real text to is kept as a clickable link
      // rather than converted to an image. See the longer note in gifEmbed above
      // for why all three label shapes can occur here.
      // The optional leading "!" lets us match a link that's already an image
      // without prepending a second "!".
      regex: /!?\[(?:bookmark|https?:\/\/[^\]]*imgur\.com\/[^\]]*)?\]\((.*?imgur\.com\/.*?)\)/, // imgur.com
      // imgur links to gifs need a .gif at the end, but the url they give you doesn't have one.
      replacementPattern: `![]($1.gif)`,
    },
  ],
};
