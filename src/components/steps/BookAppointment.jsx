import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

const BookAppointment = ({ formData, updateFormData, nextStep, prevStep }) => {
  const [selectedDate, setSelectedDate] = useState(formData.appointmentDate || '');
  const [selectedTime, setSelectedTime] = useState(formData.appointmentTime || '');
  const [timezone, setTimezone] = useState(formData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);

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

  // Generate time slots (9 AM to 5 PM, 30-minute intervals)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        const displayTime = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
        slots.push({ value: time, label: displayTime });
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

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
      <div className="flex-1 overflow-y-auto px-3 md:px-10 pt-6 md:pt-10 pb-24 lg:pb-6">
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
        <div className="bg-white rounded-2xl p-3 border border-gray-200 lg:w-80 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <div className="flex space-x-1">
              <button
                type="button"
                onClick={goToPreviousMonth}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon icon="heroicons:chevron-left" className="w-3.5 h-3.5 text-gray-600" />
              </button>
              <button
                type="button"
                onClick={goToNextMonth}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon icon="heroicons:chevron-right" className="w-3.5 h-3.5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 gap-0.5 mb-0.5">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-[10px] font-semibold text-gray-500 py-0.5">
                {day.substring(0, 1)}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0.5">
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
                  className={`aspect-square flex items-center justify-center rounded text-[11px] font-medium transition-all ${
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
        {selectedDate && (
          <div className="bg-white rounded-2xl p-4 border border-gray-200 flex-1">
            <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
              <Icon icon="heroicons:clock" className="w-4 h-4 mr-2 text-gray-600" />
              Available Time Slots
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {timeSlots.map((slot) => (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() => handleTimeClick(slot.value)}
                  className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                    selectedTime === slot.value
                      ? 'bg-black text-white shadow-md'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
        </div>
      </div>

      {/* Fixed Navigation */}
      <div className="flex-shrink-0 px-3 md:px-10 py-4 border-t border-gray-300 bg-[#F3F4F6] fixed lg:relative bottom-16 lg:bottom-auto left-0 right-0 z-40">
        <div className="flex justify-between">
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
