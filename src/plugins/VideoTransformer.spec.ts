import { setLogLevel } from "../log";
import { NotionBlock } from "../types";
import { standardVideoTransformer } from "./VideoTransformer";
import { blocksToMarkdown } from "./pluginTestRun";

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
          url: "https://s3.us-west-2.amazonaws.com/secure.notion-static.com/f6bc4746-011e-2124-86ca-ed4337d70891/people_fre_motionAsset_p3.mp4?X-Blah-blah",
        },
      },
    } as unknown as NotionBlock,
  ]);
  expect(result).toContain(`import ReactPlayer from "react-player";`);
  expect(result).toContain(
    `<ReactPlayer controls url="https://s3.us-west-2.amazonaws.com/secure.notion-static.com/f6bc4746-011e-2124-86ca-ed4337d70891/people_fre_motionAsset_p3.mp4?X-Blah-blah" />`
  );
});
