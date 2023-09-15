import {
  hashOfString,
  makeImagePersistencePlan,
} from "./MakeImagePersistencePlan";
import { ImageSet } from "./images";

test("primary file with explicit file output path and prefix", () => {
  const imageSet: ImageSet = {
    primaryUrl: "https://s3.us-west-2.amazonaws.com/primaryImage?Blah=foo",
    localizedUrls: [],
    pathToParentDocument: "/pathToParentSomewhere/",
    fileType: { ext: "png", mime: "image/png" },
  };
  makeImagePersistencePlan(imageSet, "./static/notion_imgs", "/notion_imgs");
  const expectedHash = hashOfString(
    "https://s3.us-west-2.amazonaws.com/primaryImage"
  );
  expect(imageSet.outputFileName).toBe(`${expectedHash}.png`);
  expect(imageSet.primaryFileOutputPath).toBe(
    `static/notion_imgs/${expectedHash}.png`
  );
  expect(imageSet.filePathToUseInMarkdown).toBe(
    `/notion_imgs/${expectedHash}.png`
  );
});
test("primary file with defaults for image output path and prefix", () => {
  const imageSet: ImageSet = {
    primaryUrl: "https://s3.us-west-2.amazonaws.com/primaryImage?Blah=foo",
    localizedUrls: [],
    pathToParentDocument: "/pathToParentSomewhere/",
    fileType: { ext: "png", mime: "image/png" },
  };
  makeImagePersistencePlan(imageSet, "", "");
  const expectedHash = hashOfString(
    "https://s3.us-west-2.amazonaws.com/primaryImage"
  );
  expect(imageSet.outputFileName).toBe(`${expectedHash}.png`);

  // the default behavior is to put the image next to the markdown file
  expect(imageSet.primaryFileOutputPath).toBe(
    `/pathToParentSomewhere/${expectedHash}.png`
  );
  expect(imageSet.filePathToUseInMarkdown).toBe(`./${expectedHash}.png`);
});

test("properly extract UUID from old-style notion image url", () => {
  const imageSet: ImageSet = {
    primaryUrl:
      "https://s3.us-west-2.amazonaws.com/secure.notion-static.com/e1058f46-4d2f-4292-8388-4ad393383439/Untitled.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAT73L2G45EIPT3X45%2F20220516%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20220516T233630Z&X-Amz-Expires=3600&X-Amz-Signature=f215704094fcc884d37073b0b108cf6d1c9da9b7d57a898da38bc30c30b4c4b5&X-Amz-SignedHeaders=host&x-id=GetObject",
    localizedUrls: [],
    fileType: { ext: "png", mime: "image/png" },
  };
  makeImagePersistencePlan(imageSet, "./static/notion_imgs", "/notion_imgs");
  const expectedHash = hashOfString("e1058f46-4d2f-4292-8388-4ad393383439");
  expect(imageSet.outputFileName).toBe(`${expectedHash}.png`);
});
test("properly extract UUID from new-style (Sept 2023) notion image url", () => {
  const imageSet: ImageSet = {
    primaryUrl:
      "https://prod-files-secure.s3.us-west-2.amazonaws.com/d9a2b712-cf69-4bd6-9d65-87a4ceeacca2/d1bcdc8c-b065-4e40-9a11-392aabeb220e/Untitled.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAT73L2G45EIPT3X45%2F20230915%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20230915T161258Z&X-Amz-Expires=3600&X-Amz-Signature=28fca48e65fba86d539c3c4b7676fce1fa0857aa194f7b33dd4a468ecca6ab24&X-Amz-SignedHeaders=host&x-id=GetObject",
    localizedUrls: [],
    fileType: { ext: "png", mime: "image/png" },
  };
  makeImagePersistencePlan(imageSet, "./static/notion_imgs", "/notion_imgs");
  const expectedHash = hashOfString("d1bcdc8c-b065-4e40-9a11-392aabeb220e");
  expect(imageSet.outputFileName).toBe(`${expectedHash}.png`);
});

// In order to make image fallback work with other languages, we have to have
// a file for each image, in each Docusaurus language directory. This is true
// whether we have a localized version of the image or not.
// The imageSet is initially populated with placeholders for each language.
// This test ensures that these placeholders are replaced with actual urls
// when localized versions of the image are listed.
// TODO write this test
