import React from 'react';
import { createPortal } from 'react-dom';
import { Star, Camera, X } from 'lucide-react';

interface ProductReviewModalProps {
  reviewOrder: any;
  selectedProductToReview: any;
  reviewProductImage: string;
  modalRating: number;
  setModalRating: (rating: number) => void;
  hoverRating: number;
  setHoverRating: (rating: number) => void;
  modalComment: string;
  setModalComment: (comment: string) => void;
  modalImages: string[];
  setModalImages: React.Dispatch<React.SetStateAction<string[]>>;
  modalImagePreviews: string[];
  setModalImagePreviews: React.Dispatch<React.SetStateAction<string[]>>;
  setModalImageFiles: React.Dispatch<React.SetStateAction<File[]>>;
  modalIsAnonymous: boolean;
  setModalIsAnonymous: (val: boolean) => void;
  submittingReview: boolean;
  editingReviewId: number | null;
  onClose: () => void;
  onSubmit: () => void;
  onUploadImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ProductReviewModal: React.FC<ProductReviewModalProps> = ({
  reviewOrder,
  selectedProductToReview,
  reviewProductImage,
  modalRating,
  setModalRating,
  hoverRating,
  setHoverRating,
  modalComment,
  setModalComment,
  modalImages,
  setModalImages,
  modalImagePreviews,
  setModalImagePreviews,
  setModalImageFiles,
  modalIsAnonymous,
  setModalIsAnonymous,
  submittingReview,
  editingReviewId,
  onClose,
  onSubmit,
  onUploadImage,
}) => {
  if (!reviewOrder || !selectedProductToReview) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white rounded-sm w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col border border-outline-variant/30 scale-100 transition-transform duration-300">
        <div className="flex items-center justify-between p-5 border-b border-outline-variant/30 bg-[#FAF7F2]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#5A6B53] text-xl">rate_review</span>
            <h3 className="text-base font-bold uppercase tracking-wider text-[#5A6B53]">
              {editingReviewId ? 'Chỉnh sửa đánh giá sản phẩm' : 'Viết đánh giá sản phẩm'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-low text-on-surface-variant/70 hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-6 space-y-4 flex-1">
          <div className="space-y-5">
            <div className="flex items-center gap-3 bg-surface-container-low/20 p-3 border border-outline-variant/30 rounded-sm">
              <img
                src={reviewProductImage}
                alt={selectedProductToReview?.name || 'Sản phẩm'}
                loading="lazy"
                decoding="async"
                className="w-12 h-12 object-cover bg-surface-container-low rounded-sm border border-outline-variant/20 shrink-0"
                onError={(e: any) => {
                  e.target.src =
                    'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=100&auto=format&fit=crop&q=60';
                }}
              />
              <div className="min-w-0">
                <h4 className="font-bold text-xs text-[#5A6B53]">{selectedProductToReview?.name || 'Sản phẩm'}</h4>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">
                Đánh giá của bạn:
              </label>
              <div className="flex items-center gap-1.5" onMouseLeave={() => setHoverRating(0)}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const isActive = (hoverRating || modalRating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setModalRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      className="cursor-pointer focus:outline-none transition-transform hover:scale-110 duration-150"
                    >
                      <Star
                        size={32}
                        className={`transition-all duration-155 ${
                          isActive
                            ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_3px_rgba(251,191,36,0.6)]'
                            : 'text-slate-300 fill-transparent hover:text-amber-300'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">
                Nhận xét & Bình luận:
              </label>
              <textarea
                rows={4}
                value={modalComment}
                onChange={(e) => setModalComment(e.target.value)}
                placeholder="Hãy để lại ý kiến của bạn về chất liệu, độ hoàn thiện, quá trình đóng gói và vận chuyển của sản phẩm này..."
                className="w-full p-3.5 rounded-sm border border-outline-variant/60 bg-white text-on-surface focus:outline-none focus:ring-1 focus:ring-[#5A6B53] placeholder:text-slate-400 text-xs leading-relaxed"
              ></textarea>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">
                Hình ảnh đính kèm (Tối đa 3 ảnh):
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {modalImages.map((imgUrl, index) => (
                  <div
                    key={`existing-${index}`}
                    className="relative w-20 h-20 border border-outline-variant/50 rounded-sm overflow-hidden bg-slate-50 shrink-0"
                  >
                    <img src={imgUrl} alt={`existing-img-${index}`} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-[#5A6B53]/85 text-white text-[8px] text-center py-0.5 font-medium">
                      Đã đăng
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setModalImages((prev) => prev.filter((_, idx) => idx !== index));
                      }}
                      className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center transition-colors cursor-pointer"
                      title="Xóa ảnh này"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}

                {modalImagePreviews.map((previewUrl, index) => (
                  <div
                    key={`new-${index}`}
                    className="relative w-20 h-20 border border-outline-variant/50 rounded-sm overflow-hidden bg-slate-50 shrink-0"
                  >
                    <img src={previewUrl} alt={`review-img-${index}`} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-amber-600/85 text-white text-[8px] text-center py-0.5 font-medium">
                      Mới chọn
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        URL.revokeObjectURL(previewUrl);
                        setModalImagePreviews((prev) => prev.filter((_, idx) => idx !== index));
                        setModalImageFiles((prev) => prev.filter((_, idx) => idx !== index));
                      }}
                      className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center transition-colors cursor-pointer"
                      title="Xóa ảnh này"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}

                {(modalImages.length + modalImagePreviews.length) < 3 && (
                  <label className="w-20 h-20 rounded-sm border border-dashed border-outline-variant/80 hover:border-[#5A6B53] flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-[#5A6B53] cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-all shrink-0">
                    <Camera size={20} />
                    <span className="text-[9px] mt-1 font-semibold">Tải ảnh lên</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onUploadImage}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/20">
              <input
                type="checkbox"
                id="modal-anonymous-checkbox"
                checked={modalIsAnonymous}
                onChange={(e) => setModalIsAnonymous(e.target.checked)}
                className="w-4 h-4 text-[#5A6B53] rounded border-outline-variant/60 focus:ring-[#5A6B53] cursor-pointer"
              />
              <label
                htmlFor="modal-anonymous-checkbox"
                className="text-xs text-on-surface-variant cursor-pointer select-none font-medium"
              >
                Đánh giá ẩn danh (Tên sẽ hiển thị dạng: <span className="font-semibold text-on-surface">Khách hàng</span>)
              </label>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-outline-variant/30 bg-surface-container-low/20 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-outline-variant hover:bg-surface-container-low text-on-surface text-xs font-bold uppercase tracking-wider rounded-sm transition-all duration-300 cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={onSubmit}
            disabled={submittingReview}
            className="px-5 py-2 bg-[#5A6B53] border border-[#5A6B53] text-white hover:bg-[#4a5a43] disabled:opacity-50 transition-all duration-300 text-xs font-bold uppercase tracking-wider rounded-sm cursor-pointer flex items-center gap-1.5"
          >
            {submittingReview && (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
            )}
            {editingReviewId ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
