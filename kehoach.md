# 🛋️ KẾ HOẠCH DỰ ÁN LUẬN VĂN TỐT NGHIỆP — E-COMMERCE ĐỒ NỘI THẤT (FURNISHOP)

> **Mô hình Kiến trúc:** Monolithic (NestJS Backend + React SPA Frontend)
> **Điểm nhấn Công nghệ:** Tích hợp Trí tuệ Nhân tạo (AI) - LLM & Vector Database
> **Thời gian thực hiện dự kiến:** 16 tuần (4 tháng / 8 Sprints)
> **Mục tiêu:** Hoàn thiện báo cáo và bảo vệ thành công Luận văn tốt nghiệp xuất sắc.

---

## 1. TỔNG QUAN DỰ ÁN

| Hạng mục | Chi tiết |
|---|---|
| Tên dự án | **FurniShop** — Nền tảng thương mại điện tử chuyên đồ nội thất tích hợp AI |
| Mục tiêu kinh doanh | Cung cấp trải nghiệm mua sắm nội thất trực quan, tiện lợi với sự hỗ trợ của Trí tuệ Nhân tạo giúp tối ưu hóa quy trình tìm kiếm và tư vấn. |
| Đối tượng khách hàng | Khách hàng cá nhân (B2C) có nhu cầu trang trí nhà cửa, mua sắm đồ gỗ, sofa, giường tủ... |
| Output luận văn | 1 Website hoàn chỉnh, 1 Source Code, 1 Quyển báo cáo đồ án |

---

## 2. PHẠM VI VÀ YÊU CẦU HỆ THỐNG

### 2.1. Phạm vi dự án (Scope)
* **In-scope (Sẽ thực hiện):** Quản lý sản phẩm nội thất, giỏ hàng, thanh toán online (VNPAY/Momo), đánh giá sản phẩm. **Đặc biệt: Tích hợp 3 tính năng AI (Chatbot tư vấn, Tìm kiếm bằng hình ảnh, Sinh mô tả tự động).**
* **Out-of-scope (Không làm):** Chat giữa user-user, Mạng xã hội nội thất, Thực tế ảo (AR) thử nội thất.

### 2.2. Yêu cầu chức năng (Functional Requirements)

**✨ Nhóm tính năng Trí tuệ Nhân tạo (AI Core):**
- **Trợ lý Ảo Tư vấn (AI Chatbot):** Hộp thoại chat hỗ trợ khách hàng phối màu, chọn nội thất phù hợp với diện tích và phong cách nhà (Sử dụng Gemini API).
- **Tìm kiếm bằng hình ảnh (Visual Search):** Khách hàng tải ảnh lên, hệ thống trả về các sản phẩm có hình dáng, màu sắc tương tự đang bán tại Shop.
- **Tạo mô tả sản phẩm tự động (Generative AI):** Dành cho Admin. Nhập vài từ khóa, hệ thống tự động viết bài mô tả sản phẩm dài, văn phong thu hút và chuẩn SEO.

**👤 Đối với Người dùng (Customer):**
- Đăng ký / Đăng nhập / Xác thực Email.
- Duyệt sản phẩm, phân trang.
- Lọc và tìm kiếm nâng cao (Khoảng giá, chất liệu, kích thước).
- Giỏ hàng và Thanh toán (COD / VNPAY).
- Theo dõi đơn hàng, Lịch sử mua hàng, Đánh giá sao.

**🛠️ Đối với Quản trị viên (Admin):**
- Dashboard thống kê (Doanh thu, số lượng đơn).
- Quản lý Sản phẩm, Danh mục, Biến thể (Variants).
- Quản lý Đơn hàng (Cập nhật trạng thái).
- Quản lý Khuyến mãi (Mã giảm giá).

### 2.3. Yêu cầu phi chức năng (Non-functional Requirements)
- **Hiệu năng:** Điểm Lighthouse Frontend > 80. API tìm kiếm Vector Search phản hồi dưới 1 giây.
- **Bảo mật:** Chống XSS, CSRF. Mật khẩu mã hóa Bcrypt. HttpOnly Cookie cho Token.
- **Trải nghiệm UX/UI:** Thiết kế Mobile-first, giao diện chat AI mượt mà.

---

## 3. LÝ DO CHỌN CÔNG NGHỆ VÀ KIẾN TRÚC

### 3.1. Frontend (React 18 + TypeScript)
- **React 18 & TypeScript:** Quản lý state tốt, bắt lỗi compile-time. Redux Toolkit để quản lý giỏ hàng/phiên đăng nhập.
- **Tailwind CSS + shadcn/ui:** Phát triển UI tốc độ cao, giao diện hiện đại, chuyên nghiệp.

### 3.2. Backend & Database (NestJS + PostgreSQL + pgvector)
- **NestJS:** Cấu trúc Modular, Clean Architecture lý tưởng cho luận văn.
- **PostgreSQL & pgvector:** RDBMS cực mạnh mẽ. Sử dụng extension **`pgvector`** để lưu trữ các Vector nhúng (Embeddings) của hình ảnh, phục vụ cho tính năng Visual Search - Đây là điểm nhấn công nghệ ăn điểm tuyệt đối của đồ án.
- **Gemini API / OpenAI API:** Tích hợp trực tiếp vào Backend để làm Chatbot tư vấn bằng ngôn ngữ tự nhiên và Sinh văn bản tự động.

---

## 4. THIẾT KẾ DATABASE ĐẶC THÙ (Dự kiến)

Sử dụng PostgreSQL kết hợp Vector DB:

```sql
- users (id, email, password_hash, name, phone, role, status)
- categories (id, name, slug, image_url)
- products (id, sku, name, slug, description, category_id, base_price, is_active, created_at, deleted_at)
  * product_details (product_id, dimensions, weight, material, warranty_time, assembly_required)
- product_variants (id, product_id, sku, color, size, stock, price_adjustment)
- product_images (id, product_id, variant_id, image_url, is_primary)
  * image_embeddings (image_id, embedding_vector VECTOR(512)) -- Bảng lưu Vector dùng cho Visual Search
- orders (id, user_id, total_amount, status, payment_method, shipping_address)
- order_items (id, order_id, product_variant_id, quantity, unit_price)
- reviews (id, user_id, product_id, rating, comment)
```

---

## 5. QUY TRÌNH LÀM VIỆC & CI/CD

- **Gitflow Workflow:** `main` (Production) <- `develop` (Staging) <- `feature/*` (Dev nhánh nhỏ).
- **CI/CD Pipeline (GitHub Actions):** Tự động Linter, Type Check, Unit Test khi mở Pull Request. Tự động deploy khi merge vào `main`.

---

## 6. KẾ HOẠCH THỰC THI THEO SPRINT (16 Tuần = 8 Sprints)

Mỗi Sprint 2 tuần.

### 🚩 Sprint 1: Khởi tạo & Định hình Kiến trúc (Tuần 1-2)
- Vẽ ERD Database. Setup Repo, Docker, GitHub Actions.
- Backend: Khởi tạo NestJS, TypeORM, setup `pgvector`.
- Frontend: Setup Vite React, Tailwind, shadcn.

### 🚩 Sprint 2: Xác thực User & Phân quyền (Tuần 3-4)
- API Đăng nhập, Đăng ký, JWT Auth Guard.
- Dựng UI Login/Register, Redux Auth State.
- *Ghi chú: Tạm thời bỏ qua tính năng Gửi mã OTP xác thực Email (để chống Email rác) do ưu tiên tiến độ. Sẽ bổ sung nếu còn dư thời gian ở cuối dự án.*

### 🚩 Sprint 3: Quản lý Sản phẩm & AI Auto-Description (Tuần 5-6)
- API CRUD Sản phẩm, Danh mục. Upload ảnh lên Cloudinary.
- **Tích hợp AI 1:** Tích hợp Gemini API vào CMS. Xây dựng nút "Tạo mô tả tự động".
- UI Admin quản lý Sản phẩm.

### 🚩 Sprint 4: Visual Search & Trải nghiệm xem sản phẩm (Tuần 7-8)
- **Tích hợp AI 2 (Visual Search):** Xây dựng pipeline biến đổi ảnh tải lên thành Vector (Embeddings) lưu vào Postgres. Làm API tìm kiếm ảnh tương đồng (Vector similarity search).
- UI Trang danh sách sản phẩm, chi tiết sản phẩm. Ô upload hình ảnh để tìm kiếm.

### 🚩 Sprint 5: Giỏ hàng & Đặt hàng (Tuần 9-10) -> **ĐẠT MVP CƠ BẢN**
- API Giỏ hàng, Tạo đơn hàng, Trừ tồn kho.
- UI Giỏ hàng, Trang thanh toán Checkout COD.

### 🚩 Sprint 6: Trợ lý AI Chatbot & Thanh toán Online (Tuần 11-12)
- Tích hợp cổng thanh toán VNPAY/Momo.
- **Tích hợp AI 3 (AI Chatbot):** Thiết kế API chat dùng kỹ thuật RAG (đẩy data sản phẩm vào context cho LLM).
- UI Box chat tư vấn nổi trên màn hình cho Khách hàng.

### 🚩 Sprint 7: Quản trị Đơn hàng & Dashboard (Tuần 13-14)
- Review/Đánh giá sản phẩm. API thống kê Dashboard.
- Màn hình Admin quản lý Đơn hàng, Biểu đồ doanh thu.

### 🚩 Sprint 8: Kiểm thử, Tối ưu & Viết Báo cáo (Tuần 15-16)
- Tối ưu SEO, fix bugs, Unit tests.
- Deploy Production (Frontend: Vercel, Backend: Render, DB: Supabase).
- Hoàn thiện tài liệu Báo cáo Luận văn.

---

## 7. ĐỊNH NGHĨA MVP & TIÊU CHÍ HOÀN THÀNH (DoD)

### 7.1. Định nghĩa MVP (Sản phẩm khả dụng tối thiểu)
Khách hàng có thể tìm kiếm sản phẩm (bằng chữ hoặc **hình ảnh**), chat tư vấn với **Bot**, thêm đồ vào giỏ và đặt hàng thành công. Admin thêm sản phẩm nhanh nhờ tính năng **AI sinh mô tả**.

### 7.2. Tiêu chí Hoàn thành (Definition of Done)
- Code đẩy lên `main` không lỗi, API chạy ổn định.
- Các tính năng AI trả về kết quả mượt mà, không bị time-out quá lâu.
- UI responsive di động/laptop.

---

## 8. RỦI RO ĐỒ ÁN VÀ BIỆN PHÁP PHÒNG NGỪA

| Rủi ro | Biện pháp phòng ngừa / Khắc phục |
|---|---|
| **API AI phản hồi chậm** | Sử dụng trạng thái Loading/Skeleton thật đẹp ở Frontend để đánh lừa cảm giác chờ đợi của User. |
| **Tìm kiếm hình ảnh tốn tài nguyên** | Cấu hình giới hạn kích thước ảnh upload (< 2MB) trước khi đẩy qua mô hình tạo Embedding Vector. |
| **Cold Start khi Deploy Free** | Dùng cron-job ping backend mỗi 10 phút để server không ngủ, đảm bảo lúc bảo vệ trước hội đồng web load nhanh. |

---

*Tài liệu này được cập nhật lần cuối: Tháng 6/2026*  
*Bao gồm lộ trình tích hợp Hệ thống Trí tuệ Nhân tạo (AI)*