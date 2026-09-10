# docs

## Purpose

Everything about *what* Rumah3d is and *why* it's built the way it is.
Suggested reading order for anyone new (human or agent):

1. `prd/README.md` — what the product is, for whom, and what it
   deliberately does *not* do.
2. `adr/0001-record-architecture-decisions.md` onward — why individual
   technical decisions were made, in the order they were made.
3. `hld/system-architecture.md` — how the pieces fit together at runtime.
4. `../techstack.md` — a one-page index of every stack choice, each
   pointing back to the ADR that justifies it.

## Conventions

- `prd/` — one file per major feature/epic (kebab-case filenames), plus a
  `README.md` index with the overall product vision, goals, and non-goals.
- `adr/` — one numbered file per decision (4-digit prefix, kebab-case
  title, Nygard template: Status/Context/Decision/Consequences). Numbers
  are never reused or reassigned, even for a superseded decision — see the
  `new-adr` skill.
- `hld/` — one file per system-level concern (architecture, data model, API
  contracts), prose-first, diagrams where they clarify.

## Code Style & Acceptance Criteria

Markdown. Indonesian building/domain terms (KDB, KLB, GSB, dapur
kotor/bersih, etc. — see the glossary in root `CLAUDE.md` §4) are kept
as-is, not translated. Every doc should be something a new engineer or AI
agent can read cold and act on correctly.

## Testing Requirement

Docs aren't code, but they're reviewed with the same discipline: a PR that
changes product scope or introduces an architectural decision without a
corresponding PRD/ADR update is treated as incomplete, the same way code
without tests is (root `CLAUDE.md` §9).

## Key Entry Points

- `prd/README.md`
- `adr/0001-record-architecture-decisions.md`
- `hld/system-architecture.md`
- `../techstack.md`
