import { Routes, Route, Navigate, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import ShopPage from '@/pages/ShopPage';
import ProductDetailPage from '@/pages/ProductDetailPage';
import CartPage from '@/pages/CartPage';
import CheckoutPage from '@/pages/CheckoutPage';
import PaymentResultPage from '@/pages/PaymentResultPage';
import RegisterPage from '@/pages/RegisterPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import CollectionListPage from '@/pages/CollectionListPage';
import CollectionPage from '@/pages/CollectionPage';
import SearchPage from '@/pages/SearchPage';
import ProfilePage from '@/pages/ProfilePage';
import AboutFurniturePage from '@/pages/AboutFurniturePage';
import AboutStorePage from '@/pages/AboutStorePage';
import WarrantyPolicyPage from '@/pages/WarrantyPolicyPage';
import WarrantyLookupPage from '@/pages/WarrantyLookupPage';
import BlogListPage from '@/pages/BlogListPage';
import BlogDetailPage from '@/pages/BlogDetailPage';
import toast from 'react-hot-toast';
import FloatingContact from '@/components/FloatingContact';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import authService from '@/services/auth.service';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

function LoginCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refresh_token');
    if (token) {
      useAuthStore.setState({ token, refreshToken });
      authService.getProfile()
        .then(async (user) => {
          setAuth(token, refreshToken || '', user);
          await useCartStore.getState().syncCartOnLogin();
          toast.success('Đăng nhập thành công!');
          navigate('/');
        })
        .catch((err) => {
          console.error(err);
          toast.error('Đăng nhập Google thất bại');
          navigate('/register');
        });
    } else {
      navigate('/');
    }
  }, [searchParams, navigate, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

function App() {
  useEffect(() => {
    const token = useAuthStore.getState().token;
    if (token) {
      useCartStore.getState().fetchCart();
    }
  }, []);

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/collections" element={<CollectionListPage />} />
        <Route path="/collection/:slug" element={<CollectionPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/payment/result" element={<PaymentResultPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/about-furniture" element={<AboutFurniturePage />} />
        <Route path="/about-store" element={<AboutStorePage />} />
        <Route path="/warranty-policy" element={<WarrantyPolicyPage />} />
        <Route path="/warranty-lookup" element={<WarrantyLookupPage />} />
        <Route path="/blog" element={<BlogListPage />} />
        <Route path="/blog/:slug" element={<BlogDetailPage />} />
        <Route path="/login" element={<LoginCallback />} />
        {/* Redirect default to homepage */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <FloatingContact />
    </>
  );
}

export default App;
