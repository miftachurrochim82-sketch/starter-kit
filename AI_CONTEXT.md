# 🤖 AI_CONTEXT.md — Surat Pengantar Ekosistem (untuk AI coder / developer baru)

> Baca file ini DULU sebelum menyentuh apa pun di folder ini.
> Versi konteks: 2026-09-17 • Pemelihara: Tim TI Diskominfo Kab. Trenggalek

## 1. Apa ini

`starter-kit/` = template resmi untuk membuat **aplikasi web bisnis baru** Pemkab Trenggalek
di atas Google Apps Script (GAS) + Vue 3 (in-DOM template) + ekosistem bersama.
Dicetak dari prototipe produksi **si-kompetensi** (test 55/0/0) dan **si-platform** (21/21).

## 2. Empat pilar ekosistem (JANGAN bangun ulang — pakai)

| Pilar | Bentuk | Versi pin | Peran |
|---|---|---|---|
| **CoreLib** | GAS Library, ID `1GmeYflfMpRa1iTVgFHRD6K1DMoxc9OoKqpuucPJXgNZ9XBK06O7wgDkO` | **14** (v2.2.4) | mesin sheet/CRUD/cache/sesi/SSO: `getDb`, `ensureSheet(+decorate)`, `getSheetDataCached`, `apiSave`, `apiDelete`, `exchangePlatformTicket`, `checkAuth`, `logoutUser`, `genUniqueCode`, `normId`, `parseDate`, `getHighestRole`, `checkRole` |
| **frontend-cdn** | jsDelivr `@v2.7.5`: `app-common.min.css`, `app-components.min.js`, `app-modules.min.js` | **v2.7.5** eksplisit (JANGAN `@latest`) | token desain + 15 komponen kit (`app-sidebar`, `app-header`, `app-crud-table`, `app-modal`, `app-filter-bar`, `app-stat-card`, `app-badge`, `app-chart-bar/doughnut`, `app-skeleton`, `app-empty-state`, `app-pegawai-picker`, `app-settings`, `app-profile`) |
| **si-platform** | GAS web app (SSO IdP + hub) | URL di `01_Config.gs` | login/user/role/permission/audit/notifikasi/file/konfigurasi; tiket SSO sekali pakai |
| **SIMPEG** | Spreadsheet master (read-only bagi app) | — | 3 sheet referensi `PEGAWAI`, `JABATAN`, `UNIT_KERJA` — CoreLib otomatis route ke DB master via opsi `masterSsId` |

Vue 3.5.42 (unpkg) • Font Awesome 6.5.2 • Tailwind: Play CDN saat dev, compiled saat prod.

## 3. Aturan keras (kontrak — pelanggaran = bug produksi)

1. **CoreLib first**: cek katalog CoreLib/kit sebelum menulis fungsi/util/UI sendiri.
   Wrapper lokal boleh, isinya wajib `return CoreLib.x(...)`.
2. **Tag kit berpasangan**: `<app-x ...></app-x>`. Self-closing `/>` pada in-DOM template
   = parser browser membiarkan tag terbuka dan **menelan elemen berikutnya** (bug historis 2×).
3. **Pin versi eksplisit** untuk CDN & library. Naikkan pin secara sadar, catat.
4. **Tolerant reader** untuk SIMPEG: baca kolom by header name, proyeksi kolom yang dipakai.
5. **GAS = kebenaran produksi**; workspace = kebenaran pengembangan. Alur deploy = salin
   whole-file manual ke editor GAS → **Deploy ▸ New version** (tanpa ini perubahan tidak live).
6. **Anti-kontaminasi Cloudflare**: jangan salin kode dari halaman yang dibentengi CF
   (cirinya: muncul skrip `__CF$cv`/iframe tersembunyi di ekor file). Salin dari sumber tepercaya.
7. **contract-check sebelum deploy**: `python3 frontend-cdn/tools/contract_check.py`
   (jalan di workspace Arena; memeriksa 7 kelas pelanggaran; exit 0 = aman).
8. Database app baru: **5–10 sheet** (`M_REFERENSI` + `T_*`); kolom audit
   `created_at..deleted_at` wajib; sheet sesi/audit diurus CoreLib.
9. Tabel dengan header sortable / checkbox select-all: tetap custom (th kit hanya teks).
   Komponen ber-root div (skeleton/empty-state) ilegal di dalam `<tbody>`.

## 4. Katalog jebakan historis (pelajaran berdarah — jangan diulang)

- **Salah-paste**: paste whole-file bisa mendarat di file salah → pola audit
  `auditSalinan()` (panjang + ekor isi per file) dipakai pasca-ronde salin besar.
- **Deployment snapshot**: `/exec` menyajikan versi terakhir yang di-deploy; lupa
  "New version" = perubahan tak terlihat meski kode benar.
- **Self-closing** (lihat aturan 2) dan **skeleton dead-code** (blok loading yang tak
  pernah tampil karena halaman disembunyikan saat loading).
- **Bare globals**: fungsi helper harus `this.*` di methods Vue atau global eksplisit.
- **Tag konten balapan**: komponen dirender sebelum data siap → selalu guard `|| []`.

## 5. Cara mengetes

- CoreLib: run `testAll` di proyek Library → wajib FAIL 0 (PASS 38 / SKIP 1 normal).
- App: tiap app punya suite sendiri (pola `99_TestSuite.gs` / `runAllTests...`).
- Kontrak: contract-check (aturan 7). Setelah ronde salin besar: `auditSalinan()`.

## 6. Peta dokumen lanjutan

- Repo `frontend-cdn`: `ECOSYSTEM_GUIDE.md` (arsitektur + katalog props), `ROADMAP_CDN.md`,
  `frontend/CDN_SNIPPET.md` (cuplikan head), `backend/00_MIGRATION_v2.md`.
- Repo `starter-kit`: `README.md` (checklist 13 langkah) + folder `src/` ini.
- Workspace Arena: `DAFTAR_SALIN.md` (jurnal salin manual), `STATUS_PROYEK.md` (memori proyek).

## 7. Gaya kerja pemilik proyek

- Pemilik pemula teknis: bahasa sederhana, snippet copy-paste utuh, analogi sehari-hari.
- Perubahan besar = bertahap + **gate** (salin → tes → lihat hasil → baru lanjut).
- Tidak ada push otomatis ke GitHub dari tooling; unggah manual via *Upload files*.
- Tag rilis: selalu tag BARU, jangan geser/hapus tag lama.
