import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import ClientLayout from '../../components/ClientLayout';
import SignatoriesList from '../../components/SignatoriesList';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { getServicePrice, getServicePriceCurrency, getOptionPrice, getOptionPriceCurrency } from '../../utils/pricing';
import { formatPriceDirect } from '../../utils/currency';

const SubmissionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [submission, setSubmission] = useState(null);
  const [clientInfo, setClientInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [servicesMap, setServicesMap] = useState({});
  const [optionsMap, setOptionsMap] = useState({});
  const [notarizedFiles, setNotarizedFiles] = useState([]);
  const [fileComments, setFileComments] = useState({});
  const [signatories, setSignatories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('services');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'notarized') {
      setActiveTab('notarized');
    }
  }, [searchParams]);

  useEffect(() => {
    fetchSubmissionDetail();
  }, [id]);

  // Fetch transactions when transactions tab is active
  useEffect(() => {
    if (activeTab === 'transactions' && id) {
      fetchTransactions();
    }
  }, [activeTab, id]);

  // Update page title based on active tab
  useEffect(() => {
    const tabTitles = {
      'services': 'Services & Documents',
      'signatories': 'Signatories',
      'transactions': 'Transactions',
      'notarized': 'Notarized Documents',
    };
    
    const tabTitle = tabTitles[activeTab] || 'Submission Details';
    document.title = tabTitle;
    console.log('📄 [SUBMISSION-DETAIL-TITLE] Titre mis à jour:', tabTitle, 'pour l\'onglet:', activeTab);
  }, [activeTab]);

  const fetchSubmissionDetail = async () => {
    setLoading(true);
    try {
      console.log('🔍 [SUBMISSION DETAIL] Fetching submission:', id);
      // Get current user and client info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ [SUBMISSION DETAIL] No user found, redirecting to login');
        navigate('/login');
        return;
      }
      console.log('✅ [SUBMISSION DETAIL] User found:', user.id);

      const { data: client, error: clientError } = await supabase
        .from('client')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (clientError) throw clientError;
      setClientInfo(client);

      // Get submission detail
      const { data: submissionData, error: submissionError } = await supabase
        .from('submission')
        .select('*')
        .eq('id', id)
        .eq('client_id', client.id)
        .single();

      if (submissionError) throw submissionError;

      // Parse JSONB data field if it's a string
      if (submissionData && submissionData.data) {
        if (typeof submissionData.data === 'string') {
          try {
            submissionData.data = JSON.parse(submissionData.data);
          } catch (e) {
            console.error('Error parsing submission.data:', e);
          }
        }
      }

      // Manually load notary data if assigned
      if (submissionData && submissionData.assigned_notary_id) {
        const { data: notaryData } = await supabase
          .from('notary')
          .select('id, name, email, phone')
          .eq('id', submissionData.assigned_notary_id)
          .single();

        submissionData.notary = notaryData;
      }

      console.log('📋 [SUBMISSION] Loaded submission:', {
        id: submissionData?.id,
        status: submissionData?.status,
        hasData: !!submissionData?.data,
        selectedServices: submissionData?.data?.selectedServices,
        serviceDocuments: submissionData?.data?.serviceDocuments,
        signatories: submissionData?.data?.signatories
      });

      if (!submissionData) {
        console.error('❌ [SUBMISSION DETAIL] No submission data returned');
        throw new Error('Submission not found');
      }

      setSubmission(submissionData);

      // Fetch all services to create a map
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*');

      if (servicesError) {
        console.error('❌ [SUBMISSION DETAIL] Error fetching services:', servicesError);
      }

      const sMap = {};
      if (servicesData && Array.isArray(servicesData)) {
        servicesData.forEach(service => {
          if (service && service.service_id) {
            sMap[service.service_id] = service;
          }
        });
        console.log('✅ [SUBMISSION DETAIL] Loaded services map:', Object.keys(sMap).length, 'services');
      } else {
        console.warn('⚠️ [SUBMISSION DETAIL] No services data or invalid format');
      }
      setServicesMap(sMap);

      // Fetch all options to create a map
      const { data: optionsData } = await supabase
        .from('options')
        .select('*');

      const oMap = {};
      if (optionsData) {
        optionsData.forEach(option => {
          oMap[option.option_id] = option;
        });
      }
      setOptionsMap(oMap);

      // Fetch notarized files
      const { data: notarizedFilesData, error: notarizedFilesError } = await supabase
        .from('notarized_files')
        .select('*')
        .eq('submission_id', id)
        .order('uploaded_at', { ascending: false });

      if (!notarizedFilesError && notarizedFilesData) {
        setNotarizedFiles(notarizedFilesData || []);
        
        // Fetch comments for each file
        const fileIds = (notarizedFilesData || []).map(f => f.id);
        if (fileIds.length > 0) {
          const { data: commentsData, error: commentsError } = await supabase
            .from('file_comments')
            .select('*')
            .in('file_id', fileIds)
            .order('created_at', { ascending: true });

          if (!commentsError && commentsData) {
            const commentsMap = {};
            commentsData.forEach(comment => {
              if (!commentsMap[comment.file_id]) {
                commentsMap[comment.file_id] = [];
              }
              commentsMap[comment.file_id].push(comment);
            });
            setFileComments(commentsMap);
          }
        }
      }

      // Fetch signatories (ignore 403 errors - may not have permission)
      const { data: signatoriesData, error: signatoriesError } = await supabase
        .from('signatories')
        .select('*')
        .eq('submission_id', id)
        .order('created_at', { ascending: true });

      if (signatoriesError) {
        // 403 Forbidden is expected if signatories table is not accessible
        if (signatoriesError.code !== 'PGRST116' && signatoriesError.status !== 403) {
          console.warn('⚠️ [SUBMISSION DETAIL] Error fetching signatories:', signatoriesError);
        }
        setSignatories([]);
      } else if (signatoriesData) {
        setSignatories(signatoriesData || []);
      }

    } catch (error) {
      console.error('Error fetching submission detail:', error);
      toast.error('Error loading submission details');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };


  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      pending_payment: 'bg-orange-100 text-orange-800 border-orange-200',
      confirmed: 'bg-green-100 text-green-800 border-green-200',
      in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-purple-100 text-purple-800 border-purple-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      accepted: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200'
    };

    const labels = {
      pending: 'Pending',
      pending_payment: 'Pending Payment',
      confirmed: 'Confirmed',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      accepted: 'Accepted',
      rejected: 'Rejected'
    };

    return (
      <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${styles[status] || styles.pending}`}>
        {labels[status] || status?.charAt(0).toUpperCase() + status?.slice(1).replace('_', ' ')}
      </span>
    );
  };

  const getPaymentStatusBadge = (paymentStatus) => {
    const styles = {
      paid: 'bg-green-100 text-green-800 border-green-200',
      unpaid: 'bg-red-100 text-red-800 border-red-200',
      no_payment_required: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    const labels = {
      paid: 'Paid',
      unpaid: 'Unpaid',
      no_payment_required: 'N/A'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[paymentStatus] || styles.unpaid}`}>
        {labels[paymentStatus] || 'Pending'}
      </span>
    );
  };

  const downloadDocument = async (publicUrl, fileName) => {
    try {
      // Download via public URL
      const response = await fetch(publicUrl);
      const blob = await response.blob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Get currency from submission data
  const getCurrency = () => {
    return submission?.data?.currency || 'EUR';
  };

  // Convert EUR price to target currency
  const convertPrice = (eurAmount) => {
    const currency = getCurrency();
    
    // If currency is EUR, no conversion needed
    if (currency === 'EUR') {
      return eurAmount;
    }

    // Try to get exchange rate from payment data
    const paymentData = submission?.data?.payment;
    if (paymentData && paymentData.amount_paid && paymentData.currency) {
      // Calculate total in EUR from services
      let totalEUR = 0;
      const selectedServices = submission?.data?.selectedServices || [];
      const serviceDocuments = submission?.data?.serviceDocuments || {};
      
      // Only calculate if servicesMap and optionsMap are available
      if (Object.keys(servicesMap).length > 0) {
        selectedServices.forEach(serviceId => {
          const service = servicesMap[serviceId];
          const documents = serviceDocuments[serviceId] || [];
          if (service) {
            const currency = getCurrency();
            const servicePrice = getServicePrice(service, currency);
            totalEUR += documents.length * servicePrice;
            documents.forEach(doc => {
              if (doc.selectedOptions && Object.keys(optionsMap).length > 0) {
                doc.selectedOptions.forEach(optionId => {
                  const option = optionsMap[optionId];
                  if (option) {
                    const optionPrice = getOptionPrice(option, getCurrency());
                    totalEUR += optionPrice;
                  }
                });
              }
            });
          }
        });
        
        // Add signatories cost
        const signatoriesFromData = submission?.data?.signatories || submission?.data?.signatoriesByDocument || {};
        if (Array.isArray(signatoriesFromData) && signatoriesFromData.length > 1) {
          totalEUR += (signatoriesFromData.length - 1) * 10;
        } else if (typeof signatoriesFromData === 'object') {
          Object.values(signatoriesFromData).forEach(docSignatories => {
            if (Array.isArray(docSignatories) && docSignatories.length > 1) {
              totalEUR += (docSignatories.length - 1) * 10;
            }
          });
        }
        
        // Calculate exchange rate from actual payment
        if (totalEUR > 0) {
          const paidAmount = paymentData.amount_paid / 100; // Convert from cents
          const exchangeRate = paidAmount / totalEUR;
          return eurAmount * exchangeRate;
        }
      }
    }

    // Fallback to approximate exchange rates if payment data not available
    const exchangeRates = {
      'USD': 1.10,  // 1 EUR = 1.10 USD (approximate)
      'GBP': 0.85,  // 1 EUR = 0.85 GBP (approximate)
      'CAD': 1.50,  // 1 EUR = 1.50 CAD (approximate)
      'AUD': 1.65,  // 1 EUR = 1.65 AUD (approximate)
      'CHF': 0.95,  // 1 EUR = 0.95 CHF (approximate)
      'JPY': 165,   // 1 EUR = 165 JPY (approximate)
      'CNY': 7.80   // 1 EUR = 7.80 CNY (approximate)
    };

    const rate = exchangeRates[currency] || 1;
    return eurAmount * rate;
  };

  // Format price according to submission currency
  const formatPrice = (amount, sourceCurrency = 'EUR') => {
    const currency = getCurrency();
    
    // If price is already in target currency, format directly without conversion
    if (sourceCurrency === currency) {
      const formatted = formatPriceDirect(amount, currency);
      return formatted.formatted;
    }
    
    // Otherwise, convert from sourceCurrency (assumed EUR for now) to target currency
    const convertedAmount = convertPrice(amount);
    const locale = currency === 'USD' ? 'en-US' : currency === 'GBP' ? 'en-GB' : currency === 'CAD' ? 'en-CA' : currency === 'AUD' ? 'en-AU' : currency === 'CHF' ? 'de-CH' : currency === 'JPY' ? 'ja-JP' : currency === 'CNY' ? 'zh-CN' : 'fr-FR';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(convertedAmount);
  };

  // Get currency symbol
  const getCurrencySymbol = () => {
    const currency = getCurrency();
    const locale = currency === 'USD' ? 'en-US' : currency === 'GBP' ? 'en-GB' : currency === 'CAD' ? 'en-CA' : currency === 'AUD' ? 'en-AU' : 'fr-FR';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(0).replace(/[\d.,\s]/g, '');
  };

  // Convert appointment time from Florida time (UTC-5) to client timezone for display
  const formatAppointmentTime = (time, date, timezone) => {
    if (!time || !date) return 'Not selected';
    
    try {
      // IMPORTANT: The time stored in submission.appointment_time is in Florida time (UTC-5)
      // We need to convert it to the client's timezone for display
      
      // Parse the stored time (Florida time, UTC-5)
      const [floridaHours, floridaMinutes] = time.split(':').map(Number);
      
      // Get client timezone offset
      let clientOffsetHours = 0;
      if (timezone && timezone.startsWith('UTC')) {
        const match = timezone.match(/UTC([+-])(\d+)(?::(\d+))?/);
        if (match) {
          const sign = match[1] === '+' ? 1 : -1;
          const hours = parseInt(match[2], 10);
          const minutes = match[3] ? parseInt(match[3], 10) : 0;
          clientOffsetHours = sign * (hours + minutes / 60);
        }
      }
      
      // Florida is UTC-5
      const floridaOffsetHours = -5;
      
      // Calculate the difference between client timezone and Florida timezone
      const offsetDiff = clientOffsetHours - floridaOffsetHours;
      
      // Convert Florida time to client timezone
      let clientHour = floridaHours + offsetDiff;
      const clientMinutes = floridaMinutes;
      
      // Handle day overflow/underflow
      if (clientHour < 0) {
        clientHour += 24;
      } else if (clientHour >= 24) {
        clientHour -= 24;
      }
      
      // Format in 12-hour format
      const hour = Math.floor(clientHour);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      
      // Format with proper padding for minutes
      return `${displayHour}:${String(clientMinutes).padStart(2, '0')} ${period}`;
    } catch (error) {
      console.error('Error formatting appointment time:', error);
      // Fallback to original format
      return time;
    }
  };

  const fetchTransactions = async () => {
    if (!id) return;
    
    setTransactionsLoading(true);
    try {
      // Fetch submission with payment data from Supabase
      const { data: submissionData, error } = await supabase
        .from('submission')
        .select('id, email, phone, first_name, last_name, created_at, data')
        .eq('id', id)
        .single();

      if (error) throw error;

      const allTransactions = [];
      const paymentData = submissionData?.data?.payment;

      if (paymentData) {
        // Initial payment transaction
        if (paymentData.payment_intent_id && paymentData.amount_paid) {
          const paymentDate = paymentData.paid_at 
            ? new Date(paymentData.paid_at).getTime() / 1000 
            : submissionData.created_at 
              ? new Date(submissionData.created_at).getTime() / 1000 
              : Date.now() / 1000;

          allTransactions.push({
            id: paymentData.payment_intent_id,
            type: 'payment',
            amount: paymentData.amount_paid / 100,
            currency: paymentData.currency || 'usd',
            status: paymentData.payment_status === 'paid' ? 'succeeded' : paymentData.payment_status || 'pending',
            created: paymentDate,
            email: submissionData.email,
            phone: submissionData.phone,
            invoiceUrl: paymentData.invoice_url || null
          });

          // Additional payments
          if (paymentData.additional_payments && Array.isArray(paymentData.additional_payments)) {
            for (const additionalPayment of paymentData.additional_payments) {
              const paymentDate = additionalPayment.created_at 
                ? new Date(additionalPayment.created_at).getTime() / 1000 
                : Date.now() / 1000;

              allTransactions.push({
                id: additionalPayment.payment_intent_id,
                type: 'payment',
                amount: additionalPayment.amount / 100,
                currency: additionalPayment.currency || paymentData.currency || 'usd',
                status: additionalPayment.status || 'succeeded',
                created: paymentDate,
                email: submissionData.email,
                phone: submissionData.phone,
                invoiceUrl: additionalPayment.invoice_url || null
              });
            }
          }

          // Refunds
          if (paymentData.refunds && Array.isArray(paymentData.refunds)) {
            for (const refund of paymentData.refunds) {
              const refundDate = refund.created_at 
                ? new Date(refund.created_at).getTime() / 1000 
                : Date.now() / 1000;

              allTransactions.push({
                id: refund.id || `refund_${paymentData.payment_intent_id}_${refundDate}`,
                type: 'refund',
                amount: refund.amount / 100,
                currency: refund.currency || paymentData.currency || 'usd',
                status: refund.status || 'succeeded',
                created: refundDate,
                reason: refund.reason || null,
                email: submissionData.email,
                phone: submissionData.phone,
                invoiceUrl: refund.invoice_url || null
              });
            }
          }
        }
      }

      // Sort by date (most recent first)
      allTransactions.sort((a, b) => b.created - a.created);

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const retryPayment = () => {
    try {
      console.log('🔄 Retrying payment for submission:', submission.id);
      console.log('📋 [RETRY] submission.data:', submission.data);

      const d = submission.data || {};

      // Handle both camelCase (edge function) and snake_case (submissionSave) formats
      const selectedServices = d.selectedServices || d.selected_services || [];
      const serviceDocuments = d.serviceDocuments || d.documents || {};
      const deliveryMethod = d.deliveryMethod || d.delivery_method || 'digital';
      const currency = d.currency || 'EUR';

      // Build formData matching the localStorage format the form expects
      const formData = {
        // Services (step 1)
        selectedServices,
        // Documents (step 2)
        serviceDocuments,
        // Delivery (step 3)
        deliveryMethod,
        postalDelivery: d.postalDelivery || d.postal_delivery || false,
        // Personal info (step 4) — top-level submission fields
        firstName: submission.first_name || d.firstName || d.first_name || '',
        lastName: submission.last_name || d.lastName || d.last_name || '',
        email: submission.email || d.email || '',
        phone: submission.phone || d.phone || '',
        address: submission.address || d.address || '',
        city: submission.city || d.city || '',
        postalCode: submission.postal_code || d.postalCode || d.postal_code || '',
        country: submission.country || d.country || '',
        notes: submission.notes || d.notes || '',
        // Appointment
        appointmentDate: submission.appointment_date || d.appointmentDate || d.appointment_date || '',
        appointmentTime: submission.appointment_time || d.appointmentTime || d.appointment_time || '',
        timezone: submission.timezone || d.timezone || '',
        // Signatories
        signatories: d.signatories || [],
        signatoriesCount: d.signatoriesCount || d.signatories_count || 0,
        additionalSignatoriesCount: d.additionalSignatoriesCount || 0,
        isSignatory: d.isSignatory || d.is_signatory || false,
        // Currency
        currency,
      };

      console.log('📋 [RETRY] Prepared formData:', {
        services: formData.selectedServices.length,
        documents: Object.keys(formData.serviceDocuments).length,
        delivery: formData.deliveryMethod,
        email: formData.email,
        currency: formData.currency,
      });

      // Save to localStorage so the form can pick it up
      localStorage.setItem('notaryFormData', JSON.stringify(formData));
      // Mark all steps as completed so user can access summary directly
      localStorage.setItem('notaryCompletedSteps', JSON.stringify([0, 1, 2, 3, 4]));
      // Save currency
      localStorage.setItem('notaryCurrency', formData.currency);

      console.log('✅ [RETRY] Form data saved to localStorage, redirecting to summary');

      // Redirect to the summary page
      navigate('/form/summary');
    } catch (error) {
      console.error('❌ Error preparing retry payment:', error);
      toast.error('Failed to prepare payment. Please try again.');
    }
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </ClientLayout>
    );
  }

  if (!submission) {
    return (
      <ClientLayout>
        <div className="text-center py-12">
          <Icon icon="heroicons:exclamation-circle" className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 text-lg font-semibold mb-2">Submission not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-glassy px-6 py-2 text-white font-semibold rounded-full"
          >
            Back to Dashboard
          </button>
        </div>
      </ClientLayout>
    );
  }

  const selectedServices = submission.data?.selectedServices || [];
  const serviceDocuments = submission.data?.serviceDocuments || {};

  return (
    <ClientLayout>
      <div className="w-full px-4 sm:px-6 lg:px-8 overflow-x-hidden pt-6 sm:pt-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-sm sm:text-base text-gray-600 hover:text-gray-900 mb-3 sm:mb-4"
          >
            <Icon icon="heroicons:arrow-left" className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Back to Dashboard
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Request Details</h1>
              <p className="text-xs sm:text-base text-gray-600">Submitted on {formatDate(submission.created_at)}</p>
            </div>
            <div className="flex-shrink-0">
              {getStatusBadge(submission.status)}
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="mb-6 sm:mb-8">
          <div className="flex space-x-4 sm:space-x-6 border-b border-gray-200 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <button
              onClick={() => setActiveTab('services')}
              className={`pb-3 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'services'
                  ? 'text-black'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon icon="heroicons:document-text" className="w-4 h-4" />
              <span>Services & Documents</span>
              {activeTab === 'services' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('signatories')}
              className={`pb-3 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'signatories'
                  ? 'text-black'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon icon="heroicons:users" className="w-4 h-4" />
              <span>Signatories</span>
              {activeTab === 'signatories' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('transactions')}
              className={`pb-3 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'transactions'
                  ? 'text-black'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon icon="heroicons:credit-card" className="w-4 h-4" />
              <span>Transactions</span>
              {transactions.length > 0 && (
                <span className="px-2 py-0.5 bg-gray-200 rounded-full text-xs">
                  {transactions.length}
                </span>
              )}
              {activeTab === 'transactions' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('notarized')}
              className={`pb-3 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'notarized'
                  ? 'text-black'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon icon="heroicons:document-check" className="w-4 h-4" />
              <span>Notarized Documents</span>
              {notarizedFiles.length > 0 && (
                <span className="px-2 py-0.5 bg-gray-200 rounded-full text-xs">
                  {notarizedFiles.length}
                </span>
              )}
              {activeTab === 'notarized' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
              )}
            </button>
          </div>
        </div>

        <div className="w-full">
          {/* Main Content - Takes remaining space */}
          <div className="w-full min-w-0">
            <div className="space-y-4 sm:space-y-6">
              {/* Services & Documents Tab */}
              {activeTab === 'services' && (
              <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                    <Icon icon="heroicons:check-badge" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  </div>
                  <span className="text-base sm:text-xl">Services & Documents</span>
                </h2>
                {selectedServices.length === 0 ? (
                  <p className="text-sm sm:text-base text-gray-600">No services selected for this submission.</p>
                ) : (
                <div className="space-y-3 sm:space-y-4">
                  {selectedServices.map((serviceId) => {
                    const service = servicesMap[serviceId];
                    const documents = serviceDocuments[serviceId] || [];

                    if (!service) return null;

                    const currency = getCurrency();
                    const servicePrice = getServicePrice(service, currency);
                    const serviceTotal = documents.length * servicePrice;

                    return (
                      <div key={serviceId} className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200">
                        <div className="flex items-start justify-between mb-2 sm:mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base sm:text-lg text-gray-900">{service.name}</h3>
                            <p className="text-xs sm:text-sm text-gray-700 mt-1 sm:mt-2">
                              {documents.length} document{documents.length > 1 ? 's' : ''} × {formatPrice(getServicePrice(service, getCurrency()), getServicePriceCurrency(service, getCurrency()))} =
                              <span className="font-bold text-gray-900"> {formatPrice(serviceTotal, getServicePriceCurrency(service, getCurrency()))}</span>
                            </p>
                          </div>
                        </div>

                        {/* Documents for this service */}
                        {documents.length > 0 && (
                          <div className="mt-3 sm:mt-4 space-y-2 pl-3 sm:pl-4 border-l-2 border-gray-200">
                            {documents.map((doc, index) => {
                              const docOptions = doc.selectedOptions || [];
                              let optionsTotal = 0;
                              const docKey = `${serviceId}_${index}`;
                              
                              // Signatories are global for the entire submission, not per document
                              // Don't calculate signatories cost per document

                              return (
                                <div key={index} className="bg-gray-50 rounded-lg p-2 sm:p-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center flex-1 min-w-0">
                                      <Icon icon="heroicons:document-text" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 mr-2 flex-shrink-0" />
                                      <div className="min-w-0 flex-1">
                                        <p className="font-medium text-xs sm:text-sm text-gray-900 truncate">{doc.name}</p>
                                        <p className="text-[10px] sm:text-xs text-gray-500">{(doc.size / 1024).toFixed(2)} KB</p>
                                      </div>
                                    </div>
                                    {doc.public_url && (
                                      <button
                                        onClick={() => downloadDocument(doc.public_url, doc.name)}
                                        className="ml-2 text-black hover:text-gray-700 font-medium text-[10px] sm:text-xs flex items-center flex-shrink-0"
                                      >
                                        <Icon icon="heroicons:arrow-down-tray" className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                        <span className="hidden sm:inline">Download</span>
                                      </button>
                                    )}
                                  </div>

                                  {/* Options for this document */}
                                  {docOptions.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                      <p className="text-[10px] sm:text-xs text-gray-600 mb-1">Options:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {docOptions.map((optionId) => {
                                          const option = optionsMap[optionId];
                                          if (!option) return null;

                                          const optionPrice = getOptionPrice(option, getCurrency());
                                          optionsTotal += optionPrice;

                                          return (
                                            <span
                                              key={optionId}
                                              className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-blue-100 text-blue-800"
                                            >
                                              <Icon icon={option.icon || "heroicons:plus-circle"} className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                                              <span className="truncate max-w-[80px] sm:max-w-none">{option.name}</span>
                                              <span className="hidden sm:inline ml-1">(+{formatPrice(getOptionPrice(option, getCurrency()), getOptionPriceCurrency(option, getCurrency()))})</span>
                                            </span>
                                          );
                                        })}
                                      </div>
                                      {optionsTotal > 0 && (
                                        <p className="text-[10px] sm:text-xs text-gray-700 mt-1 font-semibold">
                                          Options total: {formatPrice(optionsTotal, (getCurrency() === 'USD' || getCurrency() === 'GBP') ? getCurrency() : 'EUR')}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Calculate total with options */}
                        {(() => {
                          let totalWithOptions = serviceTotal;
                          documents.forEach(doc => {
                            if (doc.selectedOptions) {
                              doc.selectedOptions.forEach(optionId => {
                                const option = optionsMap[optionId];
                                if (option) {
                                  const optionPrice = getOptionPrice(option, getCurrency());
                                  totalWithOptions += optionPrice;
                                }
                              });
                            }
                          });

                          if (totalWithOptions > serviceTotal) {
                            return (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs sm:text-sm font-semibold text-gray-900">Total (with options):</span>
                                  <span className="text-base sm:text-lg font-bold text-gray-900">{formatPrice(totalWithOptions, (getCurrency() === 'USD' || getCurrency() === 'GBP') ? getCurrency() : 'EUR')}</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    );
                  })}
                </div>
                )}

                {/* Total */}
                {selectedServices.length > 0 && (
                <div className="mt-4 pt-4 border-t-2 border-gray-300">
                  <div className="flex justify-between items-center">
                    <span className="text-base sm:text-lg font-bold text-gray-900">Total:</span>
                    <span className="text-xl sm:text-2xl font-bold text-gray-900">
                      {(() => {
                        let grandTotal = 0;
                        
                        // Calculate services and options costs
                        selectedServices.forEach(serviceId => {
                          const service = servicesMap[serviceId];
                          const documents = serviceDocuments[serviceId] || [];
                          if (service) {
                            const currency = getCurrency();
                            const servicePrice = getServicePrice(service, currency);
                            grandTotal += documents.length * servicePrice;
                            documents.forEach(doc => {
                              if (doc.selectedOptions) {
                                doc.selectedOptions.forEach(optionId => {
                                  const option = optionsMap[optionId];
                                  if (option) {
                                    const optionPrice = getOptionPrice(option, getCurrency());
                                    grandTotal += optionPrice;
                                  }
                                });
                              }
                            });
                          }
                        });
                        
                        // Calculate additional signatories cost (€45 per additional signatory)
                        // First, try to get signatories from database (if payment completed)
                        if (signatories.length > 0) {
                          // Group signatories by document_key
                          const signatoriesByDoc = {};
                          signatories.forEach(sig => {
                            if (!signatoriesByDoc[sig.document_key]) {
                              signatoriesByDoc[sig.document_key] = [];
                            }
                            signatoriesByDoc[sig.document_key].push(sig);
                          });
                          
                          // Calculate cost for each document
                          Object.values(signatoriesByDoc).forEach(docSignatories => {
                            if (docSignatories.length > 1) {
                              // First signatory is included, count additional ones
                              grandTotal += (docSignatories.length - 1) * 45;
                            }
                          });
                        } else {
                          // Use signatories from submission.data (if not yet paid)
                          // Support both new format (signatories array) and old format (signatoriesByDocument)
                          const signatoriesFromData = submission?.data?.signatories || submission?.data?.signatoriesByDocument || {};
                          if (Array.isArray(signatoriesFromData)) {
                            // New format: global signatories
                            if (signatoriesFromData.length > 1) {
                              grandTotal += (signatoriesFromData.length - 1) * 10;
                            }
                          } else {
                            // Old format: signatoriesByDocument
                            Object.values(signatoriesFromData).forEach(docSignatories => {
                              if (Array.isArray(docSignatories) && docSignatories.length > 1) {
                                // First signatory is included, count additional ones
                                grandTotal += (docSignatories.length - 1) * 10;
                              }
                            });
                          }
                        }
                        
                        return formatPrice(grandTotal, (getCurrency() === 'USD' || getCurrency() === 'GBP') ? getCurrency() : 'EUR');
                      })()}
                    </span>
                  </div>
                </div>
                )}
              </div>
              )}

              {/* Signatories Tab */}
              {activeTab === 'signatories' && (() => {
                // Get signatories from database (if payment completed) or from submission.data (if not yet paid)
                // Support both new format (signatories array) and old format (signatoriesByDocument)
                console.log('🔍 [SIGNATORIES DEBUG] submission.data:', submission?.data);
                console.log('🔍 [SIGNATORIES DEBUG] signatories from DB:', signatories);
                const signatoriesFromData = submission?.data?.signatories || submission?.data?.signatoriesByDocument || {};
                console.log('🔍 [SIGNATORIES DEBUG] signatoriesFromData:', signatoriesFromData);
                const hasSignatoriesInDB = signatories.length > 0;
                console.log('🔍 [SIGNATORIES DEBUG] hasSignatoriesInDB:', hasSignatoriesInDB);
                
                // Check if signatories exist in data
                let hasSignatoriesInData = false;
                
                if (Array.isArray(signatoriesFromData)) {
                  // New format: global signatories array
                  hasSignatoriesInData = signatoriesFromData.length > 0;
                } else if (typeof signatoriesFromData === 'object') {
                  // Old format: signatoriesByDocument
                  hasSignatoriesInData = Object.keys(signatoriesFromData).length > 0 && 
                    Object.values(signatoriesFromData).some(sigs => sigs && sigs.length > 0);
                }

                if (!hasSignatoriesInDB && !hasSignatoriesInData) {
                  return (
                    <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                          <Icon icon="heroicons:user-group" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                        </div>
                        <span className="text-base sm:text-xl">Signatories</span>
                      </h2>
                      <p className="text-sm sm:text-base text-gray-600">No signatories added for this submission.</p>
                    </div>
                  );
                }

                // Get global list of unique signatories (not grouped by document)
                let globalSignatoriesList = [];
                
                if (hasSignatoriesInDB) {
                  // Use database signatories (after payment) - get unique signatories
                  const uniqueSignatories = new Map();
                  signatories.forEach(sig => {
                    const key = `${sig.first_name}_${sig.last_name}_${sig.birth_date}`;
                    if (!uniqueSignatories.has(key)) {
                      uniqueSignatories.set(key, {
                        first_name: sig.first_name,
                        last_name: sig.last_name,
                        birth_date: sig.birth_date,
                        birth_city: sig.birth_city,
                        postal_address: sig.postal_address,
                        email: sig.email,
                        phone: sig.phone
                      });
                    }
                  });
                  globalSignatoriesList = Array.from(uniqueSignatories.values());
                } else {
                  // Use signatories from submission.data (before payment)
                  if (Array.isArray(signatoriesFromData)) {
                    // New format: global signatories array
                    globalSignatoriesList = signatoriesFromData.map(sig => ({
                      first_name: sig.firstName || sig.first_name,
                      last_name: sig.lastName || sig.last_name,
                      birth_date: sig.birthDate || sig.birth_date,
                      birth_city: sig.birthCity || sig.birth_city,
                      postal_address: sig.postalAddress || sig.postal_address,
                      email: sig.email,
                      phone: sig.phone
                    }));
                  } else {
                    // Old format: signatoriesByDocument - collect all unique signatories
                    const uniqueSignatories = new Map();
                    Object.values(signatoriesFromData).forEach(sigs => {
                      if (Array.isArray(sigs)) {
                        sigs.forEach(sig => {
                          const key = `${sig.firstName || sig.first_name}_${sig.lastName || sig.last_name}_${sig.birthDate || sig.birth_date}`;
                          if (!uniqueSignatories.has(key)) {
                            uniqueSignatories.set(key, {
                              first_name: sig.firstName || sig.first_name,
                              last_name: sig.lastName || sig.last_name,
                              birth_date: sig.birthDate || sig.birth_date,
                              birth_city: sig.birthCity || sig.birth_city,
                              postal_address: sig.postalAddress || sig.postal_address,
                              email: sig.email,
                              phone: sig.phone
                            });
                          }
                        });
                      }
                    });
                    globalSignatoriesList = Array.from(uniqueSignatories.values());
                  }
                }

                if (globalSignatoriesList.length === 0) {
                  return (
                    <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                          <Icon icon="heroicons:user-group" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                        </div>
                        <span className="text-base sm:text-xl">Signatories</span>
                      </h2>
                      <p className="text-sm sm:text-base text-gray-600">No signatories added for this submission.</p>
                    </div>
                  );
                }

                return (
                  <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                        <Icon icon="heroicons:user-group" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                      </div>
                      <span className="text-base sm:text-xl">Signatories</span>
                    </h2>
                    <div className="space-y-2 sm:space-y-3">
                      {globalSignatoriesList.map((signatory, sigIndex) => (
                        <div key={sigIndex} className="bg-white rounded-lg p-2 sm:p-3 border border-gray-200">
                          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                            <span className="text-[10px] sm:text-xs font-semibold text-gray-900">
                              Signatory {sigIndex + 1}
                              {sigIndex === 0 && <span className="ml-1.5 text-[9px] sm:text-[10px] text-gray-500">(included)</span>}
                              {sigIndex > 0 && <span className="ml-1.5 text-[9px] sm:text-[10px] text-orange-600 font-medium">(+{formatPrice(10, 'EUR')})</span>}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                            <div>
                              <span className="text-gray-600">Name:</span>
                              <span className="ml-1.5 font-medium text-gray-900">
                                {signatory.first_name} {signatory.last_name}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Date of Birth:</span>
                              <span className="ml-1.5 font-medium text-gray-900">
                                {signatory.birth_date}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Birth City:</span>
                              <span className="ml-1.5 font-medium text-gray-900">
                                {signatory.birth_city}
                              </span>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-gray-600">Address:</span>
                              <span className="ml-1.5 font-medium text-gray-900 break-words">
                                {signatory.postal_address}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Email:</span>
                              <span className="ml-1.5 font-medium text-gray-900 break-words">
                                {signatory.email || 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Phone:</span>
                              <span className="ml-1.5 font-medium text-gray-900 break-words">
                                {signatory.phone || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Transactions Tab */}
              {activeTab === 'transactions' && (
                <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Transactions</h2>
                  
                  {transactionsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="space-y-4">
                      <p className="text-sm sm:text-base text-gray-600">No transactions found for this submission.</p>
                      {submission.status === 'pending_payment' && (
                        <button
                          onClick={retryPayment}
                          className="w-full flex items-center justify-center bg-black text-white hover:bg-gray-800 font-medium text-xs sm:text-sm py-2 sm:py-3 px-3 sm:px-4 rounded-lg transition-colors"
                        >
                          <Icon icon="heroicons:arrow-path" className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                          Retry Payment
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-200">
                          <tr>
                            <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                            <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Amount</th>
                            <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                            <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                            <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {transactions.map((tx) => {
                            const formatTransactionDate = (timestamp) => {
                              return new Date(timestamp * 1000).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              });
                            };

                            const formatCurrency = (amount, currency = null) => {
                              // Use transaction currency if provided, otherwise use submission currency
                              const targetCurrency = currency || getCurrency();
                              const locale = targetCurrency === 'USD' || targetCurrency === 'usd' ? 'en-US' : 
                                            targetCurrency === 'GBP' || targetCurrency === 'gbp' ? 'en-GB' : 
                                            targetCurrency === 'CAD' || targetCurrency === 'cad' ? 'en-CA' : 
                                            targetCurrency === 'AUD' || targetCurrency === 'aud' ? 'en-AU' : 'fr-FR';
                              const normalizedCurrency = targetCurrency.toUpperCase();
                              
                              return new Intl.NumberFormat(locale, {
                                style: 'currency',
                                currency: normalizedCurrency === 'USD' ? 'USD' : 
                                          normalizedCurrency === 'GBP' ? 'GBP' : 
                                          normalizedCurrency === 'CAD' ? 'CAD' : 
                                          normalizedCurrency === 'AUD' ? 'AUD' : 'EUR'
                              }).format(amount);
                            };

                            const getStatusBadge = (status, type) => {
                              const badges = {
                                succeeded: 'bg-green-100 text-green-700',
                                paid: 'bg-green-100 text-green-700',
                                failed: 'bg-red-100 text-red-700',
                                pending: 'bg-gray-100 text-gray-700',
                                processing: 'bg-blue-100 text-blue-700',
                                canceled: 'bg-gray-100 text-gray-700',
                              };

                              const displayStatus = type === 'refund' ? 'REFUND' : (status?.toUpperCase() || 'UNKNOWN');
                              
                              // Use purple color for refunds
                              const badgeClass = type === 'refund' 
                                ? 'bg-purple-100 text-purple-700'
                                : (badges[status] || badges.pending);

                              return (
                                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>
                                  {displayStatus}
                                </span>
                              );
                            };

                            return (
                              <tr key={`${tx.type}-${tx.id}`} className="hover:bg-gray-50">
                                <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                                  <div className="text-xs sm:text-sm font-semibold text-gray-900">
                                    {tx.type === 'refund' ? 'Refund' : 'Payment'}
                                  </div>
                                  <div className="text-[10px] sm:text-xs text-gray-600 font-mono">
                                    {tx.id}
                                  </div>
                                </td>
                                <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                                  <div className={`text-xs sm:text-sm font-semibold ${tx.type === 'refund' ? 'text-red-600' : 'text-gray-900'}`}>
                                    {tx.type === 'refund' ? '-' : ''}{formatCurrency(tx.amount, tx.currency)}
                                  </div>
                                </td>
                                <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                                  {getStatusBadge(tx.status, tx.type)}
                                </td>
                                <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-xs sm:text-sm text-gray-600">
                                  {formatTransactionDate(tx.created)}
                                </td>
                                <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-right">
                                  {tx.invoiceUrl && (
                                    <a
                                      href={tx.invoiceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                      title="Download invoice"
                                    >
                                      <Icon icon="heroicons:arrow-down-tray" className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </a>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Notarized Files Tab */}
              {activeTab === 'notarized' && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Notarized Documents</h2>
                    
                    {/* Files List */}
                    {notarizedFiles.length === 0 ? (
                      <p className="text-sm sm:text-base text-gray-600">No notarized documents have been uploaded yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {notarizedFiles.map((file) => (
                          <div key={file.id} className="bg-white rounded-xl p-4 border border-gray-200">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-start flex-1 min-w-0">
                                <Icon icon="heroicons:document-text" className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 mr-3 flex-shrink-0 mt-1" />
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-base sm:text-lg text-gray-900 mb-1">{file.file_name}</h3>
                                  <p className="text-xs sm:text-sm text-gray-500">
                                    {formatFileSize(file.file_size)} • Uploaded on {formatDate(file.uploaded_at)}
                                  </p>
                                </div>
                              </div>
                              <a
                                href={file.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-4 px-3 py-2 text-xs sm:text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center flex-shrink-0"
                              >
                                <Icon icon="heroicons:arrow-down-tray" className="w-4 h-4 mr-2" />
                                Download
                              </a>
                            </div>

                            {/* Comments Section - Read-only for clients */}
                            {fileComments[file.id] && fileComments[file.id].length > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Comments</h4>
                                
                                {/* Existing Comments */}
                                <div className="space-y-3">
                                  {fileComments[file.id].map((comment) => (
                                    <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                                      <div className="flex items-start justify-between mb-1">
                                        <span className="text-xs font-semibold text-gray-900 capitalize">
                                          {comment.commenter_type}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {formatDate(comment.created_at)}
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-700">{comment.comment}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notary Info - Always visible */}
            {submission.notary && (
              <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                    <Icon icon="heroicons:user" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  </div>
                  <span className="text-base sm:text-xl">Assigned Notary</span>
                </h2>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                    <span className="text-sm sm:text-base text-gray-600">Name:</span>
                    <span className="text-sm sm:text-base font-semibold text-gray-900">{submission.notary.name}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                    <span className="text-sm sm:text-base text-gray-600">Email:</span>
                    <span className="text-sm sm:text-base font-semibold text-gray-900 break-all">{submission.notary.email}</span>
                  </div>
                  {submission.notary.phone && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                      <span className="text-sm sm:text-base text-gray-600">Phone:</span>
                      <span className="text-sm sm:text-base font-semibold text-gray-900">{submission.notary.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {submission.notes && (
              <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                    <Icon icon="heroicons:document-text" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  </div>
                  <span className="text-base sm:text-xl">Additional Notes</span>
                </h2>
                <p className="text-sm sm:text-base text-gray-700 whitespace-pre-wrap">{submission.notes}</p>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
};

export default SubmissionDetail;
