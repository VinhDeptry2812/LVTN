import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import AdminLayout from '@/pages/admin/AdminLayout';
import DashboardPage from '@/pages/admin/DashboardPage';
import ProductListPage from '@/pages/admin/ProductListPage';
import ProductCreatePage from '@/pages/admin/ProductCreatePage';
import ProductEditPage from '@/pages/admin/ProductEditPage';
import CategoryListPage from '@/pages/admin/CategoryListPage';
import CollectionListPage from '@/pages/admin/CollectionListPage';
import OrderListPage from '@/pages/admin/OrderListPage';
import PaymentResultPage from '@/pages/PaymentResultPage';
import CustomerDemoPage from '@/pages/CustomerDemoPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Trang demo khách hàng - layout riêng */}
      <Route path="/demo" element={<CustomerDemoPage />} />

      {/* Trang kết quả thanh toán VNPAY */}
      <Route path="/payment/result" element={<PaymentResultPage />} />

      {/* Admin routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductListPage />} />
        <Route path="products/create" element={<ProductCreatePage />} />
        <Route path="products/edit/:id" element={<ProductEditPage />} />
        <Route path="categories" element={<CategoryListPage />} />
        <Route path="collections" element={<CollectionListPage />} />
        <Route path="orders" element={<OrderListPage />} />
      </Route>

      {/* Redirect mặc định */}
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}


export default App;
