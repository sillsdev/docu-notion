import { IPlugin } from "./pluginTypes";
import { NotionPage } from "../NotionPage";

function getFrontmatter(page: NotionPage): string {
  let frontmatter = "";
  frontmatter += `title: ${page.nameOrTitle.replaceAll(":", "-")}\n`; // I have not found a way to escape colons
  frontmatter += `sidebar_position: ${page.order}\n`;
  frontmatter += `slug: ${page.slug ?? ""}\n`;
  if (page.keywords) frontmatter += `keywords: [${page.keywords}]\n`;

  return frontmatter;
}

export const standardFrontmatterTransformer: IPlugin = {
  name: "standardFrontmatterTransformer",

  frontmatterTransform: {
    build: getFrontmatter,
  },
};
