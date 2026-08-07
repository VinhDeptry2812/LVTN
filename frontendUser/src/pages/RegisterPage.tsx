import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../services/auth.service';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import toast from 'react-hot-toast';
import Footer from '../components/Footer';
import Header from '../components/Header';

const RegisterPage: React.FC = () => {
  const [step, setStep] = useState<'register' | 'otp'>('register');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // OTP state
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 phút

  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  // Đếm ngược thời gian hết hạn OTP
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (step === 'otp' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, countdown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Bước 1: Gửi thông tin đăng ký
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Mật khẩu nhập lại không khớp!');
      return;
    }

    if (password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự!');
      return;
    }

    setIsLoading(true);
    try {
      const fullName = `${lastName} ${firstName}`.trim();
      const res = await authService.register({
        name: fullName,
        email,
        password,
      });

      if (res.requireOtp) {
        toast.success(res.message || 'Mã xác thực OTP đã được gửi đến email của bạn.');
        setStep('otp');
        setCountdown(300); // Đặt lại 5 phút
      } else {
        // Dự phòng nếu không yêu cầu OTP
        setAuth(res.access_token, res.refresh_token, res.user);
        await useCartStore.getState().syncCartOnLogin();
        toast.success('Đăng ký tài khoản thành công!');
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  // Bước 2: Xác thực mã OTP
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp || otp.trim().length !== 6) {
      toast.error('Vui lòng nhập đủ 6 chữ số mã OTP!');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.verifyRegisterOtp(email, otp.trim());
      setAuth(res.access_token, res.refresh_token, res.user);
      await useCartStore.getState().syncCartOnLogin();
      toast.success('Xác thực tài khoản & Đăng ký thành công!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Xác thực OTP thất bại!');
    } finally {
      setIsLoading(false);
    }
  };

  // Gửi lại mã OTP
  const handleResendOtp = async () => {
    if (countdown > 240) {
      toast.error('Vui lòng đợi 1 phút trước khi yêu cầu gửi lại mã mới!');
      return;
    }

    setIsResending(true);
    try {
      const res = await authService.resendRegisterOtp(email);
      toast.success(res.message || 'Đã gửi lại mã OTP mới.');
      setCountdown(300);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể gửi lại mã OTP.');
    } finally {
      setIsResending(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/google`;
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col font-body-md text-on-surface">
      <Header />

      <main className="flex-grow flex items-center justify-center px-4 py-12 bg-gray-50 mt-20">
        <div className="w-full max-w-[500px] p-6 sm:p-10 bg-white rounded-lg shadow-md border border-gray-100">
          {step === 'register' ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-[28px] font-bold text-on-surface mb-2">Tạo tài khoản</h1>
                <p className="text-sm text-gray-500">Đăng ký tài khoản để trải nghiệm mua sắm tuyệt vời</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Họ</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      placeholder="Nguyễn"
                      className="w-full px-4 py-3 border border-outline-variant rounded-md bg-transparent font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Tên</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      placeholder="Văn A"
                      className="w-full px-4 py-3 border border-outline-variant rounded-md bg-transparent font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="example@gmail.com"
                    className="w-full px-4 py-3 border border-outline-variant rounded-md bg-transparent font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Mật khẩu</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                    className="w-full px-4 py-3 border border-outline-variant rounded-md bg-transparent font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Xác nhận mật khẩu</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Nhập lại mật khẩu"
                    className="w-full px-4 py-3 border border-outline-variant rounded-md bg-transparent font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 mt-4 bg-primary text-white rounded-md font-semibold hover:bg-opacity-90 transition-all flex items-center justify-center uppercase tracking-wider shadow-sm disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="material-symbols-outlined animate-spin mr-2">sync</span>
                  ) : null}
                  Tiếp tục (Nhận mã OTP)
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/" className="text-on-surface hover:text-primary transition-colors text-sm inline-flex items-center justify-center gap-1">
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
                    <span className="px-4 bg-white text-gray-500">Hoặc đăng ký bằng</span>
                  </div>
                </div>

                <button
                  onClick={handleGoogleLogin}
                  type="button"
                  className="mt-6 w-full flex items-center justify-center gap-3 py-3 px-4 border border-[#4285F4] rounded-md font-medium bg-white text-[#4285F4] hover:bg-[#4285F4] hover:text-white transition-all group"
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
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl">mark_email_read</span>
                </div>
                <h1 className="text-[26px] font-bold text-on-surface mb-2">Xác thực Email</h1>
                <p className="text-sm text-gray-600">
                  Mã OTP 6 chữ số đã được gửi tới email <br />
                  <span className="font-semibold text-primary">{email}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyOtpSubmit} className="space-y-6">
                <div>
                  <label className="block text-center text-xs font-semibold text-gray-600 mb-2 uppercase">
                    Nhập mã OTP xác thực
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    required
                    placeholder="123456"
                    className="w-full text-center text-2xl tracking-[0.5em] font-bold py-3 px-4 border border-outline-variant rounded-md bg-transparent focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    Thời gian còn lại: <strong className="text-primary">{formatTime(countdown)}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isResending || countdown > 240}
                    className="text-primary font-medium hover:underline disabled:opacity-50 disabled:no-underline"
                  >
                    {isResending ? 'Đang gửi...' : 'Gửi lại mã'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otp.length !== 6}
                  className="w-full py-3.5 bg-primary text-white rounded-md font-semibold hover:bg-opacity-90 transition-all flex items-center justify-center uppercase tracking-wider shadow-sm disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="material-symbols-outlined animate-spin mr-2">sync</span>
                  ) : null}
                  Xác nhận & Kích hoạt tài khoản
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setStep('register')}
                  className="text-gray-500 hover:text-on-surface transition-colors text-sm inline-flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  Thay đổi thông tin đăng ký
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default RegisterPage;
