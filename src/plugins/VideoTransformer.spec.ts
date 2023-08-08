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
