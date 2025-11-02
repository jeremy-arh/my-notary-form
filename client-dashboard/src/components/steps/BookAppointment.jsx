import { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';

const BookAppointment = ({ formData, updateFormData, nextStep, prevStep }) => {
  const [selectedDate, setSelectedDate] = useState(formData.appointmentDate || '');
  const [selectedTime, setSelectedTime] = useState(formData.appointmentTime || '');
  const [timezone, setTimezone] = useState(formData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const timeSlotsRef = useRef(null);

  // Always use 12-hour format (AM/PM) in English
  const use12HourFormat = true;

  // Common timezones
  const timezones = [
    { value: 'America/New_York', label: 'Eastern Time (ET)', offset: 'UTC-5' },
    { value: 'America/Chicago', label: 'Central Time (CT)', offset: 'UTC-6' },
    { value: 'America/Denver', label: 'Mountain Time (MT)', offset: 'UTC-7' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', offset: 'UTC-8' },
    { value: 'America/Toronto', label: 'Toronto (ET)', offset: 'UTC-5' },
    { value: 'America/Vancouver', label: 'Vancouver (PT)', offset: 'UTC-8' },
    { value: 'America/Montreal', label: 'Montreal (ET)', offset: 'UTC-5' },
    { value: 'Europe/London', label: 'London (GMT)', offset: 'UTC+0' },
    { value: 'Europe/Paris', label: 'Paris (CET)', offset: 'UTC+1' },
  ];

  // Generate time slots - Base hours are 9 AM to 5 PM Eastern Time
  // Convert to selected timezone
  const generateTimeSlots = () => {
    const slots = [];
    const baseTimezone = 'America/New_York'; // Base timezone (Eastern Time)

    // Create a reference date (we'll use today's date)
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    for (let hour = 9; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        // Create a date in Eastern Time
        const dateString = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;

        // Parse as Eastern Time
        const easternDate = new Date(dateString + '-05:00'); // EST offset (approximate)

        // Convert to selected timezone by getting the offset difference
        const easternOffset = 5 * 60; // Eastern Time is UTC-5 (in minutes)

        // Get the offset for the selected timezone (approximate based on common timezones)
        const timezoneOffsets = {
          'America/New_York': 5 * 60,    // UTC-5
          'America/Chicago': 6 * 60,     // UTC-6
          'America/Denver': 7 * 60,      // UTC-7
          'America/Los_Angeles': 8 * 60, // UTC-8
          'America/Toronto': 5 * 60,     // UTC-5
          'America/Vancouver': 8 * 60,   // UTC-8
          'America/Montreal': 5 * 60,    // UTC-5
          'Europe/London': -0 * 60,      // UTC+0
          'Europe/Paris': -1 * 60,       // UTC+1
        };

        const selectedOffset = timezoneOffsets[timezone] || easternOffset;
        const offsetDiff = easternOffset - selectedOffset;

        // Calculate the converted hour
        let convertedHour = hour - Math.floor(offsetDiff / 60);
        let convertedMinute = minute;

        // Handle day overflow
        if (convertedHour < 0) {
          convertedHour += 24;
        } else if (convertedHour >= 24) {
          convertedHour -= 24;
        }

        // Store the time in 24-hour format for the value
        const time = `${convertedHour.toString().padStart(2, '0')}:${convertedMinute.toString().padStart(2, '0')}`;

        // Display in 12-hour AM/PM format
        const period = convertedHour >= 12 ? 'PM' : 'AM';
        const displayHour = convertedHour > 12 ? convertedHour - 12 : convertedHour === 0 ? 12 : convertedHour;
        const displayTime = `${displayHour}:${convertedMinute.toString().padStart(2, '0')} ${period}`;

        slots.push({ value: time, label: displayTime });
      }
    }
    return slots;
  };

  const [timeSlots, setTimeSlots] = useState(generateTimeSlots());

  // Regenerate time slots when timezone changes
  useEffect(() => {
    setTimeSlots(generateTimeSlots());
  }, [timezone]);

  // Generate calendar days for current month
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState([]);

  useEffect(() => {
    generateCalendar();
  }, [currentMonth]);

  const generateCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);

    const firstDayOfWeek = firstDay.getDay();
    const lastDate = lastDay.getDate();
    const prevLastDate = prevLastDay.getDate();

    const days = [];

    // Previous month days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevLastDate - i),
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let i = 1; i <= lastDate; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    // Next month days to complete the grid
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }

    setCalendarDays(days);
  };

  const handleDateClick = (date) => {
    const formattedDate = date.toISOString().split('T')[0];
    setSelectedDate(formattedDate);
    updateFormData({ appointmentDate: formattedDate });

    // Scroll to time slots on mobile
    if (window.innerWidth < 1024 && timeSlotsRef.current) {
      setTimeout(() => {
        timeSlotsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleTimeClick = (time) => {
    setSelectedTime(time);
    updateFormData({ appointmentTime: time });
  };

  const handleTimezoneChange = (tz) => {
    setTimezone(tz);
    updateFormData({ timezone: tz });
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isSelected = (date) => {
    if (!selectedDate) return false;
    const selected = new Date(selectedDate + 'T00:00:00');
    return date.toDateString() === selected.toDateString();
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <>
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-6 md:pt-10 pb-44 lg:pb-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Book Your Appointment
            </h2>
            <p className="text-gray-600">
              Select a date and time that works best for you
            </p>
          </div>

      {/* Timezone Selector */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center">
          <Icon icon="heroicons:globe-alt" className="w-5 h-5 mr-2 text-gray-600" />
          Your Timezone
        </label>
        <select
          value={timezone}
          onChange={(e) => handleTimezoneChange(e.target.value)}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
        >
          {timezones.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label} ({tz.offset})
            </option>
          ))}
        </select>
      </div>

      {/* Calendar and Time Slots Row */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Calendar */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 lg:w-96 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <div className="flex space-x-1">
              <button
                type="button"
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon icon="heroicons:chevron-left" className="w-5 h-5 text-gray-600" />
              </button>
              <button
                type="button"
                onClick={goToNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon icon="heroicons:chevron-right" className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-gray-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const disabled = !day.isCurrentMonth || isPast(day.date);
              const selected = isSelected(day.date);
              const today = isToday(day.date);

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => !disabled && handleDateClick(day.date)}
                  disabled={disabled}
                  className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                    disabled
                      ? 'text-gray-300 cursor-not-allowed'
                      : selected
                      ? 'bg-black text-white shadow-md'
                      : today
                      ? 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {day.date.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Slots */}
        <div ref={timeSlotsRef} className="bg-white rounded-2xl p-4 border border-gray-200 flex-1">
          <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
            <Icon icon="heroicons:clock" className="w-4 h-4 mr-2 text-gray-600" />
            Available Time Slots
          </h3>
          {!selectedDate && (
            <p className="text-sm text-gray-500 italic mb-3">
              Please select a date first to choose a time slot
            </p>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {timeSlots.map((slot) => (
              <button
                key={slot.value}
                type="button"
                onClick={() => selectedDate && handleTimeClick(slot.value)}
                disabled={!selectedDate}
                className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                  !selectedDate
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : selectedTime === slot.value
                    ? 'bg-black text-white shadow-md'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>
      </div>
        </div>
      </div>

      {/* Fixed Navigation - Mobile Fixed at bottom-[52px], Desktop Relative */}
      <div className="flex-shrink-0 lg:border-t lg:border-gray-300 bg-[#F3F4F6] fixed lg:relative bottom-[52px] lg:bottom-auto left-0 right-0 z-50 lg:z-auto">
        <div className="px-4 py-4 flex justify-between">
          <button
            type="button"
            onClick={prevStep}
            className="btn-glassy-secondary px-6 md:px-8 py-3 text-gray-700 font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
          >
            Back
          </button>
          <button
            type="button"
            onClick={nextStep}
            disabled={!selectedDate || !selectedTime}
            className="btn-glassy px-6 md:px-8 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            Continue
          </button>
        </div>
      </div>
    </>
  );
};

export default BookAppointment;
