# ADR-0001: Record Architecture Decisions

Date: 2026-09-08

## Status

Accepted

## Context

Rumah3d is built by a small team working alongside AI coding agents, across two
languages (TypeScript and Python) and two independently-deployed services. A
decision like "why is the generation engine a separate Python service instead
of living inside the Next.js app" or "why don't the two Postgres schemas have
foreign keys between them" is easy to get right once, in a conversation or a
pull request description, and easy to lose track of six months later — by
which point the person who made the call may not be the person (or agent)
touching that code next.

Without a durable record, the same trade-off tends to get re-litigated
repeatedly, or worse, silently reversed by someone who didn't know it was a
deliberate choice rather than an accident of history. This is especially
important in a repo where AI agents are expected to make non-trivial
implementation decisions on their own: an agent re-deriving "should this be a
generative ML model or a rule-based solver" from scratch, without access to
the reasoning already worked out in ADR-0003, risks contradicting a decision
that was made for specific, still-valid reasons.

## Decision

We will use Architecture Decision Records (ADRs), in the style described by
Michael Nygard, to capture every significant, hard-to-reverse architectural
decision along with the context that produced it and its known consequences.

Mechanically:

- ADRs live in `docs/adr/`, one file per decision.
- Filenames are `NNNN-kebab-case-title.md`, where `NNNN` is a 4-digit,
  zero-padded, strictly increasing sequence number.
- Each file follows a fixed structure: Title (prefixed `ADR-NNNN:`), Status,
  Context, Decision, Consequences.
- Status is one of `Proposed`, `Accepted`, `Superseded by ADR-NNNN`, or
  `Deprecated`.

A decision earns an ADR when it is expensive to reverse, or when it
constrains more than one module/service (a framework choice, a data-ownership
boundary, a scope boundary that shapes what the product will and will not
do). Routine implementation choices that are cheap to change later do not
need one.

## Consequences

ADR numbers are permanent once assigned: a number is never reused, and a file
is never renumbered, even after the decision it records is reversed. A
decision that replaces an earlier one is written as a *new* ADR that explains
why, and the old ADR's Status line is updated to point at the new one — the
old file's Context and Decision stay intact as a historical record, they are
not deleted or rewritten.

This gives the project an append-only decision log that both new human
contributors and AI agents can read cold to recover not just *what* the
architecture is, but *why* it is that way — which is the more valuable and
more perishable of the two. Every other ADR in `docs/adr/` (0002 onward)
exists because of the practice this ADR establishes.

The cost is discipline: a decision that meets the bar above but never gets
written down defeats the purpose. Reviewers (human or agent) should treat "this
looks like an ADR-worthy decision, but there's no ADR" as a review comment
worth raising, the same way a missing test would be.
