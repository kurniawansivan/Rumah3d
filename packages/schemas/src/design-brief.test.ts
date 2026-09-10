import { describe, expect, it } from "vitest";

import {
  buildRoomProgramFromStep3,
  designBriefSchema,
  lotStepSchema,
  programRuangStepSchema,
  regulasiStepSchema,
  type ProgramRuangStep,
} from "./design-brief";

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

describe("programRuangStepSchema", () => {
  it("applies every default on an empty payload", () => {
    const result = programRuangStepSchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        jumlah_lantai: 1,
        jumlah_kamar_tidur: 3,
        sertakan_kamar_tidur_utama: true,
        jumlah_kamar_mandi: 2,
        parkir_tipe: "carport",
        parkir_kapasitas_mobil: 1,
        ruang_tamu: true,
        konsep_ruang_makan_keluarga: "gabung",
        dapur: "hanya_bersih",
        sertakan_kamar_pembantu: false,
        sertakan_area_servis: true,
        sertakan_kolam_renang: false,
        taman_depan: true,
        taman_belakang: true,
        sertakan_mushola: false,
      });
    }
  });

  it("rejects sertakan_kamar_tidur_utama=true when jumlah_kamar_tidur is 1", () => {
    const result = programRuangStepSchema.safeParse({
      jumlah_kamar_tidur: 1,
      sertakan_kamar_tidur_utama: true,
    });

    expect(result.success).toBe(false);
  });

  it("accepts sertakan_kamar_tidur_utama=false when jumlah_kamar_tidur is 1", () => {
    const result = programRuangStepSchema.safeParse({
      jumlah_kamar_tidur: 1,
      sertakan_kamar_tidur_utama: false,
    });

    expect(result.success).toBe(true);
  });

  it("rejects jumlah_kamar_tidur outside 1-6", () => {
    expect(programRuangStepSchema.safeParse({ jumlah_kamar_tidur: 0 }).success).toBe(false);
    expect(programRuangStepSchema.safeParse({ jumlah_kamar_tidur: 7 }).success).toBe(false);
  });
});

describe("buildRoomProgramFromStep3", () => {
  const defaults: ProgramRuangStep = programRuangStepSchema.parse({});

  function programEntry(program: ReturnType<typeof buildRoomProgramFromStep3>, type: string) {
    return program.room_program.find((item) => item.type === type);
  }

  it("splits jumlah_kamar_tidur into a utama entry plus the remainder", () => {
    const result = buildRoomProgramFromStep3({ ...defaults, jumlah_kamar_tidur: 3 });

    expect(programEntry(result, "kamar_tidur_utama")).toMatchObject({ count: 1 });
    expect(programEntry(result, "kamar_tidur")).toMatchObject({ count: 2 });
  });

  it("emits one plain kamar_tidur entry when utama is not included", () => {
    const result = buildRoomProgramFromStep3({
      ...defaults,
      jumlah_kamar_tidur: 4,
      sertakan_kamar_tidur_utama: false,
    });

    expect(programEntry(result, "kamar_tidur_utama")).toBeUndefined();
    expect(programEntry(result, "kamar_tidur")).toMatchObject({ count: 4 });
  });

  it("omits any parking entry when parkir_tipe is tidak_ada", () => {
    const result = buildRoomProgramFromStep3({ ...defaults, parkir_tipe: "tidak_ada" });

    expect(programEntry(result, "carport")).toBeUndefined();
    expect(programEntry(result, "garasi")).toBeUndefined();
  });

  it("uses garasi as the room type with its own capacity when selected", () => {
    const result = buildRoomProgramFromStep3({
      ...defaults,
      parkir_tipe: "garasi",
      parkir_kapasitas_mobil: 2,
    });

    expect(programEntry(result, "garasi")).toMatchObject({ count: 2 });
    expect(programEntry(result, "carport")).toBeUndefined();
  });

  it("merges ruang makan/keluarga into one entry when gabung", () => {
    const result = buildRoomProgramFromStep3({
      ...defaults,
      konsep_ruang_makan_keluarga: "gabung",
    });

    expect(programEntry(result, "ruang_makan_keluarga")).toMatchObject({ count: 1 });
    expect(programEntry(result, "ruang_makan")).toBeUndefined();
    expect(programEntry(result, "ruang_keluarga")).toBeUndefined();
  });

  it("splits ruang makan/keluarga into two entries when terpisah", () => {
    const result = buildRoomProgramFromStep3({
      ...defaults,
      konsep_ruang_makan_keluarga: "terpisah",
    });

    expect(programEntry(result, "ruang_makan")).toMatchObject({ count: 1 });
    expect(programEntry(result, "ruang_keluarga")).toMatchObject({ count: 1 });
    expect(programEntry(result, "ruang_makan_keluarga")).toBeUndefined();
  });

  it("splits dapur into bersih/kotor entries when bersih_dan_kotor", () => {
    const result = buildRoomProgramFromStep3({ ...defaults, dapur: "bersih_dan_kotor" });

    expect(programEntry(result, "dapur_bersih")).toMatchObject({ count: 1 });
    expect(programEntry(result, "dapur_kotor")).toMatchObject({ count: 1 });
    expect(programEntry(result, "dapur")).toBeUndefined();
  });

  it("emits one plain dapur entry when hanya_bersih", () => {
    const result = buildRoomProgramFromStep3({ ...defaults, dapur: "hanya_bersih" });

    expect(programEntry(result, "dapur")).toMatchObject({ count: 1 });
    expect(programEntry(result, "dapur_bersih")).toBeUndefined();
  });

  it("omits ruang_tamu, taman, and mushola entries when their flags are off", () => {
    const result = buildRoomProgramFromStep3({
      ...defaults,
      ruang_tamu: false,
      taman_depan: false,
      taman_belakang: false,
      sertakan_mushola: false,
    });

    expect(programEntry(result, "ruang_tamu")).toBeUndefined();
    expect(programEntry(result, "taman_depan")).toBeUndefined();
    expect(programEntry(result, "taman_belakang")).toBeUndefined();
    expect(programEntry(result, "mushola")).toBeUndefined();
  });

  it("includes mushola when its flag is on", () => {
    const result = buildRoomProgramFromStep3({ ...defaults, sertakan_mushola: true });

    expect(programEntry(result, "mushola")).toMatchObject({ count: 1 });
  });

  it("carries the pool amenity with its position only when included", () => {
    const included = buildRoomProgramFromStep3({
      ...defaults,
      sertakan_kolam_renang: true,
      posisi_kolam_renang: "depan",
    });
    expect(included.amenities.pool).toEqual({ included: true, position_preference: "depan" });

    const excluded = buildRoomProgramFromStep3({
      ...defaults,
      sertakan_kolam_renang: false,
      posisi_kolam_renang: "depan",
    });
    expect(excluded.amenities.pool).toEqual({ included: false, position_preference: undefined });
  });

  it("forces kamar_pembantu.with_bathroom to false when kamar_pembantu itself is excluded", () => {
    const result = buildRoomProgramFromStep3({
      ...defaults,
      sertakan_kamar_pembantu: false,
      sertakan_km_pembantu: true,
    });

    expect(result.amenities.kamar_pembantu).toEqual({ included: false, with_bathroom: false });
  });

  it("carries with_bathroom through when kamar_pembantu is included", () => {
    const result = buildRoomProgramFromStep3({
      ...defaults,
      sertakan_kamar_pembantu: true,
      sertakan_km_pembantu: false,
    });

    expect(result.amenities.kamar_pembantu).toEqual({ included: true, with_bathroom: false });
  });

  it("passes jumlah_lantai through as floors", () => {
    const result = buildRoomProgramFromStep3({ ...defaults, jumlah_lantai: 2 });

    expect(result.floors).toBe(2);
  });
});
