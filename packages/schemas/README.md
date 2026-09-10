# schemas

## Purpose

The single canonical cross-language API contract between `apps/web` and
`services/generation-engine`.

- `design-brief.ts` — the Zod schema for the full wizard input. Used for
  **both** client-side form validation in `apps/web` and BFF-side request
  validation before forwarding to the generation engine. If a wizard field
  doesn't exist here, it doesn't exist anywhere else either — see
  `docs/prd/floor-plan-wizard.md`.
- `generation-response.ts` — a **hand-written** TypeScript mirror of the
  generation-engine's actual Pydantic response schema (see
  `docs/hld/generation-engine-contract.md`). Kept in sync manually for now
  via the `sync-api-contract` skill, until OpenAPI-based codegen replaces
  the hand-written file (see that skill's `SKILL.md` for the plan).

## Conventions

Zero framework dependencies beyond `zod`. This package must stay importable
from a Next.js app and, in principle, any future TypeScript consumer
(a mobile app, an admin tool) without pulling in React/Next-specific code.

## Code Style & Acceptance Criteria

Extends `@rumah3d/eslint-config` and `@rumah3d/typescript-config`. Every
exported schema or type must have at least one corresponding test asserting
both a valid and an invalid sample — a contract that isn't tested against a
bad payload isn't actually enforced.

## Testing Requirement

Vitest. A schema change without an updated/added test is not
acceptance-ready — see the non-negotiable testing rule in the root
`CLAUDE.md` §9. Since both `apps/web` and `services/generation-engine`
trust this package's shapes, a silent drift here is the highest-leverage
place in the repo for a bug to hide.

## Key Entry Points

- `src/design-brief.ts`
- `src/generation-response.ts`
- `src/index.ts`
