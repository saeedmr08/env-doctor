#!/usr/bin/env node
import { parseArgs, runCli } from "./cli.js";

let exitCode = 1;
try {
  const args = parseArgs(process.argv);
  exitCode = runCli(args);
} catch (e) {
  const message = e instanceof Error ? e.message : String(e);
  console.error(`EnvDoctor error: ${message}`);
  exitCode = 1;
}

process.exit(exitCode);
