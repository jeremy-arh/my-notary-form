import { useState } from 'react';

const AppointmentBooking = ({ formData, updateFormData, nextStep, prevStep }) => {
  const [errors, setErrors] = useState({});

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30'
  ];

  const locations = [
    { id: 'bureau-centre', name: 'Bureau - Centre-ville', address: '123 Rue Principale' },
    { id: 'bureau-nord', name: 'Bureau - Quartier Nord', address: '456 Avenue du Nord' },
    { id: 'visio', name: 'Visioconférence', address: 'En ligne' },
    { id: 'domicile', name: 'À domicile', address: 'Votre adresse' }
  ];

  const handleChange = (field, value) => {
    updateFormData({ [field]: value });
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.appointmentDate) {
      newErrors.appointmentDate = 'Veuillez sélectionner une date';
    } else {
      const selectedDate = new Date(formData.appointmentDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.appointmentDate = 'La date ne peut pas être dans le passé';
      }
    }

    if (!formData.appointmentTime) {
      newErrors.appointmentTime = 'Veuillez sélectionner une heure';
    }

    if (!formData.location) {
      newErrors.location = 'Veuillez sélectionner un lieu';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      nextStep();
    }
  };

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Get maximum date (3 months from now)
  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);
    return maxDate.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Réservez votre rendez-vous
        </h2>
        <p className="text-gray-600">
          Choisissez la date, l'heure et le lieu de votre rendez-vous
        </p>
      </div>

      {/* Date Selection */}
      <div>
        <label htmlFor="appointmentDate" className="block text-sm font-medium text-gray-700 mb-2">
          Date du rendez-vous <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          id="appointmentDate"
          value={formData.appointmentDate || ''}
          onChange={(e) => handleChange('appointmentDate', e.target.value)}
          min={getMinDate()}
          max={getMaxDate()}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
            errors.appointmentDate ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.appointmentDate && (
          <p className="mt-1 text-sm text-red-600">{errors.appointmentDate}</p>
        )}
      </div>

      {/* Time Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Heure du rendez-vous <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {timeSlots.map((time) => (
            <button
              key={time}
              type="button"
              onClick={() => handleChange('appointmentTime', time)}
              className={`py-2 px-3 rounded-lg border-2 font-medium transition-all ${
                formData.appointmentTime === time
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-gray-300 hover:border-indigo-300 text-gray-700'
              }`}
            >
              {time}
            </button>
          ))}
        </div>
        {errors.appointmentTime && (
          <p className="mt-2 text-sm text-red-600">{errors.appointmentTime}</p>
        )}
      </div>

      {/* Location Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Lieu du rendez-vous <span className="text-red-500">*</span>
        </label>
        <div className="space-y-3">
          {locations.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => handleChange('location', loc.id)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                formData.location === loc.id
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{loc.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{loc.address}</p>
                </div>
                {formData.location === loc.id && (
                  <span className="text-indigo-600 font-bold text-xl">✓</span>
                )}
              </div>
            </button>
          ))}
        </div>
        {errors.location && (
          <p className="mt-2 text-sm text-red-600">{errors.location}</p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <button
          type="button"
          onClick={prevStep}
          className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Précédent
        </button>
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

export default AppointmentBooking;
