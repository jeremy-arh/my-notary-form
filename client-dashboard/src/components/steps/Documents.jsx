import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../hooks/useTranslation';
import { useServices } from '../../contexts/ServicesContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { uploadDocument, deleteDocument } from '../../utils/formDraft';
import { pushGTMEvent } from '../../utils/gtm';
import Notification from '../Notification';

const APOSTILLE_SERVICE_ID = '473fb677-4dd3-4766-8221-0250ea3440cd';

const Documents = ({ formData, updateFormData, nextStep, prevStep, handleContinueClick, getValidationErrorMessage, isPriceDetailsOpen, setIsPriceDetailsOpen, setIsUploading }) => {
  const { t } = useTranslation();
  const { getServicesByIds, options, loading: servicesLoading, getServiceName } = useServices();
  const { formatPriceSync, currency, cacheVersion } = useCurrency();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOptionInfo, setShowOptionInfo] = useState(null);
  const [viewingFile, setViewingFile] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [footerPadding, setFooterPadding] = useState(160); // Valeur par défaut
  const [uploadingServices, setUploadingServices] = useState({}); // Track uploading state per service
  const [notification, setNotification] = useState(null);
  const scrollContainerRef = useRef(null);
  const savedScrollPositionRef = useRef(null);
  const fileInputRefs = useRef({});

  // Check if any upload is in progress
  const isAnyUploadInProgress = Object.values(uploadingServices).some(Boolean);

  // Sync upload state with parent component (NotaryForm)
  useEffect(() => {
    if (setIsUploading) {
      setIsUploading(isAnyUploadInProgress);
    }
  }, [isAnyUploadInProgress, setIsUploading]);

  const handleContinue = () => {
    // SECURITY: Prevent navigation if upload is in progress
    if (isAnyUploadInProgress) {
      setNotification({
        type: 'warning',
        message: t('form.steps.documents.uploadInProgress') || 'Veuillez attendre la fin du téléchargement avant de continuer.'
      });
      return;
    }

    // Calculer les statistiques des documents pour GTM
    const serviceDocuments = formData.serviceDocuments || {};
    let totalDocuments = 0;
    const servicesWithDocs = [];
    const documentsByService = {};

    Object.entries(serviceDocuments).forEach(([serviceId, files]) => {
      if (Array.isArray(files) && files.length > 0) {
        const fileCount = files.length;
        totalDocuments += fileCount;
        servicesWithDocs.push(serviceId);
        documentsByService[serviceId] = fileCount;
      }
    });

    // Envoyer l'événement GTM avec l'ID "documents"
    pushGTMEvent('documents', {
      documents_count: totalDocuments,
      services_with_docs: servicesWithDocs.length,
      service_ids: servicesWithDocs.join(','),
      documents_by_service: documentsByService
    });

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

  // Calculate footer height and set padding dynamically to maintain gap (10px on mobile, 20px on desktop)
  useEffect(() => {
    let resizeObserver = null;
    let checkInterval = null;
    let resizeHandler = null;
    
    const calculateFooterPadding = () => {
      const footer = document.querySelector('[data-footer="notary-form"]');
      if (footer && footer.offsetHeight > 0) {
        const footerHeight = footer.offsetHeight;
        const desiredGap = isMobile ? 50 : 20; // 50px gap on mobile pour permettre de voir le dernier fichier avec ses options, 20px on desktop
        const newPadding = footerHeight + desiredGap;
        setFooterPadding(prevPadding => {
          // Always update to ensure accuracy
          return newPadding;
        });
        return true; // Footer found and measured
      }
      return false; // Footer not found or not yet rendered
    };

    // Try to find footer and set up observers
    const setupObservers = () => {
      const footer = document.querySelector('[data-footer="notary-form"]');
      if (footer && footer.offsetHeight > 0) {
        // Footer found, set up ResizeObserver
        if (!resizeObserver) {
          resizeObserver = new ResizeObserver(() => {
            calculateFooterPadding();
          });
          resizeObserver.observe(footer);
        }
        
        // Also observe window resize
        if (!resizeHandler) {
          resizeHandler = () => {
            calculateFooterPadding();
          };
          window.addEventListener('resize', resizeHandler);
        }
        
        // Calculate immediately
        calculateFooterPadding();
        
        return true;
      }
      return false;
    };

    // Initial attempt with delay to ensure DOM is ready
    const initialTimeout = setTimeout(() => {
      if (!setupObservers()) {
        // Footer not found yet, try periodically
        let attempts = 0;
        checkInterval = setInterval(() => {
          attempts++;
          if (setupObservers() || attempts >= 30) {
            clearInterval(checkInterval);
            if (attempts >= 30) {
              // Max attempts reached, use safe fallback
              setFooterPadding(isMobile ? 110 : 100);
            }
          }
        }, 100);
      }
    }, 200);

    return () => {
      clearTimeout(initialTimeout);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (checkInterval) {
        clearInterval(checkInterval);
      }
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
    };
  }, [isMobile]);

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

    // Validate file types - only PDF and images allowed
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpg',
      'image/jpeg',
      'image/gif',
      'image/webp'
    ];

    const invalidFiles = files.filter(file => !allowedTypes.includes(file.type.toLowerCase()));
    
    if (invalidFiles.length > 0) {
      const fileNames = invalidFiles.map(f => f.name).join(', ');
      setNotification({
        type: 'error',
        message: t('form.steps.documents.invalidFileFormat').replace('{fileNames}', fileNames)
      });
      
      // Réinitialiser l'input
      const inputElement = event.target;
      if (inputElement) {
        inputElement.value = '';
      }
      return;
    }

    // Set uploading state to true for this service
    setUploadingServices(prev => ({ ...prev, [serviceId]: true }));

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

    try {
      // Get session ID for storage path
      const sessionId = localStorage.getItem('formSessionId') || 
                       `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Upload files to Supabase Storage (NO base64/dataUrl - localStorage can't handle large files)
      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          try {
            // Check file size - warn if > 50MB
            const maxSize = 50 * 1024 * 1024; // 50 MB
            if (file.size > maxSize) {
              console.warn(`⚠️ File ${file.name} is larger than 50MB`);
              setNotification({
                type: 'error',
                message: t('form.steps.documents.fileTooLarge') || `Le fichier ${file.name} dépasse la limite de 50 MB.`
              });
              return {
                name: file.name,
                size: file.size,
                type: file.type,
                error: 'File too large',
                selectedOptions: [],
              };
            }

            const uploadedFile = await uploadDocument(file, serviceId, sessionId);
            
            // Only store metadata + Supabase URL (NO base64 dataUrl)
            return {
              name: uploadedFile.name,
              size: uploadedFile.size,
              type: uploadedFile.type,
              path: uploadedFile.path,
              url: uploadedFile.url, // Supabase URL for display
              uploadedAt: uploadedFile.uploadedAt,
              selectedOptions: [],
            };
          } catch (error) {
            console.error('Error uploading file:', error);
            return {
              name: file.name,
              size: file.size,
              type: file.type,
              error: 'Upload failed',
              selectedOptions: [],
            };
          }
        })
      );

      // Filter out failed uploads
      const successfulUploads = uploadedFiles.filter(file => !file.error);
      const failedUploads = uploadedFiles.filter(file => file.error);
      
      // Show notification for failed uploads
      if (failedUploads.length > 0) {
        setNotification({
          type: 'error',
          message: t('form.steps.documents.uploadError') || `Échec de l'upload de ${failedUploads.length} fichier(s): ${failedUploads.map(f => f.name).join(', ')}`
        });
      }
      
      // Only add successful uploads
      if (successfulUploads.length > 0) {
        console.log('📤 [Documents] Adding successful uploads:', successfulUploads.length, 'files for service:', serviceId);
        console.log('📤 [Documents] File names:', successfulUploads.map(f => f.name).join(', '));
        
        // IMPORTANT: Use functional update to avoid race conditions with multiple simultaneous uploads
        // This ensures we always work with the latest state, not a stale copy
        updateFormData((prevData) => {
          console.log('📤 [Documents] Previous serviceDocuments:', JSON.stringify(Object.keys(prevData?.serviceDocuments || {})));
          const currentServiceDocuments = { ...(prevData?.serviceDocuments || {}) };
          const existingFiles = currentServiceDocuments[serviceId] || [];
          console.log('📤 [Documents] Existing files for service', serviceId, ':', existingFiles.length);
          currentServiceDocuments[serviceId] = [...existingFiles, ...successfulUploads];
          console.log('📤 [Documents] New total for service', serviceId, ':', currentServiceDocuments[serviceId].length);
          return { serviceDocuments: currentServiceDocuments };
        });
        
        // Show success notification
        setNotification({
          type: 'success',
          message: t('form.steps.documents.uploadSuccess') || `${successfulUploads.length} fichier(s) uploadé(s) avec succès`
        });
      }
    } finally {
      // Set uploading state to false when done
      setUploadingServices(prev => ({ ...prev, [serviceId]: false }));
    }
  };

  const removeFile = async (serviceId, fileIndex) => {
    // Get file to remove first (before state update)
    const fileToRemove = formData.serviceDocuments?.[serviceId]?.[fileIndex];
    
    // Delete from Supabase Storage if it has a path
    if (fileToRemove && fileToRemove.path) {
      try {
        await deleteDocument(fileToRemove.path);
      } catch (error) {
        console.error('Error deleting file from storage:', error);
      }
    }
    
    // Use functional update to avoid race conditions
    updateFormData((prevData) => {
      const serviceDocuments = { ...(prevData?.serviceDocuments || {}) };
      if (serviceDocuments[serviceId]) {
        serviceDocuments[serviceId] = serviceDocuments[serviceId].filter((_, index) => index !== fileIndex);
        
        if (serviceDocuments[serviceId].length === 0) {
          delete serviceDocuments[serviceId];
        }
      }
      return { serviceDocuments };
    });
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
    // Use functional update to avoid race conditions
    updateFormData((prevData) => {
      const serviceDocuments = { ...(prevData?.serviceDocuments || {}) };
      
      if (serviceDocuments[serviceId] && serviceDocuments[serviceId][fileIndex]) {
        const file = { ...serviceDocuments[serviceId][fileIndex] };
        
        if (!file.selectedOptions) {
          file.selectedOptions = [];
        }

        if (file.selectedOptions.includes(optionId)) {
          file.selectedOptions = file.selectedOptions.filter(id => id !== optionId);
        } else {
          file.selectedOptions = [...file.selectedOptions, optionId];
        }
        
        // Create new array with updated file
        serviceDocuments[serviceId] = [...serviceDocuments[serviceId]];
        serviceDocuments[serviceId][fileIndex] = file;
      }
      
      return { serviceDocuments };
    });
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

    return formatPriceSync(totalEUR);
  };

  // Get file type icon and color based on file extension or MIME type
  const getFileTypeIcon = (file) => {
    const fileName = file.name?.toLowerCase() || '';
    const fileType = file.type?.toLowerCase() || '';
    
    // Check by extension first, then by MIME type
    if (fileName.endsWith('.pdf') || fileType === 'application/pdf') {
      return { icon: 'mdi:file-pdf-box', color: 'text-red-600', bgColor: 'bg-red-50' };
    }
    if (fileName.endsWith('.png') || fileType === 'image/png') {
      return { icon: 'mdi:file-image', color: 'text-blue-600', bgColor: 'bg-blue-50' };
    }
    if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileType === 'image/jpeg' || fileType === 'image/jpg') {
      return { icon: 'mdi:file-image', color: 'text-purple-600', bgColor: 'bg-purple-50' };
    }
    if (fileName.endsWith('.gif') || fileType === 'image/gif') {
      return { icon: 'mdi:file-image', color: 'text-pink-600', bgColor: 'bg-pink-50' };
    }
    if (fileName.endsWith('.webp') || fileType === 'image/webp') {
      return { icon: 'mdi:file-image', color: 'text-green-600', bgColor: 'bg-green-50' };
    }
    // Default for other file types
    return { icon: 'heroicons:document', color: 'text-gray-600', bgColor: 'bg-gray-50' };
  };

  return (
    <div className="h-full w-full flex flex-col relative max-w-full overflow-x-hidden">
      {/* Scrollable Content - Entire step including header */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 md:pt-8 w-full max-w-full" 
        style={{ 
          minHeight: 0,
          paddingBottom: isMobile ? `${footerPadding}px` : '144px' // sm:pb-36 = 144px, md:pb-6 = 24px, lg:pb-24 = 96px
        }}
      >
        <div className={`max-w-4xl mx-auto w-full ${services.length === 1 && isMobile && !loading ? 'h-full flex flex-col min-h-0' : ''}`}>
          {/* Header */}
          <div className="mb-3 sm:mb-4 flex-shrink-0">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">
              {t('form.steps.documents.title')}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mb-2">
              {t('form.steps.documents.subtitle')}
            </p>
          </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">{t('form.steps.documents.noServicesSelected')}</p>
          </div>
        ) : (
          <div className={`space-y-3 sm:space-y-4 w-full max-w-full ${services.length === 1 && isMobile ? 'flex flex-col flex-1 min-h-0' : ''}`}>
            {services.map((service) => {
              const fileCount = getFileCount(service.service_id);
              const files = formData.serviceDocuments?.[service.service_id] || [];
              const isApostilleService = service.service_id === APOSTILLE_SERVICE_ID;
              const shouldTakeFullHeight = services.length === 1 && isMobile && files.length === 0;

              return (
                <div
                  key={service.service_id}
                  className={`bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 w-full max-w-full box-border ${shouldTakeFullHeight ? 'flex-1 flex flex-col min-h-0' : ''}`}
                  style={isMobile && files.length === 0 ? { minHeight: '400px', display: 'flex', flexDirection: 'column' } : {}}
                >
                  <div className="mb-3 sm:mb-4">
                    <h3 className="font-semibold text-sm sm:text-base text-gray-900 break-words">{getServiceName(service)}</h3>
                    <p key={`service-price-${service.service_id}-${currency}-${cacheVersion}`} className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                      {formatPriceSync(service.base_price)} {t('form.steps.documents.perDocument')}
                    </p>
                    {fileCount > 0 && (
                      <p key={`total-price-${service.service_id}-${currency}-${cacheVersion}`} className="text-xs sm:text-sm font-semibold text-black mt-0.5 sm:mt-1">
                        {t('form.steps.documents.total')}: {getTotalPrice(service)} ({fileCount} {fileCount > 1 ? t('form.steps.summary.documentPlural') : t('form.steps.summary.document')})
                      </p>
                    )}
                  </div>

                  <div className={`block mb-3 sm:mb-4 w-full ${shouldTakeFullHeight ? 'flex-1 flex flex-col min-h-0' : isMobile && files.length === 0 ? 'flex-1 flex flex-col min-h-0' : ''}`}>
                    <div 
                      className={`group relative bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-8 md:p-12 lg:p-16 text-center cursor-pointer transition-all hover:bg-blue-50 hover:border-blue-200 active:bg-blue-100 active:border-blue-300 focus-within:bg-blue-50 focus-within:border-blue-200 w-full max-w-full overflow-hidden ${shouldTakeFullHeight ? 'flex-1 flex flex-col justify-center' : isMobile && files.length === 0 ? 'flex-1 flex flex-col justify-center min-h-0' : isMobile ? 'flex flex-col justify-center' : ''}`}
                      style={shouldTakeFullHeight && isMobile ? {
                        maxHeight: '100%',
                        minHeight: '250px'
                      } : isMobile && files.length === 0 ? {
                        minHeight: '250px',
                        height: '100%'
                      } : isMobile ? {
                        minHeight: '250px'
                      } : {}}
                      onClick={() => {
                        // Prevent click during upload
                        if (uploadingServices[service.service_id]) return;
                        
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
                      {/* Uploading Overlay */}
                      {uploadingServices[service.service_id] && (
                        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center z-10">
                          <Icon 
                            icon="svg-spinners:ring-resize" 
                            className="w-12 h-12 sm:w-16 sm:h-16 text-blue-600 mb-3"
                          />
                          <p className="text-sm sm:text-base font-medium text-gray-900">
                            {t('form.steps.documents.uploading')}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-600 mt-1">
                            {t('form.steps.documents.pleaseWait')}
                          </p>
                        </div>
                      )}

                      <Icon
                        icon="hugeicons:file-upload"
                        className={`w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-14 text-black group-hover:text-blue-600 transition-colors mx-auto mb-2 sm:mb-4 md:mb-5 flex-shrink-0 ${shouldTakeFullHeight ? 'mb-6' : ''}`}
                      />
                      <p className={`text-xs sm:text-base md:text-lg text-black group-hover:text-blue-700 transition-colors font-medium mb-1 sm:mb-2 md:mb-3 break-words px-1 ${shouldTakeFullHeight ? 'text-base mb-3' : ''}`}>
                        {t('form.steps.documents.clickToUpload') || 'Click here or drag & drop your document'}
                      </p>
                      <p className={`text-[10px] sm:text-xs md:text-sm text-gray-600 leading-relaxed px-1 break-words mb-3 sm:mb-4 ${shouldTakeFullHeight ? 'text-sm' : ''}`}>
                        {t('form.steps.documents.uploadDescriptionLong')}
                      </p>
                      
                      {/* Trust Signals */}
                      <div className="hidden sm:flex items-center justify-center gap-3 sm:gap-4 md:gap-6 flex-wrap px-2">
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Icon icon="heroicons:lock-closed" className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                          <span className="text-[9px] sm:text-[10px] font-light whitespace-nowrap">{t('form.steps.documents.encryptedSecure')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Icon icon="heroicons:trash" className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                          <span className="text-[9px] sm:text-[10px] font-light whitespace-nowrap">{t('form.steps.documents.autoDeleted')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Icon icon="heroicons:check-badge" className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                          <span className="text-[9px] sm:text-[10px] font-light whitespace-nowrap">{t('form.steps.documents.gdprCompliant')}</span>
                        </div>
                      </div>
                      
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
                        accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,image/*,application/pdf"
                        tabIndex={-1}
                        disabled={uploadingServices[service.service_id]}
                      />
                    </div>
                  </div>

                  {files.length > 0 && (
                    <div className="space-y-2 sm:space-y-3">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className={`border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 ${isMobile && index === files.length - 1 ? 'mb-3' : ''}`}
                        >
                          <div className="flex items-start sm:items-center justify-between mb-2 sm:mb-3 gap-2 flex-wrap">
                            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                              {(() => {
                                const fileType = getFileTypeIcon(file);
                                return (
                                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${fileType.bgColor}`}>
                                    <Icon icon={fileType.icon} className={`w-5 h-5 sm:w-6 sm:h-6 ${fileType.color}`} />
                                  </div>
                                );
                              })()}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate" title={file.name}>{truncateFileName(file.name)}</p>
                                <p className="text-[10px] sm:text-xs text-gray-500">
                                  {(file.size / 1024).toFixed(2)} KB
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ml-auto">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingFile(file);
                                }}
                                className="p-1.5 sm:p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                                aria-label={t('form.steps.documents.view')}
                                title={t('form.steps.documents.view')}
                              >
                                <Icon icon="heroicons:eye" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 hover:text-gray-900" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeFile(service.service_id, index)}
                                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                                aria-label={t('form.steps.documents.remove')}
                              >
                                <Icon icon="heroicons:trash" className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                              </button>
                            </div>
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
                                          <span key={`option-price-${option.option_id}-${currency}-${cacheVersion}`} className="text-gray-500 font-normal text-[10px] sm:text-xs whitespace-nowrap">
                                            (+{formatPriceSync(option.additional_price || 0)})
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
              aria-label={t('form.steps.documents.close')}
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
                  <p key={`option-info-price-${showOptionInfo?.option_id}-${currency}-${cacheVersion}`} className="text-xs sm:text-sm text-gray-600">
                    <strong>{t('form.steps.documents.additionalFee')}</strong> {formatPriceSync(showOptionInfo.additional_price)} {t('form.steps.documents.perDocument')}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 sm:mt-6 flex justify-end">
              <button
                onClick={() => setShowOptionInfo(null)}
                className="btn-glassy px-4 sm:px-6 py-2 text-sm sm:text-base text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
              >
                {t('form.steps.documents.gotIt')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal - Full Screen */}
      {viewingFile && createPortal(
        <div 
          style={{ 
            position: 'fixed',
            top: '0px', 
            left: '0px', 
            right: '0px', 
            bottom: '0px',
            width: '100vw',
            height: '100vh',
            backgroundColor: '#000000',
            zIndex: 99999,
            overflow: 'auto'
          }}
          onClick={(e) => {
            // Empêcher les clics de se propager
            e.stopPropagation();
          }}
        >
          {/* Close Button - Large */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setViewingFile(null);
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
            style={{ 
              position: 'fixed',
              top: '24px',
              right: '24px',
              zIndex: '100000',
              padding: '12px 20px',
              backgroundColor: '#3b82f6',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'white',
              fontSize: '16px',
              fontWeight: 500
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            aria-label={t('form.steps.documents.close')}
            type="button"
          >
            <Icon icon="heroicons:x-mark" style={{ width: '20px', height: '20px' }} />
            <span>{t('form.steps.documents.close')}</span>
          </button>

          {/* Document Content - Full Screen */}
          <div 
            style={{
              width: '100%',
              height: '100vh',
              overflow: 'auto'
            }}
          >
            {(viewingFile.dataUrl || viewingFile.url) && (
              <>
                {viewingFile.type?.startsWith('image/') ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100vh', padding: '32px' }}>
                    <img 
                      src={viewingFile.dataUrl || viewingFile.url} 
                      alt={viewingFile.name}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      onError={(e) => {
                        // Si dataUrl échoue, essayer avec url
                        if (viewingFile.url && e.target.src !== viewingFile.url) {
                          e.target.src = viewingFile.url;
                        }
                      }}
                    />
                  </div>
                ) : viewingFile.type === 'application/pdf' || viewingFile.name?.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={viewingFile.dataUrl || viewingFile.url}
                    style={{
                      width: '100%',
                      height: '100vh',
                      border: 0
                    }}
                    title={viewingFile.name}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', padding: '32px', backgroundColor: 'white' }}>
                    <Icon icon="heroicons:document" style={{ width: '80px', height: '80px', color: '#9ca3af', marginBottom: '24px' }} />
                    <p style={{ fontSize: '16px', color: '#4b5563', marginBottom: '24px' }}>
                      {t('form.steps.documents.previewNotAvailable') || 'Preview not available for this file type.'}
                    </p>
                    <a
                      href={viewingFile.dataUrl || viewingFile.url}
                      download={viewingFile.name}
                      style={{ padding: '12px 24px', backgroundColor: '#000000', color: 'white', borderRadius: '8px', fontSize: '16px', fontWeight: 500, textDecoration: 'none' }}
                    >
                      {t('form.steps.documents.download') || 'Download'}
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Notification */}
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};

export default Documents;
