import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from '../../hooks/useTranslation';
import { useCurrency } from '../../contexts/CurrencyContext';
import { trackDeliveryMethodSelected } from '../../utils/analytics';

const DELIVERY_POSTAL_PRICE_EUR = 29.95;

const DeliveryMethod = ({ formData, updateFormData, nextStep, prevStep, handleContinueClick, getValidationErrorMessage }) => {
  const { t } = useTranslation();
  const { formatPriceSync, formatPrice: formatPriceAsync, currency, cacheVersion } = useCurrency();
  const [convertedDeliveryPrice, setConvertedDeliveryPrice] = useState('');

  const deliveryMethod = formData.deliveryMethod || null;

  // Convert delivery price when currency changes
  useEffect(() => {
    console.log('💰 [DeliveryMethod] Converting delivery price, currency:', currency, 'cacheVersion:', cacheVersion);
    const convertDeliveryPrice = async () => {
      // Set initial price synchronously from cache if available
      const syncPrice = formatPriceSync(DELIVERY_POSTAL_PRICE_EUR);
      console.log('💰 [DeliveryMethod] Sync price:', syncPrice);
      setConvertedDeliveryPrice(syncPrice);
      
      // Then convert asynchronously for accurate rate
      try {
        const formatted = await formatPriceAsync(DELIVERY_POSTAL_PRICE_EUR);
        console.log('💰 [DeliveryMethod] Async converted price:', formatted);
        setConvertedDeliveryPrice(formatted);
      } catch (error) {
        console.warn('Error converting delivery price:', error);
        // Keep the synchronous fallback
      }
    };
    convertDeliveryPrice();
  }, [currency, cacheVersion, formatPriceAsync, formatPriceSync]);

  // Helper function to replace price in delivery description text
  const getDeliveryDescription = () => {
    const description = t('form.steps.delivery.postDescription') || 'We charge an extra fee of €29.95 for DHL Express delivery.';
    
    if (convertedDeliveryPrice) {
      // Replace various price formats in the text (€29.95, 29,95 €, 29.95€, etc.)
      // This regex matches: optional € symbol, number with comma or dot, optional € symbol
      // Add a space after the converted price to ensure proper spacing before "for"
      return description.replace(
        /€?\s*\d+[.,]\d+\s*€?/gi,
        `${convertedDeliveryPrice} `
      ).replace(/\s+/g, ' ').trim(); // Normalize multiple spaces to single space
    }
    
    return description;
  };

  const handleSelect = (method) => {
    updateFormData({ deliveryMethod: method });
    // Track delivery method selection
    trackDeliveryMethodSelected(method);
  };

  const handleContinue = () => {
    if (handleContinueClick) {
      handleContinueClick();
    } else {
      nextStep();
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 md:pt-8 pb-3 sm:pb-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">
            {t('form.steps.delivery.title') || 'Delivery of your notarized documents'}
          </h2>
          <p className="text-xs sm:text-sm text-gray-600">
            {t('form.steps.delivery.subtitle') || 'Choose how you would like to receive your notarized document.'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-3 sm:px-4 md:px-6 pb-32 sm:pb-36 md:pb-6 lg:pb-24 overflow-y-auto overflow-x-hidden" style={{ minHeight: 0 }}>
        <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
          {/* Physical delivery by post */}
          <button
            type="button"
            onClick={() => handleSelect('postal')}
            className={`w-full text-left bg-white rounded-xl sm:rounded-2xl border transition-all flex items-stretch overflow-hidden ${
              deliveryMethod === 'postal'
                ? 'border-black shadow-lg'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
            }`}
          >
            <div className="flex items-center p-4 sm:p-5 flex-1">
              <div className="mr-4 sm:mr-5 flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl border border-gray-200 flex items-center justify-center bg-gray-50">
                  <Icon icon="heroicons-envelope" className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base font-semibold text-gray-900">
                  {t('form.steps.delivery.postTitle') || 'Delivery as a physical copy by post'}
                </p>
                <p key={`delivery-price-${currency}-${cacheVersion}`} className="mt-1 text-xs sm:text-sm text-gray-600">
                  {getDeliveryDescription()}
                </p>
              </div>
              <div className="ml-3 sm:ml-4 flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="postal"
                    checked={deliveryMethod === 'postal'}
                    onChange={() => handleSelect('postal')}
                    className="sr-only peer"
                  />
                  <div className={`w-5 h-5 border-2 rounded transition-all flex items-center justify-center ${
                    deliveryMethod === 'postal'
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-blue-300 bg-white peer-hover:border-blue-400'
                  }`}>
                    {deliveryMethod === 'postal' && (
                      <Icon icon="heroicons:check" className="w-3 h-3 text-white" />
                    )}
                  </div>
                </label>
              </div>
            </div>
          </button>

          {/* Email delivery */}
          <button
            type="button"
            onClick={() => handleSelect('email')}
            className={`w-full text-left bg-white rounded-xl sm:rounded-2xl border transition-all flex items-stretch overflow-hidden ${
              deliveryMethod === 'email'
                ? 'border-black shadow-lg'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
            }`}
          >
            <div className="flex items-center p-4 sm:p-5 flex-1">
              <div className="mr-4 sm:mr-5 flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl border border-gray-200 flex items-center justify-center bg-gray-50">
                  <span className="text-lg sm:text-xl font-semibold text-gray-700">@</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base font-semibold text-gray-900">
                  {t('form.steps.delivery.emailTitle') || 'Delivery by email'}
                </p>
                <p className="mt-1 text-xs sm:text-sm text-gray-600">
                  {t('form.steps.delivery.emailDescription') || 'The notarized document will be delivered by email by default.'}
                </p>
              </div>
              <div className="ml-3 sm:ml-4 flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="email"
                    checked={deliveryMethod === 'email'}
                    onChange={() => handleSelect('email')}
                    className="sr-only peer"
                  />
                  <div className={`w-5 h-5 border-2 rounded transition-all flex items-center justify-center ${
                    deliveryMethod === 'email'
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-blue-300 bg-white peer-hover:border-blue-400'
                  }`}>
                    {deliveryMethod === 'email' && (
                      <Icon icon="heroicons:check" className="w-3 h-3 text-white" />
                    )}
                  </div>
                </label>
              </div>
            </div>
          </button>

          {/* Additional info about personal space */}
          <div className="mt-4 sm:mt-6 bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4 flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <Icon icon="heroicons:information-circle" className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <p className="text-xs sm:text-sm text-blue-900 flex-1">
              {t('form.steps.delivery.personalSpaceInfo') || 'Une fois la notarisation terminée vos documents seront également disponible sur votre espace personnel, pour un accés facile, à tout moment'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryMethod;


