import { NextRequest, NextResponse } from "next/server";

import { applyPriorityChoice, designBriefSchema } from "@rumah3d/schemas";

/**
 * Wizard steps 1-4 (lot, regulasi, program ruang, gaya & prioritas)
 * collect real answers; step 5 (review) doesn't exist yet, so a request
 * body reaching here is always the full brief *except* whatever a user
 * reached this route without going through the whole wizard for (e.g.
 * hitting preview directly). Merge in sensible defaults for whatever's
 * still missing so `designBriefSchema` — the full contract — can still
 * validate end-to-end. Remove once RM-4's review step makes every field
 * always present.
 */
const DEFAULT_BRIEF_FIELDS = {
  floors: 1,
  room_program: [] as unknown[],
  style: "minimalis_modern",
  amenities: {
    pool: { included: false },
    kamar_pembantu: { included: false, with_bathroom: false },
  },
  prioritas_saat_tidak_muat: "kamar",
};

// The stub engine has nothing to actually time out on yet, but a hung
// connection to a misconfigured GENERATION_ENGINE_URL shouldn't hang this
// request forever once the wiring is exercised against a real engine.
const ENGINE_REQUEST_TIMEOUT_MS = 15_000;

export async function POST(request: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const bodyWithDefaults =
    typeof rawBody === "object" && rawBody !== null
      ? { ...DEFAULT_BRIEF_FIELDS, ...rawBody }
      : rawBody;

  const parsed = designBriefSchema.safeParse(bodyWithDefaults);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid design brief.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const engineUrl = process.env.GENERATION_ENGINE_URL;
  if (!engineUrl) {
    console.error("GENERATION_ENGINE_URL is not set.");
    return NextResponse.json({ error: "Generation engine is not configured." }, { status: 500 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ENGINE_REQUEST_TIMEOUT_MS);

  // The engine requires a `project_id` (it's the FK the DB layer eventually
  // ties a generation request back to a real `app.projects` row) — but
  // there's no project-creation flow or auth wired up yet, so
  // `designBriefSchema` deliberately doesn't have this field at all (it
  // isn't something the wizard collects). Generate a placeholder until a
  // real project is created earlier in the flow and its id threaded
  // through here instead.
  //
  // room_program's priority is patched here, not stored that way in the
  // wizard state — applyPriorityChoice is what actually turns Step 4's
  // single choice into a per-entry required/flexible tag, right before
  // the one place that needs it (docs/hld/generation-engine-contract.md).
  const enginePayload = {
    ...parsed.data,
    project_id: crypto.randomUUID(),
    room_program: applyPriorityChoice(parsed.data.room_program, parsed.data.prioritas_saat_tidak_muat),
  };

  try {
    const engineResponse = await fetch(`${engineUrl}/v1/designs/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(enginePayload),
      signal: controller.signal,
    });

    if (!engineResponse.ok) {
      const engineErrorBody = await engineResponse.text().catch(() => null);
      console.error(
        `Generation engine responded with status ${engineResponse.status}:`,
        engineErrorBody,
      );
      return NextResponse.json(
        { error: `Generation engine responded with status ${engineResponse.status}.` },
        { status: 502 },
      );
    }

    // Passed through as-is: the engine's own `status` field ("success" /
    // "partial" / "infeasible") is a domain-level result, not an HTTP
    // failure, and is interpreted by the caller (see
    // src/app/design/new/preview/page.tsx), not here.
    const engineBody: unknown = await engineResponse.json();
    return NextResponse.json(engineBody, { status: engineResponse.status });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Generation engine request timed out."
        : "Failed to reach the generation engine.";
    console.error("Design generation request failed:", error);
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
