import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { submitNotaryRequest, supabase } from '../lib/supabase';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Logo } from '../../shared/assets';
import { trackPageView as trackPageViewPlausible, trackFormStep as trackFormStepPlausible, trackFormSubmissionStart as trackFormSubmissionStartPlausible } from '../utils/plausible';
import { trackPageView, trackFormStep, trackFormSubmissionStart, trackFormSubmission, trackFormStart } from '../utils/gtm';
import Documents from './steps/Documents';
import ChooseOption from './steps/ChooseOption';
import SignatoryCount from './steps/SignatoryCount';
import BookAppointment from './steps/BookAppointment';
import PersonalInfo from './steps/PersonalInfo';
import Summary from './steps/Summary';

const NotaryForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Load form data from localStorage
  const [formData, setFormData] = useLocalStorage('notaryFormData', {
    // Documents
    documents: [],

    // Options
    selectedOptions: [],

    // Signataires
    signatoryCount: null,

    // Appointment
    appointmentDate: '',
    appointmentTime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

    // Personal Info
    firstName: '',
    lastName: '',
    email: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',

    // Additional notes
    notes: ''
  });

  // Load completed steps from localStorage
  const [completedSteps, setCompletedSteps] = useLocalStorage('notaryCompletedSteps', []);

  const steps = [
    { id: 1, name: 'Documents', icon: 'heroicons:document-text', path: '/documents' },
    { id: 2, name: 'Choose option', icon: 'heroicons:check-badge', path: '/choose-option' },
    { id: 3, name: 'Signataires', icon: 'heroicons:user-group', path: '/signataires' },
    { id: 4, name: 'Book an appointment', icon: 'heroicons:calendar-days', path: '/book-appointment' },
    { id: 5, name: 'Your personal informations', icon: 'heroicons:user', path: '/personal-info' },
    { id: 6, name: 'Summary', icon: 'heroicons:clipboard-document-check', path: '/summary' }
  ];

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
      document.title = 'Demande de Service Notarié';
    }
  }, [location.pathname]);

  // Track page views and validate step access
  useEffect(() => {
    // Redirect to /documents if at root
    if (location.pathname === '/') {
      navigate('/documents', { replace: true });
      return;
    }

    // Track page view (Plausible + GTM)
    const currentStepData = steps.find(s => s.path === location.pathname);
    if (currentStepData) {
      trackPageViewPlausible(currentStepData.name, location.pathname);
      trackPageView(currentStepData.name, location.pathname);
      
      // Track form_start when user arrives on first step (Documents)
      if (currentStepData.id === 1 && completedSteps.length === 0) {
        trackFormStart({
          formName: 'notarization_form',
          serviceType: 'Document Notarization',
          ctaLocation: 'homepage_hero',
          ctaText: 'Commencer ma notarisation'
        });
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
            // Pre-fill form with user data - Always use client data if available
            const updatedData = {
              firstName: client.first_name || '',
              lastName: client.last_name || '',
              email: client.email || '',
              address: client.address || '',
              city: client.city || '',
              postalCode: client.postal_code || '',
              country: client.country || ''
            };
            console.log('✅ [PRE-FILL] Updating form with:', updatedData);

            setFormData(prev => ({
              ...prev,
              ...updatedData
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

  const updateFormData = (data) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  // Map step names to GTM format
  const getStepNameForGTM = (stepName) => {
    const stepNameMap = {
      'Documents': 'document_upload',
      'Choose option': 'service_selection',
      'Signataires': 'signatories_selection',
      'Book an appointment': 'appointment_booking',
      'Your personal informations': 'personal_info',
      'Summary': 'review_summary'
    };
    return stepNameMap[stepName] || stepName.toLowerCase().replace(/\s+/g, '_');
  };

  const markStepCompleted = (stepId) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
      // Track step completion (Plausible + GTM)
      const step = steps.find(s => s.id === stepId);
      if (step) {
        trackFormStepPlausible(stepId, step.name);
        trackFormStep(stepId, getStepNameForGTM(step.name));
      }
    }
  };

  const nextStep = () => {
    // Mark current step as completed
    markStepCompleted(currentStep);

    // Navigate to next step
    if (currentStep < steps.length) {
      const nextStepData = steps.find(s => s.id === currentStep + 1);
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
      const step = steps.find(s => s.id === stepId);
      if (step) {
        navigate(step.path);
      }
    }
  };

  const handleContinueClick = async () => {
    // Create client/user and link to submission at Personal Info step (step 5)
    // This MUST happen before nextStep() to ensure client/user exist
    if (currentStep === 5) {
      console.log('%c🚨🚨🚨 STEP 5 DETECTED - STARTING CLIENT CREATION 🚨🚨🚨', 'background: red; color: white; font-size: 24px; padding: 15px; font-weight: bold;');
      console.warn('🚨🚨🚨 STEP 5 - CLIENT CREATION STARTING 🚨🚨🚨');
      console.error('🔴🔴🔴 STEP 5 - ERROR LOG TO MAKE IT VISIBLE 🔴🔴🔴');
      
      setIsCreatingUser(true);
      try {
        console.log('%c👤👤👤 STEP 5: Creating/updating client/user 👤👤👤', 'background: orange; color: white; font-size: 20px; padding: 10px;');
        console.log('👤 [NOTARY-FORM] Email:', formData.email);
        console.log('👤 [NOTARY-FORM] First name:', formData.firstName);
        console.log('👤 [NOTARY-FORM] Last name:', formData.lastName);
        
        // Validate required fields
        if (!formData.email || !formData.firstName || !formData.lastName) {
          console.error('❌ [NOTARY-FORM] Missing required fields for client creation');
          alert('Email, prénom et nom sont requis pour créer le compte');
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
        const { data: { session } } = await supabase.auth.getSession();
        
        const requestBody = {
          email: formData.email.trim().toLowerCase(), // Normalize email
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone || null,
          address: formData.address || null,
          city: formData.city || null,
          postalCode: formData.postalCode || null,
          country: formData.country || null,
          selectedServices: formData.selectedOptions || [], // Use selectedOptions in this version
          documents: {}, // Edge Function expects an object, not an array - empty for this simplified version
          deliveryMethod: null, // Not used in this version
          signatories: [], // Not used in this version
          currentStep: currentStep,
          sessionId: sessionId,
          submissionId: submissionId
        };
        
        console.log('%c📤 CALLING EDGE FUNCTION', 'background: purple; color: white; font-size: 18px; padding: 8px;');
        console.log('📤 [NOTARY-FORM] Calling create-client-and-submission with:', requestBody);
        console.warn('⚠️ [NOTARY-FORM] About to call Edge Function');
        console.error('🔴 [NOTARY-FORM] Edge Function call starting');
        
        const response = await fetch(`${supabaseUrl}/functions/v1/create-client-and-submission`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`,
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
          alert(errorMessage + (result.errorCode ? ` (Code: ${result.errorCode})` : ''));
          setIsCreatingUser(false);
          return; // Don't proceed to next step if client/user creation failed
        } else {
          console.log('✅✅✅ [NOTARY-FORM] Client/user created/updated successfully ✅✅✅');
          console.log('✅ [NOTARY-FORM] Client ID:', result.client_id);
          console.log('✅ [NOTARY-FORM] User ID:', result.user_id);
          console.log('✅ [NOTARY-FORM] Submission ID:', result.submission_id);
          
          // Update formData with submission ID if it was created/updated
          if (result.submission_id && !formData.submissionId) {
            updateFormData({ submissionId: result.submission_id });
          }
        }
      } catch (error) {
        console.error('❌❌❌ [NOTARY-FORM] Unexpected error creating client/user ❌❌❌');
        console.error('❌ [NOTARY-FORM] Error:', error);
        alert('Erreur lors de la création du compte. Veuillez réessayer.');
        setIsCreatingUser(false);
        return; // Don't proceed to next step if error occurred
      } finally {
        setIsCreatingUser(false);
      }
    }
    
    // Proceed to next step
    nextStep();
  };

  const handleSubmit = async () => {
    try {
      console.log('Submitting form data:', formData);

      // Track form submission start (Plausible + GTM)
      trackFormSubmissionStartPlausible(formData);
      trackFormSubmissionStart(formData);

      const result = await submitNotaryRequest(formData);

      if (result.success) {
        // Track successful form submission (Plausible + GTM)
        trackFormSubmission({
          submissionId: result.submissionId,
          optionsCount: formData.selectedOptions?.length || 0,
          documentsCount: Array.isArray(formData.documents) ? formData.documents.length : 0
        });

        // Clear localStorage
        localStorage.removeItem('notaryFormData');
        localStorage.removeItem('notaryCompletedSteps');

        // Reset form after successful submission
        setFormData({
          documents: [],
          selectedOptions: [],
          signatoryCount: null,
          appointmentDate: '',
          appointmentTime: '',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          firstName: '',
          lastName: '',
          email: '',
          address: '',
          city: '',
          postalCode: '',
          country: '',
          notes: ''
        });

        // Reset completed steps
        setCompletedSteps([]);

        if (result.accountCreated && result.magicLinkSent) {
          // Show message and redirect to dashboard (magic link will authenticate them)
          alert(`✅ Request submitted successfully!\n\nSubmission ID: ${result.submissionId}\n\n📧 A magic link has been sent to ${formData.email}\n\nClick the link in your email to access your Client Dashboard.`);

          // Redirect to client dashboard login page
          window.location.href = window.location.origin.replace(':5173', ':5175');
        } else {
          // User was already authenticated or magic link failed
          // Try to sign in with OTP anyway
          if (supabase) {
            const { error: otpError } = await supabase.auth.signInWithOtp({
              email: formData.email,
              options: {
                emailRedirectTo: `${window.location.origin.replace(':5173', ':5175')}/dashboard`
              }
            });

            if (!otpError) {
              alert(`✅ Request submitted successfully!\n\nSubmission ID: ${result.submissionId}\n\n📧 A magic link has been sent to ${formData.email}\n\nClick the link to access your Client Dashboard.`);
            } else {
              alert(`✅ Request submitted successfully!\n\nSubmission ID: ${result.submissionId}\n\nYou can access your dashboard using the magic link we sent to your email.`);
            }
          }

          // Redirect to client dashboard
          window.location.href = window.location.origin.replace(':5173', ':5175');
        }
      } else {
        alert(`Error submitting request: ${result.error}\n\nPlease try again or contact support.`);
      }
    } catch (error) {
      console.error('Error during submission:', error);
      alert('An unexpected error occurred. Please try again.');
    }
  };


  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Sidebar - Fixed and 100vh */}
      <aside className="hidden lg:block w-80 bg-[#F3F4F6] border-r border-gray-200 fixed left-0 top-0 h-screen overflow-y-auto">
        <div className="p-8">
          {/* Logo */}
          <div className="mb-10 animate-fade-in flex items-center justify-center">
            <Logo width={150} height={150} />
          </div>

          {/* Steps Navigation */}
          <div className="space-y-3">
            {steps.map((step, index) => {
              const isCompleted = completedSteps.includes(step.id);
              const isCurrent = currentStep === step.id;
              const canAccess = step.id === 1 || completedSteps.includes(step.id - 1);

              return (
                <div
                  key={step.id}
                  onClick={() => canAccess && goToStep(step.id)}
                  className={`flex items-center p-4 rounded-xl transition-all duration-300 ${
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
                  <div className={`flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-300 ${
                    isCurrent
                      ? 'bg-white/20'
                      : isCompleted
                      ? 'bg-gray-200'
                      : 'bg-gray-100'
                  }`}>
                    {isCompleted ? (
                      <Icon icon="heroicons:check" className="w-6 h-6 text-gray-600 animate-bounce-in" />
                    ) : (
                      <Icon icon={step.icon} className={`w-6 h-6 transition-transform duration-300 ${
                        isCurrent ? 'text-white scale-110' : 'text-gray-400'
                      }`} />
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <div className={`text-xs font-semibold uppercase tracking-wide ${
                      isCurrent ? 'text-white/80' : 'text-gray-500'
                    }`}>
                      Step {step.id}
                    </div>
                    <div className={`text-sm font-medium mt-0.5 ${
                      isCurrent ? 'text-white' : 'text-gray-900'
                    }`}>
                      {step.name}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="mt-8 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span className="font-medium">Progress</span>
              <span className="font-bold">{Math.round((currentStep / steps.length) * 100)}%</span>
            </div>
            <div className="h-3 bg-gray-300 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-700 ease-out"
                style={{
                  width: `${(currentStep / steps.length) * 100}%`,
                  background: 'linear-gradient(90deg, #491ae9 0%, #b300c7 33%, #f20075 66%, #ff8400 100%)'
                }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content - Full width with left margin for sidebar */}
      <main className="flex-1 lg:ml-80 min-h-screen flex items-center justify-center lg:p-5">
        {/* Form Content - 95vh centered with full width and side margins */}
        <div className="w-full h-screen lg:h-[95vh] bg-[#F3F4F6] lg:rounded-3xl shadow-sm animate-fade-in-up flex flex-col overflow-hidden relative">
          <Routes>
            <Route
              path="/documents"
              element={
                <Documents
                  formData={formData}
                  updateFormData={updateFormData}
                  nextStep={nextStep}
                />
              }
            />
            <Route
              path="/choose-option"
              element={
                <ChooseOption
                  formData={formData}
                  updateFormData={updateFormData}
                  nextStep={nextStep}
                  prevStep={prevStep}
                />
              }
            />
            <Route
              path="/signataires"
              element={
                <SignatoryCount
                  formData={formData}
                  updateFormData={updateFormData}
                  nextStep={nextStep}
                  prevStep={prevStep}
                />
              }
            />
            <Route
              path="/book-appointment"
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
              path="/personal-info"
              element={
                <PersonalInfo
                  formData={formData}
                  updateFormData={updateFormData}
                  nextStep={nextStep}
                  prevStep={prevStep}
                  handleContinueClick={handleContinueClick}
                  isCreatingUser={isCreatingUser}
                />
              }
            />
            <Route
              path="/summary"
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

      {/* Mobile Progress Indicator */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span className="font-medium">Step {currentStep} of {steps.length}</span>
          <span className="font-bold">{Math.round((currentStep / steps.length) * 100)}%</span>
        </div>
        <div className="h-2 bg-gray-300 rounded-full overflow-hidden">
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
  );
};

export default NotaryForm;
