# ADR-0002: Product Scope Is Concept/Schematic Design Only

Date: 2026-09-08

## Status

Accepted

## Context

Indonesia's building permit process (PBG — Persetujuan Bangunan Gedung)
requires drawings stamped by a licensed architect (arsitek berlisensi) before
a house can legally be built. Producing construction-ready documents — what
Indonesian practice calls DED (Dokumen Enjiniring Detail) — is a regulated
professional activity with real liability attached: an error in a permit-
grade drawing can mean an unsafe or non-compliant building, and the
professional who stamped it is accountable for that.

Rumah3d's actual value, and the gap it fills, sits earlier than that: an
Indonesian homeowner planning a self-build or renovation typically has only a
rough sense of what they want — a room count, a lot, a vague style — and no
easy way to turn that into something concrete before they can justify paying
an architect's fee to find out whether it even fits. That "rough idea to
visual starting point" step is where this product lives. It is explicitly
*not* trying to be a cheaper substitute for the licensed architect who
produces the permit-ready design.

Two paths were available: (a) build toward construction-grade output over
time, competing directly with licensed architectural services and inheriting
their liability, or (b) lock the product permanently to the
concept/schematic stage and be explicit about the handoff to a licensed
professional. Because this decision determines what data the system is
allowed to imply is correct (see ADR-0004 for the structural/MEP corollary),
it has to be made early and applied consistently, not discovered gradually
per feature.

## Decision

Rumah3d is a concept/schematic design tool only. It helps a user explore and
communicate a floor plan and 3D massing before a licensed architect is
engaged — it does not produce, and will never claim to produce, a
construction-ready or PBG-submittable document.

Every user-facing output — every 2D plan view, every 3D view, every export or
share action — must carry a visible disclaimer:

> "Bukan dokumen konstruksi final — konsultasikan ke arsitek/insinyur
> berlisensi sebelum membangun."

This is not a one-time terms-of-service checkbox; it is a persistent, visible
element wherever a generated design is shown or leaves the app (see
`docs/prd/design-generation-viewer.md` for exact placement).

## Consequences

This decision is the foundation the other three locked scope decisions build
on (ADR-0003, ADR-0004, ADR-0005 all narrow the product further within this
boundary), and it directly shapes the target persona and success metrics in
`docs/prd/README.md`: the product is judged on whether it produces a useful
*starting point* for a professional conversation (e.g. "% of generated plans
a user takes to an actual architect"), not on whether its output is
buildable as-is.

Practically:

- No feature may be justified on the grounds that it makes the output "more
  construction-ready" — that is explicitly out of scope, not a roadmap item.
- The disclaimer copy is product-critical, not legal boilerplate to be
  minimized or styled into invisibility; any redesign of the viewer or export
  flow must keep it prominent. The exact Indonesian wording should get a
  legal review pass before public launch — this ADR fixes the *policy*
  (always disclose, always in this spot in the flow), not necessarily the
  final legally-reviewed sentence.
- Support/marketing copy must not describe outputs as "ready to build" or use
  language that could be read as a permit or construction guarantee.
- Because the product deliberately stops short of construction-grade output,
  every generated layout must still be *trustworthy as a starting point* —
  which is what motivates keeping generation deterministic and explainable
  rather than an opaque model (ADR-0003): a user's architect needs to be able
  to look at the plan and understand it, not just receive a picture.
