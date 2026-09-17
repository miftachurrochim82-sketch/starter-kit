# 🧰 STARTER-KIT WEB APP BISNIS (G2-4)

Template siap pakai untuk membuat **aplikasi web bisnis baru** di ekosistem
Trenggalek (SI-PLATFORM + CoreLib + Frontend CDN). Dicetak dari prototipe
**si-kompetensi** yang sudah teruji (runAllTests 55/0/0, CoreLib 38/0/1).

> Versi template: 1.0 (2026-09-17) — **menggantikan template lama `backend/Code.gs` di repo frontend-cdn (dihapus)**. • CoreLib **v2.2.4 (pin versi 14)** • CDN **v2.7.5**

---

## 🏗️ Yang sudah diurus ekosistem (JANGAN bikin sendiri)

| Kebutuhan | Penyedia | Cara pakai |
|---|---|---|
| Login / SSO / sesi | **si-platform** + `CoreLib.exchangePlatformTicket` | terima `?ticket=` → tukar → token sesi |
| Master pegawai/jabatan/unit | **SIMPEG** (3 sheet referensi) | `CoreLib.getSheetDataCached(..., {masterSsId})` — CoreLib otomatis route PEGAWAI/JABATAN/UNIT_KERJA ke DB master |
| Mesin sheet/CRUD/cache/audit | **CoreLib** (Library GAS) | `apiSave`, `apiDelete`, `ensureSheet`, `checkAuth` |
| UI (sidebar, header, tabel, modal, filter, chart, badge, dll.) | **CDN kit v2.7.5** | 13+2 komponen `app-*`, registrasi 1 baris |
| User/role/permission/notifikasi/file/konfigurasi global | **si-platform** | tidak perlu sheet lokal |

## 📦 Isi template

```text
src/
├── appsscript.json     # Manifest V8 + Library CoreLib pin 14
├── 01_Config.gs        # APP_CODE, ID spreadsheet, skema header, corelibConfig_
├── 02_SetupAndSeed.gs  # initDatabaseApp() — ensureSheet + header hijau + seed
├── 03_AppLogic.gs      # handleApi: ping, SSO, baca SIMPEG, CRUD contoh
├── 04_Router.gs        # doGet/doPost/include/api
├── Index.html          # Daftar isi include
├── A0_Head.html        # CDN v2.7.5 + Vue 3.5.42 + FA + Tailwind (Play saat dev)
├── V_Shell.html        # app-sidebar + app-header kit
├── V_Dashboard.html    # Contoh: stat-card + crud-table + modal
├── J_State.html        # data/computed Vue
└── J_App.html          # createApp + registrasi kit + callServer + boot SSO
```

Database app baru cukup **5–10 sheet**: `M_REFERENSI` + `T_*` transaksi milikmu
(+ sheet sesi yang diurus CoreLib). Master pegawai TIDAK diduplikasi.

---

## 🚀 Checklist membuat aplikasi baru (±30 menit)

1. **Buat spreadsheet DB** baru untuk app → salin ID-nya.
2. **Buat proyek GAS** baru → buat file sesuai `src/` (whole-file paste).
3. `appsscript.json`: pastikan Library `CoreLib` pin **14**
   (ID `1GmeYflfMpRa1iTVgFHRD6K1DMoxc9OoKqpuucPJXgNZ9XBK06O7wgDkO`).
4. `01_Config.gs`: ganti `APP_CODE` (mis. `SI-ASET`), isi `DEFAULT_SPREADSHEET_ID`,
   sesuaikan `SHEET_HEADERS` (hapus T_CONTOH, tambah sheet bisnismu).
5. Di GAS: **Run ▸ `initDatabaseApp`** sekali (sheet + header hijau + seed tercipta).
6. **Daftarkan app di si-platform** (halaman Apps / sheet `applications`):
   code, nama, dan URL `/exec` hasil deploy.
7. **Deploy ▸ New deployment ▸ Web app**: executeAs *deploying user*,
   akses *Anyone*. Salin URL → masukkan ke langkah 6.
8. Uji SSO: buka app lewat katalog si-platform (tiket otomatis di URL).
9. Sebelum produksi: minta **Tailwind compiled** (Track D) supaya Play CDN pensiun,
   dan jalankan `contract_check.py` (tambahkan app barumu ke daftar APPS).

## 📏 Aturan wajib (kontrak ekosistem)

1. **CoreLib first** — cek katalog sebelum menulis fungsi util; duplikasi hanya
   untuk logika bisnis. Wrapper lokal boleh, isi wajib `return CoreLib.x(...)`.
2. **Tolerant reader** untuk data SIMPEG — baca kolom *by header name*, ambil
   hanya yang dibutuhkan (sudah otomatis bila lewat `CoreLib.getSheetDataCached`).
3. **Tag kit selalu berpasangan** — `<app-x ...></app-x>`, JANGAN self-closing
   (`/>` di in-DOM template = bug menelan elemen berikutnya).
4. **Pin versi CDN** eksplisit (`frontend-cdn@v2.7.5`), jangan `@latest`.
5. Jalankan `python3 frontend-cdn/tools/contract_check.py` sebelum salin ke GAS.
