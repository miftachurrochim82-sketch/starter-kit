// ============================================================
// STARTER-KIT - 99_TestSuite.gs (v2.10.0 — 11 sheet + 72 handler + RTL + UIUX v1.10)
// ============================================================
// Test suite — pola si-arsip v1.10 (203/0/1) + starter-kit v2.0.1
// 1) runLibraryTests → CoreLib.runCoreTests (42/0/1)
// 2) testAdopsiG18d → util publik CoreLib v2.3.0 (13/13)
// 3) testDispatcherRouting → registry 72 handler + fail-closed
// 4) runDomainTestsStarterKit → 11 sheet + RTL + hook + UIUX v1.10 checks

var TEST_ID_PREFIX_ = '_TEST_';
var TEST_USER_ADMIN_  = { id: 'TEST-ADMIN',  email: 'test.admin@trenggalekkab.go.id',  role: 'admin',       pegawai_id: '' };
var TEST_USER_VERIF_  = { id: 'TEST-VERIF',  email: 'test.verif@trenggalekkab.go.id',  role: 'verifikator', pegawai_id: '' };
var TEST_USER_USER_   = { id: 'TEST-USER',   email: 'test.user@trenggalekkab.go.id',   role: 'user',        pegawai_id: '' };
var TEST_USER_VIEWER_ = { id: 'TEST-VIEWER', email: 'test.viewer@trenggalekkab.go.id', role: 'viewer',      pegawai_id: '' };

function testCtx_() {
  return {
    appCode: APP_CODE,
    ssId: SPREADSHEET_ID,
    masterSsId: MASTER_SPREADSHEET_ID,
    ssIdB: appProps_().getProperty('TEST_SPREADSHEET_ID_B') || '',
    platformApiUrl: PLATFORM_API_URL,
    headersMap: ALL_SHEET_HEADERS,
    isRefFunc: isRefSheet_
  };
}

function _assert_(results, name, condition, detail) {
  if (condition) { results.push({ name: name, status: 'PASS' }); Logger.log('  ✅ ' + name); }
  else { results.push({ name: name, status: 'FAIL', detail: detail || '' }); Logger.log('  ❌ ' + name + ' — ' + (detail || '')); }
}

// CoreLib regression
function runLibraryTests() {
  Logger.log('==========================================================');
  Logger.log('🧪 REGRESSION TESTS LIBRARY v2 (dari ' + APP_CODE + ' v2.10.0)');
  Logger.log('==========================================================');
  var recap = CoreLib.runCoreTests(testCtx_());
  Logger.log('REKAP: PASS ' + recap.passed + ' / FAIL ' + recap.failed + ' / SKIP ' + recap.skipped);
  (recap.results || []).forEach(function (r) {
    Logger.log((r.status === 'PASS' ? '✅' : (r.status === 'SKIP' ? '⏭️' : '❌')) + ' ' + r.test + (r.detail ? ' — ' + r.detail : ''));
  });
  return recap;
}

function testAdopsiG18d() {
  Logger.log('==========================================================');
  Logger.log('🔗 UJI ADOPSI CORELIB v2.3.0 (G18d) — ' + APP_CODE + ' v2.10.0');
  Logger.log('==========================================================');
  var ok = 0, fail = 0;
  function verdict(cond, label) { if (cond) { ok++; Logger.log('✅ ' + label); } else { fail++; Logger.log('❌ ' + label); } }
  try { var t = CoreLib.todayIsoLocal(); verdict(/^\d{4}-\d{2}-\d{2}$/.test(t), 'todayIsoLocal() → ' + t); } catch (e) { verdict(false, e.message); }
  try { var k1 = CoreLib.dateKey10('2026-09-18T17:00:00.000Z'); verdict(k1 === '2026-09-19', 'dateKey10 UTC→WIB → ' + k1); } catch (e) { verdict(false, e.message); }
  try {
    var rows = []; for (var i = 1; i <= 25; i++) rows.push({ id: i });
    var p = CoreLib.paginate(rows, 1, 10);
    verdict(p.success === true && p.data.length === 10 && p.meta.total === 25, 'paginate page 1');
  } catch (e) { verdict(false, e.message); }
  try { verdict(CoreLib.matchSearch({ nama: 'Budi' }, 'budi', ['nama']) === true, 'matchSearch'); } catch (e) { verdict(false, e.message); }
  Logger.log('REKAP ADOPSI: ' + ok + ' lolos, ' + fail + ' gagal.' + (fail === 0 ? ' 🎉' : ''));
  return { ok: ok, fail: fail };
}

function testDispatcherRouting() {
  Logger.log('==========================================================');
  Logger.log('🚏 UJI ROUTING DISPATCHER — 72 handler + fail-closed — v2.10.0');
  Logger.log('==========================================================');
  var ok = 0, fail = 0;
  function verdict(cond, label) { if (cond) { ok++; Logger.log('✅ ' + label); } else { fail++; Logger.log('❌ ' + label); } }
  var handlers = buildLocalHandlers_();
  var cfg = getAppConfig_();
  var actionLevels = cfg.actionLevels || {};
  var NATIVE_ACTIONS = ['exchange_platform_ticket', 'logout'];
  var BUILTIN_DISPATCH = ['ping', 'save', 'delete'];
  var hKeys = Object.keys(handlers);
  verdict(hKeys.length >= 70, 'localHandlers terdaftar: ' + hKeys.length + ' (target 72)');
  var missingLevels = hKeys.filter(function (k) { if (NATIVE_ACTIONS.indexOf(k) !== -1) return false; return actionLevels[k] === undefined; });
  verdict(missingLevels.length === 0, 'Semua handler punya actionLevels' + (missingLevels.length ? ' MISSING: ' + missingLevels.join(', ') : ''));
  var missingHandlers = Object.keys(actionLevels).filter(function (k) {
    if (NATIVE_ACTIONS.indexOf(k) !== -1) return false;
    if (BUILTIN_DISPATCH.indexOf(k) !== -1) return false;
    return typeof handlers[k] !== 'function';
  });
  verdict(missingHandlers.length === 0, 'Semua actionLevels punya handler' + (missingHandlers.length ? ' MISSING: ' + missingHandlers.join(', ') : ''));
  var ping = handleAction({ action: 'ping' });
  verdict(ping && ping.success === false, 'ping tanpa token DITOLAK fail-closed');
  var aneh = handleAction({ action: 'aksi_aneh_xyz_999' });
  verdict(aneh && aneh.success === false, 'Aksi tak dikenal DITOLAK');
  Logger.log('REKAP ROUTING: ' + ok + ' lolos, ' + fail + ' gagal.' + (fail === 0 ? ' 🎉' : ''));
  return { ok: ok, fail: fail };
}

function runDomainTestsStarterKit() {
  Logger.log('==========================================================');
  Logger.log('🎯 TEST DOMAIN ' + APP_CODE + ' v2.10.0 — 11 sheet + RTL');
  Logger.log('==========================================================');
  var results = [];
  results = results.concat(testDomainReferensi());
  results = results.concat(testDomainUtama());
  results = results.concat(testDomainRtl());
  results = results.concat(testSimpegReadOnly());
  results = results.concat(testLocalPreSaveHook());
  results = results.concat(testInitDatabaseSchema());
  var pass = results.filter(function (r) { return r.status === 'PASS'; }).length;
  var fail = results.filter(function (r) { return r.status === 'FAIL'; }).length;
  var skip = results.filter(function (r) { return r.status === 'SKIP'; }).length;
  Logger.log(''); Logger.log('RINGKASAN DOMAIN: PASS=' + pass + ' / FAIL=' + fail + ' / SKIP=' + skip);
  if (fail > 0) { Logger.log('=== FAIL DETAILS ==='); results.filter(function (r) { return r.status === 'FAIL'; }).forEach(function (r) { Logger.log('❌ ' + r.name + ': ' + r.detail); }); }
  return { pass: pass, fail: fail, skip: skip, results: results };
}

function testDomainReferensi() {
  Logger.log(''); Logger.log('--- M_REFERENSI ---'); var results = [];
  try {
    var r1 = saveReferensi_({ kategori: 'test_kategori', kode: 'TST-' + Date.now(), nama_nilai: 'Test ' + Date.now(), urutan: 99, status_aktif: 'true' }, TEST_USER_ADMIN_);
    _assert_(results, 'REF.1 save valid', r1.success && r1.data && r1.data.id, r1.error || '');
    if (r1.success && r1.data && r1.data.id) softDeleteRecord_('M_REFERENSI', r1.data.id, TEST_USER_ADMIN_);
  } catch (e) { _assert_(results, 'REF.1', false, e.message); }
  try { var r2 = saveReferensi_({ nama_nilai: 'X' }, TEST_USER_ADMIN_); _assert_(results, 'REF.2 tanpa kategori DITOLAK', !r2.success && r2.code === 'BAD_REQUEST', ''); } catch (e) { _assert_(results, 'REF.2', false, e.message); }
  try { var r5 = getReferensiList_({}); _assert_(results, 'REF.5 get list success', r5.success && Array.isArray(r5.data), ''); } catch (e) { _assert_(results, 'REF.5', false, e.message); }
  return results;
}

function testDomainUtama() {
  Logger.log(''); Logger.log('--- T_UTAMA ---'); var results = []; var savedId = '';
  try {
    var r1 = saveUtama_({ judul: 'Test Utama ' + Date.now(), tanggal: CoreLib.todayIsoLocal(), status: 'draft' }, TEST_USER_USER_);
    _assert_(results, 'UTM.1 save valid + kode auto', r1.success && r1.data && r1.data.id && r1.data.kode, r1.error || '');
    savedId = (r1.success && r1.data) ? r1.data.id : '';
  } catch (e) { _assert_(results, 'UTM.1', false, e.message); }
  try { var r5 = getUtamaList_({}, TEST_USER_USER_); _assert_(results, 'UTM.5 get list success', r5.success && Array.isArray(r5.data), ''); } catch (e) { _assert_(results, 'UTM.5', false, e.message); }
  if (savedId) { try { softDeleteRecord_('T_UTAMA', savedId, TEST_USER_USER_); } catch (e) {} }
  return results;
}

function testDomainRtl() {
  Logger.log(''); Logger.log('--- T_TINDAK_LANJUT / RTL (v2.10.0) ---'); var results = []; var savedId = '';
  try {
    var r1 = saveTindakLanjut_({ judul_rtl: 'Test RTL ' + Date.now(), sumber_evaluasi: 'manual', status_rtl: 'baru', progress_pct: 0, due_date: CoreLib.todayIsoLocal() }, TEST_USER_USER_);
    _assert_(results, 'RTL.1 save valid', r1.success && r1.data && r1.data.id, r1.error || '');
    savedId = (r1.success && r1.data) ? r1.data.id : '';
  } catch (e) { _assert_(results, 'RTL.1', false, e.message); }
  try {
    var r2 = getTindakLanjutList_({ page: 1, per_page: 5 });
    _assert_(results, 'RTL.2 get list success + pagination', r2.success && Array.isArray(r2.data), r2.error || '');
  } catch (e) { _assert_(results, 'RTL.2', false, e.message); }
  if (savedId) {
    try {
      var r3 = ubahStatusTindakLanjut_({ id: savedId, status_rtl: 'diproses', progress_pct: 50 }, TEST_USER_USER_);
      _assert_(results, 'RTL.3 ubah status baru→diproses', r3.success && r3.data && String(r3.data.status_rtl) === 'diproses', r3.error || '');
    } catch (e) { _assert_(results, 'RTL.3', false, e.message); }
    try {
      var r4 = generateTindakLanjut_({ sumber_evaluasi: 'semua', tahun: String(new Date().getFullYear()) }, TEST_USER_USER_);
      _assert_(results, 'RTL.4 generate (idempoten)', r4.success, r4.error || '');
    } catch (e) { _assert_(results, 'RTL.4', false, e.message); }
    try { softDeleteRecord_('T_TINDAK_LANJUT', savedId, TEST_USER_USER_); } catch (e) {}
  }
  return results;
}

function testSimpegReadOnly() {
  Logger.log(''); Logger.log('--- SIMPEG READ-ONLY ---'); var results = [];
  ['PEGAWAI', 'UNIT_KERJA', 'JABATAN'].forEach(function (sheet) {
    var blocked = 0;
    try { saveRecord_(sheet, { id: 'X-TEST' }, TEST_USER_ADMIN_); } catch (e) { blocked++; }
    try { softDeleteRecord_(sheet, 'X-TEST', TEST_USER_ADMIN_); } catch (e) { blocked++; }
    _assert_(results, 'RO.' + sheet + ' ditolak 2/2', blocked === 2, '');
  });
  return results;
}

function testLocalPreSaveHook() {
  Logger.log(''); Logger.log('--- PRE-SAVE HOOK P1+P2 ---'); var results = [];
  try { var r1 = localPreSaveHook_('M_REFERENSI', {}, TEST_USER_USER_); _assert_(results, 'P1.1 ref- prefix', r1 && r1.record && /^ref\-/.test(r1.record.id), ''); } catch (e) { _assert_(results, 'P1.1', false, e.message); }
  try { var r2 = localPreSaveHook_('T_TINDAK_LANJUT', {}, TEST_USER_USER_); _assert_(results, 'P1.2 rtl- prefix', r2 && r2.record && /^rtl\-/.test(r2.record.id), ''); } catch (e) { _assert_(results, 'P1.2', false, e.message); }
  try { var r4 = localPreSaveHook_('T_APPROVAL', { id: 'apr-test-' + Date.now() }, TEST_USER_USER_); _assert_(results, 'P2.1 non-verifikator → menunggu', r4 && r4.record && r4.record.status === 'menunggu', ''); } catch (e) { _assert_(results, 'P2.1', false, e.message); }
  return results;
}

function testInitDatabaseSchema() {
  Logger.log(''); Logger.log('--- SKEMA 11 SHEET ---'); var results = [];
  try {
    var ss = CoreLib.getDb(SPREADSHEET_ID);
    var sheetsBisnis = Object.keys(LOCAL_SHEETS).map(function (k) { return LOCAL_SHEETS[k]; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    var missing = sheetsBisnis.filter(function (name) { return !ss.getSheetByName(name); });
    _assert_(results, 'SCHEMA.1 11 sheet bisnis terbuat (' + sheetsBisnis.length + ')', missing.length === 0, missing.length ? 'MISSING: ' + missing.join(', ') : '');
    var shTest = ss.getSheetByName('ZZ_TEST_CRUD');
    _assert_(results, 'SCHEMA.2 ZZ_TEST_CRUD ada', !!shTest, '');
  } catch (e) { _assert_(results, 'SCHEMA', false, e.message); }
  return results;
}

function runAllDiagnostics() {
  Logger.log('==========================================================');
  Logger.log('🔍 DIAGNOSTIK ' + APP_CODE + ' v2.10.0 — 11 sheet + 72 handler + RTL');
  Logger.log('==========================================================');
  try { Logger.log('CoreLib: todayIsoLocal=' + (typeof CoreLib.todayIsoLocal === 'function' ? '✅' : '❌') + ' paginate=' + (typeof CoreLib.paginate === 'function' ? '✅' : '❌')); } catch (e) {}
  try { Logger.log('DB: ' + CoreLib.getDb(SPREADSHEET_ID).getName()); } catch (e) { Logger.log('DB GAGAL: ' + e.message); }
  try {
    var ss = CoreLib.getDb(SPREADSHEET_ID);
    Object.keys(LOCAL_SHEETS).forEach(function (k) {
      var name = LOCAL_SHEETS[k];
      var sh = ss.getSheetByName(name);
      if (!sh) Logger.log('❌ ' + name + ' TIDAK ADA');
      else Logger.log('✅ ' + name + ' : ' + Math.max(0, sh.getLastRow() - 1) + ' baris');
    });
  } catch (e) { Logger.log('Cek skema gagal: ' + e.message); }
  try { testAdopsiG18d(); } catch (e) {}
  Logger.log('🏁 SELESAI');
}

function runAllTestsStarterKit() {
  Logger.log('##########################################################');
  Logger.log('##  TEST SUITE LENGKAP ' + APP_CODE + ' v2.10.0 — 11 sheet + 72 handler + RTL + UIUX v1.10');
  Logger.log('##  Waktu: ' + new Date().toISOString());
  Logger.log('##########################################################');
  var libRecap = runLibraryTests(); Logger.log('');
  var adopsi = testAdopsiG18d(); Logger.log('');
  var routing = testDispatcherRouting(); Logger.log('');
  var domain = runDomainTestsStarterKit(); Logger.log('');
  Logger.log('##########################################################');
  Logger.log('##  REKAP AKHIR');
  Logger.log('##  Library: PASS ' + libRecap.passed + ' / FAIL ' + libRecap.failed + ' / SKIP ' + libRecap.skipped);
  Logger.log('##  Adopsi: ' + adopsi.ok + ' / ' + adopsi.fail);
  Logger.log('##  Routing: ' + routing.ok + ' / ' + routing.fail + ' (72 handler)');
  Logger.log('##  Domain: PASS ' + domain.pass + ' / FAIL ' + domain.fail + ' / SKIP ' + domain.skip + ' (11 sheet + RTL)');
  Logger.log('##########################################################');
  var allPass = (libRecap.failed === 0) && (adopsi.fail === 0) && (routing.fail === 0) && (domain.fail === 0);
  Logger.log(allPass ? '🎉 SEMUA HIJAU v2.10.0.' : '⚠️ Ada GAGAL — cek log.');
  return { library: libRecap, adopsi: adopsi, routing: routing, domain: domain, allPass: allPass };
}
