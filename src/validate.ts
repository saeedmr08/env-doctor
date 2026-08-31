import { isUnsafeDefault, maskValue } from "./mask.js";
import type { EnvField, EnvSchema } from "./schema.js";

export type FindingSeverity = "error" | "warning";

export type Finding = {
  key: string;
  severity: FindingSeverity;
  code:
    | "missing"
    | "empty"
    | "unsafe_default"
    | "invalid_url"
    | "invalid_enum"
    | "min_length";
  message: string;
  /** Masked snapshot of the value when present — never the raw secret. */
  masked?: string;
};

export type ValidationResult = {
  ok: boolean;
  findings: Finding[];
  checkedKeys: string[];
};

function isMissing(env: Record<string, string | undefined>, key: string): boolean {
  return env[key] === undefined;
}

function isEmpty(value: string): boolean {
  return value.trim().length === 0;
}

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function checkField(
  key: string,
  field: EnvField,
  env: Record<string, string | undefined>,
): Finding[] {
  const findings: Finding[] = [];

  if (isMissing(env, key)) {
    if (field.required) {
      findings.push({
        key,
        severity: "error",
        code: "missing",
        message: `Required variable "${key}" is missing`,
      });
    }
    return findings;
  }

  const value = env[key] as string;

  if (isEmpty(value)) {
    findings.push({
      key,
      severity: "error",
      code: "empty",
      message: `Variable "${key}" is set but empty`,
      masked: maskValue(""),
    });
    return findings;
  }

  const masked = maskValue(value);

  if (isUnsafeDefault(value)) {
    findings.push({
      key,
      severity: "error",
      code: "unsafe_default",
      message: `Variable "${key}" uses an unsafe default / placeholder value`,
      masked,
    });
  }

  if (field.kind === "url" && !isValidUrl(value)) {
    findings.push({
      key,
      severity: "error",
      code: "invalid_url",
      message: `Variable "${key}" must be a valid http(s) URL`,
      masked,
    });
  }

  if (field.kind === "enum" && field.enum && !field.enum.includes(value)) {
    findings.push({
      key,
      severity: "error",
      code: "invalid_enum",
      message: `Variable "${key}" must be one of: ${field.enum.join(", ")}`,
      masked,
    });
  }

  if (field.minLength !== undefined && value.length < field.minLength) {
    findings.push({
      key,
      severity: "error",
      code: "min_length",
      message: `Variable "${key}" must be at least ${field.minLength} characters (got length ${value.length})`,
      masked,
    });
  }

  return findings;
}

/**
 * Validate a synthetic or real env map against an EnvDoctor schema.
 * Raw values are never included in findings — only masked previews.
 */
export function validateEnv(
  schema: EnvSchema,
  env: Record<string, string | undefined>,
): ValidationResult {
  const findings: Finding[] = [];
  const checkedKeys = Object.keys(schema).sort();

  for (const key of checkedKeys) {
    findings.push(...checkField(key, schema[key], env));
  }

  const ok = findings.every((f) => f.severity !== "error");
  return { ok, findings, checkedKeys };
}
