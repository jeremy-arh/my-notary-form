import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import Chat from '../../components/Chat';
import { supabase } from '../../lib/supabase';
import { convertTimeToNotaryTimezone } from '../../utils/timezoneConverter';

const SubmissionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [notaryId, setNotaryId] = useState(null);
  const [notaryTimezone, setNotaryTimezone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [servicesMap, setServicesMap] = useState({});
  const [optionsMap, setOptionsMap] = useState({});
  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState('details');
  const [isUnassigned, setIsUnassigned] = useState(false);

  useEffect(() => {
    fetchNotaryInfo();
  }, []);

  useEffect(() => {
    if (notaryId) {
      fetchSubmissionDetail();
    }
  }, [id, notaryId]);

  const fetchNotaryInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: notary, error } = await supabase
        .from('notary')
        .select('id, timezone')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching notary info:', error);
        setLoading(false);
        return;
      }
      
      if (notary) {
        setNotaryId(notary.id);
        setNotaryTimezone(notary.timezone || 'UTC');
      } else {
        console.error('Notary not found for user');
        setLoading(false);
        navigate('/login');
      }
    } catch (error) {
      console.error('Error fetching notary info:', error);
      setLoading(false);
    }
  };

  const fetchSubmissionDetail = async () => {
    if (!notaryId) {
      console.error('Notary ID not available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // First, try to get the submission assigned to this notary
      let { data: submissionData, error: submissionError } = await supabase
        .from('submission')
        .select('*')
        .eq('id', id)
        .eq('assigned_notary_id', notaryId)
        .single();

      // If not found, check if submission exists but is not assigned
      if (submissionError && submissionError.code === 'PGRST116') {
        const { data: unassignedSubmission, error: unassignedError } = await supabase
          .from('submission')
          .select('*')
          .eq('id', id)
          .single();

        if (unassignedError) {
          throw new Error('Submission not found');
        }

        if (unassignedSubmission && !unassignedSubmission.assigned_notary_id) {
          // Submission exists but is not assigned - allow viewing for acceptance
          submissionData = unassignedSubmission;
          submissionError = null;
          setIsUnassigned(true);
        } else {
          throw new Error('This submission is assigned to another notary');
        }
      }

      if (submissionError) throw submissionError;
      
      if (!submissionData) {
        throw new Error('Submission not found');
      }

      setSubmission(submissionData);

      // Fetch documents
      const { data: docsData } = await supabase
        .from('submission_files')
        .select('*')
        .eq('submission_id', id);

      setDocuments(docsData || []);

      // Fetch services
      const { data: servicesData } = await supabase
        .from('services')
        .select('*');

      const sMap = {};
      if (servicesData) {
        servicesData.forEach(service => {
          sMap[service.service_id] = service;
        });
      }
      setServicesMap(sMap);

      // Fetch options
      const { data: optionsData } = await supabase
        .from('options')
        .select('*');

      const oMap = {};
      if (optionsData) {
        optionsData.forEach(option => {
          oMap[option.option_id] = option;
        });
      }
      setOptionsMap(oMap);
    } catch (error) {
      console.error('Error fetching submission detail:', error);
      const errorMessage = error.message || 'Error loading submission details';
      alert(errorMessage);
      setLoading(false);
      // Don't navigate immediately, let user see the error
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (publicUrl, fileName) => {
    try {
      const response = await fetch(publicUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        label: 'Pending'
      },
      confirmed: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        label: 'Confirmed'
      },
      completed: {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        label: 'Completed'
      },
      cancelled: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        label: 'Cancelled'
      }
    };

    const config = statusConfig[status] || {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      label: status?.replace('_', ' ') || 'Unknown'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const updateStatus = async (newStatus) => {
    try {
      // Check if trying to mark as completed before appointment date
      if (newStatus === 'completed') {
        const appointmentDate = new Date(submission.appointment_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
        appointmentDate.setHours(0, 0, 0, 0);
        
        if (appointmentDate > today) {
          alert('You cannot mark this submission as completed before the appointment date.');
          return;
        }
      }

      const { error } = await supabase
        .from('submission')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      setSubmission({ ...submission, status: newStatus });
      alert('Status updated successfully!');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleAcceptSubmission = async () => {
    try {
      // Check if submission is still available
      const { data: checkSubmission, error: checkError } = await supabase
        .from('submission')
        .select('assigned_notary_id')
        .eq('id', id)
        .single();

      if (checkError) throw checkError;

      if (checkSubmission.assigned_notary_id) {
        alert('This submission has already been accepted by another notary.');
        navigate('/dashboard');
        return;
      }

      // Assign to this notary
      const { error } = await supabase
        .from('submission')
        .update({ 
          assigned_notary_id: notaryId,
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      alert('Submission accepted successfully!');
      setIsUnassigned(false);
      setSubmission({ ...submission, assigned_notary_id: notaryId, status: 'confirmed' });
    } catch (error) {
      console.error('Error accepting submission:', error);
      alert(`Failed to accept submission: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-12">
        <Icon icon="heroicons:exclamation-circle" className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <p className="text-gray-900 text-lg font-semibold mb-2">Submission not found</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-glassy px-6 py-2 text-white font-semibold rounded-full"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const selectedServices = submission.data?.selectedServices || [];
  const serviceDocuments = submission.data?.serviceDocuments || {};

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-sm sm:text-base text-gray-600 hover:text-gray-900 mb-3 sm:mb-4"
        >
          <Icon icon="heroicons:arrow-left" className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          Back to Dashboard
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Submission Details</h1>
            <p className="text-xs sm:text-base text-gray-600">Submitted on {formatDate(submission.created_at)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {isUnassigned ? (
              <button
                onClick={handleAcceptSubmission}
                className="btn-glassy px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 flex items-center w-full sm:w-auto justify-center"
              >
                <Icon icon="heroicons:check" className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Accept Submission
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                {getStatusBadge(submission.status)}
                {submission.status !== 'completed' && (() => {
                  // Check if appointment date has passed
                  const appointmentDate = new Date(submission.appointment_date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  appointmentDate.setHours(0, 0, 0, 0);
                  const canComplete = appointmentDate <= today;
                  
                  return (
                    <button
                      onClick={() => updateStatus('completed')}
                      disabled={!canComplete}
                      className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 ${
                        canComplete
                          ? 'bg-purple-600 text-white hover:bg-purple-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      title={canComplete ? "Mark appointment as completed" : "Cannot mark as completed before appointment date"}
                    >
                      <Icon icon="heroicons:check-circle" className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline">Mark as Completed</span>
                      <span className="sm:hidden">Complete</span>
                    </button>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Tabs */}
          <div className="flex space-x-4 sm:space-x-6 border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-3 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap ${
                activeTab === 'details' ? 'text-black' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Details
              {activeTab === 'details' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`pb-3 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap ${
                activeTab === 'documents' ? 'text-black' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Services & Documents
              {activeTab === 'documents' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
              )}
            </button>
          </div>

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-4 sm:space-y-6">
              {/* Client Information (without email/phone) */}
              <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Client Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-semibold text-gray-900">{submission.first_name} {submission.last_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-semibold text-gray-900">{submission.address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">City</p>
                    <p className="font-semibold text-gray-900">{submission.city}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Postal Code</p>
                    <p className="font-semibold text-gray-900">{submission.postal_code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Country</p>
                    <p className="font-semibold text-gray-900">{submission.country}</p>
                  </div>
                </div>
              </div>

              {/* Appointment */}
              <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Appointment</h2>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                    <span className="text-sm sm:text-base text-gray-600">Date:</span>
                    <span className="text-sm sm:text-base font-semibold text-gray-900">{formatDate(submission.appointment_date)}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                    <span className="text-sm sm:text-base text-gray-600">Time:</span>
                    <span className="text-sm sm:text-base font-semibold text-gray-900">
                      {notaryTimezone && submission.timezone
                        ? convertTimeToNotaryTimezone(submission.appointment_time, submission.appointment_date, submission.timezone, notaryTimezone)
                        : submission.appointment_time}
                      {notaryTimezone && (
                        <span className="text-xs text-gray-500 ml-2">({notaryTimezone})</span>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                    <span className="text-sm sm:text-base text-gray-600">Client Timezone:</span>
                    <span className="text-sm sm:text-base font-semibold text-gray-900">{submission.timezone}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {submission.notes && (
                <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Notes</h2>
                  <p className="text-sm sm:text-base text-gray-700">{submission.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Services & Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-4 sm:space-y-6">
              {selectedServices.length > 0 && (
                <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                      <Icon icon="heroicons:check-badge" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                    </div>
                    <span className="text-base sm:text-xl">Services & Documents</span>
                  </h2>
                  <div className="space-y-3 sm:space-y-4">
                    {selectedServices.map((serviceId) => {
                      const service = servicesMap[serviceId];
                      const documents = serviceDocuments[serviceId] || [];

                      if (!service) return null;

                      return (
                        <div key={serviceId} className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200">
                          <div className="flex items-start justify-between mb-2 sm:mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base sm:text-lg text-gray-900">{service.name}</h3>
                              <p className="text-xs sm:text-sm text-gray-700 mt-1 sm:mt-2">
                                {documents.length} document{documents.length > 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>

                          {/* Documents for this service */}
                          {documents.length > 0 && (
                            <div className="mt-3 sm:mt-4 space-y-2 pl-3 sm:pl-4 border-l-2 border-gray-200">
                              {documents.map((doc, index) => {
                                const docOptions = doc.selectedOptions || [];

                                return (
                                  <div key={index} className="bg-gray-50 rounded-lg p-2 sm:p-3">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center flex-1 min-w-0">
                                        <Icon icon="heroicons:document-text" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 mr-2 flex-shrink-0" />
                                        <div className="min-w-0 flex-1">
                                          <p className="font-medium text-xs sm:text-sm text-gray-900 truncate">{doc.name}</p>
                                          <p className="text-[10px] sm:text-xs text-gray-500">{(doc.size / 1024).toFixed(2)} KB</p>
                                        </div>
                                      </div>
                                      {doc.public_url && (
                                        <button
                                          onClick={() => downloadDocument(doc.public_url, doc.name)}
                                          className="ml-2 text-black hover:text-gray-700 font-medium text-[10px] sm:text-xs flex items-center flex-shrink-0"
                                        >
                                          <Icon icon="heroicons:arrow-down-tray" className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                          <span className="hidden sm:inline">Download</span>
                                        </button>
                                      )}
                                    </div>

                                    {/* Options for this document */}
                                    {docOptions.length > 0 && (
                                      <div className="mt-2 pt-2 border-t border-gray-200">
                                        <p className="text-[10px] sm:text-xs text-gray-600 mb-1">Options:</p>
                                        <div className="flex flex-wrap gap-1">
                                          {docOptions.map((optionId) => {
                                            const option = optionsMap[optionId];
                                            if (!option) return null;

                                            return (
                                              <span
                                                key={optionId}
                                                className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-blue-100 text-blue-800"
                                              >
                                                <Icon icon={option.icon || "heroicons:plus-circle"} className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                                                <span className="truncate max-w-[100px] sm:max-w-none">{option.name}</span>
                                              </span>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Chat */}
        {!isUnassigned && (
          <div className="lg:col-span-1">
            <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Messages</h2>
              {notaryId && (
                <Chat
                  submissionId={id}
                  currentUserType="notary"
                  currentUserId={notaryId}
                  recipientName={`${submission.first_name} ${submission.last_name}`}
                  clientFirstName={submission.first_name}
                  clientLastName={submission.last_name}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmissionDetail;

