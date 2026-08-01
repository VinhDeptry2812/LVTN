import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  backUrl?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export default function AdminPageHeader({
  title,
  subtitle,
  icon: Icon,
  backUrl,
  onBack,
  actions,
  className = '',
}: AdminPageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backUrl) {
      navigate(backUrl);
    }
  };

  return (
    <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 ${className}`}>
      <div className="flex items-center gap-3">
        {(backUrl || onBack) && (
          <button
            type="button"
            onClick={handleBack}
            className="p-2 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors cursor-pointer"
            title="Quay lại"
          >
            <ArrowLeft size={20} />
          </button>
        )}

        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            {Icon && <Icon className="text-indigo-600 shrink-0" size={26} />}
            <span>{title}</span>
          </h1>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {actions && <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">{actions}</div>}
    </div>
  );
}
