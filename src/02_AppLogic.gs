// ============================================================
// STARTER-KIT - 02_AppLogic.gs (v2.11.0 — 5M+5T + piramida 12L/8A/6E/4R + dashboard 4+4+4)
// ============================================================
// Changelog:
//   v2.11.0 — REDESIGN SKEMA (keputusan user 2026-09-22):
//             - Master 5: M_KATEGORI, M_JENIS, M_PERIODE, M_SATUAN, M_LOKASI
//             - Tabel 5: T_UTAMA, T_ITEM, T_LAMPIRAN, T_APPROVAL, T_TINDAK_LANJUT
//             - Piramida output (baseline, tidak kaku):
//               LAPORAN 12 · ANALISA 8 · EVALUASI 6 · RTL 4 sumber = 30
//             - Dashboard "ukuran sedang" 4 kartu + 4 chart + 4 panel,
//               SEMUA dihitung server-side (tidak ada lagi grafik dari
//               sample halaman pertama — pelajaran audit si-dokumen).
//             - initDatabase seed master awal (kategori/jenis/periode/
//               satuan/lokasi) agar app baru langsung hidup.
//             - Guard referensial: delete master yang masih dipakai DITOLAK.
//   v2.10.1 — FIX P1 (RTL FSM) — tetap dipertahankan (RTL_TRANSISI_LEGAL_).
// Entry HTTP + Dispatcher + Registry Handler (86 handler) + Setup + Handler.
//
// ⚠️ Setiap handler di sini WAJIB sinkron dengan actionLevels di 01
//    (88 aksi; 2 native CoreLib: exchange_platform_ticket & logout) — fail-closed.
//
// UIUX v2 (standar audit si-dokumen 2026-09-22): nama bukan ID,
// tahun via select, v-can role-gate, CSS ter-compile, modal v-if.
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
    return { success: true, data: { pong: true, app: APP_CODE, time: new Date().toISOString(), version: 'v2.11.0' } };
  };
  h['get_my_profile'] = function (d, u) { return { success: true, data: u }; };
  h['save_my_profile'] = function (d, u) {
    return CoreLib.saveMyProfile(SPREADSHEET_ID, d, u, ALL_SHEET_HEADERS, MASTER_SPREADSHEET_ID);
  };

  // Dashboard (4 kartu + 4 chart + 4 panel — server-side)
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
    return { success: false, code: 'BAD_REQUEST', error: 'Aksi save untuk entitas "' + ent + '" tidak dikenali.' };
  };
  h['delete'] = function (d, u) {
    var ent = String((d && d.entity) || '').toUpperCase();
    if (ent === 'KONFIGURASI') return deleteConfigItem_(d || {}, u);
    return { success: false, code: 'BAD_REQUEST', error: 'Aksi delete untuk entitas "' + ent + '" tidak dikenali.' };
  };

  // M_KATEGORI (dengan guard hierarki & referensi)
  h['get_kategori_list'] = function (d) { return getKategoriList_(d || {}); };
  h['save_kategori']     = function (d, u) { return saveKategori_(d || {}, u); };
  h['delete_kategori']   = function (d, u) { return deleteKategori_(d || {}, u); };

  // M_JENIS
  h['get_jenis_list'] = function (d) { return getGenericList_('M_JENIS', d || {}); };
  h['save_jenis']     = function (d, u) { return saveJenis_(d || {}, u); };
  h['delete_jenis']   = function (d, u) { return deleteGuarded_('M_JENIS', 'jenis_id', d || {}, u); };

  // M_PERIODE
  h['get_periode_list'] = function (d) { return getGenericList_('M_PERIODE', d || {}); };
  h['save_periode']     = function (d, u) { return savePeriode_(d || {}, u); };
  h['delete_periode']   = function (d, u) { return deleteGuarded_('M_PERIODE', 'periode_id', d || {}, u); };

  // M_SATUAN
  h['get_satuan_list'] = function (d) { return getGenericList_('M_SATUAN', d || {}); };
  h['save_satuan']     = function (d, u) { return saveMasterKode_(d || {}, u, 'M_SATUAN'); };
  h['delete_satuan']   = function (d, u) { return deleteGuarded_('M_SATUAN', 'satuan_id', d || {}, u); };

  // M_LOKASI
  h['get_lokasi_list'] = function (d) { return getGenericList_('M_LOKASI', d || {}); };
  h['save_lokasi']     = function (d, u) { return saveMasterKode_(d || {}, u, 'M_LOKASI'); };
  h['delete_lokasi']   = function (d, u) { return deleteGuarded_('M_LOKASI', 'lokasi_id', d || {}, u); };

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

  // T_LAMPIRAN
  h['get_lampiran_list'] = function (d) { return getGenericList_('T_LAMPIRAN', d || {}); };
  h['save_lampiran']     = function (d, u) { return saveGeneric_('T_LAMPIRAN', d || {}, u); };
  h['delete_lampiran']   = function (d, u) { return deleteGeneric_('T_LAMPIRAN', d || {}, u); };

  // T_APPROVAL
  h['get_approval_list']   = function (d) { return getGenericList_('T_APPROVAL', d || {}); };
  h['save_approval']       = function (d, u) { return saveGeneric_('T_APPROVAL', d || {}, u); };
  h['delete_approval']     = function (d, u) { return deleteGeneric_('T_APPROVAL', d || {}, u); };
  h['verifikasi_approval'] = function (d, u) { return verifikasiApproval_(d || {}, u); };

  // Laporan (12) — L1..L12
  h['lap_kategori']      = function (d) { return lapKategori_(d || {}); };
  h['lap_jenis']         = function (d) { return lapJenis_(d || {}); };
  h['lap_lokasi']        = function (d) { return lapLokasi_(d || {}); };
  h['lap_periode']       = function (d) { return lapPeriode_(d || {}); };
  h['lap_pegawai']       = function (d) { return lapPegawai_(d || {}); };
  h['lap_status']        = function (d) { return lapStatus_(d || {}); };
  h['lap_satuan']        = function (d) { return lapSatuan_(d || {}); };
  h['lap_jenis_periode'] = function (d) { return lapJenisPeriode_(d || {}); };
  h['lap_jenis_lokasi']  = function (d) { return lapJenisLokasi_(d || {}); };
  h['lap_detail_utama']  = function (d) { return getUtamaList_(d || {}); };
  h['lap_lampiran']      = function (d) { return lapLampiran_(d || {}); };
  h['lap_approval']      = function (d) { return lapApproval_(d || {}); };

  // Analisa (8) — A1..A8
  h['analisa_distribusi_lokasi']     = function (d) { return analisaDistribusi_(d || {}, 'lokasi_id'); };
  h['analisa_distribusi_jenis']      = function (d) { return analisaDistribusi_(d || {}, 'jenis_id'); };
  h['analisa_top_pegawai']           = function (d) { return analisaTopPegawai_(d || {}); };
  h['analisa_beban_lokasi']          = function (d) { return analisaBebanLokasi_(d || {}); };
  h['analisa_korelasi_jenis_lokasi'] = function (d) { return analisaKorelasi_(d || {}); };
  h['analisa_tren_periode']          = function (d) { return analisaTrenPeriode_(d || {}); };
  h['analisa_umur_data']             = function (d) { return analisaUmurData_(d || {}); };
  h['analisa_sla_approval']          = function (d) { return analisaSlaApproval_(d || {}); };

  // Evaluasi (6) — E1..E6
  h['evaluasi_kelengkapan']       = function (d) { return evaluasiKelengkapan_(d || {}); };
  h['evaluasi_sla_verifikasi']    = function (d) { return evaluasiSlaVerifikasi_(d || {}); };
  h['evaluasi_kepatuhan_periode'] = function (d) { return evaluasiKepatuhanPeriode_(d || {}); };
  h['evaluasi_kualitas_data']      = function (d) { return evaluasiKualitasData_(d || {}); };
  h['evaluasi_lampiran']          = function (d) { return evaluasiLampiran_(d || {}); };
  h['evaluasi_rtl_terbuka']       = function (d) { return evaluasiRtlTerbuka_(d || {}); };

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

// ==================== §3 LOOKUPS & NAMA ====================

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

// Master satelit v2.11: 5 master + pegawai (lean, untuk lookup nama di UI)
function getMasterSatelit_() {
  try {
    var pegawai = getSheetData_('PEGAWAI').map(function (p) {
      return { pegawai_id: p.pegawai_id || p.id, nama: p.nama || p.nama_lengkap || '', unit_id: p.unit_id || '' };
    });
    return {
      success: true,
      data: {
        kategori: getSheetData_('M_KATEGORI'),
        jenis:    getSheetData_('M_JENIS'),
        periode:  getSheetData_('M_PERIODE'),
        satuan:   getSheetData_('M_SATUAN'),
        lokasi:   getSheetData_('M_LOKASI'),
        pegawai:  pegawai
      }
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Nama map: id → nama (fallback id) — untuk output "nama, bukan ID"
function namaMap_(sheet, namaField) {
  var m = {};
  var rows = getSheetData_(sheet) || [];
  rows.forEach(function (r) {
    var k = String(r.id || r.pegawai_id || '').trim();
    if (k) m[k] = r[namaField] || r.kode || k;
  });
  return m;
}

function namaPegawaiMap_() {
  var m = {};
  (getSheetData_('PEGAWAI') || []).forEach(function (p) {
    var k = String(p.pegawai_id || p.id || '').trim();
    if (k) m[k] = p.nama || p.nama_lengkap || k;
  });
  return m;
}

// ==================== §4 DASHBOARD (4 kartu + 4 chart + 4 panel) ====================
// SEMUA dihitung di server dari data penuh — tidak memakai sample halaman.

function getDashboard_(user) {
  try {
    var utama    = getSheetData_('T_UTAMA');
    var approval = getSheetData_('T_APPROVAL');
    var rtl      = getSheetData_('T_TINDAK_LANJUT');
    var lampiran = getSheetData_('T_LAMPIRAN');
    var namaJenis   = namaMap_('M_JENIS', 'nama');
    var namaKategori = namaMap_('M_KATEGORI', 'nama');
    var namaLokasi  = namaMap_('M_LOKASI', 'nama');
    var namaPegawai = namaPegawaiMap_();

    // ---------- 4 KARTU SUMMARY ----------
    var totalUtama = utama.length;
    var totalSelesai = utama.filter(function (r) { return String(r.status).toLowerCase() === 'selesai'; }).length;
    var approvalMenunggu = approval.filter(function (r) { return String(r.status).toLowerCase() === 'menunggu'; }).length;
    var rtlTerbuka = rtl.filter(function (r) {
      var s = String(r.status_rtl || r.status).toLowerCase();
      return s === 'baru' || s === 'diproses';
    }).length;

    // ---------- CHART 1: tren 12 bulan (dari tanggal T_UTAMA) ----------
    var now = new Date();
    var trendKeys = [], trendCounts = {};
    for (var i = 11; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      trendKeys.push(k);
      trendCounts[k] = 0;
    }
    utama.forEach(function (r) {
      var k2 = String(r.tanggal || r.created_at || '').slice(0, 7);
      if (trendCounts[k2] !== undefined) trendCounts[k2]++;
    });
    var names = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
    var trendLabels = trendKeys.map(function (k) {
      var p = k.split('-');
      return names[Number(p[1]) - 1] + ' ' + p[0].slice(2);
    });

    // ---------- CHART 2/3/4: distribusi per jenis/kategori/lokasi ----------
    function distribusi_(field, namaM) {
      var m = {};
      utama.forEach(function (r) {
        var k = String(r[field] || '').trim() || 'tanpa';
        m[k] = (m[k] || 0) + 1;
      });
      var keys = Object.keys(m).sort(function (a, b) { return m[b] - m[a]; });
      if (keys.length > 8) keys = keys.slice(0, 8);
      return {
        labels: keys.map(function (k) { return k === 'tanpa' ? 'Tanpa' : (namaM[k] || k); }),
        counts: keys.map(function (k) { return m[k]; })
      };
    }
    var chartJenis     = distribusi_('jenis_id', namaJenis);
    var chartKategori  = distribusi_('kategori_id', namaKategori);
    var chartLokasi    = distribusi_('lokasi_id', namaLokasi);

    // ---------- 4 PANEL ----------
    var byDateDesc = function (a, b) {
      var ta = CoreLib.dateKey10(a.tanggal) || String(a.created_at || '').slice(0, 10);
      var tb = CoreLib.dateKey10(b.tanggal) || String(b.created_at || '').slice(0, 10);
      return ta < tb ? 1 : (ta > tb ? -1 : 0);
    };
    var panelTerbaru = utama.slice().sort(byDateDesc).slice(0, 5).map(function (r) {
      return { id: r.id, kode: r.kode, judul: r.judul, tanggal: CoreLib.dateKey10(r.tanggal), status: r.status, pegawai: r.pegawai_id, pegawai_nama: namaPegawai[r.pegawai_id] || '' };
    });

    var utamaMap = {};
    utama.forEach(function (r) { utamaMap[String(r.id)] = r; });
    var panelApproval = approval.filter(function (r) { return String(r.status).toLowerCase() === 'menunggu'; }).slice(0, 5).map(function (r) {
      var u = utamaMap[String(r.utama_id)] || {};
      return { id: r.id, urutan: r.urutan, utama_id: r.utama_id, kode: u.kode || '', judul: u.judul || '', dibuat: String(r.created_at || '').slice(0, 10) };
    });

    var panelRtl = rtl.filter(function (r) {
      var s = String(r.status_rtl || r.status).toLowerCase();
      return s === 'baru' || s === 'diproses';
    }).slice(0, 5).map(function (r) {
      return { id: r.id, judul: r.judul_rtl, sumber: r.sumber_evaluasi, status: r.status_rtl || r.status, progress_pct: r.progress_pct || 0, due_date: r.due_date };
    });

    var panelTidakLengkap = utama.filter(function (r) {
      return !String(r.judul || '').trim() || !r.jenis_id || !r.lokasi_id || !r.periode_id || !r.tanggal;
    }).slice(0, 5).map(function (r) {
      var kurang = [];
      if (!String(r.judul || '').trim()) kurang.push('judul');
      if (!r.jenis_id) kurang.push('jenis');
      if (!r.lokasi_id) kurang.push('lokasi');
      if (!r.periode_id) kurang.push('periode');
      if (!r.tanggal) kurang.push('tanggal');
      return { id: r.id, kode: r.kode, judul: r.judul || '(tanpa judul)', kurang: kurang.join(', ') };
    });

    return {
      success: true,
      data: {
        // 4 kartu
        summary: {
          totalUtama: totalUtama,
          totalSelesai: totalSelesai,
          approvalMenunggu: approvalMenunggu,
          rtlTerbuka: rtlTerbuka
        },
        // 4 chart
        chartTren: { labels: trendLabels, counts: trendKeys.map(function (k) { return trendCounts[k]; }) },
        chartJenis: chartJenis,
        chartKategori: chartKategori,
        chartLokasi: chartLokasi,
        // 4 panel
        panelTerbaru: panelTerbaru,
        panelApproval: panelApproval,
        panelRtl: panelRtl,
        panelTidakLengkap: panelTidakLengkap,
        // meta
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
    // urut berdasarkan kolom 'urutan' bila ada
    if (list.length && list[0].urutan !== undefined) {
      list = list.slice().sort(function (a, b) { return (Number(a.urutan) || 99) - (Number(b.urutan) || 99); });
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

// Master sederhana dengan kode+nama wajib (M_SATUAN, M_LOKASI)
function saveMasterKode_(data, user, sheetName) {
  try {
    var record = data.record || data;
    if (!String(record.kode || '').trim() || !String(record.nama || '').trim()) {
      return { success: false, code: 'BAD_REQUEST', error: 'Kode dan nama wajib.' };
    }
    if (record.status_aktif !== undefined) record.status_aktif = String(record.status_aktif).toLowerCase() === 'false' ? 'false' : 'true';
    else record.status_aktif = 'true';
    normalizeEntityIdFields_(record);
    var saved = saveRecord_(sheetName, record, user);
    return { success: true, data: saved };
  } catch (err) {
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// Cek apakah nilai field sudah dipakai di sheet lain (guard referensial)
function referencedIn_(field, value, sheetName) {
  var v = String(value || '').trim();
  if (!v) return false;
  return (getSheetData_(sheetName) || []).some(function (r) {
    return String(r[field] || '').trim() === v;
  });
}

// Delete master dengan guard: ditolak jika masih dirujuk T_UTAMA
function deleteGuarded_(sheetName, refField, data, user) {
  try {
    if (!data || !data.id) return { success: false, code: 'BAD_REQUEST', error: 'ID tidak valid.' };
    if (referencedIn_(refField, data.id, 'T_UTAMA')) {
      return { success: false, code: 'BAD_REQUEST', error: 'Masih dipakai T_UTAMA — pindahkan datanya dulu.' };
    }
    var ok = softDeleteRecord_(sheetName, data.id, user);
    return { success: ok, message: ok ? 'Dihapus.' : 'Tidak ditemukan.' };
  } catch (err) {
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §6 DOMAIN: 5 MASTER ====================

// M_KATEGORI — hierarki (parent_id) + guard anak & referensi
function getKategoriList_(params) {
  try {
    var list = getSheetData_('M_KATEGORI');
    if (params.only_active) list = list.filter(function (r) { return CoreLib.normStr(r.status_aktif) !== 'false'; });
    if (params.parent_id) list = list.filter(function (r) { return CoreLib.normStr(r.parent_id) === CoreLib.normStr(params.parent_id); });
    if (params.search) {
      var q = CoreLib.normStr(params.search);
      list = list.filter(function (r) { return CoreLib.matchSearch(r, q, ['kode', 'nama', 'deskripsi']); });
    }
    list = list.slice().sort(function (a, b) { return (Number(a.urutan) || 99) - (Number(b.urutan) || 99); });
    return { success: true, data: list, total: list.length };
  } catch (err) { return { success: false, error: err.message }; }
}

function saveKategori_(data, user) {
  try {
    var record = data.record || data;
    if (!String(record.kode || '').trim() || !String(record.nama || '').trim()) {
      return { success: false, code: 'BAD_REQUEST', error: 'Kode dan nama wajib.' };
    }
    normalizeEntityIdFields_(record);
    if (record.parent_id) {
      if (record.parent_id === record.id) {
        return { success: false, code: 'BAD_REQUEST', error: 'Parent tidak boleh dirinya sendiri.' };
      }
      if (!findRecordById_('M_KATEGORI', record.parent_id)) {
        return { success: false, code: 'BAD_REQUEST', error: 'Parent tidak ditemukan.' };
      }
    }
    if (record.status_aktif !== undefined) record.status_aktif = String(record.status_aktif).toLowerCase() === 'false' ? 'false' : 'true';
    else record.status_aktif = 'true';
    var saved = saveRecord_('M_KATEGORI', record, user);
    return { success: true, data: saved };
  } catch (err) { return { success: false, code: 'BAD_REQUEST', error: err.message }; }
}

function deleteKategori_(data, user) {
  try {
    if (!data || !data.id) return { success: false, code: 'BAD_REQUEST', error: 'ID tidak valid.' };
    var punyaAnak = (getSheetData_('M_KATEGORI') || []).some(function (r) {
      return CoreLib.normStr(r.parent_id) === CoreLib.normStr(data.id);
    });
    if (punyaAnak) return { success: false, code: 'BAD_REQUEST', error: 'Masih punya anak — hapus anak dulu.' };
    if (referencedIn_('kategori_id', data.id, 'T_UTAMA')) {
      return { success: false, code: 'BAD_REQUEST', error: 'Masih dipakai T_UTAMA — pindahkan datanya dulu.' };
    }
    var ok = softDeleteRecord_('M_KATEGORI', data.id, user);
    return { success: ok, message: ok ? 'Dihapus.' : 'Tidak ditemukan.' };
  } catch (err) { return { success: false, code: 'BAD_REQUEST', error: err.message }; }
}

// M_JENIS — wajib: kode+nama; kategori_id harus ada; periode dari daftar valid
var PERIODE_VALID_ = ['Tahunan', 'Bulanan', 'Periodik', 'Fleksibel'];

function saveJenis_(data, user) {
  try {
    var record = data.record || data;
    if (!String(record.kode || '').trim() || !String(record.nama || '').trim()) {
      return { success: false, code: 'BAD_REQUEST', error: 'Kode dan nama wajib.' };
    }
    normalizeEntityIdFields_(record);
    if (record.kategori_id && !findRecordById_('M_KATEGORI', record.kategori_id)) {
      return { success: false, code: 'BAD_REQUEST', error: 'Kategori tidak ditemukan.' };
    }
    if (record.periode && PERIODE_VALID_.indexOf(String(record.periode)) === -1) {
      return { success: false, code: 'BAD_REQUEST', error: 'Periode harus: ' + PERIODE_VALID_.join(', ') };
    }
    if (!record.periode) record.periode = 'Fleksibel';
    if (record.status_aktif !== undefined) record.status_aktif = String(record.status_aktif).toLowerCase() === 'false' ? 'false' : 'true';
    else record.status_aktif = 'true';
    var saved = saveRecord_('M_JENIS', record, user);
    return { success: true, data: saved };
  } catch (err) { return { success: false, code: 'BAD_REQUEST', error: err.message }; }
}

// M_PERIODE — kode auto (YYYY untuk tahun, YYYY-MM untuk bulan)
function savePeriode_(data, user) {
  try {
    var record = data.record || data;
    var tahun = String(record.tahun || '').trim();
    var bulan = String(record.bulan || '').trim();
    if (!/^\d{4}$/.test(tahun)) return { success: false, code: 'BAD_REQUEST', error: 'Tahun wajib (4 digit).' };
    if (bulan && !/^\d{1,2}$/.test(bulan) && !/^\d{2}$/.test(bulan)) {
      return { success: false, code: 'BAD_REQUEST', error: 'Bulan harus 1-12.' };
    }
    if (bulan) {
      var b = Number(bulan);
      if (b < 1 || b > 12) return { success: false, code: 'BAD_REQUEST', error: 'Bulan harus 1-12.' };
      if (!record.kode) record.kode = tahun + '-' + String(b).padStart(2, '0');
      if (!record.label) record.label = 'Bulan ' + b + '/' + tahun;
      record.bulan = String(b).padStart(2, '0');
    } else {
      if (!record.kode) record.kode = tahun;
      if (!record.label) record.label = 'Tahun ' + tahun;
    }
    record.tahun = tahun;
    if (record.status_aktif !== undefined) record.status_aktif = String(record.status_aktif).toLowerCase() === 'false' ? 'false' : 'true';
    else record.status_aktif = 'true';
    var saved = saveRecord_('M_PERIODE', record, user);
    return { success: true, data: saved };
  } catch (err) { return { success: false, code: 'BAD_REQUEST', error: err.message }; }
}

// ==================== §7 DOMAIN: T_UTAMA ====================

function getUtamaList_(params) {
  try {
    var list = getSheetData_('T_UTAMA');
    if (params.status) list = list.filter(function (r) { return CoreLib.normStr(r.status) === CoreLib.normStr(params.status); });
    if (params.jenis_id) list = list.filter(function (r) { return CoreLib.normStr(r.jenis_id) === CoreLib.normStr(params.jenis_id); });
    if (params.lokasi_id) list = list.filter(function (r) { return CoreLib.normStr(r.lokasi_id) === CoreLib.normStr(params.lokasi_id); });
    if (params.kategori_id) list = list.filter(function (r) { return CoreLib.normStr(r.kategori_id) === CoreLib.normStr(params.kategori_id); });
    if (params.pegawai_id) list = list.filter(function (r) { return CoreLib.normStr(r.pegawai_id) === CoreLib.normStr(params.pegawai_id); });
    if (params.tahun) {
      var th = String(params.tahun);
      list = list.filter(function (r) {
        var t = CoreLib.dateKey10(r.tanggal) || '';
        return t.indexOf(th) === 0;
      });
    }
    if (params.search) {
      var q = CoreLib.normStr(params.search);
      list = list.filter(function (r) { return CoreLib.matchSearch(r, q, ['kode', 'judul', 'deskripsi', 'catatan']); });
    }
    list = list.slice().sort(function (a, b) {
      var ta = CoreLib.dateKey10(a.tanggal) || String(a.created_at || '').slice(0, 10);
      var tb = CoreLib.dateKey10(b.tanggal) || String(b.created_at || '').slice(0, 10);
      return ta < tb ? 1 : (ta > tb ? -1 : 0);
    });
    // Paginasi server-side (single source of pagination — aturan ekosistem)
    var page = Number(params.page) || 1;
    var perPage = Number(params.per_page) || 20;
    var total = list.length;
    var totalPages = Math.max(1, Math.ceil(total / perPage));
    var start = (page - 1) * perPage;
    return {
      success: true,
      data: list.slice(start, start + perPage).map(function (r) { return Object.assign({}, r); }),
      total: total,
      total_pages: totalPages,
      page: page,
      per_page: perPage
    };
  } catch (err) { return { success: false, error: err.message }; }
}

function getUtamaDetail_(data) {
  try {
    if (!data || !data.id) return { success: false, code: 'BAD_REQUEST', error: 'ID wajib.' };
    var row = findRecordById_('T_UTAMA', data.id);
    if (!row) return { success: false, code: 'NOT_FOUND', error: 'Tidak ditemukan.' };
    var out = Object.assign({}, row);
    out.items = (getSheetData_('T_ITEM') || []).filter(function (i) { return CoreLib.normStr(i.utama_id) === CoreLib.normStr(row.id); });
    out.lampiran = (getSheetData_('T_LAMPIRAN') || []).filter(function (i) { return CoreLib.normStr(i.utama_id) === CoreLib.normStr(row.id); });
    out.approvals = (getSheetData_('T_APPROVAL') || []).filter(function (i) { return CoreLib.normStr(i.utama_id) === CoreLib.normStr(row.id); });
    return { success: true, data: out };
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
    // FK soft-check: tidak blokir, tapi flag jika yatim (E4 yang menghitung)
    var saved = saveRecord_('T_UTAMA', record, user);
    return { success: true, data: saved };
  } catch (err) { return { success: false, code: 'BAD_REQUEST', error: err.message }; }
}

function deleteUtama_(data, user) {
  try {
    if (!data || !data.id) return { success: false, code: 'BAD_REQUEST', error: 'ID tidak valid.' };
    var ok = softDeleteRecord_('T_UTAMA', data.id, user);
    return { success: ok, message: ok ? 'Dihapus.' : 'Tidak ditemukan.' };
  } catch (err) { return { success: false, code: 'BAD_REQUEST', error: err.message }; }
}

// ==================== §8 T_APPROVAL VERIFIKASI ====================

function verifikasiApproval_(data, user) {
  try {
    var isVerifikator = user && ['verifikator', 'admin', 'super'].indexOf(String(user.role).toLowerCase()) !== -1;
    if (!isVerifikator) return { success: false, code: 'FORBIDDEN', error: 'Hanya verifikator/admin.' };
    var id = data.id;
    var status = String(data.status || '').toLowerCase().trim();
    if (!id) return { success: false, code: 'BAD_REQUEST', error: 'ID wajib.' };
    if (['disetujui', 'ditolak', 'revisi'].indexOf(status) === -1) {
      return { success: false, code: 'BAD_REQUEST', error: 'Status harus disetujui/ditolak/revisi.' };
    }
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

// ==================== §9 LAPORAN (12) ====================
// Filter tahun: ambil T_UTAMA dengan tanggal di tahun param (default tahun ini).

function filterTahun_(utama, tahun) {
  var th = String(tahun || new Date().getFullYear());
  return utama.filter(function (r) {
    var t = CoreLib.dateKey10(r.tanggal) || '';
    return t.indexOf(th) === 0;
  });
}

// L1 — per Kategori (rollup hierarki: jml = langsung, jml_total = termasuk anak)
function lapKategori_(params) {
  try {
    var utama = getSheetData_('T_UTAMA');
    var tahun = String(params.tahun || new Date().getFullYear());
    var filtered = filterTahun_(utama, tahun);
    var kat = getSheetData_('M_KATEGORI');
    var namaK = {};
    kat.forEach(function (k) { namaK[String(k.id)] = k.nama || k.kode; });

    var map = {};
    filtered.forEach(function (r) {
      var k = String(r.kategori_id || 'tanpa');
      map[k] = (map[k] || 0) + 1;
    });
    var rekap = kat.map(function (k) {
      return { kategori_id: k.id, kategori_nama: k.nama || k.kode, parent_id: k.parent_id || '', jml: map[String(k.id)] || 0 };
    });
    // rollup: tambah jml anak ke parent
    rekap.forEach(function (row) {
      if (!row.parent_id) return;
      var parent = rekap.find(function (x) { return String(x.kategori_id) === String(row.parent_id); });
      if (parent) parent.jml_total = (parent.jml_total || parent.jml) + row.jml;
    });
    rekap.forEach(function (row) { if (row.jml_total === undefined) row.jml_total = row.jml; });
    rekap.sort(function (a, b) { return b.jml_total - a.jml_total; });
    return { success: true, data: { tahun: tahun, total: filtered.length, rekap: rekap } };
  } catch (err) { return { success: false, error: err.message }; }
}

// L2 — per Jenis (+ total nilai)
function lapJenis_(params) {
  try {
    var utama = getSheetData_('T_UTAMA');
    var tahun = String(params.tahun || new Date().getFullYear());
    var filtered = filterTahun_(utama, tahun);
    var namaJ = namaMap_('M_JENIS', 'nama');
    var map = {};
    filtered.forEach(function (r) {
      var k = String(r.jenis_id || 'tanpa');
      if (!map[k]) map[k] = { jenis_id: k, jenis_nama: namaJ[k] || k, jml: 0, total_nilai: 0 };
      map[k].jml++;
      map[k].total_nilai += Number(r.nilai) || 0;
    });
    var rekap = Object.keys(map).map(function (k) { return map[k]; });
    rekap.sort(function (a, b) { return b.jml - a.jml; });
    return { success: true, data: { tahun: tahun, total: filtered.length, rekap: rekap } };
  } catch (err) { return { success: false, error: err.message }; }
}

// L3 — per Lokasi
function lapLokasi_(params) {
  try {
    var utama = getSheetData_('T_UTAMA');
    var tahun = String(params.tahun || new Date().getFullYear());
    var filtered = filterTahun_(utama, tahun);
    var namaL = namaMap_('M_LOKASI', 'nama');
    var map = {};
    filtered.forEach(function (r) {
      var k = String(r.lokasi_id || 'tanpa');
      map[k] = (map[k] || 0) + 1;
    });
    var rekap = Object.keys(map).map(function (k) {
      return { lokasi_id: k, lokasi_nama: namaL[k] || (k === 'tanpa' ? 'Tanpa lokasi' : k), jml: map[k] };
    });
    rekap.sort(function (a, b) { return b.jml - a.jml; });
    return { success: true, data: { tahun: tahun, total: filtered.length, rekap: rekap } };
  } catch (err) { return { success: false, error: err.message }; }
}

// L4 — per Periode (YYYY-MM dari tanggal; 'tanpa' bila kosong)
function lapPeriode_(params) {
  try {
    var utama = getSheetData_('T_UTAMA');
    var tahun = String(params.tahun || new Date().getFullYear());
    var filtered = filterTahun_(utama, tahun);
    var map = {};
    filtered.forEach(function (r) {
      var k = (CoreLib.dateKey10(r.tanggal) || 'tanpa').slice(0, 7);
      map[k] = (map[k] || 0) + 1;
    });
    var rekap = Object.keys(map).sort().map(function (k) {
      return { periode: k, jml: map[k] };
    });
    return { success: true, data: { tahun: tahun, total: filtered.length, rekap: rekap } };
  } catch (err) { return { success: false, error: err.message }; }
}

// L5 — per Pegawai (penanggung jawab, nama dari PEGAWAI)
function lapPegawai_(params) {
  try {
    var utama = getSheetData_('T_UTAMA');
    var tahun = String(params.tahun || new Date().getFullYear());
    var filtered = filterTahun_(utama, tahun);
    var namaP = namaPegawaiMap_();
    var map = {};
    filtered.forEach(function (r) {
      var k = String(r.pegawai_id || 'tanpa');
      map[k] = (map[k] || 0) + 1;
    });
    var rekap = Object.keys(map).map(function (k) {
      return { pegawai_id: k, pegawai_nama: namaP[k] || (k === 'tanpa' ? 'Tanpa penanggung jawab' : k), jml: map[k] };
    });
    rekap.sort(function (a, b) { return b.jml - a.jml; });
    return { success: true, data: { tahun: tahun, total: filtered.length, rekap: rekap } };
  } catch (err) { return { success: false, error: err.message }; }
}

// L6 — per Status
function lapStatus_(params) {
  try {
    var utama = getSheetData_('T_UTAMA');
    var tahun = String(params.tahun || new Date().getFullYear());
    var filtered = filterTahun_(utama, tahun);
    var map = {};
    filtered.forEach(function (r) {
      var k = String(r.status || 'draft');
      map[k] = (map[k] || 0) + 1;
    });
    var rekap = Object.keys(map).map(function (k) { return { status: k, jml: map[k] }; });
    rekap.sort(function (a, b) { return b.jml - a.jml; });
    return { success: true, data: { tahun: tahun, total: filtered.length, rekap: rekap } };
  } catch (err) { return { success: false, error: err.message }; }
}

// L7 — per Satuan (jumlah agregat)
function lapSatuan_(params) {
  try {
    var utama = getSheetData_('T_UTAMA');
    var tahun = String(params.tahun || new Date().getFullYear());
    var filtered = filterTahun_(utama, tahun);
    var namaS = namaMap_('M_SATUAN', 'nama');
    var map = {};
    filtered.forEach(function (r) {
      var k = String(r.satuan_id || 'tanpa');
      if (!map[k]) map[k] = { satuan_id: k, satuan_nama: namaS[k] || (k === 'tanpa' ? 'Tanpa satuan' : k), jml_data: 0, total_jumlah: 0 };
      map[k].jml_data++;
      map[k].total_jumlah += Number(r.jumlah) || 0;
    });
    var rekap = Object.keys(map).map(function (k) { return map[k]; });
    rekap.sort(function (a, b) { return b.jml_data - a.jml_data; });
    return { success: true, data: { tahun: tahun, total: filtered.length, rekap: rekap } };
  } catch (err) { return { success: false, error: err.message }; }
}

// L8 — matriks Jenis × Tahun (per jenis: rekap per tahun)
function lapJenisPeriode_(params) {
  try {
    var utama = getSheetData_('T_UTAMA');
    var tahun = String(params.tahun || new Date().getFullYear());
    var filtered = filterTahun_(utama, tahun);
    var namaJ = namaMap_('M_JENIS', 'nama');
    var map = {};
    filtered.forEach(function (r) {
      var k = String(r.jenis_id || 'tanpa');
      var th = (CoreLib.dateKey10(r.tanggal) || 'tanpa').slice(0, 4);
      if (!map[k]) map[k] = {};
      map[k][th] = (map[k][th] || 0) + 1;
    });
    var rekap = Object.keys(map).map(function (k) {
      var rows = Object.keys(map[k]).sort().map(function (th) { return { tahun: th, jml: map[k][th] }; });
      return { jenis_id: k, jenis_nama: namaJ[k] || k, rekap: rows };
    });
    rekap.sort(function (a, b) {
      var ta = a.rekap.reduce(function (s, r) { return s + r.jml; }, 0);
      var tb = b.rekap.reduce(function (s, r) { return s + r.jml; }, 0);
      return tb - ta;
    });
    return { success: true, data: { tahun: tahun, total: filtered.length, rekap: rekap } };
  } catch (err) { return { success: false, error: err.message }; }
}

// L9 — matriks Jenis × Lokasi
function lapJenisLokasi_(params) {
  try {
    var utama = getSheetData_('T_UTAMA');
    var tahun = String(params.tahun || new Date().getFullYear());
    var filtered = filterTahun_(utama, tahun);
    var namaJ = namaMap_('M_JENIS', 'nama');
    var namaL = namaMap_('M_LOKASI', 'nama');
    var map = {};
    filtered.forEach(function (r) {
      var k = String(r.jenis_id || 'tanpa');
      var l = String(r.lokasi_id || 'tanpa');
      if (!map[k]) map[k] = {};
      map[k][l] = (map[k][l] || 0) + 1;
    });
    var rekap = Object.keys(map).map(function (k) {
      var rows = Object.keys(map[k]).map(function (l) {
        return { lokasi_id: l, lokasi_nama: namaL[l] || (l === 'tanpa' ? 'Tanpa lokasi' : l), jml: map[k][l] };
      }).sort(function (a, b) { return b.jml - a.jml; });
      return { jenis_id: k, jenis_nama: namaJ[k] || k, rekap: rows };
    });
    return { success: true, data: { tahun: tahun, total: filtered.length, rekap: rekap } };
  } catch (err) { return { success: false, error: err.message }; }
}

// L10 — detail T_UTAMA (sama dengan getUtamaList_: filter + paginasi)
// (ditangani handler → getUtamaList_)

// L11 — rekap lampiran per T_UTAMA
function lapLampiran_(params) {
  try {
    var utama = getSheetData_('T_UTAMA');
    var tahun = String(params.tahun || new Date().getFullYear());
    var filtered = filterTahun_(utama, tahun);
    var lmp = getSheetData_('T_LAMPIRAN');
    var rekap = filtered.map(function (u) {
      var milik = lmp.filter(function (l) { return CoreLib.normStr(l.utama_id) === CoreLib.normStr(u.id); });
      return {
        utama_id: u.id,
        kode: u.kode,
        judul: u.judul,
        jml_lampiran: milik.length,
        lampiran: milik.map(function (l) { return { id: l.id, nama_file: l.nama_file, jenis_lampiran: l.jenis_lampiran, url: l.url }; })
      };
    }).sort(function (a, b) { return b.jml_lampiran - a.jml_lampiran; });
    return { success: true, data: { tahun: tahun, total: filtered.length, rekap: rekap } };
  } catch (err) { return { success: false, error: err.message }; }
}

// L12 — rekap approval per status + menanti
function lapApproval_(params) {
  try {
    var approval = getSheetData_('T_APPROVAL');
    var utama = getSheetData_('T_UTAMA');
    var utamaMap = {};
    utama.forEach(function (u) { utamaMap[String(u.id)] = u; });
    var map = {};
    approval.forEach(function (r) {
      var k = String(r.status || 'menunggu');
      map[k] = (map[k] || 0) + 1;
    });
    var rekapStatus = Object.keys(map).map(function (k) { return { status: k, jml: map[k] }; });
    var menanti = approval.filter(function (r) { return String(r.status).toLowerCase() === 'menunggu'; }).slice(0, 20).map(function (r) {
      var u = utamaMap[String(r.utama_id)] || {};
      return { id: r.id, urutan: r.urutan, utama_id: r.utama_id, kode: u.kode || '', judul: u.judul || '', dibuat: String(r.created_at || '').slice(0, 10) };
    });
    return { success: true, data: { total: approval.length, rekap_status: rekapStatus, menanti: menanti } };
  } catch (err) { return { success: false, error: err.message }; }
}

// ==================== §10 ANALISA (8) ====================

// A1/A2 — distribusi (lokasi atau jenis) + persen
function analisaDistribusi_(params, field) {
  try {
    var utama = getSheetData_('T_UTAMA');
    var tahun = String(params.tahun || new Date().getFullYear());
    var filtered = filterTahun_(utama, tahun);
    var namaM = field === 'jenis_id' ? namaMap_('M_JENIS', 'nama') : namaMap_('M_LOKASI', 'nama');
    var map = {};
    filtered.forEach(function (r) {
      var k = String(r[field] || 'tanpa');
      map[k] = (map[k] || 0) + 1;
    });
    var distribusi = Object.keys(map).map(function (k) {
      return {
        id: k,
        nama: namaM[k] || (k === 'tanpa' ? 'Tanpa' : k),
        jumlah: map[k],
        pct: filtered.length ? Math.round(map[k] / filtered.length * 100) : 0
      };
    });
    distribusi.sort(function (a, b) { return b.jumlah - a.jumlah; });
    return { success: true, data: { tahun: tahun, total: filtered.length, distribusi: distribusi } };
  } catch (err) { return { success: false, error: err.message }; }
}

// A3 — Top N penanggung jawab
function analisaTopPegawai_(params) {
  try {
    var utama = getSheetData_('T_UTAMA');
    var tahun = String(params.tahun || new Date().getFullYear());
    var filtered = filterTahun_(utama, tahun);
    var namaP = namaPegawaiMap_();
    var n = Number(params.limit) || 5;
    var map = {};
    filtered.forEach(function (r) {
      var k = String(r.pegawai_id || 'tanpa');
      map[k] = (map[k] || 0) + 1;
    });
    var top = Object.keys(map).map(function (k) {
      return { pegawai_id: k, nama: namaP[k] || (k === 'tanpa' ? 'Tanpa penanggung jawab' : k), jumlah: map[k] };
    });
    top.sort(function (a, b) { return b.jumlah - a.jumlah; });
    return { success: true, data: { tahun: tahun, total: filtered.length, top: top.slice(0, n) } };
  } catch (err) { return { success: false, error: err.message }; }
}

// A4 — beban per lokasi (total/selesai/belum)
function analisaBebanLokasi_(params) {
  try {
    var utama = getSheetData_('T_UTAMA');
    var tahun = String(params.tahun || new Date().getFullYear());
    var filtered = filterTahun_(utama, tahun);
    var namaL = namaMap_('M_LOKASI', 'nama');
    var map = {};
    filtered.forEach(function (r) {
      var k = String(r.lokasi_id || 'tanpa');
      if (!map[k]) map[k] = { lokasi_id: k, nama: namaL[k] || k, total: 0, selesai: 0, belum: 0 };
      map[k].total++;
      if (String(r.status).toLowerCase() === 'selesai') map[k].selesai++;
      else map[k].belum++;
    });
    var beban = Object.keys(map).map(function (k) { return map[k]; });
    beban.sort(function (a, b) { return b.total - a.total; });
    return { success: true, data: { tahun: tahun, total: filtered.length, beban: beban } };
  } catch (err) { return { success: false, error: err.message }; }
}

// A5 — korelasi Jenis × Lokasi (matrix)
function analisaKorelasi_(params) {
  try {
    var utama = getSheetData_('T_UTAMA');
    var tahun = String(params.tahun || new Date().getFullYear());
    var filtered = filterTahun_(utama, tahun);
    var namaJ = namaMap_('M_JENIS', 'nama');
    var namaL = namaMap_('M_LOKASI', 'nama');
    var map = {};
    var jenisSet = {};
    var lokasiSet = {};
    filtered.forEach(function (r) {
      var k = String(r.jenis_id || 'tanpa');
      var l = String(r.lokasi_id || 'tanpa');
      jenisSet[k] = 1;
      lokasiSet[l] = 1;
      if (!map[k]) map[k] = {};
      map[k][l] = (map[k][l] || 0) + 1;
    });
    var jenis = Object.keys(jenisSet).map(function (k) { return { id: k, nama: namaJ[k] || k }; });
    var lokasi = Object.keys(lokasiSet).map(function (k) { return { id: k, nama: namaL[k] || k }; });
    var cells = [];
    Object.keys(map).forEach(function (k) {
      Object.keys(map[k]).forEach(function (l) {
        cells.push({ jenis_id: k, lokasi_id: l, jml: map[k][l] });
      });
    });
    cells.sort(function (a, b) { return b.jml - a.jml; });
    return { success: true, data: { tahun: tahun, total: filtered.length, jenis: jenis, lokasi: lokasi, cells: cells } };
  } catch (err) { return { success: false, error: err.message }; }
}

// A6 — tren jumlah per periode (12 titik terakhir, dari tanggal)
function analisaTrenPeriode_(params) {
  try {
    var utama = getSheetData_('T_UTAMA');
    var now = new Date();
    var keys = [], counts = {};
    for (var i = 11; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      keys.push(k);
      counts[k] = 0;
    }
    utama.forEach(function (r) {
      var k2 = String(r.tanggal || r.created_at || '').slice(0, 7);
      if (counts[k2] !== undefined) counts[k2]++;
    });
    return { success: true, data: { periode: keys, counts: keys.map(function (k) { return counts[k]; }) } };
  } catch (err) { return { success: false, error: err.message }; }
}

// A7 — umur data (≤30 / 31-90 / 91-365 / >365 hari)
function analisaUmurData_(params) {
  try {
    var utama = getSheetData_('T_UTAMA');
    var today = CoreLib.dateKey10(new Date());
    var buckets = { 's30': 0, 's31_90': 0, 's91_365': 0, 's365p': 0, 'tanpa': 0 };
    utama.forEach(function (r) {
      var t = CoreLib.dateKey10(r.tanggal);
      if (!t) { buckets.tanpa++; return; }
      var diff = daysBetween_(t, today);
      if (diff === null) { buckets.tanpa++; return; }
      if (diff <= 30) buckets.s30++;
      else if (diff <= 90) buckets.s31_90++;
      else if (diff <= 365) buckets.s91_365++;
      else buckets.s365p++;
    });
    return {
      success: true,
      data: {
        total: utama.length,
        buckets: [
          { label: '≤ 30 hari', jml: buckets.s30 },
          { label: '31–90 hari', jml: buckets.s31_90 },
          { label: '91–365 hari', jml: buckets.s91_365 },
          { label: '> 1 tahun', jml: buckets.s365p },
          { label: 'Tanpa tanggal', jml: buckets.tanpa }
        ]
      }
    };
  } catch (err) { return { success: false, error: err.message }; }
}

// A8 — SLA approval (menanti vs selesai + rata-rata hari + umur menanti)
function analisaSlaApproval_(params) {
  try {
    var approval = getSheetData_('T_APPROVAL');
    var menunggu = 0, disetujui = 0, ditolak = 0, revisi = 0;
    var daysSum = 0, daysN = 0;
    var menantiDetail = [];
    var today = CoreLib.dateKey10(new Date());
    approval.forEach(function (r) {
      var s = String(r.status).toLowerCase();
      if (s === 'menunggu') {
        menunggu++;
        var dibuat = String(r.created_at || '').slice(0, 10);
        var umur = dibuat ? daysBetween_(dibuat, today) : null;
        menantiDetail.push({ id: r.id, utama_id: r.utama_id, dibuat: dibuat, umur_hari: umur === null ? '' : umur });
      } else if (s === 'disetujui') {
        disetujui++;
        var created = String(r.created_at || '').slice(0, 10);
        var approved = CoreLib.dateKey10(r.tanggal_approve);
        if (created && approved) {
          var d = daysBetween_(created, approved);
          if (d !== null && d >= 0) { daysSum += d; daysN++; }
        }
      } else if (s === 'ditolak') ditolak++;
      else if (s === 'revisi') revisi++;
    });
    menantiDetail.sort(function (a, b) { return (b.umur_hari || 0) - (a.umur_hari || 0); });
    return {
      success: true,
      data: {
        total: approval.length,
        menunggu: menunggu,
        disetujui: disetujui,
        ditolak: ditolak,
        revisi: revisi,
        rata_rata_hari: daysN ? Math.round(daysSum / daysN) : 0,
        menanti_detail: menantiDetail.slice(0, 10)
      }
    };
  } catch (err) { return { success: false, error: err.message }; }
}

// ==================== §11 EVALUASI (6) ====================

// E1 — kelengkapan field wajib T_UTAMA
var FIELD_WAJIB_UTAMA_ = [
  { field: 'judul',     label: 'judul' },
  { field: 'jenis_id',  label: 'jenis' },
  { field: 'lokasi_id', label: 'lokasi' },
  { field: 'periode_id', label: 'periode' },
  { field: 'tanggal',   label: 'tanggal' }
];

function evaluasiKelengkapan_(params) {
  try {
    var utama = getSheetData_('T_UTAMA');
    var tahun = String(params.tahun || new Date().getFullYear());
    var filtered = filterTahun_(utama, tahun);
    var rincian = [];
    filtered.forEach(function (r) {
      var kurang = [];
      FIELD_WAJIB_UTAMA_.forEach(function (f) {
        var v = r[f.field];
        if (!v || !String(v).trim()) kurang.push(f.label);
      });
      if (kurang.length) rincian.push({ id: r.id, kode: r.kode, judul: r.judul || '(tanpa judul)', kurang: kurang });
    });
    var total = filtered.length;
    var tidakLengkap = rincian.length;
    return {
      success: true,
      data: {
        tahun: tahun,
        total: total,
        tidak_lengkap: tidakLengkap,
        pct_lengkap: total ? Math.round((total - tidakLengkap) / total * 100) : 0,
        rincian: rincian.slice(0, 20)
      }
    };
  } catch (err) { return { success: false, error: err.message }; }
}

// E2 — SLA verifikasi ([SESUAIKAN] ambang terlambat = 30 hari)
var SLA_HARI_ = 30;

function evaluasiSlaVerifikasi_(params) {
  try {
    var approval = getSheetData_('T_APPROVAL');
    var utama = getSheetData_('T_UTAMA');
    var utamaMap = {};
    utama.forEach(function (u) { utamaMap[String(u.id)] = u; });
    var today = CoreLib.dateKey10(new Date());
    var menunggu = 0, terverifikasi = 0, terlambat = 0;
    var rincian = [];
    approval.forEach(function (r) {
      var s = String(r.status).toLowerCase();
      if (s === 'menunggu') {
        menunggu++;
        var dibuat = String(r.created_at || '').slice(0, 10);
        var umur = dibuat ? daysBetween_(dibuat, today) : null;
        if (umur !== null && umur > SLA_HARI_) terlambat++;
        var u = utamaMap[String(r.utama_id)] || {};
        rincian.push({ id: r.id, urutan: r.urutan, kode: u.kode || '', judul: u.judul || '', dibuat: dibuat, umur_hari: umur === null ? '' : umur, terlambat: umur !== null && umur > SLA_HARI_ });
      } else if (s === 'disetujui' || s === 'ditolak' || s === 'revisi') {
        terverifikasi++;
      }
    });
    rincian.sort(function (a, b) { return (b.umur_hari || 0) - (a.umur_hari || 0); });
    var total = approval.length;
    return {
      success: true,
      data: {
        total_approval: total,
        menunggu: menunggu,
        terverifikasi: terverifikasi,
        terlambat: terlambat,
        sla_hari: SLA_HARI_,
        pct_terverifikasi: total ? Math.round(terverifikasi / total * 100) : 0,
        rincian_menanti: rincian.slice(0, 10)
      }
    };
  } catch (err) { return { success: false, error: err.message }; }
}

// E3 — kepatuhan periode: jenis periodik (Tahunan/Bulanan/Periodik) harus punya data di tahun param
function evaluasiKepatuhanPeriode_(params) {
  try {
    var tahun = String(params.tahun || new Date().getFullYear());
    var utama = getSheetData_('T_UTAMA');
    var filtered = filterTahun_(utama, tahun);
    var jenisList = getSheetData_('M_JENIS').filter(function (j) {
      return CoreLib.normStr(j.status_aktif) !== 'false'
        && ['Tahunan', 'Bulanan', 'Periodik'].indexOf(String(j.periode)) !== -1;
    });
    var adaPerJenis = {};
    filtered.forEach(function (r) {
      var k = String(r.jenis_id || '');
      if (k) adaPerJenis[k] = (adaPerJenis[k] || 0) + 1;
    });
    var rincian = jenisList.map(function (j) {
      var jml = adaPerJenis[String(j.id)] || 0;
      return { jenis_id: j.id, jenis_nama: j.nama || j.kode, periode: j.periode, ada_data: jml > 0, jml: jml };
    });
    var patuh = rincian.filter(function (r) { return r.ada_data; }).length;
    var tidakPatuh = rincian.length - patuh;
    return {
      success: true,
      data: {
        tahun: tahun,
        jenis_periodik: rincian.length,
        patuh: patuh,
        tidak_patuh: tidakPatuh,
        pct: rincian.length ? Math.round(patuh / rincian.length * 100) : 100,
        rincian: rincian
      }
    };
  } catch (err) { return { success: false, error: err.message }; }
}

// E4 — kualitas data: FK yatim + duplikat kode
function evaluasiKualitasData_(params) {
  try {
    var utama = getSheetData_('T_UTAMA');
    var jenisIds = {}, lokasiIds = {}, periodeIds = {};
    (getSheetData_('M_JENIS') || []).forEach(function (r) { jenisIds[String(r.id)] = 1; });
    (getSheetData_('M_LOKASI') || []).forEach(function (r) { lokasiIds[String(r.id)] = 1; });
    (getSheetData_('M_PERIODE') || []).forEach(function (r) { periodeIds[String(r.id)] = 1; });
    var yatimJenis = [], yatimLokasi = [], yatimPeriode = [], dupKode = [];
    var kodeSeen = {};
    utama.forEach(function (r) {
      var id = r.id;
      if (r.jenis_id && !jenisIds[String(r.jenis_id)]) yatimJenis.push({ id: id, kode: r.kode, jenis_id: r.jenis_id });
      if (r.lokasi_id && !lokasiIds[String(r.lokasi_id)]) yatimLokasi.push({ id: id, kode: r.kode, lokasi_id: r.lokasi_id });
      if (r.periode_id && !periodeIds[String(r.periode_id)]) yatimPeriode.push({ id: id, kode: r.kode, periode_id: r.periode_id });
      var k = String(r.kode || '').trim();
      if (k) {
        if (kodeSeen[k]) dupKode.push({ id: id, kode: k });
        else kodeSeen[k] = 1;
      }
    });
    return {
      success: true,
      data: {
        total: utama.length,
        yatim_jenis: yatimJenis.length,
        yatim_lokasi: yatimLokasi.length,
        yatim_periode: yatimPeriode.length,
        duplikat_kode: dupKode.length,
        rincian: yatimJenis.concat(yatimLokasi, yatimPeriode, dupKode).slice(0, 20)
      }
    };
  } catch (err) { return { success: false, error: err.message }; }
}

// E5 — lampiran: T_UTAMA tanpa lampiran
function evaluasiLampiran_(params) {
  try {
    var utama = getSheetData_('T_UTAMA');
    var tahun = String(params.tahun || new Date().getFullYear());
    var filtered = filterTahun_(utama, tahun);
    var lmp = getSheetData_('T_LAMPIRAN');
    var punya = {};
    lmp.forEach(function (l) { punya[String(l.utama_id)] = 1; });
    var tanpa = [];
    filtered.forEach(function (u) {
      if (!punya[String(u.id)]) tanpa.push({ id: u.id, kode: u.kode, judul: u.judul });
    });
    var total = filtered.length;
    return {
      success: true,
      data: {
        tahun: tahun,
        total: total,
        dengan_lampiran: total - tanpa.length,
        tanpa_lampiran: tanpa.length,
        pct: total ? Math.round((total - tanpa.length) / total * 100) : 100,
        rincian: tanpa.slice(0, 10)
      }
    };
  } catch (err) { return { success: false, error: err.message }; }
}

// E6 — RTL terbuka + lewat due date
function evaluasiRtlTerbuka_(params) {
  try {
    var rtl = getSheetData_('T_TINDAK_LANJUT');
    var today = CoreLib.dateKey10(new Date());
    var terbuka = [], lewat = 0;
    rtl.forEach(function (r) {
      var s = String(r.status_rtl || r.status).toLowerCase();
      if (s === 'baru' || s === 'diproses') {
        var lewatIni = false;
        if (r.due_date) {
          var d = CoreLib.dateKey10(r.due_date);
          if (d && d < today) { lewatIni = true; lewat++; }
        }
        terbuka.push({ id: r.id, judul: r.judul_rtl, sumber: r.sumber_evaluasi, status: r.status_rtl || r.status, due_date: r.due_date, lewat: lewatIni });
      }
    });
    terbuka.sort(function (a, b) {
      var da = CoreLib.dateKey10(a.due_date) || '9999';
      var db = CoreLib.dateKey10(b.due_date) || '9999';
      return da < db ? -1 : 1;
    });
    return {
      success: true,
      data: { terbuka: terbuka.length, lewat_deadline: lewat, rincian: terbuka.slice(0, 10) }
    };
  } catch (err) { return { success: false, error: err.message }; }
}

// ==================== §12 RTL / TINDAK LANJUT (puncak piramida) ====================
// State machine — transisi legal antar status RTL (warisan v2.10.1 / si-dokumen)
//   baru      → diproses | batal
//   diproses  → selesai | batal
//   selesai   → (final)
//   batal     → baru (reaktivasi)
var RTL_TRANSISI_LEGAL_ = {
  'baru':     ['diproses', 'batal'],
  'diproses': ['selesai', 'batal'],
  'selesai':  [],
  'batal':    ['baru']
};

function getTindakLanjutList_(params) {
  try {
    var list = getSheetData_('T_TINDAK_LANJUT');
    if (params.status_rtl) list = list.filter(function (r) { return CoreLib.normStr(r.status_rtl || r.status) === CoreLib.normStr(params.status_rtl); });
    if (params.sumber_evaluasi) list = list.filter(function (r) { return CoreLib.normStr(r.sumber_evaluasi) === CoreLib.normStr(params.sumber_evaluasi); });
    if (params.tahun) {
      var th = String(params.tahun);
      list = list.filter(function (r) {
        var d = CoreLib.dateKey10(r.due_date) || '';
        return d.indexOf(th) === 0 || String(r.created_at).indexOf(th) === 0;
      });
    }
    if (params.search) {
      var q = CoreLib.normStr(params.search);
      list = list.filter(function (r) { return CoreLib.matchSearch(r, q, ['judul_rtl', 'deskripsi', 'assigned_to', 'catatan']); });
    }
    list = list.slice().sort(function (a, b) {
      var da = CoreLib.dateKey10(a.due_date) || '';
      var db = CoreLib.dateKey10(b.due_date) || '';
      return da < db ? -1 : (da > db ? 1 : 0);
    });
    var page = Number(params.page) || 1;
    var perPage = Number(params.per_page) || 20;
    var total = list.length;
    var totalPages = Math.max(1, Math.ceil(total / perPage));
    var start = (page - 1) * perPage;
    return {
      success: true,
      data: list.slice(start, start + perPage).map(function (r) { return Object.assign({}, r); }),
      total: total,
      total_pages: totalPages,
      page: page,
      per_page: perPage
    };
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
    if (record.judul && !record.judul_rtl) record.judul_rtl = record.judul;
    if (record.judul_rtl && !record.judul) record.judul = record.judul_rtl;

    var isUpdate = !!record.id;
    if (isUpdate) {
      var old = findRecordById_('T_TINDAK_LANJUT', record.id);
      if (!old) return { success: false, code: 'NOT_FOUND', error: 'RTL tidak ditemukan.' };
      // (P1) blokir ubah status_rtl via save — harus via ubah_status (FSM)
      if (record.status_rtl && String(record.status_rtl).toLowerCase() !== String(old.status_rtl || 'baru').toLowerCase()) {
        return { success: false, code: 'BAD_REQUEST', error: 'Ubah status_rtl via save_tindak_lanjut tidak diizinkan. Gunakan ubah_status_tindak_lanjut.' };
      }
      // (P1) blokir ubah judul (idempotensi generate)
      if (String(record.judul_rtl).trim() !== String(old.judul_rtl || '').trim()) {
        return { success: false, code: 'BAD_REQUEST', error: 'Judul RTL tidak boleh diubah setelah dibuat (idempotensi generate).' };
      }
      record.status_rtl = old.status_rtl || 'baru';
    } else {
      if (!record.sumber_evaluasi) record.sumber_evaluasi = 'manual';
      if (!record.status_rtl) record.status_rtl = 'baru';
      var existing = getSheetData_('T_TINDAK_LANJUT');
      var tahunBaru = record.due_date ? String(record.due_date).slice(0, 4) : String(new Date().getFullYear());
      var dup = existing.find(function (r) {
        var t = r.due_date ? String(r.due_date).slice(0, 4) : '';
        return String(r.judul_rtl).toLowerCase() === String(record.judul_rtl).toLowerCase() && t === tahunBaru;
      });
      if (dup) return { success: false, code: 'BAD_REQUEST', error: 'RTL dengan judul + tahun ini sudah ada.' };
    }

    // (P1) validasi progress_pct 0..100
    if (record.progress_pct === undefined || record.progress_pct === '') {
      record.progress_pct = 0;
    } else {
      var p = Number(record.progress_pct);
      if (isNaN(p) || p < 0 || p > 100) return { success: false, code: 'BAD_REQUEST', error: 'progress_pct harus 0..100.' };
      record.progress_pct = p;
    }

    if (record.due_date) record.due_date = CoreLib.dateKey10(record.due_date) || record.due_date;

    var saved = saveRecord_('T_TINDAK_LANJUT', record, user);
    return { success: true, data: saved };
  } catch (err) { return { success: false, code: 'BAD_REQUEST', error: err.message }; }
}

function deleteTindakLanjut_(data, user) {
  try {
    if (!data || !data.id) return { success: false, code: 'BAD_REQUEST', error: 'ID tidak valid.' };
    var ok = softDeleteRecord_('T_TINDAK_LANJUT', data.id, user);
    return { success: ok, message: ok ? 'RTL dihapus.' : 'Tidak ditemukan.' };
  } catch (err) { return { success: false, code: 'BAD_REQUEST', error: err.message }; }
}

function ubahStatusTindakLanjut_(data, user) {
  try {
    var id = data.id;
    var statusBaru = String(data.status_rtl || data.status || '').toLowerCase().trim();
    if (!id) return { success: false, code: 'BAD_REQUEST', error: 'ID wajib.' };
    if (['baru', 'diproses', 'selesai', 'batal'].indexOf(statusBaru) === -1) {
      return { success: false, code: 'BAD_REQUEST', error: 'Status harus baru/diproses/selesai/batal.' };
    }
    var row = findRecordById_('T_TINDAK_LANJUT', id);
    if (!row) return { success: false, code: 'NOT_FOUND', error: 'Tidak ditemukan.' };

    // (P1) state machine — blokir transisi ilegal
    var oldStatus = String(row.status_rtl || 'baru').toLowerCase().trim();
    if (oldStatus !== statusBaru) {
      var legal = RTL_TRANSISI_LEGAL_[oldStatus] || [];
      if (legal.indexOf(statusBaru) === -1) {
        return { success: false, code: 'BAD_REQUEST', error: 'Transisi tidak legal: ' + oldStatus + ' → ' + statusBaru + '. Legal: ' + (legal.join(', ') || '(tidak ada)') };
      }
    }

    row.status_rtl = statusBaru;

    // (P1) auto progress — selesai=100, batal=0
    if (data.progress_pct !== undefined && data.progress_pct !== '') {
      var p = Number(data.progress_pct);
      if (isNaN(p) || p < 0 || p > 100) return { success: false, code: 'BAD_REQUEST', error: 'progress_pct harus 0..100.' };
      row.progress_pct = p;
    } else if (statusBaru === 'selesai') {
      row.progress_pct = 100;
    } else if (statusBaru === 'batal') {
      row.progress_pct = 0;
    }

    if (data.catatan !== undefined) row.catatan = data.catatan;
    var saved = saveRecord_('T_TINDAK_LANJUT', row, user);
    return { success: true, data: saved };
  } catch (err) { return { success: false, code: 'BAD_REQUEST', error: err.message }; }
}

// Generate R1-R4 dari evaluasi (v2.11): R1 kelengkapan (E1), R2 SLA (E2),
// R3 kepatuhan periode (E3), R4 manual. Idempoten (judul+tahun unik).
function generateTindakLanjut_(data, user) {
  try {
    var sumber = String(data.sumber_evaluasi || 'semua').toLowerCase();
    var tahun = String(data.tahun || new Date().getFullYear());
    var toGenerate = [];

    if (sumber === 'semua' || sumber === 'e1') {
      var e1 = evaluasiKelengkapan_({ tahun: tahun });
      if (e1.success && e1.data.tidak_lengkap > 0) {
        toGenerate.push({
          sumber: 'E1',
          judul: 'R1 Kelengkapan — ' + e1.data.tidak_lengkap + ' data tidak lengkap ' + tahun,
          deskripsi: e1.data.tidak_lengkap + ' T_UTAMA dengan field wajib kurang (lihat E1).',
          count: e1.data.tidak_lengkap
        });
      }
    }
    if (sumber === 'semua' || sumber === 'e2') {
      var e2 = evaluasiSlaVerifikasi_({});
      if (e2.success && (e2.data.menunggu > 0 || e2.data.terlambat > 0)) {
        toGenerate.push({
          sumber: 'E2',
          judul: 'R2 SLA Verifikasi — ' + e2.data.menunggu + ' menanti (' + e2.data.terlambat + ' terlambat) ' + tahun,
          deskripsi: e2.data.menunggu + ' approval menunggu, ' + e2.data.terlambat + ' melebihi SLA ' + e2.data.sla_hari + ' hari.',
          count: e2.data.menunggu
        });
      }
    }
    if (sumber === 'semua' || sumber === 'e3') {
      var e3 = evaluasiKepatuhanPeriode_({ tahun: tahun });
      if (e3.success && e3.data.tidak_patuh > 0) {
        toGenerate.push({
          sumber: 'E3',
          judul: 'R3 Kepatuhan Periode — ' + e3.data.tidak_patuh + ' jenis periodik tanpa data ' + tahun,
          deskripsi: e3.data.tidak_patuh + ' dari ' + e3.data.jenis_periodik + ' jenis periodik tidak punya data ' + tahun + ' (lihat E3).',
          count: e3.data.tidak_patuh
        });
      }
    }
    if (sumber === 'manual' || (sumber === 'semua' && !toGenerate.length)) {
      toGenerate.push({
        sumber: 'manual',
        judul: 'R4 Manual — Review ' + tahun,
        deskripsi: 'Rencana tindak lanjut manual untuk tahun ' + tahun,
        count: 1
      });
    }

    var existing = getSheetData_('T_TINDAK_LANJUT');
    var created = [];
    toGenerate.forEach(function (g) {
      var dup = existing.find(function (r) { return String(r.judul_rtl).toLowerCase() === g.judul.toLowerCase(); });
      if (dup) return;
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
      try {
        var saved = saveRecord_('T_TINDAK_LANJUT', rec, user);
        created.push(saved);
        existing.push(saved);
      } catch (e) { Logger.log('[generate RTL] ' + e.message); }
    });

    return { success: true, data: { generated: created.length, items: created, tahun: tahun, sumber: sumber } };
  } catch (err) { return { success: false, code: 'BAD_REQUEST', error: err.message }; }
}

// ==================== §13 UTIL TANGGAL ====================

// Selisih hari antara dua tanggal 'YYYY-MM-DD' (b - a)
function daysBetween_(a, b) {
  function d(s) {
    var p = String(s || '').slice(0, 10).split('-');
    if (p.length < 3) return null;
    var dd = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return isNaN(dd.getTime()) ? null : dd;
  }
  var da = d(a), db = d(b);
  if (!da || !db) return null;
  return Math.round((db - da) / 86400000);
}

// ==================== §14 CONFIG ====================

function getConfigList_() {
  var defaults = [
    { key: 'app_title',   value: APP_TITLE, keterangan: 'Nama aplikasi' },
    { key: 'app_version', value: 'v2.11.0', keterangan: 'Versi rilis' },
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
      return { success: false, code: 'FORBIDDEN', error: 'Parameter "' + key + '" tidak diizinkan.' };
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
    if (!allowed) {
      return { success: false, code: 'FORBIDDEN', error: 'Parameter "' + key + '" tidak boleh dihapus.' };
    }
    appProps_().deleteProperty(String(key));
    audit_(actor, 'DELETE_CONFIG', 'CONFIG', key, true, 'Delete: ' + key);
    return { success: true, message: 'Parameter ' + key + ' dihapus.' };
  } catch (e) { return { success: false, code: 'BAD_REQUEST', error: e.message }; }
}

// ==================== §15 SETUP & SEED ====================

// Seed master awal — hanya kalau sheet kosong (initDatabase / setupApp)
function seedMaster_(actor) {
  var now = new Date();
  var yNow = String(now.getFullYear());
  var yPrev = String(now.getFullYear() - 1);
  var yNext = String(now.getFullYear() + 1);
  var seeds = {
    'M_KATEGORI': [
      { id: 'kat-0001', kode: 'KAT-01', nama: 'Umum', parent_id: '', deskripsi: 'Kategori umum', urutan: 1, status_aktif: 'true' },
      { id: 'kat-0002', kode: 'KAT-02', nama: 'Pelaporan', parent_id: '', deskripsi: 'Laporan berkala', urutan: 2, status_aktif: 'true' },
      { id: 'kat-0003', kode: 'KAT-03', nama: 'Layanan', parent_id: '', deskripsi: 'Layanan/pengaduan', urutan: 3, status_aktif: 'true' },
      { id: 'kat-0004', kode: 'KAT-04', nama: 'Administrasi', parent_id: '', deskripsi: 'Surat & administrasi', urutan: 4, status_aktif: 'true' }
    ],
    'M_JENIS': [
      { id: 'jen-0001', kode: 'JEN-01', nama: 'Laporan Bulanan', kategori_id: 'kat-0002', periode: 'Bulanan', deskripsi: '', urutan: 1, status_aktif: 'true' },
      { id: 'jen-0002', kode: 'JEN-02', nama: 'Laporan Tahunan', kategori_id: 'kat-0002', periode: 'Tahunan', deskripsi: '', urutan: 2, status_aktif: 'true' },
      { id: 'jen-0003', kode: 'JEN-03', nama: 'Permintaan', kategori_id: 'kat-0003', periode: 'Fleksibel', deskripsi: '', urutan: 3, status_aktif: 'true' },
      { id: 'jen-0004', kode: 'JEN-04', nama: 'Pengaduan', kategori_id: 'kat-0003', periode: 'Fleksibel', deskripsi: '', urutan: 4, status_aktif: 'true' },
      { id: 'jen-0005', kode: 'JEN-05', nama: 'Surat', kategori_id: 'kat-0004', periode: 'Periodik', deskripsi: '', urutan: 5, status_aktif: 'true' }
    ],
    'M_PERIODE': [
      { id: 'per-' + yPrev, kode: yPrev, label: 'Tahun ' + yPrev, tahun: yPrev, status_aktif: 'true' },
      { id: 'per-' + yNow,  kode: yNow,  label: 'Tahun ' + yNow,  tahun: yNow,  status_aktif: 'true' },
      { id: 'per-' + yNext, kode: yNext, label: 'Tahun ' + yNext, tahun: yNext, status_aktif: 'true' }
    ],
    'M_SATUAN': [
      { id: 'sat-0001', kode: 'SAT-01', nama: 'Unit', simbol: 'unit', keterangan: '', status_aktif: 'true' },
      { id: 'sat-0002', kode: 'SAT-02', nama: 'Buah', simbol: 'bh', keterangan: '', status_aktif: 'true' },
      { id: 'sat-0003', kode: 'SAT-03', nama: 'Kilogram', simbol: 'kg', keterangan: '', status_aktif: 'true' }
    ],
    'M_LOKASI': [
      { id: 'lok-0001', kode: 'LOK-01', nama: 'Kantor Pusat', alamat: '', keterangan: '', status_aktif: 'true' },
      { id: 'lok-0002', kode: 'LOK-02', nama: 'Cabang 1', alamat: '', keterangan: '', status_aktif: 'true' },
      { id: 'lok-0003', kode: 'LOK-03', nama: 'Cabang 2', alamat: '', keterangan: '', status_aktif: 'true' }
    ]
  };
  var total = 0;
  Object.keys(seeds).forEach(function (sheet) {
    var existing = getSheetData_(sheet);
    if (existing.length) return;
    seeds[sheet].forEach(function (r) {
      try { saveRecord_(sheet, Object.assign({}, r), actor); total++; }
      catch (e) { Logger.log('[seed ' + sheet + '] ' + e.message); }
    });
  });
  return total;
}

function initDatabase(actor) {
  try {
    if (!SPREADSHEET_ID) return { success: false, error: 'SPREADSHEET_ID kosong. Isi di Script Properties atau DEFAULT_SPREADSHEET_ID.' };
    var result = CoreLib.initDatabase(SPREADSHEET_ID, ALL_SHEET_HEADERS, isSimpegSheet_);
    try {
      var ss = CoreLib.getDb(SPREADSHEET_ID);
      var defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Sheet 1');
      if (defaultSheet && ss.getSheets().length > 1 && defaultSheet.getLastRow() === 0) ss.deleteSheet(defaultSheet);
    } catch (e) { Logger.log('[WARN] Gagal hapus Sheet1: ' + e.message); }
    var seeded = seedMaster_(actor);
    var summary = 'Inisialisasi database ' + APP_CODE + ' selesai. 10 sheet bisnis (5 master + 5 tabel) + ZZ_TEST_CRUD. Seed master: ' + seeded + ' baris.';
    Logger.log('✅ ' + summary);
    audit_(actor, 'INIT_DB', 'SYSTEM', 'ALL', true, summary);
    return { success: true, message: summary, corelib: result, seeded: seeded };
  } catch (err) { return { success: false, error: err.message }; }
}

function setupApp(actor) {
  try {
    Logger.log('🚀 Memulai Setup ' + APP_CODE + ' v2.11.0...');
    var defaultConfigs = [
      { key: 'app_title',   value: APP_TITLE, keterangan: 'Nama aplikasi' },
      { key: 'app_version', value: 'v2.11.0', keterangan: 'Versi rilis' },
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
    if (result && result.success) {
      var seeded = seedMaster_(actor);
      audit_(actor, 'SETUP_APP', 'SYSTEM', 'ALL', true, 'Setup selesai. Seed: ' + seeded + '. Warnings: ' + ((result.warnings || []).length));
      result.seeded = seeded;
    } else {
      audit_(actor, 'SETUP_APP', 'SYSTEM', 'ALL', false, (result && result.error) || 'Setup gagal');
    }
    return result;
  } catch (err) { return { success: false, error: err.message }; }
}

// ==================== §16 HEALTH CHECK ====================

function testAppLogicSelfCheck() {
  Logger.log('=== 02_AppLogic.gs v2.11.0 self-check (5M+5T, 86 handler, piramida 12/8/6/4) ===');
  if (typeof CoreLib === 'undefined') { Logger.log('❌ CoreLib tidak terpasang!'); return; }
  Logger.log('✅ CoreLib terdeteksi.');
  var h = buildLocalHandlers_();
  var actions = Object.keys(h);
  Logger.log('📋 localHandlers: ' + actions.length + ' aksi (target 86)');
  var cfg = getAppConfig_();
  var actionLevels = cfg.actionLevels || {};
  var NATIVE = ['exchange_platform_ticket', 'logout'];
  var missing = actions.filter(function (k) { return actionLevels[k] === undefined; });
  Logger.log((missing.length === 0 ? '✅' : '❌') + ' Semua handler punya actionLevels' + (missing.length ? ' — MISSING: ' + missing.join(', ') : ''));
  var missingHandlers = Object.keys(actionLevels).filter(function (k) {
    if (NATIVE.indexOf(k) !== -1) return false;
    return typeof h[k] !== 'function';
  });
  Logger.log((missingHandlers.length === 0 ? '✅' : '❌') + ' Semua actionLevels punya handler' + (missingHandlers.length ? ' — MISSING: ' + missingHandlers.join(', ') : ''));
  var ping = handleAction({ action: 'ping' });
  Logger.log((ping && ping.success ? '✅' : '❌') + ' ping via dispatcher');
  var aneh = handleAction({ action: 'aksi_aneh_xyz' });
  Logger.log((aneh && aneh.success === false ? '✅' : '❌') + ' aksi tak dikenal DITOLAK (code=' + (aneh && aneh.code) + ')');
  Logger.log('=== Selesai ===');
}
