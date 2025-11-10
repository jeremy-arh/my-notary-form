import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';
import { format, parseISO } from 'date-fns';

const Payouts = () => {
  const [loading, setLoading] = useState(true);
  const [notaryId, setNotaryId] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [filteredPayouts, setFilteredPayouts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchNotaryId();
  }, []);

  useEffect(() => {
    if (notaryId) {
      fetchPayouts();
    }
  }, [notaryId]);

  useEffect(() => {
    filterPayouts();
    setCurrentPage(1);
  }, [payouts, searchTerm, statusFilter]);

  const fetchNotaryId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: notary, error } = await supabase
        .from('notary')
        .select('id, full_name')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (notary) {
        setNotaryId(notary.id);
      }
    } catch (error) {
      console.error('Error fetching notary ID:', error);
      setLoading(false);
    }
  };

  const fetchPayouts = async () => {
    if (!notaryId) return;

    try {
      setLoading(true);
      
      // Try to fetch by notary_id first (if column exists), otherwise fallback to notary_name
      let query = supabase
        .from('notary_payments')
        .select('*')
        .order('payment_date', { ascending: false });

      // Check if notary_id column exists by trying to filter by it
      const { data: dataById, error: errorById } = await query.eq('notary_id', notaryId);
      
      if (!errorById && dataById) {
        setPayouts(dataById || []);
      } else {
        // Fallback to notary_name
        const { data: notary } = await supabase
          .from('notary')
          .select('full_name, name')
          .eq('id', notaryId)
          .single();

        if (notary) {
          const { data, error } = await supabase
            .from('notary_payments')
            .select('*')
            .eq('notary_name', notary.full_name || notary.name)
            .order('payment_date', { ascending: false });

          if (error) throw error;
          setPayouts(data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching payouts:', error);
      setPayouts([]);
    } finally {
      setLoading(false);
    }
  };

  const filterPayouts = () => {
    let filtered = [...payouts];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(payout => {
        if (statusFilter === 'paid') {
          return payout.payment_status === 'paid';
        } else if (statusFilter === 'pending') {
          return payout.payment_status === 'created' || !payout.payment_status;
        } else if (statusFilter === 'canceled') {
          return payout.payment_status === 'canceled';
        }
        return true;
      });
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(payout => {
        return (
          payout.description?.toLowerCase().includes(term) ||
          payout.submission_id?.toLowerCase().includes(term) ||
          payout.payment_amount?.toString().includes(term)
        );
      });
    }

    setFilteredPayouts(filtered);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(parseFloat(amount));
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      paid: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        label: 'Paid'
      },
      created: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        label: 'Pending'
      },
      canceled: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        label: 'Canceled'
      }
    };

    const config = statusConfig[status] || statusConfig.created;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  // Calculate total payouts
  const totalPayouts = payouts.reduce((sum, payout) => {
    return sum + (parseFloat(payout.payment_amount) || 0);
  }, 0);

  const paidPayouts = payouts
    .filter(p => p.payment_status === 'paid')
    .reduce((sum, payout) => {
      return sum + (parseFloat(payout.payment_amount) || 0);
    }, 0);

  const pendingPayouts = payouts
    .filter(p => p.payment_status === 'created' || !p.payment_status)
    .reduce((sum, payout) => {
      return sum + (parseFloat(payout.payment_amount) || 0);
    }, 0);

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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Payouts</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">View your payment history and earnings</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Payouts</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatCurrency(totalPayouts)}</p>
            </div>
            <Icon icon="heroicons:banknotes" className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
          </div>
        </div>
        <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Paid</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{formatCurrency(paidPayouts)}</p>
            </div>
            <Icon icon="heroicons:check-circle" className="w-8 h-8 sm:w-10 sm:h-10 text-green-400" />
          </div>
        </div>
        <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Pending</p>
              <p className="text-xl sm:text-2xl font-bold text-yellow-600">{formatCurrency(pendingPayouts)}</p>
            </div>
            <Icon icon="heroicons:clock" className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search payouts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>
        </div>

        {/* Payouts Table */}
        <div className="bg-white rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Date</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Amount</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Description</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Submission ID</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPayouts.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-600">
                      {payouts.length === 0 ? 'No payouts received yet.' : 'No payouts match your filters.'}
                    </td>
                  </tr>
                ) : (
                  paginatedPayouts.map((payout) => (
                    <tr key={payout.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                        {formatDate(payout.payment_date)}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">
                        {formatCurrency(payout.payment_amount)}
                      </td>
                      <td className="px-3 sm:px-4 py-3">
                        {getStatusBadge(payout.payment_status || 'created')}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-600">
                        {payout.description || '-'}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-600 font-mono">
                        {payout.submission_id ? payout.submission_id.substring(0, 8) : '-'}
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 mt-4">
            <div className="text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredPayouts.length)} of {filteredPayouts.length} payouts
            </div>
            <div className="flex items-center gap-2 order-1 sm:order-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon icon="heroicons:chevron-left" className="w-4 h-4" />
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
                      className={`px-2 sm:px-3 py-2 text-xs sm:text-sm rounded-lg ${
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
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon icon="heroicons:chevron-right" className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payouts;

