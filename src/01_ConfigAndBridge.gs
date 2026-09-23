// ============================================================
// STARTER-KIT - 01_ConfigAndBridge.gs (v2.12.0 — CDN v2.9.0 8 file + CoreLib v2.4.0 A+B)
// ============================================================
// Changelog:
//   v2.12.0 — CDN v2.9.0 (8 file & 31 opsi) + CoreLib v2.4.0 A+B (2026-09-23):
//             • Tema Opsi B: getThemeCss() → CoreLib.getThemeCss() + <app-theme-picker>
//               + THEME_JSON di ScriptProperties (6 preset: emerald/sky/amber/violet/rose/teal)
//             • Menu "Saya": ownerField helper + AppCore.getMyScope() + scope toggle Saya/Semua
//               (filterScope Saya/Semua, declarative router RLS ready)
//             • Workflow: STATUS_MAP + CoreLib.validateTransition / assertOwnership
//             • Periode: CoreLib.periodeBulan / dalamPeriode / hitungHariKerja (for piramida)
//             • Unique: CoreLib.findUnique / upsertUnique (anti-duplikat kode)
//             • Bump pin CoreLib 15→16, CDN @v2.8.1→@v2.9.0 (8 file: layout/ui/forms/data/charts/workflow)
//   v2.11.0 — REDESIGN SKEMA (keputusan user 2026-09-22):
//             5 master = 5 dimensi laporan: M_KATEGORI (hierarki), M_JENIS,
//             M_PERIODE, M_SATUAN, M_LOKASI.
//             5 tabel inti: T_UTAMA, T_ITEM, T_LAMPIRAN, T_APPROVAL,
//             T_TINDAK_LANJUT (RTL).
//             BUANG: M_REFERENSI (filler), T_LOGBOOK (AUDIT_LOGS CoreLib
//             sudah cukup), T_JADWAL & T_REKAP (rekap = fungsi laporan,
//             bukan sheet). JADWAL/LOGBOOK tetap tersedia opsional —
//             salin blok header-nya jika app membutuhkannya.
//             T_UTAMA + 3 FK baru: jenis_id, lokasi_id, periode_id.
//             actionLevels 72 → 88 handler (12L + 8A + 6E + 4R sumber).
//             Semua angka = BASELINE REKOMENDASI, bukan kewajiban —
//             app bisnis bebas menambah/mengurangi sheet & handler.
//   v2.10.1 — FIX K1: isRefSheet_ hanya untuk master SIMPEG (PEGAWAI/
//             UNIT_KERJA/JABATAN). Pola tetap dipertahankan di v2.11.0.
// Bridge tipis ke CoreLib v2.4.0 (pin 16) + kontrak dispatcher v2 + CDN v2.9.0.
//
// Bagian yang perlu Anda sesuaikan ditandai [SESUAIKAN].
//
// ⚡ CHECKLIST MINIMUM EDIT untuk app baru (30 menit):
// ────────────────────────────────────────────────────────────
//   1. APP_CODE (§1)              — kode unik, daftarkan di si-platform
//   2. APP_TITLE (§1)             — judul app
//   3. DEFAULT_SPREADSHEET_ID (§1) — isi ID spreadsheet DB
//                                    atau kosongkan + set Script Properties
//   4. ALL_SHEET_HEADERS (§3b)    — sesuaikan kolom bisnis
//   5. actionLevels (§7)          — 88 handler; kalau menambah/menghapus
//      handler di 02, sinkronkan di sini — kalau tidak, fail-closed
//
// ⚡ SKEMA 10 SHEET (baseline v2.11.0 — FLEKSIBEL, bukan kewajiban):
//   Master (5) — tiap sheet = 1 dimensi laporan ("per apa?"):
//     M_KATEGORI   — hierarki (parent_id) → L1 rollup
//     M_JENIS      — jenis + periode → L2/A2/A7
//     M_PERIODE    — tahun/bulan terkontrol → L4/A6 + SLA
//     M_SATUAN     — kuantitas/nilai → L7
//     M_LOKASI     — cabang/unit → L3/A1/A4
//   Tabel (5) — transaksi inti:
//     T_UTAMA           — 1 baris = 1 kejadian bisnis
//     T_ITEM            — detail per T_UTAMA (N)
//     T_LAMPIRAN        — file/dokumen bukti (N)
//     T_APPROVAL        — alur verifikasi
//     T_TINDAK_LANJUT   — RTL (puncak piramida)
//
// Opsional (tambahkan bila app membutuhkannya):
//   T_JADWAL   — deadline/kalender per kejadian
//   T_LOGBOOK  — jejak per baris bisnis (melengkapi AUDIT_LOGS CoreLib)
//
// Referensi SIMPEG (PEGAWAI/JABATAN/UNIT_KERJA) & ZZ_TEST_CRUD
// tidak dihitung sebagai budget sheet bisnis.
//
// UIUX v2 (standar hasil audit si-dokumen 2026-09-22):
// - CSS Tailwind TER-COMPILE (bukan Play CDN), inline di Index.html
// - Tidak ada ID mentah di tabel — nama via lookup
// - Tahun/periode = select (tahunOptions), bukan teks bebas
// - Tombol aksi di-gate role (v-can), fail-closed
// - min-w di th + table-scroll, app-stat-card, app-badge valid,
//   modal v-if + @close, tema per app --primary
// ============================================================

// ==================== §1 KONSTANTA GLOBAL ====================

// [SESUAIKAN] Kode aplikasi — harus terdaftar di si-platform (sheet applications)
var APP_CODE  = 'SI-CONTOH';
var APP_TITLE = 'SI-CONTOH — Starter Kit Web App v2.12.0';

// ID spreadsheet MASTER SIMPEG (jangan diubah — PEGAWAI/JABATAN/UNIT_KERJA)
var DEFAULT_MASTER_SPREADSHEET_ID = '1HvMXmvdtgAUZ9A0-SQHZp9QjnYv1A7Ku_oJIjbT8gT0';

// URL /exec si-platform (SSO) — jangan diubah kecuali platform pindah deployment
var DEFAULT_PLATFORM_URL = 'https://script.google.com/macros/s/AKfycbwh_OUVqmxLcuF81FHmPZtT33Wrm8Ce9Da1SQ3hfkSr7gM5P8ofyAlHSgW40mq3eo-PoQ/exec';

// [SESUAIKAN] ID spreadsheet database app ini (fallback bila Script Properties kosong).
// Kosongkan bila Anda ingin WAJIB lewat Script Properties (lebih aman).
var DEFAULT_SPREADSHEET_ID = '';

// Session format v2 CoreLib: 'APP_SESSION_<APP_CODE>_'
var SESSION_PREFIX      = 'APP_SESSION_' + APP_CODE + '_';
var SESSION_TTL_SECONDS = 6 * 60 * 60;   // 6 jam = cap CoreLib (21600)
var DATA_CACHE_TTL      = 300;           // 5 menit (sheet transaksi)

// Delegasi — satu sumber kebenaran level role
var ROLE_LEVELS = CoreLib.MASTER_ROLE_LEVELS;

// ==================== §1b TEMA PER-APP (CoreLib v2.4.0 C8) ====================
// THEME_JSON disimpan di Script Properties sebagai JSON string:
//   {"primary":"#065f46","preset":"emerald"}  (6 preset: emerald/sky/amber/violet/rose/teal)
// Frontend inject via <?!= getThemeCss() ?> di Index.html + <app-theme-picker>.
// Default: emerald (#065f46) bila properti kosong.
var DEFAULT_THEME = { primary: '#065f46', preset: 'emerald' };

function getThemeConfig_() {
  try { return CoreLib.getThemeConfig(appProps_(), DEFAULT_THEME); }
  catch (e) { return DEFAULT_THEME; }
}

// Dipanggil oleh Index.html template: <?!= getThemeCss() ?>
function getThemeCss() {
  try { return CoreLib.getThemeCss(appProps_(), DEFAULT_THEME); }
  catch (e) { return ':root{--primary:#065f46}'; }
}

// Dipanggil oleh handler save_theme (admin) untuk simpan THEME_JSON
function saveThemeConfig_(obj) {
  if (!obj || !obj.primary) throw new Error('Tema tidak valid.');
  return CoreLib.buildThemeCss ? CoreLib.buildThemeCss(obj) : getThemeCss();
}

// ==================== §1c SCOPE "SAYA" (RLS ownerField) ====================
// Helper untuk filter Saya/Semua di handler utama.
// Di frontend: AppCore.getMyScope() → 'mine' | 'all' (disimpan localStorage)
// Di backend: filter rows where row.pegawai_id === session.pegawai_id
// resources declaratif untuk dispatcher: auto-RLS bila set ownerField
var SCOPE_OWNER_FIELD = 'pegawai_id'; // kolom pemilik di T_UTAMA/T_ITEM

function filterByScope_(rows, scope, session) {
  if (scope === 'mine' && session && session.pegawai_id) {
    return rows.filter(function(r){ return String(r[SCOPE_OWNER_FIELD]||'') === String(session.pegawai_id); });
  }
  return rows;
}

// ==================== §1d WORKFLOW & PERIODE (CoreLib v2.4.0 A+B) ====================
// STATUS_MAP untuk validateTransition (C4) — transisi legal per resource
var STATUS_MAP = {
  'T_UTAMA': {
    'draft':      ['diajukan', 'arsip'],
    'diajukan':   ['disetujui', 'ditolak', 'direvisi'],
    'direvisi':   ['diajukan', 'arsip'],
    'disetujui':  ['selesai', 'arsip'],
    'ditolak':    ['diajukan', 'arsip'],
    'selesai':    ['arsip'],
    'arsip':      []
  },
  'T_TINDAK_LANJUT': {
    'baru':       ['proses', 'batal'],
    'proses':     ['selesai', 'tertunda'],
    'tertunda':   ['proses', 'batal'],
    'selesai':    [],
    'batal':      []
  }
};

// Wrapper tipis — biar app bisa panggil tanpa import CoreLib langsung
function periodeBulan_(tanggalStr){ try{ return CoreLib.periodeBulan(tanggalStr); }catch(e){ return ''; } }
function dalamPeriode_(tgl, start, end){ try{ return CoreLib.dalamPeriode(tgl, start, end); }catch(e){ return false; } }
function hitungHariKerja_(start, end){ try{ return CoreLib.hitungHariKerja(start, end); }catch(e){ return 0; } }
function findUnique_(sheet, field, value){ return CoreLib.findUnique(SPREADSHEET_ID, sheet, field, value, ALL_SHEET_HEADERS); }

// ==================== §2 PROPERTIES & SPREADSHEET ====================
// Store MILIK APP (bukan library) — wajib dioper ke CoreLib.getEnvProperty.
function appProps_() { return PropertiesService.getScriptProperties(); }

var SPREADSHEET_ID = CoreLib.getEnvProperty('SPREADSHEET_ID', appProps_())
  || DEFAULT_SPREADSHEET_ID
  || (function () {
      try { return SpreadsheetApp.getActiveSpreadsheet().getId(); } catch (e) { return ''; }
    })();

var MASTER_SPREADSHEET_ID = CoreLib.getEnvProperty('MASTER_SPREADSHEET_ID', appProps_())
  || DEFAULT_MASTER_SPREADSHEET_ID;

var PLATFORM_API_URL = CoreLib.getEnvProperty('PLATFORM_API_URL', appProps_())
  || DEFAULT_PLATFORM_URL;

// ==================== §3 SKEMA SHEET ====================
// [SESUAIKAN] Anda bebas ganti nama sheet bisnis (mis. T_UTAMA → T_ASET).
// Yang penting: kolom audit (created_at..deleted_at) ada — dipakai CoreLib.
// v2.11.0: 5 master + 5 tabel = 10 sheet bisnis (baseline, fleksibel).

var LOCAL_SHEETS = {
  // Master (5) — tiap sheet = 1 dimensi laporan
  M_KATEGORI: 'M_KATEGORI',
  M_JENIS:    'M_JENIS',
  M_PERIODE:  'M_PERIODE',
  M_SATUAN:   'M_SATUAN',
  M_LOKASI:   'M_LOKASI',
  // Tabel (5) — transaksi inti
  T_UTAMA:         'T_UTAMA',
  T_ITEM:          'T_ITEM',
  T_LAMPIRAN:      'T_LAMPIRAN',
  T_APPROVAL:      'T_APPROVAL',
  T_TINDAK_LANJUT: 'T_TINDAK_LANJUT'
};

// Prefix ID per-sheet (dipakai localPreSaveHook_ + CoreLib.genUniqueCode).
// [SESUAIKAN] Boleh diubah sesuai singkatan Anda.
var LOCAL_ID_PREFIX_ = {
  'M_KATEGORI':      'kat',
  'M_JENIS':         'jen',
  'M_PERIODE':       'per',
  'M_SATUAN':        'sat',
  'M_LOKASI':        'lok',
  'T_UTAMA':         'utm',
  'T_ITEM':          'itm',
  'T_LAMPIRAN':      'lmp',
  'T_APPROVAL':      'apr',
  'T_TINDAK_LANJUT': 'rtl'
};

// Alias nama sheet SIMPEG → kanonik (dibaca dari MASTER via CoreLib)
var SIMPEG_SHEET_ALIAS_ = {
  'PEGAWAI': 'PEGAWAI', 'M_PEGAWAI': 'PEGAWAI', 'pegawai': 'PEGAWAI',
  'UNIT_KERJA': 'UNIT_KERJA', 'M_UNIT_KERJA': 'UNIT_KERJA', 'unit_kerja': 'UNIT_KERJA', 'units': 'UNIT_KERJA',
  'JABATAN': 'JABATAN', 'M_JABATAN': 'JABATAN', 'jabatan': 'JABATAN'
};

function canonicalSimpegSheet_(sheetName) {
  var s = String(sheetName || '').trim();
  if (SIMPEG_SHEET_ALIAS_[s]) return SIMPEG_SHEET_ALIAS_[s];
  var u = s.toUpperCase();
  if (SIMPEG_SHEET_ALIAS_[u]) return SIMPEG_SHEET_ALIAS_[u];
  return null;
}

function isSimpegSheet_(sheetName) {
  return canonicalSimpegSheet_(sheetName) !== null;
}

// Sheet referensi READ-ONLY — HANYA master SIMPEG (PEGAWAI/UNIT_KERJA/JABATAN).
// (Warisan fix K1 v2.10.1, tetap berlaku di v2.11.0): sheet lokal ber-prefix
// M_ BUKAN referensi — mereka harus tetap bisa ditulis.
function isRefSheet_(name) {
  var n = String(name || '').trim();
  if (!n) return false;
  var upper = n.toUpperCase();
  // Sheet lokal (terdaftar di LOCAL_SHEETS) → boleh ditulis
  if (LOCAL_SHEETS[n] || LOCAL_SHEETS[upper]) return false;
  // Hanya master SIMPEG yang read-only
  return isSimpegSheet_(n);
}

// ==================== §3b HEADER MAP ====================
// Header lengkap semua sheet bisnis + ZZ_TEST_CRUD + 3 SIMPEG.
//
// ⚠️ Kolom audit ('created_at','updated_at','created_by','updated_by','deleted_at')
// WAJIB ada di setiap sheet — dipakai CoreLib.
//
// [SESUAIKAN] Field bisnis per sheet — bebas diubah sesuai kebutuhan.
//             Yang penting: 'id' selalu kolom pertama.
//
// OPSIONAL (v2.11.0 tidak membuat otomatis — salin bila app membutuhkannya):
//   T_JADWAL:  ['id','utama_id','judul','tanggal_mulai','tanggal_selesai',
//               'lokasi','pegawai_id','status','keterangan', + 5 audit]
//   T_LOGBOOK: ['id','utama_id','tanggal','pegawai_id','aksi','catatan_sebelum',
//               'catatan_sesudah', + 5 audit]

var ALL_SHEET_HEADERS = {

  // ==================== MASTER (5 DIMENSI) ====================
  M_KATEGORI: [
    'id', 'kode', 'nama', 'parent_id', 'deskripsi', 'urutan', 'status_aktif',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  M_JENIS: [
    'id', 'kode', 'nama', 'kategori_id', 'periode', 'deskripsi', 'urutan', 'status_aktif',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  M_PERIODE: [
    'id', 'kode', 'label', 'tahun', 'bulan', 'status_aktif',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  M_SATUAN: [
    'id', 'kode', 'nama', 'simbol', 'keterangan', 'status_aktif',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  M_LOKASI: [
    'id', 'kode', 'nama', 'alamat', 'keterangan', 'status_aktif',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],

  // ==================== TABEL (5 TRANSASKSI INTI) ====================
  T_UTAMA: [
    'id', 'kode', 'judul', 'deskripsi', 'pegawai_id', 'kategori_id', 'jenis_id',
    'lokasi_id', 'periode_id', 'satuan_id', 'tanggal', 'jumlah', 'nilai', 'status', 'catatan',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  T_ITEM: [
    'id', 'utama_id', 'nama_item', 'kode_item', 'jumlah', 'satuan_id', 'nilai', 'catatan',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  T_LAMPIRAN: [
    'id', 'utama_id', 'jenis_lampiran', 'nama_file', 'url', 'keterangan',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  T_APPROVAL: [
    'id', 'utama_id', 'urutan', 'role_approver', 'approver_id', 'status',
    'catatan', 'tanggal_approve',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  T_TINDAK_LANJUT: [
    'id', 'sumber_evaluasi', 'judul_rtl', 'deskripsi', 'assigned_to', 'due_date',
    'status_rtl', 'progress_pct', 'dokumen_terkait', 'catatan',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],

  // ==================== INFRA UJI (dipakai CoreLib.runCoreTests) ====================
  ZZ_TEST_CRUD: ['id', 'laporan_id', 'nama', 'no_hp', 'catatan_baru'],

  // ==================== SIMPEG (read-only — dokumentasi skema master) ====================
  PEGAWAI: [
    'pegawai_id', 'nip', 'nik', 'nama', 'gelar_depan', 'gelar_belakang',
    'jenis_kelamin', 'tanggal_lahir', 'pangkat_golongan', 'status_kepegawaian',
    'pendidikan_terakhir', 'email', 'no_hp', 'alamat', 'foto_url',
    'unit_id', 'jabatan_id', 'atasan_id', 'role', 'status',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  UNIT_KERJA: [
    'unit_id', 'kode_unit', 'nama_unit', 'kategori_unit', 'parent_unit_id', 'lokasi',
    'telepon_unit', 'kepala_nip', 'kepala_hp', 'kepala_unit_id', 'jenis_unit',
    'status_aktif', 'keterangan', 'status',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  JABATAN: [
    'jabatan_id', 'kode_jabatan', 'nama_jabatan', 'jenis_jabatan', 'rumpun_jabatan',
    'jenjang_jabatan', 'kelas_jabatan', 'unit_id', 'status_jabatan', 'plt_pegawai_id',
    'tanggal_mulai_jabatan', 'tanggal_selesai_jabatan', 'target_jp_tahunan',
    'status_aktif', 'keterangan', 'status',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ]
};

// ==================== §4 NORMALISASI DOMAIN SIMPEG ====================

function normalizeEntityId_(id) {
  var s = CoreLib.normId(id);
  if (!s) return '';
  var m = s.match(/^([A-Z]+)-0*(\d+)$/);
  if (m) {
    var prefix = m[1];
    var num = Number(m[2]);
    return prefix + '-' + ('0000' + num).slice(-4);
  }
  return s;
}

var ID_FIELDS_TO_NORMALIZE_ = [
  'pegawai_id', 'unit_id', 'jabatan_id', 'atasan_id',
  'plt_pegawai_id', 'kepala_unit_id', 'kepala_pegawai_id',
  'kategori_id', 'jenis_id', 'periode_id', 'lokasi_id', 'satuan_id',
  'parent_id', 'utama_id', 'approver_id',
  'assigned_to', 'dokumen_terkait'
];

function normalizeEntityIdFields_(obj) {
  if (!obj) return obj;
  ID_FIELDS_TO_NORMALIZE_.forEach(function (f) {
    if (obj[f] !== undefined && obj[f] !== null && obj[f] !== '') {
      obj[f] = normalizeEntityId_(obj[f]);
    }
  });
  return obj;
}

function normalizePegawai_(obj) {
  if (!obj) return obj;
  if (obj.pegawai_id && !obj.id) obj.id = obj.pegawai_id;
  if (!obj.pegawai_id && obj.id) obj.pegawai_id = obj.id;
  if (obj.nama && !obj.nama_lengkap) obj.nama_lengkap = obj.nama;
  if (obj.nama_lengkap && !obj.nama) obj.nama = obj.nama_lengkap;
  if (obj.status_kepegawaian && !obj.status_pegawai) obj.status_pegawai = obj.status_kepegawaian;
  if (obj.status_pegawai && !obj.status_kepegawaian) obj.status_kepegawaian = obj.status_pegawai;
  if (obj.pangkat_golongan && !obj.pangkat_gol) obj.pangkat_gol = obj.pangkat_golongan;
  if (obj.pangkat_gol && !obj.pangkat_golongan) obj.pangkat_golongan = obj.pangkat_gol;
  if (obj.no_hp && !obj.telepon) obj.telepon = obj.no_hp;
  if (obj.telepon && !obj.no_hp) obj.no_hp = obj.telepon;
  return obj;
}

function normalizeSimpegRecords_(sheetName, records) {
  if (!records || !records.length) return records;
  var canon = canonicalSimpegSheet_(sheetName);
  if (!canon) return records;
  return records.map(function (obj) {
    var clone = Object.assign({}, obj);
    normalizeEntityIdFields_(clone);
    if (canon === 'PEGAWAI') normalizePegawai_(clone);
    return clone;
  });
}

// ==================== §5 WRAPPER DOMAIN (TIPIS) ====================

/**
 * Baca sheet sebagai array of records.
 * - SIMPEG: baca dari MASTER + post-normalisasi alias kolom.
 * - Lokal: baca dari SPREADSHEET_ID.
 * - Soft-delete: DEFAULT filter !deleted_at; opsi includeDeleted:true untuk audit.
 */
function getSheetData_(sheetName, options) {
  options = options || {};
  var ssId = SPREADSHEET_ID;
  if (!ssId) { Logger.log('[WARN] getSheetData_ tanpa SPREADSHEET_ID.'); return []; }

  var canonicalSimpeg = canonicalSimpegSheet_(sheetName);
  var lookupName = canonicalSimpeg || sheetName;
  var coreOptions = canonicalSimpeg
    ? { masterSsId: MASTER_SPREADSHEET_ID, isRefFunc: isRefSheet_ }
    : { isRefFunc: isRefSheet_ };

  var records;
  try {
    records = CoreLib.getSheetDataCached(ssId, lookupName, ALL_SHEET_HEADERS, DATA_CACHE_TTL, coreOptions) || [];
  } catch (e) {
    Logger.log('[getSheetData_] ' + sheetName + ': ' + e.message);
    return [];
  }

  if (canonicalSimpeg) records = normalizeSimpegRecords_(sheetName, records);

  if (!options.includeDeleted) {
    records = records.filter(function (r) { return !r.deleted_at; });
  }

  return records;
}

/**
 * Simpan / update record (delegasi ke CoreLib.apiSave).
 * Menolak SIMPEG (read-only). Pre-save hook (P1 gen-id + P2 kunci) selalu aktif.
 */
function saveRecord_(sheetName, record, actor) {
  if (isSimpegSheet_(sheetName)) {
    throw new Error('Akses Ditolak: Sheet "' + sheetName + '" read-only (SIMPEG).');
  }
  if (!record || typeof record !== 'object') {
    throw new Error('Record tidak valid.');
  }
  if (!SPREADSHEET_ID) throw new Error('Spreadsheet lokal tidak dapat dibuka.');

  var result = CoreLib.apiSave(
    SPREADSHEET_ID,
    sheetName,
    record,
    actor,
    ALL_SHEET_HEADERS,
    isRefSheet_,
    localPreSaveHook_,
    'id'
  );

  if (!result.success) {
    throw new Error(result.error || ('Gagal menyimpan ke ' + sheetName + '.'));
  }
  return result.data;
}

/**
 * Soft delete record (delegasi ke CoreLib.apiDelete).
 */
function softDeleteRecord_(sheetName, id, actor) {
  if (isSimpegSheet_(sheetName)) {
    throw new Error('Akses Ditolak: Sheet "' + sheetName + '" read-only (SIMPEG).');
  }
  if (!SPREADSHEET_ID) return false;

  return !!CoreLib.apiDelete(
    SPREADSHEET_ID, sheetName, id, actor,
    ALL_SHEET_HEADERS, isRefSheet_, 'id'
  ).success;
}

/**
 * Cari record by ID (via getSheetData_ — normalisasi SIMPEG & filter
 * deleted_at sudah jalan). Record yang sudah di-soft-delete → null.
 */
function findRecordById_(sheetName, id) {
  var target = normalizeEntityId_(id);
  if (!target) return null;
  var rows = getSheetData_(sheetName);
  for (var i = 0; i < rows.length; i++) {
    if (normalizeEntityId_(rows[i].id) === target) return rows[i];
  }
  return null;
}

// ==================== §6 PRE-SAVE HOOK (P1 + P2) ====================
// P1: id kosong → generate (cegah PK jatuh ke kolom lain = data loss).
// P2: kunci field verifikasi untuk T_APPROVAL (hanya verifikator+).
// P2b: normalisasi RTL status + progress.

function localPreSaveHook_(canonical, record, actor) {
  var C = String(canonical || '').toUpperCase();

  // P1: generate id kalau kosong (prefix per-sheet)
  if (!record.id || String(record.id).trim() === '') {
    var pfx = LOCAL_ID_PREFIX_[C]
           || C.replace(/^M_/, '').replace(/^T_/, '').substring(0, 3).toLowerCase();
    record.id = pfx + '-' + String(Date.now()).slice(-6);
  }

  // P2: kunci field status verifikasi — hanya role verifikator+ yang boleh ubah
  if (C === 'T_APPROVAL') {
    var actorRole = String((actor && actor.role) || 'viewer').toLowerCase();
    var isVerifikator = ['verifikator', 'admin', 'super'].indexOf(actorRole) !== -1;

    if (!isVerifikator) {
      var old = findRecordById_(canonical, record.id);
      record.status          = old ? (old.status          || 'menunggu') : 'menunggu';
      record.approver_id     = old ? (old.approver_id     || '')         : '';
      record.tanggal_approve = old ? (old.tanggal_approve || '')         : '';
    }
  }

  // P2b: RTL — status default + progress default
  if (C === 'T_TINDAK_LANJUT') {
    if (!record.status_rtl) record.status_rtl = record.status_rtl || record.status || 'baru';
    if (record.progress_pct === undefined || record.progress_pct === '') {
      record.progress_pct = 0;
    }
  }

  // P3: Workflow guard (C4) — cegah loncat status ilegal via validateTransition
  // Hanya bila record sudah ada (update) dan status berubah
  if (STATUS_MAP[C] && record.id) {
    try {
      var oldForTransition = findRecordById_(canonical, record.id);
      if (oldForTransition) {
        var oldStatus = String(oldForTransition.status || oldForTransition.status_rtl || '').toLowerCase();
        var newStatus = String(record.status || record.status_rtl || '').toLowerCase();
        if (oldStatus && newStatus && oldStatus !== newStatus) {
          // pakai CoreLib bila tersedia (CoreLib v2.4.0+), fallback ke STATUS_MAP lokal
          if (CoreLib.validateTransition) {
            CoreLib.validateTransition(C, oldStatus, newStatus, STATUS_MAP);
          } else {
            var allowed = (STATUS_MAP[C][oldStatus] || []);
            if (allowed.indexOf(newStatus) === -1) throw new Error('Transisi status tidak sah: ' + oldStatus + ' → ' + newStatus);
          }
        }
      }
    } catch (e) {
      // biarkan error transisi naik (akan ditampilkan sebagai VALIDATION_ERROR)
      if (String(e.message).indexOf('Transisi') !== -1) throw e;
    }
  }

  // P4: Unique guard contoh (C7) — cegah duplikat kode di master
  // Aktif hanya untuk M_* dengan field 'kode' (opsional, bisa dimatikan bila app mengizinkan duplikat)
  // if (C.indexOf('M_') === 0 && record.kode) {
  //   var dup = CoreLib.findUnique ? CoreLib.findUnique(SPREADSHEET_ID, canonical, 'kode', record.kode, ALL_SHEET_HEADERS) : null;
  //   if (dup && String(dup.id) !== String(record.id)) throw new Error('Kode sudah dipakai: ' + record.kode);
  // }

  return { record: record };
}

// ==================== §7 KONTRAK DISPATCHER v2 ====================
// actionLevels fail-closed: aksi tak dikenal = 'viewer' (default dispatcher).
// Total 88 handler (v2.11.0):
//   config 6 + self 2 + dashboard 2 + simpeg 4 + master 15 + utama 4 +
//   item 4 + lampiran 3 + approval 4 + RTL 12 + laporan 12 +
//   analisa 8 + evaluasi 6 + generic 2 + publik 3 + sistem 1

function getAppConfig_() {
  return {
    // ---- Identitas & sumber data ----
    appCode:         APP_CODE,
    spreadsheetId:   SPREADSHEET_ID,
    masterSsId:      MASTER_SPREADSHEET_ID,
    platformApiUrl:  PLATFORM_API_URL,
    sessionPrefix:   SESSION_PREFIX,
    ttlSeconds:      SESSION_TTL_SECONDS,
    roleLevels:      ROLE_LEVELS,

    // ---- Skema & hooks ----
    headersMap:      ALL_SHEET_HEADERS,
    pkFields:        {},                          // auto-deteksi 'id' cukup
    isRefSheetFunc:  isRefSheet_,
    preSaveHook:     localPreSaveHook_,

    // ---- Level aksi (fail-closed: default 'viewer' via CoreLib.dispatchAction) ----
    actionLevels: {
      // Config (admin) — 6
      'get_config':           'viewer',
      'get_config_list':      'viewer',
      'save_config_item':     'admin',
      'save_config':          'admin',
      'delete_config_item':   'admin',
      'delete_config':        'admin',

      // Self-service — 2
      'get_my_profile':       'viewer',
      'save_my_profile':      'viewer',

      // Dashboard — 2
      'get_dashboard':        'viewer',
      'dashboard':            'viewer',

      // SIMPEG read-only — 4
      'get_pegawai_list':     'viewer',
      'get_unit_list':        'viewer',
      'get_jabatan_list':     'viewer',
      'get_master_satelit':   'viewer',

      // M_KATEGORI — 3
      'get_kategori_list':    'viewer',
      'save_kategori':        'verifikator',
      'delete_kategori':      'verifikator',

      // M_JENIS — 3
      'get_jenis_list':       'viewer',
      'save_jenis':           'verifikator',
      'delete_jenis':         'verifikator',

      // M_PERIODE — 3
      'get_periode_list':     'viewer',
      'save_periode':         'verifikator',
      'delete_periode':       'verifikator',

      // M_SATUAN — 3
      'get_satuan_list':      'viewer',
      'save_satuan':          'verifikator',
      'delete_satuan':        'verifikator',

      // M_LOKASI — 3
      'get_lokasi_list':      'viewer',
      'save_lokasi':          'verifikator',
      'delete_lokasi':        'verifikator',

      // T_UTAMA — 4
      'get_utama_list':       'viewer',
      'get_utama_detail':     'viewer',
      'save_utama':           'user',
      'delete_utama':         'user',

      // T_ITEM — 4
      'get_item_list':        'viewer',
      'get_item_detail':      'viewer',
      'save_item':            'user',
      'delete_item':          'user',

      // T_LAMPIRAN — 3
      'get_lampiran_list':    'viewer',
      'save_lampiran':        'user',
      'delete_lampiran':      'user',

      // T_APPROVAL — 4
      'get_approval_list':    'viewer',
      'save_approval':        'user',
      'delete_approval':      'user',
      'verifikasi_approval':  'verifikator',

      // T_TINDAK_LANJUT / RTL — 12 (6 generic + 6 alias rtl_*)
      'get_tindak_lanjut_list':    'viewer',
      'rtl_get_list':              'viewer',
      'get_tindak_lanjut_detail':  'viewer',
      'rtl_get_detail':            'viewer',
      'save_tindak_lanjut':        'user',
      'rtl_save':                  'user',
      'delete_tindak_lanjut':      'admin',
      'rtl_delete':                'admin',
      'ubah_status_tindak_lanjut': 'user',
      'rtl_ubah_status':           'user',
      'generate_tindak_lanjut':    'user',
      'rtl_generate':              'user',

      // Laporan (12) — L1..L12
      'lap_kategori':        'viewer',
      'lap_jenis':           'viewer',
      'lap_lokasi':          'viewer',
      'lap_periode':         'viewer',
      'lap_pegawai':         'viewer',
      'lap_status':          'viewer',
      'lap_satuan':          'viewer',
      'lap_jenis_periode':   'viewer',
      'lap_jenis_lokasi':    'viewer',
      'lap_detail_utama':    'viewer',
      'lap_lampiran':        'viewer',
      'lap_approval':        'viewer',

      // Analisa (8) — A1..A8
      'analisa_distribusi_lokasi':     'viewer',
      'analisa_distribusi_jenis':      'viewer',
      'analisa_top_pegawai':           'viewer',
      'analisa_beban_lokasi':          'viewer',
      'analisa_korelasi_jenis_lokasi': 'viewer',
      'analisa_tren_periode':          'viewer',
      'analisa_umur_data':             'viewer',
      'analisa_sla_approval':          'viewer',

      // Evaluasi (6) — E1..E6
      'evaluasi_kelengkapan':       'viewer',
      'evaluasi_sla_verifikasi':    'viewer',
      'evaluasi_kepatuhan_periode': 'viewer',
      'evaluasi_kualitas_data':      'viewer',
      'evaluasi_lampiran':          'viewer',
      'evaluasi_rtl_terbuka':       'viewer',

      // Generic routing — 2
      'save':                 'admin',
      'delete':               'admin',

      // Publik — 3
      'ping':                 'viewer',
      'exchange_platform_ticket': 'viewer',
      'logout':               'viewer',

      // Sistem — 1
      'init_database':        'super',

      // Tema per-app (admin) — 2
      'get_theme':            'viewer',
      'save_theme':           'admin'
    },

    // Resource RLS declarative (dipakai CoreLib.dispatchAction untuk filter ownerField)
    // FE cukup kirim filterScope: AppCore.getMyScope() → 'mine'|'all', BE filter otomatis.
    resources: {
      'T_UTAMA':         { ownerField: 'pegawai_id' },
      'T_ITEM':          { ownerField: 'pegawai_id' },
      'T_TINDAK_LANJUT': { ownerField: 'assigned_to' }
    },

    // Peta transisi status (dipakai CoreLib.validateTransition di preSaveHook / handler)
    statusMap: STATUS_MAP,

    entityPermissions: {},
    localHandlers: {
      // Handler tema — simpan THEME_JSON ke ScriptProperties
      'get_theme': function(payload, ctx){
        return { success:true, data: getThemeConfig_() };
      },
      'save_theme': function(payload, ctx){
        if (!ctx || !ctx.session) throw new Error('Unauthorized');
        // hanya admin+ boleh (sudah gate di actionLevels, double-check)
        CoreLib.checkRole_(ctx.session.role, 'admin');
        var cfg = payload && (payload.theme || payload.data || payload);
        if (!cfg || !cfg.primary) throw new Error('Tema tidak valid: primary wajib.');
        PropertiesService.getScriptProperties().setProperty('THEME_JSON', JSON.stringify(cfg));
        return { success:true, data: cfg, css: getThemeCss() };
      }
    }
  };
}

// ==================== §8 SHIM KOMPATIBILITAS ====================
function getSpreadsheetId_() { return SPREADSHEET_ID; }
