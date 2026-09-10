import { beforeEach, describe, expect, it } from "vitest";

import type { Lot, Setbacks } from "@rumah3d/schemas";

import { useWizardStore } from "./store";

const sampleLot: Lot = {
  length_m: 10,
  width_m: 8,
  facing: "utara",
  position: "tengah",
};

const sampleSetbacks: Setbacks = {
  front_m: 3,
  back_m: 2,
  left_m: 1.5,
  right_m: 1.5,
};

describe("useWizardStore", () => {
  beforeEach(() => {
    useWizardStore.getState().reset();
    sessionStorage.clear();
  });

  it("starts with an empty brief", () => {
    expect(useWizardStore.getState().brief).toEqual({});
  });

  it("setLot stores the lot and setbacks slice", () => {
    useWizardStore.getState().setLot(sampleLot, sampleSetbacks);

    const { brief } = useWizardStore.getState();
    expect(brief.lot).toEqual(sampleLot);
    expect(brief.setbacks).toEqual(sampleSetbacks);
  });

  it("setLot works without setbacks", () => {
    useWizardStore.getState().setLot(sampleLot);

    expect(useWizardStore.getState().brief.lot).toEqual(sampleLot);
    expect(useWizardStore.getState().brief.setbacks).toBeUndefined();
  });

  it("reset clears back to an empty brief", () => {
    useWizardStore.getState().setLot(sampleLot, sampleSetbacks);
    useWizardStore.getState().reset();

    expect(useWizardStore.getState().brief).toEqual({});
  });
});
