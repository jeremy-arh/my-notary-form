import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { Line } from 'react-chartjs-2';
import { format, subHours, subDays, subMinutes, eachHourOfInterval, eachMinuteOfInterval, startOfDay, endOfDay, startOfToday, startOfYesterday } from 'date-fns';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';
import '../../lib/chartConfig';
import { defaultChartOptions } from '../../lib/chartConfig';

const Analytics = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('hours'); // 'hours', 'days', 'weeks' (deprecated, kept for backward compatibility)
  const [chartTimeRange, setChartTimeRange] = useState('hours'); // 'minutes', 'hours', 'days', 'weeks'
  const [countryFilter, setCountryFilter] = useState('all'); // 'all' or country code
  const [dateFilter, setDateFilter] = useState('today'); // 'today', 'yesterday', 'last7days', 'last30days', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Overview metrics
  const [metrics, setMetrics] = useState({
    uniqueVisitors: 0,
    totalVisits: 0,
    totalPageviews: 0,
    viewsPerVisit: 0,
    bounceRate: 0,
    visitDuration: 0
  });
  
  // Visitor activity chart data
  const [visitorChartData, setVisitorChartData] = useState([]);
  
  // Countries data
  const [countriesData, setCountriesData] = useState([]);
  
  // Devices data
  const [devicesData, setDevicesData] = useState([]);
  const [deviceView, setDeviceView] = useState('size'); // 'size', 'browser', 'os'
  
  // Pages data
  const [pagesData, setPagesData] = useState([]);
  const [pageViewType, setPageViewType] = useState('top'); // 'top', 'entry', 'exit'
  
  // Countries view type
  const [countriesViewType, setCountriesViewType] = useState('countries'); // 'map', 'countries', 'regions', 'cities'
  
  // Languages data
  const [languagesData, setLanguagesData] = useState([]);
  
  // Conversion funnel data
  const [funnelData, setFunnelData] = useState([]);
  
  // Site events data (CTA clicks, scroll depth, etc.)
  const [siteEventsData, setSiteEventsData] = useState({
    ctaClicks: [],
    scrollDepth: [],
    navigationClicks: [],
    serviceClicks: []
  });
  
  // Store events for use in regions/cities views
  const [eventsData, setEventsData] = useState([]);
  
  // Store funnel steps for use in visitors table
  const [funnelStepsData, setFunnelStepsData] = useState([]);
  
  // Visitors data
  const [visitorsData, setVisitorsData] = useState([]);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [visitorDetailModalOpen, setVisitorDetailModalOpen] = useState(false);
  const [selectedVisitorEvents, setSelectedVisitorEvents] = useState([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange, chartTimeRange, pageViewType, countryFilter, dateFilter, customStartDate, customEndDate]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      // Calculate date range based on dateFilter
      let startDate;
      let endDate = new Date();
      
      if (dateFilter === 'today') {
        startDate = startOfToday();
        endDate = new Date();
      } else if (dateFilter === 'yesterday') {
        startDate = startOfYesterday();
        endDate = new Date(startOfToday().getTime() - 1); // End of yesterday
      } else if (dateFilter === 'last7days') {
        startDate = startOfDay(subDays(new Date(), 6)); // 7 days including today
        endDate = new Date();
      } else if (dateFilter === 'last30days') {
        startDate = startOfDay(subDays(new Date(), 29)); // 30 days including today
        endDate = new Date();
      } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
        startDate = startOfDay(new Date(customStartDate));
        endDate = endOfDay(new Date(customEndDate));
      } else {
        // Fallback to today if custom dates not set
        startDate = startOfToday();
        endDate = new Date();
      }

      // First, fetch all events to get countries list
      console.log('📊 [ANALYTICS] Fetching all events from:', startDate.toISOString(), 'to:', endDate.toISOString());
      const { data: allEvents, error: allEventsError } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });
      
      if (allEventsError) {
        console.error('❌ [ANALYTICS] Error fetching all events:', allEventsError);
        throw allEventsError;
      }
      
      // Calculate countries data from all events (for the filter dropdown)
      const countryMap = {};
      (allEvents || []).forEach(e => {
        if (e.country_code) {
          const country = e.country_name || e.country_code;
          if (!countryMap[country]) {
            countryMap[country] = {
              code: e.country_code,
              name: country,
              visitors: new Set()
            };
          }
          if (e.visitor_id) {
            countryMap[country].visitors.add(e.visitor_id);
          }
        }
      });
      const countries = Object.values(countryMap)
        .map(c => ({
          code: c.code,
          name: c.name,
          visitors: c.visitors.size
        }))
        .sort((a, b) => b.visitors - a.visitors);
      setCountriesData(countries);
      
      // Filter events by country if selected
      let events = allEvents || [];
      if (countryFilter !== 'all') {
        events = events.filter(e => e.country_code === countryFilter);
      }
      
      // Store filtered events in state for use in regions/cities views
      setEventsData(events);

      console.log('📊 [ANALYTICS] Events fetched:', events?.length || 0);
      if (events && events.length > 0) {
        console.log('📊 [ANALYTICS] Event types:', [...new Set(events.map(e => e.event_type))]);
      }

      if (events && events.length > 0) {
        // Calculate overview metrics
        const uniqueVisitors = new Set(events.map(e => e.visitor_id).filter(Boolean)).size;
        const sessions = new Set(events.map(e => e.session_id).filter(Boolean)).size;
        // Only count actual pageview events, not all events with page_path
        const pageviews = events.filter(e => e.event_type === 'pageview').length;
        const viewsPerVisit = sessions > 0 ? (pageviews / sessions).toFixed(2) : 0;
        
        // Calculate bounce rate (sessions with only 1 pageview)
        const sessionPageviews = {};
        events.forEach(e => {
          if (e.session_id && e.page_path) {
            if (!sessionPageviews[e.session_id]) {
              sessionPageviews[e.session_id] = new Set();
            }
            sessionPageviews[e.session_id].add(e.page_path);
          }
        });
        const bouncedSessions = Object.values(sessionPageviews).filter(pages => pages.size === 1).length;
        const bounceRate = sessions > 0 ? ((bouncedSessions / sessions) * 100).toFixed(0) : 0;
        
        // Calculate average visit duration (simplified)
        const sessionDurations = {};
        events.forEach(e => {
          if (e.session_id && e.created_at) {
            if (!sessionDurations[e.session_id]) {
              sessionDurations[e.session_id] = {
                start: new Date(e.created_at),
                end: new Date(e.created_at)
              };
            } else {
              const eventDate = new Date(e.created_at);
              if (eventDate < sessionDurations[e.session_id].start) {
                sessionDurations[e.session_id].start = eventDate;
              }
              if (eventDate > sessionDurations[e.session_id].end) {
                sessionDurations[e.session_id].end = eventDate;
              }
            }
          }
        });
        const durations = Object.values(sessionDurations).map(s => 
          (s.end - s.start) / 1000 / 60 // Convert to minutes
        );
        const avgDuration = durations.length > 0 
          ? durations.reduce((a, b) => a + b, 0) / durations.length 
          : 0;
        const minutes = Math.floor(avgDuration);
        const seconds = Math.floor((avgDuration - minutes) * 60);
        const visitDuration = `${minutes}m ${seconds}s`;

        setMetrics({
          uniqueVisitors: uniqueVisitors,
          totalVisits: sessions,
          totalPageviews: pageviews,
          viewsPerVisit: parseFloat(viewsPerVisit),
          bounceRate: parseFloat(bounceRate),
          visitDuration: visitDuration
        });

        // Prepare visitor chart data based on chartTimeRange
        let chartData = [];
        
        if (chartTimeRange === 'minutes') {
          // Last 60 minutes from endDate, grouped by minute
          const minutesStart = subMinutes(endDate, 60);
          const minutes = eachMinuteOfInterval({
            start: minutesStart > startDate ? minutesStart : startDate,
            end: endDate
          });
          
          chartData = minutes.map(minute => {
            const minuteEvents = events.filter(e => {
              const eventDate = new Date(e.created_at);
              return eventDate >= minute && eventDate < new Date(minute.getTime() + 60 * 1000);
            });
            const uniqueVisitorsInMinute = new Set(minuteEvents.map(e => e.visitor_id).filter(Boolean)).size;
            return {
              time: format(minute, 'HH:mm'),
              visitors: uniqueVisitorsInMinute
            };
          });
        } else if (chartTimeRange === 'hours') {
          // Group by hour
          const hours = eachHourOfInterval({
            start: startOfDay(startDate),
            end: endOfDay(endDate)
          });
          
          chartData = hours.map(hour => {
            const hourEvents = events.filter(e => {
              const eventDate = new Date(e.created_at);
              return eventDate >= hour && eventDate < new Date(hour.getTime() + 60 * 60 * 1000);
            });
            const uniqueVisitorsInHour = new Set(hourEvents.map(e => e.visitor_id).filter(Boolean)).size;
            return {
              time: format(hour, 'HH:mm'),
              visitors: uniqueVisitorsInHour
            };
          });
        } else if (chartTimeRange === 'days') {
          // Group by day
          const days = [];
          let currentDate = new Date(startDate);
          while (currentDate <= endDate) {
            const dayStart = new Date(currentDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(currentDate);
            dayEnd.setHours(23, 59, 59, 999);
            
            const dayEvents = events.filter(e => {
              const eventDate = new Date(e.created_at);
              return eventDate >= dayStart && eventDate <= dayEnd;
            });
            const uniqueVisitorsInDay = new Set(dayEvents.map(e => e.visitor_id).filter(Boolean)).size;
            
            days.push({
              time: format(dayStart, 'MMM dd'),
              visitors: uniqueVisitorsInDay
            });
            
            currentDate.setDate(currentDate.getDate() + 1);
          }
          chartData = days;
        } else if (chartTimeRange === 'weeks') {
          // Group by week
          const weeks = [];
          let currentDate = new Date(startDate);
          while (currentDate <= endDate) {
            const weekStart = new Date(currentDate);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            
            const weekEvents = events.filter(e => {
              const eventDate = new Date(e.created_at);
              return eventDate >= weekStart && eventDate <= weekEnd;
            });
            const uniqueVisitorsInWeek = new Set(weekEvents.map(e => e.visitor_id).filter(Boolean)).size;
            
            weeks.push({
              time: format(weekStart, 'MMM dd'),
              visitors: uniqueVisitorsInWeek
            });
            
            currentDate.setDate(currentDate.getDate() + 7);
          }
          chartData = weeks;
        }
        
        setVisitorChartData(chartData);

        // Calculate devices data
        const deviceMap = {};
        events.forEach(e => {
          if (e.device_type) {
            const type = e.device_type.toLowerCase();
            if (!deviceMap[type]) {
              deviceMap[type] = {
                type: type,
                visitors: new Set()
              };
            }
            if (e.visitor_id) {
              deviceMap[type].visitors.add(e.visitor_id);
            }
          }
        });
        const devices = Object.values(deviceMap)
          .map(d => ({
            type: d.type,
            visitors: d.visitors.size
          }))
          .sort((a, b) => b.visitors - a.visitors);
        
        const totalDeviceVisitors = devices.reduce((sum, d) => sum + d.visitors, 0);
        const devicesWithPercent = devices.map(d => ({
          ...d,
          percentage: totalDeviceVisitors > 0 ? ((d.visitors / totalDeviceVisitors) * 100).toFixed(1) : 0
        }));
        setDevicesData(devicesWithPercent);

        // Calculate pages data based on pageViewType
        let pages = [];
        
        if (pageViewType === 'entry') {
          // Entry pages: first page visited in each session
          const entryPageMap = {};
          const sessionFirstPages = {};
          
          // Sort events by created_at to find first page per session
          const sortedEvents = [...events].sort((a, b) => 
            new Date(a.created_at) - new Date(b.created_at)
          );
          
          sortedEvents.forEach(e => {
            if (e.session_id && e.page_path) {
              if (!sessionFirstPages[e.session_id]) {
                sessionFirstPages[e.session_id] = e.page_path;
                
                if (!entryPageMap[e.page_path]) {
                  entryPageMap[e.page_path] = {
                    path: e.page_path,
                    sessions: new Set()
                  };
                }
                entryPageMap[e.page_path].sessions.add(e.session_id);
              }
            }
          });
          
          pages = Object.values(entryPageMap)
            .map(p => ({
              path: p.path,
              visitors: p.sessions.size
            }))
            .sort((a, b) => b.visitors - a.visitors);
        } else if (pageViewType === 'exit') {
          // Exit pages: last page visited in each session
          const exitPageMap = {};
          const sessionLastPages = {};
          
          // Sort events by created_at to find last page per session
          const sortedEvents = [...events].sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
          );
          
          sortedEvents.forEach(e => {
            if (e.session_id && e.page_path) {
              if (!sessionLastPages[e.session_id]) {
                sessionLastPages[e.session_id] = e.page_path;
                
                if (!exitPageMap[e.page_path]) {
                  exitPageMap[e.page_path] = {
                    path: e.page_path,
                    sessions: new Set()
                  };
                }
                exitPageMap[e.page_path].sessions.add(e.session_id);
              }
            }
          });
          
          pages = Object.values(exitPageMap)
            .map(p => ({
              path: p.path,
              visitors: p.sessions.size
            }))
            .sort((a, b) => b.visitors - a.visitors);
        } else {
          // Top pages: all page views
          const pageMap = {};
          events.forEach(e => {
            if (e.page_path) {
              if (!pageMap[e.page_path]) {
                pageMap[e.page_path] = {
                  path: e.page_path,
                  visitors: new Set()
                };
              }
              if (e.visitor_id) {
                pageMap[e.page_path].visitors.add(e.visitor_id);
              }
            }
          });
          pages = Object.values(pageMap)
            .map(p => ({
              path: p.path,
              visitors: p.visitors.size
            }))
            .sort((a, b) => b.visitors - a.visitors);
        }
        
        setPagesData(pages);

        // Calculate languages data
        const languageMap = {};
        events.forEach(e => {
          if (e.language) {
            const lang = e.language.toLowerCase();
            if (!languageMap[lang]) {
              languageMap[lang] = {
                language: lang,
                visitors: new Set()
              };
            }
            if (e.visitor_id) {
              languageMap[lang].visitors.add(e.visitor_id);
            }
          }
        });
        const languages = Object.values(languageMap)
          .map(l => ({
            language: l.language,
            visitors: l.visitors.size
          }))
          .sort((a, b) => b.visitors - a.visitors);
        
        const totalLanguageVisitors = languages.reduce((sum, l) => sum + l.visitors, 0);
        const languagesWithPercent = languages.map(l => ({
          ...l,
          percentage: totalLanguageVisitors > 0 ? ((l.visitors / totalLanguageVisitors) * 100).toFixed(1) : 0
        }));
        setLanguagesData(languagesWithPercent);

        // Define funnel steps (used for both funnel and visitor tracking)
        const funnelSteps = [
          { 
            name: 'Formulaire ouvert', 
            eventType: 'form_opened', 
            icon: 'heroicons:document-duplicate',
            category: 'awareness'
          },
          { 
            name: 'Démarrage du formulaire', 
            eventType: 'form_start', 
            icon: 'heroicons:play',
            category: 'awareness'
          },
          { 
            name: 'Services sélectionnés', 
            eventType: 'services_selection_completed', 
            icon: 'heroicons:check-badge',
            category: 'conversion'
          },
          { 
            name: 'Documents uploadés', 
            eventType: 'documents_upload_completed', 
            icon: 'heroicons:document-text',
            category: 'conversion'
          },
          { 
            name: 'Signataires complétés', 
            eventType: 'signatories_completed', 
            icon: 'heroicons:user-group',
            category: 'conversion'
          },
          { 
            name: 'Rendez-vous réservé', 
            eventType: 'appointment_booked', 
            icon: 'heroicons:calendar-days',
            category: 'conversion'
          },
          { 
            name: 'Infos personnelles complétées', 
            eventType: 'personal_info_completed', 
            icon: 'heroicons:user',
            category: 'conversion'
          },
          { 
            name: 'Paiement initié', 
            eventType: 'payment_initiated', 
            icon: 'heroicons:credit-card',
            category: 'conversion'
          },
          { 
            name: 'Conversion (Achat)', 
            eventType: 'purchase', 
            icon: 'heroicons:check-circle',
            category: 'conversion'
          }
        ];
        
        // Store funnel steps for use in visitors table
        setFunnelStepsData(funnelSteps);

        // Calculate visitors data
        const visitorsMap = {};
        events.forEach(e => {
          if (e.visitor_id) {
            if (!visitorsMap[e.visitor_id]) {
              visitorsMap[e.visitor_id] = {
                visitor_id: e.visitor_id,
                sessions: new Set(),
                pageviews: 0,
                events: [],
                completedSteps: new Set(), // Track completed funnel steps
                firstVisit: new Date(e.created_at),
                lastVisit: new Date(e.created_at),
                country: e.country_name || e.country_code || 'Unknown',
                countryCode: e.country_code,
                city: e.city,
                device: e.device_type,
                browser: e.browser_name,
                os: e.os_name,
                language: e.language,
                ip: e.ip_address
              };
            }
            
            const visitor = visitorsMap[e.visitor_id];
            if (e.session_id) {
              visitor.sessions.add(e.session_id);
            }
            if (e.event_type === 'pageview' || e.page_path) {
              visitor.pageviews++;
            }
            
            // Track completed funnel steps
            funnelSteps.forEach((step, index) => {
              if (e.event_type === step.eventType) {
                visitor.completedSteps.add(index);
              }
            });
            
            visitor.events.push({
              event_type: e.event_type,
              page_path: e.page_path,
              created_at: e.created_at,
              metadata: e.metadata
            });
            
            const eventDate = new Date(e.created_at);
            if (eventDate < visitor.firstVisit) {
              visitor.firstVisit = eventDate;
            }
            if (eventDate > visitor.lastVisit) {
              visitor.lastVisit = eventDate;
            }
          }
        });
        
        // Find the furthest completed step for each visitor
        const visitors = Object.values(visitorsMap).map(v => {
          const completedStepIndices = Array.from(v.completedSteps);
          const furthestStepIndex = completedStepIndices.length > 0 
            ? Math.max(...completedStepIndices) 
            : -1;
          const furthestStep = furthestStepIndex >= 0 
            ? funnelSteps[furthestStepIndex] 
            : null;
          
          return {
            ...v,
            sessionsCount: v.sessions.size,
            eventsCount: v.events.length,
            duration: Math.round((v.lastVisit - v.firstVisit) / 1000 / 60), // minutes
            furthestStep: furthestStep,
            furthestStepIndex: furthestStepIndex
          };
        }).sort((a, b) => b.lastVisit - a.lastVisit);
        
        setVisitorsData(visitors);

        // Group events by visitor_id to track progression with detailed metadata
        const visitorProgress = {};
        const eventDetails = {}; // Store detailed event information
        
        events.forEach(e => {
          if (e.visitor_id && e.event_type) {
            if (!visitorProgress[e.visitor_id]) {
              visitorProgress[e.visitor_id] = {
                visitor_id: e.visitor_id,
                events: new Set(),
                eventTypes: [],
                firstEventTime: new Date(e.created_at),
                lastEventTime: new Date(e.created_at)
              };
            }
            
            // Track event type
            visitorProgress[e.visitor_id].events.add(e.event_type);
            visitorProgress[e.visitor_id].eventTypes.push({
              type: e.event_type,
              time: new Date(e.created_at),
              metadata: e.metadata || {},
              page_path: e.page_path
            });
            
            // Track times
            const eventTime = new Date(e.created_at);
            if (eventTime < visitorProgress[e.visitor_id].firstEventTime) {
              visitorProgress[e.visitor_id].firstEventTime = eventTime;
            }
            if (eventTime > visitorProgress[e.visitor_id].lastEventTime) {
              visitorProgress[e.visitor_id].lastEventTime = eventTime;
            }
            
            // Store event details for statistics
            if (!eventDetails[e.event_type]) {
              eventDetails[e.event_type] = {
                count: 0,
                visitors: new Set(),
                metadata: []
              };
            }
            eventDetails[e.event_type].count++;
            eventDetails[e.event_type].visitors.add(e.visitor_id);
            if (e.metadata) {
              eventDetails[e.event_type].metadata.push(e.metadata);
            }
          }
        });

        // Calculate funnel metrics - count each event type only once per visitor
        const funnelMetrics = funnelSteps.map((step, index) => {
          let visitorsAtStep = 0;
          let stats = {};
          
          // Track unique visitors who have this event type (only count once per visitor)
          const visitorsWithStep = new Set();
          
          // Handle special cases for screen_opened events
          if (step.eventType === 'screen_opened' && step.screenPath) {
            // Count unique visitors who opened this specific screen
            Object.values(visitorProgress).forEach(vp => {
              const hasEvent = vp.eventTypes.some(et => 
                et.type === 'screen_opened' && et.page_path === step.screenPath
              );
              if (hasEvent) {
                visitorsWithStep.add(vp.visitor_id);
              }
            });
          } else {
            // Count unique visitors who have this event type (only once per visitor)
            Object.values(visitorProgress).forEach(vp => {
              if (vp.events.has(step.eventType)) {
                visitorsWithStep.add(vp.visitor_id);
              }
            });
          }
          
          visitorsAtStep = visitorsWithStep.size;
          
          // Calculate statistics from metadata
          if (eventDetails[step.eventType]) {
            const eventData = eventDetails[step.eventType];
            
            // Calculate average values from metadata
            if (step.metadataKey && eventData.metadata.length > 0) {
              const values = eventData.metadata
                .map(m => m[step.metadataKey])
                .filter(v => v !== undefined && v !== null);
              
              if (values.length > 0) {
                if (typeof values[0] === 'number') {
                  const sum = values.reduce((a, b) => a + b, 0);
                  stats.average = (sum / values.length).toFixed(2);
                  stats.total = sum;
                } else {
                  // For strings (like service names)
                  const uniqueValues = [...new Set(values)];
                  stats.unique = uniqueValues.length;
                  stats.list = uniqueValues.slice(0, 5); // Top 5
                }
              }
            }
            
            // Calculate additional stats
            stats.eventCount = eventData.count;
            stats.uniqueVisitors = eventData.visitors.size;
          }

          // Calculate conversion rate from previous step (using unique visitors)
          let conversionRate = 100;
          let previousStepVisitors = 0;
          
          if (index > 0) {
            // Find the most recent "conversion" step (not just screen opened)
            let previousStepIndex = index - 1;
            while (previousStepIndex >= 0) {
              const previousStep = funnelSteps[previousStepIndex];
              const previousVisitorsSet = new Set();
              
              if (previousStep.eventType === 'screen_opened' && previousStep.screenPath) {
                // Count unique visitors for previous screen_opened step
                Object.values(visitorProgress).forEach(vp => {
                  const hasEvent = vp.eventTypes.some(et => 
                    et.type === 'screen_opened' && et.page_path === previousStep.screenPath
                  );
                  if (hasEvent) {
                    previousVisitorsSet.add(vp.visitor_id);
                  }
                });
              } else {
                // Count unique visitors for previous event type
                Object.values(visitorProgress).forEach(vp => {
                  if (vp.events.has(previousStep.eventType)) {
                    previousVisitorsSet.add(vp.visitor_id);
                  }
                });
              }
              
              previousStepVisitors = previousVisitorsSet.size;
              
              // Use this step if it has visitors, otherwise go back further
              if (previousStepVisitors > 0 || previousStepIndex === 0) {
                break;
              }
              previousStepIndex--;
            }
            
            if (previousStepVisitors > 0) {
              conversionRate = ((visitorsAtStep / previousStepVisitors) * 100).toFixed(1);
            } else {
              conversionRate = 0;
            }
          }

          // Calculate drop-off rate
          const dropOffRate = index > 0 ? (100 - parseFloat(conversionRate)).toFixed(1) : 0;

          return {
            ...step,
            visitors: visitorsAtStep,
            conversionRate: parseFloat(conversionRate),
            dropOffRate: parseFloat(dropOffRate),
            stats: stats,
            order: index + 1
          };
        });

        setFunnelData(funnelMetrics);
        
        // Calculate site events data (CTA clicks, scroll depth, etc.)
        // Filter events by country if filter is set
        const siteEvents = countryFilter !== 'all' 
          ? events.filter(e => e.country_code === countryFilter)
          : events;
        
        const ctaClicksMap = {};
        const scrollDepthMap = {};
        const navigationClicksMap = {};
        const serviceClicksMap = {};
        
        // Debug: log site events
        console.log('📊 [SITE EVENTS] Total events:', siteEvents.length);
        console.log('📊 [SITE EVENTS] CTA clicks:', siteEvents.filter(e => e.event_type === 'cta_click').length);
        console.log('📊 [SITE EVENTS] Scroll depth:', siteEvents.filter(e => e.event_type === 'scroll_depth').length);
        console.log('📊 [SITE EVENTS] Navigation clicks:', siteEvents.filter(e => e.event_type === 'navigation_click').length);
        console.log('📊 [SITE EVENTS] Service clicks:', siteEvents.filter(e => e.event_type === 'service_click').length);
        
        siteEvents.forEach(e => {
          if (e.event_type === 'cta_click') {
            // Handle both object and string metadata
            let metadata = e.metadata;
            if (typeof metadata === 'string') {
              try {
                metadata = JSON.parse(metadata);
              } catch (err) {
                console.warn('Failed to parse metadata:', err);
                metadata = {};
              }
            }
            const location = metadata?.cta_location || 'unknown';
            if (!ctaClicksMap[location]) {
              ctaClicksMap[location] = {
                location: location,
                count: 0,
                visitors: new Set(),
                serviceId: (typeof e.metadata === 'object' ? e.metadata?.service_id : (typeof e.metadata === 'string' ? JSON.parse(e.metadata)?.service_id : null)) || null
              };
            }
            ctaClicksMap[location].count++;
            if (e.visitor_id) {
              ctaClicksMap[location].visitors.add(e.visitor_id);
            }
          } else if (e.event_type === 'scroll_depth') {
            // Handle both object and string metadata
            let metadata = e.metadata;
            if (typeof metadata === 'string') {
              try {
                metadata = JSON.parse(metadata);
              } catch (err) {
                metadata = {};
              }
            }
            const percentage = metadata?.scroll_percentage || metadata?.percentage || 0;
            if (!scrollDepthMap[percentage]) {
              scrollDepthMap[percentage] = {
                percentage: percentage,
                count: 0,
                visitors: new Set()
              };
            }
            scrollDepthMap[percentage].count++;
            if (e.visitor_id) {
              scrollDepthMap[percentage].visitors.add(e.visitor_id);
            }
          } else if (e.event_type === 'navigation_click') {
            // Handle both object and string metadata
            let metadata = e.metadata;
            if (typeof metadata === 'string') {
              try {
                metadata = JSON.parse(metadata);
              } catch (err) {
                metadata = {};
              }
            }
            const destination = metadata?.destination || 'unknown';
            if (!navigationClicksMap[destination]) {
              navigationClicksMap[destination] = {
                destination: destination,
                count: 0,
                visitors: new Set()
              };
            }
            navigationClicksMap[destination].count++;
            if (e.visitor_id) {
              navigationClicksMap[destination].visitors.add(e.visitor_id);
            }
          } else if (e.event_type === 'service_click') {
            // Handle both object and string metadata
            let metadata = e.metadata;
            if (typeof metadata === 'string') {
              try {
                metadata = JSON.parse(metadata);
              } catch (err) {
                metadata = {};
              }
            }
            const serviceId = metadata?.service_id || 'unknown';
            const serviceName = metadata?.service_name || 'Unknown Service';
            if (!serviceClicksMap[serviceId]) {
              serviceClicksMap[serviceId] = {
                serviceId: serviceId,
                serviceName: serviceName,
                count: 0,
                visitors: new Set()
              };
            }
            serviceClicksMap[serviceId].count++;
            if (e.visitor_id) {
              serviceClicksMap[serviceId].visitors.add(e.visitor_id);
            }
          }
        });
        
        setSiteEventsData({
          ctaClicks: Object.values(ctaClicksMap)
            .map(c => ({
              location: c.location,
              count: c.count,
              uniqueVisitors: c.visitors.size,
              serviceId: c.serviceId
            }))
            .sort((a, b) => b.count - a.count),
          scrollDepth: Object.values(scrollDepthMap)
            .map(s => ({
              percentage: s.percentage,
              count: s.count,
              uniqueVisitors: s.visitors.size
            }))
            .sort((a, b) => a.percentage - b.percentage),
          navigationClicks: Object.values(navigationClicksMap)
            .map(n => ({
              destination: n.destination,
              count: n.count,
              uniqueVisitors: n.visitors.size
            }))
            .sort((a, b) => b.count - a.count),
          serviceClicks: Object.values(serviceClicksMap)
            .map(s => ({
              serviceId: s.serviceId,
              serviceName: s.serviceName,
              count: s.count,
              uniqueVisitors: s.visitors.size
            }))
            .sort((a, b) => b.count - a.count)
        });
      } else {
        // No data, set defaults
        setMetrics({
          uniqueVisitors: 0,
          totalVisits: 0,
          totalPageviews: 0,
          viewsPerVisit: 0,
          bounceRate: 0,
          visitDuration: '0m 0s'
        });
        setVisitorChartData([]);
        setCountriesData([]);
        setDevicesData([]);
        setPagesData([]);
        setFunnelData([]);
        setSiteEventsData({
          ctaClicks: [],
          scrollDepth: [],
          navigationClicks: [],
          serviceClicks: []
        });
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Visitor chart configuration
  const visitorChartConfig = {
    labels: visitorChartData.map(d => d.time),
    datasets: [
      {
        label: 'VISITORS',
        data: visitorChartData.map(d => d.visitors),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.4,
        fill: true
      }
    ]
  };

  const visitorChartOptions = {
    ...defaultChartOptions,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      ...defaultChartOptions.plugins,
      legend: {
        display: false
      },
      tooltip: {
        ...defaultChartOptions.plugins.tooltip,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        callbacks: {
          title: function(context) {
            return `VISITORS`;
          },
          label: function(context) {
            return `${context.parsed.y} visitors`;
          }
        }
      }
    },
    scales: {
      ...defaultChartOptions.scales,
      x: {
        ...defaultChartOptions.scales.x,
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 0,
          minRotation: 0
        }
      },
      y: {
        ...defaultChartOptions.scales.y,
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          precision: 0
        }
      }
    }
  };

  const getCountryFlag = (code) => {
    // Simple flag emoji mapping
    const flags = {
      'GB': '🇬🇧',
      'FR': '🇫🇷',
      'US': '🇺🇸',
      'CA': '🇨🇦',
      'DE': '🇩🇪',
      'ES': '🇪🇸',
      'IT': '🇮🇹',
      'NL': '🇳🇱',
      'BE': '🇧🇪',
      'CH': '🇨🇭',
      'AU': '🇦🇺',
      'NZ': '🇳🇿'
    };
    return flags[code] || '🌍';
  };

  const getDeviceIcon = (type) => {
    if (type === 'mobile') return 'heroicons:device-phone-mobile';
    if (type === 'tablet') return 'heroicons:device-tablet';
    return 'heroicons:computer-desktop';
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-2">Statistiques et analyses du formulaire</p>
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Période:</label>
              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  if (e.target.value !== 'custom') {
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium min-w-[180px]"
              >
                <option value="today">Aujourd'hui</option>
                <option value="yesterday">Hier</option>
                <option value="last7days">7 derniers jours</option>
                <option value="last30days">30 derniers jours</option>
                <option value="custom">Période personnalisée</option>
              </select>
              
              {/* Custom Date Range */}
              {dateFilter === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                    max={customEndDate || format(new Date(), 'yyyy-MM-dd')}
                  />
                  <span className="text-gray-500">→</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                    min={customStartDate}
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
              )}
            </div>
            
            {/* Country Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Pays:</label>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium min-w-[200px]"
              >
                <option value="all">Tous les pays</option>
                {countriesData.length > 0 ? (
                  countriesData.map((country) => (
                    <option key={country.code} value={country.code}>
                      {getCountryFlag(country.code)} {country.name} ({country.visitors})
                    </option>
                  ))
                ) : (
                  <option disabled>Aucun pays disponible</option>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Vue d'ensemble
            </button>
            <button
              onClick={() => setActiveTab('visitors')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'visitors'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Visiteurs
            </button>
            <button
              onClick={() => setActiveTab('countries')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'countries'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pays
            </button>
            <button
              onClick={() => setActiveTab('devices')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'devices'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Appareils
            </button>
            <button
              onClick={() => setActiveTab('pages')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pages'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pages
            </button>
            <button
              onClick={() => setActiveTab('funnel')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'funnel'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Funnel
            </button>
            <button
              onClick={() => setActiveTab('site')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'site'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Site
            </button>
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Time Range Selector */}
            <div className="flex justify-end">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium"
              >
                <option value="hours">Dernières 14 heures</option>
                <option value="days">7 derniers jours</option>
                <option value="weeks">30 derniers jours</option>
              </select>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-600">UNIQUE VISITORS</h3>
                  <Icon icon="heroicons:arrow-trending-up" className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold text-gray-900">{metrics.uniqueVisitors}</span>
                  <span className="text-sm text-green-600 font-medium">100%</span>
                </div>
              </div>

              <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-600">TOTAL VISITS</h3>
                  <Icon icon="heroicons:arrow-trending-up" className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold text-gray-900">{metrics.totalVisits}</span>
                  <span className="text-sm text-green-600 font-medium">100%</span>
                </div>
              </div>

              <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-600">TOTAL PAGEVIEWS</h3>
                  <Icon icon="heroicons:arrow-trending-up" className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold text-gray-900">{metrics.totalPageviews}</span>
                  <span className="text-sm text-green-600 font-medium">100%</span>
                </div>
              </div>

              <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-600">VIEWS PER VISIT</h3>
                  <Icon icon="heroicons:arrow-trending-up" className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold text-gray-900">{metrics.viewsPerVisit}</span>
                  <span className="text-sm text-green-600 font-medium">100%</span>
                </div>
              </div>

              <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-600">BOUNCE RATE</h3>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold text-gray-900">{metrics.bounceRate}%</span>
                </div>
              </div>

              <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-600">VISIT DURATION</h3>
                  <Icon icon="heroicons:arrow-trending-up" className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold text-gray-900">{metrics.visitDuration}</span>
                  <span className="text-sm text-green-600 font-medium">100%</span>
                </div>
              </div>
            </div>

            {/* Visitor Activity Chart */}
            <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">VISITORS</h2>
                <div className="flex items-center space-x-2">
                  <Icon icon="heroicons:arrow-down-tray" className="w-5 h-5 text-gray-600 cursor-pointer hover:text-gray-900" />
                  <select 
                    value={chartTimeRange}
                    onChange={(e) => setChartTimeRange(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-lg bg-white text-sm"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                  </select>
                </div>
              </div>
              <div style={{ height: '300px' }}>
                {visitorChartData.length > 0 ? (
                  <Line data={visitorChartConfig} options={visitorChartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Aucune donnée disponible
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
        
        {/* Funnel Tab */}
        {activeTab === 'funnel' && (
          <div className="space-y-6">

            {/* Conversion Funnel */}
            <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Funnel de conversion</h2>
                <span className="text-sm text-gray-600">Visiteurs uniques</span>
              </div>
              {funnelData.length > 0 ? (
                <div className="space-y-3">
                  {funnelData.map((step, index) => {
                    const maxVisitors = funnelData[0]?.visitors || 1;
                    const percentage = maxVisitors > 0 ? (step.visitors / maxVisitors) * 100 : 0;
                    const isLastStep = index === funnelData.length - 1;
                    const isConversionStep = step.category === 'conversion';
                    
                    // Use conversion rate already calculated in funnelMetrics
                    const conversionRate = step.conversionRate || (index === 0 ? 100 : 0);
                    
                    return (
                      <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isLastStep ? 'bg-green-100' : 
                              isConversionStep ? 'bg-blue-100' : 
                              'bg-gray-100'
                            }`}>
                              <Icon 
                                icon={step.icon} 
                                className={`w-4 h-4 ${
                                  isLastStep ? 'text-green-600' : 
                                  isConversionStep ? 'text-blue-600' : 
                                  'text-gray-600'
                                }`} 
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-900">{step.name}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900">{step.visitors}</div>
                              {index > 0 && (
                                <div className={`text-xs font-medium ${
                                  conversionRate >= 80 ? 'text-green-600' : 
                                  conversionRate >= 50 ? 'text-yellow-600' : 
                                  'text-red-600'
                                }`}>
                                  {conversionRate.toFixed(1)}%
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isLastStep ? 'bg-green-500' : 
                              isConversionStep ? 'bg-blue-500' : 
                              'bg-gray-400'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Summary */}
                  <div className="mt-6 pt-6 border-t border-gray-300 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {funnelData[0]?.visitors || 0}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Visiteurs initiaux</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {funnelData[funnelData.length - 1]?.visitors || 0}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Conversions</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {funnelData[0]?.visitors > 0 
                          ? ((funnelData[funnelData.length - 1]?.visitors / funnelData[0]?.visitors) * 100).toFixed(1)
                          : 0}%
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Taux de conversion</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Aucune donnée disponible pour le funnel
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Site Tab */}
        {activeTab === 'site' && (
          <div className="space-y-6">

            {/* Site Events Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Événements du site</h2>
              
              {/* CTA Clicks */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Clics sur les CTA</h3>
                {siteEventsData.ctaClicks.length > 0 ? (
                  <div className="space-y-3">
                    {siteEventsData.ctaClicks.map((cta, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 capitalize">{cta.location.replace(/_/g, ' ')}</div>
                          {cta.serviceId && (
                            <div className="text-sm text-gray-500">Service: {cta.serviceId}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">{cta.count}</div>
                          <div className="text-sm text-gray-500">{cta.uniqueVisitors} visiteurs uniques</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Aucun clic sur les CTA pour cette période</p>
                )}
              </div>
              
              {/* Scroll Depth */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Profondeur de scroll</h3>
                {siteEventsData.scrollDepth.length > 0 ? (
                  <div className="space-y-3">
                    {siteEventsData.scrollDepth.map((scroll, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{scroll.percentage}% de scroll</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">{scroll.count}</div>
                          <div className="text-sm text-gray-500">{scroll.uniqueVisitors} visiteurs uniques</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Aucune donnée de scroll pour cette période</p>
                )}
              </div>
              
              {/* Navigation Clicks */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Clics de navigation</h3>
                {siteEventsData.navigationClicks.length > 0 ? (
                  <div className="space-y-3">
                    {siteEventsData.navigationClicks.map((nav, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{nav.destination}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">{nav.count}</div>
                          <div className="text-sm text-gray-500">{nav.uniqueVisitors} visiteurs uniques</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Aucun clic de navigation pour cette période</p>
                )}
              </div>
              
              {/* Service Clicks */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Clics sur les services</h3>
                {siteEventsData.serviceClicks.length > 0 ? (
                  <div className="space-y-3">
                    {siteEventsData.serviceClicks.map((service, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{service.serviceName}</div>
                          <div className="text-sm text-gray-500">ID: {service.serviceId}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">{service.count}</div>
                          <div className="text-sm text-gray-500">{service.uniqueVisitors} visiteurs uniques</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Aucun clic sur les services pour cette période</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Countries Tab */}
        {activeTab === 'countries' && (
          <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Countries</h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setCountriesViewType('countries')}
                  className={`px-3 py-1 text-sm font-medium ${countriesViewType === 'countries' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
                >
                  Countries
                </button>
                <button
                  onClick={() => setCountriesViewType('regions')}
                  className={`px-3 py-1 text-sm font-medium ${countriesViewType === 'regions' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
                >
                  Regions
                </button>
                <button
                  onClick={() => setCountriesViewType('cities')}
                  className={`px-3 py-1 text-sm font-medium ${countriesViewType === 'cities' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
                >
                  Cities
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {countriesViewType === 'countries' && (
                countriesData.length > 0 ? (
                  countriesData.map((country, index) => {
                    const maxVisitors = countriesData[0]?.visitors || 1;
                    const percentage = (country.visitors / maxVisitors) * 100;
                    return (
                      <div key={index} className="flex items-center justify-between bg-white rounded-lg p-4">
                        <div className="flex items-center space-x-3 flex-1">
                          <span className="text-2xl">{getCountryFlag(country.code)}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-gray-900">
                                {country.code} {country.name}
                              </span>
                              <span className="text-sm font-semibold text-gray-700">{country.visitors}</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gray-400 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    Aucune donnée disponible
                  </div>
                )
              )}
              {countriesViewType === 'regions' && (
                (() => {
                  // Calculate regions data from fetched events
                  const regionMap = {};
                  eventsData.forEach(e => {
                    if (e.region && e.region.trim()) {
                      const regionKey = `${e.country_code || 'Unknown'}_${e.region}`;
                      if (!regionMap[regionKey]) {
                        regionMap[regionKey] = {
                          region: e.region,
                          countryCode: e.country_code,
                          countryName: e.country_name,
                          visitors: new Set()
                        };
                      }
                      if (e.visitor_id) {
                        regionMap[regionKey].visitors.add(e.visitor_id);
                      }
                    }
                  });
                  const regions = Object.values(regionMap)
                    .map(r => ({
                      region: r.region,
                      countryCode: r.countryCode,
                      countryName: r.countryName,
                      visitors: r.visitors.size
                    }))
                    .sort((a, b) => b.visitors - a.visitors);
                  
                  return regions.length > 0 ? (
                    regions.map((region, index) => {
                      const maxVisitors = regions[0]?.visitors || 1;
                      const percentage = (region.visitors / maxVisitors) * 100;
                      return (
                        <div key={index} className="flex items-center justify-between bg-white rounded-lg p-4">
                          <div className="flex items-center space-x-3 flex-1">
                            <span className="text-2xl">{getCountryFlag(region.countryCode)}</span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-gray-900">
                                  {region.region}
                                  {region.countryName && (
                                    <span className="text-sm text-gray-500 ml-2">({region.countryName})</span>
                                  )}
                                </span>
                                <span className="text-sm font-semibold text-gray-700">{region.visitors}</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gray-400 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      Aucune donnée disponible pour les régions
                    </div>
                  );
                })()
              )}
              {countriesViewType === 'cities' && (
                (() => {
                  // Calculate cities data from fetched events
                  const cityMap = {};
                  eventsData.forEach(e => {
                    if (e.city && e.city.trim()) {
                      const cityKey = `${e.country_code || 'Unknown'}_${e.city}`;
                      if (!cityMap[cityKey]) {
                        cityMap[cityKey] = {
                          city: e.city,
                          countryCode: e.country_code,
                          countryName: e.country_name,
                          region: e.region,
                          visitors: new Set()
                        };
                      }
                      if (e.visitor_id) {
                        cityMap[cityKey].visitors.add(e.visitor_id);
                      }
                    }
                  });
                  const cities = Object.values(cityMap)
                    .map(c => ({
                      city: c.city,
                      countryCode: c.countryCode,
                      countryName: c.countryName,
                      region: c.region,
                      visitors: c.visitors.size
                    }))
                    .sort((a, b) => b.visitors - a.visitors);
                  
                  return cities.length > 0 ? (
                    cities.map((city, index) => {
                      const maxVisitors = cities[0]?.visitors || 1;
                      const percentage = (city.visitors / maxVisitors) * 100;
                      return (
                        <div key={index} className="flex items-center justify-between bg-white rounded-lg p-4">
                          <div className="flex items-center space-x-3 flex-1">
                            <span className="text-2xl">{getCountryFlag(city.countryCode)}</span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-gray-900">
                                  {city.city}
                                  {city.region && (
                                    <span className="text-sm text-gray-500 ml-2">({city.region})</span>
                                  )}
                                  {city.countryName && (
                                    <span className="text-sm text-gray-500 ml-2">- {city.countryName}</span>
                                  )}
                                </span>
                                <span className="text-sm font-semibold text-gray-700">{city.visitors}</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gray-400 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      Aucune donnée disponible pour les villes
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        )}

        {/* Devices Tab */}
        {activeTab === 'devices' && (
          <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Devices</h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setDeviceView('browser')}
                  className={`px-3 py-1 text-sm font-medium ${deviceView === 'browser' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
                >
                  Browser
                </button>
                <button
                  onClick={() => setDeviceView('os')}
                  className={`px-3 py-1 text-sm font-medium ${deviceView === 'os' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
                >
                  OS
                </button>
                <button
                  onClick={() => setDeviceView('size')}
                  className={`px-3 py-1 text-sm font-medium ${deviceView === 'size' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
                >
                  Size
                </button>
              </div>
            </div>
            {deviceView === 'size' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6">
                  <h3 className="text-sm font-semibold text-gray-600 mb-4">Screen size</h3>
                  <div className="space-y-4">
                    {devicesData.map((device, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors ${
                          device.type === 'mobile' ? 'bg-gray-100' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon
                            icon={getDeviceIcon(device.type)}
                            className={`w-5 h-5 ${device.type === 'mobile' ? 'text-gray-900' : 'text-gray-400'}`}
                          />
                          <span className={`font-medium ${device.type === 'mobile' ? 'text-gray-900' : 'text-gray-600'}`}>
                            {device.type === 'mobile' ? 'Mobile' : device.type === 'tablet' ? 'Tablet' : 'Desktop'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm font-semibold text-gray-900">{device.visitors}</span>
                          <span className="text-sm text-gray-600 w-16 text-right">{device.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-6">
                  <div className="space-y-4">
                    {devicesData.map((device, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">
                          {device.type === 'mobile' ? 'Mobile' : device.type === 'tablet' ? 'Tablet' : 'Desktop'}
                        </span>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm font-semibold text-gray-900">{device.visitors}</span>
                          <span className="text-sm text-gray-600 w-16 text-right">{device.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="mt-6 flex justify-center">
              <button className="flex items-center space-x-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors">
                <Icon icon="heroicons:square-bracket" className="w-5 h-5" />
                <span>DETAILS</span>
              </button>
            </div>
          </div>
        )}

        {/* Languages Tab */}
        {activeTab === 'languages' && (
          <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Langues</h2>
            </div>
            {languagesData.length > 0 ? (
              <div className="space-y-4">
                {languagesData.map((lang, index) => {
                  const maxVisitors = languagesData[0]?.visitors || 1;
                  const percentage = (lang.visitors / maxVisitors) * 100;
                  const languageNames = {
                    'en': 'English',
                    'fr': 'Français',
                    'es': 'Español',
                    'de': 'Deutsch',
                    'it': 'Italiano',
                    'pt': 'Português',
                    'nl': 'Nederlands',
                    'pl': 'Polski',
                    'ru': 'Русский',
                    'ja': '日本語',
                    'zh': '中文',
                    'ko': '한국어',
                    'ar': 'العربية',
                    'tr': 'Türkçe',
                    'sv': 'Svenska',
                    'da': 'Dansk',
                    'no': 'Norsk',
                    'fi': 'Suomi',
                    'cs': 'Čeština',
                    'hu': 'Magyar',
                    'ro': 'Română',
                    'el': 'Ελληνικά',
                    'th': 'ไทย',
                    'vi': 'Tiếng Việt',
                    'id': 'Bahasa Indonesia',
                    'ms': 'Bahasa Melayu',
                    'hi': 'हिन्दी'
                  };
                  const languageName = languageNames[lang.language] || lang.language.toUpperCase();
                  
                  return (
                    <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg font-semibold text-gray-900">{languageName}</span>
                          <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                            {lang.language}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm font-semibold text-gray-900">{lang.visitors}</span>
                          <span className="text-sm text-gray-600 w-16 text-right">{lang.percentage}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Aucune donnée disponible
              </div>
            )}
            <div className="mt-6 flex justify-center">
              <button className="flex items-center space-x-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors">
                <Icon icon="heroicons:square-bracket" className="w-5 h-5" />
                <span>DETAILS</span>
              </button>
            </div>
          </div>
        )}

        {/* Visitors Tab */}
        {activeTab === 'visitors' && (
          <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Visiteurs</h2>
              <span className="text-sm text-gray-600">{visitorsData.length} visiteurs uniques</span>
            </div>
            
            {visitorsData.length > 0 ? (
              <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Visiteur</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Localisation</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Appareil</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Étape du funnel</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sessions</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Pages vues</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Événements</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Dernière visite</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {visitorsData.map((visitor, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <Icon icon="heroicons:user" className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {visitor.visitor_id.substring(0, 12)}...
                                </div>
                                <div className="text-xs text-gray-500">
                                  {format(new Date(visitor.firstVisit), 'dd/MM/yyyy HH:mm')}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getCountryFlag(visitor.countryCode)}</span>
                              <div>
                                <div className="text-sm text-gray-900">{visitor.country}</div>
                                {visitor.city && (
                                  <div className="text-xs text-gray-500">{visitor.city}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Icon icon={getDeviceIcon(visitor.device)} className="w-4 h-4 text-gray-600" />
                              <div>
                                <div className="text-sm text-gray-900 capitalize">{visitor.device || 'Unknown'}</div>
                                <div className="text-xs text-gray-500">{visitor.browser} / {visitor.os}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {visitor.furthestStep ? (
                              <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  visitor.furthestStepIndex === 8 ? 'bg-green-100' : 
                                  visitor.furthestStep.category === 'conversion' ? 'bg-blue-100' : 
                                  'bg-gray-100'
                                }`}>
                                  <Icon 
                                    icon={visitor.furthestStep.icon} 
                                    className={`w-3 h-3 ${
                                      visitor.furthestStepIndex === 8 ? 'text-green-600' : 
                                      visitor.furthestStep.category === 'conversion' ? 'text-blue-600' : 
                                      'text-gray-600'
                                    }`} 
                                  />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{visitor.furthestStep.name}</div>
                                  <div className="text-xs text-gray-500">
                                    Étape {visitor.furthestStepIndex + 1} / {funnelStepsData.length}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">Aucune étape</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-semibold text-gray-900">{visitor.sessionsCount}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-semibold text-gray-900">{visitor.pageviews}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-semibold text-gray-900">{visitor.eventsCount}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">
                              {format(new Date(visitor.lastVisit), 'dd/MM/yyyy')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {format(new Date(visitor.lastVisit), 'HH:mm')}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => {
                                setSelectedVisitor(visitor);
                                setSelectedVisitorEvents(visitor.events.sort((a, b) => 
                                  new Date(b.created_at) - new Date(a.created_at)
                                ));
                                setVisitorDetailModalOpen(true);
                              }}
                              className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              Voir détails
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Aucune donnée disponible
              </div>
            )}
          </div>
        )}

        {/* Pages Tab */}
        {activeTab === 'pages' && (
          <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {pageViewType === 'entry' ? 'Entry Pages' : 
                 pageViewType === 'exit' ? 'Exit Pages' : 
                 'Top Pages'}
              </h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setPageViewType('top')}
                  className={`px-3 py-1 text-sm font-medium ${pageViewType === 'top' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
                >
                  Top Pages
                </button>
                <button
                  onClick={() => setPageViewType('entry')}
                  className={`px-3 py-1 text-sm font-medium ${pageViewType === 'entry' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
                >
                  Entry Pages
                </button>
                <button
                  onClick={() => setPageViewType('exit')}
                  className={`px-3 py-1 text-sm font-medium ${pageViewType === 'exit' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
                >
                  Exit Pages
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {pagesData.length > 0 ? (
                pagesData.map((page, index) => (
                  <div key={index} className="flex items-center justify-between bg-white rounded-lg p-4 hover:shadow-md transition-shadow">
                    <span className="text-sm font-medium text-gray-900">{page.path || '/'}</span>
                    <span className="text-sm font-semibold text-gray-700">{page.visitors}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Aucune donnée disponible
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-center">
              <button className="flex items-center space-x-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors">
                <Icon icon="heroicons:square-bracket" className="w-5 h-5" />
                <span>DETAILS</span>
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Visitor Detail Modal */}
      {visitorDetailModalOpen && selectedVisitor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Détails du visiteur</h2>
                <p className="text-sm text-gray-600 mt-1">{selectedVisitor.visitor_id}</p>
              </div>
              <button
                onClick={() => setVisitorDetailModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon icon="heroicons:x-mark" className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            {/* Visitor Info */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Localisation</div>
                  <div className="text-sm font-medium text-gray-900">
                    {getCountryFlag(selectedVisitor.countryCode)} {selectedVisitor.country}
                    {selectedVisitor.city && `, ${selectedVisitor.city}`}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Appareil</div>
                  <div className="text-sm font-medium text-gray-900 capitalize">
                    {selectedVisitor.device || 'Unknown'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Navigateur</div>
                  <div className="text-sm font-medium text-gray-900">
                    {selectedVisitor.browser || 'Unknown'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Langue</div>
                  <div className="text-sm font-medium text-gray-900 uppercase">
                    {selectedVisitor.language || 'Unknown'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Sessions</div>
                  <div className="text-sm font-medium text-gray-900">
                    {selectedVisitor.sessionsCount}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Pages vues</div>
                  <div className="text-sm font-medium text-gray-900">
                    {selectedVisitor.pageviews}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Première visite</div>
                  <div className="text-sm font-medium text-gray-900">
                    {format(new Date(selectedVisitor.firstVisit), 'dd/MM/yyyy HH:mm')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Dernière visite</div>
                  <div className="text-sm font-medium text-gray-900">
                    {format(new Date(selectedVisitor.lastVisit), 'dd/MM/yyyy HH:mm')}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Events List */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Événements ({selectedVisitorEvents.length})
              </h3>
              <div className="space-y-2">
                {selectedVisitorEvents.map((event, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                            {event.event_type}
                          </span>
                          {event.page_path && (
                            <span className="text-sm text-gray-600">{event.page_path}</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(event.created_at), 'dd/MM/yyyy HH:mm:ss')}
                        </div>
                        {event.metadata && Object.keys(event.metadata).length > 0 && (
                          <div className="mt-2 text-xs">
                            <details className="cursor-pointer">
                              <summary className="text-gray-600 hover:text-gray-900">Métadonnées</summary>
                              <pre className="mt-2 p-2 bg-white rounded border border-gray-200 text-xs overflow-x-auto">
                                {JSON.stringify(event.metadata, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setVisitorDetailModalOpen(false)}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Analytics;

