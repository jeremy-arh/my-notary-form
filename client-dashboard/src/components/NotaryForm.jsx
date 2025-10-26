import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { submitNotaryRequest, supabase } from '../lib/supabase';
import { useLocalStorage } from '../hooks/useLocalStorage';
import Logo from '@shared/assets/Logo';
import Documents from './steps/Documents';
import ChooseOption from './steps/ChooseOption';
import BookAppointment from './steps/BookAppointment';
import PersonalInfo from './steps/PersonalInfo';
import Summary from './steps/Summary';

const NotaryForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load form data from localStorage
  const [formData, setFormData] = useLocalStorage('notaryFormData', {
    // Documents
    documents: [],

    // Options
    selectedOptions: [],

    // Appointment
    appointmentDate: '',
    appointmentTime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

    // Personal Info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
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
    { id: 1, name: 'Documents', icon: 'heroicons:document-text', path: '/form/documents' },
    { id: 2, name: 'Choose option', icon: 'heroicons:check-badge', path: '/form/choose-option' },
    { id: 3, name: 'Book an appointment', icon: 'heroicons:calendar-days', path: '/form/book-appointment' },
    { id: 4, name: 'Your personal informations', icon: 'heroicons:user', path: '/form/personal-info' },
    { id: 5, name: 'Summary', icon: 'heroicons:clipboard-document-check', path: '/form/summary' }
  ];

  // Get current step from URL
  const getCurrentStepFromPath = () => {
    const step = steps.find(s => s.path === location.pathname);
    return step ? step.id : 1;
  };

  const currentStep = getCurrentStepFromPath();

  // Validate step access
  useEffect(() => {
    // Redirect to /form/documents if at /form root
    if (location.pathname === '/form' || location.pathname === '/form/') {
      navigate('/form/documents', { replace: true });
      return;
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
            // Pre-fill form with user data - Always use client data if available
            const updatedData = {
              firstName: client.first_name || '',
              lastName: client.last_name || '',
              email: client.email || '',
              phone: client.phone || '',
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

  const markStepCompleted = (stepId) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
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

  const handleSubmit = async () => {
    try {
      console.log('Submitting form data:', formData);

      const result = await submitNotaryRequest(formData);

      if (result.success) {
        // Clear localStorage
        localStorage.removeItem('notaryFormData');
        localStorage.removeItem('notaryCompletedSteps');

        // Reset form after successful submission
        setFormData({
          documents: [],
          selectedOptions: [],
          appointmentDate: '',
          appointmentTime: '',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
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

          // Redirect to login page
          navigate('/login');
        } else {
          // User was already authenticated - redirect to dashboard
          alert(`✅ Request submitted successfully!\n\nSubmission ID: ${result.submissionId}\n\nRedirecting to your dashboard...`);

          // Redirect to client dashboard
          navigate('/dashboard');
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
      <aside className="hidden lg:block w-80 bg-[#F3F4F6] border-r border-gray-200 fixed left-0 top-0 h-screen flex flex-col">
        <div className="flex-1 overflow-y-auto p-8 pb-32">
          {/* Logo with connexion button */}
          <div className="mb-4 animate-fade-in flex items-center justify-between">
            <Logo width={50} height={50} />
            {isAuthenticated && (
              <Link
                to="/dashboard"
                className="text-sm font-medium text-gray-700 hover:text-black transition-colors"
              >
                connexion
              </Link>
            )}
          </div>

          {/* Steps Navigation - Reduced size */}
          <div className="space-y-1.5">
            {steps.map((step, index) => {
              const isCompleted = completedSteps.includes(step.id);
              const isCurrent = currentStep === step.id;
              const canAccess = step.id === 1 || completedSteps.includes(step.id - 1);

              return (
                <div
                  key={step.id}
                  onClick={() => canAccess && goToStep(step.id)}
                  className={`flex items-center p-2 rounded-lg transition-all duration-300 ${
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
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${
                    isCurrent
                      ? 'bg-white/20'
                      : isCompleted
                      ? 'bg-gray-200'
                      : 'bg-gray-100'
                  }`}>
                    {isCompleted ? (
                      <Icon icon="heroicons:check" className="w-4 h-4 text-gray-600 animate-bounce-in" />
                    ) : (
                      <Icon icon={step.icon} className={`w-4 h-4 transition-transform duration-300 ${
                        isCurrent ? 'text-white scale-110' : 'text-gray-400'
                      }`} />
                    )}
                  </div>
                  <div className="ml-2.5 flex-1">
                    <div className={`text-[10px] font-semibold uppercase tracking-wide ${
                      isCurrent ? 'text-white/80' : 'text-gray-500'
                    }`}>
                      Step {step.id}
                    </div>
                    <div className={`text-xs font-medium mt-0.5 ${
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

        {/* Progress Bar - Fixed at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-[#F3F4F6] border-t border-gray-200">
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
      </aside>

      {/* Main Content - Full width with left margin for sidebar */}
      <main className="flex-1 lg:ml-80 min-h-screen flex items-center justify-center lg:p-5">
        {/* Form Content - 95vh centered with full width and side margins */}
        <div className="w-full h-screen lg:h-[95vh] bg-[#F3F4F6] lg:rounded-3xl shadow-sm animate-fade-in-up flex flex-col overflow-hidden relative">
          <Routes>
            <Route
              path="documents"
              element={
                <Documents
                  formData={formData}
                  updateFormData={updateFormData}
                  nextStep={nextStep}
                />
              }
            />
            <Route
              path="choose-option"
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
