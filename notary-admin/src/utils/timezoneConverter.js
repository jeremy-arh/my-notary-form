/**
 * Convert appointment time from client timezone to notary timezone
 * @param {string} time - Time in HH:MM format (24-hour) in client's timezone
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} clientTimezone - Client's timezone (IANA identifier or UTC offset like 'UTC+1')
 * @param {string} notaryTimezone - Notary's timezone (IANA identifier)
 * @returns {string} Converted time in HH:MM format in notary's timezone (12-hour format with AM/PM)
 */
export const convertTimeToNotaryTimezone = (time, date, clientTimezone, notaryTimezone) => {
  if (!time || !date || !clientTimezone || !notaryTimezone) {
    console.warn('Missing timezone conversion parameters:', { time, date, clientTimezone, notaryTimezone });
    // Format in 12-hour format even if parameters are missing
    if (time) {
      try {
        const [hours, minutes] = time.split(':').map(Number);
        const hour = parseInt(hours);
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
      } catch (error) {
        return time;
      }
    }
    return '12:00 AM';
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

    // Handle UTC offset format for notary timezone (e.g., 'UTC+1', 'UTC-5')
    let notaryTz = notaryTimezone;
    if (notaryTimezone.startsWith('UTC')) {
      notaryTz = getIANAFromUTCOffset(notaryTimezone);
      if (!notaryTz || notaryTz === 'UTC') {
        console.warn('Could not convert UTC offset to IANA timezone:', notaryTimezone);
        notaryTz = 'UTC';
      }
    }

    // If both timezones are the same, still format in 12-hour format (AM/PM)
    if (clientTz === notaryTz) {
      const [hours, minutes] = time.split(':').map(Number);
      const hour = parseInt(hours);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
    }

    // Parse the time and date components
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      console.error('Invalid time format:', time);
      // Try to format in 12-hour format anyway
      try {
        const hour = parseInt(hours);
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        return `${displayHour}:${String(minutes || 0).padStart(2, '0')} ${period}`;
      } catch (error) {
        return time;
      }
    }

    const [year, month, day] = date.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      console.error('Invalid date format:', date);
      // Format in 12-hour format even if date is invalid
      try {
        const [hours, minutes] = time.split(':').map(Number);
        const hour = parseInt(hours);
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
      } catch (error) {
        return time;
      }
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
      timeZone: notaryTz,
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
        // Found it! Format this UTC timestamp in the notary's timezone with 12-hour format (AM/PM)
        const notaryFormatter12h = new Intl.DateTimeFormat('en-US', {
          timeZone: notaryTz,
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        
        const formattedTime = notaryFormatter12h.format(testDate);
        
        // Extract time parts (format: "H:MM AM/PM" or "HH:MM AM/PM")
        const timeMatch = formattedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeMatch) {
          return `${timeMatch[1]}:${timeMatch[2]} ${timeMatch[3]}`;
        }
        
        // Fallback to 24-hour format if parsing fails
        const notaryParts = notaryFormatter.formatToParts(testDate);
        const notaryHour = parseInt(notaryParts.find(p => p.type === 'hour').value);
        const notaryMinute = notaryParts.find(p => p.type === 'minute').value;
        const period = notaryHour >= 12 ? 'PM' : 'AM';
        const displayHour = notaryHour > 12 ? notaryHour - 12 : notaryHour === 0 ? 12 : notaryHour;
        return `${displayHour}:${notaryMinute} ${period}`;
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
    
    // Use the final UTC timestamp (even if not exact) and format in notary's timezone with 12-hour format (AM/PM)
    const notaryFormatter12h = new Intl.DateTimeFormat('en-US', {
      timeZone: notaryTz,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    const formattedTime = notaryFormatter12h.format(new Date(utcTimestamp));
    
    // Extract time parts (format: "H:MM AM/PM" or "HH:MM AM/PM")
    const timeMatch = formattedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (timeMatch) {
      return `${timeMatch[1]}:${timeMatch[2]} ${timeMatch[3]}`;
    }
    
    // Fallback to 24-hour format if parsing fails
    const notaryParts = notaryFormatter.formatToParts(new Date(utcTimestamp));
    const notaryHour = parseInt(notaryParts.find(p => p.type === 'hour').value);
    const notaryMinute = notaryParts.find(p => p.type === 'minute').value;
    const period = notaryHour >= 12 ? 'PM' : 'AM';
    const displayHour = notaryHour > 12 ? notaryHour - 12 : notaryHour === 0 ? 12 : notaryHour;
    return `${displayHour}:${notaryMinute} ${period}`;
  } catch (error) {
    console.error('Error converting time to notary timezone:', error, { time, date, clientTimezone, notaryTimezone });
    // Format in 12-hour format even on error
    if (time) {
      try {
        const [hours, minutes] = time.split(':').map(Number);
        const hour = parseInt(hours);
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
      } catch (formatError) {
        return time;
      }
    }
    return time;
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

