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
    isLoading: false,
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
        isLoading: false,
      });
    });
  }, []);

  const setLoading = useCallback((isLoading) => {
    setConfirmState((prev) => ({
      ...prev,
      isLoading,
    }));
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmState((prev) => ({
      ...prev,
      isOpen: false,
      isLoading: false,
      onConfirm: () => {},
    }));
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmState.onConfirm && !confirmState.isLoading) {
      confirmState.onConfirm();
      // Don't close immediately - let the caller handle closing after async operations
    }
  }, [confirmState]);

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
      isLoading={confirmState.isLoading}
    />
  );

  return { confirm, ConfirmComponent, setLoading, closeConfirm };
};

