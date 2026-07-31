# Kế hoạch triển khai Frontend - Quản lý Tồn kho mở rộng (FurniShop)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Xây dựng giao diện React hoàn chỉnh cho các tính năng: Quản lý nhà cung cấp, Đơn nhập hàng (Purchase Order) và Kiểm kê kho (Inventory Audit), tích hợp đồng bộ với sidebar hiện tại.

**Architecture:** Tích hợp các trang quản lý vào hệ thống route React Router của Admin dashboard. Sử dụng Axios client có sẵn (`api.ts`) để thực hiện các yêu cầu HTTP. Chuyển đổi liên kết "Quản lý kho" ở Sidebar thành một menu con (Submenu) chứa các liên kết đến Tồn kho, Nhà cung cấp, Đơn nhập hàng và Kiểm kê kho.

**Tech Stack:** React, TypeScript, React Router v6, Tailwind CSS, Lucide Icons, Axios, React Hot Toast.

---

### Task 1: Cấu hình Định tuyến & Sidebar Navigation

**Files:**
- Modify: `doantotnghiep/frontend/src/App.tsx` (Thêm định tuyến mới)
- Modify: `doantotnghiep/frontend/src/pages/admin/AdminLayout.tsx` (Chuyển đổi menu Quản lý kho và bổ sung breadcrumbs)

**Step 1: Định nghĩa các Router mới trong App.tsx**
Khai báo các component mới (sẽ tạo ở các task sau) và đặt vào trong Layout của Admin:
```typescript
import SupplierListPage from '@/pages/admin/SupplierListPage';
import PurchaseOrderListPage from '@/pages/admin/PurchaseOrderListPage';
import PurchaseOrderCreatePage from '@/pages/admin/PurchaseOrderCreatePage';
import PurchaseOrderDetailPage from '@/pages/admin/PurchaseOrderDetailPage';
import InventoryAuditListPage from '@/pages/admin/InventoryAuditListPage';
import InventoryAuditCreatePage from '@/pages/admin/InventoryAuditCreatePage';
import InventoryAuditDetailPage from '@/pages/admin/InventoryAuditDetailPage';

// Trong element Route path="/admin"
<Route path="suppliers" element={<SupplierListPage />} />
<Route path="purchase-orders" element={<PurchaseOrderListPage />} />
<Route path="purchase-orders/create" element={<PurchaseOrderCreatePage />} />
<Route path="purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
<Route path="inventory-audits" element={<InventoryAuditListPage />} />
<Route path="inventory-audits/create" element={<InventoryAuditCreatePage />} />
<Route path="inventory-audits/:id" element={<InventoryAuditDetailPage />} />
```

**Step 2: Cập nhật Sidebar và Breadcrumbs trong AdminLayout.tsx**
- Sửa phần cấu trúc `navigationGroups` của "Quản lý kho" từ một liên kết đơn lẻ thành dạng Submenu giống như "Quản lý đơn hàng":
```typescript
      {
        icon: Database,
        label: 'Quản lý kho',
        subLinks: [
          { to: '/admin/inventory', label: 'Tồn kho & Nhật ký' },
          { to: '/admin/suppliers', label: 'Nhà cung cấp' },
          { to: '/admin/purchase-orders', label: 'Đơn nhập hàng' },
          { to: '/admin/inventory-audits', label: 'Kiểm kê kho' },
        ]
      },
```
- Bổ sung breadcrumbs tương ứng trong hàm `getBreadcrumbs` helper mapping:
```typescript
  suppliers: 'Nhà cung cấp',
  'purchase-orders': 'Đơn nhập hàng',
  'inventory-audits': 'Kiểm kê kho',
```

---

### Task 2: Trang Quản lý Nhà cung cấp (SupplierListPage.tsx)

**Files:**
- Create: `doantotnghiep/frontend/src/pages/admin/SupplierListPage.tsx`

**Yêu cầu chức năng:**
1. Danh sách nhà cung cấp dạng bảng với các cột: Tên, Số điện thoại, Email, Địa chỉ, Mã số thuế, Trạng thái (Hoạt động/Ngừng hoạt động) và Hành động.
2. Tìm kiếm nhà cung cấp theo Tên, Số điện thoại hoặc Email.
3. Form/Modal Thêm mới nhà cung cấp (Validation: Tên là bắt buộc).
4. Form/Modal Cập nhật nhà cung cấp.
5. Nút Bật/Tắt trạng thái hoạt động nhanh hoặc Xóa nhà cung cấp.

---

### Task 3: Trang Danh sách & Tạo Đơn nhập hàng (Purchase Order)

**Files:**
- Create: `doantotnghiep/frontend/src/pages/admin/PurchaseOrderListPage.tsx`
- Create: `doantotnghiep/frontend/src/pages/admin/PurchaseOrderCreatePage.tsx`

**Yêu cầu chức năng:**
1. **Trang danh sách (`PurchaseOrderListPage.tsx`):**
   - Hiển thị danh sách các đơn nhập hàng kèm: Nhà cung cấp, Trạng thái (`pending`, `completed`, `cancelled`), Tổng số tiền (format tiền VNĐ), Ngày tạo, Ngày hoàn thành, Người tạo.
   - Tìm kiếm, bộ lọc theo trạng thái và nhà cung cấp.
   - Nút dẫn tới trang tạo đơn nhập.
2. **Trang tạo đơn nhập (`PurchaseOrderCreatePage.tsx`):**
   - Chọn nhà cung cấp (chỉ hiển thị những nhà cung cấp đang hoạt động `is_active: true`).
   - Giao diện thêm biến thể sản phẩm động: Tìm kiếm biến thể theo SKU hoặc tên sản phẩm, thêm dòng mới, chọn số lượng nhập (>= 1) và đơn giá nhập (>= 0).
   - Hiển thị tổng giá trị đơn nhập tự động tính toán.
   - Trường nhập ghi chú đơn nhập.
   - Gọi API `POST /purchase-orders` để lưu đơn với trạng thái mặc định là `pending`.

---

### Task 4: Trang Chi tiết & Xử lý Đơn nhập hàng (PurchaseOrderDetailPage.tsx)

**Files:**
- Create: `doantotnghiep/frontend/src/pages/admin/PurchaseOrderDetailPage.tsx`

**Yêu cầu chức năng:**
1. Hiển thị thông tin tổng quan của đơn nhập hàng: Tên NCC, trạng thái dưới dạng badge màu sắc, ngày lập, người lập, tổng tiền và ghi chú.
2. Bảng danh sách chi tiết các biến thể sản phẩm được nhập: Hình ảnh, Tên sản phẩm, SKU, Thuộc tính, Số lượng nhập, Đơn giá nhập và Thành tiền.
3. Nút hành động thay đổi trạng thái (chỉ khả dụng nếu trạng thái hiện tại là `pending`):
   - **Xác nhận Hoàn tất (`completed`):** Gọi API `PATCH /purchase-orders/:id/status` với body `{ status: 'completed' }`. Hệ thống backend sẽ tự động cộng số lượng tồn kho vào các biến thể sản phẩm tương ứng và ghi lại nhật ký kho.
   - **Hủy đơn hàng (`cancelled`):** Gọi API `PATCH /purchase-orders/:id/status` với body `{ status: 'cancelled' }`. Không có thay đổi tồn kho nào được thực hiện.

---

### Task 5: Trang Danh sách & Lập phiếu Kiểm kê (Inventory Audit)

**Files:**
- Create: `doantotnghiep/frontend/src/pages/admin/InventoryAuditListPage.tsx`
- Create: `doantotnghiep/frontend/src/pages/admin/InventoryAuditCreatePage.tsx`

**Yêu cầu chức năng:**
1. **Trang danh sách (`InventoryAuditListPage.tsx`):**
   - Danh sách các đợt kiểm kê: Mã đợt, Trạng thái (`pending`, `completed`, `cancelled`), Ngày tạo, Ngày hoàn tất, Người thực hiện, Ghi chú.
   - Lọc theo trạng thái kiểm kê.
   - Nút liên kết đến trang tạo phiếu kiểm kê mới.
2. **Trang lập phiếu kiểm kê (`InventoryAuditCreatePage.tsx`):**
   - Hiển thị danh sách toàn bộ biến thể sản phẩm đang có trong hệ thống (SKU, Tên sản phẩm, Thuộc tính, Số lượng hiện tại).
   - Ô tìm kiếm nhanh và checkbox chọn các biến thể cần kiểm kê.
   - Nút "Chọn tất cả" / "Bỏ chọn tất cả" để hỗ trợ kiểm kê quy mô lớn.
   - Nhập ghi chú mục đích kiểm kê (ví dụ: "Kiểm kho định kỳ khu A").
   - Gửi API `POST /inventory-audits` với danh sách `variant_ids` đã chọn để khởi tạo phiên kiểm kê với trạng thái `pending`. Sau đó chuyển hướng về trang chi tiết đợt kiểm kê đó.

---

### Task 6: Giao diện Thực hiện & Hoàn tất Kiểm kê (InventoryAuditDetailPage.tsx)

**Files:**
- Create: `doantotnghiep/frontend/src/pages/admin/InventoryAuditDetailPage.tsx`

**Yêu cầu chức năng:**
1. Hiển thị thông tin chung của đợt kiểm kê (ID, người tạo, ngày tạo, ghi chú, trạng thái).
2. Bảng kiểm kê các biến thể sản phẩm gồm: Ảnh, Tên sản phẩm, SKU, Tồn hệ thống (System Stock), **Tồn thực tế (Actual Stock - Input)**, Chênh lệch (Difference = Tồn thực tế - Tồn hệ thống).
3. Logic xử lý:
   - Nếu trạng thái là `pending`: Cho phép người dùng nhập trực tiếp số lượng tồn thực tế đếm được của từng dòng sản phẩm. Cột chênh lệch sẽ tự động cập nhật thời gian thực (nếu chênh lệch âm hiển thị màu đỏ, dương hiển thị màu xanh lá, bằng 0 hiển thị màu xám).
   - Nút **Lưu tạm**: Gửi danh sách `{ variant_id, actual_quantity }` lên API `PATCH /inventory-audits/:id` để lưu tiến trình kiểm đếm mà chưa chốt số liệu.
   - Nút **Xác nhận Hoàn thành**: Gửi cập nhật với trạng thái `{ status: 'completed', items: [...] }`. Backend sẽ tự động cập nhật số lượng tồn kho của các biến thể sản phẩm theo số lượng thực tế đếm được, ghi nhận giao dịch kho loại `adjustment` cho các chênh lệch và gửi cảnh báo nếu tồn kho sau điều chỉnh xuống dưới ngưỡng tối thiểu.
   - Nút **Hủy phiếu kiểm kê**: Chuyển trạng thái sang `cancelled` mà không thay đổi bất kỳ số liệu tồn kho thực tế nào.
