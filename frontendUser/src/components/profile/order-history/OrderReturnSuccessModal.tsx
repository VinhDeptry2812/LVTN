import React from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2 } from 'lucide-react';

interface OrderReturnSuccessModalProps {
  showReturnSuccess: boolean;
  submittedReturnInfo: any;
  onClose: () => void;
}

export const OrderReturnSuccessModal: React.FC<OrderReturnSuccessModalProps> = ({
  showReturnSuccess,
  submittedReturnInfo,
  onClose,
}) => {
  if (!showReturnSuccess || !submittedReturnInfo) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white rounded-sm w-full max-w-md shadow-2xl flex flex-col border border-outline-variant/30 transition-transform duration-300 scale-100 overflow-hidden">
        <div className="p-6 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold uppercase tracking-wider text-on-surface">
              Đã gửi yêu cầu đổi trả
            </h3>
            <p className="text-xs text-on-surface-variant/80">
              Mã đơn hàng:{' '}
              <strong className="text-primary font-mono">#{submittedReturnInfo.orderId}</strong>
            </p>
            <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 py-1.5 px-3 rounded-sm font-medium inline-block">
              Trạng thái: Chờ bộ phận kỹ thuật xác nhận
            </p>
          </div>

          {/* Tóm tắt sản phẩm đổi trả */}
          <div className="text-left bg-surface-container-low/40 p-3.5 rounded-sm border border-outline-variant/20 text-xs space-y-2.5">
            <div className="flex items-center justify-between font-bold text-[10px] text-on-surface uppercase tracking-wider border-b border-outline-variant/20 pb-2">
              <span>Sản phẩm đổi trả ({submittedReturnInfo.selectedItems?.length || 0})</span>
              <span>Phương án: {submittedReturnInfo.action_type === 'refund' ? 'Trả hàng' : 'Đổi mới'}</span>
            </div>
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
              {submittedReturnInfo.selectedItems?.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={item.image}
                      alt={item.productName}
                      className="w-8 h-8 object-cover rounded border border-outline-variant/20 shrink-0 bg-surface-container-low"
                    />
                    <div className="truncate">
                      <p className="font-semibold text-on-surface truncate text-xs">{item.productName}</p>
                      <p className="text-[10px] text-on-surface-variant/70">Số lượng: x{item.quantity}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-left bg-surface-container-low/30 p-4 rounded-sm border border-outline-variant/20 text-xs space-y-3">
            <h4 className="font-bold text-on-surface uppercase tracking-wider text-[10px]">
              Hướng dẫn các bước tiếp theo:
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-on-surface-variant leading-relaxed">
              <li>
                <strong>Giữ nguyên hiện trạng:</strong> Vui lòng không tiếp tục tự ý lắp ráp hoặc sửa chữa sản phẩm bị lỗi.
              </li>
              <li>
                <strong>Đóng gói lại sản phẩm:</strong> Để sản phẩm bị lỗi cùng các phụ kiện đi kèm vào lại thùng carton cũ.
              </li>
              <li>
                <strong>Kỹ thuật viên liên hệ:</strong> CSKH sẽ gọi điện xác nhận lỗi trong 24h làm việc.
              </li>
            </ol>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-primary/95 transition cursor-pointer"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
