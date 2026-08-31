/**
 * Mask secret-like values for safe terminal / CI output.
 * Reveals at most the last 2 characters; shorter values are fully asterisks.
 */
export function maskValue(value: string): string {
  if (value.length === 0) {
    return "(empty)";
  }
  if (value.length <= 2) {
    return "*".repeat(value.length);
  }
  const visible = Math.min(2, value.length);
  const hidden = value.length - visible;
  return "*".repeat(hidden) + value.slice(-visible);
}

/** Known unsafe placeholder / default secrets (case-insensitive). */
export const UNSAFE_DEFAULTS = new Set([
  "changeme",
  "password",
  "secret",
  "changeme!",
  "password123",
  "secret123",
  "default",
  "todo",
  "replace_me",
  "your_secret_here",
]);

export function isUnsafeDefault(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return UNSAFE_DEFAULTS.has(normalized);
}
