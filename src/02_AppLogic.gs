// ============================================================
// STARTER-KIT - 02_AppLogic.gs (v2.0.0 — CoreLib-First)
// ============================================================
// Entry HTTP + Dispatcher + Registry Handler + Setup + Handler contoh.
// Pola identik dengan si-kompetensi v6.0.1 dan si-lahar v2.1.0.
//
// Domain contoh LENGKAP: M_REFERENSI + T_UTAMA.
// 8 sheet lain (M_KATEGORI, M_SATUAN, T_ITEM, T_LOGBOOK, T_LAMPIRAN,
// T_APPROVAL, T_JADWAL, T_REKAP) → skema sudah ada di 01,
// handler placeholder (komentar). Tinggal buka & isi saat dibutuhkan.
// ============================================================

// ==================== §1 ENTRY POINTS ====================

/**
 * Entry GET: serve UI (Index). Tiket SSO dari query string
 * diteruskan ke template agar frontend auto-exchange via AppCore.
 */
function doGet(e) {
  e = e || { parameter: {} };
  var ticket = (e.parameter && e.parameter.ticket) || '';

  var template = HtmlService.createTemplateFromFile('Index');
  template.ticket     = ticket;
  template.isSsoEntry = ticket ? 'true' : 'false';

  return template.evaluate()
    .setTitle(APP_TITLE)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Entry POST: API endpoint alternatif (SPA utama pakai google.script.run).
 * Wajib JSON di body. Semua routing ke CoreLib.dispatchAction.
 */
function doPost(e) {
  var body = {};
  try {
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
  } catch (err) {
    return CoreLib.jsonResponse({
      success: false, code: 'BAD_REQUEST',
      error: 'Format JSON payload tidak valid.'
    });
  }
  return CoreLib.jsonResponse(handleAction(body));
}

/**
 * Helper include untuk HtmlService template (dipanggil dari Index.html).
 */
function include(filename) {
  try {
    return HtmlService.createTemplateFromFile(filename).evaluate().getContent();
  } catch (err) {
    try {
      return HtmlService.createTemplateFromFile(filename.toLowerCase()).evaluate().getContent();
    } catch (e2) {
      Logger.log('[WARN] Error including ' + filename + ': ' + e2.message);
      return '<!-- Error loading ' + filename + ': ' + e2.message + ' -->';
    }
  }
}

// ==================== §2 DISPATCHER ====================

/**
 * Dispatcher tipis — delegasi penuh ke CoreLib.dispatchAction.
 * Konfigurasi app (actionLevels, localHandlers, preSaveHook) di 01.
 *
 * PENTING: getAppConfig_() dipanggil fresh tiap request karena
 * localHandlers diisi dinamis oleh buildLocalHandlers_().
 */
function handleAction(payload) {
  try {
    var cfg = getAppConfig_();
    cfg.localHandlers = buildLocalHandlers_();
    return CoreLib.dispatchAction(payload, cfg);
  } catch (err) {
    Logger.log('[CRITICAL handleAction] ' + err.message + '\n' + err.stack);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

/**
 * Registry semua handler domain app ini.
 *
 * Kontrak signature:
 *   - fn(data, user) → { success, data?, error?, code? }
 *   - data = payload.data (dari frontend)
 *   - user = currentUser dari session (CoreLib)
 *
 * ⚠️ Setiap aksi yang didaftarkan di sini WAJIB ada juga di
 *    `actionLevels` (01_ConfigAndBridge.gs). Kalau tidak → fail-closed.
 */
function buildLocalHandlers_() {
  var h = {};

  // ---------- Health check & profil ----------
  h['ping'] = function () {
    return { success: true, data: { pong: true, app: APP_CODE, time: new Date().toISOString() } };
  };
  h['get_my_profile'] = function (d, u) { return { success: true, data: u }; };
  h['save_my_profile'] = function (d, u) {
    return CoreLib.saveMyProfile(SPREADSHEET_ID, d, u, ALL_SHEET_HEADERS, MASTER_SPREADSHEET_ID);
  };

  // ---------- Dashboard ----------
  h['get_dashboard'] = function (d, u) { return getDashboard_(u); };
  h['dashboard']     = function (d, u) { return getDashboard_(u); };  // alias

  // ---------- SIMPEG read-only (bundle + granular) ----------
  h['get_pegawai_list']   = function () { return getPegawaiList_(); };
  h['get_unit_list']      = function () { return getUnitList_(); };
  h['get_jabatan_list']   = function () { return getJabatanList_(); };
  h['get_master_satelit'] = function () { return getMasterSatelit_(); };

  // ---------- Konfigurasi (Script Properties) ----------
  h['get_config']         = function () { return getConfigList_(); };
  h['get_config_list']    = function () { return getConfigList_(); };
  h['save_config_item']   = function (d, u) { return saveConfigItem_(d, u); };
  h['save_config']        = function (d, u) { return saveConfigItem_(d, u); };
  h['delete_config_item'] = function (d, u) { return deleteConfigItem_(d, u); };
  h['delete_config']      = function (d, u) { return deleteConfigItem_(d, u); };

  // ---------- Aksi dinamis 'delete' — routing internal ----------
  h['delete'] = function (d, u) {
    var ent = String((d && d.entity) || '').toUpperCase();
    if (ent === 'KONFIGURASI') return deleteConfigItem_(d || {}, u);
    return {
      success: false, code: 'BAD_REQUEST',
      error: 'Aksi delete untuk entitas "' + ent + '" tidak dikenali.'
    };
  };

  // ================================================================
  // ============ DOMAIN CONTOH 1: M_REFERENSI ======================
  // ================================================================
  h['get_referensi_list'] = function (d, u) { return getReferensiList_(d || {}); };
  h['save_referensi']     = function (d, u) { return saveReferensi_(d || {}, u); };
  h['delete_referensi']   = function (d, u) { return deleteReferensi_(d || {}, u); };

  // ================================================================
  // ============ DOMAIN CONTOH 2: T_UTAMA ==========================
  // ================================================================
  h['get_utama_list']   = function (d, u) { return getUtamaList_(d || {}, u); };
  h['get_utama_detail'] = function (d, u) { return getUtamaDetail_(d || {}, u); };
  h['save_utama']       = function (d, u) { return saveUtama_(d || {}, u); };
  h['delete_utama']     = function (d, u) { return deleteUtama_(d || {}, u); };

  // ================================================================
  // ============ PLACEHOLDER 8 SHEET LAIN =========================
  // ================================================================
  // Buka komentar + isi saat Anda mulai memakai sheet tersebut.
  // Ingat: setiap handler WAJIB didaftarkan juga di actionLevels (01).
  //
  // // ---------- M_KATEGORI ----------
  // h['get_kategori_list'] = function (d, u) { return getGenericList_('M_KATEGORI', d); };
  // h['save_kategori']     = function (d, u) { return saveGeneric_('M_KATEGORI', d, u); };
  // h['delete_kategori']   = function (d, u) { return deleteGeneric_('M_KATEGORI', d, u); };
  //
  // // ---------- M_SATUAN ----------
  // h['get_satuan_list'] = function (d, u) { return getGenericList_('M_SATUAN', d); };
  // h['save_satuan']     = function (d, u) { return saveGeneric_('M_SATUAN', d, u); };
  // h['delete_satuan']   = function (d, u) { return deleteGeneric_('M_SATUAN', d, u); };
  //
  // // ---------- T_ITEM ----------
  // h['get_item_list'] = function (d, u) { return getGenericList_('T_ITEM', d); };
  // h['save_item']     = function (d, u) { return saveGeneric_('T_ITEM', d, u); };
  // h['delete_item']   = function (d, u) { return deleteGeneric_('T_ITEM', d, u); };
  //
  // // ---------- T_LOGBOOK ----------
  // h['get_logbook_list'] = function (d, u) { return getGenericList_('T_LOGBOOK', d); };
  // h['save_logbook']     = function (d, u) { return saveGeneric_('T_LOGBOOK', d, u); };
  //
  // // ---------- T_LAMPIRAN ----------
  // h['get_lampiran_list'] = function (d, u) { return getGenericList_('T_LAMPIRAN', d); };
  // h['save_lampiran']     = function (d, u) { return saveGeneric_('T_LAMPIRAN', d, u); };
  // h['delete_lampiran']   = function (d, u) { return deleteGeneric_('T_LAMPIRAN', d, u); };
  //
  // // ---------- T_APPROVAL ----------
  // h['get_approval_list'] = function (d, u) { return getGenericList_('T_APPROVAL', d); };
  // h['save_approval']     = function (d, u) { return saveGeneric_('T_APPROVAL', d, u); };
  // h['verifikasi_approval'] = function (d, u) { return verifikasiApproval_(d, u); };
  //
  // // ---------- T_JADWAL ----------
  // h['get_jadwal_list'] = function (d, u) { return getGenericList_('T_JADWAL', d); };
  // h['save_jadwal']     = function (d, u) { return saveGeneric_('T_JADWAL', d, u); };
  // h['delete_jadwal']   = function (d, u) { return deleteGeneric_('T_JADWAL', d, u); };
  //
  // // ---------- T_REKAP ----------
  // h['get_rekap_list']  = function (d, u) { return getGenericList_('T_REKAP', d); };
  // h['generate_rekap']  = function (d, u) { return generateRekap_(d, u); };

  // ---------- Sistem ----------
  h['init_database'] = function (d, u) { return initDatabase(u); };

  return h;
}

// ==================== §3 SIMPEG READ-ONLY LOOKUPS ====================

/**
 * Baca daftar pegawai SIMPEG (tolerant reader) — hanya kolom yang dibutuhkan.
 */
function getPegawaiList_() {
  try {
    var rows = getSheetData_('PEGAWAI');
    var lean = (rows || []).map(function (p) {
      return {
        pegawai_id:     p.pegawai_id || p.id,
        nip:            p.nip || '',
        nama:           p.nama || p.nama_lengkap || '',
        nama_lengkap:   p.nama_lengkap || p.nama || '',
        email:          p.email || '',
        unit_id:        p.unit_id || '',
        jabatan_id:     p.jabatan_id || '',
        pangkat_golongan: p.pangkat_golongan || p.pangkat_gol || '',
        status_pegawai: p.status_pegawai || 'PNS'
      };
    });
    return { success: true, data: lean };
  } catch (err) {
    Logger.log('[getPegawaiList_] ' + err.message);
    return { success: false, error: 'Gagal baca PEGAWAI: ' + err.message };
  }
}

function getUnitList_() {
  try {
    return { success: true, data: getSheetData_('UNIT_KERJA') };
  } catch (err) {
    return { success: false, error: 'Gagal baca UNIT_KERJA: ' + err.message };
  }
}

function getJabatanList_() {
  try {
    return { success: true, data: getSheetData_('JABATAN') };
  } catch (err) {
    return { success: false, error: 'Gagal baca JABATAN: ' + err.message };
  }
}

/**
 * Bundle master satelit — dipakai frontend untuk dropdown/picker.
 * [SESUAIKAN] Tambahkan master-master Anda di sini.
 */
function getMasterSatelit_() {
  try {
    return {
      success: true,
      data: {
        referensi: getSheetData_('M_REFERENSI'),
        kategori:  getSheetData_('M_KATEGORI'),
        satuan:    getSheetData_('M_SATUAN')
      }
    };
  } catch (err) {
    return { success: false, error: 'Gagal memuat master satelit: ' + err.message };
  }
}

// ==================== §4 DOMAIN: DASHBOARD ====================

/**
 * Dashboard ringkas — hitung metrik ringan.
 * [SESUAIKAN] Ganti/tambah agregasi sesuai bisnis Anda.
 */
function getDashboard_(user) {
  try {
    var pegawai = getSheetData_('PEGAWAI');
    var utama   = getSheetData_('T_UTAMA');
    var rekap   = getSheetData_('T_REKAP');

    var totalUtama = (utama || []).length;
    var totalAktif = (utama || []).filter(function (r) {
      var st = String(r.status || '').toLowerCase();
      return st === 'draft' || st === 'diajukan' || st === 'proses';
    }).length;
    var totalSelesai = (utama || []).filter(function (r) {
      return String(r.status || '').toLowerCase() === 'selesai';
    }).length;
    var totalRekap = (rekap || []).length;

    return {
      success: true,
      data: {
        totalPegawai: (pegawai || []).length,
        totalUtama:   totalUtama,
        totalAktif:   totalAktif,
        totalSelesai: totalSelesai,
        totalRekap:   totalRekap,
        role: (user && user.role) || 'viewer',
        nama: (user && (user.display_name || user.email)) || ''
      }
    };
  } catch (err) {
    Logger.log('[getDashboard_] ' + err.message);
    return { success: false, error: err.message };
  }
}

// ==================== §5 DOMAIN CONTOH 1: M_REFERENSI ====================

function getReferensiList_(params) {
  try {
    var list = getSheetData_('M_REFERENSI');
    // Filter opsional: kategori, only_active, search
    if (params.kategori) {
      list = list.filter(function (r) {
        return CoreLib.normStr(r.kategori) === CoreLib.normStr(params.kategori);
      });
    }
    if (params.only_active) {
      list = list.filter(function (r) {
        return CoreLib.normStr(r.status_aktif) !== 'false';
      });
    }
    if (params.search) {
      var q = CoreLib.normStr(params.search);
      list = list.filter(function (r) {
        return CoreLib.matchSearch(r, q, ['kode', 'nama_nilai', 'keterangan']);
      });
    }
    // Sort by urutan asc
    list.sort(function (a, b) {
      return (Number(a.urutan) || 99) - (Number(b.urutan) || 99);
    });
    return { success: true, data: list, total: list.length };
  } catch (err) {
    Logger.log('[getReferensiList_] ' + err.message);
    return { success: false, error: err.message };
  }
}

function saveReferensi_(data, user) {
  try {
    var record = data.record || data;

    if (!record.kategori || !record.nama_nilai) {
      return { success: false, code: 'BAD_REQUEST', error: 'Kategori dan nama nilai wajib diisi.' };
    }

    // Normalisasi status_aktif
    if (record.status_aktif !== undefined) {
      record.status_aktif = String(record.status_aktif).toLowerCase() === 'false' ? 'false' : 'true';
    } else {
      record.status_aktif = 'true';
    }

    // Normalisasi urutan
    if (record.urutan !== undefined && record.urutan !== '') {
      var u = Number(record.urutan);
      if (!isNaN(u)) record.urutan = u;
    }

    // Cek duplikat (kategori + kode) saat insert baru
    if (!record.id && record.kode) {
      var existing = getSheetData_('M_REFERENSI');
      var dup = existing.find(function (r) {
        return String(r.kategori).toUpperCase() === String(record.kategori).toUpperCase() &&
               String(r.kode).toUpperCase() === String(record.kode).toUpperCase();
      });
      if (dup) {
        return { success: false, code: 'BAD_REQUEST',
                 error: 'Referensi dengan kategori + kode ini sudah ada.' };
      }
    }

    var saved = saveRecord_('M_REFERENSI', record, user);
    return { success: true, data: saved };
  } catch (err) {
    Logger.log('[saveReferensi_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

function deleteReferensi_(data, user) {
  try {
    if (!data || !data.id) {
      return { success: false, code: 'BAD_REQUEST', error: 'ID tidak valid.' };
    }
    var ok = softDeleteRecord_('M_REFERENSI', data.id, user);
    return { success: ok, message: ok ? 'Referensi dihapus.' : 'Referensi tidak ditemukan.' };
  } catch (err) {
    Logger.log('[deleteReferensi_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §6 DOMAIN CONTOH 2: T_UTAMA ====================

function getUtamaList_(params, user) {
  try {
    var list = getSheetData_('T_UTAMA');

    // Filter opsional
    if (params.status) {
      var st = CoreLib.normStr(params.status);
      list = list.filter(function (r) { return CoreLib.normStr(r.status) === st; });
    }
    if (params.pegawai_id) {
      var pid = CoreLib.normId(params.pegawai_id);
      list = list.filter(function (r) { return CoreLib.normId(r.pegawai_id) === pid; });
    }
    if (params.kategori_id) {
      var kid = CoreLib.normId(params.kategori_id);
      list = list.filter(function (r) { return CoreLib.normId(r.kategori_id) === kid; });
    }
    if (params.search) {
      var q = CoreLib.normStr(params.search);
      list = list.filter(function (r) {
        return CoreLib.matchSearch(r, q, ['kode', 'judul', 'deskripsi', 'catatan']);
      });
    }

    // Sort: tanggal desc, fallback created_at desc
    list.sort(function (a, b) {
      var ta = CoreLib.dateKey10(a.tanggal) || CoreLib.dateKey10(a.created_at);
      var tb = CoreLib.dateKey10(b.tanggal) || CoreLib.dateKey10(b.created_at);
      return tb < ta ? -1 : (tb > ta ? 1 : 0);
    });

    // Clone sebelum kirim
    list = list.map(function (r) { return Object.assign({}, r); });

    return { success: true, data: list, total: list.length };
  } catch (err) {
    Logger.log('[getUtamaList_] ' + err.message);
    return { success: false, error: err.message };
  }
}

function getUtamaDetail_(data, user) {
  try {
    if (!data || !data.id) {
      return { success: false, code: 'BAD_REQUEST', error: 'ID tidak valid.' };
    }
    var row = findRecordById_('T_UTAMA', data.id);
    if (!row) {
      return { success: false, code: 'NOT_FOUND', error: 'Data tidak ditemukan.' };
    }
    return { success: true, data: row };
  } catch (err) {
    Logger.log('[getUtamaDetail_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

function saveUtama_(data, user) {
  try {
    var record = data.record || data;

    if (!String(record.judul || '').trim()) {
      return { success: false, code: 'BAD_REQUEST', error: 'Judul wajib diisi.' };
    }

    // Normalisasi ID fields
    normalizeEntityIdFields_(record);

    // Auto-generate kode bila kosong (insert baru)
    if (!record.id && !record.kode) {
      record.kode = CoreLib.genUniqueCode('UTM-', 'T_UTAMA', 'kode', 4,
                                          SPREADSHEET_ID, ALL_SHEET_HEADERS);
    }

    // Normalisasi tanggal ke WIB
    if (record.tanggal) {
      record.tanggal = CoreLib.dateKey10(record.tanggal) || record.tanggal;
    }

    // Default status
    if (!record.status) record.status = 'draft';

    var saved = saveRecord_('T_UTAMA', record, user);
    return { success: true, data: saved };
  } catch (err) {
    Logger.log('[saveUtama_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

function deleteUtama_(data, user) {
  try {
    if (!data || !data.id) {
      return { success: false, code: 'BAD_REQUEST', error: 'ID tidak valid.' };
    }
    var ok = softDeleteRecord_('T_UTAMA', data.id, user);
    return { success: ok, message: ok ? 'Data dihapus.' : 'Data tidak ditemukan.' };
  } catch (err) {
    Logger.log('[deleteUtama_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §7 GENERIC HELPERS (dipakai placeholder) ====================
// Fungsi generik untuk sheet yang belum diimplementasikan domainnya.
// Buka komentar handler di buildLocalHandlers_() untuk memakainya.

/**
 * List generik dari sheet apa pun.
 */
function getGenericList_(sheetName, params) {
  try {
    var list = getSheetData_(sheetName);
    if (params && params.search) {
      var q = CoreLib.normStr(params.search);
      list = list.filter(function (r) {
        return CoreLib.matchSearch(r, q, Object.keys(r));
      });
    }
    return { success: true, data: list, total: list.length };
  } catch (err) {
    Logger.log('[getGenericList_ ' + sheetName + '] ' + err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Save generik — hanya validasi minimal (id ada / tidak).
 */
function saveGeneric_(sheetName, data, user) {
  try {
    var record = data.record || data;
    if (!record || typeof record !== 'object') {
      return { success: false, code: 'BAD_REQUEST', error: 'Record tidak valid.' };
    }
    normalizeEntityIdFields_(record);
    var saved = saveRecord_(sheetName, record, user);
    return { success: true, data: saved };
  } catch (err) {
    Logger.log('[saveGeneric_ ' + sheetName + '] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

/**
 * Delete generik.
 */
function deleteGeneric_(sheetName, data, user) {
  try {
    if (!data || !data.id) {
      return { success: false, code: 'BAD_REQUEST', error: 'ID tidak valid.' };
    }
    var ok = softDeleteRecord_(sheetName, data.id, user);
    return { success: ok, message: ok ? 'Dihapus.' : 'Tidak ditemukan.' };
  } catch (err) {
    Logger.log('[deleteGeneric_ ' + sheetName + '] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

/**
 * Verifikasi generik untuk sheet dengan kolom status + approver_id + tanggal_approve.
 */
function verifikasiApproval_(data, user) {
  try {
    var isVerifikator = user && ['verifikator', 'admin', 'super'].indexOf(String(user.role).toLowerCase()) !== -1;
    if (!isVerifikator) {
      return { success: false, code: 'FORBIDDEN', error: 'Verifikasi hanya untuk verifikator/admin.' };
    }
    var id = data.id;
    var status = String(data.status || '').toLowerCase();
    if (!id) return { success: false, code: 'BAD_REQUEST', error: 'ID wajib diisi.' };
    if (['disetujui', 'ditolak', 'revisi'].indexOf(status) === -1) {
      return { success: false, code: 'BAD_REQUEST', error: 'Status harus disetujui/ditolak/revisi.' };
    }
    var row = findRecordById_('T_APPROVAL', id);
    if (!row) return { success: false, code: 'NOT_FOUND', error: 'Data tidak ditemukan.' };

    row.status          = status;
    row.approver_id     = (user && user.email) || '';
    row.tanggal_approve = CoreLib.todayIsoLocal();
    if (data.catatan !== undefined) row.catatan = data.catatan;

    // Bypass hook (langsung) — karena verifikator
    var saved = CoreLib.apiSave(SPREADSHEET_ID, 'T_APPROVAL', row, user,
                                 ALL_SHEET_HEADERS, isRefSheet_, null, 'id').data;
    return { success: true, data: saved };
  } catch (err) {
    Logger.log('[verifikasiApproval_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

/**
 * Generate rekap periodik (contoh placeholder — sesuaikan bisnis).
 */
function generateRekap_(data, user) {
  try {
    // [SESUAIKAN] Logika generate rekap Anda.
    return { success: false, code: 'BAD_REQUEST',
             error: 'generate_rekap belum diimplementasikan. Isi logika di 02_AppLogic.gs.' };
  } catch (err) {
    Logger.log('[generateRekap_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §8 CONFIG (Script Properties) ====================

function getConfigList_() {
  var defaults = [
    { key: 'app_title',   value: APP_TITLE, keterangan: 'Nama aplikasi' },
    { key: 'app_version', value: 'v2.0.0',  keterangan: 'Versi rilis' },
    { key: 'instansi',    value: 'Pemkab Trenggalek', keterangan: 'Instansi pengelola' }
  ];

  var stored = {};
  try { stored = appProps_().getProperties() || {}; } catch (e) { stored = {}; }

  var list = defaults.map(function (d) {
    if (stored[d.key] !== undefined) d.value = stored[d.key];
    return d;
  });

  Object.keys(stored).forEach(function (k) {
    if (!CoreLib.isAllowedConfigKey(k, ['ADMIN_EMAILS', 'VERIFIKATOR_EMAILS'])) return;
    if (!list.find(function (i) { return i.key === k; })) {
      list.push({ key: k, value: stored[k], keterangan: 'Parameter Kustom' });
    }
  });

  return { success: true, data: list };
}

function saveConfigItem_(payload, actor) {
  try {
    payload = payload || {};
    var key   = payload.key   !== undefined ? payload.key   : (payload.record && payload.record.key);
    var value = payload.value !== undefined ? payload.value : (payload.record && payload.record.value);
    if (!key) return { success: false, code: 'BAD_REQUEST', error: 'Key parameter wajib diisi.' };

    var allowed = CoreLib.isAllowedConfigKey(key, ['ADMIN_EMAILS', 'VERIFIKATOR_EMAILS']);
    if (!allowed) {
      audit_(actor, 'SAVE_CONFIG_DENIED', 'CONFIG', key, false, 'Key tidak diizinkan: ' + key);
      return { success: false, code: 'FORBIDDEN', error: 'Parameter "' + key + '" tidak diizinkan diubah dari sini.' };
    }

    appProps_().setProperty(String(key), String(value));
    audit_(actor, 'SAVE_CONFIG', 'CONFIG', key, true, 'Set: ' + key + ' = ' + String(value).slice(0, 100));
    return { success: true, message: 'Parameter ' + key + ' berhasil disimpan.' };
  } catch (e) {
    return { success: false, code: 'BAD_REQUEST', error: e.message };
  }
}

function deleteConfigItem_(payload, actor) {
  try {
    payload = payload || {};
    var key = payload.key || (payload.record && payload.record.key) || payload.id;
    if (!key) return { success: false, code: 'BAD_REQUEST', error: 'Key parameter wajib disertakan.' };

    var allowed = CoreLib.isAllowedConfigKey(key, ['ADMIN_EMAILS', 'VERIFIKATOR_EMAILS']);
    if (!allowed) {
      audit_(actor, 'DELETE_CONFIG_DENIED', 'CONFIG', key, false, 'Key tidak diizinkan: ' + key);
      return { success: false, code: 'FORBIDDEN', error: 'Parameter "' + key + '" tidak boleh dihapus dari sini.' };
    }

    appProps_().deleteProperty(String(key));
    audit_(actor, 'DELETE_CONFIG', 'CONFIG', key, true, 'Delete: ' + key);
    return { success: true, message: 'Parameter ' + key + ' berhasil dihapus.' };
  } catch (e) {
    return { success: false, code: 'BAD_REQUEST', error: e.message };
  }
}

// ==================== §9 SETUP ====================
// Jalankan setupApp() SEKALI setelah 01_ConfigAndBridge.gs diisi.

/**
 * Inisialisasi database — delegasi ke CoreLib.initDatabase.
 * Membuat semua 10 sheet bisnis + 3 SIMPEG (skip — read-only) + ZZ_TEST_CRUD.
 */
function initDatabase(actor) {
  try {
    if (!SPREADSHEET_ID) {
      var errMsg = 'Spreadsheet lokal tidak dapat dibuka. Cek SPREADSHEET_ID di Script Properties (atau isi DEFAULT_SPREADSHEET_ID di 01).';
      Logger.log('[ERROR] ' + errMsg);
      audit_(actor, 'INIT_DB', 'SYSTEM', 'ALL', false, errMsg);
      return { success: false, error: errMsg };
    }

    var result = CoreLib.initDatabase(SPREADSHEET_ID, ALL_SHEET_HEADERS, isSimpegSheet_);

    // Hapus Sheet1 default bila kosong
    try {
      var ss = CoreLib.getDb(SPREADSHEET_ID);
      var defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Sheet 1');
      if (defaultSheet && ss.getSheets().length > 1 && defaultSheet.getLastRow() === 0) {
        ss.deleteSheet(defaultSheet);
      }
    } catch (e) {
      Logger.log('[WARN] Gagal hapus Sheet1: ' + e.message);
    }

    var summary = 'Inisialisasi database ' + APP_CODE + ' selesai. ' +
                  '10 sheet bisnis + ZZ_TEST_CRUD + referensi SIMPEG.';
    Logger.log('✅ ' + summary);
    audit_(actor, 'INIT_DB', 'SYSTEM', 'ALL', true, summary);

    return { success: true, message: summary, corelib: result };
  } catch (err) {
    Logger.log('[initDatabase] ' + err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Setup aplikasi — delegasi penuh ke CoreLib.executeAppSetup.
 * Akan: set Script Properties + buat folder Drive + seed config + cek ref SIMPEG.
 */
function setupApp(actor) {
  try {
    Logger.log('🚀 Memulai Setup ' + APP_CODE + '...');

    var defaultConfigs = [
      { key: 'app_title',   value: APP_TITLE, keterangan: 'Nama aplikasi' },
      { key: 'app_version', value: 'v2.0.0',  keterangan: 'Versi rilis' },
      { key: 'instansi',    value: 'Pemkab Trenggalek', keterangan: 'Instansi pengelola' }
      // [SESUAIKAN] tambah config default lain di sini
    ];

    var result = CoreLib.executeAppSetup({
      appCode:        APP_CODE,
      appTitle:       APP_TITLE,
      spreadsheetId:  SPREADSHEET_ID,
      masterSsId:     MASTER_SPREADSHEET_ID,
      platformApiUrl: PLATFORM_API_URL,
      headersMap:     ALL_SHEET_HEADERS,
      defaultConfigs: defaultConfigs,
      isRefSheetFunc: isSimpegSheet_,
      props:          appProps_()
    });

    if (result && result.success) {
      audit_(actor, 'SETUP_APP', 'SYSTEM', 'ALL', true,
        'Setup selesai. Warnings: ' + ((result.warnings || []).length));
    } else {
      audit_(actor, 'SETUP_APP', 'SYSTEM', 'ALL', false,
        (result && result.error) || 'Setup gagal tanpa pesan');
    }

    return result;
  } catch (err) {
    Logger.log('[setupApp] ' + err.message);
    return { success: false, error: err.message };
  }
}

// ==================== §10 HEALTH CHECK ====================

/**
 * Verifikasi cepat setelah paste: cek CoreLib + dispatcher + registry.
 */
function testAppLogicSelfCheck() {
  Logger.log('=== 02_AppLogic.gs v2.0.0 self-check ===');

  if (typeof CoreLib === 'undefined') {
    Logger.log('❌ CoreLib tidak terpasang!');
    return;
  }
  Logger.log('✅ CoreLib terdeteksi.');

  var h = buildLocalHandlers_();
  var actions = Object.keys(h);
  Logger.log('📋 localHandlers: ' + actions.length + ' aksi terdaftar');

  var cfg = getAppConfig_();
  var actionLevels = cfg.actionLevels || {};
  var missing = actions.filter(function (k) {
    return actionLevels[k] === undefined && ['save', 'delete'].indexOf(k) === -1;
  });
  Logger.log((missing.length === 0 ? '✅' : '❌') +
    ' Semua handler punya actionLevels' +
    (missing.length ? ' — MISSING: ' + missing.join(', ') : ''));

  var ping = handleAction({ action: 'ping' });
  Logger.log((ping && ping.success ? '✅' : '❌') + ' ping via dispatcher');

  var aneh = handleAction({ action: 'aksi_aneh_xyz' });
  Logger.log((aneh && aneh.success === false ? '✅' : '❌') +
    ' aksi tak dikenal DITOLAK (code=' + (aneh && aneh.code) + ')');

  Logger.log('=== Selesai ===');
}
