# 🚀 TÀI LIỆU HƯỚNG DẪN CÀI ĐẶT VÀ VẬN HÀNH HỆ THỐNG FURNISHOP

## I. TỔNG QUAN VỀ HỆ THỐNG

Hệ thống **FurniShop** là nền tảng thương mại điện tử chuyên ngành nội thất, được phát triển theo kiến trúc Microservices/Monorepo phân rã với các thành phần chính:
1. **Database & Services Container**: Đóng gói cơ sở dữ liệu PostgreSQL 16 (tích hợp tiện ích `pgvector` cho tìm kiếm AI) và pgAdmin 4 thông qua Docker.
2. **Backend Service (`backend`)**: Phát triển trên nền tảng **NestJS** (Node.js framework), TypeORM, kết nối cơ sở dữ liệu, quản lý chứng thực JWT, phân quyền, xử lý đơn hàng, nhập/xóa kho, tích hợp thanh toán (VNPay, MoMo), trí tuệ nhân tạo (Gemini AI) và tải ảnh (Cloudinary).
3. **Frontend Admin (`frontend`)**: Ứng dụng Web quản trị xây dựng bằng **React 19 + TypeScript + Vite + Redux Toolkit + TailwindCSS**, dành cho quản trị viên và nhân viên.
4. **Frontend User (`frontendUser`)**: Ứng dụng Web dành cho khách hàng xây dựng bằng **React 19 + TypeScript + Vite + Redux Toolkit + GSAP + TailwindCSS**, tối ưu trải nghiệm người dùng và hoạt họa hiệu ứng.

---

## II. YÊU CẦU MÔI TRƯỜNG TIỀN ĐỀ (PREREQUISITES)

Để hệ thống vận hành mượt mà, máy tính cài đặt cần chuẩn bị các phần mềm sau:

1. **Node.js**: Phiên bản `20.x` trở lên (Khuyên dùng phiên bản LTS `v20.x` hoặc `v22.x`).
2. **npm**: Đi kèm theo Node.js (phiên bản `>= 10.x`).
3. **Docker Desktop**: Đã cài đặt và đang chạy dịch vụ Docker Engine.
4. **Git**: Công cụ quản lý mã nguồn phiên bản.
5. **Trình duyệt Web**: Google Chrome, Microsoft Edge hoặc Mozilla Firefox bản mới nhất.

---

## III. QUY TRÌNH CÀI ĐẶT CHI TIẾT THEO TỪNG BƯỚC

### BƯỚC 1: KHỞI CHẠY CƠ SỞ DỮ LIỆU VÀ CONTAINER (DOCKER)

1. Mở cửa sổ Dòng lệnh (Terminal / PowerShell / Command Prompt) tại thư mục gốc của dự án `doantotnghiep`.
2. Khởi chạy các container bằng lệnh Docker Compose:

```bash
# Khởi chạy container PostgreSQL (pgvector) và pgAdmin chạy ẩn dưới nền
docker compose up -d
```

3. **Thông số kết nối Cơ sở dữ liệu mặc định:**
   - **Host:** `localhost`
   - **Cổng kết nối (Port):** `5433` (Được ánh xạ từ cổng 5432 nội bộ container)
   - **Tên Database:** `furnishop`
   - **Tài khoản DB:** `postgres`
   - **Mật khẩu DB:** `password123`
   - **Trang quản trị pgAdmin:** `http://localhost:5050` *(Email: `admin@furnishop.com` | Password: `admin`)*

---

### BƯỚC 2: CẤU HÌNH VÀ KHỞI CHẠY BACKEND SERVICE (NESTJS)

1. Mở cửa sổ Terminal mới và di chuyển vào thư mục `backend`:

```bash
# Di chuyển tới thư mục mã nguồn Backend
cd backend
```

2. Tạo file cấu hình môi trường `.env` từ file mẫu `.env.example`:

```bash
# Tạo bản sao từ file cấu hình mẫu .env.example thành .env
cp .env.example .env
```

3. **Danh sách và giải thích chi tiết các biến môi trường trong file `.env`:**

| Tên biến môi trường | Giá trị mặc định / Mẫu | Giải thích chức năng |
| :--- | :--- | :--- |
| `PORT` | `3000` | Cổng hoạt động của dịch vụ API Backend |
| `DB_TYPE` | `postgres` | Loại cơ sở dữ liệu sử dụng |
| `DB_HOST` | `localhost` | Địa chỉ máy chủ cơ sở dữ liệu |
| `DB_PORT` | `5433` | Cổng truy cập PostgreSQL trên máy host |
| `DB_USERNAME` | `postgres` | Tên người dùng kết nối Database |
| `DB_PASSWORD` | `password123` | Mật khẩu truy cập Database |
| `DB_DATABASE` | `furnishop` | Tên cơ sở dữ liệu chính |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:5174` | Danh sách domain Frontend được phép gọi API |
| `JWT_SECRET` | `chuoi_khoa_bao_mat_jwt` | Mã bí mật ký và xác thực Access Token |
| `JWT_REFRESH_SECRET` | `chuoi_khoa_bao_mat_refresh_token` | Mã bí mật ký Refresh Token gia hạn đăng nhập |
| `GOOGLE_CLIENT_ID` | `Client_ID_tu_Google_Console` | ID ứng dụng Đăng nhập bằng Google OAuth2 |
| `GOOGLE_CLIENT_SECRET` | `Client_Secret_tu_Google` | Mã bí mật Google OAuth2 |
| `CLOUDINARY_CLOUD_NAME` | `ten_cloud_name` | Tên tài khoản lưu trữ hình ảnh Cloudinary |
| `CLOUDINARY_API_KEY` | `api_key_cloudinary` | Khóa API truy cập Cloudinary |
| `CLOUDINARY_API_SECRET` | `api_secret_cloudinary` | Mã bí mật API Cloudinary |
| `GEMINI_API_KEY` | `api_key_google_gemini` | Khóa API Trí tuệ nhân tạo Gemini AI |
| `VNPAY_TMN_CODE` | `tmn_code_vnpay` | Mã Website tích hợp tại cổng thanh toán VNPay |
| `VNPAY_HASH_SECRET` | `hash_secret_vnpay` | Chuỗi bí mật tạo chữ ký số checksum VNPay |
| `MOMO_PARTNER_CODE` | `partner_code_momo` | Mã đối tác tích hợp cổng thanh toán MoMo |

4. Cài đặt các gói phụ thuộc (Dependencies):

```bash
# Cài đặt tất cả các thư viện phụ thuộc cho ứng dụng Backend
npm install
```

5. Khởi chạy ứng dụng Backend ở chế độ phát triển (Development):

```bash
# Khởi chạy máy chủ Backend ở chế độ tự động cập nhật khi có thay đổi code
npm run start:dev
```

*Máy chủ Backend sẽ lắng nghe kết nối tại: `http://localhost:3000`*

---

### BƯỚC 3: CẤU HÌNH VÀ KHỞI CHẠY FRONTEND ADMIN (TRANG QUẢN TRỊ)

1. Mở cửa sổ Terminal mới và di chuyển vào thư mục `frontend`:

```bash
# Di chuyển tới thư mục giao diện Quản trị viên
cd frontend
```

2. Cài đặt các thư viện phụ thuộc:

```bash
# Cài đặt các gói thư viện giao diện Admin
npm install
```

3. Khởi chạy ứng dụng Frontend Admin ở chế độ phát triển:

```bash
# Khởi chạy máy chủ phát triển Vite cho giao diện Admin
npm run dev
```

*Giao diện Admin sẽ khả dụng tại địa chỉ: `http://localhost:5173`*

---

### BƯỚC 4: CẤU HÌNH VÀ KHỞI CHẠY FRONTEND USER (TRANG KHÁCH HÀNG)

1. Mở cửa sổ Terminal mới và di chuyển vào thư mục `frontendUser`:

```bash
# Di chuyển tới thư mục giao diện Khách hàng
cd frontendUser
```

2. Cài đặt các thư viện phụ thuộc:

```bash
# Cài đặt các gói thư viện giao diện Khách hàng
npm install
```

3. Khởi chạy ứng dụng Frontend User ở chế độ phát triển:

```bash
# Khởi chạy máy chủ phát triển Vite cho giao diện Cửa hàng Khách hàng
npm run dev
```

*Giao diện Cửa hàng dành cho Khách hàng sẽ khả dụng tại địa chỉ: `http://localhost:5174`*

---

## IV. BẢNG TỔNG HỢP ĐƯỜNG DẪN TRUY CẬP HỆ THỐNG

Sau khi khởi chạy đầy đủ các bước trên, toàn bộ các thành phần của hệ thống sẽ sẵn sàng hoạt động tại các địa chỉ sau:

| Thành phần hệ thống | Địa chỉ truy cập (URL) | Mục đích sử dụng |
| :--- | :--- | :--- |
| **Giao diện Khách hàng (User Web)** | `http://localhost:5174` | Mua sắm, xem sản phẩm, tìm kiếm AI, đặt hàng, đánh giá |
| **Giao diện Quản trị (Admin Web)** | `http://localhost:5173` | Quản lý kho, sản phẩm, đơn hàng, bảo hành, thống kê |
| **Backend REST API Server** | `http://localhost:3000` | Máy chủ xử lý dữ liệu và logic nghiệp vụ |
| **Tài liệu API (Swagger UI)** | `http://localhost:3000/api` | Xem và thử nghiệm các điểm cuối API của hệ thống |
| **Trang quản trị Database (pgAdmin)** | `http://localhost:5050` | Xem bảng dữ liệu, chạy câu lệnh SQL trực tiếp |

---

## V. HƯỚNG DẪN XỬ LÝ SỰ CỐ VÀ LỖI THƯỜNG GẶP (TROUBLESHOOTING)

### 1. Lỗi xung đột cổng truy cập (Port In Use)
- **Hiện tượng:** Xuất hiện thông báo lỗi `EADDRINUSE: address already in use :::3000` hoặc `:::5433`.
- **Khắc phục:** 
  - Kiểm tra xem có ứng dụng hoặc phiên bản Terminal nào khác đang chạy chiếm dụng cổng đó hay không.
  - Sử dụng lệnh kiểm tra cổng trên Windows:
    ```powershell
    # Kiểm tra tiến trình đang chiếm cổng 3000
    netstat -ano | findstr :3000
    
    # Buộc dừng tiến trình chiếm cổng theo PID tìm được
    taskkill /PID <PID_NUMBER> /F
    ```

### 2. Lỗi kết nối Cơ sở dữ liệu (Database Connection Refused)
- **Hiện tượng:** Backend báo lỗi `Cannot connect to Postgres database` khi khởi chạy.
- **Khắc phục:**
  - Kiểm tra Docker Container đã được khởi chạy chưa bằng lệnh: `docker ps`.
  - Đảm bảo tham số `DB_PORT` trong file `.env` của Backend được thiết lập đúng là `5433` (cổng ánh xạ của Docker).

### 3. Lỗi CORS (Cross-Origin Resource Sharing)
- **Hiện tượng:** Trình duyệt ngăn chặn Frontend gọi API sang Backend với thông báo `Access-Control-Allow-Origin`.
- **Khắc phục:** 
  - Kiểm tra biến `CORS_ORIGINS` trong file `.env` của Backend đã bao gồm đầy đủ cả 2 URL `http://localhost:5173` và `http://localhost:5174` chưa.
  - Khởi động lại ứng dụng Backend sau khi sửa file `.env`.

### 4. Lỗi thiếu gói thư viện hoặc Cache Node Modules
- **Hiện tượng:** Xuất hiện lỗi `Module not found` hoặc lỗi không tương thích phiên bản.
- **Khắc phục:** Xóa thư mục `node_modules` cùng file `package-lock.json` rồi thực hiện cài đặt lại:
  ```bash
  # Xóa sạch thư mục thư viện cũ và cài đặt lại
  rm -rf node_modules package-lock.json
  npm install
  ```

---

*Tài liệu được lập ngày 10 tháng 08 năm 2026 cho Dự án Luận văn Tốt nghiệp Hệ thống Thương mại Điện tử Nội thất FurniShop.*
