import React from 'react';

interface OrderTrackingTimelineProps {
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

const STEPS = [
  { key: 'pending', label: 'Đặt hàng thành công', icon: 'receipt' },
  { key: 'confirmed', label: 'Đã xác nhận & Chuẩn bị', icon: 'inventory_2' },
  { key: 'shipping', label: 'Đang vận chuyển', icon: 'local_shipping' },
  { key: 'delivered', label: 'Đã giao hàng', icon: 'package_2' },
  { key: 'completed', label: 'Hoàn thành', icon: 'task_alt' },
];

const getStepIndex = (status: string): number => {
  switch (status) {
    case 'pending':
      return 0;
    case 'confirmed':
    case 'processing':
      return 1;
    case 'shipping':
    case 'shipped':
      return 2;
    case 'delivered':
      return 3;
    case 'completed':
      return 4;
    default:
      return 0;
  }
};

export const OrderTrackingTimeline: React.FC<OrderTrackingTimelineProps> = ({ status }) => {
  const isCancelled = status === 'cancelled';
  const isReturn = status.startsWith('return_');

  if (isCancelled) {
    return (
      <div className="bg-rose-50 border border-rose-200/80 rounded-sm p-4 text-center my-3 flex items-center justify-center gap-2 text-rose-800">
        <span className="material-symbols-outlined text-rose-600">cancel</span>
        <span className="text-xs font-bold uppercase tracking-wider">Đơn hàng này đã bị hủy</span>
      </div>
    );
  }

  if (isReturn) {
    let returnText = 'Đang xử lý yêu cầu đổi/trả hàng';
    if (status === 'return_approved') returnText = 'Yêu cầu đổi/trả hàng đã được chấp thuận';
    if (status === 'return_rejected') returnText = 'Yêu cầu đổi/trả hàng bị từ chối';

    return (
      <div className="bg-amber-50 border border-amber-200/80 rounded-sm p-4 text-center my-3 flex items-center justify-center gap-2 text-amber-900">
        <span className="material-symbols-outlined text-amber-600">published_with_changes</span>
        <span className="text-xs font-bold uppercase tracking-wider">{returnText}</span>
      </div>
    );
  }

  const currentIndex = getStepIndex(status);
  const progressPercent = (currentIndex / (STEPS.length - 1)) * 100;

  return (
    <div className="w-full max-w-lg mx-auto py-1">
      <div className="relative flex items-center justify-between">
        {/* Background Progress Line */}
        <div className="absolute top-4 left-[8%] right-[8%] h-0.5 bg-surface-container-high rounded-full z-0" />

        {/* Active Filled Line */}
        <div
          className="absolute top-4 left-[8%] h-0.5 bg-primary transition-all duration-500 rounded-full z-0"
          style={{ width: `${progressPercent * 0.84}%` }}
        />

        {STEPS.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center flex-1 text-center group">
              {/* Icon Circle */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                  isDone
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : isCurrent
                    ? 'bg-white text-primary border-primary ring-3 ring-primary/20 shadow-md font-bold'
                    : 'bg-surface text-on-surface-variant/40 border-outline-variant/40'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isDone ? 'check' : step.icon}
                </span>
              </div>

              {/* Step Label */}
              <span
                className={`mt-1.5 text-[10px] font-headline uppercase tracking-wider transition-colors max-w-[76px] leading-tight ${
                  isCurrent
                    ? 'font-bold text-primary'
                    : isDone
                    ? 'font-semibold text-on-surface'
                    : 'text-on-surface-variant/50'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderTrackingTimeline;
