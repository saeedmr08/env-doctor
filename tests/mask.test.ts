import { describe, expect, it } from "vitest";
import { isUnsafeDefault, maskValue } from "../src/mask.js";

describe("maskValue", () => {
  it("labels empty strings without revealing content", () => {
    expect(maskValue("")).toBe("(empty)");
  });

  it("fully masks values of length 1–2", () => {
    expect(maskValue("a")).toBe("*");
    expect(maskValue("ab")).toBe("**");
  });

  it("reveals at most the last two characters", () => {
    expect(maskValue("abc")).toBe("*bc");
    expect(maskValue("supersecret")).toBe("*********et");
    expect(maskValue("xy")).toBe("**");
  });

  it("never returns the full original secret for long values", () => {
    const secret = "correct-horse-battery-staple";
    const masked = maskValue(secret);
    expect(masked).not.toBe(secret);
    expect(masked.endsWith("le")).toBe(true);
    expect(masked.startsWith("*")).toBe(true);
  });
});

describe("isUnsafeDefault", () => {
  it("flags common placeholders case-insensitively", () => {
    expect(isUnsafeDefault("changeme")).toBe(true);
    expect(isUnsafeDefault("PASSWORD")).toBe(true);
    expect(isUnsafeDefault(" Secret ")).toBe(true);
  });

  it("allows strong-looking values", () => {
    expect(isUnsafeDefault("v3ry-un1que-tok3n")).toBe(false);
  });
});
