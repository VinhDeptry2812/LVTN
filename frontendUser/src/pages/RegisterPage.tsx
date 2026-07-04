import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../services/auth.service';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';
import Footer from '../components/Footer';
import Header from '../components/Header';

const RegisterPage: React.FC = () => {
  const [registerMethod, setRegisterMethod] = useState<'email' | 'phone'>('email');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    try {
      const fullName = `${lastName} ${firstName}`.trim();
      const response = await authService.register({
        name: fullName,
        email: registerMethod === 'email' ? email : undefined,
        phone: registerMethod === 'phone' ? phone : undefined,
        password,
      });
      setAuth(response.access_token, response.user);
      toast.success('Đăng ký tài khoản thành công!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/google`;
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col font-body-md text-on-surface">
      <Header />

      <main className="flex-grow flex items-center justify-center px-4 py-12 bg-white mt-20">
        <div className="w-full max-w-[500px] p-6 sm:p-10">
          <div className="text-center mb-8">
            <h1 className="text-[28px] font-bold text-on-surface mb-2">Tạo tài khoản</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="hidden items-center gap-6 mb-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="registerMethod"
                  value="email"
                  checked={registerMethod === 'email'}
                  onChange={() => setRegisterMethod('email')}
                  className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                />
                <span className="ml-2 font-body-md">Đăng ký bằng email</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="registerMethod"
                  value="phone"
                  checked={registerMethod === 'phone'}
                  onChange={() => setRegisterMethod('phone')}
                  className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                />
                <span className="ml-2 font-body-md">Đăng ký bằng số điện thoại</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  placeholder="Họ"
                  className="w-full px-4 py-3 border border-outline-variant rounded-sm bg-transparent font-body-md text-on-surface focus:outline-none focus:border-[#4A4A4A] transition-colors"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  placeholder="Tên"
                  className="w-full px-4 py-3 border border-outline-variant rounded-sm bg-transparent font-body-md text-on-surface focus:outline-none focus:border-[#4A4A4A] transition-colors"
                />
              </div>
            </div>

            {registerMethod === 'email' ? (
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Email"
                  className="w-full px-4 py-3 border border-outline-variant rounded-sm bg-transparent font-body-md text-on-surface focus:outline-none focus:border-[#4A4A4A] transition-colors"
                />
              </div>
            ) : (
              <div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="Số điện thoại"
                  className="w-full px-4 py-3 border border-outline-variant rounded-sm bg-transparent font-body-md text-on-surface focus:outline-none focus:border-[#4A4A4A] transition-colors"
                />
              </div>
            )}

            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Mật khẩu"
                className="w-full px-4 py-3 border border-outline-variant rounded-sm bg-transparent font-body-md text-on-surface focus:outline-none focus:border-[#4A4A4A] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 mt-4 bg-primary text-white rounded-sm font-label-lg hover:bg-opacity-90 transition-all flex items-center justify-center uppercase tracking-wider"
            >
              {isLoading ? (
                <span className="material-symbols-outlined animate-spin mr-2">sync</span>
              ) : null}
              Đăng ký
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/" className="text-on-surface hover:text-primary transition-colors text-sm flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Quay lại trang chủ
            </Link>
          </div>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-on-surface-variant">Hoặc đăng nhập bằng</span>
              </div>
            </div>

            <button
              onClick={handleGoogleLogin}
              type="button"
              className="mt-6 w-full flex items-center justify-center gap-3 py-3 px-4 border border-[#4285F4] rounded-sm font-label-md bg-white text-[#4285F4] hover:bg-[#4285F4] hover:text-white transition-all group"
            >
              <svg className="w-5 h-5 group-hover:hidden" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <svg className="w-5 h-5 hidden group-hover:block" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default RegisterPage;
