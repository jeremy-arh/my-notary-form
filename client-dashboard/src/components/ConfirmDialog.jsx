import { Icon } from '@iconify/react';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning' }) => {
  if (!isOpen) return null;

  const styles = {
    warning: {
      icon: 'heroicons:exclamation-triangle',
      iconColor: 'text-yellow-600',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
    },
    danger: {
      icon: 'heroicons:exclamation-circle',
      iconColor: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
    },
    info: {
      icon: 'heroicons:information-circle',
      iconColor: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
    },
  };

  const style = styles[type] || styles.warning;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black bg-opacity-50" onClick={onClose}>
      <div
        className={`${style.bg} ${style.border} border-2 rounded-xl p-6 max-w-md w-full shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 mb-4">
          <div className={`flex-shrink-0 ${style.iconColor}`}>
            <Icon icon={style.icon} className="w-8 h-8" />
          </div>
          <div className="flex-1">
            {title && (
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {title}
              </h3>
            )}
            <p className="text-sm text-gray-700 whitespace-pre-line">
              {message}
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              type === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-gray-900 hover:bg-gray-800'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;





