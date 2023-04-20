import { GetPageResponse } from "@notionhq/client/build/src/api-endpoints";
import { NotionPage } from "../NotionPage";
import { standardFrontmatterTransformer } from "./FrontMatterTransformer";
import { IDocuNotionContext } from "..";

const getFrontMatter = standardFrontmatterTransformer.frontMatterGenerator
  ?.getFrontMatter as (context: IDocuNotionContext, page: NotionPage) => string;

const sampleMetadata: GetPageResponse = {
  object: "page",
  id: "6e6921b9-b1f5-4614-ab3c-bf1a73358a1f",
  created_time: "2023-04-11T10:17:00.000Z",
  last_edited_time: "2023-04-13T20:24:00.000Z",
  created_by: {
    object: "user",
    id: "USERID",
  },
  last_edited_by: {
    object: "user",
    id: "USERID",
  },
  cover: null,
  icon: {
    type: "file",
    file: {
      url: "https:/dummy_URL",
      expiry_time: "2023-04-15T11:50:20.461Z",
    },
  },
  parent: {
    type: "workspace",
    workspace: true,
  },
  archived: false,
  properties: {
    title: {
      id: "title",
      type: "title",
      title: [
        {
          type: "text",
          text: {
            content: "Foo",
            link: null,
          },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: "default",
          },
          plain_text: "Foo",
          href: null,
        },
        {
          type: "text",
          text: {
            content: "Bar",
            link: null,
          },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: "default",
          },
          plain_text: "Bar",
          href: null,
        },
      ],
    },
    Keywords: {
      id: "keywords",
      type: "rich_text",
      rich_text: [
        {
          type: "text",
          text: {
            content: "Foo, Bar",
            link: null,
          },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: "default",
          },
          plain_text: "Foo, Bar",
          href: null,
        },
      ],
    },
    date_property: {
      id: "a%3Cql",
      type: "date",
      date: {
        start: "2021-10-24",
        end: "2021-10-28",
        time_zone: null,
      },
    },
  },
  url: "https://www.notion.so/Site-docu-notion-PAGEID",
};

describe("getFrontMatter", () => {
  let page: NotionPage;

  beforeEach(() => {
    page = new NotionPage({
      layoutContext: "Test Context",
      pageId: "123",
      order: 1,
      metadata: JSON.parse(JSON.stringify(sampleMetadata)),
      foundDirectlyInOutline: true,
    });
  });

  it("should generate frontMatter with all available properties", () => {
    const expectedFrontmatter = `title: FooBar\nsidebar_position: 1\nslug: /123\nkeywords: [Foo, Bar]\n`;
    (page.metadata as any).properties.Keywords.rich_text[0].plain_text =
      "Foo, Bar";

    const result = getFrontMatter({} as IDocuNotionContext, page);

    expect(result).toEqual(expectedFrontmatter);
  });

  // "title: Foo-Barsidebar_position: 1slug: keywords: [Foo, Bar]"
  // "title: FooBar\nsidebar_position: 1\nslug: /123\n"
  it("should generate frontMatter with no keywords", () => {
    const expectedFrontmatter = `title: FooBar\nsidebar_position: 1\nslug: /123\n`;
    (page.metadata as any).properties.Keywords = undefined;

    const result = getFrontMatter({} as IDocuNotionContext, page);

    expect(result).toEqual(expectedFrontmatter);
  });

  it("should replace colons with dashes in the title", () => {
    const expectedFrontmatter = `title: FooBaz-\nsidebar_position: 1\nslug: /123\nkeywords: [Foo, Bar]\n`;
    (page.metadata as any).properties.title.title[1].plain_text = "Baz:";

    const result = getFrontMatter({} as IDocuNotionContext, page);

    expect(result).toEqual(expectedFrontmatter);
  });
});
