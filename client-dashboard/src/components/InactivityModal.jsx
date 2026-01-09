import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from '../hooks/useTranslation';
import { openCrisp } from '../utils/crisp';

const InactivityModal = ({ isVisible, onClose }) => {
  const { t } = useTranslation();

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[100] p-4" 
      data-inactivity-modal
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-md w-full p-6 relative animate-fade-in-up shadow-2xl" 
        data-inactivity-modal
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label={t('form.inactivityModal.close') || 'Close'}
        >
          <Icon icon="heroicons:x-mark" className="w-5 h-5 text-gray-600" />
        </button>

        {/* Content */}
        <div className="flex items-start space-x-4 mb-4">
          {/* Agent Image */}
          <div className="flex-shrink-0">
            <img
              src="https://imagedelivery.net/l2xsuW0n52LVdJ7j0fQ5lA/36b5466f-9dee-4b88-ac69-83859843f900/public"
              alt="Support Agent"
              className="w-16 h-16 rounded-full object-cover border-2 border-blue-200"
            />
          </div>

          {/* Message */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {t('form.inactivityModal.title') || 'Need help?'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {t('form.inactivityModal.message') || 'Our team is here to help! If you have any questions or need assistance, feel free to contact us.'}
            </p>

            {/* CTA Button */}
            <button
              onClick={() => {
                openCrisp();
                onClose();
              }}
              className="w-full bg-[#3971ed] hover:bg-[#2d5dc7] active:bg-[#2652b3] text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              <Icon icon="heroicons:chat-bubble-left-right" className="w-5 h-5" />
              <span>{t('form.inactivityModal.contactUs') || 'Contact Us'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InactivityModal;

