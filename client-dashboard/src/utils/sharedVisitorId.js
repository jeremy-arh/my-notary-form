/**
 * Shared Visitor ID System
 * Permet de partager le même visitor_id entre différents domaines
 * Utilise un cookie de domaine parent (.mynotary.io) pour la synchronisation
 */

// Generate UUID (fallback for older browsers)
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Get domain parent (e.g., .mynotary.io from mynotary.io or app.mynotary.io)
const getParentDomain = () => {
  const hostname = window.location.hostname;
  
  // Extract parent domain
  // mynotary.io -> .mynotary.io
  // app.mynotary.io -> .mynotary.io
  // localhost -> localhost (for development)
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return hostname; // No parent domain for localhost
  }
  
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    // Take last two parts for parent domain
    return '.' + parts.slice(-2).join('.');
  }
  
  return hostname;
};

// Set cookie with parent domain
const setCookie = (name, value, days = 365) => {
  const parentDomain = getParentDomain();
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  
  // Only set domain if not localhost and has parent domain
  const domainPart = (parentDomain.startsWith('.') && !parentDomain.includes('localhost')) 
    ? `domain=${parentDomain};` 
    : '';
  
  // Secure flag only for HTTPS
  const secureFlag = window.location.protocol === 'https:' ? 'Secure;' : '';
  
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};${domainPart}path=/;SameSite=Lax;${secureFlag}`;
};

// Get cookie value
const getCookie = (name) => {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

/**
 * Get or create shared visitor ID
 * Priority:
 * 1. Cookie (shared across domains)
 * 2. LocalStorage (fallback)
 * 3. Generate new ID and sync to both
 */
export const getSharedVisitorId = () => {
  const COOKIE_NAME = 'mynotary_visitor_id';
  const STORAGE_KEY = 'analytics_visitor_id';
  
  // Try to get from cookie first (shared across domains)
  let visitorId = getCookie(COOKIE_NAME);
  
  if (visitorId) {
    // Sync to localStorage for this domain
    localStorage.setItem(STORAGE_KEY, visitorId);
    return visitorId;
  }
  
  // Try localStorage as fallback
  visitorId = localStorage.getItem(STORAGE_KEY);
  
  if (visitorId) {
    // Sync to cookie so other domains can access it
    setCookie(COOKIE_NAME, visitorId);
    return visitorId;
  }
  
  // Generate new ID
  visitorId = generateUUID();
  
  // Store in both cookie and localStorage
  setCookie(COOKIE_NAME, visitorId);
  localStorage.setItem(STORAGE_KEY, visitorId);
  
  return visitorId;
};

/**
 * Sync visitor ID from cookie to localStorage (called on page load)
 * Useful when user visits a new domain for the first time
 */
export const syncVisitorId = () => {
  const COOKIE_NAME = 'mynotary_visitor_id';
  const STORAGE_KEY = 'analytics_visitor_id';
  
  const cookieId = getCookie(COOKIE_NAME);
  const storageId = localStorage.getItem(STORAGE_KEY);
  
  if (cookieId && cookieId !== storageId) {
    // Cookie exists and is different, sync to localStorage
    localStorage.setItem(STORAGE_KEY, cookieId);
  } else if (storageId && !cookieId) {
    // localStorage exists but cookie doesn't, sync to cookie
    setCookie(COOKIE_NAME, storageId);
  }
};

