# 🤖 AI_CONTEXT.md — Surat Pengantar Ekosistem (untuk AI coder / developer baru)

> Baca file ini **DULU** sebelum menyentuh apa pun di folder ini.
> Versi konteks: 2026-09-21 malam (starter-kit v2.10.0 — 11 sheet + 72 handler + RTL + UIUX v1.10) • Pemelihara: Tim TI Diskominfo Kab. Trenggalek

---

## 1. Apa ini

`starter-kit/` = template resmi untuk membuat **aplikasi web bisnis baru** Pemkab Trenggalek di atas GAS + Vue 3 + ekosistem bersama.

**v2.10.0 (2026-09-21 malam)** = cetakan ulang dari **si-arsip v1.10** (11 sheet + 72 handler + RTL R1-R5 + UIUX polish 59/28/0/0/56 + 203/0/1 test) + **si-kompetensi v6.0.1** & **si-lahar v2.1.0**.

**Perubahan besar v2.0.1 → v2.10.0:**
- **Skema 10 → 11 sheet**: tambah `T_TINDAK_LANJUT` (alias `T_RTL`) — contoh RTL R1-R5 generik dari si-arsip (E3/A9/E5/E6/E7/E8/manual + generate + status baru→diproses→selesai/batal + progress bar)
- **Handler  ~30 → 72**: tambah M_KATEGORI, M_SATUAN, T_ITEM, T_LOGBOOK, T_LAMPIRAN, T_APPROVAL delete, T_JADWAL, T_REKAP, laporan L4/L5, analisa A3-A5, evaluasi E1/E3/E5, RTL 12 handler (6 generic + 6 alias rtl_*)
- **UIUX v1.10 polish** (dari si-arsip): min-w 59 + table-scroll 28 + overflow 0 + custom card 0 + app-stat-card 56 + modal :show→v-if + tema #0369a1 + filter label + btn-icon — aturan wajib baru
- **Frontend 8 → 10 file**: tambah V_Rtl.html (generik RTL) + V_Utama.html + V_Laporan.html + V_Master.html — semua dengan polish v1.10
- **CDN tetap @v2.8.1** — v2.9.0 kandidat C1-C3 backlog (filter-bar-analytics, progress-track, empty-state slot) skip dulu, batch nanti dengan app lain — keputusan user 21 Sept malam
- **Tema per app**: `:root --primary #0369a1` sky-700 + meta theme-color + tailwind config — CDN tetap netral
- **Test suite**: tambah RTL 4 test + schema 11 sheet + routing 72 handler

**Sejarah singkat:**
- v1.0: starter-kit awal (si-kompetensi v2.x)
- v2.0.1 (2026-09-19): CoreLib pin 15 + dispatchAction + 10 sheet + 14 file
- v2.10.0 (2026-09-21): 11 sheet + 72 handler + RTL + UIUX v1.10 + 16 file — setelah si-arsip v1.10 SELESAI

---

## 2. Empat pilar ekosistem (JANGAN bangun ulang)

| Pilar | Bentuk | Versi pin | Peran |
|---|---|---|---|
| **CoreLib** | GAS Library ID `1GmeYflfMpRa1iTVgFHRD6K1DMoxc9OoKqpuucPJXgNZ9XBK06O7wgDkO` | **15** (v2.3.0) | Mesin sheet/CRUD/cache/sesi/SSO + 72 handler registry + WIB utils |
| **frontend-cdn** | jsDelivr `@v2.8.1` (internal `2.8.0`) | **v2.8.1** eksplisit | 15+ komponen app-* + desain + UIUX v1.10 blueprint lokal (filter-bar-analytics, progress-track) |
| **si-platform** | GAS web app SSO IdP | URL di 01_Config | Login/user/role/permission/audit/notifikasi/file |
| **SIMPEG** | Spreadsheet master RO | — | 3 sheet PEGAWAI/JABATAN/UNIT_KERJA — CoreLib auto route |

**Vue 3.5.42** + **FA 6.5.2** + Tailwind Play CDN dev / compiled prod.
**Tema v2.10.0**: #0369a1 (sky-700) — contoh si-arsip, per app boleh beda.

---

## 3. Aturan keras (kontrak — pelanggaran = bug produksi)

1. CoreLib first — wrapper lokal `return CoreLib.x(...)`
2. Tag kit berpasangan `<app-x></app-x>` — jangan `/>`
3. Pin CDN & Library eksplisit — naikkan sadar + catat commit
4. Tolerant reader SIMPEG — by header name
5. GAS = kebenaran produksi; workspace = pengembangan — deploy New version
6. Anti-kontaminasi Cloudflare
7. contract-check sebelum deploy
8. DB app baru minimal 3 master + 3 tabel (kit ini 3+8=11), kolom audit wajib
9. th sortable / checkbox = custom; komponen root div ilegal di tbody
10. SSO native CoreLib — no fallback email
11. Soft-delete filter otomatis — `{includeDeleted:true}` untuk audit
12. Kunci field via `localPreSaveHook_` P2 (verifikator+)
13. **UIUX v1.10 (BARU — dari si-arsip v1.10):**
    - th wajib `min-w-[...]` — Judul 260px, Kode 100-160px, Status 100px, Aksi 120px, wrapper `table-scroll`, bukan `overflow-x-auto`. Grep min-w ≥30.
    - Badge wajib `<app-badge :status="valid">` — valid: aktif/disetujui/ditolak/menunggu/proses/draft/nonaktif/batal/revisi/verifikasi/belum. Mapping: selesai=disetujui, baru/draft=draft, diproses=menunggu, batal=ditolak, E6=ditolak, E7=menunggu, E5/E8=proses. Dilarang raw `badge-sky/rose/amber/gray` + empty `''`.
    - KPI wajib `<app-stat-card>` — tidak ada custom `card !p-3 text-center` + `text-lg font-black`. Props: title, :value, icon, color, subtext.
    - Pagination `btn-icon` chevron, filter label `text-[11px] text-slate-500` / `.filter-label`, wrapper `filter-bar-analytics` / `flex flex-col sm:flex-row gap-2 items-end`.
    - Modal `v-if="showX" @close="showX=false"` + size md/lg/2xl/3xl, bukan `:show=`.
    - Tema per app: `:root --primary #0369a1` + `theme-color` + tailwind config — CDN tetap netral.

---

## 4. Katalog jebakan historis

- Salah-paste, deployment snapshot, self-closing, skeleton dead-code, bare globals, tag konten balapan, tanggal UTC vs WIB (pakai `todayIsoLocal()` / `dateKey10()`), soft-delete tampil, self-approve verifikasi (hook P2 tutup), in-flight dedup, `audit_ is not defined` (00_Utils wajib), paginasi meta naming (total/total_pages vs totalData/totalPages — kompat layer), VALIDATION_ERROR vs BAD_REQUEST (backend pakai BAD_REQUEST, test tolerant), catatLogbook_ isUpdate bug (false bukan true).

---

## 5. Cara mengetes v2.10.0

- CoreLib: `testAll` di Library → PASS 42 / FAIL 0 / SKIP 1
- App: `runAllTestsStarterKit()`:
  - `runLibraryTests()` → PASS 42 / FAIL 0 / SKIP 1
  - `testAdopsiG18d()` → 13/0
  - `testDispatcherRouting()` → ~72/0 (72 handler + fail-closed)
  - `runDomainTestsStarterKit()` → ~30/0 (11 sheet + RTL 4 test + SIMPEG RO + hook + schema)
- Diagnostik: `runAllDiagnostics()` + `testKoneksiKePortalSso()`
- Kontrak: `contract_check.py`
- UIUX: `python3 frontend-cdn/tools/uiux_check.py --path src --level 3` (target 59/28/0/0/56 + modal v-if + tema + filter label + btn-icon + progress bar)

---

## 6. Peta dokumen

- frontend-cdn: ECOSYSTEM_GUIDE, ROADMAP_CDN, CDN_SNIPPET, backend/00_MIGRATION_v2.md
- starter-kit: README.md (v2.10.0 changelog), src/ (16 file), AI_CONTEXT.md (ini)
- si-arsip v1.10: referensi utama RTL + UIUX v1.10 (11 sheet + 72 handler + 203/0/1)
- Workspace Arena: DAFTAR_SALIN, STATUS_PROYEK, .clasp.json (LIbrary-CoreLib seed)

---

## 7. Struktur src/ v2.10.0 (16 file)

```
src/
├── appsscript.json
├── 00_Utils.gs
├── 01_ConfigAndBridge.gs (11 sheet + 72 actionLevels + T_TINDAK_LANJUT header 15 cols + LOCAL_ID_PREFIX rtl)
├── 02_AppLogic.gs (72 handler incl RTL 12 + laporan 2 + analisa 3 + evaluasi 3)
├── 99_TestSuite.gs (library + adopsi + routing 72 + domain 11 sheet + RTL)
├── Index.html (tema #0369a1 + include V_Rtl+V_Utama+V_Master+V_Laporan + filter-bar-analytics + progress-track CSS)
├── V_Dashboard.html (4 KPI app-stat-card + 2 chart + tabel terbaru + RTL ringkas + min-w + table-scroll)
├── V_Rtl.html (RTL generik R1-R5 + generate panel + filter label + stat 4 + table min-w + progress bar + modal v-if)
├── V_Utama.html (T_UTAMA + filter-bar + table-scroll min-w + badge valid + btn-icon + pagination)
├── V_Master.html (3 tab ref/kategori/satuan + table-scroll min-w + badge aktif/nonaktif + btn-icon)
├── V_Laporan.html (L4 klasifikasi + L5 unit + filter-analytics + stat-card + table-scroll)
├── V_Modals.html (Utama + Referensi + v-if + @close + size)
├── J_State.html (dashboardData + rtl state 15 vars + laporan/analisa state)
├── J_Helpers.html (fmtTgl + badgeStatusUtama/Rtl/Sumber + toggleRowMenu)
├── J_Api.html (loadDashboard + loadMaster + loadUtama + loadLapKlasifikasi + loadAnalisaUnit + loadRtl pagination + generateRtl)
├── J_Actions.html (simpanUtama/hapusUtama/simpanReferensi/hapusReferensi/simpanRtl/hapusRtl/openRtlEdit/openRtlStatus/ubahStatusRtl)
└── J_App.html (menu 5 item + brand v2.10.0 + storagePrefix sicontoh + AppCore.create)
```

**Sheet bisnis**: 11 (3 M + 8 T incl RTL). **Sheet uji**: ZZ_TEST_CRUD. **Sistem**: AUDIT_LOGS + MAIN_DATA. **SIMPEG**: PEGAWAI/JABATAN/UNIT_KERJA RO.

---

## 8. Gaya kerja pemilik

- Pemula teknis: bahasa sederhana, snippet utuh, analogi.
- Perubahan besar = bertahap + gate + salin → tes → lihat → lanjut.
- Tidak ada push otomatis GitHub; upload manual.
- Tag rilis: selalu BARU, jangan geser/hapus lama — commit dulu baru tag.
- Gudang doctrine: GitHub = salinan/arsip; GAS = rujukan hidup & sumber error.
- Screenshot pruning: simpan hanya 20 Sept (hapus 28) — evidence jadi narasi ledger/STATUS.
- Staged processing: kalau berat/lama, proses bertahap saja.
- CDN-usage principle: apps must converge on CDN components; A0_Head CSS di Index <style> = blueprint baru.
- Docs-now/code-later rule, cross-app review loop via screenshots.
- Mandat kecepatan: multi-modul per turn; throughput uji end-to-end > polish kosmetik.
- CoreLib/CDN/starter-kit promotion DEFERRED — mark candidates di apps dulu, stabil, finish frontend, THEN promote.
- Platform include pattern = si-kompetensi pattern; Index split A0_Head/V_Shell/V_Modals — Live preview CANCELLED.
