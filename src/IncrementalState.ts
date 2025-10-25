import * as fs from "fs-extra";
import { info, verbose, warning, error as logError } from "./log";
import { NotionPage } from "./NotionPage";

export interface PageState {
  lastEditedTime: string; // ISO 8601 timestamp
  slug: string;
  outputPath: string;
  status: string;
  parentId: string;
  order: number;
  archived: boolean;
  imageBlockIds: string[];
}

export interface ImageState {
  outputPath: string;
  contentHash?: string;
  sourceUrl: string;
  lastProcessedTime: string;
}

export interface OutlineStructure {
  children: string[]; // Child page IDs in order
  links: string[]; // Linked page IDs in order
}

export interface IncrementalState {
  version: string;
  lastPullTimestamp: string; // ISO 8601 timestamp
  rootPageId: string;
  statusTag: string; // Track this in case it changes
  markdownOutputPath: string; // Track this in case it changes
  pages: {
    [pageId: string]: PageState;
  };
  images: {
    [blockId: string]: ImageState;
  };
  outlineStructure: {
    [pageId: string]: OutlineStructure;
  };
}

const STATE_VERSION = "1.0";

/**
 * Load existing incremental state from disk
 * Returns null if file doesn't exist or is invalid
 */
export async function loadIncrementalState(
  statePath: string
): Promise<IncrementalState | null> {
  try {
    if (!(await fs.pathExists(statePath))) {
      verbose(`State file not found at ${statePath}`);
      return null;
    }

    const content = await fs.readFile(statePath, "utf-8");
    const state = JSON.parse(content) as IncrementalState;

    // Validate state structure
    if (!validateState(state)) {
      warning(`State file at ${statePath} is invalid, will perform full pull`);
      return null;
    }

    info(`Loaded incremental state from ${statePath}`);
    verbose(
      `State contains ${Object.keys(state.pages).length} pages, ${
        Object.keys(state.images).length
      } images`
    );

    return state;
  } catch (e: any) {
    warning(
      `Failed to load state file: ${
        e.message as string
      }. Will perform full pull.`
    );
    return null;
  }
}

/**
 * Save incremental state to disk
 */
export async function saveIncrementalState(
  statePath: string,
  state: IncrementalState
): Promise<void> {
  try {
    // Use atomic write: write to temp file, then rename
    const tempPath = `${statePath}.tmp`;
    const content = JSON.stringify(state, null, 2);
    await fs.writeFile(tempPath, content, "utf-8");
    await fs.move(tempPath, statePath, { overwrite: true });
    info(`Saved incremental state to ${statePath}`);
  } catch (e: any) {
    logError(`Failed to save state file: ${e.message as string}`);
    throw e;
  }
}

/**
 * Validate that state has required fields and structure
 */
function validateState(state: any): state is IncrementalState {
  if (!state || typeof state !== "object") {
    return false;
  }

  // Check required top-level fields
  if (
    !state.version ||
    !state.lastPullTimestamp ||
    !state.rootPageId ||
    typeof state.pages !== "object" ||
    typeof state.images !== "object" ||
    typeof state.outlineStructure !== "object"
  ) {
    return false;
  }

  // Check version compatibility
  if (state.version !== STATE_VERSION) {
    warning(
      `State file version ${
        state.version as string
      } doesn't match current version ${STATE_VERSION}`
    );
    // Could implement migration logic here in the future
    return false;
  }

  // Validate timestamp format
  try {
    new Date(state.lastPullTimestamp);
  } catch {
    return false;
  }

  return true;
}

/**
 * Determine if we can perform an incremental pull
 */
export function canDoIncrementalPull(
  state: IncrementalState | null,
  options: {
    rootPage: string;
    statusTag: string;
    markdownOutputPath: string;
  }
): boolean {
  if (!state) {
    return false;
  }

  // Check if critical configuration changed
  if (state.rootPageId !== options.rootPage) {
    warning("Root page ID changed, cannot do incremental pull");
    return false;
  }

  if (state.statusTag !== options.statusTag) {
    warning("Status tag changed, cannot do incremental pull");
    return false;
  }

  if (state.markdownOutputPath !== options.markdownOutputPath) {
    warning("Markdown output path changed, cannot do incremental pull");
    return false;
  }

  return true;
}

/**
 * Create initial state from a completed full pull
 */
export function createIncrementalState(
  options: {
    rootPage: string;
    statusTag: string;
    markdownOutputPath: string;
  },
  pages: NotionPage[],
  outlineStructure: { [pageId: string]: OutlineStructure },
  images: { [blockId: string]: ImageState }
): IncrementalState {
  const state: IncrementalState = {
    version: STATE_VERSION,
    lastPullTimestamp: new Date().toISOString(),
    rootPageId: options.rootPage,
    statusTag: options.statusTag,
    markdownOutputPath: options.markdownOutputPath,
    pages: {},
    images: images || {},
    outlineStructure: outlineStructure || {},
  };

  // Populate page states
  for (const page of pages) {
    state.pages[page.pageId] = {
      lastEditedTime: (page.metadata as any).last_edited_time,
      slug: page.slug,
      outputPath: "", // Will be set during output
      status: page.status || "",
      parentId: getParentId(page),
      order: page.order,
      archived: (page.metadata as any).archived || false,
      imageBlockIds: [],
    };
  }

  return state;
}

/**
 * Update state after processing pages
 */
export function updateIncrementalState(
  state: IncrementalState,
  processedPages: NotionPage[],
  outputPaths: Map<string, string>
): void {
  state.lastPullTimestamp = new Date().toISOString();

  for (const page of processedPages) {
    const outputPath = outputPaths.get(page.pageId) || "";

    state.pages[page.pageId] = {
      lastEditedTime: (page.metadata as any).last_edited_time,
      slug: page.slug,
      outputPath: outputPath,
      status: page.status || "",
      parentId: getParentId(page),
      order: page.order,
      archived: (page.metadata as any).archived || false,
      imageBlockIds: state.pages[page.pageId]?.imageBlockIds || [],
    };
  }
}

/**
 * Remove deleted pages from state
 */
export function removeDeletedPagesFromState(
  state: IncrementalState,
  deletedPageIds: string[]
): void {
  for (const pageId of deletedPageIds) {
    delete state.pages[pageId];
    delete state.outlineStructure[pageId];
  }
}

/**
 * Helper to get parent ID from page metadata
 */
function getParentId(page: NotionPage): string {
  const parent = (page.metadata as any).parent;
  if (parent.type === "page_id") {
    return parent.page_id as string;
  } else if (parent.type === "database_id") {
    return parent.database_id as string;
  }
  return "";
}

/**
 * Check if a page needs processing based on state
 */
export function needsProcessing(
  page: NotionPage,
  state: IncrementalState,
  lastPullTime: Date
): boolean {
  const pageState = state.pages[page.pageId];

  // New page - needs processing
  if (!pageState) {
    verbose(`Page ${page.nameOrTitle} is new, needs processing`);
    return true;
  }

  // Page modified since last pull
  const lastEditedTime = new Date((page.metadata as any).last_edited_time);
  if (lastEditedTime > lastPullTime) {
    verbose(
      `Page ${
        page.nameOrTitle
      } was modified (${lastEditedTime.toISOString()} > ${lastPullTime.toISOString()}), needs processing`
    );
    return true;
  }

  // Page archived status changed
  const archived = (page.metadata as any).archived || false;
  if (archived !== pageState.archived) {
    verbose(
      `Page ${page.nameOrTitle} archive status changed, needs processing`
    );
    return true;
  }

  // Slug changed (affects file path)
  if (page.slug !== pageState.slug) {
    verbose(`Page ${page.nameOrTitle} slug changed, needs processing`);
    return true;
  }

  // Status changed (affects whether to publish)
  const status = page.status || "";
  if (status !== pageState.status) {
    verbose(`Page ${page.nameOrTitle} status changed, needs processing`);
    return true;
  }

  // Parent changed (affects structure)
  const parentId = getParentId(page);
  if (parentId !== pageState.parentId) {
    verbose(`Page ${page.nameOrTitle} parent changed, needs processing`);
    return true;
  }

  // Order changed (affects structure)
  if (page.order !== pageState.order) {
    verbose(`Page ${page.nameOrTitle} order changed, needs processing`);
    return true;
  }

  return false;
}
