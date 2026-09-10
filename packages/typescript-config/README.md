# typescript-config

## Purpose

Shared base `tsconfig.json` fragments other workspace packages extend from,
so compiler strictness stays consistent across the repo instead of drifting
per-package. Not a place for app-specific or package-specific compiler
options — those belong in the consuming package's own `tsconfig.json`.

## Conventions

Two files, deliberately: `base.json` (plain TS/Node-target libraries, e.g.
`packages/schemas`) and `nextjs.json` (extends `base.json`, adds the
Next.js-specific compiler options `apps/web` needs). Don't add a third
variant until a third genuinely different consumer shape shows up —
matches the same YAGNI reasoning that kept `packages/ui` out of this repo
until there's a second frontend app.

## Code Style & Acceptance Criteria

Plain JSON, no source code to lint. Keep both files valid, minimal JSON —
no comments (JSON doesn't support them; explain a non-obvious option choice
here in prose instead of inline).

## Testing Requirement

None applicable directly. A broken config here surfaces as a consuming
package's own `typecheck` failing, which *is* covered by that package's CI
job — that's the real test of this package.

## Key Entry Points

- `base.json`
- `nextjs.json`
