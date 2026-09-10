# Rumah3d

Web app that helps Indonesian homeowners turn a plot of land and a room
program into a schematic 2D floor plan (denah) and a matching 3D
visualization — a concept-design starting point for a conversation with a
licensed architect, not a construction document.

## Start here

- [`docs/prd/README.md`](docs/prd/README.md) — product vision, scope, target user
- [`docs/adr/`](docs/adr/) — architecture decisions and why they were made
- [`docs/hld/system-architecture.md`](docs/hld/system-architecture.md) — how the pieces fit together
- [`docs/techstack.md`](docs/techstack.md) — full stack at a glance
- [`CLAUDE.md`](CLAUDE.md) — how AI agents should work in this repo

## Repo layout

```
apps/web/                  Next.js frontend + BFF
services/generation-engine/ Python/FastAPI floor-plan generation engine
packages/schemas/          Shared Zod schema + generated API types
packages/eslint-config/    Shared ESLint config
packages/typescript-config/ Shared tsconfig base
docs/                      PRD, ADRs, HLD
```

## Development

```bash
make install
docker compose up -d   # backend: Postgres + generation-engine (once per session)
make dev                # frontend: Next.js with hot reload
```

These two run side by side and do different jobs — `make dev` (`turbo run
dev`) only starts `apps/web`, since it's the only workspace with a `dev`
script; the backend isn't part of that task and has to be started
separately via Compose (see ADR-0011). Both live-reload on save: Next.js
normally, and `generation-engine`'s container via `--reload` watching the
bind-mounted `src/` (see `docker-compose.yml`) — a Python change should
show up on the next request with no restart needed. Running
`services/generation-engine` directly with `uv run uvicorn ...` (see its own
README) is the exception, for debugging the engine outside Docker — not
the everyday path.

`make gate` runs the full lint + typecheck + test + build pipeline used in CI.
