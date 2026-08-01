import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import AdminLayout from '@/pages/admin/AdminLayout';
import DashboardPage from '@/pages/admin/dashboard/DashboardPage';

// Products & Catalog
import ProductListPage from '@/pages/admin/products/ProductListPage';
import ProductCreatePage from '@/pages/admin/products/ProductCreatePage';
import ProductEditPage from '@/pages/admin/products/ProductEditPage';
import CategoryListPage from '@/pages/admin/products/CategoryListPage';
import CollectionListPage from '@/pages/admin/products/CollectionListPage';

// Warehouse & Inventory
import InventoryPage from '@/pages/admin/warehouse/InventoryPage';
import SupplierListPage from '@/pages/admin/warehouse/SupplierListPage';
import PurchaseOrderListPage from '@/pages/admin/warehouse/PurchaseOrderListPage';
import PurchaseOrderCreatePage from '@/pages/admin/warehouse/PurchaseOrderCreatePage';
import PurchaseOrderDetailPage from '@/pages/admin/warehouse/PurchaseOrderDetailPage';
import InventoryAuditListPage from '@/pages/admin/warehouse/InventoryAuditListPage';
import InventoryAuditCreatePage from '@/pages/admin/warehouse/InventoryAuditCreatePage';
import InventoryAuditDetailPage from '@/pages/admin/warehouse/InventoryAuditDetailPage';
import StockIssueListPage from '@/pages/admin/warehouse/StockIssueListPage';
import StockIssueCreatePage from '@/pages/admin/warehouse/StockIssueCreatePage';
import StockIssueDetailPage from '@/pages/admin/warehouse/StockIssueDetailPage';

// Orders & Returns
import OrderListPage from '@/pages/admin/orders/OrderListPage';
import ReturnOrderListPage from '@/pages/admin/orders/ReturnOrderListPage';

// Marketing & Content
import BannerListPage from '@/pages/admin/marketing/BannerListPage';
import VoucherListPage from '@/pages/admin/marketing/VoucherListPage';
import PromotionListPage from '@/pages/admin/marketing/PromotionListPage';
import ReviewListPage from '@/pages/admin/marketing/ReviewListPage';

// Warranties
import WarrantyListPage from '@/pages/admin/warranties/WarrantyListPage';

// Users & Customers
import UserListPage from '@/pages/admin/users/UserListPage';
import CustomerListPage from '@/pages/admin/users/CustomerListPage';

import PaymentResultPage from '@/pages/PaymentResultPage';
import WarrantyLookupPage from '@/pages/WarrantyLookupPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Trang kết quả thanh toán VNPAY */}
      <Route path="/payment/result" element={<PaymentResultPage />} />

      {/* Tra cứu bảo hành công khai */}
      <Route path="/warranty-lookup" element={<WarrantyLookupPage />} />

      {/* Admin routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductListPage />} />
        <Route path="products/create" element={<ProductCreatePage />} />
        <Route path="products/edit/:id" element={<ProductEditPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="suppliers" element={<SupplierListPage />} />
        <Route path="purchase-orders" element={<PurchaseOrderListPage />} />
        <Route path="purchase-orders/create" element={<PurchaseOrderCreatePage />} />
        <Route path="purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
        <Route path="inventory-audits" element={<InventoryAuditListPage />} />
        <Route path="inventory-audits/create" element={<InventoryAuditCreatePage />} />
        <Route path="inventory-audits/:id" element={<InventoryAuditDetailPage />} />
        <Route path="stock-issues" element={<StockIssueListPage />} />
        <Route path="stock-issues/create" element={<StockIssueCreatePage />} />
        <Route path="stock-issues/:id" element={<StockIssueDetailPage />} />
        <Route path="categories" element={<CategoryListPage />} />
        <Route path="collections" element={<CollectionListPage />} />
        <Route path="banners" element={<BannerListPage />} />
        <Route path="orders" element={<OrderListPage />} />
        <Route path="returns" element={<ReturnOrderListPage />} />
        <Route path="warranties" element={<WarrantyListPage />} />
        <Route path="vouchers" element={<VoucherListPage />} />
        <Route path="promotions" element={<PromotionListPage />} />
        <Route path="users" element={<UserListPage />} />
        <Route path="customers" element={<CustomerListPage />} />
        <Route path="reviews" element={<ReviewListPage />} />
      </Route>

      {/* Redirect mặc định */}
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

export default App;

