import { describe, expect, it } from "vitest";

import { designBriefSchema, lotStepSchema } from "./design-brief";

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
  amenities: { pool: false, kamar_pembantu: false },
  style: "minimalis_modern",
};

describe("lotStepSchema", () => {
  it("accepts a valid lot + setbacks payload", () => {
    const result = lotStepSchema.safeParse({
      lot: validLot,
      setbacks: { front_m: 3, back_m: 1.5, left_m: 2, right_m: 2 },
    });

    expect(result.success).toBe(true);
  });

  it("accepts a valid payload with setbacks omitted entirely", () => {
    const result = lotStepSchema.safeParse({ lot: validLot });

    expect(result.success).toBe(true);
  });

  it("treats a blank setback input (empty string, from an untouched form field) as not provided", () => {
    const result = lotStepSchema.safeParse({
      lot: validLot,
      setbacks: { front_m: "", back_m: "2" },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.setbacks?.front_m).toBeUndefined();
      expect(result.data.setbacks?.back_m).toBe(2);
    }
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
