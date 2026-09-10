# Roadmap & Sprint Tracking

Living status doc — check things off as they land, add tickets as scope
gets clearer. This is _tracking_, not spec: each ticket points at the PRD/
ADR/HLD section that actually defines the behavior, rather than
re-describing it here.

Ticket scope is always marked **BE**, **FE**, or **BE+FE** — per-ticket
verification should exercise whichever side(s) it touches end to end, not
just "the code compiles."

---

## Sprint 0 — Foundation & Walking Skeleton ✅ DONE

- [x] Monorepo scaffold, tooling, CI, git hooks (`25016a8`, earlier)
- [x] PRD / ADR (0001–0011) / HLD / techstack docs
- [x] `services/generation-engine` skeleton: FastAPI, real validators,
      stub pipeline, Alembic migration, tests (`f402fa0`, earlier)
- [x] `apps/web` skeleton: wizard step 1 (lot data), BFF route, 2D SVG
      viewer, Prisma migration, tests (`2237494`, earlier)
- [x] Local dev workflow verified: `docker compose up -d` + `make dev`,
      hot-reload on both sides (`86cf71e`)
- [x] End-to-end smoke test: fill lot form → BFF → stub engine → envelope
      computed → room rendered in browser — verified live, not just unit
      tests

**What "done" means here concretely:** one wizard step, one hardcoded
room, `engine_mode: "stub"` — proves the whole pipe (FE → BFF → BE → DB
schema) is wired correctly. See
[`services/generation-engine/README.md`](../services/generation-engine/README.md)
"Current State" and
[`docs/hld/generation-engine-contract.md`](hld/generation-engine-contract.md)
"Current State — Stub, Not the Full Pipeline" for exactly what is and
isn't real yet.

---

## Sprint 1 — Complete the Wizard

Mostly **FE**. `packages/schemas/src/design-brief.ts` already defines the
full contract for all 5 steps — these tickets are UI + BFF wiring against
a schema that already exists, not new schema design. Pattern to follow:
`apps/web/src/app/design/new/lot/page.tsx` (step 1) + the `new-wizard-step`
skill.

- [x] **RM-1** — Step 2: Batasan Regulasi (GSB/KDB/KLB form). Also moved
      GSB fields out of step 1 (they'd been folded in there during the
      walking-skeleton pass, ahead of the PRD's actual 5-step split), and
      fixed `kdb_percent`/`klb_percent` bounds (`min(10)`, and `klb` up to
      300 since it's cumulative across floors, not capped at 100 like
      `kdb`). Verified live: lot → regulasi → preview renders a room sized
      to the real GSB values, not the engine's hardcoded defaults.
      Ref: [`docs/prd/floor-plan-wizard.md`](prd/floor-plan-wizard.md) Step 2.
- [ ] **RM-2** — Step 3: Program Ruang (room program + amenities form —
      the biggest step, ~15 fields). Ref: same doc, Step 3.
- [ ] **RM-3** — Step 4: Gaya & Prioritas.
      Ref: same doc, Step 4.
- [ ] **RM-4** — Step 5: Review & Generate — summary of Steps 1–4 with
      "Ubah" links, disclaimer, wires the _full_ brief to the BFF instead
      of step 1's defaults-padded partial. Ref: same doc, Step 5.
- [ ] **RM-5** — Shared wizard shell: "step N of 5" indicator, back/forward
      without losing later-step answers. Ref: same doc, "Wizard mechanics".

**DoD per ticket:** step's Zod slice already exists (confirm, don't
redefine) → form built against it → BFF forwards the real values instead
of a default → Vitest schema/component tests → manual click-through in
browser.

---

## Sprint 2 — Real Generation Engine

**BE**. This is where `engine_mode` flips from `"stub"` to `"solver"`.
Ref: [`docs/hld/generation-engine-contract.md`](hld/generation-engine-contract.md)
"Pipeline Stages (Target)", [`docs/adr/0003`](adr/0003-rule-based-template-and-constraint-solver-generation.md).

- [ ] **RM-6** — Curate a real starter template library (currently just
      one seed, `type36_1lt_2kt1km`). Content-authoring work, not just code
      — needs realistic Indonesian lot-size/room-program coverage.
- [ ] **RM-7** — Stage 2: template selection/matching (filter
      `engine.templates` by style/floors/room-program fit/lot size).
- [ ] **RM-8** — Stage 3: CP-SAT geometric fitting (`AddNoOverlap2D`,
      soft adjacency, optional-presence vars for flexible entries) —
      replaces `stub_pipeline.py`'s hardcoded room.
- [ ] **RM-9** — Stage 4: postprocessing — real wall/door/window
      placement from solved geometry, multi-floor stairs.
- [ ] **RM-10** — Persist `design_generation_requests` /
      `generated_design_versions` rows (the stub currently never writes to
      DB — tables exist, nothing inserts into them yet).

**DoD per ticket:** Hypothesis property test added/updated in
`tests/property/test_invariants.py` for any new invariant (non-negotiable
— `CLAUDE.md` §9) → `uv run pytest` green → manually verify via
`POST /v1/designs/generate` (curl or FastAPI's own `/docs` UI) that output
actually changed shape/behavior, not just that tests pass in isolation.

---

## Sprint 3 — Richer Output & UX

**BE+FE**. Depends on Sprint 2 actually producing non-trivial layouts.

- [ ] **RM-11** — Multi-candidate ranking + comparison switcher (contract
      already returns up to 3 candidates; FE only renders `candidates[0]`
      today).
- [ ] **RM-12** — Graceful-degrade UI: `rule_id → Indonesian sentence`
      template dictionary, per-room warning ties in the 2D view. Ref:
      [`docs/prd/design-generation-viewer.md`](prd/design-generation-viewer.md)
      "Explainability" + "Graceful Degrade".
- [ ] **RM-13** — 3D viewer: React Three Fiber, client-side extrusion from
      the same `candidates[].floors` payload the 2D view uses. Ref:
      [`docs/adr/0005`](adr/0005-3d-visualization-only-client-side-extrusion.md).

---

## Sprint 4 — Production Readiness

- [ ] **RM-14** — Auth (Clerk) + real `Project` creation flow — replaces
      the BFF's `crypto.randomUUID()` placeholder `project_id`
      (`apps/web/src/app/api/design/generate/route.ts`).
- [ ] **RM-15** — Sentry wiring, web + engine.
- [ ] **RM-16** — Deploy: Vercel (web) + Railway (engine) + Neon (DB). Ref:
      [`docs/techstack.md`](techstack.md).
- [ ] **RM-17** — Swap hand-rolled form markup for shadcn/ui (flagged
      inline as `TODO(shadcn/ui)` in `lot/page.tsx` — deferred during the
      walking-skeleton pass because its CLI needs a live install).

---

## Not scheduled / explicitly out of scope

Anything that would contradict a locked ADR needs a new ADR first, not a
ticket — see `CLAUDE.md` §1/§8. Notably: structural/MEP calculations
(ADR-0004), generative-ML floor plans (ADR-0003), CAD/BIM export
(ADR-0005), construction-document-grade output (ADR-0002).
