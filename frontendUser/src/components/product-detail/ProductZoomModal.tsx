import React from 'react';
import { type ProductFrontend } from '@/services/product.service';
import { productDetailImage } from '@/utils/cloudinaryUrl';

interface ProductZoomModalProps {
  isZoomOpen: boolean;
  setIsZoomOpen: (open: boolean) => void;
  zoomImage: string | null;
  activeImage: string;
  zoomType: 'product' | 'review';
  product: ProductFrontend;
  handlePrevImage: (e: React.MouseEvent) => void;
  handleNextImage: (e: React.MouseEvent) => void;
}

export const ProductZoomModal: React.FC<ProductZoomModalProps> = ({
  isZoomOpen,
  setIsZoomOpen,
  zoomImage,
  activeImage,
  zoomType,
  product,
  handlePrevImage,
  handleNextImage,
}) => {
  if (!isZoomOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 cursor-zoom-out backdrop-blur-sm"
      onClick={() => setIsZoomOpen(false)}
    >
      <img
        src={productDetailImage(zoomImage || activeImage)}
        alt={product.name}
        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
      />
      <button
        className="absolute top-4 right-4 text-white hover:text-primary transition-colors p-2 cursor-pointer bg-black/50 rounded-full"
        onClick={(e) => {
          e.stopPropagation();
          setIsZoomOpen(false);
        }}
      >
        <span className="material-symbols-outlined text-3xl block">close</span>
      </button>

      {/* Navigation Buttons */}
      {zoomType === 'product' && product.gallery && product.gallery.length > 1 && (
        <>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-primary transition-colors p-3 cursor-pointer bg-black/50 hover:bg-black/80 rounded-full flex items-center justify-center"
            onClick={handlePrevImage}
          >
            <span className="material-symbols-outlined text-4xl block">chevron_left</span>
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-primary transition-colors p-3 cursor-pointer bg-black/50 hover:bg-black/80 rounded-full flex items-center justify-center"
            onClick={handleNextImage}
          >
            <span className="material-symbols-outlined text-4xl block">chevron_right</span>
          </button>
        </>
      )}
    </div>
  );
};

export default ProductZoomModal;
