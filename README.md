# Tính Điểm IT - Browser Extension

Tiện ích mở rộng trình duyệt giúp sinh viên quản lý và tính điểm các môn học một cách trực quan, chuyên nghiệp. Hỗ trợ tính điểm đạt/không đạt dựa trên kết quả cuối cùng và xuất báo cáo Excel đẹp mắt.

## 🌟 Tính năng nổi bật

- **Quản lý đa môn học**: Thêm và quản lý nhiều môn học cùng lúc trong một giao diện duy nhất.
- **Tìm kiếm thông minh**: Thanh tìm kiếm môn học tích hợp ngay trên tiêu đề giúp lọc nhanh danh sách môn học.
- **Giao diện hiện đại**: Thiết kế Dark Mode chuyên nghiệp, thân thiện, hỗ trợ thanh cuộn mượt mà và nút "Lên đầu trang".
- **Chỉ số trực quan**: Sử dụng các chấm màu (Xanh/Đỏ/Xám) để biểu thị trạng thái Đạt/Không đạt thay cho văn bản thuần túy.
- **Logic tính toán thông minh**: Trạng thái tổng hợp của môn học được tự động tính dựa trên điểm số (>= 40 là Đạt).
- **Xuất Excel chuyên nghiệp (.xls)**:
  - Báo cáo chi tiết đầy đủ các môn.
  - Tự động lọc và tạo bảng tổng hợp các môn chưa đạt để dễ dàng theo dõi.
  - Định dạng có màu sắc, border và layout đẹp mắt, sẵn sàng để in ấn hoặc trình bày.
- **Hỗ trợ Sidebar**: Tích hợp hoàn hảo với thanh bên (Sidebar) của trình duyệt Firefox.

## 🛠 Cấu trúc dự án

```text
├── manifest.json      # File cấu hình Extension (Manifest V3)
├── background.js      # Script chạy nền để khởi tạo extension (Chrome)
├── index.html         # Giao diện chính của tiện ích
├── style.css          # Định dạng stylesheet (Dark Mode, layout)
├── popup.js           # Xử lý logic nghiệp vụ và xuất Excel
├── icon-16.png        # Biểu tượng 16x16
├── icon-48.png        # Biểu tượng 48x48
└── icon-128.png       # Biểu tượng 128x128
```

## 🚀 Hướng dẫn cài đặt

Tải dự án này về: Git clone https://github.com/BlackCandy001/Total-IT.git

Hoặc dowloand zip về r giải nén.

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

Tiện ích hỗ trợ 3 cách lấy và quản lý điểm số:

### 1. Nhập thủ công

- Mở tiện ích từ thanh công cụ hoặc thanh bên.
- Chọn tên môn học từ danh sách có sẵn hoặc chọn **"Khác..."** để tự nhập tên môn mới.
- Nhập điểm vào các ô tương ứng với từng lần thi (Lần 1, 2, 3). Các chấm màu sẽ thay đổi tự động (>= 40 là **Đạt**).

### 2. Tự động lấy điểm từ Gmail (Từng email)

- Khi bạn mở một email có tiêu đề như _"Kết quả thi môn..."_, extension sẽ tự động quét nội dung và lưu điểm vào danh sách.
- Một thông báo (Toast) màu xanh sẽ hiển thị ở góc màn hình khi dữ liệu được lưu thành công.

### 3. Quét hàng loạt (Bulk Scan)

- Truy cập vào danh sách email trên [Gmail](https://mail.google.com).
- Mở menu extension và nhấn nút **"Quét nhanh Gmail"**.
- Extension sẽ quét tất cả các email có tiêu đề liên quan đến kết quả thi đang hiển thị trên trang hiện tại và tự động cập nhật điểm số cho tất cả các môn đó.
- _Lưu ý:_ Nếu gặp thông báo lỗi "Không tìm thấy mã ik", hãy thử mở một email điểm bất kỳ, đợi 1 giây rồi quay lại danh sách email để thử lại. Hoặc loand lại toàn hộ trang email rồi thử lại.

* Extension chỉ quét được những email mà trang đó đang hiển thị! Nếu các email điểm số nằm ở các trang khác nhau thì có thể next resoults qua trang tiếp theo rồi quét tiếp.

### 4. Quản lý và Xuất báo cáo

- Sử dụng thanh tìm kiếm để lọc nhanh danh sách môn học.
- Nhấn nút **"Dọn dẹp"** để xóa toàn bộ dữ liệu nếu cần.
- Nhấn **"Xuất Excel"** để tải về báo cáo định dạng chuyên nghiệp, bao gồm bảng tổng hợp các môn chưa đạt để tiện theo dõi.

## 📄 Bản quyền

Dự án được phát triển nhằm hỗ trợ sinh viên IT trong việc quản lý học tập.

---

**Tác giả:** Black Candy 🍫
