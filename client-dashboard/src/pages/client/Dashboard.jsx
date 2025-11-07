import { useEffect, useState, useMemo, useCallback } from 'react';
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

  const fetchClientData = useCallback(async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Get client info - only select needed fields
      const { data: client, error: clientError } = await supabase
        .from('client')
        .select('id, first_name, last_name, email, user_id')
        .eq('user_id', user.id)
        .single();

      if (clientError) throw clientError;
      setClientInfo(client);

      // Get submissions with notary data in a single query using join
      // Select only necessary columns
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submission')
        .select(`
          id,
          created_at,
          appointment_date,
          appointment_time,
          status,
          assigned_notary_id,
          data,
          notary:assigned_notary_id (
            id,
            name,
            email
          )
        `)
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      // Transform data to match expected format
      const submissionsWithNotaries = (submissionsData || []).map(submission => ({
        ...submission,
        notary: submission.notary || null
      }));

      setSubmissions(submissionsWithNotaries);

      // Calculate stats - use useMemo for performance
      const total = submissionsWithNotaries.length;
      const pending = submissionsWithNotaries.filter(s => s.status === 'pending').length;
      const accepted = submissionsWithNotaries.filter(s => s.status === 'accepted').length;

      setStats({ total, pending, accepted });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching data:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  const getStatusBadge = useCallback((status) => {
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
      <span className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold border ${styles[status] || styles.pending} whitespace-nowrap`}>
        {labels[status] || status?.charAt(0).toUpperCase() + status?.slice(1).replace('_', ' ')}
      </span>
    );
  }, []);

  const getPaymentStatusBadge = useCallback((paymentStatus) => {
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
      <span className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold border ${styles[paymentStatus] || styles.unpaid} whitespace-nowrap`}>
        {labels[paymentStatus] || 'Pending'}
      </span>
    );
  }, []);

  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }, []);

  const deleteSubmission = useCallback(async (submissionId) => {
    if (!confirm('Are you sure you want to delete this submission? This action cannot be undone.')) {
      return;
    }

    try {
      // Direct deletion using RLS policy
      const { error } = await supabase
        .from('submission')
        .delete()
        .eq('id', submissionId)
        .eq('status', 'pending_payment');

      if (error) throw error;

      // Optimistic update - update state immediately
      setSubmissions(prev => {
        const updated = prev.filter(s => s.id !== submissionId);
        
        // Update stats
        const total = updated.length;
        const pending = updated.filter(s => s.status === 'pending').length;
        const accepted = updated.filter(s => s.status === 'accepted').length;
        setStats({ total, pending, accepted });

        // Reset to page 1 if current page becomes empty after deletion
        const maxPage = Math.ceil(updated.length / ITEMS_PER_PAGE);
        if (currentPage > maxPage) {
          setCurrentPage(Math.max(1, maxPage));
        }

        return updated;
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error deleting submission:', error);
      }
      alert(`Failed to delete submission.\n\nError: ${error.message}\n\nPlease try again or contact support.`);
      // Refresh on error to ensure consistency
      fetchClientData();
    }
  }, [currentPage, fetchClientData]);

  const retryPayment = useCallback(async (submission) => {
    setRetryingPaymentId(submission.id);
    try {
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
          submissionId: submission.id
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
      if (process.env.NODE_ENV === 'development') {
        console.error('Error retrying payment:', error);
      }
      alert(`Failed to create payment session.\n\nError: ${error.message}\n\nPlease try again or contact support.`);
    } finally {
      setRetryingPaymentId(null);
    }
  }, []);

  // Pagination calculations - memoized for performance
  // MUST be before any conditional returns to follow Rules of Hooks
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(submissions.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentSubmissions = submissions.slice(startIndex, endIndex);
    return { totalPages, startIndex, endIndex, currentSubmissions };
  }, [submissions, currentPage]);

  const goToPage = useCallback((page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (loading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-hidden">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {clientInfo?.first_name}!
          </h1>
          <p className="text-sm sm:text-base text-gray-600">Manage your notary service requests</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200 w-full">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon icon="heroicons:document-text" className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-600">Total Requests</p>
          </div>

          <div className="bg-yellow-50 rounded-2xl p-4 sm:p-6 border border-yellow-200 w-full">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon icon="heroicons:clock" className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            <p className="text-sm text-gray-600">Pending</p>
          </div>

          <div className="bg-green-50 rounded-2xl p-4 sm:p-6 border border-green-200 w-full sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon icon="heroicons:check-circle" className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.accepted}</p>
            <p className="text-sm text-gray-600">Accepted</p>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200 w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Your Requests</h2>
            <a
              href="/form"
              className="btn-glassy px-6 py-2 text-white text-sm font-semibold rounded-full transition-all hover:scale-105 text-center whitespace-nowrap"
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
            <>
            <div className="overflow-x-auto w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full" style={{ minWidth: '800px' }}>
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">Date</th>
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">Appointment</th>
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">Notary</th>
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">Status</th>
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">Payment</th>
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginationData.currentSubmissions.map((submission) => (
                    <tr 
                      key={submission.id} 
                      onClick={() => navigate(`/submission/${submission.id}`)}
                      className="border-b border-gray-200 hover:bg-white transition-colors cursor-pointer"
                    >
                      <td className="py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                        {formatDate(submission.created_at)}
                      </td>
                      <td className="py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                        <div>
                          <div>{formatDate(submission.appointment_date)}</div>
                          <div className="text-gray-500 text-[10px] sm:text-xs">{submission.appointment_time}</div>
                        </div>
                      </td>
                      <td className="py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                        <div className="max-w-[120px] truncate">{submission.notary?.name || 'Not assigned'}</div>
                      </td>
                      <td className="py-3 sm:py-4 px-2 sm:px-4">
                        <div className="flex items-center">
                          {getStatusBadge(submission.status)}
                        </div>
                      </td>
                      <td className="py-3 sm:py-4 px-2 sm:px-4">
                        <div className="flex items-center">
                          {getPaymentStatusBadge(submission.data?.payment?.payment_status)}
                        </div>
                      </td>
                      <td className="py-3 sm:py-4 px-2 sm:px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {submission.status === 'pending_payment' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  retryPayment(submission);
                                }}
                                disabled={retryingPaymentId === submission.id}
                                className="text-orange-600 hover:text-orange-700 font-medium text-xs flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Retry Payment"
                              >
                                {retryingPaymentId === submission.id ? (
                                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <Icon icon="heroicons:arrow-path" className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSubmission(submission.id);
                                }}
                                className="text-red-600 hover:text-red-700 font-medium text-xs flex items-center"
                                title="Delete"
                              >
                                <Icon icon="heroicons:trash" className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/submission/${submission.id}`);
                            }}
                            className="text-black hover:text-gray-700 font-medium text-xs flex items-center"
                            title="View Details"
                          >
                            <Icon icon="heroicons:eye" className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

              {/* Pagination Controls */}
              {paginationData.totalPages > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
                    Showing {paginationData.startIndex + 1} to {Math.min(paginationData.endIndex, submissions.length)} of {submissions.length} requests
                  </div>
                  <div className="flex items-center gap-2 order-1 sm:order-2">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 sm:px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium text-xs sm:text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Icon icon="heroicons:chevron-left" className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: paginationData.totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          if (paginationData.totalPages <= 5) return true;
                          return page === 1 || page === paginationData.totalPages || Math.abs(page - currentPage) <= 1;
                        })
                        .map((page, index, array) => {
                          const showEllipsisBefore = index > 0 && page - array[index - 1] > 1;
                          return (
                            <div key={page} className="flex items-center gap-1">
                              {showEllipsisBefore && (
                                <span className="px-2 text-gray-400">...</span>
                              )}
                              <button
                                onClick={() => goToPage(page)}
                                className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors ${
                                  currentPage === page
                                    ? 'bg-black text-white'
                                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            </div>
                          );
                        })}
                    </div>

                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === paginationData.totalPages}
                      className="px-3 sm:px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium text-xs sm:text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Icon icon="heroicons:chevron-right" className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ClientLayout>
  );
};

export default Dashboard;
