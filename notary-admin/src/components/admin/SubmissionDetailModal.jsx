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
  const [notaryTimezone, setNotaryTimezone] = useState(null);

  useEffect(() => {
    fetchSubmissionDetails();
    fetchNotaryTimezone();
  }, [submission.id]);

  const fetchNotaryTimezone = async () => {
    if (submission.assigned_notary_id) {
      try {
        const { data } = await supabase
          .from('notary')
          .select('timezone')
          .eq('id', submission.assigned_notary_id)
          .single();
        if (data?.timezone) {
          setNotaryTimezone(data.timezone);
        }
      } catch (error) {
        console.error('Error fetching notary timezone:', error);
      }
    }
  };

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
      day: 'numeric'
    });
  };

  // Format time in 12-hour format (AM/PM)
  const formatTime12h = (timeString) => {
    if (!timeString || timeString === 'N/A') return 'N/A';
    try {
      const [hours, minutes] = timeString.split(':').map(Number);
      const hour = parseInt(hours);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
    } catch (error) {
      return timeString;
    }
  };

  // Convert time from Florida/Eastern Time to another timezone
  const convertTimeFromFlorida = (time, date, targetTimezone) => {
    if (!time || !date || !targetTimezone) return time;
    
    try {
      const floridaTimezone = 'America/New_York';
      
      // Convert UTC offset to IANA timezone if needed
      let targetTz = targetTimezone;
      if (targetTimezone.startsWith('UTC')) {
        const offsetMatch = targetTimezone.match(/UTC([+-])(\d+)(?::(\d+))?/);
        if (offsetMatch) {
          const sign = offsetMatch[1] === '+' ? 1 : -1;
          const hours = parseInt(offsetMatch[2]);
          const minutes = parseInt(offsetMatch[3] || '0');
          const offsetMinutes = sign * (hours * 60 + minutes);
          
          // Map common UTC offsets to IANA timezones
          if (offsetMinutes === -300) targetTz = 'America/New_York';
          else if (offsetMinutes === -240) targetTz = 'America/New_York';
          else if (offsetMinutes === 60) targetTz = 'Europe/Paris';
          else if (offsetMinutes === 0) targetTz = 'Europe/London';
          else if (offsetMinutes === 120) targetTz = 'Europe/Berlin';
          else targetTz = 'UTC';
        }
      }
      
      const [hours, minutes] = time.split(':').map(Number);
      const dateTimeString = `${date}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
      const tempDate = new Date(dateTimeString);
      
      // Format in Florida timezone to see what UTC time it represents
      const floridaFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: floridaTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      
      const floridaParts = floridaFormatter.formatToParts(tempDate);
      const floridaHour = parseInt(floridaParts.find(p => p.type === 'hour').value);
      const floridaMinute = parseInt(floridaParts.find(p => p.type === 'minute').value);
      
      // Calculate difference and adjust
      const desiredMinutes = hours * 60 + minutes;
      const actualMinutes = floridaHour * 60 + floridaMinute;
      const diffMinutes = desiredMinutes - actualMinutes;
      
      const utcTimestamp = tempDate.getTime() + diffMinutes * 60 * 1000;
      const adjustedDate = new Date(utcTimestamp);
      
      // Format in target timezone with 12-hour format (AM/PM)
      const targetFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: targetTz,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      const formattedTime = targetFormatter.format(adjustedDate);
      
      // Extract time parts (format: "H:MM AM/PM" or "HH:MM AM/PM")
      const timeMatch = formattedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (timeMatch) {
        return `${timeMatch[1]}:${timeMatch[2]} ${timeMatch[3]}`;
      }
      
      // Fallback to 24-hour format if parsing fails
      const targetParts = targetFormatter.formatToParts(adjustedDate);
      const targetHour = parseInt(targetParts.find(p => p.type === 'hour').value);
      const targetMinute = targetParts.find(p => p.type === 'minute').value;
      const period = targetHour >= 12 ? 'PM' : 'AM';
      const displayHour = targetHour > 12 ? targetHour - 12 : targetHour === 0 ? 12 : targetHour;
      return `${displayHour}:${targetMinute} ${period}`;
    } catch (error) {
      console.error('Error converting time:', error);
      return time;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      pending_payment: 'bg-orange-100 text-orange-800',
      confirmed: 'bg-green-100 text-green-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.pending;
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      pending_payment: 'Pending Payment',
      confirmed: 'Confirmed',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      accepted: 'Accepted',
      rejected: 'Rejected'
    };
    return labels[status] || status?.charAt(0).toUpperCase() + status?.slice(1).replace('_', ' ');
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
                    {getStatusLabel(submission.status)}
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

              {/* Appointment */}
              <div className="bg-[#F3F4F6] rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Date</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatDate(submission.appointment_date)}
                    </span>
                  </div>
                  {submission.appointment_time && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Time (Florida - Eastern Time)</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatTime12h(submission.appointment_time)}
                        </span>
                      </div>
                      {notaryTimezone && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Time (Notary - {notaryTimezone})</span>
                          <span className="text-sm font-medium text-gray-900">
                            {convertTimeFromFlorida(submission.appointment_time, submission.appointment_date, notaryTimezone)}
                          </span>
                        </div>
                      )}
                      {submission.timezone && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Time (Client - {submission.timezone})</span>
                          <span className="text-sm font-medium text-gray-900">
                            {convertTimeFromFlorida(submission.appointment_time, submission.appointment_date, submission.timezone)}
                          </span>
                        </div>
                      )}
                    </>
                  )}
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
                          ${option.options?.price || 0}
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
