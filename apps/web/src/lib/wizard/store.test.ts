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

  it("setLot stores the lot slice", () => {
    useWizardStore.getState().setLot(sampleLot);

    expect(useWizardStore.getState().brief.lot).toEqual(sampleLot);
  });

  it("setRegulasi stores setbacks, kdb_percent and klb_percent", () => {
    useWizardStore.getState().setRegulasi(sampleSetbacks, 60, 120);

    const { brief } = useWizardStore.getState();
    expect(brief.setbacks).toEqual(sampleSetbacks);
    expect(brief.kdb_percent).toBe(60);
    expect(brief.klb_percent).toBe(120);
  });

  it("setRegulasi works without setbacks or klb_percent", () => {
    useWizardStore.getState().setRegulasi(undefined, 60);

    const { brief } = useWizardStore.getState();
    expect(brief.setbacks).toBeUndefined();
    expect(brief.kdb_percent).toBe(60);
    expect(brief.klb_percent).toBeUndefined();
  });

  it("reset clears back to an empty brief", () => {
    useWizardStore.getState().setLot(sampleLot);
    useWizardStore.getState().setRegulasi(sampleSetbacks, 60, 120);
    useWizardStore.getState().reset();

    expect(useWizardStore.getState().brief).toEqual({});
  });
});
