import { beforeEach, describe, expect, it } from "vitest";

import type { Amenities, Lot, RoomProgramItem, Setbacks } from "@rumah3d/schemas";

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

const sampleRoomProgram: RoomProgramItem[] = [
  { type: "kamar_tidur_utama", count: 1, priority: "required" },
  { type: "kamar_tidur", count: 2, priority: "required" },
];

const sampleAmenities: Amenities = {
  pool: { included: false },
  kamar_pembantu: { included: false, with_bathroom: false },
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

  it("setProgramRuang stores floors, room_program and amenities", () => {
    useWizardStore.getState().setProgramRuang(2, sampleRoomProgram, sampleAmenities);

    const { brief } = useWizardStore.getState();
    expect(brief.floors).toBe(2);
    expect(brief.room_program).toEqual(sampleRoomProgram);
    expect(brief.amenities).toEqual(sampleAmenities);
  });

  it("setGaya stores style and prioritas_saat_tidak_muat", () => {
    useWizardStore.getState().setGaya("tropis", "ruang_komunal");

    const { brief } = useWizardStore.getState();
    expect(brief.style).toBe("tropis");
    expect(brief.prioritas_saat_tidak_muat).toBe("ruang_komunal");
  });

  it("reset clears back to an empty brief", () => {
    useWizardStore.getState().setLot(sampleLot);
    useWizardStore.getState().setRegulasi(sampleSetbacks, 60, 120);
    useWizardStore.getState().setProgramRuang(1, sampleRoomProgram, sampleAmenities);
    useWizardStore.getState().setGaya("minimalis_modern", "kamar");
    useWizardStore.getState().reset();

    expect(useWizardStore.getState().brief).toEqual({});
  });
});
