import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';

const Submissions = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedSubmissionForAssign, setSelectedSubmissionForAssign] = useState(null);
  const [notaries, setNotaries] = useState([]);
  const [selectedNotaryId, setSelectedNotaryId] = useState('');
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [selectedSubmissionForPayout, setSelectedSubmissionForPayout] = useState(null);
  const [payoutFormData, setPayoutFormData] = useState({
    payment_amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    description: ''
  });

  useEffect(() => {
    fetchSubmissions();
    fetchNotaries();
  }, []);

  useEffect(() => {
    filterSubmissions();
    setCurrentPage(1); // Reset to first page when filters change
  }, [submissions, searchTerm, statusFilter]);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('submission')
        .select(`
          *,
          notary:assigned_notary_id(id, full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch payouts for each submission
      const submissionsWithPayouts = await Promise.all(
        (data || []).map(async (submission) => {
          const { data: payout } = await supabase
            .from('notary_payments')
            .select('id, payment_status')
            .eq('submission_id', submission.id)
            .maybeSingle();

          return {
            ...submission,
            payout: payout || null
          };
        })
      );

      setSubmissions(submissionsWithPayouts);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSubmissions = () => {
    let filtered = submissions;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredSubmissions(filtered);
  };


  const fetchNotaries = async () => {
    try {
      const { data, error } = await supabase
        .from('notary')
        .select('id, full_name, email, is_active')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) throw error;
      setNotaries(data || []);
    } catch (error) {
      console.error('Error fetching notaries:', error);
    }
  };

  const handleOpenAssignModal = (submission) => {
    setSelectedSubmissionForAssign(submission);
    setSelectedNotaryId(submission.assigned_notary_id || '');
    setIsAssignModalOpen(true);
  };

  const handleAssignNotary = async () => {
    if (!selectedSubmissionForAssign || !selectedNotaryId) return;

    try {
      const { error } = await supabase
        .from('submission')
        .update({
          assigned_notary_id: selectedNotaryId,
          status: selectedSubmissionForAssign.status === 'pending' ? 'confirmed' : selectedSubmissionForAssign.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedSubmissionForAssign.id);

      if (error) throw error;

      alert('Notary assigned successfully!');
      setIsAssignModalOpen(false);
      setSelectedSubmissionForAssign(null);
      setSelectedNotaryId('');
      await fetchSubmissions();
    } catch (error) {
      console.error('Error assigning notary:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleRemoveNotary = async () => {
    if (!selectedSubmissionForAssign) return;

    try {
      const { error } = await supabase
        .from('submission')
        .update({
          assigned_notary_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedSubmissionForAssign.id);

      if (error) throw error;

      alert('Notary removed successfully!');
      setIsAssignModalOpen(false);
      setSelectedSubmissionForAssign(null);
      setSelectedNotaryId('');
      await fetchSubmissions();
    } catch (error) {
      console.error('Error removing notary:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleCreatePayout = async () => {
    if (!selectedSubmissionForPayout || !payoutFormData.payment_amount || !payoutFormData.payment_date) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('notary_payments')
        .insert({
          notary_id: selectedSubmissionForPayout.assigned_notary_id,
          notary_name: selectedSubmissionForPayout.notary?.full_name || 'Unknown',
          payment_amount: parseFloat(payoutFormData.payment_amount),
          payment_date: payoutFormData.payment_date,
          submission_id: selectedSubmissionForPayout.id,
          description: payoutFormData.description || null,
          payment_status: 'created'
        });

      if (error) throw error;

      // Create notification for notary
      if (selectedSubmissionForPayout.assigned_notary_id) {
        try {
          await supabase.rpc('create_notification', {
            p_user_id: selectedSubmissionForPayout.assigned_notary_id,
            p_user_type: 'notary',
            p_title: 'New Payout',
            p_message: `A payout of $${parseFloat(payoutFormData.payment_amount).toFixed(2)} has been created for submission #${selectedSubmissionForPayout.id.substring(0, 8)}.`,
            p_type: 'success',
            p_action_type: 'payout_created',
            p_action_data: {
              payout_amount: payoutFormData.payment_amount,
              payment_date: payoutFormData.payment_date,
              submission_id: selectedSubmissionForPayout.id
            }
          });
        } catch (notifError) {
          console.error('Error creating notification:', notifError);
        }
      }

      alert('Payout created successfully!');
      setIsPayoutModalOpen(false);
      setSelectedSubmissionForPayout(null);
      setPayoutFormData({
        payment_amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        description: ''
      });
      await fetchSubmissions();
    } catch (error) {
      console.error('Error creating payout:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      pending_payment: 'bg-orange-100 text-orange-800',
      confirmed: 'bg-green-100 text-green-800',
      completed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };

    const labels = {
      pending: 'Pending',
      pending_payment: 'Pending Payment',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled',
      accepted: 'Accepted',
      rejected: 'Rejected'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badges[status] || badges.pending}`}>
        {labels[status] || status?.charAt(0).toUpperCase() + status?.slice(1).replace('_', ' ')}
      </span>
    );
  };

  const getPaymentStatusBadge = (status) => {
    if (!status) return null;

    const statusConfig = {
      created: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Created' },
      paid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' },
      canceled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Canceled' }
    };

    const config = statusConfig[status] || {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      label: status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Submissions</h1>
            <p className="text-gray-600 mt-2">Manage all notary service requests</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Search
              </label>
              <div className="relative">
                <Icon icon="heroicons:magnifying-glass" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  placeholder="Search by name or email..."
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="pending_payment">Pending Payment</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#F3F4F6] rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Appointment
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Notary
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Payout Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(() => {
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const endIndex = startIndex + itemsPerPage;
                  const paginatedSubmissions = filteredSubmissions.slice(startIndex, endIndex);
                  
                  if (paginatedSubmissions.length === 0) {
                    return (
                      <tr>
                        <td colSpan="8" className="px-6 py-12 text-center text-gray-600">
                          No submissions found
                        </td>
                      </tr>
                    );
                  }
                  
                  return paginatedSubmissions.map((submission) => (
                    <tr
                      key={submission.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/submission/${submission.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">
                          {submission.first_name} {submission.last_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {submission.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {submission.appointment_date ? formatDate(submission.appointment_date) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {submission.notary ? (
                          <span className="font-semibold text-gray-900">{submission.notary.full_name}</span>
                        ) : (
                          <span className="text-gray-400 italic">Not assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(submission.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {submission.payout ? (
                          getPaymentStatusBadge(submission.payout.payment_status)
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(submission.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {submission.assigned_notary_id && !submission.payout && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSubmissionForPayout(submission);
                                setPayoutFormData({
                                  payment_amount: submission.notary_cost ? submission.notary_cost.toString() : '',
                                  payment_date: new Date().toISOString().split('T')[0],
                                  description: `Payout for submission #${submission.id.substring(0, 8)}`
                                });
                                setIsPayoutModalOpen(true);
                              }}
                              className="text-green-600 hover:text-green-900 transition-colors bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1"
                              title="Create Payout"
                            >
                              <Icon icon="heroicons:banknotes" className="w-4 h-4" />
                              Payout
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAssignModal(submission);
                            }}
                            className="text-purple-600 hover:text-purple-900 transition-colors"
                            title="Assign Notary"
                          >
                            <Icon icon="heroicons:user-plus" className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/messages?submission_id=${submission.id}`);
                            }}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Send message"
                          >
                            <Icon icon="heroicons:chat-bubble-left-right" className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/submission/${submission.id}`);
                            }}
                            className="text-gray-600 hover:text-gray-900 transition-colors"
                            title="View details"
                          >
                            <Icon icon="heroicons:eye" className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {(() => {
          const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
          const startIndex = (currentPage - 1) * itemsPerPage;
          const endIndex = startIndex + itemsPerPage;
          
          if (totalPages <= 1) return null;
          
          return (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredSubmissions.length)} of {filteredSubmissions.length} submissions
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-lg ${
                          currentPage === page
                            ? 'bg-black text-white'
                            : 'bg-white border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Assign Notary Modal */}
      {isAssignModalOpen && selectedSubmissionForAssign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Assign Notary to Submission
              </h2>
              <button
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setSelectedSubmissionForAssign(null);
                  setSelectedNotaryId('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon icon="heroicons:x-mark" className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Client:</p>
                <p className="font-semibold text-gray-900">
                  {selectedSubmissionForAssign.first_name} {selectedSubmissionForAssign.last_name}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedSubmissionForAssign.email}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Select Notary *
                </label>
                <select
                  value={selectedNotaryId}
                  onChange={(e) => setSelectedNotaryId(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                >
                  <option value="">-- Select a notary --</option>
                  {notaries.map((notary) => (
                    <option key={notary.id} value={notary.id}>
                      {notary.full_name} {notary.email ? `(${notary.email})` : ''}
                    </option>
                  ))}
                </select>
                {notaries.length === 0 && (
                  <p className="mt-2 text-sm text-gray-600">
                    No active notaries available. Please create a notary first.
                  </p>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-between">
              <div>
                {selectedSubmissionForAssign.assigned_notary_id && (
                  <button
                    onClick={handleRemoveNotary}
                    className="px-6 py-3 bg-red-600 text-white font-semibold rounded-full hover:bg-red-700 transition-colors"
                  >
                    Remove Notary
                  </button>
                )}
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setIsAssignModalOpen(false);
                    setSelectedSubmissionForAssign(null);
                    setSelectedNotaryId('');
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-full hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignNotary}
                  disabled={!selectedNotaryId}
                  className="btn-glassy px-6 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectedSubmissionForAssign.assigned_notary_id ? 'Update Assignment' : 'Assign Notary'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Payout Modal */}
      {isPayoutModalOpen && selectedSubmissionForPayout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Create Payout</h2>
              <button
                onClick={() => {
                  setIsPayoutModalOpen(false);
                  setSelectedSubmissionForPayout(null);
                  setPayoutFormData({
                    payment_amount: '',
                    payment_date: new Date().toISOString().split('T')[0],
                    description: ''
                  });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon icon="heroicons:x-mark" className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Notary:</p>
                <p className="font-semibold text-gray-900">
                  {selectedSubmissionForPayout.notary?.full_name || 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Submission:</p>
                <p className="font-semibold text-gray-900">
                  {selectedSubmissionForPayout.first_name} {selectedSubmissionForPayout.last_name}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  #{selectedSubmissionForPayout.id.substring(0, 8)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Payment Amount ($) *
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
                onClick={() => {
                  setIsPayoutModalOpen(false);
                  setSelectedSubmissionForPayout(null);
                  setPayoutFormData({
                    payment_amount: '',
                    payment_date: new Date().toISOString().split('T')[0],
                    description: ''
                  });
                }}
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
    </AdminLayout>
  );
};

export default Submissions;
