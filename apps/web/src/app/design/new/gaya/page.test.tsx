import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useWizardStore } from "@/lib/wizard/store";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import GayaStepPage from "./page";

describe("GayaStepPage", () => {
  beforeEach(() => {
    push.mockClear();
    useWizardStore.getState().reset();
    sessionStorage.clear();
  });

  it("submits the defaults and navigates to preview", async () => {
    render(<GayaStepPage />);

    fireEvent.click(screen.getByRole("button", { name: /lanjutkan/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/design/new/preview"));

    const { brief } = useWizardStore.getState();
    expect(brief.style).toBe("minimalis_modern");
    expect(brief.prioritas_saat_tidak_muat).toBe("kamar");
  });

  it("stores a changed style and prioritas choice", async () => {
    render(<GayaStepPage />);

    fireEvent.change(screen.getByLabelText(/gaya arsitektur/i), {
      target: { value: "tropis" },
    });
    fireEvent.change(screen.getByLabelText(/prioritas jika lahan tidak cukup/i), {
      target: { value: "ruang_komunal" },
    });
    fireEvent.click(screen.getByRole("button", { name: /lanjutkan/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/design/new/preview"));

    const { brief } = useWizardStore.getState();
    expect(brief.style).toBe("tropis");
    expect(brief.prioritas_saat_tidak_muat).toBe("ruang_komunal");
  });
});
