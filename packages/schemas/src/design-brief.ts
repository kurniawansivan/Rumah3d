import { z } from "zod";

/**
 * Full wizard input contract — the single source of truth for what a
 * "design brief" is, end to end. See docs/prd/floor-plan-wizard.md for the
 * step-by-step UI this maps to (`new-wizard-step` skill scaffolds each
 * step). Only the `lot`/`setbacks` slice is actually collected by the UI so
 * far (wizard step 1, "lot data") — the rest of the shape is defined now so
 * the BFF <-> generation-engine contract doesn't need to change shape as
 * later steps are added, only get populated with real values.
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

export const roomProgramItemSchema = z.object({
  type: roomTypeSchema,
  count: z.number().int().positive(),
});

export const amenitiesSchema = z.object({
  pool: z.boolean(),
  kamar_pembantu: z.boolean(),
});

/**
 * The `lot` + `setbacks` slice used by the step-1 ("lot data") wizard form.
 * Kept separate from `designBriefSchema` so that form's resolver doesn't
 * need to know about fields no later step has collected yet.
 */
export const lotStepSchema = z.object({
  lot: lotSchema,
  setbacks: setbacksSchema.optional(),
});

export const designBriefSchema = z.object({
  lot: lotSchema,
  setbacks: setbacksSchema.optional(),
  kdb_percent: z.number().min(1).max(100).default(60),
  klb_percent: z.number().min(1).max(100).optional(),
  floors: z.number().int().min(1).max(3),
  room_program: z.array(roomProgramItemSchema),
  amenities: amenitiesSchema,
  style: styleSchema,
});

export type CompassDirection = z.infer<typeof compassDirectionSchema>;
export type LotPosition = z.infer<typeof lotPositionSchema>;
export type RoomType = z.infer<typeof roomTypeSchema>;
export type Style = z.infer<typeof styleSchema>;
export type Lot = z.infer<typeof lotSchema>;
export type Setbacks = z.infer<typeof setbacksSchema>;
export type RoomProgramItem = z.infer<typeof roomProgramItemSchema>;
export type Amenities = z.infer<typeof amenitiesSchema>;
export type LotStep = z.infer<typeof lotStepSchema>;
export type DesignBrief = z.infer<typeof designBriefSchema>;
