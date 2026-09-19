// ============================================================
// STARTER-KIT - 02_AppLogic.gs (v2.0.0 — CoreLib-First)
// ============================================================
// Entry HTTP + Dispatcher + Registry Handler + Setup + Handler contoh.
// Pola identik dengan si-kompetensi v6.0.1 dan si-lahar v2.1.0.
//
// Yang DIHAPUS dari v1.0:
//   - handleApi switch-case manual (~40 baris)
//   - withAuth_ + validateSessionToken_ (native CoreLib.checkAuth)
//   - exchangeTicket_ (native CoreLib.exchangePlatformTicket)
//
// Yang DIPERTAHANKAN (domain contoh — ganti dengan milik Anda):
//   - doGet / doPost / include
//   - handleAction (thin wrapper ke CoreLib.dispatchAction)
//   - buildLocalHandlers_ (registry semua handler)
//   - getDashboard_ / getPegawaiList_ / getContohList_ / saveContoh_ / deleteContoh_
//   - setupApp / initDatabase
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
 * [SESUAIKAN] Hapus handler contoh (get_contoh_list, save_contoh, delete_contoh)
 * dan tambahkan handler bisnis Anda. Nama aksi WAJIB ada juga di
 * `actionLevels` di 01_ConfigAndBridge.gs — kalau tidak, fail-closed.
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
  h['dashboard']     = function (d, u) { return getDashboard_(u); };   // alias

  // ---------- SIMPEG read-only ----------
  h['get_pegawai_list'] = function () { return getPegawaiList_(); };
  h['get_unit_list']    = function () { return getUnitList_(); };
  h['get_jabatan_list'] = function () { return getJabatanList_(); };
  h['get_master_satelit'] = function () { return getMasterSatelit_(); };

  // ---------- [SESUAIKAN] Aksi bisnis contoh ----------
  h['get_contoh_list'] = function (d, u) { return getContohList_(); };
  h['save_contoh']     = function (d, u) { return saveContoh_(d || {}, u); };
  h['delete_contoh']   = function (d, u) { return deleteContoh_(d || {}, u); };

  // ---------- Konfigurasi (Script Properties) ----------
  h['get_config']         = function () { return getConfigList_(); };
  h['get_config_list']    = function () { return getConfigList_(); };
  h['save_config_item']   = function (d, u) { return saveConfigItem_(d, u); };
  h['save_config']        = function (d, u) { return saveConfigItem_(d, u); };
  h['delete_config_item'] = function (d, u) { return deleteConfigItem_(d, u); };
  h['delete_config']      = function (d, u) { return deleteConfigItem_(d, u); };

  // ---------- Aksi dinamis 'delete' — routing internal ----------
  // CoreLib.dispatchAction punya case 'delete' generic (hard delete KONFIGURASI).
  // Kita selalu intercept: arahkan ke deleteConfigItem_ yang punya whitelist key.
  h['delete'] = function (d, u) {
    var ent = String((d && d.entity) || '').toUpperCase();
    if (ent === 'KONFIGURASI') return deleteConfigItem_(d || {}, u);
    return {
      success: false, code: 'BAD_REQUEST',
      error: 'Aksi delete untuk entitas "' + ent + '" tidak dikenali.'
    };
  };

  // ---------- Sistem ----------
  h['init_database'] = function (d, u) { return initDatabase(u); };

  return h;
}

// ==================== §3 HANDLER DOMAIN (CONTOH) ====================
// [SESUAIKAN] Ganti handler ini dengan logika bisnis Anda.

/**
 * Dashboard ringkas: hitung total pegawai + total entri contoh.
 * Ganti dengan agregasi bisnis Anda.
 */
function getDashboard_(user) {
  try {
    var pegawai = getPegawaiList_();
    var contoh  = getContohList_();
    return {
      success: true,
      data: {
        totalPegawai: ((pegawai && pegawai.data) || []).length,
        totalContoh:  ((contoh  && contoh.data)  || []).length,
        role: (user && user.role) || 'viewer',
        nama: (user && (user.display_name || user.email)) || ''
      }
    };
  } catch (err) {
    Logger.log('[getDashboard_] ' + err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Baca daftar pegawai SIMPEG (tolerant reader) — hanya kolom yang dibutuhkan.
 */
function getPegawaiList_() {
  try {
    var rows = getSheetData_('PEGAWAI');
    var lean = (rows || []).map(function (p) {
      return {
        pegawai_id: p.pegawai_id || p.id,
        nip:        p.nip || '',
        nama:       p.nama || p.nama_lengkap || '',
        nama_lengkap: p.nama_lengkap || p.nama || '',
        email:      p.email || '',
        unit_id:    p.unit_id || '',
        jabatan_id: p.jabatan_id || '',
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
 * Bundle master satelit (referensi app + referensi SIMPEG) untuk frontend.
 * [SESUAIKAN] sesuaikan field & sumber data dengan bisnis Anda.
 */
function getMasterSatelit_() {
  try {
    return {
      success: true,
      data: {
        referensi: getSheetData_('M_REFERENSI'),
        // contoh tulis: contoh: getSheetData_('T_CONTOH')
      }
    };
  } catch (err) {
    return { success: false, error: 'Gagal memuat master satelit: ' + err.message };
  }
}

/**
 * Contoh list dari tabel T_CONTOH — ganti dengan tabel bisnis Anda.
 */
function getContohList_() {
  try {
    return { success: true, data: getSheetData_('T_CONTOH') };
  } catch (err) {
    Logger.log('[getContohList_] ' + err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Contoh simpan — delegasi ke saveRecord_ (yang panggil CoreLib.apiSave).
 * Ganti validasi & field dengan bisnis Anda.
 */
function saveContoh_(data, user) {
  try {
    var judul = String(data.judul || '').trim();
    if (!judul) return { success: false, code: 'BAD_REQUEST', error: 'Judul wajib diisi.' };

    var record = {
      id:         data.id || '',
      kode:       data.kode || CoreLib.genUniqueCode(
                    'CTH-', 'T_CONTOH', 'kode', 4,
                    SPREADSHEET_ID, ALL_SHEET_HEADERS
                  ),
      judul:      judul,
      pegawai_id: data.pegawai_id || '',
      tanggal:    data.tanggal || CoreLib.todayIsoLocal(),
      status:     data.status || 'draft',
      keterangan: data.keterangan || ''
    };

    var saved = saveRecord_('T_CONTOH', record, user);
    return { success: true, data: saved };
  } catch (err) {
    Logger.log('[saveContoh_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

function deleteContoh_(data, user) {
  try {
    if (!data || !data.id) {
      return { success: false, code: 'BAD_REQUEST', error: 'ID tidak valid.' };
    }
    var ok = softDeleteRecord_('T_CONTOH', data.id, user);
    return { success: ok, message: ok ? 'Data dihapus.' : 'Data tidak ditemukan.' };
  } catch (err) {
    Logger.log('[deleteContoh_] ' + err.message);
    return { success: false, code: 'BAD_REQUEST', error: err.message };
  }
}

// ==================== §4 CONFIG (Script Properties) ====================

/**
 * getConfigList_ — gabungkan default + nilai dari Script Properties.
 * Hanya key yang masuk whitelist CoreLib (atau extraKeys) yang ditampilkan.
 */
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

/**
 * saveConfigItem_ — simpan ke Script Properties dengan whitelist.
 */
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

/**
 * deleteConfigItem_ — hapus dari Script Properties dengan whitelist.
 */
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

// ==================== §5 SETUP ====================
// [SESUAIKAN] Jalankan setupApp() SEKALI setelah 01_ConfigAndBridge.gs diisi.

/**
 * Inisialisasi database — delegasi ke CoreLib.initDatabase.
 * Membuat semua sheet di ALL_SHEET_HEADERS + kolom audit standar.
 * Hapus Sheet1 default bila kosong.
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

    try {
      var ss = CoreLib.getDb(SPREADSHEET_ID);
      var defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Sheet 1');
      if (defaultSheet && ss.getSheets().length > 1 && defaultSheet.getLastRow() === 0) {
        ss.deleteSheet(defaultSheet);
      }
    } catch (e) {
      Logger.log('[WARN] Gagal hapus Sheet1: ' + e.message);
    }

    var summary = 'Inisialisasi database ' + APP_CODE + ' selesai.';
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
 * [SESUAIKAN] defaultConfigs dengan config app Anda.
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
      props:          appProps_()    // WAJIB — store milik app ini
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

// ==================== §6 HEALTH CHECK ====================

/**
 * Verifikasi cepat setelah paste: cek CoreLib + dispatcher + registry.
 * Jalankan dari editor GAS.
 */
function testAppLogicSelfCheck() {
  Logger.log('=== 02_AppLogic.gs v2.0.0 self-check ===');

  if (typeof CoreLib === 'undefined') {
    Logger.log('❌ CoreLib tidak terpasang!');
    return;
  }
  Logger.log('✅ CoreLib terdeteksi.');

  // Registry handler
  var h = buildLocalHandlers_();
  var actions = Object.keys(h);
  Logger.log('📋 localHandlers: ' + actions.length + ' aksi terdaftar');

  // actionLevels lengkap
  var cfg = getAppConfig_();
  var actionLevels = cfg.actionLevels || {};
  var missing = actions.filter(function (k) {
    return actionLevels[k] === undefined && ['save', 'delete'].indexOf(k) === -1;
  });
  Logger.log((missing.length === 0 ? '✅' : '❌') +
    ' Semua handler punya actionLevels' +
    (missing.length ? ' — MISSING: ' + missing.join(', ') : ''));

  // Ping via dispatcher
  var ping = handleAction({ action: 'ping' });
  Logger.log((ping && ping.success ? '✅' : '❌') + ' ping via dispatcher');

  // Fail-closed: aksi tak dikenal tanpa token
  var aneh = handleAction({ action: 'aksi_aneh_xyz' });
  Logger.log((aneh && aneh.success === false ? '✅' : '❌') +
    ' aksi tak dikenal DITOLAK (code=' + (aneh && aneh.code) + ')');

  Logger.log('=== Selesai ===');
}
