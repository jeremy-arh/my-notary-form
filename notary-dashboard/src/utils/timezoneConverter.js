/**
 * Convert appointment time from client timezone to notary timezone
 * @param {string} time - Time in HH:MM format (24-hour)
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} clientTimezone - Client's timezone (IANA identifier or UTC offset like 'UTC+1')
 * @param {string} notaryTimezone - Notary's timezone (IANA identifier)
 * @returns {string} Converted time in HH:MM format
 */
export const convertAppointmentTime = (time, date, clientTimezone, notaryTimezone) => {
  if (!time || !date || !clientTimezone || !notaryTimezone) {
    return time; // Return original time if any parameter is missing
  }

  try {
    // Parse time
    const [hours, minutes] = time.split(':').map(Number);
    
    // Create a date string with time in the client's timezone
    // We'll use a Date object and format it in the notary's timezone
    const dateTimeString = `${date}T${time}:00`;
    
    // Handle UTC offset format (e.g., 'UTC+1', 'UTC-5')
    let clientTz = clientTimezone;
    if (clientTimezone.startsWith('UTC')) {
      clientTz = getIANAFromUTCOffset(clientTimezone);
    }
    
    // Create a date object representing the appointment time in client's timezone
    // We need to construct a proper datetime string
    const tempDate = new Date(`${date}T${time}:00`);
    
    // Get the time in the client's timezone as a string
    const clientTimeString = tempDate.toLocaleString('en-US', {
      timeZone: clientTz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    // Now convert to notary's timezone
    // We need to create a date that represents the same moment in time
    // but displayed in the notary's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: notaryTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    // Create a date object from the client's timezone
    // We'll use a workaround: create date in UTC, then adjust
    const dateObj = new Date(`${date}T${time}:00`);
    
    // Get timezone offset for client timezone
    const clientOffset = getTimezoneOffset(clientTz, dateObj);
    const notaryOffset = getTimezoneOffset(notaryTimezone, dateObj);
    const offsetDiff = (notaryOffset - clientOffset) / (1000 * 60); // difference in minutes
    
    // Adjust the time
    const adjustedDate = new Date(dateObj.getTime() + offsetDiff * 60 * 1000);
    
    // Format in notary's timezone
    const parts = formatter.formatToParts(adjustedDate);
    const hour = parts.find(p => p.type === 'hour').value;
    const minute = parts.find(p => p.type === 'minute').value;
    
    return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  } catch (error) {
    console.error('Error converting time:', error);
    return time; // Return original time on error
  }
};

/**
 * Get timezone offset in milliseconds for a given timezone and date
 */
const getTimezoneOffset = (timezone, date) => {
  try {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return tzDate.getTime() - utcDate.getTime();
  } catch (error) {
    return 0;
  }
};

/**
 * Convert UTC offset string to approximate IANA timezone
 * @param {string} utcOffset - Format: 'UTC+1', 'UTC-5', etc.
 * @returns {string} IANA timezone identifier
 */
const getIANAFromUTCOffset = (utcOffset) => {
  // Extract offset
  const match = utcOffset.match(/UTC([+-])(\d+)(?::(\d+))?/);
  if (!match) return 'UTC';
  
  const sign = match[1] === '+' ? 1 : -1;
  const hours = parseInt(match[2], 10);
  const minutes = match[3] ? parseInt(match[3], 10) : 0;
  const totalOffset = sign * (hours + minutes / 60);
  
  // Map common offsets to IANA timezones
  const offsetMap = {
    '-12': 'Pacific/Baker_Island',
    '-11': 'Pacific/Midway',
    '-10': 'Pacific/Honolulu',
    '-9': 'America/Anchorage',
    '-8': 'America/Los_Angeles',
    '-7': 'America/Denver',
    '-6': 'America/Chicago',
    '-5': 'America/New_York',
    '-4': 'America/Halifax',
    '-3.5': 'America/St_Johns',
    '-3': 'America/Sao_Paulo',
    '-2': 'Atlantic/South_Georgia',
    '-1': 'Atlantic/Azores',
    '0': 'Europe/London',
    '1': 'Europe/Paris',
    '2': 'Europe/Athens',
    '3': 'Europe/Moscow',
    '3.5': 'Asia/Tehran',
    '4': 'Asia/Dubai',
    '4.5': 'Asia/Kabul',
    '5': 'Asia/Karachi',
    '5.5': 'Asia/Kolkata',
    '5.75': 'Asia/Kathmandu',
    '6': 'Asia/Dhaka',
    '6.5': 'Asia/Yangon',
    '7': 'Asia/Bangkok',
    '8': 'Asia/Shanghai',
    '8.75': 'Australia/Eucla',
    '9': 'Asia/Tokyo',
    '9.5': 'Australia/Adelaide',
    '10': 'Australia/Sydney',
    '10.5': 'Australia/Lord_Howe',
    '11': 'Pacific/Guadalcanal',
    '12': 'Pacific/Auckland',
    '12.75': 'Pacific/Chatham',
    '13': 'Pacific/Tongatapu',
    '14': 'Pacific/Kiritimati'
  };
  
  const offsetKey = totalOffset.toString();
  return offsetMap[offsetKey] || 'UTC';
};

/**
 * Convert appointment time from client timezone to notary timezone
 * 
 * This function finds the UTC timestamp that corresponds to the given local time
 * in the client's timezone, then formats that same UTC timestamp in the notary's timezone.
 * 
 * Uses an iterative approach to find the correct UTC timestamp by checking what time
 * a UTC timestamp displays in the client's timezone, adjusting until we find a match.
 * 
 * @param {string} time - Time in HH:MM format (24-hour) in client's timezone
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} clientTimezone - Client's timezone (IANA identifier or UTC offset like 'UTC+1')
 * @param {string} notaryTimezone - Notary's timezone (IANA identifier)
 * @returns {string} Converted time in HH:MM format in notary's timezone
 */
export const convertTimeToNotaryTimezone = (time, date, clientTimezone, notaryTimezone) => {
  if (!time || !date || !clientTimezone || !notaryTimezone) {
    console.warn('Missing timezone conversion parameters:', { time, date, clientTimezone, notaryTimezone });
    return time || '00:00';
  }

  try {
    // Handle UTC offset format for client timezone (e.g., 'UTC+1', 'UTC-5')
    let clientTz = clientTimezone;
    if (clientTimezone.startsWith('UTC')) {
      clientTz = getIANAFromUTCOffset(clientTimezone);
      if (!clientTz || clientTz === 'UTC') {
        console.warn('Could not convert UTC offset to IANA timezone:', clientTimezone);
        clientTz = 'UTC';
      }
    }

    // If both timezones are the same, no conversion needed
    if (clientTz === notaryTimezone) {
      return time;
    }

    // Parse the time and date components
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      console.error('Invalid time format:', time);
      return time;
    }

    const [year, month, day] = date.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      console.error('Invalid date format:', date);
      return time;
    }

    // Create formatters
    const clientFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: clientTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const notaryFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: notaryTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    // Start with a UTC timestamp for the appointment date/time at noon UTC
    // This gives us a good starting point that's likely to be close to the target
    let utcTimestamp = Date.UTC(year, month - 1, day, 12, 0, 0);
    
    // Iteratively refine the UTC timestamp until we find one that displays
    // the correct time in the client's timezone
    for (let iteration = 0; iteration < 15; iteration++) {
      const testDate = new Date(utcTimestamp);
      const parts = clientFormatter.formatToParts(testDate);
      
      const tzYear = parseInt(parts.find(p => p.type === 'year').value);
      const tzMonth = parseInt(parts.find(p => p.type === 'month').value);
      const tzDay = parseInt(parts.find(p => p.type === 'day').value);
      const tzHour = parseInt(parts.find(p => p.type === 'hour').value);
      const tzMinute = parseInt(parts.find(p => p.type === 'minute').value);
      
      // Check if we have an exact match
      if (tzYear === year && tzMonth === month && tzDay === day && tzHour === hours && tzMinute === minutes) {
        // Found it! Format this UTC timestamp in the notary's timezone
        const notaryParts = notaryFormatter.formatToParts(testDate);
        const notaryHour = notaryParts.find(p => p.type === 'hour').value;
        const notaryMinute = notaryParts.find(p => p.type === 'minute').value;
        return `${notaryHour.padStart(2, '0')}:${notaryMinute.padStart(2, '0')}`;
      }
      
      // Calculate the difference in minutes between desired and actual time
      // Account for date differences first
      let totalMinutesDiff = 0;
      
      if (tzYear !== year || tzMonth !== month || tzDay !== day) {
        // Date mismatch - calculate days difference
        const desiredDate = new Date(year, month - 1, day, hours, minutes);
        const actualDate = new Date(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute);
        totalMinutesDiff = Math.round((desiredDate.getTime() - actualDate.getTime()) / (1000 * 60));
      } else {
        // Same date, just time difference
        totalMinutesDiff = (hours - tzHour) * 60 + (minutes - tzMinute);
      }
      
      // Adjust the UTC timestamp
      // If the displayed time is earlier than desired, we need a later UTC time
      // If the displayed time is later than desired, we need an earlier UTC time
      utcTimestamp += totalMinutesDiff * 60 * 1000;
      
      // Prevent infinite loops by limiting the adjustment
      if (Math.abs(totalMinutesDiff) < 1) {
        break;
      }
    }
    
    // Use the final UTC timestamp (even if not exact) and format in notary's timezone
    const notaryParts = notaryFormatter.formatToParts(new Date(utcTimestamp));
    const notaryHour = notaryParts.find(p => p.type === 'hour').value;
    const notaryMinute = notaryParts.find(p => p.type === 'minute').value;
    
    return `${notaryHour.padStart(2, '0')}:${notaryMinute.padStart(2, '0')}`;
  } catch (error) {
    console.error('Error converting time to notary timezone:', error, { time, date, clientTimezone, notaryTimezone });
    return time;
  }
};

