import { useState, useCallback } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

export const useConfirm = () => {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'warning',
  });

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title: options.title || '',
        message: options.message || '',
        onConfirm: () => resolve(true),
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        type: options.type || 'warning',
      });
    });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmState((prev) => ({
      ...prev,
      isOpen: false,
      onConfirm: () => {},
    }));
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmState.onConfirm) {
      confirmState.onConfirm();
    }
    closeConfirm();
  }, [confirmState, closeConfirm]);

  const ConfirmComponent = () => (
    <ConfirmDialog
      isOpen={confirmState.isOpen}
      onClose={closeConfirm}
      onConfirm={handleConfirm}
      title={confirmState.title}
      message={confirmState.message}
      confirmText={confirmState.confirmText}
      cancelText={confirmState.cancelText}
      type={confirmState.type}
    />
  );

  return { confirm, ConfirmComponent };
};





