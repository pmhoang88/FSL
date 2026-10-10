QLTB PRO – app (PWA)
1) Đưa toàn bộ file trong thư mục này lên GitHub Pages (hoặc web tĩnh bất kỳ có https).
2) Mở link bằng Safari trên iPhone → Chia sẻ → Thêm vào MH chính.
3) Đăng nhập lần đầu khi có mạng. Muốn đồng bộ với Google Sheet: màn hình đăng nhập → ⚙ Máy chủ → dán URL ứng dụng web Apps Script (đuôi /exec).
   Hoặc sửa sẵn trong index.html dòng: window.QLTB_SERVER = '...';
Mỗi lần cập nhật index.html: đổi số trong sw.js (qltb-pro-v2 → v3) để điện thoại tải bản mới.
