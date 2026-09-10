# ADR-0004: Scope Is Limited to Architecture/Space-Planning — No Structural or MEP Engineering

Date: 2026-09-08

## Status

Accepted

## Context

A buildable house design needs more than a room layout: it needs structural
engineering (pondasi/kolom/balok — foundation, column, and beam sizing) and
MEP design (mechanical/electrical/plumbing — wiring layout, load
calculations, pipe routing). In Indonesian practice these are the domain of
a licensed structural engineer (insinyur berlisensi), a distinct discipline
and distinct legal accountability from the architect who owns space
planning.

This matters more than a simple "not built yet" scoping note. Getting a room
layout suboptimal is a quality problem; getting a beam span or a structural
load calculation wrong and presenting it as though it were validated is a
life-safety problem, categorically different in kind. Even if the product
eventually wanted to move in this direction, doing it credibly would require
domain data this system has no way to source reliably: soil conditions,
material properties, local structural codes, load cases — none of which fit
the CP-SAT layout-fitting problem this system is built to solve (ADR-0003),
and none of which this team has the professional-engineering standing to
validate.

This is a direct extension of ADR-0002's liability boundary — that ADR draws
the "not a construction document" line for the *architectural* deliverable;
this ADR draws the equivalent line for structural and MEP correctness
specifically, because it is easy to accidentally imply engineering validity
just by rendering a wall with a thickness or a pipe run, even without
intending to.

## Decision

Rumah3d's generation and validation scope is architecture and space-planning
only. The system never computes, outputs, or implies validated structural
sizing (foundations, columns, beams) or MEP design (electrical circuit
layout, plumbing runs, load calculations). Wherever this boundary could be
misread, the product discloses it explicitly: "konsultasikan ke insinyur
berlisensi sebelum membangun" alongside the general architectural disclaimer
from ADR-0002.

Concretely, wall thickness and other geometric properties in the plan
(`walls[].thickness_m` in the generation contract) exist for space-planning
and rendering purposes — how much floor area a wall consumes, how it looks
extruded in 3D — not as a structural section property. The data model has no
tables or fields for structural members, loads, or MEP runs, and none should
be added under this scope.

## Consequences

- The CP-SAT solver's constraint model stays scoped to *layout* feasibility
  (does the program fit, are rooms non-overlapping, is circulation
  connected) rather than *structural* feasibility (can this span actually be
  built) — this keeps the solver's problem size and constraint set
  tractable, which is a direct enabler of ADR-0003's determinism and
  reasonable solve times.
- No output — 2D plan, 3D view, export, or metadata — may be labeled or
  styled in a way that implies structural or MEP validation happened. This
  is a standing constraint on UI copy, checked as an explicit acceptance
  criterion in `docs/prd/design-generation-viewer.md`.
- If the product later wants to integrate real structural/MEP capability,
  that is a significant new capability requiring its own ADR (and likely a
  partnership with, or integration of, licensed-engineer-reviewed logic) —
  not an incremental feature to be added quietly to the existing pipeline.
- This boundary is a precondition for ADR-0005: because the 3D view is
  explicitly not asserting structural validity, it is free to be a purely
  visual, parametric extrusion rather than anything resembling a structural
  or BIM model.
