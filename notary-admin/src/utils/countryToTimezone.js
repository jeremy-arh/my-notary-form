// Mapping of countries to their primary timezone
// Using IANA timezone identifiers (e.g., 'Europe/Paris', 'America/New_York')
export const countryToTimezone = {
  // North America
  'United States': 'America/New_York',
  'USA': 'America/New_York',
  'US': 'America/New_York',
  'Canada': 'America/Toronto',
  'Mexico': 'America/Mexico_City',
  
  // Europe
  'France': 'Europe/Paris',
  'United Kingdom': 'Europe/London',
  'UK': 'Europe/London',
  'Germany': 'Europe/Berlin',
  'Spain': 'Europe/Madrid',
  'Italy': 'Europe/Rome',
  'Netherlands': 'Europe/Amsterdam',
  'Belgium': 'Europe/Brussels',
  'Switzerland': 'Europe/Zurich',
  'Portugal': 'Europe/Lisbon',
  'Austria': 'Europe/Vienna',
  'Sweden': 'Europe/Stockholm',
  'Norway': 'Europe/Oslo',
  'Denmark': 'Europe/Copenhagen',
  'Finland': 'Europe/Helsinki',
  'Poland': 'Europe/Warsaw',
  'Czech Republic': 'Europe/Prague',
  'Greece': 'Europe/Athens',
  'Ireland': 'Europe/Dublin',
  'Luxembourg': 'Europe/Luxembourg',
  
  // Asia
  'China': 'Asia/Shanghai',
  'Japan': 'Asia/Tokyo',
  'India': 'Asia/Kolkata',
  'South Korea': 'Asia/Seoul',
  'Singapore': 'Asia/Singapore',
  'Thailand': 'Asia/Bangkok',
  'Malaysia': 'Asia/Kuala_Lumpur',
  'Indonesia': 'Asia/Jakarta',
  'Philippines': 'Asia/Manila',
  'Vietnam': 'Asia/Ho_Chi_Minh',
  'United Arab Emirates': 'Asia/Dubai',
  'UAE': 'Asia/Dubai',
  'Saudi Arabia': 'Asia/Riyadh',
  'Israel': 'Asia/Jerusalem',
  'Turkey': 'Europe/Istanbul',
  
  // Oceania
  'Australia': 'Australia/Sydney',
  'New Zealand': 'Pacific/Auckland',
  
  // South America
  'Brazil': 'America/Sao_Paulo',
  'Argentina': 'America/Argentina/Buenos_Aires',
  'Chile': 'America/Santiago',
  'Colombia': 'America/Bogota',
  'Peru': 'America/Lima',
  
  // Africa
  'South Africa': 'Africa/Johannesburg',
  'Egypt': 'Africa/Cairo',
  'Morocco': 'Africa/Casablanca',
  'Nigeria': 'Africa/Lagos',
  'Kenya': 'Africa/Nairobi',
  
  // Default fallback
  'Default': 'UTC'
};

/**
 * Get timezone for a country name
 * @param {string} countryName - The country name
 * @returns {string} IANA timezone identifier
 */
export const getTimezoneForCountry = (countryName) => {
  if (!countryName) return 'UTC';
  
  const normalizedCountry = countryName.trim();
  
  // Direct lookup
  if (countryToTimezone[normalizedCountry]) {
    return countryToTimezone[normalizedCountry];
  }
  
  // Case-insensitive lookup
  const countryKey = Object.keys(countryToTimezone).find(
    key => key.toLowerCase() === normalizedCountry.toLowerCase()
  );
  
  if (countryKey) {
    return countryToTimezone[countryKey];
  }
  
  // Return UTC as fallback
  return 'UTC';
};

/**
 * Convert time from one timezone to another
 * @param {string} time - Time in HH:MM format (24-hour)
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} fromTimezone - Source timezone (IANA identifier or UTC offset like 'UTC+1')
 * @param {string} toTimezone - Target timezone (IANA identifier or UTC offset like 'UTC-5')
 * @returns {string} Converted time in HH:MM format
 */
export const convertTimeBetweenTimezones = (time, date, fromTimezone, toTimezone) => {
  if (!time || !date || !fromTimezone || !toTimezone) return time;
  
  try {
    // Parse time
    const [hours, minutes] = time.split(':').map(Number);
    
    // Create date string with time
    const dateTimeString = `${date}T${time}:00`;
    
    // Handle UTC offset format (e.g., 'UTC+1', 'UTC-5')
    let fromTz = fromTimezone;
    if (fromTimezone.startsWith('UTC')) {
      fromTz = getIANAFromUTCOffset(fromTimezone);
    }
    
    let toTz = toTimezone;
    if (toTimezone.startsWith('UTC')) {
      toTz = getIANAFromUTCOffset(toTimezone);
    }
    
    // Create date objects in both timezones
    const dateInFromTz = new Date(dateTimeString);
    const dateInToTz = new Date(dateTimeString);
    
    // Use Intl.DateTimeFormat to convert
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: toTz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    // Get the time in the target timezone
    const parts = formatter.formatToParts(dateInFromTz);
    const hour = parts.find(p => p.type === 'hour').value;
    const minute = parts.find(p => p.type === 'minute').value;
    
    return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  } catch (error) {
    console.error('Error converting time:', error);
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

