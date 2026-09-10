# ADR-0003: Floor-Plan Generation Is Rule-Based Templates + a Constraint Solver, Not Generative ML

Date: 2026-09-08

## Status

Accepted

## Context

The core product function is turning a lot + a room program into a valid 2D
floor plan. Two fundamentally different approaches were on the table:

1. **A generative ML model** (e.g. a diffusion or GAN-style model trained on
   floor-plan images or vector datasets) that produces a layout directly from
   the input parameters.
2. **A curated template library plus a constraint solver**: a deterministic
   pipeline that selects from hand-authored, style-tagged template
   "skeletons" based on the room program and lot, then uses combinatorial
   optimization to fit actual room geometry within the buildable envelope.

Generative floor-plan models are an active research area, but they carry
properties that are a poor fit for this product specifically:

- They are typically non-deterministic — the same input can produce a
  different layout on different runs — and their output is not naturally
  traceable to a *reason*. There is no clean way to answer "why is the
  kitchen here" other than "the model produced it," which directly
  undermines ADR-0002's premise that this tool should hand a user something
  they and their eventual architect can understand and trust as a starting
  point.
- They routinely produce invalid geometry (overlapping rooms, disconnected
  circulation, physically nonsensical room shapes) that has to be caught and
  discarded downstream — the validity guarantee has to be re-derived by a
  separate checking step regardless, which raises the question of why not
  make the generation step itself constraint-respecting in the first place.
- A model is only as good as its training data's relevance to Indonesian
  residential conventions (wet/dry kitchen separation, mushola placement,
  service-area/jemuran norms, setback-driven envelopes) — data that would
  need to be sourced or curated at real effort, and even then would encode
  patterns implicitly rather than as inspectable rules.
- Training, hosting, and iterating a generative model is a materially
  different (and larger) engineering investment than curating templates and
  configuring a solver, for a v1 product that needs to ship and validate
  demand first.

A rule-based approach avoids all of this by construction: templates and
constraints are authored by people who understand Indonesian residential
layout conventions, and the solver's job is strictly to fit real dimensions
into a template's structure while respecting hard and soft constraints — it
cannot produce an output that isn't traceable to specific inputs.

## Decision

Floor-plan generation is a deterministic pipeline: a curated, style-tagged
template library filtered/scored against the room program, lot geometry, and
floor count, followed by geometric fitting via a constraint solver
(OR-Tools CP-SAT) that places rooms as 2D interval variables with
`AddNoOverlap2D`, soft adjacency objectives, and optional-presence variables
for amenities. This is explicitly **not** a generative ML/diffusion model,
now or as a planned evolution — see `docs/hld/generation-engine-contract.md`
for the full pipeline and `docs/hld/system-architecture.md` for where this
sits in the request lifecycle.

Every generated layout must be traceable to the specific rules and template
that produced it. The engine's response encodes this directly:
`why_selected` and `warnings` are structured `{rule_id, params}` objects, not
free-text explanations — see ADR-0004's engineering-scope corollary and the
contract doc for how the frontend renders these into Bahasa Indonesia.

Determinism is enforced deliberately: the solver runs single-threaded
(`num_search_workers=1`) with a fixed seed, so identical input reliably
produces identical output. This trade-off (sacrificing solver parallelism
for reproducibility) is treated as a hard requirement, not a performance
knob — it is one of the invariants tested by the property-based test suite
(ADR-0010).

## Consequences

- The template library becomes an ongoing curation/content investment —
  someone (a designer or architect working with the team, not a training
  pipeline) has to author and maintain templates as `templates` rows
  (`engine.templates`: room-program fit, zoning graph, style tags, min lot
  dimensions). This is real, recurring product work, not a one-time setup
  cost.
- Generated variety is bounded by what the template library and solver
  parameters allow — this is a deliberate ceiling on "creativity" in
  exchange for every output being explainable and valid by construction.
- Infeasible room programs must degrade to a structured `infeasible` (or
  `partial`) response with actionable detail, never a guess or a 500 — the
  system is not allowed to force-fit an invalid layout just to return
  *something* (see `docs/prd/design-generation-viewer.md` for the resulting
  UX and ADR-0010 for the test that guards this).
- Because OR-Tools (CP-SAT) and the geometry library (Shapely) this approach
  depends on are Python-native with no comparably mature JS/TS equivalent,
  this decision is a direct precondition for ADR-0006 (the generation engine
  as a separate Python service).
- The current implementation ships pipeline stages 1 (envelope) and 5
  (validation) for real; stage 3 (CP-SAT geometric fitting) is not yet
  implemented — `POST /v1/designs/generate` currently returns one
  deterministic, hardcoded room fit inside the envelope, explicitly marked
  `"engine_mode": "stub"` in the response, validated by the same real
  validators the full solver will use. This ADR's decision governs the
  target architecture; the stub is an honestly-labeled interim state on the
  way there, not a change of decision (see
  `docs/hld/generation-engine-contract.md`).
