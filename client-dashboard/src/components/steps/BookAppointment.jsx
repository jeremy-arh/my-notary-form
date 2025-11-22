import { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';

const BookAppointment = ({ formData, updateFormData, nextStep, prevStep, handleContinueClick, getValidationErrorMessage }) => {
  const [selectedDate, setSelectedDate] = useState(formData.appointmentDate || '');
  const [selectedTime, setSelectedTime] = useState(formData.appointmentTime || '');
  const [isDetectingTimezone, setIsDetectingTimezone] = useState(true);
  const [timezoneSearchTerm, setTimezoneSearchTerm] = useState('');
  const [isTimezoneDropdownOpen, setIsTimezoneDropdownOpen] = useState(false);
  const timezoneDropdownRef = useRef(null);

  // Get default timezone - if formData has a UTC value, use it; otherwise default to UTC-5 (Eastern Time)
  const getDefaultTimezone = () => {
    if (formData.timezone && formData.timezone.startsWith('UTC')) {
      return formData.timezone;
    }
    return 'UTC-5'; // Default to Eastern Time
  };

  const [timezone, setTimezone] = useState(getDefaultTimezone());
  const timeSlotsRef = useRef(null);

  // Detect user timezone on mount
  useEffect(() => {
    const detectTimezone = async () => {
      try {
        setIsDetectingTimezone(true);
        
        // ALWAYS use browser's timezone first (most reliable and accurate)
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        console.log('🌍 Browser timezone detected:', browserTimezone);
        
        if (browserTimezone) {
          const utcOffset = convertIANAToUTCOffset(browserTimezone);
          console.log('📍 Converted to UTC offset:', utcOffset, 'from IANA:', browserTimezone);
          
          if (utcOffset) {
            // Always update, even if formData already has a timezone (to fix incorrect detections)
            setTimezone(utcOffset);
            updateFormData({ timezone: utcOffset });
            setIsDetectingTimezone(false);
            return;
          }
        }
        
        // Fallback: try IP-based detection only if browser timezone failed
        try {
          const response = await fetch('https://ipapi.co/json/');
          const data = await response.json();
          console.log('🌍 IP-based timezone detected:', data.timezone);
          
          if (data.timezone) {
            const utcOffset = convertIANAToUTCOffset(data.timezone);
            console.log('📍 Converted to UTC offset:', utcOffset);
            if (utcOffset) {
              setTimezone(utcOffset);
              updateFormData({ timezone: utcOffset });
            }
          }
        } catch (ipError) {
          console.error('Error detecting timezone from IP:', ipError);
        }
      } catch (error) {
        console.error('Error detecting timezone:', error);
      } finally {
        setIsDetectingTimezone(false);
      }
    };

    detectTimezone();
  }, []);

  // Convert IANA timezone identifier to UTC offset format
  const convertIANAToUTCOffset = (ianaTimezone) => {
    if (!ianaTimezone) {
      console.error('No timezone provided');
      return 'UTC+0';
    }
    
    try {
      // First, try the approximate mapping (fastest and most reliable for common timezones)
      const approximate = getApproximateUTCOffset(ianaTimezone);
      if (approximate) {
        console.log(`✅ Found timezone mapping: ${ianaTimezone} -> ${approximate}`);
        return approximate;
      }
      
      // If not found in mapping, calculate dynamically
      const now = new Date();
      
      // Get the time in the target timezone
      const tzString = now.toLocaleString('en-US', { 
        timeZone: ianaTimezone,
        timeZoneName: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      
      // Get the time in UTC
      const utcString = now.toLocaleString('en-US', { 
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      
      // Parse times (format: "HH:MM")
      const tzMatch = tzString.match(/(\d{1,2}):(\d{2})/);
      const utcMatch = utcString.match(/(\d{1,2}):(\d{2})/);
      
      if (tzMatch && utcMatch) {
        const tzHour = parseInt(tzMatch[1]);
        const tzMin = parseInt(tzMatch[2]);
        const utcHour = parseInt(utcMatch[1]);
        const utcMin = parseInt(utcMatch[2]);
        
        // Calculate offset in minutes
        const tzTotalMin = tzHour * 60 + tzMin;
        const utcTotalMin = utcHour * 60 + utcMin;
        let offsetMin = tzTotalMin - utcTotalMin;
        
        // Handle day wrap-around (if difference is more than 12 hours, assume opposite direction)
        if (offsetMin > 720) offsetMin -= 1440;
        if (offsetMin < -720) offsetMin += 1440;
        
        const offsetHours = offsetMin / 60;
        const sign = offsetHours >= 0 ? '+' : '-';
        const absHours = Math.abs(offsetHours);
        const hours = Math.floor(absHours);
        const minutes = Math.round((absHours - hours) * 60);
        
        if (hours === 0 && minutes === 0) {
          return 'UTC+0';
        } else if (minutes === 0) {
          return `UTC${sign}${hours}`;
        } else if (minutes === 30) {
          return `UTC${sign}${hours}:30`;
        } else if (minutes === 45) {
          return `UTC${sign}${hours}:45`;
        } else if (minutes === 15) {
          return `UTC${sign}${hours}:15`;
        }
      }
      
      // Final fallback
      return approximate || 'UTC+0';
    } catch (error) {
      console.error('Error converting IANA timezone:', error, 'for timezone:', ianaTimezone);
      // Fallback to approximate mapping
      return getApproximateUTCOffset(ianaTimezone) || 'UTC+0';
    }
  };

  // Get approximate UTC offset from IANA timezone (fallback)
  const getApproximateUTCOffset = (ianaTimezone) => {
    // Common timezone mappings
    const timezoneMap = {
      // Americas
      'America/New_York': 'UTC-5',
      'America/Chicago': 'UTC-6',
      'America/Denver': 'UTC-7',
      'America/Los_Angeles': 'UTC-8',
      'America/Phoenix': 'UTC-7',
      'America/Anchorage': 'UTC-9',
      'Pacific/Honolulu': 'UTC-10',
      'America/Toronto': 'UTC-5',
      'America/Mexico_City': 'UTC-6',
      'America/Sao_Paulo': 'UTC-3',
      'America/Buenos_Aires': 'UTC-3',
      // Europe
      'Europe/London': 'UTC+0',
      'Europe/Paris': 'UTC+1',
      'Europe/Berlin': 'UTC+1',
      'Europe/Rome': 'UTC+1',
      'Europe/Madrid': 'UTC+1',
      'Europe/Amsterdam': 'UTC+1',
      'Europe/Brussels': 'UTC+1',
      'Europe/Zurich': 'UTC+1',
      'Europe/Vienna': 'UTC+1',
      'Europe/Stockholm': 'UTC+1',
      'Europe/Oslo': 'UTC+1',
      'Europe/Copenhagen': 'UTC+1',
      'Europe/Helsinki': 'UTC+2',
      'Europe/Warsaw': 'UTC+1',
      'Europe/Prague': 'UTC+1',
      'Europe/Athens': 'UTC+2',
      'Europe/Dublin': 'UTC+0',
      'Europe/Luxembourg': 'UTC+1',
      'Europe/Istanbul': 'UTC+3',
      'Europe/Moscow': 'UTC+3',
      // Asia
      'Asia/Tokyo': 'UTC+9',
      'Asia/Seoul': 'UTC+9',
      'Asia/Shanghai': 'UTC+8',
      'Asia/Beijing': 'UTC+8',
      'Asia/Singapore': 'UTC+8',
      'Asia/Manila': 'UTC+8',
      'Asia/Hong_Kong': 'UTC+8',
      'Asia/Dubai': 'UTC+4',
      'Asia/Riyadh': 'UTC+3',
      'Asia/Jerusalem': 'UTC+2',
      'Asia/Kolkata': 'UTC+5:30',
      'Asia/Mumbai': 'UTC+5:30',
      'Asia/Dhaka': 'UTC+6',
      'Asia/Bangkok': 'UTC+7',
      'Asia/Jakarta': 'UTC+7',
      'Asia/Ho_Chi_Minh': 'UTC+7',
      // Oceania
      'Australia/Sydney': 'UTC+10',
      'Australia/Melbourne': 'UTC+10',
      'Australia/Adelaide': 'UTC+9:30',
      'Pacific/Auckland': 'UTC+12',
      // Africa
      'Africa/Cairo': 'UTC+2',
      'Africa/Johannesburg': 'UTC+2',
      'Africa/Lagos': 'UTC+1',
      'Africa/Nairobi': 'UTC+3',
    };
    
    // Direct lookup
    if (timezoneMap[ianaTimezone]) {
      return timezoneMap[ianaTimezone];
    }
    
    // Try partial match (e.g., "America/New_York" matches "America/")
    for (const [key, value] of Object.entries(timezoneMap)) {
      if (ianaTimezone.includes(key.split('/')[0])) {
        return value;
      }
    }
    
    // Default fallback
    return 'UTC+0';
  };

  // Always use 12-hour format (AM/PM) in English
  const use12HourFormat = true;

  // All UTC timezones from UTC-12 to UTC+14 with comprehensive labels
  // Based on https://www.donneesmondiales.com/fuseaux-horaires/
  const timezones = [
    { value: 'UTC-12', label: 'Baker Island Time (UTC-12)', offset: -12 },
    { value: 'UTC-11', label: 'Hawaii-Aleutian Standard Time - Hawaii, Midway (UTC-11)', offset: -11 },
    { value: 'UTC-10', label: 'Hawaii Standard Time - Honolulu (UTC-10)', offset: -10 },
    { value: 'UTC-9', label: 'Alaska Standard Time - Anchorage, Juneau (UTC-9)', offset: -9 },
    { value: 'UTC-8', label: 'Pacific Standard Time - Los Angeles, San Francisco, Vancouver, Tijuana (UTC-8)', offset: -8 },
    { value: 'UTC-7', label: 'Mountain Standard Time - Denver, Phoenix, Calgary, Chihuahua (UTC-7)', offset: -7 },
    { value: 'UTC-6', label: 'Central Standard Time - Chicago, Dallas, Mexico City, Guatemala, San Salvador, Tegucigalpa, Managua, San José, Belize (UTC-6)', offset: -6 },
    { value: 'UTC-5', label: 'Eastern Standard Time - New York, Miami, Toronto, Havana, Bogotá, Lima, Quito, Panama, Kingston, Port-au-Prince (UTC-5)', offset: -5 },
    { value: 'UTC-4', label: 'Atlantic Standard Time - Caracas, La Paz, Santiago, Puerto Rico, Santo Domingo, Port of Spain, Bridgetown, Castries, Roseau, St. George\'s, Kingstown, Basseterre, St. John\'s (Antigua), Charlotte Amalie, Road Town, The Valley, Oranjestad, Willemstad, Kralendijk, Philipsburg, Marigot, Gustavia, Pointe-à-Pitre, Fort-de-France, Roseau, Basseterre, Castries, Kingstown, St. George\'s, Bridgetown, Port of Spain, San Juan, Charlotte Amalie, Road Town, The Valley, Oranjestad, Willemstad, Kralendijk, Philipsburg, Marigot, Gustavia (UTC-4)', offset: -4 },
    { value: 'UTC-3:30', label: 'Newfoundland Standard Time - St. John\'s (UTC-3:30)', offset: -3.5 },
    { value: 'UTC-3', label: 'Brasília Time - São Paulo, Rio de Janeiro, Buenos Aires, Montevideo, Cayenne, Fortaleza, Recife, Salvador, Brasília (UTC-3)', offset: -3 },
    { value: 'UTC-2', label: 'Mid-Atlantic Time - Fernando de Noronha (UTC-2)', offset: -2 },
    { value: 'UTC-1', label: 'Azores Time - Ponta Delgada, Praia (UTC-1)', offset: -1 },
    { value: 'UTC+0', label: 'Greenwich Mean Time (GMT) - London, Dublin, Lisbon, Reykjavik, Accra, Casablanca, Monrovia, Dakar, Abidjan, Conakry, Bamako, Ouagadougou, Freetown, Lome, Cotonou, Niamey, Nouakchott, Banjul, Bissau, São Tomé, Praia (UTC+0)', offset: 0 },
    { value: 'UTC+1', label: 'Central European Time (CET) - Paris, Berlin, Rome, Madrid, Amsterdam, Brussels, Vienna, Stockholm, Warsaw, Prague, Budapest, Copenhagen, Oslo, Luxembourg, Algiers, Tunis, Lagos (UTC+1)', offset: 1 },
    { value: 'UTC+2', label: 'Eastern European Time (EET) - Athens, Helsinki, Bucharest, Sofia, Cairo, Jerusalem, Beirut, Damascus, Amman, Nicosia, Tallinn, Riga, Vilnius, Kiev, Harare, Lusaka, Maputo, Nairobi, Tripoli, Khartoum (UTC+2)', offset: 2 },
    { value: 'UTC+3', label: 'Moscow Time - Moscow, Istanbul, Riyadh, Kuwait, Baghdad, Doha, Manama, Muscat, Addis Ababa, Minsk, Kaliningrad (UTC+3)', offset: 3 },
    { value: 'UTC+3:30', label: 'Iran Standard Time - Tehran (UTC+3:30)', offset: 3.5 },
    { value: 'UTC+4', label: 'Gulf Standard Time - Dubai, Abu Dhabi, Muscat, Baku, Tbilisi, Yerevan, Samara, Port Louis, Victoria, Réunion, Mauritius (UTC+4)', offset: 4 },
    { value: 'UTC+4:30', label: 'Afghanistan Time - Kabul (UTC+4:30)', offset: 4.5 },
    { value: 'UTC+5', label: 'Pakistan Standard Time - Karachi, Lahore, Islamabad, Tashkent, Dushanbe, Ashgabat, Almaty (UTC+5)', offset: 5 },
    { value: 'UTC+5:30', label: 'India Standard Time - Mumbai, New Delhi, Kolkata, Chennai, Bangalore, Hyderabad, Pune, Ahmedabad, Jaipur, Lucknow (UTC+5:30)', offset: 5.5 },
    { value: 'UTC+5:45', label: 'Nepal Time - Kathmandu (UTC+5:45)', offset: 5.75 },
    { value: 'UTC+6', label: 'Bangladesh Standard Time - Dhaka, Chittagong, Khulna, Almaty, Shymkent (UTC+6)', offset: 6 },
    { value: 'UTC+6:30', label: 'Myanmar Time - Yangon, Mandalay, Naypyidaw (UTC+6:30)', offset: 6.5 },
    { value: 'UTC+7', label: 'Indochina Time - Bangkok, Jakarta, Hanoi, Ho Chi Minh City, Phnom Penh, Vientiane, Kuala Lumpur, Bandung, Surabaya (UTC+7)', offset: 7 },
    { value: 'UTC+8', label: 'China Standard Time - Beijing, Shanghai, Guangzhou, Shenzhen, Hong Kong, Macau, Taipei, Manila, Kuala Lumpur, Singapore, Perth, Ulaanbaatar (UTC+8)', offset: 8 },
    { value: 'UTC+8:45', label: 'Australian Central Western Time - Eucla, Border Village, Mundrabilla, Madura, Cocklebiddy, Norseman (UTC+8:45)', offset: 8.75 },
    { value: 'UTC+9', label: 'Japan Standard Time - Tokyo, Seoul, Pyongyang, Osaka, Kyoto, Yokohama, Nagoya, Sapporo, Fukuoka, Yakutsk, Vladivostok (UTC+9)', offset: 9 },
    { value: 'UTC+9:30', label: 'Australian Central Standard Time - Adelaide, Darwin, Alice Springs, Broken Hill (UTC+9:30)', offset: 9.5 },
    { value: 'UTC+10', label: 'Australian Eastern Standard Time - Sydney, Melbourne, Brisbane, Canberra, Gold Coast, Hobart, Port Moresby (UTC+10)', offset: 10 },
    { value: 'UTC+10:30', label: 'Lord Howe Standard Time - Lord Howe Island (UTC+10:30)', offset: 10.5 },
    { value: 'UTC+11', label: 'Solomon Islands Time - Nouméa, Port Vila, Honiara, Nadi, Suva, Magadan, Petropavlovsk-Kamchatsky (UTC+11)', offset: 11 },
    { value: 'UTC+12', label: 'New Zealand Standard Time - Auckland, Wellington, Christchurch, Hamilton, Suva, Nadi, Petropavlovsk-Kamchatsky, Anadyr (UTC+12)', offset: 12 },
    { value: 'UTC+12:45', label: 'Chatham Standard Time - Chatham Islands (UTC+12:45)', offset: 12.75 },
    { value: 'UTC+13', label: 'Tonga Time - Nuku\'alofa, Apia, Fakaofo, Atafu, Nukunonu (UTC+13)', offset: 13 },
    { value: 'UTC+14', label: 'Line Islands Time - Kiritimati, Tabuaeran, Teraina (UTC+14)', offset: 14 },
  ];

  // Generate time slots - 9 AM to 8 PM in NOTARY timezone (America/New_York, Eastern Time, UTC-5)
  // Always display 9h-20h regardless of user's timezone
  const generateTimeSlots = () => {
    const slots = [];

    // Generate slots from 9 AM to 8 PM (20:00) in NOTARY timezone
    // Display directly without conversion - always show 9h-20h
    for (let hour = 9; hour < 21; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        // Store the time in 24-hour format for the value (NOTARY timezone)
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

        // Display in 12-hour AM/PM format (directly in notary timezone - no conversion)
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        const displayTime = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;

        slots.push({ value: time, label: displayTime });
      }
    }
    return slots;
  };

  const [timeSlots, setTimeSlots] = useState(() => generateTimeSlots());

  // Time slots don't change with timezone - always 9h-20h in notary timezone

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
    // Check if date is today or in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date < tomorrow) {
      // Don't allow selection of today or past dates
      return;
    }

    // Format date in local timezone (not UTC) to avoid timezone offset issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    setSelectedDate(formattedDate);
    updateFormData({ appointmentDate: formattedDate });

    // Scroll to time slots on mobile and tablet
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
    setIsTimezoneDropdownOpen(false);
    setTimezoneSearchTerm('');
  };

  // Filter timezones based on search term
  const filteredTimezones = timezones.filter(tz =>
    tz.label.toLowerCase().includes(timezoneSearchTerm.toLowerCase()) ||
    tz.value.toLowerCase().includes(timezoneSearchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (timezoneDropdownRef.current && !timezoneDropdownRef.current.contains(event.target)) {
        setIsTimezoneDropdownOpen(false);
        setTimezoneSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date < tomorrow;
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
      {/* Scrollable Content - MOBILE LAYOUT for all sizes up to xl */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-3 xl:px-6 pt-3 sm:pt-4 xl:pt-8 pb-24 sm:pb-28 xl:pb-6" style={{ minHeight: 0 }}>
        <div className="space-y-3 sm:space-y-4 xl:space-y-6 max-w-full">
          {/* Title - Same as mobile until xl */}
          <div>
            <h2 className="text-lg sm:text-xl xl:text-3xl font-bold text-gray-900 mb-1 sm:mb-1.5 xl:mb-2">
              Book Your Appointment
            </h2>
            <p className="text-[10px] sm:text-xs xl:text-base text-gray-600">
              Select a date and time that works best for you
            </p>
          </div>

      {/* Timezone Selector - Same as mobile until xl */}
      <div className="bg-white rounded-lg sm:rounded-xl xl:rounded-2xl p-2.5 sm:p-3 xl:p-5 border border-gray-200 overflow-visible">
        <label className="block text-xs sm:text-sm xl:text-lg font-semibold text-gray-900 mb-1.5 sm:mb-2 xl:mb-3 flex items-center flex-wrap gap-1.5 sm:gap-2">
          <Icon icon="heroicons:globe-alt" className="w-3.5 h-3.5 sm:w-4 sm:h-4 xl:w-5 xl:h-5 text-gray-600 flex-shrink-0" />
          <span>Your Timezone</span>
          {isDetectingTimezone && (
            <span className="text-[10px] sm:text-xs xl:text-sm text-gray-500 flex items-center">
              <Icon icon="heroicons:arrow-path" className="w-2.5 h-2.5 sm:w-3 sm:h-3 xl:w-4 xl:h-4 mr-1 sm:mr-1.5 animate-spin" />
              Detecting...
            </span>
          )}
        </label>
        <div className="relative w-full" ref={timezoneDropdownRef}>
          <button
            type="button"
            onClick={() => !isDetectingTimezone && setIsTimezoneDropdownOpen(!isTimezoneDropdownOpen)}
            disabled={isDetectingTimezone}
            className={`w-full px-2.5 sm:px-3 xl:px-5 py-1.5 sm:py-2 xl:py-3 bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl cursor-pointer flex items-center justify-between gap-1.5 sm:gap-2 transition-all text-left ${
              isDetectingTimezone ? 'opacity-50 cursor-wait' : 'hover:border-gray-300'
            } ${isTimezoneDropdownOpen ? 'ring-2 ring-black border-black' : ''}`}
          >
            <span className="text-gray-900 flex-1 min-w-0 text-[10px] sm:text-xs xl:text-base truncate">
              {timezone}
            </span>
            <Icon 
              icon={isTimezoneDropdownOpen ? "heroicons:chevron-up" : "heroicons:chevron-down"} 
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 xl:w-5 xl:h-5 text-gray-500 flex-shrink-0 ml-1.5 sm:ml-2"
            />
          </button>
          
          {isTimezoneDropdownOpen && !isDetectingTimezone && (
            <div className="absolute z-50 w-full mt-1 sm:mt-1.5 md:mt-2 bg-white border-2 border-gray-200 rounded-lg sm:rounded-xl shadow-lg max-h-[60vh] sm:max-h-96 overflow-hidden" style={{ left: 0, right: 0 }}>
              {/* Search Input */}
              <div className="p-1.5 sm:p-2 md:p-3 border-b border-gray-200 sticky top-0 bg-white">
                <div className="relative">
                  <Icon icon="heroicons:magnifying-glass" className="absolute left-1.5 sm:left-2 md:left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 xl:w-5 xl:h-5 text-gray-400" />
                  <input
                    type="text"
                    value={timezoneSearchTerm}
                    onChange={(e) => setTimezoneSearchTerm(e.target.value)}
                    placeholder="Search timezone..."
                    className="w-full pl-6 sm:pl-7 md:pl-8 xl:pl-10 pr-1.5 sm:pr-2 md:pr-3 xl:pr-4 py-1 sm:py-1.5 md:py-1.5 xl:py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-all text-[10px] sm:text-xs md:text-sm"
                    autoFocus
                  />
                </div>
              </div>
              
              {/* Timezone List */}
              <div className="max-h-[50vh] sm:max-h-80 overflow-y-auto">
                {filteredTimezones.length === 0 ? (
                  <div className="p-1.5 sm:p-2 md:p-3 xl:p-4 text-center text-gray-500 text-[10px] sm:text-xs md:text-sm">
                    No timezone found matching "{timezoneSearchTerm}"
                  </div>
                ) : (
                  filteredTimezones.map((tz) => (
                    <button
                      key={tz.value}
                      type="button"
                      onClick={() => handleTimezoneChange(tz.value)}
                      className={`w-full text-left px-1.5 sm:px-2 md:px-3 xl:px-4 py-1 sm:py-1.5 md:py-2 xl:py-3 hover:bg-gray-50 transition-colors ${
                        timezone === tz.value ? 'bg-gray-100 font-semibold' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 sm:gap-1.5 md:gap-2">
                        <span className="text-[10px] sm:text-xs md:text-sm text-gray-900 break-words flex-1">{tz.label}</span>
                        {timezone === tz.value && (
                          <Icon icon="heroicons:check" className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 xl:w-5 xl:h-5 text-black flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        {!isDetectingTimezone && (
          <p className="mt-1 sm:mt-1.5 md:mt-1.5 xl:mt-2 text-[8px] sm:text-[9px] md:text-[10px] xl:text-xs text-gray-500 break-words">
            Your timezone has been automatically detected. You can change it if needed.
          </p>
        )}
      </div>

      {/* Calendar and Time Slots - Column layout until xl, then Row */}
      <div className="flex flex-col xl:flex-row gap-3 sm:gap-4 xl:gap-6 w-full">
        {/* Calendar - Same as mobile until xl */}
        <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl xl:rounded-2xl p-3 sm:p-4 md:p-4 xl:p-6 border border-gray-200 xl:w-96 xl:flex-shrink-0 w-full">
          <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-3 xl:mb-4 gap-2 sm:gap-2.5 md:gap-2.5 xl:gap-3">
            <h3 className="text-xs sm:text-sm md:text-sm xl:text-lg font-semibold text-gray-900 flex-1 min-w-0 truncate">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <div className="flex space-x-1 sm:space-x-1.5 md:space-x-1.5 xl:space-x-2 flex-shrink-0">
              <button
                type="button"
                onClick={goToPreviousMonth}
                className="p-1.5 sm:p-2 md:p-2 xl:p-2.5 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Previous month"
              >
                <Icon icon="heroicons:chevron-left" className="w-4 h-4 sm:w-5 sm:h-5 md:w-5 xl:w-5 text-gray-600" />
              </button>
              <button
                type="button"
                onClick={goToNextMonth}
                className="p-1.5 sm:p-2 md:p-2 xl:p-2.5 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Next month"
              >
                <Icon icon="heroicons:chevron-right" className="w-4 h-4 sm:w-5 sm:h-5 md:w-5 xl:w-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-1.5 xl:gap-2 mb-2 sm:mb-2.5 md:mb-2.5 xl:mb-3">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-xs sm:text-sm md:text-sm font-semibold text-gray-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid - Same as mobile until xl */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-1.5 xl:gap-2 w-full">
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
                  className={`w-full aspect-square min-w-0 min-h-[32px] sm:min-h-[36px] md:min-h-[38px] xl:min-h-[44px] flex items-center justify-center rounded-lg text-xs sm:text-sm md:text-sm xl:text-base font-medium transition-all ${
                    disabled
                      ? 'text-gray-300 cursor-not-allowed bg-transparent'
                      : selected
                      ? 'bg-black text-white shadow-md scale-105'
                      : today
                      ? 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                      : 'text-gray-700 hover:bg-gray-100 bg-gray-50'
                  }`}
                >
                  {day.date.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Slots - Same as mobile until xl */}
        <div ref={timeSlotsRef} className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl xl:rounded-2xl p-3 sm:p-4 md:p-4 xl:p-6 border border-gray-200 xl:flex-1 w-full overflow-visible">
          <h3 className="text-sm sm:text-base md:text-base xl:text-lg font-semibold text-gray-900 mb-3 sm:mb-3.5 md:mb-3 xl:mb-4 flex items-center">
            <Icon icon="heroicons:clock" className="w-4 h-4 sm:w-5 sm:h-5 md:w-5 xl:w-5 mr-2 text-gray-600 flex-shrink-0" />
            <span>Available Time Slots</span>
          </h3>
          {!selectedDate && (
            <p className="text-xs sm:text-sm md:text-sm xl:text-base text-gray-500 italic mb-3 sm:mb-3.5 md:mb-3 xl:mb-4">
              Please select a date first to choose a time slot
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 gap-2 sm:gap-2.5 md:gap-2.5 xl:gap-3">
            {timeSlots.map((slot) => (
              <button
                key={slot.value}
                type="button"
                onClick={() => selectedDate && handleTimeClick(slot.value)}
                disabled={!selectedDate}
                className={`py-2.5 sm:py-3 md:py-2.5 xl:py-3 px-3 sm:px-3.5 md:px-3.5 xl:px-4 rounded-lg text-xs sm:text-sm md:text-sm font-medium transition-all w-full ${
                  !selectedDate
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : selectedTime === slot.value
                    ? 'bg-black text-white shadow-md scale-105'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:scale-[1.02]'
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

      {/* Navigation Buttons - Desktop only (mobile and tablet handled by parent) */}
      <div className="hidden xl:flex border-t border-gray-300 bg-[#F3F4F6] flex-shrink-0">
        <div className="w-full px-4 xl:px-8 py-3 xl:py-4 flex justify-between gap-3 xl:gap-4">
          <button
            type="button"
            onClick={prevStep}
            className="btn-glassy-secondary px-4 xl:px-8 py-2.5 xl:py-3 text-gray-700 font-semibold rounded-full transition-all hover:scale-105 active:scale-95 text-sm xl:text-base flex-shrink-0"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleContinueClick || nextStep}
            className={`btn-glassy px-4 xl:px-8 py-2.5 xl:py-3 text-white font-semibold rounded-full transition-all text-sm xl:text-base flex-shrink-0 ${
              !selectedDate || !selectedTime
                ? 'opacity-50 hover:opacity-70 active:opacity-90'
                : 'hover:scale-105 active:scale-95'
            }`}
          >
            Continue
          </button>
        </div>
      </div>

    </>
  );
};

export default BookAppointment;
