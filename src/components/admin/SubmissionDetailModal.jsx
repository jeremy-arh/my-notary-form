import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';
import DocumentViewer from '../DocumentViewer';

const SubmissionDetailModal = ({ submission, onClose, onUpdateStatus, onRefresh }) => {
  const [activeTab, setActiveTab] = useState('details');
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [services, setServices] = useState([]);
  const [options, setOptions] = useState([]);

  useEffect(() => {
    fetchSubmissionDetails();
  }, [submission.id]);

  const fetchSubmissionDetails = async () => {
    try {
      // Fetch documents
      const { data: docsData } = await supabase
        .from('submission_files')
        .select('*')
        .eq('submission_id', submission.id);

      setDocuments(docsData || []);

      // Fetch services
      const { data: servicesData } = await supabase
        .from('submission_services')
        .select('service_id, services(name)')
        .eq('submission_id', submission.id);

      setServices(servicesData || []);

      // Fetch options
      const { data: optionsData } = await supabase
        .from('submission_options')
        .select('option_id, options(name, price)')
        .eq('submission_id', submission.id);

      setOptions(optionsData || []);
    } catch (error) {
      console.error('Error fetching submission details:', error);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);

    try {
      for (const file of files) {
        // Upload to Supabase Storage
        const fileName = `${submission.id}/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('notary-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('notary-documents')
          .getPublicUrl(fileName);

        // Save to database
        const { error: dbError } = await supabase
          .from('submission_files')
          .insert({
            submission_id: submission.id,
            file_name: file.name,
            file_url: publicUrl,
            file_size: file.size,
            mime_type: file.type
          });

        if (dbError) throw dbError;
      }

      // Refresh documents
      await fetchSubmissionDetails();
      alert('Documents uploaded successfully!');
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload documents');
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-gray-200 text-gray-700',
      accepted: 'bg-gray-200 text-gray-700',
      rejected: 'bg-gray-200 text-gray-700'
    };
    return colors[status] || colors.pending;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {submission.first_name} {submission.last_name}
            </h2>
            <p className="text-sm text-gray-600 mt-1">{submission.email}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon icon="heroicons:x-mark" className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          {['details', 'documents'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-semibold text-sm transition-colors ${
                activeTab === tab
                  ? 'text-black border-b-2 border-black'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Status */}
              <div className="bg-[#F3F4F6] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Status</h3>
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(submission.status)}`}>
                    {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                  </span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => onUpdateStatus(submission.id, 'accepted')}
                    className="btn-glassy flex-1 px-4 py-2 text-white text-sm font-semibold rounded-full hover:scale-105 transition-all"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => onUpdateStatus(submission.id, 'rejected')}
                    className="btn-glassy-secondary flex-1 px-4 py-2 text-gray-700 text-sm font-semibold rounded-full hover:scale-105 transition-all"
                  >
                    Reject
                  </button>
                </div>
              </div>

              {/* Personal Information */}
              <div className="bg-[#F3F4F6] rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Phone</p>
                    <p className="text-sm font-medium text-gray-900">{submission.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Country</p>
                    <p className="text-sm font-medium text-gray-900">{submission.country || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs text-gray-600 mb-1">Address</p>
                    <p className="text-sm font-medium text-gray-900">
                      {submission.address}, {submission.city}, {submission.postal_code}
                    </p>
                  </div>
                </div>
              </div>

              {/* Services */}
              {services.length > 0 && (
                <div className="bg-[#F3F4F6] rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected Services</h3>
                  <div className="space-y-2">
                    {services.map((service, index) => (
                      <div key={index} className="flex items-center p-3 bg-white rounded-xl">
                        <Icon icon="heroicons:check-circle" className="w-5 h-5 text-gray-600 mr-3" />
                        <span className="text-sm text-gray-900">{service.services?.name || 'Unknown Service'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Options */}
              {options.length > 0 && (
                <div className="bg-[#F3F4F6] rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Options</h3>
                  <div className="space-y-2">
                    {options.map((option, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-xl">
                        <span className="text-sm text-gray-900">{option.options?.name || 'Unknown Option'}</span>
                        <span className="text-sm font-semibold text-gray-900">
                          €{option.options?.price || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {submission.notes && (
                <div className="bg-[#F3F4F6] rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h3>
                  <p className="text-sm text-gray-700">{submission.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* Upload Section */}
              <div className="bg-[#F3F4F6] rounded-2xl p-6 border-2 border-dashed border-gray-300">
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <div className="text-center">
                    <Icon icon="heroicons:cloud-arrow-up" className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      {uploading ? 'Uploading...' : 'Click to upload documents'}
                    </p>
                    <p className="text-xs text-gray-600">PDF, DOC, DOCX, Images supported</p>
                  </div>
                </label>
              </div>

              {/* Documents List */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Uploaded Documents ({documents.length})
                </h3>
                {documents.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No documents uploaded yet</p>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="bg-white rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center">
                          <Icon icon="heroicons:document" className="w-8 h-8 text-gray-600 mr-3" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{doc.file_name}</p>
                            <p className="text-xs text-gray-500">
                              {(doc.file_size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <DocumentViewer
                            fileUrl={doc.file_url}
                            fileName={doc.file_name}
                            fileType={doc.mime_type}
                            fileSize={doc.file_size}
                          />
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Télécharger"
                          >
                            <Icon icon="heroicons:arrow-down-tray" className="w-5 h-5 text-gray-600" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <button
            onClick={onClose}
            className="btn-glassy-secondary w-full px-8 py-3 text-gray-700 font-semibold rounded-full hover:scale-105 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubmissionDetailModal;
