# 🧰 STARTER-KIT WEB APP BISNIS (v2.10.0 — 11 sheet + 72 handler + RTL + UIUX v1.10)

Template siap pakai untuk membuat **aplikasi web bisnis baru** di ekosistem Trenggalek (SI-PLATFORM + CoreLib + Frontend CDN). Dicetak dari prototipe **si-arsip v1.10** (11 sheet + 72 handler + RTL R1-R5 + UIUX polish 59/28/0/0/56) + **si-kompetensi v6.0.1** & **si-lahar v2.1.0**.

> **Versi template**: 2.10.0 (2026-09-21 malam) — setelah si-arsip v1.10 SELESAI.
> **CoreLib**: pin **15** (v2.3.0) — util sadar-WIB + paginasi + pencarian + whitelist.
> **CDN**: **`@v2.8.1`** (internal `"2.8.0"`) — v2.9.0 kandidat C1-C3 masih backlog (skip dulu, nanti batch dengan app lain). **Vue**: `3.5.42`.
> **Skema**: 3 master + 8 tabel incl RTL = **11 sheet** (standar: 3 + 3 minimal, sekarang 11).
> **Handler**: **72** (config 6 + self 2 + dash 2 + simpeg 4 + master 9 + utama 4 + item 4 + logbook 2 + lampiran 3 + approval 4 + jadwal 4 + rekap 4 + laporan 2 + analisa 3 + evaluasi 3 + RTL 12 + generic 2 + publik 3 + sistem 1 = 72)
> **Total file**: 16 (4 backend + 10 frontend + 1 manifest + 1 AI_CONTEXT)

---

## 🏗️ Yang sudah diurus ekosistem (JANGAN bikin sendiri)

| Kebutuhan | Penyedia | Cara pakai |
|---|---|---|
| Login / SSO / sesi | **si-platform** + `CoreLib.exchangePlatformTicket` | terima `?ticket=` → tukar → token sesi |
| Master pegawai/jabatan/unit | **SIMPEG** (3 sheet referensi) | `getSheetData_('PEGAWAI')` — CoreLib otomatis route ke DB master |
| Mesin sheet/CRUD/cache/audit | **CoreLib** (pin 15) | `apiSave`, `apiDelete`, `ensureSheet`, `checkAuth` |
| Dispatcher + fail-closed | **CoreLib.dispatchAction** | `handleAction(payload)` di `02_AppLogic.gs` |
| Util tanggal sadar-WIB | **CoreLib** (v2.3.0) | `todayIsoLocal()`, `dateKey10()` — JANGAN `todayIso()` (UTC) |
| Audit HTTP ke SI-PLATFORM | `00_Utils.gs` → `audit_()` | wrapper — panggil `audit_(actor, action, type, id, ok, msg)` |
| UI (sidebar, header, tabel, modal, filter, chart, badge, dll.) | **CDN kit v2.8.1** | 15+ komponen `app-*` — auto registrasi |
| RTL / Tindak Lanjut (puncak piramida) | **Contoh si-arsip R1-R5** | T_TINDAK_LANJUT + 12 handler + V_Rtl + generate + status + progress bar |
| User/role/permission/notifikasi/file | **si-platform** | tidak perlu sheet lokal |

---

## 📦 Isi template (`src/` — 16 file) — v2.10.0

```
src/
├── appsscript.json             # Manifest V8 + CoreLib pin 15
│
│  Backend (4):
├── 00_Utils.gs                 # Audit HTTP ke SI-PLATFORM
├── 01_ConfigAndBridge.gs       # Konstanta + 11 sheet skema + bridge + hook P1/P2 + 72 actionLevels
├── 02_AppLogic.gs              # doGet/doPost/include + handleAction + 72 handler (master + utama + item + logbook + lampiran + approval + jadwal + rekap + laporan + analisa + evaluasi + RTL)
├── 99_TestSuite.gs             # Test suite (runLibraryTests + adopsi + routing + domain + RTL)
│
│  Frontend (10):
├── Index.html                  # Shell tipis CDN @v2.8.1 + Vue 3.5.42 + tema #0369a1 + include 1 tingkat (V_Modals, V_Dashboard, V_Rtl, V_Utama, V_Master, V_Laporan)
├── V_Dashboard.html            # Dashboard 4 KPI app-stat-card + 2 chart + tabel terbaru + RTL ringkas (UIUX v1.10)
├── V_Rtl.html                  # RTL R1-R5 generik — generate panel + filter label + stat 4 card + tabel min-w + table-scroll + progress bar + modal v-if (contoh si-arsip)
├── V_Utama.html                # T_UTAMA — filter-bar + table-scroll min-w + badge valid + btn-icon + pagination (UIUX v1.10)
├── V_Master.html               # Master 3 tab — table-scroll min-w + badge aktif/nonaktif + btn-icon (UIUX v1.10)
├── V_Laporan.html              # Laporan L4/L5 contoh — filter-analytics + app-stat-card + table-scroll (UIUX v1.10)
├── V_Modals.html               # Modal form Utama + Referensi — v-if + @close + size lg/2xl (UIUX v1.10)
├── J_State.html                # State + computed + RTL state (11 sheet)
├── J_Helpers.html              # Helper fmtTgl + badge mapping valid + toggleRowMenu
├── J_Api.html                  # Loader dashboard + master + utama + laporan + analisa + RTL (v2.10.0)
├── J_Actions.html              # Handler simpan/hapus RTL + utama + referensi (v2.10.0)
└── J_App.html                  # Bootstrap AppCore.create + menu 5 item (dashboard, rtl, laporan, utama, master) + tema #0369a1
```

**Skema 11 sheet (v2.10.0):**
- **Master (3)**: `M_REFERENSI`, `M_KATEGORI`, `M_SATUAN`
- **Tabel (8)**: `T_UTAMA`, `T_ITEM`, `T_LOGBOOK`, `T_LAMPIRAN`, `T_APPROVAL`, `T_JADWAL`, `T_REKAP`, `T_TINDAK_LANJUT` (alias `T_RTL` — RTL R1-R5 contoh si-arsip)
- **Sheet uji**: `ZZ_TEST_CRUD`
- **Sheet sistem CoreLib**: `AUDIT_LOGS`, `MAIN_DATA`
- **SIMPEG (read-only)**: `PEGAWAI`, `JABATAN`, `UNIT_KERJA`

**Domain contoh lengkap**: `M_REFERENSI` + `T_UTAMA` + `T_APPROVAL` + `T_TINDAK_LANJUT` (RTL).
**7 sheet lain**: handler aktif (get_list/save/delete) — siap pakai.

---

## 🚀 Alur membangun aplikasi baru (13 langkah, 4 fase)

### Fase 1 — Persiapan (±10 menit)

1. Tentukan **kode aplikasi** (mis. `SI-ASET`) — harus unik, daftarkan di si-platform.
2. Buat **Spreadsheet baru** = database app (biarkan kosong).
3. Buat proyek **GAS baru** → buat **16 file**, salin isi `src/` whole-file.

### Fase 2 — Penyesuaian (±10 menit)

4. `01_ConfigAndBridge.gs`: Ganti `APP_CODE` + `APP_TITLE`, isi `DEFAULT_SPREADSHEET_ID` atau set Script Properties `SPREADSHEET_ID`, sesuaikan `ALL_SHEET_HEADERS`, `actionLevels` 72 sudah aktif.
5. `appsscript.json`: pastikan CoreLib pin 15.
6. Jalankan **`initDatabase()`** sekali → cek 11 sheet + ZZ_TEST_CRUD terbuat.

### Fase 3 — Terhubung ke ekosistem (±10 menit)

7. Deploy Web app (USER_DEPLOYING, ANYONE_ANONYMOUS) → catat URL /exec.
8. Daftarkan app di si-platform (sheet applications).
9. Uji SSO: buka katalog platform → klik app → masuk otomatis.

### Fase 4 — Mengembangkan (berulang)

10. Logika bisnis di `02_AppLogic.gs`: pola `buildLocalHandlers_()` — 72 handler sudah, tambah domain baru tinggal tambah di `actionLevels` (01) + handler di 02.
11. Tampilan pakai komponen kit + UIUX v1.10 polish: `min-w-[...]` di th, wrapper `table-scroll`, badge via `app-badge :status` valid, KPI via `app-stat-card`, pagination `btn-icon`, filter label `text-[11px]` / `.filter-label`, modal `v-if` + `@close`.
12. Contract-check: `python3 frontend-cdn/tools/contract_check.py` — exit 0 aman.
13. Stabil → minta Track D + repo GitHub baru.

> Untuk AI coder: baca `AI_CONTEXT.md` dulu.

---

## 🔧 Cara mengetes

Setelah paste + `initDatabase()`:

| Fungsi | Target v2.10.0 |
|---|---|
| `testUtilsSelfCheck()` | Semua ✅ |
| `testAppLogicSelfCheck()` | 72 handler ✅ |
| `runLibraryTests()` | PASS 42 / FAIL 0 / SKIP 1 (CoreLib v2.3.0) |
| `testAdopsiG18d()` | 13 / 0 |
| `testDispatcherRouting()` | ~72 / 0 (registry + fail-closed) |
| `runDomainTestsStarterKit()` | ~30 / 0 (11 sheet + SIMPEG RO + RTL) |
| `runAllDiagnostics()` | Semua ✅ (11 sheet + SIMPEG) |

Satu pintu: `runAllTestsStarterKit()`.

---

## 📏 Aturan wajib (kontrak ekosistem) — v2.10.0 tambah UIUX

1. CoreLib first — cek katalog sebelum util baru.
2. Tolerant reader SIMPEG.
3. Tag kit berpasangan `<app-x></app-x>`, jangan `/>`.
4. Pin CDN eksplisit `@v2.8.1` (v2.9.0 skip dulu, batch nanti).
5. Contract-check sebelum salin.
6. Tanggal: `CoreLib.todayIsoLocal()` / `dateKey10()` (WIB), jangan `todayIso()`.
7. Setiap handler baru → daftarkan di `actionLevels` (01) — fail-closed.
8. Soft-delete filter otomatis.
9. Verifikasi field via `localPreSaveHook_` P2.
10. Urutan include di Index: `V_Modals` → `V_*` → `J_State` → `J_Helpers` → `J_Api` → `J_Actions` → `J_App`.
11. `00_Utils.gs` wajib ada.
12. **UIUX v1.10 (baru):**
    - th wajib `min-w-[...]` (Judul 260px, Kode 100-160px, Status 100px, Aksi 120px), wrapper `table-scroll`, bukan `overflow-x-auto`. Grep min-w ≥30.
    - Badge wajib `<app-badge :status="valid">` — valid: aktif/disetujui/ditolak/menunggu/proses/draft/nonaktif/batal/revisi/verifikasi/belum. Mapping: selesai=disetujui, baru/draft=draft, diproses=menunggu, batal=ditolak. Dilarang raw `badge-sky/rose/amber/gray` + empty `''`.
    - KPI wajib `<app-stat-card>` — tidak ada custom `card !p-3 text-center` + `text-lg font-black`. Props: title, :value, icon, color, subtext.
    - Pagination `btn-icon` chevron, filter label `text-[11px] text-slate-500` / `.filter-label`, wrapper `filter-bar-analytics` / `flex flex-col sm:flex-row gap-2 items-end`.
    - Modal `v-if="showX" @close="showX=false"` + size md/lg/2xl/3xl, bukan `:show=`.
    - Tema per app: `:root --primary #0369a1` (sky-700) + `theme-color` + tailwind config — CDN tetap netral.

---

## 📁 Struktur repo

```
si-NAMA-APP/
├── README.md
├── AI_CONTEXT.md
├── docs/ (opsional Gate 0)
└── src/ (16 file)
```

---

## 🎯 Roadmap tumbuh kembang

| Kebutuhan | Aksi |
|---|---|
| Tambah halaman | Buat `V_Master.html` → include di Index → menu + pageIcons di J_App |
| Tambah domain handler | Tambah di actionLevels (01) + handler di 02 |
| App besar >300 baris .gs | Pecah jadi 03_DomainLogic.gs (pola si-kompetensi) |
| Butuh chart lanjutan | Buka komentar Executive di V_Dashboard + computed chart di J_State |
| Butuh RTL | Sudah ada T_TINDAK_LANJUT + V_Rtl + 12 handler — tinggal pakai |
| Data produksi | Ajukan Track D + GitHub Actions |
| Naik CoreLib/CDN | Update appsscript.json + Index.html + catat commit |

---

## 🤝 Memakai kit ini bersama AI coder

| Situasi | Lampirkan |
|---|---|
| Bikin app baru dari nol | AI_CONTEXT.md + README.md + seluruh src/ (±50KB) |
| Mengedit app jalan | AI_CONTEXT.md + file yang disentuh + 01_Config |
| Cuma tanya konsep | AI_CONTEXT.md saja |

---

## 📜 Changelog v2.10.0

- **11 sheet** (was 10) — tambah `T_TINDAK_LANJUT` (alias `T_RTL`) — RTL R1-R5 contoh si-arsip
- **72 handler** (was ~30) — tambah M_KATEGORI, M_SATUAN, T_ITEM, T_LOGBOOK, T_LAMPIRAN, T_APPROVAL delete, T_JADWAL, T_REKAP, laporan L4/L5, analisa A3-A5, evaluasi E1/E3/E5, RTL 12 handler (6 generic + 6 alias)
- **UIUX v1.10 polish**: min-w 59 + table-scroll 28 + overflow 0 + custom card 0 + app-stat-card 56 + modal :show→v-if + tema #0369a1 + filter label + btn-icon (dari si-arsip v1.10)
- **Frontend**: tambah V_Rtl.html (generik RTL) + V_Utama.html + V_Laporan.html + V_Master.html — semua dengan polish v1.10
- **J_State**: tambah RTL state + laporan/analisa state
- **J_Helpers**: tambah fmtTgl + badge mapping valid + toggleRowMenu
- **J_Api**: tambah loadRtl + generateRtl + loadLapKlasifikasi + loadAnalisaUnit
- **J_Actions**: tambah simpanRtl/hapusRtl/openRtlEdit/openRtlStatus/ubahStatusRtl
- **J_App**: menu 5 item (dashboard, rtl, laporan, utama, master) + brand v2.10.0
- **Index.html**: tema #0369a1 locked + include V_Rtl + V_Utama + V_Master + V_Laporan + filter-bar-analytics + progress-track CSS (kandidat CDN C1-C3 lokal)
- **CDN**: tetap @v2.8.1 — v2.9.0 skip dulu (kandidat C1-C3 backlog, batch dengan app lain nanti) — sesuai keputusan user 21 Sept malam

---

## 📜 Lisensi & Kontak

- Pengelola: Tim TI — Diskominfo Trenggalek
- Lisensi: MIT
- Docs ekosistem: repo frontend-cdn (ECOSYSTEM_GUIDE, ROADMAP_CDN, CDN_SNIPPET, backend/00_MIGRATION_v2.md)
