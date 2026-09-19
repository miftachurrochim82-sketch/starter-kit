// ============================================================
// STARTER-KIT - 00_Utils.gs (v2.0.0 — CoreLib-First)
// ============================================================
// Util domain-spesifik app. Wrapper tipis ke CoreLib + audit ke SI-PLATFORM.
//
// Pola identik dengan si-kompetensi 00_Utils.gs & si-lahar 00_Utils.gs.
//
// CATATAN: File ini WAJIB ada karena 02_AppLogic.gs memanggil audit_()
// di beberapa tempat (save_config_item, delete_config_item, init_database,
// setupApp). Tanpa file ini → ReferenceError: audit_ is not defined.
// ============================================================

/**
 * Audit log — kirim HTTP ke SI-PLATFORM (konsolidasi lintas-app).
 * Double-write by design: CoreLib juga menulis AUDIT_LOGS lokal
 * (untuk offline/debug).
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
    Logger.log('[AUDIT LOG WARN] ' + e.message);
  }
}

/**
 * Wrapper audit_ — dipakai luas di 02_AppLogic.gs.
 * Signature: audit_(actor, action, type, id, ok, msg)
 */
function audit_(actor, action, type, id, ok, msg) {
  sendAuditLog_(actor, action, type, id, ok ? 'SUCCESS' : 'FAILED', msg || '');
}
