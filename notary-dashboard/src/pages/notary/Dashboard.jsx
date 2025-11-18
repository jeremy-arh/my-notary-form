import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';
import { format, parseISO } from 'date-fns';
import { convertTimeToNotaryTimezone } from '../../utils/timezoneConverter';
import { useToast } from '../../contexts/ToastContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [notaryId, setNotaryId] = useState(null);
  const [notaryTimezone, setNotaryTimezone] = useState(null);
  const [notaryServiceIds, setNotaryServiceIds] = useState([]);
  
  // Stats
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [completedSubmissions, setCompletedSubmissions] = useState(0);
  const [payouts, setPayouts] = useState([]);
  const [newSubmissions, setNewSubmissions] = useState([]);
  const [allSubmissions, setAllSubmissions] = useState([]);
  
  // Filters and pagination
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  useEffect(() => {
    fetchNotaryInfo();
  }, []);

  useEffect(() => {
    if (notaryId) {
      fetchAllData();
    }
  }, [notaryId]);

  // Refresh data when notaryServiceIds change (in case services are added/removed)
  useEffect(() => {
    if (notaryId && notaryServiceIds.length >= 0) {
      fetchNewSubmissions();
    }
  }, [notaryId, notaryServiceIds]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [statusFilter, searchTerm]);

  const fetchNotaryInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: notary, error } = await supabase
        .from('notary')
        .select('id, full_name, timezone')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (notary) {
        setNotaryId(notary.id);
        setNotaryTimezone(notary.timezone || 'UTC');
        
        // Fetch notary's competent services
        const { data: notaryServices, error: servicesError } = await supabase
          .from('notary_services')
          .select('service_id')
          .eq('notary_id', notary.id);

        if (!servicesError && notaryServices) {
          setNotaryServiceIds(notaryServices.map(ns => ns.service_id));
        }
      }
    } catch (error) {
      console.error('Error fetching notary info:', error);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAllSubmissions(),
        fetchPayouts(),
        fetchTotalRevenue(),
        fetchNewSubmissions(),
        fetchCompletedCount()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllSubmissions = async () => {
    if (!notaryId) return;
    
    try {
      console.log('🔍 Fetching all submissions for notary:', notaryId);
      
      // Get all submissions assigned to this notary
      // Don't filter by services - show all submissions assigned to this notary
      let query = supabase
        .from('submission')
        .select(`
          id,
          created_at,
          appointment_date,
          appointment_time,
          status,
          first_name,
          last_name,
          email,
          phone,
          timezone,
          submission_services(service_id)
        `)
        .eq('assigned_notary_id', notaryId)
        .neq('status', 'pending_payment')
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching all submissions:', error);
        throw error;
      }
      
      console.log(`✅ Found ${data?.length || 0} submissions assigned to notary`);
      
      // Don't filter by services - show all submissions assigned to this notary
      // The notary should see all their submissions regardless of service matching
      const submissions = data || [];
      
      // Remove duplicates using Map for better performance
      const uniqueMap = new Map();
      submissions.forEach(sub => {
        if (!uniqueMap.has(sub.id)) {
          uniqueMap.set(sub.id, sub);
        }
      });
      
      const uniqueSubmissions = Array.from(uniqueMap.values());
      console.log(`✅ Processed ${uniqueSubmissions.length} unique submissions`);
      setAllSubmissions(uniqueSubmissions);
    } catch (error) {
      console.error('❌ Error fetching all submissions:', error);
      setAllSubmissions([]);
    }
  };

  const fetchCompletedCount = async () => {
    try {
      // Optimized: use count query instead of fetching all data
      const { count, error } = await supabase
        .from('submission')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_notary_id', notaryId)
        .eq('status', 'completed');

      if (error) throw error;
      setCompletedSubmissions(count || 0);
    } catch (error) {
      console.error('Error fetching completed count:', error);
    }
  };

  const fetchPayouts = async () => {
    try {
      const { data: notary } = await supabase
        .from('notary')
        .select('full_name, id')
        .eq('id', notaryId)
        .single();

      if (!notary) return;

      // Try to fetch by notary_id first (if column exists), otherwise fallback to notary_name
      let query = supabase
        .from('notary_payments')
        .select('*')
        .order('payment_date', { ascending: false });

      // Check if notary_id column exists by trying to filter by it
      // If it fails, fallback to notary_name
      const { data: dataById, error: errorById } = await query.eq('notary_id', notaryId);
      
      if (!errorById && dataById) {
        setPayouts(dataById || []);
      } else {
        // Fallback to notary_name
        const { data, error } = await supabase
          .from('notary_payments')
          .select('*')
          .eq('notary_name', notary.full_name || notary.name)
          .order('payment_date', { ascending: false });

        if (error) throw error;
        setPayouts(data || []);
      }
    } catch (error) {
      console.error('Error fetching payouts:', error);
      // Try fallback to notary_name if notary_id query failed
      try {
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

          if (!error) {
            setPayouts(data || []);
          }
        }
      } catch (fallbackError) {
        console.error('Error in fallback payout fetch:', fallbackError);
      }
    }
  };

  const fetchTotalRevenue = async () => {
    try {
      // Calculate revenue from notary_payments table
      const { data: notary } = await supabase
        .from('notary')
        .select('full_name, name, id')
        .eq('id', notaryId)
        .single();

      if (!notary) return;

      let revenue = 0;

      // Try to fetch by notary_id first (if column exists)
      const { data: payoutsById, error: errorById } = await supabase
        .from('notary_payments')
        .select('payment_amount')
        .eq('notary_id', notaryId);

      if (!errorById && payoutsById) {
        // Calculate from payouts by notary_id
        revenue = payoutsById.reduce((sum, payout) => {
          return sum + (parseFloat(payout.payment_amount) || 0);
        }, 0);
      } else {
        // Fallback to notary_name
        const { data: payouts, error } = await supabase
          .from('notary_payments')
          .select('payment_amount')
          .eq('notary_name', notary.full_name || notary.name);

        if (error) throw error;

        revenue = (payouts || []).reduce((sum, payout) => {
          return sum + (parseFloat(payout.payment_amount) || 0);
        }, 0);
      }

      setTotalRevenue(revenue);
    } catch (error) {
      console.error('Error fetching revenue:', error);
    }
  };

  const fetchNewSubmissions = async () => {
    if (!notaryId) return;
    
    try {
      console.log('🔍 Fetching new submissions for notary:', notaryId);
      console.log('🔍 Notary service IDs:', notaryServiceIds);
      
      // Get all pending submissions not assigned to any notary
      let query = supabase
        .from('submission')
        .select(`
          *,
          submission_services(service_id)
        `)
        .is('assigned_notary_id', null)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50); // Get more to filter client-side

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching new submissions:', error);
        throw error;
      }
      
      console.log(`✅ Found ${data?.length || 0} pending submissions in database`);

      // Filter by notary's competent services if they exist
      // If no services configured, show ALL pending submissions (notary can accept any)
      let filteredData = data || [];
      
      if (notaryServiceIds.length > 0 && data) {
        // Filter submissions that have at least one service matching notary's competent services
        filteredData = data.filter(sub => {
          const submissionServiceIds = (sub.submission_services || []).map(ss => ss.service_id);
          // Check if any of the submission's services match the notary's competent services
          // OR if submission has no services (show all)
          return submissionServiceIds.length === 0 || 
                 submissionServiceIds.some(serviceId => notaryServiceIds.includes(serviceId));
        });
        console.log(`✅ Filtered to ${filteredData.length} submissions matching notary services`);
      } else {
        console.log('⚠️ No services configured for notary - showing ALL pending submissions');
        // If no services configured, show all pending submissions
        filteredData = data || [];
      }
      
      // Remove duplicates
      const uniqueSubmissions = [];
      const seenIds = new Set();
      filteredData.forEach(sub => {
        if (!seenIds.has(sub.id)) {
          seenIds.add(sub.id);
          uniqueSubmissions.push(sub);
        }
      });
      
      // Limit to 10 most recent
      const limitedSubmissions = uniqueSubmissions.slice(0, 10);
      
      console.log(`✅ Setting ${limitedSubmissions.length} new submissions`);
      setNewSubmissions(limitedSubmissions);
    } catch (error) {
      console.error('❌ Error fetching new submissions:', error);
      setNewSubmissions([]);
    }
  };

  const handleAcceptSubmission = async (submissionId) => {
    try {
      const { data: submission, error: checkError } = await supabase
        .from('submission')
        .select('assigned_notary_id')
        .eq('id', submissionId)
        .single();

      if (checkError) throw checkError;

      if (submission.assigned_notary_id) {
        toast.warning('This submission has already been accepted by another notary.');
        await fetchNewSubmissions();
        return;
      }

      const { error } = await supabase
        .from('submission')
        .update({ 
          assigned_notary_id: notaryId,
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (error) throw error;

      toast.success('Submission accepted successfully!');
      await fetchAllData();
    } catch (error) {
      console.error('Error accepting submission:', error);
      toast.error('Failed to accept submission. It may have been taken by another notary.');
      await fetchNewSubmissions();
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return format(parseISO(dateString), 'MMM dd, yyyy');
  };

  const formatTime = (timeString, appointmentDate, sourceTimezone) => {
    if (!timeString || !appointmentDate) return 'Not selected';
    
    // Always convert to notary's timezone
    const targetTimezone = notaryTimezone || 'UTC';
    // Use client's timezone as source if provided, otherwise default to America/New_York
    const clientTimezone = sourceTimezone || 'America/New_York';
    
    // Always convert to notary's timezone
    return convertTimeToNotaryTimezone(timeString, appointmentDate, clientTimezone, targetTimezone);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        label: 'Pending'
      },
      confirmed: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        label: 'Confirmed'
      },
      completed: {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        label: 'Completed'
      },
      cancelled: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        label: 'Cancelled'
      }
    };

    const config = statusConfig[status] || {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      label: status?.replace('_', ' ') || 'Unknown'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  // Filter submissions (exclude pending_payment)
  const filteredSubmissions = allSubmissions.filter(sub => {
    // Exclude pending_payment status
    if (sub.status === 'pending_payment') return false;
    
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      `${sub.first_name} ${sub.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSubmissions = filteredSubmissions.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full overflow-x-hidden">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
          Welcome back! Here's your overview.
          {notaryTimezone && (
            <span className="ml-2 text-xs text-gray-500">(All times displayed in {notaryTimezone})</span>
          )}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Revenue</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
            </div>
            <Icon icon="heroicons:currency-dollar" className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
          </div>
        </div>

        <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Completed Submissions</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{completedSubmissions}</p>
            </div>
            <Icon icon="heroicons:check-circle" className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
          </div>
        </div>

        <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Payouts</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatCurrency(payouts.reduce((sum, p) => sum + parseFloat(p.payment_amount), 0))}</p>
            </div>
            <Icon icon="heroicons:banknotes" className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
          </div>
        </div>
      </div>

      {/* New Submissions */}
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-4 sm:p-6 border-2 border-blue-200 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">New Submissions</h2>
          {newSubmissions.length > 0 && (
            <span className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
              {newSubmissions.length}
            </span>
          )}
        </div>
        {newSubmissions.length === 0 ? (
          <p className="text-sm sm:text-base text-gray-600">No new submissions available.</p>
        ) : (
          <div className="space-y-3">
            {newSubmissions.map((submission) => (
              <div 
                key={submission.id} 
                className="bg-gradient-to-r from-white to-blue-50 rounded-xl p-3 sm:p-4 border-2 border-blue-300 shadow-md hover:shadow-lg transition-all duration-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:scale-[1.01]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon icon="heroicons:sparkles" className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
                    <p className="font-bold text-sm sm:text-base text-gray-900 truncate">
                      {submission.first_name} {submission.last_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700">
                    <Icon icon="heroicons:calendar-days" className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                    <span className="font-medium">
                      {formatDate(submission.appointment_date)} at {formatTime(submission.appointment_time, submission.appointment_date, submission.timezone)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={() => navigate(`/submission/${submission.id}`)}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm bg-white text-gray-700 rounded-lg hover:bg-gray-100 border-2 border-gray-300 font-semibold transition-all hover:scale-105 active:scale-95 shadow-sm"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleAcceptSubmission(submission.id)}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-bold shadow-md hover:shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center gap-1"
                  >
                    <Icon icon="heroicons:check-circle" className="w-4 h-4" />
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Submissions Table with Filters */}
      <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200 overflow-hidden">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">All Submissions</h2>
        
        {/* Filters */}
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Search</label>
            <div className="relative">
              <Icon icon="heroicons:magnifying-glass" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
                placeholder="Search by name or email..."
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl overflow-hidden">
          <div className="overflow-x-auto w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full" style={{ minWidth: '640px' }}>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">Client</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">Appointment</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">Status</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 hidden sm:table-cell whitespace-nowrap">Created</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-600">
                      No submissions found
                    </td>
                  </tr>
                ) : (
                  paginatedSubmissions.map((submission) => (
                    <tr 
                      key={submission.id} 
                      onClick={() => navigate(`/submission/${submission.id}`)}
                      className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                        {submission.first_name} {submission.last_name}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                        {submission.appointment_date ? (
                          <>
                            <div>{formatDate(submission.appointment_date)}</div>
                            <div className="text-gray-500 text-[10px] sm:text-xs">{formatTime(submission.appointment_time, submission.appointment_date, submission.timezone)}</div>
                          </>
                        ) : 'N/A'}
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        {getStatusBadge(submission.status)}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-600 hidden sm:table-cell whitespace-nowrap">
                        {formatDate(submission.created_at)}
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/submission/${submission.id}`);
                          }}
                          className="text-xs sm:text-sm text-black hover:underline"
                        >
                          View
                        </button>
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
              Showing {startIndex + 1} to {Math.min(endIndex, filteredSubmissions.length)} of {filteredSubmissions.length} submissions
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

      {/* Payouts */}
      <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200 overflow-hidden">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Recent Payouts</h2>
        {payouts.length === 0 ? (
          <p className="text-sm sm:text-base text-gray-600">No payouts received yet.</p>
        ) : (
          <div>
            <div className="bg-white rounded-xl overflow-hidden">
              <div className="overflow-x-auto w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
                <table className="w-full" style={{ minWidth: '400px' }}>
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">Date</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">Amount</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.slice(0, 10).map((payout) => (
                      <tr key={payout.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900 whitespace-nowrap">{formatDate(payout.payment_date)}</td>
                        <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">{formatCurrency(payout.payment_amount)}</td>
                        <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-600">{payout.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
