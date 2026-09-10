# ADR-0006: Generation Engine Is a Separate Python Service (FastAPI), Not Embedded in the Web App

Date: 2026-09-08

## Status

Accepted

## Context

Floor-plan generation depends on geometry and constraint-solving libraries —
Shapely (GEOS bindings) for 2D geometry, OR-Tools CP-SAT for combinatorial
constraint solving (ADR-0003) — that are best-in-class in Python and have no
comparably mature bundled equivalent in the JavaScript/TypeScript ecosystem.
That fixes the language for the generation logic; it does not by itself fix
*how* that Python code runs relative to the Next.js frontend/BFF. Three
options were considered.

**Framework: FastAPI vs. Django + DRF.** This service's only job is
answering a JSON API, quickly, with input it validates strictly. Auth lives
in Clerk (ADR-0009); there is no server-rendered admin UI or template engine
need on this service's own critical path. Django's batteries — the admin
site, the template engine, session-based auth — would mostly go unused.
Django + DRF was a real contender specifically for its free admin CRUD UI,
which would be genuinely useful for managing the template library
(`engine.templates` — content that non-engineers may eventually need to
curate). It was rejected for v1 because FastAPI's leaner, async-first fit
and native Pydantic-based validation plus auto-generated OpenAPI outweighed
that convenience at this stage; a Django-admin-style tool for template
curation remains an option to revisit later as a small, separate internal
tool rather than a reason to swap the whole engine's framework.

**Topology: a persistent service vs. spawning a script per request.** An
alternative to running a standing service at all was to spawn the Python
pipeline as a subprocess from a Next.js API route on demand — no separate
deployable, no internal network hop. This was rejected because CP-SAT solves
can take up to roughly 8 seconds, which risks hitting serverless function
execution timeouts on Vercel, and because a spawn-per-request approach
cannot be scaled, pooled, or observed independently of the web tier: no
dedicated logs/APM for solver behavior, no connection pooling for the
engine's own database access, no independent deploy or scaling cadence for
what is a CPU-bound workload distinct from the web tier's I/O-bound request
handling.

## Decision

The generation engine is a separate, persistently running service:
Python 3.12 + FastAPI, living in `services/generation-engine`, deployed
independently (Railway) from the Next.js app (Vercel). The Next.js BFF
communicates with it over internal HTTP (`POST /v1/designs/generate`, see
`docs/hld/generation-engine-contract.md`), configured via the
`GENERATION_ENGINE_URL` environment variable.

## Consequences

- Two deployables, two CI pipelines (path-filtered — see ADR-0010), two
  runtimes to operate (Vercel + Railway). This is a real increase in
  operational surface area compared to a monolith, accepted in exchange for
  independent scaling and the ability to use Python where it is genuinely
  the better tool.
- The web app and engine now share an explicit, versioned contract rather
  than an in-process function call — `docs/hld/generation-engine-contract.md`
  is load-bearing documentation, not a nice-to-have, and each generation
  request records the `engine_version` that produced it
  (`engine.design_generation_requests.engine_version`) so behavior changes
  are traceable.
- FastAPI's Pydantic validation and auto-generated OpenAPI schema give a
  natural, enforceable anchor for keeping that contract honest — a
  hand-rolled Flask or bare-WSGI service would leave this as a manual
  discipline instead of a structural one.
- The engine can be scaled and tuned independently for CPU-bound CP-SAT
  work, separate from the web tier's request-handling profile — relevant as
  usage grows, since a slow solve should not be able to starve unrelated web
  traffic on the same process pool.
- A network hop is now part of every "generate design" request
  (`docs/hld/system-architecture.md` walks the full request lifecycle) —
  acceptable because solve time already dominates end-to-end latency, but it
  does mean the BFF needs an explicit, bounded timeout and a real error/retry
  story (handled client-side via TanStack Query) rather than assuming a
  same-process call that can't fail independently.
- Choosing FastAPI over Django+DRF means template-library content curation
  (a non-engineering task) has no built-in admin UI today; if that becomes a
  real pain point, the fix is a small purpose-built internal tool, not a
  framework migration.
