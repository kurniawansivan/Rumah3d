import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useWizardStore } from "@/lib/wizard/store";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import RegulasiStepPage from "./page";

describe("RegulasiStepPage", () => {
  beforeEach(() => {
    push.mockClear();
    useWizardStore.getState().reset();
    sessionStorage.clear();
  });

  it("submits with GSB left blank and the kdb_percent default applied", async () => {
    render(<RegulasiStepPage />);

    fireEvent.click(screen.getByRole("button", { name: /lanjutkan/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/design/new/preview"));

    const { brief } = useWizardStore.getState();
    expect(brief.setbacks).toBeUndefined();
    expect(brief.kdb_percent).toBe(60);
    expect(brief.klb_percent).toBeUndefined();
  });

  it("duplicates 'GSB samping' into both setbacks.left_m and right_m", async () => {
    render(<RegulasiStepPage />);

    fireEvent.change(screen.getByLabelText(/^depan/i), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText(/^samping/i), { target: { value: "1.5" } });
    fireEvent.change(screen.getByLabelText(/^belakang/i), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /lanjutkan/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/design/new/preview"));

    expect(useWizardStore.getState().brief.setbacks).toEqual({
      front_m: 3,
      back_m: 2,
      left_m: 1.5,
      right_m: 1.5,
    });
  });

  it("rejects a klb_percent lower than kdb_percent and never navigates", async () => {
    render(<RegulasiStepPage />);

    fireEvent.change(screen.getByLabelText(/kdb/i), { target: { value: "60" } });
    fireEvent.change(screen.getByLabelText(/klb/i), { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: /lanjutkan/i }));

    await waitFor(() => expect(screen.getByText(/klb harus/i)).toBeInTheDocument());
    expect(push).not.toHaveBeenCalled();
  });
});
