import { makeImagePersistencePlan } from "./MakeImagePersistencePlan";
import { ImageSet } from "./NotionImage";

test("primary file with explicit file output path and prefix", () => {
  const imageSet: ImageSet = {
    primaryUrl: "https://s3.us-west-2.amazonaws.com/primaryImage?Blah=foo",
    localizedUrls: [],
    pathToParentDocument: "/pathToParentSomewhere/",
    fileType: { ext: "png", mime: "image/png" },
  };
  makeImagePersistencePlan(imageSet, "./static/notion_imgs", "/notion_imgs");
  expect(imageSet.outputFileName).toBe("463556435.png");
  expect(imageSet.primaryFileOutputPath).toBe(
    "static/notion_imgs/463556435.png"
  );
  expect(imageSet.filePathToUseInMarkdown).toBe("/notion_imgs/463556435.png");
});
test("primary file with defaults for image output path and prefix", () => {
  const imageSet: ImageSet = {
    primaryUrl: "https://s3.us-west-2.amazonaws.com/primaryImage?Blah=foo",
    localizedUrls: [],
    pathToParentDocument: "/pathToParentSomewhere/",
    fileType: { ext: "png", mime: "image/png" },
  };
  makeImagePersistencePlan(imageSet, "", "");
  expect(imageSet.outputFileName).toBe("463556435.png");

  // the default behavior is to put the image next to the markdown file
  expect(imageSet.primaryFileOutputPath).toBe(
    "/pathToParentSomewhere/463556435.png"
  );
  expect(imageSet.filePathToUseInMarkdown).toBe("./463556435.png");
});
