// ==================== FILE 3: LOGIKA APLIKASI (handleApi) ====================
// Satu pintu masuk untuk semua aksi frontend. Pola: switch(action) → delegasi CoreLib.

function handleApi(payload) {
  payload = payload || {};
  var action = String(payload.action || '');
  var data = payload.data || {};
  var token = payload.token || '';
  try {
    switch (action) {
      case 'ping':
        return { success: true, data: { pong: true, app: APP_CODE } };
      case 'exchange_platform_ticket':
        return exchangeTicket_(data);
      case 'logout':
        try { CoreLib.logoutUser(token, SESSION_PREFIX); } catch (e) {}
        return { success: true };
      case 'get_dashboard':
        return withAuth_(token, function (user) { return getDashboard_(user); });
      case 'get_pegawai_list':
        return withAuth_(token, function () { return getPegawaiList_(); });
      case 'get_contoh_list':
        return withAuth_(token, function () { return getContohList_(); });
      case 'save_contoh':
        return withAuth_(token, function (user) { return saveContoh_(data, user); });
      case 'delete_contoh':
        return withAuth_(token, function (user) { return deleteContoh_(data, user); });
      default:
        return { success: false, error: { message: 'Aksi tidak dikenal: ' + action } };
    }
  } catch (err) {
    Logger.log('[handleApi] ' + action + ' error: ' + (err && err.message));
    return { success: false, error: { message: 'Terjadi kesalahan sistem. Coba lagi.' } };
  }
}

// --- Auth helpers (delegasi CoreLib — JANGAN salin ulang logikanya) ---

function withAuth_(token, fn) {
  var user = validateSessionToken_(token);
  if (!user) return { success: false, code: 'UNAUTHORIZED', error: { message: 'Sesi berakhir. Buka ulang dari SI-PLATFORM.' } };
  return fn(user);
}

function validateSessionToken_(token) {
  if (!token) return null;
  try {
    var r = CoreLib.checkAuth(token, 'viewer', SESSION_PREFIX);
    if (r && r.success && r.user) return r.user;
  } catch (e) { Logger.log('[validateSessionToken_] ' + e.message); }
  return null;
}

function exchangeTicket_(data) {
  var ticket = (typeof data === 'string') ? data : (data.ticket || '');
  ticket = String(ticket || '').trim();
  if (!ticket) return { success: false, error: { message: 'Tiket SSO tidak ditemukan.' } };
  var r = CoreLib.exchangePlatformTicket(ticket, corelibConfig_());
  if (r && r.success && r.data && r.data.user) {
    return { success: true, data: { token: r.data.token, user: r.data.user } };
  }
  return { success: false, error: { message: 'Tiket ditolak/kedaluwarsa. Kembali ke SI-PLATFORM dan buka ulang aplikasi.' } };
}

// --- Baca data ---

function getDashboard_(user) {
  var pegawai = getPegawaiList_();
  var contoh = getContohList_();
  return {
    success: true,
    data: {
      totalPegawai: ((pegawai && pegawai.data) || []).length,
      totalContoh: ((contoh && contoh.data) || []).length,
      role: (user && user.role) || 'viewer',
      nama: (user && (user.name || user.username)) || ''
    }
  };
}

// Master SIMPEG: CoreLib otomatis route PEGAWAI ke MASTER_SPREADSHEET_ID.
// TOLERANT READER: ambil hanya kolom yang dibutuhkan (kolom SIMPEG boleh tumbuh).
function getPegawaiList_() {
  var rows = CoreLib.getSheetDataCached(getSpreadsheetId_(), 'PEGAWAI', ALL_SHEET_HEADERS, 3600, {
    masterSsId: MASTER_SPREADSHEET_ID,
    isRefFunc: isRefSheet_
  });
  var lean = (rows || []).map(function (p) {
    return { pegawai_id: p.pegawai_id, nip: p.nip, nama: p.nama, email: p.email, unit_id: p.unit_id, jabatan_id: p.jabatan_id };
  });
  return { success: true, data: lean };
}

function getContohList_() {
  var rows = CoreLib.getSheetDataCached(getSpreadsheetId_(), 'T_CONTOH', ALL_SHEET_HEADERS, 60, { isRefFunc: isRefSheet_ });
  return { success: true, data: rows || [] };
}

// --- Tulis data (transaksi app ini sendiri) ---

function saveContoh_(data, user) {
  var judul = String(data.judul || '').trim();
  if (!judul) return { success: false, error: { message: 'Judul wajib diisi.' } };
  var record = {
    id: data.id || Utilities.getUuid(),
    kode: data.kode || CoreLib.genUniqueCode('CTH', 'T_CONTOH', 'kode', 4, getSpreadsheetId_(), ALL_SHEET_HEADERS),
    judul: judul,
    pegawai_id: data.pegawai_id || '',
    tanggal: data.tanggal || '',
    status: data.status || 'draft',
    keterangan: data.keterangan || ''
  };
  CoreLib.apiSave(getSpreadsheetId_(), 'T_CONTOH', record, user, ALL_SHEET_HEADERS, isRefSheet_);
  return { success: true, data: record };
}

function deleteContoh_(data, user) {
  if (!data || !data.id) return { success: false, error: { message: 'ID tidak valid.' } };
  CoreLib.apiDelete(getSpreadsheetId_(), 'T_CONTOH', data.id, user, ALL_SHEET_HEADERS, isRefSheet_);
  return { success: true };
}
