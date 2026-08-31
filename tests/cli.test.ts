import { describe, expect, it } from "vitest";
import { parseArgs, runCli } from "../src/cli.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = join(root, "schemas", "sample.schema.json");

describe("parseArgs", () => {
  it("parses check with schema and env file", () => {
    expect(
      parseArgs([
        "node",
        "envdoctor",
        "check",
        "--schema",
        "s.json",
        "--env",
        "fixtures/bad.env",
      ]),
    ).toEqual({
      command: "check",
      schemaPath: "s.json",
      outPath: undefined,
      envPath: "fixtures/bad.env",
    });
  });

  it("returns help for --help", () => {
    expect(parseArgs(["node", "envdoctor", "--help"]).command).toBe("help");
  });
});

describe("runCli", () => {
  it("exits 1 when required vars are missing", () => {
    const logs: string[] = [];
    const code = runCli(
      { command: "check", schemaPath },
      {},
      () => {},
      (l) => logs.push(l),
      (l) => logs.push(l),
    );
    expect(code).toBe(1);
  });

  it("exits 0 when synthetic env satisfies sample schema", () => {
    const logs: string[] = [];
    const code = runCli(
      {
        command: "check",
        schemaPath,
        envOverride: {
          DATABASE_URL: "https://db.example.internal/app",
          API_BASE_URL: "https://api.example.com",
          NODE_ENV: "test",
          SESSION_SECRET: "abcdefghijklmnopqrstuvwxyz",
          LOG_LEVEL: "debug",
          APP_NAME: "EnvDoctorDemo",
        },
      },
      {},
      () => {},
      (l) => logs.push(l),
      (l) => logs.push(l),
    );
    expect(code).toBe(0);
    expect(logs.join("\n")).toMatch(/PASS/);
  });

  it("fails fixtures/bad.env and passes fixtures/good.env", () => {
    const badLogs: string[] = [];
    const badCode = runCli(
      {
        command: "check",
        schemaPath,
        envPath: join(root, "fixtures", "bad.env"),
      },
      {},
      () => {},
      (l) => badLogs.push(l),
      (l) => badLogs.push(l),
    );
    expect(badCode).toBe(1);
    expect(badLogs.join("\n")).toMatch(/FAIL|unsafe_default/);

    const goodLogs: string[] = [];
    const goodCode = runCli(
      {
        command: "check",
        schemaPath,
        envPath: join(root, "fixtures", "good.env"),
      },
      {},
      () => {},
      (l) => goodLogs.push(l),
      (l) => goodLogs.push(l),
    );
    expect(goodCode).toBe(0);
    expect(goodLogs.join("\n")).toMatch(/PASS/);
  });

  it("writes example file without values", () => {
    const written: Record<string, string> = {};
    const code = runCli(
      { command: "example", schemaPath, outPath: "/tmp/envdoctor-example.env" },
      {},
      (path, body) => {
        written[path] = body;
      },
      () => {},
      () => {},
    );
    expect(code).toBe(0);
    const out = written[resolve("/tmp/envdoctor-example.env")];
    expect(out).toContain("DATABASE_URL=");
    expect(out).not.toMatch(/DATABASE_URL=.+/);
  });
});
