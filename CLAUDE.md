# CLAUDE.md

Instructions for any AI agent (Claude Code or otherwise) working in this repository.

## 1. Project Overview

Rumah3d helps Indonesian homeowners turn a plot of land and a room program
(bedrooms, bathrooms, floors, pool, style...) into a schematic 2D floor plan
(denah) and a matching 3D visualization. It is explicitly a **concept/schematic
design tool**, not a construction document — every generated design carries a
disclaimer to consult a licensed architect/engineer before building. See
[`docs/prd/README.md`](docs/prd/README.md) for the full product scope and
[`docs/adr/`](docs/adr/) for why the scope is drawn where it is.

Four decisions shape everything in this repo and should not be silently
re-litigated by a code change — if one of these needs to change, write a new
ADR first:
1. Concept/schematic output only, not construction-ready (DED).
2. Floor-plan generation is rule-based (curated templates + a constraint
   solver), not generative ML — it must be deterministic and explainable.
3. Architecture/space-planning scope only — no structural or MEP engineering.
4. 3D is visualization-only, generated client-side from the validated 2D
   plan — no CAD/BIM export.

## 2. Tech Stack Summary

Full stack and reasoning: [`docs/techstack.md`](docs/techstack.md). In short:
Next.js (TypeScript) frontend + BFF, a separate Python/FastAPI "generation
engine" service (Shapely + OR-Tools CP-SAT) for the actual layout algorithm,
Postgres (two logical schemas: `app` via Prisma, `engine` via Alembic),
Turborepo + pnpm + uv monorepo tooling. Every major choice has a dedicated
ADR in `docs/adr/` — link to it instead of re-explaining it.

## 3. Repo Map

```
apps/web/                    Next.js frontend + BFF (calls the engine over HTTP)
services/generation-engine/  Python/FastAPI floor-plan generation engine
packages/schemas/            Shared Zod schema + hand-written API response types
packages/eslint-config/      Shared flat ESLint config for plain TS packages
packages/typescript-config/  Shared tsconfig base
docs/{prd,adr,hld}/          Product requirements, architecture decisions, high-level design
.claude/skills/               Repo-specific Claude Code skills (see §11)
```

Each top-level folder above (and any subfolder whose conventions genuinely
differ from its parent) has its own `README.md` covering that folder's
purpose, conventions, code style, and testing requirement. Read the local
`README.md` before writing code in a folder you haven't touched before.

## 4. Domain Glossary

Indonesian building-code and residential-design terms used throughout the
code and docs — do not guess at these or translate them, they carry specific
regulatory/domain meaning:

- **Denah** — floor plan (2D).
- **KDB** (Koefisien Dasar Bangunan) — building coverage ratio: max
  ground-floor footprint as a % of lot area.
- **KLB** (Koefisien Lantai Bangunan) — floor area ratio: max cumulative
  floor area across *all* floors as a % of lot area. Distinct from KDB —
  never conflate the two checks.
- **GSB** (Garis Sempadan Bangunan) — the setback line; minimum distance
  from a lot boundary a building must respect (front/back/side, and they
  commonly differ per side).
- **PBG** (Persetujuan Bangunan Gedung, formerly IMB) — the Indonesian
  building permit; requires drawings responsibility-stamped by a licensed
  architect/engineer. This product deliberately stays out of that scope
  (see ADR-0002).
- **Dapur kotor / dapur bersih** — "dirty"/service kitchen vs. "clean"/show
  kitchen, a common room-program distinction in Indonesian houses.
- **Kamar pembantu** — live-in domestic helper's room, a common
  room-program item.
- Room-type identifiers used across the codebase (Zod schema, Pydantic
  enums, DB rows) are the Indonesian terms themselves (`kamar_tidur_utama`,
  `kamar_mandi`, `ruang_tamu`, ...) — do not translate them to English in
  code; see `packages/schemas` and
  `services/generation-engine/src/generation_engine/domain/enums.py` for the
  canonical list.

## 5. Dev Environment Setup

```bash
make install   # pnpm install (web workspaces) + uv sync (generation-engine)
docker compose up -d   # local Postgres + generation-engine, for `next dev`
make dev
```

Requires Docker (local Postgres — see ADR-0011), Node (version pinned in
`.nvmrc`), pnpm (via Corepack, version pinned in root `package.json`), and
Python (version pinned in `.python-version`, managed via `uv`).

## 6. Golden Commands

These match CI exactly — run them before opening a PR, or use the
`ship-check` skill (§11) to run all of them at once.

```bash
pnpm turbo run lint        # ESLint (web packages) + Ruff (engine)
pnpm turbo run typecheck   # tsc --noEmit (web packages) + mypy (engine)
pnpm turbo run test        # Vitest + pytest/Hypothesis
pnpm turbo run build       # next build
make gate                  # all of the above, the exact CI gate
```

## 7. Coding Conventions

Do not duplicate folder-specific conventions here — read the `README.md` in
the folder you're editing. General rules that apply everywhere:
- Follow the lint/format config as configured (ESLint+Prettier for TS,
  Ruff+mypy for Python) — do not hand-tune formatting against it.
- No premature abstraction: don't build a shared package, a config flag, or
  a generic layer for a single current use case (see `packages/README.md`
  for the concrete rule this repo follows on shared packages).
- Room-type / building-term identifiers stay in Indonesian (§4) throughout
  the stack — schema, API, DB, UI copy keys.
- Every user-facing generated design output must carry the "not a
  construction document" disclaimer — do not remove or soften it.

## 8. Architecture Decisions

`docs/adr/` is the source of truth for *why* the system is shaped the way it
is. Before making a structural change (new service, new datastore, swapping
a core library, changing the generation approach), check whether an ADR
already covers it. If your change contradicts an existing ADR, write a new
ADR that supersedes it — do not just change the code and leave the doc
stale. Use the `new-adr` skill (§11) to scaffold one.

## 9. Testing Requirements

**Non-negotiable, per product decision (ADR-0010): every PR must pass lint +
typecheck + test + coverage threshold before merge.** This is enforced by a
single required `gate` check in CI (`.github/workflows/ci.yml`) — there is
no override path. If you write code, you write the tests for it in the same
PR.

- `apps/web`: Vitest + React Testing Library for units/components,
  Playwright for E2E/smoke flows.
- `services/generation-engine`: pytest for units/integration, **Hypothesis
  property tests for every generation-pipeline invariant** (no room
  overlaps, layout within envelope, KDB/KLB respected, room program
  fulfilled, deterministic output, graceful handling of infeasible input) —
  this is the highest-risk code in the repo and gets the most rigorous
  tests, not the least.
- Coverage floor starts at 70% per workspace (ratchets up over time), with a
  stricter bar on `generation_engine.engine.*` given it's the algorithmic
  core.

## 10. Git Workflow

Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`,
`test:`, `ci:`, `build:`, `perf:`), enforced by commitlint. Branches:
`type/short-description`. PRs require a passing `gate` check and at least
one approval before merge; `main` uses squash-merge only, direct pushes to
`main` are disallowed.

## 11. Available Skills

See `.claude/skills/` — each has its own `SKILL.md`:
- `ship-check` — run the full local gate (lint+typecheck+test+build) before
  a commit/PR.
- `new-adr` — scaffold a new numbered ADR from the template.
- `new-plan-fixture` — add a sample validated-geometry JSON fixture (for
  exercising the 2D/3D viewers without a live engine call).
- `sync-api-contract` — regenerate/check the TS types in `packages/schemas`
  against the generation-engine's OpenAPI schema.
- `new-wizard-step` — scaffold a new wizard step (route, schema slice, form
  component, store wiring) following the established pattern.

## 12. Guardrails — Things Agents Must Not Do

- Do not enter real secrets/API keys into any file — use `.env.local` /
  `.env` (both gitignored), documented as placeholders in `.env.example`.
- Do not commit directly to `main` or push without being asked.
- Do not change `packages/schemas` (the cross-language API contract)
  without also updating whichever side (web or engine) it now diverges
  from, in the same PR.
- Do not weaken or remove the "not a construction document" disclaimer, and
  do not add structural/MEP calculations without a new ADR superseding
  ADR-0004 — that's a legal-liability-scope decision, not a code decision.
- Do not add a generative-ML floor-plan path without a new ADR superseding
  ADR-0003.
- Do not lower coverage thresholds or skip failing tests to unblock a
  merge — fix the underlying issue or get the non-negotiable testing
  requirement itself changed via an explicit decision (§9), not a quiet
  CI-config edit.

## 13. Escalation

If a requirement is ambiguous, or a change would contradict an existing ADR
or the four locked scope decisions in §1, don't guess — surface the
question (in the PR description, or as a draft ADR laying out the options)
instead of picking a direction silently.
