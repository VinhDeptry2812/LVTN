import React from 'react';
import { type ProductFrontend } from '@/services/product.service';
import { productDetailImage, productCardImage } from '@/utils/cloudinaryUrl';

interface ProductGalleryProps {
  product: ProductFrontend;
  activeImage: string;
  setActiveImage: (url: string) => void;
  filteredGallery: any[];
  thumbnailDrag: any;
  setZoomImage: (url: string) => void;
  setZoomType: (type: 'product' | 'review') => void;
  setIsZoomOpen: (open: boolean) => void;
  handlePrevImage: (e: React.MouseEvent) => void;
  handleNextImage: (e: React.MouseEvent) => void;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({
  product,
  activeImage,
  setActiveImage,
  filteredGallery,
  thumbnailDrag,
  setZoomImage,
  setZoomType,
  setIsZoomOpen,
  handlePrevImage,
  handleNextImage,
}) => {
  const handleOpenZoom = () => {
    setZoomImage(activeImage || product.image);
    setZoomType('product');
    setIsZoomOpen(true);
  };

  return (
    <div className="detail-gallery col-span-1 lg:col-span-7 w-full min-w-0 flex flex-col md:flex-row gap-4 lg:gap-6 h-auto md:max-h-[680px] lg:sticky lg:top-28">
      {/* Main Image Container - Right side */}
      <div
        className="relative w-full min-w-0 flex-1 aspect-square md:aspect-auto md:h-[680px] overflow-hidden cursor-pointer group order-1 md:order-2 rounded-2xl bg-white shadow-sm border border-outline-variant/30"
        onClick={handleOpenZoom}
        title="Bấm vào ảnh để phóng to"
      >
        <img
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 gallery-main-image"
          src={productDetailImage(activeImage || product.image)}
          alt={product.name}
        />

        {/* Navigation Arrows */}
        {filteredGallery && filteredGallery.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrevImage(e);
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md border border-black/5 text-on-surface flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:scale-110 shadow-sm cursor-pointer z-10"
              title="Ảnh trước"
            >
              <span className="material-symbols-outlined text-xl">chevron_left</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNextImage(e);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md border border-black/5 text-on-surface flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:scale-110 shadow-sm cursor-pointer z-10"
              title="Ảnh tiếp theo"
            >
              <span className="material-symbols-outlined text-xl">chevron_right</span>
            </button>
          </>
        )}
      </div>

      {/* Thumbnails Stream - Left Vertical Column */}
      {filteredGallery && filteredGallery.length > 1 && (
        <div
          ref={thumbnailDrag.ref}
          {...thumbnailDrag.events}
          className={`flex md:flex-col space-x-3 md:space-x-0 md:space-y-3 overflow-x-auto md:overflow-y-auto no-scrollbar py-2 md:py-0 px-1 w-full max-w-full min-w-0 md:w-20 order-2 md:order-1 select-none ${
            thumbnailDrag.isMouseDown ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          {filteredGallery.map((imgObj: any, idx: number) => {
            const isSelected = activeImage === imgObj.url;
            return (
              <button
                key={idx}
                onMouseEnter={() => {
                  if (imgObj.url) {
                    const img = new Image();
                    img.src = productDetailImage(imgObj.url);
                  }
                }}
                onClick={() => {
                  if (thumbnailDrag.isDragging) return;
                  setActiveImage(imgObj.url);
                }}
                className={`flex-shrink-0 w-20 h-20 md:w-full md:h-20 rounded-xl overflow-hidden shadow-sm transition-all duration-200 border-2 cursor-pointer ${
                  isSelected
                    ? 'border-[#5A6B53] scale-[0.98]'
                    : 'border-transparent hover:border-[#5A6B53]/50 hover:opacity-90'
                }`}
              >
                <img
                  className="w-full h-full object-cover pointer-events-none"
                  src={productCardImage(imgObj.url)}
                  alt={`Gallery index ${idx}`}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductGallery;
