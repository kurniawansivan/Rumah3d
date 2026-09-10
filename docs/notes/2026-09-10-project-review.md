# Review Proyek Rumah3d — Kenapa Terasa Berat di Awal, dan Rekomendasinya

Saya sudah baca codebase-nya langsung: `CLAUDE.md`, semua `docs/adr/0001`–`0011`,
`docs/techstack.md`, konfigurasi CI (`.github/workflows/ci.yml`), git hooks
(`.husky/`, `.lintstagedrc.json`, `commitlint.config.js`), `docker-compose.yml`,
`Makefile`, `turbo.json`, serta `package.json`/`pyproject.toml` di masing-masing
workspace. Kesimpulan singkat di depan: **stack dan struktur repo-nya sudah bagus
dan sangat well-reasoned** (ada ADR untuk hampir setiap keputusan besar) — masalah
yang kamu rasakan lebih ke _proses kerja di fase awal_, bukan ke pilihan
teknologinya. Berikut breakdown per poin yang kamu tanyakan.

## 1. Kenapa CI/CD sudah ada dari awal development

Ini bukan kebiasaan copy-paste template — ada `docs/adr/0010-non-negotiable-testing-gate.md`
(tertanggal 2026-09-09, sehari sebelum project ini mulai) yang eksplisit bilang
ini adalah **keputusan product-owner yang non-negotiable**, dengan alasan yang
cukup spesifik: generation engine kamu (template + constraint solver, lihat
ADR-0003) berisiko menghasilkan _"denah yang kelihatan masuk akal tapi salah"_ —
ruangan overlap beberapa cm, KDB/KLB kelewat, room program diam-diam hilang satu
kamar, atau solver tidak deterministic. Bug seperti ini tidak akan crash, tidak
kelihatan di UI, dan langsung merusak premis produk kamu (denah yang bisa
dipercaya sebagai starting point sebelum ke arsitek — ADR-0002). Jadi gate
lint+typecheck+test+coverage 70% ini memang dirancang sebagai _spesifikasi
kebenaran_, bukan sekadar "best practice".

Yang menurut saya jadi sumber rasa sakitnya: **kebijakannya benar, tapi
diterapkan di volume penuh sejak commit pertama**, padahal `generation-engine`
sendiri masih stub (`services/generation-engine/README.md` bilang "Current
State: Stub only") dan baru ada 2 commit di riwayat git. Threshold coverage 70%

- Playwright E2E + Hypothesis property test itu berat untuk kecepatan iterasi
  awal ketika API contract-nya sendiri masih berubah-ubah.

**Rekomendasi:** jangan matikan gate-nya diam-diam — `CLAUDE.md` §12 secara
eksplisit melarang itu ("lower coverage thresholds or skip failing tests to
unblock a merge"), dan ADR-0010 bilang kalau kebijakannya mau berubah harus
lewat keputusan eksplisit, bukan edit CI diam-diam. Karena kamu sendiri yang
berperan sebagai product owner di sini, opsi yang konsisten dengan proses
repo ini adalah: tulis ADR baru (pakai skill `new-adr`) yang secara eksplisit
menurunkan bar untuk fase "engine masih stub" — misalnya coverage floor lebih
rendah atau E2E di-skip sementara — dan naikkan lagi begitu solver asli mulai
diimplementasikan. Itu lebih sehat daripada bypass manual berulang-ulang.

## 2. Token cost boros karena multiagent

Saya tidak menemukan konfigurasi agent/orchestration apa pun di repo (tidak
ada folder `.claude/agents`, tidak ada workflow script) — jadi ini murni pola
kerja kamu saat pakai Claude Code, bukan sesuatu yang salah di repo. Tapi ada
petunjuk kuat di working tree kamu sekarang: **ada 30+ file staged untuk
commit sekaligus** — menyentuh schema Prisma + migration, schema Alembic +
migration, Pydantic schemas, API route, Zod schemas, test files di FE dan BE,
lockfile `pnpm-lock.yaml` dan `uv.lock` — semuanya dalam satu batch, padahal
riwayat commit baru ada 2. Pola "generate lintas domain (FE+BE+schema+DB)
sekaligus dalam satu batch besar" itulah yang biasanya mahal secara token:
agent harus baca/tulis konteks di banyak package berbeda dalam satu sesi,
sering kali dengan sub-agent terpisah per domain yang saling overlap
konteksnya.

**Rekomendasi:** pecah task per package/feature. Karena `packages/schemas`
adalah shared contract (CLAUDE.md §12: perubahan di sana wajib disertai update
ke sisi yang jadi tidak sinkron, _dalam PR yang sama_), urutan kerja yang lebih
murah adalah: (a) ubah `packages/schemas` dulu jadi PR/commit kecil sendiri,
(b) baru minta agent kerjakan sisi engine, (c) baru sisi web — masing-masing
sebagai task terpisah, bukan "buatkan fitur X end-to-end" dalam satu prompt
besar. Ini juga otomatis membuat `gate` lebih cepat jalan karena CI kamu sudah
path-filtered (lihat `changes` job di `ci.yml`) — kalau satu commit cuma
menyentuh `services/generation-engine`, job web (lint/typecheck/test/build/e2e)
otomatis di-skip. Commit besar lintas-domain membuang keuntungan itu.

## 3. Commit sering gagal karena linting/rules bentrok

Saya cek `.husky/pre-commit` dan `.lintstagedrc.json` — konfigurasinya sendiri
tidak ada konflik aturan (ESLint dan Prettier tidak menyentuh file yang sama,
Ruff check+format juga jalan berurutan dengan benar). Tapi ada beberapa sumber
kegagalan nyata yang konsisten dengan gejala kamu:

- **Commit message harus Conventional Commits** (`commit-msg` hook menjalankan
  `commitlint --edit`, `commitlint.config.js` pakai
  `@commitlint/config-conventional`). Commit apa pun yang tidak diawali
  `feat:`, `fix:`, `chore:`, dll (atau typo scope-nya) akan ditolak di tahap
  commit-msg, terpisah dari soal lint kode.
- **`gitleaks` di pre-commit** — kalau tidak terinstal, hook di-skip (aman),
  tapi kalau terinstal dan ada string yang mirip credential (termasuk
  `.env.example` yang isinya `rumah3d:rumah3d` sebagai placeholder), ini bisa
  false-positive dan block commit.
- **Batch besar = permukaan gagal lebih luas.** Dengan 30+ file staged
  lintas-bahasa, satu pelanggaran ESLint yang _tidak auto-fixable_, satu
  Ruff rule yang butuh perubahan manual, atau satu `uv` environment yang
  belum di-`sync` — semua langsung menggagalkan seluruh commit, bukan cuma
  bagian yang bermasalah.

**Rekomendasi:** pakai skill `ship-check` (sudah ada di `.claude/skills/`)
_sebelum_ commit, bukan cuma mengandalkan git hook untuk menangkapnya — ini
menjalankan gate yang sama persis dengan CI dan melaporkan pass/fail per
check. Dan lagi-lagi: commit lebih kecil dan lebih sering akan langsung
mengurangi kemungkinan tabrakan.

## 4. Kejelasan menjalankan project (FE/BE, venv, pnpm)

Instruksinya sebenarnya sudah didokumentasikan, tapi terpecah di 3 tempat
(`README.md`, `CLAUDE.md` §5, `services/generation-engine/README.md`) dengan
model mental yang tidak dijelaskan secara eksplisit. Setelah saya rekonstruksi
dari kode aslinya, begini cara kerjanya:

- `make install` = `pnpm install` (semua workspace JS/TS) + `cd
services/generation-engine && uv sync` (venv Python, terisolasi per
  `.venv/` di folder itu sendiri — **kamu tidak perlu aktivasi manual venv**,
  semua command Python dijalankan lewat `uv run ...`).
- `make dev` = `pnpm dev` = `turbo run dev`. Cek `turbo.json`: task `dev`
  tidak di-filter, tapi **hanya package yang punya script `"dev"` di
  `package.json`-nya yang akan jalan** — dan cuma `apps/web` yang punya itu.
  `services/generation-engine/package.json` sengaja cuma punya
  `lint`/`typecheck`/`test`, tidak ada `dev`. Jadi `pnpm dev` **hanya
  menjalankan Next.js**, itu bukan bug, itu memang desainnya.
- Backend (Postgres + generation-engine) dijalankan lewat
  `docker compose up -d`, terpisah dari `pnpm dev` (lihat ADR-0011). Jadi
  alur harian yang benar itu: `docker compose up -d` (sekali di awal sesi
  kerja, biarkan jalan di background) lalu `make dev` / `pnpm dev` untuk
  frontend dengan hot-reload Next.js normal.
- **Ada satu gap nyata yang saya temukan**: `docker-compose.yml`
  me-mount `./services/generation-engine/src:/app/src` supaya kode Python
  ter-update live, tapi `Dockerfile`-nya (`CMD ["uvicorn",
"generation_engine.main:app", "--host", "0.0.0.0", "--port", "8000"]`)
  **tidak pakai flag `--reload`**. Artinya perubahan kode Python di container
  itu tidak otomatis ke-reload — kamu perlu `docker compose restart
generation-engine` manual tiap ubah kode Python, padahal niatnya (sesuai
  ADR-0011) itu harus reflect otomatis. Ini kemungkinan besar salah satu
  sumber kebingungan "kok backend-nya nggak update-update".

**Rekomendasi konkret:** tambahkan `--reload` ke CMD uvicorn di Dockerfile
(atau override command di `docker-compose.yml` khusus untuk dev), dan
tambahkan satu paragraf pendek di root `README.md` yang menjelaskan pembagian
tugas ini secara eksplisit: _"`pnpm dev` = frontend saja; `docker compose up
-d` = backend (Postgres + generation-engine); keduanya jalan bersamaan saat
development, tidak perlu run generation-engine manual dengan `uv run
uvicorn` kecuali kamu sedang debug backend di luar Docker."_ Bagian "Run it
later" di `services/generation-engine/README.md` sebenarnya valid tapi
sekarang terbaca seolah itu cara utama menjalankan backend — sebaiknya diberi
catatan bahwa itu jalur alternatif/debug, bukan jalur harian.

## 5. Apakah stack-nya kurang mendukung project ini

Dari yang saya baca (`docs/techstack.md` + ADR terkait), saya menilai
**stack-nya sudah tepat untuk domainnya**, bukan sumber masalah:

- Next.js + TS untuk FE/BFF, Python/FastAPI terpisah khusus untuk
  generation-engine — pemisahan ini masuk akal karena Shapely (geometri 2D)
  dan OR-Tools CP-SAT (constraint solver deterministic) memang tidak punya
  padanan matang di ekosistem JS (ADR-0003, ADR-0006). Pilihan rule-based +
  constraint solver dibanding generative ML juga tepat secara sadar hukum:
  hasilnya harus deterministic dan explainable karena ini terkait
  keselamatan bangunan (KDB/KLB, GSB) — bukan sekadar preferensi teknis.
- Zod di `packages/schemas` sebagai satu sumber kebenaran untuk validasi FE
  dan kontrak API itu pola yang solid untuk monorepo polyglot seperti ini.
- Satu hal yang perlu kamu sadari sebagai _area risiko operasional_ (bukan
  salah pilih): Postgres satu database dengan dua schema (`app` via Prisma,
  `engine` via Alembic) **tanpa foreign key lintas schema** (ADR-0007) —
  konsistensi `project_id`/`user_id` antar schema itu tanggung jawab kode
  aplikasi, bukan database. Ini keputusan sadar demi migration history yang
  independen, tapi berarti butuh disiplin test/validasi ekstra di layer API
  supaya data tidak jadi orphan antar schema. Selama test coverage yang
  disyaratkan ADR-0010 benar-benar mengcover ini, risikonya terkelola.

Kesimpulan: saya tidak akan mengganti stack apa pun di sini. Yang perlu
diperbaiki adalah _cara kerja mengelilingi stack ini_, bukan stack-nya
sendiri.

---

## Ringkasan prioritas tindakan

1. Tambahkan `--reload` ke uvicorn CMD di
   `services/generation-engine/Dockerfile` — fix cepat, high impact untuk
   dev-loop harian.
2. Tulis satu paragraf di root `README.md` yang menjelaskan pembagian
   `pnpm dev` (FE) vs `docker compose up -d` (BE), supaya tidak perlu
   rekonstruksi manual seperti yang saya lakukan di atas.
3. Ganti pola kerja dari "generate lintas domain dalam satu batch besar" ke
   commit/PR kecil per package (schemas → engine → web berurutan) — ini
   sekaligus menurunkan token cost dan menurunkan permukaan kegagalan commit.
4. Pakai skill `ship-check` sebelum commit, bukan hanya mengandalkan git
   hook, supaya kegagalan lint/typecheck ketahuan sebelum commit-msg/staged
   files jadi berantakan.
5. Kalau memang mau melonggarkan gate CI untuk fase stub sekarang, lakukan
   lewat ADR baru (skill `new-adr`) yang secara eksplisit menurunkan bar
   sementara — jangan diam-diam lower threshold atau skip test, karena itu
   melanggar guardrail yang sudah kamu tulis sendiri di `CLAUDE.md` §12.
