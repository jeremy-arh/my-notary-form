import { Icon } from '@iconify/react';

const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const Toast = ({ toast, onClose }) => {
  const styles = {
    success: {
      bg: 'bg-green-50 border-green-200',
      icon: 'heroicons:check-circle',
      iconColor: 'text-green-600',
      textColor: 'text-green-900',
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      icon: 'heroicons:x-circle',
      iconColor: 'text-red-600',
      textColor: 'text-red-900',
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-200',
      icon: 'heroicons:exclamation-triangle',
      iconColor: 'text-yellow-600',
      textColor: 'text-yellow-900',
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      icon: 'heroicons:information-circle',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-900',
    },
  };

  const style = styles[toast.type] || styles.info;

  return (
    <div
      className={`${style.bg} border-2 rounded-xl p-4 shadow-lg pointer-events-auto animate-slide-in-right`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${style.iconColor}`}>
          <Icon icon={style.icon} className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${style.textColor} whitespace-pre-line break-words`}>
            {toast.message}
          </p>
        </div>
        <button
          onClick={onClose}
          className={`flex-shrink-0 ${style.textColor} hover:opacity-70 transition-opacity`}
          aria-label="Close notification"
        >
          <Icon icon="heroicons:x-mark" className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ToastContainer;









