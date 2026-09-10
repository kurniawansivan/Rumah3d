# ADR-0010: Every PR Must Pass a Single Non-Negotiable Lint+Typecheck+Test+Coverage Gate

Date: 2026-09-09

## Status

Accepted

## Context

This was an explicit, non-negotiable product-owner requirement, not an
engineering preference arrived at by the team — it is recorded here so that
its origin and reasoning survive independently of who enforces it. The
requirement exists because of what kind of bug this codebase is most at
risk of producing.

The generation engine (ADR-0003: curated templates + a constraint solver)
is exactly the kind of code where a subtle bug does not crash — it produces
a *plausible-looking but wrong* floor plan: rooms that overlap by a few
centimeters, a layout that quietly exceeds KDB or KLB, a room program that
silently drops a requested room, or a solver that returns a different
layout for the same input on a different run. None of these fail loudly.
All of them directly undermine the premise ADR-0002 is built on — that a
generated plan is a *trustworthy* starting point for a conversation with a
licensed architect. A wrong-but-plausible plan is worse than an obviously
broken one, because nothing in the UI signals that something is off.

That risk profile means the usual "tests are good practice" framing
understates the requirement: for this specific subsystem, the tests *are*
the specification of correctness, because the properties that matter (no
overlaps, geometry stays inside the envelope, KDB/KLB respected, the room
program is fulfilled, output is deterministic, infeasible input degrades
gracefully instead of guessing) are properties over the *entire input
space*, not behaviors a handful of example-based unit tests can credibly
cover. Property-based testing (Hypothesis) is the tool that matches that
shape of requirement.

The second half of the requirement — a *single required* status check,
with *no override path* — exists because a merge gate that can be bypassed
under deadline pressure is not a gate, it's a suggestion. The team
explicitly wanted "fix it or don't merge" to be true even when it's
inconvenient.

## Decision

Every pull request must pass lint, typecheck, the full test suite, and a
per-workspace coverage threshold before it can merge into `main`. This is
enforced by a single required GitHub Actions status check named `gate`
(`.github/workflows/ci.yml`) in branch protection — every other CI job can
be added, renamed, split, or reorganized without ever touching that branch
protection setting, because they all ultimately feed into `gate`.

There is no override path: no admin-merge bypass, no "skip failing test to
unblock," no lowering a coverage threshold to get a PR green. If the
non-negotiable requirement itself needs to change (not a single PR's
convenience), that is an explicit decision to make openly (CLAUDE.md §9),
not a quiet CI-config edit.

Per workspace:

- **`apps/web`**: Vitest + React Testing Library for units/components,
  Playwright for E2E/smoke flows over the wizard and viewer.
- **`services/generation-engine`**: pytest for units/integration, and
  **Hypothesis property tests for every generation-pipeline invariant** —
  no room overlaps, layout stays within the buildable envelope, KDB/KLB
  respected (checked as two distinct properties, per the glossary — never
  conflated), the requested room program is fulfilled, output is
  deterministic for identical input (the single-threaded, fixed-seed
  solver behavior ADR-0003 mandates), and infeasible input is handled
  gracefully (a structured `infeasible`/`partial` response, never a
  guessed layout or an unhandled exception). This is the highest-risk code
  in the repo, so it gets the most rigorous tests, not the least.

Coverage floor starts at 70% per workspace (`--cov-fail-under=70` for the
engine, an equivalent Vitest coverage threshold for `web`), ratcheting up
over time as the codebase matures, with a stricter bar specifically on
`generation_engine.engine.*` — the algorithmic core — given its outsized
correctness risk relative to the rest of the repo.

## Consequences

- PRs with no tests, or with a failing test quietly commented out, do not
  merge — by design. A PR that adds logic without a corresponding test is
  incomplete, the same way it would be if it didn't compile.
- Velocity on a PR that touches the generation engine is deliberately
  slower than it would be without this requirement — considered a
  worthwhile trade against shipping a wrong-but-plausible floor plan
  silently, given ADR-0002's premise depends on generated output being
  trustworthy.
- `.github/workflows/ci.yml` path-filters most jobs by which part of the
  repo changed (`dorny/paths-filter`, keyed off `apps/web`/`packages`
  versus `services/generation-engine` paths — see ADR-0008 for why
  Turborepo's task graph makes this filtering worthwhile) so an
  engine-only change doesn't wait on web CI and vice versa. The `gate` job
  itself is not path-filtered: it fans in every other job's result and
  requires each one to have either succeeded or been correctly skipped by
  the path filter — a job that actually ran and failed always fails
  `gate`, regardless of which workspace it belonged to.
- A `secret-scan` (gitleaks) job also feeds into `gate` unconditionally
  (every PR, no path filter) — outside this ADR's lint/typecheck/test/
  coverage scope specifically, but part of the same single-required-check
  mechanism, so a leaked credential blocks merge exactly the same way a
  failing test does.
- Because coverage thresholds only ratchet upward, a PR can be blocked by
  a coverage regression even when its own new code is fully tested, if it
  removes tested lines elsewhere — the fix is restoring or replacing that
  coverage, not lowering the threshold.
- This requirement is itself guarded: CLAUDE.md's guardrails (§12)
  explicitly list "lower coverage thresholds or skip failing tests to
  unblock a merge" as an action agents (human or AI) must not take
  unilaterally.
