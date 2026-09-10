# ADR-0008: Monorepo Tooling — Turborepo + pnpm Workspaces (JS) + uv (Python), Unified via a Root Makefile

Date: 2026-09-08

## Status

Accepted

## Context

This is a polyglot monorepo: TypeScript for `apps/web` and shared packages
(`packages/schemas`, `packages/eslint-config`, `packages/typescript-config`),
Python for `services/generation-engine`. Both sides need install, lint,
typecheck, test, and build workflows that are fast, cacheable, and
consistent enough that a contributor (or CI) doesn't need to remember two
unrelated command surfaces depending on which part of the repo they're
touching.

## Decision

- **Turborepo + pnpm workspaces** for the JavaScript/TypeScript side.
  Turborepo is effectively zero-config for a Next.js app (same vendor as our
  deployment target, Vercel) and gives task-graph caching (lint, typecheck,
  test, build, with declared dependencies between them) with minimal setup.
  pnpm workspaces are the package manager: disk-efficient via a
  content-addressable store (no duplicated `node_modules` across `apps/web`
  and `packages/*`), and strict about dependency resolution — it surfaces
  phantom dependencies that npm/yarn's classic hoisting would silently allow.
- **uv** for the Python side (`services/generation-engine`) — install/sync
  speed and a single lockfile, the modern default choice for a new Python
  project at the time this repo was started.
- **A root Makefile** (`install`, `dev`, `gate`, `lint`, `typecheck`, `test`,
  `build`) as the actual top-level entry point, so a contributor or CI job
  never needs to know the pnpm/Turborepo/uv plumbing underneath — one flat
  set of verbs covers both languages.
- Rather than leaving the Python service as a completely separate command
  surface (`uv run pytest`, `uv run ruff`, invoked on its own), it gets a
  thin `package.json` whose scripts shell out to the equivalent `uv run ...`
  commands. That lets `services/generation-engine` register as a pnpm
  workspace member and participate in Turborepo's task graph, so
  `pnpm turbo run lint typecheck test build` — what `make gate` actually
  calls — runs and caches both languages' tasks from one command.

## Consequences

- Contributors need pnpm, Node ≥ 22 (`.nvmrc` / `package.json` engines), and
  `uv` installed locally, with the Python version pinned via
  `.python-version`. This is documented onboarding surface, not automatic.
- Turborepo's caching is only as correct as each task's declared
  inputs/outputs in `turbo.json`. As `services/generation-engine` gains real
  `lint`/`typecheck`/`test`/`build` tasks of its own, their output
  declarations need the same care as the JS tasks — an under-declared Python
  task risks a stale cache hit that hides a real failure.
- The package.json-shelling-to-`uv` approach is a small abstraction leak: a
  contributor used to plain Python tooling might reasonably ask why Python
  tests run via `pnpm turbo run test --filter=generation-engine` rather than
  `uv run pytest` directly. Both work and produce the same result, but the
  Makefile/Turborepo path is the one CI uses, so it's the one to trust for
  local/CI parity — this is worth a one-line comment in
  `services/generation-engine`'s `package.json` pointing back to this ADR.
- Because Turborepo understands the dependency graph between packages, CI
  can path-filter — only run tasks for packages actually affected by a given
  change — which keeps the single required `gate` check (ADR-0010) fast as
  the repo and template library grow.
- This is a tooling choice, not a language or framework choice — swapping
  Turborepo for another task runner, or uv for another Python package
  manager, is a comparatively low-stakes, reversible change if a better
  option emerges, unlike the harder-to-reverse decisions elsewhere in this
  ADR set.
