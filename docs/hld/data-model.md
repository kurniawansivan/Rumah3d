# Data Model

One physical Neon Postgres database, two logical schemas — `app` (owned
and migrated by Prisma, from `apps/web`) and `engine` (owned and migrated
by Alembic, from `services/generation-engine`) — per ADR-0007. Table
definitions below are written as Postgres DDL for precision; the actual
schema of record is each side's migration history (`apps/web/prisma/schema.prisma`,
`services/generation-engine`'s Alembic revisions), not this document — if
they drift, the migrations win and this doc needs fixing.

## `app` Schema (Prisma, `apps/web`)

### `app.users`

Minimal denormalized profile data joined against `app.projects`. Clerk
(ADR-0009) is the actual system of record for identity, credentials, and
sessions — this table exists only so the rest of `app` has something to
foreign-key against.

```sql
CREATE TABLE app.users (
  id          TEXT PRIMARY KEY,             -- the Clerk user id (e.g.
                                             -- "user_2abc...") — not a
                                             -- DB-generated UUID; Clerk
                                             -- assigns it, this table just
                                             -- stores it
  email       TEXT NOT NULL UNIQUE,
  name        TEXT,                         -- nullable: may not be
                                             -- collected at sign-up time
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `app.projects`

One row per lot/design project a user is working on — the anchor
everything else (wizard state, generation requests) is ultimately scoped
to.

```sql
CREATE TABLE app.projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL REFERENCES app.users(id),
                                             -- physical FK is fine here —
                                             -- both tables live in `app`,
                                             -- migrated by the same tool
  name          TEXT NOT NULL,              -- user-facing project label,
                                             -- e.g. "Rumah Depok"
  lot_length_m  NUMERIC(6,2) NOT NULL,
  lot_width_m   NUMERIC(6,2) NOT NULL,
  lot_polygon   JSONB,                      -- nullable: a precise surveyed
                                             -- boundary, if the user has
                                             -- one, beyond the simple
                                             -- length x width rectangle
                                             -- the wizard assumes by
                                             -- default (docs/prd/floor-
                                             -- plan-wizard.md Step 1)
  region_code   TEXT,                       -- nullable: a kabupaten/kota
                                             -- or kecamatan code, reserved
                                             -- for a future per-region
                                             -- GSB/KDB/KLB default lookup
                                             -- — not consumed anywhere yet;
                                             -- Step 2 of the wizard is
                                             -- fully manual v1 today
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX projects_user_id_idx ON app.projects (user_id);
```

## `engine` Schema (Alembic, `services/generation-engine`)

### `engine.templates`

The curated template library ADR-0003's pipeline stage 2 selects from —
this is the "content" a human curator authors and maintains, not something
the solver invents.

```sql
CREATE TABLE engine.templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              TEXT NOT NULL UNIQUE,   -- stable, human-referenceable
                                             -- slug (e.g. "MIN-2BR-1FL-A")
                                             -- — what a curator and
                                             -- `why_selected` entries cite,
                                             -- not the opaque UUID
  name              TEXT NOT NULL,
  floors_min        SMALLINT NOT NULL,
  floors_max        SMALLINT NOT NULL,
  room_program_fit  JSONB NOT NULL,         -- which room types/counts this
                                             -- template's skeleton can
                                             -- accommodate, and in what
                                             -- zoning slots — the input to
                                             -- stage 2's filtering
  zoning_graph      JSONB NOT NULL,         -- the adjacency graph this
                                             -- template encodes (which
                                             -- room slots must/should
                                             -- neighbor which) — read by
                                             -- stage 3's soft-adjacency
                                             -- objective and stage 5's
                                             -- circulation-connectivity
                                             -- check
  style_tags        TEXT[] NOT NULL,        -- e.g. {minimalis_modern,
                                             -- tropis} — matched against
                                             -- the wizard's gayaArsitektur
  min_lot_length_m  NUMERIC(6,2) NOT NULL,
  min_lot_width_m   NUMERIC(6,2) NOT NULL,
  version           INTEGER NOT NULL DEFAULT 1,
                                             -- content version of this
                                             -- template's authored
                                             -- definition — bumped when a
                                             -- curator revises an existing
                                             -- template's fit/zoning
                                             -- rather than authoring a new
                                             -- template row
  is_active         BOOLEAN NOT NULL DEFAULT true,
                                             -- soft-disable without
                                             -- deleting — already-
                                             -- generated
                                             -- generated_design_versions
                                             -- rows still reference this
                                             -- id and must keep resolving
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `engine.room_type_norms`

Size norms per Indonesian room-type identifier — what stage 3's solver
treats as an acceptable room size, and what stage 5's validation checks
actual placed rooms against.

```sql
CREATE TABLE engine.room_type_norms (
  room_type    TEXT PRIMARY KEY,            -- Indonesian room-type id,
                                             -- e.g. "kamar_tidur_utama"
                                             -- (CLAUDE.md §4) — the same
                                             -- identifier space
                                             -- room_program[].type and the
                                             -- response's rooms[].type use
  min_area_m2  NUMERIC(5,2) NOT NULL,
  max_area_m2  NUMERIC(5,2),                -- nullable: some room types
                                             -- (e.g. a garden) have no
                                             -- meaningful upper bound
  min_width_m  NUMERIC(4,2) NOT NULL        -- narrowest allowed dimension
                                             -- — stops a technically
                                             -- area-compliant but
                                             -- unusably sliver-shaped room
);
```

### `engine.design_generation_requests`

One row per `POST /v1/designs/generate` call — the durable, verbatim
record of what was asked, independent of the engine's response and
independent of whatever `app.projects` looks like afterward (a project's
lot data can be edited later; this snapshot doesn't drift with it).

```sql
CREATE TYPE engine.request_status AS ENUM
  ('pending', 'success', 'partial', 'infeasible', 'error');

CREATE TABLE engine.design_generation_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL,            -- app.projects.id — plain
                                             -- UUID column, NOT a physical
                                             -- FK (see "Cross-Schema
                                             -- Boundary" below)
  requested_by    TEXT NOT NULL,            -- app.users.id (Clerk user
                                             -- id) — same treatment
  input_snapshot  JSONB NOT NULL,           -- the exact request payload
                                             -- sent to the engine,
                                             -- verbatim
  engine_version  TEXT NOT NULL,            -- which build/version of the
                                             -- engine processed this
                                             -- request (ADR-0006)
  status          engine.request_status NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX design_generation_requests_project_id_idx
  ON engine.design_generation_requests (project_id);
```

### `engine.generated_design_versions`

One row per candidate the engine ever returned, across every request a
project has made — including regenerations after a user tweaks their
inputs and tries again. `version_number` is scoped **per project**, not
per request: it's a running count across a project's entire generation
history, which is what makes `is_selected` a meaningful "which version did
the user ultimately go with, out of everything they've tried" flag rather
than just "which of one call's candidates."

```sql
CREATE TABLE engine.generated_design_versions (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id                  UUID NOT NULL
                               REFERENCES engine.design_generation_requests(id),
                                             -- physical FK is fine — same
                                             -- schema, same Alembic
                                             -- migration history
  project_id                  UUID NOT NULL, -- denormalized from the
                                             -- parent request; plain UUID,
                                             -- no cross-schema FK — kept
                                             -- here too so a version can
                                             -- be queried directly by
                                             -- project without an extra
                                             -- join back to
                                             -- design_generation_requests
  version_number              INTEGER NOT NULL,
  template_id                 UUID REFERENCES engine.templates(id),
                                             -- nullable: null for the
                                             -- infeasible-response
                                             -- placeholder entry (see
                                             -- docs/hld/generation-engine-
                                             -- contract.md)
  geometry                    JSONB NOT NULL, -- the full floors/stairs/
                                             -- roof payload as returned to
                                             -- the client — JSONB, not
                                             -- PostGIS (ADR-0007)
  rules_applied                JSONB NOT NULL, -- the response's
                                             -- `why_selected`:
                                             -- [{rule_id, params}]
  parameters                   JSONB NOT NULL, -- the resolved input this
                                             -- version was generated
                                             -- from (lot/setbacks/kdb/
                                             -- klb/room_program/
                                             -- amenities/style) —
                                             -- effectively a denormalized
                                             -- copy of the parent
                                             -- request's input_snapshot,
                                             -- kept on the version row so
                                             -- it can be queried without a
                                             -- join
  objective_score               NUMERIC,     -- overall ranking score
                                             -- derived from the response's
                                             -- objective_breakdown; null
                                             -- for the infeasible
                                             -- placeholder
  solver_status                 TEXT NOT NULL, -- mirrors the response's
                                             -- metadata.solver.status
                                             -- ("optimal"/"feasible"/
                                             -- "infeasible"/"stub")
  solve_time_ms                  INTEGER,
  validation_report              JSONB NOT NULL, -- {passed, checks: [...]}
  total_building_footprint_m2    NUMERIC(8,2), -- ground-floor footprint
                                             -- area — the actual
                                             -- KDB-relevant figure,
                                             -- precomputed here for fast
                                             -- querying/reporting without
                                             -- re-parsing the geometry
                                             -- JSONB every time
  is_selected                    BOOLEAN NOT NULL DEFAULT false,
                                             -- which version the user
                                             -- actually picked, if any —
                                             -- set by the BFF once the
                                             -- user chooses in the viewer
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX generated_design_versions_request_id_idx
  ON engine.generated_design_versions (request_id);
CREATE INDEX generated_design_versions_project_id_idx
  ON engine.generated_design_versions (project_id);
```

## Cross-Schema Boundary

`project_id` (on both `engine` tables above) and `requested_by` are plain
UUID/TEXT columns — there is **no physical foreign key** from `engine` back
to `app.projects` or `app.users`, and never will be under the current
schema-ownership decision (ADR-0007). Referential correctness is enforced
at the API layer instead: the BFF only ever forwards a `project_id` it has
already confirmed, via Prisma, belongs to the authenticated user
(`docs/hld/system-architecture.md`'s request lifecycle, step 3) — by the
time a row is written to `engine.design_generation_requests`, the
reference has already been validated once; the database itself does not
re-check it and cannot enforce it.

Practical consequences:

- Prisma's migration history never needs to know `engine.*` tables exist,
  and Alembic's never needs to know about `app.*` — the two migration
  tools stay genuinely independent, which is the entire reason this
  boundary exists.
- A bug in BFF-side validation could in principle leave an
  `engine.design_generation_requests` row pointing at a `project_id` that
  no longer exists in `app.projects` (e.g. a deleted project) — accepted as
  a known risk at this stage, per ADR-0007; a periodic reconciliation job
  or preferring soft-delete on `app.projects` are noted follow-ups, not
  built for v1.
- Querying "all generation requests for a project" or "does this project
  belong to this user" always means two separate queries against two
  separate schemas — there is no single SQL join that can do it, by
  design.
