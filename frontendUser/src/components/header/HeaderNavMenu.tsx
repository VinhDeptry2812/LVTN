import React from 'react';
import { Link } from 'react-router-dom';
import type { CategoriesState } from '@/hooks/useHeader';
import type { Collection } from '@/services/collection.service';
import logoImg from '@/assets/logo/logo.png';

interface HeaderNavMenuProps {
  categories: CategoriesState;
  collections: Collection[];
  isActive: (path: string) => boolean;
}

export const HeaderNavMenu: React.FC<HeaderNavMenuProps> = ({
  categories,
  collections,
  isActive,
}) => {
  return (
    <div className="flex items-center gap-4 md:gap-6 lg:gap-sp-xl">
      {/* Logo Thương Hiệu */}
      <Link to="/" className="flex items-center hover:opacity-90 transition-opacity py-1 shrink-0">
        <img
          src={logoImg}
          alt="Logo Nội thất"
          className="h-[48px] sm:h-[52px] md:h-[54px] lg:h-[60px] w-auto object-contain transition-all"
        />
      </Link>

      {/* Desktop Navigation Links */}
      <div className="hidden md:flex items-center gap-4 lg:gap-sp-md">
        {/* Mục: Trang chủ */}
        <div className="relative group py-6">
          <Link
            to="/"
            className={`font-label-md text-label-md relative flex items-center transition-colors ${
              isActive('/')
                ? 'text-primary font-bold'
                : 'text-on-surface-variant group-hover:text-primary'
            }`}
          >
            <span>Trang chủ</span>
            {isActive('/') && (
              <span className="absolute -bottom-1 left-0 w-full h-[2.5px] bg-primary rounded-full"></span>
            )}
          </Link>
        </div>

        {/* Dropdown: Sản phẩm (Mega Menu) */}
        <div className="group py-6">
          <Link
            to="/shop"
            className="font-label-md text-label-md text-on-surface-variant group-hover:text-primary transition-colors cursor-pointer flex items-center gap-1"
          >
            Sản phẩm <span className="material-symbols-outlined text-[18px]">expand_more</span>
          </Link>

          {/* Mega Menu Container */}
          {categories.productTree.length > 0 && (
            <div className="absolute top-full left-0 right-0 w-full bg-surface-container-lowest border border-outline-variant/60 shadow-[0_25px_60px_rgba(0,0,0,0.15)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 p-8 rounded-b-2xl max-h-[85vh] overflow-y-auto">
              <div className="columns-5 gap-8 space-y-6">
                {categories.productTree.map((parent) => (
                  <div key={parent.id} className="break-inside-avoid flex flex-col mb-6">
                    <Link
                      to={`/shop?category=${parent.slug}`}
                      className="relative group/link font-headline-sm text-xs font-bold text-primary hover:text-primary-dark mb-2.5 uppercase tracking-wider border-b border-primary/20 pb-1.5 flex items-center justify-between"
                    >
                      <span>{parent.name}</span>
                      <span className="text-[10px] text-outline opacity-0 group-hover/link:opacity-100 transition-opacity">
                        →
                      </span>
                    </Link>
                    <div className="flex flex-col gap-1.5">
                      {parent.children &&
                        parent.children.length > 0 &&
                        parent.children
                          .filter((child) => !child.name.toLowerCase().includes('phòng'))
                          .map((child) => (
                            <Link
                              key={child.id}
                              to={`/shop?category=${child.slug}`}
                              className="font-body-md text-xs text-on-surface-variant hover:text-primary hover:translate-x-1 transition-all py-0.5 truncate"
                            >
                              {child.name}
                            </Link>
                          ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dropdown: Cảm hứng (Gộp Không gian và Bộ sưu tập) */}
        <div className="relative group py-6">
          <span
            className={`font-label-md text-label-md transition-colors cursor-pointer flex items-center gap-1 ${
              isActive('/collection')
                ? 'text-primary'
                : 'text-on-surface-variant group-hover:text-primary'
            }`}
          >
            Cảm hứng <span className="material-symbols-outlined text-[18px]">expand_more</span>
          </span>
          {collections.length > 0 && (
            <div className="absolute top-[80%] left-0 w-96 bg-surface-container-lowest border border-outline-variant shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 p-6 grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-headline-sm text-xs font-bold text-primary mb-3 uppercase tracking-wider">
                  Không gian
                </h4>
                <div className="flex flex-col gap-2">
                  {collections
                    .filter((c) => c.name.toLowerCase().includes('phòng'))
                    .map((collection) => (
                      <Link
                        key={collection.id}
                        to={`/collection/${collection.slug}`}
                        className="group/link block font-body-sm text-on-surface hover:text-primary transition-colors py-0.5"
                      >
                        <span className="relative inline-block">
                          {collection.name}
                          <span className="absolute -bottom-0.5 left-0 w-full h-[1.5px] bg-primary origin-right scale-x-0 transition-transform duration-300 ease-out group-hover/link:origin-left group-hover/link:scale-x-100"></span>
                        </span>
                      </Link>
                    ))}
                </div>
              </div>
              <div>
                <h4 className="font-headline-sm text-xs font-bold text-primary mb-3 uppercase tracking-wider">
                  Bộ sưu tập
                </h4>
                <div className="flex flex-col gap-2">
                  {collections
                    .filter((c) => !c.name.toLowerCase().includes('phòng'))
                    .map((col) => (
                      <Link
                        key={col.id}
                        to={`/collection/${col.slug}`}
                        className="group/link block font-body-sm text-on-surface hover:text-primary transition-colors py-0.5"
                      >
                        <span className="relative inline-block">
                          {col.name}
                          <span className="absolute -bottom-0.5 left-0 w-full h-[1.5px] bg-primary origin-right scale-x-0 transition-transform duration-300 ease-out group-hover/link:origin-left group-hover/link:scale-x-100"></span>
                        </span>
                      </Link>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dropdown: Giới thiệu */}
        <div className="relative group py-6">
          <span
            className={`font-label-md text-label-md transition-colors cursor-pointer flex items-center gap-1 ${
              isActive('/about-furniture') ||
              isActive('/about-store') ||
              isActive('/warranty-policy')
                ? 'text-primary'
                : 'text-on-surface-variant group-hover:text-primary'
            }`}
          >
            Giới thiệu <span className="material-symbols-outlined text-[18px]">expand_more</span>
          </span>
          <div className="absolute top-[80%] left-0 w-56 bg-surface-container-lowest border border-outline-variant shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 pt-2 pb-2">
            <Link
              to="/about-furniture"
              className="group/link block px-5 py-2 font-body-sm text-on-surface hover:text-primary transition-colors"
            >
              <span className="relative inline-block">
                Về Nội thất
                <span className="absolute -bottom-0.5 left-0 w-full h-[1.5px] bg-primary origin-right scale-x-0 transition-transform duration-300 ease-out group-hover/link:origin-left group-hover/link:scale-x-100"></span>
              </span>
            </Link>
            <Link
              to="/about-store"
              className="group/link block px-5 py-2 font-body-sm text-on-surface hover:text-primary transition-colors"
            >
              <span className="relative inline-block">
                Về Cửa hàng
                <span className="absolute -bottom-0.5 left-0 w-full h-[1.5px] bg-primary origin-right scale-x-0 transition-transform duration-300 ease-out group-hover/link:origin-left group-hover/link:scale-x-100"></span>
              </span>
            </Link>
            <Link
              to="/warranty-policy"
              className="group/link block px-5 py-2 font-body-sm text-on-surface hover:text-primary transition-colors"
            >
              <span className="relative inline-block">
                Chính sách bảo hành
                <span className="absolute -bottom-0.5 left-0 w-full h-[1.5px] bg-primary origin-right scale-x-0 transition-transform duration-300 ease-out group-hover/link:origin-left group-hover/link:scale-x-100"></span>
              </span>
            </Link>
          </div>
        </div>

        {/* Mục: Tin tức & Mẹo */}
        <div className="relative group py-6">
          <Link
            to="/blog"
            className={`font-label-md text-label-md relative flex items-center transition-colors ${
              isActive('/blog')
                ? 'text-primary font-bold'
                : 'text-on-surface-variant group-hover:text-primary'
            }`}
          >
            <span>Tin tức & Mẹo</span>
            {isActive('/blog') && (
              <span className="absolute -bottom-1 left-0 w-full h-[2.5px] bg-primary rounded-full"></span>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
};
