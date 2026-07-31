import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Truck,
  PackageCheck,
  RefreshCcw,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  FileCheck2
} from 'lucide-react';

export type StatusCategory = 'order' | 'purchase_order' | 'stock_issue' | 'inventory_audit' | 'warranty' | 'return';

interface StatusConfig {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  icon: LucideIcon;
  animate?: boolean;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  // --- Order Statuses ---
  pending: {
    label: 'Chờ xử lý',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
    icon: Clock,
    animate: true,
  },
  processing: {
    label: 'Đang xử lý',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
    icon: Loader2,
    animate: true,
  },
  shipped: {
    label: 'Đang giao hàng',
    bgClass: 'bg-indigo-50',
    textClass: 'text-indigo-700',
    borderClass: 'border-indigo-200',
    icon: Truck,
  },
  delivered: {
    label: 'Đã giao hàng',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
    icon: PackageCheck,
  },
  cancelled: {
    label: 'Đã hủy',
    bgClass: 'bg-rose-50',
    textClass: 'text-rose-700',
    borderClass: 'border-rose-200',
    icon: XCircle,
  },

  // --- Return Statuses ---
  return_pending: {
    label: 'Chờ xử lý đổi trả',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
    icon: AlertTriangle,
    animate: true,
  },
  return_approved: {
    label: 'Nhận đổi trả',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
    icon: CheckCircle2,
  },
  return_rejected: {
    label: 'Từ chối đổi trả',
    bgClass: 'bg-rose-50',
    textClass: 'text-rose-700',
    borderClass: 'border-rose-200',
    icon: XCircle,
  },

  // --- Purchase Order / Stock Issue Statuses ---
  po_pending: {
    label: 'Chờ nhập kho',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
    icon: Clock,
  },
  completed: {
    label: 'Đã hoàn tất',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
    icon: FileCheck2,
  },
  in_progress: {
    label: 'Đang thực hiện',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
    icon: RefreshCcw,
    animate: true,
  },

  // --- Warranty Statuses ---
  warranty_pending: {
    label: 'Chờ tiếp nhận',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
    icon: Clock,
    animate: true,
  },
  warranty_processing: {
    label: 'Đang xử lý/Sửa chữa',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
    icon: RefreshCcw,
    animate: true,
  },
  warranty_completed: {
    label: 'Đã hoàn thành',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
    icon: ShieldCheck,
  },
  warranty_rejected: {
    label: 'Từ chối bảo hành',
    bgClass: 'bg-rose-50',
    textClass: 'text-rose-700',
    borderClass: 'border-rose-200',
    icon: ShieldAlert,
  },
};

interface StatusBadgeProps {
  status: string;
  category?: StatusCategory;
  customLabel?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  category,
  customLabel,
  size = 'sm',
}) => {
  // Resolve key for special cases when category overlaps
  let resolvedKey = status;
  if (category === 'purchase_order' && status === 'pending') {
    resolvedKey = 'po_pending';
  } else if (category === 'warranty') {
    if (status === 'pending') resolvedKey = 'warranty_pending';
    if (status === 'processing') resolvedKey = 'warranty_processing';
    if (status === 'completed') resolvedKey = 'warranty_completed';
    if (status === 'rejected') resolvedKey = 'warranty_rejected';
  }

  const config = STATUS_MAP[resolvedKey] || {
    label: customLabel || status,
    bgClass: 'bg-slate-50',
    textClass: 'text-slate-700',
    borderClass: 'border-slate-200',
    icon: Clock,
  };

  const IconComponent = config.icon;
  const isSm = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 border font-semibold ${config.bgClass} ${config.textClass} ${config.borderClass} ${
        isSm ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      <IconComponent
        size={isSm ? 12 : 14}
        className={config.animate ? 'animate-spin-slow' : ''}
      />
      {customLabel || config.label}
    </span>
  );
};

export default StatusBadge;
