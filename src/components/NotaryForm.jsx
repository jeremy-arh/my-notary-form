import { useState } from 'react';
import ServiceSelection from './steps/ServiceSelection';
import AppointmentBooking from './steps/AppointmentBooking';
import PersonalInfo from './steps/PersonalInfo';
import Summary from './steps/Summary';

const NotaryForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Service Selection
    services: [],
    additionalOptions: [],

    // Appointment
    appointmentDate: '',
    appointmentTime: '',
    location: '',

    // Personal Info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',

    // Additional notes
    notes: ''
  });

  const totalSteps = 4;

  const updateFormData = (data) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    console.log('Form submitted:', formData);
    // Here you would typically send the data to your backend
    alert('Demande de service notarié envoyée avec succès!');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <ServiceSelection
            formData={formData}
            updateFormData={updateFormData}
            nextStep={nextStep}
          />
        );
      case 2:
        return (
          <AppointmentBooking
            formData={formData}
            updateFormData={updateFormData}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        );
      case 3:
        return (
          <PersonalInfo
            formData={formData}
            updateFormData={updateFormData}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        );
      case 4:
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Demande de Service Notarié
          </h1>
          <p className="text-gray-600">
            Complétez le formulaire pour réserver votre rendez-vous
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                    step === currentStep
                      ? 'bg-indigo-600 text-white'
                      : step < currentStep
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {step < currentStep ? '✓' : step}
                </div>
                <div className="text-xs mt-2 text-center font-medium text-gray-700 hidden sm:block">
                  {step === 1 && 'Services'}
                  {step === 2 && 'Rendez-vous'}
                  {step === 3 && 'Informations'}
                  {step === 4 && 'Confirmation'}
                </div>
              </div>
            ))}
          </div>
          <div className="relative">
            <div className="h-2 bg-gray-300 rounded-full">
              <div
                className="h-2 bg-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow-xl p-6 md:p-8">
          {renderStep()}
        </div>

        {/* Step Indicator (Mobile) */}
        <div className="text-center mt-4 text-sm text-gray-600 sm:hidden">
          Étape {currentStep} sur {totalSteps}
        </div>
      </div>
    </div>
  );
};

export default NotaryForm;
