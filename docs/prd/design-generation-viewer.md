# Design Generation & Viewer — Feature Spec

What happens after a user submits the wizard (`docs/prd/floor-plan-wizard.md`
Step 5): the call to `POST /v1/designs/generate`
(`docs/hld/generation-engine-contract.md`), and everything the user sees in
response — the 2D plan, the 3D visualization, the explanation of *why* the
plan looks the way it does, and what happens when their room program
doesn't fit their lot.

## What the User Sees

A generation result is one screen with three coordinated parts, all driven
by the same response payload:

1. **A 2D plan view** (raw SVG, `docs/techstack.md`) — the lot boundary,
   GSB setback lines (drawn as reference guides, distinct from the
   building outline), each room as a filled, labeled polygon (room-type
   name + `area_m2`), walls as stroked polylines at their real
   `thickness_m`, and openings marked on the walls they belong to (a gap
   for a window, a gap plus a door-swing arc for a door). A scale
   reference is always visible.
2. **A 3D view** (React Three Fiber, client-side extrusion per ADR-0005) —
   the same geometry, walls extruded to `height_m`, a roof placed per
   `roof.type`/`roof.pitch_deg`, openings cut into the extruded walls,
   orbit/pan/zoom controls. There is no separate 3D data fetch — it is
   computed in the browser from the exact same `candidates[].floors`
   payload the 2D view already has, which is what guarantees the two views
   can never disagree with each other.
3. **A side panel** carrying, per currently-selected candidate: the
   template used, the "why this layout" explanation, any warnings, and the
   persistent legal disclaimer.

When the response carries more than one candidate (`candidates[]`, up to
3, ranked), a candidate switcher lets the user flip between them; each
candidate re-renders its own 2D view, 3D view, and side-panel content
independently — comparing candidates is comparing complete, self-contained
options, not a diff view.

The legal disclaimer from `docs/prd/README.md` is rendered on this screen
persistently — visible regardless of which candidate is selected, not
attached to just one — and again on any export/share surface built later
(ADR-0002).

## Explainability: Rendering `why_selected` and `warnings`

`why_selected` and `warnings` arrive from the engine as arrays of
`{rule_id, params}` objects (ADR-0003) — structured data, deliberately
**not** free-text prose. The frontend owns a `rule_id → Indonesian sentence
template` dictionary and is the only thing that ever turns a rule into
words a user reads. Two concrete examples of how that lookup works:

| `rule_id` | `params` (example) | Rendered Indonesian sentence |
|---|---|---|
| `kdb_within_limit` | `{ used_percent: 42.3, max_percent: 60 }` | "Luas lantai dasar memakai 42.3% dari lahan, masih di bawah batas KDB 60%." |
| `room_area_below_norm` | `{ room_type: "kamar_tidur", area_m2: 8.2, min_area_m2: 9 }` | "Kamar tidur seluas 8.2 m², sedikit di bawah standar minimum 9 m²." |
| `flexible_room_dropped` | `{ room_type: "mushola" }` | "Mushola kecil tidak dapat ditampung dan dihilangkan agar program ruang lain terpenuhi." |

This is a hard boundary, not a style preference:

- The backend's `why_selected`/`warnings` payload is *never* rendered
  directly, string-interpolated, or passed through as-is — only its
  `rule_id` and `params` are read, and only to select and fill an
  already-authored Indonesian template.
- A `rule_id` the frontend doesn't recognize (an engine/frontend version
  skew — the engine shipped a new rule the frontend's template dictionary
  doesn't have yet) renders a safe, generic fallback line (something like
  "Ada catatan tambahan dari sistem generasi.") — never the raw `rule_id`,
  never raw `params`, and never a thrown error that breaks the rest of the
  viewer.
- This keeps the product's Indonesian-language, non-technical tone
  consistent regardless of what the engine internally calls a rule, and
  means the engine team can add or rename rules without that leaking
  untranslated technical strings into the product.

## Graceful Degrade — What "Graceful" Means Concretely

A room program that doesn't fit its lot is an expected outcome, not an
error condition, per ADR-0003: the engine never guesses or force-fits an
invalid layout, and never returns an HTTP 500 for an infeasible or
constrained input — always HTTP 200, with a `status` field the UI branches
on.

- **`infeasible`** — the solver could not place even the "required"-priority
  room program (Step 4's `prioritasSaatTidakMuat` protects one category;
  everything the user tagged as protected still didn't fit). The response
  carries no usable candidate geometry, but does carry structured
  `warnings` identifying exactly which constraint blocked it (e.g. which
  required room type, or the envelope itself, was the problem). The viewer
  shows a dedicated "tidak muat" (doesn't fit) state — never a blank
  screen, never a generic error page — listing those blocking warnings
  through the same `rule_id` template dictionary above, each paired with a
  deep link back to the specific wizard step (`Step 3` or `Step 1`/`2`,
  whichever produced the blocking input) so the user's next action is
  obvious and one click away.
- **`partial`** — every required room fit, but one or more "flexible"
  entries (the category the user did *not* protect in Step 4) had to be
  shrunk below its normal size norm, merged, or dropped entirely to make
  the program fit. The response *does* include real candidate geometry —
  the plan renders normally — plus `warnings` entries (via the same rule
  dictionary) naming exactly what was compromised and on which room. The
  viewer surfaces these prominently, not tucked into a collapsed
  accordion, and visually ties each warning to the room it affects (e.g.
  an outline or marker on the affected room in the 2D view), so "what got
  compromised" is never just an abstract sentence disconnected from the
  plan the user is looking at.
- Ranked candidates make degrade trade-offs comparable: when multiple
  candidates come back, different candidates may have made different
  compromises (one drops the pool, another shrinks the family room
  instead) — the candidate switcher is how a user weighs those trade-offs
  against each other, not just against a single fixed outcome.

## Acceptance Criteria

- [ ] The legal disclaimer renders on every 2D view, every 3D view, and
      every export/share surface, at all times, regardless of candidate
      selected or generation status (ADR-0002).
- [ ] `why_selected` and `warnings` render exclusively through the
      frontend's `rule_id` → Indonesian template dictionary; no raw engine
      string or raw `params` value ever reaches rendered output.
- [ ] An unrecognized `rule_id` renders the generic fallback line and does
      not throw or blank the rest of the screen.
- [ ] An `infeasible` response renders the dedicated no-plan state with
      actionable, deep-linked guidance back to the wizard — never a
      generic error page, and never triggered by an HTTP error status
      (the contract guarantees 200 for `infeasible`).
- [ ] A `partial` response renders the plan plus a prominent, per-room-
      traceable list of what was compromised and why.
- [ ] No copy, label, or visual treatment anywhere in the viewer implies
      structural or MEP validation occurred — e.g. `walls[].thickness_m`
      is never presented as a structural specification (ADR-0004).
- [ ] Up to 3 ranked candidates are individually selectable; each renders
      its own 2D view, 3D view, `why_selected`, and `warnings`
      independently of the others.
- [ ] The 2D and 3D views are always rendered from the same
      `candidates[].floors` payload — there is no code path where they
      could show different geometry (ADR-0005).
- [ ] The viewer renders correctly against **today's stub response** (see
      below) — exactly one candidate, one hardcoded room, minimal or empty
      `why_selected`/`warnings` — without assuming multiple candidates,
      multiple rooms, or a populated explanation list will always be
      present.
- [ ] The viewer also renders correctly against richer fixture shapes
      (multi-floor with stairs, a pool amenity, an `infeasible` response,
      a `partial` response) added via the `new-plan-fixture` skill, so
      target behavior is exercised in tests before the real solver exists
      to produce it live.

## Current Implementation State (Read This Before Assuming the Solver Is Live)

The generation engine currently ships **pipeline stages 1 (envelope) and 5
(validation) for real**; stages 2–4 (template selection, CP-SAT geometric
fitting, postprocessing) are not implemented yet (ADR-0003). Today,
`POST /v1/designs/generate` returns exactly **one** candidate containing
one hardcoded room placed inside the real, correctly-computed buildable
envelope, explicitly marked `"engine_mode": "stub"` in the response
metadata, and that one room is checked by the same real validators the
full solver will eventually use — it is not a fake or skipped validation
step.

Concretely, this means, today:

- `candidates` has length 1, always — there is no multi-candidate ranking
  to compare yet. The candidate-switcher UI should exist and be tested
  (see acceptance criteria above), but has nothing to switch between in
  practice until stage 2/3 ship.
- `why_selected` and `warnings` are minimal — the stub has no real
  template-selection or constraint-relaxation logic to explain, so there
  is little to say yet beyond whatever the real envelope/validation stages
  themselves produce.
- **`infeasible` is still reachable today**, even from the stub: because
  envelope computation and validation are real (not stubbed), an
  especially small lot or an aggressively setback-constrained one can
  legitimately cause the hardcoded room to fail validation, producing a
  genuine `infeasible` response. The graceful-degrade UI is not
  forward-looking, aspirational-only work — it is exercisable, and should
  be built and tested, today.
- The viewer must not special-case `engine_mode` in its own rendering
  logic. It should render whatever `candidates[]` array it actually
  receives, however long, with whatever `why_selected`/`warnings` content
  is actually present, however sparse — that behavior is already exactly
  what's needed for both today's stub and tomorrow's full solver output,
  which is the entire point of building the viewer against the *contract
  shape* (`docs/hld/generation-engine-contract.md`) rather than against
  either implementation's current behavior specifically.

This document describes the target behavior the real solver's output will
eventually grow into filling — not a description of what's live today
wherever the two differ, the "Current Implementation State" section above
governs.
