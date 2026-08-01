import { useState, useCallback } from 'react';

export interface ConfirmModalOptions {
  title?: string;
  message: string;
  confirmText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void | Promise<void>;
}

export function useConfirmModal() {
  const [confirmModal, setConfirmModal] = useState<ConfirmModalOptions & { isOpen: boolean }>({
    isOpen: false,
    title: undefined,
    message: '',
    confirmText: undefined,
    type: 'danger',
    onConfirm: () => {},
  });

  const openConfirm = useCallback((options: ConfirmModalOptions) => {
    setConfirmModal({
      isOpen: true,
      ...options,
    });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return {
    confirmModal,
    openConfirm,
    closeConfirm,
    setConfirmModal,
  };
}

export default useConfirmModal;
