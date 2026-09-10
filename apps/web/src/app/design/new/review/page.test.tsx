import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useWizardStore } from "@/lib/wizard/store";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import ReviewStepPage from "./page";

const FULL_BRIEF_SETTERS = () => {
  useWizardStore
    .getState()
    .setLot({ length_m: 18, width_m: 12, facing: "utara", position: "tengah" });
  useWizardStore.getState().setRegulasi({ front_m: 3, back_m: 2, left_m: 1.5, right_m: 1.5 }, 60, 120);
  useWizardStore.getState().setProgramRuang(
    2,
    [
      { type: "kamar_tidur_utama", count: 1, priority: "required" },
      { type: "kamar_tidur", count: 2, priority: "required" },
    ],
    {
      pool: { included: true, position_preference: "belakang" },
      kamar_pembantu: { included: false, with_bathroom: false },
    },
  );
  useWizardStore.getState().setGaya("tropis", "ruang_komunal");
};

describe("ReviewStepPage", () => {
  beforeEach(() => {
    push.mockClear();
    useWizardStore.getState().reset();
    sessionStorage.clear();
  });

  it("shows 'belum diisi' for every section and disables submit on an empty brief", () => {
    render(<ReviewStepPage />);

    expect(screen.getAllByText(/belum diisi/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /buat denah/i })).toBeDisabled();
  });

  it("links the incomplete-data notice to the first step that still needs attention", () => {
    render(<ReviewStepPage />);

    const notice = screen.getByRole("alert");
    const link = notice.querySelector("a");
    expect(link).toHaveAttribute("href", "/design/new/lot");
  });

  it("renders every section's real values once the brief is fully filled in", () => {
    FULL_BRIEF_SETTERS();
    render(<ReviewStepPage />);

    expect(screen.getByText("12 m")).toBeInTheDocument();
    expect(screen.getByText("18 m")).toBeInTheDocument();
    expect(screen.getByText("Utara")).toBeInTheDocument();
    expect(screen.getByText(/kamar tidur utama × 1/i)).toBeInTheDocument();
    expect(screen.getByText(/kamar tidur × 2/i)).toBeInTheDocument();
    expect(screen.getByText(/ya \(belakang\)/i)).toBeInTheDocument();
    expect(screen.getByText("Tropis")).toBeInTheDocument();
    expect(screen.getByText(/ruang komunal/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("enables submit once the brief is valid and navigates to preview", () => {
    FULL_BRIEF_SETTERS();
    render(<ReviewStepPage />);

    const button = screen.getByRole("button", { name: /buat denah/i });
    expect(button).not.toBeDisabled();

    fireEvent.click(button);

    expect(push).toHaveBeenCalledWith("/design/new/preview");
  });

  it("points 'Ubah' links at the right step for each section", () => {
    FULL_BRIEF_SETTERS();
    render(<ReviewStepPage />);

    const ubahLinks = screen.getAllByRole("link", { name: /ubah/i });
    const hrefs = ubahLinks.map((link) => link.getAttribute("href"));

    expect(hrefs).toEqual([
      "/design/new/lot",
      "/design/new/regulasi",
      "/design/new/program",
      "/design/new/gaya",
    ]);
  });
});
