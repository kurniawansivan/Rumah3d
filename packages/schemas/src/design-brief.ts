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
  "ruang_tamu",
  "ruang_makan",
  "ruang_keluarga",
  "carport",
  "area_servis",
  "kamar_pembantu",
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
export type DesignBrief = z.infer<typeof designBriefSchema>;
