import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useWizardStore } from "@/lib/wizard/store";

import { WizardStepIndicator } from "./WizardStepIndicator";

describe("WizardStepIndicator", () => {
  beforeEach(() => {
    useWizardStore.getState().reset();
    sessionStorage.clear();
  });

  it("shows the current step number and its label", () => {
    render(<WizardStepIndicator current={3} />);

    expect(screen.getByText(/langkah 3 dari 5/i)).toBeInTheDocument();
    expect(screen.getByText(/program ruang/i)).toBeInTheDocument();
  });

  it("renders no step links when nothing has been completed yet", () => {
    render(<WizardStepIndicator current={1} />);

    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("makes a completed step clickable once its slice is in the store", () => {
    useWizardStore
      .getState()
      .setLot({ length_m: 10, width_m: 8, facing: "utara", position: "tengah" });

    render(<WizardStepIndicator current={2} />);

    const link = screen.getByRole("link", { name: "1" });
    expect(link).toHaveAttribute("href", "/design/new/lot");
  });

  it("never renders the current step as a link even if it's complete", () => {
    useWizardStore
      .getState()
      .setLot({ length_m: 10, width_m: 8, facing: "utara", position: "tengah" });

    render(<WizardStepIndicator current={1} />);

    expect(screen.queryByRole("link", { name: "1" })).not.toBeInTheDocument();
  });
});
