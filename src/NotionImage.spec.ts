import { parseImageBlock } from "./NotionImage";

/* eslint-disable @typescript-eslint/require-await */
describe("image caption", () => {
  it("should find a caption", async () => {
    const img = parseImageBlock(kImageBlock);
    expect(img.url).toBe("https://someimage.png");
  });
});

const kImageBlock = {
  object: "block",
  id: "20b821b4-7c5b-41dc-8e30-92c23c125580",
  parent: {
    type: "page_id",
    page_id: "9dd05134-0401-47f6-b159-1e6b76b9aad3",
  },
  created_time: "2022-07-25T23:05:00.000Z",
  last_edited_time: "2022-07-25T23:07:00.000Z",
  created_by: {
    object: "user",
    id: "11fb7f16-0560-4aee-ab88-ed75a850cfc4",
  },
  last_edited_by: {
    object: "user",
    id: "11fb7f16-0560-4aee-ab88-ed75a850cfc4",
  },
  has_children: false,
  archived: false,
  type: "image",
  image: {
    caption: [
      {
        type: "text",
        text: { content: "fr-", link: null },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default",
        },
        plain_text: "fr-",
        href: null,
      },
      {
        type: "text",
        text: {
          content: "https://i.imgur.com/pYmE7OJ.png",
          link: { url: "https://i.imgur.com/pYmE7OJ.png" },
        },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default",
        },
        plain_text: "https://i.imgur.com/pYmE7OJ.png",
        href: "https://i.imgur.com/pYmE7OJ.png",
      },
      {
        type: "text",
        text: { content: " es-", link: null },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default",
        },
        plain_text: " es-",
        href: null,
      },
      {
        type: "text",
        text: {
          content: "https://i.imgur.com/8paSZ0i.png",
          link: { url: "https://i.imgur.com/8paSZ0i.png" },
        },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default",
        },
        plain_text: "https://i.imgur.com/8paSZ0i.png",
        href: "https://i.imgur.com/8paSZ0i.png",
      },
    ],
    type: "file",
    file: {
      url: "https://someimage.png",
      expiry_time: "2022-07-26T00:19:09.096Z",
    },
  },
};
