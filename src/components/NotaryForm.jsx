import { useState } from 'react';
import { Icon } from '@iconify/react';
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
    console.log('Form submitted:', formData);
    alert('Demande de service notarié envoyée avec succès!');
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
    <div className="min-h-screen bg-white">
      <div className="flex">
        {/* Main Content */}
        <div className="flex-1 p-8 lg:p-12">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Notary Service Request
              </h1>
              <p className="text-gray-600">
                Complete the form to book your appointment
              </p>
            </div>

            {/* Form Content */}
            <div className="bg-[#F3F4F6] rounded-2xl p-6 md:p-8">
              {renderStep()}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="hidden lg:block w-96 bg-[#F3F4F6] p-8 border-l border-gray-200">
          <div className="sticky top-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Progress</h2>

            {/* Steps Navigation */}
            <div className="space-y-4">
              {steps.map((step) => (
                <div
                  key={step.id}
                  onClick={() => goToStep(step.id)}
                  className={`flex items-center p-4 rounded-xl cursor-pointer transition-all ${
                    currentStep === step.id
                      ? 'bg-black text-white shadow-lg'
                      : currentStep > step.id
                      ? 'bg-white text-gray-900 hover:bg-gray-50'
                      : 'bg-white text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                    currentStep === step.id
                      ? 'bg-white/20'
                      : currentStep > step.id
                      ? 'bg-green-100'
                      : 'bg-gray-100'
                  }`}>
                    {currentStep > step.id ? (
                      <Icon icon="heroicons:check" className="w-6 h-6 text-green-600" />
                    ) : (
                      <Icon icon={step.icon} className={`w-6 h-6 ${
                        currentStep === step.id ? 'text-white' : 'text-gray-400'
                      }`} />
                    )}
                  </div>
                  <div className="ml-4">
                    <div className={`text-sm font-semibold ${
                      currentStep === step.id ? 'text-white' : 'text-gray-900'
                    }`}>
                      Step {step.id}
                    </div>
                    <div className={`text-sm ${
                      currentStep === step.id ? 'text-white/80' : 'text-gray-600'
                    }`}>
                      {step.name}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress Bar */}
            <div className="mt-8">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{Math.round((currentStep / steps.length) * 100)}%</span>
              </div>
              <div className="h-2 bg-gray-300 rounded-full overflow-hidden">
                <div
                  className="h-full bg-black transition-all duration-500 ease-out"
                  style={{ width: `${(currentStep / steps.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Progress Indicator */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Step {currentStep} of {steps.length}</span>
            <span>{Math.round((currentStep / steps.length) * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-300 rounded-full overflow-hidden">
            <div
              className="h-full bg-black transition-all duration-500"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotaryForm;
