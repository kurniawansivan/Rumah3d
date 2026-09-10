# ADR-0005: 3D Is Visualization-Only, Extruded Client-Side From the Validated 2D Plan

Date: 2026-09-08

## Status

Accepted

## Context

Users need to see their generated design in 3D, not just as a flat plan.
Three ways to get there were considered:

1. **A full CAD/BIM pipeline**, exporting industry-standard formats (IFC,
   DWG) that could feed downstream CAD/BIM tools.
2. **An independent AI 3D generation step** — a separate model that produces
   a 3D scene (e.g. from the room program, an image, or a text description),
   run alongside or after the 2D generation.
3. **Parametric, client-side extrusion of the same validated 2D plan
   geometry** — walls extruded to floor height, a roof placed per a
   `type`/`pitch_deg` parameter, openings cut in, all computed in the
   browser from the same geometry JSON the 2D viewer already renders.

Option 2 was rejected primarily on a correctness/trust basis: an
independently generated 3D model has no structural guarantee of matching the
2D plan it's supposedly depicting — it could show a pool the 2D plan doesn't
have, or a room count that drifted from what the solver actually produced.
For a product whose entire value proposition rests on the *2D plan* being
the validated, rule-traceable source of truth (ADR-0003), a 3D view that
could silently disagree with it is a liability, not a feature.

Option 1 was rejected because it directly conflicts with ADR-0002's
"concept/schematic only" boundary. IFC and DWG are construction- and
CAD/BIM-pipeline formats; shipping them — even with a disclaimer attached —
implies the output is meant to feed a construction workflow, which is
exactly the implication ADR-0002 exists to avoid. It would also pull the
generation engine or a new service into structural/BIM-adjacent modeling
concerns that ADR-0004 deliberately keeps out of scope.

## Decision

The 3D view is visualization-only: a client-side, parametric extrusion of
the same validated 2D plan JSON returned by the generation engine
(`docs/hld/generation-engine-contract.md`), built with React Three Fiber +
drei + Three.js. Walls are extruded to floor height, roofs are generated
from `roof.type`/`roof.pitch_deg`, and openings are placed from the
`openings` array — all computed in the browser, not requested from the
server as a separate artifact. There is no IFC/DWG (or any other CAD/BIM)
export anywhere in the product.

## Consequences

- The 2D and 3D views can never disagree, because they are two renderings
  of one already-validated geometry payload — a bug in the plan shows up
  identically in both views rather than as a confusing 2D/3D mismatch, and
  fixing 2D validation (ADR-0003's stage 5) fixes 3D correctness for free.
- The Python generation engine stays scoped to 2D layout (ADR-0006); it
  never needs to know about 3D rendering concerns, keeping its
  responsibility boundary clean.
- 3D rendering is instant and reactive to plan changes (no extra network
  round-trip, no server-side rendering cost) — appropriate for an
  iterate-quickly, pre-architect exploration tool.
- 3D fidelity is bounded by what the plan JSON encodes parametrically —
  wall heights, roof pitch, opening placement. There is no room for
  bespoke architectural 3D detail (custom facade elements, material
  texturing beyond stylistic defaults) unless it is added as new structured
  metadata in the contract, which is a deliberate, reviewable change rather
  than something a 3D-specific generation step could introduce silently.
- No IFC/DWG export is a standing product boundary, not a missing feature —
  revisiting it would need its own ADR and would need to be reconciled with
  ADR-0002 and ADR-0004 first, since it would reopen exactly the
  construction-pipeline implication those decisions were made to avoid.
- The generation contract must carry enough parametric metadata (roof
  type/pitch, opening offsets and dimensions, per-floor heights) for the
  extrusion to be accurate — this is why those fields are first-class parts
  of the response shape rather than an afterthought.
