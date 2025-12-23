import { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';
import { formatPrice, convertPrice } from '../../utils/currency';
import { useTranslation } from '../../hooks/useTranslation';
import { useServices } from '../../contexts/ServicesContext';

const APOSTILLE_SERVICE_ID = '473fb677-4dd3-4766-8221-0250ea3440cd';

const Documents = ({ formData, updateFormData, nextStep, prevStep, handleContinueClick, getValidationErrorMessage, isPriceDetailsOpen, setIsPriceDetailsOpen }) => {
  const { t } = useTranslation();
  const { getServicesByIds, options, loading: servicesLoading } = useServices();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOptionInfo, setShowOptionInfo] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const scrollContainerRef = useRef(null);
  const savedScrollPositionRef = useRef(null);
  const fileInputRefs = useRef({});

  const handleContinue = () => {
    // Call original handleContinueClick or nextStep
    if (handleContinueClick) {
      handleContinueClick();
    } else {
      nextStep();
    }
  };

  useEffect(() => {
    if (servicesLoading) {
      setLoading(true);
      return;
    }
    
    if (formData.selectedServices && formData.selectedServices.length > 0) {
      const selectedServices = getServicesByIds(formData.selectedServices);
      setServices(selectedServices);
      setLoading(false);
    } else {
      setServices([]);
      setLoading(false);
    }
  }, [formData.selectedServices, getServicesByIds, servicesLoading]);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Restaurer la position de scroll après les mises à jour du DOM
  useEffect(() => {
    if (savedScrollPositionRef.current !== null && scrollContainerRef.current) {
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = savedScrollPositionRef.current;
          savedScrollPositionRef.current = null;
        }
      });
    }
  }, [formData.serviceDocuments]);

  const handleFileUpload = async (event, serviceId) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Sauvegarder la position de scroll avant le traitement
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      savedScrollPositionRef.current = scrollContainer.scrollTop;
    }

    // Réinitialiser l'input pour permettre de sélectionner le même fichier à nouveau
    const inputElement = event.target;
    setTimeout(() => {
      if (inputElement) {
        inputElement.value = '';
      }
    }, 0);

    const convertedFiles = await Promise.all(
      files.map(async (file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              name: file.name,
              size: file.size,
              type: file.type,
              lastModified: file.lastModified,
              dataUrl: reader.result,
              selectedOptions: [],
            });
          };
          reader.readAsDataURL(file);
        });
      })
    );

    const serviceDocuments = { ...(formData.serviceDocuments || {}) };
    const existingFiles = serviceDocuments[serviceId] || [];
    serviceDocuments[serviceId] = [...existingFiles, ...convertedFiles];

    updateFormData({ serviceDocuments });

  };

  const removeFile = (serviceId, fileIndex) => {
    const serviceDocuments = { ...formData.serviceDocuments };
    serviceDocuments[serviceId] = serviceDocuments[serviceId].filter((_, index) => index !== fileIndex);

    if (serviceDocuments[serviceId].length === 0) {
      delete serviceDocuments[serviceId];
    }

    updateFormData({ serviceDocuments });
  };

  // Helper function to truncate file name on mobile
  const truncateFileName = (fileName) => {
    if (isMobile && fileName.length > 30) {
      const extension = fileName.substring(fileName.lastIndexOf('.'));
      const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
      const truncatedName = nameWithoutExt.substring(0, 30 - extension.length - 3) + '...';
      return truncatedName + extension;
    }
    return fileName;
  };

  const toggleOption = (serviceId, fileIndex, optionId) => {
    const serviceDocuments = { ...formData.serviceDocuments };
    const file = serviceDocuments[serviceId][fileIndex];

    if (!file.selectedOptions) {
      file.selectedOptions = [];
    }

    if (file.selectedOptions.includes(optionId)) {
      file.selectedOptions = file.selectedOptions.filter(id => id !== optionId);
    } else {
      file.selectedOptions = [...file.selectedOptions, optionId];
    }

    updateFormData({ serviceDocuments });
  };

  const getFileCount = (serviceId) => {
    return formData.serviceDocuments?.[serviceId]?.length || 0;
  };

  const getTotalPrice = (service) => {
    const files = formData.serviceDocuments?.[service.service_id] || [];
    let totalEUR = 0;

    files.forEach(file => {
      totalEUR += service.base_price;
      if (file.selectedOptions && file.selectedOptions.length > 0) {
        file.selectedOptions.forEach(optionId => {
          const option = options.find(o => o.option_id === optionId);
          if (option) {
            totalEUR += option.additional_price || 0;
          }
        });
      }
    });

    return formatPrice(totalEUR);
  };

  return (
    <div className="h-full w-full flex flex-col relative">
      {/* Header */}
      <div className="flex-shrink-0 px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 md:pt-8 pb-3 sm:pb-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">
            {t('form.steps.documents.title')}
          </h2>
          <p className="text-xs sm:text-sm text-gray-600">
            {t('form.steps.documents.subtitle')}
          </p>
        </div>
      </div>

      {/* Content Area - Scrollable */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 px-3 sm:px-4 md:px-6 pb-32 sm:pb-36 md:pb-6 lg:pb-24 overflow-y-auto overflow-x-hidden" 
        style={{ minHeight: 0 }}
      >
        <div className="max-w-4xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">{t('form.steps.documents.noServicesSelected')}</p>
          </div>
        ) : (
          <div className={`space-y-3 sm:space-y-4 ${services.length === 1 && isMobile ? 'flex flex-col h-full' : ''}`}>
            {services.map((service) => {
              const fileCount = getFileCount(service.service_id);
              const files = formData.serviceDocuments?.[service.service_id] || [];
              const isApostilleService = service.service_id === APOSTILLE_SERVICE_ID;
              const shouldTakeFullHeight = services.length === 1 && isMobile && files.length === 0;

              return (
                <div
                  key={service.service_id}
                  className={`bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 ${shouldTakeFullHeight ? 'flex-1 flex flex-col' : ''}`}
                >
                  <div className="mb-3 sm:mb-4">
                    <h3 className="font-semibold text-sm sm:text-base text-gray-900 break-words">{service.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                      {formatPrice(service.base_price)} {t('form.steps.documents.perDocument')}
                    </p>
                    {fileCount > 0 && (
                      <p className="text-xs sm:text-sm font-semibold text-black mt-0.5 sm:mt-1">
                        {t('form.steps.documents.total')}: {getTotalPrice(service)} ({fileCount} {fileCount > 1 ? t('form.steps.summary.documentPlural') : t('form.steps.summary.document')})
                      </p>
                    )}
                  </div>

                  <div className={`block mb-3 sm:mb-4 ${shouldTakeFullHeight ? 'flex-1 flex flex-col' : ''}`}>
                    <div 
                      className={`group bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 sm:p-12 md:p-16 text-center cursor-pointer transition-all hover:bg-blue-50 hover:border-blue-200 active:bg-blue-100 active:border-blue-300 focus-within:bg-blue-50 focus-within:border-blue-200 ${shouldTakeFullHeight ? 'flex-1 flex flex-col justify-center min-h-[60vh]' : ''}`}
                      onClick={() => {
                        // Sauvegarder la position de scroll avant le clic
                        if (scrollContainerRef.current) {
                          savedScrollPositionRef.current = scrollContainerRef.current.scrollTop;
                        }
                        // Déclencher le clic sur l'input file programmatiquement
                        const input = fileInputRefs.current[service.service_id];
                        if (input) {
                          input.click();
                        }
                      }}
                    >
                      <Icon
                        icon="line-md:uploading-loop"
                        className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-black group-hover:text-blue-600 transition-colors mx-auto mb-4 sm:mb-5 ${shouldTakeFullHeight ? 'mb-6' : ''}`}
                      />
                      <p className={`text-sm sm:text-base md:text-lg text-black group-hover:text-blue-700 transition-colors font-medium mb-2 sm:mb-3 ${shouldTakeFullHeight ? 'text-base mb-3' : ''}`}>
                        {t('form.steps.documents.clickToUpload') || 'Click here or drag & drop your document'}
                      </p>
                      <p className={`text-xs sm:text-sm text-gray-600 ${shouldTakeFullHeight ? 'text-sm' : ''}`}>
                        {t('form.steps.documents.uploadDescription') || 'Upload your document securely in PDF, Word, or image format'}
                      </p>
                      <input
                        ref={(el) => {
                          if (el) {
                            fileInputRefs.current[service.service_id] = el;
                          }
                        }}
                        type="file"
                        multiple
                        onChange={(e) => handleFileUpload(e, service.service_id)}
                        onClick={(e) => {
                          // Empêcher le scroll lors du clic sur l'input
                          e.stopPropagation();
                        }}
                        onFocus={(e) => {
                          // Empêcher le scroll automatique lors du focus
                          e.stopPropagation();
                          // Restaurer immédiatement la position de scroll
                          if (scrollContainerRef.current && savedScrollPositionRef.current !== null) {
                            scrollContainerRef.current.scrollTop = savedScrollPositionRef.current;
                          }
                        }}
                        className="sr-only"
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        tabIndex={-1}
                      />
                    </div>
                  </div>

                  {files.length > 0 && (
                    <div className="space-y-2 sm:space-y-3">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4"
                        >
                          <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
                            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                              <Icon icon="heroicons:document" className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate" title={file.name}>{truncateFileName(file.name)}</p>
                                <p className="text-[10px] sm:text-xs text-gray-500">
                                  {(file.size / 1024).toFixed(2)} KB
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(service.service_id, index)}
                              className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                              aria-label={t('form.steps.documents.remove')}
                            >
                              <Icon icon="heroicons:trash" className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                            </button>
                          </div>

                          {!isApostilleService && options.length > 0 && (
                            <div className="space-y-1.5 sm:space-y-2 pt-2 sm:pt-3 border-t border-gray-100">
                              {options.map((option) => (
                                <div key={option.option_id} className="space-y-1">
                                  <div className="flex items-start gap-2">
                                    <label className="flex items-start space-x-1.5 sm:space-x-2 cursor-pointer group flex-1 min-w-0">
                                      <div className="relative flex-shrink-0 mt-0.5">
                                        <input
                                          type="checkbox"
                                          checked={file.selectedOptions?.includes(option.option_id) || false}
                                          onChange={() => toggleOption(service.service_id, index, option.option_id)}
                                          className="sr-only peer"
                                        />
                                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-blue-300 rounded transition-all flex items-center justify-center peer-checked:bg-blue-600 peer-checked:border-blue-600 group-hover:border-blue-400">
                                          {file.selectedOptions?.includes(option.option_id) && (
                                            <Icon icon="heroicons:check" className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex-1 min-w-0 space-y-0.5">
                                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                          <span className="text-xs sm:text-sm font-medium text-gray-700 group-hover:text-black transition-colors break-words">
                                            {option.name}
                                          </span>
                                          <span className="text-gray-500 font-normal text-[10px] sm:text-xs whitespace-nowrap">
                                            (+{formatPrice(option.additional_price || 0)})
                                          </span>
                                        </div>
                                        {option.description && (
                                          <p className="text-[10px] sm:text-xs text-gray-600 break-words">
                                            {option.description}
                                          </p>
                                        )}
                                      </div>
                                    </label>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>


      {/* Option Info Popup */}
      {showOptionInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-3 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 relative animate-fade-in-up max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowOptionInfo(null)}
              className="absolute top-3 sm:top-4 right-3 sm:right-4 p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close"
            >
              <Icon icon="heroicons:x-mark" className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
            </button>

            <div className="flex items-start space-x-3 sm:space-x-4 mb-3 sm:mb-4 pr-8 sm:pr-10">
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg sm:rounded-xl flex-shrink-0">
                <Icon icon={showOptionInfo.icon || "heroicons:information-circle"} className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 break-words">{showOptionInfo.name}</h3>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4 text-gray-700">
              <p className="text-sm sm:text-base break-words">{showOptionInfo.description}</p>

              {showOptionInfo.additional_price && (
                <div className="border-t border-gray-200 pt-3 sm:pt-4">
                  <p className="text-xs sm:text-sm text-gray-600">
                    <strong>{t('form.steps.documents.additionalFee')}</strong> {formatPrice(showOptionInfo.additional_price)} {t('form.steps.documents.perDocument')}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 sm:mt-6 flex justify-end">
              <button
                onClick={() => setShowOptionInfo(null)}
                className="btn-glassy px-4 sm:px-6 py-2 text-sm sm:text-base text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;
