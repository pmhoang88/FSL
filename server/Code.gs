/******************************************************************************
 * ⚡ QUẢN LÝ THIẾT BỊ PRO – Âm thanh · Ánh sáng · Cho thuê show
 * Template Google Sheets + Apps Script (bản mẫu d&b J/SL-Series + DiGiCo Quantum)
 *
 * Cách dùng nhanh:
 *   1. Tiện ích mở rộng → Apps Script → dán 3 file: Code.gs, Images.gs, App.html
 *   2. Lưu → tải lại Google Sheet → menu "⚡ QUẢN LÝ THIẾT BỊ PRO"
 *   3. Menu → "Khởi tạo / Cập nhật Sheet chuẩn" → đồng ý nạp dữ liệu mẫu
 *
 * Muốn đổi sang việc khác (ánh sáng, LED, sân khấu, xe...):
 *   - Sửa sheet "Danh mục" (model), "Thiết bị" (từng cái có mã), "Liên kết" (câu hỏi popup)
 *   - Không cần sửa code. Nếu muốn đổi tên trạng thái / màu → sửa khối CẤU HÌNH bên dưới.
 ******************************************************************************/

/* =============================== CẤU HÌNH =============================== */
var APP = {
  NAME: 'QUẢN LÝ THIẾT BỊ PRO',
  MENU: '⚡ QUẢN LÝ THIẾT BỊ PRO',
  SUB: 'Âm thanh · Ánh sáng · Cho thuê show',
  VERSION: '2.0 (10/2026)'
};

var SH = {
  CFG: 'Cấu hình', CAT: 'Danh mục', ASSET: 'Thiết bị', RULE: 'Liên kết',
  SHOW: 'Show', LINE: 'Chi tiết show', LOG: 'Nhật ký', TEST: 'Kịch bản test', GUIDE: 'Hướng dẫn',
  ROLE: 'Chức vụ', USER: 'Người dùng', CUST: 'Khách hàng', DISC: 'Duyệt chiết khấu',
  VISIT: 'Truy cập', AUDIT: 'Nhật ký hệ thống', SYS: '_Hệ thống', MAINT: 'Bảo trì thiết bị',
  STAFF: 'Nhân sự', ASSIGN: 'Phân công nhân sự', TRANSPORT: 'Vận chuyển', PRICELOG: 'Nhật ký giá',
  PHAT: 'Tiền phạt show', CHI: 'Chi phí show', XE: 'Xe công ty'
};

/** Hiện trạng thiết bị (tách khỏi Trạng thái kho) */
var HT = { OK: 'Bình thường', SUA: 'Đã sửa chữa', BH: 'Đã bảo hành', CSUA: 'Cần sửa chữa', CBH: 'Cần bảo hành' };
var HT_LIST = [HT.OK, HT.SUA, HT.BH, HT.CSUA, HT.CBH];
/** Tình trạng lúc mua */
var TT_MUA = { MOI: 'Mới', LIKE: 'Like-new', CU_NGUYEN: 'Cũ – 80% còn lại, chưa sửa', CU_CHINH_HANG: 'Cũ – 60% còn lại, sửa chính hãng', CU_TU_SUA: 'Cũ – tự sửa, không dùng show lớn' };
var TT_MUA_LIST = [TT_MUA.MOI, TT_MUA.LIKE, TT_MUA.CU_NGUYEN, TT_MUA.CU_CHINH_HANG, TT_MUA.CU_TU_SUA];
/** Ngưỡng tổng tiền show coi là "show lớn" (mặc định, lưu ở sheet Cấu hình) */
var NGUONG_MAC_DINH = 500000000;

var COLS = {
  CFG:   ['Khóa', 'Giá trị', 'Ghi chú'],
  CAT:   ['Ảnh', 'Mã model', 'Hãng', 'Dòng', 'Họ', 'Tên thiết bị', 'Loại', 'Part No.', 'Mô tả / thông số',
          'Khối lượng (kg)', 'Đơn giá/ngày', 'Cho thuê riêng', 'Tham số popup', 'Ảnh URL', 'Mã ảnh',
          'Tổng', 'Trong kho', 'Chuẩn bị', 'Đang ở show', 'Bảo trì'],
  ASSET: ['Mã TB', 'Mã model', 'Tên thiết bị', 'Loại', 'Serial', 'Cấu hình', 'Thuộc bộ', 'Trạng thái',
          'Show hiện tại', 'Vị trí', 'Đã kiểm', 'Cập nhật lúc', 'Ghi chú',
          'Ngày sản xuất', 'Ngày mua', 'Tình trạng lúc mua', '% còn lại lúc mua', 'Hiện trạng', 'Không đi show lớn',
          'Xuất kho gần nhất', 'Nhập kho gần nhất'],
  MAINT: ['Mã TB', 'Ngày', 'Loại', 'Nội dung', 'Nơi thực hiện', 'Hiện trạng sau', 'Chi phí', 'Người ghi', 'Ghi chú'],
  RULE:  ['Model/Họ chính', 'Nhóm', 'Câu hỏi', 'Lựa chọn', 'Mặc định', 'Model kèm', 'Công thức SL',
          'Yêu cầu cấu hình', 'Ghi chú'],
  SHOW:  ['Mã show', 'Tên show', 'Khách hàng', 'Địa điểm', 'Loại', 'Ngày xuất kho', 'Ngày diễn',
          'Ngày nhập kho', 'Số ngày tính tiền', 'Trạng thái', 'Phụ trách', 'Tổng tiền', 'Ghi chú', 'Màu',
          'Mã KH', 'Chiết khấu %', 'Trạng thái CK', 'Người tạo', 'Thành phố', 'Kho xuất', 'Ngày diễn cuối', 'Mã ưu đãi', 'Chính sách CK'],
  LINE:  ['Mã show', 'STT', 'Mã model', 'Tên thiết bị', 'Loại', 'SL', 'Nguồn', 'Nhóm liên kết', 'Yêu cầu',
          'Đơn giá', 'Số ngày', 'Thành tiền', 'Mã TB đã gán', 'Ghi chú'],
  LOG:   ['Thời gian', 'Mã show', 'Mã TB', 'Từ', 'Sang', 'Người', 'Ghi chú'],
  STAFF: ['Mã NV', 'Họ tên', 'Vai trò', 'Kho làm việc', 'Điện thoại', 'Ghi chú'],
  ASSIGN: ['Mã phân công', 'Mã show', 'Mã NV', 'Ngày', 'Từ giờ', 'Đến giờ', 'Việc làm', 'Địa điểm', 'Mã TB', 'Ghi chú'],
  TRANSPORT: ['Mã vận chuyển', 'Mã show', 'Từ kho', 'Đến', 'Phương thức', 'Ngày gửi', 'Ngày dự kiến đến', 'Hạn chốt', 'Trạng thái', 'Số kiện', 'Mã TB', 'Ghi chú', 'Người ghi'],
  PRICELOG: ['Thời gian', 'Người', 'IP', 'Loại', 'Mã', 'Giá cũ', 'Giá mới', 'Ghi chú'],
  PHAT: ['Mã phạt', 'Mã show', 'Ngày', 'Loại', 'Mô tả', 'Số tiền', 'Người chịu', 'Người ghi', 'Ghi chú'],
  CHI: ['Mã chi', 'Mã show', 'Ngày', 'Khoản chi', 'Số tiền', 'Người ghi', 'Ghi chú'],
  XE: ['Mã xe', 'Loại xe', 'Biển số', 'Người được cấp', 'Ngày nhận', 'Ngày trả', 'Ghi chú', 'Người ghi'],
  TEST:  ['STT', 'Phần', 'Thao tác', 'Kết quả mong đợi', 'Đạt', 'Ghi chú'],
  GUIDE: ['Mục', 'Nội dung'],
  ROLE:  ['Chức vụ', 'Cấp', 'Chiết khấu tối đa %', 'Báo cáo cho', 'TAO_SHOW', 'XUAT_NHAP_KHO', 'SUA_DANH_MUC',
          'XEM_KHACH_HANG', 'SUA_KHACH_HANG', 'XEM_TAI_CHINH', 'QUAN_TRI_USER', 'KHOA_HE_THONG', 'XEM_NHAT_KY_HT', 'Ghi chú'],
  USER:  ['Username', 'Họ tên', 'Chức vụ', 'Cấp trên', 'Điện thoại', 'Email', 'Trạng thái', 'Ban đến ngày', 'Lý do khóa/ban',
          'Ngày tạo', 'Người tạo', 'Ngày sửa thông tin', 'Ngày đổi quyền', 'Ngày khóa/ban', 'Đăng nhập cuối', 'IP cuối', 'Ghi chú', 'Salt', 'Hash', 'Chức danh'],
  CUST:  ['Mã KH', 'Họ tên', 'Điện thoại', 'Công ty', 'Chức vụ', 'Cấp trên của KH', 'Cấp dưới của KH', 'Nơi làm trước đây', 'Địa chỉ',
          'Thói quen sinh hoạt', 'Giá mặc cả (% hay xin giảm)', 'Make up giá?', 'Ghi chú giá', 'Tên công ty xuất HĐ', 'MST', 'Địa chỉ xuất HĐ',
          'Email nhận HĐ', 'Tiền hồi %', 'Tiền hồi (số tiền)', 'Mùa cao điểm (ghi tay)', 'Phụ trách KH', 'Ghi chú', 'Ngày tạo', 'Người tạo', 'Ngày sửa',
          'Số show đã book', 'Show thành công', 'Ngày book gần nhất'],
  DISC:  ['Mã yêu cầu', 'Mã show', 'Người xin', 'Chức vụ người xin', 'CK xin %', 'Lý do', 'Gấp', 'Đang chờ', 'Trạng thái',
          'CK được duyệt %', 'Người duyệt', 'Lịch sử', 'Tạo lúc', 'Cập nhật lúc', 'IP'],
  VISIT: ['Thời gian', 'IP', 'Username', 'Thiết bị', 'Trang'],
  AUDIT: ['Thời gian', 'Username', 'Chức vụ', 'IP', 'Thao tác', 'Chi tiết', 'Thiết bị'],
  SYS:   ['Khóa', 'Giá trị', 'Hết hạn']
};

/** Trạng thái từng thiết bị (đổi chữ ở đây nếu muốn) */
var ST = { KHO: 'Trong kho', CB: 'Chuẩn bị đi show', SHOW: 'Đang ở show', BT: 'Bảo trì' };
var ST_LIST = [ST.KHO, ST.CB, ST.SHOW, ST.BT];
var ST_COLOR = {};
ST_COLOR[ST.KHO]  = { bg: '#dcfce7', fg: '#166534', dot: '#16a34a' };
ST_COLOR[ST.CB]   = { bg: '#fef3c7', fg: '#92400e', dot: '#f59e0b' };
ST_COLOR[ST.SHOW] = { bg: '#ede9fe', fg: '#5b21b6', dot: '#7c3aed' };
ST_COLOR[ST.BT]   = { bg: '#fee2e2', fg: '#991b1b', dot: '#ef4444' };

/** Trạng thái show. Các trạng thái "giữ hàng" mới bị trừ tồn kho theo ngày. */
var SHOW_ST = ['Báo giá', 'On Hold', 'Đã xác nhận', 'Đang soạn hàng', 'Đang ở show', 'Đã nhập kho', 'Hủy'];
var SHOW_HOLD = ['Đã xác nhận', 'Đang soạn hàng', 'Đang ở show'];
var SHOW_TYPES = ['Concert (cc)', 'Workshop (ws)', 'Training (tn)', 'Sự kiện / Hội nghị', 'Khác'];
var SHOW_COLORS = ['#7c3aed', '#0ea5e9', '#f97316', '#10b981', '#e11d48', '#6366f1', '#ca8a04', '#14b8a6'];

/** Loại thiết bị hiện trên "Lịch thiết bị tuần" (thiết bị chính) */
var MAIN_TYPES = ['Loa line array', 'Subwoofer', 'Rack ampli', 'Mixer', 'Stage rack'];

var HEADER_BG = '#16a34a';

/* ================================ MENU ================================== */
function onOpen() {
  SpreadsheetApp.getUi().createMenu(APP.MENU)
    .addItem('🚀 Mở Quản Lý Thiết Bị (Cửa sổ popup lớn)', 'openDialog')
    .addItem('🪟 Mở Cửa Sổ Nổi (Không khóa trang tính)', 'openModeless')
    .addItem('📌 Mở Bảng Nhanh (Sidebar bên phải)', 'openSidebar')
    .addSeparator()
    .addItem('⚙️ Khởi tạo / Cập nhật Sheet chuẩn', 'setupSheets')
    .addItem('🧪 Nạp lại dữ liệu mẫu (xóa dữ liệu cũ)', 'reseedDemo')
    .addItem('🖼️ Nạp ảnh minh họa vào Google Drive', 'uploadImagesToDrive')
    .addItem('🔄 Cập nhật công thức tồn kho (sheet Danh mục)', 'refreshCatalogFormulas')
    .addSeparator()
    .addItem('📤 Xuất dữ liệu cho bản offline (file JSON → Drive)', 'exportBackupToDrive')
    .addItem('📥 Nhập dữ liệu từ bản offline (file JSON)', 'openImportDialog')
    .addSeparator()
    .addItem('🌐 Hướng dẫn mở máy chủ cho app điện thoại', 'showServerGuide')
    .addToUi();
}

function render_(mode) {
  var t = HtmlService.createTemplateFromFile('App');
  t.mode = mode;
  return t.evaluate()
    .setTitle(APP.NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function openDialog() {
  SpreadsheetApp.getUi().showModalDialog(render_('dialog').setWidth(1280).setHeight(820), '⚡ ' + APP.NAME);
}
function openModeless() {
  SpreadsheetApp.getUi().showModelessDialog(render_('modeless').setWidth(1180).setHeight(760), '⚡ ' + APP.NAME + ' (cửa sổ nổi)');
}
function openSidebar() {
  SpreadsheetApp.getUi().showSidebar(render_('sidebar').setTitle('⚡ Bảng nhanh thiết bị'));
}

/* ============================== TIỆN ÍCH ================================ */
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function tz_() { try { return ss_().getSpreadsheetTimeZone() || Session.getScriptTimeZone(); } catch (e) { return 'Asia/Ho_Chi_Minh'; } }
function sh_(key) { return ss_().getSheetByName(SH[key]); }
function colLetter_(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
function idx_(key, header) { return COLS[key].indexOf(header) + 1; }
function user_() {
  var e = '';
  try { e = Session.getActiveUser().getEmail(); } catch (err) {}
  return e || cfgGet_('NGUOI_PHU_TRACH') || 'Người dùng';
}

/** Chuyển giá trị ô → 'yyyy-MM-dd' */
function d2s_(v) {
  if (v === '' || v === null || v === undefined) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, tz_(), 'yyyy-MM-dd');
  var s = String(v).trim();
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return s.slice(0, 10);
}
/** 'yyyy-MM-dd' → Date (12:00 trưa để không lệch ngày theo múi giờ) */
function s2d_(s) {
  if (!s) return '';
  return Utilities.parseDate(String(s).slice(0, 10) + ' 12:00', tz_(), 'yyyy-MM-dd HH:mm');
}
function dt2s_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, tz_(), 'dd/MM/yyyy HH:mm');
  return v === null || v === undefined ? '' : String(v);
}
function num_(v) { var n = Number(String(v).replace(/[^\d.\-]/g, '')); return isNaN(n) ? 0 : n; }
function bool_(v) { return v === true || String(v).toUpperCase() === 'TRUE' || v === 'x' || v === 'X' || v === 'Có'; }

/** Đọc cả bảng theo tên cột (dòng 1 là tiêu đề). Giữ cả dòng trống để ghi lại đúng vị trí. */
function readTable_(key) {
  var sh = sh_(key);
  if (!sh) throw new Error('Chưa có sheet "' + SH[key] + '". Hãy chạy menu → Khởi tạo / Cập nhật Sheet chuẩn.');
  var lr = sh.getLastRow(), lc = Math.max(sh.getLastColumn(), COLS[key].length);
  var headers = lr >= 1 ? sh.getRange(1, 1, 1, lc).getValues()[0].map(String) : COLS[key].slice();
  var rows = [];
  if (lr >= 2) {
    var vals = sh.getRange(2, 1, lr - 1, lc).getValues();
    for (var i = 0; i < vals.length; i++) {
      var o = { _blank: vals[i].every(function (v) { return v === '' || v === null || v === false; }) };
      for (var j = 0; j < headers.length; j++) if (headers[j]) o[headers[j]] = vals[i][j];
      rows.push(o);
    }
  }
  return { key: key, sh: sh, headers: headers, rows: rows, oldCount: rows.length };
}
function live_(t) { return t.rows.filter(function (r) { return !r._blank && !r._deleted; }); }

/** Ghi lại toàn bộ bảng (chỉ dùng cho sheet KHÔNG có công thức: Thiết bị, Show, Chi tiết show, Nhật ký) */
function saveTable_(t) {
  var rows = t.rows.filter(function (r) { return !r._deleted; });
  var lc = t.headers.length;
  if (rows.length) {
    var out = rows.map(function (r) {
      return t.headers.map(function (h) { var v = h ? r[h] : ''; return v === undefined || v === null ? '' : v; });
    });
    t.sh.getRange(2, 1, out.length, lc).setValues(out);
  }
  if (t.oldCount > rows.length) t.sh.getRange(2 + rows.length, 1, t.oldCount - rows.length, lc).clearContent();
  t.oldCount = rows.length;
  if (rows.length && (t.key === 'LINE' || t.key === 'SHOW')) applyMoneyFormulas_(t.key, rows.length);
  if (rows.length && t.key === 'CUST') applyCustFormulas_(rows.length);
}

/** Thành tiền / Tổng tiền là CÔNG THỨC để ai mở sheet cũng bấm vào kiểm tra được */
function applyMoneyFormulas_(key, n) {
  var L = function (h) { return colLetter_(idx_('LINE', h)); };
  var out = [];
  if (key === 'LINE') {
    for (var r = 2; r < 2 + n; r++) out.push(['=IF(' + L('SL') + r + '="","",' + L('SL') + r + '*' + L('Đơn giá') + r + '*' + L('Số ngày') + r + ')']);
    sh_('LINE').getRange(2, idx_('LINE', 'Thành tiền'), n, 1).setFormulas(out);
  } else {
    var A = colLetter_(idx_('SHOW', 'Mã show')), D = colLetter_(idx_('SHOW', 'Chiết khấu %')), ln = "'" + SH.LINE + "'!", cf = "'" + SH.CFG + "'!";
    for (var k = 2; k < 2 + n; k++) out.push(['=IF(' + A + k + '="","",ROUND(SUMIF(' + ln + '$' + L('Mã show') + ':$' + L('Mã show') + ',' + A + k + ',' + ln + '$' + L('Thành tiền') + ':$' + L('Thành tiền') + ')*(1-N(' + D + k + ')/100)*(1+IFERROR(VLOOKUP("VAT_%",' + cf + '$A:$B,2,FALSE),0)/100),0))']);
    sh_('SHOW').getRange(2, idx_('SHOW', 'Tổng tiền'), n, 1).setFormulas(out);
  }
}
function appendRows_(key, objs) {
  if (!objs.length) return;
  var sh = sh_(key), headers = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), COLS[key].length)).getValues()[0].map(String);
  var out = objs.map(function (o) { return headers.map(function (h) { var v = o[h]; return v === undefined || v === null ? '' : v; }); });
  sh.getRange(sh.getLastRow() + 1, 1, out.length, headers.length).setValues(out);
}
function withLock_(fn) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/* ============================= CẤU HÌNH SHEET ============================ */
function cfgAll_() {
  var sh = sh_('CFG'), o = {};
  if (!sh || sh.getLastRow() < 2) return o;
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) {
    if (r[0]) o[String(r[0])] = Object.prototype.toString.call(r[1]) === '[object Date]' ? d2s_(r[1]) : r[1];
  });
  return o;
}
function cfgGet_(k) { return cfgAll_()[k]; }

/* ========================= KHỞI TẠO / CẬP NHẬT =========================== */
function setupSheets() {
  setupStructure_();
  var ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (e) {}
  var catEmpty = sh_('CAT').getLastRow() < 2;
  if (catEmpty) {
    var ok = true;
    if (ui) ok = ui.alert('Nạp dữ liệu mẫu?', 'Sheet đang trống. Nạp dữ liệu mẫu d&b J/SL-Series + DiGiCo Quantum và 2 show test?', ui.ButtonSet.YES_NO) === ui.Button.YES;
    if (ok) seedDemo_();
  }
  if (ui) ui.alert('✅ Đã khởi tạo xong', 'Mở menu ' + APP.MENU + ' → "Mở Quản Lý Thiết Bị" để bắt đầu.\nNếu muốn có hình trong sheet: menu → "Nạp ảnh minh họa vào Google Drive".', ui.ButtonSet.OK);
}

function reseedDemo() {
  var ui = SpreadsheetApp.getUi();
  if (ui.alert('Nạp lại dữ liệu mẫu?', 'Toàn bộ dữ liệu ở Danh mục, Thiết bị, Liên kết, Show, Chi tiết show, Nhật ký sẽ bị XÓA và thay bằng dữ liệu mẫu.', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  setupStructure_();
  seedDemo_();
  ui.alert('✅ Đã nạp lại dữ liệu mẫu.');
}

function setupStructure_() {
  var ss = ss_();
  var order = ['GUIDE', 'CFG', 'CAT', 'ASSET', 'MAINT', 'RULE', 'SHOW', 'LINE', 'TRANSPORT', 'ASSIGN', 'STAFF', 'PHAT', 'CHI', 'XE', 'LOG', 'PRICELOG', 'TEST', 'CUST', 'DISC', 'USER', 'ROLE', 'VISIT', 'AUDIT', 'SYS'];
  var tabColor = { GUIDE: '#64748b', CFG: '#64748b', CAT: '#16a34a', ASSET: '#0ea5e9', MAINT: '#0d9488', RULE: '#f59e0b', SHOW: '#7c3aed', LINE: '#a855f7', LOG: '#94a3b8', TEST: '#e11d48',
    STAFF: '#ca8a04', ASSIGN: '#ca8a04', PHAT: '#dc2626', CHI: '#ea580c', XE: '#0f766e', TRANSPORT: '#0369a1', PRICELOG: '#94a3b8', CUST: '#0891b2', DISC: '#db2777', USER: '#1e293b', ROLE: '#1e293b', VISIT: '#475569', AUDIT: '#475569', SYS: '#000000' };
  order.forEach(function (key, i) {
    var sh = ss.getSheetByName(SH[key]);
    if (!sh) sh = ss.insertSheet(SH[key], Math.min(i, ss.getSheets().length));
    // tiêu đề: giữ cột cũ, bổ sung cột thiếu ở cuối
    var lc = Math.max(sh.getLastColumn(), 1);
    var cur = sh.getRange(1, 1, 1, lc).getValues()[0].map(String);
    if (cur.join('') === '') cur = [];
    COLS[key].forEach(function (h) { if (cur.indexOf(h) < 0) cur.push(h); });
    if (sh.getMaxColumns() < cur.length) sh.insertColumnsAfter(sh.getMaxColumns(), cur.length - sh.getMaxColumns());
    if (sh.getMaxRows() < 1200 && ['CFG', 'GUIDE', 'TEST', 'ROLE', 'SYS'].indexOf(key) < 0) sh.insertRowsAfter(sh.getMaxRows(), 1200 - sh.getMaxRows());
    sh.getRange(1, 1, 1, cur.length).setValues([cur])
      .setBackground(HEADER_BG).setFontColor('#ffffff').setFontWeight('bold')
      .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
    sh.setFrozenRows(1);
    sh.setRowHeight(1, 36);
    sh.setTabColor(tabColor[key]);
    formatSheet_(key, sh, cur);
  });
  // xóa "Sheet1"/"Trang tính1" mặc định nếu trống
  ss.getSheets().forEach(function (s) {
    var n = s.getName();
    if ((n === 'Sheet1' || n === 'Trang tính1') && s.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s);
  });
  if (sh_('CFG').getLastRow() < 2) seedConfig_();
  ensureCfg_();
  if (sh_('ROLE').getLastRow() < 2) seedRoles_();
  if (sh_('USER').getLastRow() < 2) seedUsers_();
  try { sh_('SYS').hideSheet(); } catch (e) {}
}

function formatSheet_(key, sh, headers) {
  var W = {
    CFG: [190, 320, 380],
    CAT: [110, 110, 95, 110, 85, 260, 120, 105, 380, 80, 105, 80, 170, 220, 90, 60, 70, 70, 80, 70],
    ASSET: [110, 100, 230, 120, 120, 170, 100, 140, 120, 130, 70, 130, 260, 105, 105, 200, 110, 130, 110, 110, 110],
    MAINT: [110, 105, 140, 320, 200, 150, 110, 120, 240],
    RULE: [130, 120, 260, 330, 80, 100, 120, 120, 300],
    SHOW: [110, 280, 200, 230, 140, 105, 105, 105, 90, 130, 110, 140, 260, 70],
    LINE: [110, 50, 100, 250, 120, 60, 140, 120, 100, 110, 70, 130, 320, 200],
    LOG: [140, 110, 110, 130, 130, 180, 280],
    STAFF: [90, 180, 170, 140, 120, 260],
    ASSIGN: [100, 110, 90, 105, 80, 80, 220, 160, 110, 240],
    TRANSPORT: [110, 110, 140, 120, 110, 105, 115, 150, 130, 80, 160, 260, 110],
    PRICELOG: [140, 110, 110, 150, 110, 110, 110, 300],
    PHAT: [100, 110, 110, 140, 260, 110, 170, 120, 220],
    CHI: [100, 110, 110, 150, 110, 120, 220],
    XE: [90, 160, 130, 190, 110, 110, 220, 120],
    TEST: [50, 150, 520, 460, 60, 260],
    GUIDE: [220, 900],
    ROLE: [190, 50, 90, 170, 90, 110, 110, 120, 120, 110, 110, 110, 120, 260],
    USER: [110, 180, 170, 110, 110, 160, 110, 105, 200, 130, 100, 130, 130, 130, 130, 120, 220, 60, 60],
    CUST: [80, 170, 110, 200, 130, 150, 150, 170, 220, 220, 110, 90, 200, 200, 110, 220, 170, 80, 120, 130, 110, 220, 120, 100, 120, 90, 90, 110],
    DISC: [110, 110, 110, 150, 70, 220, 60, 120, 110, 90, 110, 360, 130, 130, 110],
    VISIT: [140, 130, 110, 320, 120],
    AUDIT: [140, 110, 150, 130, 170, 480, 260],
    SYS: [220, 400, 140]
  }[key] || [];
  W.forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  var c = function (h) { return headers.indexOf(h) + 1; };
  var n = 1199;
  var dv = function (col, list) {
    if (col < 1) return;
    sh.getRange(2, col, n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(list, true).setAllowInvalid(true).build());
  };
  var rules = [];
  if (key === 'ASSET') {
    dv(c('Trạng thái'), ST_LIST);
    sh.getRange(2, c('Đã kiểm'), n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
    var rg = sh.getRange(2, c('Trạng thái'), n, 1);
    ST_LIST.forEach(function (s) {
      rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(s).setBackground(ST_COLOR[s].bg).setFontColor(ST_COLOR[s].fg).setBold(true).setRanges([rg]).build());
    });
    sh.getRange(2, c('Cập nhật lúc'), n, 1).setNumberFormat('dd/MM/yyyy HH:mm');
    dv(c('Hiện trạng'), HT_LIST);
    dv(c('Tình trạng lúc mua'), TT_MUA_LIST);
    ['Ngày sản xuất', 'Ngày mua', 'Xuất kho gần nhất', 'Nhập kho gần nhất'].forEach(function (h) { sh.getRange(2, c(h), n, 1).setNumberFormat('dd/MM/yyyy'); });
    sh.getRange(2, c('% còn lại lúc mua'), n, 1).setNumberFormat('0"%"');
    sh.getRange(2, c('Không đi show lớn'), n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  }
  if (key === 'MAINT') {
    dv(c('Hiện trạng sau'), HT_LIST);
    sh.getRange(2, c('Ngày'), n, 1).setNumberFormat('dd/MM/yyyy');
    sh.getRange(2, c('Chi phí'), n, 1).setNumberFormat('#,##0');
    sh.getRange(2, 1, n, headers.length).setWrap(true).setVerticalAlignment('top');
  }
  if (key === 'CAT') {
    sh.getRange(2, c('Đơn giá/ngày'), n, 1).setNumberFormat('#,##0');
    sh.getRange(2, 1, n, headers.length).setVerticalAlignment('middle');
    sh.getRange(2, c('Mô tả / thông số'), n, 1).setWrap(true);
    var stc = [['Trong kho', ST.KHO], ['Chuẩn bị', ST.CB], ['Đang ở show', ST.SHOW], ['Bảo trì', ST.BT]];
    stc.forEach(function (p) { if (c(p[0]) > 0) sh.getRange(1, c(p[0])).setBackground(ST_COLOR[p[1]].dot); });
    if (c('Tổng') > 0) sh.getRange(2, c('Tổng'), n, 5).setHorizontalAlignment('center').setFontWeight('bold');
  }
  if (key === 'RULE') {
    sh.getRange(2, c('Mặc định'), n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  }
  if (key === 'SHOW') {
    dv(c('Trạng thái'), SHOW_ST);
    dv(c('Loại'), SHOW_TYPES);
    ['Ngày xuất kho', 'Ngày diễn', 'Ngày nhập kho'].forEach(function (h) { sh.getRange(2, c(h), n, 1).setNumberFormat('dd/MM/yyyy'); });
    sh.getRange(2, c('Tổng tiền'), n, 1).setNumberFormat('#,##0');
    var srg = sh.getRange(2, c('Trạng thái'), n, 1);
    var sc = { 'Báo giá': '#e2e8f0', 'Đã xác nhận': '#dbeafe', 'Đang soạn hàng': '#fef3c7', 'Đang ở show': '#ede9fe', 'Đã nhập kho': '#dcfce7', 'Hủy': '#fee2e2' };
    Object.keys(sc).forEach(function (s) { rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(s).setBackground(sc[s]).setBold(true).setRanges([srg]).build()); });
  }
  if (key === 'LINE') {
    ['Đơn giá', 'Thành tiền'].forEach(function (h) { sh.getRange(2, c(h), n, 1).setNumberFormat('#,##0'); });
    sh.getRange(2, c('Mã TB đã gán'), n, 1).setWrap(true);
  }
  if (key === 'LOG' || key === 'VISIT' || key === 'AUDIT') sh.getRange(2, 1, n, 1).setNumberFormat('dd/MM/yyyy HH:mm');
  if (key === 'ROLE') sh.getRange(2, 5, 30, 9).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  if (key === 'USER') {
    dv(c('Trạng thái'), USER_ST);
    ['Ngày tạo', 'Ngày sửa thông tin', 'Ngày đổi quyền', 'Ngày khóa/ban', 'Đăng nhập cuối'].forEach(function (h) { sh.getRange(2, c(h), n, 1).setNumberFormat('dd/MM/yyyy HH:mm'); });
    sh.getRange(2, c('Ban đến ngày'), n, 1).setNumberFormat('dd/MM/yyyy');
    var urg = sh.getRange(2, c('Trạng thái'), n, 1);
    var uc = { 'Hoạt động': '#dcfce7', 'Chờ duyệt': '#fef3c7', 'Tạm khóa': '#e2e8f0', 'Ban': '#fee2e2' };
    Object.keys(uc).forEach(function (s) { rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(s).setBackground(uc[s]).setBold(true).setRanges([urg]).build()); });
  }
  if (key === 'CUST') {
    ['Tiền hồi (số tiền)'].forEach(function (h) { sh.getRange(2, c(h), n, 1).setNumberFormat('#,##0'); });
    sh.getRange(2, c('Ngày book gần nhất'), n, 1).setNumberFormat('dd/MM/yyyy');
  }
  if (key === 'DISC') { dv(c('Trạng thái'), ['Chờ duyệt', 'Đã duyệt', 'Từ chối', 'Đã hủy']); sh.getRange(2, c('Lịch sử'), n, 1).setWrap(true); }
  if (key === 'SHOW') sh.getRange(2, c('Chiết khấu %'), n, 1).setNumberFormat('0.##');
  if (key === 'TEST') { sh.getRange(2, c('Đạt'), 60, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build()); sh.getRange(2, 1, 60, headers.length).setWrap(true).setVerticalAlignment('top'); }
  if (key === 'GUIDE') sh.getRange(1, 1, 80, 2).setWrap(true).setVerticalAlignment('top');
  if (rules.length) sh.setConditionalFormatRules(rules);
}

/** Viết lại công thức đếm tồn kho + ảnh cho sheet Danh mục */
function refreshCatalogFormulas() {
  var sh = sh_('CAT'), lr = sh.getLastRow();
  if (lr < 2) return;
  var A = function (h) { return colLetter_(idx_('ASSET', h)); };
  var C = function (h) { return colLetter_(idx_('CAT', h)); };
  var as = "'" + SH.ASSET + "'!";
  var out = [];
  for (var r = 2; r <= lr; r++) {
    var model = C('Mã model') + r;
    var cnt = function (st) { return '=IF(' + model + '="","",COUNTIFS(' + as + A('Mã model') + ':' + A('Mã model') + ',' + model + ',' + as + A('Trạng thái') + ':' + A('Trạng thái') + ',"' + st + '"))'; };
    out.push([
      '=IF(' + model + '="","",COUNTIF(' + as + A('Mã model') + ':' + A('Mã model') + ',' + model + '))',
      cnt(ST.KHO), cnt(ST.CB), cnt(ST.SHOW), cnt(ST.BT)
    ]);
  }
  sh.getRange(2, idx_('CAT', 'Tổng'), out.length, 5).setFormulas(out);
  var img = [];
  for (var k = 2; k <= lr; k++) img.push(['=IF(' + C('Ảnh URL') + k + '="","",IMAGE(' + C('Ảnh URL') + k + ',1))']);
  sh.getRange(2, idx_('CAT', 'Ảnh'), img.length, 1).setFormulas(img);
  sh.setRowHeights(2, lr - 1, 64);
}

/* ======================= ẢNH MINH HỌA → GOOGLE DRIVE ====================== */
function getImgData_() { return (typeof IMG_DATA !== 'undefined') ? IMG_DATA : {}; }

function uploadImagesToDrive() {
  var data = getImgData_();
  var keys = Object.keys(data);
  if (!keys.length) { SpreadsheetApp.getUi().alert('Không tìm thấy file Images.gs (biến IMG_DATA).'); return; }
  var name = 'QLTB PRO – Ảnh thiết bị';
  var it = DriveApp.getFoldersByName(name);
  var folder = it.hasNext() ? it.next() : DriveApp.createFolder(name);
  var urls = {}, fail = 0;
  keys.forEach(function (k) {
    var m = String(data[k]).match(/^data:(image\/[a-z]+);base64,(.+)$/);
    if (!m) return;
    var fname = k + '.jpg';
    var ex = folder.getFilesByName(fname);
    var f = ex.hasNext() ? ex.next() : folder.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], fname));
    try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { fail++; }
    urls[k] = 'https://lh3.googleusercontent.com/d/' + f.getId();
  });
  var t = readTable_('CAT'), ci = idx_('CAT', 'Ảnh URL');
  var out = t.rows.map(function (r) {
    var cur = r['Ảnh URL'];
    if (cur && String(cur).indexOf('lh3.googleusercontent') < 0) return [cur]; // giữ link hãng đã có
    var key = r['Mã ảnh'];
    return [key && urls[key] ? urls[key] : (cur || '')];
  });
  if (out.length) t.sh.getRange(2, ci, out.length, 1).setValues(out);
  refreshCatalogFormulas();
  SpreadsheetApp.getUi().alert('🖼️ Đã nạp ' + Object.keys(urls).length + ' ảnh vào thư mục Drive "' + name + '".' +
    (fail ? '\n⚠️ ' + fail + ' ảnh không bật được chia sẻ công khai → cột Ảnh có thể trống, popup vẫn hiện ảnh bình thường.' : ''));
}

/* ================= ĐỒNG BỘ VỚI BẢN OFFLINE (file .json) ================= */
var BACKUP_KEYS = ['CFG', 'CAT', 'ASSET', 'MAINT', 'RULE', 'SHOW', 'LINE', 'LOG', 'TEST', 'GUIDE', 'ROLE', 'USER', 'CUST', 'DISC', 'VISIT', 'AUDIT', 'SYS', 'STAFF', 'ASSIGN', 'TRANSPORT', 'PRICELOG', 'PHAT', 'CHI', 'XE'];
var BUSINESS_KEYS = ['CFG', 'CAT', 'ASSET', 'MAINT', 'RULE', 'SHOW', 'LINE', 'LOG', 'TEST', 'GUIDE', 'CUST', 'DISC', 'STAFF', 'ASSIGN', 'TRANSPORT', 'PRICELOG', 'PHAT', 'CHI', 'XE'];

/** Toàn bộ dữ liệu 9 sheet → chuỗi JSON (ngày giờ lưu dạng {"$d": mili-giây}) */
function exportBackup_(keys) {
  var out = { app: 'QLTB PRO', v: 2, at: new Date().getTime(), sheets: [] };
  (keys || BACKUP_KEYS).forEach(function (k) {
    var sh = sh_(k); if (!sh) return;
    var lr = sh.getLastRow(), lc = Math.max(sh.getLastColumn(), COLS[k].length);
    var d = lr ? sh.getRange(1, 1, lr, lc).getValues() : [COLS[k]];
    d = d.map(function (r) { return r.map(function (v) { return Object.prototype.toString.call(v) === '[object Date]' ? { $d: v.getTime() } : (v === null || v === undefined ? '' : v); }); });
    out.sheets.push({ n: SH[k], d: d });
  });
  return JSON.stringify(out);
}

/** Ghi dữ liệu từ file sao lưu vào sheet (ghép theo TÊN CỘT, thay toàn bộ dữ liệu cũ) */
function apiImportBackup(text, silent, keys) {
  var data = JSON.parse(text);
  if (!data || data.app !== 'QLTB PRO' || !data.sheets) throw new Error('Không phải file sao lưu của QUẢN LÝ THIẾT BỊ PRO');
  var res = {};
  withLock_(function () {
    (keys || BACKUP_KEYS).forEach(function (k) {
      var src = data.sheets.filter(function (s) { return s.n === SH[k]; })[0];
      var sh = sh_(k); if (!src || !sh || !src.d || !src.d.length) return;
      var sh0 = src.d[0].map(String);
      var head = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), COLS[k].length)).getValues()[0].map(String);
      var rows = src.d.slice(1).filter(function (r) { return r.some(function (v) { return v !== '' && v !== null && v !== false; }); });
      var out = rows.map(function (r) {
        return head.map(function (h) {
          var j = sh0.indexOf(h); var v = j >= 0 ? r[j] : '';
          if (v && typeof v === 'object' && v.$d !== undefined) return new Date(v.$d);
          return v === null || v === undefined ? '' : v;
        });
      });
      if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, head.length).clearContent();
      if (out.length) sh.getRange(2, 1, out.length, head.length).setValues(out);
      res[SH[k]] = out.length;
      if (out.length && (k === 'LINE' || k === 'SHOW')) applyMoneyFormulas_(k, out.length);
      if (out.length && k === 'CUST') applyCustFormulas_(out.length);
    });
    if (sh_('CAT').getLastRow() > 1) refreshCatalogFormulas();
  });
  if (!silent) appendRows_('LOG', [{ 'Thời gian': new Date(), 'Sang': 'Nhập dữ liệu', 'Người': user_(), 'Ghi chú': 'Nhập từ file sao lưu ngày ' + Utilities.formatDate(new Date(data.at || 0), tz_(), 'dd/MM/yyyy HH:mm') }]);
  return res;
}

function apiImportBackupBusiness(text) { return apiImportBackup(text, false, BUSINESS_KEYS); }

function exportBackupToDrive() {
  var name = 'QLTB PRO – Sao lưu';
  var it = DriveApp.getFoldersByName(name);
  var folder = it.hasNext() ? it.next() : DriveApp.createFolder(name);
  var fname = 'QLTB-PRO-' + Utilities.formatDate(new Date(), tz_(), 'yyyyMMdd-HHmm') + '.json';
  var f = folder.createFile(fname, exportBackup_(BUSINESS_KEYS), 'application/json');
  var html = '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">✅ Đã lưu <b>' + fname + '</b> vào thư mục Drive "' + name + '".<br><br>' +
    '<a href="' + f.getUrl() + '" target="_blank">Mở file trên Drive</a> → tải về điện thoại/máy tính → mở <b>QLTB-PRO-offline.html</b> → bấm <b>📂 Khôi phục</b> → chọn file này.</div>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(460).setHeight(200), '📤 Xuất dữ liệu cho bản offline');
}

function openImportDialog() {
  var html = '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">' +
    'Chọn file <b>.json</b> đã bấm <b>💾 Sao lưu</b> ở bản offline. Dữ liệu trong 9 sheet sẽ được <b>THAY</b> bằng dữ liệu trong file.<br><br>' +
    '<input type="file" id="f" accept=".json,application/json"><br><br><button id="b" onclick="go()" style="padding:8px 16px;background:#6d28d9;color:#fff;border:0;border-radius:8px;font-weight:bold">Nhập dữ liệu</button> <span id="m"></span>' +
    '<script>function go(){var f=document.getElementById("f").files[0];if(!f){return;}document.getElementById("b").disabled=true;document.getElementById("m").textContent="Đang nhập…";' +
    'var r=new FileReader();r.onload=function(){google.script.run.withSuccessHandler(function(x){document.getElementById("m").textContent="✅ Xong: "+Object.keys(x).map(function(k){return k+" "+x[k];}).join(", ");})' +
    '.withFailureHandler(function(e){document.getElementById("m").textContent="❌ "+e.message;document.getElementById("b").disabled=false;}).apiImportBackupBusiness(String(r.result));};r.readAsText(f);}<\/script></div>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(520).setHeight(260), '📥 Nhập dữ liệu từ bản offline');
}

/* ============================ API CHO POPUP ============================== */
/** Tải toàn bộ dữ liệu cho giao diện (1 lần) */
function apiBootstrap() {
  var cfg = cfgAll_();
  var cat = live_(readTable_('CAT')).map(function (r) {
    return {
      code: String(r['Mã model']), brand: String(r['Hãng']), series: String(r['Dòng']), family: String(r['Họ'] || r['Mã model']),
      name: String(r['Tên thiết bị']), type: String(r['Loại']), part: String(r['Part No.']), desc: String(r['Mô tả / thông số']),
      weight: num_(r['Khối lượng (kg)']), price: num_(r['Đơn giá/ngày']), rentable: bool_(r['Cho thuê riêng']),
      params: String(r['Tham số popup'] || ''), img: String(r['Ảnh URL'] || ''), imgKey: String(r['Mã ảnh'] || '')
    };
  }).filter(function (c) { return c.code; });
  var assets = live_(readTable_('ASSET')).map(function (r) {
    return {
      tag: String(r['Mã TB']), model: String(r['Mã model']), serial: String(r['Serial']), cfg: String(r['Cấu hình']),
      parent: String(r['Thuộc bộ']), status: String(r['Trạng thái'] || ST.KHO), show: String(r['Show hiện tại']),
      loc: String(r['Vị trí']), checked: bool_(r['Đã kiểm']), updated: dt2s_(r['Cập nhật lúc']), note: String(r['Ghi chú']),
      mfg: d2s_(r['Ngày sản xuất']), bought: d2s_(r['Ngày mua']), buyCond: String(r['Tình trạng lúc mua'] || ''),
      buyPct: num_(r['% còn lại lúc mua']), cond: String(r['Hiện trạng'] || HT.OK), noBig: bool_(r['Không đi show lớn']),
      lastOut: d2s_(r['Xuất kho gần nhất']), lastIn: d2s_(r['Nhập kho gần nhất'])
    };
  }).filter(function (a) { return a.tag; });
  var maint = live_(readTable_('MAINT')).map(function (r) {
    return { tag: String(r['Mã TB']), date: d2s_(r['Ngày']), type: String(r['Loại'] || ''), desc: String(r['Nội dung'] || ''),
      vendor: String(r['Nơi thực hiện'] || ''), after: String(r['Hiện trạng sau'] || ''), cost: num_(r['Chi phí']), by: String(r['Người ghi'] || ''), note: String(r['Ghi chú'] || '') };
  }).filter(function (m) { return m.tag; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  var rules = live_(readTable_('RULE')).map(function (r) {
    return {
      key: String(r['Model/Họ chính']), group: String(r['Nhóm']), q: String(r['Câu hỏi']), opt: String(r['Lựa chọn']),
      def: bool_(r['Mặc định']), comp: String(r['Model kèm']), f: String(r['Công thức SL']), req: String(r['Yêu cầu cấu hình']), note: String(r['Ghi chú'])
    };
  }).filter(function (r) { return r.key && r.opt; });
  var shows = live_(readTable_('SHOW')).map(showObj_).filter(function (s) { return s.code; });
  var trs = transportList_();
  shows.forEach(function (s) { s.transport = transportCheck_(s, trs); });
  var lines = live_(readTable_('LINE')).map(lineObj_).filter(function (l) { return l.show; });
  var vat = num_(cfg['VAT_%']), sum = {};
  lines.forEach(function (l) { sum[l.show] = (sum[l.show] || 0) + l.amount; });
  shows.forEach(function (s) { s.subtotal = sum[s.code] || 0; s.policy = policyOf_(s); s.total = Math.round(s.subtotal * (1 - effPct_(s.discount, s.policy) / 100) * (1 + vat / 100)); });
  var logs = live_(readTable_('LOG')).slice(-60).reverse().map(function (r) {
    return { t: dt2s_(r['Thời gian']), show: String(r['Mã show']), tag: String(r['Mã TB']), from: String(r['Từ']), to: String(r['Sang']), who: String(r['Người']), note: String(r['Ghi chú']) };
  });
  var used = {};
  cat.forEach(function (c) { if (c.imgKey) used[c.imgKey] = 1; });
  var all = getImgData_(), img = {};
  Object.keys(used).forEach(function (k) { if (all[k]) img[k] = all[k]; });
  return {
    app: APP, cfg: cfg, catalog: cat, assets: assets, maint: maint, bigShow: nguongShowLon_(), htList: HT_LIST, ttList: TT_MUA_LIST,
    rules: rules, shows: shows, lines: lines, logs: logs, img: img,
    whList: [{ name: WH.HN, city: WH_CITY[WH.HN] }, { name: WH.HCM, city: WH_CITY[WH.HCM] }], transMethods: TRANS_METHODS, transStatus: TRANS_ST,
    staffRoles: STAFF_ROLES, staff: staffList_(), assigns: assignList_(), transports: trs, priceLog: priceLogList_(), feed: feedFor_(),
    canPriceEdit: !!(CTX && (CTX.owner || (num_(CTX.level) > 0 && num_(CTX.level) <= 2))), isCeo: !!(CTX && (CTX.owner || num_(CTX.level) === 1)),
    penalties: penaltyList_(), expenses: expenseList_(), cars: carList_(), salesRev: salesRev12_(), carRoles: CAR_ROLES, salesRoles: SALES_ROLES,
    carMin: cfgNum_('XE_DOANH_SO_TOI_THIEU', 10000000000), phatLoai: PHAT_LOAI, chiKhoan: CHI_KHOAN, maStagePro: maStagePro_(), giam2: cfgNum_('GIAM_2_NGAY_%', 50),
    ST: ST, ST_LIST: ST_LIST, ST_COLOR: ST_COLOR, SHOW_ST: SHOW_ST, SHOW_HOLD: SHOW_HOLD, SHOW_TYPES: SHOW_TYPES,
    SHOW_COLORS: SHOW_COLORS, MAIN_TYPES: MAIN_TYPES, user: user_(), sheetUrl: ss_().getUrl(),
    today: Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd'),
    auth: authBootstrap_()
  };
}

function showObj_(r) {
  return {
    code: String(r['Mã show'] || ''), name: String(r['Tên show'] || ''), client: String(r['Khách hàng'] || ''), venue: String(r['Địa điểm'] || ''),
    type: String(r['Loại'] || ''), out: d2s_(r['Ngày xuất kho']), day: d2s_(r['Ngày diễn']), back: d2s_(r['Ngày nhập kho']),
    days: num_(r['Số ngày tính tiền']), status: String(r['Trạng thái'] || 'Báo giá'), pic: String(r['Phụ trách'] || ''),
    total: num_(r['Tổng tiền']), note: String(r['Ghi chú'] || ''), color: String(r['Màu'] || ''),
    cust: String(r['Mã KH'] || ''), discount: num_(r['Chiết khấu %']), discStatus: String(r['Trạng thái CK'] || ''), creator: String(r['Người tạo'] || ''),
    city: String(r['Thành phố'] || ''), wh: String(r['Kho xuất'] || WH.HN),
    dayEnd: d2s_(r['Ngày diễn cuối']) || d2s_(r['Ngày diễn']), promo: String(r['Mã ưu đãi'] || '')
  };
}
function lineObj_(r) {
  return {
    show: String(r['Mã show'] || ''), no: num_(r['STT']), model: String(r['Mã model'] || ''), name: String(r['Tên thiết bị'] || ''),
    type: String(r['Loại'] || ''), qty: num_(r['SL']), source: String(r['Nguồn'] || ''), group: String(r['Nhóm liên kết'] || ''),
    req: String(r['Yêu cầu'] || ''), price: num_(r['Đơn giá']), days: num_(r['Số ngày']), amount: num_(r['SL']) * num_(r['Đơn giá']) * num_(r['Số ngày']),
    tags: String(r['Mã TB đã gán'] || '').split(/[,\s]+/).filter(String), note: String(r['Ghi chú'] || '')
  };
}

/** Lưu show (tạo mới hoặc sửa). payload = {show:{...}, lines:[{model,qty,source,group,req,note}]} */
function apiSaveShow(payload) {
  return withLock_(function () {
    var s = payload.show, lines = payload.lines || [];
    s.status = statusFor_(s);
    var catMap = catMap_();
    var showT = readTable_('SHOW'), lineT = readTable_('LINE'), assetT = readTable_('ASSET');
    var shows = live_(showT);
    var isNew = !s.code;
    if (isNew) s.code = nextShowCode_(shows, s.out);
    var row = shows.filter(function (r) { return String(r['Mã show']) === s.code; })[0];
    if (!row) { row = {}; showT.rows.push(row); }
    var days = num_(s.days) || Math.max(1, daysBetween_(s.out, s.back) + 1);
    var color = s.color || row['Màu'] || SHOW_COLORS[shows.length % SHOW_COLORS.length];

    // giữ lại mã TB đã gán theo model
    var oldTags = {};
    live_(lineT).forEach(function (r) {
      if (String(r['Mã show']) !== s.code) return;
      var m = String(r['Mã model']);
      oldTags[m] = (oldTags[m] || []).concat(String(r['Mã TB đã gán'] || '').split(/[,\s]+/).filter(String));
      r._deleted = true;
    });
    var total = 0, no = 0, newLines = [];
    lines.forEach(function (l) {
      var c = catMap[l.model]; if (!c || !(num_(l.qty) > 0)) return;
      var q = num_(l.qty), price = (l.price !== undefined && l.price !== '') ? num_(l.price) : c.price;
      var keep = (oldTags[l.model] || []).splice(0, q);
      var amount = q * price * days; total += amount;
      newLines.push({
        'Mã show': s.code, 'STT': ++no, 'Mã model': l.model, 'Tên thiết bị': c.name, 'Loại': c.type, 'SL': q,
        'Nguồn': l.source || 'Chính', 'Nhóm liên kết': l.group || '', 'Yêu cầu': l.req || '', 'Đơn giá': price,
        'Số ngày': days, 'Thành tiền': amount, 'Mã TB đã gán': keep.join(', '), 'Ghi chú': l.note || ''
      });
    });
    newLines.forEach(function (o) { lineT.rows.push(o); });
    // thả thiết bị thừa (đã gán nhưng không còn trong đơn)
    var released = [];
    Object.keys(oldTags).forEach(function (m) { released = released.concat(oldTags[m]); });
    if (s.status === 'Hủy') newLines.forEach(function (o) { released = released.concat(String(o['Mã TB đã gán']).split(/[,\s]+/).filter(String)); o['Mã TB đã gán'] = ''; });
    var logs = [];
    if (released.length) releaseAssets_(assetT, released, s.code, logs, 'Bỏ khỏi đơn / hủy show');

    var vat = num_(cfgGet_('VAT_%'));
    var disc = discountOnSave_(row, s);
    var pol = policyOf_(s);
    var promo = promoCheck_(s, row);
    Object.assign(row, {
      'Mã show': s.code, 'Tên show': s.name || '', 'Khách hàng': s.client || '', 'Địa điểm': s.venue || '', 'Loại': s.type || '',
      'Ngày xuất kho': s2d_(s.out), 'Ngày diễn': s2d_(s.day || s.out), 'Ngày nhập kho': s2d_(s.back || s.out), 'Số ngày tính tiền': days,
      'Trạng thái': s.status || 'Báo giá', 'Phụ trách': s.pic || '', 'Tổng tiền': Math.round(total * (1 - effPct_(disc.pct, pol) / 100) * (1 + vat / 100)), 'Ghi chú': s.note || '', 'Màu': color,
      'Mã KH': s.cust || '', 'Chiết khấu %': disc.pct, 'Trạng thái CK': disc.status, 'Người tạo': row['Người tạo'] || (CTX ? CTX.username : user_()),
      'Thành phố': s.city || '', 'Kho xuất': s.wh || WH.HN,
      'Ngày diễn cuối': s2d_(s.dayEnd || s.day), 'Mã ưu đãi': promo, 'Chính sách CK': pol.label
    });
    saveTable_(showT); saveTable_(lineT); if (released.length) saveTable_(assetT);
    appendRows_('LOG', logs.concat([{ 'Thời gian': new Date(), 'Mã show': s.code, 'Mã TB': '', 'Từ': '', 'Sang': s.status, 'Người': user_(), 'Ghi chú': (isNew ? 'Tạo show' : 'Cập nhật show') + ' – ' + newLines.length + ' dòng thiết bị' }]));
    return { code: s.code, released: released.length };
  });
}

function apiDeleteShow(code) {
  return withLock_(function () {
    var assetT = readTable_('ASSET');
    var atShow = live_(assetT).filter(function (a) { return String(a['Show hiện tại']) === code && a['Trạng thái'] === ST.SHOW; });
    if (atShow.length) throw new Error('Show đang có ' + atShow.length + ' thiết bị ở hiện trường. Hãy nhập kho trước khi xóa.');
    var logs = [];
    var tags = live_(assetT).filter(function (a) { return String(a['Show hiện tại']) === code && !a['Thuộc bộ']; }).map(function (a) { return String(a['Mã TB']); });
    releaseAssets_(assetT, tags, code, logs, 'Xóa show');
    saveTable_(assetT);
    var showT = readTable_('SHOW'), lineT = readTable_('LINE');
    live_(showT).forEach(function (r) { if (String(r['Mã show']) === code) r._deleted = true; });
    live_(lineT).forEach(function (r) { if (String(r['Mã show']) === code) r._deleted = true; });
    saveTable_(showT); saveTable_(lineT);
    appendRows_('LOG', logs.concat([{ 'Thời gian': new Date(), 'Mã show': code, 'Sang': 'Đã xóa', 'Người': user_(), 'Ghi chú': 'Xóa show' }]));
    return true;
  });
}

function nextShowCode_(shows, out) {
  var d = out ? String(out) : Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
  var prefix = 'SH-' + d.slice(2, 4) + d.slice(5, 7) + '-';
  var max = 0;
  shows.forEach(function (r) { var c = String(r['Mã show']); if (c.indexOf(prefix) === 0) max = Math.max(max, num_(c.slice(prefix.length))); });
  return prefix + ('00' + (max + 1)).slice(-3);
}
function daysBetween_(a, b) {
  if (!a || !b) return 0;
  return Math.round((s2d_(b) - s2d_(a)) / 86400000);
}
function catMap_() {
  var m = {};
  live_(readTable_('CAT')).forEach(function (r) {
    m[String(r['Mã model'])] = { name: String(r['Tên thiết bị']), type: String(r['Loại']), price: num_(r['Đơn giá/ngày']), rentable: bool_(r['Cho thuê riêng']) };
  });
  return m;
}

/** Thả thiết bị về kho (và các thiết bị con trong bộ) */
function releaseAssets_(assetT, tags, code, logs, note) {
  var set = {}; tags.forEach(function (t) { set[t] = 1; });
  live_(assetT).forEach(function (a) {
    var tag = String(a['Mã TB']), par = String(a['Thuộc bộ'] || '');
    if ((set[tag] || set[par]) && String(a['Show hiện tại']) === code && a['Trạng thái'] !== ST.SHOW) {
      if (!par) logs.push({ 'Thời gian': new Date(), 'Mã show': code, 'Mã TB': tag, 'Từ': a['Trạng thái'], 'Sang': ST.KHO, 'Người': user_(), 'Ghi chú': note });
      a['Trạng thái'] = ST.KHO; a['Show hiện tại'] = ''; a['Cập nhật lúc'] = new Date();
    }
  });
}

/** 🧰 Soạn hàng tự động: gán mã TB trong kho cho từng dòng thiết bị của show */
function apiAssign(code) {
  return withLock_(function () {
    var showT = readTable_('SHOW'), lineT = readTable_('LINE'), assetT = readTable_('ASSET');
    var show = live_(showT).filter(function (r) { return String(r['Mã show']) === code; })[0];
    if (!show) throw new Error('Không tìm thấy show ' + code);
    if (['Đang ở show', 'Đã nhập kho', 'Hủy'].indexOf(String(show['Trạng thái'])) >= 0) throw new Error('Show đang ở trạng thái "' + show['Trạng thái'] + '" – không soạn hàng được.');
    var assets = live_(assetT);
    var children = {};
    assets.forEach(function (a) { var p = String(a['Thuộc bộ'] || ''); if (p) (children[p] = children[p] || []).push(a); });
    var logs = [], report = { assigned: 0, missing: [], warn: [], bigSkipped: 0, fromOther: 0 };
    var who = user_(), now = new Date();
    var big = showTotalFromLines_(show, live_(lineT).filter(function (r) { return String(r['Mã show']) === code; })) >= nguongShowLon_();
    var lines = live_(lineT).filter(function (r) { return String(r['Mã show']) === code; });
    var homeWh = String(show['Kho xuất'] || WH.HN);
    lines.forEach(function (l) {
      var model = String(l['Mã model']), need = num_(l['SL']);
      var tags = String(l['Mã TB đã gán'] || '').split(/[,\s]+/).filter(String);
      var req = String(l['Yêu cầu'] || '').trim();
      var pool = assets.filter(function (a) {
        if (String(a['Mã model']) !== model || a['Thuộc bộ'] || a['Trạng thái'] !== ST.KHO || a['Show hiện tại']) return false;
        if (big && khongPhuHopShowLon_(a)) { report.bigSkipped++; return false; }
        return true;
      });
      pool.sort(function (x, y) { return (String(x['Vị trí']) === homeWh ? 0 : 1) - (String(y['Vị trí']) === homeWh ? 0 : 1); });
      if (req) pool.sort(function (x, y) { return (String(y['Cấu hình']).indexOf(req) >= 0) - (String(x['Cấu hình']).indexOf(req) >= 0); });
      while (tags.length < need && pool.length) {
        var a = pool.shift();
        if (req && String(a['Cấu hình']).indexOf(req) < 0) report.warn.push(a['Mã TB'] + ' không có cấu hình "' + req + '" (' + (a['Cấu hình'] || 'trống') + ')');
        logs.push({ 'Thời gian': now, 'Mã show': code, 'Mã TB': a['Mã TB'], 'Từ': a['Trạng thái'], 'Sang': ST.CB, 'Người': who, 'Ghi chú': 'Soạn hàng' });
        a['Trạng thái'] = ST.CB; a['Show hiện tại'] = code; a['Cập nhật lúc'] = now; a['Đã kiểm'] = false;
        (children[String(a['Mã TB'])] || []).forEach(function (ch) { ch['Trạng thái'] = ST.CB; ch['Show hiện tại'] = code; ch['Cập nhật lúc'] = now; });
        tags.push(String(a['Mã TB'])); report.assigned++;
        if (String(a['Vị trí']) !== homeWh) report.fromOther++;
      }
      if (tags.length < need) report.missing.push({ model: model, name: String(l['Tên thiết bị']), need: need, got: tags.length });
      l['Mã TB đã gán'] = tags.join(', ');
    });
    if (report.assigned > 0 || String(show['Trạng thái']) === 'Báo giá' || String(show['Trạng thái']) === 'Đã xác nhận') show['Trạng thái'] = 'Đang soạn hàng';
    saveTable_(assetT); saveTable_(lineT); saveTable_(showT);
    appendRows_('LOG', logs);
    return report;
  });
}

/** 🚚 Xuất kho: Chuẩn bị đi show → Đang ở show */
function apiCheckout(code) {
  return withLock_(function () {
    var showT = readTable_('SHOW'), assetT = readTable_('ASSET'), lineT = readTable_('LINE');
    var show = live_(showT).filter(function (r) { return String(r['Mã show']) === code; })[0];
    if (!show) throw new Error('Không tìm thấy show ' + code);
    var need = 0, got = 0;
    live_(lineT).forEach(function (l) { if (String(l['Mã show']) === code) { need += num_(l['SL']); got += String(l['Mã TB đã gán'] || '').split(/[,\s]+/).filter(String).length; } });
    var logs = [], n = 0, now = new Date(), who = user_();
    live_(assetT).forEach(function (a) {
      if (String(a['Show hiện tại']) === code && a['Trạng thái'] === ST.CB) {
        if (!a['Thuộc bộ']) { logs.push({ 'Thời gian': now, 'Mã show': code, 'Mã TB': a['Mã TB'], 'Từ': ST.CB, 'Sang': ST.SHOW, 'Người': who, 'Ghi chú': 'Xuất kho' }); n++; }
        a['Trạng thái'] = ST.SHOW; a['Cập nhật lúc'] = now; a['Xuất kho gần nhất'] = now;
      }
    });
    if (!n) throw new Error('Chưa có thiết bị nào ở trạng thái "' + ST.CB + '". Hãy bấm Soạn hàng trước.');
    show['Trạng thái'] = 'Đang ở show';
    saveTable_(assetT); saveTable_(showT); appendRows_('LOG', logs);
    return { moved: n, missing: Math.max(0, need - got) };
  });
}

/** 📥 Nhập kho. results = [{tag, result:'ok'|'hong'|'chua', note}] */
function apiCheckin(code, results) {
  return withLock_(function () {
    var showT = readTable_('SHOW'), assetT = readTable_('ASSET');
    var show = live_(showT).filter(function (r) { return String(r['Mã show']) === code; })[0];
    if (!show) throw new Error('Không tìm thấy show ' + code);
    var map = {}; (results || []).forEach(function (x) { map[x.tag] = x; });
    var logs = [], now = new Date(), who = user_(), stat = { ok: 0, hong: 0, chua: 0 };
    var assets = live_(assetT);
    var top = assets.filter(function (a) { return String(a['Show hiện tại']) === code && !a['Thuộc bộ']; });
    top.forEach(function (a) {
      var tag = String(a['Mã TB']), x = map[tag] || { result: 'ok' };
      if (x.result === 'chua') { stat.chua++; return; }
      var to = x.result === 'hong' ? ST.BT : ST.KHO;
      logs.push({ 'Thời gian': now, 'Mã show': code, 'Mã TB': tag, 'Từ': a['Trạng thái'], 'Sang': to, 'Người': who, 'Ghi chú': 'Nhập kho' + (x.note ? ' – ' + x.note : '') });
      a['Trạng thái'] = to; a['Show hiện tại'] = ''; a['Cập nhật lúc'] = now; a['Đã kiểm'] = true; a['Nhập kho gần nhất'] = now;
      if (x.result === 'hong') a['Ghi chú'] = (x.note || 'Hỏng sau show') + ' (' + code + ')';
      stat[x.result === 'hong' ? 'hong' : 'ok']++;
      assets.forEach(function (ch) { if (String(ch['Thuộc bộ']) === tag) { ch['Trạng thái'] = ST.KHO; ch['Show hiện tại'] = ''; ch['Cập nhật lúc'] = now; } });
    });
    if (stat.chua === 0) show['Trạng thái'] = 'Đã nhập kho';
    else show['Ghi chú'] = 'Còn ' + stat.chua + ' thiết bị chưa về. ' + String(show['Ghi chú'] || '').replace(/^Còn \d+ thiết bị chưa về\. /, '');
    saveTable_(assetT); saveTable_(showT); appendRows_('LOG', logs);
    return stat;
  });
}

/** Đổi trạng thái 1 thiết bị (sidebar / kho) */
function apiSetAssetStatus(tag, status, note) {
  return withLock_(function () {
    if (ST_LIST.indexOf(status) < 0) throw new Error('Trạng thái không hợp lệ');
    var assetT = readTable_('ASSET'), now = new Date();
    var assets = live_(assetT);
    var a = assets.filter(function (x) { return String(x['Mã TB']).toUpperCase() === String(tag).toUpperCase(); })[0];
    if (!a) throw new Error('Không tìm thấy mã thiết bị ' + tag);
    var from = a['Trạng thái'], code = String(a['Show hiện tại'] || '');
    a['Trạng thái'] = status; a['Cập nhật lúc'] = now;
    if (status === ST.KHO || status === ST.BT) a['Show hiện tại'] = '';
    if (note !== undefined && note !== null && note !== '') a['Ghi chú'] = note;
    assets.forEach(function (ch) { if (String(ch['Thuộc bộ']) === String(a['Mã TB'])) { ch['Trạng thái'] = status === ST.BT ? ST.KHO : status; ch['Show hiện tại'] = a['Show hiện tại']; ch['Cập nhật lúc'] = now; } });
    if (code && (status === ST.KHO || status === ST.BT)) {
      var lineT = readTable_('LINE');
      live_(lineT).forEach(function (l) {
        if (String(l['Mã show']) !== code) return;
        var tags = String(l['Mã TB đã gán'] || '').split(/[,\s]+/).filter(String);
        var i = tags.indexOf(String(a['Mã TB']));
        if (i >= 0 && from !== ST.SHOW) { tags.splice(i, 1); l['Mã TB đã gán'] = tags.join(', '); }
      });
      saveTable_(lineT);
    }
    saveTable_(assetT);
    appendRows_('LOG', [{ 'Thời gian': now, 'Mã show': code, 'Mã TB': a['Mã TB'], 'Từ': from, 'Sang': status, 'Người': user_(), 'Ghi chú': note || 'Đổi trạng thái thủ công' }]);
    return true;
  });
}

/** Tổng tiền show = (Σ thành tiền) × (1 - CK) × (1 + VAT) – giống công thức ô Tổng tiền */
function showTotalFromLines_(show, lines) {
  var sub = 0;
  lines.forEach(function (l) { sub += num_(l['SL']) * num_(l['Đơn giá']) * num_(l['Số ngày']); });
  var vat = num_(cfgGet_('VAT_%'));
  return Math.round(sub * (1 - num_(show['Chiết khấu %']) / 100) * (1 + vat / 100));
}

/** Thiết bị không phù hợp cho show lớn: đánh dấu "không đi show lớn" hoặc đang cần sửa/bảo hành */
function khongPhuHopShowLon_(a) {
  var ht = String(a['Hiện trạng'] || '');
  return bool_(a['Không đi show lớn']) || ht === HT.CSUA || ht === HT.CBH;
}

/** Sửa thông tin kỹ thuật của 1 thiết bị (serial, ngày, tình trạng) */
function apiSetAssetInfo(tag, info) {
  return withLock_(function () {
    var assetT = readTable_('ASSET'), now = new Date();
    var a = live_(assetT).filter(function (x) { return String(x['Mã TB']).toUpperCase() === String(tag).toUpperCase(); })[0];
    if (!a) throw new Error('Không tìm thấy mã thiết bị ' + tag);
    info = info || {};
    if (info.serial !== undefined) a['Serial'] = String(info.serial);
    if (info.mfg !== undefined) a['Ngày sản xuất'] = info.mfg ? s2d_(info.mfg) : '';
    if (info.bought !== undefined) a['Ngày mua'] = info.bought ? s2d_(info.bought) : '';
    if (info.buyCond !== undefined) a['Tình trạng lúc mua'] = String(info.buyCond);
    if (info.buyPct !== undefined) a['% còn lại lúc mua'] = num_(info.buyPct);
    if (info.cond !== undefined) {
      if (HT_LIST.indexOf(info.cond) < 0) throw new Error('Hiện trạng không hợp lệ');
      a['Hiện trạng'] = info.cond;
    }
    if (info.noBig !== undefined) a['Không đi show lớn'] = !!info.noBig;
    if (info.note !== undefined) a['Ghi chú'] = String(info.note);
    if (info.loc) {
      if ([WH.HN, WH.HCM].indexOf(info.loc) < 0) throw new Error('Kho không hợp lệ');
      // đổi kho thiết bị gốc; thiết bị con đi theo bộ cha
      a['Vị trí'] = info.loc;
      live_(assetT).forEach(function (x) { if (String(x['Thuộc bộ'] || '') === String(a['Mã TB'])) { x['Vị trí'] = info.loc; x['Cập nhật lúc'] = now; } });
    }
    a['Cập nhật lúc'] = now;
    saveTable_(assetT);
    appendRows_('LOG', [{ 'Thời gian': now, 'Mã TB': a['Mã TB'], 'Sang': 'Sửa thông tin', 'Người': user_(), 'Ghi chú': 'Cập nhật serial/ngày/tình trạng' }]);
    return true;
  });
}

/** Thêm 1 dòng lịch sử bảo trì / sửa chữa / bảo hành. rec = {date, type, desc, vendor, after, cost, note} */
function apiMaintAdd(tag, rec) {
  return withLock_(function () {
    rec = rec || {};
    var assetT = readTable_('ASSET'), maintT = readTable_('MAINT'), now = new Date();
    var a = live_(assetT).filter(function (x) { return String(x['Mã TB']).toUpperCase() === String(tag).toUpperCase(); })[0];
    if (!a) throw new Error('Không tìm thấy mã thiết bị ' + tag);
    if (!rec.desc) throw new Error('Nhập nội dung bảo trì / sửa chữa');
    var after = rec.after || '';
    if (after && HT_LIST.indexOf(after) < 0) throw new Error('Hiện trạng sau không hợp lệ');
    maintT.rows.push({
      'Mã TB': a['Mã TB'], 'Ngày': rec.date ? s2d_(rec.date) : now, 'Loại': rec.type || 'Bảo trì', 'Nội dung': rec.desc,
      'Nơi thực hiện': rec.vendor || '', 'Hiện trạng sau': after, 'Chi phí': num_(rec.cost), 'Người ghi': user_(), 'Ghi chú': rec.note || ''
    });
    if (after) { a['Hiện trạng'] = after; a['Cập nhật lúc'] = now; }
    saveTable_(maintT); saveTable_(assetT);
    appendRows_('LOG', [{ 'Thời gian': now, 'Mã TB': a['Mã TB'], 'Sang': 'Bảo trì', 'Người': user_(), 'Ghi chú': (rec.type || 'Bảo trì') + ': ' + rec.desc + (after ? ' → ' + after : '') }]);
    return true;
  });
}

/** Sửa giá thuê/ngày của 1 model. Chỉ Giám đốc trở lên (cấp ≤ 2) hoặc chủ sheet. */
function apiSetPrice(model, price) {
  return withLock_(function () {
    // CTX rỗng = gọi từ chính Apps Script (đáng tin); còn lại phải là chủ sheet hoặc cấp ≤ 2
    if (CTX && !CTX.owner && !(num_(CTX.level) > 0 && num_(CTX.level) <= 2)) throw new Error('Chỉ Giám đốc trở lên mới được sửa giá thuê');
    // CAT có cột công thức (Tổng, Ảnh…) nên chỉ ghi đúng 1 ô, KHÔNG dùng saveTable_
    var catT = readTable_('CAT'), now = new Date(), rowNo = -1, old = 0;
    catT.rows.forEach(function (r, i) { if (rowNo < 0 && !r._blank && String(r['Mã model']) === String(model)) { rowNo = i + 2; old = num_(r['Đơn giá/ngày']); } });
    if (rowNo < 0) throw new Error('Không tìm thấy model ' + model);
    catT.sh.getRange(rowNo, idx_('CAT', 'Đơn giá/ngày')).setValue(num_(price));
    logPrice_('Danh mục (giá thuê mới)', String(model), old, num_(price), 'Sửa giá thuê/ngày – báo giá cũ giữ nguyên');
    return true;
  });
}

/* ===================== NHÂN SỰ · VẬN CHUYỂN · NHẬT KÝ GIÁ · GHI CHÚ ===================== */
var WH = { HN: 'Kho Hà Nội', HCM: 'Kho TP.HCM' };
var WH_CITY = {}; WH_CITY[WH.HN] = 'Hà Nội'; WH_CITY[WH.HCM] = 'TP.HCM';
var DOMESTIC_CITY = ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Đà Lạt'];
var STAFF_ROLES = ['Kỹ thuật âm thanh', 'Kỹ thuật ánh sáng', 'Setup âm thanh ánh sáng', 'Kỹ thuật trưởng', 'Kỹ thuật hệ thống', 'Kỹ thuật kho', 'Khác'];
var TRANS_METHODS = ['Xe tải', 'Máy bay', 'Tự mang'];
var TRANS_ST = ['Chờ gửi', 'Đang vận chuyển', 'Đã đến', 'Hủy'];
var FLIGHT_CUTOFF = '20:00';
var TRUCK_DAYS = 3;

function addDaysS_(s, n) { var d = s2d_(s); d.setDate(d.getDate() + n); return Utilities.formatDate(d, tz_(), 'yyyy-MM-dd'); }
/** Số ngày cần để đưa hàng từ kho tới thành phố tổ chức show: cùng thành phố 0; nội địa khác 3 (xe tải); nước ngoài 1 (máy bay) */
function transitNeed_(fromCity, toCity) {
  if (!fromCity || !toCity || fromCity === toCity) return 0;
  return DOMESTIC_CITY.indexOf(toCity) >= 0 ? TRUCK_DAYS : 1;
}
function nextId_(t, prefix, col) {
  var m = 0;
  t.rows.forEach(function (r) { var c = String(r[col] || ''); if (c.indexOf(prefix) === 0) m = Math.max(m, num_(c.slice(prefix.length))); });
  return prefix + ('000' + (m + 1)).slice(-3);
}
function transportList_() {
  return live_(readTable_('TRANSPORT')).map(function (r) {
    return { id: String(r['Mã vận chuyển'] || ''), show: String(r['Mã show'] || ''), from: String(r['Từ kho'] || ''), to: String(r['Đến'] || ''),
      method: String(r['Phương thức'] || ''), send: d2s_(r['Ngày gửi']), arrive: d2s_(r['Ngày dự kiến đến']), cutoff: String(r['Hạn chốt'] || ''),
      status: String(r['Trạng thái'] || 'Chờ gửi'), pieces: num_(r['Số kiện']), tags: String(r['Mã TB'] || ''), note: String(r['Ghi chú'] || ''), by: String(r['Người ghi'] || '') };
  }).filter(function (t) { return t.id; });
}
/** Show có đủ thời gian vận chuyển không: phải gửi trước ngày xuất kho ít nhất số ngày cần */
function transportCheck_(s, trs) {
  var need = transitNeed_(WH_CITY[s.wh] || '', s.city || '');
  if (!need) return { need: 0, ok: true, latest: '', msg: 'Cùng thành phố với kho – không cần vận chuyển thêm.' };
  if (!s.out) return { need: need, ok: false, latest: '', msg: 'Chưa có ngày xuất kho.' };
  var latest = addDaysS_(s.out, -need);
  var mine = trs.filter(function (t) { return t.show === s.code && t.status !== 'Hủy'; });
  var good = mine.filter(function (t) { return t.send && t.send <= latest; })[0];
  if (good) return { need: need, ok: true, latest: latest, msg: good.method + ' gửi ' + good.send + (good.method === 'Máy bay' ? ' · chốt trước ' + good.cutoff : '') };
  return { need: need, ok: false, latest: latest, msg: 'THIẾU vận chuyển: gửi từ ' + (WH_CITY[s.wh] || 'kho') + ' trước ngày ' + latest +
    (need === 1 ? ' (máy bay: chốt trước ' + FLIGHT_CUTOFF + ' ngày hôm trước)' : ' (xe tải cần ' + TRUCK_DAYS + ' ngày)') };
}

/** Lưu vận chuyển. rec = {id, show, from, to, method, send, arrive, status, pieces, tags, note} */
function apiSaveTransport(rec) {
  return withLock_(function () {
    rec = rec || {};
    if (!rec.show) throw new Error('Chọn show');
    if (TRANS_METHODS.indexOf(rec.method) < 0) throw new Error('Chọn phương thức vận chuyển');
    if (!rec.send) throw new Error('Nhập ngày gửi');
    var t = readTable_('TRANSPORT'), now = new Date();
    var row = rec.id ? live_(t).filter(function (r) { return String(r['Mã vận chuyển']) === rec.id; })[0] : null;
    var isNew = !row;
    if (isNew) { row = {}; row['Mã vận chuyển'] = nextId_(t, 'VC-', 'Mã vận chuyển'); t.rows.push(row); }
    var show = live_(readTable_('SHOW')).filter(function (x) { return String(x['Mã show']) === rec.show; })[0];
    if (!show) throw new Error('Không tìm thấy show ' + rec.show);
    var city = String(show['Thành phố'] || '');
    var arrive = rec.arrive || addDaysS_(rec.send, rec.method === 'Máy bay' ? 1 : (rec.method === 'Xe tải' ? TRUCK_DAYS : 0));
    Object.assign(row, { 'Mã show': rec.show, 'Từ kho': rec.from || '', 'Đến': rec.to || city, 'Phương thức': rec.method,
      'Ngày gửi': s2d_(rec.send), 'Ngày dự kiến đến': s2d_(arrive),
      'Hạn chốt': rec.method === 'Máy bay' ? addDaysS_(rec.send, -1) + ' ' + FLIGHT_CUTOFF : '',
      'Trạng thái': rec.status || 'Chờ gửi', 'Số kiện': num_(rec.pieces), 'Mã TB': rec.tags || '', 'Ghi chú': rec.note || '', 'Người ghi': user_() });
    saveTable_(t);
    appendRows_('LOG', [{ 'Thời gian': now, 'Mã show': rec.show, 'Sang': 'Vận chuyển', 'Người': user_(), 'Ghi chú': (isNew ? 'Thêm' : 'Sửa') + ' ' + row['Mã vận chuyển'] + ': ' + rec.method + ' ' + rec.send }]);
    return { id: row['Mã vận chuyển'] };
  });
}
function apiDeleteTransport(id) {
  return withLock_(function () {
    var t = readTable_('TRANSPORT');
    live_(t).forEach(function (r) { if (String(r['Mã vận chuyển']) === id) r._deleted = true; });
    saveTable_(t);
    return true;
  });
}

/* ---------- nhân sự ---------- */
function staffList_() {
  return live_(readTable_('STAFF')).map(function (r) {
    return { code: String(r['Mã NV'] || ''), name: String(r['Họ tên'] || ''), role: String(r['Vai trò'] || ''), wh: String(r['Kho làm việc'] || ''),
      phone: String(r['Điện thoại'] || ''), note: String(r['Ghi chú'] || '') };
  }).filter(function (s) { return s.code; });
}
function assignList_() {
  return live_(readTable_('ASSIGN')).map(function (r) {
    return { id: String(r['Mã phân công'] || ''), show: String(r['Mã show'] || ''), staff: String(r['Mã NV'] || ''), date: d2s_(r['Ngày']),
      from: String(r['Từ giờ'] || ''), to: String(r['Đến giờ'] || ''), task: String(r['Việc làm'] || ''), place: String(r['Địa điểm'] || ''),
      tag: String(r['Mã TB'] || ''), note: String(r['Ghi chú'] || '') };
  }).filter(function (a) { return a.id; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
}
function apiSaveStaff(rec) {
  return withLock_(function () {
    rec = rec || {};
    if (!rec.name) throw new Error('Nhập họ tên');
    var t = readTable_('STAFF');
    var row = rec.code ? live_(t).filter(function (r) { return String(r['Mã NV']) === rec.code; })[0] : null;
    if (!row) { row = {}; row['Mã NV'] = nextId_(t, 'NV-', 'Mã NV'); t.rows.push(row); }
    Object.assign(row, { 'Họ tên': rec.name, 'Vai trò': rec.role || '', 'Kho làm việc': rec.wh || '', 'Điện thoại': rec.phone || '', 'Ghi chú': rec.note || '' });
    saveTable_(t);
    return { code: row['Mã NV'] };
  });
}
function apiDeleteStaff(code) {
  return withLock_(function () {
    var t = readTable_('STAFF');
    live_(t).forEach(function (r) { if (String(r['Mã NV']) === code) r._deleted = true; });
    saveTable_(t);
    return true;
  });
}
/** Phân công: ai làm gì, lúc nào, ở đâu, (tùy chọn) với thiết bị nào */
function apiSaveAssign(rec) {
  return withLock_(function () {
    rec = rec || {};
    if (!rec.show || !rec.staff) throw new Error('Chọn show và nhân sự');
    if (!rec.date) throw new Error('Chọn ngày');
    var t = readTable_('ASSIGN');
    var row = rec.id ? live_(t).filter(function (r) { return String(r['Mã phân công']) === rec.id; })[0] : null;
    if (!row) { row = {}; row['Mã phân công'] = nextId_(t, 'PC-', 'Mã phân công'); t.rows.push(row); }
    Object.assign(row, { 'Mã show': rec.show, 'Mã NV': rec.staff, 'Ngày': s2d_(rec.date), 'Từ giờ': rec.from || '', 'Đến giờ': rec.to || '',
      'Việc làm': rec.task || '', 'Địa điểm': rec.place || '', 'Mã TB': rec.tag || '', 'Ghi chú': rec.note || '' });
    saveTable_(t);
    return { id: row['Mã phân công'] };
  });
}
function apiDeleteAssign(id) {
  return withLock_(function () {
    var t = readTable_('ASSIGN');
    live_(t).forEach(function (r) { if (String(r['Mã phân công']) === id) r._deleted = true; });
    saveTable_(t);
    return true;
  });
}

/* ---------- nhật ký giá & cập nhật giá ---------- */
function logPrice_(loai, ma, cu, moi, ghi) {
  appendRows_('PRICELOG', [{ 'Thời gian': new Date(), 'Người': user_(), 'IP': (CTX && CTX.ip) || '', 'Loại': loai, 'Mã': ma,
    'Giá cũ': cu, 'Giá mới': moi, 'Ghi chú': ghi || '' }]);
}
function priceMapCurrent_() {
  var m = {};
  live_(readTable_('CAT')).forEach(function (r) { m[String(r['Mã model'])] = num_(r['Đơn giá/ngày']); });
  return m;
}
/** Đặt đơn giá dòng thiết bị về giá thuê mới nhất. models = null → mọi dòng. Không đụng tới show/báo giá khác. */
function applyLinePrices_(showCode, models, pm, lineT) {
  var n = 0, changed = [];
  lineT.rows.forEach(function (r) {
    if (r._deleted || r._blank || String(r['Mã show']) !== showCode) return;
    var m = String(r['Mã model']);
    if (models && models.indexOf(m) < 0) return;
    if (pm[m] === undefined) return;
    var old = num_(r['Đơn giá']);
    if (old === pm[m]) return;
    r['Đơn giá'] = pm[m];
    n++; changed.push([m, old, pm[m]]);
  });
  return { n: n, changed: changed };
}
function apiUpdateShowPrices(code, models) {
  return withLock_(function () {
    if (CTX && !CTX.owner && !(num_(CTX.level) > 0 && num_(CTX.level) <= 2)) throw new Error('Chỉ Giám đốc trở lên mới được cập nhật giá');
    var lineT = readTable_('LINE'), pm = priceMapCurrent_();
    var r = applyLinePrices_(code, (models && models.length) ? models : null, pm, lineT);
    if (!r.n) return { updated: 0 };
    saveTable_(lineT);
    r.changed.forEach(function (c) { logPrice_('Báo giá / show', code + ' · ' + c[0], c[1], c[2], 'Cập nhật theo giá thuê mới nhất'); });
    return { updated: r.n };
  });
}
/** CEO: cập nhật giá cho toàn bộ báo giá / show / tất cả, trừ các mã trong keep */
function apiBulkUpdatePrices(scope, keep) {
  return withLock_(function () {
    if (CTX && !CTX.owner && num_(CTX.level) !== 1) throw new Error('Chỉ CEO mới được cập nhật giá hàng loạt');
    var showT = readTable_('SHOW'), lineT = readTable_('LINE'), pm = priceMapCurrent_(), keepSet = {};
    (keep || []).forEach(function (k) { keepSet[k] = 1; });
    var codes = live_(showT).filter(function (s) {
      var code = String(s['Mã show']), st = String(s['Trạng thái']);
      if (keepSet[code] || st === 'Hủy' || st === 'Đã nhập kho') return false;
      if (scope === 'quote') return st === 'Báo giá';
      if (scope === 'show') return st !== 'Báo giá';
      return true;
    }).map(function (s) { return String(s['Mã show']); });
    var lines = 0, shows = 0;
    codes.forEach(function (code) {
      var r = applyLinePrices_(code, null, pm, lineT);
      if (!r.n) return;
      shows++; lines += r.n;
      r.changed.forEach(function (c) { logPrice_('Hàng loạt (CEO)', code + ' · ' + c[0], c[1], c[2], 'Phạm vi: ' + scope); });
    });
    if (lines) saveTable_(lineT);
    return { shows: shows, lines: lines, kept: (keep || []).length };
  });
}
function priceLogList_() {
  return live_(readTable_('PRICELOG')).slice(-300).reverse().map(function (r) {
    return { t: dt2s_(r['Thời gian']), who: String(r['Người'] || ''), ip: String(r['IP'] || ''), loai: String(r['Loại'] || ''), ma: String(r['Mã'] || ''),
      old: num_(r['Giá cũ']), now: num_(r['Giá mới']), note: String(r['Ghi chú'] || '') };
  });
}

/** Ghi chú thay đổi: chỉ tài khoản cấp Giám đốc trở lên (cấp ≤ 2) mới xem được; chỉ lấy thay đổi do cấp Giám đốc trở lên thực hiện */
function feedFor_() {
  if (CTX && !CTX.owner && !(num_(CTX.level) > 0 && num_(CTX.level) <= 2)) return [];
  var roles = roles_();
  return live_(readTable_('AUDIT')).slice(-300).reverse().filter(function (r) {
    var ro = roles[String(r['Chức vụ'] || '')];
    return ro ? ro.level <= 2 : false;
  }).slice(0, 40).map(function (r) {
    return { t: dt2s_(r['Thời gian']), who: String(r['Username'] || ''), role: String(r['Chức vụ'] || ''), act: String(r['Thao tác'] || ''), det: String(r['Chi tiết'] || '') };
  });
}


/* ===================== CHI PHÍ · TIỀN PHẠT · XE CÔNG TY · THỐNG KÊ · CHÍNH SÁCH GIÁ ===================== */
var PHAT_LOAI = ['Lỗi kỹ thuật', 'Thiếu thiết bị', 'Lỗi nhân sự', 'Hư hỏng thiết bị', 'Khác'];
var CHI_KHOAN = ['Vận chuyển', 'Nhân công', 'Ăn ở – đi lại', 'Thuê ngoài', 'Vật tư', 'Khác'];
/** Cấp được xe công ty theo chức vụ; kinh doanh (Sales) được xe khi doanh số 12 tháng ≥ ngưỡng */
var CAR_ROLES = ['CEO', 'Quản trị', 'Giám đốc', 'Phó tổng giám đốc', 'Giám đốc Kỹ Thuật', 'Phó giám đốc Kỹ Thuật', 'Giám đốc Sale'];
var SALES_ROLES = ['Giám đốc Sale', 'Sales Manager'];
var MA_STAGEPRO_MAC_DINH = 'STAGEPRO';

function ymdOf_(d) { return Utilities.formatDate(d, tz_(), 'yyyy-MM-dd'); }
function todayYmd_() { return ymdOf_(new Date()); }
function dmy_(s) { s = String(s || ''); return s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : ''; }
/** Cấp Giám đốc trở lên (hoặc chủ sheet / trình chạy nội bộ) */
function isTopCtx_() { return !CTX || !!CTX.owner || (num_(CTX.level) > 0 && num_(CTX.level) <= 2); }
function isCeoCtx_() { return !CTX || !!CTX.owner || num_(CTX.level) === 1; }
function cfgNum_(k, d) { var v = cfgGet_(k); return (v === '' || v === undefined || v === null) ? d : num_(v); }
function maStagePro_() { return String(cfgGet_('MA_STAGEPRO') || MA_STAGEPRO_MAC_DINH).trim().toUpperCase(); }
function isForeign_(city) { return !!city && DOMESTIC_CITY.indexOf(city) < 0; }

/** Trạng thái: show ở nước ngoài luôn là On Hold (chờ quyết định) cho tới khi đổi trạng thái khác */
function statusFor_(s) {
  var st = s.status || 'Báo giá';
  if (isForeign_(s.city) && ['Báo giá', 'Đã xác nhận', 'On Hold'].indexOf(st) >= 0) return 'On Hold';
  return st;
}
/** Mã ưu đãi StagePro: chỉ CEO được nhập/đổi. Trả về mã đã chuẩn hóa ('' nếu không có). */
function promoCheck_(s, row) {
  var code = String(s.promo || '').trim().toUpperCase();
  if (!code) return '';
  if (code !== maStagePro_()) throw new Error('Mã ưu đãi không hợp lệ');
  var was = String(row['Mã ưu đãi'] || '').trim().toUpperCase();
  if (code !== was && !isCeoCtx_()) throw new Error('Chỉ CEO được nhập mã ưu đãi StagePro');
  return code;
}
/** Chính sách giảm giá tự động: mã StagePro = 100%; show diễn từ 2 ngày liên tiếp trở lên = GIAM_2_NGAY_% (mặc định 50%) */
function policyOf_(s) {
  var promo = String(s.promo || '').trim().toUpperCase();
  if (promo && promo === maStagePro_()) return { pct: 100, label: 'Mã ' + promo + ' (StagePro 100%)' };
  var n = daysBetween_(s.day, s.dayEnd);
  if (s.day && s.dayEnd && n >= 1) {
    var pct = cfgNum_('GIAM_2_NGAY_%', 50);
    return { pct: pct, label: 'Diễn ' + (n + 1) + ' ngày liên tiếp (giảm ' + pct + '%)' };
  }
  return { pct: 0, label: '' };
}
/** % giảm thực tế = lớn hơn giữa giảm thủ công đã duyệt và chính sách tự động */
function effPct_(manual, pol) { return Math.max(num_(manual), pol ? num_(pol.pct) : 0); }

/* ---------- chi phí & tiền phạt ---------- */
function penaltyList_() {
  return live_(readTable_('PHAT')).map(function (r) {
    return { id: String(r['Mã phạt'] || ''), show: String(r['Mã show'] || ''), date: d2s_(r['Ngày']), type: String(r['Loại'] || ''), desc: String(r['Mô tả'] || ''),
      amount: num_(r['Số tiền']), who: String(r['Người chịu'] || ''), by: String(r['Người ghi'] || ''), note: String(r['Ghi chú'] || '') };
  }).filter(function (x) { return x.id; });
}
function expenseList_() {
  return live_(readTable_('CHI')).map(function (r) {
    return { id: String(r['Mã chi'] || ''), show: String(r['Mã show'] || ''), date: d2s_(r['Ngày']), type: String(r['Khoản chi'] || ''),
      amount: num_(r['Số tiền']), by: String(r['Người ghi'] || ''), note: String(r['Ghi chú'] || '') };
  }).filter(function (x) { return x.id; });
}
function saveFinRow_(key, idCol, prefix, rec, fill, cols) {
  var t = readTable_(key);
  var row = rec.id ? live_(t).filter(function (r) { return String(r[idCol]) === rec.id; })[0] : null;
  if (!row) { row = {}; row[idCol] = nextId_(t, prefix, idCol); t.rows.push(row); }
  Object.assign(row, fill);
  saveTable_(t);
  return { id: row[idCol] };
}
function apiSavePenalty(rec) {
  return withLock_(function () {
    rec = rec || {};
    if (!rec.show) throw new Error('Chọn show');
    if (!(num_(rec.amount) > 0)) throw new Error('Nhập số tiền phạt');
    return saveFinRow_('PHAT', 'Mã phạt', 'PH-', rec, { 'Mã show': rec.show, 'Ngày': s2d_(rec.date || todayYmd_()), 'Loại': rec.type || PHAT_LOAI[0],
      'Mô tả': rec.desc || '', 'Số tiền': num_(rec.amount), 'Người chịu': rec.who || '', 'Người ghi': user_(), 'Ghi chú': rec.note || '' });
  });
}
function apiDeletePenalty(id) { return withLock_(function () { var t = readTable_('PHAT'); live_(t).forEach(function (r) { if (String(r['Mã phạt']) === id) r._deleted = true; }); saveTable_(t); return true; }); }
function apiSaveExpense(rec) {
  return withLock_(function () {
    rec = rec || {};
    if (!rec.show) throw new Error('Chọn show');
    if (!(num_(rec.amount) > 0)) throw new Error('Nhập số tiền chi');
    return saveFinRow_('CHI', 'Mã chi', 'CP-', rec, { 'Mã show': rec.show, 'Ngày': s2d_(rec.date || todayYmd_()), 'Khoản chi': rec.type || CHI_KHOAN[0],
      'Số tiền': num_(rec.amount), 'Người ghi': user_(), 'Ghi chú': rec.note || '' });
  });
}
function apiDeleteExpense(id) { return withLock_(function () { var t = readTable_('CHI'); live_(t).forEach(function (r) { if (String(r['Mã chi']) === id) r._deleted = true; }); saveTable_(t); return true; }); }

/* ---------- xe công ty ---------- */
function carList_() {
  return live_(readTable_('XE')).map(function (r) {
    return { id: String(r['Mã xe'] || ''), type: String(r['Loại xe'] || ''), plate: String(r['Biển số'] || ''), who: String(r['Người được cấp'] || ''),
      from: d2s_(r['Ngày nhận']), to: d2s_(r['Ngày trả']), note: String(r['Ghi chú'] || ''), by: String(r['Người ghi'] || '') };
  }).filter(function (x) { return x.id; });
}
function apiSaveCar(rec) {
  return withLock_(function () {
    if (!isTopCtx_()) throw new Error('Chỉ Giám đốc trở lên được cấp xe');
    rec = rec || {};
    if (!rec.type) throw new Error('Nhập loại xe');
    return saveFinRow_('XE', 'Mã xe', 'XE-', rec, { 'Loại xe': rec.type, 'Biển số': rec.plate || '', 'Người được cấp': rec.who || '',
      'Ngày nhận': rec.from ? s2d_(rec.from) : '', 'Ngày trả': rec.to ? s2d_(rec.to) : '', 'Ghi chú': rec.note || '', 'Người ghi': user_() });
  });
}
function apiDeleteCar(id) { return withLock_(function () { if (!isTopCtx_()) throw new Error('Không có quyền'); var t = readTable_('XE'); live_(t).forEach(function (r) { if (String(r['Mã xe']) === id) r._deleted = true; }); saveTable_(t); return true; }); }
/** Doanh số 12 tháng gần nhất theo người tạo show (đã chốt, không tính báo giá / On Hold / hủy) */
function salesRev12_() {
  var to = todayYmd_(), from = addDaysS_(to, -365), m = {};
  live_(readTable_('SHOW')).forEach(function (r) {
    var st = String(r['Trạng thái'] || '');
    if (['Hủy', 'Báo giá', 'On Hold'].indexOf(st) >= 0) return;
    var day = d2s_(r['Ngày diễn']);
    if (!day || day < from || day > to) return;
    var who = String(r['Người tạo'] || '');
    m[who] = (m[who] || 0) + num_(r['Tổng tiền']);
  });
  return m;
}

/* ---------- thống kê: tuần / tháng / quý / nửa năm / năm / tùy chọn ---------- */
function statsRange_(mode, ref, from, to) {
  var r = s2d_(ref || todayYmd_()), y = r.getFullYear(), m = r.getMonth(), first, last, unit;
  var ymd = ymdOf_;
  if (mode === 'custom') {
    first = from; last = to; var span = daysBetween_(from, to);
    unit = span <= 31 ? 'day' : (span <= 120 ? 'week' : 'month');
  } else if (mode === 'week') {
    var w = (r.getDay() + 6) % 7; first = ymd(new Date(y, m, r.getDate() - w, 12)); last = addDaysS_(first, 6); unit = 'day';
  } else if (mode === 'month') {
    first = ymd(new Date(y, m, 1, 12)); last = ymd(new Date(y, m + 1, 0, 12)); unit = 'week';
  } else if (mode === 'quarter') {
    var q = Math.floor(m / 3) * 3; first = ymd(new Date(y, q, 1, 12)); last = ymd(new Date(y, q + 3, 0, 12)); unit = 'month';
  } else if (mode === 'half') {
    var h = m < 6 ? 0 : 6; first = ymd(new Date(y, h, 1, 12)); last = ymd(new Date(y, h + 6, 0, 12)); unit = 'month';
  } else {
    first = ymd(new Date(y, 0, 1, 12)); last = ymd(new Date(y, 11, 31, 12)); unit = 'month';
  }
  var buckets = [], cur = first;
  while (first && last && cur <= last) {
    var end;
    if (unit === 'day') end = cur;
    else if (unit === 'week') end = addDaysS_(cur, 6);
    else { var d0 = s2d_(cur); end = ymd(new Date(d0.getFullYear(), d0.getMonth() + 1, 0, 12)); }
    if (end > last) end = last;
    var label = unit === 'month' ? ('Tháng ' + (s2d_(cur).getMonth() + 1) + '/' + s2d_(cur).getFullYear()) : (dmy_(cur) + (unit === 'week' ? ' – ' + dmy_(end) : ''));
    buckets.push({ from: cur, to: end, label: label });
    cur = addDaysS_(end, 1);
  }
  return { from: first, to: last, buckets: buckets };
}
function apiStats(mode, ref, from, to) {
  if (!isTopCtx_()) throw new Error('Chỉ Giám đốc trở lên xem thống kê');
  var R = statsRange_(mode || 'month', ref, from, to);
  var sub = {};
  live_(readTable_('LINE')).forEach(function (l) { var c = String(l['Mã show']); sub[c] = (sub[c] || 0) + num_(l['SL']) * num_(l['Đơn giá']) * num_(l['Số ngày']); });
  var revs = [];
  live_(readTable_('SHOW')).forEach(function (r) {
    var st = String(r['Trạng thái'] || '');
    if (['Hủy', 'Báo giá', 'On Hold'].indexOf(st) >= 0) return;
    var day = d2s_(r['Ngày diễn']), pol = policyOf_({ promo: r['Mã ưu đãi'], day: day, dayEnd: d2s_(r['Ngày diễn cuối']) });
    var pct = effPct_(r['Chiết khấu %'], pol);
    revs.push({ day: day, v: (sub[String(r['Mã show'])] || 0) * (1 - pct / 100) });
  });
  var chis = expenseList_().map(function (x) { return { day: x.date, v: x.amount }; });
  var phats = penaltyList_().map(function (x) { return { day: x.date, v: x.amount }; });
  var sumIn = function (arr, a, b) { return arr.reduce(function (s, x) { return x.day >= a && x.day <= b ? s + x.v : s; }, 0); };
  var rows = R.buckets.map(function (b) {
    var rv = sumIn(revs, b.from, b.to), ex = sumIn(chis, b.from, b.to), pe = sumIn(phats, b.from, b.to);
    return { label: b.label, from: b.from, to: b.to, revenue: Math.round(rv), expense: Math.round(ex), penalty: Math.round(pe), profit: Math.round(rv - ex - pe) };
  });
  var total = rows.reduce(function (t, x) { ['revenue', 'expense', 'penalty', 'profit'].forEach(function (k) { t[k] += x[k]; }); return t; }, { revenue: 0, expense: 0, penalty: 0, profit: 0 });
  return { mode: mode || 'month', from: R.from, to: R.to, rows: rows, total: total };
}

/** Lưu ảnh PNG (phiếu xuất kho / báo giá) vào Drive, trả về link */
function apiSavePng(dataUrl, fileName) {
  var m = String(dataUrl).match(/^data:image\/png;base64,(.+)$/);
  if (!m) throw new Error('Dữ liệu ảnh không hợp lệ');
  var name = 'QLTB PRO – Phiếu';
  var it = DriveApp.getFoldersByName(name);
  var folder = it.hasNext() ? it.next() : DriveApp.createFolder(name);
  var f = folder.createFile(Utilities.newBlob(Utilities.base64Decode(m[1]), 'image/png', fileName || 'phieu.png'));
  return f.getUrl();
}

/* ======================= BỘ MÁY QUY TẮC LIÊN KẾT ========================= */
/** Tính số lượng từ công thức: n = SL thiết bị chính, các biến tham số (h, r...). */
function evalQty_(expr, vars) {
  var e = String(expr || '').trim();
  if (!e) return 0;
  var safe = e.replace(/CEIL/gi, 'Math.ceil').replace(/FLOOR/gi, 'Math.floor').replace(/MAX/gi, 'Math.max').replace(/MIN/gi, 'Math.min').replace(/ROUND/gi, 'Math.round');
  var names = Object.keys(vars);
  if (!/^[\w\s+\-*/().,]*$/.test(safe)) return 0;
  var stripped = safe.replace(/Math\.(ceil|floor|max|min|round)/g, '');
  var ok = (stripped.match(/[A-Za-z_]\w*/g) || []).every(function (w) { return names.indexOf(w) >= 0; });
  if (!ok) return 0;
  try {
    var v = Function.apply(null, names.concat(['return (' + safe + ');'])).apply(null, names.map(function (k) { return num_(vars[k]); }));
    return Math.max(0, Math.round(Number(v) || 0));
  } catch (err) { return 0; }
}
function parseParams_(s) {
  return String(s || '').split(';').map(function (p) { return p.trim(); }).filter(String).map(function (p) {
    var a = p.split('='); return { v: a[0].trim(), label: (a[1] || a[0]).trim(), def: num_(a[2] || 1) };
  });
}
/** Trả về danh sách dòng (chính + kèm theo) theo lựa chọn. choices = {Nhóm: Lựa chọn} */
function buildLines_(model, qty, params, choices, cat, rules) {
  var c = cat.filter(function (x) { return x.code === model; })[0];
  var fam = c ? c.family : model;
  var my = rules.filter(function (r) { return r.key === model || r.key === fam; });
  var vars = { n: qty };
  parseParams_(c && c.params).forEach(function (p) { vars[p.v] = (params && params[p.v] !== undefined) ? params[p.v] : p.def; });
  var groups = [];
  my.forEach(function (r) { if (groups.indexOf(r.group) < 0) groups.push(r.group); });
  var main = { model: model, qty: qty, source: 'Chính', group: '', req: '' };
  var out = [main], reqs = [];
  groups.forEach(function (g) {
    var opts = my.filter(function (r) { return r.group === g; });
    var pick = (choices && choices[g]) || (opts.filter(function (r) { return r.def; })[0] || opts[0]).opt;
    opts.filter(function (r) { return r.opt === pick; }).forEach(function (r) {
      if (r.req && reqs.indexOf(r.req) < 0) reqs.push(r.req);
      if (!r.comp) return;
      var q = evalQty_(r.f, vars);
      if (q > 0) out.push({ model: r.comp, qty: q, source: 'Kèm ' + model, group: g + ': ' + pick, req: '' });
    });
  });
  main.req = reqs.join(', ');
  return out;
}

/* ============================ DỮ LIỆU MẪU ================================ */
function seedConfig_() {
  var rows = [
    ['TEN_CONG_TY', 'FSL – Fantasies Show Light', 'Hiện trên đầu popup và phiếu xuất kho'],
    ['DIA_CHI_KHO', 'Kho Hà Nội & Kho TP.HCM', 'Hai kho thiết bị'],
    ['NGUOI_PHU_TRACH', 'Hoàng', 'Người mặc định ghi vào nhật ký'],
    ['DON_VI_TIEN', 'đ', ''],
    ['VAT_%', 8, 'Thuế VAT cộng vào tổng tiền show'],
    ['GHI_CHU_GIA', 'Đơn giá thuê trong file là GIẢ ĐỊNH để chạy thử – thay bằng bảng giá thật', ''],
    ['NGUONG_SHOW_LON', NGUONG_MAC_DINH, 'Show có tổng tiền ≥ mức này là "show lớn": thiết bị không phù hợp (cũ tự sửa, đang cần sửa/bảo hành) bị loại khỏi soạn hàng và tô đỏ'],
    ['MA_STAGEPRO', MA_STAGEPRO_MAC_DINH, 'Mã ưu đãi 100% cho công ty phân phối Stage Professional (StagePro). Chỉ CEO nhập.'],
    ['GIAM_2_NGAY_%', 50, 'Show diễn từ 2 ngày liên tiếp trở lên được giảm % này (tự động)'],
    ['XE_DOANH_SO_TOI_THIEU', 10000000000, 'Sales được cấp xe khi doanh số 12 tháng ≥ mức này (đồng)'],
    ['PHIEN_BAN', APP.VERSION, '']
  ];
  sh_('CFG').getRange(2, 1, rows.length, 3).setValues(rows);
}
/** Thêm các khóa cấu hình mới vào file đã có (không ghi đè giá trị đã sửa) */
function ensureCfg_() {
  var sh = sh_('CFG'), have = cfgAll_(), add = [];
  if (!('NGUONG_SHOW_LON' in have)) add.push(['NGUONG_SHOW_LON', NGUONG_MAC_DINH, 'Show có tổng tiền ≥ mức này là "show lớn": thiết bị không phù hợp bị loại khỏi soạn hàng và tô đỏ']);
  if (!('MA_STAGEPRO' in have)) add.push(['MA_STAGEPRO', MA_STAGEPRO_MAC_DINH, 'Mã ưu đãi 100% cho công ty phân phối Stage Professional (StagePro). Chỉ CEO nhập.']);
  if (!('GIAM_2_NGAY_%' in have)) add.push(['GIAM_2_NGAY_%', 50, 'Show diễn từ 2 ngày liên tiếp trở lên được giảm % này (tự động)']);
  if (!('XE_DOANH_SO_TOI_THIEU' in have)) add.push(['XE_DOANH_SO_TOI_THIEU', 10000000000, 'Sales được cấp xe khi doanh số 12 tháng ≥ mức này (đồng)']);
  if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, 3).setValues(add);
}
function nguongShowLon_() { var v = num_(cfgGet_('NGUONG_SHOW_LON')); return v > 0 ? v : NGUONG_MAC_DINH; }

function seedDemo_() {
  ['CAT', 'ASSET', 'MAINT', 'RULE', 'SHOW', 'LINE', 'LOG', 'TEST', 'GUIDE', 'CUST', 'DISC', 'STAFF', 'ASSIGN', 'TRANSPORT', 'PRICELOG', 'PHAT', 'CHI', 'XE'].forEach(function (k) {
    var sh = sh_(k); if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, Math.max(sh.getLastColumn(), COLS[k].length)).clearContent();
  });
  if (sh_('CFG').getLastRow() < 2) seedConfig_();
  var cat = demoCatalog_();
  var catRows = cat.map(function (c) {
    return ['', c[0], c[1], c[2], c[3], c[4], c[5], c[6], c[7], c[8], c[9], c[10] ? 'Có' : 'Không', c[11], c[12], c[13], '', '', '', '', ''];
  });
  sh_('CAT').getRange(2, 1, catRows.length, COLS.CAT.length).setValues(catRows);
  refreshCatalogFormulas();

  var rules = demoRules_();
  sh_('RULE').getRange(2, 1, rules.length, COLS.RULE.length).setValues(rules);

  var assets = demoAssets_(cat);
  sh_('ASSET').getRange(2, 1, assets.length, COLS.ASSET.length).setValues(assets);
  if (assets.maint && assets.maint.length) sh_('MAINT').getRange(2, 1, assets.maint.length, COLS.MAINT.length).setValues(assets.maint);
  // 1 thiết bị đang bảo trì (đặt TRƯỚC khi phân bổ show)
  apiSetAssetStatus('GSL8-028', ST.BT, 'Thay màng HF – chờ linh kiện');

  // ---- tạo show bằng chính bộ máy liên kết (giống bấm trong popup) ----
  seedCustomers_();
  var catObj = cat.map(function (c) { return { code: c[0], family: c[3], params: c[11] }; });
  var ruleObj = rules.map(function (r) { return { key: r[0], group: r[1], opt: r[3], def: r[4] === true, comp: r[5], f: r[6], req: r[7] }; });
  var L = function (model, qty, params, choices) { return buildLines_(model, qty, params || {}, choices || {}, catObj, ruleObj); };
  var MADI = { 'Kết nối stage': 'MADI BNC redundant – SD-Rack bản MADI', 'Card Dante (DMI)': 'Không dùng card Dante' };

  // Sự kiện lấy từ file kế hoạch 10–11/2026 (tab Sự kiện). Show không có thiết bị (ghé thăm, khảo sát, visa, họp…) bị bỏ qua.
  // Đội hình thiết bị là GIẢ ĐỊNH để chạy thử – sửa lại trong popup.
  // 1) Musique De Salon – đang ở show
  apiSaveShow({ show: { city: 'TP.HCM', wh: WH.HCM, name: 'Musique De Salon', client: '', venue: 'Nhà hát Hòa Bình, TP.HCM', type: 'Concert (cc)',
    out: '2026-10-06', day: '2026-10-10', back: '2026-10-11', status: 'Đã xác nhận', pic: 'Hoàng', note: 'Có mặt 10:00 ngày 9/10 (tuning 07/10, soundcheck 08/10, rehearsal 09/10). Diễn tối 10/10.', color: '#7c3aed' },
    lines: [].concat(L('J8', 4), L('JSUB', 2), L('Q225', 1, { r: 1 }, MADI)) }).code;
  var sMus = 'SH-2610-001';
  apiAssign(sMus); apiCheckout(sMus);

  // 2) Anh Trai Vượt Ngàn Chông Gai – show chính, >500 triệu
  apiSaveShow({ show: { city: 'TP.HCM', wh: WH.HN, name: 'Anh Trai Vượt Ngàn Chông Gai (ATVNCG)', client: 'KH-001', venue: 'Global City, TP.HCM', type: 'Concert (cc)',
    out: '2026-10-11', day: '2026-10-17', dayEnd: '2026-10-18', back: '2026-10-19', status: 'Đã xác nhận', pic: 'Hoàng',
    note: 'Show hỗ trợ chính. Tuning 11/10. 15–16/10 Hoàng chỉ làm phần tối (ban ngày giao KTV đơn vị). Diễn 17–18/10.', color: '#0ea5e9' },
    lines: [].concat(
      L('GSL8', 24, { h: 2 }, { 'Khung treo': 'Treo Compression mode (GSL Flying frame set + Compression set)' }),
      L('SLGSUB', 24), L('J8', 8),
      L('Q338P', 1, { r: 2 }, { 'Kết nối stage': 'OptoCore loop – SD-Rack bản Optics' }),
      L('AD4Q', 4), L('AD2', 8), L('AD1', 6), L('ADTQ', 1)) });
  var sAT = 'SH-2610-002';
  apiAssign(sAT);

  // 3) Quay clip thánh ca – nhà thờ (setup 14/10, quay 18/10)
  apiSaveShow({ show: { city: 'Hà Nội', wh: WH.HN, name: 'Nhà thờ: quay clip thánh ca', client: '', venue: 'Nhà thờ (chưa rõ địa chỉ)', type: 'Khác',
    out: '2026-10-14', day: '2026-10-18', back: '2026-10-18', status: 'Đã xác nhận', pic: 'Hoàng', note: 'Setup chiều 14/10 (dời từ 16/10). Quay sáng 18/10.', color: '#10b981' },
    lines: [].concat(L('Q225', 1, { r: 1 }, MADI), L('AD2', 4), L('AD1', 2), L('AD4Q', 1)) });
  apiAssign('SH-2610-003');

  // 4–7) Các show còn lại – báo giá, chưa giữ hàng
  apiSaveShow({ show: { city: 'Bangkok', wh: WH.HN, name: 'Tech Playground Thái Lan (ws)', client: '', venue: 'Centerpoint Studio 1, Bang Na, Bangkok', type: 'Workshop (ws)',
    out: '2026-10-19', day: '2026-10-20', back: '2026-10-21', status: 'Báo giá', pic: 'Hoàng', note: 'Bay sáng 19/10. Cty từng nói cần có mặt 18/10.', color: '#f97316' },
    lines: [].concat(L('Q225DS', 1, { r: 1 }, MADI)) });
  apiSaveShow({ show: { city: 'Hà Nội', wh: WH.HN, name: 'Tech Playground Hà Nội (ws)', client: '', venue: 'Chưa rõ venue, Hà Nội', type: 'Workshop (ws)',
    out: '2026-11-03', day: '2026-11-04', back: '2026-11-05', status: 'Báo giá', pic: 'Hoàng', note: 'Bay VNA ra sáng 3/11, setup cùng ngày. Trùng ngày tuning Đà Lạt.', color: '#f97316' },
    lines: [].concat(L('Q225', 1, { r: 1 }, MADI)) });
  apiSaveShow({ show: { city: 'Đà Lạt', wh: WH.HCM, name: 'Jazz Festival Đà Lạt (diễn chung Andrea Bocelli 7/11)', client: '', venue: 'Chưa rõ venue, Đà Lạt', type: 'Concert (cc)',
    out: '2026-11-03', day: '2026-11-07', dayEnd: '2026-11-08', back: '2026-11-09', status: 'Báo giá', pic: 'Hoàng', note: 'Tuning dời sang 5/11 gộp soundcheck. 7/11 diễn chung Bocelli, 8/11 show chính, về 9/11.', color: '#0ea5e9' },
    lines: [].concat(L('J12', 8), L('JSUB', 4), L('Q338', 1, { r: 1 }, MADI)) });
  apiSaveShow({ show: { city: 'Đà Nẵng', wh: WH.HN, name: 'ws Đà Nẵng', client: '', venue: 'Chốt sau khảo sát, Đà Nẵng', type: 'Workshop (ws)',
    out: '2026-11-17', day: '2026-11-18', back: '2026-11-19', status: 'Báo giá', pic: 'Hoàng', note: 'Ngày dự kiến 18/11 (tuần 16–22/11).', color: '#f97316' },
    lines: [].concat(L('Q225DS', 1, { r: 1 }, MADI)) });

  // ---- nhân sự (theo danh sách FSL), phân công, vận chuyển ----
  [['NV-001','Thiết','Kỹ thuật âm thanh',WH.HN,'PGĐ Kỹ thuật – Âm thanh'],['NV-002','Sơn','Kỹ thuật ánh sáng',WH.HN,'PGĐ Kỹ thuật – Ánh sáng'],
   ['NV-003','Minh','Kỹ thuật trưởng',WH.HN,'Kỹ thuật trưởng'],['NV-004','Hoàng','Kỹ thuật hệ thống',WH.HN,'Kỹ thuật hệ thống'],
   ['NV-005','Mạnh','Setup âm thanh ánh sáng',WH.HN,'Setup'],['NV-006','Hiếu','Setup âm thanh ánh sáng',WH.HN,'Setup']].forEach(function (x) {
    apiSaveStaff({ name: x[1], role: x[2], wh: x[3], note: x[4] });
  });
  apiSaveAssign({ show: 'SH-2610-001', staff: 'NV-005', date: '2026-10-09', from: '08:00', to: '18:00', task: 'Soundcheck / rehearsal', place: 'Nhà hát Hòa Bình' });
  apiSaveAssign({ show: 'SH-2610-002', staff: 'NV-005', date: '2026-10-11', from: '08:00', to: '18:00', task: 'Tuning & setup', place: 'Global City' });
  apiSaveAssign({ show: 'SH-2610-002', staff: 'NV-001', date: '2026-10-15', from: '16:00', to: '23:00', task: 'Mix chính (phần tối)', place: 'Global City' });
  apiSaveAssign({ show: 'SH-2610-004', staff: 'NV-002', date: '2026-10-19', from: '09:00', to: '18:00', task: 'Setup tại Bangkok', place: 'Centerpoint Studio 1, Bangkok' });
  apiSaveAssign({ show: 'SH-2611-002', staff: 'NV-003', date: '2026-11-03', from: '07:00', to: '17:00', task: 'Soạn hàng & xếp xe', place: 'Kho Hà Nội' });
  apiSaveAssign({ show: 'SH-2611-002', staff: 'NV-001', date: '2026-11-05', from: '08:00', to: '20:00', task: 'Tuning', place: 'Đà Lạt' });
  apiSaveTransport({ show: 'SH-2610-002', from: WH.HN, method: 'Xe tải', send: '2026-10-08', status: 'Đang vận chuyển', pieces: 40, note: 'Xe tải từ Hà Nội vào TP.HCM (3 ngày)' });
  apiSaveTransport({ show: 'SH-2611-002', from: WH.HCM, method: 'Xe tải', send: '2026-10-31', status: 'Chờ gửi', pieces: 30, note: 'Xe tải từ TP.HCM lên Đà Lạt' });
  apiSaveTransport({ show: 'SH-2610-004', from: WH.HN, method: 'Máy bay', send: '2026-10-18', status: 'Chờ gửi', pieces: 12, note: 'Bay VNA; chốt vé trước 20:00 ngày 17/10' });
  // ws Đà Nẵng: cố ý KHÔNG có vận chuyển để app cảnh báo

  sh_('TEST').getRange(2, 1, demoTest_().length, COLS.TEST.length).setValues(demoTest_());
  sh_('GUIDE').getRange(2, 1, demoGuide_().length, 2).setValues(demoGuide_());
  return true;
}

/** [Mã, Hãng, Dòng, Họ, Tên, Loại, Part No., Mô tả, kg, Giá/ngày, Cho thuê riêng, Tham số popup, Ảnh URL, Mã ảnh] */
function demoCatalog_() {
  var DB = 'd&b audiotechnik', DG = 'DiGiCo', GEN = 'Phụ kiện chung';
  var dg = 'https://digico.biz/wp-content/uploads/';
  return [
    // ---- d&b J-Series (brochure J-Series) ----
    ['J8', DB, 'J-Series', 'J-TOP', 'J8 loudspeaker', 'Loa line array', 'Z0650.002', 'Line array 3-way, phủ ngang 80°, 2×12" LF + 1×10" MF + 2×1.4" HF, NLT4 F/M. 48 Hz–17 kHz. Tối đa 4 loa/D80 (2-Way Active).', 60, 1200000, true, 'h=Số cụm treo=1', '', 'J8'],
    ['J12', DB, 'J-Series', 'J-TOP', 'J12 loudspeaker', 'Loa line array', 'Z0651.002', 'Như J8 nhưng phủ ngang 120°. Ghép chung cột với J8/J-SUB. Tối đa 4 loa/D80.', 60, 1200000, true, 'h=Số cụm treo=1', '', 'J8'],
    ['JSUB', DB, 'J-Series', 'J-SUB', 'J-SUB subwoofer', 'Subwoofer', 'Z0660.002', 'Sub cardioid 3×18" (2 trước, 1 sau), 32–100 Hz, NLT4 F. Treo được bằng J Flying frame (tối đa 14). Tối đa 2 loa/D80.', 106, 1000000, true, 'h=Số cụm treo=1', '', 'JSUB'],
    ['JINFRA', DB, 'J-Series', 'J-INFRA', 'J-INFRA subwoofer', 'Subwoofer', 'Z1000.002', 'Infra sub cardioid 3×21", 27–60 Hz, chỉ ground stack. Tối đa 2 loa/D80.', 152, 1300000, true, '', '', 'JINFRA'],
    ['Z5300', DB, 'J-Series', 'J-RIG', 'J Flying frame (kèm Z5303 J Safety chainset)', 'Khung treo', 'Z5300.000', 'Treo tối đa 24 loa J8/J12 hoặc 14 J-SUB. Kèm 2 J Load adapter, 2 J Front link, pinset.', '', 300000, false, '', '', 'Z5300'],
    ['Z5305', DB, 'J-Series', 'J-RIG', 'J Hoist connector chain', 'Phụ kiện treo', 'Z5305.000', 'Xích nối hoist cho J Flying frame.', '', 50000, false, '', '', 'Z5305'],
    ['E7441', DB, 'J-Series', 'J-RIG', 'Touring case 1× J Flying frame', 'Xe đẩy / Case', 'E7441.000', 'Case vận chuyển J Flying frame.', '', 0, false, '', '', 'E7441'],
    ['E7919', DB, 'J-Series', 'J-RIG', 'J Wheelboard', 'Xe đẩy / Case', 'E7919.000', 'Bánh xe/đế vận chuyển loa J (số loa/board là GIẢ ĐỊNH 3 – kiểm tra lại).', '', 0, false, '', '', ''],
    ['E7910', DB, 'J-Series', 'J-RIG', 'J-SUB Wooden lid', 'Xe đẩy / Case', 'E7910.000', 'Nắp gỗ bảo vệ J-SUB khi vận chuyển.', '', 0, false, '', '', ''],
    ['E7920', DB, 'J-Series', 'J-RIG', 'J-INFRA Wooden lid', 'Xe đẩy / Case', 'E7920.000', 'Nắp gỗ bảo vệ J-INFRA khi vận chuyển.', '', 0, false, '', '', ''],
    // ---- d&b SL-Series (brochure GSL) ----
    ['GSL8', DB, 'SL-Series', 'GSL', 'GSL8 loudspeaker', 'Loa line array', 'Z0750.000', '2-way active, 80°, 2×14" LF trước + 2×10" LF hông + 10" MF + 3×1.4" HF, NLT4 F, 45 Hz–18 kHz, 150 dB. Tối đa 2 loa/D80.', 80, 1800000, true, 'h=Số hang (cụm treo)=2', '', 'GSL8'],
    ['GSL12', DB, 'SL-Series', 'GSL', 'GSL12 loudspeaker', 'Loa line array', 'Z0751.000', 'Như GSL8 nhưng phủ ngang 120°, 149 dB. Tối đa 2 loa/D80.', 80, 1800000, true, 'h=Số hang (cụm treo)=2', '', 'GSL12'],
    ['SLSUB', DB, 'SL-Series', 'SL-SUB', 'SL-SUB subwoofer', 'Subwoofer', 'Z0760.000', 'Sub cardioid 3×21", 33–84 Hz, 144 dB, treo được tối đa 14 thùng. Tối đa 2 loa/D80.', 138, 1500000, true, 'h=Số cụm=2', '', 'SLSUB'],
    ['KSL8', DB, 'K-Series', 'KSL', 'KSL8 loudspeaker', 'Loa line array', 'Z0800.000', 'KSL8 – GIÁ & THÔNG SỐ GIẢ ĐỊNH, thay bằng dữ liệu thật', 0, 1000000, true, '', '', 'KSL8'],
    ['XSL8', DB, 'XSL-Series', 'XSL', 'XSL8 loudspeaker', 'Loa line array', 'Z0801.000', 'XSL8 – GIÁ & THÔNG SỐ GIẢ ĐỊNH, thay bằng dữ liệu thật', 0, 1100000, true, '', '', 'XSL8'],
    ['V8', DB, 'V-Series', 'V', 'V8 loudspeaker', 'Loa line array', 'Z0802.000', 'V8 – GIÁ & THÔNG SỐ GIẢ ĐỊNH, thay bằng dữ liệu thật', 0, 800000, true, '', '', 'V8'],
    ['SLGSUB', DB, 'SL-Series', 'SL-GSUB', 'SL-GSUB subwoofer (ground stack)', 'Subwoofer', 'Z0761.000', 'Bản ground stack của SL-SUB (không phụ kiện treo), 3×21", 33–84 Hz. Tối đa 2 loa/D80.', 132, 1400000, true, '', '', 'SLGSUB'],
    ['Z5708', DB, 'SL-Series', 'SL-RIG', 'GSL Flying frame set', 'Khung treo', 'Z5708.000', 'Gồm Z5701 GSL Flying frame + Z5702 Load beam + Z5705 Safety chain 4t + Z5761 ArraySight sender.', '', 400000, false, '', '', 'Z5708'],
    ['Z5704', DB, 'SL-Series', 'SL-RIG', 'GSL Compression set', 'Khung treo', 'Z5704.000', 'Z5703 Compression frame + lever hoist + master link + grab link + Z5709 chain 2.5t. Lực nén tối đa 1 t.', '', 300000, false, '', '', 'Z5704'],
    ['Z5706', DB, 'SL-Series', 'SL-RIG', 'Hoist connector chain 4t', 'Phụ kiện treo', 'Z5706.000', 'Xích nối hoist 4 tấn.', '', 50000, false, '', '', 'Z5706'],
    ['Z5707', DB, 'SL-Series', 'SL-RIG', 'SL Aiming plate', 'Phụ kiện treo', 'Z5707.000', 'Tấm chỉnh hướng (aiming) cho cụm treo.', '', 50000, false, '', '', 'Z5707'],
    ['Z5762', DB, 'SL-Series', 'SL-RIG', 'd&b ArraySight meter unit', 'Phụ kiện treo', 'Z5762.000', 'Bộ đo góc laser (đọc ArraySight sender trên frame).', '', 200000, false, '', '', 'Z5762'],
    ['E7490', DB, 'SL-Series', 'SL-RIG', 'Touring cart 4× GSL8/GSL12', 'Xe đẩy / Case', 'E7490.000', 'Xe đẩy 4 loa, treo thẳng từ xe (compression/tension).', '', 0, false, '', '', 'E7490L'],
    ['E7491', DB, 'SL-Series', 'SL-RIG', 'Touring cart cover GSL8/12', 'Xe đẩy / Case', 'E7491.000', 'Áo trùm cho xe 4 loa GSL.', '', 0, false, '', '', 'E7490L'],
    ['E7492', DB, 'SL-Series', 'SL-RIG', 'Touring cart SL-SUB / SL-GSUB', 'Xe đẩy / Case', 'E7492.000', 'Xe đẩy 3 sub SL-SUB/SL-GSUB, xếp chồng được.', '', 0, false, '', '', 'E7492L'],
    ['E7493', DB, 'SL-Series', 'SL-RIG', 'Touring cart cover 3× SL-SUB', 'Xe đẩy / Case', 'E7493.000', 'Áo trùm cho xe 3 sub.', '', 0, false, '', '', 'E7492L'],
    ['E7499', DB, 'SL-Series', 'SL-RIG', 'SL-SUB/SL-GSUB Wooden lid', 'Xe đẩy / Case', 'E7499.000', 'Nắp gỗ cho chồng sub.', '', 0, false, '', '', 'E7492L'],
    ['E7494', DB, 'SL-Series', 'SL-RIG', 'SL Outriggers (bộ)', 'Phụ kiện treo', 'E7494.000', 'Chân chống khi ground stack GSL trên xe E7490.', '', 100000, false, '', '', 'E7494'],
    ['E7497', DB, 'SL-Series', 'SL-RIG', 'Touring case GSL compression', 'Xe đẩy / Case', 'E7497.000', 'Case đựng bộ compression.', '', 0, false, '', '', 'E7497'],
    // ---- Ampli d&b (dùng chung J & SL) ----
    ['RK6', DB, 'Amplification', 'RK-D80', '6× D80 Touring rack (có DS10)', 'Rack ampli', 'Z5576.xxx', 'Rack 6 D80 + DS10, out 2× LKA25F (12 kênh) + 6× NL8, PoE cho ArraySight, nguồn CEE 32 A.', '', 2400000, true, '', '', 'RK6'],
    ['RK3', DB, 'Amplification', 'RK-D80', '3× D80 Touring rack (có DS10)', 'Rack ampli', 'Z5571.xxx', 'Rack 3 D80 + DS10, out 1× LKA25F (12 kênh) + 3× NL8.', '', 1300000, true, '', '', 'RK3'],
    ['RK1', DB, 'Amplification', 'RK-D80', 'D80 Touring rack 2 RU (1× D80)', 'Rack ampli', 'E7468.000', 'Rack lẻ 2RU shock-mount cho 1 D80. Out NL4/EP5 + NL8.', '', 500000, true, '', '', 'D80'],
    ['D80', DB, 'Amplification', 'D80', 'D80 amplifier', 'Ampli', 'Z2710.xxx', '4 kênh, 4×4000 W @ 4 Ω, DSP, latency 0.3 ms, out NL4/EP5 + NL8. (Nằm trong rack)', 19, 0, false, '', '', 'D80'],
    ['DS10', DB, 'Amplification', 'DS10', 'DS10 Audio network bridge', 'Network bridge', 'Z4010.000', 'Dante ↔ AES3, 16 kênh, switch 5 cổng. (Nằm trong rack)', '', 0, false, '', '', 'DS10'],
    // ---- Cáp loa d&b ----
    ['Z5328', DB, 'Cáp & adapter', 'CAB', 'MC24 LKA25 F/M Multicore (25 m – giả định)', 'Cáp loa', 'Z5328.xxx', '12 kênh loa. Độ dài .xxx là giả định.', '', 150000, false, '', '', 'MC24'],
    ['Z5325', DB, 'Cáp & adapter', 'CAB', 'Adapter LKA25M → 6× NLT4M', 'Adapter / Breakout', 'Z5325.000', 'Tách multicore 12 kênh ra 6 đường NLT4.', '', 50000, false, '', '', 'Z5325'],
    ['Z5343', DB, 'Cáp & adapter', 'CAB', 'MC8 Cable NLT8 F/M (20 m – giả định)', 'Cáp loa', 'Z5343.xxx', '4 kênh (1 D80).', '', 80000, false, '', '', 'MC8'],
    ['Z5340', DB, 'Cáp & adapter', 'CAB', 'MC4 Cable NLT4 F/M (10 m – giả định)', 'Cáp loa', 'Z5340.xxx', '2 kênh, cấp/link từng loa.', '', 30000, false, '', '', 'MC4'],
    ['Z5348', DB, 'Cáp & adapter', 'CAB', 'Adapter NLT8F → 2× NLT4M', 'Adapter / Breakout', 'Z5348.002', 'Tách 1 đường NL8 thành 2 đường NLT4.', '', 30000, false, '', '', 'Z5348'],
    ['Z5347', DB, 'Cáp & adapter', 'CAB', 'Breakoutbox NLT8 F/M → 6× NL4', 'Adapter / Breakout', 'Z5347.001', 'Hộp chia NLT8 ra 6× NL4.', '', 50000, false, '', '', 'Z5347'],
    // ---- DiGiCo ----
    ['Q338', DG, 'Quantum', 'Q338', 'Quantum 338', 'Mixer', 'X-Q338', '128 kênh vào / 64 bus, 3 màn 17", local 8×8 32-bit + 8 AES, 3 MADI redundant, 2 khe DMI, Optocore dual loop (tùy chọn). 70 kg (198 kg kèm case).', 70, 9000000, true, 'r=Số SD-Rack=2', '', 'Q338'],
    ['Q338P', DG, 'Quantum', 'Q338', 'Quantum 338 Pulse', 'Mixer', 'X-Q338 + Pulse', 'Q338 + gói phần mềm Pulse: 156 kênh / 72 bus, Mustard 48, Nodal 72, Mix Minus.', 70, 10000000, true, 'r=Số SD-Rack=2', dg + '2024/03/Q338-Pulse-Angle-for-Web1-1200x750.jpg', 'Q338'],
    ['Q225', DG, 'Quantum', 'Q225', 'Quantum 225', 'Mixer', 'X-Q225', '72 kênh / 36 bus, local 8×8 + 2 AES, 4 MADI, 2 khe DMI, Optocore single/dual loop (tùy chọn). 43 kg.', 43, 6000000, true, 'r=Số SD-Rack=1', dg + '2021/01/Q225-1-scaled-1-600x375.jpg', ''],
    ['Q225P', DG, 'Quantum', 'Q225', 'Quantum 225 Pulse', 'Mixer', 'X-Q225 + Pulse', 'Q225 + Pulse: 96 kênh / 48 bus, Mustard 36, Nodal 48, Mix Minus.', 43, 6500000, true, 'r=Số SD-Rack=1', dg + '2021/01/Q225-1-scaled-1-600x375.jpg', ''],
    ['Q225DS', DG, 'Quantum', 'Q225', 'Quantum 225 DS', 'Mixer', 'X-Q225-DS', 'Q225 bản 2 màn hình 17" cảm ứng (ra mắt 03/2026). 72 kênh / 36 bus, 4 MADI, 2 DMI.', 45, 7000000, true, 'r=Số SD-Rack=1', dg + '2026/03/Q225DSPulse_Front-1200x750.jpg', ''],
    ['Q225DSP', DG, 'Quantum', 'Q225', 'Quantum 225 DS Pulse', 'Mixer', 'X-Q225-DS + Pulse', 'Q225 DS + Pulse: 96 kênh / 48 bus.', 45, 7500000, true, 'r=Số SD-Rack=1', dg + '2026/03/Q225DSPulse_Front-1200x750.jpg', ''],
    ['SDR-OP', DG, 'SD-Rack', 'SD-RACK', 'SD-Rack (Optics – Optocore)', 'Stage rack', 'X-SD-RACK-OP', '14 khe card, tối đa 56 in / 56 out, 2 MADI + cổng quang Optocore.', '', 2500000, true, '', '', 'SDRACK'],
    ['SDR-MADI', DG, 'SD-Rack', 'SD-RACK', 'SD-Rack (MADI, không optics)', 'Stage rack', 'X-SD-RACK', '14 khe card, tối đa 56 in / 56 out, kết nối MADI BNC.', '', 2000000, true, '', '', 'SDRACK'],
    ['DMI-DANTE', DG, 'Card I/O', 'DMI', 'DMI-DANTE64@96', 'Card I/O', 'X-DMI-DANTE64@96', '64×64 kênh @ 48/96 kHz, cổng Gigabit Primary + Secondary. Lắp khe DMI của Quantum.', '', 600000, true, '', '', 'DMIDANTE'],
    ['SDR-DANTE', DG, 'Card I/O', 'SDCARD', 'SD-Rack Dante I/O card', 'Card I/O', 'X-SD-DANTE', 'Card Dante lắp trong SD-Rack.', '', 400000, true, '', '', 'SDRCARD'],
    // ---- Shure Axient Digital (micro không dây) – linh kiện giả định, kiểm tra mã theo bảng hàng ----
    ['AD4Q', 'Shure', 'Axient Digital', 'AD4Q', 'AD4Q quad receiver (40 kênh)', 'Bộ thu không dây', 'AD4Q', 'Bộ thu 4 kênh, dải tần 40 kênh (giả định 40 kênh/dải). Dùng với anten và AXT600 quản lý phổ.', 2.4, 900000, true, '', '', 'AD4Q'],
    ['AD2', 'Shure', 'Axient Digital', 'AD2', 'AD2 handheld transmitter', 'Micro không dây', 'AD2/SM58 (giả định)', 'Micro cầm tay Axient Digital, 40 kênh. Pin SB900B.', 0.3, 300000, true, '', '', 'AD2'],
    ['AD1', 'Shure', 'Axient Digital', 'AD1', 'AD1 bodypack transmitter', 'Micro không dây', 'AD1 (giả định)', 'Bodypack Axient Digital, 40 kênh. Pin SB900B.', 0.2, 300000, true, '', '', 'AD1'],
    ['SB900B', 'Shure', 'Axient Digital', 'SB900B', 'SB900B rechargeable battery', 'Phụ kiện micro', 'SB900B', 'Pin sạc Li-ion cho AD2/AD1.', 0.1, 0, false, '', '', 'SB900B'],
    ['SBC240', 'Shure', 'Axient Digital', 'SBC240', 'SBC240 charger (4 khe)', 'Phụ kiện micro', 'SBC240', 'Bộ sạc 4 khe cho SB900B.', 1.2, 50000, false, '', '', 'SBC240'],
    ['UA874', 'Shure', 'Axient Digital', 'UA874', 'UA874 antenna distribution (kiểm tra mã)', 'Phụ kiện micro', 'UA874 (kiểm tra)', 'Phân phối anten cho bộ thu Axient Digital (mã cần kiểm tra theo bảng hàng).', 0.8, 100000, false, '', '', 'UA874'],
    ['AD610', 'Shure', 'Axient Digital', 'AD610', 'AD610 ShowLink wireless control', 'Phụ kiện micro', 'AD610', 'Điều khiển không dây ShowLink, đồng bộ cài đặt bộ thu.', 0.5, 150000, true, '', '', 'AD610'],
    ['AXT600', 'Shure', 'Axient Digital', 'AXT600', 'AXT600 spectrum manager', 'Quản lý tần số RF', 'AXT600', 'Phần mềm/thiết bị quản lý phổ tần, chọn kênh tránh nhiễu.', 2, 500000, true, '', '', 'AXT600'],
    // ---- Shure PSM (in-ear) ----
    ['ADTQ', 'Shure', 'Axient Digital PSM', 'ADTQ', 'ADTQ PSM transmitter (40 kênh)', 'Bộ phát IEM', 'ADTQ', 'Bộ phát IEM Axient Digital PSM, 40 kênh.', 4, 800000, true, '', '', 'ADTQ'],
    ['P10R+', 'Shure', 'PSM', 'P10R+', 'P10R+ bodypack receiver', 'Bộ thu IEM', 'P10R+', 'Bộ thu in-ear bodypack P10R+.', 0.2, 150000, true, '', '', 'P10R+'],
    ['AD8C', 'Shure', 'Axient Digital PSM', 'AD8C', 'AD8C combiner', 'Phụ kiện IEM', 'AD8C', 'Bộ gộp tín hiệu PSM (giả định mã AD8C).', 3, 200000, true, '', '', 'AD8C'],
    ['SE846', 'Shure', 'PSM', 'SE846', 'SE846 earphones', 'Tai nghe IEM', 'SE846', 'Tai nghe in-ear 4 driver.', 0.1, 100000, true, '', '', 'SE846'],
    ['SE535', 'Shure', 'PSM', 'SE535', 'SE535 earphones', 'Tai nghe IEM', 'SE535', 'Tai nghe in-ear 3 driver.', 0.1, 80000, true, '', '', 'SE535'],
    ['SE425', 'Shure', 'PSM', 'SE425', 'SE425 earphones', 'Tai nghe IEM', 'SE425', 'Tai nghe in-ear 2 driver.', 0.1, 60000, true, '', '', 'SE425'],
    // ---- RF Venue (quản lý sóng / anten) ----
    ['RFV-DIV', 'RF Venue', 'RF Venue', 'RFV', 'Diversity Fin antenna', 'Anten RF', 'Diversity Fin', 'Anten diversity cho khu vực micro không dây.', 0.5, 150000, true, '', '', 'RFV'],
    ['RFV-CPB', 'RF Venue', 'RF Venue', 'RFV', 'CP Beam directional antenna', 'Anten RF', 'CP Beam', 'Anten định hướng CP Beam.', 1, 200000, true, '', '', 'RFV'],
    ['RFV-D4', 'RF Venue', 'RF Venue', 'RFV', 'Distro4 antenna distribution', 'Quản lý tần số RF', 'Distro4', 'Phân phối tín hiệu anten 4 đường.', 2, 300000, true, '', '', 'RFV'],
    ['RFV-D9', 'RF Venue', 'RF Venue', 'RFV', 'Distro9 antenna distribution', 'Quản lý tần số RF', 'Distro9', 'Phân phối tín hiệu anten 9 đường.', 3, 400000, true, '', '', 'RFV'],
    ['RFV-C4', 'RF Venue', 'RF Venue', 'RFV', 'Combine4 combiner', 'Quản lý tần số RF', 'Combine4', 'Bộ gộp 4 kênh RF.', 2, 300000, true, '', '', 'RFV'],
    ['RFV-C8', 'RF Venue', 'RF Venue', 'RFV', 'Combine8 combiner', 'Quản lý tần số RF', 'Combine8', 'Bộ gộp 8 kênh RF.', 3, 400000, true, '', '', 'RFV'],
    ['RFV-SPOT', 'RF Venue', 'RF Venue', 'RFV', 'RF Spotlight', 'Quản lý tần số RF', 'RF Spotlight', 'Thiết bị quét/quản lý phổ RF Spotlight.', 2, 500000, true, '', '', 'RFV'],
    // ---- phụ kiện tín hiệu chung ----
    ['FIB-100', GEN, 'Cáp tín hiệu', 'SIG', 'Cáp quang tactical 100 m (Optocore loop)', 'Cáp tín hiệu', '—', 'Cáp quang cho vòng Optocore. Kiểm tra loại đầu nối theo máy thực tế.', '', 300000, false, '', '', ''],
    ['BNC-100', GEN, 'Cáp tín hiệu', 'SIG', 'Cáp MADI coax BNC 100 m (cặp in/out)', 'Cáp tín hiệu', '—', 'Kết nối MADI console ↔ SD-Rack.', '', 150000, false, '', '', ''],
    ['CAT6-50', GEN, 'Cáp tín hiệu', 'SIG', 'Cáp CAT6 etherCON 50 m (Dante)', 'Cáp tín hiệu', '—', 'Dante primary/secondary: console ↔ DS10 trong rack D80.', '', 50000, false, '', '', '']
  ];
}

/** [Model/Họ chính, Nhóm, Câu hỏi, Lựa chọn, Mặc định, Model kèm, Công thức SL, Yêu cầu cấu hình, Ghi chú] */
function demoRules_() {
  var R = [];
  var add = function (key, g, q, opt, def, comps, req, note) {
    if (!comps.length) { R.push([key, g, q, opt, def, '', '', req || '', note || '']); return; }
    comps.forEach(function (c, i) { R.push([key, g, q, opt, def, c[0], c[1], i === 0 ? (req || '') : '', c[2] || (i === 0 ? note || '' : '')]); });
  };
  // ---------- J8 / J12 ----------
  var qA = 'Loa này đi với ampli nào?';
  add('J-TOP', 'Ampli', qA, 'D80 – rack 3×D80 (12 loa/rack, 4 loa/D80)', true, [['RK3', 'CEIL(n/12)', 'J8/J12 tối đa 4 loa/D80 (2-Way Active)']]);
  add('J-TOP', 'Ampli', qA, 'D80 – rack 6×D80 (24 loa/rack)', false, [['RK6', 'CEIL(n/24)']]);
  add('J-TOP', 'Ampli', qA, 'D80 lẻ – rack 2RU (4 loa/D80)', false, [['RK1', 'CEIL(n/4)']]);
  add('J-TOP', 'Ampli', qA, 'Dùng chung ampli đã có (không thêm)', false, []);
  var qL = 'Treo hay đặt? Dùng giá treo nào?';
  add('J-TOP', 'Lắp đặt', qL, 'Đặt sàn / mép sân khấu (frontfill)', true, []);
  add('J-TOP', 'Lắp đặt', qL, 'Treo – J Flying frame', false, [['Z5300', 'h', '1 frame/cụm (đã kèm Z5303 Safety chainset)'], ['Z5305', '2*h', '2 xích hoist/frame'], ['E7441', 'h', 'Case cho frame']]);
  add('J-TOP', 'Lắp đặt', qL, 'Ground stack trên J-SUB (J Flying frame làm đế)', false, [['Z5300', 'h']]);
  var qC = 'Dây loa gì?';
  add('J-TOP', 'Cáp loa', qC, 'MC8 NLT8 + adapter NLT8F→2×NLT4M + MC4 tới từng loa', true, [['Z5343', 'CEIL(n/4)', '1 đường NL8 = 4 kênh = 1 D80'], ['Z5348', 'CEIL(n/4)'], ['Z5340', 'n']]);
  add('J-TOP', 'Cáp loa', qC, 'MC24 LKA25 + adapter LKA25M→6×NLT4M (12 loa/bộ)', false, [['Z5328', 'CEIL(n/12)'], ['Z5325', 'CEIL(n/12)'], ['Z5340', 'CEIL(n/2)', 'MC4 link sang loa thứ 2']]);
  add('J-TOP', 'Cáp loa', qC, 'MC4 NLT4 riêng từng loa', false, [['Z5340', 'n']]);
  var qV = 'Vận chuyển bằng gì?';
  add('J-TOP', 'Vận chuyển', qV, 'J Wheelboard (giả định 3 loa/board)', true, [['E7919', 'CEIL(n/3)']]);
  add('J-TOP', 'Vận chuyển', qV, 'Không cần', false, []);
  // ---------- J-SUB ----------
  add('J-SUB', 'Ampli', qA, 'D80 – rack 3×D80 (6 sub/rack, 2 sub/D80)', true, [['RK3', 'CEIL(n/6)', 'J-SUB tối đa 2 loa/D80']]);
  add('J-SUB', 'Ampli', qA, 'D80 – rack 6×D80 (12 sub/rack)', false, [['RK6', 'CEIL(n/12)']]);
  add('J-SUB', 'Ampli', qA, 'D80 lẻ – rack 2RU (2 sub/D80)', false, [['RK1', 'CEIL(n/2)']]);
  add('J-SUB', 'Ampli', qA, 'Dùng chung ampli đã có (không thêm)', false, []);
  add('J-SUB', 'Lắp đặt', qL, 'Ground stack', true, []);
  add('J-SUB', 'Lắp đặt', qL, 'Treo – J Flying frame (tối đa 14 sub)', false, [['Z5300', 'h'], ['Z5305', 'h'], ['E7441', 'h']]);
  add('J-SUB', 'Cáp loa', qC, 'MC24 LKA25 + adapter LKA25M→6×NLT4M (6 sub/bộ)', true, [['Z5328', 'CEIL(n/6)'], ['Z5325', 'CEIL(n/6)']]);
  add('J-SUB', 'Cáp loa', qC, 'MC8 NLT8 + adapter NLT8F→2×NLT4M (2 sub/bộ)', false, [['Z5343', 'CEIL(n/2)'], ['Z5348', 'CEIL(n/2)']]);
  add('J-SUB', 'Cáp loa', qC, 'MC4 NLT4 riêng từng sub', false, [['Z5340', 'n']]);
  add('J-SUB', 'Vận chuyển', qV, 'Nắp gỗ J-SUB (1 nắp/sub – giả định)', true, [['E7910', 'n']]);
  add('J-SUB', 'Vận chuyển', qV, 'Không cần', false, []);
  // ---------- J-INFRA (chỉ ground stack) ----------
  add('J-INFRA', 'Ampli', qA, 'D80 – rack 3×D80 (6 sub/rack, 2 sub/D80)', true, [['RK3', 'CEIL(n/6)', 'J-INFRA tối đa 2 loa/D80']]);
  add('J-INFRA', 'Ampli', qA, 'D80 – rack 6×D80 (12 sub/rack)', false, [['RK6', 'CEIL(n/12)']]);
  add('J-INFRA', 'Ampli', qA, 'Dùng chung ampli đã có (không thêm)', false, []);
  add('J-INFRA', 'Cáp loa', qC, 'MC24 LKA25 + adapter LKA25M→6×NLT4M (6 sub/bộ)', true, [['Z5328', 'CEIL(n/6)'], ['Z5325', 'CEIL(n/6)']]);
  add('J-INFRA', 'Cáp loa', qC, 'MC4 NLT4 riêng từng sub', false, [['Z5340', 'n']]);
  add('J-INFRA', 'Vận chuyển', qV, 'Nắp gỗ J-INFRA (1 nắp/sub – giả định)', true, [['E7920', 'n']]);
  add('J-INFRA', 'Vận chuyển', qV, 'Không cần', false, []);
  // ---------- GSL8 / GSL12 ----------
  add('GSL', 'Ampli', qA, 'D80 – rack 6×D80 (12 loa/rack, 2 loa/D80)', true, [['RK6', 'CEIL(n/12)', 'GSL tối đa 2 loa/D80']]);
  add('GSL', 'Ampli', qA, 'D80 – rack 3×D80 (6 loa/rack)', false, [['RK3', 'CEIL(n/6)']]);
  add('GSL', 'Ampli', qA, 'Dùng chung ampli đã có (không thêm)', false, []);
  var qK = 'Treo kiểu gì? Khung treo nào?';
  add('GSL', 'Khung treo', qK, 'Treo Compression mode (GSL Flying frame set + Compression set)', true, [['Z5708', 'h', '1 bộ/hang'], ['Z5704', 'h'], ['Z5706', 'h'], ['E7497', 'h'], ['Z5762', '1', '1 máy đo ArraySight/hệ']]);
  add('GSL', 'Khung treo', qK, 'Treo Tension mode (GSL Flying frame set)', false, [['Z5708', 'h'], ['Z5706', 'h'], ['Z5762', '1']]);
  add('GSL', 'Khung treo', qK, 'Ground stack trên Touring cart + SL Outriggers', false, [['E7494', 'h']]);
  add('GSL', 'Cáp loa', qC, 'MC24 LKA25 + adapter LKA25M→6×NLT4M (6 loa/bộ)', true, [['Z5328', 'h*CEIL(n/h/6)', 'Tính theo từng hang'], ['Z5325', 'h*CEIL(n/h/6)']]);
  add('GSL', 'Cáp loa', qC, 'MC8 NLT8 + adapter NLT8F→2×NLT4M (2 loa/bộ)', false, [['Z5343', 'CEIL(n/2)'], ['Z5348', 'CEIL(n/2)']]);
  add('GSL', 'Vận chuyển', qV, 'Touring cart E7490 + áo trùm (4 loa/xe)', true, [['E7490', 'h*CEIL(n/h/4)'], ['E7491', 'h*CEIL(n/h/4)']]);
  add('GSL', 'Vận chuyển', qV, 'Không cần', false, []);
  // ---------- SL-SUB ----------
  add('SL-SUB', 'Ampli', qA, 'D80 – rack 6×D80 (12 sub/rack, 2 sub/D80)', true, [['RK6', 'CEIL(n/12)', 'SL-SUB tối đa 2 loa/D80']]);
  add('SL-SUB', 'Ampli', qA, 'D80 – rack 3×D80 (6 sub/rack)', false, [['RK3', 'CEIL(n/6)']]);
  add('SL-SUB', 'Ampli', qA, 'Dùng chung ampli đã có (không thêm)', false, []);
  add('SL-SUB', 'Lắp đặt', qL, 'Ground stack', true, []);
  add('SL-SUB', 'Lắp đặt', qL, 'Treo – GSL Flying frame set (tối đa 14 sub)', false, [['Z5708', 'h'], ['Z5706', 'h']]);
  add('SL-SUB', 'Cáp loa', qC, 'MC24 LKA25 + adapter LKA25M→6×NLT4M (6 sub/bộ)', true, [['Z5328', 'CEIL(n/6)'], ['Z5325', 'CEIL(n/6)']]);
  add('SL-SUB', 'Cáp loa', qC, 'MC8 NLT8 + adapter NLT8F→2×NLT4M (2 sub/bộ)', false, [['Z5343', 'CEIL(n/2)'], ['Z5348', 'CEIL(n/2)']]);
  add('SL-SUB', 'Vận chuyển', qV, 'Touring cart E7492 + áo trùm + nắp gỗ (3 sub/xe)', true, [['E7492', 'CEIL(n/3)'], ['E7493', 'CEIL(n/3)'], ['E7499', 'CEIL(n/3)']]);
  add('SL-SUB', 'Vận chuyển', qV, 'Không cần', false, []);
  // ---------- SL-GSUB (chỉ ground stack) ----------
  add('SL-GSUB', 'Ampli', qA, 'D80 – rack 6×D80 (12 sub/rack, 2 sub/D80)', true, [['RK6', 'CEIL(n/12)', 'SL-GSUB tối đa 2 loa/D80']]);
  add('SL-GSUB', 'Ampli', qA, 'D80 – rack 3×D80 (6 sub/rack)', false, [['RK3', 'CEIL(n/6)']]);
  add('SL-GSUB', 'Ampli', qA, 'Dùng chung ampli đã có (không thêm)', false, []);
  add('SL-GSUB', 'Cáp loa', qC, 'MC24 LKA25 + adapter LKA25M→6×NLT4M (6 sub/bộ)', true, [['Z5328', 'CEIL(n/6)'], ['Z5325', 'CEIL(n/6)']]);
  add('SL-GSUB', 'Cáp loa', qC, 'MC8 NLT8 + adapter NLT8F→2×NLT4M (2 sub/bộ)', false, [['Z5343', 'CEIL(n/2)'], ['Z5348', 'CEIL(n/2)']]);
  add('SL-GSUB', 'Vận chuyển', qV, 'Touring cart E7492 + áo trùm + nắp gỗ (3 sub/xe)', true, [['E7492', 'CEIL(n/3)'], ['E7493', 'CEIL(n/3)'], ['E7499', 'CEIL(n/3)']]);
  add('SL-GSUB', 'Vận chuyển', qV, 'Không cần', false, []);
  // ---------- DiGiCo Quantum 338 / 225 ----------
  ['Q338', 'Q225'].forEach(function (k) {
    var qS = 'Console đi kèm OptoCore hay MADI? Mấy SD-Rack?';
    add(k, 'Kết nối stage', qS, 'OptoCore loop – SD-Rack bản Optics', true, [['SDR-OP', 'r', 'Console phải có Optics'], ['FIB-100', 'r+1', 'Vòng loop kín: console → rack… → console']], 'Optics', k === 'Q338' ? 'Q338: tối đa 22 rack (36 trên 2 loop)' : 'Q225: tối đa 14 rack/loop');
    add(k, 'Kết nối stage', qS, 'MADI BNC redundant – SD-Rack bản MADI', false, [['SDR-MADI', 'r'], ['BNC-100', '2*r', '2 cặp/rack (chính + dự phòng)']]);
    add(k, 'Kết nối stage', qS, 'Không thuê stage rack', false, []);
    var qD = 'Có card Dante trên console không?';
    add(k, 'Card Dante (DMI)', qD, '1× DMI-DANTE64@96 (cấp Dante tới DS10 trong rack D80)', true, [['DMI-DANTE', 'n'], ['CAT6-50', '2*n', 'Primary + Secondary']]);
    add(k, 'Card Dante (DMI)', qD, '2× DMI-DANTE64@96 (dùng cả 2 khe DMI)', false, [['DMI-DANTE', '2*n'], ['CAT6-50', '4*n']]);
    add(k, 'Card Dante (DMI)', qD, 'Không dùng card Dante', false, []);
    var qR = 'SD-Rack có cần card Dante không?';
    add(k, 'Card Dante SD-Rack', qR, 'Không', true, []);
    add(k, 'Card Dante SD-Rack', qR, '1 card Dante I/O mỗi SD-Rack', false, [['SDR-DANTE', 'r']]);
  });
  add('SD-RACK', 'Card Dante SD-Rack', 'SD-Rack có cần card Dante không?', 'Không', true, []);
  add('SD-RACK', 'Card Dante SD-Rack', 'SD-Rack có cần card Dante không?', '1 card Dante I/O mỗi SD-Rack', false, [['SDR-DANTE', 'n']]);
  // ---------- Shure Axient Digital (micro không dây) ----------
  var qAn = 'Anten cho bộ thu?';
  add('AD4Q', 'Anten', qAn, 'Diversity Fin RF Venue (2 anten/bộ thu)', true, [['RFV-DIV', '2*n', 'Mỗi bộ thu 2 anten diversity']]);
  add('AD4Q', 'Anten', qAn, 'Phân phối UA874 (CEIL n/2)', false, [['UA874', 'CEIL(n/2)', 'Mã UA874 cần kiểm tra']]);
  add('AD4Q', 'Quản lý sóng', 'Có dùng AXT600 quản lý phổ không?', 'Có – AXT600 (1 bộ/show)', true, [['AXT600', '1']]);
  add('AD4Q', 'Quản lý sóng', 'Có dùng AXT600 quản lý phổ không?', 'Không', false, []);
  var qPin = 'Pin và sạc dùng loại nào?';
  ['AD2', 'AD1'].forEach(function (m) {
    add(m, 'Pin & sạc', qPin, 'SB900B + SBC240 (2 pin/máy, 1 khe sạc/4 pin)', true, [['SB900B', '2*n', 'Mỗi máy 2 pin'], ['SBC240', 'CEIL(n/2)', '4 khe/bộ sạc']]);
    add(m, 'Pin & sạc', qPin, 'Khách tự có pin', false, []);
  });
  var qIem = 'Tai nghe IEM dùng loại nào? (1 tai cho mỗi máy thu)';
  add('ADTQ', 'Tai nghe IEM', qIem, 'SE846 (4 máy thu/bộ phát)', true, [['P10R+', '4*n', '4 máy thu cho mỗi ADTQ (giả định)'], ['SE846', '4*n'], ['AD8C', 'CEIL(n/2)', 'Gộp 2 bộ phát/AD8C']]);
  add('ADTQ', 'Tai nghe IEM', qIem, 'SE535 (4 máy thu/bộ phát)', false, [['P10R+', '4*n'], ['SE535', '4*n'], ['AD8C', 'CEIL(n/2)']]);
  add('ADTQ', 'Tai nghe IEM', qIem, 'Khách tự có tai', false, [['P10R+', '4*n']]);
  return R;
}

/** Sinh danh sách thiết bị có mã (giả định tồn kho của công ty cho thuê) */
function demoAssets_(cat) {
  var stock = {
    J8: 24, J12: 12, JSUB: 12, JINFRA: 4, Z5300: 4, Z5305: 8, E7441: 4, E7919: 8, E7910: 12, E7920: 4,
    GSL8: 72, GSL12: 8, SLSUB: 58, SLGSUB: 28, KSL8: 72, XSL8: 24, V8: 30, Z5708: 4, Z5704: 4, Z5706: 6, Z5707: 2, Z5762: 2,
    E7490: 10, E7491: 10, E7492: 14, E7493: 14, E7499: 14, E7494: 4, E7497: 4,
    RK6: 5, RK3: 2, RK1: 4,
    Z5328: 16, Z5325: 16, Z5343: 16, Z5340: 60, Z5348: 16, Z5347: 4,
    Q338: 1, Q338P: 1, Q225: 3, Q225P: 1, Q225DS: 1, Q225DSP: 1, 'SDR-OP': 4, 'SDR-MADI': 2, 'DMI-DANTE': 4, 'SDR-DANTE': 2,
    'FIB-100': 6, 'BNC-100': 6, 'CAT6-50': 8,
    AD4Q: 10, AD2: 20, AD1: 20, SB900B: 40, SBC240: 10, UA874: 4, AD610: 2, AXT600: 2,
    ADTQ: 10, 'P10R+': 40, AD8C: 2, SE846: 20, SE535: 20, SE425: 10,
    'RFV-DIV': 8, 'RFV-CPB': 8, 'RFV-D4': 2, 'RFV-D9': 1, 'RFV-C4': 2, 'RFV-C8': 1, 'RFV-SPOT': 1
  };
  var cfgMap = { Q338: 'Optics dual loop', Q338P: 'Optics dual loop', Q225: 'MADI only (không optics)', Q225P: 'Optics single loop', Q225DS: 'Optics single loop', Q225DSP: 'Optics dual loop', 'SDR-OP': 'Optics, 56 in/56 out', 'SDR-MADI': 'MADI BNC, 56 in/56 out', RK6: 'CEE 32A, DS10', RK3: 'CEE 32A, DS10' };
  var info = {}; cat.forEach(function (c) { info[c[0]] = c; });
  var curLoc = WH.HN, out = [], maint = [], d80 = 0, ds10 = 0, seq = 0;
  /** Số lượng theo kho (theo yêu cầu FSL). Model không có ở đây: chia ~80% HN / 20% HCM */
  var locSpec = { GSL8: { HN: 56, HCM: 16 }, GSL12: { HN: 8 }, SLSUB: { HN: 50, HCM: 8 }, KSL8: { HN: 72 }, XSL8: { HN: 24 }, V8: { HN: 30 } };
  var locOf = function (m, i) { var sp = locSpec[m]; return sp ? (i <= (sp.HN || 0) ? WH.HN : WH.HCM) : null; };
  var pad = function (n, w) { return ('000' + n).slice(-(w || 3)); };
  var TT = TT_MUA, DATE = function (y, m, d) { return new Date(y, m, d, 9, 0, 0); };
  /** Giả định tình trạng thiết bị: 80% mới, 10% like-new, 10% mua cũ (trong đó 50/30/20) – chia đều theo số thứ tự, không ngẫu nhiên */
  var condOf = function (k, tag) {
    var h = (k * 7919) % 100, u = (k * 53) % 10;
    var my = 2022 + (k % 4), mfg = DATE(my, (k * 5) % 12, 1 + (k % 27));
    var bought = DATE(my, (k * 5) % 12 + 2 + (k % 5), 1 + (k % 25));
    var lastOut = DATE(2026, 8, 1 + (k % 28)), lastIn = DATE(2026, 8, 4 + (k % 28));
    var r = { mfg: mfg, bought: bought, buyCond: TT.MOI, buyPct: 100, cond: HT.OK, noBig: false, lastOut: lastOut, lastIn: lastIn, maint: null };
    if (h >= 80 && h < 90) { r.buyCond = TT.LIKE; r.buyPct = 95; }
    else if (h >= 90) {
      if (u < 5) { r.buyCond = TT.CU_NGUYEN; r.buyPct = 80; r.maint = { type: 'Kiểm tra', desc: 'Kiểm tra khi nhập kho, chưa qua sửa chữa', vendor: 'Kỹ thuật nội bộ', after: HT.OK, cost: 0 }; }
      else if (u < 8) { r.buyCond = TT.CU_CHINH_HANG; r.buyPct = 60; r.cond = HT.BH; r.maint = { type: 'Bảo hành', desc: 'Sửa chữa chính hãng trước khi bán lại', vendor: 'Đại lý chính hãng', after: HT.BH, cost: 0 }; }
      else { r.buyCond = TT.CU_TU_SUA; r.buyPct = 40; r.cond = HT.SUA; r.noBig = true; r.maint = { type: 'Sửa chữa', desc: 'Tự sửa (thay màng/driver), không qua hãng', vendor: 'Kỹ thuật nội bộ', after: HT.SUA, cost: 1500000 }; }
    }
    if (tag === 'GSL8-028') { r.cond = HT.CSUA; r.maint = { type: 'Sự cố', desc: 'Màng HF hỏng sau show', vendor: 'Chờ linh kiện', after: HT.CSUA, cost: 0 }; }
    if (tag === 'J8-003') { r.cond = HT.CBH; r.maint = { type: 'Bảo hành', desc: 'Lỗi phát hiện khi kiểm tra, chờ bảo hành NSX', vendor: 'NSX d&b (chờ)', after: HT.CBH, cost: 0 }; }
    return r;
  };
  var push = function (tag, model, serial, cfg, parent, withCond, forced) {
    var c = info[model], x = withCond ? condOf(seq, tag) : null;
    // kho: ~80% Hà Nội, ~20% TP.HCM (tính theo thiết bị gốc); thiết bị con đi theo bộ cha
    if (!parent) curLoc = forced || ((seq % 10 < 8) ? WH.HN : WH.HCM);
    out.push([tag, model, c[4], c[5], serial, cfg || '', parent || '', ST.KHO, '', curLoc, false, DATE(2026, 9, 1), '',
      x ? x.mfg : '', x ? x.bought : '', x ? x.buyCond : '', x ? x.buyPct : '', x ? x.cond : '', x ? x.noBig : false, x ? x.lastOut : '', x ? x.lastIn : '']);
    if (x && x.maint) maint.push([tag, DATE(2025 + (seq % 2), (seq * 3) % 12, 5 + (seq % 20)), x.maint.type, x.maint.desc, x.maint.vendor, x.maint.after, x.maint.cost, 'Hoàng', '']);
  };
  Object.keys(stock).forEach(function (m) {
    for (var i = 1; i <= stock[m]; i++) {
      var tag = m + '-' + pad(i, stock[m] > 99 ? 3 : (stock[m] > 9 ? 3 : 2));
      seq++;
      push(tag, m, (info[m][6] || m).replace(/\.xxx|\.\d{3}/, '') + '-' + (2400 + i * 7), cfgMap[m], '', true, locOf(m, i));
      var nD80 = m === 'RK6' ? 6 : m === 'RK3' ? 3 : m === 'RK1' ? 1 : 0;
      for (var k = 0; k < nD80; k++) { d80++; push('D80-' + pad(d80), 'D80', 'Z2710-' + (51000 + d80 * 13), '', tag, false); }
      if (m === 'RK6' || m === 'RK3') { ds10++; push('DS10-' + pad(ds10, 2), 'DS10', 'Z4010-' + (8800 + ds10 * 11), '', tag, false); }
    }
  });
  out.maint = maint;
  return out;
}

function demoTest_() {
  var T = [];
  var add = function (p, a, e) { T.push([T.length + 1, p, a, e, false, '']); };
  add('A. Cài đặt', 'Tiện ích mở rộng → Apps Script → dán Code.gs, Auth.gs, Images.gs, tạo file HTML tên "App" dán App.html → Lưu → tải lại Google Sheet.', 'Thanh menu có "⚡ QUẢN LÝ THIẾT BỊ PRO".');
  add('A. Cài đặt', 'Menu → Khởi tạo / Cập nhật Sheet chuẩn → cấp quyền → chọn YES nạp dữ liệu mẫu.', 'Có sheet Bảo trì thiết bị. Danh mục 71 model (có Shure Axient, PSM, RF Venue). Thiết bị ~700 mã. Show: 7 sự kiện lấy từ kế hoạch 10–11/2026.');
  add('A. Cài đặt', 'Menu → Nạp ảnh minh họa vào Google Drive (cấp quyền Drive).', 'Thư mục Drive "QLTB PRO – Ảnh thiết bị" được tạo; cột Ảnh ở Danh mục hiện hình (thiết bị mới chưa có ảnh sẽ hiện ô chữ).');
  add('B. Kho', 'Tab "Kho thiết bị" → lọc nhóm "Micro & IEM".', 'Hiện AD4Q, AD2, AD1, ADTQ, P10R+, SE846, Diversity Fin, Distro, Combine… Không có loa.');
  add('B. Kho', 'Tab "Kho thiết bị" → lọc nhóm "Ánh sáng".', 'Thông báo chưa có thiết bị ánh sáng (đang chờ thêm model).');
  add('B. Kho', 'Bấm thẻ Quantum 225.', 'Tổng 3 mã (Q225-001…003). Các model có mã không phù hợp show lớn hiện "🔴 n mã không phù hợp".');
  add('C. Show lớn', 'Tab "Show & đặt thiết bị" → mở "Anh Trai Vượt Ngàn Chông Gai (ATVNCG)" (SH-2610-002).', 'Tổng ≥ 500.000.000 đ → khung ĐỎ "Show lớn" hiện ở trên đầu biên tập.');
  add('C. Show lớn', 'Tab "Xuất / Nhập kho" → chọn SH-2610-002 → xem danh sách mã đã gán.', 'Không có mã đỏ (cũ tự sửa, đang cần sửa/bảo hành) được gán cho show lớn.');
  add('C. Show lớn', 'Kho → mở GSL8 → bấm mã GSL8-028.', 'Mở trang chi tiết: hiện trạng "Cần sửa chữa", có lịch sử "Màng HF hỏng sau show". Hàng này tô đỏ.');
  add('C. Show lớn', 'Đổi show SH-2611-002 (Jazz Đà Lạt) sang "Đã xác nhận" → Soạn hàng tự động.', 'Show nhỏ hơn 500 triệu không bị loại mã; hàng cũ tự sửa vẫn có thể được gán.');
  add('D. Giá & bảo trì', 'Đăng nhập admin (Quản trị) → Kho → mở J8 → sửa giá thuê → "Lưu giá".', 'Giá đổi ngay; nhật ký ghi "Sửa giá thuê/ngày" với giá cũ → mới.');
  add('D. Giá & bảo trì', 'Đăng nhập tài khoản Phó TGĐ (cấp 3) → Kho → mở J8.', 'Không có ô sửa giá (chỉ Giám đốc trở lên).');
  add('D. Giá & bảo trì', 'Mở J8-003 → sửa Hiện trạng thành "Bình thường" → "Lưu thông tin" → thêm lịch sử "Bảo hành", nội dung "NSX nhận bảo hành", hiện trạng sau "Đã bảo hành".', 'Lịch sử có thêm 1 dòng; hiện trạng cập nhật; nhật ký hệ thống ghi thao tác kèm IP.');
  add('D. Giá & bảo trì', 'Mở một thiết bị Cũ tự sửa (có nhãn "cũ tự sửa") → xem "Ngày mua", "% còn lại lúc mua".', 'Ngày sản xuất trước ngày mua; % còn lại 40%; không đi show lớn.');
  add('E. Vận hành', 'Xuất / Nhập kho → chọn SH-2610-001 (Musique De Salon, đang ở show) → 📥 Nhập kho: đánh dấu một J8 bất kỳ "Hỏng" (ghi chú: rách màng loa) → Xác nhận.', 'Mã J8 đó → Bảo trì; show → Đã nhập kho; Nhật ký ghi từng mã.');
  add('E. Vận hành', 'Xuất / Nhập kho → SH-2610-002 → 🧰 Soạn hàng tự động (lần 2).', 'Không còn thiếu; báo "đã bỏ qua n lượt thiết bị không phù hợp" nếu có.');
  add('F. Giao diện', 'Bấm nút 🌙 Tối góc trên bên phải → đóng app, mở lại.', 'Giao diện tối giữ nguyên; bấm ☀️ Sáng quay về sáng. Mọi bảng, popup đọc được.');
  add('F. Giao diện', 'Mở app trên iPhone (Safari, PWA) → đổi tối/sáng.', 'Bố cục không tràn ngang; nút ⚙ và tab vẫn bấm được.');
  add('G. Tùy biến', 'Sheet Liên kết: thêm 1 dòng cho Họ "AD2", nhóm "Pin & sạc", lựa chọn mới, Model kèm "SB900B", Công thức "2*n".', 'Mở popup AD2 → nhóm "Pin & sạc" có lựa chọn mới. Không cần sửa code.');
  add('G. Tùy biến', 'Sheet Cấu hình: đổi NGUONG_SHOW_LON thành 2000000000 → mở ATVNCG.', 'Hết khung đỏ "Show lớn" (tổng dưới ngưỡng mới). Đổi lại 500000000 để kiểm tra tiếp.');
  add('H. Tài khoản', 'Đăng nhập dvhung (CEO). Vào tab Người dùng: reset mật khẩu + mở khóa ptgd.mau; tạo user sale1 (Giám đốc Sale).', 'Sơ đồ tổ chức hiện CEO → Giám đốc → Phó TGĐ → các phòng ban; admin hiện ở hàng "ngang hàng CEO".');
  add('H. Tài khoản', 'Đăng nhập sale1 → mở show → Chiết khấu 25% → Lưu show. Đổi thành 35% → 📨 Xin duyệt cấp trên.', '25% áp ngay (trong quyền 30%). 35% thành yêu cầu chờ Phó TGĐ duyệt; show ghi "Chờ duyệt 35%".');
  add('H. Tài khoản', 'CEO: tab Hệ thống → Khóa hệ thống bằng mật khẩu. Đăng nhập sale1.', 'Bị yêu cầu mật khẩu mở khóa; CEO/admin vẫn vào bình thường. Nhật ký hệ thống ghi thời gian, user, IP, thao tác.');
  add('I. Tùy biến', 'Sheet Danh mục: thêm model mới (vd. đèn moving head, loại "Đèn moving head") + thêm các mã ở sheet Thiết bị.', 'Model xuất hiện ở nhóm "Ánh sáng"; nếu "Cho thuê riêng" = Có thì xuất hiện trong danh sách chọn của show.');
  return T;
}

function demoGuide_() {
  return [
    ['1. Cài đặt', 'Tiện ích mở rộng → Apps Script. Dán Code.gs vào file Code.gs. Bấm + → Tập lệnh, đặt tên Images, dán Images.gs. Bấm + → HTML, đặt tên App, dán App.html. Lưu (Ctrl+S). Quay lại sheet, tải lại trang.'],
    ['2. Khởi tạo', 'Menu ⚡ QUẢN LÝ THIẾT BỊ PRO → Khởi tạo / Cập nhật Sheet chuẩn. Lần đầu Google sẽ hỏi quyền (Advanced → Go to project → Allow).'],
    ['3. Ảnh minh họa', 'Menu → Nạp ảnh minh họa vào Google Drive. Ảnh lấy từ brochure d&b J-Series / SL-Series và Quantum 338; Q225/Q225 DS/Q338 Pulse dùng link ảnh trên digico.biz.'],
    ['4. Ba kiểu mở', 'Popup lớn (khóa trang tính) · Cửa sổ nổi (vẫn bấm được vào sheet) · Sidebar bên phải (tra cứu nhanh, đổi trạng thái theo mã TB).'],
    ['5. Trạng thái thiết bị', ST_LIST.join(' → ') + '. Show: ' + SHOW_ST.join(' → ') + '. Chỉ các show "' + SHOW_HOLD.join(', ') + '" mới giữ hàng theo ngày.'],
    ['6. Liên kết thiết bị', 'Sheet "Liên kết": mỗi dòng = 1 thiết bị kèm theo của 1 lựa chọn. Cột "Model/Họ chính" nhận Mã model hoặc Họ (cột Họ ở Danh mục). Các dòng cùng Nhóm = 1 câu hỏi trong popup. Công thức SL dùng n (số lượng chính) và biến ở cột "Tham số popup" (vd h = số hang, r = số SD-Rack), hàm CEIL/FLOOR/MAX/MIN.'],
    ['7. Bộ thiết bị (cha–con)', 'Cột "Thuộc bộ" ở sheet Thiết bị: D80 và DS10 nằm trong rack. Rack đi show thì D80/DS10 bên trong tự đổi trạng thái theo.'],
    ['8. Đổi sang việc khác', 'Giữ nguyên cấu trúc 9 sheet. Thay dữ liệu Danh mục / Thiết bị / Liên kết (vd. đèn moving head → kèm bộ treo, dây DMX, dây nguồn). Muốn đổi tên trạng thái hoặc màu: sửa khối CẤU HÌNH đầu Code.gs.'],
    ['9. Bản offline (iPhone/máy tính)', 'File QLTB-PRO-offline.html chạy không cần mạng, dữ liệu lưu trong trình duyệt của máy đó. Đưa dữ liệu qua lại: ở bản offline bấm 💾 Sao lưu → ở Google Sheet: menu → 📥 Nhập dữ liệu từ bản offline. Chiều ngược lại: menu → 📤 Xuất dữ liệu cho bản offline → ở bản offline bấm 📂 Khôi phục. Mỗi lần nhập là THAY toàn bộ dữ liệu, nên chỉ sửa ở một nơi rồi chuyển qua.'],
    ['10. Tài khoản & phân quyền', 'Sheet "Người dùng" (mật khẩu chỉ lưu dạng băm), "Chức vụ" (cấp, chiết khấu tối đa, quyền ✓), "Duyệt chiết khấu", "Truy cập" (IP), "Nhật ký hệ thống". Mở popup từ Google Sheet = quyền Quản trị (chủ sheet). App điện thoại phải đăng nhập.'],
    ['11. Máy chủ cho app', 'Triển khai → Ứng dụng web (Thực thi: Tôi; Truy cập: Bất kỳ ai) → dán URL /exec vào app (⚙ Máy chủ). App làm việc offline, có mạng tự gửi thao tác lên Sheet và tải dữ liệu mới về.'],
    ['12. Lưu ý dữ liệu', 'GIẢ ĐỊNH để chạy thử: đơn giá thuê, số lượng tồn kho, serial, ngày mua/sản xuất, tình trạng (80% mới, 10% like-new, 10% mua cũ: 50% chưa sửa, 30% sửa chính hãng, 20% tự sửa – không đi show lớn), độ dài cáp (.xxx), đội hình các show, số máy thu IEM trên mỗi bộ phát. Shure/RF Venue: kiểm tra lại mã sản phẩm theo bảng hàng. Thông số loa/ampli/rigging theo brochure d&b J-Series và SL-Series; DiGiCo theo brochure Quantum 338 và digico.biz.'],
    ['13. Hiện trạng & show lớn', 'Hiện trạng: Bình thường · Đã sửa chữa · Đã bảo hành · Cần sửa chữa · Cần bảo hành. Show có tổng tiền ≥ ngưỡng (sheet Cấu hình, NGUONG_SHOW_LON, mặc định 500.000.000 đ) là show lớn: soạn hàng bỏ qua thiết bị cũ tự sửa / đang cần sửa, và tô đỏ mã không phù hợp.'],
    ['14. Giá thuê', 'Chỉ Giám đốc trở lên (cấp 1–2) mới sửa được giá thuê/ngày, trong mục Kho → chọn model. Mọi thay đổi giá ghi vào nhật ký.']
  ];
}
