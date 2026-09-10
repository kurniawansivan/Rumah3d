import type {
  CompassDirection,
  LotPosition,
  PoolPosition,
  PriorityChoice,
  RoomType,
  Style,
} from "@rumah3d/schemas";

// Indonesian display labels for the wizard's enum values — presentation
// only, kept out of packages/schemas on purpose (that package is data/
// contract, not UI copy; same split as the rule_id -> sentence dictionary
// docs/prd/design-generation-viewer.md describes for the engine's output).
// `Record<Enum, string>` rather than a plain object: a schema enum losing
// or gaining a member becomes a compile error here instead of a silent
// missing label.

export const FACING_LABELS: Record<CompassDirection, string> = {
  utara: "Utara",
  timur_laut: "Timur Laut",
  timur: "Timur",
  tenggara: "Tenggara",
  selatan: "Selatan",
  barat_daya: "Barat Daya",
  barat: "Barat",
  barat_laut: "Barat Laut",
};

export const LOT_POSITION_LABELS: Record<LotPosition, string> = {
  tengah: "Tengah (diapit tetangga di kedua sisi)",
  sudut: "Sudut (menghadap dua sisi jalan)",
};

export const STYLE_LABELS: Record<Style, string> = {
  minimalis_modern: "Minimalis Modern",
  tropis: "Tropis",
  klasik: "Klasik",
  industrial: "Industrial",
};

export const PRIORITAS_LABELS: Record<PriorityChoice, string> = {
  kamar: "Kamar (jumlah/ukuran kamar)",
  ruang_komunal: "Ruang komunal (ruang tamu/makan/keluarga)",
};

export const POOL_POSITION_LABELS: Record<PoolPosition, string> = {
  depan: "Depan",
  belakang: "Belakang",
  samping: "Samping",
  tidak_ada_preferensi: "Tidak ada preferensi",
};

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  kamar_tidur_utama: "Kamar Tidur Utama",
  kamar_tidur: "Kamar Tidur",
  kamar_mandi: "Kamar Mandi",
  dapur: "Dapur",
  dapur_bersih: "Dapur Bersih",
  dapur_kotor: "Dapur Kotor",
  ruang_tamu: "Ruang Tamu",
  ruang_makan: "Ruang Makan",
  ruang_keluarga: "Ruang Keluarga",
  ruang_makan_keluarga: "Ruang Makan & Keluarga",
  carport: "Carport",
  garasi: "Garasi",
  area_servis: "Area Servis/Jemuran",
  kamar_pembantu: "Kamar Pembantu",
  taman_depan: "Taman Depan",
  taman_belakang: "Taman Belakang",
  mushola: "Mushola",
};
