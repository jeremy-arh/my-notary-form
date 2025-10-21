import { useState } from 'react';

const Summary = ({ formData, prevStep, handleSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const notaryServices = {
    'achat-vente': 'Achat/Vente immobilière',
    'testament': 'Testament',
    'procuration': 'Procuration',
    'mariage': 'Contrat de mariage',
    'succession': 'Succession',
    'authentification': 'Authentification de documents'
  };

  const additionalOptions = {
    'urgence': 'Service urgent (48h)',
    'domicile': 'Déplacement à domicile',
    'traduction': 'Service de traduction',
    'conseil': 'Consultation juridique préalable'
  };

  const locations = {
    'bureau-centre': 'Bureau - Centre-ville (123 Rue Principale)',
    'bureau-nord': 'Bureau - Quartier Nord (456 Avenue du Nord)',
    'visio': 'Visioconférence (En ligne)',
    'domicile': 'À domicile (Votre adresse)'
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-CA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const onSubmit = async () => {
    setIsSubmitting(true);
    try {
      await handleSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Récapitulatif de votre demande
        </h2>
        <p className="text-gray-600">
          Vérifiez vos informations avant de soumettre votre demande
        </p>
      </div>

      {/* Services Section */}
      <div className="bg-gray-50 rounded-lg p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
          <span className="text-indigo-600 mr-2">📋</span>
          Services demandés
        </h3>
        <div className="space-y-2">
          {formData.services?.map((serviceId) => (
            <div key={serviceId} className="flex items-center text-gray-700">
              <span className="text-green-600 mr-2">✓</span>
              {notaryServices[serviceId]}
            </div>
          ))}
          {formData.additionalOptions?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Options supplémentaires:</p>
              {formData.additionalOptions.map((optionId) => (
                <div key={optionId} className="flex items-center text-gray-600 text-sm">
                  <span className="text-indigo-600 mr-2">+</span>
                  {additionalOptions[optionId]}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Appointment Section */}
      <div className="bg-gray-50 rounded-lg p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
          <span className="text-indigo-600 mr-2">📅</span>
          Rendez-vous
        </h3>
        <div className="space-y-2 text-gray-700">
          <div className="flex justify-between">
            <span className="font-medium">Date:</span>
            <span>{formatDate(formData.appointmentDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Heure:</span>
            <span>{formData.appointmentTime}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Lieu:</span>
            <span className="text-right">{locations[formData.location]}</span>
          </div>
        </div>
      </div>

      {/* Personal Information Section */}
      <div className="bg-gray-50 rounded-lg p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
          <span className="text-indigo-600 mr-2">👤</span>
          Informations personnelles
        </h3>
        <div className="space-y-2 text-gray-700">
          <div className="flex justify-between">
            <span className="font-medium">Nom complet:</span>
            <span>{formData.firstName} {formData.lastName}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Email:</span>
            <span>{formData.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Téléphone:</span>
            <span>{formData.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Adresse:</span>
            <span className="text-right">
              {formData.address}<br />
              {formData.city}, {formData.postalCode}
            </span>
          </div>
          {formData.notes && (
            <div className="pt-3 border-t border-gray-200">
              <p className="font-medium mb-1">Notes:</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{formData.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Important Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Information importante
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Vous recevrez un email de confirmation à l'adresse {formData.email} avec tous les détails
                de votre rendez-vous. Notre équipe vous contactera sous 24 heures pour confirmer la disponibilité.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <button
          type="button"
          onClick={prevStep}
          disabled={isSubmitting}
          className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Précédent
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Envoi en cours...
            </>
          ) : (
            <>
              Soumettre la demande
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Summary;
