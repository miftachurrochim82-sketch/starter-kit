// ==================== FILE 1: KONFIGURASI ====================
// Starter-kit v1.0 — ganti bagian bertanda [SESUAIKAN] saja.

// [SESUAIKAN] Kode aplikasi (harus terdaftar di si-platform → sheet applications)
var APP_CODE = 'SI-CONTOH';

// [SESUAIKAN] ID spreadsheet database app ini (fallback bila Script Properties kosong)
var DEFAULT_SPREADSHEET_ID = 'ISI-ID-SPREADSHEET-DB-APP-DI-SINI';

// ID spreadsheet MASTER SIMPEG (jangan diubah — 3 sheet referensi: PEGAWAI, JABATAN, UNIT_KERJA)
var MASTER_SPREADSHEET_ID = '1HvMXmvdtgAUZ9A0-SQHZp9QjnYv1A7Ku_oJIjbT8gT0';

// URL /exec si-platform (SSO) — jangan diubah kecuali platform pindah deployment
var PLATFORM_API_URL = 'https://script.google.com/macros/s/AKfycbwh_OUVqmxLcuF81FHmPZtT33Wrm8Ce9Da1SQ3hfkSr7gM5P8ofyAlHSgW40mq3eo-PoQ/exec';

// Prefiks kunci sesi app ini (unik per app, jangan bentrok dengan app lain)
var SESSION_PREFIX = 'SESI_SICONTOH';
var SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 jam

// ==================== SKEMA HEADER (kontrak sheet app) ====================
// [SESUAIKAN] Hapus T_CONTOH, ganti dengan sheet transaksi bisnismu.
// Kolom audit (created_at s/d deleted_at) WAJIB ada — dipakai CoreLib.
var AUDIT_COLS = ['created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'];

var ALL_SHEET_HEADERS = {
  M_REFERENSI: [
    'id', 'kategori', 'kode', 'nama_nilai', 'urutan', 'status_aktif', 'keterangan',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  T_CONTOH: [
    'id', 'kode', 'judul', 'pegawai_id', 'tanggal', 'status', 'keterangan',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ]
};

// Sheet referensi app (bukan transaksi) — cache lebih panjang
function isRefSheet_(name) {
  return String(name || '').toUpperCase().indexOf('M_') === 0;
}

// ID spreadsheet aktif: Script Properties menang, fallback konstanta
function getSpreadsheetId_() {
  var fromProps = '';
  try { fromProps = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || ''; } catch (e) {}
  return fromProps || DEFAULT_SPREADSHEET_ID;
}

// Config baku untuk semua panggilan CoreLib
function corelibConfig_() {
  return {
    appCode: APP_CODE,
    spreadsheetId: getSpreadsheetId_(),
    masterSsId: MASTER_SPREADSHEET_ID,
    platformApiUrl: PLATFORM_API_URL,
    sessionPrefix: SESSION_PREFIX,
    ttlSeconds: SESSION_TTL_SECONDS
  };
}
