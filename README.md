# 🧰 STARTER-KIT WEB APP BISNIS (v2.12.0 — 5 master + 5 tabel + piramida 12/8/6/4 + dashboard 4+4+4)

Template siap pakai untuk membuat **aplikasi web bisnis baru** di ekosistem Trenggalek (SI-PLATFORM + CoreLib + Frontend CDN).

> **Versi template**: **2.12.0** (2026-09-23) — redesign skema (keputusan user) + UIUX v2 (standar hasil audit si-dokumen).
> **CoreLib**: pin **17** (v2.4.0 LIVE PASS 47) — util sadar-WIB + paginasi + pencarian + whitelist + C4-C8.
> **CDN**: **`@v2.9.0`** — 10 FILE (1 CSS + 9 JS) & 31 OPSI (2026-09-22) — internal `"2.9.0"` — CoreLib v2.4.0 LIVE **pin 17** PASS 47. **Vue**: `3.5.42`.
> **Skema (BASELINE — FLEKSIBEL, tidak wajib)**: **5 master = 5 dimensi laporan** + **5 tabel inti = 10 sheet**. App bisnis bebas menambah/mengurangi sheet & handler sesuai keunikan domainnya.
> **Handler**: **86** (config 6 + self 2 + dash 2 + simpeg 4 + master 15 + utama 4 + item 4 + lampiran 3 + approval 4 + RTL 12 + **laporan 12 + analisa 8 + evaluasi 6** + generic 2 + publik 2 + sistem 1 = 86; +2 native CoreLib = 88 aksi)
> **Piramida output (REFERENSI — tidak kaku)**: **Laporan 12 · Analisa 8 · Evaluasi 6 · RTL 4 sumber = 30**.
> **Dashboard "ukuran sedang"**: **4 kartu summary + 4 chart + 4 panel** — semua dihitung server-side.
> **Total file**: 16 (4 backend + 10 frontend + 1 manifest + 1 AI_CONTEXT)

---

## 🏗️ Yang sudah diurus ekosistem (JANGAN bikin sendiri)

| Kebutuhan | Penyedia | Cara pakai |
|---|---|---|
| Login / SSO / sesi | **si-platform** + `CoreLib.exchangePlatformTicket` | terima `?ticket=` → tukar → token sesi |
| Master pegawai/jabatan/unit | **SIMPEG** (3 sheet referensi) | `getSheetData_('PEGAWAI')` — CoreLib otomatis route ke DB master |
| Mesin sheet/CRUD/cache/audit | **CoreLib** (pin **17**) | `apiSave`, `apiDelete`, `ensureSheet`, `checkAuth` |
| Dispatcher + fail-closed | **CoreLib.dispatchAction** | `handleAction(payload)` di `02_AppLogic.gs` |
| Util tanggal sadar-WIB | **CoreLib** (v2.3.0) | `todayIsoLocal()`, `dateKey10()` — JANGAN `todayIso()` (UTC) |
| Audit HTTP ke SI-PLATFORM | `00_Utils.gs` → `audit_()` | wrapper — panggil `audit_(actor, action, type, id, ok, msg)` |
| UI (sidebar, header, tabel, modal, filter, chart, badge, dll.) | **CDN kit v2.9.0 (10 file (1 CSS + 9 JS) & 31 opsi)** | 15+ komponen `app-*` — auto registrasi |
| RTL / Tindak Lanjut (puncak piramida) | **Generik R1-R4** | T_TINDAK_LANJUT + 12 handler + FSM + generate dari E1/E2/E3 + manual |
| User/role/permission/notifikasi/file | **si-platform** | tidak perlu sheet lokal |

---

## 📦 Isi template (`src/` — 17 file) — v2.12.0

```
src/
├── appsscript.json             # Manifest V8 + CoreLib pin **17**
│
│  Backend (4):
├── 00_Utils.gs                 # Audit HTTP ke SI-PLATFORM
├── 01_ConfigAndBridge.gs       # Konstanta + 10 sheet skema (5M+5T) + bridge + hook P1/P2 + 88 actionLevels
├── 02_AppLogic.gs              # doGet/doPost/include + handleAction + 86 handler (5 master + utama + item + lampiran + approval + 12L + 8A + 6E + RTL FSM + seed)
├── 99_TestSuite.gs             # Test suite (library + adopsi + routing 86 + domain + smoke piramida + dashboard 4+4+4)
│
│  Frontend (10):
├── Index.html                  # Shell tipis CDN @v2.9.0 (10 file — 1 CSS + 9 JS & 31 opsi) + CSS Tailwind TER-COMPILE (bukan Play CDN) + tema dinamis <?!= getThemeCss() ?> (6 preset) + <app-theme-picker> + scope Saya/Semua (9 view incl. Pengaturan)
├── V_Dashboard.html            # Dashboard ukuran sedang: 4 kartu + 4 chart + 4 panel (server-side)
├── V_Utama.html                # Transaksi CRUD — 5 filter + tahun select + paginasi server-side + nama bukan ID
├── V_Laporan.html              # 12 tab laporan (L1-L12) — nama, bukan ID
├── V_Analisa.html              # 8 tab analisa (A1-A8) — matrix korelasi, tren, SLA
├── V_Evaluasi.html             # 6 tab evaluasi (E1-E6)
├── V_Rtl.html                  # RTL R1-R4 — generate dari E1/E2/E3 + manual + FSM + TANPA field status di form
├── V_Master.html               # 5 master (Kategori hierarki/Jenis/Periode/Satuan/Lokasi)
├── V_Modals.html               # Modal form Transaksi + Master (field dinamis per tab) — v-if + @close
├── J_State.html                # State + computed (tahunOptions, akses chart dashboard)
├── J_Helpers.html              # fmtTgl + badge valid + lookup NAMA per master + formatBytes_ + korelasiCell_
├── J_Api.html                  # Loader dashboard + 5 master + utama + 12L + 8A + 6E + RTL (+ SK_MAPS global)
├── J_Actions.html              # simpan/hapus 5 master (generik) + utama + RTL (FSM via modal status)
└── J_App.html                  # Bootstrap AppCore.create + menu 7 halaman + icon unik per halaman
```

**Skema 10 sheet (baseline v2.12.0 — FLEKSIBEL, bukan kewajiban):**
- **Master (5)** — tiap sheet = 1 dimensi laporan ("per apa?"):
  `M_KATEGORI` (hierarki) · `M_JENIS` (+sifat periode) · `M_PERIODE` (tahun/bulan) · `M_SATUAN` · `M_LOKASI`
- **Tabel (5)** — transaksi inti:
  `T_UTAMA` (5 FK: kategori/jenis/lokasi/periode/satuan) · `T_ITEM` · `T_LAMPIRAN` · `T_APPROVAL` · `T_TINDAK_LANJUT`
- **Opsional** (tambah bila app butuh): `T_JADWAL` (deadline/kalender), `T_LOGBOOK` (jejak per baris — melengkapi AUDIT_LOGS CoreLib) — blok header siap disalin di komentar 01.
- **Sheet uji**: `ZZ_TEST_CRUD` · **Sheet sistem CoreLib**: `AUDIT_LOGS`, `MAIN_DATA`
- **SIMPEG (read-only)**: `PEGAWAI`, `JABATAN`, `UNIT_KERJA`

**Seed otomatis** (`initDatabase()` / `setupApp()`): 4 kategori + 5 jenis + 3 periode (tahun-1..tahun+1) + 3 satuan + 3 lokasi — hanya jika sheet kosong.

**Dihapus dari v2.10.0** (dokumentasi keputusan): `M_REFERENSI` (filler "lemari serbaguna"), `T_LOGBOOK` & `T_JADWAL` (opsional), `T_REKAP` (rekap = fungsi laporan, bukan sheet — pola si-dokumen L4/L5/L6).

---

## 🚀 Alur membangun aplikasi baru (13 langkah, 4 fase)

### Fase 1 — Persiapan (±10 menit)

1. Tentukan **kode aplikasi** (mis. `SI-ASET`) — harus unik, daftarkan di si-platform.
2. Buat **Spreadsheet baru** = database app (biarkan kosong).
3. Buat proyek **GAS baru** → buat **16 file**, salin isi `src/` whole-file.

### Fase 2 — Penyesuaian (±10 menit)

4. `01_ConfigAndBridge.gs`: Ganti `APP_CODE` + `APP_TITLE`, isi `DEFAULT_SPREADSHEET_ID` atau set Script Properties `SPREADSHEET_ID`, sesuaikan `ALL_SHEET_HEADERS` (tambah/kurangi sheet & kolom sesuai domain — **fleksibel**), `actionLevels` 88 sudah aktif.
5. `appsscript.json`: pastikan CoreLib pin **17**.
6. Jalankan **`initDatabase()`** sekali → cek 10 sheet + ZZ_TEST_CRUD terbuat + seed master awal masuk.

### Fase 3 — Terhubung ke ekosistem (±10 menit)

7. Deploy Web app (USER_DEPLOYING, ANYONE_ANONYMOUS) → catat URL /exec.
8. Daftarkan app di si-platform (sheet applications).
9. Uji SSO: buka katalog platform → klik app → masuk otomatis.

### Fase 4 — Mengembangkan (berulang)

10. Logika bisnis di `02_AppLogic.gs`: pola `buildLocalHandlers_()` — 86 handler sudah (termasuk piramida 12L/8A/6E/4R), tambah domain baru tinggal tambah di `actionLevels` (01) + handler di 02 (WAJIB sinkron — fail-closed).
11. Tampilan pakai komponen kit + **UIUX v2**: CSS ter-compile (bukan Play CDN), nama bukan ID, tahun = select, tombol di-gate `v-can`, `min-w-[...]` di th, wrapper `table-scroll`, badge via `app-badge :status` valid, KPI via `app-stat-card`, pagination `btn-icon`, filter label `.filter-label`, modal `v-if` + `@close`, form tanpa field yang dikunci backend.
12. Contract-check: `python3 frontend-cdn/tools/contract_check.py` — exit 0 aman.
13. Stabil → minta Track D + repo GitHub baru.

> Untuk AI coder: baca `AI_CONTEXT.md` dulu.

---

## 🔧 Cara mengetes

Setelah paste + `initDatabase()`:

| Fungsi | Target v2.12.0 |
|---|---|
| `testUtilsSelfCheck()` | Semua ✅ |
| `testAppLogicSelfCheck()` | 86 handler ✅ |
| `runLibraryTests()` | PASS 42 / FAIL 0 / SKIP 1 (CoreLib v2.3.0) |
| `testAdopsiG18d()` | 13 / 0 |
| `testDispatcherRouting()` | 6 / 0 (registry 86 + fail-closed) |
| `runDomainTestsStarterKit()` | ~35 / 0 (5 master + guard + T_UTAMA + RTL FSM + hook + skema 10 + **smoke piramida 12/8/6** + **dashboard 4+4+4**) |
| `runAllDiagnostics()` | Semua ✅ (10 sheet + SIMPEG) |

Satu pintu: `runAllTestsStarterKit()`.

---

## 📏 Aturan wajib (kontrak ekosistem) — v2.12.0 = CDN v2.9.0 + CoreLib v2.4.0 A+B

1. CoreLib first — cek katalog sebelum util baru.
2. Tolerant reader SIMPEG.
3. Tag kit berpasangan `<app-x></app-x>`, jangan `/>`.
4. Pin CDN eksplisit `@v2.9.0` (10 file: 1 CSS + 9 JS) + CoreLib pin **17**.
5. Contract-check sebelum salin.
6. Tanggal: `CoreLib.todayIsoLocal()` / `dateKey10()` (WIB), jangan `todayIso()`.
7. Setiap handler baru → daftarkan di `actionLevels` (01) — fail-closed.
8. Soft-delete filter otomatis.
9. Verifikasi field via `localPreSaveHook_` P2.
10. Urutan include di Index: `V_Modals` → `V_*` → `J_State` → `J_Helpers` → `J_Api` → `J_Actions` → `J_App`.
11. `00_Utils.gs` wajib ada.
12. **UIUX v2 (standar baru — hasil audit si-dokumen 2026-09-22):**
    - **CSS Tailwind TER-COMPILE** (inline di Index) — Play CDN HANYA prototyping. Compile: `npx tailwindcss -i input.css -o out.min.css --minify` (config: `darkMode:'class'`, content = `src/*.html` + `frontend-cdn/frontend/*.js`). Jaga Index < 50 KB.
    - **Nama, bukan ID** — tabel menampilkan nama (lookup helper / field `*_nama`); ID hanya sub-baris `font-mono text-[11px]`.
    - **Tahun/periode = select** (`tahunOptions`), bukan input teks.
    - **Tombol aksi di-gate role** — `v-can="'<level>'"` (fail-closed, cermin level backend).
    - **Fitur setengah jadi tidak ditampilkan** (hapus tab; backend boleh tetap ada).
    - **Form tidak menampilkan field yang dikunci backend** (mis. status FSM) — UI = cermin aturan server.
    - Icon menu unik per halaman · title browser tanpa nomor versi internal · ukuran human-readable (`formatBytes_`).
    - th wajib `min-w-[...]`, wrapper `table-scroll` · badge `<app-badge :status="valid">` · KPI `<app-stat-card>` · pagination `btn-icon` · filter `.filter-label` · modal `v-if` + `@close` · tema per app `:root --primary`.

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

## 📜 Changelog v2.12.0 (2026-09-23)

**REDESIGN SKEMA** — keputusan user 2026-09-22: master = dimensi laporan, app boleh fleksibel.

- **Skema 11 → 10 sheet (5 master + 5 tabel)** — baseline, FLEKSIBEL (bukan kewajiban):
  - Master 5: `M_KATEGORI` (hierarki) · `M_JENIS` · `M_PERIODE` · `M_SATUAN` · `M_LOKASI`
  - Tabel 5: `T_UTAMA` (+3 FK baru: jenis/lokasi/periode) · `T_ITEM` · `T_LAMPIRAN` · `T_APPROVAL` · `T_TINDAK_LANJUT`
  - Buang: `M_REFERENSI` (filler), `T_REKAP` (→fungsi laporan); opsional: `T_LOGBOOK`, `T_JADWAL` (blok header di komentar 01)
- **Piramida output 12 + 8 + 6 + 4 = 30** (referensi, tidak kaku):
  - **Laporan 12**: per kategori (rollup hierarki), jenis, lokasi, periode, pegawai, status, satuan, matriks jenis×tahun, matriks jenis×lokasi, detail, lampiran, approval
  - **Analisa 8**: distribusi lokasi/jenis, top pegawai, beban lokasi, korelasi jenis×lokasi (matrix), tren 12 bln, umur data, SLA approval
  - **Evaluasi 6**: kelengkapan, SLA verifikasi, kepatuhan periode, kualitas data (FK yatim + duplikat), lampiran, RTL terbuka
  - **RTL 4 sumber**: R1 kelengkapan (E1), R2 SLA (E2), R3 periode (E3), R4 manual — FSM tetap
- **Dashboard "ukuran sedang" 4+4+4**: 4 kartu summary + 4 chart + 4 panel — **semua dihitung server-side** (`get_dashboard_`) — tidak ada lagi grafik dari 20 baris halaman pertama
- **Handler 72 → 86** (+2 native CoreLib = 88 aksi) — sinkron 1:1 `actionLevels` (fail-closed)
- **Guard referensial**: delete master yang masih dipakai T_UTAMA DITOLAK; parent kategori wajib ada; FK jenis wajib valid; periode kode auto (YYYY / YYYY-MM)
- **Seed master otomatis** di `initDatabase()`/`setupApp()` (4 kategori, 5 jenis, 3 periode, 3 satuan, 3 lokasi — hanya jika kosong)
- **UIUX v2** (standar hasil audit si-dokumen — detail di `AUDIT_UIUX_SIDOKUMEN.md`):
  - **Play CDN dihapus** → CSS Tailwind v3.4.17 ter-compile inline (salinan: `frontend-cdn/frontend/app-tailwind.min.css`)
  - Nama bukan ID (lookup 5 master + pegawai) · tahun select di semua filter · icon menu unik
  - Form RTL tanpa field status (status hanya via modal + FSM) · title tanpa versi internal
- **Test suite**: tambah `testSmokePiramida` (12L+8A+6E via dispatcher) + `testDashboard444` + guard master (parent/FK/kode auto) + detail relasi T_UTAMA
- **Frontend**: 7 halaman (dashboard, transaksi, laporan, analisa, evaluasi, rtl, master) · menu Insight/Aksi/Data · `SK_MAPS` global (peta tab→aksi)

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
- **CDN**: @v2.9.0 (10 file — 1 CSS + 9 JS & 31 opsi, 20 .min sinkron) + 6 preset tema dinamis + AppCore.getMyScope() — sesuai persetujuan user 2026-09-23

---

## 📜 Lisensi & Kontak

- Pengelola: Tim TI — Diskominfo Trenggalek
- Lisensi: MIT
- Docs ekosistem: repo frontend-cdn (ECOSYSTEM_GUIDE, ROADMAP_CDN, CDN_SNIPPET, backend/00_MIGRATION_v2.md)
