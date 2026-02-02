import { useState } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from '../../hooks/useTranslation';
import { useServices } from '../../contexts/ServicesContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { getServicePrice, getServicePriceCurrency } from '../../utils/pricing';

const ChooseOption = ({ formData, updateFormData, nextStep, handleContinueClick, getValidationErrorMessage, isPriceDetailsOpen, setIsPriceDetailsOpen }) => {
  const { t } = useTranslation();
  const { services, loading, getServiceName } = useServices();
  const { formatPriceSync, currency, cacheVersion } = useCurrency();

  const handleContinue = () => {
    // Call original handleContinueClick or nextStep
    if (handleContinueClick) {
      handleContinueClick();
    } else {
      nextStep();
    }
  };

  const toggleService = (serviceId) => {
    const currentServices = formData.selectedServices || [];
    const isAdding = !currentServices.includes(serviceId);
    const updatedServices = isAdding
      ? [...currentServices, serviceId]
      : currentServices.filter(id => id !== serviceId);

    // Si on retire un service, on supprime aussi ses documents du stockage
    let updatedServiceDocuments = formData.serviceDocuments || {};
    if (!isAdding && updatedServiceDocuments[serviceId]) {
      const { [serviceId]: removed, ...rest } = updatedServiceDocuments;
      updatedServiceDocuments = rest;
    }

    updateFormData({
      selectedServices: updatedServices,
      serviceDocuments: updatedServiceDocuments,
    });

  };

  return (
    <>
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 md:pt-8 pb-32 sm:pb-36 md:pb-6 lg:pb-6" style={{ minHeight: 0 }}>
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
          <div>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">
              {t('form.steps.chooseOption.title')}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              {t('form.steps.chooseOption.subtitle')}
            </p>
          </div>

      {/* Services Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-8 sm:py-12 md:py-16">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 border-b-2 border-black"></div>
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-8 sm:py-12 md:py-16">
          <p className="text-sm sm:text-base md:text-lg text-gray-600">{t('form.steps.chooseOption.noServices')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
        {services.map((service) => {
          const isSelected = formData.selectedServices?.includes(service.service_id);
          return (
            <button
              key={service.service_id}
              type="button"
              onClick={() => toggleService(service.service_id)}
              className={`text-left p-2.5 sm:p-3 md:p-3.5 rounded-lg sm:rounded-xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${
                isSelected
                  ? 'border-black bg-white shadow-lg'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${service.color || 'bg-gray-100'}`}>
                  <Icon
                    icon={service.icon || 'heroicons:document-text'}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600"
                  />
                </div>
                <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base text-gray-900 break-words">
                      {getServiceName(service)}
                    </h3>
                    <p key={`price-${service.service_id}-${currency}-${cacheVersion}`} className="text-xs sm:text-sm font-semibold text-gray-900 mt-0.5">
                      {formatPriceSync(getServicePrice(service, currency) || 0, getServicePriceCurrency(service, currency))} {t('form.steps.documents.perDocument')}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center flex-shrink-0">
                      <Icon
                        icon="stash:check-light"
                        className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600"
                      />
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      )}
        </div>
      </div>

    </>
  );
};

export default ChooseOption;
