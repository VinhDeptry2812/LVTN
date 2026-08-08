import React from 'react';
import { createPortal } from 'react-dom';

interface OrderCancelModalProps {
  cancelModalOrderId: number | null;
  onClose: () => void;
  cancelReasonOption: string;
  setCancelReasonOption: (option: string) => void;
  customCancelReason: string;
  setCustomCancelReason: (reason: string) => void;
  isSubmittingCancel: boolean;
  onConfirmCancel: () => void;
}

export const OrderCancelModal: React.FC<OrderCancelModalProps> = ({
  cancelModalOrderId,
  onClose,
  cancelReasonOption,
  setCancelReasonOption,
  customCancelReason,
  setCustomCancelReason,
  isSubmittingCancel,
  onConfirmCancel,
}) => {
  if (cancelModalOrderId === null) return null;

  const cancelOptions = [
    'Đổi ý không muốn mua nữa',
    'Muốn thay đổi địa chỉ nhận hàng',
    'Muốn thay đổi sản phẩm / kích thước',
    'Tìm thấy giá tốt hơn ở nơi khác',
    'Thời gian giao hàng quá lâu',
    'Lý do khác',
  ];

  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white rounded-sm w-full max-w-md shadow-2xl flex flex-col border border-outline-variant/30 overflow-hidden">
        <div className="p-5 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-error-container/20 text-error flex items-center justify-center font-bold">
              !
            </div>
            <div>
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">
                Xác nhận hủy đơn hàng #{cancelModalOrderId}
              </h3>
              <p className="text-[11px] text-on-surface-variant">Vui lòng chọn lý do hủy đơn bên dưới</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-sm transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-on-surface block">
              Lý do hủy đơn <span className="text-error">*</span>
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {cancelOptions.map((option) => (
                <label
                  key={option}
                  className={`flex items-center gap-3 p-2.5 rounded border text-xs cursor-pointer transition ${
                    cancelReasonOption === option
                      ? 'border-primary bg-primary/5 font-medium text-primary'
                      : 'border-outline-variant/40 hover:bg-surface-container-low text-on-surface'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancelReason"
                    value={option}
                    checked={cancelReasonOption === option}
                    onChange={() => setCancelReasonOption(option)}
                    className="accent-primary"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </div>

          {cancelReasonOption === 'Lý do khác' && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="text-xs font-semibold text-on-surface block">
                Nhập chi tiết lý do <span className="text-error">*</span>
              </label>
              <textarea
                value={customCancelReason}
                onChange={(e) => setCustomCancelReason(e.target.value)}
                placeholder="Mô tả lý do hủy đơn của bạn..."
                rows={3}
                className="w-full text-xs p-2.5 rounded border border-outline-variant/40 focus:border-primary focus:outline-none bg-surface-container-low"
              />
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded text-[11px] leading-relaxed">
            <strong>Lưu ý:</strong> Hành động hủy đơn hàng không thể hoàn tác. Các mã giảm giá đã sử dụng cho đơn hàng này sẽ được hoàn lại (nếu còn hiệu lực).
          </div>
        </div>

        <div className="p-4 border-t border-outline-variant/20 bg-surface-container-low flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-on-surface-variant hover:bg-surface-container rounded transition cursor-pointer"
            disabled={isSubmittingCancel}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={onConfirmCancel}
            disabled={isSubmittingCancel}
            className="px-4 py-2 text-xs font-bold text-white bg-error hover:bg-error/90 rounded transition shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            {isSubmittingCancel ? 'Đang xử lý...' : 'Xác nhận hủy đơn'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
