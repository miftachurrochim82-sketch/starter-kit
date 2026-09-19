# 🤖 AI_CONTEXT.md — Surat Pengantar Ekosistem (untuk AI coder / developer baru)

> Baca file ini **DULU** sebelum menyentuh apa pun di folder ini.
> Versi konteks: 2026-09-19 (starter-kit v2.0) • Pemelihara: Tim TI Diskominfo Kab. Trenggalek

---

## 1. Apa ini

`starter-kit/` = template resmi untuk membuat **aplikasi web bisnis baru** Pemkab Trenggalek
di atas Google Apps Script (GAS) + Vue 3 (in-DOM template) + ekosistem bersama.

**Versi v2.0** (2026-09-19): cetakan ulang dari pola **si-kompetensi v6.0.1** dan
**si-lahar v2.1.0** — keduanya sudah produksi + lolos CoreLib-First audit.

**Perubahan besar v1.0 → v2.0**:
- Backend: **4 file → 3 file** (gabung `01_Config` + `02_SetupAndSeed` → `01_ConfigAndBridge`; `03_AppLogic` + `04_Router` → `02_AppLogic`).
- Dispatcher: `handleApi` switch-case manual → **`CoreLib.dispatchAction`** + `actionLevels` fail-closed.
- Pre-save hook **P1/P2**: gen-id + kunci field verifikasi (anti self-approve).
- Filter soft-delete **otomatis** di `getSheetData_` (opsi `{includeDeleted:true}` untuk audit).
- Skema standar: **3 master + 7 tabel = 10 sheet** (minimal standar ekosistem adalah 3+3).
- CDN `@v2.7.5` → **`@v2.8.1`** (internal "2.8.0"); CoreLib pin 14 → **pin 15** (v2.3.0).
- Test suite pola si-lahar: `runLibraryTests` + adopsi + routing + domain.
- Vue `3.4.21` → **`3.5.42`** (pinned, sinkron ekosistem).
- Frontend: struktur modular `V_*` / `J_*`, tanpa `A0_Head.html` (inline ke `Index.html`).

---

## 2. Empat pilar ekosistem (JANGAN bangun ulang — pakai)

| Pilar | Bentuk | Versi pin | Peran |
|---|---|---|---|
| **CoreLib** | GAS Library, ID `1GmeYflfMpRa1iTVgFHRD6K1DMoxc9OoKqpuucPJXgNZ9XBK06O7wgDkO` | **15** (v2.3.0) | Mesin sheet/CRUD/cache/sesi/SSO: `getDb`, `ensureSheet(+decorate)`, `getSheetDataCached`, `apiSave`, `apiDelete`, `exchangePlatformTicket`, `checkAuth`, `logoutUser`, `dispatchAction`, `genUniqueCode`, `normId`, `normStr`, `parseDate`, `whitelist`, `getHighestRole`, `checkRole`, `todayIsoLocal`, `dateKey10`, `paginate`, `matchSearch`, `getEnvProperty`, `isAllowedConfigKey`, `initDatabase`, `executeAppSetup`, `jsonResponse` |
| **frontend-cdn** | jsDelivr `@v2.8.1` (internal `2.8.0`): `app-common.min.css`, `app-components.min.js`, `app-core.min.js`, `app-modules.min.js` | **v2.8.1** eksplisit (JANGAN `@main`) | Token desain + 15 komponen kit (`app-sidebar`, `app-header`, `app-crud-table`, `app-modal`, `app-filter-bar`, `app-stat-card`, `app-badge`, `app-chart-bar`/`doughnut`, `app-skeleton`, `app-empty-state`, `app-pegawai-picker`, `app-settings`, `app-profile`, `app-login`) |
| **si-platform** | GAS web app (SSO IdP + hub) | URL di `01_ConfigAndBridge.gs` | Login/user/role/permission/audit/notifikasi/file/konfigurasi; tiket SSO sekali pakai |
| **SIMPEG** | Spreadsheet master (read-only bagi app) | — | 3 sheet referensi `PEGAWAI`, `JABATAN`, `UNIT_KERJA` — CoreLib otomatis route ke DB master via opsi `masterSsId` |

**Vue 3.5.42** (pinned) • **Font Awesome 6.5.2** • Tailwind: Play CDN saat dev, compiled saat prod.

---

## 3. Aturan keras (kontrak — pelanggaran = bug produksi)

1. **CoreLib first**: cek katalog CoreLib/kit sebelum menulis fungsi/util/UI sendiri.
   Wrapper lokal boleh, isinya wajib `return CoreLib.x(...)`. Untuk app baru dari
   starter-kit ini, wrapper delegasi sudah **dihapus total** — panggil langsung.
2. **Tag kit berpasangan**: `<app-x ...></app-x>`. Self-closing `/>` pada in-DOM template
   = parser browser membiarkan tag terbuka dan **menelan elemen berikutnya** (bug historis 2×).
3. **Pin versi eksplisit** untuk CDN & library. Naikkan pin secara sadar, catat di commit.
4. **Tolerant reader** untuk SIMPEG: baca kolom by header name, proyeksi kolom yang dipakai.
5. **GAS = kebenaran produksi**; workspace = kebenaran pengembangan. Alur deploy = salin
   whole-file manual ke editor GAS → **Deploy ▸ New version** (tanpa ini perubahan tidak live).
6. **Anti-kontaminasi Cloudflare**: jangan salin kode dari halaman yang dibentengi CF
   (cirinya: muncul skrip `__CF$cv`/iframe tersembunyi di ekor file). Salin dari sumber tepercaya.
7. **contract-check sebelum deploy**: `python3 frontend-cdn/tools/contract_check.py`
   (jalan di workspace Arena; memeriksa 7 kelas pelanggaran; exit 0 = aman).
8. Database app baru: **minimal 3 master + 3 tabel** (starter-kit ini: 3 + 7 = 10 sheet);
   kolom audit `created_at..deleted_at` **wajib** (diisi CoreLib otomatis); sheet sesi/audit
   diurus CoreLib (jangan bikin sheet lokal).
9. Tabel dengan header sortable / checkbox select-all: tetap custom (th kit hanya teks).
   Komponen ber-root div (skeleton/empty-state) ilegal di dalam `<tbody>`.
10. **SSO native CoreLib** — tidak ada fallback email aktif. Kalau SSO gagal, user
    diarahkan kembali ke SI-Platform untuk tiket baru.
11. **Soft-delete filter otomatis** di `getSheetData_` — untuk audit/histori pakai
    `getSheetData_(sheetName, { includeDeleted: true })`.
12. **Kunci field verifikasi via `localPreSaveHook_` (P2)** — hanya role verifikator+
    yang boleh mengubah `status_verifikasi` / `status` di sheet dengan workflow approval.

---

## 4. Katalog jebakan historis (pelajaran berdarah — jangan diulang)

- **Salah-paste**: paste whole-file bisa mendarat di file salah → pola audit
  `auditSalinan()` (panjang + ekor isi per file) dipakai pasca-ronde salin besar.
- **Deployment snapshot**: `/exec` menyajikan versi terakhir yang di-deploy; lupa
  "New version" = perubahan tak terlihat meski kode benar.
- **Self-closing** (lihat aturan 2) dan **skeleton dead-code** (blok loading yang tak
  pernah tampil karena halaman disembunyikan saat loading).
- **Bare globals**: fungsi helper harus `this.*` di methods Vue atau global eksplisit.
- **Tag konten balapan**: komponen dirender sebelum data siap → selalu guard `|| []`.
- **Tanggal UTC vs WIB**: `new Date().toISOString().slice(0,10)` mundur 1 hari untuk user WIB
  sebelum 07:00. Pakai `CoreLib.todayIsoLocal()` atau `CoreLib.dateKey10(val)`. Jangan pernah
  `todayIso()` (UTC) untuk form/validasi user.
- **Soft-delete tampil di list**: pada versi lama, `getSheetData_` tidak filter
  `deleted_at`. Di v2.0 sudah otomatis — jangan matikan filter tanpa alasan.
- **Self-approve verifikasi**: pada versi lama, user bisa kirim `status_verifikasi='disetujui'`
  untuk riwayat miliknya sendiri yang masih `menunggu`. Di v2.0 ditutup oleh hook P2.
- **In-flight request dedup**: `callServer` otomatis dedup request baca (`get_*`,
  `dashboard`, `analytics`). Untuk aksi tulis (`save_*`, `delete_*`) tidak — jangan
  asumsikan idempoten.

---

## 5. Cara mengetes

- **CoreLib**: run `testAll` di proyek Library → wajib **FAIL 0** (PASS 42 / SKIP 1 normal).
- **App (starter-kit)**: `runAllTestsStarterKit()` — pola sama si-kompetensi:
  - `runLibraryTests()` → **PASS 42 / FAIL 0 / SKIP 1** (CoreLib v2.3.0, pin 15).
  - `testAdopsiG18d()` → **13 / 0** (verifikasi util baru CoreLib).
  - `testDispatcherRouting()` → **~35 / 0** (registry + fail-closed).
  - `runDomainTestsStarterKit()` → **~18 / 0** (domain M_REFERENSI + T_UTAMA + hook + skema).
- **Diagnostik manual**: `runAllDiagnostics()` + `testKoneksiKePortalSso()`.
- **Kontrak**: `contract_check.py` (aturan 7). Setelah ronde salin besar: `auditSalinan()`.

---

## 6. Peta dokumen lanjutan

- Repo `frontend-cdn`:
  - `ECOSYSTEM_GUIDE.md` (arsitektur + katalog props).
  - `ROADMAP_CDN.md` (roadmap + log rilis CDN/CoreLib).
  - `frontend/CDN_SNIPPET.md` (cuplikan head standar untuk app baru).
  - `backend/00_MIGRATION_v2.md` (changelog lengkap CoreLib v2.x).
- Repo `starter-kit`:
  - `README.md` (checklist 13 langkah app baru).
  - `src/` (template — 3 file backend + 8 file frontend + manifest).
  - `AI_CONTEXT.md` (file ini).
- Workspace Arena:
  - `DAFTAR_SALIN.md` (jurnal salin manual).
  - `STATUS_PROYEK.md` (memori proyek).

---

## 7. Struktur `src/` (12 file)

```
src/
├── appsscript.json             # Manifest V8 + CoreLib pin 15
│
├── 01_ConfigAndBridge.gs       # Konstanta + 10 sheet skema + bridge CoreLib
│                               # + localPreSaveHook_ (P1/P2) + getAppConfig_()
├── 02_AppLogic.gs              # doGet/doPost/include + handleAction → dispatchAction
│                               # + buildLocalHandlers_ + domain contoh (M_REFERENSI + T_UTAMA)
│                               # + setupApp / initDatabase (delegasi CoreLib)
├── 99_TestSuite.gs             # Test suite pola si-lahar (library + adopsi + routing + domain)
│
├── Index.html                  # Shell tipis: CDN @v2.8.1 + Vue 3.5.42 + include 1 tingkat
├── V_Dashboard.html            # Contoh dashboard (4 KPI + 2 chart + tabel + filter)
├── V_Modals.html               # Contoh modal form (Utama)
├── J_State.html                # State + computed (chart included)
├── J_Helpers.html              # Helper domain murni (badgeStatusUtama, namaKategori_)
├── J_Api.html                  # Loader (callServer + silent handling)
├── J_Actions.html              # Handler aksi user (openForm, save, delete, filter)
└── J_App.html                  # AppCore.create({...}) + mixin + mount
```

**Sheet bisnis**: 10 (3 M + 7 T). **Sheet uji**: `ZZ_TEST_CRUD`. **Sheet sistem CoreLib
auto**: `AUDIT_LOGS` + `MAIN_DATA` (jangan dihapus). **SIMPEG auto**: PEGAWAI/JABATAN/UNIT_KERJA
(baca dari master, tidak ada lokal).

---

## 8. Gaya kerja pemilik proyek

- Pemilik pemula teknis: bahasa sederhana, snippet copy-paste utuh, analogi sehari-hari.
- Perubahan besar = bertahap + **gate** (salin → tes → lihat hasil → baru lanjut).
- Tidak ada push otomatis ke GitHub dari tooling; unggah manual via *Upload files*.
- Tag rilis: selalu tag **BARU**, jangan geser/hapus tag lama.
- Urutan rilis: **commit dulu**, baru tag (pelajaran insiden tag v2.6.3 frontend-cdn).
