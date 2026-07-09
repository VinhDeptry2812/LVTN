import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  title = 'Xác nhận hành động',
  message,
  onConfirm,
  onCancel,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  type = 'warning'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <AlertTriangle className="text-red-600" size={24} />;
      case 'info':
        return <Info className="text-blue-600" size={24} />;
      case 'warning':
      default:
        return <AlertCircle className="text-amber-500" size={24} />;
    }
  };

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-none cursor-pointer transition-colors';
      case 'info':
        return 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-none cursor-pointer transition-colors';
      case 'warning':
      default:
        return 'px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-none cursor-pointer transition-colors';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {/* Modal Card */}
      <div className="bg-white rounded-none border border-slate-200 shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          type="button"
        >
          <X size={18} />
        </button>

        {/* Icon & Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-slate-50 border border-slate-100 rounded-none">
            {getIcon()}
          </div>
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        </div>

        {/* Message */}
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            type="button"
            className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold rounded-none cursor-pointer transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            type="button"
            className={getConfirmButtonClass()}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
