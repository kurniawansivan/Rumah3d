# Generation Engine Contract — `POST /v1/designs/generate`

The one HTTP contract between `apps/web` (the caller) and
`services/generation-engine` (the callee) — see
`docs/hld/system-architecture.md` for where this call sits in the overall
request lifecycle. The engine's Pydantic models are the schema of record;
`packages/schemas/src/generation-response.ts` is a hand-written TypeScript
mirror of the response shape, kept honest via the `sync-api-contract`
skill. There is no shared TS type for the *request* shape today — the BFF
assembles it from a validated `DesignBrief`
(`packages/schemas/src/design-brief.ts`) via a plain mapping function, and
the engine's own Pydantic model is the sole schema of record for what it
accepts; only the response is mirrored into `packages/schemas` today.

A few fields below are written out in more structural detail than the
abbreviated shapes used elsewhere in the docs — anywhere that happens, it's
called out explicitly as this doc's own necessary elaboration, not a
silent deviation from an already-fixed contract.

## Coordinate Convention

All geometry (`polygon`, `polyline` points) is planar, in **meters**,
relative to a per-design local origin — never latitude/longitude
(ADR-0007). The origin is the lot's front-left corner as seen when facing
the lot from the street (i.e. standing on the road, looking at `arahHadap`,
Step 1 of the wizard): the X axis runs left→right along the front edge,
the Y axis runs front→back (depth) into the lot. Both the 2D SVG viewer
and the 3D client-side extrusion consume this same coordinate space
directly — agreement on this convention is what makes ADR-0005's "2D and
3D can never disagree" guarantee hold in practice, not just in principle.

## Request

```
POST /v1/designs/generate

{
  project_id: string (UUID),               // app.projects.id — already
                                            // ownership-checked by the BFF
                                            // before this call is made
  lot: {
    length_m: number,
    width_m: number,
    facing: "utara" | "timur_laut" | "timur" | "tenggara" |
            "selatan" | "barat_daya" | "barat" | "barat_laut"
  },
  setbacks: {
    front_m: number,
    back_m: number,
    left_m: number,
    right_m: number
  },
  kdb_percent: number,
  klb_percent: number | null,              // null = not enforced
  floors: number,                          // 1-3
  room_program: [
    {
      type: string,                        // Indonesian room-type id,
                                            // e.g. "kamar_tidur_utama" —
                                            // see CLAUDE.md §4 / engine's
                                            // RoomType enum
      count: number,
      priority: "required" | "flexible"    // default "required" if omitted
    }
  ],
  amenities: {
    pool: {
      included: boolean,
      position_preference:
        "depan" | "belakang" | "samping" | "tidak_ada_preferensi" | null
    },
    kamar_pembantu: {
      included: boolean,
      with_bathroom: boolean
    }
  },
  style: "minimalis_modern" | "tropis" | "klasik" | "industrial",
  num_candidates: number                   // 1-3; the wizard's BFF always
                                            // sends 3 today (no user-facing
                                            // control yet — see
                                            // docs/prd/floor-plan-wizard.md)
}
```

Field notes:

- **`lot`/`setbacks`/`kdb_percent`/`klb_percent`/`floors`/`style`** map
  directly from Steps 1, 2, and 4 of the wizard
  (`docs/prd/floor-plan-wizard.md`) — one wizard field to one request
  field, no translation logic involved.
- **`setbacks.left_m`/`right_m`** are modeled independently even though the
  wizard's Step 2 today collects a single "GSB samping" value and the BFF
  sends it as both — this keeps the contract forward-compatible with a
  more precise corner-lot (`posisiLahan: 'sudut'`) treatment later, without
  a breaking contract change when that ships.
- **`room_program`** is where the wizard's Step 3 answers land, with two
  translations the BFF performs before calling the engine:
  - `jumlahKamarTidur` + `sertakanKamarTidurUtama` become up to two
    entries — a `kamar_tidur_utama` entry (count 1) if included, and a
    `kamar_tidur` entry for the rest — never one conflated entry, since
    they carry distinct size norms (`engine.room_type_norms`,
    `docs/hld/data-model.md`).
  - Step 4's single `prioritasSaatTidakMuat` choice (`kamar` vs.
    `ruang_komunal`) becomes a `priority` tag on every relevant entry:
    everything in the protected category is tagged `required`; everything
    in the other category is tagged `flexible`. `priority` is the field
    stage 3 (CP-SAT fitting) and stage 4 (postprocessing) consult to
    decide what may shrink, merge, or drop first when the full program
    doesn't fit — see "Graceful Degrade" below and
    `docs/prd/design-generation-viewer.md`.
  - A room type the user didn't want is simply absent from the array —
    there is no explicit `count: 0` entry.
- **`amenities`** covers the two program items that aren't modeled as
  countable rooms: a pool (with a position preference the solver treats as
  a soft objective, not a hard constraint — it tries, but an infeasible
  position preference alone should never be why a design fails) and
  kamar pembantu (with an attached bathroom as a sub-flag, since a helper's
  room is very commonly requested with one, per Step 3's `sertakanKmPembantu`).
- **`num_candidates`** bounds how many ranked candidates the engine
  attempts to return (max 3, enforced by validation) — it is a ceiling, not
  a guarantee; an engine that can only find one feasible layout returns
  one, even if 3 were requested.

## Response

```
{
  request_id: string (UUID),
  status: "success" | "partial" | "infeasible",
  candidates: [
    {
      version_id: string (UUID),
      template: { id: string (UUID), code: string } | null,
      floors: [
        {
          level: number,                    // 0 = ground floor
          height_m: number,
          rooms: [
            {
              id: string,
              type: string,                  // Indonesian room-type id
              polygon: [[number, number], ...],
              area_m2: number
            }
          ],
          walls: [
            {
              id: string,
              polyline: [[number, number], ...],
              thickness_m: number,
              is_exterior: boolean,
              height_m: number
            }
          ],
          openings: [
            {
              id: string,
              type: "door" | "window",
              wall_id: string,               // references walls[].id
              offset_m: number,               // distance along the wall's
                                               // polyline from its start
              width_m: number,
              height_m: number
            }
          ]
        }
      ],
      stairs: [
        {
          id: string,
          from_level: number,
          to_level: number,
          polygon: [[number, number], ...]
        }
      ],                                     // always [] when floors == 1
      roof: { type: "pelana" | "limasan" | "datar", pitch_deg: number } | null,
      metadata: {
        engine_version: string,
        engine_mode: "stub" | "solver",
        why_selected: [{ rule_id: string, params: object }],
        objective_breakdown: {
          [objective_name: string]: number    // e.g. adjacency_score,
                                               // compactness_score,
                                               // facing_alignment_score —
                                               // engine-internal, subject
                                               // to change; used to rank
                                               // candidates.length > 1
                                               // against each other, not
                                               // guaranteed stable across
                                               // engine_version values
        },
        warnings: [{ rule_id: string, params: object }],
        solver: {
          status: "optimal" | "feasible" | "infeasible" | "stub",
          solve_time_ms: number,
          seed: number
        }
      },
      validation: {
        passed: boolean,
        checks: [{ rule_id: string, passed: boolean, params: object }]
      }
    }
  ]
}
```

Field notes:

- **`request_id`** is the correlation key across the BFF's and the
  engine's independent logs/Sentry projects for one generation call
  (`docs/hld/system-architecture.md`'s Observability section).
- **`why_selected` / `warnings` / `validation.checks`** are all
  `{rule_id, params}`-shaped (`validation.checks` additionally carries
  `passed` per check) — structured, never free text, per ADR-0003. The
  frontend's `rule_id → Indonesian sentence` template dictionary
  (`docs/prd/design-generation-viewer.md`) is the only thing that ever
  turns any of these into words a user reads; the engine's job stops at
  producing the structured facts.
- **`why_selected` vs. `objective_breakdown`** answer two different
  questions: `why_selected` explains *rule-based* decisions (which
  template, which placement rule fired) in a form meant to eventually
  reach the user; `objective_breakdown` is the *scored* ranking
  information (a map of named objective components) used to order
  `candidates` against each other, aimed more at power-user
  candidate-comparison UI or debugging than at a first-read explanation.
- **`validation.passed`** is expected `true` for every entry that actually
  appears in `candidates` — stage 5 (validation) is a gate, not a report
  card: geometry that fails validation is never returned as a candidate at
  all. `validation.checks` is exposed anyway, in full, for transparency —
  so a user's eventual architect (or a curious user) can see exactly which
  checks ran and passed, not just trust an opaque "passed: true".
- **`engine_mode`** is `"stub"` today, `"solver"` once the real pipeline
  ships (ADR-0003) — see "Current State" below. `engine_version` mirrors
  the same value persisted to
  `engine.design_generation_requests.engine_version` (ADR-0006), included
  in the response for client-side/debugging convenience even though the
  database row is the durable record of it.

### The `infeasible` Convention

`status: "infeasible"` still returns exactly **one** entry in `candidates`,
not an empty array — with `template: null`, `floors: []`, `stairs: []`,
`roof: null`, `validation: {passed: false, checks: [...]}`, and a populated
`metadata.warnings` explaining exactly which constraint(s) blocked even the
required-priority room program from fitting. This keeps one uniform shape
for every response status — the frontend never needs a separate parsing
path for "no candidates array at all" versus "candidates array with
content" — at the cost of that single entry's geometry fields being
empty/null by convention rather than absent.

`status` reflects the **top-ranked** candidate's outcome specifically:

- **`success`** — `candidates[0]` fulfilled the entire room program,
  required and flexible entries alike, with no compromises.
- **`partial`** — even the best candidate needed to shrink, merge, or drop
  at least one `flexible`-priority entry to fit. `candidates` still
  contains real, usable geometry — this is the normal "graceful degrade"
  outcome, not a failure state (`docs/prd/design-generation-viewer.md`).
- **`infeasible`** — no candidate could satisfy even the `required`-
  priority room program. The single placeholder entry above is what the
  frontend renders its dedicated "tidak muat" state from.

### HTTP Status Codes

- **`200`** for every request the engine successfully processed, whatever
  the outcome — `success`, `partial`, and `infeasible` are all `200`
  responses distinguished by the `status` field, never by HTTP status
  (ADR-0003: an infeasible *input* is an expected, structured outcome, not
  a server error).
- **`422`** for a request that fails the engine's own Pydantic validation
  (malformed shape, out-of-range value) — this should be unreachable in
  practice, since the BFF validates the brief against
  `designBriefSchema` before translating and calling the engine, but the
  engine validates independently regardless rather than trusting its
  caller.
- **`500`** reserved for genuine internal engine failures (an unhandled
  exception, a database write failure) — never used for "the room program
  didn't fit."

There is currently no per-request authentication between the BFF and the
engine beyond the engine's URL not being published anywhere
client-reachable. A shared internal-secret header is a reasonable,
low-effort hardening step worth adding as the product matures — not yet
implemented, and not a blocker for the contract described here.

## Pipeline Stages (Target)

1. **Envelope** — the lot polygon inset by `setbacks` on each side,
   intersected with the max footprint `kdb_percent` allows (ground floor)
   and the cumulative area `klb_percent` allows (all floors together).
2. **Template selection** — filter `engine.templates` by `style`, `floors`,
   room-program fit, and minimum lot dimensions; rank the surviving
   templates as candidate skeletons.
3. **CP-SAT geometric fitting** — place rooms as 2D interval variables
   with `AddNoOverlap2D`, soft adjacency objectives, and optional-presence
   variables for `flexible`-priority entries (so the solver can try
   *without* an entry, not just fail outright, when it doesn't fit) —
   single-threaded with a fixed seed for determinism (ADR-0003).
4. **Postprocessing** — derive walls from room adjacency and the envelope
   boundary, place openings (doors respecting circulation connectivity,
   windows on exterior walls), place stairs when `floors > 1`, select a
   roof.
5. **Validation** — re-check no overlaps, full envelope containment,
   KDB/KLB compliance, room-program fulfillment (per each entry's
   `priority`), and circulation connectivity (via `networkx`,
   `docs/techstack.md`). Only geometry that passes becomes a returned
   candidate, up to `num_candidates`, ranked by `objective_breakdown`.

## Current State — Stub, Not the Full Pipeline

Today, `services/generation-engine` implements **stages 1 (envelope) and 5
(validation) for real**; stages 2–4 are not implemented. Concretely:

- Every response has exactly one entry in `candidates`, `metadata.engine_mode:
  "stub"`, and `metadata.solver.status: "stub"`.
- That one candidate's geometry is one hardcoded room placed inside the
  real, correctly-computed envelope from stage 1 — not a fake shape, but
  not a solved layout either.
- That hardcoded room is checked by the same real stage-5 validators the
  full pipeline will use — so `infeasible` is genuinely reachable today
  (an especially small or setback-constrained lot can legitimately fail
  validation), even though `partial` is not yet meaningfully reachable
  (there is nothing for the stub to compromise on — no template selection,
  no flexible-entry relaxation logic exists yet).
- `why_selected` and `objective_breakdown` are minimal/near-empty today,
  since there is no template-selection or ranking logic yet to explain.

This document describes the target contract behavior stages 2–4 will grow
into fulfilling — every field above is meaningful today for stages 1 and 5,
and already load-bearing for the frontend to build and test against (via
the `new-plan-fixture` skill) ahead of the full solver landing, not a
speculative shape to revisit later.
