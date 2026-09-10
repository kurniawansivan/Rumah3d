---
name: new-plan-fixture
description: Add a new sample validated-geometry JSON fixture (matching the generation-engine response contract) plus a wired-up test, so the 2D/3D viewers can be exercised without calling a live engine. Use when building or testing viewer/UI work against known plan shapes.
---

# new-plan-fixture

The 2D (`PlanSvg`) and future 3D viewers should be developable and testable
without a running `generation-engine` — this skill adds a realistic sample
response to make that possible.

## Steps

1. Create a new fixture file under
   `apps/web/src/lib/fixtures/plans/<name>.json`, shaped exactly like one
   `candidates[]` entry of the generation-engine's response contract
   (`packages/schemas/src/generation-response.ts` has the canonical type —
   import it and satisfy it, don't hand-guess the shape).
2. Cover a genuinely different case than existing fixtures — e.g. a
   multi-floor plan with stairs, a plan with a pool amenity, a plan with an
   L-shaped envelope, an `infeasible` response — not another simple
   single-room-per-floor box.
3. Add a Vitest test in the relevant component's `*.test.tsx` that imports
   the fixture and asserts the viewer renders it correctly (right room
   count, right labels, no thrown errors on edge shapes like a room with a
   very small area or an opening near a wall corner).
4. If the fixture is generic/useful enough for manual QA too, wire it into
   a `?fixture=<name>` query-param escape hatch on the preview page
   (`apps/web/src/app/design/new/preview/page.tsx`) that skips the network
   call and renders the fixture directly — guarded so it only works in
   non-production builds.
