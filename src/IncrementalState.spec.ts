import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs-extra";
import * as path from "path";
import {
  loadIncrementalState,
  saveIncrementalState,
  canDoIncrementalPull,
  createIncrementalState,
  needsProcessing,
  updateIncrementalState,
  removeDeletedPagesFromState,
  IncrementalState,
} from "./IncrementalState";
import { NotionPage } from "./NotionPage";

const TEST_STATE_DIR = path.join(__dirname, "..", "test-state-tmp");
const TEST_STATE_FILE = path.join(TEST_STATE_DIR, "test-state.json");

describe("IncrementalState", () => {
  beforeEach(async () => {
    await fs.ensureDir(TEST_STATE_DIR);
  });

  afterEach(async () => {
    await fs.remove(TEST_STATE_DIR);
  });

  describe("loadIncrementalState", () => {
    it("should return null if file doesn't exist", async () => {
      const state = await loadIncrementalState(TEST_STATE_FILE);
      expect(state).toBeNull();
    });

    it("should load valid state file", async () => {
      const validState: IncrementalState = {
        version: "1.0",
        lastPullTimestamp: "2025-10-25T12:00:00.000Z",
        rootPageId: "test-root-id",
        statusTag: "Publish",
        markdownOutputPath: "./docs",
        pages: {
          "page-1": {
            lastEditedTime: "2025-10-25T11:00:00.000Z",
            slug: "/test-page",
            outputPath: "./docs/test-page.md",
            status: "Publish",
            parentId: "test-root-id",
            order: 0,
            archived: false,
            imageBlockIds: [],
          },
        },
        images: {},
        outlineStructure: {},
      };

      await saveIncrementalState(TEST_STATE_FILE, validState);
      const loadedState = await loadIncrementalState(TEST_STATE_FILE);

      expect(loadedState).not.toBeNull();
      expect(loadedState?.version).toBe("1.0");
      expect(loadedState?.rootPageId).toBe("test-root-id");
      expect(loadedState?.pages["page-1"]).toBeDefined();
    });

    it("should return null for invalid JSON", async () => {
      await fs.writeFile(TEST_STATE_FILE, "invalid json{", "utf-8");
      const state = await loadIncrementalState(TEST_STATE_FILE);
      expect(state).toBeNull();
    });

    it("should return null for missing required fields", async () => {
      const invalidState = {
        version: "1.0",
        // missing lastPullTimestamp
        rootPageId: "test-root-id",
      };
      await fs.writeFile(
        TEST_STATE_FILE,
        JSON.stringify(invalidState),
        "utf-8"
      );
      const state = await loadIncrementalState(TEST_STATE_FILE);
      expect(state).toBeNull();
    });

    it("should return null for wrong version", async () => {
      const wrongVersionState = {
        version: "2.0", // Future version
        lastPullTimestamp: "2025-10-25T12:00:00.000Z",
        rootPageId: "test-root-id",
        statusTag: "Publish",
        markdownOutputPath: "./docs",
        pages: {},
        images: {},
        outlineStructure: {},
      };
      await fs.writeFile(
        TEST_STATE_FILE,
        JSON.stringify(wrongVersionState),
        "utf-8"
      );
      const state = await loadIncrementalState(TEST_STATE_FILE);
      expect(state).toBeNull();
    });
  });

  describe("saveIncrementalState", () => {
    it("should save state atomically", async () => {
      const state: IncrementalState = {
        version: "1.0",
        lastPullTimestamp: "2025-10-25T12:00:00.000Z",
        rootPageId: "test-root-id",
        statusTag: "Publish",
        markdownOutputPath: "./docs",
        pages: {},
        images: {},
        outlineStructure: {},
      };

      await saveIncrementalState(TEST_STATE_FILE, state);

      expect(await fs.pathExists(TEST_STATE_FILE)).toBe(true);
      expect(await fs.pathExists(`${TEST_STATE_FILE}.tmp`)).toBe(false);

      const content = await fs.readFile(TEST_STATE_FILE, "utf-8");
      const parsed = JSON.parse(content);
      expect(parsed.version).toBe("1.0");
    });

    it("should overwrite existing state", async () => {
      const state1: IncrementalState = {
        version: "1.0",
        lastPullTimestamp: "2025-10-25T12:00:00.000Z",
        rootPageId: "old-root",
        statusTag: "Publish",
        markdownOutputPath: "./docs",
        pages: {},
        images: {},
        outlineStructure: {},
      };

      await saveIncrementalState(TEST_STATE_FILE, state1);

      const state2: IncrementalState = {
        ...state1,
        rootPageId: "new-root",
      };

      await saveIncrementalState(TEST_STATE_FILE, state2);

      const loaded = await loadIncrementalState(TEST_STATE_FILE);
      expect(loaded?.rootPageId).toBe("new-root");
    });
  });

  describe("canDoIncrementalPull", () => {
    const options = {
      rootPage: "test-root-id",
      statusTag: "Publish",
      markdownOutputPath: "./docs",
    };

    it("should return false if state is null", () => {
      expect(canDoIncrementalPull(null, options)).toBe(false);
    });

    it("should return true if configuration matches", () => {
      const state: IncrementalState = {
        version: "1.0",
        lastPullTimestamp: "2025-10-25T12:00:00.000Z",
        rootPageId: "test-root-id",
        statusTag: "Publish",
        markdownOutputPath: "./docs",
        pages: {},
        images: {},
        outlineStructure: {},
      };

      expect(canDoIncrementalPull(state, options)).toBe(true);
    });

    it("should return false if root page changed", () => {
      const state: IncrementalState = {
        version: "1.0",
        lastPullTimestamp: "2025-10-25T12:00:00.000Z",
        rootPageId: "different-root-id",
        statusTag: "Publish",
        markdownOutputPath: "./docs",
        pages: {},
        images: {},
        outlineStructure: {},
      };

      expect(canDoIncrementalPull(state, options)).toBe(false);
    });

    it("should return false if status tag changed", () => {
      const state: IncrementalState = {
        version: "1.0",
        lastPullTimestamp: "2025-10-25T12:00:00.000Z",
        rootPageId: "test-root-id",
        statusTag: "Draft",
        markdownOutputPath: "./docs",
        pages: {},
        images: {},
        outlineStructure: {},
      };

      expect(canDoIncrementalPull(state, options)).toBe(false);
    });

    it("should return false if markdown output path changed", () => {
      const state: IncrementalState = {
        version: "1.0",
        lastPullTimestamp: "2025-10-25T12:00:00.000Z",
        rootPageId: "test-root-id",
        statusTag: "Publish",
        markdownOutputPath: "./different-docs",
        pages: {},
        images: {},
        outlineStructure: {},
      };

      expect(canDoIncrementalPull(state, options)).toBe(false);
    });
  });

  describe("createIncrementalState", () => {
    it("should create state from pages", () => {
      const options = {
        rootPage: "test-root-id",
        statusTag: "Publish",
        markdownOutputPath: "./docs",
      };

      const mockPage: Partial<NotionPage> = {
        pageId: "page-1",
        slug: "/test-page",
        order: 0,
        status: "Publish",
        metadata: {
          object: "page",
          id: "page-1",
          last_edited_time: "2025-10-25T11:00:00.000Z",
          created_time: "2025-10-25T10:00:00.000Z",
          archived: false,
          parent: {
            type: "page_id",
            page_id: "test-root-id",
          },
        } as any,
      };

      const state = createIncrementalState(
        options,
        [mockPage as NotionPage],
        {},
        {}
      );

      expect(state.version).toBe("1.0");
      expect(state.rootPageId).toBe("test-root-id");
      expect(state.pages["page-1"]).toBeDefined();
      expect(state.pages["page-1"].slug).toBe("/test-page");
      expect(state.pages["page-1"].archived).toBe(false);
      expect(new Date(state.lastPullTimestamp)).toBeInstanceOf(Date);
    });
  });

  describe("needsProcessing", () => {
    const lastPullTime = new Date("2025-10-25T12:00:00.000Z");
    const state: IncrementalState = {
      version: "1.0",
      lastPullTimestamp: lastPullTime.toISOString(),
      rootPageId: "test-root-id",
      statusTag: "Publish",
      markdownOutputPath: "./docs",
      pages: {
        "page-1": {
          lastEditedTime: "2025-10-25T11:00:00.000Z",
          slug: "/test-page",
          outputPath: "./docs/test-page.md",
          status: "Publish",
          parentId: "test-root-id",
          order: 0,
          archived: false,
          imageBlockIds: [],
        },
      },
      images: {},
      outlineStructure: {},
    };

    it("should return true for new pages", () => {
      const newPage: Partial<NotionPage> = {
        pageId: "page-2",
        nameOrTitle: "New Page",
        slug: "/new-page",
        order: 1,
        status: "Publish",
        metadata: {
          last_edited_time: "2025-10-25T11:30:00.000Z",
          archived: false,
          parent: { type: "page_id", page_id: "test-root-id" },
        } as any,
      };

      expect(needsProcessing(newPage as NotionPage, state, lastPullTime)).toBe(
        true
      );
    });

    it("should return false for unchanged pages", () => {
      const unchangedPage: Partial<NotionPage> = {
        pageId: "page-1",
        nameOrTitle: "Test Page",
        slug: "/test-page",
        order: 0,
        status: "Publish",
        metadata: {
          last_edited_time: "2025-10-25T11:00:00.000Z", // Before lastPullTime
          archived: false,
          parent: { type: "page_id", page_id: "test-root-id" },
        } as any,
      };

      expect(
        needsProcessing(unchangedPage as NotionPage, state, lastPullTime)
      ).toBe(false);
    });

    it("should return true if page was modified after last pull", () => {
      const modifiedPage: Partial<NotionPage> = {
        pageId: "page-1",
        nameOrTitle: "Test Page",
        slug: "/test-page",
        order: 0,
        status: "Publish",
        metadata: {
          last_edited_time: "2025-10-25T13:00:00.000Z", // After lastPullTime
          archived: false,
          parent: { type: "page_id", page_id: "test-root-id" },
        } as any,
      };

      expect(
        needsProcessing(modifiedPage as NotionPage, state, lastPullTime)
      ).toBe(true);
    });

    it("should return true if slug changed", () => {
      const slugChangedPage: Partial<NotionPage> = {
        pageId: "page-1",
        nameOrTitle: "Test Page",
        slug: "/different-slug",
        order: 0,
        status: "Publish",
        metadata: {
          last_edited_time: "2025-10-25T11:00:00.000Z",
          archived: false,
          parent: { type: "page_id", page_id: "test-root-id" },
        } as any,
      };

      expect(
        needsProcessing(slugChangedPage as NotionPage, state, lastPullTime)
      ).toBe(true);
    });

    it("should return true if archived status changed", () => {
      const archivedPage: Partial<NotionPage> = {
        pageId: "page-1",
        nameOrTitle: "Test Page",
        slug: "/test-page",
        order: 0,
        status: "Publish",
        metadata: {
          last_edited_time: "2025-10-25T11:00:00.000Z",
          archived: true, // Changed to archived
          parent: { type: "page_id", page_id: "test-root-id" },
        } as any,
      };

      expect(
        needsProcessing(archivedPage as NotionPage, state, lastPullTime)
      ).toBe(true);
    });

    it("should return true if status changed", () => {
      const statusChangedPage: Partial<NotionPage> = {
        pageId: "page-1",
        nameOrTitle: "Test Page",
        slug: "/test-page",
        order: 0,
        status: "Draft", // Changed from "Publish"
        metadata: {
          last_edited_time: "2025-10-25T11:00:00.000Z",
          archived: false,
          parent: { type: "page_id", page_id: "test-root-id" },
        } as any,
      };

      expect(
        needsProcessing(statusChangedPage as NotionPage, state, lastPullTime)
      ).toBe(true);
    });

    it("should return true if order changed", () => {
      const orderChangedPage: Partial<NotionPage> = {
        pageId: "page-1",
        nameOrTitle: "Test Page",
        slug: "/test-page",
        order: 5, // Changed from 0
        status: "Publish",
        metadata: {
          last_edited_time: "2025-10-25T11:00:00.000Z",
          archived: false,
          parent: { type: "page_id", page_id: "test-root-id" },
        } as any,
      };

      expect(
        needsProcessing(orderChangedPage as NotionPage, state, lastPullTime)
      ).toBe(true);
    });
  });

  describe("updateIncrementalState", () => {
    it("should update state with processed pages", () => {
      const state: IncrementalState = {
        version: "1.0",
        lastPullTimestamp: "2025-10-25T12:00:00.000Z",
        rootPageId: "test-root-id",
        statusTag: "Publish",
        markdownOutputPath: "./docs",
        pages: {},
        images: {},
        outlineStructure: {},
      };

      const mockPage: Partial<NotionPage> = {
        pageId: "page-1",
        slug: "/test-page",
        order: 0,
        status: "Publish",
        metadata: {
          last_edited_time: "2025-10-25T13:00:00.000Z",
          archived: false,
          parent: { type: "page_id", page_id: "test-root-id" },
        } as any,
      };

      const outputPaths = new Map([["page-1", "./docs/test-page.md"]]);

      updateIncrementalState(state, [mockPage as NotionPage], outputPaths);

      expect(state.pages["page-1"]).toBeDefined();
      expect(state.pages["page-1"].outputPath).toBe("./docs/test-page.md");
      expect(new Date(state.lastPullTimestamp).getTime()).toBeGreaterThan(
        new Date("2025-10-25T12:00:00.000Z").getTime()
      );
    });
  });

  describe("removeDeletedPagesFromState", () => {
    it("should remove deleted pages from state", () => {
      const state: IncrementalState = {
        version: "1.0",
        lastPullTimestamp: "2025-10-25T12:00:00.000Z",
        rootPageId: "test-root-id",
        statusTag: "Publish",
        markdownOutputPath: "./docs",
        pages: {
          "page-1": {
            lastEditedTime: "2025-10-25T11:00:00.000Z",
            slug: "/test-page-1",
            outputPath: "./docs/test-page-1.md",
            status: "Publish",
            parentId: "test-root-id",
            order: 0,
            archived: false,
            imageBlockIds: [],
          },
          "page-2": {
            lastEditedTime: "2025-10-25T11:00:00.000Z",
            slug: "/test-page-2",
            outputPath: "./docs/test-page-2.md",
            status: "Publish",
            parentId: "test-root-id",
            order: 1,
            archived: false,
            imageBlockIds: [],
          },
        },
        images: {},
        outlineStructure: {
          "page-1": { children: [], links: [] },
          "page-2": { children: [], links: [] },
        },
      };

      removeDeletedPagesFromState(state, ["page-2"]);

      expect(state.pages["page-1"]).toBeDefined();
      expect(state.pages["page-2"]).toBeUndefined();
      expect(state.outlineStructure["page-2"]).toBeUndefined();
    });
  });
});
