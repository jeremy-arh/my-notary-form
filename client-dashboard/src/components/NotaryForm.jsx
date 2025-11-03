import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { submitNotaryRequest, supabase } from '../lib/supabase';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Logo } from '../../../shared/assets';
import Documents from './steps/Documents';
import ChooseOption from './steps/ChooseOption';
import BookAppointment from './steps/BookAppointment';
import PersonalInfo from './steps/PersonalInfo';
import Summary from './steps/Summary';
import Notification from './Notification';

const NotaryForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load form data from localStorage
  const [formData, setFormData] = useLocalStorage('notaryFormData', {
    // Services (step 1)
    selectedServices: [], // Array of service IDs

    // Documents (step 2) - organized by service
    serviceDocuments: {}, // { serviceId: [files] }

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

    // Additional notes
    notes: ''
  });

  // Load completed steps from localStorage
  const [completedSteps, setCompletedSteps] = useLocalStorage('notaryCompletedSteps', []);

  const steps = [
    { id: 1, name: 'Choose Services', icon: 'heroicons:check-badge', path: '/form/choose-services' },
    { id: 2, name: 'Upload Documents', icon: 'heroicons:document-text', path: '/form/documents' },
    { id: 3, name: 'Book an appointment', icon: 'heroicons:calendar-days', path: '/form/book-appointment' },
    { id: 4, name: 'Your personal informations', icon: 'heroicons:user', path: '/form/personal-info' },
    { id: 5, name: 'Summary', icon: 'heroicons:clipboard-document-check', path: '/form/summary' }
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

      case 3: // Book an appointment
        return formData.appointmentDate && formData.appointmentTime;

      case 4: // Personal informations
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

      case 5: // Summary
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

  // Validate step access
  useEffect(() => {
    // Redirect to /form/choose-services if at /form root
    if (location.pathname === '/form' || location.pathname === '/form/') {
      navigate('/form/choose-services', { replace: true });
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
      console.log('Creating payment session for form data:', formData);

      // Upload documents to Supabase Storage first
      const uploadedFiles = [];
      if (formData.documents && formData.documents.length > 0) {
        console.log('📤 Uploading documents to storage...');

        for (const doc of formData.documents) {
          if (!doc.file) {
            console.warn('⚠️ Document missing file object:', doc);
            continue;
          }

          // Generate unique file name
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(7);
          const fileName = `temp/${timestamp}_${randomId}_${doc.name}`;

          console.log('📤 Uploading:', fileName);

          // Upload file to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('submission-documents')
            .upload(fileName, doc.file);

          if (uploadError) {
            console.error('❌ Error uploading file:', uploadError);
            throw new Error(`Failed to upload ${doc.name}: ${uploadError.message}`);
          }

          console.log('✅ File uploaded:', fileName);

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('submission-documents')
            .getPublicUrl(fileName);

          uploadedFiles.push({
            name: doc.name,
            size: doc.size,
            type: doc.type,
            storage_path: fileName,
            public_url: urlData.publicUrl
          });
        }

        console.log('✅ All files uploaded:', uploadedFiles.length);
      }

      // Prepare form data without File objects
      const submissionData = {
        ...formData,
        uploadedFiles, // Add uploaded file paths
        documents: undefined // Remove original documents with File objects
      };

      // Call Supabase Edge Function to create Stripe checkout session
      // The Edge Function will fetch services from database and calculate the amount
      console.log('📤 Calling Edge Function with data:', {
        selectedOptions: submissionData.selectedOptions,
        email: submissionData.email,
        uploadedFiles: submissionData.uploadedFiles?.length
      });

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          formData: submissionData
        }
      });

      console.log('📥 Edge Function response:', { data, error });

      if (error) {
        console.error('Edge Function error details:', error);
        throw error;
      }

      if (data?.error) {
        console.error('Edge Function returned error:', data.error);
        throw new Error(data.error);
      }

      if (data?.url) {
        // Form data is already saved in localStorage by useLocalStorage hook
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received from payment service');
      }
    } catch (error) {
      console.error('Error creating payment session:', error);

      // Show detailed error message
      let errorMessage = 'Une erreur s\'est produite lors de la création de la session de paiement.';

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
    }
  };


  return (
    <div className="flex min-h-screen bg-white">
      {/* Mobile Header - Fixed at top */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 h-16">
        <div className="flex items-center justify-between h-full px-4">
          <Logo width={100} height={100} />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon icon={isMobileMenuOpen ? 'heroicons:x-mark' : 'heroicons:bars-3'} className="w-6 h-6 text-gray-900" />
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 top-16"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="bg-[#F3F4F6] w-80 h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Steps Navigation - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Form Steps</h3>
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
                    className={`flex items-center p-2 rounded-lg transition-all duration-300 ${
                      canAccess ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                    } ${
                      isCurrent
                        ? 'bg-black text-white'
                        : isCompleted
                        ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                        : 'bg-white text-gray-400'
                    }`}
                  >
                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${
                      isCurrent
                        ? 'bg-white/20'
                        : isCompleted
                        ? 'bg-gray-200'
                        : 'bg-gray-100'
                    }`}>
                      {isCompleted ? (
                        <Icon icon="heroicons:check" className="w-4 h-4 text-gray-600" />
                      ) : (
                        <Icon icon={step.icon} className={`w-4 h-4 ${
                          isCurrent ? 'text-white' : 'text-gray-400'
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

            {/* Navigation Link - Fixed at bottom */}
            <div className="p-6 border-t border-gray-200">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="flex items-center justify-center w-full text-gray-700 hover:text-gray-900 transition-colors font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon icon="heroicons:squares-2x2" className="w-5 h-5 mr-2" />
                  Dashboard
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center justify-center w-full text-gray-700 hover:text-gray-900 transition-colors font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon icon="heroicons:arrow-right-on-rectangle" className="w-5 h-5 mr-2" />
                  Connexion
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Left Sidebar - Fixed and 100vh */}
      <aside className="hidden lg:block w-80 bg-[#F3F4F6] border-r border-gray-200 fixed left-0 top-0 h-screen flex flex-col">
        <div className="flex-1 overflow-y-auto p-8 pb-32">
          {/* Logo */}
          <div className="mb-10 animate-fade-in flex items-center justify-center">
            <Logo width={150} height={150} />
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

        {/* Progress Bar & Navigation Button - Fixed at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-[#F3F4F6] border-t border-gray-200">
          {/* Dashboard or Login Button */}
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="flex items-center justify-center w-full mb-4 text-gray-700 hover:text-gray-900 transition-colors font-medium"
            >
              <Icon icon="heroicons:squares-2x2" className="w-5 h-5 mr-2" />
              Dashboard
            </Link>
          ) : (
            <Link
              to="/login"
              className="flex items-center justify-center w-full mb-4 text-gray-700 hover:text-gray-900 transition-colors font-medium"
            >
              <Icon icon="heroicons:arrow-right-on-rectangle" className="w-5 h-5 mr-2" />
              Connexion
            </Link>
          )}

          {/* Progress Bar */}
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
      <main className="flex-1 lg:ml-80 min-h-screen flex items-center justify-center lg:p-5 pt-16 lg:pt-5">
        {/* Form Content - 95vh centered with full width and side margins */}
        <div className="w-full h-[calc(100vh-4rem)] lg:h-[95vh] bg-[#F3F4F6] lg:rounded-3xl shadow-sm animate-fade-in-up flex flex-col overflow-hidden relative">
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

      {/* Mobile Footer - Navigation Buttons + Progress Bar in ONE fixed container */}
      {!isMobileMenuOpen && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#F3F4F6] z-50">
          {/* Navigation Buttons */}
          <div className="px-4 pt-4 pb-3 flex justify-between border-b border-gray-200">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="btn-glassy-secondary px-6 py-3 text-gray-700 font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
              >
                Back
              </button>
            ) : <div></div>}
            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={!canProceedFromCurrentStep()}
                className="btn-glassy px-6 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="btn-glassy px-6 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
              >
                Confirm & Pay
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="px-4 py-3">
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
