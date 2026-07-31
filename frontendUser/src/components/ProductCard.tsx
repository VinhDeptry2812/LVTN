import { Link } from 'react-router-dom';
import { type ProductFrontend } from '@/services/product.service';
import { productCardImage } from '@/utils/cloudinaryUrl';
import { formatPrice } from '@/utils/format';

interface ProductCardProps {
  product: ProductFrontend;
  className?: string;
}

export default function ProductCard({ product, className = '' }: ProductCardProps) {
  const hoverImg = product.hoverImage || product.gallery?.find((img) => img.url !== product.image)?.url;

  return (
    <div className={`product-card-item group block h-full flex flex-col justify-between ${className}`}>
      <div>
        <Link to={`/product/${product.id}`} className="block relative aspect-[4/5] rounded-xl overflow-hidden bg-white/30 backdrop-blur-md border border-white/20 mb-3 transition-all duration-300">
          <img
            className={`absolute inset-0 w-full h-full object-contain p-0 transition-opacity duration-500 mix-blend-multiply ${hoverImg ? 'opacity-100 group-hover:opacity-0' : ''}`}
            src={productCardImage(product.image)}
            alt={product.name}
            loading="lazy"
          />
          {hoverImg && (
            <img
              className="absolute inset-0 w-full h-full object-contain p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 mix-blend-multiply"
              src={productCardImage(hoverImg)}
              alt={`${product.name} alternate view`}
              loading="lazy"
            />
          )}
          {product.isNew && (
            <span className="absolute top-6 right-1 sm:top-13 sm:right-2 lg:top-11 bg-primary/90 backdrop-blur-xs text-on-primary px-2 py-0.5 border border-primary-fixed/20 shadow-xs font-label-sm text-[10px] uppercase tracking-wider font-semibold rounded-md z-10">
              Mới
            </span>
          )}
          {product.discount && (
            <span className="absolute top-6  left-1  sm:top-13 sm:left-2 lg:top-11 bg-error text-on-error px-2 py-0.5 rounded-md font-label-sm text-[10px] sm:text-[11px] font-bold shadow-xs z-10">
              {product.discount}
            </span>
          )}
        </Link>

        {/* Product Info */}
        <Link to={`/product/${product.id}`} className="block">
          <h3 className="font-headline-md text-xs sm:text-sm md:text-base font-bold text-on-surface mb-1 line-clamp-1 group-hover:text-primary transition-colors duration-300">
            {product.name}
          </h3>
        </Link>

        {/* Rating & Sold count */}
        <div className="flex items-center justify-between gap-1 mb-1.5 font-body-sm text-[11px] sm:text-[12px] text-on-surface-variant flex-wrap sm:flex-nowrap">
          {product.rating > 0 ? (
            <div className="flex items-center gap-0.5">
              <span className="material-symbols-outlined fill-amber-400 text-amber-500 text-[13px] sm:text-[15px]">star</span>
              <span className="font-semibold text-on-surface text-[11px] sm:text-xs">{product.rating}</span>
            </div>
          ) : (
            <span className="text-on-surface-variant/60 italic text-[10px] sm:text-[11px]">(Chưa có)</span>
          )}

          {typeof product.soldCount === 'number' && product.soldCount >= 0 && (
            <span className="text-on-surface-variant/70 text-[10px] sm:text-[11px] font-medium bg-surface-container/60 px-1.5 py-0.5 rounded-full">
              Đã bán {product.soldCount}
            </span>
          )}
        </div>
      </div>

      {/* Pricing */}
      <div className="mt-auto pt-1.5 border-t border-outline-variant/10">
        <div className="flex flex-col items-start gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
          <span className="font-headline-md text-xs sm:text-sm md:text-base font-bold text-primary leading-tight">
            {formatPrice(product.rawPrice)}
          </span>
          {product.rawBasePrice && product.rawBasePrice > product.rawPrice ? (
            <span className="font-body-sm text-[10px] sm:text-xs text-on-surface-variant/60 line-through leading-tight">
              {formatPrice(product.rawBasePrice)}
            </span>
          ) : (
            <span className="inline-block h-[13px] sm:hidden" aria-hidden="true" />
          )}
        </div>
      </div>
    </div>
  );
}
