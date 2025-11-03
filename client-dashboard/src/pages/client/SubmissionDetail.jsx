import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import ClientLayout from '../../components/ClientLayout';
import Chat from '../../components/Chat';
import { supabase } from '../../lib/supabase';

const SubmissionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [clientInfo, setClientInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [servicesMap, setServicesMap] = useState({});
  const [optionsMap, setOptionsMap] = useState({});
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);
  const [activeTab, setActiveTab] = useState('services');

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

    } catch (error) {
      console.error('Error fetching submission detail:', error);
      alert('Error loading submission details');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      pending_payment: 'bg-orange-100 text-orange-800 border-orange-200',
      accepted: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      completed: 'bg-blue-100 text-blue-800 border-blue-200'
    };

    return (
      <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${styles[status] || styles.pending}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1).replace('_', ' ')}
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
      alert('Failed to download document');
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
      alert(`Failed to create payment session.\n\nError: ${error.message}\n\nPlease try again or contact support.`);
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <Icon icon="heroicons:arrow-left" className="w-5 h-5 mr-2" />
            Back to Dashboard
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Request Details</h1>
              <p className="text-gray-600">Submitted on {formatDate(submission.created_at)}</p>
            </div>
            {getStatusBadge(submission.status)}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Details with Tabs */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex space-x-6 mb-6 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('services')}
                className={`pb-3 text-sm font-medium transition-colors relative ${
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
                onClick={() => setActiveTab('appointment')}
                className={`pb-3 text-sm font-medium transition-colors relative ${
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
                className={`pb-3 text-sm font-medium transition-colors relative ${
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
            </div>

            <div className="space-y-6">
              {/* Services & Documents Tab */}
              {activeTab === 'services' && selectedServices.length > 0 && (
              <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                    <Icon icon="heroicons:check-badge" className="w-5 h-5 text-gray-600" />
                  </div>
                  Services & Documents
                </h2>
                <div className="space-y-4">
                  {selectedServices.map((serviceId) => {
                    const service = servicesMap[serviceId];
                    const documents = serviceDocuments[serviceId] || [];

                    if (!service) return null;

                    const serviceTotal = documents.length * (service.base_price || 0);

                    return (
                      <div key={serviceId} className="bg-white rounded-xl p-4 border border-gray-200">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-lg">{service.name}</h3>
                            <p className="text-sm text-gray-700 mt-2">
                              {documents.length} document{documents.length > 1 ? 's' : ''} × ${service.base_price.toFixed(2)} =
                              <span className="font-bold text-gray-900"> ${serviceTotal.toFixed(2)}</span>
                            </p>
                          </div>
                        </div>

                        {/* Documents for this service */}
                        {documents.length > 0 && (
                          <div className="mt-4 space-y-2 pl-4 border-l-2 border-gray-200">
                            {documents.map((doc, index) => {
                              const docOptions = doc.selectedOptions || [];
                              let optionsTotal = 0;

                              return (
                                <div key={index} className="bg-gray-50 rounded-lg p-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center flex-1">
                                      <Icon icon="heroicons:document-text" className="w-5 h-5 text-gray-600 mr-2 flex-shrink-0" />
                                      <div className="min-w-0 flex-1">
                                        <p className="font-medium text-gray-900 text-sm truncate">{doc.name}</p>
                                        <p className="text-xs text-gray-500">{(doc.size / 1024).toFixed(2)} KB</p>
                                      </div>
                                    </div>
                                    {doc.public_url && (
                                      <button
                                        onClick={() => downloadDocument(doc.public_url, doc.name)}
                                        className="ml-3 text-black hover:text-gray-700 font-medium text-xs flex items-center flex-shrink-0"
                                      >
                                        <Icon icon="heroicons:arrow-down-tray" className="w-4 h-4 mr-1" />
                                        Download
                                      </button>
                                    )}
                                  </div>

                                  {/* Options for this document */}
                                  {docOptions.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                      <p className="text-xs text-gray-600 mb-1">Options:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {docOptions.map((optionId) => {
                                          const option = optionsMap[optionId];
                                          if (!option) return null;

                                          optionsTotal += option.additional_price || 0;

                                          return (
                                            <span
                                              key={optionId}
                                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                            >
                                              <Icon icon={option.icon || "heroicons:plus-circle"} className="w-3 h-3 mr-1" />
                                              {option.name} (+${option.additional_price.toFixed(2)})
                                            </span>
                                          );
                                        })}
                                      </div>
                                      {optionsTotal > 0 && (
                                        <p className="text-xs text-gray-700 mt-1 font-semibold">
                                          Options total: ${optionsTotal.toFixed(2)}
                                        </p>
                                      )}
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
                                  <span className="text-sm font-semibold text-gray-900">Total (with options):</span>
                                  <span className="text-lg font-bold text-gray-900">${totalWithOptions.toFixed(2)}</span>
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
                    <span className="text-lg font-bold text-gray-900">Total:</span>
                    <span className="text-2xl font-bold text-gray-900">
                      ${(() => {
                        let grandTotal = 0;
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
                        return grandTotal.toFixed(2);
                      })()}
                    </span>
                  </div>
                </div>
              </div>
              )}

              {/* Appointment Details Tab */}
              {activeTab === 'appointment' && (
              <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                  <Icon icon="heroicons:calendar-days" className="w-5 h-5 text-gray-600" />
                </div>
                Appointment Details
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-semibold text-gray-900">{formatDate(submission.appointment_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-semibold text-gray-900">{submission.appointment_time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Timezone:</span>
                  <span className="font-semibold text-gray-900">{submission.timezone}</span>
                </div>
              </div>
              </div>
              )}

              {/* Payment Information Tab */}
              {activeTab === 'payment' && (submission.data?.payment || submission.status === 'pending_payment') && (
              <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                    <Icon icon="heroicons:credit-card" className="w-5 h-5 text-gray-600" />
                  </div>
                  Payment Information
                </h2>
                <div className="space-y-3">
                  {submission.data?.payment && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Status:</span>
                        {getPaymentStatusBadge(submission.data.payment.payment_status)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-semibold text-gray-900">
                          ${((submission.data.payment.amount_paid || 0) / 100).toFixed(2)} {(submission.data.payment.currency || 'usd').toUpperCase()}
                        </span>
                      </div>
                      {submission.data.payment.paid_at && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Paid on:</span>
                          <span className="font-semibold text-gray-900">
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
                            className="w-full flex items-center justify-center bg-white text-black hover:bg-gray-100 font-medium text-sm py-3 px-4 rounded-lg transition-colors"
                          >
                            <Icon icon="heroicons:arrow-down-tray" className="w-5 h-5 mr-2" />
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
                        className="w-full flex items-center justify-center bg-black text-white hover:bg-gray-800 font-medium text-sm py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isRetryingPayment ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                          </>
                        ) : (
                          <>
                            <Icon icon="heroicons:arrow-path" className="w-5 h-5 mr-2" />
                            Retry Payment
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* Notary Info - Always visible */}
            {submission.notary && (
              <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                    <Icon icon="heroicons:user" className="w-5 h-5 text-gray-600" />
                  </div>
                  Assigned Notary
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-semibold text-gray-900">{submission.notary.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-semibold text-gray-900">{submission.notary.email}</span>
                  </div>
                  {submission.notary.phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-semibold text-gray-900">{submission.notary.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {submission.notes && (
              <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                    <Icon icon="heroicons:document-text" className="w-5 h-5 text-gray-600" />
                  </div>
                  Additional Notes
                </h2>
                <p className="text-gray-700 whitespace-pre-wrap">{submission.notes}</p>
              </div>
            )}
            </div>
          </div>

          {/* Right Column - Chat */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              {submission.notary ? (
                <Chat
                  submissionId={submission.id}
                  currentUserType="client"
                  currentUserId={clientInfo?.id}
                  recipientName={submission.notary.name}
                />
              ) : (
                <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200 text-center">
                  <Icon icon="heroicons:chat-bubble-left-right" className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 text-sm">Messaging will be available once a notary is assigned to your request.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
};

export default SubmissionDetail;
