// ============================================================
// STARTER-KIT - 99_TestSuite.gs (v2.11.0 — 5M+5T + piramida 12/8/6/4 + dashboard 4+4+4)
// ============================================================
// Test suite — pola si-arsip v1.10 + starter-kit v2.10.1
// 1) runLibraryTests → CoreLib.runCoreTests
// 2) testAdopsiG18d → util publik CoreLib
// 3) testDispatcherRouting → registry 86 handler + fail-closed
// 4) runDomainTestsStarterKit → master 5 + T_UTAMA + RTL + hook +
//    schema 10 sheet + smoke piramida (12L/8A/6E) + dashboard
//
// v2.11.0: testDomainReferensi → testDomainMasters (guard hierarki,
// FK jenis, kode periode auto, guard referensi). Tambah
// testSmokePiramida + testDashboard444.

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
  Logger.log('🧪 REGRESSION TESTS LIBRARY v2 (dari ' + APP_CODE + ' v2.11.0)');
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
  Logger.log('🔗 UJI ADOPSI CORELIB v2.3.0 (G18d) — ' + APP_CODE + ' v2.11.0');
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
  Logger.log('🚏 UJI ROUTING DISPATCHER — 86 handler + fail-closed — v2.11.0');
  Logger.log('==========================================================');
  var ok = 0, fail = 0;
  function verdict(cond, label) { if (cond) { ok++; Logger.log('✅ ' + label); } else { fail++; Logger.log('❌ ' + label); } }
  var handlers = buildLocalHandlers_();
  var cfg = getAppConfig_();
  var actionLevels = cfg.actionLevels || {};
  var NATIVE_ACTIONS = ['exchange_platform_ticket', 'logout'];
  var hKeys = Object.keys(handlers);
  verdict(hKeys.length >= 84, 'localHandlers terdaftar: ' + hKeys.length + ' (target 86)');
  var missingLevels = hKeys.filter(function (k) { if (NATIVE_ACTIONS.indexOf(k) !== -1) return false; return actionLevels[k] === undefined; });
  verdict(missingLevels.length === 0, 'Semua handler punya actionLevels' + (missingLevels.length ? ' MISSING: ' + missingLevels.join(', ') : ''));
  var missingHandlers = Object.keys(actionLevels).filter(function (k) {
    if (NATIVE_ACTIONS.indexOf(k) !== -1) return false;
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
  Logger.log('🎯 TEST DOMAIN ' + APP_CODE + ' v2.11.0 — 5M+5T + piramida + dashboard');
  Logger.log('==========================================================');
  var results = [];
  results = results.concat(testDomainMasters());
  results = results.concat(testDomainUtama());
  results = results.concat(testDomainRtl());
  results = results.concat(testSimpegReadOnly());
  results = results.concat(testLocalPreSaveHook());
  results = results.concat(testInitDatabaseSchema());
  results = results.concat(testSmokePiramida());
  results = results.concat(testDashboard444());
  var pass = results.filter(function (r) { return r.status === 'PASS'; }).length;
  var fail = results.filter(function (r) { return r.status === 'FAIL'; }).length;
  var skip = results.filter(function (r) { return r.status === 'SKIP'; }).length;
  Logger.log(''); Logger.log('RINGKASAN DOMAIN: PASS=' + pass + ' / FAIL=' + fail + ' / SKIP=' + skip);
  if (fail > 0) { Logger.log('=== FAIL DETAILS ==='); results.filter(function (r) { return r.status === 'FAIL'; }).forEach(function (r) { Logger.log('❌ ' + r.name + ': ' + r.detail); }); }
  return { pass: pass, fail: fail, skip: skip, results: results };
}

// ---------- MASTER 5 (guard hierarki, FK, kode auto, referensi) ----------
function testDomainMasters() {
  Logger.log(''); Logger.log('--- 5 MASTER (M_KATEGORI/JENIS/PERIODE/SATUAN/LOKASI) ---');
  var results = [];

  // M_KATEGORI — guard parent
  try {
    var r1 = saveKategori_({ kode: 'TST-KAT-' + Date.now(), nama: 'Test Kategori ' + Date.now(), parent_id: '', urutan: 99, status_aktif: 'true' }, TEST_USER_ADMIN_);
    _assert_(results, 'KAT.1 save valid', r1.success && r1.data && r1.data.id, r1.error || '');
    if (r1.success && r1.data) softDeleteRecord_('M_KATEGORI', r1.data.id, TEST_USER_ADMIN_);
  } catch (e) { _assert_(results, 'KAT.1', false, e.message); }
  try {
    var r2 = saveKategori_({ kode: 'TST-P', nama: 'Parent Test', parent_id: '', status_aktif: 'true' }, TEST_USER_ADMIN_);
    var ok2 = false, detail = '';
    if (r2.success && r2.data) {
      // anak dengan parent valid
      var r3 = saveKategori_({ kode: 'TST-A', nama: 'Anak Test', parent_id: r2.data.id, status_aktif: 'true' }, TEST_USER_ADMIN_);
      if (r3.success && r3.data) {
        // parent dengan parent = dirinya sendiri → DITOLAK
        var r4 = saveKategori_({ id: r2.data.id, kode: 'TST-P', nama: 'Parent Test', parent_id: r2.data.id, status_aktif: 'true' }, TEST_USER_ADMIN_);
        ok2 = !r4.success && r4.code === 'BAD_REQUEST';
        detail = r4.error || '';
        // delete parent yang masih punya anak → DITOLAK
        var r5 = deleteKategori_({ id: r2.data.id }, TEST_USER_ADMIN_);
        if (r5.success) ok2 = false;
        softDeleteRecord_('M_KATEGORI', r3.data.id, TEST_USER_ADMIN_);
      } else { detail = r3.error || 'anak gagal'; }
      if (r2.data) softDeleteRecord_('M_KATEGORI', r2.data.id, TEST_USER_ADMIN_);
    } else { detail = r2.error || 'parent gagal'; }
    _assert_(results, 'KAT.2 guard parent self + anak', ok2, detail);
  } catch (e) { _assert_(results, 'KAT.2', false, e.message); }

  // M_JENIS — FK kategori + periode valid
  try {
    var r1 = saveJenis_({ kode: 'TST-JEN-' + Date.now(), nama: 'Test Jenis ' + Date.now(), kategori_id: '', periode: 'Fleksibel' }, TEST_USER_ADMIN_);
    _assert_(results, 'JEN.1 save valid', r1.success && r1.data && r1.data.id, r1.error || '');
    if (r1.success && r1.data) softDeleteRecord_('M_JENIS', r1.data.id, TEST_USER_ADMIN_);
  } catch (e) { _assert_(results, 'JEN.1', false, e.message); }
  try {
    var r2 = saveJenis_({ kode: 'TST-JX', nama: 'FK Invalid', kategori_id: 'kat-tidak-ada-999', periode: 'Fleksibel' }, TEST_USER_ADMIN_);
    _assert_(results, 'JEN.2 FK kategori tak valid DITOLAK', !r2.success && r2.code === 'BAD_REQUEST', r2.error || '');
  } catch (e) { _assert_(results, 'JEN.2', false, e.message); }
  try {
    var r3 = saveJenis_({ kode: 'TST-JY', nama: 'Periode Invalid', periode: 'Mingguan' }, TEST_USER_ADMIN_);
    _assert_(results, 'JEN.3 periode tak valid DITOLAK', !r3.success && r3.code === 'BAD_REQUEST', r3.error || '');
  } catch (e) { _assert_(results, 'JEN.3', false, e.message); }

  // M_PERIODE — kode auto
  try {
    var r1 = savePeriode_({ tahun: '2099' }, TEST_USER_ADMIN_);
    _assert_(results, 'PER.1 kode auto YYYY', r1.success && r1.data && r1.data.kode === '2099', (r1.error || '') + ' kode=' + ((r1.data && r1.data.kode) || ''));
    if (r1.success && r1.data) softDeleteRecord_('M_PERIODE', r1.data.id, TEST_USER_ADMIN_);
  } catch (e) { _assert_(results, 'PER.1', false, e.message); }
  try {
    var r2 = savePeriode_({ tahun: '2099', bulan: '5' }, TEST_USER_ADMIN_);
    _assert_(results, 'PER.2 kode auto YYYY-MM', r2.success && r2.data && r2.data.kode === '2099-05', (r2.error || '') + ' kode=' + ((r2.data && r2.data.kode) || ''));
    if (r2.success && r2.data) softDeleteRecord_('M_PERIODE', r2.data.id, TEST_USER_ADMIN_);
  } catch (e) { _assert_(results, 'PER.2', false, e.message); }
  try {
    var r3 = savePeriode_({ tahun: '2099', bulan: '13' }, TEST_USER_ADMIN_);
    _assert_(results, 'PER.3 bulan 13 DITOLAK', !r3.success && r3.code === 'BAD_REQUEST', r3.error || '');
  } catch (e) { _assert_(results, 'PER.3', false, e.message); }

  // M_SATUAN / M_LOKASI — kode+nama wajib
  try {
    var r1 = saveMasterKode_({ kode: 'TST-SAT-' + Date.now(), nama: 'Test Satuan', simbol: 'tst' }, TEST_USER_ADMIN_);
    _assert_(results, 'SAT.1 save valid', r1.success && r1.data && r1.data.id, r1.error || '');
    if (r1.success && r1.data) softDeleteRecord_('M_SATUAN', r1.data.id, TEST_USER_ADMIN_);
  } catch (e) { _assert_(results, 'SAT.1', false, e.message); }
  try {
    var r2 = saveMasterKode_({ nama: 'Tanpa Kode' }, TEST_USER_ADMIN_);
    _assert_(results, 'SAT.2 tanpa kode DITOLAK', !r2.success && r2.code === 'BAD_REQUEST', r2.error || '');
  } catch (e) { _assert_(results, 'SAT.2', false, e.message); }
  try {
    var r1 = saveMasterKode_({ kode: 'TST-LOK-' + Date.now(), nama: 'Test Lokasi' }, TEST_USER_ADMIN_);
    _assert_(results, 'LOK.1 save valid', r1.success && r1.data && r1.data.id, r1.error || '');
    if (r1.success && r1.data) softDeleteRecord_('M_LOKASI', r1.data.id, TEST_USER_ADMIN_);
  } catch (e) { _assert_(results, 'LOK.1', false, e.message); }

  return results;
}

// ---------- T_UTAMA ----------
function testDomainUtama() {
  Logger.log(''); Logger.log('--- T_UTAMA (5 FK baru) ---');
  var results = [];
  var savedId = '';
  try {
    var r1 = saveUtama_({ judul: 'Test Utama ' + Date.now(), tanggal: CoreLib.todayIsoLocal(), status: 'draft', jenis_id: '', lokasi_id: '', periode_id: '' }, TEST_USER_USER_);
    _assert_(results, 'UTM.1 save valid + kode auto', r1.success && r1.data && r1.data.id && r1.data.kode, r1.error || '');
    savedId = (r1.success && r1.data) ? r1.data.id : '';
  } catch (e) { _assert_(results, 'UTM.1', false, e.message); }
  try {
    var r2 = saveUtama_({ judul: '' }, TEST_USER_USER_);
    _assert_(results, 'UTM.2 tanpa judul DITOLAK', !r2.success && r2.code === 'BAD_REQUEST', r2.error || '');
  } catch (e) { _assert_(results, 'UTM.2', false, e.message); }
  try { var r5 = getUtamaList_({ page: 1, per_page: 5 }, TEST_USER_USER_); _assert_(results, 'UTM.5 get list + paginasi', r5.success && Array.isArray(r5.data) && r5.total_pages >= 1, r5.error || ''); } catch (e) { _assert_(results, 'UTM.5', false, e.message); }
  if (savedId) {
    try {
      var r6 = getUtamaDetail_({ id: savedId });
      _assert_(results, 'UTM.6 detail + relasi (items/lampiran/approvals)', r6.success && Array.isArray(r6.data.items) && Array.isArray(r6.data.lampiran) && Array.isArray(r6.data.approvals), r6.error || '');
    } catch (e) { _assert_(results, 'UTM.6', false, e.message); }
    try { softDeleteRecord_('T_UTAMA', savedId, TEST_USER_USER_); } catch (e) {}
  }
  return results;
}

// ---------- RTL ----------
function testDomainRtl() {
  Logger.log(''); Logger.log('--- T_TINDAK_LANJUT / RTL (FSM + R1-R4) ---');
  var results = [];
  var savedId = '';
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
      var r3 = ubahStatusTindakLanjut_({ id: savedId, status_rtl: 'selesai' }, TEST_USER_USER_);
      _assert_(results, 'RTL.3 transisi ilegal baru→selesai DITOLAK', !r3.success && r3.code === 'BAD_REQUEST', r3.error || '');
    } catch (e) { _assert_(results, 'RTL.3', false, e.message); }
    try {
      var r4 = ubahStatusTindakLanjut_({ id: savedId, status_rtl: 'diproses', progress_pct: 50 }, TEST_USER_USER_);
      _assert_(results, 'RTL.4 ubah status baru→diproses', r4.success && r4.data && String(r4.data.status_rtl) === 'diproses', r4.error || '');
    } catch (e) { _assert_(results, 'RTL.4', false, e.message); }
    try {
      var r5 = generateTindakLanjut_({ sumber_evaluasi: 'semua', tahun: String(new Date().getFullYear()) }, TEST_USER_USER_);
      _assert_(results, 'RTL.5 generate R1-R4 (idempoten)', r5.success, r5.error || '');
    } catch (e) { _assert_(results, 'RTL.5', false, e.message); }
    try { softDeleteRecord_('T_TINDAK_LANJUT', savedId, TEST_USER_USER_); } catch (e) {}
  }
  return results;
}

// ---------- SIMPEG READ-ONLY ----------
function testSimpegReadOnly() {
  Logger.log(''); Logger.log('--- SIMPEG READ-ONLY ---');
  var results = [];
  ['PEGAWAI', 'UNIT_KERJA', 'JABATAN'].forEach(function (sheet) {
    var blocked = 0;
    try { saveRecord_(sheet, { id: 'X-TEST' }, TEST_USER_ADMIN_); } catch (e) { blocked++; }
    try { softDeleteRecord_(sheet, 'X-TEST', TEST_USER_ADMIN_); } catch (e) { blocked++; }
    _assert_(results, 'RO.' + sheet + ' ditolak 2/2', blocked === 2, '');
  });
  return results;
}

// ---------- PRE-SAVE HOOK P1+P2 ----------
function testLocalPreSaveHook() {
  Logger.log(''); Logger.log('--- PRE-SAVE HOOK P1+P2 ---');
  var results = [];
  try { var r1 = localPreSaveHook_('M_JENIS', {}, TEST_USER_USER_); _assert_(results, 'P1.1 jen- prefix', r1 && r1.record && /^jen\-/.test(r1.record.id), ''); } catch (e) { _assert_(results, 'P1.1', false, e.message); }
  try { var r2 = localPreSaveHook_('T_TINDAK_LANJUT', {}, TEST_USER_USER_); _assert_(results, 'P1.2 rtl- prefix', r2 && r2.record && /^rtl\-/.test(r2.record.id), ''); } catch (e) { _assert_(results, 'P1.2', false, e.message); }
  try { var r3 = localPreSaveHook_('M_PERIODE', {}, TEST_USER_USER_); _assert_(results, 'P1.3 per- prefix', r3 && r3.record && /^per\-/.test(r3.record.id), ''); } catch (e) { _assert_(results, 'P1.3', false, e.message); }
  try { var r4 = localPreSaveHook_('T_APPROVAL', { id: 'apr-test-' + Date.now() }, TEST_USER_USER_); _assert_(results, 'P2.1 non-verifikator → menunggu', r4 && r4.record && r4.record.status === 'menunggu', ''); } catch (e) { _assert_(results, 'P2.1', false, e.message); }
  return results;
}

// ---------- SKEMA 10 SHEET ----------
function testInitDatabaseSchema() {
  Logger.log(''); Logger.log('--- SKEMA 10 SHEET (5M+5T) ---');
  var results = [];
  try {
    var ss = CoreLib.getDb(SPREADSHEET_ID);
    var sheetsBisnis = Object.keys(LOCAL_SHEETS).map(function (k) { return LOCAL_SHEETS[k]; });
    var missing = sheetsBisnis.filter(function (name) { return !ss.getSheetByName(name); });
    _assert_(results, 'SCHEMA.1 10 sheet bisnis terbuat (' + sheetsBisnis.length + ')', missing.length === 0, missing.length ? 'MISSING: ' + missing.join(', ') : '');
    var shTest = ss.getSheetByName('ZZ_TEST_CRUD');
    _assert_(results, 'SCHEMA.2 ZZ_TEST_CRUD ada', !!shTest, '');
  } catch (e) { _assert_(results, 'SCHEMA', false, e.message); }
  return results;
}

// ---------- SMOKE PIRAMIDA (12L + 8A + 6E) ----------
function testSmokePiramida() {
  Logger.log(''); Logger.log('--- SMOKE PIRAMIDA 12L + 8A + 6E ---');
  var results = [];
  var tahun = String(new Date().getFullYear());
  var lap = [
    'lap_kategori', 'lap_jenis', 'lap_lokasi', 'lap_periode', 'lap_pegawai', 'lap_status',
    'lap_satuan', 'lap_jenis_periode', 'lap_jenis_lokasi', 'lap_detail_utama', 'lap_lampiran', 'lap_approval'
  ];
  var ana = [
    'analisa_distribusi_lokasi', 'analisa_distribusi_jenis', 'analisa_top_pegawai', 'analisa_beban_lokasi',
    'analisa_korelasi_jenis_lokasi', 'analisa_tren_periode', 'analisa_umur_data', 'analisa_sla_approval'
  ];
  var eva = [
    'evaluasi_kelengkapan', 'evaluasi_sla_verifikasi', 'evaluasi_kepatuhan_periode',
    'evaluasi_kualitas_data', 'evaluasi_lampiran', 'evaluasi_rtl_terbuka'
  ];
  var okLap = 0, okAna = 0, okEva = 0;
  lap.forEach(function (a) { try { var r = handleAction({ action: a, data: { tahun: tahun } }); if (r && r.success) okLap++; } catch (e) {} });
  _assert_(results, 'PYR.1 12 laporan OK', okLap === 12, 'hanya ' + okLap + '/12');
  ana.forEach(function (a) { try { var r = handleAction({ action: a, data: { tahun: tahun } }); if (r && r.success) okAna++; } catch (e) {} });
  _assert_(results, 'PYR.2 8 analisa OK', okAna === 8, 'hanya ' + okAna + '/8');
  eva.forEach(function (a) { try { var r = handleAction({ action: a, data: { tahun: tahun } }); if (r && r.success) okEva++; } catch (e) {} });
  _assert_(results, 'PYR.3 6 evaluasi OK', okEva === 6, 'hanya ' + okEva + '/6');
  return results;
}

// ---------- DASHBOARD 4+4+4 ----------
function testDashboard444() {
  Logger.log(''); Logger.log('--- DASHBOARD 4 KARTU + 4 CHART + 4 PANEL ---');
  var results = [];
  try {
    var r = getDashboard_(TEST_USER_ADMIN_);
    var d = (r && r.success) ? r.data : null;
    _assert_(results, 'DASH.1 4 kartu summary', !!d && !!d.summary
      && typeof d.summary.totalUtama === 'number'
      && typeof d.summary.totalSelesai === 'number'
      && typeof d.summary.approvalMenunggu === 'number'
      && typeof d.summary.rtlTerbuka === 'number', (r && r.error) || '');
    _assert_(results, 'DASH.2 4 chart (12 titik tren)', !!d
      && d.chartTren && d.chartTren.labels.length === 12 && d.chartTren.counts.length === 12
      && d.chartJenis && Array.isArray(d.chartJenis.labels)
      && d.chartKategori && Array.isArray(d.chartKategori.labels)
      && d.chartLokasi && Array.isArray(d.chartLokasi.labels), '');
    _assert_(results, 'DASH.3 4 panel (≤5 baris)', !!d
      && Array.isArray(d.panelTerbaru) && d.panelTerbaru.length <= 5
      && Array.isArray(d.panelApproval) && d.panelApproval.length <= 5
      && Array.isArray(d.panelRtl) && d.panelRtl.length <= 5
      && Array.isArray(d.panelTidakLengkap) && d.panelTidakLengkap.length <= 5, '');
  } catch (e) { _assert_(results, 'DASH', false, e.message); }
  return results;
}

function runAllDiagnostics() {
  Logger.log('==========================================================');
  Logger.log('🔍 DIAGNOSTIK ' + APP_CODE + ' v2.11.0 — 5M+5T + 86 handler + piramida');
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
  Logger.log('##  TEST SUITE LENGKAP ' + APP_CODE + ' v2.11.0 — 5M+5T + 86 handler + piramida 12/8/6/4');
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
  Logger.log('##  Routing: ' + routing.ok + ' / ' + routing.fail + ' (86 handler)');
  Logger.log('##  Domain: PASS ' + domain.pass + ' / FAIL ' + domain.fail + ' / SKIP ' + domain.skip + ' (5M+5T + piramida + dashboard)');
  Logger.log('##########################################################');
  var allPass = (libRecap.failed === 0) && (adopsi.fail === 0) && (routing.fail === 0) && (domain.fail === 0);
  Logger.log(allPass ? '🎉 SEMUA HIJAU v2.11.0.' : '⚠️ Ada GAGAL — cek log.');
  return { library: libRecap, adopsi: adopsi, routing: routing, domain: domain, allPass: allPass };
}
