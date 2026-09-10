# generation-engine

## Purpose

Python/FastAPI service that turns a validated lot + room program into a
schematic 2D floor plan. Owns the `engine` Postgres schema (Alembic).
Called internally by `apps/web`'s BFF — never exposed to the browser
directly.

## Current State

Stub only: `POST /v1/designs/generate` returns one hardcoded room placed
inside a real, correctly-computed buildable envelope, checked by the real
validators in `engine/validators.py`. The CP-SAT solver
(`docs/adr/0003-rule-based-template-and-constraint-solver-generation.md`)
is not implemented yet — see `docs/hld/generation-engine-contract.md` for
the target contract this stub already conforms to shape-wise.

## Code Style & Acceptance Criteria

Ruff (lint+format) + mypy strict. Pure geometry/validation logic
(`engine/`) stays framework-free — no FastAPI/SQLAlchemy imports there, so
it stays trivially unit-testable and reusable once the real solver lands.

## Testing Requirement

pytest, with Hypothesis property tests for every invariant in
`engine/validators.py` — non-negotiable, see root `CLAUDE.md` §9. A PR
touching `engine/` without a corresponding property test is incomplete.

## Run it later

Day to day, this service runs via `docker compose up -d` from the repo
root (see root `README.md`) — its container already reloads on save. Run
it directly with `uv` only when debugging the engine in isolation, outside
Docker:

```bash
uv sync
uv run alembic upgrade head
uv run python -m generation_engine.scripts.seed_templates
uv run uvicorn generation_engine.main:app --reload
```

## Key Entry Points

- `src/generation_engine/engine/stub_pipeline.py`
- `src/generation_engine/engine/validators.py`
- `src/generation_engine/api/v1/designs.py`
- `src/generation_engine/api/schemas/generation_response.py`
