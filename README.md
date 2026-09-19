# 🧰 STARTER-KIT WEB APP BISNIS (v2.0)

Template siap pakai untuk membuat **aplikasi web bisnis baru** di ekosistem
Trenggalek (SI-PLATFORM + CoreLib + Frontend CDN). Dicetak dari prototipe
**si-kompetensi v6.0.1** dan **si-lahar v2.1.0** (keduanya produksi, CoreLib-First).

> **Versi template**: 2.0 (2026-09-19).
> **CoreLib**: pin **15** (v2.3.0) — util sadar-WIB + paginasi + pencarian + whitelist.
> **CDN**: **`@v2.8.1`** (internal "2.8.0"). **Vue**: `3.5.42`.
> **Skema**: 3 master + 7 tabel = **10 sheet** (minimal standar ekosistem: 3 + 3).

---

## 🏗️ Yang sudah diurus ekosistem (JANGAN bikin sendiri)

| Kebutuhan | Penyedia | Cara pakai |
|---|---|---|
| Login / SSO / sesi | **si-platform** + `CoreLib.exchangePlatformTicket` | terima `?ticket=` → tukar → token sesi |
| Master pegawai/jabatan/unit | **SIMPEG** (3 sheet referensi) | `getSheetData_('PEGAWAI')` — CoreLib otomatis route ke DB master |
| Mesin sheet/CRUD/cache/audit | **CoreLib** (Library GAS pin 15) | `apiSave`, `apiDelete`, `ensureSheet`, `checkAuth` |
| Dispatcher + fail-closed | **CoreLib.dispatchAction** | `handleAction(payload)` di `02_AppLogic.gs` |
| Util tanggal sadar-WIB | **CoreLib** (v2.3.0) | `todayIsoLocal()`, `dateKey10()` — JANGAN `todayIso()` (UTC) |
| UI (sidebar, header, tabel, modal, filter, chart, badge, dll.) | **CDN kit v2.8.1** | 13+2 komponen `app-*` — auto registrasi |
| User/role/permission/notifikasi/file | **si-platform** | tidak perlu sheet lokal |

---

## 📦 Isi template (`src/` — 12 file)

```
src/
├── appsscript.json             # Manifest V8 + CoreLib pin 15
├── 01_ConfigAndBridge.gs       # Konstanta + 10 sheet skema + bridge CoreLib + hook P1/P2 + getAppConfig_()
├── 02_AppLogic.gs              # doGet/doPost/include + handleAction → dispatchAction + registry + domain contoh
├── 99_TestSuite.gs             # Test suite (runLibraryTests + adopsi + routing + domain)
│
├── Index.html                  # Shell tipis CDN @v2.8.1 + Vue 3.5.42 + include 1 tingkat
├── V_Dashboard.html            # Dashboard (4 KPI + 2 chart + tabel)
├── V_Modals.html               # Contoh modal form (Utama)
├── J_State.html                # State + computed (chart included)
├── J_Helpers.html              # Helper domain murni
├── J_Api.html                  # Loader data (callServer + silent)
├── J_Actions.html              # Handler aksi user
└── J_App.html                  # Bootstrap AppCore.create + mixin + mount
```

**Skema 10 sheet:**
- **Master (3)**: `M_REFERENSI`, `M_KATEGORI`, `M_SATUAN`
- **Tabel (7)**: `T_UTAMA`, `T_ITEM`, `T_LOGBOOK`, `T_LAMPIRAN`, `T_APPROVAL`, `T_JADWAL`, `T_REKAP`
- **Sheet uji**: `ZZ_TEST_CRUD` (auto-dibersihkan)
- **Sheet sistem CoreLib**: `AUDIT_LOGS`, `MAIN_DATA` (auto-create)
- **SIMPEG (read-only, dari master)**: `PEGAWAI`, `JABATAN`, `UNIT_KERJA`

**Domain contoh lengkap**: `M_REFERENSI` (master) + `T_UTAMA` (tabel).
**8 sheet lain**: skema ada, handler placeholder (komentar di `02_AppLogic.gs` + `actionLevels`).
Tinggal buka komentar saat Anda mulai memakainya.

---

## 🚀 Alur membangun aplikasi baru (13 langkah, 4 fase)

### Fase 1 — Persiapan (±10 menit, di browser)

1. Tentukan **kode aplikasi** (mis. `SI-ASET`) — harus unik, akan didaftarkan di si-platform.
2. Buat **Spreadsheet baru** = database app (biarkan kosong).
3. Buat proyek **GAS baru** → buat 12 file, salin isi `src/` whole-file.

### Fase 2 — Penyesuaian (±10 menit, di editor GAS)

4. `01_ConfigAndBridge.gs`:
   - Ganti `APP_CODE` + `APP_TITLE`.
   - Isi `DEFAULT_SPREADSHEET_ID` **atau** set Script Properties `SPREADSHEET_ID`.
   - Sesuaikan `ALL_SHEET_HEADERS` (nama field per sheet).
   - Buka `actionLevels` sesuai kebutuhan (domain contoh sudah aktif).
5. `appsscript.json`: pastikan Library CoreLib **pin 15** (naikkan bila CoreLib rilis baru).
6. Jalankan **`initDatabase()`** sekali → cek 10 sheet + ZZ_TEST_CRUD terbuat.

### Fase 3 — Terhubung ke ekosistem (±10 menit)

7. **Deploy ▸ Web app** (executeAs: `USER_DEPLOYING`, access: `ANYONE_ANONYMOUS`) → catat URL `/exec`.
8. Daftarkan app di **si-platform** (sheet `applications`): code + nama + URL.
9. Uji **SSO**: buka katalog di platform → klik app → harus masuk otomatis (tiket sekali pakai).

### Fase 4 — Mengembangkan (berulang, santai)

10. **Logika bisnis** di `02_AppLogic.gs`:
    - Pola `buildLocalHandlers_()` — daftar handler per aksi.
    - CRUD via `saveRecord_` / `softDeleteRecord_` / `getSheetData_` (dari `01`).
    - Baca pegawai via `getPegawaiList_()` (tolerant reader).
    - **Setiap handler baru → daftarkan juga di `actionLevels` (01)**. Kalau tidak, fail-closed.
11. **Tampilan** pakai komponen kit; **tag selalu berpasangan** (jangan self-closing `/>`).
12. Sebelum salin ke GAS: jalankan **contract-check**
    (`python3 frontend-cdn/tools/contract_check.py` di workspace Arena; app baru
    didaftarkan dulu ke daftar APPS checker). Exit 0 = aman; exit 1 = perbaiki dulu.
13. Stabil & siap produksi serius → minta **Track D** (Tailwind compiled) + repo GitHub baru.

> Untuk AI coder / developer baru: baca **`AI_CONTEXT.md`** dulu — itu surat
> pengantar ekosistem (versi, aturan keras, katalog jebakan, cara tes).

---

## 🔧 Cara mengetes

Setelah paste semua file + `initDatabase()`:

| Fungsi | Target |
|---|---|
| `runLibraryTests()` | **PASS 42 / FAIL 0 / SKIP 1** (CoreLib v2.3.0, pin 15) |
| `testAdopsiG18d()` | **13 / 0** (verifikasi util baru CoreLib) |
| `testDispatcherRouting()` | **~35 / 0** (registry + fail-closed) |
| `runDomainTestsStarterKit()` | **~18 / 0** (domain + SIMPEG RO + hook + skema) |
| `testAppLogicSelfCheck()` | Semua ✅ (registry lengkap + actionLevels sinkron) |
| `runAllDiagnostics()` | Semua ✅ (CoreLib + DB + 10 sheet + SIMPEG) |

Satu pintu: **`runAllTestsStarterKit()`** — rekap semua di atas.

Diagnostik SSO manual:
- `testKoneksiKePortalSso()` — cek HTTP ke SI-PLATFORM tanpa tiket.
- `testFullSsoIntegrationFlow()` — butuh tiket valid (generate dari Global App).

---

## 📏 Aturan wajib (kontrak ekosistem)

1. **CoreLib first** — cek katalog sebelum menulis fungsi util; duplikasi hanya
   untuk logika bisnis. Wrapper lokal boleh, isi wajib `return CoreLib.x(...)`.
2. **Tolerant reader** untuk data SIMPEG — baca kolom *by header name*, ambil
   hanya yang dibutuhkan (otomatis bila lewat `getSheetData_`).
3. **Tag kit selalu berpasangan** — `<app-x ...></app-x>`, JANGAN self-closing
   (`/>` di in-DOM template = bug menelan elemen berikutnya).
4. **Pin versi CDN** eksplisit (`frontend-cdn@v2.8.1`), jangan `@latest`.
5. Jalankan `python3 frontend-cdn/tools/contract_check.py` sebelum salin ke GAS.
6. **Tanggal hari ini** untuk form/validasi: pakai **`CoreLib.todayIsoLocal()`**
   atau **`CoreLib.dateKey10(val)`** (sadar-WIB). JANGAN `todayIso()` (UTC).
7. **Setiap handler baru** di `buildLocalHandlers_()` → daftarkan di `actionLevels`
   (`01_ConfigAndBridge.gs`). Fail-closed oleh CoreLib.
8. **Soft-delete filter** otomatis di `getSheetData_`. Untuk audit pakai
   `getSheetData_(sheetName, {includeDeleted:true})`.
9. **Verifikasi field** (untuk sheet dengan workflow): kunci lewat
   `localPreSaveHook_` (P2) — cek role sebelum tulis.
10. **Urutan include** di `Index.html`: `V_Modals` → `V_*` → `J_State` → `J_Helpers`
    → `J_Api` → `J_Actions` → `J_App`. Jangan diubah.

---

## 📁 Struktur repo (rekomendasi)

```
si-NAMA-APP/
├── README.md                    # dokumen ini (atau disesuaikan)
├── AI_CONTEXT.md                # surat pengantar ekosistem
├── .clasp.json / .claspignore   # opsional (konfigurasi clasp)
├── docs/                        # opsional — Gate 0 (BRD/PRD/FRD/DATABASE/UIUX/API/TESTCASE/GAP)
└── src/                         # 12 file — yang di-paste ke GAS editor
    ├── appsscript.json
    ├── 01_ConfigAndBridge.gs
    ├── 02_AppLogic.gs
    ├── 99_TestSuite.gs
    ├── Index.html
    ├── V_Dashboard.html
    ├── V_Modals.html
    ├── J_State.html
    ├── J_Helpers.html
    ├── J_Api.html
    ├── J_Actions.html
    └── J_App.html
```

---

## 🎯 Roadmap tumbuh kembang

Setelah app baru berjalan, saat bisnis makin kaya:

| Kebutuhan | Aksi |
|---|---|
| Tambah halaman (mis. Master, Laporan) | Buat `V_Master.html` → include di `Index.html` → menu + pageIcons di `J_App.html` |
| Tambah domain handler (mis. `T_ITEM`) | Buka komentar blok placeholder di `02_AppLogic.gs` + `actionLevels` di `01` |
| App makin besar (file .gs >300 baris) | Pecah jadi `03_DomainLogic.gs`, `04_...` (pola si-kompetensi) |
| Butuh chart lanjutan | Buka komentar blok Executive di `V_Dashboard.html` + computed chart di `J_State.html` |
| Butuh backend agregat untuk dashboard berat | Tambah handler `get_dashboard_stats` (kandidat v2.1) |
| Data sudah produksi | Ajukan **Track D** (Tailwind compiled) + setup GitHub Actions (clasp push) |
| Naik versi CoreLib / CDN | Update `appsscript.json` (library version) + 4 URL di `Index.html` + catat di commit |

---

## 🤝 Memakai kit ini bersama AI coder / developer lain

AI atau orang baru TIDAK tahu riwayat proyek — berikan konteks secukupnya:

| Situasi | Lampirkan |
|---|---|
| Bikin app baru dari nol | `AI_CONTEXT.md` + `README.md` + seluruh `src/` (±35KB — aman semua) |
| Mengedit app yang sudah jalan | `AI_CONTEXT.md` + file yang akan disentuh + `01_ConfigAndBridge.gs` |
| Cuma tanya konsep | `AI_CONTEXT.md` saja cukup |

---

## 📜 Lisensi & Kontak

- **Pengelola**: Tim Pengembang TI — Dinas Komunikasi dan Informatika Kabupaten Trenggalek
- **Lisensi**: MIT License
- **Dokumentasi ekosistem**: repo [`frontend-cdn`](https://github.com/miftachurrochim82-sketch/frontend-cdn)
  (`ECOSYSTEM_GUIDE.md`, `ROADMAP_CDN.md`, `frontend/CDN_SNIPPET.md`, `backend/00_MIGRATION_v2.md`)
