import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../services/auth.service';
import toast from 'react-hot-toast';
import Header from '../components/Header';
import Footer from '../components/Footer';

const ForgotPasswordPage: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const navigate = useNavigate();

  // Handle countdown for resending OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Request OTP (Step 1)
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Vui lòng nhập email');
      return;
    }

    setIsLoading(true);
    try {
      await authService.forgotPassword(email);
      toast.success('Mã OTP đã được gửi đến email của bạn');
      setStep(2);
      setCountdown(60); // Resend interval of 60 seconds
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể gửi yêu cầu. Vui lòng kiểm tra lại email.');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP (Step 2)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      toast.error('Vui lòng nhập mã OTP');
      return;
    }
    if (otp.length !== 6) {
      toast.error('Mã OTP phải gồm 6 chữ số');
      return;
    }

    setIsLoading(true);
    try {
      await authService.verifyOtp(email, otp);
      toast.success('Xác nhận OTP thành công');
      setStep(3);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset Password (Step 3)
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      toast.error('Vui lòng nhập mật khẩu mới');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Mật khẩu phải chứa ít nhất 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(email, otp, newPassword);
      toast.success('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
      navigate('/');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi đặt lại mật khẩu.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    
    setIsLoading(true);
    try {
      await authService.forgotPassword(email);
      toast.success('Mã OTP mới đã được gửi');
      setCountdown(60);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gửi lại mã OTP thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col font-body-md text-on-surface">
      <Header />

      <main className="flex-grow flex items-center justify-center px-4 py-16 bg-white">
        <div className="w-full max-w-[500px] p-6 sm:p-10 border border-outline-variant rounded-sm bg-transparent">
          <div className="text-center mb-8">
            <h1 className="text-[28px] font-bold text-on-surface mb-2">Khôi phục mật khẩu</h1>
            <p className="text-sm text-on-surface-variant">
              {step === 1 && 'Nhập email của bạn để bắt đầu khôi phục mật khẩu.'}
              {step === 2 && 'Mã xác minh (OTP) đã được gửi đến email của bạn.'}
              {step === 3 && 'Thiết lập mật khẩu mới cho tài khoản của bạn.'}
            </p>
          </div>

          {/* Steps Progress Indicator */}
          <div className="flex items-center justify-between mb-8 px-4">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= 1 ? 'bg-primary text-white' : 'bg-outline-variant text-on-surface-variant'}`}>
                1
              </div>
              <span className={`text-[11px] mt-1 font-medium ${step >= 1 ? 'text-primary' : 'text-on-surface-variant'}`}>Email</span>
            </div>
            <div className={`flex-1 h-[2px] mx-2 ${step >= 2 ? 'bg-primary' : 'bg-outline-variant'}`}></div>
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= 2 ? 'bg-primary text-white' : 'bg-outline-variant text-on-surface-variant'}`}>
                2
              </div>
              <span className={`text-[11px] mt-1 font-medium ${step >= 2 ? 'text-primary' : 'text-on-surface-variant'}`}>Mã OTP</span>
            </div>
            <div className={`flex-1 h-[2px] mx-2 ${step >= 3 ? 'bg-primary' : 'bg-outline-variant'}`}></div>
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= 3 ? 'bg-primary text-white' : 'bg-outline-variant text-on-surface-variant'}`}>
                3
              </div>
              <span className={`text-[11px] mt-1 font-medium ${step >= 3 ? 'text-primary' : 'text-on-surface-variant'}`}>Mật khẩu</span>
            </div>
          </div>

          {/* Step 1: Input Email */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-on-surface-variant mb-1">
                  Địa chỉ Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className="w-full px-4 py-3 border border-outline-variant rounded-sm bg-transparent font-body-md text-on-surface focus:outline-none focus:border-[#4A4A4A] transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 mt-4 bg-primary text-white rounded-sm font-label-lg hover:bg-opacity-90 transition-all flex items-center justify-center uppercase tracking-wider disabled:opacity-50"
              >
                {isLoading && (
                  <span className="material-symbols-outlined animate-spin mr-2">sync</span>
                )}
                Gửi mã xác thực
              </button>
            </form>
          )}

          {/* Step 2: Verify OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-on-surface-variant mb-1">
                  Nhập mã OTP (6 chữ số)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                  placeholder="______"
                  className="w-full px-4 py-3 border border-outline-variant rounded-sm bg-transparent font-body-md text-on-surface focus:outline-none focus:border-[#4A4A4A] text-center tracking-[8px] text-lg transition-colors"
                />
              </div>

              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-on-surface-variant">Không nhận được mã?</span>
                {countdown > 0 ? (
                  <span className="text-on-surface-variant font-medium">Gửi lại sau {countdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isLoading}
                    className="text-primary hover:underline font-medium focus:outline-none"
                  >
                    Gửi lại mã
                  </button>
                )}
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-3 border border-outline-variant text-on-surface rounded-sm font-label-lg hover:bg-surface-variant transition-all flex items-center justify-center uppercase tracking-wider"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-grow py-3 bg-primary text-white rounded-sm font-label-lg hover:bg-opacity-90 transition-all flex items-center justify-center uppercase tracking-wider disabled:opacity-50"
                >
                  {isLoading && (
                    <span className="material-symbols-outlined animate-spin mr-2">sync</span>
                  )}
                  Xác minh mã
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Reset Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-on-surface-variant mb-1">
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full px-4 py-3 border border-outline-variant rounded-sm bg-transparent font-body-md text-on-surface focus:outline-none focus:border-[#4A4A4A] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-on-surface-variant mb-1">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full px-4 py-3 border border-outline-variant rounded-sm bg-transparent font-body-md text-on-surface focus:outline-none focus:border-[#4A4A4A] transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 mt-6 bg-primary text-white rounded-sm font-label-lg hover:bg-opacity-90 transition-all flex items-center justify-center uppercase tracking-wider disabled:opacity-50"
              >
                {isLoading && (
                  <span className="material-symbols-outlined animate-spin mr-2">sync</span>
                )}
                Đặt lại mật khẩu
              </button>
            </form>
          )}

          <div className="mt-8 text-center border-t border-outline-variant pt-6">
            <Link to="/" className="text-on-surface hover:text-primary transition-colors text-sm flex items-center justify-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Quay lại trang chủ
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ForgotPasswordPage;
