import { initImageHandling, parseImageBlock } from "./images";

const kPrimaryImageUrl =
  "https://s3.us-west-2.amazonaws.com/primaryImage.png?Blah=foo";

/* didn't work?
beforeAll(async () => {
  console.log("before");
  await initImageHandling("", "", []);
  console.log("azfter");
});
*/
/* eslint-disable @typescript-eslint/require-await */
test("finds primary image url", async () => {
  await initImageHandling("", "", []);
  const img = parseImageBlock(kImageBlockWithTwoLocalizedImages.image);
  expect(img.primaryUrl).toBe(kPrimaryImageUrl);
});

test("primary caption content after image links are removed", async () => {
  await initImageHandling("", "", []);
  const img = parseImageBlock(
    kImageBlockWithTwoLocalizedImagesWrappedWithActualCaptionText.image
  );
  // carriage returns seem to mess up the markdown, so should be removed
  expect(img.caption).toBe("Caption before images. Caption after images.");
});

test("gets localized image links", async () => {
  await initImageHandling("", "", []);
  const img = parseImageBlock(
    kImageBlockWithTwoLocalizedImagesWrappedWithActualCaptionText.image
  );
  expect(img.localizedUrls.length).toBe(2);
  expect(img.localizedUrls[0].iso632Code).toBe("fr");
  expect(img.localizedUrls[1].iso632Code).toBe("es");
  expect(img.localizedUrls[0].url).toBe("https://i.imgur.com/pYmE7OJ.png");
  expect(img.localizedUrls[1].url).toBe("https://i.imgur.com/8paSZ0i.png");
});

const kImageBlockWithTwoLocalizedImagesWrappedWithActualCaptionText = {
  object: "block",
  id: "20b821b4-7c5b-41dc-8e30-92c23c125580",
  parent: { type: "page_id", page_id: "9dd05134-0401-47f6-b159-1e6b76b9aad3" },
  created_time: "2022-07-25T23:05:00.000Z",
  last_edited_time: "2022-07-26T15:31:00.000Z",
  created_by: { object: "user", id: "11fb7f16-0560-4aee-ab88-ed75a850cfc4" },
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
        text: { content: "Caption before images. fr-", link: null },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default",
        },
        plain_text: "Caption before images.\nfr ",
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
        plain_text: "\nES  ",
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
      {
        type: "text",
        text: { content: "\nCaption after images", link: null },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default",
        },
        plain_text: "\nCaption after images.",
        href: null,
      },
    ],
    type: "file",
    file: {
      url: kPrimaryImageUrl,
      expiry_time: "2022-07-26T16:35:44.029Z",
    },
  },
};

const kImageBlockWithTwoLocalizedImages = {
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
      url: kPrimaryImageUrl,
      expiry_time: "2022-07-26T00:19:09.096Z",
    },
  },
};
