QUẢN LÝ THIẾT BỊ PRO – app (PWA), phiên bản 3 (10/2026)

Thư mục gốc (GitHub Pages: https://pmhoang88.github.io/FSL/):
  index.html, sw.js, manifest.webmanifest, icon-*.png  → app điện thoại / máy tính, chạy được KHÔNG CẦN MẠNG.

Thư mục server/ (Google Apps Script – KHÔNG chạy trên GitHub Pages):
  Code.gs, Auth.gs, Images.gs, App.html → dán vào Tiện ích mở rộng → Apps Script của Google Sheet.
  Triển khai → Ứng dụng web (Thực thi: Tôi; Truy cập: Bất kỳ ai) → lấy URL /exec.
  Dán URL /exec vào biến window.QLTB_SERVER trong index.html (hoặc trong app: ⚙ Máy chủ).

Cách dùng trên iPhone: mở link bằng Safari → Chia sẻ → Thêm vào MH chính. Đăng nhập lần đầu khi có mạng.

Cập nhật: mỗi lần sửa index.html đổi số phiên bản trong sw.js (qltb-pro-v3 → v4) để điện thoại tải bản mới.

Lưu ý: các đơn giá, số serial, ngày tháng, tình trạng thiết bị trong dữ liệu mẫu là GIẢ ĐỊNH để chạy thử.
Mật khẩu chỉ lưu dạng băm. Đổi mật khẩu mặc định sau lần đăng nhập đầu tiên.
