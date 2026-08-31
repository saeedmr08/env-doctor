# EnvDoctor

CLI that **validates environment variables against a JSON schema**, flags missing/empty/unsafe defaults, and generates `.env.example` files — without ever printing secret values in full.

Built by **Saeed Rumaneh** as an original portfolio project (MIT, 2026). CLI-only — no Next.js.

## Problem

Misconfigured env vars are a common source of production incidents: missing keys, empty strings, placeholder secrets like `changeme`, and invalid URLs. Teams need a **CI-friendly** check that fails loudly while keeping secrets out of logs.

## Features

- Schema-driven rules: `required`, `url`, `enum`, `minLength`
- Detects missing vars, empty strings, and unsafe defaults (`changeme`, `password`, `secret`, …)
- Masks values in all output (at most last 2 characters visible)
- Generates `.env.example` from schema keys only (no values)
- `--env` file support for fixtures / CI
- Exit code `0` on success, `1` on failure

## Requirements

- Node.js 20+
- Dependencies: `zod`. Dev: `typescript`, `vitest`, `tsx`

## Install (once)

```bash
cd 27-env-doctor
npm install
```

## Exact commands

### Without a built `dist/` (preferred for quick demos)

```bash
# FAIL — unsafe SESSION_SECRET=changeme
npx tsx src/cli.ts check --schema schemas/sample.schema.json --env fixtures/bad.env

# PASS
npx tsx src/cli.ts check --schema schemas/sample.schema.json --env fixtures/good.env

# Help
npx tsx src/cli.ts --help
```

### After `npm run build`

```bash
npm run build

node dist/cli.js check --schema schemas/sample.schema.json --env fixtures/bad.env
node dist/cli.js check --schema schemas/sample.schema.json --env fixtures/good.env
```

### Package bin

```bash
npx envdoctor check --schema schemas/sample.schema.json --env fixtures/bad.env
# or after link: envdoctor check --schema schemas/sample.schema.json --env fixtures/good.env
```

### Generate `.env.example`

```bash
npx tsx src/cli.ts example --schema schemas/sample.schema.json --out .env.example
```

## Fixtures

| File | Expected |
|------|----------|
| [`fixtures/bad.env`](fixtures/bad.env) | **FAIL** — `SESSION_SECRET=changeme` (unsafe default) |
| [`fixtures/good.env`](fixtures/good.env) | **PASS** — satisfies [`schemas/sample.schema.json`](schemas/sample.schema.json) |

## Sample schema

```json
{
  "DATABASE_URL": { "required": true, "kind": "url" },
  "NODE_ENV": {
    "required": true,
    "kind": "enum",
    "enum": ["development", "test", "production"]
  },
  "SESSION_SECRET": { "required": true, "kind": "string", "minLength": 16 }
}
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm test` | Run Vitest suite |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Compile to `dist/` |

## Architecture

```
src/
  mask.ts              # Safe masking + unsafe-default list
  schema.ts            # Zod document schema for env definitions
  validate.ts          # Core validation against synthetic/real env maps
  parse-dotenv.ts      # Minimal .env loader (--env)
  generate-example.ts  # .env.example writer (keys only)
  report.ts            # Human-readable FAIL/PASS reports
  cli.ts               # Arg parsing + runCli (also direct entry: node dist/cli.js)
  index.ts             # process.exit entrypoint for bin
bin/envdoctor.js       # package bin shim (dist or tsx fallback)
fixtures/
  bad.env              # fails sample schema
  good.env             # passes sample schema
```

Validation never attaches raw secret strings to findings — only masked previews.

## Complete product flows

1. `npx tsx src/cli.ts check --schema schemas/sample.schema.json --env fixtures/bad.env` — FAIL (`SESSION_SECRET=changeme`).
2. `npx tsx src/cli.ts check --schema schemas/sample.schema.json --env fixtures/good.env` — PASS.
3. `npx tsx src/cli.ts example --schema schemas/sample.schema.json --out .env.example` — writes keys-only example.

## Security notes

- Do not pipe real production secrets into shared CI logs without masking (EnvDoctor masks by default).
- `.env` is gitignored; fixtures under `fixtures/` are intentional demo values only.
- This tool does not fetch remote secrets or modify your environment — it only reads and reports.

## License

MIT © 2026 Saeed Rumaneh
