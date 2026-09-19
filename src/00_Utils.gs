// ============================================================
// STARTER-KIT - 00_Utils.gs (v2.0.1 — CoreLib-First)
// ============================================================
// Util domain-spesifik app. Wrapper tipis ke CoreLib + audit ke SI-PLATFORM.
//
// Pola identik dengan si-kompetensi 00_Utils.gs & si-lahar 00_Utils.gs.
//
// ⚠️ File ini WAJIB ada karena 02_AppLogic.gs memanggil audit_() di:
//    - saveConfigItem_()   → SAVE_CONFIG / SAVE_CONFIG_DENIED
//    - deleteConfigItem_() → DELETE_CONFIG / DELETE_CONFIG_DENIED
//    - initDatabase()      → INIT_DB
//    - setupApp()          → SETUP_APP
//
//    Tanpa file ini → ReferenceError: audit_ is not defined saat
//    menjalankan initDatabase() / setupApp() / save config.
//
// Prinsip CoreLib-First:
//   File ini HANYA memuat util yang TIDAK ADA di CoreLib.
//   Audit HTTP ke SI-PLATFORM adalah domain-spesifik ekosistem Trenggalek
//   (CoreLib hanya menulis AUDIT_LOGS lokal).
//
// Double-write by design:
//   - SI-PLATFORM: konsolidasi lintas-app (HTTP).
//   - AUDIT_LOGS lokal: offline/debug (diurus CoreLib otomatis).
// ============================================================

/**
 * Audit log — kirim HTTP ke SI-PLATFORM (konsolidasi lintas-app).
 *
 * Fire-and-forget: kegagalan HTTP TIDAK menggagalkan operasi utama.
 * Aman dipanggil dengan actor null/undefined → actor_id 'anonymous'.
 *
 * @param {Object}  actor         — {email|id|username} dari session
 * @param {string}  action        — aksi (mis. 'SAVE_CONFIG', 'INIT_DB')
 * @param {string}  resourceType  — tipe resource (mis. 'CONFIG', 'SYSTEM')
 * @param {string}  resourceId    — ID resource (mis. key, 'ALL')
 * @param {string}  result        — 'SUCCESS' | 'FAILED'
 * @param {string}  details       — pesan singkat (dipotong backend jika perlu)
 */
function sendAuditLog_(actor, action, resourceType, resourceId, result, details) {
  try {
    var actorId = (actor && (actor.email || actor.id || actor.username)) || 'anonymous';
    if (!PLATFORM_API_URL) return;

    UrlFetchApp.fetch(PLATFORM_API_URL, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        action: 'record_audit',
        data: {
          actor_id:       actorId,
          application_id: APP_CODE,
          action:         action,
          resource_type:  resourceType,
          resource_id:    resourceId,
          result:         result || 'SUCCESS',
          details:        details || ''
        }
      }),
      muteHttpExceptions: true
    });
  } catch (e) {
    // Fire-and-forget: jangan ganggu alur utama app
    Logger.log('[AUDIT LOG WARN] ' + e.message);
  }
}

/**
 * Wrapper audit_ — signature lama dipertahankan agar call-site
 * di 02_AppLogic.gs tidak perlu diubah.
 *
 * Pemetaan:
 *   audit_(actor, action, type, id, ok, msg)
 *     → sendAuditLog_(actor, action, type, id, ok ? 'SUCCESS' : 'FAILED', msg)
 *
 * @param {Object}  actor   — {email|id|role} dari session
 * @param {string}  action  — nama aksi
 * @param {string}  type    — resource type
 * @param {string}  id      — resource id
 * @param {boolean} ok      — true=SUCCESS, false=FAILED
 * @param {string}  msg     — detail pesan
 */
function audit_(actor, action, type, id, ok, msg) {
  sendAuditLog_(
    actor,
    action,
    type,
    id,
    ok ? 'SUCCESS' : 'FAILED',
    msg || ''
  );
}

// ============================================================
// SELF-CHECK (opsional)
// ============================================================
/**
 * Verifikasi cepat — panggil dari editor GAS untuk memastikan
 * file ini terpasang & fungsi tersedia.
 */
function testUtilsSelfCheck() {
  Logger.log('=== 00_Utils.gs v2.0.1 self-check ===');

  // 1. Fungsi tersedia
  Logger.log((typeof audit_           === 'function' ? '✅' : '❌') + ' audit_ tersedia');
  Logger.log((typeof sendAuditLog_    === 'function' ? '✅' : '❌') + ' sendAuditLog_ tersedia');

  // 2. PLATFORM_API_URL tersedia (dari 01_ConfigAndBridge)
  var hasUrl = (typeof PLATFORM_API_URL !== 'undefined' && PLATFORM_API_URL) ? '✅' : '❌';
  Logger.log(hasUrl + ' PLATFORM_API_URL tersedia (' +
             ((typeof PLATFORM_API_URL !== 'undefined' && PLATFORM_API_URL)
               ? String(PLATFORM_API_URL).slice(0, 60) + '…'
               : '(kosong)') + ')');

  // 3. Fire-and-forget test (tidak akan error walau URL kosong)
  try {
    audit_({ email: 'test@example.com' }, 'SELF_CHECK', 'SYSTEM', 'ALL', true, 'Ping dari self-check');
    Logger.log('✅ audit_() tidak melempar error');
  } catch (e) {
    Logger.log('❌ audit_() melempar error: ' + e.message);
  }

  Logger.log('=== Selesai ===');
}
