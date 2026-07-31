import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  iconColorClass?: string;
  iconBgClass?: string;
  badge?: {
    text: string;
    type?: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  };
  onClick?: () => void;
  className?: string;
}

export default function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  iconColorClass = 'text-indigo-600',
  iconBgClass = 'bg-indigo-50',
  badge,
  onClick,
  className = '',
}: StatCardProps) {
  const badgeStyles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    neutral: 'bg-slate-50 text-slate-700 border-slate-200',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200 p-5 rounded-none shadow-sm transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-md' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{value}</h3>
            {badge && (
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 border ${
                  badgeStyles[badge.type || 'neutral']
                }`}
              >
                {badge.text}
              </span>
            )}
          </div>
          {subtext && <p className="text-xs text-slate-500">{subtext}</p>}
        </div>

        <div className={`p-3 border border-slate-100 ${iconBgClass}`}>
          <Icon className={iconColorClass} size={24} />
        </div>
      </div>
    </div>
  );
}
