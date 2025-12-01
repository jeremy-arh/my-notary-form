import { supabase } from '../lib/supabase';
import { getSharedVisitorId, syncVisitorId } from './sharedVisitorId';

// Sync visitor ID on module load
if (typeof window !== 'undefined') {
  syncVisitorId();
}

// Generate or retrieve visitor ID (shared across domains)
const getVisitorId = () => {
  return getSharedVisitorId();
};

// Generate or retrieve session ID (stored in sessionStorage)
const getSessionId = () => {
  const storageKey = 'analytics_session_id';
  let sessionId = sessionStorage.getItem(storageKey);
  
  if (!sessionId) {
    // Generate a unique session ID
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem(storageKey, sessionId);
  }
  
  return sessionId;
};

// Get device information
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  const screen = window.screen;
  
  // Detect device type
  let deviceType = 'desktop';
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/tablet|ipad|playbook|silk/i.test(ua)) {
    deviceType = 'tablet';
  }
  
  // Detect browser
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';
  if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) {
    browserName = 'Chrome';
    const match = ua.match(/Chrome\/(\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (ua.indexOf('Firefox') > -1) {
    browserName = 'Firefox';
    const match = ua.match(/Firefox\/(\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) {
    browserName = 'Safari';
    const match = ua.match(/Version\/(\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (ua.indexOf('Edg') > -1) {
    browserName = 'Edge';
    const match = ua.match(/Edg\/(\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  }
  
  // Detect OS
  let osName = 'Unknown';
  let osVersion = 'Unknown';
  if (ua.indexOf('Windows') > -1) {
    osName = 'Windows';
    const match = ua.match(/Windows NT (\d+\.\d+)/);
    if (match) {
      const version = match[1];
      osVersion = version === '10.0' ? '10' : version === '6.3' ? '8.1' : version === '6.2' ? '8' : version === '6.1' ? '7' : version;
    }
  } else if (ua.indexOf('Mac OS X') > -1) {
    osName = 'macOS';
    const match = ua.match(/Mac OS X (\d+[._]\d+)/);
    osVersion = match ? match[1].replace('_', '.') : 'Unknown';
  } else if (ua.indexOf('Linux') > -1) {
    osName = 'Linux';
  } else if (ua.indexOf('Android') > -1) {
    osName = 'Android';
    const match = ua.match(/Android (\d+\.\d+)/);
    osVersion = match ? match[1] : 'Unknown';
  } else if (ua.indexOf('iOS') > -1 || ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) {
    osName = 'iOS';
    const match = ua.match(/OS (\d+[._]\d+)/);
    osVersion = match ? match[1].replace('_', '.') : 'Unknown';
  }
  
  return {
    deviceType,
    browserName,
    browserVersion,
    osName,
    osVersion,
    screenWidth: screen.width,
    screenHeight: screen.height
  };
};

// Cache for geo information (stored for 24 hours)
const GEO_CACHE_KEY = 'analytics_geo_cache';
const GEO_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Get cached geo info or fetch new one
const getGeoInfo = async () => {
  // Check cache first
  try {
    const cached = localStorage.getItem(GEO_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();
      // Use cached data if less than 24 hours old
      if (now - timestamp < GEO_CACHE_DURATION) {
        return data;
      }
    }
  } catch (error) {
    // Cache invalid, continue to fetch
  }

  // Default values
  const defaultGeoInfo = {
    countryCode: null,
    countryName: null,
    city: null,
    region: null,
    ip: null
  };

  // Try to fetch geo info (non-blocking, use defaults if fails)
  try {
    // Try ip-api.com first with HTTPS (more reliable, free tier: 45 requests/minute)
    const response = await fetch('https://ip-api.com/json/?fields=status,message,country,countryCode,city,regionName,query');
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'success') {
        const geoInfo = {
          countryCode: data.countryCode || null,
          countryName: data.country || null,
          city: data.city || null,
          region: data.regionName || null,
          ip: data.query || null
        };
        // Cache the result
        try {
          localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({
            data: geoInfo,
            timestamp: Date.now()
          }));
        } catch (e) {
          // localStorage might be full or disabled, ignore
        }
        return geoInfo;
      }
    }
  } catch (error) {
    // Silently fail, will use defaults
  }

  // Fallback: try ipapi.co (if ip-api.com fails)
  try {
    const fallbackResponse = await fetch('https://ipapi.co/json/');
    if (fallbackResponse.ok) {
      const data = await fallbackResponse.json();
      const geoInfo = {
        countryCode: data.country_code || null,
        countryName: data.country_name || null,
        city: data.city || null,
        region: data.region || null,
        ip: data.ip || null
      };
      // Cache the result
      try {
        localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({
          data: geoInfo,
          timestamp: Date.now()
        }));
      } catch (e) {
        // localStorage might be full or disabled, ignore
      }
      return geoInfo;
    }
  } catch (error) {
    // Silently fail, will use defaults
  }

  // Return defaults if all services fail
  return defaultGeoInfo;
};

// Get browser language
const getBrowserLanguage = () => {
  const lang = navigator.language || navigator.userLanguage || 'en';
  // Return language code (e.g., 'en', 'fr', 'es')
  return lang.split('-')[0];
};

// Get UTM parameters from URL
const getUTMParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || null,
    utm_medium: params.get('utm_medium') || null,
    utm_campaign: params.get('utm_campaign') || null
  };
};

// Track an analytics event
export const trackEvent = async (eventType, pagePath = null, metadata = {}) => {
  try {
    if (!supabase) {
      console.warn('Analytics: Supabase not configured');
      return;
    }

    const visitorId = getVisitorId();
    const sessionId = getSessionId();
    const deviceInfo = getDeviceInfo();
    // Get geo info (cached, non-blocking)
    const geoInfo = await getGeoInfo().catch(() => ({
      countryCode: null,
      countryName: null,
      city: null,
      region: null,
      ip: null
    }));
    const utmParams = getUTMParams();
    const browserLanguage = getBrowserLanguage();
    
    // Get current user if authenticated
    let userId = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch (error) {
      // User not authenticated, that's fine
    }

    const eventData = {
      event_type: eventType,
      page_path: pagePath || window.location.pathname,
      visitor_id: visitorId,
      session_id: sessionId,
      user_id: userId,
      country_code: geoInfo.countryCode,
      country_name: geoInfo.countryName,
      city: geoInfo.city,
      region: geoInfo.region,
      ip_address: geoInfo.ip,
      device_type: deviceInfo.deviceType,
      browser_name: deviceInfo.browserName,
      browser_version: deviceInfo.browserVersion,
      os_name: deviceInfo.osName,
      os_version: deviceInfo.osVersion,
      screen_width: deviceInfo.screenWidth,
      screen_height: deviceInfo.screenHeight,
      referrer: document.referrer || null,
      utm_source: utmParams.utm_source,
      utm_medium: utmParams.utm_medium,
      utm_campaign: utmParams.utm_campaign,
      language: browserLanguage,
      metadata: metadata
    };

    const { data, error } = await supabase
      .from('analytics_events')
      .insert([eventData])
      .select();

    if (error) {
      console.error('❌ Analytics tracking error:', error);
      console.error('Event data:', eventData);
    } else {
      console.log('✅ Analytics event tracked:', eventType, data?.[0]?.id);
    }
  } catch (error) {
    console.error('❌ Analytics tracking error (catch):', error);
    console.error('Event type:', eventType);
  }
};

// Track pageview
export const trackPageView = (pagePath = null) => {
  return trackEvent('pageview', pagePath || window.location.pathname);
};

// Track form opened (first time user opens the form)
export const trackFormOpened = () => {
  return trackEvent('form_opened', '/form', { 
    timestamp: new Date().toISOString()
  });
};

// Track form start (matches GTM event: form_start)
export const trackFormStart = () => {
  return trackEvent('form_start', '/form', { step: 1 });
};

// Track screen opened (when user navigates to a specific step/screen)
export const trackScreenOpened = (screenName, screenPath, stepNumber) => {
  return trackEvent('screen_opened', screenPath, {
    screen_name: screenName,
    step_number: stepNumber
  });
};

// Track form step
export const trackFormStep = (stepNumber, stepName, pagePath) => {
  return trackEvent('form_step', pagePath, {
    step: stepNumber,
    step_name: stepName
  });
};

// Track form submission
export const trackFormSubmission = (metadata = {}) => {
  return trackEvent('form_submission', '/form/summary', metadata);
};

// Track form abandonment
export const trackFormAbandonment = (stepNumber, metadata = {}) => {
  return trackEvent('form_abandonment', window.location.pathname, {
    step: stepNumber,
    ...metadata
  });
};

// Track service selection (matches GTM event: service_selected)
export const trackServiceSelected = (serviceId, serviceName, servicesCount = null, allSelectedServices = []) => {
  return trackEvent('service_selected', '/form/choose-services', {
    service_id: serviceId,
    service_name: serviceName,
    services_count: servicesCount || allSelectedServices.length,
    selected_services: allSelectedServices.join(',')
  });
};

// Track services selection completed (when user clicks continue after selecting services)
export const trackServicesSelectionCompleted = (selectedServices = []) => {
  return trackEvent('services_selection_completed', '/form/choose-services', {
    services_count: selectedServices.length,
    selected_services: selectedServices.join(',')
  });
};

// Track document screen opened
export const trackDocumentScreenOpened = (selectedServicesCount) => {
  return trackEvent('document_screen_opened', '/form/documents', {
    services_count: selectedServicesCount
  });
};

// Track document upload (matches GTM event: document_uploaded)
export const trackDocumentUploaded = (serviceId, fileCount, totalFilesCount = null, servicesWithDocs = null) => {
  return trackEvent('document_uploaded', '/form/documents', {
    service_id: serviceId,
    file_count: fileCount,
    total_files_count: totalFilesCount || fileCount,
    services_with_docs: servicesWithDocs
  });
};

// Track documents upload completed (when user clicks continue after uploading)
export const trackDocumentsUploadCompleted = (totalFilesCount, servicesWithDocs) => {
  return trackEvent('documents_upload_completed', '/form/documents', {
    total_files_count: totalFilesCount,
    services_with_docs: servicesWithDocs
  });
};

// Track signatory screen opened
export const trackSignatoryScreenOpened = () => {
  return trackEvent('signatory_screen_opened', '/form/signatories', {});
};

// Track signatory added (matches GTM event: signatories_added)
export const trackSignatoryAdded = (signatoryCount) => {
  return trackEvent('signatories_added', '/form/signatories', {
    signatory_count: signatoryCount
  });
};

// Track signatories completed (when user clicks continue after adding signatories)
export const trackSignatoriesCompleted = (signatoriesCount) => {
  return trackEvent('signatories_completed', '/form/signatories', {
    signatories_count: signatoriesCount
  });
};

// Track appointment screen opened
export const trackAppointmentScreenOpened = () => {
  return trackEvent('appointment_screen_opened', '/form/book-appointment', {});
};

// Track appointment booked (matches GTM event: appointment_booked)
export const trackAppointmentBooked = (appointmentDate, appointmentTime, timezone) => {
  return trackEvent('appointment_booked', '/form/book-appointment', {
    appointment_date: appointmentDate,
    appointment_time: appointmentTime,
    timezone: timezone
  });
};

// Track personal info screen opened
export const trackPersonalInfoScreenOpened = () => {
  return trackEvent('personal_info_screen_opened', '/form/personal-info', {});
};

// Track personal info completed (matches GTM event: personal_info_completed)
export const trackPersonalInfoCompleted = (isAuthenticated) => {
  return trackEvent('personal_info_completed', '/form/personal-info', {
    is_authenticated: isAuthenticated
  });
};

// Track summary screen opened
export const trackSummaryScreenOpened = () => {
  return trackEvent('summary_screen_opened', '/form/summary', {});
};

// Track summary viewed (matches GTM event: summary_viewed)
export const trackSummaryViewed = (metadata = {}) => {
  return trackEvent('summary_viewed', '/form/summary', metadata);
};

// Track payment initiated (matches GTM event: payment_initiated)
export const trackPaymentInitiated = (amount, currency) => {
  return trackEvent('payment_initiated', '/form/summary', {
    amount: amount,
    currency: currency
  });
};

// Track payment completed (matches GTM event: purchase)
export const trackPaymentCompleted = (amount, currency, paymentId) => {
  return trackEvent('purchase', '/form/summary', {
    amount: amount,
    currency: currency,
    payment_id: paymentId
  });
};

