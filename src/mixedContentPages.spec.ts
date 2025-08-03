import { NotionPage } from "./NotionPage";
import { HierarchicalNamedLayoutStrategy } from "./HierarchicalNamedLayoutStrategy";
import { IDocuNotionConfig } from "./config/configuration";

describe("Mixed Content Pages Feature", () => {
  let layoutStrategy: HierarchicalNamedLayoutStrategy;
  let mockPage: NotionPage;
  let config: IDocuNotionConfig;

  beforeEach(() => {
    layoutStrategy = new HierarchicalNamedLayoutStrategy();
    layoutStrategy.setRootDirectoryForMarkdown("/test/docs");

    // Create a mock page
    mockPage = new NotionPage({
      layoutContext: "api",
      pageId: "test-page-id",
      order: 1,
      metadata: {
        object: "page",
        id: "test-page-id",
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-id" },
        last_edited_by: { object: "user", id: "user-id" },
        cover: null,
        icon: null,
        parent: { type: "page_id", page_id: "parent-id" },
        archived: false,
        properties: {
          title: {
            id: "title",
            type: "title",
            title: [
              {
                type: "text",
                text: { content: "API Documentation", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default"
                },
                plain_text: "API Documentation",
                href: null
              }
            ]
          }
        },
        url: "https://www.notion.so/test-page-id"
      } as any,
      foundDirectlyInOutline: true
    });

    config = {
      plugins: [],
      allowMixedContentPages: false
    };
  });

  describe("Configuration", () => {
    it("should have allowMixedContentPages option in config type", () => {
      const configWithMixed: IDocuNotionConfig = {
        plugins: [],
        allowMixedContentPages: true
      };
      expect(configWithMixed.allowMixedContentPages).toBe(true);
    });

    it("should default to false", () => {
      expect(config.allowMixedContentPages).toBe(false);
    });
  });

  describe("NotionPage", () => {
    it("should have hasMixedContent property defaulting to false", () => {
      expect(mockPage.hasMixedContent).toBe(false);
    });

    it("should allow setting hasMixedContent to true", () => {
      mockPage.hasMixedContent = true;
      expect(mockPage.hasMixedContent).toBe(true);
    });
  });

  describe("HierarchicalNamedLayoutStrategy", () => {
    it("should generate regular path for normal pages", () => {
      const path = layoutStrategy.getPathForPage(mockPage, ".md");
      expect(path).toBe("/test/docs/api/API-Documentation.md");
    });

    it("should generate index path for mixed content pages", () => {
      const indexPath = layoutStrategy.getIndexPathForPage(mockPage, ".md");
      expect(indexPath).toBe("/test/docs/api/index.md");
    });

    it("should handle different file extensions", () => {
      const htmlPath = layoutStrategy.getIndexPathForPage(mockPage, ".html");
      expect(htmlPath).toBe("/test/docs/api/index.html");
    });

    it("should handle root context correctly", () => {
      mockPage.layoutContext = "";
      const indexPath = layoutStrategy.getIndexPathForPage(mockPage, ".md");
      expect(indexPath).toBe("/test/docs/index.md");
    });
  });

  describe("Integration", () => {
    it("should create index.md when page has mixed content", () => {
      // Simulate a page that would be marked as mixed content
      mockPage.hasMixedContent = true;
      
      // Test that the index path is generated correctly
      const indexPath = layoutStrategy.getIndexPathForPage(mockPage, ".md");
      expect(indexPath).toContain("index.md");
      expect(indexPath).toBe("/test/docs/api/index.md");
    });

    it("should maintain regular behavior for non-mixed pages", () => {
      // Page without mixed content should use regular path
      expect(mockPage.hasMixedContent).toBe(false);
      
      const regularPath = layoutStrategy.getPathForPage(mockPage, ".md");
      expect(regularPath).toContain("API-Documentation.md");
      expect(regularPath).not.toContain("index.md");
    });
  });

  describe("Edge Cases", () => {
    it("should handle complex layout contexts", () => {
      mockPage.layoutContext = "api/v1/endpoints";
      const indexPath = layoutStrategy.getIndexPathForPage(mockPage, ".md");
      expect(indexPath).toBe("/test/docs/api/v1/endpoints/index.md");
    });

    it("should handle empty layout context", () => {
      mockPage.layoutContext = "";
      const indexPath = layoutStrategy.getIndexPathForPage(mockPage, ".md");
      expect(indexPath).toBe("/test/docs/index.md");
    });

    it("should handle layout context with leading/trailing slashes", () => {
      mockPage.layoutContext = "/api/";
      const indexPath = layoutStrategy.getIndexPathForPage(mockPage, ".md");
      expect(indexPath).toBe("/test/docs/api/index.md");
    });
  });
});