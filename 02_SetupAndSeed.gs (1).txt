// ==================== FILE 2: SETUP DATABASE & SEED ====================
// Jalankan SEKALI setelah konfigurasi: Run ▸ initDatabaseApp (izinkan scope).

function initDatabaseApp() {
  var ssId = getSpreadsheetId_();
  if (!ssId || ssId.indexOf('ISI-ID') === 0) {
    throw new Error('Isi DEFAULT_SPREADSHEET_ID di 01_Config.gs dulu (atau set Script Properties SPREADSHEET_ID).');
  }

  // 1) Buat/rapikan semua sheet app + header hijau (pola C1: delegasi CoreLib)
  Object.keys(ALL_SHEET_HEADERS).forEach(function (sheetName) {
    CoreLib.ensureSheet(ssId, sheetName, ALL_SHEET_HEADERS, {
      decorate: true,
      isRefFunc: isRefSheet_
    });
    Logger.log('✅ Sheet siap: ' + sheetName);
  });

  // 2) Hapus "Sheet1" bawaan spreadsheet baru (bila ada & kosong)
  try {
    var ss = CoreLib.getDb(ssId);
    var s1 = ss.getSheetByName('Sheet1');
    if (s1 && s1.getLastRow() === 0) { ss.deleteSheet(s1); Logger.log('🧹 Sheet1 kosong dihapus.'); }
  } catch (e) { Logger.log('Sheet1 skip: ' + e.message); }

  // 3) Seed referensi awal (idempoten — tidak dobel bila diulang)
  seedReferensi_(ssId);
  Logger.log('🎉 initDatabaseApp selesai. App siap dipakai.');
}

function seedReferensi_(ssId) {
  var existing = CoreLib.getSheetDataCached(ssId, 'M_REFERENSI', ALL_SHEET_HEADERS, 0, { isRefFunc: isRefSheet_ });
  if ((existing || []).length) { Logger.log('M_REFERENSI sudah berisi, seed dilewati.'); return; }
  var seed = [
    { kategori: 'status', kode: 'draft',    nama_nilai: 'Draft',    urutan: 1, status_aktif: 'aktif' },
    { kategori: 'status', kode: 'diajukan', nama_nilai: 'Diajukan', urutan: 2, status_aktif: 'aktif' },
    { kategori: 'status', kode: 'selesai',  nama_nilai: 'Selesai',  urutan: 3, status_aktif: 'aktif' }
  ];
  seed.forEach(function (row) {
    row.id = Utilities.getUuid();
    CoreLib.apiSave(ssId, 'M_REFERENSI', row, { name: 'system' }, ALL_SHEET_HEADERS, isRefSheet_);
  });
  Logger.log('✅ Seed M_REFERENSI: ' + seed.length + ' baris.');
}
