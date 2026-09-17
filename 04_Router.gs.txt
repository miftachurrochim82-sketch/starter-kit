// ==================== FILE 4: ROUTER & ENTRY POINT HTTP ====================

// GET = tampilkan aplikasi. Tiket SSO dari si-platform (?ticket=...) diteruskan ke frontend.
function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  template.ticket = (e && e.parameter && e.parameter.ticket) ? e.parameter.ticket : '';
  return template
    .evaluate()
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// POST = jalur API alternatif (frontend SPA utamanya memakai google.script.run → api()).
function doPost(e) {
  var out;
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    out = handleApi(body);
  } catch (err) {
    out = { success: false, error: { message: 'Permintaan tidak valid.' } };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

// Pintu masuk SPA (dipanggil J_App via google.script.run).
function api(payload) {
  return handleApi(payload);
}

// Helper include untuk Index.html.
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
