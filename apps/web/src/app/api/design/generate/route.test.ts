import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const VALID_LOT_BODY = {
  lot: { length_m: 10, width_m: 8, facing: "utara", position: "tengah" },
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/design/generate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/design/generate", () => {
  const originalEngineUrl = process.env.GENERATION_ENGINE_URL;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.GENERATION_ENGINE_URL = "http://engine.test";
  });

  afterEach(() => {
    process.env.GENERATION_ENGINE_URL = originalEngineUrl;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns 400 for a body that isn't valid JSON", async () => {
    const request = new NextRequest("http://localhost/api/design/generate", {
      method: "POST",
      body: "not json",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("returns 400 when the merged brief fails schema validation", async () => {
    const response = await POST(makeRequest({ lot: { length_m: -1 } }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("returns 500 when GENERATION_ENGINE_URL is not configured", async () => {
    delete process.env.GENERATION_ENGINE_URL;

    const response = await POST(makeRequest(VALID_LOT_BODY));

    expect(response.status).toBe(500);
  });

  it("forwards a valid brief to the engine and returns its response", async () => {
    const engineBody = { request_id: "abc", status: "success", candidates: [] };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(engineBody), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await POST(makeRequest(VALID_LOT_BODY));

    expect(fetchMock).toHaveBeenCalledWith(
      "http://engine.test/v1/designs/generate",
      expect.objectContaining({ method: "POST" }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(engineBody);
  });

  it("returns 502 when the engine responds with a non-2xx status", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response("boom", { status: 500 })) as unknown as typeof fetch;

    const response = await POST(makeRequest(VALID_LOT_BODY));

    expect(response.status).toBe(502);
  });

  it("returns 502 when the engine can't be reached", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) as unknown as typeof fetch;

    const response = await POST(makeRequest(VALID_LOT_BODY));

    expect(response.status).toBe(502);
  });
});
