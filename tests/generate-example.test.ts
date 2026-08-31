import { describe, expect, it } from "vitest";
import { generateEnvExample } from "../src/generate-example.js";
import { parseEnvSchema } from "../src/schema.js";

describe("generateEnvExample", () => {
  it("emits keys only with empty assignments", () => {
    const schema = parseEnvSchema({
      API_KEY: { required: true, kind: "string", minLength: 8, description: "API token" },
      NODE_ENV: {
        required: true,
        kind: "enum",
        enum: ["development", "production"],
      },
    });

    const body = generateEnvExample(schema);
    expect(body).toContain("API_KEY=");
    expect(body).toContain("NODE_ENV=");
    expect(body).toMatch(/# API token/);
    expect(body).toMatch(/one of: development\|production/);
    // No accidental value after =
    expect(body).not.toMatch(/API_KEY=.+/);
    expect(body).not.toMatch(/NODE_ENV=.+/);
  });
});
