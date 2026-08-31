#!/usr/bin/env node
/**
 * Thin bin shim: prefers compiled dist, falls back to tsx for local dev.
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distEntry = join(root, "dist", "index.js");

if (existsSync(distEntry)) {
  await import(pathToFileURL(distEntry).href);
} else {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", join(root, "src", "index.ts"), ...process.argv.slice(2)],
    { stdio: "inherit" },
  );
  process.exit(result.status ?? 1);
}
