import { z } from "zod";

/**
 * Full wizard input contract — the single source of truth for what a
 * "design brief" is, end to end. See docs/prd/floor-plan-wizard.md for the
 * step-by-step UI this maps to (`new-wizard-step` skill scaffolds each
 * step). Only Steps 1-2 (`lot`, `setbacks`/`kdb_percent`/`klb_percent`) are
 * actually collected by the UI so far — the rest of the shape is defined
 * now so the BFF <-> generation-engine contract doesn't need to change
 * shape as later steps are added, only get populated with real values.
 *
 * Room-type / style identifiers stay in Indonesian throughout, per
 * CLAUDE.md §4 — do not translate them.
 */

/** The 8-point compass, Indonesian terms (mata angin). */
export const compassDirectionSchema = z.enum([
  "utara",
  "timur_laut",
  "timur",
  "tenggara",
  "selatan",
  "barat_daya",
  "barat",
  "barat_laut",
]);

/** Corner lot ("sudut", two street-facing sides) vs. mid-block ("tengah"). */
export const lotPositionSchema = z.enum(["sudut", "tengah"]);

export const roomTypeSchema = z.enum([
  "kamar_tidur_utama",
  "kamar_tidur",
  "kamar_mandi",
  "dapur",
  "dapur_bersih",
  "dapur_kotor",
  "ruang_tamu",
  "ruang_makan",
  "ruang_keluarga",
  "ruang_makan_keluarga",
  "carport",
  "garasi",
  "area_servis",
  "kamar_pembantu",
  "taman_depan",
  "taman_belakang",
  "mushola",
]);

export const styleSchema = z.enum(["minimalis_modern", "tropis", "klasik", "industrial"]);

export const lotSchema = z.object({
  length_m: z.coerce.number().positive(),
  width_m: z.coerce.number().positive(),
  facing: compassDirectionSchema,
  position: lotPositionSchema,
});

/**
 * A setback value treats "no value entered" as `undefined` before
 * validating — whether that arrives as an empty string (a raw JSON payload,
 * or a form field read without `valueAsNumber`) or as `NaN` (what
 * react-hook-form's `valueAsNumber: true` submits for an untouched, optional
 * `<input type="number">`) — rather than failing the `.positive()` check
 * against a coerced `0`. Every setback field is optional, and this schema is
 * shared between the browser form and the BFF's JSON validation, so it
 * accepts raw strings and already-numeric values alike.
 */
const optionalPositiveMeters = z.preprocess((val) => {
  if (val === "" || val === null) return undefined;
  if (typeof val === "number" && Number.isNaN(val)) return undefined;
  return val;
}, z.coerce.number().positive().optional());

export const setbacksSchema = z.object({
  front_m: optionalPositiveMeters,
  back_m: optionalPositiveMeters,
  left_m: optionalPositiveMeters,
  right_m: optionalPositiveMeters,
});

export const prioritySchema = z.enum(["required", "flexible"]);

export const roomProgramItemSchema = z.object({
  type: roomTypeSchema,
  count: z.number().int().positive(),
  priority: prioritySchema.default("required"),
});

export const poolPositionSchema = z.enum(["depan", "belakang", "samping", "tidak_ada_preferensi"]);

export const amenitiesSchema = z.object({
  pool: z.object({
    included: z.boolean().default(false),
    position_preference: poolPositionSchema.optional(),
  }),
  kamar_pembantu: z.object({
    included: z.boolean().default(false),
    with_bathroom: z.boolean().default(false),
  }),
});

/**
 * Step 4's single choice — protects "kamar" or "ruang_komunal" when the lot
 * can't fit everything. The BFF translates this into a `priority` tag
 * ("required"/"flexible") on each relevant `room_program` entry before
 * calling the engine — see docs/hld/generation-engine-contract.md.
 */
export const priorityChoiceSchema = z.enum(["kamar", "ruang_komunal"]);

/**
 * The `lot` slice used by the step-1 ("data lahan") wizard form. Kept
 * separate from `designBriefSchema` so that form's resolver doesn't need
 * to know about fields no later step has collected yet.
 */
export const lotStepSchema = z.object({
  lot: lotSchema,
});

/**
 * Step 2's ("batasan regulasi") own field shape — `docs/prd/floor-plan-wizard.md`
 * collects a single "GSB samping" value applied to both lot sides, not the
 * stored contract's independent `left_m`/`right_m` (see
 * `docs/hld/generation-engine-contract.md`'s note on why those stay
 * independent). The step's page component is what reshapes
 * `gsb_samping_m` into both `setbacks.left_m` and `setbacks.right_m` on
 * submit — this schema validates the form as the user actually sees it.
 */
export const regulasiStepSchema = z
  .object({
    gsb_depan_m: optionalPositiveMeters,
    gsb_samping_m: optionalPositiveMeters,
    gsb_belakang_m: optionalPositiveMeters,
    kdb_percent: z.coerce.number().min(10).max(100).default(60),
    klb_percent: z.preprocess((val) => {
      if (val === "" || val === null) return undefined;
      if (typeof val === "number" && Number.isNaN(val)) return undefined;
      return val;
    }, z.coerce.number().min(10).max(300).optional()),
  })
  .refine((data) => data.klb_percent === undefined || data.klb_percent >= data.kdb_percent, {
    message: "KLB harus lebih besar atau sama dengan KDB",
    path: ["klb_percent"],
  });

export const parkirTipeSchema = z.enum(["carport", "garasi", "tidak_ada"]);
export const konsepRuangMakanKeluargaSchema = z.enum(["terpisah", "gabung"]);
export const dapurSchema = z.enum(["hanya_bersih", "bersih_dan_kotor"]);

/**
 * Step 3's ("program ruang") field shape — the biggest step, and the one
 * whose fields don't map 1:1 onto `room_program`/`amenities` entries; see
 * `buildRoomProgramFromStep3` below for the translation, and
 * `docs/prd/floor-plan-wizard.md` Step 3's "Notes" for why it isn't 1:1
 * (kamar tidur utama splits into two entries, dapur can split into two,
 * ruang makan/keluarga can merge into one, kamar pembantu/pool aren't
 * room_program entries at all).
 */
export const programRuangStepSchema = z
  .object({
    jumlah_lantai: z.coerce.number().int().min(1).max(3).default(1),
    jumlah_kamar_tidur: z.coerce.number().int().min(1).max(6).default(3),
    sertakan_kamar_tidur_utama: z.boolean().default(true),
    jumlah_kamar_mandi: z.coerce.number().int().min(1).max(6).default(2),
    parkir_tipe: parkirTipeSchema.default("carport"),
    parkir_kapasitas_mobil: z.coerce.number().int().min(1).max(4).default(1),
    ruang_tamu: z.boolean().default(true),
    konsep_ruang_makan_keluarga: konsepRuangMakanKeluargaSchema.default("gabung"),
    dapur: dapurSchema.default("hanya_bersih"),
    sertakan_kamar_pembantu: z.boolean().default(false),
    sertakan_km_pembantu: z.boolean().default(true),
    sertakan_area_servis: z.boolean().default(true),
    sertakan_kolam_renang: z.boolean().default(false),
    posisi_kolam_renang: poolPositionSchema.default("belakang"),
    taman_depan: z.boolean().default(true),
    taman_belakang: z.boolean().default(true),
    sertakan_mushola: z.boolean().default(false),
  })
  .refine(
    (data) => data.jumlah_kamar_tidur > 1 || data.sertakan_kamar_tidur_utama === false,
    {
      message: "Kamar tidur utama tidak bisa dipilih jika jumlah kamar tidur hanya 1",
      path: ["sertakan_kamar_tidur_utama"],
    },
  );

/**
 * Translates a validated Step 3 payload into the `floors`/`room_program`/
 * `amenities` slice of `designBriefSchema` — the actual engine contract
 * shape. Kept as a pure, independently-testable function rather than
 * inline in the page component, since this mapping (not the form itself)
 * is where the real risk of a wrong denah lives: a silently-dropped or
 * miscounted room here is exactly the class of bug ADR-0010 exists to
 * catch.
 */
export function buildRoomProgramFromStep3(
  data: ProgramRuangStep,
): Pick<DesignBrief, "floors" | "room_program" | "amenities"> {
  const room_program: RoomProgramItem[] = [];
  const req = (type: RoomType, count: number) =>
    room_program.push({ type, count, priority: "required" });

  if (data.sertakan_kamar_tidur_utama) {
    req("kamar_tidur_utama", 1);
    const remaining = data.jumlah_kamar_tidur - 1;
    if (remaining > 0) req("kamar_tidur", remaining);
  } else {
    req("kamar_tidur", data.jumlah_kamar_tidur);
  }

  req("kamar_mandi", data.jumlah_kamar_mandi);

  if (data.parkir_tipe !== "tidak_ada") {
    req(data.parkir_tipe, data.parkir_kapasitas_mobil);
  }

  if (data.ruang_tamu) req("ruang_tamu", 1);

  if (data.konsep_ruang_makan_keluarga === "gabung") {
    req("ruang_makan_keluarga", 1);
  } else {
    req("ruang_makan", 1);
    req("ruang_keluarga", 1);
  }

  if (data.dapur === "bersih_dan_kotor") {
    req("dapur_bersih", 1);
    req("dapur_kotor", 1);
  } else {
    req("dapur", 1);
  }

  if (data.sertakan_area_servis) req("area_servis", 1);
  if (data.taman_depan) req("taman_depan", 1);
  if (data.taman_belakang) req("taman_belakang", 1);
  if (data.sertakan_mushola) req("mushola", 1);

  const amenities: Amenities = {
    pool: {
      included: data.sertakan_kolam_renang,
      position_preference: data.sertakan_kolam_renang ? data.posisi_kolam_renang : undefined,
    },
    kamar_pembantu: {
      included: data.sertakan_kamar_pembantu,
      with_bathroom: data.sertakan_kamar_pembantu ? data.sertakan_km_pembantu : false,
    },
  };

  return { floors: data.jumlah_lantai, room_program, amenities };
}

export const designBriefSchema = z.object({
  lot: lotSchema,
  setbacks: setbacksSchema.optional(),
  // KDB bounds a single floor's footprint against lot area, so it can
  // never exceed 100%. KLB bounds *cumulative* floor area across every
  // floor (docs/prd/floor-plan-wizard.md's KDB-vs-KLB note) — a 3-floor
  // design at 100% footprint per floor is a legitimate 300% KLB, so its
  // upper bound has to be a multiple of KDB's, not the same ceiling.
  kdb_percent: z.number().min(10).max(100).default(60),
  klb_percent: z.number().min(10).max(300).optional(),
  floors: z.number().int().min(1).max(3),
  room_program: z.array(roomProgramItemSchema),
  amenities: amenitiesSchema,
  style: styleSchema,
  prioritas_saat_tidak_muat: priorityChoiceSchema.default("kamar"),
});

export type CompassDirection = z.infer<typeof compassDirectionSchema>;
export type LotPosition = z.infer<typeof lotPositionSchema>;
export type RoomType = z.infer<typeof roomTypeSchema>;
export type Style = z.infer<typeof styleSchema>;
export type Lot = z.infer<typeof lotSchema>;
export type Setbacks = z.infer<typeof setbacksSchema>;
export type Priority = z.infer<typeof prioritySchema>;
export type RoomProgramItem = z.infer<typeof roomProgramItemSchema>;
export type PoolPosition = z.infer<typeof poolPositionSchema>;
export type Amenities = z.infer<typeof amenitiesSchema>;
export type PriorityChoice = z.infer<typeof priorityChoiceSchema>;
export type LotStep = z.infer<typeof lotStepSchema>;
export type RegulasiStep = z.infer<typeof regulasiStepSchema>;
export type ParkirTipe = z.infer<typeof parkirTipeSchema>;
export type KonsepRuangMakanKeluarga = z.infer<typeof konsepRuangMakanKeluargaSchema>;
export type Dapur = z.infer<typeof dapurSchema>;
export type ProgramRuangStep = z.infer<typeof programRuangStepSchema>;
export type DesignBrief = z.infer<typeof designBriefSchema>;
