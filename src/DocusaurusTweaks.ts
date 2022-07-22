import chalk from "chalk";

export function tweakForDocusaurus(input: string): {
  body: string;
  imports: string;
} {
  const output = notionCalloutsToAdmonitions(input);
  const { body, imports } = notionEmbedsToMDX(output);
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
  const gif = {
    import: `import GifPlayer from "react-gif-player";`,
    output: `<GifPlayer gif="$1" />`,
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
    // This is included in notion-pull-mdx just because we built notion-pull-mdx for our own doc site, and it needs this.
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
      console.log(chalk.green(`${string} --> ${v.output.replace("$1", url)}`));
      body = body.replace(string, v.output.replace("$1", url));
      imports.add(v.import);
    }
  }

  return { body, imports: [...imports].join("\n") };
}

// In Notion, you can make a callout and change its emoji. We map 5 of these
// to the 5 Docusaurus admonition styles.
function notionCalloutsToAdmonitions(input: string): string {
  const notionCalloutPattern = />\s(ℹ️|⚠️|💡|❗|🔥|.)\s(.*)\n/gmu;
  const calloutsToAdmonitions = {
    /* prettier-ignore */ "ℹ️": "note",
    "💡": "tip",
    "❗": "info",
    "⚠️": "caution",
    "🔥": "danger",
  };
  let output = input;
  let match;
  while ((match = notionCalloutPattern.exec(input)) !== null) {
    const string = match[0];
    const emoji = match[1] as keyof typeof calloutsToAdmonitions;
    const content = match[2];

    const docusaurusAdmonition = calloutsToAdmonitions[emoji];
    if (docusaurusAdmonition) {
      output = output.replace(
        string,
        `:::${docusaurusAdmonition}\n\n${content}\n\n:::\n\n`
      );
    }
    // For Notion callouts with other emojis, pass them through using hte emoji as the name.
    // For this to work on a Docusaurus site, it will need to define that time on the remark-admonitions options in the docusaurus.config.js.
    // See https://github.com/elviswolcott/remark-admonitions and https://docusaurus.io/docs/using-plugins#using-presets.
    else {
      output = output.replace(string, `:::${emoji}\n\n${content}\n\n:::\n\n`);
    }
  }

  return output;
}
