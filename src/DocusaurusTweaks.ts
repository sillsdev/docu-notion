import { IPlugin } from "./config/configuration";
import { logDebug } from "./log";

export function tweakForDocusaurus(input: string): {
  body: string;
  imports: string;
} {
  const { body, imports } = notionEmbedsToMDX(input);
  return { body, imports };
}
// In Notion, you can embed videos & such. To show these
// in Docusaurus, we have to
// * switch to .MDX instead of just .MD
// * import the required react libraries
// * insert some JSX for each embed
function notionEmbedsToMDX(input: string): {
  body: string;
  imports: string;
} {
  /* Note: the notion api tells us that the embedded type is video, but this information is lost by the time
  we got through notion-to-md:
  {
    ...
    "type": "video",
    "video": {
      "caption": [],
      "type": "external",
      "external": {
        "url": "https://www.youtube.com/watch?v=FXIrojSK3Jo"
      }
    }
  },

  For now, we're just using this regex to notice youtube and vimeo.
  */

  // NOTE: currently notion-to-md seems to be dropping the "Caption" entirely.

  const video = {
    import: `import ReactPlayer from "react-player";`,
    output: `<ReactPlayer controls url="$1" />`,
  };
  /* GifPlayer worked with some sources but not imgur which is the most important for my project. It would just give CORS errors.
    And it is unmaintained. So let's just let the raw gif link do its thing.
    const gif = {
    import: `import GifPlayer from "react-gif-player";`,
    output: `<GifPlayer gif="$1" />`,
  };
  */ const gif = {
    import: "",
    output: `![]($1.gif)`, // note: imgur links to gifs need a .gif at the end, but the url they give you doesn't have one.
  };
  const embeds = {
    youtube: {
      regex: /\[.*\]\((.*youtube\.com\/watch.*)\)/gm, //youtube.com/watch
      ...video,
    },
    vimeo: {
      regex: /\[.*\]\((.*player\.vimeo.*)\)/gm, // player.vimeo
      ...video,
    },
    imgur: {
      regex: /\[embed\]\((.*imgur\.com\/.*)\)/gm, // imgur.com
      ...gif,
    },
    gifExtension: {
      // ending in .gif. I once saw a gif coming form Notion that wasn't a full
      // url, which wouldn't work, hence the "http" requirement
      regex: /\[.*\]\((http.*(\.(gif|GIF)))\)/gm,
      ...gif,
    },
    // This is included in docu-notion just because we built docu-notion for our own doc site, and it needs this.
    // bloomPUB: {
    //   regex: /\[.*\]\((.*bloomlibrary\.org.*.*book.*)\)/gm,
    //   // enhance: it would be nice if we could fill in the `host` parameter for analytics
    //   //     output: `<iframe width="100%" height="500px" allow="fullscreen"    allowFullScreen={true}
    //   //     src="https://embed.bloomlibrary.org/bloom-player/bloomplayer.htm?url=$1_url_encoded&initiallyShowAppBar=false&allowToggleAppBar=false"
    //   // ></iframe>`,
    //   output: `<iframe width="100%" height="450px" allow="fullscreen" allowFullScreen={true} src="https://bloomlibrary.org/player/$1"></iframe>`,
    //   import: "", // it's just an iframe, nothing to import
    // },
  };

  let body = input;
  let match;
  const imports = new Set<string>();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [k, v] of Object.entries(embeds)) {
    while ((match = v.regex.exec(input)) !== null) {
      const string = match[0];
      const url = match[1];
      logDebug(
        "DocusaurusTweaks",
        `${string} --> ${v.output.replace("$1", url)}`
      );
      body = body.replace(string, v.output.replace("$1", url));
      imports.add(v.import);
    }
  }

  return { body, imports: [...imports].join("\n") };
}

export const imgurGifTweak: IPlugin = {
  name: "imgur",
  regexMarkdownModifications: [
    {
      label: "imgur",
      regex: /\[embed\]\((.*imgur\.com\/.*)\)/gm, // imgur.com
      // imgur links to gifs need a .gif at the end, but the url they give you doesn't have one.
      output: `![]($1.gif)`,
    },
  ],
};
