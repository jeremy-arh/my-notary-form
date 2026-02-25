import { useEffect, useState, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { supabase } from '../lib/supabase';
import { useLocalStorage, onStorageError } from '../hooks/useLocalStorage';
import Logo from '../assets/Logo';
import { trackPageView, pushGTMEvent } from '../utils/gtm';
import { 
  trackFormStart as trackPlausibleFormStart,
  trackServicesSelected,
  trackDocumentsUploaded,
  trackPersonalInfoCompleted,
  trackSummaryViewed,
  trackPaymentInitiated,
  trackPaymentCompleted,
  trackFormAbandoned
} from '../utils/analytics';
import { openCrisp } from '../utils/crisp';
import { useServices } from '../contexts/ServicesContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { saveSubmission } from '../utils/submissionSave';
import { updateFunnelStatus } from '../utils/updateFunnelStatus';
import { calculateTotalAmount } from '../utils/pricing';
import Documents from './steps/Documents';
import ChooseOption from './steps/ChooseOption';
import DeliveryMethod from './steps/DeliveryMethod';
import PersonalInfo from './steps/PersonalInfo';
import Signatories from './steps/Signatories';
import Summary from './steps/Summary';
import Notification from './Notification';
import CurrencySelector from './CurrencySelector';
import LanguageSelector from './LanguageSelector';
import PriceDetails from './PriceDetails';
import InactivityModal from './InactivityModal';
import { useTranslation } from '../hooks/useTranslation';

const NotaryForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // Track if any document upload is in progress
  const [countdown, setCountdown] = useState(5);
  const [isPriceDetailsOpen, setIsPriceDetailsOpen] = useState(false);
  // Initialize hasAppliedServiceParam based on existing form data to prevent reset on page refresh
  const [hasAppliedServiceParam, setHasAppliedServiceParam] = useState(() => {
    // If there are already services selected and documents uploaded, consider param as already applied
    try {
      const savedData = window.localStorage.getItem('notaryFormData');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        const hasServices = parsed.selectedServices && parsed.selectedServices.length > 0;
        const hasDocs = parsed.serviceDocuments && Object.keys(parsed.serviceDocuments).length > 0 &&
          Object.values(parsed.serviceDocuments).some(docs => docs && docs.length > 0);
        // If user has both services and documents, treat as already applied to prevent reset
        return hasServices && hasDocs;
      }
    } catch (e) {
      console.error('Error checking localStorage for hasAppliedServiceParam:', e);
    }
    return false;
  });
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const [hasShownInactivityModal, setHasShownInactivityModal] = useState(() => {
    // Check if modal has already been shown in this session
    return sessionStorage.getItem('inactivityModalShown') === 'true';
  });
  const { t, language } = useTranslation();
  const { services, options, servicesMap, optionsMap, getServiceName, getOptionName, loading: servicesLoading } = useServices();
  const { currency: contextCurrency } = useCurrency();
  const [allowServiceParamBypass, setAllowServiceParamBypass] = useState(false);
  const serviceParam = searchParams.get('service');
  const lastAppliedServiceParamRef = useRef(null); // Pour tracker le dernier service param appliqué

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
    // Personal Info (step 1)
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

    // Services (step 2)
    selectedServices: [], // Array of service IDs

    // Documents (step 3) - organized by service
    serviceDocuments: {}, // { serviceId: [files] }

    // Delivery method (step 4)
    deliveryMethod: null,

    // Signatories - global list for the entire order
    signatories: [], // [signatories] - global list for all documents
    isSignatory: false, // Whether the user is one of the signatories (unchecked by default to avoid auto-adding)

    timezone: 'UTC-5',

    // Currency from URL parameter or localStorage
    currency: getInitialCurrency(),

    // GCLID from URL parameter for Google Ads tracking
    gclid: null,

    // Additional notes
    notes: ''
  });

  // Load completed steps from localStorage
  const [completedSteps, setCompletedSteps] = useLocalStorage('notaryCompletedSteps', []);

  // Restore form data from localStorage ONLY when returning from Stripe checkout
  // This is critical: we must NOT restore data during normal navigation as it can
  // overwrite freshly uploaded documents due to race conditions
  useEffect(() => {
    // Only restore if coming back from payment pages (Stripe redirect)
    // BUT NOT from payment success page (which clears localStorage)
    const isReturningFromPayment = location.pathname.includes('/payment/') || 
      location.search.includes('session_id=');
    
    // Don't restore if coming from payment success page
    const isFromPaymentSuccess = location.pathname.includes('/payment/success');
    
    if (!isReturningFromPayment || isFromPaymentSuccess) {
      // If coming from payment success, ensure localStorage is cleared
      if (isFromPaymentSuccess) {
        console.log('🧹 [RESTORE] Coming from payment success - ensuring localStorage is cleared');
        try {
          localStorage.removeItem('notaryFormData');
          localStorage.removeItem('notaryCompletedSteps');
          localStorage.removeItem('formSessionId');
        } catch (error) {
          console.error('❌ [RESTORE] Error clearing localStorage:', error);
        }
      }
      return; // Don't restore during normal navigation or from success page
    }
    
    const restoreFormData = () => {
      try {
        const savedFormData = localStorage.getItem('notaryFormData');
        if (savedFormData) {
          const parsedData = JSON.parse(savedFormData);
          console.log('🔄 [RESTORE] Restauration des données depuis localStorage (retour Stripe)');
          setFormData(parsedData);
        }
      } catch (error) {
        console.error('❌ [RESTORE] Erreur lors de la restauration:', error);
      }
    };

    restoreFormData();
  }, [location.pathname, location.search]); // Only check on pathname/search changes

  // Listen for localStorage errors (quota exceeded, save failed, etc.)
  useEffect(() => {
    const unsubscribe = onStorageError((error) => {
      console.error('❌ [NotaryForm] Storage error:', error);
      if (error.type === 'quota_exceeded') {
        setNotification({
          type: 'error',
          message: t('form.errors.storageFull') || 'Les fichiers sont trop volumineux. Essayez de télécharger des fichiers plus petits ou supprimez des fichiers existants.'
        });
      } else if (error.type === 'save_failed') {
        setNotification({
          type: 'error',
          message: t('form.errors.saveFailed') || 'Impossible de sauvegarder les données. Veuillez réessayer.'
        });
      }
    });
    return unsubscribe;
  }, [t]);

  // Clean up obsolete localStorage data on mount - Remove ALL old form data
  useEffect(() => {
    try {
      // Remove ALL obsolete localStorage keys related to old form versions
      const obsoleteKeys = [
        'notaryBookAppointment',
        'notaryAppointmentData',
        'bookAppointmentStep',
        'appointmentStepCompleted',
        'notaryFormStep',
        'notaryCurrentStep',
        'notaryOldFormData',
        'notaryOldSteps',
        'formOldData',
        'oldFormSteps'
      ];
      
      obsoleteKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          console.log(`🧹 [CLEANUP] Suppression de la clé obsolète: ${key}`);
          localStorage.removeItem(key);
        }
      });

      // Clean up completedSteps - remove any step IDs that don't exist (steps are 1-6, indices 0-5)
      if (Array.isArray(completedSteps)) {
        const validStepIndices = [0, 1, 2, 3, 4, 5]; // Steps 1-6 (indices 0-5)
        const cleanedSteps = completedSteps.filter(stepIndex => 
          validStepIndices.includes(stepIndex) && Number.isInteger(stepIndex)
        );
        
        if (cleanedSteps.length !== completedSteps.length) {
          console.log('🧹 [CLEANUP] Nettoyage des completedSteps:', completedSteps, '->', cleanedSteps);
          setCompletedSteps(cleanedSteps);
        }
      }

      // Clean up formData - remove any obsolete fields
      if (formData) {
        const obsoleteFormFields = [
          'appointmentStep',
          'bookAppointment',
          'oldStepData',
          'previousStep'
        ];
        
        let hasObsoleteFields = false;
        const cleanedFormData = { ...formData };
        
        obsoleteFormFields.forEach(field => {
          if (cleanedFormData.hasOwnProperty(field)) {
            console.log(`🧹 [CLEANUP] Suppression du champ obsolète du formData: ${field}`);
            delete cleanedFormData[field];
            hasObsoleteFields = true;
          }
        });
        
        if (hasObsoleteFields) {
          setFormData(cleanedFormData);
        }
      }
    } catch (error) {
      console.error('❌ [CLEANUP] Erreur lors du nettoyage:', error);
    }
  }, []); // Run only once on mount

  // Get current step from URL (defined early for use in useEffect)
  const getCurrentStepFromPath = () => {
    const step = steps.find(s => s.path === location.pathname);
    return step ? step.id : 1;
  };

  // Track form_started event when form is opened (step 1 or 2)
  const formStartedTrackedRef = useRef(false);
  useEffect(() => {
    const requestedStep = getCurrentStepFromPath();
    
    // Envoyer form_started dès l'ouverture du formulaire à l'étape 1 ou 2
    if (!formStartedTrackedRef.current && (requestedStep === 1 || requestedStep === 2)) {
      formStartedTrackedRef.current = true;
      console.log('📊 [PLAUSIBLE] Tracking form_started - Form opened at step', requestedStep);
      
      // Track Plausible form start
      trackPlausibleFormStart();
    }
  }, [location.pathname]); // Track when pathname changes

  // FormDraft is NEVER used to load/display data in the form
  // It is ONLY used for saving/backup purposes
  // All form data comes from localStorage only
  // The formDraft is saved but never loaded/restored

  const steps = [
    { id: 1, name: 'Your personal informations', icon: 'heroicons:user', path: '/form/personal-info' },
    { id: 2, name: 'Choose Services', icon: 'heroicons:check-badge', path: '/form/choose-services' },
    { id: 3, name: 'Upload Documents', icon: 'heroicons:document-text', path: '/form/documents' },
    { id: 4, name: 'Add Signatories', icon: 'heroicons:user-group', path: '/form/signatories' },
    { id: 5, name: 'Delivery method', icon: 'heroicons:envelope', path: '/form/delivery' },
    { id: 6, name: 'Summary', icon: 'heroicons:clipboard-document-check', path: '/form/summary' }
  ];

  // Function to get validation error message for current step
  const getValidationErrorMessage = () => {
    switch (currentStep) {
      case 1: // Personal informations
        return 'Please complete all required personal information fields';
      case 2: // Choose Services
        return 'Please select at least one service';
      case 3: // Upload Documents
        return 'Please upload at least one document for each selected service';
      case 4: // Add Signatories
        return 'Please add at least one signatory';
      case 5: // Delivery method
        return 'Please select a delivery method';
      default:
        return 'Please complete all required fields';
    }
  };

  // Validation function to check if current step can proceed
  const canProceedFromCurrentStep = () => {
    switch (currentStep) {
      case 1: // Personal informations
        if (!formData.firstName?.trim() || !formData.lastName?.trim()) return false;
        if (!isAuthenticated && !formData.email?.trim()) return false;
        if (!formData.address?.trim()) return false;
        return true;

      case 2: // Choose Services
        return formData.selectedServices && formData.selectedServices.length > 0;

      case 3: // Upload Documents
        // Check that each selected service has at least one file
        if (!formData.selectedServices || formData.selectedServices.length === 0) return false;
        if (!formData.serviceDocuments) return false;

        return formData.selectedServices.every(serviceId => {
          const docs = formData.serviceDocuments[serviceId];
          return docs && docs.length > 0;
        });

      case 4: // Add Signatories
        if (!formData.signatories || !Array.isArray(formData.signatories) || formData.signatories.length === 0) {
          return false;
        }
        return formData.signatories.every(sig => {
          const firstName = sig.firstName?.trim();
          const lastName = sig.lastName?.trim();
          const email = sig.email?.trim();
          const phone = sig.phone?.trim();
          if (!firstName || !lastName || !email || !phone) return false;
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) return false;
          if (phone.length < 5) return false;
          return true;
        });

      case 5: // Delivery method
        return !!formData.deliveryMethod;

      case 6: // Summary
        return requiredFields.every(field => field && field.trim() !== '');

      default:
        return true;
    }
  };

  const currentStep = getCurrentStepFromPath();

  // Update page title and meta tags for sharing - This effect runs immediately on mount and on pathname changes
  useEffect(() => {
    // Function to update title and meta tags based on current pathname
    const updateTitleAndMeta = () => {
      const isFormRoute = location.pathname.startsWith('/form');
      
      if (isFormRoute) {
        // For form pages, use "Submit your request" as the main title for sharing
        const shareTitle = 'Submit your request';
        
        // Adapt description based on service parameter if available
        const serviceParam = searchParams.get('service');
        let shareDescription = 'Submit your notary service request online. Fast, secure, and professional notarization services available 24/7. Get your documents notarized quickly and easily.';
        
        if (serviceParam && services && services.length > 0) {
          // Try to find the service name to personalize the description
          const normalizedServiceParam = serviceParam.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const matchedService = services.find(service => {
            const candidates = [
              service.slug,
              service.code,
              service.key,
              service.url_key,
              service.name
            ]
              .filter(Boolean)
              .map(s => s.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-'));
            return candidates.some(c => c === normalizedServiceParam || c.includes(normalizedServiceParam));
          });
          
          if (matchedService) {
            shareDescription = `Get your ${matchedService.name} notarized online. Fast, secure, and professional notarization service. Complete your request in minutes with our easy-to-use platform.`;
          }
        }
        
        // Update document title (for browser tab)
        const currentStepData = steps.find(s => s.path === location.pathname);
        if (currentStepData) {
          // Map step paths to translation keys
          const stepTitleMap = {
            '/form/personal-info': t('form.steps.personalInfo.title', 'Your Personal Information'),
            '/form/choose-services': t('form.steps.chooseOption.title', 'Choose Your Services'),
            '/form/documents': t('form.steps.documents.title', 'Upload Documents'),
            '/form/signatories': t('form.steps.signatories.title', 'Add Signatories'),
            '/form/delivery': t('form.steps.delivery.title', 'Delivery of your notarized documents'),
            '/form/summary': t('form.steps.summary.title', 'Summary'),
          };
          
          const translatedTitle = stepTitleMap[location.pathname] || currentStepData.name;
          document.title = translatedTitle;
          console.log('📄 [TITLE] Titre mis à jour:', translatedTitle, 'pour le chemin:', location.pathname);
        } else {
          document.title = shareTitle;
        }
        
        // Update meta tags for sharing (Open Graph, Twitter, etc.)
        updateMetaTag('og:title', shareTitle);
        updateMetaTag('og:description', shareDescription);
        updateMetaTag('twitter:title', shareTitle);
        updateMetaTag('twitter:description', shareDescription);
        updateMetaTag('description', shareDescription);
        
        // Update og:url to current URL
        const currentUrl = window.location.origin + location.pathname + location.search;
        updateMetaTag('og:url', currentUrl);
        
        console.log('📄 [META] Métadonnées mises à jour pour le partage:', { shareTitle, shareDescription });
      } else {
        // Reset to default for non-form pages
        document.title = 'Client dashboard';
        updateMetaTag('og:title', 'Client dashboard');
        updateMetaTag('og:description', 'Manage your notary service requests');
        updateMetaTag('twitter:title', 'Client dashboard');
        updateMetaTag('twitter:description', 'Manage your notary service requests');
        updateMetaTag('description', 'Manage your notary service requests');
      }
    };
    
    // Helper function to update or create meta tags
    const updateMetaTag = (property, content) => {
      // Handle both property (og:) and name attributes
      const isProperty = property.startsWith('og:') || property.startsWith('twitter:');
      const attribute = isProperty ? 'property' : 'name';
      const selector = isProperty ? `meta[property="${property}"]` : `meta[name="${property}"]`;
      
      let meta = document.querySelector(selector);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };
    
    // Update title and meta tags immediately - this ensures they are set even on direct URL access
    updateTitleAndMeta();
  }, [location.pathname, location.search, t, steps, services, searchParams]);

  // Map step names to GTM format
  const getStepNameForGTM = (stepName) => {
    const stepNameMap = {
      'Choose Services': 'service_selection',
      'Upload Documents': 'document_upload',
      'Delivery method': 'delivery_method',
      'Your personal informations': 'personnal_info',
      'Add Signatories': 'signatories',
      'Summary': 'review_summary'
    };
    return stepNameMap[stepName] || stepName.toLowerCase().replace(/\s+/g, '_');
  };

  // Validate step access and track page views
  useEffect(() => {
    // Redirect to /form/personal-info if at /form root (en conservant la query)
    if (location.pathname === '/form' || location.pathname === '/form/') {
      // Si un param service existe, on laisse l'autre effet gérer la navigation directe
      if (serviceParam && !hasAppliedServiceParam) {
        return;
      }
      navigate({ pathname: '/form/personal-info', search: location.search }, { replace: true });
      return;
    }

    // CRITICAL: Redirect ALL obsolete or unknown routes to valid routes
    const validPaths = steps.map(s => s.path);
    const isObsoleteRoute = location.pathname.startsWith('/form/') && !validPaths.includes(location.pathname);
    
    if (isObsoleteRoute) {
      console.log('⚠️ [REDIRECT] Route obsolète ou inconnue détectée:', location.pathname);
      // Determine the best route based on completed steps
      let targetPath = '/form/personal-info';
      
      if (completedSteps.length >= steps.length - 1) {
        // User has completed all steps, redirect to summary
        targetPath = '/form/summary';
      } else if (completedSteps.length >= 4) {
        // User has completed steps 1-4, redirect to delivery (step 5)
        targetPath = '/form/delivery';
      } else if (completedSteps.length >= 3) {
        // User has completed steps 1-3, redirect to signatories (step 4)
        targetPath = '/form/signatories';
      } else if (completedSteps.length >= 2) {
        // User has completed steps 1-2, redirect to documents (step 3)
        targetPath = '/form/documents';
      } else if (completedSteps.length >= 1) {
        // User has completed step 1
        // Si un service param est présent, aller directement à documents (étape 3) en sautant choose-services (étape 2)
        if (serviceParam && hasAppliedServiceParam && formData.selectedServices && formData.selectedServices.length > 0) {
          targetPath = '/form/documents';
        } else {
          targetPath = '/form/choose-services';
        }
      }
      
      console.log('   -> Redirection vers:', targetPath);
      navigate({ pathname: targetPath, search: location.search }, { replace: true });
      return;
    }

    // Track page view (GTM)
    const currentStepData = steps.find(s => s.path === location.pathname);
    if (currentStepData) {
      trackPageView(currentStepData.name, location.pathname);
    }

    // Bypass guard when on-boarding via param service -> documents
    if (allowServiceParamBypass) {
      console.log('✅ [GUARD] Bypass activé pour service param');
      return;
    }
    // If service param is present but not yet applied, let the other effect handle navigation
    if (serviceParam && !hasAppliedServiceParam) {
      console.log('⏳ [GUARD] Service param présent mais pas encore appliqué, attente...');
      return;
    }
    
    // Si un service param est présent et appliqué, empêcher l'accès à l'étape 2 (Choose Services)
    // et rediriger vers Documents (étape 3)
    if (serviceParam && hasAppliedServiceParam && formData.selectedServices && formData.selectedServices.length > 0) {
      const requestedStep = getCurrentStepFromPath();
      if (requestedStep === 2) {
        // L'utilisateur essaie d'accéder à Choose Services alors qu'un service est déjà sélectionné via URL
        console.log('🚫 [GUARD] Accès à Choose Services bloqué - service déjà sélectionné via URL, redirection vers Documents');
        navigate({ pathname: '/form/documents', search: location.search }, { replace: true });
        return;
      }
    }

    // Check if user is trying to access a step they haven't completed yet
    const requestedStep = getCurrentStepFromPath();

    // Special case: If user is accessing Summary (last step) and has completed all previous steps,
    // allow access even if Summary itself isn't marked as completed
    // This handles the case when returning from Stripe payment
    const isSummaryStep = requestedStep === steps.length;
    const hasCompletedAllPreviousSteps = completedSteps.length >= steps.length - 1; // All previous steps completed
    
    // Allow access if:
    // 1. First step (always accessible)
    // 2. Previous step is completed (step index = requestedStep - 2, since steps are 1-indexed and completedSteps are 0-indexed)
    // 3. Summary if all previous steps are completed (for returning from payment)
    const previousStepIndex = requestedStep - 2; // Step 2 -> index 0, Step 3 -> index 1, etc.
    
    const canAccess = requestedStep === 1 || 
                     completedSteps.includes(previousStepIndex) ||
                     (isSummaryStep && hasCompletedAllPreviousSteps);
    
    console.log('🔍 [GUARD] Vérification accès étape:', {
      requestedStep,
      previousStepIndex,
      completedSteps,
      canAccess,
      allowServiceParamBypass,
      serviceParam,
      hasAppliedServiceParam
    });

    if (!canAccess) {
      // If trying to access Summary, check if form data is actually filled
      if (isSummaryStep) {
        // Verify that essential form data exists before allowing access to Summary
        const hasServices = formData.selectedServices && formData.selectedServices.length > 0;
        const hasDocuments = formData.serviceDocuments && 
          Object.keys(formData.serviceDocuments).length > 0 &&
          Object.values(formData.serviceDocuments).some(docs => docs && docs.length > 0);
        const hasPersonalInfo = formData.firstName && formData.lastName && formData.email;
        const hasSignatories = formData.signatories && Array.isArray(formData.signatories) && formData.signatories.length > 0;
        const hasDelivery = formData.deliveryMethod;
        
        console.log('🔍 [GUARD] Vérification données Summary:', {
          hasServices,
          hasDocuments,
          hasPersonalInfo,
          hasSignatories,
          hasDelivery
        });
        
        // Only allow access to Summary if all essential data is filled
        if (hasServices && hasDocuments && hasPersonalInfo && hasSignatories && hasDelivery) {
          // Mark all previous steps as completed to allow access
          const stepsToComplete = steps.filter(s => s.id !== steps.length).map(s => s.id);
          const updatedCompletedSteps = [...new Set([...completedSteps, ...stepsToComplete.map(s => s - 1)])].sort();
          setCompletedSteps(updatedCompletedSteps);
          console.log('✅ [GUARD] Données complètes, accès au Summary autorisé');
          return; // Allow access to Summary
        } else {
          // Data is incomplete, redirect to appropriate step
          console.log('❌ [GUARD] Données incomplètes, redirection nécessaire');
          if (!hasPersonalInfo) {
            navigate('/form/personal-info', { replace: true });
            return;
          }
          if (!hasServices) {
            navigate('/form/choose-services', { replace: true });
            return;
          }
          if (!hasDocuments) {
            navigate('/form/documents', { replace: true });
            return;
          }
          if (!hasSignatories) {
            navigate('/form/signatories', { replace: true });
            return;
          }
          if (!hasDelivery) {
            navigate('/form/delivery', { replace: true });
            return;
          }
        }
      }
      
      const lastCompletedStep = completedSteps.length > 0
        ? Math.max(...completedSteps) + 1
        : 1;
      const redirectStep = steps.find(s => s.id === lastCompletedStep);
      if (redirectStep) {
        console.log('❌ [GUARD] Accès refusé, redirection vers étape:', lastCompletedStep);
        navigate(redirectStep.path, { replace: true });
      }
    }
  }, [location.pathname, completedSteps, navigate, allowServiceParamBypass, serviceParam, hasAppliedServiceParam, formData.selectedServices, formData.serviceDocuments, formData.firstName, formData.lastName, formData.email, formData.signatories, formData.deliveryMethod]);

  // Load user data if authenticated
  useEffect(() => {
    const loadUserData = async () => {
      try {
        console.log('🔍 [PRE-FILL] Starting to load user data...');
        if (!supabase) {
          console.log('⚠️  [PRE-FILL] No supabase client available');
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

  // Synchroniser la devise du contexte avec formData.currency
  // Cela garantit que la devise sélectionnée dans CurrencySelector est envoyée à Stripe
  useEffect(() => {
    if (contextCurrency && contextCurrency !== formData.currency) {
      console.log('💰 [NotaryForm] Synchronisation de la devise du contexte vers formData:', contextCurrency);
      setFormData(prev => ({
        ...prev,
        currency: contextCurrency
      }));
    }
  }, [contextCurrency, formData.currency, setFormData]);

  // Récupérer le GCLID depuis l'URL ou le cookie _gcl_aw créé par Google Ads
  // Le cookie _gcl_aw est créé automatiquement par Google Ads et partagé entre domaines
  useEffect(() => {
    // Fonction pour récupérer un cookie par son nom
    const getCookie = (name) => {
      try {
        const nameEQ = name + '=';
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
          let cookie = cookies[i];
          while (cookie.charAt(0) === ' ') cookie = cookie.substring(1, cookie.length);
          if (cookie.indexOf(nameEQ) === 0) {
            return cookie.substring(nameEQ.length, cookie.length);
          }
        }
      } catch (error) {
        console.error('❌ [GCLID] Erreur lors de la lecture du cookie:', error);
      }
      return null;
    };
    
    // Fonction pour extraire le GCLID du cookie _gcl_aw
    // Le cookie _gcl_aw est créé par Google Ads et contient le GCLID
    // Format possible: "GCLID.xxxxx.yyyyy" où xxxxx est généralement le GCLID
    // Ou directement le GCLID selon la version de Google Ads
    const extractGclidFromCookie = (cookieValue) => {
      if (!cookieValue) return null;
      
      // Si le cookie commence par "GCLID.", extraire la partie qui suit
      // Format: GCLID.xxxxx.yyyyy
      if (cookieValue.startsWith('GCLID.')) {
        const parts = cookieValue.split('.');
        // Le GCLID est généralement la deuxième partie (index 1)
        // Mais peut aussi être dans une autre partie si le format change
        if (parts.length > 1) {
          // Chercher la partie la plus longue qui ressemble à un GCLID
          // Un GCLID Google Ads fait généralement 20+ caractères alphanumériques
          for (let i = 1; i < parts.length; i++) {
            if (parts[i].length >= 20 && /^[A-Za-z0-9_-]+$/.test(parts[i])) {
              return parts[i];
            }
          }
          // Si aucune partie ne correspond, retourner la deuxième partie par défaut
          return parts[1];
        }
      }
      
      // Si c'est directement un GCLID (longue chaîne alphanumérique)
      if (cookieValue.length >= 20 && /^[A-Za-z0-9_-]+$/.test(cookieValue)) {
        return cookieValue;
      }
      
      // Sinon retourner la valeur telle quelle (Google Ads gère le format)
      return cookieValue;
    };
    
    // Priorité 1: GCLID depuis l'URL (?gclid=xxx)
    const gclidParam = searchParams.get('gclid');
    
    // Priorité 2: GCLID depuis le cookie _gcl_aw créé par Google Ads
    const gclAwCookie = getCookie('_gcl_aw');
    const gclidFromGclAw = gclAwCookie ? extractGclidFromCookie(gclAwCookie) : null;
    
    // Priorité 3: GCLID depuis le cookie "gclid" (fallback)
    const gclidCookie = getCookie('gclid');
    
    // Utiliser le GCLID de l'URL en priorité, sinon celui du cookie _gcl_aw, sinon celui du cookie gclid
    const gclid = gclidParam || gclidFromGclAw || gclidCookie;
    
    if (gclid) {
      let source = 'URL';
      if (!gclidParam) {
        source = gclidFromGclAw ? 'cookie _gcl_aw' : 'cookie gclid';
      }
      console.log(`🔗 [GCLID] GCLID détecté depuis ${source}:`, gclid);
      
      // Sauvegarder dans localStorage pour persistance (au cas où)
      try {
        localStorage.setItem('notaryGclid', gclid);
        console.log('🔗 [GCLID] GCLID sauvegardé dans localStorage:', gclid);
      } catch (error) {
        console.error('❌ [GCLID] Erreur lors de la sauvegarde dans localStorage:', error);
      }
      
      setFormData(prev => {
        // Ne mettre à jour que si le GCLID a changé
        if (prev.gclid !== gclid) {
          return { ...prev, gclid: gclid };
        }
        return prev;
      });
    } else {
      // Si pas de GCLID dans l'URL ni dans le cookie, vérifier localStorage (fallback)
      try {
        const savedGclid = localStorage.getItem('notaryGclid');
        if (savedGclid) {
          console.log('🔗 [GCLID] GCLID chargé depuis localStorage (fallback):', savedGclid);
          setFormData(prev => {
            if (prev.gclid !== savedGclid) {
              return { ...prev, gclid: savedGclid };
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('❌ [GCLID] Erreur lors du chargement depuis localStorage:', error);
      }
    }
  }, [searchParams, setFormData]);

  // Pré-remplir le service depuis l'URL et passer directement à l'upload
  useEffect(() => {
    if (!serviceParam) {
      // Si pas de service param, réinitialiser le flag
      if (lastAppliedServiceParamRef.current !== null) {
        lastAppliedServiceParamRef.current = null;
        setHasAppliedServiceParam(false);
      }
      return;
    }
    
    if (servicesLoading) {
      console.log('⏳ [SERVICE-PARAM] En attente du chargement des services...');
      return;
    }
    
    if (!services || services.length === 0) {
      console.warn('⚠️ [SERVICE-PARAM] Aucun service disponible. Services:', services);
      return; // Attendre que les services soient disponibles
    }
    
    console.log('✅ [SERVICE-PARAM] Services chargés:', services.length, 'services disponibles');

    // Vérifier si le service param a changé
    const serviceParamChanged = lastAppliedServiceParamRef.current !== serviceParam;
    
    if (!serviceParamChanged && hasAppliedServiceParam) {
      // Le même service param a déjà été appliqué, ne rien faire
      return;
    }

    console.log('🔍 [SERVICE-PARAM] Traitement du paramètre service:', serviceParam);
    console.log('🔍 [SERVICE-PARAM] Service param a changé:', serviceParamChanged);
    console.log('🔍 [SERVICE-PARAM] Dernier service appliqué:', lastAppliedServiceParamRef.current);
    console.log('🔍 [SERVICE-PARAM] Services disponibles:', services.length);

    const normalize = (value) => {
      if (!value) return '';
      return value
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-+|-+$)/g, '');
    };

    const requestedSlugs = serviceParam
      .split(',')
      .map(normalize)
      .filter(Boolean);

    console.log('🔍 [SERVICE-PARAM] Paramètre service brut:', serviceParam);
    console.log('🔍 [SERVICE-PARAM] Slugs demandés normalisés:', requestedSlugs);
    console.log('🔍 [SERVICE-PARAM] Nombre total de services disponibles:', services.length);

    if (requestedSlugs.length === 0) {
      console.warn('⚠️ [SERVICE-PARAM] Aucun slug valide trouvé dans le paramètre');
      lastAppliedServiceParamRef.current = serviceParam;
      setHasAppliedServiceParam(true);
      return;
    }

    // D'abord, essayer de trouver des correspondances exactes
    const exactMatches = [];
    const partialMatches = [];

    // Parcourir TOUS les services disponibles (dynamique)
    services.forEach((service) => {
      // Créer une liste de tous les candidats possibles pour ce service
      // Inclure tous les champs disponibles, même s'ils sont null/undefined
      const candidates = [
        service.slug,
        service.code,
        service.key,
        service.url_key,
        service.name,
        // Essayer aussi avec l'ID du service comme fallback
        service.service_id,
      ]
        .filter(Boolean) // Retirer les valeurs null/undefined
        .map(normalize)
        .filter(Boolean); // Retirer les chaînes vides après normalisation

      // Si aucun candidat n'est disponible, passer au service suivant
      if (candidates.length === 0) {
        console.warn('⚠️ [SERVICE-PARAM] Service sans candidats valides:', service.name, 'ID:', service.service_id);
        return;
      }

      // Vérifier si un des slugs demandés correspond exactement à un candidat
      const exactMatch = requestedSlugs.some((requestedSlug) => {
        return candidates.includes(requestedSlug);
      });

      if (exactMatch) {
        console.log('✅ [SERVICE-PARAM] Correspondance EXACTE trouvée:', service.name, 'ID:', service.service_id);
        console.log('   Slug original:', service.slug || '(non défini)');
        console.log('   Code:', service.code || '(non défini)');
        console.log('   Key:', service.key || '(non défini)');
        console.log('   URL Key:', service.url_key || '(non défini)');
        console.log('   Name:', service.name);
        console.log('   Candidates normalisés:', candidates);
        exactMatches.push(service.service_id);
        return;
      }

      // Si pas de correspondance exacte, essayer une correspondance partielle
      const partialMatch = requestedSlugs.some((requestedSlug) => {
        return candidates.some(candidate => {
          // Correspondance partielle stricte : le candidat doit commencer par le slug demandé ou être égal
          return candidate === requestedSlug || candidate.startsWith(requestedSlug + '-');
        });
      });

      if (partialMatch) {
        console.log('⚠️ [SERVICE-PARAM] Correspondance PARTIELLE trouvée:', service.name, 'ID:', service.service_id);
        console.log('   Slug original:', service.slug || '(non défini)');
        console.log('   Code:', service.code || '(non défini)');
        console.log('   Key:', service.key || '(non défini)');
        console.log('   URL Key:', service.url_key || '(non défini)');
        console.log('   Name:', service.name);
        partialMatches.push(service.service_id);
      }
    });

    console.log('📊 [SERVICE-PARAM] Résultats du matching:');
    console.log('   Correspondances exactes:', exactMatches.length);
    console.log('   Correspondances partielles:', partialMatches.length);

    // Utiliser les correspondances exactes en priorité, sinon utiliser les partielles
    // S'assurer qu'il n'y a pas de doublons
    const matchedServiceIds = Array.from(new Set(
      exactMatches.length > 0 ? exactMatches : partialMatches
    ));

    if (exactMatches.length > 0 && partialMatches.length > 0) {
      console.warn('⚠️ [SERVICE-PARAM] Correspondances exactes ET partielles trouvées. Utilisation des exactes uniquement.');
      console.log('   Correspondances exactes:', exactMatches);
      console.log('   Correspondances partielles ignorées:', partialMatches);
    }

    if (matchedServiceIds.length > 1) {
      console.warn('⚠️ [SERVICE-PARAM] ATTENTION: Plusieurs services matchés pour un seul paramètre!', matchedServiceIds);
      console.warn('   Cela ne devrait pas arriver. Vérifiez les slugs des services dans la base de données.');
    }

    if (matchedServiceIds.length === 0) {
      console.warn('⚠️ [SERVICE-PARAM] Aucun service trouvé pour les slugs:', requestedSlugs);
      console.log('   Services disponibles:', services.map(s => ({
        name: s.name,
        slug: s.slug,
        code: s.code,
        key: s.key,
        url_key: s.url_key
      })));
      // Aucun service trouvé alors que la liste est chargée : marquer l'essai pour éviter les re-boucles
      lastAppliedServiceParamRef.current = serviceParam;
      setHasAppliedServiceParam(true);
      return;
    }

    console.log('✅ [SERVICE-PARAM] Services correspondants:', matchedServiceIds);
    console.log('   Nombre de services matchés:', matchedServiceIds.length);

    // Si plusieurs services sont matchés, prendre seulement le premier (ou logger un avertissement)
    let servicesToApply = matchedServiceIds;
    if (matchedServiceIds.length > 1) {
      console.error('❌ [SERVICE-PARAM] ERREUR: Plusieurs services matchés pour un seul paramètre!');
      console.error('   Services matchés:', matchedServiceIds);
      console.error('   Paramètre service:', serviceParam);
      console.error('   Cela ne devrait pas arriver. Vérifiez les slugs des services dans la base de données.');
      console.error('   Utilisation du PREMIER service uniquement:', matchedServiceIds[0]);
      servicesToApply = [matchedServiceIds[0]]; // Prendre seulement le premier
    }

    // Si le service param a changé, réinitialiser complètement les services et documents
    if (serviceParamChanged) {
      console.log('🔄 [SERVICE-PARAM] Réinitialisation complète (nouveau service param détecté)');
      console.log('   Ancien service:', lastAppliedServiceParamRef.current);
      console.log('   Nouveau service:', serviceParam);
      // Réinitialiser aussi les étapes complétées pour forcer le recommencement
      setCompletedSteps([]);
    }

    // Appliquer uniquement les nouveaux services (remplacer complètement, pas d'ajout)
    // IMPORTANT: Ne réinitialiser les documents QUE si les services ont vraiment changé
    console.log('✅ [SERVICE-PARAM] Application des services:', servicesToApply);
    console.log('   Nombre de services à appliquer:', servicesToApply.length);
    setFormData((prev) => {
      // Vérifier si les services sont les mêmes (même IDs, même ordre non important)
      const prevServices = prev.selectedServices || [];
      const sameServices = servicesToApply.length === prevServices.length && 
        servicesToApply.every(id => prevServices.includes(id));
      
      // Si les services sont identiques ET qu'il y a déjà des documents, ne pas réinitialiser
      const hasExistingDocuments = prev.serviceDocuments && 
        Object.keys(prev.serviceDocuments).length > 0 &&
        Object.values(prev.serviceDocuments).some(docs => docs && docs.length > 0);
      
      const shouldKeepDocuments = sameServices && hasExistingDocuments;
      
      console.log('   Données avant mise à jour:', {
        selectedServices: prev.selectedServices,
        serviceDocumentsKeys: Object.keys(prev.serviceDocuments || {}),
        hasExistingDocuments,
        sameServices,
        shouldKeepDocuments
      });
      
      const newData = {
        ...prev,
        selectedServices: servicesToApply, // Remplacer complètement (pas d'ajout)
        // Ne réinitialiser les documents que si les services ont changé OU s'il n'y a pas de documents existants
        serviceDocuments: shouldKeepDocuments ? prev.serviceDocuments : {}
      };
      
      console.log('   Données après mise à jour:', {
        selectedServices: newData.selectedServices,
        serviceDocumentsKeys: Object.keys(newData.serviceDocuments)
      });
      return newData;
    });

    // Marquer l'étape 2 (Choose Services) comme complétée (stockée avec index 0-based: stepId - 1)
    const stepIndex = 1; // Étape 2 -> index 1
    setCompletedSteps((prev) => {
      if (prev.includes(stepIndex)) {
        return prev;
      }
      console.log('✅ [SERVICE-PARAM] Marquage de l\'étape 2 (Choose Services) comme complétée (index:', stepIndex, ')');
      return [...prev, stepIndex];
    });
    
    // Mettre à jour la référence du dernier service appliqué
    lastAppliedServiceParamRef.current = serviceParam;
    setAllowServiceParamBypass(true);
    setHasAppliedServiceParam(true);

    // Naviguer vers l'étape appropriée
    // Si on est sur l'étape 1 (Personal Info) ou sur la racine, rester sur Personal Info
    // Sinon, aller directement à Documents (étape 3) en sautant Choose Services (étape 2)
    const currentStepFromPath = getCurrentStepFromPath();
    const isOnPersonalInfo = location.pathname === '/form/personal-info' || location.pathname === '/form' || location.pathname === '/form/';
    
    if (isOnPersonalInfo) {
      // Rester sur Personal Info, l'utilisateur devra compléter cette étape d'abord
      console.log('📍 [SERVICE-PARAM] Service appliqué, restant sur Personal Info (étape 1)');
      console.log('   Services sélectionnés:', matchedServiceIds);
    } else {
      // Aller directement à Documents (étape 3) en sautant Choose Services (étape 2)
      console.log('🚀 [SERVICE-PARAM] Navigation immédiate vers /form/documents (saut de l\'étape 2)');
      console.log('   Chemin actuel:', location.pathname);
      console.log('   Services sélectionnés:', matchedServiceIds);
      
      // Utiliser requestAnimationFrame pour s'assurer que les états sont mis à jour
      requestAnimationFrame(() => {
        navigate({ pathname: '/form/documents', search: location.search }, { replace: true });
      });
    }
  }, [
    services,
    servicesLoading,
    serviceParam,
    setFormData,
    setCompletedSteps,
    navigate,
    location.pathname,
    location.search,
    hasAppliedServiceParam
  ]);

  // Backup: Forcer la navigation vers documents si le service est appliqué mais qu'on est sur choose-services
  useEffect(() => {
    if (!serviceParam) return;
    if (servicesLoading) return;
    if (!hasAppliedServiceParam) return;
    if (!formData.selectedServices || formData.selectedServices.length === 0) return;
    if (location.pathname === '/form/documents') return;
    if (location.pathname === '/form/personal-info') return; // Ne pas rediriger depuis Personal Info
    
    // Si on est sur Choose Services (étape 2), rediriger vers Documents (étape 3)
    const isOnChooseServices = location.pathname === '/form/choose-services';
    
    if (isOnChooseServices) {
      console.log('🚀 [SERVICE-PARAM-BACKUP] Navigation de backup vers /form/documents (saut de l\'étape 2)');
      console.log('   Services sélectionnés:', formData.selectedServices);
      setAllowServiceParamBypass(true);
      navigate({ pathname: '/form/documents', search: location.search }, { replace: true });
    }
  }, [
    serviceParam,
    servicesLoading,
    hasAppliedServiceParam,
    formData.selectedServices,
    location.pathname,
    location.search,
    navigate
  ]);

  // Auto-save submission to Supabase
  useEffect(() => {
    // Debounce the save operation
    const timer = setTimeout(() => {
      // Only save if user has started filling the form
      const hasProgress = formData.selectedServices?.length > 0 || 
                         Object.keys(formData.serviceDocuments || {}).length > 0 ||
                         formData.firstName ||
                         formData.lastName ||
                         formData.email;
      
      console.log('🔍 [NotaryForm] Auto-save check:', {
        hasProgress,
        servicesLoading,
        currentStep,
        selectedServices: formData.selectedServices?.length || 0,
        documentsCount: Object.keys(formData.serviceDocuments || {}).length,
        hasEmail: !!formData.email
      });
      
      if (hasProgress) {
        // Don't wait for servicesLoading - save even if services are still loading
        // The submission can be created/updated without the total amount
        console.log('💾💾💾 [NotaryForm] AUTO-SAVE TRIGGERED 💾💾💾');
        console.log('💾 [NotaryForm] Current step:', currentStep);
        console.log('💾 [NotaryForm] Form data keys:', Object.keys(formData));
        
        // Calculate total amount (may be 0 if services not loaded yet)
        const currencyToUse = formData.currency || contextCurrency || 'EUR';
        const totalAmount = calculateTotalAmount(formData, servicesMap || {}, optionsMap || {}, currencyToUse);
        
        console.log('💰 [NotaryForm] Total amount calculated:', totalAmount);
        console.log('💰 [NotaryForm] Calling saveSubmission NOW...');
        
        // Save submission directly
        saveSubmission(formData, currentStep, completedSteps, totalAmount)
          .then(result => {
            console.log('📥 [NotaryForm] saveSubmission promise resolved');
            if (result) {
              console.log('✅✅✅ [NotaryForm] Submission saved successfully ✅✅✅');
              console.log('✅ [NotaryForm] Submission ID:', result.id);
            } else {
              console.warn('⚠️⚠️⚠️ [NotaryForm] Submission save returned NULL ⚠️⚠️⚠️');
            }
          })
          .catch(error => {
            console.error('❌❌❌ [NotaryForm] PROMISE REJECTED ❌❌❌');
            console.error('❌ [NotaryForm] Error:', error);
            console.error('❌ [NotaryForm] Error message:', error?.message);
            console.error('❌ [NotaryForm] Error stack:', error?.stack);
          });
      } else {
        console.log('⏭️ [NotaryForm] Skipping save - no progress yet');
      }
    }, 2000); // Save 2 seconds after last change

    return () => clearTimeout(timer);
  }, [formData, currentStep, completedSteps, servicesMap, optionsMap, servicesLoading]);

  const updateFormData = (dataOrUpdater) => {
    // Support both object and function updater for avoiding race conditions
    if (typeof dataOrUpdater === 'function') {
      setFormData(prev => {
        const result = dataOrUpdater(prev);
        console.log('🔄 [NotaryForm] updateFormData (function) - updating:', Object.keys(result).join(', '));
        if (result.serviceDocuments) {
          const docCount = Object.values(result.serviceDocuments).reduce((sum, docs) => sum + (docs?.length || 0), 0);
          console.log('🔄 [NotaryForm] Total documents after update:', docCount);
        }
        return { ...prev, ...result };
      });
    } else {
      setFormData(prev => {
        console.log('🔄 [NotaryForm] updateFormData (object) - updating:', Object.keys(dataOrUpdater).join(', '));
        return { ...prev, ...dataOrUpdater };
      });
    }
  };

  const markStepCompleted = (stepId) => {
    // Stocker avec index 0-based pour être cohérent avec les vérifications
    const stepIndex = stepId - 1;
    if (!completedSteps.includes(stepIndex)) {
      setCompletedSteps([...completedSteps, stepIndex]);
      
      // Update funnel_status in submission when step is completed
      // This ensures funnel_status is always up-to-date
      updateFunnelStatus(stepId).catch(error => {
        console.error('❌ [FUNNEL] Error updating funnel_status:', error);
        // Don't block step completion if funnel update fails
      });
      
      // Track Plausible funnel events
      switch (stepId) {
        case 1: // Personal Info Completed
          trackPersonalInfoCompleted(isAuthenticated);
          break;
        case 2: // Services Selected
          trackServicesSelected(
            formData.selectedServices?.length || 0,
            formData.selectedServices || []
          );
          break;
        case 3: // Documents Uploaded
          const totalDocs = Object.values(formData.serviceDocuments || {}).reduce(
            (sum, docs) => sum + (docs?.length || 0), 0
          );
          const servicesWithDocs = Object.keys(formData.serviceDocuments || {}).length;
          trackDocumentsUploaded(totalDocs, servicesWithDocs);
          break;
        case 4: // Delivery Method Selected
          // Track delivery method selection if needed
          break;
      }
    }
  };

  const handleContinueClick = async () => {
    // FORCE LOGS AT START - THESE MUST APPEAR
    console.log('%c🚀🚀🚀 HANDLE CONTINUE CLICK CALLED 🚀🚀🚀', 'background: blue; color: white; font-size: 24px; padding: 15px; font-weight: bold;');
    console.warn('⚠️⚠️⚠️ HANDLE CONTINUE CLICK - WARNING LOG ⚠️⚠️⚠️');
    console.error('🔴🔴🔴 HANDLE CONTINUE CLICK - ERROR LOG 🔴🔴🔴');
    
    const canProceed = canProceedFromCurrentStep();
    console.log('%c🔍 CAN PROCEED CHECK: ' + canProceed, 'background: yellow; color: black; font-size: 18px; padding: 10px;');
    console.log('🔍 [NOTARY-FORM] canProceedFromCurrentStep():', canProceed);
    console.log('🔍 [NOTARY-FORM] currentStep:', currentStep);
    console.log('🔍 [NOTARY-FORM] location.pathname:', location.pathname);
    
    if (canProceed) {
      // Recalculer currentStep pour s'assurer d'avoir la bonne valeur
      const stepFromPath = getCurrentStepFromPath();
      console.log('%c📊 STEP FROM PATH: ' + stepFromPath, 'background: green; color: white; font-size: 20px; padding: 10px; font-weight: bold;');
      console.log('📊 [GTM] handleContinueClick - currentStep:', currentStep, 'stepFromPath:', stepFromPath, 'pathname:', location.pathname);
      
      // FORCE SAVE submission before proceeding to next step
      // This ensures submission is always saved, even if auto-save didn't trigger
      try {
        console.log('💾 [NotaryForm] Force saving submission before step change...');
        const totalAmount = calculateTotalAmount(formData, servicesMap || {}, optionsMap || {});
        const result = await saveSubmission(formData, currentStep, completedSteps, totalAmount);
        if (result) {
          console.log('✅ [NotaryForm] Submission force-saved:', result.id);
          
          // Update funnel_status for the current step that was just completed
          // This ensures funnel_status is always synchronized with step completion
          updateFunnelStatus(currentStep, result.id).catch(error => {
            console.error('❌ [FUNNEL] Error updating funnel_status after save:', error);
          });
        } else {
          console.warn('⚠️ [NotaryForm] Force save returned null - submission may not have been saved');
        }
      } catch (error) {
        console.error('❌ [NotaryForm] Error force-saving submission:', error);
        // Don't block navigation, but log the error
      }
      
      // Track GTM events based on current step (utiliser stepFromPath pour être sûr)
      if (stepFromPath === 1) {
        // Étape Personal Info - Événement "personnal_info"
        console.log('📊 [GTM] Déclenchement événement "personnal_info"');
        pushGTMEvent('personnal_info', {
          is_authenticated: isAuthenticated || false,
          is_signatory: formData.isSignatory || false,
          has_address: !!(formData.address && formData.address.trim()),
          has_city: !!(formData.city && formData.city.trim()),
          has_postal_code: !!(formData.postalCode && formData.postalCode.trim()),
          has_country: !!(formData.country && formData.country.trim()),
          has_phone: !!(formData.phone && formData.phone.trim()),
          address_auto_filled: formData._addressAutoFilled || false
        });
        console.log('✅ [GTM] Événement "personnal_info" envoyé');
      } else if (stepFromPath === 3) {
        // Étape Documents - Événement "documents"
        console.log('📊 [GTM] Déclenchement événement "documents"');
        const serviceDocuments = formData.serviceDocuments || {};
        let totalDocuments = 0;
        const servicesWithDocs = [];
        const documentsByService = {};

        Object.entries(serviceDocuments).forEach(([serviceId, files]) => {
          if (Array.isArray(files) && files.length > 0) {
            const fileCount = files.length;
            totalDocuments += fileCount;
            servicesWithDocs.push(serviceId);
            documentsByService[serviceId] = fileCount;
          }
        });

        pushGTMEvent('documents', {
          documents_count: totalDocuments,
          services_with_docs: servicesWithDocs.length,
          service_ids: servicesWithDocs.join(','),
          documents_by_service: documentsByService
        });
        console.log('✅ [GTM] Événement "documents" envoyé:', { documents_count: totalDocuments, services_with_docs: servicesWithDocs.length });
      } else if (stepFromPath === 4) {
        // Étape Delivery Method - Événement "delivery"
        console.log('📊 [GTM] Déclenchement événement "delivery"');
        const DELIVERY_POSTAL_PRICE_EUR = 29.95;
        const deliveryPrice = formData.deliveryMethod === 'postal' ? DELIVERY_POSTAL_PRICE_EUR : 0;
        
        pushGTMEvent('delivery', {
          delivery_method: formData.deliveryMethod || 'none',
          delivery_price: deliveryPrice,
          currency: formData.currency || 'EUR',
          has_delivery_cost: formData.deliveryMethod === 'postal'
        });
        console.log('✅ [GTM] Événement "delivery" envoyé:', { delivery_method: formData.deliveryMethod, delivery_price: deliveryPrice });
      } else {
        console.log('⚠️ [GTM] Aucun événement GTM pour stepFromPath:', stepFromPath);
      }

      // Envoyer les données à Brevo dans la liste "Form abandonné" quand l'utilisateur passe l'étape Personal Info
      // Faire l'appel en arrière-plan pour ne pas bloquer l'interface
      if (stepFromPath === 1) {
        // Ne pas attendre la réponse, laisser tourner en arrière-plan
        (async () => {
          try {
            // Collecter toutes les informations des fichiers uploadés
            const documentUrls = [];
            if (formData.serviceDocuments) {
              Object.entries(formData.serviceDocuments).forEach(([serviceId, files]) => {
                if (Array.isArray(files)) {
                  files.forEach(file => {
                    if (file.url || file.public_url || file.path || file.storage_path) {
                      documentUrls.push({
                        name: file.name || 'Document',
                        url: file.url || file.public_url,
                        path: file.path || file.storage_path,
                        serviceId: serviceId
                      });
                    }
                  });
                }
              });
            }

            const brevoData = {
              email: formData.email,
              firstName: formData.firstName,
              lastName: formData.lastName,
              phone: formData.phone,
              address: formData.address,
              language: language || 'fr',
              documents: documentUrls
            };

            console.log('📧 [BREVO] Sending contact data (background):', brevoData);

            const { data, error } = await supabase.functions.invoke('add-to-brevo-list', {
              body: brevoData
            });

            if (error) {
              console.error('❌ [BREVO] Error sending to Brevo:', error);
            } else {
              console.log('✅ [BREVO] Contact sent to Brevo successfully:', data);
            }
          } catch (error) {
            console.error('❌ [BREVO] Unexpected error sending to Brevo:', error);
          }
        })();
      }

      // Create client/user and link to submission at Personal Info step (step 1)
      // This MUST happen before nextStep() to ensure client/user exist
      if (stepFromPath === 1) {
        // FORCE LOGS TO APPEAR IN CONSOLE
        console.log('%c🚨🚨🚨 STEP 1 DETECTED - STARTING CLIENT CREATION 🚨🚨🚨', 'background: red; color: white; font-size: 24px; padding: 15px; font-weight: bold;');
        console.warn('🚨🚨🚨 STEP 1 - CLIENT CREATION STARTING 🚨🚨🚨');
        console.error('🔴🔴🔴 STEP 1 - ERROR LOG TO MAKE IT VISIBLE 🔴🔴🔴');
        
        // Always show loader during processing (but message will differ based on auth status)
        setIsCreatingUser(true);
        try {
          console.log('%c👤👤👤 STEP 1: Creating/updating client/user 👤👤👤', 'background: orange; color: white; font-size: 20px; padding: 10px;');
          console.log('👤 [NOTARY-FORM] Email:', formData.email);
          console.log('👤 [NOTARY-FORM] First name:', formData.firstName);
          console.log('👤 [NOTARY-FORM] Last name:', formData.lastName);
          
          // FORCE LOGS TO APPEAR
          console.warn('⚠️⚠️⚠️ [NOTARY-FORM] STEP 1 - Creating client/user ⚠️⚠️⚠️');
          console.error('🔴🔴🔴 [NOTARY-FORM] STEP 1 - ERROR LOG 🔴🔴🔴');
          
          // Validate required fields
          if (!formData.email || !formData.firstName || !formData.lastName) {
            console.error('❌ [NOTARY-FORM] Missing required fields for client creation');
            setNotification({
              type: 'error',
              message: 'Email, prénom et nom sont requis pour créer le compte'
            });
            setIsCreatingUser(false);
            return; // Don't proceed if required fields are missing
          }
          
          // Get session ID
          const sessionId = localStorage.getItem('formSessionId') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          if (!localStorage.getItem('formSessionId')) {
            localStorage.setItem('formSessionId', sessionId);
          }

          // Find existing submission by session_id
          console.log('🔍 [NOTARY-FORM] Looking for existing submission with session_id:', sessionId);
          const { data: submissions } = await supabase
            .from('submission')
            .select('id, data')
            .eq('status', 'pending_payment')
            .order('created_at', { ascending: false })
            .limit(20);

          let submissionId = null;
          if (submissions && submissions.length > 0) {
            const foundSubmission = submissions.find(sub => 
              sub.data?.session_id === sessionId
            );
            if (foundSubmission) {
              submissionId = foundSubmission.id;
              console.log('✅ [NOTARY-FORM] Found existing submission:', submissionId);
            } else {
              console.log('ℹ️ [NOTARY-FORM] No submission found with matching session_id');
            }
          }

          // Call Edge Function to create client/user and link to submission
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
          const { data: { session } } = await supabase.auth.getSession();
          
          // Use session token if available, otherwise use anon key for unauthenticated requests
          const authToken = session?.access_token || supabaseAnonKey;
          
          console.log('🔑 [NOTARY-FORM] Auth token type:', session?.access_token ? 'session token' : 'anon key');
          console.log('🔑 [NOTARY-FORM] Has session:', !!session);
          
          const requestBody = {
            email: formData.email.trim().toLowerCase(), // Normalize email
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            phone: formData.phone || null,
            address: formData.address || null,
            city: formData.city || null,
            postalCode: formData.postalCode || null,
            country: formData.country || null,
            selectedServices: formData.selectedServices || [],
            documents: formData.serviceDocuments || {},
            deliveryMethod: formData.deliveryMethod || null,
            signatories: formData.signatories || [],
            currentStep: stepFromPath,
            sessionId: sessionId,
            submissionId: submissionId,
            // Password removed - using magic link authentication
          };
          
          console.log('%c📤 CALLING EDGE FUNCTION', 'background: purple; color: white; font-size: 18px; padding: 8px;');
          console.log('📤 [NOTARY-FORM] Calling create-client-and-submission with:', requestBody);
          console.log('📤 [NOTARY-FORM] Using auth token:', authToken ? 'YES (length: ' + authToken.length + ')' : 'NO');
          console.warn('⚠️ [NOTARY-FORM] About to call Edge Function');
          console.error('🔴 [NOTARY-FORM] Edge Function call starting');
          
          const response = await fetch(`${supabaseUrl}/functions/v1/create-client-and-submission`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
              'apikey': supabaseAnonKey, // Add apikey header as required by Supabase
            },
            body: JSON.stringify(requestBody)
          });

          console.log('%c📥 RESPONSE RECEIVED', 'background: cyan; color: black; font-size: 18px; padding: 8px;');
          const result = await response.json();
          console.log('📥 [NOTARY-FORM] Response status:', response.status);
          console.log('📥 [NOTARY-FORM] Response OK?', response.ok);
          console.warn('⚠️ [NOTARY-FORM] Response status:', response.status);
          console.error('🔴 [NOTARY-FORM] Response OK:', response.ok);
          console.log('📥 [NOTARY-FORM] Response data:', JSON.stringify(result, null, 2));

          if (!response.ok) {
            console.error('❌❌❌ [NOTARY-FORM] Error creating client/user ❌❌❌');
            console.error('❌ [NOTARY-FORM] Status:', response.status);
            console.error('❌ [NOTARY-FORM] Error code:', result.errorCode);
            console.error('❌ [NOTARY-FORM] Error message:', result.error);
            console.error('❌ [NOTARY-FORM] Error details:', result.errorDetails);
            console.error('❌ [NOTARY-FORM] Error hint:', result.errorHint);
            console.error('❌ [NOTARY-FORM] Full error:', result);
            
            // Show more detailed error message
            const errorMessage = result.error || 'Erreur lors de la création du compte. Veuillez réessayer.';
            setNotification({
              type: 'error',
              message: errorMessage + (result.errorCode ? ` (Code: ${result.errorCode})` : '')
            });
            setIsCreatingUser(false);
            return; // Don't proceed to next step if client/user creation failed
          } else {
            console.log('✅✅✅ [NOTARY-FORM] Client/user created/updated successfully ✅✅✅');
            console.log('✅ [NOTARY-FORM] Client ID:', result.client_id);
            console.log('✅ [NOTARY-FORM] User ID:', result.user_id);
            console.log('✅ [NOTARY-FORM] Submission ID:', result.submission_id);
            console.log('✅ [NOTARY-FORM] User created:', result.user_created);
            
            // Note: User will need to sign in with magic link sent to their email
            // No auto-login needed since we're using passwordless authentication
            if (result.user_created) {
              console.log('✅ [NOTARY-FORM] User created. Magic link will be sent to:', formData.email);
            }
            
            // Update formData with submission ID if it was created/updated
            if (result.submission_id && !formData.submissionId) {
              updateFormData({ submissionId: result.submission_id });
            }
          }
        } catch (error) {
          console.error('%c❌❌❌ [NOTARY-FORM] Unexpected error creating client/user ❌❌❌', 'background: red; color: white; font-size: 20px; padding: 10px;');
          console.error('❌ [NOTARY-FORM] Error type:', typeof error);
          console.error('❌ [NOTARY-FORM] Error:', error);
          console.error('❌ [NOTARY-FORM] Error message:', error?.message);
          console.error('❌ [NOTARY-FORM] Error stack:', error?.stack);
          console.error('❌ [NOTARY-FORM] Error name:', error?.name);
          console.error('❌ [NOTARY-FORM] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
          setNotification({
            type: 'error',
            message: 'Erreur lors de la création du compte. Veuillez réessayer.'
          });
          setIsCreatingUser(false);
          return; // Don't proceed to next step if error occurred
        } finally {
          console.log('🏁 [NOTARY-FORM] Finally block - setting isCreatingUser to false');
          setIsCreatingUser(false);
        }
      } else {
        console.log('⚠️ [NOTARY-FORM] stepFromPath is not 1, skipping client creation. stepFromPath:', stepFromPath);
      }
      
      console.log('➡️ [NOTARY-FORM] Calling nextStep()');
      nextStep();
    } else {
      console.log('%c⛔ CANNOT PROCEED - VALIDATION FAILED', 'background: red; color: white; font-size: 18px; padding: 10px;');
      console.log('⛔ [NOTARY-FORM] canProceedFromCurrentStep() returned false');
      setNotification({
        type: 'error',
        message: t('form.errors.completeRequiredFields') || 'Please complete all required fields before continuing.'
      });
    }
  };

  const nextStep = () => {
    // Mark current step as completed
    markStepCompleted(currentStep);

    // Navigate to next step
    if (currentStep < steps.length) {
      let nextStepId = currentStep + 1;
      
      // Si on est sur l'étape 1 (Personal Info) et qu'un service param est présent,
      // sauter l'étape 2 (Choose Services) et aller directement à l'étape 3 (Documents)
      if (currentStep === 1 && serviceParam && hasAppliedServiceParam && formData.selectedServices && formData.selectedServices.length > 0) {
        console.log('🚀 [NEXT-STEP] Service param présent, saut de l\'étape 2 (Choose Services)');
        nextStepId = 3; // Aller directement à Documents (étape 3)
      }
      
      const nextStepData = steps.find(s => s.id === nextStepId);
      if (nextStepData) {
        navigate(nextStepData.path);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
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
      
      const step = steps.find(s => s.id === stepId);
      if (step) {
        navigate(step.path);
      }
    }
  };

  // Prevent page close/refresh with confirmation modal
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Don't show warning if payment is in progress (user clicked Pay button)
      if (isSubmitting) {
        return;
      }
      // Only prevent if user has started the form (completed at least step 1) and is not on Summary
      if (completedSteps.length > 0 && currentStep < 5) {
        // Show browser's default confirmation dialog
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
        return ''; // Required for some browsers
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentStep, completedSteps, isSubmitting]);

  // Detect user inactivity and show modal after 15 seconds (only once)
  useEffect(() => {
    // Only show modal if user has started the form (completed at least step 1)
    if (completedSteps.length === 0 || currentStep === 5 || isSubmitting) {
      setShowInactivityModal(false);
      return;
    }

    // Don't show modal if it has already been shown
    if (hasShownInactivityModal) {
      return;
    }

    // Don't reset timer if modal is already shown
    if (showInactivityModal) {
      return;
    }

    let inactivityTimer = null;
    let lastActivityTime = Date.now();

    const resetTimer = (e) => {
      // Don't reset if clicking inside the modal
      if (e && e.target && e.target.closest('[data-inactivity-modal]')) {
        return;
      }

      lastActivityTime = Date.now();
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      
      // Set new timer for 15 seconds
      inactivityTimer = setTimeout(() => {
        const timeSinceLastActivity = Date.now() - lastActivityTime;
        if (timeSinceLastActivity >= 15000 && !showInactivityModal && !hasShownInactivityModal) {
          setShowInactivityModal(true);
          setHasShownInactivityModal(true);
          sessionStorage.setItem('inactivityModalShown', 'true');
        }
      }, 15000);
    };

    // Track user activity events
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    activityEvents.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    // Initialize timer
    resetTimer();

    return () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetTimer, true);
      });
    };
  }, [completedSteps, currentStep, isSubmitting, showInactivityModal, hasShownInactivityModal]);

  // Gérer le compteur de 5 secondes quand isSubmitting est true
  useEffect(() => {
    if (isSubmitting) {
      setCountdown(5);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setCountdown(5);
    }
  }, [isSubmitting]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      console.log('Creating payment session for form data:', formData);

      // Upload documents to Supabase Storage, organized by service
      const uploadedServiceDocuments = {};

      if (formData.serviceDocuments && Object.keys(formData.serviceDocuments).length > 0) {
        console.log('📤 Uploading documents to storage...');

        for (const [serviceId, files] of Object.entries(formData.serviceDocuments)) {
          uploadedServiceDocuments[serviceId] = [];

          for (const file of files) {
            // Convert serialized file back to Blob for upload
            const blob = await fetch(file.dataUrl).then(r => r.blob());

            // Sanitize file name to remove special characters and accents
            const sanitizeFileName = (name) => {
              // Remove accents and special characters
              return name
                .normalize('NFD') // Decompose characters (é -> e + ´)
                .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
                .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace invalid chars with underscore
                .replace(/_{2,}/g, '_') // Replace multiple underscores with single
                .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
            };

            // Generate unique file name with sanitized original name
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(7);
            const sanitizedName = sanitizeFileName(file.name);
            const fileName = `temp/${serviceId}/${timestamp}_${randomId}_${sanitizedName}`;

            console.log(`📤 Uploading for service ${serviceId}:`, fileName);
            console.log(`   Original name: ${file.name} -> Sanitized: ${sanitizedName}`);

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
      // Provide default appointment_date, appointment_time, and timezone if not provided
      // (since Book Appointment step was removed)
      const defaultAppointmentDate = formData.appointmentDate || new Date().toISOString().split('T')[0];
      const defaultAppointmentTime = formData.appointmentTime || '09:00';
      const defaultTimezone = formData.timezone || 'UTC';
      
      // Calculate additional signatories cost - 45€ per additional signatory, first one is free
      const signatoriesCount = formData.signatories?.length || 0;
      const additionalSignatoriesCount = signatoriesCount > 1 ? signatoriesCount - 1 : 0;
      const additionalSignatoriesCost = additionalSignatoriesCount * 45;

      // Delivery postal cost (29.95€) if selected
      const deliveryPostalCostEUR = formData.deliveryMethod === 'postal' ? 29.95 : 0;
      
      // Utiliser la devise du contexte en priorité pour garantir la synchronisation
      const finalCurrency = (contextCurrency || formData.currency || 'EUR').toUpperCase();
      console.log('💰 [NotaryForm] ====== DEVISE POUR STRIPE ======');
      console.log('💰 [NotaryForm] Devise du contexte (CurrencyContext):', contextCurrency);
      console.log('💰 [NotaryForm] Devise de formData (localStorage):', formData.currency);
      console.log('💰 [NotaryForm] Devise finale utilisée:', finalCurrency);
      console.log('💰 [NotaryForm] ================================');
      
      // Sauvegarder la devise dans formData pour la prochaine fois
      if (contextCurrency && contextCurrency !== formData.currency) {
        console.log('💰 [NotaryForm] Mise à jour de formData.currency avec:', contextCurrency);
        setFormData(prev => ({ ...prev, currency: contextCurrency }));
      }
      
      // Préparer des libellés localisés pour le checkout Stripe
      // Structure: mapping des IDs vers les noms traduits pour faciliter l'utilisation par l'Edge Function
      const localizedNames = {};
      const localizedLineItems = [];

      if (formData.selectedServices && formData.selectedServices.length > 0) {
        formData.selectedServices.forEach(serviceId => {
          const service = servicesMap[serviceId];
          const documents = formData.serviceDocuments?.[serviceId] || [];
          if (service && documents.length > 0) {
            const translatedName = getServiceName(service) || service?.name || serviceId;
            // Format pour Stripe: "Service Name (X document(s))"
            const displayName = `${translatedName} (${documents.length} ${documents.length === 1 ? t('form.steps.summary.document', 'document') : t('form.steps.summary.documentPlural', 'documents')})`;
            
            localizedNames[`service_${serviceId}`] = displayName;
            localizedLineItems.push({
              type: 'service',
              id: serviceId,
              name: displayName,
              quantity: documents.length,
            });

            // Options associées
            documents.forEach(doc => {
              if (doc.selectedOptions && doc.selectedOptions.length > 0) {
                doc.selectedOptions.forEach(optionId => {
                  const option = optionsMap[optionId];
                  if (option) {
                    const translatedOptionName = getOptionName(option) || option?.name || optionId;
                    localizedNames[`option_${optionId}`] = translatedOptionName;
                    localizedLineItems.push({
                      type: 'option',
                      id: optionId,
                      name: translatedOptionName,
                      quantity: 1,
                    });
                  }
                });
              }
            });
          }
        });
      }

      if (formData.deliveryMethod === 'postal') {
        const deliveryName = t('form.steps.delivery.postTitle', 'Physical delivery (DHL Express)');
        localizedNames['delivery_postal'] = deliveryName;
        localizedLineItems.push({
          type: 'delivery',
          id: 'delivery_postal',
          name: deliveryName,
          quantity: 1,
        });
      }

      // Additional signatories line item
      if (additionalSignatoriesCount > 0) {
        const signatoriesName = t('form.priceDetails.additionalSignatories', 'Additional signatories');
        localizedNames['additional_signatories'] = signatoriesName;
        localizedLineItems.push({
          type: 'additional_signatories',
          id: 'additional_signatories',
          name: signatoriesName,
          quantity: additionalSignatoriesCount,
        });
      }
      
      const submissionData = {
        ...formData,
        currency: finalCurrency, // Forcer l'utilisation de la devise du contexte
        serviceDocuments: uploadedServiceDocuments, // Add uploaded file paths organized by service
        appointmentDate: defaultAppointmentDate,
        appointmentTime: defaultAppointmentTime,
        timezone: defaultTimezone,
        // Explicitly include signatories cost calculation for Edge Function
        signatoriesCount: signatoriesCount,
        additionalSignatoriesCount: additionalSignatoriesCount,
        additionalSignatoriesCost: additionalSignatoriesCost, // In EUR
        // Delivery method & cost (EUR)
        deliveryMethod: formData.deliveryMethod,
        deliveryPostalCostEUR,
        language,
        localizedLineItems,
        localizedNames, // Mapping des IDs vers les noms traduits pour faciliter l'utilisation par l'Edge Function
      };

      // Call Supabase Edge Function to create Stripe checkout session
      // The Edge Function will fetch services from database and calculate the amount
      console.log('📤 Calling Edge Function with full data:');
      console.log('   selectedServices:', submissionData.selectedServices);
      console.log('   serviceDocuments:', submissionData.serviceDocuments);
      console.log('   signatories:', submissionData.signatories);
      console.log('   signatories count:', submissionData.signatoriesCount);
      console.log('   additional signatories:', submissionData.additionalSignatoriesCount);
      console.log('   additional signatories cost:', submissionData.additionalSignatoriesCost, 'EUR');
      console.log('   currency:', submissionData.currency || 'EUR (default)');
      console.log('   language:', submissionData.language);
      console.log('   localizedNames:', submissionData.localizedNames);
      console.log('   localizedLineItems:', submissionData.localizedLineItems);
      console.log('   appointmentDate:', submissionData.appointmentDate);
      console.log('   appointmentTime:', submissionData.appointmentTime);
      console.log('   timezone:', submissionData.timezone);

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
      // La devise est déjà dans submissionData.currency (forcée depuis le contexte)
      const currency = submissionData.currency || 'EUR';
      console.log('💰 [CURRENCY] Devise finale envoyée à Stripe:', currency);
      console.log('💰 [CURRENCY] Devise dans submissionData:', submissionData.currency);
      
      // Get existing submission ID if exists
      const sessionId = localStorage.getItem('formSessionId');
      let existingSubmissionId = null;
      
      if (sessionId) {
        try {
          const { data: submissions } = await supabase
            .from('submission')
            .select('id')
            .eq('status', 'pending_payment')
            .order('created_at', { ascending: false })
            .limit(10);

          if (submissions && submissions.length > 0) {
            for (const sub of submissions) {
              const { data: subData } = await supabase
                .from('submission')
                .select('data')
                .eq('id', sub.id)
                .single();
              
              if (subData?.data?.session_id === sessionId) {
                existingSubmissionId = sub.id;
                break;
              }
            }
          }
        } catch (error) {
          console.error('Error finding existing submission:', error);
        }
      }

      const requestBody = {
        formData: {
          ...submissionData,
          currency: currency, // S'assurer que formData.currency contient aussi la bonne devise
          sessionId: sessionId // Add sessionId to formData
        },
        currency: currency, // Envoyer la devise comme paramètre séparé et explicite
        submissionId: existingSubmissionId, // Send existing submission ID if found
        // IMPORTANT: Edge Function MUST use these fields for signatories:
        // - formData.signatories: array of signatories
        // - formData.signatoriesCount: total number of signatories
        // - formData.additionalSignatoriesCount: number of additional signatories (total - 1, first is free)
        // - formData.additionalSignatoriesCost: cost in EUR (additionalSignatoriesCount * 45)
        // 
        // The Edge Function MUST:
        // 1. Convert formData.additionalSignatoriesCost from EUR to the target currency if needed
        // 2. Add this converted cost to the total amount
        // 3. Create a Stripe line item: {
        //      name: "Additional Signatories",
        //      amount: convertedCostInCents, // Convert to cents and to target currency
        //      quantity: formData.additionalSignatoriesCount
        //    }
      };
      
      console.log('💰 [CURRENCY] Body envoyé à l\'Edge Function:');
      console.log('   currency (paramètre séparé):', requestBody.currency);
      console.log('   formData.currency:', requestBody.formData.currency);
      console.log('   JSON body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify(requestBody)
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

      // Explicitly save form data to localStorage before redirecting to ensure persistence
      // This ensures data is available when returning from Stripe checkout
      try {
        localStorage.setItem('notaryFormData', JSON.stringify(formData));
        localStorage.setItem('notaryCompletedSteps', JSON.stringify(completedSteps));
        console.log('💾 [SAVE] Form data explicitly saved to localStorage before redirect');
      } catch (saveError) {
        console.error('❌ [SAVE] Error saving to localStorage:', saveError);
        // Continue anyway - useLocalStorage hook should have already saved it
      }

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
    <div className="flex h-screen bg-white overflow-hidden overflow-x-hidden w-full max-w-full">
      {/* Header - Fixed at top - Visible on all screen sizes */}
      <header className="fixed top-0 left-0 right-0 bg-[#F3F4F6] z-50 h-14 sm:h-16 overflow-visible">
        <div className="flex items-center justify-between h-full px-2 sm:px-3 md:px-4 xl:px-6">
          <Logo width={70} height={70} className="sm:w-[80px] sm:h-[80px]" />
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 xl:gap-3 overflow-visible">
            <LanguageSelector openDirection="bottom" />
            <CurrencySelector openDirection="bottom" />
            <button
              onClick={openCrisp}
              className="flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 bg-transparent sm:bg-black text-black sm:text-white hover:bg-gray-100 sm:hover:bg-gray-800 transition-colors font-medium text-xs sm:text-sm flex-shrink-0 rounded-lg"
              aria-label="Contact Us"
            >
              <Icon icon="heroicons:chat-bubble-left-right" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 flex-shrink-0" />
              <span className="truncate">{t('form.sidebar.contactUs')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40 top-14 sm:top-16"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="bg-[#F3F4F6] w-full max-w-sm h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Contact Us Button - Mobile */}
            <div className="p-4 border-b border-gray-300">
              <button
                onClick={() => {
                  openCrisp();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center justify-center w-full px-4 py-2 bg-transparent text-black hover:bg-gray-100 transition-colors font-medium rounded-lg border-2 border-black"
                aria-label="Contact Us"
              >
                <Icon icon="heroicons:chat-bubble-left-right" className="w-5 h-5 mr-2" />
                {t('form.sidebar.contactUs')}
              </button>
            </div>

            {/* Steps Navigation - Scrollable */}
            <div className="flex-1 overflow-y-auto p-8 pb-0">
              <div className="space-y-1.5 pb-8">
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
                    className={`flex items-center justify-between px-3 h-[50px] rounded-lg transition-all duration-300 ${
                      canAccess ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                    } ${
                      isCurrent
                        ? 'bg-black text-white shadow-lg'
                        : isCompleted
                        ? 'bg-white text-gray-700 hover:bg-gray-100 hover:shadow-md'
                        : 'bg-white text-gray-400'
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon 
                        icon={isCompleted ? 'heroicons:check' : step.icon} 
                        className={`w-5 h-5 mr-2 ${
                          isCurrent ? 'text-white' : isCompleted ? 'text-gray-600' : 'text-gray-400'
                        }`} 
                      />
                      <span className="text-sm font-medium">{step.name}</span>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>

            {/* Navigation Link - Fixed at bottom */}
            <div className="p-6 border-t border-gray-200">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="w-full flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon icon="heroicons:squares-2x2" className="w-5 h-5 mr-2" />
                  <span className="text-sm font-medium">Dashboard</span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="w-full flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon icon="heroicons:arrow-right-on-rectangle" className="w-5 h-5 mr-2" />
                  <span className="text-sm font-medium">Connexion</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Full width without margins */}
      <main className="flex-1 flex items-center justify-center pt-14 sm:pt-16 pb-0 overflow-hidden overflow-x-hidden bg-[#F3F4F6] w-full max-w-full">
        {/* Form Content */}
        <div className="w-full max-w-full h-full animate-fade-in-up flex flex-col overflow-y-auto overflow-x-hidden relative">
          <Routes>
            <Route
              path="personal-info"
              element={
                <PersonalInfo
                  formData={formData}
                  updateFormData={updateFormData}
                  nextStep={nextStep}
                  prevStep={prevStep}
                  isAuthenticated={isAuthenticated}
                  handleContinueClick={handleContinueClick}
                  getValidationErrorMessage={getValidationErrorMessage}
                  isPriceDetailsOpen={isPriceDetailsOpen}
                  setIsPriceDetailsOpen={setIsPriceDetailsOpen}
                />
              }
            />
            <Route
              path="choose-services"
              element={
                <ChooseOption
                  formData={formData}
                  updateFormData={updateFormData}
                  nextStep={nextStep}
                  handleContinueClick={handleContinueClick}
                  getValidationErrorMessage={getValidationErrorMessage}
                  isPriceDetailsOpen={isPriceDetailsOpen}
                  setIsPriceDetailsOpen={setIsPriceDetailsOpen}
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
                  handleContinueClick={handleContinueClick}
                  getValidationErrorMessage={getValidationErrorMessage}
                  isPriceDetailsOpen={isPriceDetailsOpen}
                  setIsPriceDetailsOpen={setIsPriceDetailsOpen}
                  setIsUploading={setIsUploading}
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
                  handleContinueClick={handleContinueClick}
                  getValidationErrorMessage={getValidationErrorMessage}
                />
              }
            />
            <Route
              path="delivery"
              element={
                <DeliveryMethod
                  formData={formData}
                  updateFormData={updateFormData}
                  nextStep={nextStep}
                  prevStep={prevStep}
                  handleContinueClick={handleContinueClick}
                  getValidationErrorMessage={getValidationErrorMessage}
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

      {/* Footer - Progress Bar as top border + Navigation Buttons + Price Details - Fixed at bottom */}
      {/* Hide footer on mobile when on Summary step (step 6) - visible from 1536px (2xl breakpoint) */}
      <div data-footer="notary-form" className={`fixed bottom-0 left-0 right-0 bg-white z-50 safe-area-inset-bottom max-w-full overflow-x-hidden ${currentStep === 6 ? '2xl:block hidden' : ''}`}>
        {/* Progress Bar as top border */}
        <div className="relative w-full">
          <div className="h-1 bg-gray-300 w-full">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${(currentStep / steps.length) * 100}%`,
                background: 'linear-gradient(90deg, #491ae9 0%, #b300c7 33%, #f20075 66%, #ff8400 100%)'
              }}
            />
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-t border-gray-200 w-full max-w-full overflow-x-hidden">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              aria-label="Back"
            >
              <Icon icon="heroicons:arrow-left" className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
            </button>
          ) : <div></div>}
          
          {currentStep < steps.length ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm text-gray-500 flex-shrink-0">
                {t('form.navigation.step')} {currentStep}/{steps.length}
              </span>
            <button
              type="button"
              onClick={(e) => {
                console.log('%c🟢🟢🟢 BUTTON CLICKED IN FOOTER 🟢🟢🟢', 'background: green; color: white; font-size: 24px; padding: 15px; font-weight: bold;');
                console.error('🔴 BUTTON CLICKED - ERROR LOG');
                console.warn('⚠️ BUTTON CLICKED - WARNING LOG');
                console.log('🟢 [FOOTER] Button clicked, calling handleContinueClick');
                console.log('🟢 [FOOTER] isCreatingUser:', isCreatingUser);
                console.log('🟢 [FOOTER] isUploading:', isUploading);
                console.log('🟢 [FOOTER] canProceed:', canProceedFromCurrentStep());
                handleContinueClick();
              }}
              disabled={isCreatingUser || isUploading}
              className={`px-4 sm:px-8 md:px-12 lg:px-16 py-2 sm:py-2.5 font-medium rounded-lg transition-all text-xs sm:text-sm flex-shrink-0 border shadow-lg min-w-0 max-w-full flex items-center justify-center gap-2 ${
                canProceedFromCurrentStep() && !isCreatingUser && !isUploading
                  ? 'bg-[#2563eb] text-white border-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af]'
                  : 'bg-[#2563eb]/50 text-white/60 border-[#2563eb]/30 opacity-60 cursor-not-allowed'
              }`}
            >
              {isCreatingUser ? (
                <>
                  <svg className="animate-spin -ml-1 h-4 w-4 text-white flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="truncate">
                    {isAuthenticated 
                      ? (t('form.navigation.processing') || 'Processing...')
                      : t('form.navigation.creatingAccount')
                    }
                  </span>
                </>
              ) : isUploading ? (
                <>
                  <svg className="animate-spin -ml-1 h-4 w-4 text-white flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="truncate">{t('form.navigation.uploading') || 'Uploading...'}</span>
                </>
              ) : (
                <>
                  <span className="truncate">{t('form.navigation.continue')}</span>
                  <Icon icon="heroicons:arrow-right" className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                </>
              )}
            </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3 2xl:hidden">
              <span className="text-xs sm:text-sm text-gray-500 flex-shrink-0">
                Step {currentStep}/{steps.length}
              </span>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`px-4 sm:px-8 md:px-12 lg:px-16 py-2 sm:py-2.5 font-medium rounded-lg transition-all text-xs sm:text-sm flex-shrink-0 border shadow-lg min-w-0 max-w-full flex items-center justify-center ${
                isSubmitting
                  ? 'bg-[#2563eb]/50 text-white/60 border-[#2563eb]/30 opacity-60 cursor-not-allowed'
                  : 'bg-[#2563eb] text-white border-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-white flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="truncate">
                    {t('form.payment.processing') || 'Please wait, processing your payment...'} ({countdown}s)
                  </span>
                </>
              ) : (
                <>
                  <Icon icon="heroicons:lock-closed" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <span className="truncate">Secure Payment</span>
                </>
              )}
            </button>
            </div>
          )}
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Inactivity Modal */}
      <InactivityModal
        isVisible={showInactivityModal}
        onClose={() => {
          setShowInactivityModal(false);
          setHasShownInactivityModal(true);
          sessionStorage.setItem('inactivityModalShown', 'true');
        }}
      />

      {/* Exit Confirmation Modal */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative animate-fade-in-up">
            <div className="flex items-start space-x-4 mb-4">
              <div className="p-3 bg-yellow-100 rounded-lg flex-shrink-0">
                <Icon icon="heroicons:exclamation-triangle" className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {t('form.exitConfirm.title') || 'Leave this page?'}
                </h3>
                <p className="text-sm text-gray-600">
                  {t('form.exitConfirm.message') || 'You have unsaved changes. Are you sure you want to leave? Your progress will be lost.'}
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowExitConfirmModal(false);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {t('form.exitConfirm.cancel') || 'Cancel'}
              </button>
              <button
                onClick={() => {
                  setShowExitConfirmModal(false);
                  // Allow navigation/close after confirmation
                  window.location.href = '/';
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                {t('form.exitConfirm.leave') || 'Leave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotaryForm;
