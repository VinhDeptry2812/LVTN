import React from 'react';
import { createPortal } from 'react-dom';
import { getProductImage } from '@/utils/image';
import { formatDateTime } from '@/utils/format';
import { formatAttributes, parseReturnItemsHelper } from './useOrderHistory';

import OrderTrackingTimeline from '@/components/OrderTrackingTimeline';


interface OrderDetailModalProps {
  selectedOrder: any;
  onClose: () => void;
  onCompleteOrder: (orderId: number) => void;
  onCancelOrder: (orderId: number) => void;
  onOpenReturnModal: (order: any) => void;
  onDownloadInvoice: (orderId: number) => void;
  onOpenReview: (order: any, product: any, variant: any) => void;
  getExistingReview: (orderId: number | undefined, productId: number) => any;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  selectedOrder,
  onClose,
  onCompleteOrder,
  onCancelOrder,
  onOpenReturnModal,
  onDownloadInvoice,
  onOpenReview,
  getExistingReview,
}) => {
  if (!selectedOrder) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white rounded-sm w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col border border-outline-variant/30 transition-transform duration-300 scale-100">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-outline-variant/30 bg-surface-container-low/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">receipt_long</span>
            <h3 className="text-base font-bold uppercase tracking-wider text-on-surface">
              Chi tiết đơn hàng <span className="font-mono text-primary font-bold">#{selectedOrder.id}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-low text-on-surface-variant/70 hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* Order Tracking Timeline Widget */}
          <div className="bg-slate-50/80 p-4 rounded border border-slate-200/80 shadow-sm">
            <OrderTrackingTimeline status={selectedOrder.status} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface-container-low/20 p-4 border border-outline-variant/30 rounded-sm text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-on-surface-variant/80 uppercase text-[10px] tracking-wider">
                  Ngày đặt:
                </span>
                <span className="text-on-surface font-medium">
                  {formatDateTime(selectedOrder.created_at)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-on-surface-variant/80 uppercase text-[10px] tracking-wider">
                  Trạng thái đơn hàng:
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                    selectedOrder.status === 'return_pending'
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : selectedOrder.status === 'return_approved'
                      ? 'bg-blue-50 text-blue-800 border-blue-300'
                      : selectedOrder.status === 'return_rejected'
                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                      : selectedOrder.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : selectedOrder.status === 'delivered'
                      ? 'bg-teal-50 text-teal-700 border-teal-200'
                      : selectedOrder.status === 'cancelled'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : selectedOrder.status === 'shipping'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : selectedOrder.status === 'confirmed'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-stone-50 text-stone-700 border-stone-200'
                  }`}
                >
                  {(selectedOrder.status === 'return_pending' && 'Đang chờ đổi trả') ||
                    (selectedOrder.status === 'return_approved' && 'Đổi trả đã được duyệt') ||
                    (selectedOrder.status === 'return_rejected' && 'Đổi trả bị từ chối') ||
                    (selectedOrder.status === 'pending' && 'Chờ xử lý') ||
                    (selectedOrder.status === 'confirmed' && 'Đã xác nhận') ||
                    (selectedOrder.status === 'shipping' && 'Đang giao') ||
                    (selectedOrder.status === 'delivered' && 'Đã giao hàng') ||
                    (selectedOrder.status === 'completed' && 'Hoàn thành') ||
                    (selectedOrder.status === 'cancelled' && 'Đã hủy')}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-on-surface-variant/80 uppercase text-[10px] tracking-wider">
                  Hình thức thanh toán:
                </span>
                <span className="text-on-surface font-medium uppercase tracking-wide">
                  {selectedOrder.payment_method === 'cod' && 'Thanh toán khi nhận hàng (COD)'}
                  {selectedOrder.payment_method === 'vnpay' && 'Thanh toán qua VNPay'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-on-surface-variant/80 uppercase text-[10px] tracking-wider">
                  Trạng thái thanh toán:
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                    selectedOrder.payment_status === 'paid'
                      ? 'bg-primary/8 text-primary border-primary/20'
                      : 'bg-error/8 text-error border-error/20'
                  }`}
                >
                  {selectedOrder.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                </span>
              </div>
            </div>
          </div>

          {/* Thông tin vận chuyển */}
          <div className="space-y-2.5 text-sm">
            <h4 className="font-bold text-xs uppercase tracking-widest text-on-surface border-b border-outline-variant/30 pb-1.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-primary">local_shipping</span>
              Thông tin giao hàng
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 bg-white p-2 text-on-surface-variant">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block text-on-surface-variant/50">
                  Số điện thoại nhận hàng
                </span>
                <span className="font-semibold text-on-surface text-sm">{selectedOrder.phone}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block text-on-surface-variant/50">
                  Địa chỉ giao hàng
                </span>
                <span className="text-on-surface text-sm">{selectedOrder.shipping_address}</span>
              </div>
              {selectedOrder.notes && (
                <div className="col-span-1 sm:col-span-2 pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider block text-on-surface-variant/50">
                    Ghi chú đơn hàng
                  </span>
                  <p className="text-on-surface bg-surface-container-low/30 p-2.5 rounded-sm border border-outline-variant/20 italic text-sm mt-0.5">
                    "{selectedOrder.notes}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Danh sách sản phẩm */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-widest text-on-surface border-b border-outline-variant/30 pb-1.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-primary">inventory_2</span>
              Danh sách sản phẩm ({selectedOrder.items?.length || 0})
            </h4>
            <div className="divide-y divide-outline-variant/20 max-h-[300px] overflow-y-auto border border-outline-variant/25 rounded-sm bg-white shadow-sm">
              {selectedOrder.items?.map((item: any) => {
                const material =
                  item.variant?.attributes && Object.keys(item.variant.attributes).length > 0
                    ? formatAttributes(item.variant.attributes)
                    : 'Mặc định';

                return (
                  <div
                    key={item.id}
                    className="p-4 flex items-center gap-4 hover:bg-surface-container-low/10 transition-colors"
                  >
                    <img
                      src={getProductImage(item)}
                      alt={item.product?.name || 'Sản phẩm'}
                      loading="lazy"
                      decoding="async"
                      className="w-16 h-16 object-cover bg-surface-container-low rounded-sm border border-outline-variant/20 shrink-0"
                      onError={(e: any) => {
                        e.target.src =
                          'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=100&auto=format&fit=crop&q=60';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h5 className="font-semibold text-sm text-on-surface truncate">
                        {item.product?.name || 'Sản phẩm'}
                      </h5>
                      <p className="text-xs text-on-surface-variant/70 mt-0.5">Loại: {material}</p>
                      <p className="text-xs text-on-surface-variant/70 mt-0.5">
                        Số lượng:{' '}
                        <span className="font-semibold text-on-surface">{item.quantity}</span>
                      </p>
                      {(selectedOrder.status === 'completed' || selectedOrder.status === 'delivered') &&
                        (() => {
                          const existingRev = item.product?.id ? getExistingReview(selectedOrder.id, item.product.id) : null;
                          if (!existingRev) {
                            return (
                              <button
                                onClick={() => item.product && onOpenReview(selectedOrder, item.product, item.variant)}
                                className="mt-1.5 px-3 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors text-[10px] font-bold uppercase tracking-wider rounded-sm cursor-pointer flex items-center gap-1 w-fit"
                              >
                                <span className="material-symbols-outlined text-[12px]">rate_review</span>
                                Đánh giá
                              </button>
                            );
                          }
                          if ((existingRev.edit_count ?? 0) < 1) {
                            return (
                              <button
                                onClick={() => item.product && onOpenReview(selectedOrder, item.product, item.variant)}
                                className="mt-1.5 px-3 py-1 bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 transition-colors text-[10px] font-bold uppercase tracking-wider rounded-sm cursor-pointer flex items-center gap-1 w-fit"
                                title="Bạn được phép chỉnh sửa đánh giá 1 lần"
                              >
                                <span className="material-symbols-outlined text-[12px]">edit</span>
                                Sửa đánh giá
                              </button>
                            );
                          }
                          return (
                            <button
                              disabled
                              className="mt-1.5 px-3 py-1 bg-slate-100 text-slate-400 border border-slate-200 text-[10px] font-bold uppercase tracking-wider rounded-sm flex items-center gap-1 w-fit cursor-not-allowed"
                              title="Bạn đã chỉnh sửa đánh giá 1 lần"
                            >
                              <span className="material-symbols-outlined text-[12px]">done_all</span>
                              Đã đánh giá
                            </button>
                          );
                        })()}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm text-on-surface">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                          Number(item.price)
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Thông tin yêu cầu đổi trả nếu có */}
          {(() => {
            const returnReq = selectedOrder.return_request || (
              ((selectedOrder as any).return_items || (selectedOrder as any).return_reason) ? {
                action_type: (selectedOrder as any).return_action_type || 'refund',
                reason: (selectedOrder as any).return_reason || 'Yêu cầu đổi trả',
                description: (selectedOrder as any).return_description || '',
                items: (selectedOrder as any).return_items,
                rejected_reason: (selectedOrder as any).rejected_reason,
                images: (selectedOrder as any).return_images || [],
              } : null
            );

            if (!returnReq) return null;

            return (
              <div className="border border-red-200 bg-red-50/40 p-4 rounded-sm space-y-3">
                <div className="flex items-center justify-between border-b border-red-200/60 pb-2">
                  <div className="flex items-center gap-2 text-red-700 font-bold uppercase tracking-wider text-xs">
                    <span className="material-symbols-outlined text-[18px]">assignment_return</span>
                    Thông tin yêu cầu đổi trả
                  </div>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                      selectedOrder.status === 'return_approved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : selectedOrder.status === 'return_rejected'
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : 'bg-amber-50 text-amber-700 border-amber-300'
                    }`}
                  >
                    {selectedOrder.status === 'return_approved'
                      ? 'Chấp nhận đổi trả'
                      : selectedOrder.status === 'return_rejected'
                      ? 'Bị từ chối'
                      : 'Chờ xử lý'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-on-surface-variant">
                  <div>
                    <span className="font-semibold text-on-surface">Phương thức yêu cầu:</span>{' '}
                    <span className="font-medium text-red-600">
                      {returnReq.action_type === 'exchange'
                        ? 'Đổi mới 1-1'
                        : 'Trả hàng & Hoàn tiền'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-on-surface">Lý do chính:</span>{' '}
                    {returnReq.reason}
                  </div>
                </div>

                {returnReq.description && (
                  <div className="text-xs text-on-surface-variant">
                    <span className="font-semibold text-on-surface">Mô tả chi tiết:</span>{' '}
                    <p className="italic bg-white/70 p-2 rounded border border-red-100 mt-1">
                      "{returnReq.description}"
                    </p>
                  </div>
                )}

                {/* Danh sách sản phẩm được yêu cầu đổi trả */}
                <div className="space-y-2 border-t border-red-200/60 pt-3">
                  <span className="text-xs font-bold text-on-surface uppercase tracking-wider block">
                    Danh sách sản phẩm yêu cầu đổi trả:
                  </span>
                  <div className="divide-y divide-red-200/40 bg-white/80 rounded border border-red-200/60 overflow-hidden">
                    {(() => {
                      const rawItems = selectedOrder.return_request?.items || selectedOrder.return_items;
                      const parsedReturnItems = parseReturnItemsHelper(rawItems);

                      return selectedOrder.items?.map((item: any) => {
                        let isReturned = false;
                        let returnedQty = item.quantity || 1;

                        if (parsedReturnItems.length === 0 && selectedOrder.return_request) {
                          isReturned = true;
                        } else {
                          const match = parsedReturnItems.find((ri) => Number(ri.itemId) === Number(item.id));

                          if (match) {
                            isReturned = true;
                            returnedQty = match.quantity
                              ? Math.min(Math.max(Number(match.quantity), 1), item.quantity)
                              : item.quantity;
                          }
                        }

                        if (!isReturned) return null;

                        const totalItemPrice = Number(item.price || 0) * returnedQty;

                        return (
                          <div key={item.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <img
                                src={getProductImage(item)}
                                alt={item.product?.name || 'Sản phẩm'}
                                className="w-12 h-12 object-cover rounded border border-outline-variant/20 shrink-0 bg-surface-container-low"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h6 className="font-bold text-on-surface truncate text-xs">
                                    {item.product?.name || 'Sản phẩm'}
                                  </h6>
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-100 text-red-700 rounded border border-red-200 shrink-0">
                                    Sản phẩm lỗi
                                  </span>
                                </div>
                                {item.variant?.attributes && (
                                  <p className="text-[10px] text-on-surface-variant/70 mt-0.5 truncate">
                                    Sản phẩm: {formatAttributes(item.variant.attributes)}
                                  </p>
                                )}
                                <div className="text-[11px] text-on-surface-variant mt-1 flex items-center gap-3">
                                  <span>
                                    Số lượng trả: <strong className="text-red-600 font-bold">x{returnedQty}</strong>{' '}
                                    <span className="text-on-surface-variant/60 font-normal">(Đã mua: x{item.quantity})</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-red-600 text-xs block">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalItemPrice)}
                              </span>
                              <span className="text-[10px] text-on-surface-variant/70">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(item.price || 0))}/cái
                              </span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {returnReq.rejected_reason && (
                  <div className="text-xs text-red-700 bg-red-100/80 p-2.5 rounded border border-red-200 space-y-1">
                    <span className="font-bold">Lý do Admin từ chối:</span>
                    <p className="italic">{returnReq.rejected_reason}</p>
                  </div>
                )}

                {returnReq.images && returnReq.images.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-on-surface">
                      Hình ảnh bằng chứng:
                    </span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {returnReq.images.map((img: string, idx: number) => (
                        <a key={idx} href={img} target="_blank" rel="noreferrer">
                          <img
                            src={img}
                            alt={`Lỗi ${idx + 1}`}
                            className="w-14 h-14 object-cover rounded border border-red-200 hover:scale-105 transition-transform"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Tóm tắt chi phí */}
          <div className="space-y-2 border-t border-outline-variant/30 pt-4 text-sm font-medium">
            <div className="flex justify-between text-on-surface-variant/90">
              <span>Tổng tiền sản phẩm:</span>
              <span>
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                  selectedOrder.items?.reduce(
                    (total: number, item: any) => total + Number(item.price) * item.quantity,
                    0
                  ) || 0
                )}
              </span>
            </div>
            {Number(selectedOrder.discount_amount) > 0 && (
              <div className="flex justify-between text-error font-semibold">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">sell</span>
                  Mã giảm giá ({selectedOrder.voucher_code}):
                </span>
                <span>
                  -
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                    Number(selectedOrder.discount_amount)
                  )}
                </span>
              </div>
            )}
            <div className="flex justify-between text-on-surface-variant/90">
              <span>Phí vận chuyển:</span>
              <span className="text-primary font-bold">Miễn phí</span>
            </div>
            <div className="flex justify-between text-base font-bold text-on-surface border-t border-outline-variant/20 pt-2.5">
              <span>Tổng thanh toán:</span>
              <span className="text-primary font-headline">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                  Number(selectedOrder.total_amount)
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-outline-variant/30 bg-surface-container-low/20 flex flex-wrap items-center justify-end gap-3">
          {selectedOrder.status === 'delivered' && (
            <button
              onClick={() => onCompleteOrder(selectedOrder.id)}
              className="px-5 py-2 bg-emerald-600 border border-emerald-600 text-white hover:bg-emerald-700 transition-all duration-300 text-xs font-bold uppercase tracking-wider rounded-sm cursor-pointer"
            >
              Đã nhận hàng
            </button>
          )}

          {selectedOrder.status === 'pending' && (
            <button
              onClick={() => onCancelOrder(selectedOrder.id)}
              className="px-5 py-2 border border-error/45 text-error hover:bg-error hover:text-white transition-all duration-300 text-xs font-bold uppercase tracking-wider rounded-sm cursor-pointer"
            >
              Hủy đơn hàng
            </button>
          )}

          {selectedOrder.status === 'completed' && (
            <button
              onClick={() => {
                onOpenReturnModal(selectedOrder);
                onClose();
              }}
              className="px-5 py-2 border border-red-600/45 text-red-600 hover:bg-red-600 hover:text-white transition-all duration-300 text-xs font-bold uppercase tracking-wider rounded-sm cursor-pointer"
            >
              Yêu cầu đổi trả
            </button>
          )}

          {selectedOrder.status !== 'cancelled' && (
            (selectedOrder.payment_status === 'paid' ||
             selectedOrder.status === 'completed' ||
             selectedOrder.status === 'delivered') ? (
              <button
                onClick={() => onDownloadInvoice(selectedOrder.id)}
                className="px-5 py-2 border border-primary/45 text-primary hover:bg-primary hover:text-white transition-all duration-300 text-xs font-bold uppercase tracking-wider rounded-sm cursor-pointer"
              >
                Tải hóa đơn (PDF)
              </button>
            ) : (
              <button
                disabled
                className="px-5 py-2 border border-slate-200 bg-slate-100 text-slate-400 transition-all duration-300 text-xs font-bold uppercase tracking-wider rounded-sm cursor-not-allowed"
                title="Hóa đơn chỉ khả dụng sau khi đơn hàng giao thành công hoặc đã thanh toán"
              >
                Tải hóa đơn (PDF)
              </button>
            )
          )}

          <button
            onClick={onClose}
            className="px-5 py-2 border border-outline-variant hover:bg-surface-container-low text-on-surface text-xs font-bold uppercase tracking-wider rounded-sm transition-all duration-300 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
