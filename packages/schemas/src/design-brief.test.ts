import { describe, expect, it } from "vitest";

import { designBriefSchema, lotStepSchema, regulasiStepSchema } from "./design-brief";

const validLot = {
  length_m: 10,
  width_m: 8,
  facing: "utara",
  position: "tengah",
};

const validBrief = {
  lot: validLot,
  floors: 1,
  room_program: [{ type: "kamar_tidur_utama", count: 1 }],
  amenities: {
    pool: { included: false },
    kamar_pembantu: { included: false, with_bathroom: false },
  },
  style: "minimalis_modern",
};

describe("lotStepSchema", () => {
  it("accepts a valid lot payload", () => {
    const result = lotStepSchema.safeParse({ lot: validLot });

    expect(result.success).toBe(true);
  });

  it("rejects a negative lot dimension", () => {
    const result = lotStepSchema.safeParse({
      lot: { ...validLot, length_m: -10 },
    });

    expect(result.success).toBe(false);
  });

  it("rejects a payload missing a required lot field", () => {
    const lotWithoutFacing = {
      length_m: validLot.length_m,
      width_m: validLot.width_m,
      position: validLot.position,
    };
    const result = lotStepSchema.safeParse({ lot: lotWithoutFacing });

    expect(result.success).toBe(false);
  });
});

describe("regulasiStepSchema", () => {
  it("accepts a fully filled-in payload", () => {
    const result = regulasiStepSchema.safeParse({
      gsb_depan_m: 3,
      gsb_samping_m: 1.5,
      gsb_belakang_m: 2,
      kdb_percent: 60,
      klb_percent: 120,
    });

    expect(result.success).toBe(true);
  });

  it("applies the kdb_percent default and leaves klb_percent unset when both are omitted", () => {
    const result = regulasiStepSchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kdb_percent).toBe(60);
      expect(result.data.klb_percent).toBeUndefined();
    }
  });

  it("treats a blank GSB input (empty string, from an untouched form field) as not provided", () => {
    const result = regulasiStepSchema.safeParse({ gsb_depan_m: "", gsb_belakang_m: "2" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gsb_depan_m).toBeUndefined();
      expect(result.data.gsb_belakang_m).toBe(2);
    }
  });

  it("rejects kdb_percent below the 10% floor", () => {
    const result = regulasiStepSchema.safeParse({ kdb_percent: 5 });

    expect(result.success).toBe(false);
  });

  it("rejects klb_percent lower than kdb_percent", () => {
    const result = regulasiStepSchema.safeParse({ kdb_percent: 60, klb_percent: 40 });

    expect(result.success).toBe(false);
  });

  it("accepts klb_percent above 100 for a multi-floor design", () => {
    const result = regulasiStepSchema.safeParse({ kdb_percent: 60, klb_percent: 180 });

    expect(result.success).toBe(true);
  });
});

describe("designBriefSchema", () => {
  it("accepts a valid full design brief and applies the kdb_percent default", () => {
    const result = designBriefSchema.safeParse(validBrief);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kdb_percent).toBe(60);
    }
  });

  it("rejects a negative lot dimension", () => {
    const result = designBriefSchema.safeParse({
      ...validBrief,
      lot: { ...validLot, width_m: -1 },
    });

    expect(result.success).toBe(false);
  });

  it("rejects a payload missing a required top-level field", () => {
    const briefWithoutFloors = {
      lot: validLot,
      room_program: validBrief.room_program,
      amenities: validBrief.amenities,
      style: validBrief.style,
    };
    const result = designBriefSchema.safeParse(briefWithoutFloors);

    expect(result.success).toBe(false);
  });
});
