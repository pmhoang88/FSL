/******************************************************************************
 * Auth.gs – Đăng nhập · Phân quyền · Sơ đồ tổ chức · Khách hàng · Duyệt chiết khấu
 *           Đếm truy cập + IP · Nhật ký hệ thống · Khóa hệ thống · Máy chủ cho app điện thoại
 * Dán file này vào Apps Script cùng với Code.gs, Images.gs, App.html.
 * Mật khẩu chỉ lưu dạng băm (SHA-256 + salt), không lưu chữ thường.
 ******************************************************************************/

var USER_ST = ['Hoạt động', 'Chờ duyệt', 'Tạm khóa', 'Ban'];
var PERMS = ['TAO_SHOW', 'XUAT_NHAP_KHO', 'SUA_DANH_MUC', 'XEM_KHACH_HANG', 'SUA_KHACH_HANG', 'XEM_TAI_CHINH', 'QUAN_TRI_USER', 'KHOA_HE_THONG', 'XEM_NHAT_KY_HT'];
var PERM_LABEL = {
  TAO_SHOW: 'Tạo/sửa show, báo giá', XUAT_NHAP_KHO: 'Soạn hàng, xuất/nhập kho', SUA_DANH_MUC: 'Sửa danh mục thiết bị',
  XEM_KHACH_HANG: 'Xem khách hàng', SUA_KHACH_HANG: 'Thêm/sửa khách hàng', XEM_TAI_CHINH: 'Xem giá mặc cả, make up, tiền hồi',
  QUAN_TRI_USER: 'Quản trị user', KHOA_HE_THONG: 'Khóa hệ thống', XEM_NHAT_KY_HT: 'Xem nhật ký hệ thống & truy cập'
};
var FIN_FIELDS = ['Giá mặc cả (% hay xin giảm)', 'Make up giá?', 'Ghi chú giá', 'Tiền hồi %', 'Tiền hồi (số tiền)'];
var HIGH = '★ CẤP CAO (Phó TGĐ trở lên)';
var SESSION_DAYS = 30;
var CTX = null;   // người đang thao tác (gán bởi dispatch_)

/* ------------------------------ băm mật khẩu ------------------------------ */
function sha256Hex_(s) {
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8);
  return b.map(function (x) { var v = (x + 256) % 256; return (v < 16 ? '0' : '') + v.toString(16); }).join('');
}
function hashPw_(salt, pw) {
  var h = sha256Hex_(salt + pw);
  for (var i = 0; i < 499; i++) h = sha256Hex_(h);
  return h;
}
function newSalt_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 16); }
function newToken_() { return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8); }
function now_() { return new Date(); }

/* ------------------------------ dữ liệu mẫu ------------------------------- */
function seedRoles_() {
  var T = true, F = false;
  var rows = [
    ['CEO', 1, 100, '', T, T, T, T, T, T, T, T, T, 'Cao nhất. Được làm đến 100% (Free of Charge) trong trường hợp đặc biệt. Khóa hệ thống.'],
    ['Quản trị', 1, 100, '', T, T, T, T, T, T, T, T, T, 'Ngang hàng CEO để quản trị hệ thống.'],
    ['Giám đốc', 2, 40, 'CEO', T, T, T, T, T, T, F, F, T, ''],
    ['Phó tổng giám đốc', 3, 40, 'Giám đốc', T, T, T, T, T, T, F, F, T, 'Duyệt yêu cầu GẤP từ mọi phòng ban.'],
    ['Giám đốc Kỹ Thuật', 4, 25, 'Phó tổng giám đốc', T, T, T, T, F, F, F, F, F, 'Trưởng phòng kỹ thuật – tối đa 25%.'],
    ['Phó giám đốc Kỹ Thuật', 4, 25, 'Phó tổng giám đốc', T, T, T, T, F, F, F, F, F, 'Phó phòng kỹ thuật – tối đa 25%.'],
    ['Giám đốc Sale', 4, 30, 'Phó tổng giám đốc', T, F, F, T, T, T, F, F, F, ''],
    ['Kế toán trưởng', 4, 15, 'Phó tổng giám đốc', T, F, F, T, F, T, F, F, F, ''],
    ['Quản lý Kho', 4, 15, 'Phó tổng giám đốc', T, T, T, F, F, F, F, F, F, ''],
    ['Trưởng phòng sửa chữa', 4, 15, 'Phó tổng giám đốc', T, T, F, F, F, F, F, F, F, ''],
    ['Kỹ thuật', 4, 15, 'Phó tổng giám đốc', T, T, F, F, F, F, F, F, F, ''],
    ['Kỹ thuật trưởng', 4, 15, 'Phó giám đốc Kỹ Thuật', T, T, F, F, F, F, F, F, F, 'Trưởng kỹ thuật thực hiện show'],
    ['Sales Manager', 4, 15, 'Giám đốc Sale', T, F, F, T, T, T, F, F, F, 'Quản lý sales, báo cáo Giám đốc Sale']
  ];
  sh_('ROLE').getRange(2, 1, rows.length, COLS.ROLE.length).setValues(rows);
}

function seedUsers_() {
  var t = now_();
  var U = function (u, name, role, mgr, st, salt, hash, note, title) {
    return [u, name, role, mgr, '', '', st, '', '', t, 'Khởi tạo', t, t, '', '', '', note || '', salt || '', hash || '', title || ''];
  };
  var rows = [
    U('dvhung', 'CEO Hùng (cập nhật họ tên)', 'CEO', '', 'Hoạt động', '15a7d846218d0d4a', '345d5669387252052c804d480f2008ccf2f8661ee3cbd23c588c46d39093a419', 'Tài khoản CEO – nên đổi mật khẩu sau lần đăng nhập đầu', 'CEO'),
    U('admin', 'Phạm Minh Hoàng', 'Quản trị', '', 'Hoạt động', '3369c5d790da6ee7', 'e1ed677e4ddd027793d2fa902c629e635479d7184304acd86ca1f2b4c47d113a', 'Quản trị hệ thống – nên đổi mật khẩu sau lần đăng nhập đầu', 'Kỹ thuật hệ thống'),
    U('phuonganh', 'Phương Anh', 'Giám đốc Sale', 'dvhung', 'Tạm khóa', '', '', 'Chưa có mật khẩu – quản trị đặt mật khẩu rồi mở khóa', 'Giám đốc Sales'),
    U('thuy', 'Thuý', 'Sales Manager', 'phuonganh', 'Tạm khóa', '', '', 'Chưa có mật khẩu – quản trị đặt mật khẩu rồi mở khóa', 'Sales Manager'),
    U('son', 'Sơn', 'Phó giám đốc Kỹ Thuật', 'dvhung', 'Tạm khóa', '', '', 'Chưa có mật khẩu – quản trị đặt mật khẩu rồi mở khóa', 'PGĐ Kỹ thuật · Ánh sáng'),
    U('thiet', 'Thiết', 'Phó giám đốc Kỹ Thuật', 'dvhung', 'Tạm khóa', '', '', 'Chưa có mật khẩu – quản trị đặt mật khẩu rồi mở khóa', 'PGĐ Kỹ thuật · Âm thanh'),
    U('minh', 'Minh', 'Kỹ thuật trưởng', 'thiet', 'Tạm khóa', '', '', 'Chưa có mật khẩu – quản trị đặt mật khẩu rồi mở khóa', 'Kỹ thuật trưởng'),
    U('manh', 'Mạnh', 'Kỹ thuật', 'minh', 'Tạm khóa', '', '', 'Chưa có mật khẩu – quản trị đặt mật khẩu rồi mở khóa', 'Setup'),
    U('hieu', 'Hiếu', 'Kỹ thuật', 'minh', 'Tạm khóa', '', '', 'Chưa có mật khẩu – quản trị đặt mật khẩu rồi mở khóa', 'Setup'),
    U('ptgd.mau', 'Vị trí trống – Phó tổng giám đốc', 'Phó tổng giám đốc', 'dvhung', 'Tạm khóa', '', '', 'Chưa bổ nhiệm – mẫu, đổi tên khi có người', 'Phó TGĐ (trống)'),
    U('gdkt.mau', 'Vị trí trống – Giám đốc Kỹ Thuật', 'Giám đốc Kỹ Thuật', 'ptgd.mau', 'Tạm khóa', '', '', 'Chưa bổ nhiệm – mẫu', 'GĐ Kỹ thuật (trống)'),
    U('ktt.mau', 'Vị trí trống – Kế toán trưởng', 'Kế toán trưởng', 'ptgd.mau', 'Tạm khóa', '', '', 'Chưa bổ nhiệm – mẫu', 'Kế toán trưởng (trống)')
  ];
  sh_('USER').getRange(2, 1, rows.length, COLS.USER.length).setValues(rows);
}

function seedCustomers_() {
  var t = now_(), who = CTX ? CTX.username : 'Khởi tạo';
  var K = function (o) { return COLS.CUST.map(function (h) { return o[h] === undefined ? '' : o[h]; }); };
  var rows = [
    K({ 'Mã KH': 'KH-001', 'Họ tên': 'Trần Minh Khoa (giả định)', 'Điện thoại': '0900 000 001', 'Công ty': 'Công ty Sự kiện XYZ (giả định)', 'Chức vụ': 'Giám đốc dự án',
      'Cấp trên của KH': 'Ông Lâm – Tổng giám đốc XYZ', 'Cấp dưới của KH': 'Chị Mai – điều phối kỹ thuật', 'Nơi làm trước đây': 'Agency ABC Media (2018–2022)', 'Địa chỉ': 'Q.1, TP.HCM',
      'Thói quen sinh hoạt': 'Hẹn cà phê sáng 7h–8h; không nhận cuộc gọi sau 21h; thích chốt việc qua Zalo', 'Giá mặc cả (% hay xin giảm)': 12, 'Make up giá?': 'Có',
      'Ghi chú giá': 'Thường báo lại giá cho chủ đầu tư cao hơn 10–15%', 'Tên công ty xuất HĐ': 'CÔNG TY TNHH SỰ KIỆN XYZ (giả định)', 'MST': '0300000001',
      'Địa chỉ xuất HĐ': 'Q.1, TP.HCM (giả định)', 'Email nhận HĐ': 'ketoan@xyz.example', 'Tiền hồi %': 5, 'Tiền hồi (số tiền)': 0, 'Mùa cao điểm (ghi tay)': 'Tháng 10 – Tết',
      'Phụ trách KH': 'admin', 'Ghi chú': 'Dữ liệu GIẢ ĐỊNH để chạy thử', 'Ngày tạo': t, 'Người tạo': who, 'Ngày sửa': t }),
    K({ 'Mã KH': 'KH-002', 'Họ tên': 'Nguyễn Thu Hà (giả định)', 'Điện thoại': '0900 000 002', 'Công ty': 'Công ty ABC (giả định)', 'Chức vụ': 'Trưởng phòng Marketing',
      'Cấp trên của KH': 'Giám đốc khối thương mại', 'Cấp dưới của KH': '', 'Nơi làm trước đây': 'Tập đoàn DEF', 'Địa chỉ': 'TP. Thủ Đức',
      'Thói quen sinh hoạt': 'Làm việc buổi chiều; cần báo giá PDF gửi email', 'Giá mặc cả (% hay xin giảm)': 8, 'Make up giá?': 'Không',
      'Tên công ty xuất HĐ': 'CÔNG TY CỔ PHẦN ABC (giả định)', 'MST': '0300000002', 'Email nhận HĐ': 'invoice@abc.example', 'Tiền hồi %': 0, 'Tiền hồi (số tiền)': 2000000,
      'Mùa cao điểm (ghi tay)': 'Hội nghị cuối năm (T11–T12)', 'Phụ trách KH': 'admin', 'Ghi chú': 'Dữ liệu GIẢ ĐỊNH', 'Ngày tạo': t, 'Người tạo': who, 'Ngày sửa': t }),
    K({ 'Mã KH': 'KH-003', 'Họ tên': 'Lê Quốc Bảo (giả định)', 'Điện thoại': '0900 000 003', 'Công ty': 'Nhà hát/Venue GHI (giả định)', 'Chức vụ': 'Trưởng kỹ thuật',
      'Thói quen sinh hoạt': 'Rất kỹ về rider kỹ thuật, thích xem simulation ArrayCalc trước', 'Giá mặc cả (% hay xin giảm)': 5, 'Make up giá?': 'Không',
      'Phụ trách KH': 'admin', 'Ghi chú': 'Dữ liệu GIẢ ĐỊNH', 'Ngày tạo': t, 'Người tạo': who, 'Ngày sửa': t })
    ,
    K({ 'Mã KH': 'KH-005', 'Họ tên': 'Minh Tấn', 'Công ty': '', 'Ghi chú': 'KHÁCH QUEN – đối tác tin cậy', 'Phụ trách KH': 'admin', 'Ngày tạo': t, 'Người tạo': who, 'Ngày sửa': t }),
    K({ 'Mã KH': 'KH-004', 'Họ tên': 'Stage Professional (StagePro)', 'Công ty': 'Stage Professional', 'Ghi chú': 'CÔNG TY PHÂN PHỐI – hỗ trợ theo mã ưu đãi STAGEPRO (giảm 100%, chỉ CEO nhập mã)', 'Phụ trách KH': 'dvhung', 'Ngày tạo': t, 'Người tạo': who, 'Ngày sửa': t })
  ];
  sh_('CUST').getRange(2, 1, rows.length, COLS.CUST.length).setValues(rows);
  applyCustFormulas_(rows.length);
}

function applyCustFormulas_(n) {
  if (!n) return;
  var S = function (h) { return "'" + SH.SHOW + "'!$" + colLetter_(idx_('SHOW', h)) + ':$' + colLetter_(idx_('SHOW', h)); };
  var A = colLetter_(idx_('CUST', 'Mã KH')), out = [];
  for (var r = 2; r < 2 + n; r++) {
    var k = A + r;
    out.push([
      '=IF(' + k + '="","",COUNTIF(' + S('Mã KH') + ',' + k + '))',
      '=IF(' + k + '="","",COUNTIFS(' + S('Mã KH') + ',' + k + ',' + S('Trạng thái') + ',"Đã nhập kho"))',
      '=IF(' + k + '="","",IF(COUNTIF(' + S('Mã KH') + ',' + k + ')=0,"",MAXIFS(' + S('Ngày diễn') + ',' + S('Mã KH') + ',' + k + ')))'
    ]);
  }
  sh_('CUST').getRange(2, idx_('CUST', 'Số show đã book'), n, 3).setFormulas(out);
}

/* ------------------------------ tra cứu ------------------------------ */
function roles_() {
  var m = {};
  live_(readTable_('ROLE')).forEach(function (r) {
    var name = String(r['Chức vụ'] || ''); if (!name) return;
    var p = {}; PERMS.forEach(function (k) { p[k] = bool_(r[k]); });
    m[name] = { name: name, level: num_(r['Cấp']) || 9, max: num_(r['Chiết khấu tối đa %']), reportsTo: String(r['Báo cáo cho'] || ''), perms: p, note: String(r['Ghi chú'] || '') };
  });
  return m;
}
function userStatus_(r) {
  var st = String(r['Trạng thái'] || 'Hoạt động');
  if (st === 'Ban') {
    var until = r['Ban đến ngày'];
    var d = Object.prototype.toString.call(until) === '[object Date]' ? until : (until ? s2d_(d2s_(until)) : null);
    if (d && d.getTime() < now_().getTime()) return 'Hoạt động';
  }
  return st;
}
function userPub_(r, roles) {
  var ro = roles[String(r['Chức vụ'])] || { level: 9, max: 0 };
  return {
    username: String(r['Username']), name: String(r['Họ tên'] || ''), role: String(r['Chức vụ'] || ''), manager: String(r['Cấp trên'] || ''),
    phone: String(r['Điện thoại'] || ''), email: String(r['Email'] || ''), status: userStatus_(r), banUntil: d2s_(r['Ban đến ngày']),
    reason: String(r['Lý do khóa/ban'] || ''), created: dt2s_(r['Ngày tạo']), createdBy: String(r['Người tạo'] || ''),
    editedInfo: dt2s_(r['Ngày sửa thông tin']), editedRole: dt2s_(r['Ngày đổi quyền']), editedBan: dt2s_(r['Ngày khóa/ban']),
    lastLogin: dt2s_(r['Đăng nhập cuối']), lastIp: String(r['IP cuối'] || ''), note: String(r['Ghi chú'] || ''), title: String(r['Chức danh'] || ''),
    level: ro.level, max: ro.max, hasPw: !!r['Hash']
  };
}
function findUser_(t, username) {
  var u = String(username || '').trim().toLowerCase();
  return live_(t).filter(function (r) { return String(r['Username']).toLowerCase() === u; })[0];
}
function managerOf_(username, users, roles) {
  var me = users.filter(function (u) { return u.username === username; })[0]; if (!me) return '';
  var active = function (u) { return u && u.status === 'Hoạt động'; };
  if (me.manager) {
    var m = users.filter(function (u) { return u.username === me.manager; })[0];
    if (active(m)) return m.username;
  }
  var r = roles[me.role];
  if (r && r.level <= 1) return '';
  var target = r && r.reportsTo;
  while (target) {
    var cand = users.filter(function (u) { return u.role === target && active(u) && u.username !== username; })[0];
    if (cand) return cand.username;
    target = roles[target] && roles[target].reportsTo;
  }
  var ceo = users.filter(function (u) { return u.role === 'CEO' && active(u) && u.username !== username; })[0];
  return ceo ? ceo.username : '';
}
function orgParent_(username, users, roles) {
  var me = users.filter(function (u) { return u.username === username; })[0]; if (!me) return '';
  var r = roles[me.role]; if (r && r.level <= 1) return '';
  if (me.manager && users.some(function (u) { return u.username === me.manager; })) return me.manager;
  var target = r && r.reportsTo;
  while (target) {
    var cand = users.filter(function (u) { return u.role === target && u.username !== username; })[0];
    if (cand) return cand.username;
    target = roles[target] && roles[target].reportsTo;
  }
  var ceo = users.filter(function (u) { return u.role === 'CEO' && u.username !== username; })[0];
  return ceo ? ceo.username : '';
}
function ctxFromUser_(r, roles, ip, device) {
  var ro = roles[String(r['Chức vụ'])] || { level: 9, max: 0, perms: {} };
  return { username: String(r['Username']), name: String(r['Họ tên']), role: String(r['Chức vụ']), level: ro.level, max: ro.max,
    perms: ro.perms || {}, ip: ip || '', device: device || '' };
}
function ownerCtx_(ip, device) {
  var p = {}; PERMS.forEach(function (k) { p[k] = true; });
  var e = ''; try { e = Session.getActiveUser().getEmail(); } catch (err) {}
  return { username: e || 'chu-sheet', name: 'Chủ Google Sheet' + (e ? ' (' + e + ')' : ''), role: 'Quản trị', level: 1, max: 100, perms: p, ip: ip || '', device: device || 'Google Sheet', owner: true };
}
function can_(perm) { return !CTX || CTX.owner || !!(CTX.perms && CTX.perms[perm]); }
function need_(perm) { if (!can_(perm)) throw new Error('Bạn không có quyền: ' + (PERM_LABEL[perm] || perm)); }

/* ------------------------------ _Hệ thống (khóa, phiên) ------------------------------ */
function sysAll_() {
  var t = readTable_('SYS'), m = {};
  live_(t).forEach(function (r) { m[String(r['Khóa'])] = r; });
  return { t: t, m: m };
}
function sysGet_(k) { var r = sysAll_().m[k]; return r ? String(r['Giá trị']) : ''; }
function sysSet_(k, v, exp) {
  var s = sysAll_(), r = s.m[k];
  if (!r) { r = {}; s.t.rows.push(r); }
  r['Khóa'] = k; r['Giá trị'] = v; r['Hết hạn'] = exp || '';
  saveTable_(s.t);
}
function sysDel_(pred) {
  var s = sysAll_(), n = 0;
  live_(s.t).forEach(function (r) { if (pred(String(r['Khóa']), r)) { r._deleted = true; n++; } });
  if (n) saveTable_(s.t);
  return n;
}
function isLocked_() { return sysGet_('LOCK') === '1'; }

/* ------------------------------ bộ điều phối duy nhất ------------------------------ */
var PUBLIC_ACTIONS = { apiLogin: 1, apiRegister: 1, apiVisit: 1, apiPublicInfo: 1, apiPing: 1 };
var ACTIONS = {
  apiBootstrap: { w: false }, apiSync: { w: false }, apiLogout: { w: true },
  apiSaveShow: { p: 'TAO_SHOW', w: true }, apiDeleteShow: { p: 'TAO_SHOW', w: true },
  apiAssign: { p: 'XUAT_NHAP_KHO', w: true }, apiCheckout: { p: 'XUAT_NHAP_KHO', w: true }, apiCheckin: { p: 'XUAT_NHAP_KHO', w: true },
  apiSetAssetStatus: { p: 'XUAT_NHAP_KHO', w: true }, apiSavePng: { w: false },
  apiSetAssetInfo: { p: 'SUA_DANH_MUC', w: true }, apiMaintAdd: { p: 'SUA_DANH_MUC', w: true },
  apiSetPrice: { w: true },  // kiểm tra cấp Giám đốc trở lên bên trong hàm
  apiUpdateShowPrices: { w: true },  // Giám đốc trở lên, kiểm tra bên trong
  apiSavePenalty: { p: 'XEM_TAI_CHINH', w: true }, apiDeletePenalty: { p: 'XEM_TAI_CHINH', w: true },
  apiSaveExpense: { p: 'XEM_TAI_CHINH', w: true }, apiDeleteExpense: { p: 'XEM_TAI_CHINH', w: true },
  apiSaveCar: { w: true }, apiDeleteCar: { w: true },  // Giám đốc trở lên, kiểm tra bên trong
  apiStats: { w: false },  // Giám đốc trở lên, kiểm tra bên trong
  apiBulkUpdatePrices: { w: true },  // chỉ CEO, kiểm tra bên trong
  apiSaveTransport: { p: 'XUAT_NHAP_KHO', w: true }, apiDeleteTransport: { p: 'XUAT_NHAP_KHO', w: true },
  apiSaveStaff: { p: 'SUA_DANH_MUC', w: true }, apiDeleteStaff: { p: 'SUA_DANH_MUC', w: true },
  apiSaveAssign: { p: 'XUAT_NHAP_KHO', w: true }, apiDeleteAssign: { p: 'XUAT_NHAP_KHO', w: true },
  apiSaveCustomer: { p: 'SUA_KHACH_HANG', w: true }, apiDeleteCustomer: { p: 'SUA_KHACH_HANG', w: true },
  apiDiscountRequest: { p: 'TAO_SHOW', w: true }, apiDiscountDecide: { w: true }, apiDiscountCancel: { w: true },
  apiUserSave: { p: 'QUAN_TRI_USER', w: true }, apiUserDelete: { p: 'QUAN_TRI_USER', w: true },
  apiUserResetPw: { p: 'QUAN_TRI_USER', w: true }, apiUserStatus: { p: 'QUAN_TRI_USER', w: true },
  apiChangeMyPassword: { w: true }, apiUpdateMyProfile: { w: true }, apiLockSystem: { p: 'KHOA_HE_THONG', w: true }
};
var SILENT_AUDIT = { apiBootstrap: 1, apiSync: 1, apiVisit: 1, apiPublicInfo: 1, apiPing: 1, apiSavePng: 1 };

/** req = {action, args, token, ip, device}. opts = {owner, trusted: ctx, withSnap} */
function dispatch_(req, opts) {
  opts = opts || {};
  var action = String(req.action || ''), args = req.args || [], ip = String(req.ip || ''), device = String(req.device || '').slice(0, 200);
  var out = { ok: true };
  CTX = { username: '', name: '', role: '', level: 99, max: 0, perms: {}, ip: ip, device: device };
  try {
    var fn = this[action] || (typeof globalThis !== 'undefined' ? globalThis[action] : null);
    if (PUBLIC_ACTIONS[action]) {
      CTX = { username: '', name: '', role: '', level: 99, max: 0, perms: {}, ip: ip, device: device, token: req.token || '' };
      out.result = fn.apply(null, args);
    } else {
      var spec = ACTIONS[action];
      if (!spec || typeof fn !== 'function') throw new Error('Thao tác không hợp lệ: ' + action);
      if (opts.owner) CTX = ownerCtx_(ip, device);
      else if (opts.trusted) { CTX = opts.trusted; CTX.ip = ip; CTX.device = device; }
      else CTX = sessionCtx_(req.token, ip, device);
      CTX.token = req.token || '';
      if (spec.p) need_(spec.p);
      out.result = fn.apply(null, args);
      if (spec.w && !SILENT_AUDIT[action]) audit_(ACTION_LABEL[action] || action, summarize_(action, args, out.result));
      if (opts.withSnap && (spec.w || action === 'apiSync')) out.snap = exportForClient_();
    }
  } catch (e) {
    out = { ok: false, error: String(e && e.message || e), code: (e && e.code) || '' };
    if (!PUBLIC_ACTIONS[action] && !SILENT_AUDIT[action] && CTX && CTX.username) {
      try { audit_('LỖI ' + (ACTION_LABEL[action] || action), out.error); } catch (e2) {}
    }
  }
  try { out.stats = visitStats_(); out.locked = isLocked_(); } catch (e3) {}
  return out;
}
function err_(msg, code) { var e = new Error(msg); e.code = code; return e; }

function sessionCtx_(token, ip, device) {
  if (!token) throw err_('Chưa đăng nhập', 'AUTH');
  var s = sysAll_().m['S:' + token];
  if (!s) throw err_('Phiên đăng nhập đã hết hạn – đăng nhập lại', 'AUTH');
  var exp = s['Hết hạn'];
  if (exp && new Date(exp).getTime() < now_().getTime()) throw err_('Phiên đăng nhập đã hết hạn – đăng nhập lại', 'AUTH');
  var info = JSON.parse(String(s['Giá trị']));
  var ut = readTable_('USER'), u = findUser_(ut, info.u);
  if (!u) throw err_('Tài khoản không còn tồn tại', 'AUTH');
  var st = userStatus_(u);
  if (st !== 'Hoạt động') throw err_('Tài khoản đang ở trạng thái: ' + st, 'AUTH');
  var roles = roles_(), ctx = ctxFromUser_(u, roles, ip, device);
  if (isLocked_() && !ctx.perms.KHOA_HE_THONG && !info.unlocked) throw err_('Hệ thống đang bị khóa', 'LOCKED');
  return ctx;
}

/** google.script.run từ popup trong Google Sheet: chủ sheet = quyền Quản trị */
function apiCall(action, args, ip) {
  return dispatch_({ action: action, args: args || [], ip: ip || '', device: 'Google Sheet (popup)' }, { owner: true });
}

/** Máy chủ cho app điện thoại (Triển khai → Ứng dụng web) */
function doGet(e) {
  var o = { ok: true, app: 'QLTB PRO', version: APP.VERSION, time: new Date().toISOString(), locked: isLocked_() };
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function doPost(e) {
  var res;
  try {
    var req = JSON.parse(e.postData.contents);
    var lock = LockService.getScriptLock(); lock.waitLock(30000);
    try { res = dispatch_(req, { withSnap: true }); } finally { lock.releaseLock(); }
  } catch (err) { res = { ok: false, error: String(err && err.message || err) }; }
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------ nhật ký hệ thống + truy cập ------------------------------ */
function audit_(action, detail) {
  var c = CTX || {};
  appendRows_('AUDIT', [{ 'Thời gian': now_(), 'Username': c.username || '(khách)', 'Chức vụ': c.role || '', 'IP': c.ip || '', 'Thao tác': action,
    'Chi tiết': String(detail || '').slice(0, 1000), 'Thiết bị': c.device || '' }]);
}
var ACTION_LABEL = {
  apiSaveShow: 'Lưu show', apiDeleteShow: 'Xóa show', apiAssign: 'Soạn hàng', apiCheckout: 'Xuất kho', apiCheckin: 'Nhập kho', apiSetAssetStatus: 'Đổi trạng thái thiết bị',
  apiSetAssetInfo: 'Sửa thông tin thiết bị', apiMaintAdd: 'Ghi lịch sử bảo trì', apiSetPrice: 'Sửa giá thuê',
  apiUpdateShowPrices: 'Cập nhật giá show', apiBulkUpdatePrices: 'Cập nhật giá hàng loạt (CEO)',
  apiSaveTransport: 'Lưu vận chuyển', apiDeleteTransport: 'Xóa vận chuyển', apiSaveStaff: 'Lưu nhân sự', apiDeleteStaff: 'Xóa nhân sự',
  apiSaveAssign: 'Lưu phân công nhân sự', apiDeleteAssign: 'Xóa phân công nhân sự',
  apiSavePenalty: 'Ghi tiền phạt show', apiDeletePenalty: 'Xóa tiền phạt', apiSaveExpense: 'Ghi chi phí show', apiDeleteExpense: 'Xóa chi phí',
  apiSaveCar: 'Cấp / sửa xe công ty', apiDeleteCar: 'Xóa xe công ty',
  apiSaveCustomer: 'Lưu khách hàng', apiDeleteCustomer: 'Xóa khách hàng', apiDiscountRequest: 'Xin chiết khấu', apiDiscountDecide: 'Duyệt chiết khấu', apiDiscountCancel: 'Hủy xin chiết khấu',
  apiUserSave: 'Lưu user', apiUserDelete: 'Xóa user', apiUserResetPw: 'Reset mật khẩu', apiUserStatus: 'Khóa/ban/mở user', apiChangeMyPassword: 'Đổi mật khẩu của mình',
  apiUpdateMyProfile: 'Sửa hồ sơ của mình', apiLockSystem: 'Khóa/mở hệ thống', apiLogout: 'Đăng xuất'
};
function summarize_(action, args, res) {
  var a = args || [], s = '';
  try {
    if (action === 'apiSaveShow') s = (res && res.code) + ' – ' + (a[0].show.name || '') + ' – ' + (a[0].lines || []).length + ' dòng, CK ' + (a[0].show.discount || 0) + '%';
    else if (action === 'apiUserSave') s = (a[1] ? 'Tạo mới ' : 'Sửa ') + a[0].username + ' (' + a[0].role + ')';
    else if (action === 'apiUserResetPw' || action === 'apiUserDelete') s = String(a[0]);
    else if (action === 'apiChangeMyPassword') s = '(đã đổi)';
    else if (action === 'apiUserStatus') s = a[0] + ' → ' + a[1] + (a[2] ? ' ' + a[2] + ' ngày' : '') + (a[3] ? ' – ' + a[3] : '');
    else if (action === 'apiLockSystem') s = a[0] ? 'KHÓA hệ thống' : 'MỞ khóa hệ thống';
    else if (action === 'apiLogout') s = '';
    else if (action === 'apiCheckin') s = a[0] + ' – ' + (a[1] || []).length + ' mã';
    else if (action === 'apiDiscountRequest') s = a[0] + ' xin ' + a[1] + '%' + (a[3] ? ' (GẤP)' : '') + ' – ' + (a[2] || '');
    else if (action === 'apiDiscountDecide') s = a[0] + ' → ' + a[1] + (a[2] ? ' ' + a[2] + '%' : '') + (a[3] ? ' – ' + a[3] : '');
    else if (action === 'apiSaveCustomer') s = (res && res.code) + ' – ' + (a[0]['Họ tên'] || '');
    else s = JSON.stringify(a).slice(0, 300);
  } catch (e) { s = ''; }
  return s;
}
function apiVisit(page) {
  appendRows_('VISIT', [{ 'Thời gian': now_(), 'IP': CTX.ip || '(không rõ)', 'Username': CTX.username || String(page && page.user || ''), 'Thiết bị': CTX.device || '', 'Trang': String(page && page.page || page || 'mở app').slice(0, 60) }]);
  return visitStats_();
}
function visitStats_() {
  var sh = sh_('VISIT'); if (!sh || sh.getLastRow() < 2) return { total: 0, uniqueIp: 0, today: 0, users: 0 };
  var n = sh.getLastRow() - 1, v = sh.getRange(2, 1, n, 3).getValues();
  var ips = {}, us = {}, today = Utilities.formatDate(now_(), tz_(), 'yyyy-MM-dd'), td = 0;
  v.forEach(function (r) { if (r[1]) ips[r[1]] = 1; if (r[2]) us[r[2]] = 1; if (d2s_(r[0]) === today) td++; });
  return { total: n, uniqueIp: Object.keys(ips).length, today: td, users: Object.keys(us).length };
}

/* ------------------------------ đăng nhập / đăng ký ------------------------------ */
function apiPing() { return { app: 'QLTB PRO', version: APP.VERSION }; }
function apiPublicInfo() {
  var roles = roles_();
  return { roles: Object.keys(roles).filter(function (r) { return r !== 'CEO' && r !== 'Quản trị'; }), locked: isLocked_(), company: cfgGet_('TEN_CONG_TY') || '' };
}
function apiLogin(username, password, lockPass) {
  var ut = readTable_('USER'), u = findUser_(ut, username);
  var fail = function (m) { audit_('Đăng nhập THẤT BẠI', String(username) + ' – ' + m); throw err_(m, 'LOGIN'); };
  if (!u || !u['Hash']) fail('Sai tên đăng nhập hoặc mật khẩu');
  if (hashPw_(String(u['Salt']), String(password)) !== String(u['Hash'])) fail('Sai tên đăng nhập hoặc mật khẩu');
  var st = userStatus_(u);
  if (st === 'Chờ duyệt') fail('Tài khoản đang chờ CEO/Quản trị duyệt');
  if (st === 'Tạm khóa') fail('Tài khoản đang bị tạm khóa' + (u['Lý do khóa/ban'] ? ': ' + u['Lý do khóa/ban'] : ''));
  if (st === 'Ban') fail('Tài khoản bị cấm đến ' + d2s_(u['Ban đến ngày']).split('-').reverse().join('/') + (u['Lý do khóa/ban'] ? ' – ' + u['Lý do khóa/ban'] : ''));
  var roles = roles_(), ctx = ctxFromUser_(u, roles, CTX.ip, CTX.device), unlocked = false;
  if (isLocked_() && !ctx.perms.KHOA_HE_THONG) {
    if (!lockPass) throw err_('Hệ thống đang bị khóa – nhập mật khẩu mở khóa do CEO cung cấp', 'LOCKED');
    if (hashPw_(sysGet_('LOCK_SALT'), String(lockPass)) !== sysGet_('LOCK_HASH')) fail('Sai mật khẩu mở khóa hệ thống');
    unlocked = true;
  }
  var token = newToken_(), exp = new Date(now_().getTime() + SESSION_DAYS * 86400000);
  sysSet_('S:' + token, JSON.stringify({ u: String(u['Username']), unlocked: unlocked }), exp.toISOString());
  sysDel_(function (k, r) { return k.indexOf('S:') === 0 && r['Hết hạn'] && new Date(r['Hết hạn']).getTime() < now_().getTime(); });
  u['Đăng nhập cuối'] = now_(); u['IP cuối'] = CTX.ip || '';
  saveTable_(ut);
  CTX = ctx;
  audit_('Đăng nhập', 'OK' + (unlocked ? ' (dùng mật khẩu mở khóa)' : ''));
  appendRows_('VISIT', [{ 'Thời gian': now_(), 'IP': CTX.ip || '(không rõ)', 'Username': CTX.username, 'Thiết bị': CTX.device || '', 'Trang': 'đăng nhập' }]);
  return { token: token, me: userPub_(u, roles), role: roles[ctx.role] || null, cred: { salt: String(u['Salt']), hash: String(u['Hash']) }, exp: exp.toISOString() };
}
function apiLogout() { sysDel_(function (k) { return k === 'S:' + CTX.token; }); return true; }

function checkNewUser_(o) {
  var u = String(o.username || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(u)) throw new Error('Username 3–30 ký tự: chữ thường không dấu, số, dấu . _ -');
  if (!o.name || String(o.name).trim().length < 2) throw new Error('Phải khai báo họ tên');
  if (!roles_()[o.role]) throw new Error('Chức vụ không hợp lệ');
  return u;
}
function checkPw_(p) { if (String(p || '').length < 6) throw new Error('Mật khẩu tối thiểu 6 ký tự'); }

function apiRegister(o) {
  var u = checkNewUser_(o); checkPw_(o.password);
  if (o.role === 'CEO' || o.role === 'Quản trị') throw new Error('Không tự đăng ký chức vụ này được');
  var ut = readTable_('USER');
  if (findUser_(ut, u)) throw new Error('Username đã tồn tại');
  var salt = newSalt_(), t = now_();
  ut.rows.push({ 'Username': u, 'Họ tên': String(o.name).trim(), 'Chức vụ': o.role, 'Cấp trên': '', 'Điện thoại': o.phone || '', 'Email': o.email || '',
    'Trạng thái': 'Chờ duyệt', 'Ngày tạo': t, 'Người tạo': 'Tự đăng ký', 'Ngày sửa thông tin': t, 'Ngày đổi quyền': t, 'Salt': salt, 'Hash': hashPw_(salt, String(o.password)) });
  saveTable_(ut);
  CTX.username = u; audit_('Đăng ký tài khoản', u + ' – ' + o.name + ' (' + o.role + ') – chờ duyệt');
  return { username: u, status: 'Chờ duyệt' };
}
function apiChangeMyPassword(oldPw, newPw) {
  checkPw_(newPw);
  var ut = readTable_('USER'), u = findUser_(ut, CTX.username);
  if (!u) throw new Error('Không tìm thấy tài khoản');
  if (u['Hash'] && hashPw_(String(u['Salt']), String(oldPw)) !== String(u['Hash'])) throw new Error('Mật khẩu cũ không đúng');
  u['Salt'] = newSalt_(); u['Hash'] = hashPw_(u['Salt'], String(newPw)); u['Ngày sửa thông tin'] = now_();
  saveTable_(ut);
  return { cred: { salt: u['Salt'], hash: u['Hash'] } };
}
function apiUpdateMyProfile(o) {
  var ut = readTable_('USER'), u = findUser_(ut, CTX.username);
  if (!u) throw new Error('Không tìm thấy tài khoản');
  if (o.name) u['Họ tên'] = String(o.name).trim();
  if (o.phone !== undefined) u['Điện thoại'] = o.phone;
  if (o.email !== undefined) u['Email'] = o.email;
  u['Ngày sửa thông tin'] = now_();
  saveTable_(ut); return true;
}

/* ------------------------------ quản trị user (CEO / Quản trị) ------------------------------ */
function apiUserSave(o, isNew) {
  var ut = readTable_('USER'), t = now_(), u;
  if (isNew) {
    var name = checkNewUser_(o); checkPw_(o.password);
    if (findUser_(ut, name)) throw new Error('Username đã tồn tại');
    u = { 'Username': name, 'Ngày tạo': t, 'Người tạo': CTX.username, 'Trạng thái': 'Hoạt động', 'Ngày đổi quyền': t, 'Salt': newSalt_() };
    u['Hash'] = hashPw_(u['Salt'], String(o.password));
    ut.rows.push(u);
  } else {
    u = findUser_(ut, o.username);
    if (!u) throw new Error('Không tìm thấy user ' + o.username);
    if (!roles_()[o.role]) throw new Error('Chức vụ không hợp lệ');
  }
  if (o.manager && String(o.manager).toLowerCase() === String(u['Username']).toLowerCase()) throw new Error('Cấp trên không thể là chính mình');
  if (!isNew && (u['Chức vụ'] !== o.role || String(u['Cấp trên'] || '') !== String(o.manager || ''))) u['Ngày đổi quyền'] = t;
  u['Họ tên'] = String(o.name || '').trim(); u['Chức vụ'] = o.role; u['Cấp trên'] = o.manager || '';
  u['Điện thoại'] = o.phone || ''; u['Email'] = o.email || ''; u['Ghi chú'] = o.note || '';
  u['Ngày sửa thông tin'] = t;
  saveTable_(ut);
  return { username: u['Username'] };
}
function adminsLeft_(ut, except) {
  var roles = roles_();
  return live_(ut).filter(function (r) { var ro = roles[String(r['Chức vụ'])]; return r['Username'] !== except && ro && ro.perms.QUAN_TRI_USER && userStatus_(r) === 'Hoạt động'; }).length;
}
function apiUserDelete(username) {
  var ut = readTable_('USER'), u = findUser_(ut, username);
  if (!u) throw new Error('Không tìm thấy user');
  if (String(u['Username']) === CTX.username) throw new Error('Không thể tự xóa chính mình');
  if (!adminsLeft_(ut, u['Username'])) throw new Error('Phải còn ít nhất 1 tài khoản quản trị đang hoạt động');
  u._deleted = true; saveTable_(ut);
  sysDel_(function (k, r) { return k.indexOf('S:') === 0 && String(r['Giá trị']).indexOf('"u":"' + u['Username'] + '"') >= 0; });
  return true;
}
function apiUserResetPw(username, pw) {
  checkPw_(pw);
  var ut = readTable_('USER'), u = findUser_(ut, username);
  if (!u) throw new Error('Không tìm thấy user');
  u['Salt'] = newSalt_(); u['Hash'] = hashPw_(u['Salt'], String(pw)); u['Ngày sửa thông tin'] = now_();
  saveTable_(ut); return true;
}
function apiUserStatus(username, status, days, reason) {
  if (USER_ST.indexOf(status) < 0) throw new Error('Trạng thái không hợp lệ');
  var ut = readTable_('USER'), u = findUser_(ut, username);
  if (!u) throw new Error('Không tìm thấy user');
  if (String(u['Username']) === CTX.username && status !== 'Hoạt động') throw new Error('Không thể tự khóa chính mình');
  if (status !== 'Hoạt động' && !adminsLeft_(ut, u['Username'])) throw new Error('Phải còn ít nhất 1 tài khoản quản trị đang hoạt động');
  u['Trạng thái'] = status; u['Ngày khóa/ban'] = now_(); u['Lý do khóa/ban'] = reason || '';
  if (status === 'Ban') {
    var d = Math.max(1, num_(days) || 1);
    u['Ban đến ngày'] = new Date(now_().getTime() + d * 86400000);
  } else u['Ban đến ngày'] = '';
  if (status === 'Hoạt động') u['Lý do khóa/ban'] = '';
  saveTable_(ut);
  if (status !== 'Hoạt động') sysDel_(function (k, r) { return k.indexOf('S:') === 0 && String(r['Giá trị']).indexOf('"u":"' + u['Username'] + '"') >= 0; });
  return true;
}
function apiLockSystem(on, password) {
  if (on) {
    if (String(password || '').length < 4) throw new Error('Mật khẩu khóa tối thiểu 4 ký tự');
    var salt = newSalt_();
    sysSet_('LOCK_SALT', salt); sysSet_('LOCK_HASH', hashPw_(salt, String(password))); sysSet_('LOCK', '1');
    sysSet_('LOCK_BY', CTX.username + ' – ' + Utilities.formatDate(now_(), tz_(), 'dd/MM/yyyy HH:mm'));
  } else { sysSet_('LOCK', '0'); sysSet_('LOCK_BY', ''); }
  return { locked: !!on };
}

/* ------------------------------ khách hàng ------------------------------ */
function apiSaveCustomer(o) {
  var t = readTable_('CUST'), now = now_(), row;
  var rows = live_(t);
  if (o['Mã KH']) row = rows.filter(function (r) { return String(r['Mã KH']) === String(o['Mã KH']); })[0];
  if (!row) {
    var max = 0; rows.forEach(function (r) { max = Math.max(max, num_(String(r['Mã KH']).replace('KH-', ''))); });
    row = { 'Mã KH': 'KH-' + ('00' + (max + 1)).slice(-3), 'Ngày tạo': now, 'Người tạo': CTX.username };
    t.rows.push(row);
  }
  if (!String(o['Họ tên'] || '').trim()) throw new Error('Nhập họ tên khách hàng');
  COLS.CUST.forEach(function (h) {
    if (['Mã KH', 'Ngày tạo', 'Người tạo', 'Ngày sửa', 'Số show đã book', 'Show thành công', 'Ngày book gần nhất'].indexOf(h) >= 0) return;
    if (FIN_FIELDS.indexOf(h) >= 0 && !can_('XEM_TAI_CHINH')) return;
    if (o[h] !== undefined) row[h] = o[h];
  });
  row['Ngày sửa'] = now;
  saveTable_(t);
  return { code: row['Mã KH'] };
}
function apiDeleteCustomer(code) {
  var t = readTable_('CUST'), n = 0;
  live_(t).forEach(function (r) { if (String(r['Mã KH']) === code) { r._deleted = true; n++; } });
  if (!n) throw new Error('Không tìm thấy khách hàng');
  saveTable_(t); return true;
}

/* ------------------------------ chiết khấu & duyệt ------------------------------ */
/** Gọi trong apiSaveShow: chỉ áp CK mới nếu nằm trong quyền người lưu; vượt quyền thì giữ CK cũ (phải xin duyệt) */
function discountOnSave_(row, s) {
  var cur = { pct: num_(row['Chiết khấu %']), status: String(row['Trạng thái CK'] || '') };
  if (s.discount === undefined || s.discount === null || s.discount === '') return cur;
  var want = Math.max(0, Math.min(100, num_(s.discount)));
  if (want === cur.pct) return cur;
  var max = CTX ? CTX.max : 100;
  if (want <= max) return { pct: want, status: want ? 'Trong quyền ' + (CTX ? CTX.role + ' (' + CTX.username + ')' : 'chủ sheet') : '' };
  return cur;
}
function setShowDiscount_(code, pct, status) {
  var t = readTable_('SHOW'), r = live_(t).filter(function (x) { return String(x['Mã show']) === code; })[0];
  if (!r) throw new Error('Không tìm thấy show ' + code);
  if (pct !== null) r['Chiết khấu %'] = pct;
  r['Trạng thái CK'] = status;
  saveTable_(t);
}
function usersPub_() { var roles = roles_(); return { roles: roles, users: live_(readTable_('USER')).map(function (r) { return userPub_(r, roles); }) }; }
function pendingLabel_(p, users) {
  if (p === HIGH) return HIGH;
  var u = users.filter(function (x) { return x.username === p; })[0];
  return u ? u.name + ' (' + u.role + ')' : p;
}
function apiDiscountRequest(code, pct, reason, urgent) {
  pct = Math.max(0, Math.min(100, num_(pct)));
  var who = CTX.name + ' (' + CTX.role + ')';
  if (pct <= CTX.max) { setShowDiscount_(code, pct, 'Trong quyền ' + CTX.role + ' (' + CTX.username + ')'); return { applied: true, pct: pct }; }
  var up = usersPub_();
  var pending = urgent ? HIGH : managerOf_(CTX.username, up.users, up.roles);
  if (!pending) pending = HIGH;
  var t = readTable_('DISC'), now = now_(), stamp = Utilities.formatDate(now, tz_(), 'dd/MM HH:mm');
  live_(t).forEach(function (r) {
    if (String(r['Mã show']) === code && String(r['Người xin']) === CTX.username && r['Trạng thái'] === 'Chờ duyệt') {
      r['Trạng thái'] = 'Đã hủy'; r['Lịch sử'] = String(r['Lịch sử'] || '') + '\n' + stamp + ' – tự hủy (gửi yêu cầu mới)';
    }
  });
  var id = 'CK-' + Utilities.formatDate(now, tz_(), 'yyMMddHHmmss') + '-' + Math.floor(Math.random() * 90 + 10);
  t.rows.push({ 'Mã yêu cầu': id, 'Mã show': code, 'Người xin': CTX.username, 'Chức vụ người xin': CTX.role, 'CK xin %': pct, 'Lý do': reason || '', 'Gấp': urgent ? 'GẤP' : '',
    'Đang chờ': pending, 'Trạng thái': 'Chờ duyệt', 'Lịch sử': stamp + ' – ' + who + ' xin ' + pct + '%' + (urgent ? ' (GẤP → Phó TGĐ trở lên)' : ' → ' + pendingLabel_(pending, up.users)),
    'Tạo lúc': now, 'Cập nhật lúc': now, 'IP': CTX.ip || '' });
  saveTable_(t);
  setShowDiscount_(code, null, 'Chờ duyệt ' + pct + '% – ' + pendingLabel_(pending, up.users));
  return { id: id, pending: pending, label: pendingLabel_(pending, up.users) };
}
function canDecide_(r, ctx) {
  if (ctx.owner || (ctx.perms && ctx.perms.QUAN_TRI_USER)) return true;
  var p = String(r['Đang chờ']);
  return p === ctx.username || (p === HIGH && ctx.level <= 3);
}
function apiDiscountDecide(id, decision, pct, note) {
  var t = readTable_('DISC'), r = live_(t).filter(function (x) { return String(x['Mã yêu cầu']) === id; })[0];
  if (!r) throw new Error('Không tìm thấy yêu cầu ' + id);
  if (r['Trạng thái'] !== 'Chờ duyệt') throw new Error('Yêu cầu đã xử lý: ' + r['Trạng thái']);
  if (!canDecide_(r, CTX)) throw new Error('Yêu cầu này không chờ bạn duyệt');
  var now = now_(), stamp = Utilities.formatDate(now, tz_(), 'dd/MM HH:mm'), who = CTX.name + ' (' + CTX.role + ')', code = String(r['Mã show']);
  var hist = function (s) { r['Lịch sử'] = String(r['Lịch sử'] || '') + '\n' + stamp + ' – ' + who + ' ' + s + (note ? ' – "' + note + '"' : ''); };
  if (decision === 'duyet') {
    var p = (pct === undefined || pct === null || pct === '') ? num_(r['CK xin %']) : Math.max(0, Math.min(100, num_(pct)));
    if (p > CTX.max) throw new Error('Vượt quyền của bạn (tối đa ' + CTX.max + '%). Hãy bấm "Chuyển lên cấp trên".');
    r['Trạng thái'] = 'Đã duyệt'; r['CK được duyệt %'] = p; r['Người duyệt'] = CTX.username; hist('DUYỆT ' + p + '%');
    setShowDiscount_(code, p, 'Đã duyệt ' + p + '% bởi ' + who);
  } else if (decision === 'tuchoi') {
    r['Trạng thái'] = 'Từ chối'; r['Người duyệt'] = CTX.username; hist('TỪ CHỐI');
    var st = readTable_('SHOW'), sr = live_(st).filter(function (x) { return String(x['Mã show']) === code; })[0];
    setShowDiscount_(code, null, 'Bị từ chối ' + r['CK xin %'] + '% – giữ CK ' + num_(sr && sr['Chiết khấu %']) + '%');
  } else if (decision === 'chuyen') {
    var up = usersPub_(), next = managerOf_(CTX.username, up.users, up.roles);
    if (!next || next === CTX.username) throw new Error('Không còn cấp trên để chuyển');
    r['Đang chờ'] = next; hist('chuyển lên ' + pendingLabel_(next, up.users));
    setShowDiscount_(code, null, 'Chờ duyệt ' + r['CK xin %'] + '% – ' + pendingLabel_(next, up.users));
  } else throw new Error('Quyết định không hợp lệ');
  r['Cập nhật lúc'] = now;
  saveTable_(t);
  return { id: id, status: r['Trạng thái'] };
}
function apiDiscountCancel(id) {
  var t = readTable_('DISC'), r = live_(t).filter(function (x) { return String(x['Mã yêu cầu']) === id; })[0];
  if (!r) throw new Error('Không tìm thấy yêu cầu');
  if (String(r['Người xin']) !== CTX.username && !can_('QUAN_TRI_USER')) throw new Error('Chỉ người xin hoặc quản trị mới hủy được');
  if (r['Trạng thái'] !== 'Chờ duyệt') throw new Error('Yêu cầu đã xử lý');
  r['Trạng thái'] = 'Đã hủy'; r['Cập nhật lúc'] = now_();
  r['Lịch sử'] = String(r['Lịch sử'] || '') + '\n' + Utilities.formatDate(now_(), tz_(), 'dd/MM HH:mm') + ' – ' + CTX.name + ' hủy yêu cầu';
  saveTable_(t);
  setShowDiscount_(String(r['Mã show']), null, 'Đã hủy yêu cầu ' + r['CK xin %'] + '%');
  return true;
}

/* ------------------------------ dữ liệu cho giao diện ------------------------------ */
function authBootstrap_() {
  var ctx = CTX || ownerCtx_();
  var roles = roles_(), allUsers = live_(readTable_('USER')).map(function (r) { return userPub_(r, roles); });
  var admin = ctx.owner || (ctx.perms && ctx.perms.QUAN_TRI_USER);
  var users = admin ? allUsers : allUsers.filter(function (u) { return u.status === 'Hoạt động'; }).map(function (u) {
    return { username: u.username, name: u.name, role: u.role, manager: u.manager, status: u.status, level: u.level, max: u.max, phone: u.phone, email: u.email };
  });
  var visible = admin ? allUsers : allUsers.filter(function (u) { return u.status === 'Hoạt động'; });
  users.forEach(function (u) { u.boss = managerOf_(u.username, allUsers, roles); u.parent = orgParent_(u.username, visible, roles); });
  var customers = [];
  if (can_('XEM_KHACH_HANG')) customers = live_(readTable_('CUST')).map(function (r) {
    var o = {}; COLS.CUST.forEach(function (h) { var v = r[h]; o[h] = Object.prototype.toString.call(v) === '[object Date]' ? dt2s_(v) : (v === null || v === undefined ? '' : v); });
    if (!can_('XEM_TAI_CHINH')) FIN_FIELDS.forEach(function (h) { o[h] = '🔒'; });
    return o;
  }).filter(function (o) { return o['Mã KH']; });
  var seeAll = admin || ctx.level <= 3;
  var discounts = live_(readTable_('DISC')).map(function (r) {
    return { id: String(r['Mã yêu cầu']), show: String(r['Mã show']), by: String(r['Người xin']), byRole: String(r['Chức vụ người xin']), pct: num_(r['CK xin %']),
      reason: String(r['Lý do'] || ''), urgent: !!r['Gấp'], pending: String(r['Đang chờ'] || ''), status: String(r['Trạng thái']), approved: num_(r['CK được duyệt %']),
      approver: String(r['Người duyệt'] || ''), history: String(r['Lịch sử'] || ''), created: dt2s_(r['Tạo lúc']), updated: dt2s_(r['Cập nhật lúc']),
      canDecide: r['Trạng thái'] === 'Chờ duyệt' && canDecide_(r, ctx) };
  }).filter(function (d) { return d.id && (seeAll || d.by === ctx.username || d.canDecide); }).reverse();
  var out = {
    me: { username: ctx.username, name: ctx.name, role: ctx.role, level: ctx.level, max: ctx.max, perms: ctx.perms, owner: !!ctx.owner, ip: ctx.ip || '' },
    roles: Object.keys(roles).map(function (k) { return roles[k]; }), users: users, customers: customers, discounts: discounts,
    perms: PERMS, permLabel: PERM_LABEL, finFields: FIN_FIELDS, high: HIGH, locked: isLocked_(), lockBy: sysGet_('LOCK_BY'), stats: visitStats_()
  };
  if (can_('XEM_NHAT_KY_HT')) {
    out.audit = live_(readTable_('AUDIT')).slice(-300).reverse().map(function (r) {
      return { t: dt2s_(r['Thời gian']), u: String(r['Username']), role: String(r['Chức vụ']), ip: String(r['IP']), a: String(r['Thao tác']), d: String(r['Chi tiết']), dev: String(r['Thiết bị']) };
    });
    out.visits = live_(readTable_('VISIT')).slice(-300).reverse().map(function (r) {
      return { t: dt2s_(r['Thời gian']), ip: String(r['IP']), u: String(r['Username']), dev: String(r['Thiết bị']), page: String(r['Trang']) };
    });
  }
  return out;
}

/** Ảnh chụp dữ liệu gửi về điện thoại – bỏ mật khẩu băm, phiên, và phần không có quyền xem */
function exportForClient_() {
  var keys = BACKUP_KEYS.filter(function (k) {
    if (k === 'SYS') return false;
    if (k === 'CUST' && !can_('XEM_KHACH_HANG')) return false;
    if ((k === 'AUDIT' || k === 'VISIT') && !can_('XEM_NHAT_KY_HT')) return false;
    return true;
  });
  var data = JSON.parse(exportBackup_(keys));
  var TRIM = {}; TRIM[SH.AUDIT] = 500; TRIM[SH.VISIT] = 500; TRIM[SH.LOG] = 1500;
  data.sheets.forEach(function (s) { var t = TRIM[s.n]; if (t && s.d.length > t + 1) s.d = [s.d[0]].concat(s.d.slice(-t)); });
  data.sheets.forEach(function (s) {
    var head = s.d[0].map(String);
    var drop = [];
    if (s.n === SH.USER) drop = ['Salt', 'Hash'];
    if (s.n === SH.CUST && !can_('XEM_TAI_CHINH')) drop = FIN_FIELDS;
    if (!drop.length) return;
    var idx = drop.map(function (h) { return head.indexOf(h); }).filter(function (i) { return i >= 0; });
    s.d = s.d.map(function (r, ri) { return r.map(function (v, j) { return ri > 0 && idx.indexOf(j) >= 0 ? (s.n === SH.CUST ? '🔒' : '') : v; }); });
  });
  data.locked = isLocked_();
  return JSON.stringify(data);
}
function apiSync() { return { at: new Date().getTime() }; }

/* ------------------------------ hướng dẫn mở máy chủ ------------------------------ */
function showServerGuide() {
  var html = '<div style="font-family:Arial,sans-serif;font-size:13.5px;line-height:1.6">' +
    '<b>Mở máy chủ để app điện thoại đồng bộ với Sheet này</b><ol>' +
    '<li>Tiện ích mở rộng → Apps Script → nút <b>Triển khai (Deploy)</b> → <b>Tùy chọn triển khai mới</b>.</li>' +
    '<li>Loại: <b>Ứng dụng web</b>. Thực thi dưới dạng: <b>Tôi</b>. Người có quyền truy cập: <b>Bất kỳ ai</b>.</li>' +
    '<li>Bấm Triển khai → cấp quyền → sao chép <b>URL ứng dụng web</b> (đuôi /exec).</li>' +
    '<li>Trên app (điện thoại/máy tính): màn hình đăng nhập → ⚙ Máy chủ → dán URL → Lưu.</li></ol>' +
    'Mỗi khi sửa code: Triển khai → Quản lý triển khai → ✏️ → Phiên bản mới (URL giữ nguyên).</div>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(520).setHeight(300), '🌐 Máy chủ cho app điện thoại');
}
