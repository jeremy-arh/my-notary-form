import { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { submitNotaryRequest } from '../lib/supabase';
import { useLocalStorage } from '../hooks/useLocalStorage';
import Documents from './steps/Documents';
import ChooseOption from './steps/ChooseOption';
import BookAppointment from './steps/BookAppointment';
import PersonalInfo from './steps/PersonalInfo';
import Summary from './steps/Summary';

const NotaryForm = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
    { id: 1, name: 'Documents', icon: 'heroicons:document-text', path: '/documents' },
    { id: 2, name: 'Choose option', icon: 'heroicons:check-badge', path: '/choose-option' },
    { id: 3, name: 'Book an appointment', icon: 'heroicons:calendar-days', path: '/book-appointment' },
    { id: 4, name: 'Your personal informations', icon: 'heroicons:user', path: '/personal-info' },
    { id: 5, name: 'Summary', icon: 'heroicons:clipboard-document-check', path: '/summary' }
  ];

  // Get current step from URL
  const getCurrentStepFromPath = () => {
    const step = steps.find(s => s.path === location.pathname);
    return step ? step.id : 1;
  };

  const currentStep = getCurrentStepFromPath();

  // Validate step access
  useEffect(() => {
    // Redirect to /documents if at root
    if (location.pathname === '/') {
      navigate('/documents', { replace: true });
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
        alert(`Notary service request submitted successfully!\n\nSubmission ID: ${result.submissionId}\n\nYou will receive a confirmation email shortly.`);

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

        // Go back to step 1
        navigate('/documents');
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
            <div className="relative">
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="60" cy="60" r="58" stroke="url(#gradient)" strokeWidth="3"/>
                <path d="M60 25 L60 95 M40 45 L60 25 L80 45" stroke="url(#gradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="60" cy="85" r="8" fill="url(#gradient)"/>
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#000000" />
                    <stop offset="100%" stopColor="#4B5563" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
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
      <main className="flex-1 lg:ml-80 min-h-screen flex items-center justify-center p-5 pb-24 lg:pb-5">
        {/* Form Content - 95vh centered with full width and side margins */}
        <div className="w-full h-[calc(100vh-8rem)] lg:h-[95vh] bg-[#F3F4F6] rounded-3xl shadow-sm animate-fade-in-up flex flex-col overflow-hidden">
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
