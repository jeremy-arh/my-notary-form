import { useState } from 'react';

const ServiceSelection = ({ formData, updateFormData, nextStep }) => {
  const [errors, setErrors] = useState({});

  const notaryServices = [
    {
      id: 'achat-vente',
      name: 'Achat/Vente immobilière',
      description: 'Transaction immobilière, contrat de vente',
      icon: '🏠'
    },
    {
      id: 'testament',
      name: 'Testament',
      description: 'Rédaction et authentification de testament',
      icon: '📜'
    },
    {
      id: 'procuration',
      name: 'Procuration',
      description: 'Procuration générale ou spécifique',
      icon: '✍️'
    },
    {
      id: 'mariage',
      name: 'Contrat de mariage',
      description: 'Contrat de mariage ou modification',
      icon: '💍'
    },
    {
      id: 'succession',
      name: 'Succession',
      description: 'Règlement de succession',
      icon: '👨‍👩‍👧‍👦'
    },
    {
      id: 'authentification',
      name: 'Authentification de documents',
      description: 'Certification et authentification',
      icon: '📋'
    }
  ];

  const additionalOptions = [
    { id: 'urgence', name: 'Service urgent (48h)' },
    { id: 'domicile', name: 'Déplacement à domicile' },
    { id: 'traduction', name: 'Service de traduction' },
    { id: 'conseil', name: 'Consultation juridique préalable' }
  ];

  const handleServiceToggle = (serviceId) => {
    const currentServices = formData.services || [];
    const updatedServices = currentServices.includes(serviceId)
      ? currentServices.filter(id => id !== serviceId)
      : [...currentServices, serviceId];

    updateFormData({ services: updatedServices });
  };

  const handleOptionToggle = (optionId) => {
    const currentOptions = formData.additionalOptions || [];
    const updatedOptions = currentOptions.includes(optionId)
      ? currentOptions.filter(id => id !== optionId)
      : [...currentOptions, optionId];

    updateFormData({ additionalOptions: updatedOptions });
  };

  const handleNext = () => {
    if (!formData.services || formData.services.length === 0) {
      setErrors({ services: 'Veuillez sélectionner au moins un service' });
      return;
    }
    setErrors({});
    nextStep();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Sélectionnez vos services
        </h2>
        <p className="text-gray-600">
          Choisissez le ou les services notariés dont vous avez besoin
        </p>
      </div>

      {/* Services Grid */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Services notariés <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notaryServices.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => handleServiceToggle(service.id)}
              className={`text-left p-4 rounded-lg border-2 transition-all ${
                formData.services?.includes(service.id)
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-start space-x-3">
                <span className="text-3xl">{service.icon}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{service.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                </div>
                {formData.services?.includes(service.id) && (
                  <span className="text-indigo-600 font-bold">✓</span>
                )}
              </div>
            </button>
          ))}
        </div>
        {errors.services && (
          <p className="mt-2 text-sm text-red-600">{errors.services}</p>
        )}
      </div>

      {/* Additional Options */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Options supplémentaires
        </label>
        <div className="space-y-2">
          {additionalOptions.map((option) => (
            <label
              key={option.id}
              className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={formData.additionalOptions?.includes(option.id)}
                onChange={() => handleOptionToggle(option.id)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-gray-700">{option.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-6 border-t">
        <button
          type="button"
          onClick={handleNext}
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Suivant
        </button>
      </div>
    </div>
  );
};

export default ServiceSelection;
