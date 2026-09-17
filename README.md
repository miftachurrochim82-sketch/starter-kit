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

## 🚀 Alur membangun aplikasi baru (13 langkah, 4 fase)

**Fase 1 — Persiapan (±10 menit, di browser)**
1. Tentukan kode aplikasi (mis. `SI-ASET`) — harus unik, akan didaftarkan di si-platform.
2. Buat **Spreadsheet baru** = database app (biarkan kosong).
3. Buat proyek GAS baru → buat 11 file, salin isi `src/` whole-file.

**Fase 2 — Penyesuaian (±10 menit, di editor GAS)**
4. `01_Config.gs`: ganti `APP_CODE`, isi `DEFAULT_SPREADSHEET_ID`, susun `SHEET_HEADERS`
   (`M_REFERENSI` + sheet `T_*` bisnismu; total 5–10 sheet; master SIMPEG TIDAK diduplikat).
5. `appsscript.json`: pastikan Library CoreLib **pin 14** (naikkan bila CoreLib rilis baru).
6. Run ▸ `initDatabaseApp()` sekali → sheet + header hijau + seed tercipta.

**Fase 3 — Terhubung ke ekosistem (±10 menit)**
7. Deploy ▸ Web app (executeAs: deploying user; access: Anyone) → catat URL `/exec`.
8. Daftarkan app di **si-platform** (sheet `applications`): code + nama + URL.
9. Uji SSO: buka katalog di platform → klik app → harus masuk otomatis (tiket sekali pakai).

**Fase 4 — Mengembangkan (berulang, santai)**
10. Logika bisnis di `03_AppLogic.gs` (pola `handleApi`; CRUD via `CoreLib.apiSave/apiDelete`;
    baca pegawai via `CoreLib.getSheetDataCached(..., {masterSsId})` = tolerant reader otomatis).
11. Tampilan pakai komponen kit; **tag selalu berpasangan** (jangan self-closing `/>`).
12. Sebelum tiap ronde salin ke GAS: jalankan **contract-check**
    (`python3 frontend-cdn/tools/contract_check.py` di workspace Arena; app baru didaftarkan
    dulu ke daftar APPS checker). Exit 0 = aman; exit 1 = perbaiki dulu.
13. Stabil & siap produksi serius → minta **Track D** (Tailwind compiled) + repo GitHub baru.

> Untuk AI coder / developer lain yang belum tahu riwayat: baca **`AI_CONTEXT.md`** dulu —
> itu surat pengantar ekosistem (versi, aturan keras, katalog jebakan, cara tes).

## 🤝 Memakai kit ini bersama AI coder / developer lain

AI atau orang baru TIDAK tahu riwayat proyek — berikan konteks secukupnya:

| Situasi | Lampirkan |
|---|---|
| Bikin app baru dari nol | `AI_CONTEXT.md` + `README.md` + seluruh `src/` (kecil, ±30KB — aman semua) |
| Mengedit app yang sudah jalan | `AI_CONTEXT.md` + file yang akan disentuh + `01_Config.gs` (konteks pin & skema) |
| Cuma tanya konsep | `AI_CONTEXT.md` saja cukup |

## 📏 Aturan wajib (kontrak ekosistem)

1. **CoreLib first** — cek katalog sebelum menulis fungsi util; duplikasi hanya
   untuk logika bisnis. Wrapper lokal boleh, isi wajib `return CoreLib.x(...)`.
2. **Tolerant reader** untuk data SIMPEG — baca kolom *by header name*, ambil
   hanya yang dibutuhkan (sudah otomatis bila lewat `CoreLib.getSheetDataCached`).
3. **Tag kit selalu berpasangan** — `<app-x ...></app-x>`, JANGAN self-closing
   (`/>` di in-DOM template = bug menelan elemen berikutnya).
4. **Pin versi CDN** eksplisit (`frontend-cdn@v2.7.5`), jangan `@latest`.
5. Jalankan `python3 frontend-cdn/tools/contract_check.py` sebelum salin ke GAS.
