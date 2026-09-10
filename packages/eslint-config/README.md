# eslint-config

## Purpose

Shared flat ESLint config (`base.js`) for plain TypeScript packages in this
repo — currently just `packages/schemas`. **Not** used by `apps/web`, which
keeps its own Next.js-generated config (`apps/web/eslint.config.mjs`,
extending `eslint-config-next`) — that config has App Router– and
`next/image`/`next/link`-specific correctness rules this base config
doesn't (and shouldn't try to) replicate.

## Conventions

One flat-config array exported from `base.js`. Add a rule here only if it
should apply to *every* plain-TS package in the repo, not just the one that
happens to need it today — package-specific rules belong in that package's
own config, extending this one.

## Code Style & Acceptance Criteria

This file is itself real JS (ESM) — keep it syntactically simple and
directly readable; there's no meta-lint checking the linter config, so
review it by reading it.

## Testing Requirement

None applicable directly — verified indirectly by whether packages that
extend this config get a clean `pnpm lint`.

## Key Entry Points

- `base.js`
