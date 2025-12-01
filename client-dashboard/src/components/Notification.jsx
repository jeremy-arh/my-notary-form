import { useEffect } from 'react';
import { Icon } from '@iconify/react';

const Notification = ({ type = 'success', message, onClose, duration = 5000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const styles = {
    success: {
      bg: 'bg-green-50 border-green-200',
      icon: 'heroicons:check-circle',
      iconColor: 'text-green-600',
      textColor: 'text-green-900',
      titleColor: 'text-green-800'
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      icon: 'heroicons:x-circle',
      iconColor: 'text-red-600',
      textColor: 'text-red-900',
      titleColor: 'text-red-800'
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-200',
      icon: 'heroicons:exclamation-triangle',
      iconColor: 'text-yellow-600',
      textColor: 'text-yellow-900',
      titleColor: 'text-yellow-800'
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      icon: 'heroicons:information-circle',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-900',
      titleColor: 'text-blue-800'
    }
  };

  const style = styles[type] || styles.info;

  return (
    <div className={`fixed top-2 right-2 sm:top-4 sm:right-4 z-[9999] max-w-[calc(100vw-1rem)] sm:max-w-md w-full animate-slide-in-right`}>
      <div className={`${style.bg} border-2 rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-lg`}>
        <div className="flex items-start">
          <div className={`flex-shrink-0 ${style.iconColor}`}>
            <Icon icon={style.icon} className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="ml-2 sm:ml-3 flex-1 min-w-0">
            <p className={`text-xs sm:text-sm font-medium ${style.textColor} whitespace-pre-line break-words`}>
              {message}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`ml-2 sm:ml-4 flex-shrink-0 ${style.textColor} hover:opacity-70 transition-opacity`}
            aria-label="Close notification"
          >
            <Icon icon="heroicons:x-mark" className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Notification;
