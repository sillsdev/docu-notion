import * as fs from "fs-extra";
import { setLogLevel } from "../log";
import { NotionBlock } from "../types";
import { standardVideoTransformer } from "./VideoTransformer";
import { blocksToMarkdown, kTemporaryTestDirectory } from "./pluginTestRun";

beforeAll(async () => {
  try {
    if (await fs.pathExists(kTemporaryTestDirectory)) {
      await fs.emptyDir(kTemporaryTestDirectory);
    } else {
      await fs.mkdirp(kTemporaryTestDirectory);
    }
  } catch (err) {
    console.error("Error in beforeAll:", err);
  }
});

afterAll(async () => {
  try {
    await fs.remove(kTemporaryTestDirectory);
  } catch (err) {
    console.error("Error in afterAll:", err);
  }
});

test("youtube embedded", async () => {
  const config = { plugins: [standardVideoTransformer] };
  const result = await blocksToMarkdown(config, [
    {
      object: "block",
      type: "video",
      video: {
        caption: [
          {
            type: "text",
            text: {
              content: "A video about editing in Notion",
              link: null,
            },
            plain_text: "A video about editing in Notion",
            href: null,
          },
        ],
        type: "external",
        external: { url: "https://www.youtube.com/watch?v=FXIrojSK3Jo" },
      },
    } as unknown as NotionBlock,
  ]);
  expect(result).toContain(`import ReactPlayer from "react-player";`);
  expect(result).toContain(
    `<ReactPlayer controls url="https://www.youtube.com/watch?v=FXIrojSK3Jo" />`
  );
});

test("vimeo embedded", async () => {
  setLogLevel("verbose");
  const config = { plugins: [standardVideoTransformer] };
  const result = await blocksToMarkdown(config, [
    {
      object: "block",
      type: "video",
      video: {
        caption: [],
        type: "external",
        external: { url: "https://vimeo.com/4613611xx" },
      },
    } as unknown as NotionBlock,
  ]);
  expect(result).toContain(`import ReactPlayer from "react-player";`);
  expect(result).toContain(
    `<ReactPlayer controls url="https://vimeo.com/4613611xx" />`
  );
});

test("video link, not embedded", async () => {
  setLogLevel("verbose");
  const config = { plugins: [standardVideoTransformer] };
  const result = await blocksToMarkdown(config, [
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: {
              content: "https://vimeo.com/4613611xx",
              link: {
                url: "https://vimeo.com/4613611xx",
              },
            },
            annotations: {
              code: false,
            },
            plain_text: "https://vimeo.com/4613611xx",
            href: "https://vimeo.com/4613611xx",
          },
        ],
        color: "default",
      },
    } as unknown as NotionBlock,
  ]);
  expect(result).toContain(
    "[https://vimeo.com/4613611xx](https://vimeo.com/4613611xx)"
  );
  expect(result).not.toContain(`import`);
});

test("direct upload to to Notion (embedded)", async () => {
  setLogLevel("verbose");
  const config = { plugins: [standardVideoTransformer] };

  const fileName1 = "first_video.mp4";
  const fileName2 = "second_video.mp4";
  const result = await blocksToMarkdown(config, [
    {
      object: "block",
      id: "12f7db3b-4412-4be9-a3f7-6ac423fee94a",
      parent: {
        type: "page_id",
        page_id: "edaffeb2-ece8-4d44-976f-351e6b5757bb",
      },

      type: "video",
      video: {
        caption: [],
        type: "file",
        file: {
          url: `https://s3.us-west-2.amazonaws.com/secure.notion-static.com/f6bc4746-011e-2124-86ca-ed4337d70891/${fileName1}?X-Blah-blah`,
        },
      },
    } as unknown as NotionBlock,
    {
      object: "block",
      id: "12f7db3b-4412-4be9-a3f7-6ac423fee94b",
      parent: {
        type: "page_id",
        page_id: "edaffeb2-ece8-4d44-976f-351e6b5757bb",
      },

      type: "video",
      video: {
        caption: [],
        type: "file",
        file: {
          url: `https://s3.us-west-2.amazonaws.com/secure.notion-static.com/f6bc4746-011e-2124-86ca-ed4337d70891/${fileName2}?X-Blah-blah`,
        },
      },
    } as unknown as NotionBlock,
  ]);

  expect(result).toContain(`import ReactPlayer from "react-player";`);
  expect(result).toContain(`import video1 from "./${fileName1}";`);
  expect(result).toContain(`import video2 from "./${fileName2}";`);
  expect(result).toContain(`<ReactPlayer controls url={video1} />`);
  expect(result).toContain(`<ReactPlayer controls url={video2} />`);

  // Wait half a second for the files to be written
  await new Promise(resolve => setTimeout(resolve, 500));

  // We should have actually created files in "tempTestFileDir/"
  expect(await fs.pathExists("tempTestFileDir/" + fileName1)).toBe(true);
  expect(await fs.pathExists("tempTestFileDir/" + fileName2)).toBe(true);
});
