import { createPortal } from 'react-dom';
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
        return <AlertTriangle className="text-error" size={24} />;
      case 'info':
        return <Info className="text-tertiary" size={24} />;
      case 'warning':
      default:
        return <AlertCircle className="text-amber-600" size={24} />;
    }
  };

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'px-5 py-2.5 bg-error hover:bg-error/90 text-on-error text-sm font-semibold rounded-none cursor-pointer transition-colors';
      case 'info':
        return 'px-5 py-2.5 bg-tertiary hover:bg-tertiary/90 text-on-tertiary text-sm font-semibold rounded-none cursor-pointer transition-colors';
      case 'warning':
      default:
        return 'px-5 py-2.5 bg-primary hover:bg-primary/95 text-on-primary text-sm font-semibold rounded-none cursor-pointer transition-colors';
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      {/* Modal Card */}
      <div className="bg-surface rounded-none border border-outline-variant shadow-2xl max-w-md w-full p-6 relative animate-fadeIn">
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          type="button"
        >
          <X size={18} />
        </button>

        {/* Icon & Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-surface-container border border-outline-variant rounded-none">
            {getIcon()}
          </div>
          <h3 className="text-lg font-bold text-on-surface font-headline-md">{title}</h3>
        </div>

        {/* Message */}
        <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            type="button"
            className="px-5 py-2.5 border border-outline text-on-surface-variant hover:bg-surface-container text-sm font-semibold rounded-none cursor-pointer transition-colors"
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
    </div>,
    document.body
  );
}
