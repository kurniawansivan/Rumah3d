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
make dev
```

`make gate` runs the full lint + typecheck + test + build pipeline used in CI.
