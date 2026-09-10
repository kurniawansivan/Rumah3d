# ADR-0007: Data Storage — JSONB Geometry, and a No-Cross-FK Schema Ownership Boundary

Date: 2026-09-08

## Status

Accepted

## Context

This ADR covers two related persistence decisions that both come down to
"how do the web app's data and the engine's data share a database without
sharing an owner."

**(a) Schema ownership boundary.** The product has two independently
evolving persistence concerns: application data — users, projects — owned
and migrated from `apps/web` via Prisma; and generation-engine data —
templates, room-type norms, generation requests, generated design versions —
owned and migrated from `services/generation-engine` via Alembic. These two
concerns need a database topology decision: fully shared schema, fully
separate databases, or something in between. A shared schema tightly couples
two independent migration tools against the same tables, which is fragile.
Fully separate physical databases give full isolation but add real cost and
operational overhead (two databases to provision, connection-pool, and back
up) that this stage of the product — one small team, modest scale — doesn't
yet need.

**(b) Geometry storage.** Generated floor-plan geometry (rooms, walls,
openings, as polygons and polylines) needs to be persisted once the engine
produces it. The obvious alternative to a plain document store is PostGIS —
Postgres's geospatial extension, with spatial indexing and geodesic
operators.

## Decision

**(a)** One physical Postgres database, two logical schemas: `app` (owned
and migrated exclusively by Prisma, from `apps/web`) and `engine` (owned and
migrated exclusively by Alembic, from `services/generation-engine`). There
are **no physical foreign keys across the schema boundary**. Cross-references
that do exist — `project_id` and `user_id` appearing on `engine` tables —
are plain UUID columns, validated at the API layer (the BFF only ever
forwards a `project_id` it has already confirmed belongs to the requesting
user) rather than enforced by a database constraint. See
`docs/hld/data-model.md` for the full table definitions this produces.

**(b)** Floor-plan geometry is stored as Postgres JSONB documents
(`engine.generated_design_versions.geometry`, and related JSONB columns),
not modeled as PostGIS geometry columns, and PostGIS is not enabled.

## Consequences

**(a) Schema boundary:**

- A new contributor (or agent) must know that `app.*` and `engine.*` are
  migrated by different tools, and must never hand-edit one schema's tables
  through the other tool's migration history.
- Referential integrity between, e.g., `app.projects.id` and
  `engine.design_generation_requests.project_id` is **not** enforced by
  Postgres. A bug in API-layer validation could leave an orphaned
  engine-side row pointing at a deleted project. This is an accepted risk at
  this stage — mitigations such as a periodic reconciliation job, or
  preferring soft-delete over hard-delete on `app.projects`, are noted as
  follow-up work, not built for v1.
- The absence of a physical FK is what makes the two schemas' migration
  histories genuinely independent — Prisma Migrate never needs to know
  `engine` exists and vice versa, which is the entire point of splitting
  ownership in the first place.
- One physical database keeps cost and operational complexity low for now
  (one Neon project, one connection story, one backup policy). If `app` and
  `engine` later need independent scaling, independent backup/restore
  cadences, or independent access control, splitting into two physical
  databases is a mechanical move specifically *because* there's no
  cross-schema FK to untangle first — this ADR's boundary was chosen to make
  that future split cheap, not to rule it out.

**(b) JSONB geometry:**

- Floor-plan geometry is local and planar — coordinates are meters from a
  lot origin, not latitude/longitude — so PostGIS's actual value
  proposition (spatial indexing, geodesic distance, SRS-aware queries,
  map-tile-scale operations) doesn't apply to a handful of room/wall
  polygons per design version.
- All real geometric computation (overlap checks, area calculation, setback
  buffering) already happens in Shapely, inside the engine process, before
  anything is persisted. Postgres's job here is durable storage of an
  already-validated document, not computing over geometry — so a document
  store is the right level of tool.
- JSONB allows the geometry shape (which fields exist on a room, a wall, an
  opening) to evolve without a schema migration for every change — at the
  cost of not being able to run structural SQL queries over geometry
  internals (e.g. "all designs with a room over 20 m²" would go through the
  application layer, not a SQL `WHERE` clause). Nothing today needs that
  query pattern.
- If the product later adds a genuinely geospatial feature — geocoded lot
  addresses, map-based lot search — that is an additive, separate decision
  (PostGIS, or a dedicated geo service) and does not require revisiting this
  ADR's choice for *plan* geometry, which stays local/planar regardless.
