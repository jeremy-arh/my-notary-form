import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';

const APOSTILLE_SERVICE_ID = '473fb677-4dd3-4766-8221-0250ea3440cd';

const Documents = ({ formData, updateFormData, nextStep, prevStep }) => {
  const [services, setServices] = useState([]);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOptionInfo, setShowOptionInfo] = useState(null);

  useEffect(() => {
    fetchSelectedServices();
    fetchOptions();
  }, [formData.selectedServices]);

  const fetchSelectedServices = async () => {
    if (!formData.selectedServices || formData.selectedServices.length === 0) {
      setServices([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .in('service_id', formData.selectedServices);

      if (error) throw error;

      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('options')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      setOptions(data || []);
      console.log('📋 Options loaded:', data);
    } catch (error) {
      console.error('Error fetching options:', error);
      setOptions([]);
    }
  };

  const handleFileUpload = async (event, serviceId) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Convert File objects to serializable format for localStorage
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
              selectedOptions: [], // Array of option_ids
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
    let total = 0;

    files.forEach(file => {
      // Add base service price
      total += service.base_price;

      // Add options prices
      if (file.selectedOptions && file.selectedOptions.length > 0) {
        file.selectedOptions.forEach(optionId => {
          const option = options.find(o => o.option_id === optionId);
          if (option) {
            total += option.additional_price || 0;
          }
        });
      }
    });

    return total.toFixed(2);
  };

  return (
    <>
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-6 md:pt-10 pb-44 lg:pb-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Upload Documents
            </h2>
            <p className="text-gray-600">
              Upload documents for each selected service
            </p>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No services selected. Please go back and select services.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {services.map((service) => {
                const fileCount = getFileCount(service.service_id);
                const files = formData.serviceDocuments?.[service.service_id] || [];
                const isApostilleService = service.service_id === APOSTILLE_SERVICE_ID;

                return (
                  <div
                    key={service.service_id}
                    className="bg-white rounded-2xl p-6 border border-gray-200"
                  >
                    {/* Service Header */}
                    <div className="flex items-start space-x-4 mb-4">
                      <div className={`p-3 rounded-xl ${service.color || 'bg-gray-100'}`}>
                        <Icon
                          icon={service.icon || 'heroicons:document-text'}
                          className="w-6 h-6 text-gray-600"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{service.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          ${service.base_price.toFixed(2)} per document
                        </p>
                        {fileCount > 0 && (
                          <p className="text-sm font-semibold text-black mt-1">
                            Total: ${getTotalPrice(service)} ({fileCount} document{fileCount > 1 ? 's' : ''})
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Inline File Uploader */}
                    <label className="block mb-4">
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-black hover:bg-gray-50 transition-all">
                        <Icon
                          icon="heroicons:cloud-arrow-up"
                          className="w-12 h-12 text-gray-400 mx-auto mb-3"
                        />
                        <p className="text-gray-700 font-medium mb-1">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PDF, PNG, JPG, or other documents</p>
                        <input
                          type="file"
                          multiple
                          onChange={(e) => handleFileUpload(e, service.service_id)}
                          className="sr-only"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        />
                      </div>
                    </label>

                    {/* Uploaded Files List */}
                    {files.length > 0 && (
                      <div className="space-y-3">
                        {files.map((file, index) => (
                          <div
                            key={index}
                            className="border border-gray-200 rounded-xl p-4"
                          >
                            {/* File Info Row */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3 flex-1">
                                <Icon icon="heroicons:document" className="w-8 h-8 text-gray-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {(file.size / 1024).toFixed(2)} KB
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFile(service.service_id, index)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                              >
                                <Icon icon="heroicons:trash" className="w-5 h-5 text-red-600" />
                              </button>
                            </div>

                            {/* Options - Only show if service is NOT apostille */}
                            {!isApostilleService && options.length > 0 && (
                              <div className="space-y-2 pt-3 border-t border-gray-100">
                                {options.map((option) => (
                                  <div key={option.option_id} className="flex items-center justify-between">
                                    <label className="flex items-center space-x-2 cursor-pointer group flex-1">
                                      {/* Custom Checkbox */}
                                      <div className="relative">
                                        <input
                                          type="checkbox"
                                          checked={file.selectedOptions?.includes(option.option_id) || false}
                                          onChange={() => toggleOption(service.service_id, index, option.option_id)}
                                          className="sr-only peer"
                                        />
                                        <div className="w-5 h-5 border-2 border-gray-300 rounded peer-checked:bg-black peer-checked:border-black transition-all flex items-center justify-center">
                                          {file.selectedOptions?.includes(option.option_id) && (
                                            <Icon icon="heroicons:check" className="w-3 h-3 text-white" />
                                          )}
                                        </div>
                                      </div>
                                      <span className="text-sm font-medium text-gray-700 group-hover:text-black transition-colors">
                                        {option.name}
                                        <span className="text-gray-500 font-normal ml-1">
                                          (+${option.additional_price?.toFixed(2) || '0.00'})
                                        </span>
                                      </span>
                                    </label>

                                    {/* Info Icon */}
                                    {option.description && (
                                      <button
                                        type="button"
                                        onClick={() => setShowOptionInfo(option)}
                                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                      >
                                        <Icon icon="heroicons:information-circle" className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* No Files Message */}
                    {files.length === 0 && (
                      <div className="text-center py-6 bg-gray-50 rounded-xl">
                        <Icon
                          icon="heroicons:document-arrow-up"
                          className="w-10 h-10 text-gray-400 mx-auto mb-2"
                        />
                        <p className="text-sm text-gray-600">No documents uploaded yet</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Use the upload area above to add documents
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Navigation - Desktop only */}
      <div className="hidden lg:block flex-shrink-0 px-4 py-4 bg-[#F3F4F6] lg:relative bottom-20 lg:bottom-auto left-0 right-0 z-50 lg:z-auto lg:border-t lg:border-gray-300">
        <div className="flex justify-between">
          <button
            type="button"
            onClick={prevStep}
            className="btn-glassy-secondary px-8 py-3 text-gray-700 font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
          >
            Back
          </button>
          <button
            type="button"
            onClick={nextStep}
            disabled={
              !formData.selectedServices ||
              formData.selectedServices.length === 0 ||
              !formData.serviceDocuments ||
              !formData.selectedServices.every(serviceId => {
                const docs = formData.serviceDocuments[serviceId];
                return docs && docs.length > 0;
              })
            }
            className="btn-glassy px-8 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            Continue
          </button>
        </div>
      </div>

      {/* Option Info Popup */}
      {showOptionInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 relative animate-fade-in-up">
            <button
              onClick={() => setShowOptionInfo(null)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Icon icon="heroicons:x-mark" className="w-6 h-6 text-gray-600" />
            </button>

            <div className="flex items-start space-x-4 mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Icon icon={showOptionInfo.icon || "heroicons:information-circle"} className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{showOptionInfo.name}</h3>
              </div>
            </div>

            <div className="space-y-4 text-gray-700">
              <p>{showOptionInfo.description}</p>

              {showOptionInfo.additional_price && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm text-gray-600">
                    <strong>Additional Fee:</strong> ${showOptionInfo.additional_price.toFixed(2)} per document
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowOptionInfo(null)}
                className="btn-glassy px-6 py-2 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Documents;
