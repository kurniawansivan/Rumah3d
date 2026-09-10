# Tech Stack

One-page index of every stack choice and why it was made. This file is
intentionally shallow — one line of reasoning per row, pointing back to
whichever ADR actually did the deliberating. Where no ADR is cited, that's
because the choice is a routine, cheaply-reversible one that never met
ADR-0001's own bar for needing a record, not an oversight.

| Layer | Concern | Choice | Why (one line) | ADR |
|---|---|---|---|---|
| Frontend | Framework | Next.js (App Router) + TypeScript | Vercel-native React framework; doubles as both the UI and the BFF that fronts the generation engine. | No dedicated ADR — a foundational choice predating this repo's ADR practice; ADR-0006 and ADR-0008 both assume it. |
| Frontend | UI | Tailwind CSS, shadcn/ui added incrementally | Utility CSS plus copy-in (not dependency-locked) components, adopted only as screens actually need them — no upfront design-system investment. | No dedicated ADR — routine, easily-reversible (ADR-0001's own bar for what earns one). |
| Frontend | Forms | React Hook Form + Zod | One schema (`packages/schemas/src/design-brief.ts`) drives both client-side form validation and the BFF's server-side re-validation — no second, drifting definition of "what's a valid wizard input." | No dedicated ADR — follows from `packages/schemas`' role as the shared cross-language contract (CLAUDE.md §12), not a numbered decision. |
| Frontend | Wizard state | Zustand + persist middleware | Small, unopinionated client store; `persist` keeps in-progress wizard answers across a refresh without a backend round-trip. | No dedicated ADR — routine, easily-reversible. |
| Frontend | Server state | TanStack Query | Caching, retry, and error-state handling for calls to the BFF — the explicit client-side "real error/retry story" the engine's network hop needs. | ADR-0006 |
| Frontend | 2D viewer | Raw SVG | Plan geometry is a handful of static 2D polygons at small scale — SVG renders it directly from the plan JSON with no extra rendering engine. | ADR-0005 (2D is the shared source geometry both views render) |
| Frontend | 3D viewer | React Three Fiber, client-side parametric extrusion | Same validated 2D plan JSON, extruded in the browser — never an independently generated 3D artifact, never a second network round-trip. | ADR-0005 |
| Frontend | Auth | Clerk | Managed sessions, credentials, and phone/OTP sign-in without building that hardening ourselves. | ADR-0009 |
| Frontend | App persistence | Postgres (`app` schema) via Prisma | Type-safe schema/migrations for `apps/web`'s own data (`users`, `projects`), owned independently of the engine's schema. | ADR-0007 |
| Generation Engine | Service | Python 3.12 + FastAPI | Pydantic-native validation and auto-generated OpenAPI, run as a separate, independently-scaled service rather than embedded in the web app. | ADR-0006 (also ADR-0003 for why Python at all) |
| Generation Engine | Geometry | Shapely | Best-in-class 2D geometry/GEOS bindings, with no comparably mature JS/TS equivalent — the direct reason the engine has to be Python. | ADR-0003 |
| Generation Engine | Constraint solver | OR-Tools CP-SAT | Deterministic combinatorial fitting (2D interval variables, `AddNoOverlap2D`, optional-presence variables) instead of a generative model — explainable and reproducible by construction. | ADR-0003 |
| Generation Engine | Circulation check | networkx | Graph-connectivity check (is the placed layout actually walkable) as part of stage 5 validation. | No dedicated ADR — an implementation detail in service of ADR-0003's validation stage. |
| Generation Engine | Persistence | SQLAlchemy + Alembic (`engine` schema) | Owns and migrates `templates`, `room_type_norms`, `design_generation_requests`, `generated_design_versions` independently of Prisma. | ADR-0007 |
| Data & Infra | Geometry storage | Postgres JSONB, not PostGIS | Plan geometry is local/planar (meters from a lot origin), already fully validated in Shapely before persistence — no geospatial indexing/SRS need PostGIS would actually earn its keep on. | ADR-0007 |
| Data & Infra | DB/service boundary | One Postgres database, two logical schemas, no cross-schema FKs | Keeps Prisma's and Alembic's migration histories genuinely independent; `project_id`/`user_id` on `engine` tables are API-layer-validated, not DB-enforced. | ADR-0007 |
| Data & Infra | Local dev DB | Docker Compose (Postgres + a local `generation-engine` container) | Identical, disposable Postgres version across every contributor's machine; `docker compose down -v` gives a full reset. Never part of any deployed environment. | ADR-0011 |
| Data & Infra | Monorepo tooling | Turborepo + pnpm workspaces (JS), uv (Python), unified via a root `Makefile` | Task-graph caching and one flat command surface (`make gate`, etc.) across both languages instead of two unrelated toolchains. | ADR-0008 |
| Data & Infra | Hosting | Vercel (`apps/web`) / Railway (`generation-engine`) / Neon (Postgres) | Independent deploy/scale cadence for the web tier vs. the CPU-bound solver tier; a managed Postgres instead of self-hosting. | ADR-0006 (Vercel/Railway split), ADR-0011 (Neon in deployed environments) |
| Data & Infra | Observability | Sentry (both services) + Vercel Analytics | Independent error visibility per service, correlated via the response's `request_id` where needed. | No dedicated ADR — operational tooling choice below ADR-0001's bar for a record. |
| Tooling & Process | Lint/format (TS) | ESLint + Prettier | Conventional default for a TS/Next.js codebase. | No dedicated ADR — ADR-0008 covers how it runs in the task graph, not why these specific tools. |
| Tooling & Process | Lint/format (Python) | Ruff + mypy | Conventional modern-Python default, fast enough to run on every commit and in CI. | No dedicated ADR — ADR-0008 covers how it runs in the task graph, not why these specific tools. |
| Tooling & Process | Git hooks | Husky + lint-staged + commitlint + gitleaks | Local pre-commit enforcement of formatting, Conventional Commits (root `CLAUDE.md` §10), and secret scanning before anything reaches CI. | gitleaks ties to ADR-0010 (its CI counterpart feeds the required `gate` check); the rest enforce CLAUDE.md §10 locally, not a numbered decision. |
| Tooling & Process | CI | GitHub Actions, path-filtered jobs, single required `gate` check | Only run tasks affected by what changed, but let no PR merge without lint+typecheck+test+coverage passing — no override path. | ADR-0010 (the gate itself), ADR-0008 (path-filtering via the Turborepo task graph) |

See also: `docs/adr/` for the full reasoning behind any row above,
`docs/hld/system-architecture.md` for how these pieces actually talk to
each other at runtime, and `docs/hld/generation-engine-contract.md` /
`docs/hld/data-model.md` for the two artifacts (the API contract, the
table definitions) most of the "Generation Engine" and "Data & Infra" rows
above exist to support.
