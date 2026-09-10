import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GenerationResponse } from "@rumah3d/schemas";

import { useWizardStore } from "@/lib/wizard/store";

import PreviewPage from "./page";

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

const SAMPLE_FLOOR: GenerationResponse["candidates"][number]["floors"][number] = {
  level: 0,
  height_m: 3.5,
  rooms: [
    { id: "r1", type: "ruang_tamu", polygon: [[0, 0], [4, 0], [4, 5], [0, 5]], area_m2: 20 },
  ],
  walls: [],
  openings: [],
};

const originalFetch = global.fetch;

describe("PreviewPage", () => {
  beforeEach(() => {
    useWizardStore.getState().reset();
    sessionStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("prompts the user to fill in lot data first when the wizard store is empty", () => {
    renderWithQueryClient(<PreviewPage />);

    expect(screen.getByText(/belum ada data lahan/i)).toBeInTheDocument();
  });

  it("renders the generated plan once the engine responds successfully", async () => {
    useWizardStore.getState().setLot({
      length_m: 10,
      width_m: 8,
      facing: "utara",
      position: "tengah",
    });

    const engineResponse: GenerationResponse = {
      request_id: "req-1",
      status: "success",
      candidates: [
        {
          version_id: "v1",
          template: null,
          floors: [SAMPLE_FLOOR],
          stairs: [],
          roof: { type: "pelana", pitch_deg: 30 },
          metadata: {
            engine_version: "0.1.0-stub",
            engine_mode: "stub",
            why_selected: [],
            objective_breakdown: {},
            warnings: [],
            solver: { status: "stub", solve_time_ms: 1, seed: 42 },
          },
          validation: { passed: true, checks: [] },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(engineResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    renderWithQueryClient(<PreviewPage />);

    await waitFor(() => expect(screen.getByText(/mode uji coba/i)).toBeInTheDocument());
  });

  it("shows the infeasible state when the engine can't fit the program", async () => {
    useWizardStore.getState().setLot({
      length_m: 4,
      width_m: 4,
      facing: "utara",
      position: "tengah",
    });

    const engineResponse: GenerationResponse = {
      request_id: "req-2",
      status: "infeasible",
      candidates: [
        {
          version_id: "v1",
          template: null,
          floors: [],
          stairs: [],
          roof: null,
          metadata: {
            engine_version: "0.1.0-stub",
            engine_mode: "stub",
            why_selected: [],
            objective_breakdown: {},
            warnings: [{ rule_id: "envelope_non_positive", params: {} }],
            solver: { status: "infeasible", solve_time_ms: 1, seed: 42 },
          },
          validation: { passed: false, checks: [] },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(engineResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    renderWithQueryClient(<PreviewPage />);

    await waitFor(() =>
      expect(screen.getByText(/belum bisa dipenuhi/i)).toBeInTheDocument(),
    );
  });
});
