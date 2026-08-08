import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import FloatingContact from '@/components/FloatingContact';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import authService from '@/services/auth.service';

// Eager load HomePage for fast initial paint
import HomePage from '@/pages/HomePage';

// Lazy load secondary routes for optimal code splitting & lower initial bundle size
const ShopPage = lazy(() => import('@/pages/ShopPage'));
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage'));
const CartPage = lazy(() => import('@/pages/CartPage'));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'));
const PaymentResultPage = lazy(() => import('@/pages/PaymentResultPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const CollectionListPage = lazy(() => import('@/pages/CollectionListPage'));
const CollectionPage = lazy(() => import('@/pages/CollectionPage'));
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const AboutFurniturePage = lazy(() => import('@/pages/AboutFurniturePage'));
const AboutStorePage = lazy(() => import('@/pages/AboutStorePage'));
const WarrantyPolicyPage = lazy(() => import('@/pages/WarrantyPolicyPage'));
const WarrantyLookupPage = lazy(() => import('@/pages/WarrantyLookupPage'));
const BlogListPage = lazy(() => import('@/pages/BlogListPage'));
const BlogDetailPage = lazy(() => import('@/pages/BlogDetailPage'));

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
    </div>
  );
}

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

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('App Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4 text-center">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Đã xảy ra sự cố nạp giao diện</h2>
          <p className="text-sm text-slate-600 mb-4">Có phiên bản mới vừa cập nhật hoặc kết nối mạng bị gián đoạn.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Tải lại trang
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  useEffect(() => {
    const token = useAuthStore.getState().token;
    if (token) {
      useCartStore.getState().fetchCart();
    }
  }, []);

  return (
    <ErrorBoundary>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
      <FloatingContact />
    </ErrorBoundary>
  );
}

export default App;
