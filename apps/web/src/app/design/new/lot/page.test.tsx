import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useWizardStore } from "@/lib/wizard/store";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import LotStepPage from "./page";

describe("LotStepPage", () => {
  beforeEach(() => {
    push.mockClear();
    useWizardStore.getState().reset();
    sessionStorage.clear();
  });

  it("rejects submission with required fields left empty and never navigates", async () => {
    render(<LotStepPage />);

    fireEvent.click(screen.getByRole("button", { name: /lanjutkan/i }));

    await waitFor(() => expect(push).not.toHaveBeenCalled());
    // give the resolver a tick to run and confirm we're still on the form
    expect(screen.getByRole("button", { name: /lanjutkan/i })).toBeInTheDocument();
  });

  it("submits valid lot data, stores it, and navigates to the preview step", async () => {
    render(<LotStepPage />);

    fireEvent.change(screen.getByLabelText(/lebar lahan/i), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText(/panjang lahan/i), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: /lanjutkan/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/design/new/preview"));

    const { brief } = useWizardStore.getState();
    expect(brief.lot).toMatchObject({
      length_m: 10,
      width_m: 8,
      facing: "utara",
      position: "tengah",
    });
  });
});
