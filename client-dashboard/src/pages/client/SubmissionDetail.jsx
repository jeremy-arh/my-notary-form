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
  const [services, setServices] = useState([]);
  const [options, setOptions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);

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

      // Get submission services
      const { data: servicesData } = await supabase
        .from('submission_services')
        .select(`
          service:service_id(name, description, base_price)
        `)
        .eq('submission_id', id);

      setServices(servicesData?.map(s => s.service) || []);

      // Get submission options
      const { data: optionsData } = await supabase
        .from('submission_options')
        .select(`
          option:option_id(name, description, additional_price)
        `)
        .eq('submission_id', id);

      setOptions(optionsData?.map(o => o.option) || []);

      // Get documents
      const { data: documentsData } = await supabase
        .from('submission_files')
        .select('*')
        .eq('submission_id', id);

      setDocuments(documentsData || []);

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

  const downloadDocument = async (filePath, fileName) => {
    try {
      const { data, error } = await supabase.storage
        .from('submission-documents')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
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
      console.log('📋 Submission data:', submission.data);

      // Calculate total amount from submission data (same logic as NotaryForm)
      let amount = 75; // Base fee
      if (submission.data?.selectedOptions?.includes('urgent')) amount += 50;
      if (submission.data?.selectedOptions?.includes('home-visit')) amount += 100;
      if (submission.data?.selectedOptions?.includes('translation')) amount += 35;
      if (submission.data?.selectedOptions?.includes('consultation')) amount += 150;

      // Add document processing fee
      const documentsCount = submission.data?.uploadedFiles?.length || 0;
      if (documentsCount > 0) amount += documentsCount * 10;

      console.log('💰 Calculated amount: $' + amount + ' (cents: ' + (amount * 100) + ')');
      console.log('📦 Selected options:', submission.data?.selectedOptions);
      console.log('📄 Documents count:', documentsCount);

      // Create a new checkout session (same format as initial payment)
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          formData: submission.data,
          amount: amount * 100 // Convert to cents for Stripe
        }
      });

      console.log('✅ Edge Function response:', data);

      if (error) {
        console.error('❌ Edge Function error:', error);
        throw error;
      }

      if (data?.error) {
        console.error('❌ Edge Function returned error:', data.error);
        throw new Error(data.error);
      }

      if (data?.url) {
        console.log('🔗 Redirecting to Stripe Checkout:', data.url);
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received from payment service');
      }
    } catch (error) {
      console.error('❌ Error retrying payment:', error);

      // Show user-friendly error message
      let errorMessage = 'Failed to create payment session.';

      if (error.message) {
        errorMessage += `\n\nError: ${error.message}`;
      }

      errorMessage += '\n\nPlease try again or contact support.';

      alert(errorMessage);
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
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Appointment Info */}
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

            {/* Payment Info */}
            {(submission.data?.payment || submission.status === 'pending_payment') && (
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

            {/* Notary Info */}
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

            {/* Services */}
            {services.length > 0 && (
              <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                    <Icon icon="heroicons:check-badge" className="w-5 h-5 text-gray-600" />
                  </div>
                  Services
                </h2>
                <div className="space-y-3">
                  {services.map((service, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{service.name}</p>
                          <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                        </div>
                        <p className="font-bold text-gray-900 ml-4">${service.base_price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Options */}
            {options.length > 0 && (
              <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                    <Icon icon="heroicons:plus-circle" className="w-5 h-5 text-gray-600" />
                  </div>
                  Additional Options
                </h2>
                <div className="space-y-3">
                  {options.map((option, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{option.name}</p>
                          <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                        </div>
                        <p className="font-bold text-gray-900 ml-4">+${option.additional_price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            {documents.length > 0 && (
              <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                    <Icon icon="heroicons:document" className="w-5 h-5 text-gray-600" />
                  </div>
                  Your Documents
                </h2>
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="bg-white rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center">
                        <Icon icon="heroicons:document-text" className="w-5 h-5 text-gray-600 mr-3" />
                        <div>
                          <p className="font-semibold text-gray-900">{doc.file_name}</p>
                          <p className="text-sm text-gray-600">{(doc.file_size / 1024).toFixed(2)} KB</p>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadDocument(doc.storage_path, doc.file_name)}
                        className="text-black hover:text-gray-700 font-medium text-sm flex items-center"
                      >
                        <Icon icon="heroicons:arrow-down-tray" className="w-5 h-5 mr-1" />
                        Download
                      </button>
                    </div>
                  ))}
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
