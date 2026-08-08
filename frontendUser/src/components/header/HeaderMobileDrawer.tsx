import React from 'react';
import { Link } from 'react-router-dom';
import type { CategoriesState } from '@/hooks/useHeader';
import type { Collection } from '@/services/collection.service';

interface HeaderMobileDrawerProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  user: any;
  isAdmin: boolean;
  adminUrl: string;
  categories: CategoriesState;
  expandedMobileParents: Record<string, boolean>;
  toggleMobileParentExpand: (slug: string) => void;
  isMobileInspirationOpen: boolean;
  setIsMobileInspirationOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isMobileAboutOpen: boolean;
  setIsMobileAboutOpen: React.Dispatch<React.SetStateAction<boolean>>;
  collections: Collection[];
  handleLogout: () => void;
}

export const HeaderMobileDrawer: React.FC<HeaderMobileDrawerProps> = ({
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  user,
  isAdmin,
  adminUrl,
  categories,
  expandedMobileParents,
  toggleMobileParentExpand,
  isMobileInspirationOpen,
  setIsMobileInspirationOpen,
  isMobileAboutOpen,
  setIsMobileAboutOpen,
  collections,
  handleLogout,
}) => {
  if (!isMobileMenuOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex justify-end">
      {/* Dark Overlay */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Drawer Content - Right Aligned */}
      <div className="relative w-full max-w-xs bg-surface flex flex-col justify-between shadow-2xl z-10 overflow-y-auto">
        <div className="p-6">
          {/* Header trong Mobile Menu */}
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4 mb-6">
            <span className="font-headline-sm text-sm font-bold text-primary uppercase tracking-wider">
              Danh mục menu
            </span>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1 rounded-full text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Links Nav trên Di động */}
          <div className="flex flex-col gap-4 font-label-md text-sm text-on-surface">
            {/* Trang chủ */}
            <Link
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-2 border-b border-outline-variant/10 hover:text-primary transition-colors flex items-center justify-between"
            >
              <span>Trang chủ</span>
              <span className="material-symbols-outlined text-[16px] text-outline">
                chevron_right
              </span>
            </Link>

            {/* Danh mục Sản phẩm */}
            <div className="border-b border-outline-variant/10 pb-2">
              <div className="py-2 font-bold text-primary flex items-center justify-between">
                <span>Sản phẩm</span>
                <Link
                  to="/shop"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-xs text-secondary hover:underline font-normal"
                >
                  Xem tất cả
                </Link>
              </div>

              {/* Accordion Categories */}
              <div className="pl-2 space-y-1 mt-1">
                {categories.productTree.map((parent) => {
                  const hasChildren = parent.children && parent.children.length > 0;
                  const isExpanded = !!expandedMobileParents[parent.slug];

                  return (
                    <div key={parent.id} className="py-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-on-surface">
                        <Link
                          to={`/shop?category=${parent.slug}`}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="hover:text-primary transition-colors py-1 flex-1 uppercase"
                        >
                          {parent.name}
                        </Link>
                        {hasChildren && (
                          <button
                            onClick={() => toggleMobileParentExpand(parent.slug)}
                            className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {isExpanded ? 'expand_less' : 'expand_more'}
                            </span>
                          </button>
                        )}
                      </div>

                      {hasChildren && isExpanded && (
                        <div className="pl-3 border-l-2 border-primary/20 space-y-1.5 my-1.5">
                          {parent.children!
                            .filter((c) => !c.name.toLowerCase().includes('phòng'))
                            .map((child) => (
                              <Link
                                key={child.id}
                                to={`/shop?category=${child.slug}`}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="block text-[11px] text-on-surface-variant hover:text-primary py-0.5"
                              >
                                {child.name}
                              </Link>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Accordion Cảm hứng */}
            <div className="border-b border-outline-variant/10 py-2">
              <button
                onClick={() => setIsMobileInspirationOpen(!isMobileInspirationOpen)}
                className="w-full flex items-center justify-between py-1 text-on-surface font-label-md hover:text-primary transition-colors"
              >
                <span>Cảm hứng</span>
                <span className="material-symbols-outlined text-[18px]">
                  {isMobileInspirationOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {isMobileInspirationOpen && (
                <div className="pl-3 border-l-2 border-primary/20 space-y-3 my-2">
                  <div>
                    <h5 className="font-label-sm text-[11px] font-bold text-primary uppercase tracking-wider mb-1">
                      Không gian
                    </h5>
                    <div className="space-y-1 pl-1">
                      {collections
                        .filter((c) => c.name.toLowerCase().includes('phòng'))
                        .map((c) => (
                          <Link
                            key={c.id}
                            to={`/collection/${c.slug}`}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="block text-xs text-on-surface-variant hover:text-primary py-0.5"
                          >
                            {c.name}
                          </Link>
                        ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-label-sm text-[11px] font-bold text-primary uppercase tracking-wider mb-1">
                      Bộ sưu tập
                    </h5>
                    <div className="space-y-1 pl-1">
                      {collections
                        .filter((c) => !c.name.toLowerCase().includes('phòng'))
                        .map((c) => (
                          <Link
                            key={c.id}
                            to={`/collection/${c.slug}`}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="block text-xs text-on-surface-variant hover:text-primary py-0.5"
                          >
                            {c.name}
                          </Link>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Accordion Giới thiệu */}
            <div className="border-b border-outline-variant/10 py-2">
              <button
                onClick={() => setIsMobileAboutOpen(!isMobileAboutOpen)}
                className="w-full flex items-center justify-between py-1 text-on-surface font-label-md hover:text-primary transition-colors"
              >
                <span>Giới thiệu</span>
                <span className="material-symbols-outlined text-[18px]">
                  {isMobileAboutOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {isMobileAboutOpen && (
                <div className="pl-3 border-l-2 border-primary/20 space-y-1.5 my-2">
                  <Link
                    to="/about-furniture"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block text-xs text-on-surface-variant hover:text-primary py-0.5"
                  >
                    Về Nội thất
                  </Link>
                  <Link
                    to="/about-store"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block text-xs text-on-surface-variant hover:text-primary py-0.5"
                  >
                    Về Cửa hàng
                  </Link>
                  <Link
                    to="/warranty-policy"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block text-xs text-on-surface-variant hover:text-primary py-0.5"
                  >
                    Chính sách bảo hành
                  </Link>
                </div>
              )}
            </div>

            {/* Tin tức & Mẹo */}
            <Link
              to="/blog"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-2 border-b border-outline-variant/10 hover:text-primary transition-colors flex items-center justify-between"
            >
              <span>Tin tức & Mẹo</span>
              <span className="material-symbols-outlined text-[16px] text-outline">
                chevron_right
              </span>
            </Link>
          </div>
        </div>

        {/* Footer trong Mobile Menu */}
        <div className="p-6 bg-surface-container-low border-t border-outline-variant/20">
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-2xl">
                  account_circle
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-label-md text-xs font-bold text-on-surface truncate">
                    {user.name}
                  </p>
                  <p className="font-body-sm text-[10px] text-on-surface-variant truncate">
                    {user.email}
                  </p>
                </div>
              </div>

              {isAdmin && (
                <a
                  href={adminUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full py-2 px-3 bg-primary text-white hover:bg-primary-dark rounded-sm transition-colors flex items-center justify-between font-bold text-xs"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">
                      admin_panel_settings
                    </span>
                    <span>Trang Quản trị (Admin)</span>
                  </span>
                  <span className="material-symbols-outlined text-[14px]">
                    open_in_new
                  </span>
                </a>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 text-center text-xs font-semibold">
                <Link
                  to="/profile?tab=profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="py-2 bg-surface border border-outline-variant rounded hover:bg-surface-container-high transition-colors text-on-surface"
                >
                  Tài khoản
                </Link>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="py-2 bg-error/10 text-error border border-error/20 rounded hover:bg-error/20 transition-colors"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-2.5 bg-primary text-on-primary text-center font-label-md text-xs font-bold uppercase tracking-wider rounded shadow hover:bg-primary-dark transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-2.5 bg-surface border border-outline-variant text-on-surface text-center font-label-md text-xs font-bold uppercase tracking-wider rounded hover:bg-surface-container-high transition-colors"
              >
                Tạo tài khoản
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
