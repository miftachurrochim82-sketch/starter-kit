// ============================================================
// STARTER-KIT - 99_TestSuite.gs (v2.0.0 — CoreLib-First)
// ============================================================
// Test suite mengikuti pola si-kompetensi v3.0.1 & si-lahar v2.1.0:
//   1) runLibraryTests()            → CoreLib.runCoreTests (target 42/0/1)
//   2) testAdopsiG18d()             → util publik CoreLib v2.3.0 (13/13)
//   3) testDispatcherRouting()      → registry handler + fail-closed
//   4) runDomainTestsStarterKit()   → domain M_REFERENSI + T_UTAMA + hook
//
// Jalankan dari editor GAS:
//   - Satu per satu saat debug.
//   - runAllTestsStarterKit() untuk laporan lengkap.
// ============================================================

var TEST_ID_PREFIX_ = '_TEST_';

// Actor dummy untuk test domain (bukan user real, tidak disimpan)
var TEST_USER_ADMIN_  = { id: 'TEST-ADMIN',  email: 'test.admin@trenggalekkab.go.id',  role: 'admin',       pegawai_id: '' };
var TEST_USER_VERIF_  = { id: 'TEST-VERIF',  email: 'test.verif@trenggalekkab.go.id',  role: 'verifikator', pegawai_id: '' };
var TEST_USER_USER_   = { id: 'TEST-USER',   email: 'test.user@trenggalekkab.go.id',   role: 'user',        pegawai_id: '' };
var TEST_USER_VIEWER_ = { id: 'TEST-VIEWER', email: 'test.viewer@trenggalekkab.go.id', role: 'viewer',      pegawai_id: '' };

// ==================== §1 CTX KONTAK v2 (pola si-lahar) ====================

function testCtx_() {
  return {
    appCode:        APP_CODE,
    ssId:           SPREADSHEET_ID,
    masterSsId:     MASTER_SPREADSHEET_ID,
    // Set TEST_SPREADSHEET_ID_B di Script Properties agar testCacheIsolation
    // berjalan; jika kosong → SKIP (wajar).
    ssIdB:          appProps_().getProperty('TEST_SPREADSHEET_ID_B') || '',
    platformApiUrl: PLATFORM_API_URL,
    headersMap:     ALL_SHEET_HEADERS,
    isRefFunc:      isRefSheet_
  };
}

// Helper assertion (pola sama dengan CoreLib 99 & si-kompetensi)
function _assert_(results, name, condition, detail) {
  if (condition) {
    results.push({ name: name, status: 'PASS' });
    Logger.log('  ✅ ' + name);
  } else {
    results.push({ name: name, status: 'FAIL', detail: detail || '' });
    Logger.log('  ❌ ' + name + ' — ' + (detail || ''));
  }
}

// ==================== §2 RUNNER: CoreLib regression ====================

/**
 * Regression test CoreLib v2.3.0 dari sisi app ini.
 * Target: PASS 42 / FAIL 0 / SKIP 1 (SKIP hanya testCacheIsolation
 * bila TEST_SPREADSHEET_ID_B kosong).
 */
function runLibraryTests() {
  Logger.log('==========================================================');
  Logger.log('🧪 REGRESSION TESTS LIBRARY v2 (dari ' + APP_CODE + ')');
  Logger.log('==========================================================');

  var recap = CoreLib.runCoreTests(testCtx_());
  Logger.log('REKAP: PASS ' + recap.passed + ' / FAIL ' + recap.failed + ' / SKIP ' + recap.skipped);

  (recap.results || []).forEach(function (r) {
    Logger.log(
      (r.status === 'PASS' ? '✅' : (r.status === 'SKIP' ? '⏭️' : '❌')) +
      ' ' + r.test + (r.detail ? ' — ' + r.detail : '')
    );
  });
  return recap;
}

// ==================== §3 RUNNER: Adopsi CoreLib v2.3.0 ====================

function testAdopsiG18d() {
  Logger.log('==========================================================');
  Logger.log('🔗 UJI ADOPSI CORELIB v2.3.0 (G18d) — ' + APP_CODE);
  Logger.log('==========================================================');

  var ok = 0, fail = 0;
  function verdict(cond, label) {
    if (cond) { ok++; Logger.log('✅ ' + label); }
    else      { fail++; Logger.log('❌ ' + label); }
  }

  // 1. todayIsoLocal (WIB-aware)
  try {
    var t = CoreLib.todayIsoLocal();
    verdict(/^\d{4}-\d{2}-\d{2}$/.test(t), 'CoreLib.todayIsoLocal() → ' + t);
  } catch (e) { verdict(false, 'CoreLib.todayIsoLocal() exception: ' + e.message); }

  // 2. dateKey10
  try {
    var k1 = CoreLib.dateKey10('2026-09-18T17:00:00.000Z'); // → 19 Sep WIB
    verdict(k1 === '2026-09-19', 'CoreLib.dateKey10 (ISO UTC → WIB) → ' + k1);
    var k2 = CoreLib.dateKey10('2026-09-19');
    verdict(k2 === '2026-09-19', 'CoreLib.dateKey10 passthrough yyyy-MM-dd');
  } catch (e) { verdict(false, 'CoreLib.dateKey10 exception: ' + e.message); }

  // 3. paginate
  try {
    var rows = [];
    for (var i = 1; i <= 25; i++) rows.push({ id: i });
    var p = CoreLib.paginate(rows, 1, 10);
    verdict(p.success === true && p.data.length === 10 &&
            p.meta.total === 25 && p.meta.total_pages === 3,
            'CoreLib.paginate (page 1, 10 → 25 baris/3 hal)');
    var p3 = CoreLib.paginate(rows, 3, 10);
    verdict(p3.data.length === 5 && p3.data[0].id === 21,
            'CoreLib.paginate halaman terakhir benar');
  } catch (e) { verdict(false, 'CoreLib.paginate exception: ' + e.message); }

  // 4. matchSearch
  try {
    var row = { nama: 'Budi Santoso', nip: '198001012010011001' };
    verdict(CoreLib.matchSearch(row, 'budi', ['nama']) === true,
            'CoreLib.matchSearch case-insensitive');
    verdict(CoreLib.matchSearch(row, 'XYZ', ['nama']) === false,
            'CoreLib.matchSearch tidak match → false');
    verdict(CoreLib.matchSearch(row, '', ['nama']) === true,
            'CoreLib.matchSearch q kosong → true');
    verdict(CoreLib.matchSearch(row, 'x', []) === false,
            'CoreLib.matchSearch fields kosong → false');
  } catch (e) { verdict(false, 'CoreLib.matchSearch exception: ' + e.message); }

  // 5. whitelist
  try {
    var w = CoreLib.whitelist('terjadwal', ['Terjadwal', 'Selesai'], 'status');
    verdict(w === 'Terjadwal', 'CoreLib.whitelist lowercase → kanonik');
  } catch (e) { verdict(false, 'CoreLib.whitelist exception: ' + e.message); }

  // 6. normId / normStr / parseDate
  try {
    verdict(CoreLib.normId('  x  ') === 'x', 'CoreLib.normId trim');
    verdict(CoreLib.normStr('  X  ') === 'x', 'CoreLib.normStr trim+lower');
    var d = CoreLib.parseDate('12/09/2026');
    verdict(d && d.getFullYear() === 2026 && d.getMonth() === 8 && d.getDate() === 12,
            'CoreLib.parseDate dd/MM/yyyy');
  } catch (e) { verdict(false, 'CoreLib.normId/normStr/parseDate exception: ' + e.message); }

  Logger.log('REKAP ADOPSI G18d: ' + ok + ' lolos, ' + fail + ' gagal.' + (fail === 0 ? ' 🎉' : ' — CEK ❌!'));
  return { ok: ok, fail: fail };
}

// ==================== §4 RUNNER: Routing & Fail-Closed ====================

function testDispatcherRouting() {
  Logger.log('==========================================================');
  Logger.log('🚏 UJI ROUTING DISPATCHER + REGISTRY HANDLER');
  Logger.log('==========================================================');

  var ok = 0, fail = 0;
  function verdict(cond, label) {
    if (cond) { ok++; Logger.log('✅ ' + label); }
    else      { fail++; Logger.log('❌ ' + label); }
  }

  var handlers = buildLocalHandlers_();
  var cfg = getAppConfig_();
  var actionLevels = cfg.actionLevels || {};

  // Aksi yang di-handle CoreLib native (tidak perlu handler lokal)
  var NATIVE_ACTIONS = ['exchange_platform_ticket', 'exchange_sso_ticket', 'logout'];

  // Aksi builtin CoreLib.dispatchAction (punya handler internal)
  var BUILTIN_DISPATCH = ['ping', 'save', 'delete'];

  // 1. Registry terisi
  var hKeys = Object.keys(handlers);
  verdict(hKeys.length > 0, 'localHandlers terdaftar: ' + hKeys.length + ' aksi');

  // 2. Setiap handler punya actionLevels
  var missingLevels = hKeys.filter(function (k) {
    if (NATIVE_ACTIONS.indexOf(k) !== -1) return false;
    return actionLevels[k] === undefined;
  });
  verdict(missingLevels.length === 0,
          'Semua handler punya actionLevels' +
          (missingLevels.length ? ' — MISSING: ' + missingLevels.join(', ') : ''));

  // 3. Setiap actionLevels punya handler (kecuali native + builtin)
  var missingHandlers = Object.keys(actionLevels).filter(function (k) {
    if (NATIVE_ACTIONS.indexOf(k) !== -1) return false;
    if (BUILTIN_DISPATCH.indexOf(k) !== -1) return false;
    return typeof handlers[k] !== 'function';
  });
  verdict(missingHandlers.length === 0,
          'Semua actionLevels punya handler' +
          (missingHandlers.length ? ' — MISSING: ' + missingHandlers.join(', ') : ''));

  // 4. Ping TANPA token → ditolak
  var ping = handleAction({ action: 'ping' });
  verdict(ping && ping.success === false,
          'ping tanpa token DITOLAK (fail-closed)');
  verdict(ping && (ping.code === 'UNAUTHORIZED' || ping.code === 'FORBIDDEN'),
          'ping tanpa token → code ' + (ping && ping.code));

  // 5. Aksi tak dikenal TANPA token → ditolak
  var aneh = handleAction({ action: 'aksi_aneh_tidak_ada_xyz_999' });
  verdict(aneh && aneh.success === false,
          'Aksi tak dikenal DITOLAK (fail-closed)');
  verdict(aneh && (aneh.code === 'UNAUTHORIZED' || aneh.code === 'FORBIDDEN' || aneh.code === 'NOT_FOUND'),
          'Aksi tak dikenal → code fail-closed: ' + (aneh && aneh.code));

  // 6. delete KONFIGURASI tanpa token → UNAUTHORIZED
  var delHack = handleAction({ action: 'delete', data: { entity: 'KONFIGURASI', key: 'SPREADSHEET_ID' } });
  verdict(delHack && delHack.success === false && delHack.code === 'UNAUTHORIZED',
          'delete KONFIGURASI tanpa auth DITOLAK: code=' + (delHack && delHack.code));

  // 7. Handler kritis tersedia
  var critical = [
    'ping', 'get_dashboard', 'dashboard',
    'get_pegawai_list', 'get_unit_list', 'get_jabatan_list',
    'get_master_satelit', 'get_config', 'save_config_item',
    'init_database',
    // Domain contoh
    'get_referensi_list', 'save_referensi', 'delete_referensi',
    'get_utama_list', 'get_utama_detail', 'save_utama', 'delete_utama'
  ];
  critical.forEach(function (a) {
    verdict(typeof handlers[a] === 'function', 'handler tersedia: ' + a);
  });

  Logger.log('ℹ️ Uji routing internal penuh (dengan token) memerlukan session aktif.');
  Logger.log('ℹ️ Jalankan testFullSsoIntegrationFlow() dengan tiket asli untuk uji end-to-end.');

  Logger.log('REKAP ROUTING: ' + ok + ' lolos, ' + fail + ' gagal.' + (fail === 0 ? ' 🎉' : ' — CEK ❌!'));
  return { ok: ok, fail: fail };
}

// ==================== §5 RUNNER: Domain Test (M_REFERENSI + T_UTAMA + Hook) ====================

/**
 * Agregat test domain starter-kit.
 * Setiap test independen & idempoten (data uji di-cleanup).
 */
function runDomainTestsStarterKit() {
  Logger.log('==========================================================');
  Logger.log('🎯 TEST DOMAIN ' + APP_CODE);
  Logger.log('==========================================================');

  var results = [];
  results = results.concat(testDomainReferensi());
  results = results.concat(testDomainUtama());
  results = results.concat(testSimpegReadOnly());
  results = results.concat(testLocalPreSaveHook());
  results = results.concat(testInitDatabaseSchema());

  var pass = results.filter(function (r) { return r.status === 'PASS'; }).length;
  var fail = results.filter(function (r) { return r.status === 'FAIL'; }).length;
  var skip = results.filter(function (r) { return r.status === 'SKIP'; }).length;

  Logger.log('');
  Logger.log('==========================================================');
  Logger.log('RINGKASAN DOMAIN: PASS=' + pass + ' / FAIL=' + fail + ' / SKIP=' + skip);
  Logger.log('==========================================================');

  if (fail > 0) {
    Logger.log('');
    Logger.log('=== FAIL DETAILS ===');
    results.filter(function (r) { return r.status === 'FAIL'; }).forEach(function (r) {
      Logger.log('❌ ' + r.name + ': ' + r.detail);
    });
  }

  return { pass: pass, fail: fail, skip: skip, results: results };
}

// ---------- Domain M_REFERENSI ----------

function testDomainReferensi() {
  Logger.log('');
  Logger.log('--- M_REFERENSI ---');
  var results = [];

  // TC-R1: save valid → success + kode
  try {
    var r1 = saveReferensi_({
      kategori: 'test_kategori',
      kode: 'TST-' + Date.now(),
      nama_nilai: 'Test Nilai ' + Date.now(),
      urutan: 99,
      status_aktif: 'true'
    }, TEST_USER_ADMIN_);
    _assert_(results, 'REF.1 save valid → success',
      r1.success && r1.data && r1.data.id,
      'error: ' + (r1.error || 'no id'));

    // Cleanup
    if (r1.success && r1.data && r1.data.id) {
      softDeleteRecord_('M_REFERENSI', r1.data.id, TEST_USER_ADMIN_);
    }
  } catch (e) { _assert_(results, 'REF.1 save valid', false, e.message); }

  // TC-R2: save tanpa kategori → BAD_REQUEST
  try {
    var r2 = saveReferensi_({ nama_nilai: 'X' }, TEST_USER_ADMIN_);
    _assert_(results, 'REF.2 save tanpa kategori DITOLAK',
      !r2.success && r2.code === 'BAD_REQUEST',
      'code=' + (r2.code || '-'));
  } catch (e) { _assert_(results, 'REF.2', false, e.message); }

  // TC-R3: save tanpa nama_nilai → BAD_REQUEST
  try {
    var r3 = saveReferensi_({ kategori: 'x' }, TEST_USER_ADMIN_);
    _assert_(results, 'REF.3 save tanpa nama_nilai DITOLAK',
      !r3.success && r3.code === 'BAD_REQUEST',
      'code=' + (r3.code || '-'));
  } catch (e) { _assert_(results, 'REF.3', false, e.message); }

  // TC-R4: delete tanpa ID → BAD_REQUEST
  try {
    var r4 = deleteReferensi_({}, TEST_USER_ADMIN_);
    _assert_(results, 'REF.4 delete tanpa ID DITOLAK',
      !r4.success && r4.code === 'BAD_REQUEST',
      'code=' + (r4.code || '-'));
  } catch (e) { _assert_(results, 'REF.4', false, e.message); }

  // TC-R5: get list → success
  try {
    var r5 = getReferensiList_({});
    _assert_(results, 'REF.5 get list → success',
      r5.success && Array.isArray(r5.data),
      'error: ' + (r5.error || '-'));
  } catch (e) { _assert_(results, 'REF.5', false, e.message); }

  // TC-R6: get list filter only_active
  try {
    var r6 = getReferensiList_({ only_active: true });
    var allActive = (r6.data || []).every(function (r) {
      return String(r.status_aktif || '').toLowerCase() !== 'false';
    });
    _assert_(results, 'REF.6 filter only_active benar',
      r6.success && allActive,
      'error: ' + (r6.error || '-'));
  } catch (e) { _assert_(results, 'REF.6', false, e.message); }

  return results;
}

// ---------- Domain T_UTAMA ----------

function testDomainUtama() {
  Logger.log('');
  Logger.log('--- T_UTAMA ---');
  var results = [];

  // TC-U1: save valid → success + kode auto
  var savedId = '';
  try {
    var r1 = saveUtama_({
      judul: 'Test Utama ' + Date.now(),
      deskripsi: 'Deskripsi uji',
      tanggal: CoreLib.todayIsoLocal(),
      status: 'draft'
    }, TEST_USER_USER_);
    _assert_(results, 'UTM.1 save valid → success + kode auto',
      r1.success && r1.data && r1.data.id && r1.data.kode,
      'error: ' + (r1.error || 'no kode'));
    savedId = (r1.success && r1.data) ? r1.data.id : '';
  } catch (e) { _assert_(results, 'UTM.1', false, e.message); }

  // TC-U2: save tanpa judul → BAD_REQUEST
  try {
    var r2 = saveUtama_({ deskripsi: 'X' }, TEST_USER_USER_);
    _assert_(results, 'UTM.2 save tanpa judul DITOLAK',
      !r2.success && r2.code === 'BAD_REQUEST',
      'code=' + (r2.code || '-'));
  } catch (e) { _assert_(results, 'UTM.2', false, e.message); }

  // TC-U3: get detail NOT_FOUND
  try {
    var r3 = getUtamaDetail_({ id: 'nonexistent-xyz-' + Date.now() }, TEST_USER_USER_);
    _assert_(results, 'UTM.3 get detail ID tidak ada → NOT_FOUND',
      !r3.success && r3.code === 'NOT_FOUND',
      'code=' + (r3.code || '-'));
  } catch (e) { _assert_(results, 'UTM.3', false, e.message); }

  // TC-U4: get detail ID valid → success
  if (savedId) {
    try {
      var r4 = getUtamaDetail_({ id: savedId }, TEST_USER_USER_);
      _assert_(results, 'UTM.4 get detail ID valid → success',
        r4.success && r4.data && r4.data.id === savedId,
        'error: ' + (r4.error || 'no data'));
    } catch (e) { _assert_(results, 'UTM.4', false, e.message); }
  }

  // TC-U5: get list → success
  try {
    var r5 = getUtamaList_({}, TEST_USER_USER_);
    _assert_(results, 'UTM.5 get list → success',
      r5.success && Array.isArray(r5.data),
      'error: ' + (r5.error || '-'));
  } catch (e) { _assert_(results, 'UTM.5', false, e.message); }

  // TC-U6: filter status='draft' → hanya draft
  try {
    var r6 = getUtamaList_({ status: 'draft' }, TEST_USER_USER_);
    var allDraft = (r6.data || []).every(function (r) {
      return String(r.status || '').toLowerCase() === 'draft';
    });
    _assert_(results, 'UTM.6 filter status=draft benar',
      r6.success && allDraft,
      'error: ' + (r6.error || '-'));
  } catch (e) { _assert_(results, 'UTM.6', false, e.message); }

  // TC-U7: delete tanpa ID → BAD_REQUEST
  try {
    var r7 = deleteUtama_({}, TEST_USER_USER_);
    _assert_(results, 'UTM.7 delete tanpa ID DITOLAK',
      !r7.success && r7.code === 'BAD_REQUEST',
      'code=' + (r7.code || '-'));
  } catch (e) { _assert_(results, 'UTM.7', false, e.message); }

  // Cleanup
  if (savedId) {
    try { softDeleteRecord_('T_UTAMA', savedId, TEST_USER_USER_); } catch (e) {}
  }

  return results;
}

// ---------- SIMPEG Read-Only Protection ----------

function testSimpegReadOnly() {
  Logger.log('');
  Logger.log('--- SIMPEG READ-ONLY (PEGAWAI/UNIT_KERJA/JABATAN) ---');
  var results = [];

  ['PEGAWAI', 'UNIT_KERJA', 'JABATAN'].forEach(function (sheet) {
    var blocked = 0;
    try { saveRecord_(sheet, { id: 'X-TEST' }, TEST_USER_ADMIN_); } catch (e) { blocked++; }
    try { softDeleteRecord_(sheet, 'X-TEST', TEST_USER_ADMIN_); } catch (e) { blocked++; }
    _assert_(results, 'RO.' + sheet + ' ditolak di 2/2 jalur',
      blocked === 2, 'blocked ' + blocked + '/2');
  });

  return results;
}

// ---------- localPreSaveHook_ (P1 + P2) ----------

function testLocalPreSaveHook() {
  Logger.log('');
  Logger.log('--- LOCAL PRE-SAVE HOOK (P1: gen-id, P2: kunci verifikasi) ---');
  var results = [];

  // P1.1 — prefix per sheet
  try {
    var r1 = localPreSaveHook_('M_REFERENSI', {}, TEST_USER_USER_);
    _assert_(results, 'P1.1 id auto-generate prefix "ref-"',
      r1 && r1.record && /^ref\-/.test(r1.record.id),
      'id: ' + (r1 && r1.record && r1.record.id));
  } catch (e) { _assert_(results, 'P1.1', false, e.message); }

  try {
    var r2 = localPreSaveHook_('T_UTAMA', {}, TEST_USER_USER_);
    _assert_(results, 'P1.2 id auto-generate prefix "utm-"',
      r2 && r2.record && /^utm\-/.test(r2.record.id),
      'id: ' + (r2 && r2.record && r2.record.id));
  } catch (e) { _assert_(results, 'P1.2', false, e.message); }

  try {
    var r3 = localPreSaveHook_('T_APPROVAL', {}, TEST_USER_USER_);
    _assert_(results, 'P1.3 id auto-generate prefix "apr-"',
      r3 && r3.record && /^apr\-/.test(r3.record.id),
      'id: ' + (r3 && r3.record && r3.record.id));
  } catch (e) { _assert_(results, 'P1.3', false, e.message); }

  // P2.1 — non-verifikator update T_APPROVAL → status='menunggu'
  try {
    var r4 = localPreSaveHook_('T_APPROVAL',
      { id: 'apr-test-' + Date.now() }, TEST_USER_USER_);
    _assert_(results, 'P2.1 non-verifikator update T_APPROVAL → status=menunggu',
      r4 && r4.record && r4.record.status === 'menunggu',
      'status: ' + (r4 && r4.record && r4.record.status));
  } catch (e) { _assert_(results, 'P2.1', false, e.message); }

  // P2.2 — verifikator bebas set status
  try {
    var r5 = localPreSaveHook_('T_APPROVAL',
      { id: 'apr-test2-' + Date.now(), status: 'disetujui' }, TEST_USER_VERIF_);
    _assert_(results, 'P2.2 verifikator bebas status (hook tidak intervensi)',
      r5 && r5.record && r5.record.status === 'disetujui',
      'status: ' + (r5 && r5.record && r5.record.status));
  } catch (e) { _assert_(results, 'P2.2', false, e.message); }

  return results;
}

// ---------- Init Database Schema (10 sheet) ----------

function testInitDatabaseSchema() {
  Logger.log('');
  Logger.log('--- SKEMA 10 SHEET (initDatabase) ---');
  var results = [];

  try {
    var ss = CoreLib.getDb(SPREADSHEET_ID);

    // Cek 10 sheet bisnis ada
    var sheetsBisnis = Object.keys(LOCAL_SHEETS).map(function (k) { return LOCAL_SHEETS[k]; });
    var missing = sheetsBisnis.filter(function (name) {
      return !ss.getSheetByName(name);
    });
    _assert_(results, 'SCHEMA.1 10 sheet bisnis terbuat (' + sheetsBisnis.length + ')',
      missing.length === 0,
      missing.length ? 'MISSING: ' + missing.join(', ') : '');

    // Cek ZZ_TEST_CRUD ada
    var shTest = ss.getSheetByName('ZZ_TEST_CRUD');
    _assert_(results, 'SCHEMA.2 ZZ_TEST_CRUD ada',
      !!shTest,
      'jalankan initDatabase() dulu bila belum ada');

    // Cek kolom audit ada di setiap sheet bisnis
    var auditCols = ['created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'];
    var noAudit = [];
    sheetsBisnis.forEach(function (name) {
      var sh = ss.getSheetByName(name);
      if (!sh) return;
      var lastCol = sh.getLastColumn();
      if (lastCol < 1) { noAudit.push(name + ' (kosong)'); return; }
      var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
      var missingAudit = auditCols.filter(function (c) { return headers.indexOf(c) === -1; });
      if (missingAudit.length) noAudit.push(name + ' (' + missingAudit.join(',') + ')');
    });
    _assert_(results, 'SCHEMA.3 kolom audit lengkap di semua sheet',
      noAudit.length === 0,
      noAudit.length ? 'MISSING: ' + noAudit.join('; ') : '');

  } catch (e) {
    _assert_(results, 'SCHEMA.1-3 cek skema', false, e.message);
  }

  return results;
}

// ==================== §6 RUNNER: Diagnostics ====================

function runAllDiagnostics() {
  Logger.log('==========================================================');
  Logger.log('🔍 DIAGNOSTIK KESEHATAN ' + APP_CODE);
  Logger.log('==========================================================');

  // 1. CoreLib check
  try {
    Logger.log('🔗 CoreLib check:');
    Logger.log('   • todayIsoLocal() : ' + (typeof CoreLib.todayIsoLocal  === 'function' ? '✅' : '❌'));
    Logger.log('   • dateKey10()     : ' + (typeof CoreLib.dateKey10      === 'function' ? '✅' : '❌'));
    Logger.log('   • paginate()      : ' + (typeof CoreLib.paginate       === 'function' ? '✅' : '❌'));
    Logger.log('   • matchSearch()   : ' + (typeof CoreLib.matchSearch    === 'function' ? '✅' : '❌'));
    Logger.log('   • dispatchAction(): ' + (typeof CoreLib.dispatchAction === 'function' ? '✅' : '❌'));
  } catch (e) { Logger.log('❌ CoreLib check gagal: ' + e.message); }

  // 2. DB lokal
  try {
    Logger.log('✅ DB lokal tersambung: ' + CoreLib.getDb(SPREADSHEET_ID).getName());
  } catch (e) {
    Logger.log('❌ DB lokal GAGAL: ' + e.message);
  }

  // 3. Skema 10 sheet
  try {
    var ss = CoreLib.getDb(SPREADSHEET_ID);
    Object.keys(LOCAL_SHEETS).forEach(function (k) {
      var name = LOCAL_SHEETS[k];
      var sh = ss.getSheetByName(name);
      if (!sh) {
        Logger.log('❌ ' + name + ' : TIDAK ADA (jalankan initDatabase!)');
      } else {
        Logger.log('✅ ' + name + ' : ' + Math.max(0, sh.getLastRow() - 1) + ' baris');
      }
    });
    var shTest = ss.getSheetByName('ZZ_TEST_CRUD');
    Logger.log((shTest ? '✅' : '⚠️ ') + ' ZZ_TEST_CRUD : ' +
      (shTest ? Math.max(0, shTest.getLastRow() - 1) + ' baris' : 'belum dibuat'));
  } catch (e) { Logger.log('❌ Cek skema gagal: ' + e.message); }

  // 4. SIMPEG reference
  try {
    Logger.log('✅ PEGAWAI (master): ' + getSheetData_('PEGAWAI').length + ' data');
    Logger.log('✅ UNIT_KERJA (master): ' + getSheetData_('UNIT_KERJA').length + ' data');
    Logger.log('✅ JABATAN (master): ' + getSheetData_('JABATAN').length + ' data');
  } catch (e) { Logger.log('❌ SIMPEG read: ' + e.message + ' (cek MASTER_SPREADSHEET_ID!)'); }

  // 5. Adopsi G18d
  try { testAdopsiG18d(); } catch (e) { Logger.log('❌ testAdopsiG18d: ' + e.message); }

  Logger.log('🏁 DIAGNOSTIK SELESAI');
}

// ==================== §7 DIAGNOSTIK SSO (manual, opsional) ====================

function testKoneksiKePortalSso() {
  Logger.log('==========================================================');
  Logger.log('🔍 DIAGNOSTIK KONEKSI SSO KE PORTAL UTAMA');
  Logger.log('==========================================================');
  Logger.log('• URL Portal : ' + PLATFORM_API_URL);
  Logger.log('• APP_CODE   : ' + APP_CODE);

  try {
    var payload = {
      method: 'POST',
      path:   '/api/v1/auth/validate-ticket',
      data:   { ticket: 'st_DIAGNOSTIK_' + Date.now(), appCode: APP_CODE }
    };
    var response = UrlFetchApp.fetch(PLATFORM_API_URL, {
      method:             'post',
      contentType:        'application/json',
      payload:            JSON.stringify(payload),
      muteHttpExceptions: true,
      followRedirects:    true
    });
    var statusCode = response.getResponseCode();
    var content    = response.getContentText();

    Logger.log('• HTTP Status Code : ' + statusCode);
    Logger.log('• Isi Respons (cut) : ' + content.substring(0, 300));

    if (statusCode === 200) {
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        Logger.log('✅ Portal merespons JSON dengan BENAR.');
      } else {
        Logger.log('❌ Portal mengembalikan HTML (bukan JSON).');
        Logger.log('   → Setelan "Siapa yang memiliki akses" di Portal belum "Anyone".');
      }
    } else {
      Logger.log('❌ HTTP ERROR ' + statusCode + ': Portal menolak koneksi.');
    }
  } catch (err) {
    Logger.log('❌ ERROR EXCEPTION: ' + err.message);
  }
  Logger.log('==========================================================');
}

function testFullSsoIntegrationFlow() {
  Logger.log('==========================================================');
  Logger.log('🚀 UJI INTEGRASI ALUR SSO PENUH (' + APP_CODE + ')');
  Logger.log('==========================================================');

  var ticketValid = '';  // <<< ISI TIKET VALID DI SINI

  if (!ticketValid) {
    Logger.log('❌ Tiket valid belum diisi. Generate dari Global App dulu.');
    return;
  }

  Logger.log('1️⃣ Menukarkan Tiket SSO...');
  var cfg = getAppConfig_();
  var exchange = CoreLib.exchangePlatformTicket(ticketValid, cfg);

  if (!exchange.success) {
    Logger.log('❌ GAGAL MENUKAR TIKET: ' + exchange.error);
    return;
  }
  Logger.log('✅ Token diterima.');

  Logger.log('2️⃣ Memverifikasi session token...');
  var auth = CoreLib.checkAuth(exchange.data.token, 'viewer', SESSION_PREFIX, ROLE_LEVELS);
  Logger.log(auth.success
    ? '✅ Session valid: ' + auth.user.email + ' [' + auth.user.role + '] pegawai_id=' + (auth.user.pegawai_id || '(kosong)')
    : '❌ Session TIDAK valid: ' + auth.error);

  Logger.log('3️⃣ Logout (cleanup)...');
  CoreLib.logoutUser(exchange.data.token, SESSION_PREFIX);

  Logger.log('==========================================================');
  Logger.log('🎉 PENGUJIAN INTEGRASI SSO SELESAI.');
  Logger.log('• User Logged In : ' + exchange.data.user.display_name + ' (' + exchange.data.user.email + ')');
  Logger.log('==========================================================');
}

// ==================== §8 AGREGAT: Semua Test ====================

function runAllTestsStarterKit() {
  Logger.log('##########################################################');
  Logger.log('##  TEST SUITE LENGKAP ' + APP_CODE + ' v2.0.0');
  Logger.log('##  Waktu: ' + new Date().toISOString());
  Logger.log('##########################################################');

  var libRecap = runLibraryTests();
  Logger.log('');

  var adopsi = testAdopsiG18d();
  Logger.log('');

  var routing = testDispatcherRouting();
  Logger.log('');

  var domain = runDomainTestsStarterKit();
  Logger.log('');

  Logger.log('##########################################################');
  Logger.log('##  REKAP AKHIR');
  Logger.log('##  Library (CoreLib) : PASS ' + libRecap.passed + ' / FAIL ' + libRecap.failed + ' / SKIP ' + libRecap.skipped);
  Logger.log('##  Adopsi G18d       : ' + adopsi.ok + ' lolos / ' + adopsi.fail + ' gagal');
  Logger.log('##  Routing           : ' + routing.ok + ' lolos / ' + routing.fail + ' gagal');
  Logger.log('##  Domain            : PASS ' + domain.pass + ' / FAIL ' + domain.fail + ' / SKIP ' + domain.skip);
  Logger.log('##########################################################');

  var allPass = (libRecap.failed === 0) && (adopsi.fail === 0) &&
                (routing.fail === 0) && (domain.fail === 0);
  Logger.log(allPass ? '🎉 SEMUA TEST HIJAU.' : '⚠️ Ada test GAGAL — cek log di atas.');

  return {
    library: libRecap,
    adopsi:  adopsi,
    routing: routing,
    domain:  domain,
    allPass: allPass
  };
}
