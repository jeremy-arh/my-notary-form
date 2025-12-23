import { useEffect, useState, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { supabase } from '../lib/supabase';
import { useLocalStorage } from '../hooks/useLocalStorage';
import Logo from '../assets/Logo';
import { trackPageView, trackFormStep, trackFormSubmissionStart, trackFormSubmission, trackFormStart } from '../utils/gtm';
import { 
  trackFormStart as trackPlausibleFormStart,
  trackServicesSelected,
  trackDocumentsUploaded,
  trackPersonalInfoCompleted,
  trackSummaryViewed,
  trackPaymentInitiated,
  trackPaymentCompleted,
  trackFormAbandoned,
  trackStepNavigation
} from '../utils/plausible';
import { openCrisp } from '../utils/crisp';
import { useServices } from '../contexts/ServicesContext';
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
  const [countdown, setCountdown] = useState(5);
  const [isPriceDetailsOpen, setIsPriceDetailsOpen] = useState(false);
  const [hasAppliedServiceParam, setHasAppliedServiceParam] = useState(false);
  const { t } = useTranslation();
  const { services, loading: servicesLoading } = useServices();
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
    // Services (step 1)
    selectedServices: [], // Array of service IDs

    // Documents (step 2) - organized by service
    serviceDocuments: {}, // { serviceId: [files] }

    // Signatories (step 4) - global list for the entire order
    signatories: [], // [signatories] - global list for all documents
    isSignatory: false, // Whether the user is one of the signatories

    timezone: 'UTC-5',

    // Delivery method
    deliveryMethod: null,

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

  const steps = [
    { id: 1, name: 'Choose Services', icon: 'heroicons:check-badge', path: '/form/choose-services' },
    { id: 2, name: 'Upload Documents', icon: 'heroicons:document-text', path: '/form/documents' },
    { id: 3, name: 'Delivery method', icon: 'heroicons:envelope', path: '/form/delivery' },
    { id: 4, name: 'Your personal informations', icon: 'heroicons:user', path: '/form/personal-info' },
    { id: 5, name: 'Add Signatories', icon: 'heroicons:user-group', path: '/form/signatories' },
    { id: 6, name: 'Summary', icon: 'heroicons:clipboard-document-check', path: '/form/summary' }
  ];

  // Function to get validation error message for current step
  const getValidationErrorMessage = () => {
    switch (currentStep) {
      case 1: // Choose Services
        return 'Please select at least one service';
      case 2: // Upload Documents
        return 'Please upload at least one document for each selected service';
      case 3: // Delivery method
        return 'Please select a delivery method';
      case 4: // Personal informations
        return 'Please complete all required personal information fields';
      case 5: // Add Signatories
        return 'Please add at least one signatory';
      default:
        return 'Please complete all required fields';
    }
  };

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

      case 3: // Delivery method
        // Always valid as long as a method is selected
        return !!formData.deliveryMethod;

      case 4: // Personal informations
        if (!formData.firstName?.trim() || !formData.lastName?.trim()) return false;
        if (!isAuthenticated && (!formData.email?.trim() || !formData.password?.trim())) return false;
        if (!formData.address?.trim()) return false;
        return true;

      case 5: // Add Signatories
        // Check that there is at least one signatory
        if (!formData.signatories || !Array.isArray(formData.signatories) || formData.signatories.length === 0) {
          return false;
        }
        // Check that all signatories have required fields filled (only firstName, lastName, email, phone)
        return formData.signatories.every(sig => {
          const firstName = sig.firstName?.trim();
          const lastName = sig.lastName?.trim();
          const email = sig.email?.trim();
          const phone = sig.phone?.trim();
          
          // Check all required fields are filled
          if (!firstName || !lastName || !email || !phone) {
            return false;
          }
          
          // Basic email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            return false;
          }
          
          // Basic phone validation (at least 5 characters for a valid phone number)
          if (phone.length < 5) {
            return false;
          }
          
          return true;
        });

      case 6: // Summary

        // Check all required fields are filled
        return requiredFields.every(field => field && field.trim() !== '');

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
      'Delivery method': 'delivery_method',
      'Your personal informations': 'personal_info',
      'Add Signatories': 'signatories',
      'Summary': 'review_summary'
    };
    return stepNameMap[stepName] || stepName.toLowerCase().replace(/\s+/g, '_');
  };

  // Validate step access and track page views
  useEffect(() => {
    // Redirect to /form/choose-services if at /form root (en conservant la query)
    if (location.pathname === '/form' || location.pathname === '/form/') {
      // Si un param service existe, on laisse l'autre effet gérer la navigation directe
      if (serviceParam && !hasAppliedServiceParam) {
        return;
      }
      navigate({ pathname: '/form/choose-services', search: location.search }, { replace: true });
      return;
    }

    // CRITICAL: Redirect ALL obsolete or unknown routes to valid routes
    const validPaths = steps.map(s => s.path);
    const isObsoleteRoute = location.pathname.startsWith('/form/') && !validPaths.includes(location.pathname);
    
    if (isObsoleteRoute) {
      console.log('⚠️ [REDIRECT] Route obsolète ou inconnue détectée:', location.pathname);
      // Determine the best route based on completed steps
      let targetPath = '/form/choose-services';
      
      if (completedSteps.length >= steps.length - 1) {
        // User has completed all steps, redirect to summary (likely returning from payment)
        targetPath = '/form/summary';
      } else if (completedSteps.length >= 4) {
        // User has completed steps 1-4, redirect to signatories (step 5)
        targetPath = '/form/signatories';
      } else if (completedSteps.length >= 3) {
        // User has completed steps 1-3, redirect to personal-info (step 4)
        targetPath = '/form/personal-info';
      } else if (completedSteps.length >= 2) {
        // User has completed steps 1-2, redirect to delivery (step 3)
        targetPath = '/form/delivery';
      } else if (completedSteps.length >= 1) {
        // User has completed step 1, redirect to documents
        targetPath = '/form/documents';
      }
      
      console.log('   -> Redirection vers:', targetPath);
      navigate({ pathname: targetPath, search: location.search }, { replace: true });
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
    // 3. User is going to next step from current step AND can proceed from current step (handles async state update)
    // 4. Summary if all previous steps are completed (for returning from payment)
    const previousStepIndex = requestedStep - 2; // Step 2 -> index 0, Step 3 -> index 1, etc.
    const currentStepFromPath = getCurrentStepFromPath();
    const isGoingToNextStep = requestedStep === currentStepFromPath + 1;
    
    // Check if we can proceed from current step (for when navigating forward)
    let canProceedFromCurrent = false;
    if (isGoingToNextStep && requestedStep > 1) {
      // Check if previous step (current step) can be completed
      const prevStepId = requestedStep - 1;
      switch (prevStepId) {
        case 1: // Choose Services
          canProceedFromCurrent = formData.selectedServices && formData.selectedServices.length > 0;
          break;
        case 2: // Upload Documents
          if (formData.selectedServices && formData.selectedServices.length > 0 && formData.serviceDocuments) {
            canProceedFromCurrent = formData.selectedServices.every(serviceId => {
              const docs = formData.serviceDocuments[serviceId];
              return docs && docs.length > 0;
            });
          }
          break;
        case 3: // Personal Info
          canProceedFromCurrent = formData.firstName?.trim() && formData.lastName?.trim() && 
                                  (isAuthenticated || (formData.email?.trim() && formData.password?.trim())) &&
                                  formData.address?.trim();
          break;
        case 4: // Signatories
          if (formData.signatories && Array.isArray(formData.signatories) && formData.signatories.length > 0) {
            canProceedFromCurrent = formData.signatories.every(sig => {
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
          }
          break;
      }
    }
    
    const canAccess = requestedStep === 1 || 
                     completedSteps.includes(previousStepIndex) ||
                     canProceedFromCurrent ||
                     (isSummaryStep && hasCompletedAllPreviousSteps);
    
    console.log('🔍 [GUARD] Vérification accès étape:', {
      requestedStep,
      currentStepFromPath,
      previousStepIndex,
      completedSteps,
      isGoingToNextStep,
      canProceedFromCurrent,
      canAccess,
      allowServiceParamBypass,
      serviceParam,
      hasAppliedServiceParam
    });

    if (!canAccess) {
      // If trying to access Summary, always allow it (user likely coming back from payment)
      if (isSummaryStep) {
        // Mark all previous steps as completed to allow access
        const stepsToComplete = steps.filter(s => s.id !== steps.length).map(s => s.id);
        const updatedCompletedSteps = [...new Set([...completedSteps, ...stepsToComplete.map(s => s - 1)])].sort();
        setCompletedSteps(updatedCompletedSteps);
        return; // Allow access to Summary
      }
      
      const lastCompletedStep = completedSteps.length > 0
        ? Math.max(...completedSteps) + 1
        : 1;
      const redirectStep = steps.find(s => s.id === lastCompletedStep);
      if (redirectStep) {
        navigate(redirectStep.path, { replace: true });
      }
    }
  }, [location.pathname, completedSteps, navigate, allowServiceParamBypass, serviceParam, hasAppliedServiceParam, formData, isAuthenticated]);

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
    // Toujours réinitialiser les documents pour éviter les conflits
    console.log('✅ [SERVICE-PARAM] Application des services:', servicesToApply);
    console.log('   Nombre de services à appliquer:', servicesToApply.length);
    setFormData((prev) => {
      const newData = {
        ...prev,
        selectedServices: servicesToApply, // Remplacer complètement (pas d'ajout)
        serviceDocuments: {} // Toujours réinitialiser les documents pour éviter les conflits
      };
      console.log('   Données avant mise à jour:', {
        selectedServices: prev.selectedServices,
        serviceDocumentsKeys: Object.keys(prev.serviceDocuments || {})
      });
      console.log('   Données après mise à jour:', {
        selectedServices: newData.selectedServices,
        serviceDocumentsKeys: Object.keys(newData.serviceDocuments)
      });
      return newData;
    });

    // Marquer l'étape 1 comme complétée (stockée avec index 0-based: stepId - 1)
    const stepIndex = 0; // Étape 1 -> index 0
    setCompletedSteps((prev) => {
      if (prev.includes(stepIndex)) {
        return prev;
      }
      console.log('✅ [SERVICE-PARAM] Marquage de l\'étape 1 comme complétée (index:', stepIndex, ')');
      return [...prev, stepIndex];
    });
    
    // Mettre à jour la référence du dernier service appliqué
    lastAppliedServiceParamRef.current = serviceParam;
    setAllowServiceParamBypass(true);
    setHasAppliedServiceParam(true);

    // Naviguer immédiatement vers l'étape d'upload
    console.log('🚀 [SERVICE-PARAM] Navigation immédiate vers /form/documents');
    console.log('   Chemin actuel:', location.pathname);
    console.log('   Services sélectionnés:', matchedServiceIds);
    
    // Utiliser requestAnimationFrame pour s'assurer que les états sont mis à jour
    requestAnimationFrame(() => {
      navigate({ pathname: '/form/documents', search: location.search }, { replace: true });
    });
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

  // Backup: Forcer la navigation vers l'upload si le service est appliqué mais qu'on n'est pas encore sur documents
  useEffect(() => {
    if (!serviceParam) return;
    if (servicesLoading) return;
    if (!hasAppliedServiceParam) return;
    if (!formData.selectedServices || formData.selectedServices.length === 0) return;
    if (location.pathname === '/form/documents') return;
    
    // Vérifier qu'on n'est pas en train de naviguer depuis le premier useEffect
    const isOnChooseServices = location.pathname === '/form/choose-services' || location.pathname === '/form';
    
    if (isOnChooseServices) {
      console.log('🚀 [SERVICE-PARAM-BACKUP] Navigation de backup vers /form/documents');
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

  const updateFormData = (data) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const markStepCompleted = (stepId) => {
    // Stocker avec index 0-based pour être cohérent avec les vérifications
    const stepIndex = stepId - 1;
    if (!completedSteps.includes(stepIndex)) {
      setCompletedSteps([...completedSteps, stepIndex]);
      // Track step completion (GTM)
      const step = steps.find(s => s.id === stepId);
      if (step) {
        trackFormStep(stepId, getStepNameForGTM(step.name));
      }
      
      // Track Plausible funnel events
      switch (stepId) {
        case 1: // Services Selected
          trackServicesSelected(
            formData.selectedServices?.length || 0,
            formData.selectedServices || []
          );
          break;
        case 2: // Documents Uploaded
          const totalDocs = Object.values(formData.serviceDocuments || {}).reduce(
            (sum, docs) => sum + (docs?.length || 0), 0
          );
          const servicesWithDocs = Object.keys(formData.serviceDocuments || {}).length;
          trackDocumentsUploaded(totalDocs, servicesWithDocs);
          break;
        case 3: // Personal Info Completed
          trackPersonalInfoCompleted(isAuthenticated);
          break;
        case 4: // Signatories Added
          // Track signatories added if available
          if (formData.signatories && formData.signatories.length > 0) {
            // trackSignatoriesAdded(formData.signatories.length);
          }
          break;
      }
    }
  };

  const handleContinueClick = async () => {
    if (canProceedFromCurrentStep()) {
      // Update user information at Personal Info step if authenticated
      if (currentStep === 4 && isAuthenticated) {
        setIsCreatingUser(true);
        try {
          console.log('👤 [NOTARY-FORM] Updating authenticated user information');
          
          // Get current user
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError || !user) {
            console.error('❌ [NOTARY-FORM] Error getting user:', userError);
            setIsCreatingUser(false);
            return;
          }
          
          // Update email if it has changed
          if (formData.email && formData.email !== user.email) {
            console.log('📧 [NOTARY-FORM] Updating email from', user.email, 'to', formData.email);
            
            const { error: updateEmailError } = await supabase.auth.updateUser({
              email: formData.email
            });
            
            if (updateEmailError) {
              console.error('❌ [NOTARY-FORM] Error updating email:', updateEmailError);
              setNotification({
                type: 'error',
                message: updateEmailError.message || 'Error updating email. Please try again.'
              });
              setIsCreatingUser(false);
              return;
            } else {
              console.log('✅ [NOTARY-FORM] Email updated successfully');
            }
          }
          
          // Update client record
          try {
            const { data: existingClient, error: fetchError } = await supabase
              .from('client')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle();
            
            if (existingClient) {
              // Update existing client record
              const { data: updatedClient, error: updateClientError } = await supabase
                .from('client')
                .update({
                  first_name: formData.firstName,
                  last_name: formData.lastName,
                  email: formData.email,
                  phone: formData.phone || '',
                  address: formData.address || '',
                  city: formData.city || '',
                  postal_code: formData.postalCode || '',
                  country: formData.country || '',
                })
                .eq('user_id', user.id)
                .select('id')
                .single();
              
              if (updateClientError) {
                console.error('❌ [NOTARY-FORM] Error updating client record:', updateClientError);
              } else {
                console.log('✅ [NOTARY-FORM] Client record updated:', updatedClient.id);
              }
            } else {
              // Create client record if it doesn't exist
              const { data: newClient, error: createClientError } = await supabase
                .from('client')
                .insert({
                  user_id: user.id,
                  first_name: formData.firstName,
                  last_name: formData.lastName,
                  email: formData.email,
                  phone: formData.phone || '',
                  address: formData.address || '',
                  city: formData.city || '',
                  postal_code: formData.postalCode || '',
                  country: formData.country || '',
                })
                .select('id')
                .single();
              
              if (createClientError) {
                console.error('❌ [NOTARY-FORM] Error creating client record:', createClientError);
              } else {
                console.log('✅ [NOTARY-FORM] Client record created:', newClient.id);
              }
            }
          } catch (clientErr) {
            console.error('❌ [NOTARY-FORM] Error with client record:', clientErr);
          }
        } catch (error) {
          console.error('❌ [NOTARY-FORM] Unexpected error updating user:', error);
          setNotification({
            type: 'error',
            message: 'An error occurred while updating your information. Please try again.'
          });
          setIsCreatingUser(false);
          return;
        } finally {
          setIsCreatingUser(false);
        }
      }
      
      nextStep();
    } else {
      setNotification({
        type: 'error',
        message: 'Please complete all required fields before continuing.'
      });
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
        
        // Track summary viewed when reaching last step
        if (nextStepData.id === steps.length) {
          const totalDocs = Object.values(formData.serviceDocuments || {}).reduce(
            (sum, docs) => sum + (docs?.length || 0), 0
          );
          trackSummaryViewed({
            servicesCount: formData.selectedServices?.length || 0,
            documentsCount: totalDocs,
            signatoriesCount: formData.signatories?.length || 0
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
      
      // Calculate additional signatories cost (45€ per additional signatory, first one is free)
      const signatoriesCount = formData.signatories?.length || 0;
      const additionalSignatoriesCount = signatoriesCount > 1 ? signatoriesCount - 1 : 0;
      const additionalSignatoriesCost = additionalSignatoriesCount * 45;

      // Delivery postal cost (49.95€) if selected
      const deliveryPostalCostEUR = formData.deliveryMethod === 'postal' ? 49.95 : 0;
      
      const submissionData = {
        ...formData,
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
      trackPaymentInitiated({
        servicesCount: formData.selectedServices?.length || 0,
        totalAmount: 0, // Will be calculated by backend
        currency: formData.currency || 'EUR'
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
          currency: currency, // Envoyer la devise comme paramètre séparé et explicite
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
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Header - Fixed at top - Visible on all screen sizes */}
      <header className="fixed top-0 left-0 right-0 bg-[#F3F4F6] z-50 h-14 sm:h-16 overflow-visible">
        <div className="flex items-center justify-between h-full px-2 sm:px-3 md:px-4 xl:px-6">
          <Logo width={70} height={70} className="sm:w-[80px] sm:h-[80px]" />
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 xl:gap-3 overflow-visible">
            <LanguageSelector openDirection="bottom" />
            <CurrencySelector openDirection="bottom" />
            <button
              onClick={openCrisp}
              className="flex items-center justify-center px-1 sm:px-1.5 py-1 sm:py-1.5 bg-transparent text-black hover:underline underline-offset-4 decoration-2 hover:text-gray-900 transition-colors font-medium text-xs sm:text-sm flex-shrink-0"
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
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40 top-16"
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
                className="flex items-center justify-center w-full px-4 py-2 bg-transparent text-black hover:underline underline-offset-4 decoration-2 hover:text-gray-900 transition-colors font-medium"
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
      <main className="flex-1 flex items-center justify-center pt-14 sm:pt-16 pb-28 sm:pb-28 xl:pb-32 overflow-hidden bg-[#F3F4F6]">
        {/* Form Content */}
        <div className="w-full max-w-full h-full animate-fade-in-up flex flex-col overflow-hidden relative">
          <Routes>
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
      <div className="fixed bottom-0 left-0 right-0 bg-white z-50 safe-area-inset-bottom">
        {/* Progress Bar as top border */}
        <div className="relative">
          <div className="h-1 bg-gray-300">
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
        <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-t border-gray-200">
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
            <button
              type="button"
              onClick={handleContinueClick}
              disabled={isCreatingUser}
              className={`px-8 sm:px-12 md:px-16 py-2 sm:py-2.5 font-medium rounded-lg transition-all text-xs sm:text-sm flex-shrink-0 border backdrop-blur-md shadow-lg ${
                canProceedFromCurrentStep() && !isCreatingUser
                  ? 'bg-black/80 text-white border-white/15 hover:bg-black hover:border-white/20 active:bg-black/90'
                  : 'bg-black/50 text-white/60 border-white/10 opacity-60 cursor-not-allowed'
              }`}
            >
              {isCreatingUser ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </>
              ) : (
                t('form.navigation.continue')
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`px-8 sm:px-12 md:px-16 py-2 sm:py-2.5 font-medium rounded-lg transition-all text-xs sm:text-sm flex-shrink-0 border backdrop-blur-md shadow-lg ${
                isSubmitting
                  ? 'bg-black/50 text-white/60 border-white/10 opacity-60 cursor-not-allowed'
                  : 'bg-black/80 text-white border-white/15 hover:bg-black hover:border-white/20 active:bg-black/90'
              } flex items-center justify-center`}
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
    </div>
  );
};

export default NotaryForm;
