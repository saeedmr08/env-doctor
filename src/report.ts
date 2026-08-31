import type { Finding, ValidationResult } from "./validate.js";

export function formatFinding(finding: Finding): string {
  const tag = finding.severity.toUpperCase();
  const masked =
    finding.masked !== undefined ? ` [masked=${finding.masked}]` : "";
  return `[${tag}] ${finding.code}: ${finding.message}${masked}`;
}

export function formatReport(result: ValidationResult): string {
  const header = result.ok
    ? `EnvDoctor: PASS (${result.checkedKeys.length} keys checked)`
    : `EnvDoctor: FAIL (${result.findings.filter((f) => f.severity === "error").length} error(s), ${result.checkedKeys.length} keys checked)`;

  if (result.findings.length === 0) {
    return header;
  }

  return [header, ...result.findings.map(formatFinding)].join("\n");
}
