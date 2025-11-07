import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';

const Payouts = () => {
  const navigate = useNavigate();
  const [payouts, setPayouts] = useState([]);
  const [filteredPayouts, setFilteredPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [payoutFormData, setPayoutFormData] = useState({
    notary_id: '',
    payment_amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    submission_id: '',
    description: '',
    payment_status: 'created'
  });
  const [notaries, setNotaries] = useState([]);
  const [availableSubmissions, setAvailableSubmissions] = useState([]);

  useEffect(() => {
    fetchPayouts();
    fetchNotaries();
  }, []);

  useEffect(() => {
    filterPayouts();
    setCurrentPage(1);
  }, [payouts, searchTerm, statusFilter]);

  const fetchPayouts = async () => {
    try {
      const { data, error } = await supabase
        .from('notary_payments')
        .select('*')
        .order('payment_date', { ascending: false });

      if (error) throw error;

      // Enrich with notary and submission data
      const enrichedPayouts = await Promise.all(
        (data || []).map(async (payout) => {
          const enriched = { ...payout };

          // Fetch notary data if notary_id exists
          if (payout.notary_id) {
            try {
              const { data: notaryData } = await supabase
                .from('notary')
                .select('id, full_name, email')
                .eq('id', payout.notary_id)
                .single();

              if (notaryData) {
                enriched.notary = notaryData;
              }
            } catch (err) {
              console.error('Error fetching notary:', err);
            }
          }

          // Fetch submission data if submission_id exists
          if (payout.submission_id) {
            try {
              const { data: submissionData } = await supabase
                .from('submission')
                .select('id, first_name, last_name, email')
                .eq('id', payout.submission_id)
                .single();

              if (submissionData) {
                enriched.submission = submissionData;
              }
            } catch (err) {
              console.error('Error fetching submission:', err);
            }
          }

          return enriched;
        })
      );

      setPayouts(enrichedPayouts);
    } catch (error) {
      console.error('Error fetching payouts:', error);
      alert('Error loading payouts');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotaries = async () => {
    try {
      const { data, error } = await supabase
        .from('notary')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) throw error;
      setNotaries(data || []);
    } catch (error) {
      console.error('Error fetching notaries:', error);
    }
  };

  const fetchSubmissionsForNotary = async (notaryId) => {
    if (!notaryId) {
      setAvailableSubmissions([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('submission')
        .select('id, first_name, last_name, email, created_at')
        .eq('assigned_notary_id', notaryId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvailableSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      setAvailableSubmissions([]);
    }
  };

  const filterPayouts = () => {
    let filtered = payouts;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.payment_status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.notary?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.notary_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPayouts(filtered);
  };

  const handleCreatePayout = async () => {
    if (!payoutFormData.notary_id || !payoutFormData.payment_amount || !payoutFormData.payment_date) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const selectedNotary = notaries.find(n => n.id === payoutFormData.notary_id);
      
      const { error } = await supabase
        .from('notary_payments')
        .insert({
          notary_id: payoutFormData.notary_id,
          notary_name: selectedNotary?.full_name || 'Unknown',
          payment_amount: parseFloat(payoutFormData.payment_amount),
          payment_date: payoutFormData.payment_date,
          submission_id: payoutFormData.submission_id || null,
          description: payoutFormData.description || null,
          payment_status: payoutFormData.payment_status || 'pending'
        });

      if (error) throw error;

      // Create notification for notary
      if (payoutFormData.notary_id) {
        try {
          await supabase.rpc('create_notification', {
            p_user_id: payoutFormData.notary_id,
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

      alert('Payout created successfully!');
      setIsPayoutModalOpen(false);
      resetForm();
      await fetchPayouts();
    } catch (error) {
      console.error('Error creating payout:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleUpdatePayout = async () => {
    if (!selectedPayout || !payoutFormData.payment_amount || !payoutFormData.payment_date) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('notary_payments')
        .update({
          payment_amount: parseFloat(payoutFormData.payment_amount),
          payment_date: payoutFormData.payment_date,
          submission_id: payoutFormData.submission_id || null,
          description: payoutFormData.description || null,
          payment_status: payoutFormData.payment_status || 'created',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedPayout.id);

      if (error) throw error;

      alert('Payout updated successfully!');
      setIsPayoutModalOpen(false);
      setIsEditMode(false);
      setSelectedPayout(null);
      resetForm();
      await fetchPayouts();
    } catch (error) {
      console.error('Error updating payout:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeletePayout = async (payoutId) => {
    if (!confirm('Are you sure you want to delete this payout?')) return;

    try {
      const { error } = await supabase
        .from('notary_payments')
        .delete()
        .eq('id', payoutId);

      if (error) throw error;

      alert('Payout deleted successfully!');
      await fetchPayouts();
    } catch (error) {
      console.error('Error deleting payout:', error);
      alert(`Error: ${error.message}`);
    }
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

  const handleEditPayout = (payout) => {
    setSelectedPayout(payout);
    setIsEditMode(true);
    setPayoutFormData({
      notary_id: payout.notary_id || '',
      payment_amount: payout.payment_amount?.toString() || '',
      payment_date: payout.payment_date || new Date().toISOString().split('T')[0],
      submission_id: payout.submission_id || '',
      description: payout.description || '',
          payment_status: payout.payment_status || 'created'
    });
    if (payout.notary_id) {
      fetchSubmissionsForNotary(payout.notary_id);
    }
    setIsPayoutModalOpen(true);
  };

  const resetForm = () => {
    setPayoutFormData({
      notary_id: '',
      payment_amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      submission_id: '',
      description: '',
      payment_status: 'created'
    });
    setAvailableSubmissions([]);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const getPaymentStatusBadge = (status) => {
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

  // Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayouts = filteredPayouts.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredPayouts.length / itemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payouts</h1>
            <p className="text-gray-600 mt-2">Manage all notary payouts</p>
          </div>
          <button
            onClick={() => {
              setIsEditMode(false);
              setSelectedPayout(null);
              resetForm();
              setIsPayoutModalOpen(true);
            }}
            className="btn-glassy px-6 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <Icon icon="heroicons:plus" className="w-5 h-5" />
            Create Payout
          </button>
        </div>

        {/* Filters */}
        <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Search</label>
              <div className="relative">
                <Icon icon="heroicons:magnifying-glass" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  placeholder="Search by notary name or description..."
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Payment Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
              >
                <option value="all">All Statuses</option>
                <option value="created">Created</option>
                <option value="paid">Paid</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payouts Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#F3F4F6]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Notary</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Submission</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedPayouts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No payouts found
                    </td>
                  </tr>
                ) : (
                  paginatedPayouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(payout.payment_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {payout.notary?.full_name || payout.notary_name || 'Unknown'}
                          </p>
                          {payout.notary?.email && (
                            <p className="text-xs text-gray-500">{payout.notary.email}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(payout.payment_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPaymentStatusBadge(payout.payment_status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {payout.submission ? (
                          <button
                            onClick={() => navigate(`/submission/${payout.submission_id}`)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-semibold"
                          >
                            {payout.submission.first_name} {payout.submission.last_name}
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {payout.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {(() => {
                            // Normalize status to check if it's already paid
                            const status = payout.payment_status;
                            const isPaid = status === 'paid' || status === 'completed';
                            return !isPaid && (
                              <button
                                onClick={() => handleMarkAsPaid(payout.id)}
                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-semibold flex items-center gap-1"
                                title="Mark as Paid"
                              >
                                <Icon icon="heroicons:check" className="w-4 h-4" />
                                Mark as Paid
                              </button>
                            );
                          })()}
                          <button
                            onClick={() => handleEditPayout(payout)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Edit"
                          >
                            <Icon icon="heroicons:pencil" className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeletePayout(payout.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Delete"
                          >
                            <Icon icon="heroicons:trash" className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredPayouts.length)} of {filteredPayouts.length} payouts
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
        )}

        {/* Create/Edit Payout Modal */}
        {isPayoutModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {isEditMode ? 'Edit Payout' : 'Create Payout'}
                </h2>
                <button
                  onClick={() => {
                    setIsPayoutModalOpen(false);
                    setIsEditMode(false);
                    setSelectedPayout(null);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Icon icon="heroicons:x-mark" className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Notary *
                  </label>
                  <select
                    value={payoutFormData.notary_id}
                    onChange={(e) => {
                      setPayoutFormData({ ...payoutFormData, notary_id: e.target.value, submission_id: '' });
                      fetchSubmissionsForNotary(e.target.value);
                    }}
                    disabled={isEditMode}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                    required
                  >
                    <option value="">-- Select a notary --</option>
                    {notaries.map((notary) => (
                      <option key={notary.id} value={notary.id}>
                        {notary.full_name} {notary.email ? `(${notary.email})` : ''}
                      </option>
                    ))}
                  </select>
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
                    Payment Status *
                  </label>
                  <select
                    value={payoutFormData.payment_status}
                    onChange={(e) => setPayoutFormData({ ...payoutFormData, payment_status: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                    required
                  >
                    <option value="created">Created</option>
                    <option value="paid">Paid</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </div>

                {payoutFormData.notary_id && availableSubmissions.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Related Submission (Optional)
                    </label>
                    <select
                      value={payoutFormData.submission_id}
                      onChange={(e) => setPayoutFormData({ ...payoutFormData, submission_id: e.target.value })}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                    >
                      <option value="">-- No submission --</option>
                      {availableSubmissions.map((submission) => (
                        <option key={submission.id} value={submission.id}>
                          {submission.first_name} {submission.last_name} - {formatDate(submission.created_at)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

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
                    setIsEditMode(false);
                    setSelectedPayout(null);
                    resetForm();
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-full hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={isEditMode ? handleUpdatePayout : handleCreatePayout}
                  className="btn-glassy px-6 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
                >
                  {isEditMode ? 'Update Payout' : 'Create Payout'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default Payouts;

