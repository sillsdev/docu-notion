import { IPlugin } from "../config/configuration";

export const gifEmbed: IPlugin = {
  name: "gif",
  regexMarkdownModifications: [
    {
      label: "gif",
      // I once saw a gif coming from Notion that wasn't a full
      // url, which wouldn't work, hence the "http" requirement
      regex: /\[.*\]\((http.*(\.(gif|GIF)))\)/gm,
      output: `![]($1)`,
    },
  ],
};

export const imgurGifEmbed: IPlugin = {
  name: "imgur",
  regexMarkdownModifications: [
    {
      label: "imgur",
      regex: /\[.*\]\((.*imgur\.com\/.*)\)/gm, // imgur.com
      // imgur links to gifs need a .gif at the end, but the url they give you doesn't have one.
      output: `![]($1.gif)`,
    },
  ],
};
export const youtubeEmbed: IPlugin = {
  name: "youtube",
  regexMarkdownModifications: [
    {
      label: "youtube",
      regex: /\[.*\]\((.*youtube\.com\/watch.*)\)/gm, //youtube.com/watch
      imports: [`import ReactPlayer from "react-player";`],
      output: `<ReactPlayer controls url="$1" />`,
    },
  ],
};
export const vimeoEmbed: IPlugin = {
  name: "vimeo",
  regexMarkdownModifications: [
    {
      label: "vimeo",
      regex: /\[.*\]\((https:\/\/.*vimeo.*)\)/gm,
      // we use to have the following, but the above should handle both the player an not-player urls.
      //regex: /\[.*\]\((.*player\.vimeo.*)\)/gm, // player.vimeo

      imports: [`import ReactPlayer from "react-player";`],
      output: `<ReactPlayer controls url="$1" />`,
    },
  ],
};
