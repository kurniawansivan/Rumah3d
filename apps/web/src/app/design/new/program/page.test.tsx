import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useWizardStore } from "@/lib/wizard/store";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import ProgramRuangStepPage from "./page";

function programTypes(): string[] {
  return (useWizardStore.getState().brief.room_program ?? []).map((item) => item.type);
}

describe("ProgramRuangStepPage", () => {
  beforeEach(() => {
    push.mockClear();
    useWizardStore.getState().reset();
    sessionStorage.clear();
  });

  it("submits the default room program and navigates to preview", async () => {
    render(<ProgramRuangStepPage />);

    fireEvent.click(screen.getByRole("button", { name: /lanjutkan/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/design/new/preview"));

    const { brief } = useWizardStore.getState();
    expect(brief.floors).toBe(1);
    expect(programTypes()).toEqual(
      expect.arrayContaining([
        "kamar_tidur_utama",
        "kamar_tidur",
        "kamar_mandi",
        "carport",
        "ruang_tamu",
        "ruang_makan_keluarga",
        "dapur",
        "area_servis",
        "taman_depan",
        "taman_belakang",
      ]),
    );
    expect(programTypes()).not.toContain("mushola");
    expect(brief.amenities).toEqual({
      pool: { included: false, position_preference: undefined },
      kamar_pembantu: { included: false, with_bathroom: false },
    });
  });

  it("hides kapasitas mobil when parkir tipe is tidak_ada", () => {
    render(<ProgramRuangStepPage />);

    expect(screen.getByLabelText(/kapasitas mobil/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/tipe parkir/i), {
      target: { value: "tidak_ada" },
    });

    expect(screen.queryByLabelText(/kapasitas mobil/i)).not.toBeInTheDocument();
  });

  it("shows 'sertakan KM pembantu' only once kamar pembantu is checked", () => {
    render(<ProgramRuangStepPage />);

    expect(screen.queryByText(/sertakan km pembantu/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(/sertakan kamar pembantu/i));

    expect(screen.getByText(/sertakan km pembantu/i)).toBeInTheDocument();
  });

  it("shows posisi kolam renang only once kolam renang is checked", () => {
    render(<ProgramRuangStepPage />);

    expect(screen.queryByLabelText(/posisi kolam renang/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(/sertakan kolam renang/i));

    expect(screen.getByLabelText(/posisi kolam renang/i)).toBeInTheDocument();
  });

  it("forces sertakan kamar tidur utama off when jumlah kamar tidur is 1", async () => {
    render(<ProgramRuangStepPage />);

    fireEvent.change(screen.getByLabelText(/jumlah kamar tidur/i), {
      target: { value: "1" },
    });

    const utamaCheckbox = screen.getByRole("checkbox", {
      name: /sertakan kamar tidur utama/i,
    });
    await waitFor(() => expect(utamaCheckbox).toBeDisabled());
    expect(utamaCheckbox).not.toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: /lanjutkan/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/design/new/preview"));
    expect(programTypes()).not.toContain("kamar_tidur_utama");
    expect(programTypes()).toContain("kamar_tidur");
  });
});
