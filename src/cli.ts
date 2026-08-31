import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { generateEnvExample } from "./generate-example.js";
import { parseDotEnv } from "./parse-dotenv.js";
import { formatReport } from "./report.js";
import { parseEnvSchema } from "./schema.js";
import { validateEnv } from "./validate.js";

export type CliArgs = {
  command: "check" | "example" | "help";
  schemaPath?: string;
  outPath?: string;
  /** Path to a .env file to validate instead of process.env. */
  envPath?: string;
  /** When set, use this map instead of process.env (tests / dry-runs). */
  envOverride?: Record<string, string | undefined>;
};

export function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    return { command: "help" };
  }

  const command = args[0];
  if (command !== "check" && command !== "example") {
    throw new Error(`Unknown command "${command}". Use check, example, or --help.`);
  }

  let schemaPath: string | undefined;
  let outPath: string | undefined;
  let envPath: string | undefined;

  for (let i = 1; i < args.length; i++) {
    const token = args[i];
    if (token === "--schema" || token === "-s") {
      schemaPath = args[++i];
      if (!schemaPath) {
        throw new Error(`${token} requires a path`);
      }
      continue;
    }
    if (token === "--out" || token === "-o") {
      outPath = args[++i];
      if (!outPath) {
        throw new Error(`${token} requires a path`);
      }
      continue;
    }
    if (token === "--env" || token === "-e") {
      envPath = args[++i];
      if (!envPath) {
        throw new Error(`${token} requires a path`);
      }
      continue;
    }
    throw new Error(`Unknown option "${token}"`);
  }

  if (!schemaPath) {
    throw new Error("Missing required --schema <path>");
  }

  return { command, schemaPath, outPath, envPath };
}

function loadSchema(schemaPath: string) {
  const absolute = resolve(schemaPath);
  const raw = JSON.parse(readFileSync(absolute, "utf8")) as unknown;
  return parseEnvSchema(raw);
}

function loadEnvFile(envPath: string): Record<string, string> {
  const absolute = resolve(envPath);
  const content = readFileSync(absolute, "utf8");
  return parseDotEnv(content);
}

export function printHelp(): string {
  return `EnvDoctor — validate env vars safely (secrets always masked)

Usage:
  envdoctor check   --schema <path> [--env <file>]
  envdoctor example --schema <path> [--out .env.example]

  # Without a built dist/ (dev):
  npx tsx src/cli.ts check --schema schemas/sample.schema.json --env fixtures/bad.env

  # After npm run build:
  node dist/cli.js check --schema schemas/sample.schema.json --env fixtures/good.env

Commands:
  check     Validate env against the schema (exit 1 on failure)
  example   Write a .env.example with schema keys only (no values)

Options:
  -s, --schema   Path to EnvDoctor JSON schema
  -e, --env      Path to a .env file (default: process.env)
  -o, --out      Output path for example (default: .env.example)
  -h, --help     Show this help

Exit codes:
  0  success
  1  validation failure or CLI error

Fixtures:
  fixtures/bad.env   intentionally FAILS (unsafe SESSION_SECRET)
  fixtures/good.env  PASSES sample schema
`;
}

/**
 * Run the CLI. Returns an exit code; does not call process.exit itself
 * so unit tests can assert behavior.
 */
export function runCli(
  args: CliArgs,
  env: Record<string, string | undefined> = process.env,
  write: (path: string, body: string) => void = writeFileSync,
  log: (line: string) => void = console.log,
  err: (line: string) => void = console.error,
): number {
  if (args.command === "help") {
    log(printHelp());
    return 0;
  }

  if (!args.schemaPath) {
    err("Missing --schema");
    return 1;
  }

  try {
    const schema = loadSchema(args.schemaPath);

    if (args.command === "example") {
      const body = generateEnvExample(schema);
      const out = resolve(args.outPath ?? ".env.example");
      write(out, body);
      log(`Wrote ${out} (${Object.keys(schema).length} keys, no values)`);
      return 0;
    }

    let source: Record<string, string | undefined> = args.envOverride ?? env;
    if (args.envPath && !args.envOverride) {
      source = loadEnvFile(args.envPath);
    }

    const result = validateEnv(schema, source);
    const report = formatReport(result);
    if (result.ok) {
      log(report);
      return 0;
    }
    err(report);
    return 1;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    err(`EnvDoctor error: ${message}`);
    return 1;
  }
}

/** Allow `node dist/cli.js` / `npx tsx src/cli.ts` as a direct entrypoint. */
function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(resolve(entry)).href;
  } catch {
    return false;
  }
}

if (isMainModule()) {
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
}
