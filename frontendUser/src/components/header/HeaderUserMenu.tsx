import React from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

interface HeaderUserMenuProps {
  user: any;
  userDropdownRef: React.RefObject<HTMLDivElement | null>;
  isUserDropdownOpen: boolean;
  setIsUserDropdownOpen: (open: boolean) => void;
  isAdmin: boolean;
  adminUrl: string;
  handleLogout: () => void;

  loginDropdownRef: React.RefObject<HTMLDivElement | null>;
  mobileLoginModalRef: React.RefObject<HTMLDivElement | null>;
  isLoginDropdownOpen: boolean;
  setIsLoginDropdownOpen: (open: boolean) => void;
  loginEmail: string;
  setLoginEmail: (val: string) => void;
  loginPassword: string;
  setLoginPassword: (val: string) => void;
  isLoginLoading: boolean;
  handleQuickLogin: (e: React.FormEvent) => void;
}

export const HeaderUserMenu: React.FC<HeaderUserMenuProps> = ({
  user,
  userDropdownRef,
  isUserDropdownOpen,
  setIsUserDropdownOpen,
  isAdmin,
  adminUrl,
  handleLogout,

  loginDropdownRef,
  mobileLoginModalRef,
  isLoginDropdownOpen,
  setIsLoginDropdownOpen,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  isLoginLoading,
  handleQuickLogin,
}) => {
  if (user) {
    return (
      <div className="relative" ref={userDropdownRef}>
        <button
          onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
          aria-label="Tài khoản"
          aria-expanded={isUserDropdownOpen}
          className="py-1.5 px-3 rounded-full hover:bg-surface-container-low transition-all duration-300 flex items-center gap-1.5 text-xs font-semibold text-on-surface uppercase tracking-wider cursor-pointer whitespace-nowrap"
        >
          <span
            className="material-symbols-outlined text-[20px] text-primary"
            aria-hidden="true"
          >
            account_circle
          </span>
          <span className="hidden sm:inline whitespace-nowrap">
            {user.name ? user.name.split(/\s+/).pop() : 'User'}
          </span>
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant/70">
            keyboard_arrow_down
          </span>
        </button>
        <div
          className={`fixed sm:absolute top-16 sm:top-full right-3 sm:right-0 left-3 sm:left-auto mt-2 sm:mt-2 w-auto sm:w-60 bg-white border border-outline-variant/60 shadow-[0_10px_30px_rgba(0,0,0,0.06)] p-5 space-y-4 transition-all duration-300 z-50 rounded-sm ${
            isUserDropdownOpen
              ? 'opacity-100 visible translate-y-0'
              : 'opacity-0 invisible -translate-y-2'
          }`}
        >
          <div className="pb-3 border-b border-outline-variant/30">
            <span className="block text-[10px] font-bold text-on-surface-variant/80 uppercase tracking-widest">
              Thông tin tài khoản
            </span>
            <span className="block font-bold text-sm text-on-surface truncate mt-1">
              {user.name}
            </span>
          </div>
          <div className="flex flex-col gap-2.5 text-xs font-semibold uppercase tracking-wider">
            {isAdmin && (
              <a
                href={adminUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsUserDropdownOpen(false)}
                className="py-2 px-3 bg-surface-container-high hover:bg-primary text-on-surface hover:text-white border border-outline-variant/40 rounded-sm transition-all flex items-center justify-between font-bold text-xs normal-case tracking-normal mb-1 group"
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary group-hover:text-white transition-colors">
                    admin_panel_settings
                  </span>
                  <span>Trang Quản trị (Admin)</span>
                </span>
                <span className="material-symbols-outlined text-[14px] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                  open_in_new
                </span>
              </a>
            )}
            <Link
              to="/profile?tab=profile"
              onClick={() => setIsUserDropdownOpen(false)}
              className="py-1 text-on-surface-variant/70 hover:text-black transition-colors"
            >
              Tài khoản của bạn
            </Link>
            <Link
              to="/profile?tab=orders"
              onClick={() => setIsUserDropdownOpen(false)}
              className="py-1 text-on-surface-variant/70 hover:text-black transition-colors"
            >
              Lịch sử đơn hàng
            </Link>
            <Link
              to="/profile?tab=warranty"
              onClick={() => setIsUserDropdownOpen(false)}
              className="py-1 text-on-surface-variant/70 hover:text-black transition-colors"
            >
              Sổ bảo hành
            </Link>
            <Link
              to="/profile?tab=vouchers"
              onClick={() => setIsUserDropdownOpen(false)}
              className="py-1 text-on-surface-variant/70 hover:text-black transition-colors"
            >
              Kho mã giảm giá
            </Link>
            <Link
              to="/profile?tab=address"
              onClick={() => setIsUserDropdownOpen(false)}
              className="py-1 text-on-surface-variant/70 hover:text-black transition-colors"
            >
              Danh sách địa chỉ
            </Link>
            <button
              onClick={() => {
                setIsUserDropdownOpen(false);
                handleLogout();
              }}
              className="w-full text-left py-1 text-error/80 hover:text-error transition-colors font-semibold uppercase tracking-wider cursor-pointer"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={loginDropdownRef}>
      <button
        onClick={() => setIsLoginDropdownOpen(!isLoginDropdownOpen)}
        aria-label="Đăng nhập"
        aria-expanded={isLoginDropdownOpen}
        className={`p-2.5 min-w-[44px] min-h-[44px] rounded-full hover:bg-surface-container-low transition-colors duration-300 flex items-center justify-center ${
          isLoginDropdownOpen ? 'bg-surface-container-low text-primary' : ''
        }`}
      >
        <span
          className={`material-symbols-outlined block ${
            isLoginDropdownOpen ? 'text-primary' : 'text-on-surface-variant'
          }`}
          aria-hidden="true"
        >
          account_circle
        </span>
      </button>

      {/* Desktop Login Dropdown */}
      <div
        className={`hidden sm:block absolute top-full right-0 mt-2 w-[320px] bg-surface-container-lowest border border-outline-variant shadow-[0_10px_40px_rgba(0,0,0,0.08)] transition-all duration-300 z-50 p-6 rounded-sm before:content-[''] before:absolute before:-top-2 before:right-4 before:border-8 before:border-transparent before:border-b-surface-container-lowest ${
          isLoginDropdownOpen
            ? 'opacity-100 visible translate-y-0'
            : 'opacity-0 invisible -translate-y-2'
        }`}
      >
        <div className="text-center mb-5">
          <h3 className="font-headline-sm font-bold text-on-surface uppercase tracking-wider mb-1">
            Đăng nhập tài khoản
          </h3>
          <p className="font-body-sm text-on-surface-variant">Nhập email và mật khẩu của bạn:</p>
        </div>

        <form onSubmit={handleQuickLogin} className="space-y-4">
          <div>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
              placeholder="Nhập email"
              className="w-full px-4 py-2.5 border border-outline-variant rounded-sm bg-transparent font-body-sm text-on-surface focus:outline-none focus:border-[#4A4A4A] transition-colors"
            />
          </div>
          <div>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
              placeholder="Mật khẩu"
              className="w-full px-4 py-2.5 border border-outline-variant rounded-sm bg-transparent font-body-sm text-on-surface focus:outline-none focus:border-[#4A4A4A] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoginLoading}
            className="w-full py-3 bg-[#4A4A4A] text-white font-label-md uppercase tracking-wider hover:bg-black transition-colors flex items-center justify-center rounded-sm"
          >
            {isLoginLoading ? (
              <span className="material-symbols-outlined animate-spin mr-2 text-[18px]">
                sync
              </span>
            ) : null}
            Đăng nhập
          </button>
        </form>

        <div className="mt-5 text-center font-body-sm space-y-2">
          <p className="text-on-surface-variant">
            Khách hàng mới?{' '}
            <Link
              onClick={() => setIsLoginDropdownOpen(false)}
              to="/register"
              className="text-primary hover:underline font-medium"
            >
              Tạo tài khoản
            </Link>
          </p>
          <p className="text-on-surface-variant">
            Quên mật khẩu?{' '}
            <Link
              onClick={() => setIsLoginDropdownOpen(false)}
              to="/forgot-password"
              className="text-primary hover:underline font-medium"
            >
              Khôi phục mật khẩu
            </Link>
          </p>
        </div>
      </div>

      {/* Mobile Login Portal Modal */}
      {isLoginDropdownOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:hidden animate-fadeIn">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
              onClick={() => setIsLoginDropdownOpen(false)}
            />

            {/* Card */}
            <div
              ref={mobileLoginModalRef}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-surface-container-lowest border border-outline-variant/30 shadow-2xl rounded-2xl relative z-10 p-6 transition-all duration-300"
            >
              <div className="text-center mb-5 relative">
                <button
                  onClick={() => setIsLoginDropdownOpen(false)}
                  className="absolute -top-1 -right-1 p-2 text-on-surface-variant hover:text-on-surface rounded-full hover:bg-surface-container-low transition-colors flex items-center justify-center min-w-[36px] min-h-[36px]"
                  aria-label="Đóng"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
                <h3 className="font-headline-sm font-bold text-on-surface uppercase tracking-wider mb-1 pr-6 pl-6 text-center">
                  Đăng nhập tài khoản
                </h3>
                <p className="font-body-sm text-on-surface-variant">
                  Nhập email và mật khẩu của bạn:
                </p>
              </div>

              <form onSubmit={handleQuickLogin} className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    placeholder="Nhập email"
                    className="w-full px-4 py-2.5 border border-outline-variant rounded-sm bg-transparent font-body-sm text-on-surface focus:outline-none focus:border-[#4A4A4A] transition-colors"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    placeholder="Mật khẩu"
                    className="w-full px-4 py-2.5 border border-outline-variant rounded-sm bg-transparent font-body-sm text-on-surface focus:outline-none focus:border-[#4A4A4A] transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoginLoading}
                  className="w-full py-3 bg-[#4A4A4A] text-white font-label-md uppercase tracking-wider hover:bg-black transition-colors flex items-center justify-center rounded-sm"
                >
                  {isLoginLoading ? (
                    <span className="material-symbols-outlined animate-spin mr-2 text-[18px]">
                      sync
                    </span>
                  ) : null}
                  Đăng nhập
                </button>
              </form>

              <div className="mt-5 text-center font-body-sm space-y-2">
                <p className="text-on-surface-variant">
                  Khách hàng mới?{' '}
                  <Link
                    onClick={() => setIsLoginDropdownOpen(false)}
                    to="/register"
                    className="text-primary hover:underline font-medium"
                  >
                    Tạo tài khoản
                  </Link>
                </p>
                <p className="text-on-surface-variant">
                  Quên mật khẩu?{' '}
                  <Link
                    onClick={() => setIsLoginDropdownOpen(false)}
                    to="/forgot-password"
                    className="text-primary hover:underline font-medium"
                  >
                    Khôi phục mật khẩu
                  </Link>
                </p>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
