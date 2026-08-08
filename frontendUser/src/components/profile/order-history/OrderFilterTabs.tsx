import React from 'react';
import { useDragScroll } from '@/hooks/useDragScroll';

interface OrderFilterTabsProps {
  orders: any[];
  orderSearchQuery: string;
  setOrderSearchQuery: (query: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
}

export const OrderFilterTabs: React.FC<OrderFilterTabsProps> = ({
  orders,
  orderSearchQuery,
  setOrderSearchQuery,
  selectedStatus,
  setSelectedStatus,
}) => {
  const tabDrag = useDragScroll();

  const getStatusCount = (statusId: string) => {
    if (statusId === 'all') return orders.length;
    if (statusId === 'return_requested') {
      return orders.filter(
        (o) =>
          o.status === 'return_pending' ||
          o.status === 'return_approved' ||
          o.status === 'return_rejected' ||
          o.return_request != null ||
          (o.return_reason != null && o.return_reason !== '')
      ).length;
    }
    return orders.filter((o) => o.status === statusId).length;
  };

  const tabs = [
    { id: 'all', label: 'Tất cả đơn' },
    { id: 'pending', label: 'Chờ xử lý' },
    { id: 'confirmed', label: 'Đã xác nhận' },
    { id: 'shipping', label: 'Đang giao' },
    { id: 'delivered', label: 'Đã giao hàng' },
    { id: 'completed', label: 'Hoàn thành' },
    { id: 'cancelled', label: 'Đã hủy' },
    { id: 'return_requested', label: 'Yêu cầu đổi/trả' },
  ];

  return (
    <div className="space-y-4">
      {/* Ô tìm kiếm đơn hàng */}
      <div className="relative max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[20px]">
          search
        </span>
        <input
          type="text"
          value={orderSearchQuery}
          onChange={(e) => setOrderSearchQuery(e.target.value)}
          placeholder="Tìm theo Mã đơn hàng hoặc Tên sản phẩm..."
          className="w-full pl-9 pr-9 py-2 bg-surface-container-lowest border border-outline-variant/30 rounded-sm text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
        />
        {orderSearchQuery && (
          <button
            onClick={() => setOrderSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        )}
      </div>

      {/* Tabs lọc trạng thái đơn hàng */}
      <div
        ref={tabDrag.ref}
        {...tabDrag.events}
        className={`flex items-center gap-2 overflow-x-auto pb-2 border-b border-outline-variant/20 scrollbar-thin select-none ${
          tabDrag.isMouseDown ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {tabs.map((tab) => {
          const count = getStatusCount(tab.id);
          const isActive = selectedStatus === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tabDrag.isDragging) return;
                setSelectedStatus(tab.id);
              }}
              className={`px-3.5 py-2 text-xs font-semibold uppercase tracking-wider rounded-sm whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 border ${
                isActive
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-surface-container-low/40 text-on-surface-variant/80 border-outline-variant/30 hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? 'bg-white/20 text-white' : 'bg-outline-variant/30 text-on-surface'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

