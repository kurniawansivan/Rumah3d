---
name: ship-check
description: Run the full local lint+typecheck+test+build gate, mirroring CI exactly, before a commit or PR. Use before every commit/PR in this repo.
---

# ship-check

Runs the exact same checks CI's required `gate` job runs
(`.github/workflows/ci.yml`), locally, so failures surface before push
instead of after.

## Steps

1. Run `make gate` (equivalently `pnpm turbo run lint typecheck test build`)
   from the repo root.
2. If `apps/web` changed, also run `pnpm --filter web test:e2e` (Playwright)
   — not part of `make gate` because it's slower; run it whenever a wizard
   step, the BFF route, or a viewer component changed.
3. If anything fails:
   - Lint failure: fix the reported issue directly; don't disable the rule
     unless it's a genuine false positive (and say why in the fix).
   - Typecheck failure: fix the type, don't reach for `any`/`# type: ignore`
     unless a third-party dependency genuinely lacks types — then say so in
     a one-line comment.
   - Test failure: fix the code (or the test, if the test's expectation was
     wrong) — never delete or skip a failing test to get green. Per
     [`CLAUDE.md`](../../../CLAUDE.md) §9, this is non-negotiable.
   - Coverage failure: add the missing test — this usually means new logic
     shipped without a test for it.
4. Report a short pass/fail summary per check (lint / typecheck / test /
   build), not raw command output.

## When this is not enough

`make gate` doesn't need a live database. If your change touches
`services/generation-engine/src/generation_engine/persistence/` or
`apps/web/prisma/schema.prisma`, also bring up `docker compose up -d` and
confirm migrations apply cleanly before considering the change ready.
