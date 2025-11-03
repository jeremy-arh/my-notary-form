import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';

const Documents = ({ formData, updateFormData, nextStep, prevStep }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [currentServiceId, setCurrentServiceId] = useState(null);

  useEffect(() => {
    fetchSelectedServices();
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

  const openUploadModal = (serviceId) => {
    setCurrentServiceId(serviceId);
    setUploadModalOpen(true);
  };

  const closeUploadModal = () => {
    setUploadModalOpen(false);
    setCurrentServiceId(null);
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const serviceDocuments = { ...(formData.serviceDocuments || {}) };
    const existingFiles = serviceDocuments[currentServiceId] || [];
    serviceDocuments[currentServiceId] = [...existingFiles, ...files];

    updateFormData({ serviceDocuments });
    closeUploadModal();
  };

  const removeFile = (serviceId, fileIndex) => {
    const serviceDocuments = { ...formData.serviceDocuments };
    serviceDocuments[serviceId] = serviceDocuments[serviceId].filter((_, index) => index !== fileIndex);

    // If no files left for this service, remove the key
    if (serviceDocuments[serviceId].length === 0) {
      delete serviceDocuments[serviceId];
    }

    updateFormData({ serviceDocuments });
  };

  const getFileCount = (serviceId) => {
    return formData.serviceDocuments?.[serviceId]?.length || 0;
  };

  const getTotalPrice = (service) => {
    const fileCount = getFileCount(service.service_id);
    return (service.base_price * fileCount).toFixed(2);
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

                return (
                  <div
                    key={service.service_id}
                    className="bg-white rounded-2xl p-6 border border-gray-200"
                  >
                    {/* Service Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        <div className={`p-3 rounded-xl ${service.color || 'bg-gray-100'}`}>
                          <Icon
                            icon={service.icon || 'heroicons:document-text'}
                            className="w-6 h-6 text-gray-600"
                          />
                        </div>
                        <div>
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
                      <button
                        type="button"
                        onClick={() => openUploadModal(service.service_id)}
                        className="btn-glassy px-4 py-2 text-white text-sm font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
                      >
                        <Icon icon="heroicons:plus" className="w-4 h-4 inline mr-1" />
                        Add Files
                      </button>
                    </div>

                    {/* Uploaded Files List */}
                    {files.length > 0 && (
                      <div className="space-y-2">
                        {files.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                          >
                            <div className="flex items-center space-x-3">
                              <Icon icon="heroicons:document" className="w-8 h-8 text-gray-600" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {(file.size / 1024).toFixed(2)} KB
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(service.service_id, index)}
                              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                              <Icon icon="heroicons:trash" className="w-5 h-5 text-red-600" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* No Files Message */}
                    {files.length === 0 && (
                      <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-xl">
                        <Icon
                          icon="heroicons:document-arrow-up"
                          className="w-12 h-12 text-gray-400 mx-auto mb-2"
                        />
                        <p className="text-sm text-gray-600">No documents uploaded yet</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Click "Add Files" to upload documents
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

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 relative animate-fade-in-up">
            <button
              onClick={closeUploadModal}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Icon icon="heroicons:x-mark" className="w-6 h-6 text-gray-600" />
            </button>

            <h3 className="text-xl font-bold text-gray-900 mb-4">Upload Documents</h3>

            <p className="text-sm text-gray-600 mb-6">
              Select one or more documents to upload for this service
            </p>

            <label className="block">
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-black hover:bg-gray-50 transition-all">
                <Icon
                  icon="heroicons:cloud-arrow-up"
                  className="w-16 h-16 text-gray-400 mx-auto mb-4"
                />
                <p className="text-gray-700 font-medium mb-2">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-gray-500">PDF, PNG, JPG, or other documents</p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="sr-only"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                />
              </div>
            </label>

            <div className="mt-6 flex justify-end">
              <button
                onClick={closeUploadModal}
                className="btn-glassy-secondary px-6 py-2 text-gray-700 font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Documents;
