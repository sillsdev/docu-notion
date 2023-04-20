import { IPlugin } from "./pluginTypes";
import { NotionPage } from "../NotionPage";

function getFrontmatter(page: NotionPage): string {
  let frontMatter = "";
  frontMatter += `title: ${page.nameOrTitle.replaceAll(":", "-")}\n`; // I have not found a way to escape colons
  frontMatter += `sidebar_position: ${page.order}\n`;
  frontMatter += `slug: ${page.slug ?? ""}\n`;
  if (page.keywords) frontMatter += `keywords: [${page.keywords}]\n`;

  return frontMatter;
}

export const standardFrontmatterTransformer: IPlugin = {
  name: "standardFrontmatterTransformer",

  frontMatterTransform: {
    build: getFrontmatter,
  },
};
