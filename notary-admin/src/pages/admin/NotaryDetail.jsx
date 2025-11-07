import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';

const NotaryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [notary, setNotary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPayouts, setTotalPayouts] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [isPayoutDetailModalOpen, setIsPayoutDetailModalOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [payoutFormData, setPayoutFormData] = useState({
    payment_amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    submission_id: '',
    description: ''
  });
  const [availableSubmissions, setAvailableSubmissions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (id) {
      fetchNotaryDetail();
      fetchSubmissions();
      fetchPayouts();
    }
  }, [id]);

  const fetchNotaryDetail = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notary')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Notary not found');

      // Fetch competent services
      const { data: notaryServices } = await supabase
        .from('notary_services')
        .select(`
          service_id,
          services:service_id (
            id,
            name,
            service_id
          )
        `)
        .eq('notary_id', id);

      const competentServices = [];
      if (notaryServices) {
        notaryServices.forEach(ns => {
          if (ns.services) {
            // Handle both single service object and array
            const service = Array.isArray(ns.services) ? ns.services[0] : ns.services;
            if (service && service.name) {
              competentServices.push(service.name);
            }
          }
        });
      }

      let notaryData = {
        ...data,
        competent_services: competentServices
      };

      setNotary(notaryData);

      // Fetch user data if user_id exists
      if (data.user_id) {
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(data.user_id);
          if (userData?.user) {
            setNotary({
              ...notaryData,
              account_created_at: userData.user.created_at,
              last_sign_in_at: userData.user.last_sign_in_at
            });
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
        }
      }
    } catch (error) {
      console.error('Error fetching notary detail:', error);
      alert('Error loading notary details');
      navigate('/notary');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('submission')
        .select('*')
        .eq('assigned_notary_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSubmissions(data || []);

      // Calculate total revenue
      const revenue = (data || []).reduce((sum, sub) => {
        return sum + (parseFloat(sub.total_price) || 0);
      }, 0);
      setTotalRevenue(revenue);

      // Set available submissions for payout form
      setAvailableSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  const fetchPayouts = async () => {
    try {
      const { data, error } = await supabase
        .from('notary_payments')
        .select('*')
        .eq('notary_id', id)
        .order('payment_date', { ascending: false });

      if (error) throw error;

      setPayouts(data || []);

      // Calculate total payouts
      const total = (data || []).reduce((sum, payout) => {
        return sum + (parseFloat(payout.payment_amount) || 0);
      }, 0);
      setTotalPayouts(total);
    } catch (error) {
      console.error('Error fetching payouts:', error);
    }
  };

  const handleCreatePayout = async () => {
    try {
      if (!payoutFormData.payment_amount || !payoutFormData.payment_date) {
        alert('Please fill in all required fields');
        return;
      }

      const { error } = await supabase
        .from('notary_payments')
        .insert({
          notary_id: id,
          notary_name: notary.full_name || notary.name,
          payment_amount: parseFloat(payoutFormData.payment_amount),
          payment_date: payoutFormData.payment_date,
          submission_id: payoutFormData.submission_id || null,
          description: payoutFormData.description || null,
          payment_status: 'created'
        });

      if (error) throw error;

      // Create notification for notary
      if (notary.user_id) {
        try {
          await supabase.rpc('create_notification', {
            p_user_id: id,
            p_user_type: 'notary',
            p_title: 'New Payout',
            p_message: `A payout of $${parseFloat(payoutFormData.payment_amount).toFixed(2)} has been created for you.`,
            p_type: 'success',
            p_action_type: 'payout_created',
            p_action_data: {
              payout_amount: payoutFormData.payment_amount,
              payment_date: payoutFormData.payment_date
            }
          });
        } catch (notifError) {
          console.error('Error creating notification:', notifError);
        }
      }

      setIsPayoutModalOpen(false);
      setPayoutFormData({
        payment_amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        submission_id: '',
        description: ''
      });
      await fetchPayouts();
      alert('Payout created successfully!');
    } catch (error) {
      console.error('Error creating payout:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      pending_payment: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Pending Payment' },
      confirmed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Confirmed' },
      completed: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Completed' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' }
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

  const getPaymentStatusBadge = (status) => {
    // Normalize old status values to new ones
    let normalizedStatus = status;
    if (status === 'pending' || status === 'processing') {
      normalizedStatus = 'created';
    } else if (status === 'completed') {
      normalizedStatus = 'paid';
    } else if (status === 'cancelled' || status === 'failed') {
      normalizedStatus = 'canceled';
    }

    const statusConfig = {
      created: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Created' },
      paid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' },
      canceled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Canceled' }
    };

    const config = statusConfig[normalizedStatus] || {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      label: normalizedStatus?.charAt(0).toUpperCase() + normalizedStatus?.slice(1) || 'Unknown'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const handleMarkAsPaid = async (payoutId) => {
    if (!confirm('Are you sure you want to mark this payout as paid?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('notary_payments')
        .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', payoutId);

      if (error) throw error;

      await fetchPayouts();
      alert('Payout marked as paid successfully!');
    } catch (error) {
      console.error('Error updating payout status:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleViewPayoutDetail = async (payout) => {
    // Fetch full payout details with related submission if available
    let submissionData = null;
    if (payout.submission_id) {
      const { data } = await supabase
        .from('submission')
        .select('id, first_name, last_name, email, appointment_date, appointment_time, total_price')
        .eq('id', payout.submission_id)
        .single();
      submissionData = data;
    }

    setSelectedPayout({ ...payout, submission: submissionData });
    setIsPayoutDetailModalOpen(true);
  };

  // Pagination
  const paginatedSubmissions = submissions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(submissions.length / itemsPerPage);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!notary) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <Icon icon="heroicons:exclamation-circle" className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 text-lg font-semibold mb-2">Notary not found</p>
          <button
            onClick={() => navigate('/notary')}
            className="btn-glassy px-6 py-2 text-white font-semibold rounded-full"
          >
            Back to Notaries
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={() => navigate('/notary')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <Icon icon="heroicons:arrow-left" className="w-5 h-5 mr-2" />
            Back to Notaries
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {notary.full_name || notary.name}
              </h1>
              <p className="text-gray-600">{notary.email}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                notary.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {notary.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Submissions</p>
            <p className="text-2xl font-bold text-gray-900">{submissions.length}</p>
          </div>
          <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Payouts</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPayouts)}</p>
          </div>
          <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Net Balance</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue - totalPayouts)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              activeTab === 'overview' ? 'text-black' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
            {activeTab === 'overview' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              activeTab === 'submissions' ? 'text-black' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Submissions ({submissions.length})
            {activeTab === 'submissions' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              activeTab === 'payouts' ? 'text-black' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Payouts ({payouts.length})
            {activeTab === 'payouts' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
            )}
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Notary Information */}
            <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Notary Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Full Name</p>
                  <p className="font-semibold text-gray-900">{notary.full_name || notary.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold text-gray-900">{notary.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-semibold text-gray-900">{notary.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">License Number</p>
                  <p className="font-semibold text-gray-900">{notary.license_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="font-semibold text-gray-900">{notary.address || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">City</p>
                  <p className="font-semibold text-gray-900">{notary.city || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Postal Code</p>
                  <p className="font-semibold text-gray-900">{notary.postal_code || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Country</p>
                  <p className="font-semibold text-gray-900">{notary.country || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Timezone</p>
                  <p className="font-semibold text-gray-900">{notary.timezone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Account Created</p>
                  <p className="font-semibold text-gray-900">
                    {notary.account_created_at ? formatDateTime(notary.account_created_at) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Login</p>
                  <p className="font-semibold text-gray-900">
                    {notary.last_sign_in_at ? formatDateTime(notary.last_sign_in_at) : 'Never'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created At</p>
                  <p className="font-semibold text-gray-900">{formatDate(notary.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Competent Services */}
            <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Competent Services</h2>
              <div className="space-y-2">
                {notary.competent_services && notary.competent_services.length > 0 ? (
                  notary.competent_services.map((service, index) => (
                    <div key={index} className="bg-white rounded-xl p-3">
                      <p className="font-semibold text-gray-900">{service}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600">No services assigned</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-200">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Client</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Revenue</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Notary Cost</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-600">
                        No submissions found
                      </td>
                    </tr>
                  ) : (
                    paginatedSubmissions.map((submission) => (
                      <tr key={submission.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          {submission.first_name} {submission.last_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(submission.appointment_date)}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(submission.status)}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          {formatCurrency(submission.total_price)}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          {formatCurrency(submission.notary_cost || 0)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => navigate(`/submission/${submission.id}`)}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Icon icon="heroicons:eye" className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, submissions.length)} of {submissions.length} submissions
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payouts Tab */}
        {activeTab === 'payouts' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Payouts</h2>
              <button
                onClick={() => setIsPayoutModalOpen(true)}
                className="btn-glassy px-6 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 flex items-center"
              >
                <Icon icon="heroicons:plus" className="w-5 h-5 mr-2" />
                Create Payout
              </button>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden border border-gray-200">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Description</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-600">
                        No payouts found
                      </td>
                    </tr>
                  ) : (
                    payouts.map((payout) => (
                      <tr key={payout.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatDate(payout.payment_date)}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          {formatCurrency(payout.payment_amount)}
                        </td>
                        <td className="px-6 py-4">
                          {getPaymentStatusBadge(payout.payment_status || 'created')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <button
                            onClick={() => handleViewPayoutDetail(payout)}
                            className="text-blue-600 hover:text-blue-900 hover:underline"
                          >
                            {payout.description || 'View Details'}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {(() => {
                              // Normalize status to check if it's already paid
                              const status = payout.payment_status;
                              const isPaid = status === 'paid' || status === 'completed';
                              return !isPaid && (
                                <button
                                  onClick={() => handleMarkAsPaid(payout.id)}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold flex items-center"
                                >
                                  <Icon icon="heroicons:check" className="w-4 h-4 mr-1" />
                                  Mark as Paid
                                </button>
                              );
                            })()}
                            {payout.submission_id && (
                              <button
                                onClick={() => navigate(`/submission/${payout.submission_id}`)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold flex items-center"
                              >
                                <Icon icon="heroicons:document-text" className="w-4 h-4 mr-1" />
                                View Submission
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Payout Modal */}
        {isPayoutModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Create Payout</h2>
                <button
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Icon icon="heroicons:x-mark" className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={payoutFormData.payment_amount}
                    onChange={(e) => setPayoutFormData({ ...payoutFormData, payment_amount: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    value={payoutFormData.payment_date}
                    onChange={(e) => setPayoutFormData({ ...payoutFormData, payment_date: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Related Submission (Optional)
                  </label>
                  <select
                    value={payoutFormData.submission_id}
                    onChange={(e) => setPayoutFormData({ ...payoutFormData, submission_id: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  >
                    <option value="">-- Select a submission --</option>
                    {availableSubmissions.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.first_name} {sub.last_name} - {formatDate(sub.appointment_date)} - {formatCurrency(sub.total_price)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Description
                  </label>
                  <textarea
                    value={payoutFormData.description}
                    onChange={(e) => setPayoutFormData({ ...payoutFormData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                    placeholder="Optional description..."
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-4">
                <button
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-full hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePayout}
                  className="btn-glassy px-6 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
                >
                  Create Payout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payout Detail Modal */}
        {isPayoutDetailModalOpen && selectedPayout && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
                <h2 className="text-2xl font-bold text-gray-900">Payout Details</h2>
                <button
                  onClick={() => {
                    setIsPayoutDetailModalOpen(false);
                    setSelectedPayout(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Icon icon="heroicons:x-mark" className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Status</h3>
                  {getPaymentStatusBadge(selectedPayout.payment_status || 'created')}
                </div>

                {/* Amount */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Amount</h3>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(selectedPayout.payment_amount)}
                  </p>
                </div>

                {/* Payment Date */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Payment Date</h3>
                  <p className="text-lg text-gray-900">
                    {formatDate(selectedPayout.payment_date)}
                  </p>
                </div>

                {/* Description */}
                {selectedPayout.description && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Description</h3>
                    <p className="text-lg text-gray-900">{selectedPayout.description}</p>
                  </div>
                )}

                {/* Related Submission */}
                {selectedPayout.submission && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-600 mb-3">Related Submission</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-gray-600">Client: </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {selectedPayout.submission.first_name} {selectedPayout.submission.last_name}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Email: </span>
                        <span className="text-sm text-gray-900">{selectedPayout.submission.email}</span>
                      </div>
                      {selectedPayout.submission.appointment_date && (
                        <div>
                          <span className="text-sm text-gray-600">Appointment: </span>
                          <span className="text-sm text-gray-900">
                            {formatDate(selectedPayout.submission.appointment_date)} at {selectedPayout.submission.appointment_time}
                          </span>
                        </div>
                      )}
                      {selectedPayout.submission.total_price && (
                        <div>
                          <span className="text-sm text-gray-600">Total Price: </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(selectedPayout.submission.total_price)}
                          </span>
                        </div>
                      )}
                      <div className="pt-2">
                        <button
                          onClick={() => {
                            navigate(`/submission/${selectedPayout.submission_id}`);
                            setIsPayoutDetailModalOpen(false);
                          }}
                          className="text-blue-600 hover:text-blue-900 hover:underline text-sm font-semibold"
                        >
                          View Full Submission Details →
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Created: </span>
                      <span className="text-gray-900">
                        {formatDateTime(selectedPayout.created_at)}
                      </span>
                    </div>
                    {selectedPayout.updated_at && selectedPayout.updated_at !== selectedPayout.created_at && (
                      <div>
                        <span className="text-gray-600">Last Updated: </span>
                        <span className="text-gray-900">
                          {formatDateTime(selectedPayout.updated_at)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {(() => {
                  const status = selectedPayout.payment_status;
                  const isPaid = status === 'paid' || status === 'completed';
                  return !isPaid && (
                    <div className="border-t border-gray-200 pt-4">
                      <button
                        onClick={() => {
                          handleMarkAsPaid(selectedPayout.id);
                          setIsPayoutDetailModalOpen(false);
                        }}
                        className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-full hover:bg-green-700 transition-colors flex items-center justify-center"
                      >
                        <Icon icon="heroicons:check" className="w-5 h-5 mr-2" />
                        Mark as Paid
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default NotaryDetail;

