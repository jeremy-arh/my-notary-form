import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, isToday, startOfDay, endOfDay, addDays, subDays, addWeeks, subWeeks } from 'date-fns';

const Submissions = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'calendar'
  const [calendarView, setCalendarView] = useState('month'); // 'day', 'week', or 'month'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });
  const [notaryFilter, setNotaryFilter] = useState('all');
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
  }, [submissions, searchTerm, statusFilter, dateFilter, notaryFilter]);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('submission')
        .select(`
          *,
          notary:assigned_notary_id(id, full_name, email, timezone)
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

    // Notary filter
    if (notaryFilter !== 'all') {
      filtered = filtered.filter(s => s.assigned_notary_id === notaryFilter);
    }

    // Date filter
    if (dateFilter.startDate) {
      const startDate = parseISO(dateFilter.startDate);
      filtered = filtered.filter(s => {
        if (!s.appointment_date) return false;
        const aptDate = parseISO(s.appointment_date);
        return aptDate >= startOfDay(startDate);
      });
    }

    if (dateFilter.endDate) {
      const endDate = parseISO(dateFilter.endDate);
      filtered = filtered.filter(s => {
        if (!s.appointment_date) return false;
        const aptDate = parseISO(s.appointment_date);
        return aptDate <= endOfDay(endDate);
      });
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.first_name?.toLowerCase().includes(searchLower) ||
        s.last_name?.toLowerCase().includes(searchLower) ||
        s.email?.toLowerCase().includes(searchLower) ||
        s.id?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredSubmissions(filtered);
  };

  // Calendar helper functions
  const getAppointmentsForDay = (date) => {
    return filteredSubmissions.filter(s => {
      if (!s.appointment_date) return false;
      const aptDate = parseISO(s.appointment_date);
      return isSameDay(aptDate, date);
    });
  };

  const getAppointmentsForWeek = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return weekDays.map(day => {
      const dayAppointments = filteredSubmissions.filter(s => {
        if (!s.appointment_date) return false;
        const aptDate = parseISO(s.appointment_date);
        return isSameDay(aptDate, day);
      });
      return { date: day, appointments: dayAppointments };
    });
  };

  const getAppointmentsForMonth = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return monthDays.map(day => {
      const dayAppointments = filteredSubmissions.filter(s => {
        if (!s.appointment_date) return false;
        const aptDate = parseISO(s.appointment_date);
        return isSameDay(aptDate, day);
      });
      return { date: day, appointments: dayAppointments };
    });
  };

  const navigateDate = (direction) => {
    if (calendarView === 'day') {
      setCurrentDate(prev => direction === 'next' ? addDays(prev, 1) : subDays(prev, 1));
    } else if (calendarView === 'week') {
      setCurrentDate(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
    } else if (calendarView === 'month') {
      setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDateRangeLabel = () => {
    if (calendarView === 'day') {
      return format(currentDate, 'EEEE, MMMM d, yyyy');
    } else if (calendarView === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    } else {
      return format(currentDate, 'MMMM yyyy');
    }
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

      // Send email to client about notary assignment
      try {
        // Get client information
        const { data: clientData, error: clientError } = await supabase
          .from('client')
          .select('email, first_name, last_name')
          .eq('id', selectedSubmissionForAssign.client_id)
          .single();

        // Get notary information
        const { data: notaryData, error: notaryError } = await supabase
          .from('notary')
          .select('full_name, name')
          .eq('id', selectedNotaryId)
          .single();

        if (!clientError && clientData && clientData.email && !notaryError && notaryData) {
          const clientName = `${clientData.first_name || ''} ${clientData.last_name || ''}`.trim() || 'Client';
          const notaryName = notaryData.full_name || notaryData.name || 'Notary';
          const submissionNumber = selectedSubmissionForAssign.id.substring(0, 8);

          const { sendTransactionalEmail } = await import('../../utils/sendTransactionalEmail');
          await sendTransactionalEmail(supabase, {
            email_type: 'notary_assigned',
            recipient_email: clientData.email,
            recipient_name: clientName,
            recipient_type: 'client',
            data: {
              submission_id: selectedSubmissionForAssign.id,
              submission_number: submissionNumber,
              notary_name: notaryName
            }
          });
        }
      } catch (emailError) {
        console.error('Error sending notary assignment email:', emailError);
        // Don't block the assignment if email fails
      }

      toast.success('Notary assigned successfully!');
      setIsAssignModalOpen(false);
      setSelectedSubmissionForAssign(null);
      setSelectedNotaryId('');
      await fetchSubmissions();
    } catch (error) {
      console.error('Error assigning notary:', error);
      toast.error(`Error: ${error.message}`);
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

      toast.success('Notary removed successfully!');
      setIsAssignModalOpen(false);
      setSelectedSubmissionForAssign(null);
      setSelectedNotaryId('');
      await fetchSubmissions();
    } catch (error) {
      console.error('Error removing notary:', error);
      toast.error(`Error: ${error.message}`);
    }
  };

  const handleCreatePayout = async () => {
    if (!selectedSubmissionForPayout || !payoutFormData.payment_amount || !payoutFormData.payment_date) {
      toast.warning('Please fill in all required fields');
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

      toast.success('Payout created successfully!');
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
      toast.error(`Error: ${error.message}`);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time in 12-hour format (AM/PM)
  const formatTime12h = (timeString) => {
    if (!timeString || timeString === 'N/A') return 'N/A';
    try {
      const [hours, minutes] = timeString.split(':').map(Number);
      const hour = parseInt(hours);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
    } catch (error) {
      return timeString;
    }
  };

  // Convert time from Florida/Eastern Time to another timezone
  const convertTimeFromFlorida = (time, date, targetTimezone) => {
    if (!time || !date || !targetTimezone) return time;
    
    try {
      const floridaTimezone = 'America/New_York';
      
      // Convert UTC offset to IANA timezone if needed
      let targetTz = targetTimezone;
      if (targetTimezone.startsWith('UTC')) {
        const offsetMatch = targetTimezone.match(/UTC([+-])(\d+)(?::(\d+))?/);
        if (offsetMatch) {
          const sign = offsetMatch[1] === '+' ? 1 : -1;
          const hours = parseInt(offsetMatch[2]);
          const minutes = parseInt(offsetMatch[3] || '0');
          const offsetMinutes = sign * (hours * 60 + minutes);
          
          // Map common UTC offsets to IANA timezones
          if (offsetMinutes === -300) targetTz = 'America/New_York';
          else if (offsetMinutes === -240) targetTz = 'America/New_York';
          else if (offsetMinutes === 60) targetTz = 'Europe/Paris';
          else if (offsetMinutes === 0) targetTz = 'Europe/London';
          else if (offsetMinutes === 120) targetTz = 'Europe/Berlin';
          else targetTz = 'UTC';
        }
      }
      
      const [hours, minutes] = time.split(':').map(Number);
      const dateTimeString = `${date}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
      const tempDate = new Date(dateTimeString);
      
      // Format in Florida timezone to see what UTC time it represents
      const floridaFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: floridaTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      
      const floridaParts = floridaFormatter.formatToParts(tempDate);
      const floridaHour = parseInt(floridaParts.find(p => p.type === 'hour').value);
      const floridaMinute = parseInt(floridaParts.find(p => p.type === 'minute').value);
      
      // Calculate difference and adjust
      const desiredMinutes = hours * 60 + minutes;
      const actualMinutes = floridaHour * 60 + floridaMinute;
      const diffMinutes = desiredMinutes - actualMinutes;
      
      const utcTimestamp = tempDate.getTime() + diffMinutes * 60 * 1000;
      const adjustedDate = new Date(utcTimestamp);
      
      // Format in target timezone with 12-hour format (AM/PM)
      const targetFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: targetTz,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      const formattedTime = targetFormatter.format(adjustedDate);
      
      // Extract time parts (format: "H:MM AM/PM" or "HH:MM AM/PM")
      const timeMatch = formattedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (timeMatch) {
        return `${timeMatch[1]}:${timeMatch[2]} ${timeMatch[3]}`;
      }
      
      // Fallback to 24-hour format if parsing fails
      const targetParts = targetFormatter.formatToParts(adjustedDate);
      const targetHour = parseInt(targetParts.find(p => p.type === 'hour').value);
      const targetMinute = targetParts.find(p => p.type === 'minute').value;
      const period = targetHour >= 12 ? 'PM' : 'AM';
      const displayHour = targetHour > 12 ? targetHour - 12 : targetHour === 0 ? 12 : targetHour;
      return `${displayHour}:${targetMinute} ${period}`;
    } catch (error) {
      console.error('Error converting time:', error);
      return time;
    }
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
        <div className="bg-[#F3F4F6] rounded-xl p-4 border border-gray-200">
          <div className="flex flex-wrap items-end gap-3">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                Search
              </label>
              <div className="relative">
                <Icon icon="heroicons:magnifying-glass" className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-all text-sm"
                  placeholder="Search by name, email or submission ID..."
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="min-w-[150px]">
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-all text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="pending_payment">Pending Payment</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Notary Filter */}
            <div className="min-w-[150px]">
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                Notary
              </label>
              <select
                value={notaryFilter}
                onChange={(e) => setNotaryFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-all text-sm"
              >
                <option value="all">All Notaries</option>
                {notaries.map((notary) => (
                  <option key={notary.id} value={notary.id}>
                    {notary.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date Filter */}
            <div className="min-w-[140px]">
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-all text-sm"
              />
            </div>

            {/* End Date Filter */}
            <div className="min-w-[140px]">
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-all text-sm"
              />
            </div>

            {/* Clear Filters */}
            <div>
              <button
                onClick={() => {
                  setDateFilter({ startDate: '', endDate: '' });
                  setStatusFilter('all');
                  setNotaryFilter('all');
                  setSearchTerm('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* View Mode Toggle and Calendar Controls */}
        <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold text-gray-900">Submissions</h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex gap-2 bg-white rounded-lg p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    viewMode === 'table' ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Table
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    viewMode === 'calendar' ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Calendar
                </button>
              </div>
              
              {viewMode === 'calendar' && (
                <>
                  {/* Calendar View Toggle (Day/Week/Month) */}
                  <div className="flex gap-2 bg-white rounded-lg p-1">
                    <button
                      onClick={() => setCalendarView('day')}
                      className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                        calendarView === 'day' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Day
                    </button>
                    <button
                      onClick={() => setCalendarView('week')}
                      className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                        calendarView === 'week' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Week
                    </button>
                    <button
                      onClick={() => setCalendarView('month')}
                      className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                        calendarView === 'month' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Month
                    </button>
                  </div>

                  {/* Date Navigation */}
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => navigateDate('prev')}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Icon icon="heroicons:chevron-left" className="w-5 h-5" />
                    </button>
                    <button
                      onClick={goToToday}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Today
                    </button>
                    <span className="font-semibold text-base text-gray-900 min-w-[200px] text-center">
                      {getDateRangeLabel()}
                    </span>
                    <button
                      onClick={() => navigateDate('next')}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Icon icon="heroicons:chevron-right" className="w-5 h-5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Table View */}
        {viewMode === 'table' && (
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
                        {submission.appointment_date ? (
                          <div>
                            <div>{formatDate(submission.appointment_date)}</div>
                            {submission.appointment_time && (
                              <div className="text-xs text-gray-500 mt-1">
                                <div>Florida: {formatTime12h(submission.appointment_time)}</div>
                                {submission.notary?.timezone && (
                                  <div>Notary ({submission.notary.timezone}): {convertTimeFromFlorida(submission.appointment_time, submission.appointment_date, submission.notary.timezone)}</div>
                                )}
                                {submission.timezone && (
                                  <div>Client ({submission.timezone}): {convertTimeFromFlorida(submission.appointment_time, submission.appointment_date, submission.timezone)}</div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : 'N/A'}
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

          {/* Pagination */}
          {(() => {
            const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            
            if (totalPages <= 1) return null;
            
            return (
              <div className="flex items-center justify-between mt-4 p-6">
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
        )}

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
            {calendarView === 'day' ? (
              <div className="bg-white rounded-xl overflow-hidden">
                <div className="border-b border-gray-200 p-4">
                  <div className="text-xl font-semibold text-gray-900 mb-4">
                    {format(currentDate, 'EEEE, MMMM d, yyyy')}
                  </div>
                  <div className="space-y-2">
                    {(() => {
                      const dayAppointments = getAppointmentsForDay(currentDate);
                      if (dayAppointments.length === 0) {
                        return (
                          <div className="text-center py-8 text-sm text-gray-600">
                            No appointments scheduled for this day
                          </div>
                        );
                      }
                      return dayAppointments.map((submission) => {
                        const statusColors = {
                          pending: 'bg-yellow-100 border-yellow-300 text-yellow-900',
                          confirmed: 'bg-green-100 border-green-300 text-green-900',
                          completed: 'bg-purple-100 border-purple-300 text-purple-900',
                          in_progress: 'bg-blue-100 border-blue-300 text-blue-900',
                          cancelled: 'bg-red-100 border-red-300 text-red-900'
                        };
                        const colorClass = statusColors[submission.status] || 'bg-gray-100 border-gray-300 text-gray-900';
                        return (
                          <div
                            key={submission.id}
                            className={`${colorClass} border-2 rounded-lg p-4 cursor-pointer hover:opacity-80 transition-opacity`}
                            onClick={() => navigate(`/submission/${submission.id}`)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-semibold text-base mb-1">
                                  {formatTime12h(submission.appointment_time)}
                                </div>
                                <div className="text-sm">
                                  {submission.first_name} {submission.last_name}
                                </div>
                                {submission.notary && (
                                  <div className="text-xs text-gray-600 mt-1">
                                    Notary: {submission.notary.full_name}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(submission.status)}
                                <Icon icon="heroicons:chevron-right" className="w-5 h-5" />
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            ) : calendarView === 'week' ? (
              <div className="bg-white rounded-xl overflow-hidden">
                <div className="grid grid-cols-7 border-b border-gray-200">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-3 text-center text-sm font-semibold text-gray-700 border-r border-gray-200 last:border-r-0">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {getAppointmentsForWeek().map((dayData, idx) => {
                    const { date, appointments } = dayData;
                    const isTodayDate = isToday(date);
                    
                    return (
                      <div
                        key={idx}
                        className={`min-h-[300px] p-3 border-r border-b border-gray-200 last:border-r-0 ${
                          isTodayDate ? 'bg-blue-50' : 'bg-white'
                        }`}
                      >
                        <div className={`text-sm font-semibold mb-2 ${isTodayDate ? 'text-blue-900' : 'text-gray-900'}`}>
                          {format(date, 'd')}
                        </div>
                        <div className="space-y-2">
                          {appointments.map((submission) => {
                            const statusColors = {
                              pending: 'bg-yellow-500 text-yellow-900',
                              confirmed: 'bg-green-500 text-white',
                              completed: 'bg-purple-500 text-white',
                              in_progress: 'bg-blue-500 text-white',
                              cancelled: 'bg-red-500 text-white'
                            };
                            const colorClass = statusColors[submission.status] || 'bg-gray-500 text-white';
                            return (
                              <div
                                key={submission.id}
                                className={`text-xs ${colorClass} p-1.5 rounded cursor-pointer hover:opacity-80 transition-opacity`}
                                onClick={() => navigate(`/submission/${submission.id}`)}
                                title={`${formatTime12h(submission.appointment_time)} - ${submission.first_name} ${submission.last_name}`}
                              >
                                <div className="font-semibold">{formatTime12h(submission.appointment_time)}</div>
                                <div className="truncate">{submission.first_name}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl overflow-hidden">
                <div className="grid grid-cols-7 border-b border-gray-200">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-3 text-center text-sm font-semibold text-gray-700 border-r border-gray-200 last:border-r-0">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {(() => {
                    const monthDays = getAppointmentsForMonth();
                    const weekStart = startOfWeek(monthDays[0].date, { weekStartsOn: 0 });
                    const weekEnd = endOfWeek(monthDays[monthDays.length - 1].date, { weekStartsOn: 0 });
                    const calendarDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
                    
                    return calendarDays.map((day, idx) => {
                      const dayData = monthDays.find(d => isSameDay(d.date, day));
                      const appointments = dayData?.appointments || [];
                      const isCurrentMonth = isSameMonth(day, currentDate);
                      const isTodayDate = isToday(day);
                      
                      return (
                        <div
                          key={idx}
                          className={`min-h-[100px] p-2 border-r border-b border-gray-200 last:border-r-0 ${
                            !isCurrentMonth ? 'bg-gray-50' : isTodayDate ? 'bg-blue-50' : 'bg-white'
                          }`}
                        >
                          <div className={`text-sm font-semibold mb-1 ${
                            isCurrentMonth ? (isTodayDate ? 'text-blue-900' : 'text-gray-900') : 'text-gray-400'
                          }`}>
                            {format(day, 'd')}
                          </div>
                          <div className="space-y-1">
                            {appointments.slice(0, 2).map((submission) => {
                              const statusColors = {
                                pending: 'bg-yellow-500 text-yellow-900',
                                confirmed: 'bg-green-500 text-white',
                                completed: 'bg-purple-500 text-white',
                                in_progress: 'bg-blue-500 text-white',
                                cancelled: 'bg-red-500 text-white'
                              };
                              const colorClass = statusColors[submission.status] || 'bg-gray-500 text-white';
                              return (
                                <div
                                  key={submission.id}
                                  className={`text-[10px] ${colorClass} p-1 rounded cursor-pointer hover:opacity-80 transition-opacity truncate`}
                                  onClick={() => navigate(`/submission/${submission.id}`)}
                                  title={`${formatTime12h(submission.appointment_time)} - ${submission.first_name}`}
                                >
                                  {formatTime12h(submission.appointment_time)}
                                </div>
                              );
                            })}
                            {appointments.length > 2 && (
                              <div className="text-[10px] text-gray-600">
                                +{appointments.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
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
