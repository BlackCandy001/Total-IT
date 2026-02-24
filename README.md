# Tính Điểm IT - Browser Extension

Tiện ích mở rộng trình duyệt giúp sinh viên quản lý và tính điểm các môn học một cách trực quan, chuyên nghiệp. Hỗ trợ tính điểm đạt/không đạt dựa trên kết quả cuối cùng và xuất báo cáo Excel đẹp mắt.

## 🌟 Tính năng nổi bật

- **Quản lý đa môn học**: Thêm và quản lý nhiều môn học cùng lúc trong một giao diện duy nhất.
- **Giao diện hiện đại**: Thiết kế Dark Mode chuyên nghiệp, thân thiện, hỗ trợ thanh cuộn mượt mà.
- **Chỉ số trực quan**: Sử dụng các chấm màu (Xanh/Đỏ/Xám) để biểu thị trạng thái Đạt/Không đạt thay cho văn bản thuần túy.
- **Logic tính toán thông minh**: Trạng thái tổng hợp của môn học được tự động tính dựa trên điểm số mới nhất mà bạn đã nhập.
- **Xuất Excel chuyên nghiệp (.xls)**:
  - Báo cáo chi tiết đầy đủ các môn.
  - Tự động lọc và tạo bảng tổng hợp các môn chưa đạt để dễ dàng theo dõi.
  - Định dạng có màu sắc, border và layout đẹp mắt, sẵn sàng để in ấn hoặc trình bày.
- **Hỗ trợ Sidebar**: Tích hợp hoàn hảo với thanh bên (Sidebar) của trình duyệt Firefox.

## 🛠 Cấu trúc dự án

```text
├── manifest.json      # File cấu hình Extension (Manifest V3)
├── index.html         # Giao diện chính của tiện ích
├── style.css          # Định dạng stylesheet (Dark Mode, layout)
├── popup.js           # Xử lý logic nghiệp vụ và xuất Excel
├── icon-16.png        # Biểu tượng 16x16
├── icon-48.png        # Biểu tượng 48x48
└── icon-128.png       # Biểu tượng 128x128
```

## 🚀 Hướng dẫn cài đặt

### Trên Firefox

1. Truy cập `about:debugging#/runtime/this-firefox`.
2. Nhấn nút **Load Temporary Add-on...**.
3. Chọn file `manifest.json` trong thư mục dự án.

### Trên Chrome / Edge

1. Truy cập `chrome://extensions/`.
2. Bật **Developer mode** (Chế độ cho nhà phát triển).
3. Nhấn **Load unpacked** (Tải tiện ích đã giải nén).
4. Chọn thư mục chứa dự án này.

## 📝 Hướng dẫn sử dụng

1. Mở tiện ích từ thanh công cụ hoặc thanh bên.
2. Chọn tên môn học từ danh sách hoặc nhập tên môn tùy chỉnh.
3. Nhập điểm vào các ô (1, 2, 3). Các chấm màu sẽ thay đổi dựa trên điểm số (>= 4.5 là Đạt).
4. Nhấn **Xuất Excel** để tải về báo cáo định dạng chuyên nghiệp.

## 📄 Bản quyền

Dự án được phát triển nhằm hỗ trợ sinh viên IT trong việc quản lý học tập.
