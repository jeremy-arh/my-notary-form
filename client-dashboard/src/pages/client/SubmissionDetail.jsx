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
        .select(`
          *,
          notary!assigned_notary_id(id, name, email, phone)
        `)
        .eq('id', id)
        .eq('client_id', client.id)
        .single();

      if (submissionError) throw submissionError;
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
      accepted: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      completed: 'bg-blue-100 text-blue-800 border-blue-200'
    };

    return (
      <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${styles[status] || styles.pending}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
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
