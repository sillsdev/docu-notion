import fetch from "node-fetch";
import { error } from "../log";

// Everything in this file (and containing folder) **really** wants to be moved out of docu-notion.
// But that will require some thinking about how to let the client add custom processing.

export const bloomPUBembedProps = {
  regex: /\[.*\]\(.*\/\/(.*)bloomlibrary\.org.*[book|player]\/(.+)\)/gm,
  // It would also be possible to just use the /player page for the book (at the cost of including all of blorg):
  //output: `<iframe width="100%" height="450px" allow="fullscreen" allowFullScreen={true}
  // src="https://bloomlibrary.org/player/$1_uri_encoded"></iframe>

  // For now, I've decided not to let bloom-player report analytics (`independent=false`).
  // There are too many questions such as:
  // * Do we even want **any** book reading analytics from our docs site?
  // * What should `host` be? (I've set it to docs.bloomlibrary.org for now.)
  // * How would we properly distinguish or filter out dev books? Or does it matter?
  output: `<iframe width="100%" height="450px" allow="fullscreen" allowFullScreen={true}
    src="https://bloomlibrary.org/bloom-player/bloomplayer.htm?url=$1_harvester_digital_output_url&initiallyShowAppBar=false&allowToggleAppBar=true&independent=false&host=docs.bloomlibrary.org"></iframe>`,
  import: "", // it's just an iframe, nothing to import
};

export async function getBloomPUBReplacement(
  matchedString: string,
  parseBookId: string,
  bookPageUrlSubDomain: string
): Promise<string> {
  const harvesterUrl = await getHarvesterUrl(parseBookId, bookPageUrlSubDomain);
  if (harvesterUrl) {
    return bloomPUBembedProps.output.replace(
      "$1_harvester_digital_output_url",
      // We have to decode it because docusaurus (I think?) will encode it again.
      decodeURIComponent(harvesterUrl)
    );
  } else {
    return `docu-notion tried to embed a Bloom book for \`${matchedString}\` but failed to get the harvester url.`;
  }
}

async function getHarvesterUrl(
  parseBookId: string,
  bookPageUrlSubDomain: string
): Promise<string | undefined> {
  try {
    let parseServerUrl = "https://server.bloomlibrary.org/parse/classes/books";
    let parseAppId = "R6qNTeumQXjJCMutAJYAwPtip1qBulkFyLefkCE5";
    if (bookPageUrlSubDomain.includes("dev")) {
      parseServerUrl =
        "https://dev-server.bloomlibrary.org/parse/classes/books";
      parseAppId = "yrXftBF6mbAuVu3fO6LnhCJiHxZPIdE7gl1DUVGR";
    }

    const response = await fetch(
      `${parseServerUrl}/${parseBookId}?keys=baseUrl`,
      {
        headers: {
          "X-Parse-Application-Id": parseAppId,
        },
      }
    );

    const { baseUrl } = (await response.json()) as {
      baseUrl: string;
    };

    // This logic was copied from blorg
    let folderWithoutLastSlash = baseUrl;
    if (baseUrl.endsWith("%2f")) {
      folderWithoutLastSlash = baseUrl.substring(0, baseUrl.length - 3);
    }
    const index = folderWithoutLastSlash.lastIndexOf("%2f");
    const pathWithoutBookName = folderWithoutLastSlash.substring(0, index);
    const baseHarvesterUrl = pathWithoutBookName
      .replace("BloomLibraryBooks-Sandbox", "bloomharvest-sandbox")
      .replace("BloomLibraryBooks", "bloomharvest");
    // END logic copied from blorg

    return baseHarvesterUrl + "/bloomdigital%2findex.htm";
  } catch (e) {
    error("Failed to get harvester url: ");
    error(e as Error);
    return undefined;
  }
}
