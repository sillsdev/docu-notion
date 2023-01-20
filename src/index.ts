#!/usr/bin/env node

import { run } from "./run";

run();

// for plugins to import

export * as Log from "./log";
export * from "./config/configuration";
