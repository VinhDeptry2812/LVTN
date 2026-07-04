import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import ShopPage from '@/pages/ShopPage';
import ProductDetailPage from '@/pages/ProductDetailPage';
import CartPage from '@/pages/CartPage';
import CheckoutPage from '@/pages/CheckoutPage';
import PaymentResultPage from '@/pages/PaymentResultPage';
import RegisterPage from '@/pages/RegisterPage';
import CollectionListPage from '@/pages/CollectionListPage';
import CollectionPage from '@/pages/CollectionPage';
import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import authService from '@/services/auth.service';
import toast from 'react-hot-toast';

function LoginCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      useAuthStore.setState({ token });
      authService.getProfile()
        .then((user) => {
          setAuth(token, user);
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
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/collections" element={<CollectionListPage />} />
        <Route path="/collection/:slug" element={<CollectionPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/payment/result" element={<PaymentResultPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginCallback />} />
        {/* Redirect default to homepage */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
