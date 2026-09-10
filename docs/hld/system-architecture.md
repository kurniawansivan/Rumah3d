# System Architecture

How the pieces run at runtime, and what happens end to end for one
"generate design" call. For *why* the pieces are split this way, see
ADR-0006 (engine as a separate service), ADR-0007 (schema boundary),
ADR-0009 (auth), and ADR-0011 (local dev database).

## Deployed Topology

```
                       ┌───────────────────────────┐
                       │          Browser           │
                       │  wizard forms, 2D SVG      │
                       │  viewer, 3D (R3F) viewer   │
                       └─────────────┬─────────────┘
                                     │ HTTPS (public)
                                     ▼
                       ┌───────────────────────────┐
                       │      Vercel — apps/web      │
                       │      Next.js App Router      │
                       │      BFF route handlers      │
                       │      + Clerk (ADR-0009)      │
                       └───────┬───────────────┬─────┘
                   Prisma      │               │  HTTPS (internal —
              (app schema)     │               │  GENERATION_ENGINE_URL,
                                │               │  not linked from the
                                │               │  browser bundle)
                                │               ▼
                                │   ┌───────────────────────────┐
                                │   │  Railway — generation-      │
                                │   │  engine (FastAPI)           │
                                │   │  Shapely + OR-Tools CP-SAT   │
                                │   │  (ADR-0003, ADR-0006)        │
                                │   └─────────────┬─────────────┘
                                │       SQLAlchemy/Alembic │
                                │         (engine schema)  │
                                ▼                          ▼
                       ┌────────────────────────────────────────┐
                       │           Neon Postgres (one DB)          │
                       │  schema: app       │      schema: engine  │
                       │  users, projects    │  templates,          │
                       │                     │  room_type_norms,    │
                       │                     │  design_generation_  │
                       │                     │  requests,           │
                       │                     │  generated_design_   │
                       │                     │  versions             │
                       │        no physical FKs across the           │
                       │        app / engine boundary (ADR-0007)      │
                       └────────────────────────────────────────┘
```

Two independently deployed services (ADR-0006): `apps/web` on Vercel,
`services/generation-engine` on Railway. The browser only ever talks to
Vercel — the generation engine's URL is not part of the browser bundle and
is only ever called server-side, from the BFF. Both services connect to
the same Neon Postgres database but write only within their own logical
schema (`app` via Prisma migrations from `apps/web`, `engine` via Alembic
migrations from `services/generation-engine`), addressed via a
schema-scoped connection string (`?schema=app` / `?schema=engine`) rather
than a physically separate database (ADR-0007).

## Local Development Topology

Locally, the same logical shape runs differently (ADR-0011):

- `next dev` runs directly on the contributor's machine (not
  containerized) — it's the thing being actively worked on, so it isn't
  worth the container-rebuild latency.
- `docker compose up -d` (repo root `docker-compose.yml`) brings up a
  local Postgres container (`postgres:16-alpine`) and a
  `generation-engine` container built from
  `services/generation-engine`, wired to that local Postgres.
- `apps/web` points at both via `.env.local` (`DATABASE_URL` for the local
  Postgres' `app` schema, `GENERATION_ENGINE_URL=http://localhost:8000`
  for the local engine container) — the same environment-variable seams
  used in production, just pointed at local infrastructure instead of
  Neon/Railway.
- There is no local Clerk — Clerk is a hosted service in every
  environment, local development included (ADR-0009); there's nothing to
  containerize for it.

## Request Lifecycle: "Generate Design"

Walking one `POST /v1/designs/generate` call end to end, from the wizard's
Step 5 submit (`docs/prd/floor-plan-wizard.md`) to a rendered result
(`docs/prd/design-generation-viewer.md`):

1. **Submit.** The browser assembles the full design brief from wizard
   state and POSTs it to a Next.js BFF route handler in `apps/web` — never
   directly to the generation engine, which has no public browser-facing
   endpoint.
2. **Authenticate.** The route handler resolves the requesting user via
   the Clerk wrapper (ADR-0009). An unauthenticated request is rejected
   before any validation or database access happens.
3. **Authorize.** The BFF looks up the brief's `project_id` against
   `app.projects` via Prisma and confirms it belongs to the authenticated
   user. This is the API-layer validation ADR-0007 relies on in place of a
   cross-schema foreign key — it happens exactly once, here, before the
   engine ever sees a `project_id`.
4. **Validate.** The BFF re-validates the entire assembled brief against
   `designBriefSchema` (`packages/schemas`) server-side. This is the real
   trust boundary — whatever the browser already validated client-side was
   for responsiveness, not security.
5. **Translate.** The BFF maps a handful of wizard-level fields into the
   engine's wire shape — e.g. Step 4's single `prioritasSaatTidakMuat`
   choice becomes a per-entry `priority` tag on the relevant
   `room_program` entries, and `sertakanKamarTidurUtama` splits
   `jumlahKamarTidur` into separate `kamar_tidur`/`kamar_tidur_utama`
   entries. Full mapping in `docs/hld/generation-engine-contract.md`.
6. **Call the engine.** The BFF issues an HTTPS POST to
   `GENERATION_ENGINE_URL` + `/v1/designs/generate`, with a bounded
   timeout sized around CP-SAT's real solve-time budget (up to ~8s per
   ADR-0006), not around a same-process call's near-zero latency — a slow
   or failed engine call is an expected, handled case client-side (a
   TanStack Query retry/error state), not an assumed-away edge case.
7. **Engine validates and runs.** FastAPI validates the request against
   its own Pydantic schema, then runs the generation pipeline — today,
   the stub's real envelope + validation stages only; the target 5-stage
   pipeline once built (ADR-0003).
8. **Engine persists.** Before responding, the engine writes the request
   and every produced candidate to its own `engine` schema
   (`design_generation_requests`, `generated_design_versions` — see
   `docs/hld/data-model.md`) via SQLAlchemy/Alembic. This write is
   unconditional — a request's history is durable even if the HTTP
   response back to the BFF is subsequently lost (a timeout, a network
   blip).
9. **Engine responds.** Always HTTP 200, whatever the outcome — a
   successful `status` with up to 3 ranked candidates, or a structured
   `infeasible`/`partial` status with actionable `warnings` and however
   many candidates it did manage (`docs/prd/design-generation-viewer.md`'s
   graceful-degrade behavior). The engine never returns a 500 for an
   infeasible *input* — a 500 is reserved for the engine's own internal
   failures, not for "the room program didn't fit."
10. **BFF forwards.** The BFF passes the relevant response fields back to
    the browser as-is (it does not need to reshape engine geometry — the
    contract is designed to be renderable directly).
11. **Render.** The browser renders the result through the 2D SVG viewer
    and the 3D React Three Fiber viewer, both computed from the same
    `candidates[].floors` payload (ADR-0005), plus the side panel's
    `why_selected`/`warnings` (rendered only via the frontend's `rule_id`
    template dictionary, never raw engine text —
    `docs/prd/design-generation-viewer.md`) and the persistent legal
    disclaimer (ADR-0002). TanStack Query caches the response client-side
    so switching between already-fetched candidates, or navigating back to
    an already-viewed result, doesn't necessarily re-issue the request.

## Observability

Both services report errors to Sentry independently (`NEXT_PUBLIC_SENTRY_DSN`
for `apps/web`'s browser + server errors, `SENTRY_DSN` for the generation
engine) — a failure in one service's Sentry project is directly
attributable to that service, without needing to cross-reference logs
across Vercel and Railway by hand. Vercel Analytics covers page/route-level
web-vitals and traffic for `apps/web`. Neither tool has visibility into the
other platform natively — `request_id` (engine response metadata) is the
correlation key a developer uses to connect a BFF-side log/error to the
matching engine-side one for a single generation call.
