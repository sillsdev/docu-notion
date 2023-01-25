#!/usr/bin/env node

import { run } from "./run";

run();

// for plugins to import

export * as Log from "./log";
export * from "./types";
export * from "./config/configuration";
export * from "./plugins/pluginTypes";
import type { IDocuNotionConfig } from "./config/configuration";
export type { IDocuNotionConfig };
