# ADR-0009: Auth Is Clerk (Managed Auth-as-a-Service), Not Self-Hosted Auth.js/NextAuth

Date: 2026-09-09

## Status

Accepted

## Context

Rumah3d needs production-grade authentication before it can persist
anything meaningful per user: a project (`app.projects`, see
`docs/hld/data-model.md`) only makes sense tied to an identified owner.
"Production-grade" here means more than a login form — it means session
handling that doesn't leak or fixate sessions, secure credential storage
(or, better, no password storage at all), rate-limited and abuse-resistant
OTP delivery, and account-recovery flows that don't become an ongoing
support burden for a small team.

The Indonesian consumer market skews toward phone-number identity and
WhatsApp/SMS-style OTP as the expected sign-in experience, more so than
email/password — a homeowner filling out a design wizard is not a
developer-tool audience, and should not be asked to create and remember a
password for a tool they may use only a handful of times. That raises the
bar further: OTP delivery means integrating a carrier/messaging provider,
handling delivery failures and retries, and guarding against OTP-bombing
abuse, all before a single line of the actual product (the wizard, the
generation engine) gets built.

The team is small and early-stage, and the generation engine (ADR-0003,
ADR-0006) is the highest-leverage place to spend engineering time — it is
the part of the product nothing else can substitute for. Two paths were
weighed:

1. **Self-host Auth.js (NextAuth)**, wiring up a credentials/OTP provider,
   session storage, and rate-limiting ourselves on top of the `app`
   Postgres schema.
2. **Use Clerk**, a managed auth-as-a-service product with a prebuilt
   Next.js App Router integration, hosted session management, and
   phone-number/OTP sign-in out of the box.

Option 1 gives full control and no per-monthly-active-user (MAU) cost, but
the real engineering cost sits in the hardening, not the happy path: OTP
rate-limiting, session fixation/rotation, credential-stuffing defenses, and
WhatsApp/SMS provider integration are all security-sensitive work that does
not differentiate this product from any other app that also needs login.
Getting it subtly wrong (a session bug, a weak OTP rate limit) is a
security incident, not a minor bug — a cost asymmetry that matters more for
a small team than the MAU fee does at this stage.

## Decision

Use Clerk as the managed identity provider for Rumah3d, integrated into
`apps/web` via its Next.js App Router SDK (middleware-based route
protection, hosted sign-in/sign-up UI, phone-number/OTP as a first-class
sign-in method alongside email). Clerk owns credentials, sessions, and OTP
delivery; `app.users` (`docs/hld/data-model.md`) stores only the
denormalized profile fields the product needs to join against
`app.projects` — `id` (the Clerk user id), `email`, `name` — not a parallel
copy of auth state.

All Clerk SDK usage is kept behind a thin wrapper module in `apps/web`
(session/current-user accessors, middleware config) rather than called
ad hoc from route handlers and components throughout the app. Application
code depends on that wrapper's interface, not directly on `@clerk/nextjs`.

## Consequences

- Login, session handling, and phone/OTP delivery work correctly from day
  one, for the cost of a subscription instead of engineering time — the
  right trade for a small team whose differentiated work is the generation
  engine, not auth infrastructure.
- Clerk's pricing scales with monthly active users. This is explicitly
  flagged as a **revisit-at-scale item, not a permanent architectural
  lock-in**: if MAU-based cost becomes material, that's a cost decision to
  revisit deliberately (a new ADR), not a migration forced by surprise.
- The thin-wrapper boundary is what makes that future revisit tractable:
  because route handlers and components call the wrapper rather than
  `@clerk/nextjs` directly, swapping the underlying provider (back to
  self-hosted Auth.js, or another managed provider) means rewriting the
  wrapper's internals, not auditing every call site in the app.
- `app.users` rows are keyed by the Clerk user id and populated reactively
  (on first sign-in, or via a Clerk webhook), not treated as the system of
  record for identity — Clerk is the source of truth for "does this
  credential belong to this user"; Postgres is the source of truth for
  "what has this user built."
- The generation engine (`services/generation-engine`) never talks to
  Clerk and has no concept of end-user identity: the BFF (`apps/web`) is
  the only component that authenticates a request, and it forwards only an
  already-validated `project_id`/`requested_by` to the engine — consistent
  with the API-layer-validated, no-cross-schema-FK boundary in ADR-0007.
- Outage risk shifts to a third party: if Clerk is down, sign-in is down
  regardless of the health of our own infrastructure. Accepted as a
  reasonable trade for a purpose-built identity provider's reliability
  track record versus a freshly self-hosted auth stack's.
