import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { submitNotaryRequest, supabase } from '../lib/supabase';
import { useLocalStorage } from '../hooks/useLocalStorage';
import Logo from '../assets/Logo';
import { 
  trackPageView, 
  trackFormStep, 
  trackFormSubmissionStart, 
  trackFormSubmission, 
  trackFormStart,
  trackServiceSelected as trackGTMServiceSelected,
  trackDocumentUploaded as trackGTMDocumentUploaded,
  trackAppointmentBooked as trackGTMAppointmentBooked,
  trackSignatoriesAdded as trackGTMSignatoriesAdded,
  trackPersonalInfoCompleted as trackGTMPersonalInfoCompleted,
  trackSummaryViewed as trackGTMSummaryViewed,
  trackPaymentInitiated as trackGTMPaymentInitiated
} from '../utils/gtm';
import { 
  trackFormStart as trackPlausibleFormStart,
  trackServicesSelected,
  trackDocumentsUploaded,
  trackSignatoriesAdded,
  trackAppointmentBooked,
  trackPersonalInfoCompleted,
  trackSummaryViewed,
  trackPaymentInitiated,
  trackPaymentCompleted,
  trackFormAbandoned,
  trackStepNavigation
} from '../utils/plausible';
import { openCrisp } from '../utils/crisp';
import Documents from './steps/Documents';
import ChooseOption from './steps/ChooseOption';
import Signatories from './steps/Signatories';
import BookAppointment from './steps/BookAppointment';
import PersonalInfo from './steps/PersonalInfo';
import Summary from './steps/Summary';
import Notification from './Notification';
import CurrencySelector from './CurrencySelector';

const NotaryForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load currency from localStorage first, then use it as default
  const getInitialCurrency = () => {
    try {
      const savedCurrency = localStorage.getItem('notaryCurrency');
      const validCurrencies = ['EUR', 'USD', 'GBP', 'CAD', 'AUD', 'CHF', 'JPY', 'CNY'];
      if (savedCurrency && validCurrencies.includes(savedCurrency)) {
        console.log('💰 [CURRENCY] Devise initiale chargée depuis localStorage:', savedCurrency);
        return savedCurrency;
      }
    } catch (error) {
      console.error('❌ [CURRENCY] Erreur lors du chargement initial depuis localStorage:', error);
    }
    return 'EUR'; // Default to EUR
  };

  // Load form data from localStorage
  const [formData, setFormData] = useLocalStorage('notaryFormData', {
    // Services (step 1)
    selectedServices: [], // Array of service IDs

    // Documents (step 2) - organized by service
    serviceDocuments: {}, // { serviceId: [files] }

    // Signatories (step 3) - global list for the entire order
    signatories: [], // [signatories] - global list for all documents

    // Appointment
    appointmentDate: '',
    appointmentTime: '',
    timezone: 'UTC-5',

    // Personal Info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',

    // Currency from URL parameter or localStorage
    currency: getInitialCurrency(),

    // Additional notes
    notes: ''
  });

  // Load completed steps from localStorage
  const [completedSteps, setCompletedSteps] = useLocalStorage('notaryCompletedSteps', []);

  const steps = [
    { id: 1, name: 'Choose Services', icon: 'heroicons:check-badge', path: '/form/choose-services' },
    { id: 2, name: 'Upload Documents', icon: 'heroicons:document-text', path: '/form/documents' },
    { id: 3, name: 'Add Signatories', icon: 'heroicons:user-group', path: '/form/signatories' },
    { id: 4, name: 'Book an appointment', icon: 'heroicons:calendar-days', path: '/form/book-appointment' },
    { id: 5, name: 'Your personal informations', icon: 'heroicons:user', path: '/form/personal-info' },
    { id: 6, name: 'Summary', icon: 'heroicons:clipboard-document-check', path: '/form/summary' }
  ];

  // Validation function to check if current step can proceed
  const canProceedFromCurrentStep = () => {
    switch (currentStep) {
      case 1: // Choose Services
        return formData.selectedServices && formData.selectedServices.length > 0;

      case 2: // Upload Documents
        // Check that each selected service has at least one file
        if (!formData.selectedServices || formData.selectedServices.length === 0) return false;
        if (!formData.serviceDocuments) return false;

        return formData.selectedServices.every(serviceId => {
          const docs = formData.serviceDocuments[serviceId];
          return docs && docs.length > 0;
        });

      case 3: // Add Signatories
        // Check that there is at least one signatory and all have required fields
        if (!formData.signatories || !Array.isArray(formData.signatories) || formData.signatories.length === 0) {
          return false;
        }
        
        // Check that all signatories have required fields filled
        for (const signatory of formData.signatories) {
          if (!signatory || 
              !signatory.firstName?.trim() || 
              !signatory.lastName?.trim() || 
              !signatory.birthDate?.trim() || 
              !signatory.birthCity?.trim() || 
              !signatory.postalAddress?.trim() ||
              !signatory.email?.trim() ||
              !signatory.phone?.trim()) {
            return false;
          }
          // Validate email format
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signatory.email?.trim())) {
            return false;
          }
        }
        return true;

      case 4: // Book an appointment
        return formData.appointmentDate && formData.appointmentTime;

      case 5: // Personal informations
        const requiredFields = [
          formData.firstName,
          formData.lastName,
          formData.email,
          formData.phone,
          formData.address,
          formData.city,
          formData.postalCode,
          formData.country
        ];

        // If not authenticated, also require password
        if (!isAuthenticated) {
          requiredFields.push(formData.password, formData.confirmPassword);
        }

        // Check all required fields are filled
        return requiredFields.every(field => field && field.trim() !== '');

      case 6: // Summary
        return true; // No validation needed for summary

      default:
        return true;
    }
  };

  // Get current step from URL
  const getCurrentStepFromPath = () => {
    const step = steps.find(s => s.path === location.pathname);
    return step ? step.id : 1;
  };

  const currentStep = getCurrentStepFromPath();

  // Update page title with current step name
  useEffect(() => {
    const currentStepData = steps.find(s => s.path === location.pathname);
    if (currentStepData) {
      document.title = currentStepData.name;
    } else {
      document.title = 'Client dashboard';
    }
  }, [location.pathname]);

  // Map step names to GTM format
  const getStepNameForGTM = (stepName) => {
    const stepNameMap = {
      'Choose Services': 'service_selection',
      'Upload Documents': 'document_upload',
      'Add Signatories': 'signatories',
      'Book an appointment': 'appointment_booking',
      'Your personal informations': 'personal_info',
      'Summary': 'review_summary'
    };
    return stepNameMap[stepName] || stepName.toLowerCase().replace(/\s+/g, '_');
  };

  // Validate step access and track page views
  useEffect(() => {
    // Redirect to /form/choose-services if at /form root
    if (location.pathname === '/form' || location.pathname === '/form/') {
      navigate('/form/choose-services', { replace: true });
      return;
    }

    // Track page view (GTM)
    const currentStepData = steps.find(s => s.path === location.pathname);
    if (currentStepData) {
      trackPageView(currentStepData.name, location.pathname);
      
      // Track form_start when user arrives on first step (Choose Services)
      if (currentStepData.id === 1 && completedSteps.length === 0) {
        trackFormStart({
          formName: 'notarization_form',
          serviceType: 'Document Notarization',
          ctaLocation: 'homepage_hero',
          ctaText: 'Commencer ma notarisation'
        });
        // Track Plausible form start
        trackPlausibleFormStart();
      }
    }

    // Check if user is trying to access a step they haven't completed yet
    const requestedStep = getCurrentStepFromPath();

    // User can access current step or any previously completed step
    const canAccess = requestedStep === 1 || completedSteps.includes(requestedStep - 1);

    if (!canAccess) {
      // Find the last completed step and redirect there
      const lastCompletedStep = completedSteps.length > 0
        ? Math.max(...completedSteps) + 1
        : 1;
      const redirectStep = steps.find(s => s.id === lastCompletedStep);
      if (redirectStep) {
        navigate(redirectStep.path, { replace: true });
      }
    }
  }, [location.pathname, completedSteps, navigate]);

  // Load user data if authenticated
  useEffect(() => {
    const loadUserData = async () => {
      try {
        console.log('🔍 [PRE-FILL] Starting to load user data...');
        if (!supabase) {
          console.log('⚠️  [PRE-FILL] No supabase client available');
          setIsLoadingUserData(false);
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        console.log('👤 [PRE-FILL] User:', user ? `${user.id} (${user.email})` : 'Not authenticated');

        setIsAuthenticated(!!user);

        if (user) {
          // User is authenticated, load their client data
          const { data: client, error } = await supabase
            .from('client')
            .select('*')
            .eq('user_id', user.id)
            .single();

          console.log('📋 [PRE-FILL] Client data:', client);
          console.log('❌ [PRE-FILL] Error:', error);

          if (!error && client) {
            // Pre-fill form with user data - Only fill empty fields to preserve localStorage data
            console.log('✅ [PRE-FILL] Pre-filling empty fields with client data');

            setFormData(prev => ({
              ...prev,
              // Only override with client data if the field is empty in localStorage
              firstName: prev.firstName || client.first_name || '',
              lastName: prev.lastName || client.last_name || '',
              email: prev.email || client.email || '',
              phone: prev.phone || client.phone || '',
              address: prev.address || client.address || '',
              city: prev.city || client.city || '',
              postalCode: prev.postalCode || client.postal_code || '',
              country: prev.country || client.country || '',
              timezone: prev.timezone || client.timezone || prev.timezone || 'UTC-5'
            }));
          }
        }
      } catch (error) {
        console.error('❌ [PRE-FILL] Error loading user data:', error);
      } finally {
        setIsLoadingUserData(false);
      }
    };

    loadUserData();
  }, []);

  // Récupérer le paramètre currency depuis l'URL et le stocker dans formData et localStorage
  useEffect(() => {
    const validCurrencies = ['EUR', 'USD', 'GBP', 'CAD', 'AUD', 'CHF', 'JPY', 'CNY'];
    const currencyParam = searchParams.get('currency');
    
    if (currencyParam) {
      // Normaliser la devise (EUR, USD, etc.) en majuscules
      const normalizedCurrency = currencyParam.toUpperCase();
      // Valider que c'est une devise valide (EUR, USD, GBP, CAD, etc.)
      if (validCurrencies.includes(normalizedCurrency)) {
        console.log('💰 [CURRENCY] Devise détectée depuis l\'URL:', normalizedCurrency);
        
        // Sauvegarder immédiatement dans localStorage séparé pour persistance
        try {
          localStorage.setItem('notaryCurrency', normalizedCurrency);
          console.log('💰 [CURRENCY] Devise sauvegardée dans localStorage:', normalizedCurrency);
        } catch (error) {
          console.error('❌ [CURRENCY] Erreur lors de la sauvegarde dans localStorage:', error);
        }
        
        setFormData(prev => {
          // Ne mettre à jour que si la devise a changé
          if (prev.currency !== normalizedCurrency) {
            return { ...prev, currency: normalizedCurrency };
          }
          return prev;
        });
      } else {
        console.warn('⚠️ [CURRENCY] Devise non valide:', currencyParam, '- Utilisation de EUR par défaut');
      }
    } else {
      // Si pas de paramètre currency dans l'URL, vérifier le localStorage
      try {
        const savedCurrency = localStorage.getItem('notaryCurrency');
        if (savedCurrency && validCurrencies.includes(savedCurrency)) {
          console.log('💰 [CURRENCY] Devise chargée depuis localStorage:', savedCurrency);
          setFormData(prev => {
            if (prev.currency !== savedCurrency) {
              return { ...prev, currency: savedCurrency };
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('❌ [CURRENCY] Erreur lors du chargement depuis localStorage:', error);
      }
    }
  }, [searchParams, setFormData]);

  // Gérer le paramètre service depuis l'URL pour pré-sélection et saut d'étapes
  useEffect(() => {
    const serviceParam = searchParams.get('service');
    
    if (serviceParam && !formData.selectedServices?.includes(serviceParam)) {
      console.log('🎯 [SERVICE] Service détecté depuis l\'URL:', serviceParam);
      
      // Pré-sélectionner le service
      setFormData(prev => ({
        ...prev,
        selectedServices: [serviceParam]
      }));
      
      // Marquer l'étape 1 comme complétée pour permettre l'accès à l'étape 2
      setCompletedSteps([1]);
      
      // Rediriger vers l'étape "Upload Documents" (étape 2)
      navigate('/form/documents', { replace: true });
      
      console.log('✅ [SERVICE] Service pré-sélectionné et redirection vers étape 2 (Documents)');
    }
  }, [searchParams, formData.selectedServices, setFormData, setCompletedSteps, navigate]);

  const updateFormData = (data) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const markStepCompleted = (stepId) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
      // Track step completion (GTM)
      const step = steps.find(s => s.id === stepId);
      if (step) {
        trackFormStep(stepId, getStepNameForGTM(step.name));
      }
      
      // Track funnel events (Plausible + GTM)
      switch (stepId) {
        case 1: // Services Selected
          // Plausible
          trackServicesSelected(
            formData.selectedServices?.length || 0,
            formData.selectedServices || []
          );
          // GTM
          trackGTMServiceSelected(
            formData.selectedServices?.length || 0,
            formData.selectedServices || []
          );
          break;
        case 2: // Documents Uploaded
          const totalDocs = Object.values(formData.serviceDocuments || {}).reduce(
            (sum, docs) => sum + (docs?.length || 0), 0
          );
          const servicesWithDocs = Object.keys(formData.serviceDocuments || {}).length;
          // Plausible
          trackDocumentsUploaded(totalDocs, servicesWithDocs);
          // GTM
          trackGTMDocumentUploaded(totalDocs, servicesWithDocs);
          break;
        case 3: // Signatories Added
          // Plausible
          trackSignatoriesAdded(formData.signatories?.length || 0);
          // GTM
          trackGTMSignatoriesAdded(formData.signatories?.length || 0);
          break;
        case 4: // Appointment Booked
          // Plausible
          trackAppointmentBooked(
            formData.appointmentDate || '',
            formData.appointmentTime || '',
            formData.timezone || ''
          );
          // GTM
          trackGTMAppointmentBooked({
            date: formData.appointmentDate || '',
            time: formData.appointmentTime || '',
            timezone: formData.timezone || ''
          });
          break;
        case 5: // Personal Info Completed
          // Plausible
          trackPersonalInfoCompleted(isAuthenticated);
          // GTM
          trackGTMPersonalInfoCompleted(isAuthenticated);
          break;
      }
    }
  };

  const nextStep = () => {
    // Track step navigation
    trackStepNavigation(currentStep, currentStep + 1, 'next');
    
    // Mark current step as completed
    markStepCompleted(currentStep);

    // Navigate to next step
    if (currentStep < steps.length) {
      const nextStepData = steps.find(s => s.id === currentStep + 1);
      if (nextStepData) {
        navigate(nextStepData.path);
        
        // Track summary viewed when reaching step 6
        if (nextStepData.id === 6) {
          const totalDocs = Object.values(formData.serviceDocuments || {}).reduce(
            (sum, docs) => sum + (docs?.length || 0), 0
          );
          // Plausible
          trackSummaryViewed({
            servicesCount: formData.selectedServices?.length || 0,
            documentsCount: totalDocs,
            signatoriesCount: formData.signatories?.length || 0,
            hasAppointment: !!(formData.appointmentDate && formData.appointmentTime)
          });
          // GTM
          trackGTMSummaryViewed({
            totalServices: formData.selectedServices?.length || 0,
            totalDocuments: totalDocs,
            totalSignatories: formData.signatories?.length || 0,
            hasAppointment: !!(formData.appointmentDate && formData.appointmentTime)
          });
        }
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      trackStepNavigation(currentStep, currentStep - 1, 'prev');
      const prevStepData = steps.find(s => s.id === currentStep - 1);
      if (prevStepData) {
        navigate(prevStepData.path);
      }
    }
  };

  const goToStep = (stepId) => {
    // Only allow navigation to completed steps or the next step
    const canNavigate = stepId === 1 || completedSteps.includes(stepId - 1);

    if (canNavigate) {
      const currentStepData = steps.find(s => s.id === currentStep);
      const targetStepData = steps.find(s => s.id === stepId);
      
      if (currentStepData && targetStepData) {
        trackStepNavigation(currentStep, stepId, currentStep < stepId ? 'next' : 'prev');
      }
      
      const step = steps.find(s => s.id === stepId);
      if (step) {
        navigate(step.path);
      }
    }
  };

  // Track form abandonment when user leaves the page
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Only track abandonment if user has started the form (completed at least step 1)
      if (completedSteps.length > 0 && currentStep < 6) {
        const currentStepData = steps.find(s => s.id === currentStep);
        trackFormAbandoned(currentStep, currentStepData?.name || 'Unknown');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentStep, completedSteps]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      console.log('Creating payment session for form data:', formData);

      // Track form submission start (GTM)
      trackFormSubmissionStart({
        selectedOptions: formData.selectedServices || [],
        documents: formData.serviceDocuments ? Object.values(formData.serviceDocuments).flat() : []
      });

      // Upload documents to Supabase Storage, organized by service
      const uploadedServiceDocuments = {};

      if (formData.serviceDocuments && Object.keys(formData.serviceDocuments).length > 0) {
        console.log('📤 Uploading documents to storage...');

        for (const [serviceId, files] of Object.entries(formData.serviceDocuments)) {
          uploadedServiceDocuments[serviceId] = [];

          for (const file of files) {
            // Convert serialized file back to Blob for upload
            const blob = await fetch(file.dataUrl).then(r => r.blob());

            // Generate unique file name
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(7);
            const fileName = `temp/${serviceId}/${timestamp}_${randomId}_${file.name}`;

            console.log(`📤 Uploading for service ${serviceId}:`, fileName);

            // Upload file to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('submission-documents')
              .upload(fileName, blob);

            if (uploadError) {
              console.error('❌ Error uploading file:', uploadError);
              throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
            }

            console.log('✅ File uploaded:', fileName);

            // Get public URL
            const { data: urlData } = supabase.storage
              .from('submission-documents')
              .getPublicUrl(fileName);

            uploadedServiceDocuments[serviceId].push({
              name: file.name,
              size: file.size,
              type: file.type,
              storage_path: fileName,
              public_url: urlData.publicUrl,
              selectedOptions: file.selectedOptions || []  // Preserve selected options
            });
          }
        }

        console.log('✅ All files uploaded by service:', uploadedServiceDocuments);
      }

      // Prepare form data without File objects
      const submissionData = {
        ...formData,
        serviceDocuments: uploadedServiceDocuments, // Add uploaded file paths organized by service
      };

      // Call Supabase Edge Function to create Stripe checkout session
      // The Edge Function will fetch services from database and calculate the amount
      console.log('📤 Calling Edge Function with full data:');
      console.log('   selectedServices:', submissionData.selectedServices);
      console.log('   serviceDocuments:', submissionData.serviceDocuments);
      console.log('   signatories:', submissionData.signatories);
      console.log('   signatories count:', submissionData.signatories?.length || 0);
      console.log('   currency:', submissionData.currency || 'EUR (default)');

      // Log document count per service with options info
      if (submissionData.serviceDocuments) {
        Object.entries(submissionData.serviceDocuments).forEach(([serviceId, docs]) => {
          console.log(`   Service ${serviceId}: ${docs.length} documents`);
          docs.forEach((doc, i) => {
            console.log(`      - ${doc.name}: selectedOptions=${JSON.stringify(doc.selectedOptions)}`);
          });
        });
      }

      // Use fetch directly to get better error details
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || supabaseAnonKey;
      
      console.log('📤 Calling Edge Function directly with fetch...');
      
      // Track payment initiated
      const totalDocs = Object.values(formData.serviceDocuments || {}).reduce(
        (sum, docs) => sum + (docs?.length || 0), 0
      );
      // Plausible
      trackPaymentInitiated({
        servicesCount: formData.selectedServices?.length || 0,
        totalAmount: 0, // Will be calculated by backend
        currency: formData.currency || 'EUR'
      });
      // GTM
      trackGTMPaymentInitiated({
        amount: 0, // Will be calculated by backend
        currency: formData.currency || 'EUR',
        servicesCount: formData.selectedServices?.length || 0
      });
      
      // S'assurer que la devise est en majuscules (EUR, USD, etc.) comme attendu par Stripe
      const currency = (submissionData.currency || 'EUR').toUpperCase();
      console.log('💰 [CURRENCY] Devise finale envoyée:', currency);

      const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          formData: submissionData,
          currency: currency // Envoyer la devise comme paramètre séparé et explicite
        })
      });

      const responseText = await response.text();
      console.log('📥 Edge Function raw response status:', response.status);
      console.log('📥 Edge Function raw response text:', responseText);

      if (!response.ok) {
        // Try to parse error response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = JSON.parse(responseText);
          console.error('Edge Function error response:', errorData);
          errorMessage = errorData.error || errorMessage;
          if (errorData.type) {
            console.error('Error type:', errorData.type);
          }
          if (errorData.stack) {
            console.error('Error stack:', errorData.stack);
          }
        } catch (parseError) {
          console.error('Could not parse error response:', parseError);
          errorMessage += `\nResponse: ${responseText}`;
        }
        throw new Error(errorMessage);
      }

      // Parse successful response
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('📥 Edge Function parsed response:', data);
      } catch (parseError) {
        console.error('Could not parse success response:', parseError);
        throw new Error('Invalid response format from payment service');
      }

      if (!data || !data.url) {
        console.error('No checkout URL received. Response data:', data);
        throw new Error('No checkout URL received from payment service');
      }

      // Form data is already saved in localStorage by useLocalStorage hook
      // Redirect to Stripe Checkout
      console.log('✅ Redirecting to Stripe Checkout:', data.url);
      window.location.href = data.url;
    } catch (error) {
      console.error('Error creating payment session:', error);
      console.error('Error details:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        context: error?.context,
      });

      // Show detailed error message
      let errorMessage = 'Une erreur s\'est produite lors de la création de la session de paiement.';
      
      // Try to extract more details from the error
      if (error?.message) {
        errorMessage += ` Détails: ${error.message}`;
      }

      if (error.message?.includes('Edge Function') || error.message?.includes('FunctionsHttpError')) {
        errorMessage += '\n\n⚠️ Les fonctions de paiement ne sont pas encore déployées.\n\nVeuillez consulter le README dans /supabase/functions/ pour les instructions de déploiement.';
      } else if (error.message) {
        errorMessage += `\n\nDétails: ${error.message}`;
      }

      errorMessage += '\n\nVeuillez réessayer ou contacter le support.';

      setNotification({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="flex min-h-screen bg-white">
      {/* Mobile Header - Fixed at top - Visible until xl */}
      <header className="xl:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 h-14 sm:h-16">
        <div className="flex items-center justify-between h-full px-2 sm:px-3 md:px-4">
          <Logo width={70} height={70} className="sm:w-[80px] sm:h-[80px]" />
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
            <CurrencySelector formData={formData} updateFormData={updateFormData} />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              <Icon icon={isMobileMenuOpen ? 'heroicons:x-mark' : 'heroicons:bars-3'} className="w-5 h-5 sm:w-6 sm:h-6 text-gray-900" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay - Visible until xl */}
      {isMobileMenuOpen && (
        <div
          className="xl:hidden fixed inset-0 bg-black bg-opacity-50 z-40 top-14 sm:top-16"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="bg-[#F3F4F6] w-full max-w-sm h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Contact Us Button - Mobile */}
            <div className="p-3 sm:p-4 border-b border-gray-300">
              <button
                onClick={() => {
                  openCrisp();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center justify-center w-full px-3 sm:px-4 py-1.5 sm:py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm sm:text-base"
              >
                <Icon icon="heroicons:chat-bubble-left-right" className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 flex-shrink-0" />
                <span className="truncate">Contact Us</span>
              </button>
            </div>

            {/* Steps Navigation - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pb-0">
              <div className="space-y-1 sm:space-y-1.5 pb-6 sm:pb-8">
              {steps.map((step) => {
                const isCompleted = completedSteps.includes(step.id);
                const isCurrent = currentStep === step.id;
                const canAccess = step.id === 1 || completedSteps.includes(step.id - 1);

                return (
                  <div
                    key={step.id}
                    onClick={() => {
                      if (canAccess) {
                        goToStep(step.id);
                        setIsMobileMenuOpen(false);
                      }
                    }}
                    className={`flex items-center justify-between px-2.5 sm:px-3 h-[44px] sm:h-[50px] rounded-lg transition-all duration-300 ${
                      canAccess ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                    } ${
                      isCurrent
                        ? 'bg-black text-white shadow-lg'
                        : isCompleted
                        ? 'bg-white text-gray-700 hover:bg-gray-100 hover:shadow-md'
                        : 'bg-white text-gray-400'
                    }`}
                  >
                    <div className="flex items-center min-w-0 flex-1">
                      <Icon 
                        icon={isCompleted ? 'heroicons:check' : step.icon} 
                        className={`w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 flex-shrink-0 ${
                          isCurrent ? 'text-white' : isCompleted ? 'text-gray-600' : 'text-gray-400'
                        }`} 
                      />
                      <span className="text-xs sm:text-sm font-medium truncate">{step.name}</span>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>

            {/* Navigation Link - Fixed at bottom */}
            <div className="p-4 sm:p-6 border-t border-gray-200">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="w-full flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon icon="heroicons:squares-2x2" className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <span className="truncate font-medium">Dashboard</span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="w-full flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon icon="heroicons:arrow-right-on-rectangle" className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <span className="truncate font-medium">Connexion</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Left Sidebar - Fixed and 100vh - HIDDEN until xl (1280px) */}
      <aside className="hidden xl:block w-56 md:w-64 lg:w-72 xl:w-80 bg-[#F3F4F6] border-r border-gray-200 fixed left-0 top-0 h-screen flex flex-col">
        {/* Header section - Fixed at top (no scroll) - Reduced spacing */}
        <div className="flex-shrink-0 p-3 md:p-4 xl:p-5 pb-0">
          {/* Logo - Reduced size */}
          <div className="mb-3 md:mb-4 xl:mb-4 animate-fade-in flex items-center justify-center">
            <Logo width={90} height={90} className="md:w-[100px] md:h-[100px] xl:w-[110px] xl:h-[110px] md:max-w-[100px] md:max-h-[100px] xl:max-w-[110px] xl:max-h-[110px]" />
          </div>

          {/* Currency Selector */}
          <div className="mb-3 md:mb-4 xl:mb-4 animate-fade-in flex items-center justify-center px-1 md:px-2 relative z-[150]">
            <CurrencySelector formData={formData} updateFormData={updateFormData} />
          </div>
        </div>

        {/* Scrollable Steps section - Reduced padding with bottom space for footer */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4 xl:p-5 pt-2 pb-[200px]">

          {/* Steps Navigation - Very compact */}
          <div className="space-y-1 md:space-y-1">
            {steps.map((step, index) => {
              const isCompleted = completedSteps.includes(step.id);
              const isCurrent = currentStep === step.id;
              const canAccess = step.id === 1 || completedSteps.includes(step.id - 1);

              return (
                <div
                  key={step.id}
                  onClick={() => canAccess && goToStep(step.id)}
                  className={`flex items-center p-1.5 md:p-1.5 xl:p-2 rounded-lg transition-all duration-300 ${
                    canAccess ? 'cursor-pointer transform hover:scale-105' : 'cursor-not-allowed opacity-50'
                  } ${
                    isCurrent
                      ? 'bg-black text-white shadow-lg animate-slide-in'
                      : isCompleted
                      ? 'bg-white text-gray-900 hover:bg-gray-50 hover:shadow-md'
                      : 'bg-white text-gray-400'
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`flex items-center justify-center w-6 h-6 md:w-7 md:h-7 xl:w-8 xl:h-8 rounded-lg transition-all duration-300 flex-shrink-0 ${
                    isCurrent
                      ? 'bg-white/20'
                      : isCompleted
                      ? 'bg-gray-200'
                      : 'bg-gray-100'
                  }`}>
                    {isCompleted ? (
                      <Icon icon="heroicons:check" className="w-3 h-3 md:w-3.5 md:h-3.5 xl:w-4 xl:h-4 text-gray-600 animate-bounce-in" />
                    ) : (
                      <Icon icon={step.icon} className={`w-3 h-3 md:w-3.5 md:h-3.5 xl:w-4 xl:h-4 transition-transform duration-300 ${
                        isCurrent ? 'text-white scale-110' : 'text-gray-400'
                      }`} />
                    )}
                  </div>
                  <div className="ml-1.5 md:ml-1.5 xl:ml-2 flex-1 min-w-0">
                    <div className={`text-[8px] md:text-[8px] xl:text-[9px] font-semibold uppercase tracking-wide truncate ${
                      isCurrent ? 'text-white/80' : 'text-gray-500'
                    }`}>
                      Step {step.id}
                    </div>
                    <div className={`text-[10px] md:text-[10px] xl:text-[11px] font-medium mt-0.5 truncate ${
                      isCurrent ? 'text-white' : 'text-gray-900'
                    }`}>
                      {step.name}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress Bar & Navigation Button - Fixed at bottom - Reduced spacing */}
        <div className="absolute bottom-0 left-0 right-0 p-3 md:p-3 xl:p-4 bg-[#F3F4F6] border-t border-gray-200">
          {/* Contact Us Button */}
          <button
            onClick={openCrisp}
            className="flex items-center justify-center w-full mb-2 md:mb-2 xl:mb-2.5 px-2.5 md:px-3 xl:px-4 py-1.5 md:py-1.5 xl:py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-xs md:text-sm xl:text-base"
          >
            <Icon icon="heroicons:chat-bubble-left-right" className="w-3.5 h-3.5 md:w-4 md:h-4 xl:w-5 xl:h-5 mr-1.5 md:mr-2 flex-shrink-0" />
            <span className="truncate">Contact Us</span>
          </button>

          {/* Dashboard or Login Button */}
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="flex items-center justify-center w-full mb-2 md:mb-2 xl:mb-2.5 text-gray-700 hover:text-gray-900 transition-colors font-medium text-xs md:text-sm xl:text-base"
            >
              <Icon icon="heroicons:squares-2x2" className="w-3.5 h-3.5 md:w-4 md:h-4 xl:w-5 xl:h-5 mr-1.5 md:mr-2 flex-shrink-0" />
              <span className="truncate">Dashboard</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="flex items-center justify-center w-full mb-2 md:mb-2 xl:mb-2.5 text-gray-700 hover:text-gray-900 transition-colors font-medium text-xs md:text-sm xl:text-base"
            >
              <Icon icon="heroicons:arrow-right-on-rectangle" className="w-3.5 h-3.5 md:w-4 md:h-4 xl:w-5 xl:h-5 mr-1.5 md:mr-2 flex-shrink-0" />
              <span className="truncate">Connexion</span>
            </Link>
          )}

          {/* Progress Bar */}
          <div className="flex justify-between text-[10px] md:text-xs xl:text-sm text-gray-600 mb-1 md:mb-1 xl:mb-1.5">
            <span className="font-medium truncate">Progress</span>
            <span className="font-bold ml-2 flex-shrink-0">{Math.round((currentStep / steps.length) * 100)}%</span>
          </div>
          <div className="h-2 md:h-2 xl:h-2.5 bg-gray-300 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-700 ease-out"
              style={{
                width: `${(currentStep / steps.length) * 100}%`,
                background: 'linear-gradient(90deg, #491ae9 0%, #b300c7 33%, #f20075 66%, #ff8400 100%)'
              }}
            />
          </div>
        </div>
      </aside>

      {/* Main Content - Full width with left margin for sidebar ONLY on xl+ */}
      <main className="flex-1 xl:ml-80 min-h-screen flex items-center justify-center xl:p-4 pt-16 pb-28 sm:pb-28">
        {/* Form Content - Same height until xl */}
        <div className="w-full max-w-full h-[calc(100vh-7rem)] xl:h-[95vh] bg-[#F3F4F6] xl:rounded-3xl shadow-sm animate-fade-in-up flex flex-col overflow-hidden relative mx-0 xl:mx-auto">
          <Routes>
            <Route
              path="choose-services"
              element={
                <ChooseOption
                  formData={formData}
                  updateFormData={updateFormData}
                  nextStep={nextStep}
                />
              }
            />
            <Route
              path="documents"
              element={
                <Documents
                  formData={formData}
                  updateFormData={updateFormData}
                  nextStep={nextStep}
                  prevStep={prevStep}
                />
              }
            />
            <Route
              path="signatories"
              element={
                <Signatories
                  formData={formData}
                  updateFormData={updateFormData}
                  nextStep={nextStep}
                  prevStep={prevStep}
                />
              }
            />
            <Route
              path="book-appointment"
              element={
                <BookAppointment
                  formData={formData}
                  updateFormData={updateFormData}
                  nextStep={nextStep}
                  prevStep={prevStep}
                />
              }
            />
            <Route
              path="personal-info"
              element={
                <PersonalInfo
                  formData={formData}
                  updateFormData={updateFormData}
                  nextStep={nextStep}
                  prevStep={prevStep}
                  isAuthenticated={isAuthenticated}
                />
              }
            />
            <Route
              path="summary"
              element={
                <Summary
                  formData={formData}
                  prevStep={prevStep}
                  handleSubmit={handleSubmit}
                />
              }
            />
          </Routes>
        </div>
      </main>

      {/* Mobile Footer - Navigation Buttons + Progress Bar in ONE fixed container - Visible until xl */}
      {!isMobileMenuOpen && (
        <div className="xl:hidden fixed bottom-0 left-0 right-0 bg-[#F3F4F6] border-t border-gray-200 z-50 safe-area-inset-bottom">
          {/* Navigation Buttons */}
          <div className="px-2 sm:px-3 pt-2.5 sm:pt-3 pb-1.5 sm:pb-2 flex justify-between items-center gap-1.5 sm:gap-2">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="btn-glassy-secondary px-3 sm:px-4 py-2 sm:py-2.5 text-gray-700 font-semibold rounded-full transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm flex-shrink-0"
              >
                Back
              </button>
            ) : <div className="w-12 sm:w-16"></div>}
            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={!canProceedFromCurrentStep()}
                className="btn-glassy px-3 sm:px-4 py-2 sm:py-2.5 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-xs sm:text-sm flex-1 sm:flex-none min-w-0"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="btn-glassy px-3 sm:px-4 py-2 sm:py-2.5 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center text-xs sm:text-sm flex-1 sm:flex-none min-w-0"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-white flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="truncate">Processing...</span>
                  </>
                ) : (
                  <span className="truncate">Confirm & Pay</span>
                )}
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="px-2 sm:px-3 pb-2.5 sm:pb-3 pt-1.5 sm:pt-2">
            <div className="flex justify-between text-[10px] sm:text-xs text-gray-600 mb-1 sm:mb-1.5">
              <span className="font-medium truncate">Step {currentStep} of {steps.length}</span>
              <span className="font-bold ml-2 flex-shrink-0">{Math.round((currentStep / steps.length) * 100)}%</span>
            </div>
            <div className="h-1 sm:h-1.5 bg-gray-300 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${(currentStep / steps.length) * 100}%`,
                  background: 'linear-gradient(90deg, #491ae9 0%, #b300c7 33%, #f20075 66%, #ff8400 100%)'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};

export default NotaryForm;
