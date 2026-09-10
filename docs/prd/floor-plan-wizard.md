# Floor-Plan Wizard — Input Flow Spec

The wizard is how a user turns "a lot and an idea" into the request body
for `POST /v1/designs/generate` (`docs/hld/generation-engine-contract.md`).
It is 5 steps, each a separate route, sharing one persisted client-side
store so a user can move back and forth without losing input.

**Schema of record**: every field below is expected to exist as part of
`designBriefSchema` in `packages/schemas/src/design-brief.ts` (Zod). This
document is the human-readable spec that schema must match — if a field
listed here doesn't exist in `design-brief.ts`, or vice versa, one of the
two is out of date and needs fixing in the same PR that noticed the drift.
Each step's UI is a form validated against a step-scoped slice of that same
schema (`.pick()`/`.extend()`, not a redefinition — see the `new-wizard-step`
skill), so the wizard can never accept a value the shared schema would
reject.

**Wizard mechanics** (applies to all 5 steps, not repeated per step below):

- State is held in a Zustand store with persistence (`docs/techstack.md`),
  keyed per in-progress project, so refreshing the browser or navigating
  away and back does not lose already-entered steps.
- Every step's form uses React Hook Form with `zodResolver` against that
  step's schema slice — validation errors are field-level and inline, not
  a single generic "invalid input" banner.
- A step only advances on successful client-side validation of that step's
  fields; the BFF re-validates the full assembled brief against
  `designBriefSchema` again server-side before forwarding anything to the
  generation engine — the client check is for UX responsiveness, not the
  security/correctness boundary.
- A visible "step N of 5" indicator lets a user jump back to any
  already-completed step; jumping back and changing an earlier answer does
  not clear later steps unless the change makes a later answer invalid
  (e.g. changing `jumlahLantai` from 2 to 1 after already answering a
  floor-2-specific question, if one existed).

---

## Step 1 — Data Lahan (Lot)

What the buildable envelope is computed from (`docs/hld/data-model.md`'s
`app.projects.lot_*` columns; the engine's `lot` request object).

| Label (ID) | Field key | Type | Validation | Default | Help text |
|---|---|---|---|---|---|
| Lebar lahan (m) | `lebarM` | number (meters) | required; `3 ≤ x ≤ 100` | — (required, no default) | "Lebar sisi lahan yang menghadap jalan/akses utama, dalam meter." |
| Panjang lahan (m) | `panjangM` | number (meters) | required; `5 ≤ x ≤ 100` | — (required, no default) | "Panjang lahan dari depan ke belakang, dalam meter." |
| Arah hadap | `arahHadap` | enum (8-point compass): `utara` \| `timur_laut` \| `timur` \| `tenggara` \| `selatan` \| `barat_daya` \| `barat` \| `barat_laut` | required; one of the 8 values | — (required, no default) | "Arah mata angin yang dihadap sisi depan lahan (menghadap jalan)." |
| Posisi lahan | `posisiLahan` | enum: `sudut` \| `tengah` | required | `tengah` | "'Sudut' jika lahan hook di persimpangan dua jalan/sisi terbuka; 'tengah' untuk lahan di tengah blok." |

Note: `posisiLahan: 'sudut'` (a corner/hook lot) affects which sides have a
street-facing setback in principle, but v1 does not yet special-case a
corner lot's second street-facing side in the regulatory step below — it
still applies a single symmetric side setback to both sides (see Step 2).
A more precise corner-lot treatment is known future work, not yet
implemented; `posisiLahan` is still collected now because the field
belongs conceptually with the rest of the lot data and templates may use
it for orientation even before the setback logic accounts for it.

---

## Step 2 — Batasan Regulasi (Manual v1)

"Manual v1" because these are user-entered values with sensible generic
defaults, not looked up from a per-region zoning database (RTRW/RDTR) —
that lookup is a plausible future feature, not part of this version. Feeds
the engine's `setbacks`, `kdb_percent`, and `klb_percent` request fields.

| Label (ID) | Field key | Type | Validation | Default | Help text |
|---|---|---|---|---|---|
| GSB depan (m) | `gsbDepanM` | number (meters) | `0 ≤ x ≤ 20` | `3` | "Garis Sempadan Bangunan depan: jarak minimum bangunan dari batas lahan depan (menghadap jalan). Nilai default bersifat umum — gunakan angka dari izin/PBG wilayah Anda jika sudah tahu." |
| GSB samping (m) | `gsbSampingM` | number (meters) | `0 ≤ x ≤ 20` | `1.5` | "Jarak minimum bangunan dari batas lahan kiri dan kanan. Nilai ini diterapkan sama untuk kedua sisi." |
| GSB belakang (m) | `gsbBelakangM` | number (meters) | `0 ≤ x ≤ 20` | `2` | "Jarak minimum bangunan dari batas lahan belakang." |
| KDB (%) | `kdbPercent` | number (percent) | `10 ≤ x ≤ 100` | `60` | "Koefisien Dasar Bangunan: persentase maksimum luas lahan yang boleh tertutup bangunan di lantai dasar." |
| KLB (%) | `klbPercent` | number (percent), optional/nullable | if provided: `x ≥ kdbPercent` | `null` (not enforced if blank) | "Koefisien Lantai Bangunan: persentase maksimum total luas lantai dari SEMUA lantai terhadap luas lahan. Opsional — kosongkan jika belum tahu nilainya." |

**KDB vs. KLB — do not conflate these two checks** (root `CLAUDE.md` §4):
KDB bounds how much of the *lot* the ground floor may cover — a single-floor
check against lot area. KLB bounds the *cumulative* floor area summed
across every floor the design has — a multi-floor check, also against lot
area, that only starts to diverge from KDB once `jumlahLantai` (Step 3) is
greater than 1. A single-floor design that exactly meets KDB automatically
satisfies an equal-or-looser KLB; a multi-floor design can easily satisfy
KDB (small footprint) while violating KLB (too much cumulative area stacked
across floors), or vice versa cannot happen — KLB can never be tighter than
KDB and still be jointly satisfiable, which is exactly what the `klbPercent
≥ kdbPercent` validation rule above enforces at the input stage, before the
engine's own validation stage re-checks both independently against the
actual generated geometry.

---

## Step 3 — Program Ruang

The room program. Maps to the engine's `floors`, `room_program`, and
`amenities` request fields (`docs/hld/generation-engine-contract.md`,
which also explains how a couple of these UI-level fields get split or
combined before they reach the engine's wire format).

| Label (ID) | Field key | Type | Validation | Default | Help text |
|---|---|---|---|---|---|
| Jumlah lantai | `jumlahLantai` | integer | `1 ≤ x ≤ 3` | `1` | "Jumlah lantai bangunan, termasuk lantai dasar. Lebih dari 1 lantai akan menambahkan tangga secara otomatis ke denah." |
| Jumlah kamar tidur | `jumlahKamarTidur` | integer | `1 ≤ x ≤ 6` | `3` | "Total kamar tidur, termasuk kamar tidur utama jika dipilih di bawah." |
| Sertakan kamar tidur utama | `sertakanKamarTidurUtama` | boolean | disabled/forced `false` when `jumlahKamarTidur === 1` | `true` when `jumlahKamarTidur ≥ 2`, else `false` | "Tandai salah satu kamar tidur sebagai kamar tidur utama (biasanya lebih luas, dengan kamar mandi dalam)." |
| Jumlah kamar mandi | `jumlahKamarMandi` | integer | `1 ≤ x ≤ 6` | `2` | "Total kamar mandi, tidak termasuk KM pembantu (diatur terpisah di bawah)." |
| Tipe parkir | `parkirTipe` | enum: `carport` \| `garasi` \| `tidak_ada` | required | `carport` | "'Carport' untuk area parkir beratap terbuka, 'garasi' untuk ruang tertutup, atau 'tidak ada' jika tidak perlu." |
| Kapasitas mobil | `parkirKapasitasMobil` | integer | `1 ≤ x ≤ 4`; only shown/required when `parkirTipe ≠ 'tidak_ada'` | `1` | "Jumlah mobil yang perlu ditampung." |
| Ruang tamu | `ruangTamu` | boolean | — | `true` | "Ruang penerima tamu di bagian depan rumah." |
| Konsep ruang makan & keluarga | `konsepRuangMakanKeluarga` | enum: `terpisah` \| `gabung` | required | `gabung` | "'Gabung' untuk ruang makan dan ruang keluarga terbuka jadi satu (konsep open-plan); 'terpisah' untuk dua ruang berbeda." |
| Dapur | `dapur` | enum: `hanya_bersih` \| `bersih_dan_kotor` | required | `hanya_bersih` | "'Hanya bersih' untuk satu dapur serbaguna; 'bersih dan kotor' untuk dapur bersih (saji/tampilan) terpisah dari dapur kotor (masak berat, biasanya dekat area servis)." |
| Sertakan kamar pembantu | `sertakanKamarPembantu` | boolean | — | `false` | "Kamar tinggal untuk asisten rumah tangga (ART)." |
| Sertakan KM pembantu | `sertakanKmPembantu` | boolean | only shown when `sertakanKamarPembantu === true` | `true` when kamar pembantu included | "Kamar mandi khusus berdekatan dengan kamar pembantu." |
| Sertakan area servis/jemuran | `sertakanAreaServis` | boolean | — | `true` | "Area cuci dan jemur pakaian, biasanya di bagian belakang dekat dapur kotor." |
| Sertakan kolam renang | `sertakanKolamRenang` | boolean | — | `false` | "Kolam renang sebagai elemen tambahan pada denah." |
| Posisi kolam renang | `posisiKolamRenang` | enum: `depan` \| `belakang` \| `samping` \| `tidak_ada_preferensi` | only shown when `sertakanKolamRenang === true` | `belakang` | "Preferensi posisi kolam renang pada lahan; solver akan mencoba mengikuti preferensi ini selama memungkinkan." |
| Taman depan | `tamanDepan` | boolean | — | `true` | "Area taman/ruang terbuka hijau di bagian depan lahan." |
| Taman belakang | `tamanBelakang` | boolean | — | `true` | "Area taman/ruang terbuka hijau di bagian belakang lahan." |
| Sertakan mushola kecil | `sertakanMushola` | boolean | — | `false` | "Ruang ibadah kecil sebagai ruang tersendiri." |

Notes on how these become the engine's `room_program`/`amenities` (full
detail in `docs/hld/generation-engine-contract.md`):

- `jumlahKamarTidur` and `sertakanKamarTidurUtama` together produce **up to
  two** `room_program` entries — a `kamar_tidur_utama` entry (count 1) if
  included, and a `kamar_tidur` entry for the remainder — never a single
  entry that conflates the two, since they are distinct room types with
  distinct size norms (`engine.room_type_norms`, `docs/hld/data-model.md`).
- `konsepRuangMakanKeluarga: 'gabung'` produces one combined room-program
  entry rather than two separate ones — the combined room is still a
  distinct room *type* (its own identifier, its own size norm), not two
  rooms rendered on top of each other.
- `sertakanKamarPembantu` and `sertakanKmPembantu` map to the `amenities`
  object, not to `room_program` — see the contract doc for why amenities
  (pool, kamar pembantu) are modeled separately from the countable room
  program.
- A boolean field left at its "off" default simply omits that room type
  from `room_program` entirely — there is no explicit "count: 0" entry;
  absence *is* the "not wanted" signal the engine reads.

---

## Step 4 — Gaya & Prioritas

| Label (ID) | Field key | Type | Validation | Default | Help text |
|---|---|---|---|---|---|
| Gaya arsitektur | `gayaArsitektur` | enum: `minimalis_modern` \| `tropis` \| `klasik` \| `industrial` | required | `minimalis_modern` | "Gaya visual yang memengaruhi tampilan fasad, atap, dan render 3D. Tidak mengubah tata letak ruang — hanya tampilan." |
| Prioritas jika lahan tidak cukup | `prioritasSaatTidakMuat` | enum: `kamar` \| `ruang_komunal` | required | `kamar` | "Jika seluruh program ruang tidak muat di lahan, mana yang lebih penting dipertahankan: jumlah/ukuran kamar, atau ruang komunal (ruang tamu/makan/keluarga)?" |

`prioritasSaatTidakMuat` does not itself appear as a field in the engine's
request — the BFF translates this single choice into a per-entry
`priority` tag (`required` vs. `flexible`) on the relevant `room_program`
entries before calling the engine. See
`docs/hld/generation-engine-contract.md` and
`docs/prd/design-generation-viewer.md` for what "flexible" entries actually
mean when the room program doesn't fit (which soft constraints the solver
relaxes first, and how that's surfaced to the user as a graceful degrade
rather than a silent drop).

`gayaArsitektur` only affects template *selection filtering* (which
style-tagged templates from `engine.templates` are eligible candidates)
and 3D material/rendering defaults — it never changes room-program
feasibility logic, which is driven entirely by Step 3's answers plus the
lot/regulatory data from Steps 1–2.

---

## Step 5 — Review & Generate

Not a form step — a read-only summary plus the submit action.

- A grouped summary of every answer from Steps 1–4, organized under the
  same four headings, each with an "Ubah" (edit) link that jumps back to
  that step without losing any other step's answers.
- The legal disclaimer, verbatim, displayed prominently above the submit
  button — not below it, not collapsed, not in smaller text than the
  surrounding content (`docs/prd/README.md`'s "Legal Disclaimer" section,
  ADR-0002):

  > Bukan dokumen konstruksi final — konsultasikan ke arsitek/insinyur
  > berlisensi sebelum membangun.

- The submit button ("Buat Denah" / "Generate") assembles the full brief,
  has the BFF re-validate it against `designBriefSchema`, sets
  `num_candidates` to a fixed default of `3` (not a user-facing control in
  v1 — see `docs/hld/generation-engine-contract.md`), and calls
  `POST /v1/designs/generate`. The result is shown per
  `docs/prd/design-generation-viewer.md`, including the graceful-degrade
  path if the request comes back `infeasible` or `partial`.
- Submitting is disabled (not just discouraged) until every required field
  from Steps 1–4 passes validation — Step 5 never re-opens a validation
  question Steps 1–4 already answered; it can only surface that an earlier
  step needs revisiting via its "Ubah" link.
