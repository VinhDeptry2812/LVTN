import React from 'react';

interface OrderTrackingTimelineProps {
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

const STEPS = [
  { key: 'pending', label: 'Đặt hàng thành công', icon: 'shopping_bag' },
  { key: 'confirmed', label: 'Đã xác nhận', icon: 'verified' },
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
      if (status.startsWith('return_')) return 4;
      return 0;
  }
};

export const OrderTrackingTimeline: React.FC<OrderTrackingTimelineProps> = ({ status }) => {
  const isCancelled = status === 'cancelled';
  const isReturn = status.startsWith('return_');

  if (isCancelled) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-lg p-3.5 text-center my-1 flex items-center justify-center gap-2 text-rose-800 text-xs font-semibold shadow-xs">
        <span className="material-symbols-outlined text-rose-600 text-[18px]">cancel</span>
        <span className="uppercase tracking-wider">Đơn hàng này đã bị hủy</span>
      </div>
    );
  }

  if (isReturn) {
    let returnText = 'Đang xử lý yêu cầu đổi/trả hàng';
    if (status === 'return_approved') returnText = 'Yêu cầu đổi/trả hàng đã được chấp thuận';
    if (status === 'return_rejected') returnText = 'Yêu cầu đổi/trả hàng bị từ chối';

    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 text-center my-1 flex items-center justify-center gap-2 text-amber-900 text-xs font-semibold shadow-xs">
        <span className="material-symbols-outlined text-amber-600 text-[18px]">published_with_changes</span>
        <span className="uppercase tracking-wider">{returnText}</span>
      </div>
    );
  }

  const currentIndex = getStepIndex(status);
  const totalSteps = STEPS.length;
  const progressPercent = (currentIndex / (totalSteps - 1)) * 100;

  return (
    <div className="w-full py-3 px-2">
      <div className="relative flex items-start justify-between">
        {/* Background Line: Đặt đường kẻ chính giữa tâm icon (top-[20px]) */}
        <div className="absolute top-[20px] left-[10%] right-[10%] h-1 bg-slate-200 rounded-full z-0 -translate-y-1/2" />

        {/* Active Filled Line */}
        <div
          className="absolute top-[20px] left-[10%] h-1 bg-emerald-500 rounded-full z-0 -translate-y-1/2 transition-all duration-500 ease-out"
          style={{ width: `${progressPercent * 0.8}%` }}
        />

        {STEPS.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center flex-1 text-center group">
              {/* Icon Circle Container */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCurrent
                    ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 scale-110 shadow-lg shadow-emerald-600/25 font-bold'
                    : isDone
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-white text-slate-400 border-2 border-slate-300'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isDone ? 'check' : step.icon}
                </span>
              </div>

              {/* Step Label */}
              <span
                className={`mt-2.5 text-[11px] font-medium transition-colors max-w-[85px] leading-tight text-center ${
                  isCurrent
                    ? 'text-emerald-700 font-bold'
                    : isDone
                    ? 'text-slate-700 font-semibold'
                    : 'text-slate-400'
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
