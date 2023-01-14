import { blocksToMarkdown } from "../TestRun";
import { standardHeadingTransformer } from "./HeadingTransformer";

let blocks: any[];
beforeEach(() => {
  blocks = [
    {
      object: "block",
      id: "86f746f4-1c79-4ba1-a2f6-a1d59c2f9d23",
      parent: {
        type: "page_id",
        page_id: "cc889947-9d05-433f-bf81-012c6808a983",
      },
      created_time: "2023-01-12T21:35:00.000Z",
      last_edited_time: "2023-01-12T21:38:00.000Z",
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
      type: "heading_1",
      heading_1: {
        rich_text: [
          {
            type: "text",
            text: { content: "Heading One", link: null },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "Heading One",
            href: null,
          },
        ],
        is_toggleable: false,
        color: "default",
      },
    },
    {
      object: "block",
      id: "33a17041-bacd-4d94-a50d-9f1359e00690",
      parent: {
        type: "page_id",
        page_id: "cc889947-9d05-433f-bf81-012c6808a983",
      },
      created_time: "2023-01-12T21:35:00.000Z",
      last_edited_time: "2023-01-12T21:38:00.000Z",
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
      type: "heading_2",
      heading_2: {
        rich_text: [
          {
            type: "text",
            text: { content: "Heading Two", link: null },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "Heading Two",
            href: null,
          },
        ],
        is_toggleable: false,
        color: "default",
      },
    },
    {
      object: "block",
      id: "35954f5e-68c8-49ff-bbb0-c2540e9ba2d7",
      parent: {
        type: "page_id",
        page_id: "cc889947-9d05-433f-bf81-012c6808a983",
      },
      created_time: "2023-01-12T21:35:00.000Z",
      last_edited_time: "2023-01-12T21:38:00.000Z",
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
      type: "heading_3",
      heading_3: {
        rich_text: [
          {
            type: "text",
            text: { content: "Heading Three", link: null },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "Heading Three",
            href: null,
          },
        ],
        is_toggleable: false,
        color: "default",
      },
    },
    {
      object: "block",
      id: "699cb2f4-76f9-4d7a-9ab0-b3de97016b34",
      parent: {
        type: "page_id",
        page_id: "cc889947-9d05-433f-bf81-012c6808a983",
      },
      created_time: "2023-01-12T21:38:00.000Z",
      last_edited_time: "2023-01-12T21:38:00.000Z",
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
      type: "paragraph",
      paragraph: { rich_text: [], color: "default" },
    },
    {
      object: "block",
      id: "71afc2b9-d13a-48e1-8469-1b972d103386",
      parent: {
        type: "page_id",
        page_id: "cc889947-9d05-433f-bf81-012c6808a983",
      },
      created_time: "2023-01-12T21:38:00.000Z",
      last_edited_time: "2023-01-12T21:38:00.000Z",
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
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: {
              content: "Link to that first heading",
              link: {
                url: "/cc8899479d05433fbf81012c6808a983#86f746f41c794ba1a2f6a1d59c2f9d23",
              },
            },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "Link to that first heading",
            href: "/cc8899479d05433fbf81012c6808a983#86f746f41c794ba1a2f6a1d59c2f9d23",
          },
        ],
        color: "default",
      },
    },
    {
      object: "block",
      id: "72fb739e-7fd9-42d9-abda-1d3de3fe2a38",
      parent: {
        type: "page_id",
        page_id: "cc889947-9d05-433f-bf81-012c6808a983",
      },
      created_time: "2023-01-12T21:38:00.000Z",
      last_edited_time: "2023-01-12T21:38:00.000Z",
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
      type: "paragraph",
      paragraph: { rich_text: [], color: "default" },
    },
  ];
});
