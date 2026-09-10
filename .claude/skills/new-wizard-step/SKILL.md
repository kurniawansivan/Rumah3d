---
name: new-wizard-step
description: Scaffold a new floor-plan wizard step (route, Zod schema slice, form component, store wiring) following the pattern established by the lot-data step. Use when implementing wizard steps 2-5 (regulatory constraints, room program, style/priority, review) from docs/prd/floor-plan-wizard.md.
---

# new-wizard-step

The wizard's full field set is already defined in one place —
`packages/schemas/src/design-brief.ts` (`designBriefSchema`) — per
[`docs/prd/floor-plan-wizard.md`](../../../docs/prd/floor-plan-wizard.md).
Adding a step means building UI for a slice of that schema that already
exists, not inventing new fields ad hoc.

## Steps

1. Confirm the step's fields already exist in `designBriefSchema`. If the
   PRD's field list changed, update the schema first (and
   `docs/prd/floor-plan-wizard.md`) — the schema is the contract, UI reads
   from it, not the other way around.
2. Export a step-scoped sub-schema from `packages/schemas/src/design-brief.ts`
   the same way `lotStepSchema` does (a `.pick()`/`.extend()` off the full
   schema) — don't redefine fields inline in the component.
3. Add the route under `apps/web/src/app/design/new/<step-slug>/page.tsx`,
   following the structure of `apps/web/src/app/design/new/lot/page.tsx`:
   client component, `react-hook-form` + `zodResolver(<step>Schema)`,
   reads/writes the shared Zustand store (`apps/web/src/lib/wizard/store.ts`)
   — add a setter action there for this step's slice if one doesn't exist.
4. Wire navigation: previous step's submit handler points `router.push` at
   this step; this step's submit handler points at the next one (or
   `/design/new/preview` if it's the last step before review).
5. Add a Vitest test for the new schema slice (valid/invalid payload) and a
   component test for the form (renders expected fields, shows validation
   errors, calls the store setter on submit).
6. Update the wizard's progress indicator/step list (wherever the shared
   wizard shell renders step N of 5) to include the new step.
