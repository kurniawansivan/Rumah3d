---
name: new-adr
description: Scaffold a new numbered Architecture Decision Record in docs/adr/ from the standard template. Use whenever a nontrivial structural/architectural choice is being made or changed.
---

# new-adr

Architecture decisions in this repo are recorded, not just implemented —
see [`docs/adr/0001-record-architecture-decisions.md`](../../../docs/adr/0001-record-architecture-decisions.md).

## Steps

1. List existing files in `docs/adr/` and find the highest `NNNN` prefix.
   The new ADR is `NNNN+1`, zero-padded to 4 digits. Never reuse or
   renumber an existing ADR number, even if a later one is superseded.
2. Pick a short kebab-case title and create
   `docs/adr/000N-short-kebab-title.md` with this structure:

   ```markdown
   # NNNN. Title

   ## Status
   Proposed <!-- or: Accepted / Deprecated / Superseded by ADR-XXXX -->

   ## Context
   What problem/question forced this decision? What constraints applied?

   ## Decision
   What was decided, stated plainly.

   ## Consequences
   What this makes easier, what it makes harder, what alternatives were
   considered and rejected (and why), what would need to change to revisit
   this later.
   ```
3. If this decision changes or reverses an earlier ADR, update that older
   ADR's `Status` line to `Superseded by ADR-000N` — do not delete or
   silently edit it.
4. Cross-link: add a pointer from `docs/techstack.md` if the decision
   affects a stack choice, and from `CLAUDE.md` §8 if it introduces a new
   guardrail future agents must know about.
