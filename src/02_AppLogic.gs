// ============================================================
// STARTER-KIT - 02_AppLogic.gs (v2.10.0 — CoreLib-First + 11 sheet + 72 handler + RTL + UIUX v1.10)
// ============================================================
// Entry HTTP + Dispatcher + Registry Handler + Setup + Handler contoh.
// Pola identik dengan si-arsip v1.10 (11 sheet + 72 handler + RTL R1-R5 + UIUX polish).
//
// Domain LENGKAP v2.10.0:
// - Master 3: M_REFERENSI, M_KATEGORI, M_SATUAN (CRUD)
// - Tabel 8: T_UTAMA, T_ITEM, T_LOGBOOK, T_LAMPIRAN, T_APPROVAL, T_JADWAL, T_REKAP, T_TINDAK_LANJUT (RTL)
// - Laporan: lap_rekap_klasifikasi, lap_rekap_unit (contoh)
// - Analisa: distribusi, top, beban (contoh)
// - Evaluasi: sla_disposisi, kelengkapan, jra (contoh)
// - RTL: 6 handler + 6 alias rtl_* (contoh si-arsip R1-R5)
//
// UIUX v1.10 polish (dari si-arsip):
// - tabel min-w + table-scroll, badge valid via app-badge, stat-card via app-stat-card,
//   pagination btn-icon, filter label text-[11px], modal v-if + @close, tema #0369a1
//
// ⚠️ Setiap handler di sini WAJIB sinkron dengan actionLevels di 01 (72 handler) — fail-closed.
// ============================================================

// ==================== §1 ENTRY POINTS ====================

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

function buildLocalHandlers_() {
  var h = {};

  // Health & profil
  h['ping'] = function () {
    return { success: true, data: { pong: true, app: APP_CODE, time: new Date().toISOString(), version: 'v2.10.0' } };
  };
  h['get_my_profile'] = function (d, u) { return { success: true, data: u }; };
  h['save_my_profile'] = function (d, u) {
    return CoreLib.saveMyProfile(SPREADSHEET_ID, d, u, ALL_SHEET_HEADERS, MASTER_SPREADSHEET_ID);
  };

  // Dashboard
  h['get_dashboard'] = function (d, u) { return getDashboard_(u); };
  h['dashboard']     = function (d, u) { return getDashboard_(u); };

  // SIMPEG
  h['get_pegawai_list']   = function () { return getPegawaiList_(); };
  h['get_unit_list']      = function () { return getUnitList_(); };
  h['get_jabatan_list']   = function () { return getJabatanList_(); };
  h['get_master_satelit'] = function () { return getMasterSatelit_(); };

  // Config
  h['get_config']         = function () { return getConfigList_(); };
  h['get_config_list']    = function () { return getConfigList_(); };
  h['save_config_item']   = function (d, u) { return saveConfigItem_(d, u); };
  h['save_config']        = function (d, u) { return saveConfigItem_(d, u); };
  h['delete_config_item'] = function (d, u) { return deleteConfigItem_(d, u); };
  h['delete_config']      = function (d, u) { return deleteConfigItem_(d, u); };

  // Generic routing
  h['save'] = function (d, u) {
    var ent = String((d && d.entity) || '').toUpperCase();
    if (ent === 'KONFIGURASI') return saveConfigItem_(d || {}, u);
    return { success: false, code: 'BAD_REQUEST', error: 'Aksi save untuk entitas \"' + ent + '\" tidak dikenali.' };
  };
  h['delete'] = function (d, u) {
    var ent = String((d && d.entity) || '').toUpperCase();
    if (ent === 'KONFIGURASI') return deleteConfigItem_(d || {}, u);
    return { success: false, code: 'BAD_REQUEST', error: 'Aksi delete untuk entitas \"' + ent + '\" tidak dikenali.' };
  };

  // M_REFERENSI
  h['get_referensi_list'] = function (d) { return getReferensiList_(d || {}); };
  h['save_referensi']     = function (d, u) { return saveReferensi_(d || {}, u); };
  h['delete_referensi']   = function (d, u) { return deleteReferensi_(d || {}, u); };

  // M_KATEGORI
  h['get_kategori_list'] = function (d) { return getGenericList_('M_KATEGORI', d || {}); };
  h['save_kategori']     = function (d, u) { return saveGeneric_('M_KATEGORI', d || {}, u); };
  h['delete_kategori']   = function (d, u) { return deleteGeneric_('M_KATEGORI', d || {}, u); };

  // M_SATUAN
  h['get_satuan_list'] = function (d) { return getGenericList_('M_SATUAN', d || {}); };
  h['save_satuan']     = function (d, u) { return saveGeneric_('M_SATUAN', d || {}, u); };
  h['delete_satuan']   = function (d, u) { return deleteGeneric_('M_SATUAN', d || {}, u); };

  // T_UTAMA
  h['get_utama_list']   = function (d) { return getUtamaList_(d || {}); };
  h['get_utama_detail'] = function (d) { return getUtamaDetail_(d || {}); };
  h['save_utama']       = function (d, u) { return saveUtama_(d || {}, u); };
  h['delete_utama']     = function (d, u) { return deleteUtama_(d || {}, u); };

  // T_ITEM
  h['get_item_list']   = function (d) { return getGenericList_('T_ITEM', d || {}); };
  h['get_item_detail'] = function (d) { return getGenericDetail_('T_ITEM', d || {}); };
  h['save_item']       = function (d, u) { return saveGeneric_('T_ITEM', d || {}, u); };
  h['delete_item']     = function (d, u) { return deleteGeneric_('T_ITEM', d || {}, u); };

  // T_LOGBOOK
  h['get_logbook_list'] = function (d) { return getGenericList_('T_LOGBOOK', d || {}); };
  h['save_logbook']     = function (d, u) { return saveGeneric_('T_LOGBOOK', d || {}, u); };

  // T_LAMPIRAN
  h['get_lampiran_list'] = function (d) { return getGenericList_('T_LAMPIRAN', d || {}); };
  h['save_lampiran']     = function (d, u) { return saveGeneric_('T_LAMPIRAN', d || {}, u); };
  h['delete_lampiran']   = function (d, u) { return deleteGeneric_('T_LAMPIRAN', d || {}, u); };

  // T_APPROVAL
  h['get_approval_list']   = function (d) { return getGenericList_('T_APPROVAL', d || {}); };
  h['save_approval']       = function (d, u) { return saveGeneric_('T_APPROVAL', d || {}, u); };
  h['delete_approval']     = function (d, u) { return deleteGeneric_('T_APPROVAL', d || {}, u); };
  h['verifikasi_approval'] = function (d, u) { return verifikasiApproval_(d || {}, u); };

  // T_JADWAL
  h['get_jadwal_list']   = function (d) { return getGenericList_('T_JADWAL', d || {}); };
  h['get_jadwal_detail'] = function (d) { return getGenericDetail_('T_JADWAL', d || {}); };
  h['save_jadwal']       = function (d, u) { return saveGeneric_('T_JADWAL', d || {}, u); };
  h['delete_jadwal']     = function (d, u) { return deleteGeneric_('T_JADWAL', d || {}, u); };

  // T_REKAP
  h['get_rekap_list']  = function (d) { return getGenericList_('T_REKAP', d || {}); };
  h['generate_rekap']  = function (d, u) { return generateRekap_(d || {}, u); };

  // Laporan (contoh si-arsip L4/L5)
  h['lap_rekap_klasifikasi'] = function (d) { return lapRekapKlasifikasi_(d || {}); };
  h['lap_rekap_unit']       = function (d) { return lapRekapUnit_(d || {}); };

  // Analisa (contoh si-arsip A3-A5)
  h['analisa_distribusi_unit'] = function (d) { return analisaDistribusiUnit_(d || {}); };
  h['analisa_top_pengirim']    = function (d) { return analisaTopPengirim_(d || {}); };
  h['analisa_beban_pejabat']   = function (d) { return analisaBebanPejabat_(d || {}); };

  // Evaluasi (contoh si-arsip E1/E3/E5)
  h['evaluasi_sla_disposisi'] = function (d) { return evaluasiSlaDisposisi_(d || {}); };
  h['evaluasi_kelengkapan']   = function (d) { return evaluasiKelengkapan_(d || {}); };
  h['evaluasi_jra']           = function (d) { return evaluasiJra_(d || {}); };

  // T_TINDAK_LANJUT / RTL — 12 handler (6 generic + 6 alias)
  h['get_tindak_lanjut_list']    = function (d) { return getTindakLanjutList_(d || {}); };
  h['rtl_get_list']              = function (d) { return getTindakLanjutList_(d || {}); };
  h['get_tindak_lanjut_detail']  = function (d) { return getTindakLanjutDetail_(d || {}); };
  h['rtl_get_detail']            = function (d) { return getTindakLanjutDetail_(d || {}); };
  h['save_tindak_lanjut']        = function (d, u) { return saveTindakLanjut_(d || {}, u); };
  h['rtl_save']                  = function (d, u) { return saveTindakLanjut_(d || {}, u); };
  h['delete_tindak_lanjut']      = function (d, u) { return deleteTindakLanjut_(d || {}, u); };
  h['rtl_delete']                = function (d, u) { return deleteTindakLanjut_(d || {}, u); };
  h['ubah_status_tindak_lanjut'] = function (d, u) { return ubahStatusTindakLanjut_(d || {}, u); };
  h['rtl_ubah_status']           = function (d, u) { return ubahStatusTindakLanjut_(d || {}, u); };
  h['generate_tindak_lanjut']    = function (d, u) { return generateTindakLanjut_(d || {}, u); };
  h['rtl_generate']              = function (d, u) { return generateTindakLanjut_(d || {}, u); };

  // Sistem
  h['init_database'] = function (d, u) { return initDatabase(u); };

  return h;
}

// ==================== §3 SIMPEG LOOKUPS ====================

function getPegawaiList_() {
  try {
    var rows = getSheetData_('PEGAWAI');
    var lean = (rows || []).map(function (p) {
      return {
        pegawai_id: p.pegawai_id || p.id,
        nip: p.nip || '',
        nama: p.nama || p.nama_lengkap || '',
        email: p.email || '',
        unit_id: p.unit_id || '',
        jabatan_id: p.jabatan_id || ''
      };
    });
    return { success: true, data: lean };
  } catch (err) {
    return { success: false, error: 'Gagal baca PEGAWAI: ' + err.message };
  }
}

function getUnitList_() {
  try { return { success: true, data: getSheetData_('UNIT_KERJA') }; }
  catch (err) { return { success: false, error: err.message }; }
}

function getJabatanList_() {
  try { return { success: true, data: getSheetData_('JABATAN') }; }
  catch (err) { return { success: false, error: err.message }; }
}

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
    return { success: false, error: err.message };
  }
}

// ==================== §4 DASHBOARD ====================

function getDashboard_(user) {
  try {
    var utama = getSheetData_('T_UTAMA');
    var rekap = getSheetData_('T_REKAP');
    var rtl   = getSheetData_('T_TINDAK_LANJUT');

    var totalUtama = (utama || []).length;
    var totalSelesai = (utama || []).filter(function (r) { return String(r.status).toLowerCase() === 'selesai'; }).length;
    var totalBaru = (utama || []).filter(function (r) { return String(r.status).toLowerCase() === 'baru' || String(r.status).toLowerCase() === 'draft'; }).length;
    var totalRtl = (rtl || []).length;
    var rtlBaru = (rtl || []).filter(function (r) { return String(r.status_rtl || r.status).toLowerCase() === 'baru'; }).length;
    var rtlSelesai = (rtl || []).filter(function (r) { return String(r.status_rtl || r.status).toLowerCase() === 'selesai'; }).length;

    return {
      success: true,
      data: {
        totalUtama: totalUtama,
        totalBaru: totalBaru,
        totalSelesai: totalSelesai,
        totalRekap: (rekap || []).length,
        totalRtl: totalRtl,
        rtlBaru: rtlBaru,
        rtlSelesai: rtlSelesai,
        role: (user && user.role) || 'viewer',
        nama: (user && (user.display_name || user.email)) || ''
      }
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ==================== §5 GENERIC HELPERS ====================

function getGenericList_(sheetName, params) {
  try {
    var list = getSheetData_(sheetName);
    if (params && params.filters && typeof params.filters === 'object') {
      Object.keys(params.filters).forEach(function (k) {
        var v = params.filters[k];
        if (v === '' || v === null || v === undefined) return;
        list = list.filter(function (r) { return CoreLib.normStr(r[k]) === CoreLib.normStr(v); });
      });
    }
    if (params && params.search) {
      var q = CoreLib.normStr(params.search);
      list = list.filter(function (r) { return CoreLib.matchSearch(r, q, Object.keys(r)); });
    }
    list = list.map(function (r) { return Object.assign({}, r); });
    return { success: true, data: list, total: list.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function getGenericDetail_(sheetName, params) {
  try {
    if (!params || !params.id) return { success: false, code: 'BAD_REQUEST', error: 'ID wajib.' };
    var row = findRecordById_(sheetName, params.id);
    if (!row) return { success: false, code: 'NOT_FOUND', error: 'Tidak ditemukan.' };
    return { success: true, data: row };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function saveGeneric_(sheetName, data, user) {
  try {
    var record = data.record || data;
    if (!record || typeof record !== 'object') return { success: false, code: 'BAD_REQUEST', error: 'Record tidak valid.' };
    normalizeEntityIdFields_(record);
    var saved = saveRecord_(sheetName, record, user);
    return { success: true, data: saved };
  } catch (err) {
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

function deleteGeneric_(sheetName, data, user) {
  try {
    if (!data || !data.id) return { success: false, code: 'BAD_REQUEST', error: 'ID tidak valid.' };
    var ok = softDeleteRecord_(sheetName, data.id, user);
    return { success: ok, message: ok ? 'Dihapus.' : 'Tidak ditemukan.' };
  } catch (err) {
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §6 DOMAIN CONTOH: M_REFERENSI ====================

function getReferensiList_(params) {
  try {
    var list = getSheetData_('M_REFERENSI');
    if (params.kategori) list = list.filter(function (r) { return CoreLib.normStr(r.kategori) === CoreLib.normStr(params.kategori); });
    if (params.only_active) list = list.filter(function (r) { return CoreLib.normStr(r.status_aktif) !== 'false'; });
    if (params.search) {
      var q = CoreLib.normStr(params.search);
      list = list.filter(function (r) { return CoreLib.matchSearch(r, q, ['kode', 'nama_nilai', 'keterangan']); });
    }
    list.sort(function (a, b) { return (Number(a.urutan) || 99) - (Number(b.urutan) || 99); });
    return { success: true, data: list, total: list.length };
  } catch (err) { return { success: false, error: err.message }; }
}

function saveReferensi_(data, user) {
  try {
    var record = data.record || data;
    if (!record.kategori || !record.nama_nilai) return { success: false, code: 'BAD_REQUEST', error: 'Kategori dan nama nilai wajib.' };
    if (record.status_aktif !== undefined) record.status_aktif = String(record.status_aktif).toLowerCase() === 'false' ? 'false' : 'true';
    else record.status_aktif = 'true';
    var saved = saveRecord_('M_REFERENSI', record, user);
    return { success: true, data: saved };
  } catch (err) { return { success: false, code: 'BAD_REQUEST', error: err.message }; }
}

function deleteReferensi_(data, user) {
  try {
    if (!data || !data.id) return { success: false, code: 'BAD_REQUEST', error: 'ID tidak valid.' };
    var ok = softDeleteRecord_('M_REFERENSI', data.id, user);
    return { success: ok, message: ok ? 'Dihapus.' : 'Tidak ditemukan.' };
  } catch (err) { return { success: false, error: err.message }; }
}

// ==================== §7 DOMAIN: T_UTAMA ====================

function getUtamaList_(params) {
  try {
    var list = getSheetData_('T_UTAMA');
    if (params.status) list = list.filter(function (r) { return CoreLib.normStr(r.status) === CoreLib.normStr(params.status); });
    if (params.search) {
      var q = CoreLib.normStr(params.search);
      list = list.filter(function (r) { return CoreLib.matchSearch(r, q, ['kode', 'judul', 'deskripsi']); });
    }
    list.sort(function (a, b) {
      var ta = CoreLib.dateKey10(a.tanggal) || CoreLib.dateKey10(a.created_at);
      var tb = CoreLib.dateKey10(b.tanggal) || CoreLib.dateKey10(b.created_at);
      return tb < ta ? -1 : (tb > ta ? 1 : 0);
    });
    return { success: true, data: list.map(function (r) { return Object.assign({}, r); }), total: list.length };
  } catch (err) { return { success: false, error: err.message }; }
}

function getUtamaDetail_(data) {
  try {
    if (!data || !data.id) return { success: false, code: 'BAD_REQUEST', error: 'ID wajib.' };
    var row = findRecordById_('T_UTAMA', data.id);
    if (!row) return { success: false, code: 'NOT_FOUND', error: 'Tidak ditemukan.' };
    return { success: true, data: row };
  } catch (err) { return { success: false, error: err.message }; }
}

function saveUtama_(data, user) {
  try {
    var record = data.record || data;
    if (!String(record.judul || '').trim()) return { success: false, code: 'BAD_REQUEST', error: 'Judul wajib.' };
    normalizeEntityIdFields_(record);
    if (!record.id && !record.kode) record.kode = CoreLib.genUniqueCode('UTM-', 'T_UTAMA', 'kode', 4, SPREADSHEET_ID, ALL_SHEET_HEADERS);
    if (record.tanggal) record.tanggal = CoreLib.dateKey10(record.tanggal) || record.tanggal;
    if (!record.status) record.status = 'draft';
    var saved = saveRecord_('T_UTAMA', record, user);
    return { success: true, data: saved };
  } catch (err) { return { success: false, code: 'BAD_REQUEST', error: err.message }; }
}

function deleteUtama_(data, user) {
  try {
    if (!data || !data.id) return { success: false, code: 'BAD_REQUEST', error: 'ID tidak valid.' };
    var ok = softDeleteRecord_('T_UTAMA', data.id, user);
    return { success: ok, message: ok ? 'Dihapus.' : 'Tidak ditemukan.' };
  } catch (err) { return { success: false, error: err.message }; }
}

// ==================== §8 T_APPROVAL VERIFIKASI ====================

function verifikasiApproval_(data, user) {
  try {
    var isVerifikator = user && ['verifikator', 'admin', 'super'].indexOf(String(user.role).toLowerCase()) !== -1;
    if (!isVerifikator) return { success: false, code: 'FORBIDDEN', error: 'Hanya verifikator/admin.' };
    var id = data.id;
    var status = String(data.status || '').toLowerCase().trim();
    if (!id) return { success: false, code: 'BAD_REQUEST', error: 'ID wajib.' };
    if (['disetujui', 'ditolak', 'revisi'].indexOf(status) === -1) return { success: false, code: 'BAD_REQUEST', error: 'Status harus disetujui/ditolak/revisi.' };
    var row = findRecordById_('T_APPROVAL', id);
    if (!row) return { success: false, code: 'NOT_FOUND', error: 'Tidak ditemukan.' };
    row.status = status;
    row.approver_id = (user && user.email) || '';
    row.tanggal_approve = CoreLib.todayIsoLocal();
    if (data.catatan !== undefined) row.catatan = data.catatan;
    var result = CoreLib.apiSave(SPREADSHEET_ID, 'T_APPROVAL', row, user, ALL_SHEET_HEADERS, isRefSheet_, null, 'id');
    if (!result.success) return { success: false, code: 'BAD_REQUEST', error: result.error };
    return { success: true, data: result.data };
  } catch (err) { return { success: false, code: 'BAD_REQUEST', error: err.message }; }
}

// ==================== §9 LAPORAN CONTOH ====================

function lapRekapKlasifikasi_(params) {
  try {
    var utama = getSheetData_('T_UTAMA');
    var tahun = String(params.tahun || new Date().getFullYear());
    var filtered = utama.filter(function (r) {
      var t = CoreLib.dateKey10(r.tanggal) || '';
      return !tahun || t.indexOf(tahun) === 0;
    });
    var map = {};
    filtered.forEach(function (r) {
      var k = r.kategori_id || 'tanpa';
      if (!map[k]) map[k] = { kategori_id: k, jml: 0 };
      map[k].jml++;
    });
    var rekap = Object.keys(map).map(function (k) { return map[k]; });
    rekap.sort(function (a, b) { return b.jml - a.jml; });
    return { success: true, data: { tahun: tahun, total: filtered.length, rekap: rekap } };
  } catch (err) { return { success: false, error: err.message }; }
}

function lapRekapUnit_(params) {
  try {
    var utama = getSheetData_('T_UTAMA');
    var tahun = String(params.tahun || new Date().getFullYear());
    var filtered = utama.filter(function (r) {
      var t = CoreLib.dateKey10(r.tanggal) || '';
      return !tahun || t.indexOf(tahun) === 0;
    });
    var map = {};
    filtered.forEach(function (r) {
      var u = r.pegawai_id || 'tanpa';
      if (!map[u]) map[u] = { pegawai_id: u, jml: 0 };
      map[u].jml++;
    });
    var rekap = Object.keys(map).map(function (k) { return map[k]; });
    return { success: true, data: { tahun: tahun, total: filtered.length, rekap: rekap } };
  } catch (err) { return { success: false, error: err.message }; }
}

function generateRekap_(data, user) {
  try {
    var periode = data.periode || CoreLib.dateKey10(new Date());
    var utama = getSheetData_('T_UTAMA');
    var record = {
      periode: periode,
      total_item: utama.length,
      total_nilai: utama.reduce(function (s, r) { return s + (Number(r.nilai) || 0); }, 0),
      ringkasan_json: JSON.stringify({ total: utama.length }),
      status_rekap: 'selesai',
      generated_at: CoreLib.todayIsoLocal()
    };
    var saved = saveRecord_('T_REKAP', record, user);
    return { success: true, data: saved };
  } catch (err) { return { success: false, error: err.message }; }
}

// ==================== §10 ANALISA CONTOH ====================

function analisaDistribusiUnit_(params) {
  try {
    var utama = getSheetData_('T_UTAMA');
    var tahun = String(params.tahun || new Date().getFullYear());
    var filtered = utama.filter(function (r) { var t = CoreLib.dateKey10(r.tanggal) || ''; return !tahun || t.indexOf(tahun) === 0; });
    var map = {};
    filtered.forEach(function (r) { var k = r.pegawai_id || 'tanpa'; map[k] = (map[k] || 0) + 1; });
    var distribusi = Object.keys(map).map(function (k) { return { pegawai_id: k, jumlah: map[k] }; });
    distribusi.sort(function (a, b) { return b.jumlah - a.jumlah; });
    return { success: true, data: { tahun: tahun, total: filtered.length, distribusi: distribusi } };
  } catch (err) { return { success: false, error: err.message }; }
}

function analisaTopPengirim_(params) {
  try {
    var utama = getSheetData_('T_UTAMA');
    var tahun = String(params.tahun || new Date().getFullYear());
    var filtered = utama.filter(function (r) { var t = CoreLib.dateKey10(r.tanggal) || ''; return !tahun || t.indexOf(tahun) === 0; });
    var map = {};
    filtered.forEach(function (r) { var k = r.kategori_id || 'tanpa'; map[k] = (map[k] || 0) + 1; });
    var top = Object.keys(map).map(function (k) { return { kategori_id: k, jumlah: map[k] }; });
    top.sort(function (a, b) { return b.jumlah - a.jumlah; });
    top = top.slice(0, 5);
    return { success: true, data: { tahun: tahun, total: filtered.length, top: top } };
  } catch (err) { return { success: false, error: err.message }; }
}

function analisaBebanPejabat_(params) {
  try {
    var utama = getSheetData_('T_UTAMA');
    var tahun = String(params.tahun || new Date().getFullYear());
    var filtered = utama.filter(function (r) { var t = CoreLib.dateKey10(r.tanggal) || ''; return !tahun || t.indexOf(tahun) === 0; });
    var map = {};
    filtered.forEach(function (r) { var k = r.pegawai_id || 'tanpa'; if (!map[k]) map[k] = { pegawai_id: k, total: 0, selesai: 0 }; map[k].total++; if (String(r.status).toLowerCase() === 'selesai') map[k].selesai++; });
    var beban = Object.keys(map).map(function (k) { return map[k]; });
    return { success: true, data: { tahun: tahun, total: filtered.length, beban: beban } };
  } catch (err) { return { success: false, error: err.message }; }
}

// ==================== §11 EVALUASI CONTOH ====================

function evaluasiSlaDisposisi_(params) {
  try {
    var utama = getSheetData_('T_UTAMA');
    var tahun = String(params.tahun || new Date().getFullYear());
    var filtered = utama.filter(function (r) { var t = CoreLib.dateKey10(r.tanggal) || ''; return !tahun || t.indexOf(tahun) === 0; });
    var total = filtered.length;
    var selesai = filtered.filter(function (r) { return String(r.status).toLowerCase() === 'selesai'; }).length;
    var lewat = total - selesai;
    return { success: true, data: { tahun: tahun, total: total, selesai: selesai, lewat: lewat, pct_selesai: total ? Math.round(selesai / total * 100) : 0 } };
  } catch (err) { return { success: false, error: err.message }; }
}

function evaluasiKelengkapan_(params) {
  try {
    var utama = getSheetData_('T_UTAMA');
    var tahun = String(params.tahun || new Date().getFullYear());
    var filtered = utama.filter(function (r) { var t = CoreLib.dateKey10(r.tanggal) || ''; return !tahun || t.indexOf(tahun) === 0; });
    var tidakLengkap = filtered.filter(function (r) { return !r.judul || !r.kategori_id; });
    return { success: true, data: { tahun: tahun, total: filtered.length, tidak_lengkap: tidakLengkap.length, pct_lengkap: filtered.length ? Math.round((filtered.length - tidakLengkap.length) / filtered.length * 100) : 0, rincian: tidakLengkap.slice(0, 20) } };
  } catch (err) { return { success: false, error: err.message }; }
}

function evaluasiJra_(params) {
  try {
    var utama = getSheetData_('T_UTAMA');
    var tahun = String(params.tahun || new Date().getFullYear());
    var filtered = utama.filter(function (r) { var t = CoreLib.dateKey10(r.tanggal) || ''; return !tahun || t.indexOf(tahun) === 0; });
    return { success: true, data: { tahun: tahun, total: filtered.length, patuh: filtered.length, tidak_patuh: 0, pct_patuh: 100 } };
  } catch (err) { return { success: false, error: err.message }; }
}

// ==================== §12 RTL / TINDAK LANJUT (puncak piramida) ====================

function getTindakLanjutList_(params) {
  try {
    var list = getSheetData_('T_TINDAK_LANJUT');
    if (params.status_rtl) list = list.filter(function (r) { return CoreLib.normStr(r.status_rtl || r.status) === CoreLib.normStr(params.status_rtl); });
    if (params.sumber_evaluasi) list = list.filter(function (r) { return CoreLib.normStr(r.sumber_evaluasi) === CoreLib.normStr(params.sumber_evaluasi); });
    if (params.tahun) {
      var th = String(params.tahun);
      list = list.filter(function (r) { var d = CoreLib.dateKey10(r.due_date) || ''; return d.indexOf(th) === 0 || String(r.created_at).indexOf(th) === 0; });
    }
    if (params.search) {
      var q = CoreLib.normStr(params.search);
      list = list.filter(function (r) { return CoreLib.matchSearch(r, q, ['judul_rtl', 'deskripsi', 'assigned_to', 'catatan']); });
    }
    list.sort(function (a, b) {
      var da = CoreLib.dateKey10(a.due_date) || '';
      var db = CoreLib.dateKey10(b.due_date) || '';
      return da < db ? -1 : (da > db ? 1 : 0);
    });
    // paginasi sederhana
    var page = Number(params.page) || 1;
    var perPage = Number(params.per_page) || 20;
    var total = list.length;
    var totalPages = Math.ceil(total / perPage);
    var start = (page - 1) * perPage;
    var paged = list.slice(start, start + perPage);
    return { success: true, data: paged, total: total, total_pages: totalPages, page: page, per_page: perPage };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function getTindakLanjutDetail_(params) {
  try {
    if (!params || !params.id) return { success: false, code: 'BAD_REQUEST', error: 'ID wajib.' };
    var row = findRecordById_('T_TINDAK_LANJUT', params.id);
    if (!row) return { success: false, code: 'NOT_FOUND', error: 'Tidak ditemukan.' };
    return { success: true, data: row };
  } catch (err) { return { success: false, error: err.message }; }
}

function saveTindakLanjut_(data, user) {
  try {
    var record = data.record || data;
    if (!String(record.judul_rtl || record.judul || '').trim()) return { success: false, code: 'BAD_REQUEST', error: 'Judul RTL wajib.' };
    if (!record.sumber_evaluasi) record.sumber_evaluasi = 'manual';
    if (!record.status_rtl) record.status_rtl = record.status || 'baru';
    if (record.progress_pct === undefined || record.progress_pct === '') record.progress_pct = 0;
    if (record.due_date) record.due_date = CoreLib.dateKey10(record.due_date) || record.due_date;
    // judul wajib diisi — mapping ke judul_rtl untuk kompatibilitas
    if (record.judul && !record.judul_rtl) record.judul_rtl = record.judul;
    if (record.judul_rtl && !record.judul) record.judul = record.judul_rtl;

    // cegah duplikat tahun+judul
    if (!record.id) {
      var existing = getSheetData_('T_TINDAK_LANJUT');
      var tahunBaru = record.due_date ? String(record.due_date).slice(0, 4) : String(new Date().getFullYear());
      var dup = existing.find(function (r) {
        var t = r.due_date ? String(r.due_date).slice(0, 4) : '';
        return String(r.judul_rtl).toLowerCase() === String(record.judul_rtl).toLowerCase() && t === tahunBaru;
      });
      if (dup) return { success: false, code: 'BAD_REQUEST', error: 'RTL dengan judul + tahun ini sudah ada.' };
    }

    var saved = saveRecord_('T_TINDAK_LANJUT', record, user);
    return { success: true, data: saved };
  } catch (err) { return { success: false, code: 'BAD_REQUEST', error: err.message }; }
}

function deleteTindakLanjut_(data, user) {
  try {
    if (!data || !data.id) return { success: false, code: 'BAD_REQUEST', error: 'ID tidak valid.' };
    var ok = softDeleteRecord_('T_TINDAK_LANJUT', data.id, user);
    return { success: ok, message: ok ? 'RTL dihapus.' : 'Tidak ditemukan.' };
  } catch (err) { return { success: false, error: err.message }; }
}

function ubahStatusTindakLanjut_(data, user) {
  try {
    var id = data.id;
    var statusBaru = String(data.status_rtl || data.status || '').toLowerCase().trim();
    if (!id) return { success: false, code: 'BAD_REQUEST', error: 'ID wajib.' };
    if (['baru', 'diproses', 'selesai', 'batal'].indexOf(statusBaru) === -1) return { success: false, code: 'BAD_REQUEST', error: 'Status harus baru/diproses/selesai/batal.' };
    var row = findRecordById_('T_TINDAK_LANJUT', id);
    if (!row) return { success: false, code: 'NOT_FOUND', error: 'Tidak ditemukan.' };
    row.status_rtl = statusBaru;
    row.status = statusBaru;
    if (data.progress_pct !== undefined) row.progress_pct = Number(data.progress_pct);
    if (data.catatan !== undefined) row.catatan = data.catatan;
    var saved = saveRecord_('T_TINDAK_LANJUT', row, user);
    return { success: true, data: saved };
  } catch (err) { return { success: false, error: err.message }; }
}

function generateTindakLanjut_(data, user) {
  try {
    var sumber = String(data.sumber_evaluasi || 'semua').toLowerCase();
    var tahun = String(data.tahun || new Date().getFullYear());
    var evalData = null;

    // Contoh generate dari evaluasi — untuk starter-kit, kita buat dummy dari T_UTAMA
    var utama = getSheetData_('T_UTAMA');
    var filtered = utama.filter(function (r) {
      var t = CoreLib.dateKey10(r.tanggal) || '';
      return t.indexOf(tahun) === 0;
    });

    var toGenerate = [];
    if (sumber === 'semua' || sumber === 'e3') {
      var tidakLengkap = filtered.filter(function (r) { return !r.judul || !r.kategori_id; });
      if (tidakLengkap.length) toGenerate.push({ sumber: 'E3', judul: 'R5 Pelatihan — ' + tidakLengkap.length + ' data tidak lengkap ' + tahun, deskripsi: tidakLengkap.length + ' data perlu dilengkapi', count: tidakLengkap.length });
    }
    if (sumber === 'semua' || sumber === 'a9') {
      var belumSelesai = filtered.filter(function (r) { return String(r.status).toLowerCase() !== 'selesai'; });
      if (belumSelesai.length) toGenerate.push({ sumber: 'A9', judul: 'R5 Pembinaan — ' + belumSelesai.length + ' belum selesai ' + tahun, deskripsi: belumSelesai.length + ' perlu pembinaan SLA', count: belumSelesai.length });
    }
    if (!toGenerate.length) {
      // fallback manual 1
      toGenerate.push({ sumber: 'manual', judul: 'RTL Manual ' + tahun + ' — Review', deskripsi: 'Rencana tindak lanjut manual untuk tahun ' + tahun, count: 1 });
    }

    var created = [];
    toGenerate.forEach(function (g) {
      var rec = {
        sumber_evaluasi: g.sumber,
        judul_rtl: g.judul,
        deskripsi: g.deskripsi,
        status_rtl: 'baru',
        progress_pct: 0,
        due_date: tahun + '-12-31',
        assigned_to: '',
        catatan: 'Auto-generate dari ' + g.sumber
      };
      // cek duplikat
      var existing = getSheetData_('T_TINDAK_LANJUT');
      var dup = existing.find(function (r) { return String(r.judul_rtl).toLowerCase() === rec.judul_rtl.toLowerCase(); });
      if (!dup) {
        try { var saved = saveRecord_('T_TINDAK_LANJUT', rec, user); created.push(saved); } catch (e) { Logger.log('[generate RTL] ' + e.message); }
      }
    });

    return { success: true, data: { generated: created.length, items: created, tahun: tahun, sumber: sumber } };
  } catch (err) { return { success: false, error: err.message }; }
}

// ==================== §13 CONFIG ====================

function getConfigList_() {
  var defaults = [
    { key: 'app_title',   value: APP_TITLE, keterangan: 'Nama aplikasi' },
    { key: 'app_version', value: 'v2.10.0',  keterangan: 'Versi rilis' },
    { key: 'instansi',    value: 'Pemkab Trenggalek', keterangan: 'Instansi pengelola' }
  ];
  var stored = {};
  try { stored = appProps_().getProperties() || {}; } catch (e) { stored = {}; }
  var list = defaults.map(function (d) { if (stored[d.key] !== undefined) d.value = stored[d.key]; return d; });
  Object.keys(stored).forEach(function (k) {
    if (!CoreLib.isAllowedConfigKey(k, ['ADMIN_EMAILS', 'VERIFIKATOR_EMAILS'])) return;
    if (!list.find(function (i) { return i.key === k; })) list.push({ key: k, value: stored[k], keterangan: 'Parameter Kustom' });
  });
  return { success: true, data: list };
}

function saveConfigItem_(payload, actor) {
  try {
    payload = payload || {};
    var key   = payload.key   !== undefined ? payload.key   : (payload.record && payload.record.key);
    var value = payload.value !== undefined ? payload.value : (payload.record && payload.record.value);
    if (!key) return { success: false, code: 'BAD_REQUEST', error: 'Key wajib.' };
    var allowed = CoreLib.isAllowedConfigKey(key, ['ADMIN_EMAILS', 'VERIFIKATOR_EMAILS']);
    if (!allowed) {
      audit_(actor, 'SAVE_CONFIG_DENIED', 'CONFIG', key, false, 'Key tidak diizinkan: ' + key);
      return { success: false, code: 'FORBIDDEN', error: 'Parameter \"' + key + '\" tidak diizinkan.' };
    }
    appProps_().setProperty(String(key), String(value));
    audit_(actor, 'SAVE_CONFIG', 'CONFIG', key, true, 'Set: ' + key);
    return { success: true, message: 'Parameter ' + key + ' disimpan.' };
  } catch (e) { return { success: false, code: 'BAD_REQUEST', error: e.message }; }
}

function deleteConfigItem_(payload, actor) {
  try {
    payload = payload || {};
    var key = payload.key || (payload.record && payload.record.key) || payload.id;
    if (!key) return { success: false, code: 'BAD_REQUEST', error: 'Key wajib.' };
    var allowed = CoreLib.isAllowedConfigKey(key, ['ADMIN_EMAILS', 'VERIFIKATOR_EMAILS']);
    if (!allowed) return { success: false, code: 'FORBIDDEN', error: 'Parameter \"' + key + '\" tidak boleh dihapus.' };
    appProps_().deleteProperty(String(key));
    audit_(actor, 'DELETE_CONFIG', 'CONFIG', key, true, 'Delete: ' + key);
    return { success: true, message: 'Parameter ' + key + ' dihapus.' };
  } catch (e) { return { success: false, code: 'BAD_REQUEST', error: e.message }; }
}

// ==================== §14 SETUP ====================

function initDatabase(actor) {
  try {
    if (!SPREADSHEET_ID) return { success: false, error: 'SPREADSHEET_ID kosong. Isi di Script Properties atau DEFAULT_SPREADSHEET_ID.' };
    var result = CoreLib.initDatabase(SPREADSHEET_ID, ALL_SHEET_HEADERS, isSimpegSheet_);
    try {
      var ss = CoreLib.getDb(SPREADSHEET_ID);
      var defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Sheet 1');
      if (defaultSheet && ss.getSheets().length > 1 && defaultSheet.getLastRow() === 0) ss.deleteSheet(defaultSheet);
    } catch (e) { Logger.log('[WARN] Gagal hapus Sheet1: ' + e.message); }
    var summary = 'Inisialisasi database ' + APP_CODE + ' selesai. 11 sheet bisnis (3 master + 8 tabel incl RTL) + ZZ_TEST_CRUD.';
    Logger.log('✅ ' + summary);
    audit_(actor, 'INIT_DB', 'SYSTEM', 'ALL', true, summary);
    return { success: true, message: summary, corelib: result };
  } catch (err) { return { success: false, error: err.message }; }
}

function setupApp(actor) {
  try {
    Logger.log('🚀 Memulai Setup ' + APP_CODE + ' v2.10.0...');
    var defaultConfigs = [
      { key: 'app_title',   value: APP_TITLE, keterangan: 'Nama aplikasi' },
      { key: 'app_version', value: 'v2.10.0',  keterangan: 'Versi rilis' },
      { key: 'instansi',    value: 'Pemkab Trenggalek', keterangan: 'Instansi pengelola' }
    ];
    var result = CoreLib.executeAppSetup({
      appCode: APP_CODE,
      appTitle: APP_TITLE,
      spreadsheetId: SPREADSHEET_ID,
      masterSsId: MASTER_SPREADSHEET_ID,
      platformApiUrl: PLATFORM_API_URL,
      headersMap: ALL_SHEET_HEADERS,
      defaultConfigs: defaultConfigs,
      isRefSheetFunc: isSimpegSheet_,
      props: appProps_()
    });
    if (result && result.success) audit_(actor, 'SETUP_APP', 'SYSTEM', 'ALL', true, 'Setup selesai. Warnings: ' + ((result.warnings || []).length));
    else audit_(actor, 'SETUP_APP', 'SYSTEM', 'ALL', false, (result && result.error) || 'Setup gagal');
    return result;
  } catch (err) { return { success: false, error: err.message }; }
}

// ==================== §15 HEALTH CHECK ====================

function testAppLogicSelfCheck() {
  Logger.log('=== 02_AppLogic.gs v2.10.0 self-check (11 sheet + 72 handler) ===');
  if (typeof CoreLib === 'undefined') { Logger.log('❌ CoreLib tidak terpasang!'); return; }
  Logger.log('✅ CoreLib terdeteksi.');
  var h = buildLocalHandlers_();
  var actions = Object.keys(h);
  Logger.log('📋 localHandlers: ' + actions.length + ' aksi (target 72)');
  var cfg = getAppConfig_();
  var actionLevels = cfg.actionLevels || {};
  var missing = actions.filter(function (k) { return actionLevels[k] === undefined && ['save', 'delete'].indexOf(k) === -1; });
  Logger.log((missing.length === 0 ? '✅' : '❌') + ' Semua handler punya actionLevels' + (missing.length ? ' — MISSING: ' + missing.join(', ') : ''));
  var ping = handleAction({ action: 'ping' });
  Logger.log((ping && ping.success ? '✅' : '❌') + ' ping via dispatcher');
  var aneh = handleAction({ action: 'aksi_aneh_xyz' });
  Logger.log((aneh && aneh.success === false ? '✅' : '❌') + ' aksi tak dikenal DITOLAK (code=' + (aneh && aneh.code) + ')');
  Logger.log('=== Selesai ===');
}
