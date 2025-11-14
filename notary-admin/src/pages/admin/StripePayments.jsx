import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';

const StripePayments = () => {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [stats, setStats] = useState({
    totalRevenue: 0,
    successfulPayments: 0,
    failedPayments: 0,
    averageAmount: 0
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    filterPayments();
    calculateStats();
    setCurrentPage(1); // Reset to first page when filters change
  }, [payments, searchTerm, statusFilter, dateFilter]);

  const fetchPayments = async () => {
    try {
      // Récupérer toutes les soumissions avec leurs données de paiement depuis Supabase
      const { data: submissions, error } = await supabase
        .from('submission')
        .select('id, email, first_name, last_name, created_at, data, total_price')
        .not('data->payment', 'is', null)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      const allTransactions = [];

      // Traiter chaque soumission pour extraire les transactions
      for (const submission of submissions || []) {
        const paymentData = submission.data?.payment;

        if (!paymentData) continue;

        // Transaction de paiement initiale
        if (paymentData.payment_intent_id && paymentData.amount_paid) {
          const paymentDate = paymentData.paid_at 
            ? new Date(paymentData.paid_at).getTime() / 1000 
            : submission.created_at 
              ? new Date(submission.created_at).getTime() / 1000 
              : Date.now() / 1000;

          allTransactions.push({
            id: paymentData.payment_intent_id,
            type: 'payment',
            submissionId: submission.id,
            paymentIntentId: paymentData.payment_intent_id,
            amount: paymentData.amount_paid / 100, // Convert from cents
            currency: paymentData.currency || 'usd',
            status: paymentData.payment_status === 'paid' ? 'succeeded' : paymentData.payment_status || 'pending',
            created: paymentDate,
            customerEmail: submission.email,
            customerName: `${submission.first_name || ''} ${submission.last_name || ''}`.trim() || null,
            stripeUrl: paymentData.payment_intent_id 
              ? `https://dashboard.stripe.com/test/payments/${paymentData.payment_intent_id}` 
              : null,
            receiptUrl: paymentData.invoice_url || null,
            stripeSessionId: paymentData.stripe_session_id
          });

          // Paiements supplémentaires
          if (paymentData.additional_payments && Array.isArray(paymentData.additional_payments)) {
            for (const additionalPayment of paymentData.additional_payments) {
              const paymentDate = additionalPayment.created_at 
                ? new Date(additionalPayment.created_at).getTime() / 1000 
                : Date.now() / 1000;

              allTransactions.push({
                id: additionalPayment.payment_intent_id,
                type: 'payment',
                submissionId: submission.id,
                paymentIntentId: additionalPayment.payment_intent_id,
                amount: additionalPayment.amount / 100,
                currency: additionalPayment.currency || paymentData.currency || 'usd',
                status: additionalPayment.status || 'succeeded',
                created: paymentDate,
                customerEmail: submission.email,
                customerName: `${submission.first_name || ''} ${submission.last_name || ''}`.trim() || null,
                stripeUrl: additionalPayment.payment_intent_id 
                  ? `https://dashboard.stripe.com/test/payments/${additionalPayment.payment_intent_id}` 
                  : null,
                receiptUrl: null,
                stripeSessionId: null
              });
            }
          }

          // Remboursements
          if (paymentData.refunds && Array.isArray(paymentData.refunds)) {
            for (const refund of paymentData.refunds) {
              const refundDate = refund.created_at 
                ? new Date(refund.created_at).getTime() / 1000 
                : Date.now() / 1000;

              allTransactions.push({
                id: refund.id || `refund_${paymentData.payment_intent_id}_${refundDate}`,
                type: 'refund',
                submissionId: submission.id,
                paymentIntentId: paymentData.payment_intent_id,
                amount: refund.amount / 100,
                currency: refund.currency || paymentData.currency || 'usd',
                status: refund.status || 'succeeded',
                created: refundDate,
                customerEmail: submission.email,
                customerName: `${submission.first_name || ''} ${submission.last_name || ''}`.trim() || null,
                stripeUrl: refund.id 
                  ? `https://dashboard.stripe.com/test/refunds/${refund.id}` 
                  : null,
                reason: refund.reason || null
              });
            }
          }
        }
      }

      // Trier par date (plus récent en premier)
      allTransactions.sort((a, b) => b.created - a.created);

      setPayments(allTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = payments;

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'refund') {
        filtered = filtered.filter(p => p.type === 'refund');
      } else {
        filtered = filtered.filter(p => p.type === 'payment' && p.status === statusFilter);
      }
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.paymentIntentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(p => {
            const txDate = new Date(p.created * 1000); // Convert Unix timestamp to Date
            return txDate >= filterDate;
          });
          break;
        case 'week':
          filterDate.setDate(filterDate.getDate() - 7);
          filtered = filtered.filter(p => {
            const txDate = new Date(p.created * 1000);
            return txDate >= filterDate;
          });
          break;
        case 'month':
          filterDate.setMonth(filterDate.getMonth() - 1);
          filtered = filtered.filter(p => {
            const txDate = new Date(p.created * 1000);
            return txDate >= filterDate;
          });
          break;
        default:
          break;
      }
    }

    setFilteredPayments(filtered);
  };

  const calculateStats = () => {
    const paymentsOnly = payments.filter(p => p.type === 'payment');
    const successful = paymentsOnly.filter(p => p.status === 'succeeded').length;
    const failed = paymentsOnly.filter(p => p.status !== 'succeeded' && p.status !== 'processing').length;
    const totalPayments = paymentsOnly
      .filter(p => p.status === 'succeeded')
      .reduce((sum, p) => sum + p.amount, 0);
    const totalRefunds = payments
      .filter(p => p.type === 'refund' && p.status === 'succeeded')
      .reduce((sum, p) => sum + p.amount, 0);
    const netRevenue = totalPayments - totalRefunds;
    const avgAmount = successful > 0 ? totalPayments / successful : 0;

    setStats({
      totalRevenue: netRevenue,
      successfulPayments: successful,
      failedPayments: failed,
      averageAmount: avgAmount
    });
  };

  const formatDate = (dateStringOrTimestamp) => {
    if (!dateStringOrTimestamp) return 'N/A';
    // Handle Unix timestamp (from Stripe)
    const date = typeof dateStringOrTimestamp === 'number' 
      ? new Date(dateStringOrTimestamp * 1000)
      : new Date(dateStringOrTimestamp);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount, currency = 'usd') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount);
  };

  const getStatusBadge = (status, type) => {
    const badges = {
      succeeded: 'bg-green-100 text-green-700',
      paid: 'bg-green-100 text-green-700',
      unpaid: 'bg-yellow-100 text-yellow-700',
      failed: 'bg-red-100 text-red-700',
      pending: 'bg-gray-100 text-gray-700',
      processing: 'bg-blue-100 text-blue-700',
      requires_action: 'bg-orange-100 text-orange-700',
      canceled: 'bg-gray-100 text-gray-700',
    };

    const displayStatus = type === 'refund' ? 'REFUND' : (status?.toUpperCase() || 'UNKNOWN');
    
    // Use purple color for refunds
    const badgeClass = type === 'refund' 
      ? 'bg-purple-100 text-purple-700'
      : (badges[status] || badges.pending);

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>
        {displayStatus}
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
            <h1 className="text-3xl font-bold text-gray-900">Stripe Payments</h1>
            <p className="text-gray-600 mt-2">Gérer tous les paiements Stripe</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Icon icon="heroicons:currency-dollar" className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Paiements réussis</p>
                <p className="text-2xl font-bold text-gray-900">{stats.successfulPayments}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Icon icon="heroicons:check-circle" className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Paiements échoués</p>
                <p className="text-2xl font-bold text-gray-900">{stats.failedPayments}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <Icon icon="heroicons:x-circle" className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Montant moyen</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.averageAmount)}</p>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center">
                <Icon icon="heroicons:calculator" className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Recherche
              </label>
              <div className="relative">
                <Icon icon="heroicons:magnifying-glass" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  placeholder="Rechercher par email, nom ou session ID..."
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Statut
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
              >
                <option value="all">Tous les statuts</option>
                <option value="succeeded">Réussi</option>
                <option value="pending">En attente</option>
                <option value="failed">Échoué</option>
                <option value="refund">Remboursement</option>
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Période
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
              >
                <option value="all">Toutes les périodes</option>
                <option value="today">Aujourd'hui</option>
                <option value="week">7 derniers jours</option>
                <option value="month">30 derniers jours</option>
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
                    Type / ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Date
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
                  const paginatedPayments = filteredPayments.slice(startIndex, endIndex);
                  
                  if (paginatedPayments.length === 0) {
                    return (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-gray-600">
                          Aucun paiement trouvé
                        </td>
                      </tr>
                    );
                  }
                  
                  return paginatedPayments.map((payment) => (
                    <tr key={`${payment.type}-${payment.id}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">{payment.customerName || 'N/A'}</div>
                        <div className="text-sm text-gray-600">{payment.customerEmail || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-semibold text-gray-900 mb-1">
                            {payment.type === 'refund' ? 'Remboursement' : 'Paiement'}
                          </div>
                          <div className="text-xs text-gray-600 font-mono">
                            {payment.type === 'payment' ? payment.paymentIntentId : payment.id}
                          </div>
                          {payment.submissionId && (
                            <div className="text-xs text-gray-500 mt-1">
                              Submission: {payment.submissionId.substring(0, 8)}...
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-semibold ${payment.type === 'refund' ? 'text-red-600' : 'text-gray-900'}`}>
                          {payment.type === 'refund' ? '-' : ''}{formatCurrency(payment.amount, payment.currency)}
                        </div>
                        {payment.refunded && payment.type === 'payment' && (
                          <div className="text-xs text-red-600">
                            Remboursé: {formatCurrency(payment.refundAmount, payment.currency)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(payment.status, payment.type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(payment.created)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {payment.receiptUrl && (
                            <a
                              href={payment.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-600 hover:text-gray-900 transition-colors"
                              title="Voir le reçu"
                            >
                              <Icon icon="heroicons:document-text" className="w-5 h-5" />
                            </a>
                          )}
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
          const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
          const startIndex = (currentPage - 1) * itemsPerPage;
          const endIndex = startIndex + itemsPerPage;
          
          if (totalPages <= 1) return null;
          
          return (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredPayments.length)} of {filteredPayments.length} payments
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
    </AdminLayout>
  );
};

export default StripePayments;

