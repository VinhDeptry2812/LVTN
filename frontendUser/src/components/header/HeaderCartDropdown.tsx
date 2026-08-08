import React from 'react';
import { Link } from 'react-router-dom';
import { productCardImage } from '@/utils/cloudinaryUrl';

interface HeaderCartDropdownProps {
  cartDropdownRef: React.RefObject<HTMLDivElement | null>;
  isCartDropdownOpen: boolean;
  setIsCartDropdownOpen: (open: boolean) => void;
  cartCount: number;
  cartItems: any[];
  cartTotal: number;
  removeFromCart: (id: string) => void;
}

const formatAttributes = (attributes: Record<string, any> | undefined) => {
  if (!attributes || Object.keys(attributes).length === 0) return '';
  return Object.values(attributes)
    .map((val: any) => {
      const valStr = String(val);
      if (valStr.includes('|')) {
        return valStr.split('|')[0].trim();
      }
      return valStr.trim();
    })
    .join('|');
};

export const HeaderCartDropdown: React.FC<HeaderCartDropdownProps> = ({
  cartDropdownRef,
  isCartDropdownOpen,
  setIsCartDropdownOpen,
  cartCount,
  cartItems,
  cartTotal,
  removeFromCart,
}) => {
  return (
    <div className="relative" ref={cartDropdownRef}>
      <button
        onClick={() => setIsCartDropdownOpen(!isCartDropdownOpen)}
        aria-label={`Giỏ hàng${cartCount > 0 ? `, ${cartCount} sản phẩm` : ''}`}
        aria-expanded={isCartDropdownOpen}
        className={`p-2.5 min-w-[44px] min-h-[44px] rounded-full hover:bg-surface-container-low transition-colors duration-300 relative flex items-center justify-center cursor-pointer ${
          isCartDropdownOpen ? 'bg-surface-container-low text-primary' : ''
        }`}
      >
        <span
          className={`material-symbols-outlined block ${
            isCartDropdownOpen ? 'text-primary' : 'text-on-surface-variant'
          }`}
          aria-hidden="true"
        >
          shopping_cart
        </span>
        {cartCount > 0 && (
          <span
            className="absolute top-1 right-1 bg-primary text-on-primary text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-semibold"
            aria-hidden="true"
          >
            {cartCount}
          </span>
        )}
      </button>

      {/* Cart Dropdown (MOHO Style) */}
      <div
        className={`fixed sm:absolute top-16 sm:top-full right-3 sm:right-0 left-3 sm:left-auto mt-2 sm:mt-2 w-auto sm:w-[380px] bg-white border border-outline-variant/30 shadow-[0_10px_40px_rgba(0,0,0,0.08)] transition-all duration-300 z-50 rounded-sm sm:before:content-[''] sm:before:absolute sm:before:-top-2 sm:before:right-4 sm:before:border-8 sm:before:border-transparent sm:before:border-b-white ${
          isCartDropdownOpen
            ? 'opacity-100 visible translate-y-0'
            : 'opacity-0 invisible -translate-y-2'
        }`}
      >
        <div className="p-4 border-b border-outline-variant/15 flex items-center justify-between">
          <h3 className="font-headline-sm text-xs font-bold text-on-surface uppercase tracking-wider">
            Giỏ hàng của tôi ({cartCount})
          </h3>
          <button
            onClick={() => setIsCartDropdownOpen(false)}
            className="text-on-surface-variant hover:text-primary transition-colors flex items-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Cart Items List */}
        {cartCount > 0 ? (
          <>
            <div className="max-h-[280px] overflow-y-auto divide-y divide-outline-variant/10 px-4">
              {cartItems.map((item) => {
                const itemVariant = item.availableVariants?.find(
                  (v: any) => v.id === item.variantId
                );
                return (
                  <div key={item.id} className="py-3.5 flex gap-3">
                    <div className="w-16 h-16 bg-white border border-outline-variant/10 rounded-sm overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
                      <img
                        src={productCardImage(item.image)}
                        alt={item.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/product/${item.productId}`}
                        onClick={() => setIsCartDropdownOpen(false)}
                        className="block font-label-md text-xs font-bold text-on-surface hover:text-primary transition-colors truncate uppercase"
                      >
                        {item.name}
                      </Link>
                      {((itemVariant &&
                        itemVariant.attributes &&
                        Object.keys(itemVariant.attributes).length > 0) ||
                        (item.material && item.material !== 'Mặc định')) && (
                        <p className="font-body-sm text-[10.5px] text-on-surface-variant mt-0.5 italic">
                          {itemVariant &&
                          itemVariant.attributes &&
                          Object.keys(itemVariant.attributes).length > 0
                            ? formatAttributes(itemVariant.attributes)
                            : item.material?.includes('|')
                            ? item.material
                            : item.material
                                ?.split(' - ')
                                .map((s: string) => (s.includes('|') ? s.split('|')[0].trim() : s.trim()))
                                .join('|')}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-1.5 gap-1">
                        <span className="font-body-sm text-[11px] text-on-surface-variant">
                          Số lượng: {item.quantity}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.rawOldPrice && item.rawOldPrice > item.rawPrice && (
                            <span className="font-body-sm text-[10px] text-on-surface-variant line-through">
                              {new Intl.NumberFormat('vi-VN', {
                                style: 'currency',
                                currency: 'VND',
                              }).format(item.rawOldPrice * item.quantity)}
                            </span>
                          )}
                          <span className="font-label-md text-xs font-bold text-primary">
                            {new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND',
                            }).format(item.rawPrice * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-on-surface-variant/60 hover:text-error transition-colors self-start p-0.5 cursor-pointer"
                      aria-label="Xóa sản phẩm"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Dropdown Footer */}
            <div className="p-4 bg-surface-container-lowest/50 border-t border-outline-variant/15 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-xs font-bold text-on-surface uppercase tracking-wider">
                  Tổng cộng:
                </span>
                <span className="font-headline-sm text-sm font-bold text-error">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                    cartTotal
                  )}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  to="/cart"
                  onClick={() => setIsCartDropdownOpen(false)}
                  className="py-2.5 text-center text-xs font-semibold uppercase tracking-wider border border-[#4A4A4A] text-[#4A4A4A] hover:bg-[#4A4A4A] hover:text-white transition-all duration-300 rounded-sm"
                >
                  Xem giỏ hàng
                </Link>
                <Link
                  to="/checkout"
                  onClick={() => setIsCartDropdownOpen(false)}
                  className="py-2.5 text-center text-xs font-semibold uppercase tracking-wider bg-[#333333] hover:bg-black text-white transition-all duration-300 rounded-sm flex items-center justify-center"
                >
                  Thanh toán
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className="py-8 px-4 text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2">
              shopping_bag
            </span>
            <p className="font-body-md text-xs text-on-surface-variant mb-4">
              Giỏ hàng của bạn đang trống.
            </p>
            <Link
              to="/shop"
              onClick={() => setIsCartDropdownOpen(false)}
              className="inline-block px-5 py-2 bg-[#4A4A4A] text-white text-xs font-semibold uppercase tracking-wider hover:bg-black transition-colors rounded-sm"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
