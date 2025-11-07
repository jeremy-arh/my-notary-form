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

