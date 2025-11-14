import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import ClientLayout from '../../components/ClientLayout';
import Chat from '../../components/Chat';
import SignatoriesList from '../../components/SignatoriesList';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

const SubmissionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [submission, setSubmission] = useState(null);
  const [clientInfo, setClientInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [servicesMap, setServicesMap] = useState({});
  const [optionsMap, setOptionsMap] = useState({});
  const [notarizedFiles, setNotarizedFiles] = useState([]);
  const [fileComments, setFileComments] = useState({});
  const [signatories, setSignatories] = useState([]);
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);
  const [activeTab, setActiveTab] = useState('services');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'notarized') {
      setActiveTab('notarized');
    }
  }, [searchParams]);

  useEffect(() => {
    fetchSubmissionDetail();
  }, [id]);

  const fetchSubmissionDetail = async () => {
    try {
      // Get current user and client info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: client, error: clientError } = await supabase
        .from('client')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (clientError) throw clientError;
      setClientInfo(client);

      // Get submission detail
      const { data: submissionData, error: submissionError } = await supabase
        .from('submission')
        .select('*')
        .eq('id', id)
        .eq('client_id', client.id)
        .single();

      if (submissionError) throw submissionError;

      // Manually load notary data if assigned
      if (submissionData && submissionData.assigned_notary_id) {
        const { data: notaryData } = await supabase
          .from('notary')
          .select('id, name, email, phone')
          .eq('id', submissionData.assigned_notary_id)
          .single();

        submissionData.notary = notaryData;
      }

      setSubmission(submissionData);

      // Fetch all services to create a map
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

      // Fetch all options to create a map
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

      // Fetch notarized files
      const { data: notarizedFilesData, error: notarizedFilesError } = await supabase
        .from('notarized_files')
        .select('*')
        .eq('submission_id', id)
        .order('uploaded_at', { ascending: false });

      if (!notarizedFilesError && notarizedFilesData) {
        setNotarizedFiles(notarizedFilesData || []);
        
        // Fetch comments for each file
        const fileIds = (notarizedFilesData || []).map(f => f.id);
        if (fileIds.length > 0) {
          const { data: commentsData, error: commentsError } = await supabase
            .from('file_comments')
            .select('*')
            .in('file_id', fileIds)
            .order('created_at', { ascending: true });

          if (!commentsError && commentsData) {
            const commentsMap = {};
            commentsData.forEach(comment => {
              if (!commentsMap[comment.file_id]) {
                commentsMap[comment.file_id] = [];
              }
              commentsMap[comment.file_id].push(comment);
            });
            setFileComments(commentsMap);
          }
        }
      }

      // Fetch signatories
      const { data: signatoriesData, error: signatoriesError } = await supabase
        .from('signatories')
        .select('*')
        .eq('submission_id', id)
        .order('created_at', { ascending: true });

      if (!signatoriesError && signatoriesData) {
        setSignatories(signatoriesData || []);
      }

    } catch (error) {
      console.error('Error fetching submission detail:', error);
      toast.error('Error loading submission details');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };


  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      pending_payment: 'bg-orange-100 text-orange-800 border-orange-200',
      confirmed: 'bg-green-100 text-green-800 border-green-200',
      in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-purple-100 text-purple-800 border-purple-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      accepted: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200'
    };

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

    return (
      <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${styles[status] || styles.pending}`}>
        {labels[status] || status?.charAt(0).toUpperCase() + status?.slice(1).replace('_', ' ')}
      </span>
    );
  };

  const getPaymentStatusBadge = (paymentStatus) => {
    const styles = {
      paid: 'bg-green-100 text-green-800 border-green-200',
      unpaid: 'bg-red-100 text-red-800 border-red-200',
      no_payment_required: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    const labels = {
      paid: 'Paid',
      unpaid: 'Unpaid',
      no_payment_required: 'N/A'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[paymentStatus] || styles.unpaid}`}>
        {labels[paymentStatus] || 'Pending'}
      </span>
    );
  };

  const downloadDocument = async (publicUrl, fileName) => {
    try {
      // Download via public URL
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
      toast.error('Failed to download document');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const retryPayment = async () => {
    setIsRetryingPayment(true);
    try {
      console.log('🔄 Retrying payment for submission:', submission.id);

      const formData = {
        firstName: submission.first_name,
        lastName: submission.last_name,
        email: submission.email,
        phone: submission.phone,
        address: submission.address,
        city: submission.city,
        postalCode: submission.postal_code,
        country: submission.country,
        notes: submission.notes,
        appointmentDate: submission.appointment_date,
        appointmentTime: submission.appointment_time,
        timezone: submission.timezone,
        selectedServices: submission.data?.selectedServices || [],
        serviceDocuments: submission.data?.serviceDocuments || {},
      };

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          formData,
          submissionId: submission.id  // Pass existing submission ID for retry
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received from payment service');
      }
    } catch (error) {
      console.error('❌ Error retrying payment:', error);
      toast.error(`Failed to create payment session. ${error.message}. Please try again or contact support.`);
    } finally {
      setIsRetryingPayment(false);
    }
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </ClientLayout>
    );
  }

  if (!submission) {
    return (
      <ClientLayout>
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
      </ClientLayout>
    );
  }

  const selectedServices = submission.data?.selectedServices || [];
  const serviceDocuments = submission.data?.serviceDocuments || {};

  return (
    <ClientLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-0 overflow-x-hidden">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-sm sm:text-base text-gray-600 hover:text-gray-900 mb-3 sm:mb-4"
          >
            <Icon icon="heroicons:arrow-left" className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Back to Dashboard
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Request Details</h1>
              <p className="text-xs sm:text-base text-gray-600">Submitted on {formatDate(submission.created_at)}</p>
            </div>
            <div className="flex-shrink-0">
              {getStatusBadge(submission.status)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Left Column - Details with Tabs */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex space-x-4 sm:space-x-6 mb-4 sm:mb-6 border-b border-gray-200 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0" style={{ WebkitOverflowScrolling: 'touch' }}>
              <button
                onClick={() => setActiveTab('services')}
                className={`pb-3 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === 'services'
                    ? 'text-black'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Services & Documents
                {activeTab === 'services' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('signatories')}
                className={`pb-3 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === 'signatories'
                    ? 'text-black'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Signatories
                {activeTab === 'signatories' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('appointment')}
                className={`pb-3 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === 'appointment'
                    ? 'text-black'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Appointment Details
                {activeTab === 'appointment' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('payment')}
                className={`pb-3 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === 'payment'
                    ? 'text-black'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Payment Information
                {activeTab === 'payment' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('notarized')}
                className={`pb-3 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === 'notarized'
                    ? 'text-black'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Notarized Documents
                {notarizedFiles.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                    {notarizedFiles.length}
                  </span>
                )}
                {activeTab === 'notarized' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                )}
              </button>
            </div>

            <div className="space-y-4 sm:space-y-6">
              {/* Services & Documents Tab */}
              {activeTab === 'services' && selectedServices.length > 0 && (
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

                    const serviceTotal = documents.length * (service.base_price || 0);

                    return (
                      <div key={serviceId} className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200">
                        <div className="flex items-start justify-between mb-2 sm:mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base sm:text-lg text-gray-900">{service.name}</h3>
                            <p className="text-xs sm:text-sm text-gray-700 mt-1 sm:mt-2">
                              {documents.length} document{documents.length > 1 ? 's' : ''} × ${service.base_price.toFixed(2)} =
                              <span className="font-bold text-gray-900"> ${serviceTotal.toFixed(2)}</span>
                            </p>
                          </div>
                        </div>

                        {/* Documents for this service */}
                        {documents.length > 0 && (
                          <div className="mt-3 sm:mt-4 space-y-2 pl-3 sm:pl-4 border-l-2 border-gray-200">
                            {documents.map((doc, index) => {
                              const docOptions = doc.selectedOptions || [];
                              let optionsTotal = 0;
                              const docKey = `${serviceId}_${index}`;
                              
                              // Calculate signatories cost for this document
                              let signatoriesCost = 0;
                              let signatoriesCount = 0;
                              
                              // Try to get signatories from database first
                              if (signatories.length > 0) {
                                const docSignatories = signatories.filter(sig => sig.document_key === docKey);
                                signatoriesCount = docSignatories.length;
                                if (signatoriesCount > 1) {
                                  signatoriesCost = (signatoriesCount - 1) * 10; // $10 per additional signatory
                                }
                              } else {
                                // Use signatories from submission.data
                                const signatoriesFromData = submission?.data?.signatoriesByDocument || {};
                                const docSignatories = signatoriesFromData[docKey];
                                if (Array.isArray(docSignatories) && docSignatories.length > 1) {
                                  signatoriesCount = docSignatories.length;
                                  signatoriesCost = (docSignatories.length - 1) * 10; // $10 per additional signatory
                                }
                              }

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

                                          optionsTotal += option.additional_price || 0;

                                          return (
                                            <span
                                              key={optionId}
                                              className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-blue-100 text-blue-800"
                                            >
                                              <Icon icon={option.icon || "heroicons:plus-circle"} className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                                              <span className="truncate max-w-[80px] sm:max-w-none">{option.name}</span>
                                              <span className="hidden sm:inline ml-1">(+${option.additional_price.toFixed(2)})</span>
                                            </span>
                                          );
                                        })}
                                      </div>
                                      {optionsTotal > 0 && (
                                        <p className="text-[10px] sm:text-xs text-gray-700 mt-1 font-semibold">
                                          Options total: ${optionsTotal.toFixed(2)}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Signatories cost for this document */}
                                  {signatoriesCost > 0 && (
                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                      <div className="flex justify-between items-center">
                                        <span className="text-[10px] sm:text-xs text-gray-600 italic">
                                          Additional Signatories ({signatoriesCount - 1} signatory{signatoriesCount - 1 > 1 ? 'ies' : ''})
                                        </span>
                                        <span className="text-[10px] sm:text-xs font-semibold text-gray-900">
                                          ${signatoriesCost.toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Calculate total with options */}
                        {(() => {
                          let totalWithOptions = serviceTotal;
                          documents.forEach(doc => {
                            if (doc.selectedOptions) {
                              doc.selectedOptions.forEach(optionId => {
                                const option = optionsMap[optionId];
                                if (option) {
                                  totalWithOptions += option.additional_price || 0;
                                }
                              });
                            }
                          });

                          if (totalWithOptions > serviceTotal) {
                            return (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs sm:text-sm font-semibold text-gray-900">Total (with options):</span>
                                  <span className="text-base sm:text-lg font-bold text-gray-900">${totalWithOptions.toFixed(2)}</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    );
                  })}
                </div>

                {/* Total */}
                <div className="mt-4 pt-4 border-t-2 border-gray-300">
                  <div className="flex justify-between items-center">
                    <span className="text-base sm:text-lg font-bold text-gray-900">Total:</span>
                    <span className="text-xl sm:text-2xl font-bold text-gray-900">
                      ${(() => {
                        let grandTotal = 0;
                        
                        // Calculate services and options costs
                        selectedServices.forEach(serviceId => {
                          const service = servicesMap[serviceId];
                          const documents = serviceDocuments[serviceId] || [];
                          if (service) {
                            grandTotal += documents.length * (service.base_price || 0);
                            documents.forEach(doc => {
                              if (doc.selectedOptions) {
                                doc.selectedOptions.forEach(optionId => {
                                  const option = optionsMap[optionId];
                                  if (option) {
                                    grandTotal += option.additional_price || 0;
                                  }
                                });
                              }
                            });
                          }
                        });
                        
                        // Calculate additional signatories cost ($10 per additional signatory)
                        // First, try to get signatories from database (if payment completed)
                        if (signatories.length > 0) {
                          // Group signatories by document_key
                          const signatoriesByDoc = {};
                          signatories.forEach(sig => {
                            if (!signatoriesByDoc[sig.document_key]) {
                              signatoriesByDoc[sig.document_key] = [];
                            }
                            signatoriesByDoc[sig.document_key].push(sig);
                          });
                          
                          // Calculate cost for each document
                          Object.values(signatoriesByDoc).forEach(docSignatories => {
                            if (docSignatories.length > 1) {
                              // First signatory is included, count additional ones
                              grandTotal += (docSignatories.length - 1) * 10;
                            }
                          });
                        } else {
                          // Use signatories from submission.data (if not yet paid)
                          const signatoriesFromData = submission?.data?.signatoriesByDocument || {};
                          Object.values(signatoriesFromData).forEach(docSignatories => {
                            if (Array.isArray(docSignatories) && docSignatories.length > 1) {
                              // First signatory is included, count additional ones
                              grandTotal += (docSignatories.length - 1) * 10;
                            }
                          });
                        }
                        
                        return grandTotal.toFixed(2);
                      })()}
                    </span>
                  </div>
                </div>
              </div>
              )}

              {/* Signatories Tab */}
              {activeTab === 'signatories' && (() => {
                // Get signatories from database (if payment completed) or from submission.data (if not yet paid)
                const signatoriesFromData = submission?.data?.signatoriesByDocument || {};
                const hasSignatoriesInDB = signatories.length > 0;
                const hasSignatoriesInData = Object.keys(signatoriesFromData).length > 0 && 
                  Object.values(signatoriesFromData).some(sigs => sigs && sigs.length > 0);

                if (!hasSignatoriesInDB && !hasSignatoriesInData) {
                  return (
                    <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                          <Icon icon="heroicons:user-group" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                        </div>
                        <span className="text-base sm:text-xl">Signatories</span>
                      </h2>
                      <p className="text-sm sm:text-base text-gray-600">No signatories added for this submission.</p>
                    </div>
                  );
                }

                // Convert database signatories to the format expected by SignatoriesList
                const signatoriesByDoc = {};
                
                if (hasSignatoriesInDB) {
                  // Use database signatories (after payment)
                  signatories.forEach(sig => {
                    if (!signatoriesByDoc[sig.document_key]) {
                      signatoriesByDoc[sig.document_key] = [];
                    }
                    signatoriesByDoc[sig.document_key].push({
                      first_name: sig.first_name,
                      last_name: sig.last_name,
                      birth_date: sig.birth_date,
                      birth_city: sig.birth_city,
                      postal_address: sig.postal_address
                    });
                  });
                } else {
                  // Use signatories from submission.data (before payment)
                  Object.entries(signatoriesFromData).forEach(([docKey, sigs]) => {
                    if (sigs && sigs.length > 0) {
                      signatoriesByDoc[docKey] = sigs.map(sig => ({
                        first_name: sig.firstName || sig.first_name,
                        last_name: sig.lastName || sig.last_name,
                        birth_date: sig.birthDate || sig.birth_date,
                        birth_city: sig.birthCity || sig.birth_city,
                        postal_address: sig.postalAddress || sig.postal_address
                      }));
                    }
                  });
                }

                if (Object.keys(signatoriesByDoc).length === 0) {
                  return (
                    <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                          <Icon icon="heroicons:user-group" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                        </div>
                        <span className="text-base sm:text-xl">Signatories</span>
                      </h2>
                      <p className="text-sm sm:text-base text-gray-600">No signatories added for this submission.</p>
                    </div>
                  );
                }

                return (
                  <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                        <Icon icon="heroicons:user-group" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                      </div>
                      <span className="text-base sm:text-xl">Signatories</span>
                    </h2>
                    <div className="space-y-3 sm:space-y-4">
                      {Object.entries(signatoriesByDoc).map(([docKey, docSignatories]) => {
                        // Extract serviceId and docIndex from docKey (format: "serviceId_docIndex")
                        const [serviceId, docIndex] = docKey.split('_');
                        const documents = serviceDocuments[serviceId] || [];
                        const document = documents[parseInt(docIndex)] || {};
                        const documentName = document.name || `Document ${parseInt(docIndex) + 1}`;

                        return (
                          <SignatoriesList
                            key={docKey}
                            signatories={docSignatories}
                            documentKey={docKey}
                            documentName={documentName}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Appointment Details Tab */}
              {activeTab === 'appointment' && (
              <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                  <Icon icon="heroicons:calendar-days" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                </div>
                <span className="text-base sm:text-xl">Appointment Details</span>
              </h2>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                  <span className="text-sm sm:text-base text-gray-600">Date:</span>
                  <span className="text-sm sm:text-base font-semibold text-gray-900">{formatDate(submission.appointment_date)}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                  <span className="text-sm sm:text-base text-gray-600">Time:</span>
                  <span className="text-sm sm:text-base font-semibold text-gray-900">{submission.appointment_time}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                  <span className="text-sm sm:text-base text-gray-600">Timezone:</span>
                  <span className="text-sm sm:text-base font-semibold text-gray-900">{submission.timezone}</span>
                </div>
              </div>
              </div>
              )}

              {/* Payment Information Tab */}
              {activeTab === 'payment' && (submission.data?.payment || submission.status === 'pending_payment') && (
              <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                    <Icon icon="heroicons:credit-card" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  </div>
                  <span className="text-base sm:text-xl">Payment Information</span>
                </h2>
                <div className="space-y-2 sm:space-y-3">
                  {submission.data?.payment && (
                    <>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                        <span className="text-sm sm:text-base text-gray-600">Status:</span>
                        <div className="flex-shrink-0">
                          {getPaymentStatusBadge(submission.data.payment.payment_status)}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                        <span className="text-sm sm:text-base text-gray-600">Amount:</span>
                        <span className="text-sm sm:text-base font-semibold text-gray-900">
                          ${((submission.data.payment.amount_paid || 0) / 100).toFixed(2)} {(submission.data.payment.currency || 'usd').toUpperCase()}
                        </span>
                      </div>
                      {submission.data.payment.paid_at && (
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                          <span className="text-sm sm:text-base text-gray-600">Paid on:</span>
                          <span className="text-sm sm:text-base font-semibold text-gray-900">
                            {formatDate(submission.data.payment.paid_at)}
                          </span>
                        </div>
                      )}
                      {submission.data.payment.invoice_url && (
                        <div className="pt-3 border-t border-gray-200">
                          <a
                            href={submission.data.payment.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center bg-white text-black hover:bg-gray-100 font-medium text-xs sm:text-sm py-2 sm:py-3 px-3 sm:px-4 rounded-lg transition-colors"
                          >
                            <Icon icon="heroicons:arrow-down-tray" className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                            Download Invoice
                          </a>
                        </div>
                      )}
                    </>
                  )}
                  {submission.status === 'pending_payment' && (
                    <div className={submission.data?.payment?.invoice_url ? "mt-3" : (submission.data?.payment ? "pt-3 border-t border-gray-200" : "")}>
                      <button
                        onClick={retryPayment}
                        disabled={isRetryingPayment}
                        className="w-full flex items-center justify-center bg-black text-white hover:bg-gray-800 font-medium text-xs sm:text-sm py-2 sm:py-3 px-3 sm:px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isRetryingPayment ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                          </>
                        ) : (
                          <>
                            <Icon icon="heroicons:arrow-path" className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                            Retry Payment
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* Notarized Files Tab */}
              {activeTab === 'notarized' && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Notarized Documents</h2>
                    
                    {/* Files List */}
                    {notarizedFiles.length === 0 ? (
                      <p className="text-sm sm:text-base text-gray-600">No notarized documents have been uploaded yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {notarizedFiles.map((file) => (
                          <div key={file.id} className="bg-white rounded-xl p-4 border border-gray-200">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-start flex-1 min-w-0">
                                <Icon icon="heroicons:document-text" className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 mr-3 flex-shrink-0 mt-1" />
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-base sm:text-lg text-gray-900 mb-1">{file.file_name}</h3>
                                  <p className="text-xs sm:text-sm text-gray-500">
                                    {formatFileSize(file.file_size)} • Uploaded on {formatDate(file.uploaded_at)}
                                  </p>
                                </div>
                              </div>
                              <a
                                href={file.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-4 px-3 py-2 text-xs sm:text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center flex-shrink-0"
                              >
                                <Icon icon="heroicons:arrow-down-tray" className="w-4 h-4 mr-2" />
                                Download
                              </a>
                            </div>

                            {/* Comments Section - Read-only for clients */}
                            {fileComments[file.id] && fileComments[file.id].length > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Comments</h4>
                                
                                {/* Existing Comments */}
                                <div className="space-y-3">
                                  {fileComments[file.id].map((comment) => (
                                    <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                                      <div className="flex items-start justify-between mb-1">
                                        <span className="text-xs font-semibold text-gray-900 capitalize">
                                          {comment.commenter_type}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {formatDate(comment.created_at)}
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-700">{comment.comment}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notary Info - Always visible */}
            {submission.notary && (
              <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                    <Icon icon="heroicons:user" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  </div>
                  <span className="text-base sm:text-xl">Assigned Notary</span>
                </h2>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                    <span className="text-sm sm:text-base text-gray-600">Name:</span>
                    <span className="text-sm sm:text-base font-semibold text-gray-900">{submission.notary.name}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                    <span className="text-sm sm:text-base text-gray-600">Email:</span>
                    <span className="text-sm sm:text-base font-semibold text-gray-900 break-all">{submission.notary.email}</span>
                  </div>
                  {submission.notary.phone && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                      <span className="text-sm sm:text-base text-gray-600">Phone:</span>
                      <span className="text-sm sm:text-base font-semibold text-gray-900">{submission.notary.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {submission.notes && (
              <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                    <Icon icon="heroicons:document-text" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  </div>
                  <span className="text-base sm:text-xl">Additional Notes</span>
                </h2>
                <p className="text-sm sm:text-base text-gray-700 whitespace-pre-wrap">{submission.notes}</p>
              </div>
            )}
            </div>
          </div>

          {/* Right Column - Chat */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 sm:top-8">
              {/* Chat is available if there's a notary OR if there are messages from admin */}
              <Chat
                submissionId={submission.id}
                currentUserType="client"
                currentUserId={clientInfo?.id}
                recipientName={submission.notary?.name || 'Support'}
              />
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
};

export default SubmissionDetail;
