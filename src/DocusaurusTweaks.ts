import {
  bloomPUBembedProps,
  getBloomPUBReplacement,
} from "./bloom/BloomBookEmbedding";
import { logDebug } from "./log";

export async function tweakForDocusaurus(input: string): Promise<{
  body: string;
  imports: string;
}> {
  const { body, imports } = await notionEmbedsToMDX(input);
  return { body, imports };
}
// In Notion, you can embed videos & such. To show these
// in Docusaurus, we have to
// * switch to .MDX instead of just .MD
// * import the required react libraries
// * insert some JSX for each embed
async function notionEmbedsToMDX(input: string): Promise<{
  body: string;
  imports: string;
}> {
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
    // We don't yet have a way for clients to provide custom processing.
    bloomPUB: bloomPUBembedProps,
  };

  let body = input;
  let match;
  const imports = new Set<string>();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [k, v] of Object.entries(embeds)) {
    while ((match = v.regex.exec(input)) !== null) {
      const matchedString = match[0];
      const group1 = match[1];

      let replacementString;
      if (k === "bloomPUB") {
        replacementString = await getBloomPUBReplacement(
          matchedString,
          match[2],
          group1
        );
      } else {
        replacementString = v.output
          //.replace("$1_uri_encoded", encodeURIComponent(group1))
          .replace("$1", group1);
      }

      logDebug(
        "DocusaurusTweaks",
        `${matchedString}\n-->\n${replacementString}`
      );
      body = body.replace(matchedString, replacementString);
      imports.add(v.import);
    }
  }

  return { body, imports: [...imports].join("\n") };
}
