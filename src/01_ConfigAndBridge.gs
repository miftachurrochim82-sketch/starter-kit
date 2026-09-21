// ============================================================
// STARTER-KIT - 01_ConfigAndBridge.gs (v2.10.0 — CoreLib-First + UIUX v1.10 + RTL)
// ============================================================
// Bridge tipis ke CoreLib v2.3.0 (pin 15) + kontrak dispatcher v2.
// Pola identik dengan si-arsip v1.10 (11 sheet + 72 handler + RTL R1-R5 contoh).
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
//   5. actionLevels (§7)          — 72 handler (11 sheet + laporan + analisa + evaluasi + RTL)
//   6. getAppConfig_().actionLevels & buildLocalHandlers_() (02)
//      WAJIB sinkron 1:1 — kalau tidak, fail-closed
//
// Semua komentar [SESUAIKAN] = opsional (boleh diubah/dibiarkan).
//
// ────────────────────────────────────────────────────────────
// ⚡ SKEMA 11 SHEET (standar ekosistem v2.10.0: master 3 + tabel 8 incl RTL):
//   Master (3):
//     M_REFERENSI   — referensi umum (kategori/kode/nama_nilai)
//     M_KATEGORI    — master kategori
//     M_SATUAN      — master satuan
//   Tabel (8):
//     T_UTAMA       — transaksi utama
//     T_ITEM        — item/detail dari T_UTAMA
//     T_LOGBOOK     — log/riwayat kejadian
//     T_LAMPIRAN    — lampiran dokumen (multi per entri)
//     T_APPROVAL    — workflow persetujuan/verifikasi
//     T_JADWAL      — jadwal/kalender agenda
//     T_REKAP       — rekap periodik
//     T_TINDAK_LANJUT (alias T_RTL) — rencana tindak lanjut (puncak piramida, contoh si-arsip R1-R5)
//
// Referensi SIMPEG (PEGAWAI/JABATAN/UNIT_KERJA) & sheet uji ZZ_TEST_CRUD
// tidak dihitung sebagai budget sheet bisnis.
//
// UIUX v1.10 polish (dari si-arsip):
// - min-w di th + table-scroll wrapper (HP 360px scroll mulus)
// - badge valid via app-badge status (aktif/disetujui/ditolak/menunggu/proses/draft/nonaktif)
// - stat-card via app-stat-card (custom card !p-3 0)
// - pagination btn-icon + filter label text-[11px]
// - modal v-if + @close + size md/lg/2xl/3xl + tema #0369a1
// ============================================================

// ==================== §1 KONSTANTA GLOBAL ====================

// [SESUAIKAN] Kode aplikasi — harus terdaftar di si-platform (sheet applications)
var APP_CODE  = 'SI-CONTOH';
var APP_TITLE = 'SI-CONTOH — Starter Kit Web App v2.10.0';

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

var LOCAL_SHEETS = {
  // Master (3)
  M_REFERENSI: 'M_REFERENSI',
  M_KATEGORI:  'M_KATEGORI',
  M_SATUAN:    'M_SATUAN',
  // Tabel (8) — v2.10.0 +T_TINDAK_LANJUT (RTL)
  T_UTAMA:         'T_UTAMA',
  T_ITEM:          'T_ITEM',
  T_LOGBOOK:       'T_LOGBOOK',
  T_LAMPIRAN:      'T_LAMPIRAN',
  T_APPROVAL:      'T_APPROVAL',
  T_JADWAL:        'T_JADWAL',
  T_REKAP:         'T_REKAP',
  T_TINDAK_LANJUT: 'T_TINDAK_LANJUT',
  T_RTL:           'T_TINDAK_LANJUT' // alias untuk kompatibilitas si-arsip
};

// Prefix ID per-sheet (dipakai localPreSaveHook_ + CoreLib.genUniqueCode).
// [SESUAIKAN] Boleh diubah sesuai singkatan Anda.
var LOCAL_ID_PREFIX_ = {
  'M_REFERENSI':     'ref',
  'M_KATEGORI':      'kat',
  'M_SATUAN':        'sat',
  'T_UTAMA':         'utm',
  'T_ITEM':          'itm',
  'T_LOGBOOK':       'log',
  'T_LAMPIRAN':      'lmp',
  'T_APPROVAL':      'apr',
  'T_JADWAL':        'jdw',
  'T_REKAP':         'rkp',
  'T_TINDAK_LANJUT': 'rtl',
  'T_RTL':           'rtl'
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

// Sheet referensi app (prefix 'M_') — cache lebih panjang
function isRefSheet_(name) {
  return String(name || '').toUpperCase().indexOf('M_') === 0;
}

// ==================== §3b HEADER MAP ====================
// Header lengkap semua sheet bisnis + ZZ_TEST_CRUD + 3 SIMPEG.
//
// ⚠️ Kolom audit ('created_at','updated_at','created_by','updated_by','deleted_at')
// WAJIB ada di setiap sheet — dipakai CoreLib untuk tracking.
//
// [SESUAIKAN] Field bisnis per sheet — bebas diubah sesuai kebutuhan.
//             Yang penting: 'id' selalu kolom pertama.

var ALL_SHEET_HEADERS = {

  // ==================== MASTER BISNIS ====================
  M_REFERENSI: [
    'id', 'kategori', 'kode', 'nama_nilai', 'urutan', 'status_aktif', 'keterangan',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  M_KATEGORI: [
    'id', 'kode', 'nama', 'parent_id', 'deskripsi', 'urutan', 'status_aktif',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  M_SATUAN: [
    'id', 'kode', 'nama', 'simbol', 'keterangan', 'status_aktif',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],

  // ==================== TABEL BISNIS ====================
  T_UTAMA: [
    'id', 'kode', 'judul', 'deskripsi', 'pegawai_id', 'kategori_id', 'satuan_id',
    'tanggal', 'jumlah', 'nilai', 'status', 'catatan',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  T_ITEM: [
    'id', 'utama_id', 'nama_item', 'kode_item', 'jumlah', 'satuan_id', 'nilai', 'catatan',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  T_LOGBOOK: [
    'id', 'utama_id', 'tanggal', 'pegawai_id', 'aksi', 'catatan_sebelum', 'catatan_sesudah',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  T_LAMPIRAN: [
    'id', 'utama_id', 'jenis_dokumen', 'nama_dokumen', 'url', 'keterangan',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  T_APPROVAL: [
    'id', 'utama_id', 'urutan', 'role_approver', 'approver_id', 'status',
    'catatan', 'tanggal_approve',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  T_JADWAL: [
    'id', 'utama_id', 'judul', 'tanggal_mulai', 'tanggal_selesai', 'lokasi',
    'pegawai_id', 'status', 'keterangan',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  T_REKAP: [
    'id', 'periode', 'pegawai_id', 'unit_id', 'kategori_id',
    'total_item', 'total_nilai', 'ringkasan_json', 'status_rekap', 'generated_at',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  // v2.10.0 — RTL / Tindak Lanjut (puncak piramida, contoh si-arsip R1-R5)
  T_TINDAK_LANJUT: [
    'id', 'sumber_evaluasi', 'judul_rtl', 'deskripsi', 'assigned_to', 'due_date',
    'status_rtl', 'progress_pct', 'dokumen_terkait', 'catatan',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'
  ],
  T_RTL: [
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
  var m = s.match(/^([A-Z]+)-0*(\\d+)$/);
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
  'kategori_id', 'satuan_id', 'utama_id', 'approver_id',
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

  // Alias T_RTL → T_TINDAK_LANJUT
  if (String(sheetName).toUpperCase() === 'T_RTL') sheetName = 'T_TINDAK_LANJUT';

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
 * Menolak SIMPEG (read-only). Pre-save hook (P1 gen-id) selalu aktif.
 */
function saveRecord_(sheetName, record, actor) {
  if (String(sheetName).toUpperCase() === 'T_RTL') sheetName = 'T_TINDAK_LANJUT';
  if (isSimpegSheet_(sheetName)) {
    throw new Error('Akses Ditolak: Sheet \"' + sheetName + '\" read-only (SIMPEG).');
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
  if (String(sheetName).toUpperCase() === 'T_RTL') sheetName = 'T_TINDAK_LANJUT';
  if (isSimpegSheet_(sheetName)) {
    throw new Error('Akses Ditolak: Sheet \"' + sheetName + '\" read-only (SIMPEG).');
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
  if (String(sheetName).toUpperCase() === 'T_RTL') sheetName = 'T_TINDAK_LANJUT';
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
// P2: kunci field verifikasi untuk sheet dengan workflow approval + RTL status.

function localPreSaveHook_(canonical, record, actor) {
  var C = String(canonical || '').toUpperCase();
  if (C === 'T_RTL') C = 'T_TINDAK_LANJUT';

  // P1: generate id kalau kosong (prefix per-sheet, konsisten kode lama)
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

  // P2b: RTL status transition guard (contoh si-arsip)
  if (C === 'T_TINDAK_LANJUT') {
    if (!record.status_rtl) record.status_rtl = record.status_rtl || record.status || 'baru';
    if (record.progress_pct === undefined || record.progress_pct === '') {
      record.progress_pct = 0;
    }
  }

  return { record: record };
}

// ==================== §7 KONTRAK DISPATCHER v2 ====================
// actionLevels fail-closed: aksi tak dikenal = 'viewer' (default dispatcher).
// Total 72 handler (11 sheet + laporan + analisa + evaluasi + RTL) — v2.10.0

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
    // Total 72 (v2.10.0) — 11 sheet + laporan + analisa + evaluasi + RTL (contoh si-arsip)
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

      // M_REFERENSI — 3
      'get_referensi_list':   'viewer',
      'save_referensi':       'verifikator',
      'delete_referensi':     'verifikator',

      // M_KATEGORI — 3
      'get_kategori_list':    'viewer',
      'save_kategori':        'verifikator',
      'delete_kategori':      'verifikator',

      // M_SATUAN — 3
      'get_satuan_list':      'viewer',
      'save_satuan':          'verifikator',
      'delete_satuan':        'verifikator',

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

      // T_LOGBOOK — 2
      'get_logbook_list':     'viewer',
      'save_logbook':         'user',

      // T_LAMPIRAN — 3
      'get_lampiran_list':    'viewer',
      'save_lampiran':        'user',
      'delete_lampiran':      'user',

      // T_APPROVAL — 4
      'get_approval_list':    'viewer',
      'save_approval':        'user',
      'delete_approval':      'user',
      'verifikasi_approval':  'verifikator',

      // T_JADWAL — 4
      'get_jadwal_list':      'viewer',
      'get_jadwal_detail':    'viewer',
      'save_jadwal':          'user',
      'delete_jadwal':        'user',

      // T_REKAP — 4
      'get_rekap_list':       'viewer',
      'generate_rekap':       'verifikator',
      'lap_rekap_klasifikasi': 'viewer',
      'lap_rekap_unit':       'viewer',

      // Analisa (contoh si-arsip A3-A5) — 3
      'analisa_distribusi_unit': 'viewer',
      'analisa_top_pengirim':    'viewer',
      'analisa_beban_pejabat':   'viewer',

      // Evaluasi (contoh si-arsip E1/E3/E5) — 3
      'evaluasi_sla_disposisi':  'viewer',
      'evaluasi_kelengkapan':    'viewer',
      'evaluasi_jra':            'viewer',

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

      // Generic routing — 2
      'save':                 'admin',
      'delete':               'admin',

      // Publik — 3
      'ping':                 'viewer',
      'exchange_platform_ticket': 'viewer',
      'logout':               'viewer',

      // Sistem — 1
      'init_database':        'super'
    },

    entityPermissions: {},
    localHandlers: {}
  };
}

// ==================== §8 SHIM KOMPATIBILITAS ====================
function getSpreadsheetId_() { return SPREADSHEET_ID; }
