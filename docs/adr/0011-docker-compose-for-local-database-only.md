# ADR-0011: Docker Compose Is for the Local Database (and Dev Engine), Never for Deployed Environments

Date: 2026-09-09

## Status

Accepted

## Context

Every contributor needs a Postgres instance to run `next dev` and the
generation engine locally against (CLAUDE.md §5). Three ways to get one
were considered:

1. **Docker Compose**, running a pinned Postgres image as a local
   container.
2. **A shared cloud dev database** (e.g. a long-lived Neon branch used for
   local development too, not only deployed previews).
3. **A native Postgres install** (Homebrew on macOS, equivalent package
   managers elsewhere) on each contributor's machine.

Option 2 was rejected because it ties local development to a live external
service: it needs a constant internet connection to do anything (including
things that should be instant, like resetting local state), adds real
network latency to what should be the fastest part of the inner dev loop,
and turns a shared resource's availability into a local-development
dependency — an outage or a teammate's destructive migration test could
block everyone's local `next dev`, not just one preview deployment.

Option 3 was rejected because it reintroduces exactly the version-drift
problem a shared toolchain is supposed to avoid: contributors end up on
whatever Postgres version they happened to install and update over time,
setup steps (install, start on boot, create the right role/database) are
manual and machine-specific, and a "works on my machine" Postgres-version
mismatch is a genuinely hard class of bug to track down.

## Decision

Local development uses Docker Compose (`docker-compose.yml`, repo root) to
run a pinned `postgres:16-alpine` container as a disposable, reproducible
local database — identical across every contributor's machine, with no
native Postgres install required. `docker compose down -v` gives a
trivial, complete reset (drop the volume, next `up` starts clean) when
local migration state, seed data, or test fixtures get into a bad state.

Deployed environments — preview and production alike — use Neon, a managed
cloud Postgres, instead (`docs/hld/system-architecture.md`). Docker is
strictly a local-development concern: it is never part of the deployed
topology, and no deployed environment's correctness depends on anything in
`docker-compose.yml` working.

The same compose file also runs a `generation-engine` container locally,
wired to that local Postgres, so `next dev` has a real engine to call
without a separate manual `uv run` step. This is a convenience alongside
the core decision, not a separate one: the engine still deploys to Railway
in every real environment (ADR-0006), and CI never uses
`docker-compose.yml` at all — the `engine-test` job in
`.github/workflows/ci.yml` talks to a plain `postgres:16` GitHub Actions
service container directly. `docker-compose.yml` only has to work for
local `next dev`; it is not a dependency of any CI or deploy step.

## Consequences

- Contributors need Docker (Docker Desktop or equivalent) installed
  locally — a documented onboarding requirement (CLAUDE.md §5, root
  `README.md`), not something `make install` alone can satisfy.
- Local Postgres, CI's Postgres service containers, and Neon should track
  the same major version (16) to avoid a "works locally, breaks in
  preview" class of bug caused by version-specific SQL or extension
  behavior.
- Because local Postgres is fully disposable and trivially reset, no local
  data is ever precious — seed/fixture scripts, not backup-and-restore,
  are the supported way to get useful local data. This is a deliberate
  consequence, not an oversight: local dev is meant to be a throwaway
  environment.
- `docker-compose.yml` failing or being out of date only ever blocks local
  development, never a deploy or a CI run — which also means it can go
  stale without CI catching it; a contributor hitting a broken local
  compose setup is a signal worth fixing promptly even though nothing
  automated enforces it.
- Revisiting this later (e.g. toward a hosted per-branch dev database) is
  not ruled out permanently, but would need to actually solve the
  connectivity, latency, and shared-mutable-state problems this ADR
  rejected it for — it wasn't rejected for being a bad idea in general,
  only for not fitting a small team's current local workflow.
