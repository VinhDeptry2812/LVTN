import React from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Camera, X } from 'lucide-react';
import { getProductImage } from '@/utils/image';
import { formatAttributes } from './useOrderHistory';

interface OrderReturnModalProps {
  returnOrder: any;
  onClose: () => void;
  selectedReturnItems: number[];
  handleToggleReturnItem: (itemId: number) => void;
  handleToggleAllReturnItems: () => void;
  returnQuantities: { [key: number]: number };
  handleUpdateReturnQuantity: (itemId: number, delta: number, maxQuantity: number) => void;
  returnReason: string;
  setReturnReason: (reason: string) => void;
  returnActionType: 'exchange' | 'refund';
  setReturnActionType: (type: 'exchange' | 'refund') => void;
  returnDescription: string;
  setReturnDescription: (desc: string) => void;
  returnImagePreviews: string[];
  setReturnImagePreviews: React.Dispatch<React.SetStateAction<string[]>>;
  setReturnImageFiles: React.Dispatch<React.SetStateAction<File[]>>;
  handleUploadReturnImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  submittingReturn: boolean;
  onSubmitReturnRequest: () => void;
}

export const OrderReturnModal: React.FC<OrderReturnModalProps> = ({
  returnOrder,
  onClose,
  selectedReturnItems,
  handleToggleReturnItem,
  handleToggleAllReturnItems,
  returnQuantities,
  handleUpdateReturnQuantity,
  returnReason,
  setReturnReason,
  returnActionType,
  setReturnActionType,
  returnDescription,
  setReturnDescription,
  returnImagePreviews,
  setReturnImagePreviews,
  setReturnImageFiles,
  handleUploadReturnImage,
  submittingReturn,
  onSubmitReturnRequest,
}) => {
  if (!returnOrder) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white rounded-sm w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col border border-outline-variant/30 transition-transform duration-300 scale-100">
        <div className="flex items-center justify-between p-5 border-b border-outline-variant/30 bg-surface-container-low/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600 text-xl">assignment_return</span>
            <h3 className="text-base font-bold uppercase tracking-wider text-on-surface">
              Yêu cầu đổi trả hàng lỗi <span className="font-mono text-red-600 font-bold">#{returnOrder.id}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-low text-on-surface-variant/70 hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 text-sm">
          <div className="bg-red-50/50 border border-red-200/60 p-4 rounded-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-semibold text-red-900 text-xs uppercase tracking-wider">
                Chính sách đổi trả hàng lỗi
              </h4>
              <p className="text-xs text-red-800 leading-relaxed">
                Nội thất gỗ cao cấp hỗ trợ đổi mới 1-1 hoặc hoàn tiền đối với các sản phẩm gặp lỗi do nhà sản xuất (nứt, vỡ gỗ, trầy xước sơn bề mặt nặng, sai lệch kích thước...) trong vòng 7 ngày kể từ khi nhận hàng. Vui lòng cung cấp hình ảnh thực tế để được xử lý nhanh nhất.
              </p>
            </div>
          </div>

          {/* Danh sách sản phẩm đổi trả */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-xs uppercase tracking-widest text-on-surface-variant">
                Chọn sản phẩm cần đổi trả ({selectedReturnItems.length}/{returnOrder.items?.length || 0}):
              </label>
              {returnOrder.items && returnOrder.items.length > 1 && (
                <button
                  type="button"
                  onClick={handleToggleAllReturnItems}
                  className="text-xs text-primary hover:underline font-bold uppercase tracking-wider cursor-pointer"
                >
                  {selectedReturnItems.length === returnOrder.items.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
              )}
            </div>

            {selectedReturnItems.length === 0 && (
              <p className="text-xs text-red-600 font-medium bg-red-50/80 px-3 py-2 rounded-xs border border-red-200/80 flex items-center gap-1.5 animate-pulse">
                <span className="material-symbols-outlined text-sm">warning</span>
                Vui lòng tích chọn ít nhất 1 sản phẩm cần đổi trả trước khi gửi yêu cầu.
              </p>
            )}

            <div className="border border-outline-variant/30 rounded-sm divide-y divide-outline-variant/20 overflow-hidden bg-surface-container-lowest/50">
              {returnOrder.items?.map((item: any) => {
                const isSelected = selectedReturnItems.includes(item.id);
                const currentQty = returnQuantities[item.id] ?? item.quantity;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleReturnItem(item.id)}
                    className={`p-3.5 flex items-center gap-4 cursor-pointer transition-colors hover:bg-surface-container-low/20 ${
                      isSelected ? 'bg-primary/5' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4.5 h-4.5 rounded-sm border-outline text-primary focus:ring-primary cursor-pointer"
                    />
                    <img
                      src={getProductImage(item)}
                      alt={item.product?.name || 'Sản phẩm'}
                      loading="lazy"
                      decoding="async"
                      className="w-12 h-12 object-cover rounded-sm border border-outline-variant/15 shrink-0 bg-surface-container-low"
                    />
                    <div className="flex-1 min-w-0">
                      <h5 className="font-semibold text-xs text-on-surface truncate">
                        {item.product?.name || 'Sản phẩm'}
                      </h5>
                      <p className="text-[10px] text-on-surface-variant/70 mt-0.5">
                        Sản phẩm:{' '}
                        {item.variant?.attributes
                          ? formatAttributes(item.variant.attributes)
                          : 'Mặc định'}
                      </p>
                      <p className="text-[10px] text-on-surface-variant/70 mt-1">
                        Đã mua: <strong className="text-on-surface font-semibold">{item.quantity}</strong>
                      </p>
                    </div>

                    {isSelected && (
                      <div
                        className="flex items-center gap-1 bg-white border border-outline/30 rounded-xs p-1 shrink-0 shadow-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[10px] text-on-surface-variant font-medium mr-1 hidden sm:inline">Số lượng lỗi:</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateReturnQuantity(item.id, -1, item.quantity)}
                          disabled={currentQty <= 1}
                          className="w-6 h-6 flex items-center justify-center bg-surface-container-high hover:bg-outline/20 text-on-surface font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed rounded-xs transition-colors"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-bold text-xs text-rose-600">
                          {currentQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateReturnQuantity(item.id, 1, item.quantity)}
                          disabled={currentQty >= item.quantity}
                          className="w-6 h-6 flex items-center justify-center bg-surface-container-high hover:bg-outline/20 text-on-surface font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed rounded-xs transition-colors"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lý do đổi trả */}
          <div className="space-y-2">
            <label className="font-bold text-xs uppercase tracking-widest text-on-surface-variant">
              Lý do đổi trả:
            </label>
            <select
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary rounded-sm transition-all duration-200 text-xs"
            >
              <option value="Sản phẩm bị nứt, vỡ, trầy xước bề mặt gỗ">
                Sản phẩm bị nứt, vỡ, trầy xước bề mặt gỗ
              </option>
              <option value="Sai lệch kích thước, màu sắc so với mô tả">
                Sai lệch kích thước, màu sắc so với mô tả
              </option>
              <option value="Thiếu phụ kiện, ốc vít lắp đặt đi kèm">
                Thiếu phụ kiện, ốc vít lắp đặt đi kèm
              </option>
              <option value="Sản phẩm bị cong vênh, không lắp ráp được">
                Sản phẩm bị cong vênh, không lắp ráp được
              </option>
              <option value="Lý do khác">Lý do khác (Vui lòng ghi rõ ở mô tả bên dưới)</option>
            </select>
          </div>

          {/* Phương án đổi trả mong muốn */}
          <div className="space-y-2.5">
            <label className="font-bold text-xs uppercase tracking-widest text-on-surface-variant block">
              Phương án giải quyết mong muốn:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setReturnActionType('exchange')}
                className={`p-3.5 border rounded-sm cursor-pointer transition-all flex items-start gap-3 select-none ${
                  returnActionType === 'exchange'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-outline hover:bg-surface-container-low/20 text-on-surface'
                }`}
              >
                <input
                  type="radio"
                  checked={returnActionType === 'exchange'}
                  onChange={() => {}}
                  className="w-4 h-4 text-primary focus:ring-primary cursor-pointer mt-0.5"
                />
                <div>
                  <h5 className="font-bold text-xs">Đổi mới sản phẩm 1-1</h5>
                  <p className="text-[10px] text-on-surface-variant/70 mt-1 leading-relaxed">
                    Nhận lại sản phẩm mới cùng loại nếu sản phẩm nhận được gặp lỗi do nhà sản xuất (miễn phí vận chuyển thu hồi & đổi mới).
                  </p>
                </div>
              </div>

              <div
                onClick={() => setReturnActionType('refund')}
                className={`p-3.5 border rounded-sm cursor-pointer transition-all flex items-start gap-3 select-none ${
                  returnActionType === 'refund'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-outline hover:bg-surface-container-low/20 text-on-surface'
                }`}
              >
                <input
                  type="radio"
                  checked={returnActionType === 'refund'}
                  onChange={() => {}}
                  className="w-4 h-4 text-primary focus:ring-primary cursor-pointer mt-0.5"
                />
                <div>
                  <h5 className="font-bold text-xs">Trả hàng và hoàn tiền</h5>
                  <p className="text-[10px] text-on-surface-variant/70 mt-1 leading-relaxed">
                    Thu hồi sản phẩm lỗi và hoàn trả lại số tiền tương ứng của sản phẩm đã mua qua hình thức chuyển khoản ngân hàng.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Mô tả chi tiết lỗi */}
          <div className="space-y-2">
            <label className="font-bold text-xs uppercase tracking-widest text-on-surface-variant">
              Mô tả chi tiết tình trạng lỗi (Bắt buộc):
            </label>
            <textarea
              value={returnDescription}
              onChange={(e) => setReturnDescription(e.target.value)}
              placeholder="Ví dụ: Mặt bàn gỗ sồi bị nứt dài khoảng 10cm ở góc phải..."
              rows={4}
              className="w-full px-3 py-2 bg-white border border-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary rounded-sm transition-all duration-200 text-xs leading-relaxed"
            />
          </div>

          {/* Tải ảnh minh họa lỗi */}
          <div className="space-y-3">
            <label className="font-bold text-xs uppercase tracking-widest text-on-surface-variant">
              Hình ảnh minh họa tình trạng lỗi:
            </label>
            <div className="grid grid-cols-4 gap-3">
              {returnImagePreviews.map((previewUrl, index) => (
                <div
                  key={index}
                  className="relative aspect-square border border-outline-variant/40 rounded-sm overflow-hidden bg-surface-container-low group"
                >
                  <img src={previewUrl} alt="Lỗi sản phẩm" className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[8px] text-center py-0.5">
                    Chờ gửi
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(previewUrl);
                      setReturnImagePreviews((prev) => prev.filter((_, idx) => idx !== index));
                      setReturnImageFiles((prev) => prev.filter((_, idx) => idx !== index));
                    }}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {returnImagePreviews.length < 4 && (
                <label className="aspect-square border border-dashed border-outline-variant hover:border-primary hover:bg-primary/5 transition-all duration-300 rounded-sm flex flex-col items-center justify-center gap-1.5 cursor-pointer text-on-surface-variant/70 hover:text-primary">
                  <Camera className="w-5 h-5 font-light" />
                  <span className="text-[9px] font-semibold uppercase tracking-wider">Tải ảnh</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadReturnImage}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-outline-variant/30 bg-surface-container-low/20 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-outline hover:bg-surface-container-low text-on-surface text-xs font-bold uppercase tracking-wider rounded-sm transition-all duration-300 cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            onClick={onSubmitReturnRequest}
            disabled={submittingReturn}
            className="px-5 py-2 bg-red-600 border border-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-all duration-300 text-xs font-bold uppercase tracking-wider rounded-sm cursor-pointer flex items-center gap-1.5"
          >
            {submittingReturn && (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
            )}
            Gửi yêu cầu đổi trả
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
