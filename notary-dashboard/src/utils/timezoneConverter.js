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
 * Simplified conversion using Intl API
 * This is more reliable for timezone conversions
 */
export const convertTimeToNotaryTimezone = (time, date, clientTimezone, notaryTimezone) => {
  if (!time || !date || !clientTimezone || !notaryTimezone) {
    return time;
  }

  try {
    // Parse the time
    const [hours, minutes] = time.split(':').map(Number);
    
    // Handle UTC offset format for client timezone
    let clientTz = clientTimezone;
    if (clientTimezone.startsWith('UTC')) {
      clientTz = getIANAFromUTCOffset(clientTimezone);
    }
    
    // Create a date object representing the appointment in the client's timezone
    // We'll create a date string and parse it
    const dateTimeString = `${date}T${time}:00`;
    
    // Create a date object - this will be in local time
    // We need to interpret it as being in the client's timezone
    const dateObj = new Date(dateTimeString);
    
    // Get the UTC time
    const utcTime = dateObj.getTime();
    
    // Get offset for client timezone
    const clientDate = new Date(dateObj.toLocaleString('en-US', { timeZone: clientTz }));
    const utcDate = new Date(dateObj.toLocaleString('en-US', { timeZone: 'UTC' }));
    const clientOffset = clientDate.getTime() - utcDate.getTime();
    
    // Get offset for notary timezone
    const notaryDate = new Date(dateObj.toLocaleString('en-US', { timeZone: notaryTimezone }));
    const notaryOffset = notaryDate.getTime() - utcDate.getTime();
    
    // Calculate the difference
    const offsetDiff = notaryOffset - clientOffset;
    
    // Adjust the time
    const adjustedTime = new Date(utcTime + offsetDiff);
    
    // Format in notary's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: notaryTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(adjustedTime);
    const hour = parts.find(p => p.type === 'hour').value;
    const minute = parts.find(p => p.type === 'minute').value;
    
    return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  } catch (error) {
    console.error('Error converting time:', error);
    return time;
  }
};

