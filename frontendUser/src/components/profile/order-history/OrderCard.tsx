import React from 'react';
import { getProductImage } from '@/utils/image';
import { formatDateTime } from '@/utils/format';

interface OrderCardProps {
  order: any;
  onSelectOrder: (order: any) => void;
  onCompleteOrder: (orderId: number) => void;
  onCancelOrder: (orderId: number) => void;
  onRepayOrder: (orderId: number) => void;
  onReorder: (order: any) => void;
  onOpenReview: (order: any, product?: any, variant?: any) => void;
  getExistingReview: (orderId: number | undefined, productId: number) => any;
  isRepaying: boolean;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onSelectOrder,
  onCompleteOrder,
  onCancelOrder,
  onRepayOrder,
  onReorder,
  onOpenReview,
  getExistingReview,
  isRepaying,
}) => {
  return (
    <div className="border border-outline-variant/40 rounded-sm bg-white overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.015)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.035)] transition-all duration-300">
      {/* Header đơn hàng */}
      <div className="p-4 bg-surface-container-low/20 border-b border-outline-variant/20 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-on-surface">
            Mã đơn: <span className="font-mono text-primary font-bold">#{order.id}</span>
          </span>
          <span className="text-on-surface-variant/60">•</span>
          <span className="text-on-surface-variant/80">
            {formatDateTime(order.created_at)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badge */}
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
              order.status === 'return_pending'
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : order.status === 'return_approved'
                ? 'bg-blue-50 text-blue-800 border-blue-300'
                : order.status === 'return_rejected'
                ? 'bg-rose-50 text-rose-800 border-rose-300'
                : order.status === 'completed'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : order.status === 'delivered'
                ? 'bg-teal-50 text-teal-700 border-teal-200'
                : order.status === 'cancelled'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : order.status === 'shipping'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : order.status === 'confirmed'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-stone-50 text-stone-700 border-stone-200'
            }`}
          >
            {(order.status === 'return_pending' && 'Đang chờ đổi trả') ||
              (order.status === 'return_approved' && 'Đổi trả đã được duyệt') ||
              (order.status === 'return_rejected' && 'Đổi trả bị từ chối') ||
              (order.status === 'pending' && 'Chờ xử lý') ||
              (order.status === 'confirmed' && 'Đã xác nhận') ||
              (order.status === 'shipping' && 'Đang giao') ||
              (order.status === 'delivered' && 'Đã giao hàng') ||
              (order.status === 'completed' && 'Hoàn thành') ||
              (order.status === 'cancelled' && 'Đã hủy')}
          </span>
        </div>
      </div>

      {/* Danh sách SP trong đơn */}
      <div className="divide-y divide-outline-variant/15 p-4">
        {order.items?.map((item: any) => (
          <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <img
                src={getProductImage(item)}
                alt={item.product?.name}
                loading="lazy"
                decoding="async"
                className="w-14 h-14 object-cover bg-surface-container-low rounded-sm border border-outline-variant/20 shrink-0"
                onError={(e: any) => {
                  e.target.src =
                    'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=100&auto=format&fit=crop&q=60';
                }}
              />
              <div className="min-w-0 space-y-0.5">
                <h4 className="font-semibold text-xs text-on-surface truncate">
                  {item.product?.name}
                </h4>
                <p className="text-[11px] text-on-surface-variant/70">
                  Số lượng: <span className="font-semibold text-on-surface">{item.quantity}</span>
                </p>
                <p className="text-[11px] text-on-surface-variant/70">
                  Đơn giá:{' '}
                  <span className="font-semibold text-on-surface">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format(Number(item.price))}
                  </span>
                </p>
              </div>
            </div>

            {(order.status === 'completed' || order.status === 'delivered') &&
              (() => {
                const existingRev = item.product?.id ? getExistingReview(order.id, item.product.id) : null;
                if (!existingRev) {
                  return (
                    <button
                      onClick={() => item.product && onOpenReview(order, item.product, item.variant)}
                      className="px-2.5 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors text-[10px] font-bold uppercase tracking-wider rounded-sm cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <span className="material-symbols-outlined text-[12px]">rate_review</span>
                      Đánh giá
                    </button>
                  );
                }
                if ((existingRev.edit_count ?? 0) < 1) {
                  return (
                    <button
                      onClick={() => item.product && onOpenReview(order, item.product, item.variant)}
                      className="px-2.5 py-1 bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 transition-colors text-[10px] font-bold uppercase tracking-wider rounded-sm cursor-pointer flex items-center gap-1 shrink-0"
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
                    className="px-2.5 py-1 bg-slate-100 text-slate-400 border border-slate-200 text-[10px] font-bold uppercase tracking-wider rounded-sm flex items-center gap-1 shrink-0 cursor-not-allowed"
                    title="Bạn đã chỉnh sửa đánh giá 1 lần"
                  >
                    <span className="material-symbols-outlined text-[12px]">done_all</span>
                    Đã đánh giá
                  </button>
                );
              })()}
          </div>
        ))}
      </div>

      {/* Footer đơn hàng & tổng tiền */}
      <div className="p-4 bg-surface-container-low/10 border-t border-outline-variant/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs text-on-surface-variant/80">Tổng thanh toán: </span>
          <span className="font-bold text-sm text-primary font-headline">
            {new Intl.NumberFormat('vi-VN', {
              style: 'currency',
              currency: 'VND',
            }).format(Number(order.total_amount))}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
          <button
            onClick={() => onSelectOrder(order)}
            className="px-3.5 py-1.5 border border-outline-variant hover:bg-surface-container-low text-on-surface transition text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer"
          >
            Xem chi tiết
          </button>

          {order.status === 'delivered' && (
            <button
              onClick={() => onCompleteOrder(order.id)}
              className="px-3.5 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 transition text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer"
            >
              Đã nhận hàng
            </button>
          )}

          {order.status === 'pending' && (
            <button
              onClick={() => onCancelOrder(order.id)}
              className="px-3.5 py-1.5 border border-error/45 text-error hover:bg-error hover:text-white transition text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer"
            >
              Hủy đơn
            </button>
          )}

          {order.status === 'pending' &&
            order.payment_status === 'pending' &&
            order.payment_method === 'vnpay' && (
              <button
                onClick={() => onRepayOrder(order.id)}
                disabled={isRepaying}
                className="px-3.5 py-1.5 border border-emerald-600/45 text-emerald-600 hover:bg-emerald-600 hover:text-white disabled:opacity-50 transition text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer"
              >
                Thanh toán ngay
              </button>
            )}

          {(order.status === 'completed' || order.status === 'cancelled') && (
            <button
              onClick={() => onReorder(order)}
              className="px-3.5 py-1.5 border border-amber-600/45 text-amber-600 hover:bg-amber-600 hover:text-white transition text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer"
            >
              Mua lại
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
