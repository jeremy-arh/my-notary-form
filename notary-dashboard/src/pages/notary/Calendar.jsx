import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, isToday } from 'date-fns';
import { convertTimeToNotaryTimezone } from '../../utils/timezoneConverter';

const Calendar = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notaryId, setNotaryId] = useState(null);
  const [notaryTimezone, setNotaryTimezone] = useState(null);
  const [notaryServiceIds, setNotaryServiceIds] = useState([]);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'table'
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [acceptedAppointments, setAcceptedAppointments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchNotaryInfo();
  }, []);

  useEffect(() => {
    if (notaryId !== null) {
      fetchAcceptedAppointments();
    }
  }, [notaryId, currentMonth]);

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

  const fetchAcceptedAppointments = async () => {
    if (!notaryId) return;
    
    try {
      setLoading(true);
      console.log('🔍 Fetching appointments for notary:', notaryId);
      
      // Get all submissions assigned to this notary with appointment dates
      // Include multiple statuses: confirmed, accepted, completed, in_progress
      let query = supabase
        .from('submission')
        .select(`
          id,
          first_name,
          last_name,
          appointment_date,
          appointment_time,
          timezone,
          status,
          created_at,
          submission_services(service_id)
        `)
        .eq('assigned_notary_id', notaryId)
        .in('status', ['confirmed', 'accepted', 'completed', 'in_progress'])
        .not('appointment_date', 'is', null)
        .not('appointment_time', 'is', null);

      const { data, error } = await query
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (error) {
        console.error('❌ Error fetching appointments:', error);
        throw error;
      }
      
      console.log(`✅ Found ${data?.length || 0} appointments in database`);
      
      // Don't filter by services - show all appointments assigned to this notary
      // The notary should see all their appointments regardless of service matching
      const appointments = (data || []).filter(sub => {
        // Ensure appointment_date and appointment_time exist
        return sub.appointment_date && sub.appointment_time;
      });
      
      // Remove duplicates
      const uniqueAppointments = [];
      const seenIds = new Set();
      appointments.forEach(apt => {
        if (!seenIds.has(apt.id)) {
          seenIds.add(apt.id);
          uniqueAppointments.push(apt);
        }
      });
      
      console.log(`✅ Processed ${uniqueAppointments.length} unique appointments`);
      setAcceptedAppointments(uniqueAppointments);
    } catch (error) {
      console.error('❌ Error fetching appointments:', error);
      setAcceptedAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const getAppointmentsForMonth = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return monthDays.map(day => {
      const dayAppointments = acceptedAppointments.filter(apt => {
        const aptDate = parseISO(apt.appointment_date);
        return isSameDay(aptDate, day);
      });
      return { date: day, appointments: dayAppointments };
    });
  };

  const formatDate = (dateString) => {
    return format(parseISO(dateString), 'MMM dd, yyyy');
  };

  const formatTime = (timeString, appointmentDate, clientTimezone) => {
    if (!notaryTimezone || !clientTimezone) {
      return timeString.substring(0, 5);
    }
    const convertedTime = convertTimeToNotaryTimezone(timeString, appointmentDate, clientTimezone, notaryTimezone);
    return convertedTime;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  const monthDays = getAppointmentsForMonth();
  const weekStart = startOfWeek(monthDays[0].date);
  const weekEnd = endOfWeek(monthDays[monthDays.length - 1].date);
  const calendarDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Pagination for table view
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAppointments = acceptedAppointments.slice(startIndex, endIndex);
  const totalPages = Math.ceil(acceptedAppointments.length / itemsPerPage);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Calendar</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
          View and manage your appointments
          {notaryTimezone && (
            <span className="ml-2 text-xs text-gray-500">(All times displayed in {notaryTimezone})</span>
          )}
        </p>
      </div>

      {/* Calendar/Table View */}
      <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Appointments</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="flex gap-2 bg-white rounded-lg p-1">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg transition-colors ${
                  viewMode === 'calendar' ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Calendar
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg transition-colors ${
                  viewMode === 'table' ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Table
              </button>
            </div>
            {viewMode === 'calendar' && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Icon icon="heroicons:chevron-left" className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <span className="font-semibold text-sm sm:text-base text-gray-900 min-w-[120px] sm:min-w-[150px] text-center">
                  {format(currentMonth, 'MMMM yyyy')}
                </span>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Icon icon="heroicons:chevron-right" className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {viewMode === 'calendar' ? (
          <div className="bg-white rounded-xl overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-200">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 sm:p-3 text-center text-xs sm:text-sm font-semibold text-gray-700 border-r border-gray-200 last:border-r-0">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                const dayData = monthDays.find(d => isSameDay(d.date, day));
                const appointments = dayData?.appointments || [];
                const isCurrentMonth = isSameMonth(day, currentMonth);
                
                return (
                  <div
                    key={idx}
                    className={`min-h-[60px] sm:min-h-[100px] p-1 sm:p-2 border-r border-b border-gray-200 last:border-r-0 ${
                      !isCurrentMonth ? 'bg-gray-50' : 'bg-white'
                    }`}
                  >
                    <div className={`text-xs sm:text-sm font-semibold mb-1 ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5 sm:space-y-1">
                      {appointments.slice(0, 1).map((apt) => {
                        const statusColors = {
                          pending: 'bg-yellow-500 text-yellow-900',
                          confirmed: 'bg-green-500 text-white',
                          completed: 'bg-purple-500 text-white',
                          cancelled: 'bg-red-500 text-white'
                        };
                        const colorClass = statusColors[apt.status] || 'bg-gray-500 text-white';
                        return (
                          <div
                            key={apt.id}
                            className={`text-[10px] sm:text-xs ${colorClass} p-0.5 sm:p-1 rounded cursor-pointer hover:opacity-80 transition-opacity truncate`}
                            onClick={() => navigate(`/submission/${apt.id}`)}
                            title={`${formatTime(apt.appointment_time, apt.appointment_date, apt.timezone)} - ${apt.first_name}`}
                          >
                            {formatTime(apt.appointment_time, apt.appointment_date, apt.timezone)}
                          </div>
                        );
                      })}
                      {appointments.length > 1 && (
                        <div className="text-[10px] sm:text-xs text-gray-600">
                          +{appointments.length - 1}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div>
            <div className="bg-white rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Date</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Time</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Client</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAppointments.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-600">
                          No appointments scheduled
                        </td>
                      </tr>
                    ) : (
                      paginatedAppointments.map((apt) => (
                        <tr key={apt.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900">{formatDate(apt.appointment_date)}</td>
                          <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900">{formatTime(apt.appointment_time, apt.appointment_date, apt.timezone)}</td>
                          <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900">{apt.first_name} {apt.last_name}</td>
                          <td className="px-3 sm:px-4 py-3">
                            {getStatusBadge(apt.status)}
                          </td>
                          <td className="px-3 sm:px-4 py-3">
                            <button
                              onClick={() => navigate(`/submission/${apt.id}`)}
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
                  Showing {startIndex + 1} to {Math.min(endIndex, acceptedAppointments.length)} of {acceptedAppointments.length} appointments
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
        )}
      </div>
    </div>
  );
};

export default Calendar;

