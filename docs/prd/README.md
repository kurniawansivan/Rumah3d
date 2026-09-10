# Rumah3d — Product Vision, Scope & Success Criteria

This is the entry point for *what* Rumah3d is and *who* it's for. Individual
feature specs (`floor-plan-wizard.md`, `design-generation-viewer.md`) go
deep on specific flows; this file sets the boundary they all have to stay
inside. If a feature idea doesn't fit the non-goals below, it needs a new
ADR superseding the relevant locked decision before it becomes a feature —
not a quiet exception carved out at the PRD level (see root `CLAUDE.md` §1
and §13).

## Vision

Rumah3d turns a plot of land and a room program — bedroom count, bathroom
count, floors, a pool, a preferred style — into a schematic 2D floor plan
(denah) and a matching 3D visualization in minutes, so an Indonesian
homeowner planning a self-build or renovation has something concrete to
react to, refine, and eventually hand to a licensed architect, instead of
starting that conversation from a blank page.

## Target User / Persona

The primary user is an Indonesian homeowner (or land buyer) planning a
self-build or renovation who:

- Already has, or is close to acquiring, a specific plot of land (kavling)
  with known dimensions, and a rough sense of the room program they want
  (jumlah kamar tidur, kamar mandi, carport, and so on — see
  `floor-plan-wizard.md` for the full field set).
- Is **not yet ready to pay an architect's fee** to find out whether that
  program even fits the lot, or what it might look like — the cost of
  professional design services is a real barrier to taking the first step,
  not a step they're avoiding out of choice.
- Is not a designer and has no CAD/drafting skill or vocabulary — the
  wizard's inputs and the plan's presentation both need to work for
  someone whose only frame of reference is "how many bedrooms" and "which
  direction the house faces," not architectural drawing conventions.
- Ultimately still intends to engage a licensed architect or contractor
  before building anything — Rumah3d's job is to make that later
  conversation more concrete and more efficient, not to replace it (see
  ADR-0002).

A secondary, smaller audience is early-career architects or drafters who
might use Rumah3d as a fast way to explore options with a client before
investing in a bespoke design — the product is not built around this user,
but nothing in the product should actively work against them either.

## Goals

- Take a user from lot dimensions + room program to a concrete, visualized
  2D plan and 3D massing, in one sitting, without requiring any design
  skill or vocabulary.
- Make every generated plan legible and *explainable*, not just
  visually plausible — both the homeowner and the architect they
  eventually engage should be able to see *why* a room is placed where it
  is (see `design-generation-viewer.md`'s `why_selected`/`warnings`
  surfacing), because an unexplainable plan cannot function as a
  trustworthy starting point for that later professional conversation
  (ADR-0002, ADR-0003).
- Speak the user's actual domain vocabulary natively — KDB/KLB/GSB,
  dapur kotor/bersih, kamar pembantu, mushola — rather than forcing
  Indonesian residential conventions through generic, translated room
  categories (root `CLAUDE.md` §4).
- Keep the wizard short enough (5 steps, see `floor-plan-wizard.md`) that
  completing it feels closer to "filling out a form" than "commissioning a
  design."
- Degrade gracefully, with actionable feedback, when a requested room
  program doesn't fit the lot — never silently force-fit an invalid
  layout, and never fail with an opaque error (`design-generation-viewer.md`).

## Non-Goals

These restate the four locked scope decisions from root `CLAUDE.md` §1,
each backed by its own ADR. They are product non-goals, not a prioritized
backlog — a feature that would cross one of these lines needs a new ADR
superseding the relevant one first, not a product decision made in
isolation.

1. **Not a construction-ready (DED) document, and not PBG-submittable.**
   Rumah3d's output is a concept/schematic starting point, never a
   substitute for a licensed architect's stamped drawings (ADR-0002). Every
   user-facing generated output carries the disclaimer below, persistently
   and visibly — not as a one-time terms-of-service checkbox.
2. **Not a generative-ML design tool.** Floor-plan generation is a
   deterministic, explainable pipeline — curated templates plus a
   constraint solver — and will not become an ML/diffusion model without a
   new ADR superseding ADR-0003 (root `CLAUDE.md` §12).
3. **Not a structural or MEP engineering tool.** No foundation/column/beam
   sizing, no electrical or plumbing calculations, ever, without a new ADR
   superseding ADR-0004 — this is a liability-scope boundary, not a
   missing-feature backlog item.
4. **Not a CAD/BIM export tool.** The 3D view is visualization-only,
   generated client-side from the same validated 2D plan; there is no
   IFC/DWG or other CAD/BIM export (ADR-0005).

## Success Metrics

- **Wizard completion rate** — of users who start the wizard (step 1), what
  fraction reach "Review & generate" (step 5) and submit. Measures whether
  the input flow itself is the right length and complexity for the target
  persona.
- **% of generated designs a user takes to an actual architect** — the
  headline metric, directly reflecting ADR-0002's premise: the product is
  judged on producing a useful *starting point* for a professional
  conversation, not on whether its output is buildable as-is. Approximated
  via an explicit in-product action (e.g. an export/share step framed
  around "bring this to your architect") rather than inferred silently.
- **Time to first generated design** — from wizard start to a completed
  (non-infeasible) `POST /v1/designs/generate` response the user views.
  A proxy for whether the tool delivers on "concrete answer in minutes."
  Notably not gated on solver performance today, since the engine
  currently runs as a stub (`docs/hld/generation-engine-contract.md`).
- **Graceful-degrade recovery rate** — of users who receive an infeasible
  or partial result, what fraction adjust inputs and successfully generate
  a fulfilling design afterward, versus abandoning. Measures whether the
  degrade experience (`design-generation-viewer.md`) actually helps users
  recover rather than just informing them of failure.
- **Regeneration/iteration count per project** — a light engagement signal
  distinguishing "user explored a few variations and picked one" (healthy)
  from "user generated once and left" (ambiguous) or "user regenerated
  dozens of times without success" (a graceful-degrade or template-coverage
  problem worth investigating).

## Legal Disclaimer

Every user-facing generated design output — every 2D plan view, every 3D
view, every export or share action — must carry this exact Indonesian
disclaimer, verbatim, per ADR-0002:

> Bukan dokumen konstruksi final — konsultasikan ke arsitek/insinyur
> berlisensi sebelum membangun.

This is product-critical copy, not legal boilerplate to be minimized,
reworded, or styled into invisibility. It must never be removed, softened,
or made conditional (root `CLAUDE.md` §7, §12). The exact wording is
subject to a legal review pass before public launch (ADR-0002 already
notes this); until that review changes it, this is the copy every surface
uses.
