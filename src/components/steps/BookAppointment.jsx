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
          <Icon icon="heroicons:globe-alt" className="w-5 h-5 mr-2" />
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

      {/* Calendar */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <div className="flex space-x-2">
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
        <div className="grid grid-cols-7 gap-2 mb-2">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
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
                className={`aspect-square p-2 rounded-lg text-sm font-medium transition-all ${
                  disabled
                    ? 'text-gray-300 cursor-not-allowed'
                    : selected
                    ? 'bg-black text-white shadow-lg scale-110'
                    : today
                    ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    : 'text-gray-700 hover:bg-gray-100 hover:scale-105'
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
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Icon icon="heroicons:clock" className="w-5 h-5 mr-2" />
            Available Time Slots
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {timeSlots.map((slot) => (
              <button
                key={slot.value}
                type="button"
                onClick={() => handleTimeClick(slot.value)}
                className={`py-3 px-2 rounded-lg text-sm font-medium transition-all ${
                  selectedTime === slot.value
                    ? 'bg-black text-white shadow-lg scale-105'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:scale-105'
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={prevStep}
          className="px-8 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-full hover:bg-gray-50 transition-all hover:scale-105 active:scale-95"
        >
          Back
        </button>
        <button
          type="button"
          onClick={nextStep}
          disabled={!selectedDate || !selectedTime}
          className="px-8 py-3 bg-black text-white font-semibold rounded-full hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default BookAppointment;
