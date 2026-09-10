---
name: sync-api-contract
description: Check (and update) that packages/schemas' hand-written TS types match the generation-engine's actual FastAPI/Pydantic response contract, and fail loudly on drift. Use after changing any Pydantic schema in services/generation-engine or any type in packages/schemas.
---

# sync-api-contract

`packages/schemas/src/generation-response.ts` is currently **hand-written**
to match `services/generation-engine/src/generation_engine/api/schemas/generation_response.py`
(and `generation_request.py`) exactly — see
[`docs/hld/generation-engine-contract.md`](../../../docs/hld/generation-engine-contract.md)
for the full contract. There is no automated codegen wired up yet
(generating TS types from the engine's OpenAPI schema via
`openapi-typescript` is the intended long-term replacement for this skill —
see the note at the bottom).

## Steps (current, manual, until codegen lands)

1. Read both files side by side:
   - `services/generation-engine/src/generation_engine/api/schemas/generation_request.py`
   - `services/generation-engine/src/generation_engine/api/schemas/generation_response.py`
   - `packages/schemas/src/generation-response.ts`
2. Diff field-by-field: names (the engine uses `snake_case` — keep it, don't
   camelCase it, the wire format is JSON as Python emits it), optionality,
   enum value sets (e.g. `RoomType`, `status`), nesting.
3. Fix any mismatch in `packages/schemas`, not by loosening a type to
   `any`/`unknown` — the whole point of this shared package is a contract
   both sides can trust.
4. Add/update a Vitest test in `packages/schemas` asserting a realistic
   sample payload (see `new-plan-fixture` skill) type-checks against the
   updated type.
5. Report which fields drifted and what you changed.

## Once codegen is in place

When `services/generation-engine` exposes its OpenAPI schema and
`openapi-typescript` is wired into the build (see
`docs/adr/` for the ADR that will record this), replace steps 1–4 above
with: regenerate `packages/schemas/src/generated/` from the live schema,
diff against the previous generated output, and hand-review only the diff.
Until that ADR exists, do the manual comparison above.
