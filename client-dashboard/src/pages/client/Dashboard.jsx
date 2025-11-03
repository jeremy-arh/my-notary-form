import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import ClientLayout from '../../components/ClientLayout';
import { supabase } from '../../lib/supabase';

const Dashboard = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState(null);
  const [retryingPaymentId, setRetryingPaymentId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0
  });

  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    fetchClientData();
  }, []);

  const fetchClientData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Get client info
      const { data: client, error: clientError } = await supabase
        .from('client')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (clientError) throw clientError;
      setClientInfo(client);

      // Get submissions
      console.log('🔍 [NOTARY] Fetching submissions for client:', client.id);
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submission')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      console.log('📋 [NOTARY] Submissions data:', submissionsData);
      console.log('❌ [NOTARY] Submissions error:', submissionsError);

      if (submissionsError) throw submissionsError;

      // Manually load notary data for each submission
      if (submissionsData && submissionsData.length > 0) {
        const submissionsWithNotaries = await Promise.all(
          submissionsData.map(async (submission) => {
            if (submission.assigned_notary_id) {
              console.log(`🔍 [NOTARY] Loading notary for submission ${submission.id}, notary_id:`, submission.assigned_notary_id);
              const { data: notaryData, error: notaryError } = await supabase
                .from('notary')
                .select('id, name, email')
                .eq('id', submission.assigned_notary_id)
                .single();

              console.log(`📋 [NOTARY] Notary data for ${submission.assigned_notary_id}:`, notaryData);
              console.log(`❌ [NOTARY] Notary error:`, notaryError);

              return {
                ...submission,
                notary: notaryData
              };
            }
            return submission;
          })
        );

        console.log('✅ [NOTARY] Final submissions with notaries:', submissionsWithNotaries);
        setSubmissions(submissionsWithNotaries);
      } else {
        setSubmissions([]);
      }

      // Calculate stats
      const total = submissionsData?.length || 0;
      const pending = submissionsData?.filter(s => s.status === 'pending').length || 0;
      const accepted = submissionsData?.filter(s => s.status === 'accepted').length || 0;

      setStats({ total, pending, accepted });
    } catch (error) {
      console.error('Error fetching data:', error);
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
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles.pending}`}>
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const deleteSubmission = async (submissionId) => {
    if (!confirm('Are you sure you want to delete this submission? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('🗑️ Deleting submission:', submissionId);

      // Direct deletion using RLS policy
      const { error } = await supabase
        .from('submission')
        .delete()
        .eq('id', submissionId)
        .eq('status', 'pending_payment');

      if (error) {
        console.error('❌ Delete error:', error);
        throw error;
      }

      console.log('✅ Submission deleted successfully');

      // Reset to page 1 if current page becomes empty after deletion
      const remainingItems = submissions.length - 1;
      const maxPage = Math.ceil(remainingItems / ITEMS_PER_PAGE);
      if (currentPage > maxPage) {
        setCurrentPage(Math.max(1, maxPage));
      }

      // Refresh the submissions list
      fetchClientData();
    } catch (error) {
      console.error('❌ Error deleting submission:', error);
      alert(`Failed to delete submission.\n\nError: ${error.message}\n\nPlease try again or contact support.`);
    }
  };

  const retryPayment = async (submission) => {
    setRetryingPaymentId(submission.id);
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
      setRetryingPaymentId(null);
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

  // Pagination calculations
  const totalPages = Math.ceil(submissions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentSubmissions = submissions.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <ClientLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {clientInfo?.first_name}!
          </h1>
          <p className="text-gray-600">Manage your notary service requests</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                <Icon icon="heroicons:document-text" className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-600">Total Requests</p>
          </div>

          <div className="bg-yellow-50 rounded-2xl p-6 border border-yellow-200">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                <Icon icon="heroicons:clock" className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            <p className="text-sm text-gray-600">Pending</p>
          </div>

          <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <Icon icon="heroicons:check-circle" className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.accepted}</p>
            <p className="text-sm text-gray-600">Accepted</p>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Your Requests</h2>
            <a
              href="/form"
              className="btn-glassy px-6 py-2 text-white text-sm font-semibold rounded-full transition-all hover:scale-105"
            >
              <Icon icon="heroicons:plus" className="w-4 h-4 inline mr-1" />
              New Request
            </a>
          </div>

          {submissions.length === 0 ? (
            <div className="text-center py-12">
              <Icon icon="heroicons:document-text" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No requests yet</p>
              <a
                href="/form"
                className="inline-block btn-glassy px-6 py-2 text-white text-sm font-semibold rounded-full transition-all hover:scale-105"
              >
                Submit Your First Request
              </a>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Appointment</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Notary</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Payment</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentSubmissions.map((submission) => (
                    <tr key={submission.id} className="border-b border-gray-200 hover:bg-white transition-colors">
                      <td className="py-4 px-4 text-sm text-gray-900">
                        {formatDate(submission.created_at)}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-900">
                        {formatDate(submission.appointment_date)} at {submission.appointment_time}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        {submission.notary?.name || 'Not assigned yet'}
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(submission.status)}
                      </td>
                      <td className="py-4 px-4">
                        {getPaymentStatusBadge(submission.data?.payment?.payment_status)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {submission.status === 'pending_payment' && (
                            <button
                              onClick={() => retryPayment(submission)}
                              disabled={retryingPaymentId === submission.id}
                              className="text-orange-600 hover:text-orange-700 font-medium text-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {retryingPaymentId === submission.id ? (
                                <>
                                  <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <Icon icon="heroicons:arrow-path" className="w-4 h-4 mr-1" />
                                  Retry Payment
                                </>
                              )}
                            </button>
                          )}
                          {submission.status === 'pending_payment' && (
                            <button
                              onClick={() => deleteSubmission(submission.id)}
                              className="text-red-600 hover:text-red-700 font-medium text-sm flex items-center"
                            >
                              <Icon icon="heroicons:trash" className="w-4 h-4 mr-1" />
                              Delete
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/submission/${submission.id}`)}
                            className="text-black hover:text-gray-700 font-medium text-sm flex items-center"
                          >
                            View Details
                            <Icon icon="heroicons:arrow-right" className="w-4 h-4 ml-1" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(endIndex, submissions.length)} of {submissions.length} requests
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Icon icon="heroicons:chevron-left" className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                            currentPage === page
                              ? 'bg-black text-white'
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Icon icon="heroicons:chevron-right" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  );
};

export default Dashboard;
