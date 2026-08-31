import { describe, expect, it } from "vitest";
import { parseEnvSchema } from "../src/schema.js";
import { validateEnv } from "../src/validate.js";

const sampleSchema = parseEnvSchema({
  DATABASE_URL: { required: true, kind: "url" },
  NODE_ENV: {
    required: true,
    kind: "enum",
    enum: ["development", "test", "production"],
  },
  SESSION_SECRET: { required: true, kind: "string", minLength: 16 },
  LOG_LEVEL: {
    required: false,
    kind: "enum",
    enum: ["debug", "info", "warn", "error"],
  },
});

describe("validateEnv", () => {
  it("passes a healthy synthetic environment", () => {
    const result = validateEnv(sampleSchema, {
      DATABASE_URL: "https://db.example.internal/app",
      NODE_ENV: "test",
      SESSION_SECRET: "abcdefghijklmnopqrstuvwxyz",
      LOG_LEVEL: "info",
    });
    expect(result.ok).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it("reports missing required keys", () => {
    const result = validateEnv(sampleSchema, {
      NODE_ENV: "test",
      SESSION_SECRET: "abcdefghijklmnopqrstuvwxyz",
    });
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.code === "missing" && f.key === "DATABASE_URL")).toBe(
      true,
    );
  });

  it("reports empty strings", () => {
    const result = validateEnv(sampleSchema, {
      DATABASE_URL: "   ",
      NODE_ENV: "test",
      SESSION_SECRET: "abcdefghijklmnopqrstuvwxyz",
    });
    expect(result.ok).toBe(false);
    const empty = result.findings.find((f) => f.code === "empty");
    expect(empty?.masked).toBe("(empty)");
  });

  it("flags unsafe defaults without printing the raw value beyond the mask", () => {
    const result = validateEnv(sampleSchema, {
      DATABASE_URL: "https://db.example.internal/app",
      NODE_ENV: "production",
      SESSION_SECRET: "password",
    });
    expect(result.ok).toBe(false);
    const unsafe = result.findings.find((f) => f.code === "unsafe_default");
    expect(unsafe).toBeDefined();
    expect(unsafe?.masked).toBe("******rd");
    expect(JSON.stringify(result)).not.toMatch(/SESSION_SECRET":"password"/);
  });

  it("validates url and enum constraints", () => {
    const result = validateEnv(sampleSchema, {
      DATABASE_URL: "not-a-url",
      NODE_ENV: "staging",
      SESSION_SECRET: "abcdefghijklmnopqrstuvwxyz",
    });
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.code === "invalid_url")).toBe(true);
    expect(result.findings.some((f) => f.code === "invalid_enum")).toBe(true);
  });

  it("enforces minLength", () => {
    const result = validateEnv(sampleSchema, {
      DATABASE_URL: "https://db.example.internal/app",
      NODE_ENV: "test",
      SESSION_SECRET: "short",
    });
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.code === "min_length")).toBe(true);
  });

  it("allows optional keys to be absent", () => {
    const result = validateEnv(sampleSchema, {
      DATABASE_URL: "https://db.example.internal/app",
      NODE_ENV: "development",
      SESSION_SECRET: "abcdefghijklmnopqrstuvwxyz",
    });
    expect(result.ok).toBe(true);
  });

  it("never embeds raw secrets in finding messages for present values", () => {
    const secret = "top-secret-value-999";
    const result = validateEnv(sampleSchema, {
      DATABASE_URL: "https://db.example.internal/app",
      NODE_ENV: "test",
      // Too short → min_length finding includes a masked preview only
      SESSION_SECRET: secret.slice(0, 8),
    });
    const short = secret.slice(0, 8);
    const blob = JSON.stringify(result.findings);
    expect(blob).not.toContain(short);
    expect(blob).toContain(maskPreviewLast2(short));
  });
});

function maskPreviewLast2(value: string): string {
  return "*".repeat(value.length - 2) + value.slice(-2);
}
