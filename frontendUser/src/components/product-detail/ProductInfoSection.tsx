import React from 'react';
import { type ProductFrontend } from '@/services/product.service';
import { type ProductReviewsResponse } from '@/services/review.service';
import toast from 'react-hot-toast';

const COLOR_MAP: Record<string, string> = {
  'trắng': '#ffffff',
  'đen': '#000000',
  'xám': '#808080',
  'đỏ': '#ff0000',
  'xanh lá': '#008000',
  'xanh dương': '#0000ff',
  'xanh': '#2b6cb0',
  'vàng': '#ecc94b',
  'cam': '#dd6b20',
  'hồng': '#ed64a6',
  'nâu': '#744210',
  'kem': '#fffdd0',
  'be': '#f5f5dc',
  'gỗ': '#8b5a2b',
  'white': '#ffffff',
  'black': '#000000',
  'gray': '#808080',
  'red': '#ff0000',
  'green': '#008000',
  'blue': '#0000ff',
  'yellow': '#ecc94b',
  'orange': '#dd6b20',
  'pink': '#ed64a6',
  'brown': '#744210',
  'beige': '#f5f5dc',
};

interface ProductInfoSectionProps {
  product: ProductFrontend;
  currentVariant: any;
  selectedVariantId: number | string | null;
  setSelectedVariantId: (id: number | string | null) => void;
  selectedAttributes: Record<string, string>;
  isSimpleProduct: boolean;
  displayPrice: string;
  displayOldPrice: string | null;
  attributeGroups: Record<string, Set<string>> | null;
  quantity: number;
  setQuantity: (qty: number) => void;
  handleQuantityChange: (amount: number) => void;
  isAdding: 'idle' | 'loading' | 'success';
  reviewsData: ProductReviewsResponse;
  isShippingOpen: boolean;
  setIsShippingOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleAttributeSelect: (key: string, value: string) => void;
  handleAddToCart: () => void;
  handleBuyNow: () => void;
  scrollToReviews: () => void;
  setActiveImage: (url: string) => void;
}

export const ProductInfoSection: React.FC<ProductInfoSectionProps> = ({
  product,
  currentVariant,
  selectedVariantId,
  setSelectedVariantId,
  selectedAttributes,
  isSimpleProduct,
  displayPrice,
  displayOldPrice,
  attributeGroups,
  quantity,
  setQuantity,
  handleQuantityChange,
  isAdding,
  reviewsData,
  isShippingOpen,
  setIsShippingOpen,
  handleAttributeSelect,
  handleAddToCart,
  handleBuyNow,
  scrollToReviews,
  setActiveImage,
}) => {
  return (
    <div className="detail-info-block col-span-1 lg:col-span-5 w-full min-w-0 flex flex-col space-y-4">
      {/* Product Title & Pricing */}
      <div className="border-b border-outline-variant/30 pb-6 mb-2 space-y-3">
        <div className="space-y-2">
          <h1 className="font-headline-lg text-2xl sm:text-3xl md:text-4xl text-on-surface tracking-wide font-semibold leading-tight break-words min-w-0">
            {product.name}
          </h1>
          <div className="flex items-baseline space-x-3">
            <p
              className="text-3xl text-[#5A6B53] font-light font-sans tracking-tight"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {displayPrice}
            </p>
            {displayOldPrice && (
              <>
                <p
                  className="text-lg text-on-surface-variant/60 line-through font-sans"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {displayOldPrice}
                </p>
                {product.discount && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-red-600 text-white rounded uppercase tracking-wider shadow-xs">
                    {product.discount}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#5A6B53] font-label-sm">
          <span className="text-on-surface-variant">Mã SP: {product.sku || product.id}</span>
          <span className="text-on-surface-variant">•</span>
          <div
            onClick={scrollToReviews}
            className="flex items-center gap-1 cursor-pointer hover:underline"
            title="Bấm để xem danh sách đánh giá"
          >
            <span className="text-on-surface-variant">Đánh giá:</span>
            {reviewsData.totalReviews > 0 ? (
              <span className="flex items-center gap-1 font-bold text-amber-500 normal-case">
                {reviewsData.averageRating.toFixed(1)} ★ ({reviewsData.totalReviews})
              </span>
            ) : (
              <span className="text-on-surface-variant/60 font-medium normal-case">Chưa có đánh giá</span>
            )}
          </div>
        </div>
      </div>

      {/* Selection: Variants & Colors */}
      {!isSimpleProduct && (
        attributeGroups && Object.keys(attributeGroups).length > 0 ? (
          Object.entries(attributeGroups).map(([key, valueSet]) => {
            const isColorGroup = key.toLowerCase().includes('màu');
            const selectedVal = selectedAttributes[key];
            const displaySelectedVal = selectedVal
              ? selectedVal.includes('|')
                ? selectedVal.split('|')[0]
                : selectedVal
              : '';

            return (
              <div key={key} className="space-y-2">
                <p className="font-label-md text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  {key}
                  {isColorGroup && displaySelectedVal && (
                    <span className="normal-case text-on-surface ml-1.5 font-bold">: {displaySelectedVal}</span>
                  )}
                </p>
                <div className="flex flex-wrap gap-3">
                  {Array.from(valueSet).map((val) => {
                    const isSelected = selectedAttributes[key] === val;
                    const isColorAttr = key.toLowerCase().includes('màu');
                    let displayVal = val;
                    let colorCode: string | null = null;

                    if (isColorAttr) {
                      if (val.includes('|')) {
                        const parts = val.split('|');
                        displayVal = parts[0];
                        colorCode = parts[1];
                      } else {
                        const cleanVal = val.trim().toLowerCase();
                        colorCode = COLOR_MAP[cleanVal] || null;
                      }
                    }

                    if (isColorAttr && colorCode) {
                      return (
                        <button
                          key={val}
                          onClick={() => handleAttributeSelect(key, val)}
                          className={`relative flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-all duration-300 border ${
                            isSelected
                              ? 'border-[#5A6B53] ring-[1.5px] ring-[#5A6B53] ring-offset-[3px] scale-105'
                              : 'border-outline-variant hover:ring-[1px] hover:ring-outline hover:ring-offset-[2px] hover:scale-105 shadow-xs'
                          }`}
                          style={{ backgroundColor: colorCode }}
                          title={displayVal}
                        >
                          <span className="sr-only">{displayVal}</span>
                          {isSelected && (
                            <svg
                              className="w-4 h-4 text-white mix-blend-difference"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      );
                    }

                    return (
                      <button
                        key={val}
                        onClick={() => handleAttributeSelect(key, val)}
                        className={`px-4 py-2 rounded-lg cursor-pointer transition-all duration-300 text-xs font-label-md border font-semibold ${
                          isSelected
                            ? 'border-[#5A6B53] bg-[#5A6B53] text-white shadow-xs'
                            : 'border-outline-variant bg-transparent text-on-surface hover:bg-on-surface hover:text-surface'
                        }`}
                      >
                        {displayVal}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          product.variants && product.variants.length > 0 && (
            <div className="space-y-2">
              <p className="font-label-md text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                BIẾN THỂ
              </p>
              <div className="flex flex-wrap gap-3">
                {product.variants.map((variant: any) => {
                  const variantLabel = variant.sku || `Biến thể ${variant.id}`;
                  const isSelected = selectedVariantId === variant.id;
                  return (
                    <button
                      key={variant.id}
                      onClick={() => {
                        const newSelectedId = isSelected ? null : variant.id;
                        setSelectedVariantId(newSelectedId);
                        if (newSelectedId && variant.image_url) {
                          setActiveImage(variant.image_url);
                        } else if (!newSelectedId && product.gallery && product.gallery.length > 0) {
                          setActiveImage(product.gallery[0].url);
                        }
                      }}
                      className={`px-4 py-2 rounded-lg cursor-pointer transition-all duration-300 text-xs font-label-md border font-semibold ${
                        isSelected
                          ? 'border-[#5A6B53] bg-[#5A6B53] text-white shadow-xs'
                          : 'border-outline-variant bg-transparent text-on-surface hover:bg-on-surface hover:text-surface'
                      }`}
                    >
                      {variantLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          )
        )
      )}

      {/* Specifications (Thông số kỹ thuật giữ nguyên thứ tự nhập) */}
      {product.specs && (
        Array.isArray(product.specs)
          ? product.specs.length > 0
          : Object.keys(product.specs).length > 0
      ) && (
        <div className="py-2 space-y-2 !mt-2">
          {(Array.isArray(product.specs)
            ? product.specs.map((item: any) => {
                if (Array.isArray(item)) return item;
                if (item && typeof item === 'object') {
                  if ('key' in item && 'value' in item) return [item.key, item.value];
                  if ('name' in item && 'value' in item) return [item.name, item.value];
                  const entries = Object.entries(item);
                  if (entries.length > 0) return entries[0];
                }
                return ['', ''];
              })
            : Object.entries(product.specs)
          ).map(([key, value], index) => (
            key ? (
              <p key={`${key}-${index}`} className="text-body-sm text-on-surface min-w-0 break-words">
                <span className="font-bold capitalize">{key}: </span><br />
                <span className="text-on-surface-variant whitespace-pre-line leading-relaxed break-words">{value}</span>
              </p>
            ) : null
          ))}
        </div>
      )}

      {/* Trạng thái tồn kho */}
      <div className="text-sm flex items-center gap-2 !mt-4">
        <span className="text-on-surface-variant font-medium">Trạng thái:</span>
        {currentVariant ? (
          currentVariant.stock > 0 ? (
            <span className="text-emerald-600 font-bold">
              Còn {currentVariant.stock} sản phẩm
            </span>
          ) : (
            <span className="text-rose-600 font-bold">
              Hết hàng
            </span>
          )
        ) : (
          <span className="text-rose-600 font-bold">
            Hết hàng
          </span>
        )}
      </div>

      {/* Selection: Quantity */}
      {currentVariant && (currentVariant.stock || 0) > 0 && (
        <div className="flex items-center space-x-4 !mt-3">
          <div className="flex items-center border border-outline-variant rounded-xl bg-surface-container-low px-1 py-0.5">
            <button
              onClick={() => handleQuantityChange(-1)}
              className="p-1 hover:text-primary transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">remove</span>
            </button>
            <input
              type="text"
              value={quantity === 0 ? '' : quantity}
              onChange={(e) => {
                const val = e.target.value;
                const maxStock = currentVariant ? (currentVariant.stock || 0) : 0;
                if (val === '') {
                  setQuantity(0);
                } else {
                  const parsed = parseInt(val, 10);
                  if (!isNaN(parsed) && parsed > 0 && /^\d+$/.test(val)) {
                    if (parsed > maxStock) {
                      toast.error(`Chỉ còn ${maxStock} sản phẩm trong kho`);
                      setQuantity(maxStock);
                    } else {
                      setQuantity(parsed);
                    }
                  }
                }
              }}
              onBlur={() => {
                const maxStock = currentVariant ? (currentVariant.stock || 0) : 0;
                if (quantity < 1) {
                  setQuantity(1);
                } else if (quantity > maxStock) {
                  setQuantity(maxStock);
                }
              }}
              className="w-12 text-center font-label-md text-on-surface bg-transparent focus:outline-none font-bold"
            />
            <button
              onClick={() => handleQuantityChange(1)}
              className="p-1 hover:text-primary transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">add</span>
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-3 !mt-3 w-full">
        {(() => {
          const isOutOfStock = !currentVariant || (currentVariant.stock || 0) <= 0;
          if (isOutOfStock) {
            return (
              <button
                disabled
                className="w-full py-3.5 px-2 border rounded-xl text-xs sm:text-sm bg-slate-200 text-slate-500 border-slate-300 font-bold uppercase cursor-not-allowed text-center shadow-none tracking-normal leading-normal"
              >
                SẢN PHẨM HIỆN TẠI HẾT HÀNG
              </button>
            );
          }
          return (
            <>
              <button
                onClick={handleAddToCart}
                disabled={isAdding !== 'idle'}
                className={`flex-1 py-4 border rounded-xl font-label-md text-label-md shadow-xs hover:shadow-md active:scale-[0.98] transition-all duration-300 cursor-pointer flex items-center justify-center space-x-2 font-bold uppercase ${
                  isAdding === 'success'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-100'
                    : 'border-[#5A6B53] text-[#5A6B53] bg-transparent hover:bg-[#5A6B53] hover:text-white'
                }`}
              >
                {isAdding === 'loading' ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#5A6B53]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>ĐANG XỬ LÝ...</span>
                  </>
                ) : isAdding === 'success' ? (
                  <>
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                    <span>ĐÃ THÊM!</span>
                  </>
                ) : (
                  <span>THÊM VÀO GIỎ</span>
                )}
              </button>
              <button
                onClick={handleBuyNow}
                className="flex-1 py-4 border rounded-xl font-label-md text-label-md shadow-xs hover:shadow-md active:scale-[0.98] transition-all duration-300 cursor-pointer flex items-center justify-center font-bold uppercase bg-[#5A6B53] text-white border-[#5A6B53] hover:opacity-95"
              >
                <span>MUA NGAY</span>
              </button>
            </>
          );
        })()}
      </div>

      {/* Trust Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 py-4 mt-2 border-t border-b border-outline-variant/30">
        <div className="flex items-center gap-2 text-on-surface-variant min-w-0">
          <span className="material-symbols-outlined text-[#5A6B53] text-[24px] sm:text-[28px] shrink-0">local_shipping</span>
          <span className="font-label-sm text-[10px] sm:text-xs leading-tight min-w-0 flex-1 break-words">
            Giao hàng & Lắp đặt<br />
            <strong className="text-on-surface font-bold">Miễn phí</strong>
          </span>
        </div>
        <div className="flex items-center gap-2 text-on-surface-variant min-w-0">
          <span className="material-symbols-outlined text-[#5A6B53] text-[24px] sm:text-[28px] shrink-0">shield</span>
          <span className="font-label-sm text-[10px] sm:text-xs leading-tight min-w-0 flex-1 break-words">
            Bảo hành<br />
            <strong className="text-on-surface font-bold">2 năm</strong>
          </span>
        </div>
        <div className="flex items-center gap-2 text-on-surface-variant min-w-0">
          <span className="material-symbols-outlined text-[#5A6B53] text-[24px] sm:text-[28px] shrink-0">cached</span>
          <span className="font-label-sm text-[10px] sm:text-xs leading-tight min-w-0 flex-1 break-words">
            Đổi trả 1 - 1<br />
            <strong className="text-on-surface font-bold">Trong 15 ngày</strong>
          </span>
        </div>
        <div className="flex items-center gap-2 text-on-surface-variant min-w-0">
          <span className="material-symbols-outlined text-[#5A6B53] text-[24px] sm:text-[28px] shrink-0">verified</span>
          <span className="font-label-sm text-[10px] sm:text-xs leading-tight min-w-0 flex-1 break-words">
            Chất liệu<br />
            <strong className="text-on-surface font-bold">Đạt chuẩn quốc tế</strong>
          </span>
        </div>
      </div>

      {/* Accordion: Delivery & Return Information */}
      <div className="pt-2 space-y-0">
        <div className="border-b border-surface-container-highest">
          <button
            onClick={() => setIsShippingOpen((prev) => !prev)}
            className="w-full py-3 flex justify-between items-center text-left hover:text-[#5A6B53] transition-colors group cursor-pointer"
          >
            <span className="font-bold text-xs uppercase tracking-wider text-on-surface group-hover:text-[#5A6B53]">
              VẬN CHUYỂN & ĐỔI TRẢ
            </span>
            <span className="material-symbols-outlined text-base transition-transform duration-300">
              {isShippingOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {isShippingOpen && (
            <div className="pb-4 text-xs text-on-surface-variant leading-relaxed space-y-2 font-normal animate-fadeIn">
              <p>• Miễn phí giao hàng cho đơn hàng trên 5.000.000đ tại nội thành TP.HCM và Hà Nội.</p>
              <p>• Thời gian giao hàng từ 2 - 5 ngày làm việc tùy thuộc vào địa điểm.</p>
              <p>• Hỗ trợ đổi trả miễn phí trong vòng 15 ngày nếu sản phẩm có lỗi từ nhà sản xuất.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductInfoSection;
