import { useState } from 'react';
import { Icon } from '@iconify/react';
import { trackSignatoriesCompleted } from '../../utils/analytics';
import { formatPrice } from '../../utils/currency';
import PriceDetails from '../PriceDetails';
import { useTranslation } from '../../hooks/useTranslation';

const SignatoryCount = ({ formData, updateFormData, nextStep, prevStep, handleContinueClick, getValidationErrorMessage, isPriceDetailsOpen, setIsPriceDetailsOpen }) => {
  const { t } = useTranslation();
  const [errors, setErrors] = useState({});

  const signatoryOptions = [1, 2, 3, 4, 5, 6];

  const handleSelect = (count) => {
    updateFormData({ signatoryCount: count });
    if (errors.signatoryCount) {
      setErrors({});
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.signatoryCount) {
      newErrors.signatoryCount = t('form.validation.selectSignatories');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      // Track signatories completed before continuing
      if (formData.signatoryCount) {
        trackSignatoriesCompleted(formData.signatoryCount);
      }
      
      // Call original handleContinueClick or nextStep
      if (handleContinueClick) {
        handleContinueClick();
      } else {
        nextStep();
      }
    } else if (handleContinueClick) {
      handleContinueClick();
    }
  };

  return (
    <div className="h-full w-full flex flex-col relative">
      {/* Header */}
      <div className="flex-shrink-0 px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 md:pt-8 pb-3 sm:pb-4">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
          {t('form.steps.signatoryCount.title')}
        </h2>
        <p className="text-sm sm:text-base md:text-lg text-gray-600">
          {t('form.steps.signatoryCount.subtitle')}
        </p>
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 px-3 sm:px-4 md:px-6 pb-32 sm:pb-36 md:pb-6 lg:pb-24 overflow-y-auto overflow-x-hidden" style={{ minHeight: 0 }}>
        <div className="space-y-4 sm:space-y-6">
          {/* Signatory Count Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
            {signatoryOptions.map((count) => {
              const isSelected = formData.signatoryCount === count;
              return (
                <button
                  key={count}
                  type="button"
                  onClick={() => handleSelect(count)}
                  className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all hover:scale-105 active:scale-95 ${
                    isSelected
                      ? 'border-black bg-black text-white shadow-lg'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-2 sm:space-y-3">
                    <div className={`p-3 sm:p-4 rounded-full ${
                      isSelected ? 'bg-white/20' : 'bg-gray-100'
                    }`}>
                      <Icon
                        icon="heroicons:user-group"
                        className={`w-6 h-6 sm:w-8 sm:h-8 ${
                          isSelected ? 'text-white' : 'text-gray-600'
                        }`}
                      />
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl sm:text-3xl font-bold ${
                        isSelected ? 'text-white' : 'text-gray-900'
                      }`}>
                        {count}
                      </div>
                      <div className={`text-xs sm:text-sm mt-1 ${
                        isSelected ? 'text-white/80' : 'text-gray-600'
                      }`}>
                        {count === 1 ? t('form.steps.signatoryCount.count') : t('form.steps.signatoryCount.countPlural')}
                      </div>
                      {count > 1 && (
                        <div className={`text-xs sm:text-sm mt-1 font-medium ${
                          isSelected ? 'text-white/90' : 'text-orange-600'
                        }`}>
                          +{formatPrice((count - 1) * 10)}
                        </div>
                      )}
                      {count === 1 && (
                        <div className={`text-xs sm:text-sm mt-1 ${
                          isSelected ? 'text-white/70' : 'text-gray-500'
                        }`}>
                          {t('form.steps.signatoryCount.included')}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full flex items-center justify-center">
                        <Icon icon="heroicons:check" className="w-3 h-3 sm:w-4 sm:h-4 text-black" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* More than 6 option */}
          <div 
            className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all hover:scale-[1.02] ${
              formData.signatoryCount > 6
                ? 'border-black bg-black text-white shadow-lg'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
            }`}
            onClick={() => {
              const count = prompt(t('form.steps.signatoryCount.howManyPrompt'));
              if (count && !isNaN(count) && parseInt(count) > 6) {
                handleSelect(parseInt(count));
              }
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className={`p-3 sm:p-4 rounded-full ${
                  formData.signatoryCount > 6 ? 'bg-white/20' : 'bg-gray-100'
                }`}>
                  <Icon
                    icon="heroicons:plus-circle"
                    className={`w-6 h-6 sm:w-8 sm:h-8 ${
                      formData.signatoryCount > 6 ? 'text-white' : 'text-gray-600'
                    }`}
                  />
                </div>
                <div>
                  <div className={`text-base sm:text-lg font-semibold ${
                    formData.signatoryCount > 6 ? 'text-white' : 'text-gray-900'
                  }`}>
                    {formData.signatoryCount > 6 
                      ? `${formData.signatoryCount} ${t('form.steps.signatoryCount.countPlural')}` 
                      : t('form.steps.signatoryCount.moreThan6')}
                  </div>
                  <div className={`text-xs sm:text-sm ${
                    formData.signatoryCount > 6 ? 'text-white/80' : 'text-gray-600'
                  }`}>
                    {t('form.steps.signatoryCount.clickToEnter')}
                  </div>
                  {formData.signatoryCount > 6 && (
                    <div className={`text-xs sm:text-sm mt-1 font-medium ${
                      formData.signatoryCount > 6 ? 'text-white/90' : 'text-orange-600'
                    }`}>
                      +{formatPrice((formData.signatoryCount - 1) * 10)}
                    </div>
                  )}
                </div>
              </div>
              {formData.signatoryCount > 6 && (
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center">
                  <Icon icon="heroicons:check" className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                </div>
              )}
            </div>
          </div>

          {/* Price Summary Card */}
          {formData.signatoryCount && formData.signatoryCount > 0 && (
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                    {t('form.steps.signatoryCount.summary')}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    {formData.signatoryCount} {formData.signatoryCount === 1 ? t('form.steps.signatoryCount.count') : t('form.steps.signatoryCount.countPlural')}
                    {formData.signatoryCount > 1 && (
                      <span className="ml-2">
                        {t('form.steps.signatoryCount.includedCount').replace('{count}', formData.signatoryCount - 1)}
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  {formData.signatoryCount === 1 ? (
                    <div className="text-sm sm:text-base font-semibold text-gray-900">
                      {t('form.steps.signatoryCount.included')}
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs sm:text-sm text-gray-500 line-through">
                        {formatPrice(0)}
                      </div>
                      <div className="text-sm sm:text-base font-semibold text-gray-900">
                        +{formatPrice((formData.signatoryCount - 1) * 10)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errors.signatoryCount && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-red-600 flex items-center">
                <Icon icon="heroicons:exclamation-circle" className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                {errors.signatoryCount}
              </p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4">
            <div className="flex items-start space-x-2 sm:space-x-3">
              <Icon icon="heroicons:information-circle" className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-blue-900">
                <p className="font-semibold mb-1">{t('form.steps.signatoryCount.infoTitle')}</p>
                <p>{t('form.steps.signatoryCount.infoText')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Price Details + Fixed Navigation - Desktop only */}
      <div className="hidden xl:block xl:border-t xl:border-gray-300 bg-[#F3F4F6] flex-shrink-0">
        <PriceDetails 
          formData={formData} 
          isOpen={isPriceDetailsOpen}
          onToggle={setIsPriceDetailsOpen}
        />
        <div className="px-4 py-4 flex justify-between border-t border-gray-300">
          <button
            type="button"
            onClick={prevStep}
            className="btn-glassy-secondary px-6 md:px-8 py-3 text-gray-700 font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
          >
            {t('form.navigation.back')}
          </button>
          <button
            type="button"
            onClick={handleNext}
            className={`btn-glassy px-6 md:px-8 py-3 text-white font-semibold rounded-full transition-all ${
              !formData.signatoryCount
                ? 'opacity-50 hover:opacity-70 active:opacity-90'
                : 'hover:scale-105 active:scale-95'
            }`}
          >
            {t('form.navigation.continue')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignatoryCount;

