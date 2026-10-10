QUẢN LÝ THIẾT BỊ PRO – app (PWA), phiên bản 4 (10/2026)

Thư mục gốc (GitHub Pages: https://pmhoang88.github.io/FSL/):
  index.html, sw.js, manifest.webmanifest, icon-*.png  → app điện thoại / máy tính, chạy được KHÔNG CẦN MẠNG.

Thư mục server/ (Google Apps Script – KHÔNG chạy trên GitHub Pages):
  Code.gs, Auth.gs, Images.gs, App.html → dán vào Tiện ích mở rộng → Apps Script của Google Sheet.
  Triển khai → Ứng dụng web (Thực thi: Tôi; Truy cập: Bất kỳ ai) → lấy URL /exec.
  Dán URL /exec vào biến window.QLTB_SERVER trong index.html (hoặc trong app: ⚙ Máy chủ).

Bản 6: tài khoản nhân sự (tên không dấu, mật khẩu mặc định 123456, đều hoạt động) đúng sơ đồ tổ chức; nhân sự có Phương Anh & Thuý;
phân công giả định kỹ thuật cho mỗi show; giá thuê cập nhật; bộ lọc nhân sự theo bộ phận / kho; popup show có khối chiết khấu & chính sách;
tab Tiến độ show (mọi người xem, cấp Sales trở lên cập nhật %/việc tiếp theo); biểu đồ thống kê; nút EN/VI (phủ tab, menu đầu trang, thống kê, tiến độ – phần còn lại tiếng Việt);
avatar vuông có biểu tượng cấp bên trái tên. Chưa làm: dịch toàn bộ giao diện, hồ sơ liên hệ nhân viên & khách Minh Tấn (SĐT, công ty, MST).
Bản 5: nền tối mặc định; nút Aa để chỉnh cỡ chữ (mặc định to hơn trên điện thoại); tên công ty FSL – Fantasies Show Light;
mã ưu đãi STAGEPRO giảm 100% (chỉ CEO nhập); show diễn từ 2 ngày liên tiếp giảm 50% tự động (có ô Ngày diễn cuối);
trạng thái On Hold tự gán cho show nước ngoài; tiền phạt & chi phí theo show; tab Thống kê (tuần/tháng/quý/nửa năm/năm/tùy chọn);
xe công ty (Phó giám đốc trở lên, Sales khi doanh số 12 tháng ≥ 10 tỷ); biểu tượng cấp bậc A/B/C/D trên sơ đồ tổ chức.
Chưa làm: chuyển ngôn ngữ Anh/Việt.
Bản 4: nhân sự phụ trách (kỹ thuật âm thanh/ánh sáng, setup AV, kho), vận chuyển gắn với show (xe tải 3 ngày, máy bay chốt 20:00 hôm trước),
từ 2 kho (Hà Nội ~80%, TP.HCM ~20%), popup chi tiết theo show có cập nhật giá, nhật ký giá, ghi chú thay đổi cho Giám đốc trở lên, CEO cập nhật giá hàng loạt.

Cách dùng trên iPhone: mở link bằng Safari → Chia sẻ → Thêm vào MH chính. Đăng nhập lần đầu khi có mạng.

Cập nhật: mỗi lần sửa index.html đổi số phiên bản trong sw.js (hiện là qltb-pro-v6; bản sau dùng v7) để điện thoại tải bản mới.

Lưu ý: các đơn giá, số serial, ngày tháng, tình trạng thiết bị trong dữ liệu mẫu là GIẢ ĐỊNH để chạy thử.
Mật khẩu chỉ lưu dạng băm. Đổi mật khẩu mặc định sau lần đăng nhập đầu tiên.
