// ============================================================
// STARTER-KIT - 99_TestSuite.gs (v2.0.0 — CoreLib-First)
// ============================================================
// Test suite mengikuti pola si-kompetensi v3.0.1 & si-lahar v2.0:
//   1) runLibraryTests()      → CoreLib.runCoreTests (target 42/0/1)
//   2) testAdopsiG18d()       → verifikasi util publik CoreLib v2.3.0
//   3) testDispatcherRouting()→ registry handler + fail-closed
//   4) runAllTestsStarterKit()→ satu pintu eksekusi
//
// Karena starter-kit TIDAK punya domain bisnis, tidak ada
// runDomainTestsSI() — kalau app Anda mulai punya logika bisnis,
// tambahkan test domain sendiri mengikuti pola si-kompetensi.
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

/**
 * Verifikasi util publik CoreLib v2.3.0 yang dipakai app ini.
 * Murni in-memory — tidak menyentuh sheet.
 */
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

/**
 * Verifikasi bahwa semua aksi di buildLocalHandlers_ terdaftar,
 * punya entry di actionLevels (kecuali yang di-handle CoreLib native),
 * dan dispatcher mengembalikan response yang benar.
 */
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

  // Aksi builtin CoreLib.dispatchAction (punya handler internal, tidak perlu lokal)
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

  // 4. Ping TANPA token → ditolak (fail-closed di langkah auth)
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
  ['get_dashboard', 'get_pegawai_list', 'get_contoh_list', 'save_contoh',
   'delete_contoh', 'init_database', 'get_config'].forEach(function (a) {
    verdict(typeof handlers[a] === 'function', 'handler tersedia: ' + a);
  });

  Logger.log('ℹ️ Uji routing internal penuh (dengan token) memerlukan session aktif.');
  Logger.log('ℹ️ Jalankan testFullSsoIntegrationFlow() dengan tiket asli untuk uji end-to-end.');

  Logger.log('REKAP ROUTING: ' + ok + ' lolos, ' + fail + ' gagal.' + (fail === 0 ? ' 🎉' : ' — CEK ❌!'));
  return { ok: ok, fail: fail };
}

// ==================== §5 RUNNER: Diagnostics ====================

/**
 * Diagnostik kesehatan sistem — verifikasi CoreLib, DB, schema.
 */
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

  // 3. Skema sheet lokal
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
      (shTest ? Math.max(0, shTest.getLastRow() - 1) + ' baris' : 'belum dibuat (jalankan initDatabase)'));
  } catch (e) { Logger.log('❌ Cek skema gagal: ' + e.message); }

  // 4. SIMPEG reference (baca via master)
  try {
    Logger.log('✅ PEGAWAI (master): ' + getSheetData_('PEGAWAI').length + ' data');
    Logger.log('✅ UNIT_KERJA (master): ' + getSheetData_('UNIT_KERJA').length + ' data');
    Logger.log('✅ JABATAN (master): ' + getSheetData_('JABATAN').length + ' data');
  } catch (e) { Logger.log('❌ SIMPEG read: ' + e.message + ' (cek MASTER_SPREADSHEET_ID!)'); }

  // 5. Adopsi G18d (murni in-memory)
  try { testAdopsiG18d(); } catch (e) { Logger.log('❌ testAdopsiG18d: ' + e.message); }

  Logger.log('🏁 DIAGNOSTIK SELESAI');
}

// ==================== §6 DIAGNOSTIK SSO (manual, opsional) ====================

/**
 * Diagnostik koneksi SSO ke portal utama. Manual run dari editor.
 */
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

/**
 * Uji alur SSO end-to-end dengan tiket valid.
 * Isi `ticketValid` dari hasil createTestTicket di Global App / SI-PLATFORM.
 */
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

// ==================== §7 AGREGAT: Semua Test ====================

/**
 * Satu pintu: semua test starter-kit (library + adopsi + routing).
 *
 * Catatan: test SSO (testKoneksiKePortalSso, testFullSsoIntegrationFlow)
 * adalah diagnostik manual — tidak dipanggil otomatis di sini.
 */
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

  Logger.log('##########################################################');
  Logger.log('##  REKAP AKHIR');
  Logger.log('##  Library (CoreLib) : PASS ' + libRecap.passed + ' / FAIL ' + libRecap.failed + ' / SKIP ' + libRecap.skipped);
  Logger.log('##  Adopsi G18d       : ' + adopsi.ok + ' lolos / ' + adopsi.fail + ' gagal');
  Logger.log('##  Routing           : ' + routing.ok + ' lolos / ' + routing.fail + ' gagal');
  Logger.log('##########################################################');

  var allPass = (libRecap.failed === 0) && (adopsi.fail === 0) && (routing.fail === 0);
  Logger.log(allPass ? '🎉 SEMUA TEST HIJAU.' : '⚠️ Ada test GAGAL — cek log di atas.');

  return {
    library: libRecap,
    adopsi:  adopsi,
    routing: routing,
    allPass: allPass
  };
}
