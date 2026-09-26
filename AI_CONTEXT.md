# 🤖 AI_CONTEXT.md — Surat Pengantar Ekosistem (untuk AI coder / developer baru)

> Baca file ini **DULU** sebelum menyentuh apa pun di folder ini.
> Versi konteks: 2026-09-24 (starter-kit v2.13.0 — Grid 1 halaman: Laporan 2-tab 2-kolom + Analisa/Evaluasi tanpa tab + angka tengah + tepi px-4/6 — CDN v2.9.2 stabil satu versi + CoreLib v2.4.0) • Pemelihara: Tim TI Diskominfo Kab. Trenggalek

---

## 1. Apa ini

`starter-kit/` = template resmi untuk membuat **aplikasi web bisnis baru** Pemkab Trenggalek di atas GAS + Vue 3 + ekosistem bersama.

**v2.12.0 (2026-09-23)** = CDN v2.9.1 (8 file & 31 opsi) + CoreLib v2.4.0 A+B (C4-C8) + tema Opsi B + scope Saya; v2.11.0 (2026-09-22) = redesign skema (keputusan user) + adopsi **UIUX v2** (standar hasil audit si-dokumen):

- **Skema 10 sheet (BASELINE — FLEKSIBEL, bukan kewajiban):**
  - **5 master = 5 dimensi laporan**: `M_KATEGORI` (hierarki parent_id), `M_JENIS` (FK kategori + sifat periode Tahunan/Bulanan/Periodik/Fleksibel), `M_PERIODE` (tahun/bulan, kode auto YYYY / YYYY-MM), `M_SATUAN`, `M_LOKASI`
  - **5 tabel inti**: `T_UTAMA` (5 FK: kategori/jenis/lokasi/periode/satuan + pegawai), `T_ITEM`, `T_LAMPIRAN`, `T_APPROVAL`, `T_TINDAK_LANJUT` (RTL)
  - **Opsional** (salin blok header di komentar 01 bila app butuh): `T_JADWAL`, `T_LOGBOOK`
  - Buang dari v2.10.0: `M_REFERENSI` (filler), `T_REKAP` (rekap = fungsi laporan, bukan sheet)
- **Piramida output (REFERENSI — tidak kaku): 12 Laporan + 8 Analisa + 6 Evaluasi + 4 RTL sumber = 30**
- **Dashboard "ukuran sedang": 4 kartu summary + 4 chart + 4 panel — semua dihitung server-side**
- **Handler 86** (+2 native CoreLib = 88 aksi)
- **UIUX v2**: CSS Tailwind TER-COMPILE (bukan Play CDN), nama bukan ID, tahun select, v-can role-gate, form tanpa field yang dikunci backend, icon menu unik, title tanpa versi
- **Seed master otomatis** di `initDatabase()`/`setupApp()` (hanya jika sheet kosong)
- **Guard referensial**: delete master yang masih dipakai DITOLAK; parent/kategori FK wajib valid

**Sejarah singkat:**
- v2.0.1 (2026-09-19): CoreLib pin 15 + dispatchAction + 10 sheet
- v2.10.0 (2026-09-21): 11 sheet + 72 handler + RTL + UIUX v1.10 (cetakan si-arsip v1.10)
- v2.10.1 (2026-09-22): FIX K1 (isRefSheet_) + P1 (RTL FSM)
- **v2.13.0 (2026-09-24): Grid 1 halaman — Laporan 2-tab (Dimensi 7 + Matriks 5) 2-kolom + Analisa 8 tanpa tab 2×4 + Evaluasi 6 tanpa tab 2×3 + RTL fix + angka tengah (JUMLAH/TAHUN) + tepi px-4/6 tidak mepet + CDN v2.9.2 stabil (10 file 200 OK) + L8/L9 flat (tahun/lokasi) + lookup kode + detail wrap**

**v2.12.0 (2026-09-23): CDN v2.9.1 + CoreLib v2.4.0 A+B + Pengaturan (tema/scope) — 5M+5T + piramida 12/8/6/4 + dashboard 4+4+4 + UIUX v2**

**DOKUMEN DESAIN LEBIH LENGKAP** (di workspace, di luar repo): `DESAIN_SCHEMA_V2_11.md` (peta 30 output + alasan fleksibel) dan `AUDIT_UIUX_SIDOKUMEN.md` (12 aturan UIUX v2).

---

## 2. Empat pilar ekosistem (JANGAN bangun ulang)

| Pilar | Bentuk | Versi pin | Peran |
|---|---|---|---|
| **CoreLib** | GAS Library ID `1GmeYflfMpRa1iTVgFHRD6K1DMoxc9OoKqpuucPJXgNZ9XBK06O7wgDkO` | **17** (v2.4.0 LIVE PASS 47) | Mesin sheet/CRUD/cache/sesi/SSO + dispatcher + WIB utils |
| **frontend-cdn** | jsDelivr `@v2.9.1` (internal `2.9.0`) | **v2.9.1** eksplisit | 10 file (1 CSS + 9 JS) & 31 opsi + desain; `frontend/app-tailwind.min.css` = contoh CSS ter-compile |
| **si-platform** | GAS web app SSO IdP | URL di 01_Config | Login/user/role/permission/audit/notifikasi/file |
| **SIMPEG** | Spreadsheet master RO | — | 3 sheet PEGAWAI/JABATAN/UNIT_KERJA — CoreLib auto route |

**Vue 3.5.42** + **FA 6.5.2** + **Tailwind 3.4.17 ter-compile (inline, bukan Play CDN)**.
**Tema v2.12.0**: dinamis via `THEME_JSON` (ScriptProperties) + `<?!= getThemeCss() ?>` + `<app-theme-picker>` (6 preset: emerald/sky/amber/violet/rose/teal) — fallback sky-700 #0369a1. Per app boleh beda.

---

## 3. Aturan keras (kontrak — pelanggaran = bug produksi)

1. CoreLib first — wrapper lokal `return CoreLib.x(...)`
2. Tag kit berpasangan `<app-x></app-x>` — jangan `/>`
3. Pin CDN & Library eksplisit — naikkan sadar + catat commit
4. Tolerant reader SIMPEG — by header name
5. GAS = kebenaran produksi; workspace = pengembangan — deploy New version
6. Anti-kontaminasi Cloudflare
7. contract-check sebelum deploy
8. Skema = **baseline 5M+5T, FLEKSIBEL** — app boleh tambah/kurangi sheet & handler sesuai domain; yang tidak boleh hilang: kolom audit 5 di tiap sheet + sinkron actionLevels↔handler (fail-closed)
9. th sortable / checkbox = custom; komponen root div ilegal di tbody
10. SSO native CoreLib — no fallback email
11. Soft-delete filter otomatis — `{includeDeleted:true}` untuk audit
12. Kunci field via `localPreSaveHook_` P2 (verifikator+)
13. **UIUX v2 (standar audit si-dokumen):**
    - **CSS ter-compile** — Play CDN hanya prototyping. Compile ulang saat menambah kelas baru; jaga `Index.html` < 50 KB (batas GAS).
    - **Nama, bukan ID** di tabel (helper lookup / field `*_nama`).
    - **Tahun = select** (`tahunOptions` di J_State), bukan teks.
    - **Tombol di-gate role** — `v-can="'<level>'"` (fail-closed).
    - **Fitur setengah jadi tidak dipamerkan** (hapus tab; backend boleh tetap).
    - **Form tanpa field yang dikunci backend** (mis. status RTL hanya via modal FSM).
    - `min-w-[...]` di th + `table-scroll` · `<app-badge :status="valid">` · KPI `<app-stat-card>` · pagination `btn-icon` · `.filter-label` · modal `v-if` + `@close` · tema per app `:root --primary`.

---

## 4. Katalog jebakan historis

- Salah-paste, deployment snapshot, self-closing, skeleton dead-code, bare globals (map konstanta Vue → pakai global `window.SK_MAPS`, jangan di dalam `methods`), tag konten balapan, tanggal UTC vs WIB (`todayIsoLocal()` / `dateKey10()`), soft-delete tampil, self-approve verifikasi (hook P2 tutup), in-flight dedup, `audit_ is not defined` (00_Utils wajib), paginasi meta naming (total/total_pages — satu sumber paginasi per endpoint), VALIDATION_ERROR vs BAD_REQUEST (backend = BAD_REQUEST), guard referensial master (jangan skip saat tambah sheet baru — `deleteGuarded_`), Index > 50 KB saat menambah kelas Tailwind tanpa re-minify.

---

## 5. Cara mengetes v2.13.0

- CoreLib: `testAll` di Library → PASS 42 / FAIL 0 / SKIP 1
- App: `runAllTestsStarterKit()`:
  - `runLibraryTests()` → PASS 42 / FAIL 0 / SKIP 1
  - `testAdopsiG18d()` → 13/0
  - `testDispatcherRouting()` → 6/0 (registry 86 handler + fail-closed)
  - `runDomainTestsStarterKit()` → ~35/0 (guard 5 master + T_UTAMA relasi + RTL FSM + hook P1/P2 + skema 10 sheet + **smoke piramida 12L/8A/6E** + **dashboard 4+4+4**)
- Diagnostik: `runAllDiagnostics()` + `testKoneksiKePortalSso()`
- Kontrak: `python3 frontend-cdn/tools/contract_check.py`
- UIUX: cek manual vs 12 aturan §3.13

---

## 6. Peta dokumen

- frontend-cdn: ECOSYSTEM_GUIDE, ROADMAP_CDN, CDN_SNIPPET, `frontend/app-tailwind.min.css` (CSS ter-compile)
- starter-kit: README.md (changelog v2.12.0), src/ (16 file), AI_CONTEXT.md (ini)
- Workspace: `DESAIN_SCHEMA_V2_11.md` (desain skema + peta 30 output), `AUDIT_UIUX_SIDOKUMEN.md` (standar UIUX v2), `REVIEW_EKOSISTEM.md` (status fase)

---

## 7. Struktur src/ v2.13.0 (17 file: Grid 1 halaman + V_Pengaturan.html)

```
src/
├── appsscript.json
├── 00_Utils.gs
├── 01_ConfigAndBridge.gs (10 sheet + 88 actionLevels + hook P1/P2 + guard + komentar sheet opsional)
├── 02_AppLogic.gs (86 handler: 5M + 5T + 12L + 8A + 6E + RTL FSM + dashboard 4+4+4 + seed + guard referensial)
├── 99_TestSuite.gs (library + adopsi + routing + domain + smoke piramida + dashboard)
├── Index.html (CSS Tailwind ter-compile inline + tema #0369a1 + include 8 view)
├── V_Dashboard.html (4 kartu + 4 chart + 4 panel — server-side)
├── V_Utama.html (transaksi CRUD + 5 filter + tahun select + paginasi server + nama bukan ID)
├── V_Laporan.html (12 tab L1-L12)
├── V_Analisa.html (8 tab A1-A8)
├── V_Evaluasi.html (6 tab E1-E6)
├── V_Rtl.html (R1-R4 + generate E1/E2/E3 + FSM + tanpa field status di form)
├── V_Master.html (5 tab master)
├── V_Modals.html (form transaksi + form master dinamis per tab)
├── J_State.html (state 5M + 12L/8A/6E per-tab + tahunOptions + akses chart)
├── J_Helpers.html (fmtTgl + badge + lookup nama + formatBytes_ + korelasiCell_)
├── J_Api.html (SK_MAPS global + loader semua domain)
├── J_Actions.html (simpan/hapus 5 master generik + utama + RTL)
└── J_App.html (menu 7 halaman + icon unik + AppCore.create)
```

**Sheet bisnis**: 10 (5 M + 5 T) baseline fleksibel. **Sheet uji**: ZZ_TEST_CRUD. **Sistem**: AUDIT_LOGS + MAIN_DATA. **SIMPEG**: PEGAWAI/JABATAN/UNIT_KERJA RO.

---

## 8. Gaya kerja pemilik

- Pemula teknis: bahasa sederhana, snippet utuh, analogi.
- Perubahan besar = bertahap + gate + salin → tes → lihat → lanjut.
- Tidak ada push otomatis GitHub; upload manual.
- Tag rilis: selalu BARU, jangan geser/hapus lama — commit dulu baru tag.
- Gudang doctrine: GitHub = salinan/arsip; GAS = rujukan hidup & sumber error.
- Staged processing: kalau berat/lama, proses bertahap saja.
- CDN-usage principle: apps must converge on CDN components.
- Docs-now/code-later rule, cross-app review loop via screenshots.
- Mandat kecepatan: multi-modul per turn; throughput uji end-to-end > polish kosmetik.
- CoreLib/CDN/starter-kit promotion DEFERRED — mark candidates di apps dulu, stabil, THEN promote.
- **Kerangka = standar, bukan belenggu** (2026-09-22): jumlah sheet & jumlah output = baseline/referensi; tiap app bisnis boleh sesuaikan sesuai keunikannya.
