import { useState } from 'react';
import { Icon } from '@iconify/react';
import { submitNotaryRequest } from '../lib/supabase';
import Documents from './steps/Documents';
import ChooseOption from './steps/ChooseOption';
import BookAppointment from './steps/BookAppointment';
import PersonalInfo from './steps/PersonalInfo';
import Summary from './steps/Summary';

const NotaryForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
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

  const steps = [
    { id: 1, name: 'Documents', icon: 'heroicons:document-text' },
    { id: 2, name: 'Choose option', icon: 'heroicons:check-badge' },
    { id: 3, name: 'Book an appointment', icon: 'heroicons:calendar-days' },
    { id: 4, name: 'Your personal informations', icon: 'heroicons:user' },
    { id: 5, name: 'Summary', icon: 'heroicons:clipboard-document-check' }
  ];

  const updateFormData = (data) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const goToStep = (step) => {
    setCurrentStep(step);
  };

  const handleSubmit = async () => {
    try {
      console.log('Submitting form data:', formData);

      const result = await submitNotaryRequest(formData);

      if (result.success) {
        alert(`Notary service request submitted successfully!\n\nSubmission ID: ${result.submissionId}\n\nYou will receive a confirmation email shortly.`);

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

        // Go back to step 1
        setCurrentStep(1);
      } else {
        alert(`Error submitting request: ${result.error}\n\nPlease try again or contact support.`);
      }
    } catch (error) {
      console.error('Error during submission:', error);
      alert('An unexpected error occurred. Please try again.');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Documents
            formData={formData}
            updateFormData={updateFormData}
            nextStep={nextStep}
          />
        );
      case 2:
        return (
          <ChooseOption
            formData={formData}
            updateFormData={updateFormData}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        );
      case 3:
        return (
          <BookAppointment
            formData={formData}
            updateFormData={updateFormData}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        );
      case 4:
        return (
          <PersonalInfo
            formData={formData}
            updateFormData={updateFormData}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        );
      case 5:
        return (
          <Summary
            formData={formData}
            prevStep={prevStep}
            handleSubmit={handleSubmit}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Sidebar - Fixed and 100vh */}
      <aside className="hidden lg:block w-80 bg-[#F3F4F6] border-r border-gray-200 fixed left-0 top-0 h-screen overflow-y-auto">
        <div className="p-8">
          {/* Logo/Title */}
          <div className="mb-8 animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-900">Notary</h2>
            <p className="text-sm text-gray-600 mt-1">Service Request</p>
          </div>

          {/* Steps Navigation */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={step.id}
                onClick={() => goToStep(step.id)}
                className={`flex items-center p-4 rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                  currentStep === step.id
                    ? 'bg-black text-white shadow-lg animate-slide-in'
                    : currentStep > step.id
                    ? 'bg-white text-gray-900 hover:bg-gray-50 hover:shadow-md'
                    : 'bg-white text-gray-400 hover:bg-gray-50'
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-300 ${
                  currentStep === step.id
                    ? 'bg-white/20'
                    : currentStep > step.id
                    ? 'bg-green-100'
                    : 'bg-gray-100'
                }`}>
                  {currentStep > step.id ? (
                    <Icon icon="heroicons:check" className="w-6 h-6 text-green-600 animate-bounce-in" />
                  ) : (
                    <Icon icon={step.icon} className={`w-6 h-6 transition-transform duration-300 ${
                      currentStep === step.id ? 'text-white scale-110' : 'text-gray-400'
                    }`} />
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <div className={`text-xs font-semibold uppercase tracking-wide ${
                    currentStep === step.id ? 'text-white/80' : 'text-gray-500'
                  }`}>
                    Step {step.id}
                  </div>
                  <div className={`text-sm font-medium mt-0.5 ${
                    currentStep === step.id ? 'text-white' : 'text-gray-900'
                  }`}>
                    {step.name}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="mt-8 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span className="font-medium">Progress</span>
              <span className="font-bold">{Math.round((currentStep / steps.length) * 100)}%</span>
            </div>
            <div className="h-3 bg-gray-300 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-black to-gray-700 transition-all duration-700 ease-out"
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content - Full width with left margin for sidebar */}
      <main className="flex-1 lg:ml-80 min-h-screen">
        <div className="w-full p-6 md:p-12">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              Notary Service Request
            </h1>
            <p className="text-lg text-gray-600">
              Complete the form to book your appointment
            </p>
          </div>

          {/* Form Content */}
          <div className="bg-[#F3F4F6] rounded-3xl p-6 md:p-10 shadow-sm animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            {renderStep()}
          </div>
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
            className="h-full bg-black transition-all duration-500"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default NotaryForm;
