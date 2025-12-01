import { useState } from 'react';
import { Icon } from '@iconify/react';

const SignatoryCount = ({ formData, updateFormData, nextStep, prevStep }) => {
  const [errors, setErrors] = useState({});

  const signatoryOptions = [1, 2, 3, 4, 5, 6];

  const handleSelect = (count) => {
    updateFormData({ signatoryCount: count });
    if (errors.signatoryCount) {
      setErrors({});
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.signatoryCount) {
      newErrors.signatoryCount = 'Veuillez sélectionner le nombre de signataires';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      nextStep();
    }
  };

  return (
    <>
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-3 md:px-10 pt-6 md:pt-10 pb-28 lg:pb-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Nombre de signataires
            </h2>
            <p className="text-gray-600">
              Combien de personnes devront signer ce document ?
            </p>
          </div>

          {/* Signatory Count Selector */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {signatoryOptions.map((count) => {
              const isSelected = formData.signatoryCount === count;
              return (
                <button
                  key={count}
                  type="button"
                  onClick={() => handleSelect(count)}
                  className={`p-6 rounded-2xl border-2 transition-all hover:scale-105 active:scale-95 ${
                    isSelected
                      ? 'border-black bg-black text-white shadow-lg'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-3">
                    <div className={`p-4 rounded-full ${
                      isSelected ? 'bg-white/20' : 'bg-gray-100'
                    }`}>
                      <Icon
                        icon="heroicons:user-group"
                        className={`w-8 h-8 ${
                          isSelected ? 'text-white' : 'text-gray-600'
                        }`}
                      />
                    </div>
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${
                        isSelected ? 'text-white' : 'text-gray-900'
                      }`}>
                        {count}
                      </div>
                      <div className={`text-sm mt-1 ${
                        isSelected ? 'text-white/80' : 'text-gray-600'
                      }`}>
                        {count === 1 ? 'signataire' : 'signataires'}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                        <Icon icon="heroicons:check" className="w-4 h-4 text-black" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* More than 6 option */}
          <div 
            className={`p-6 rounded-2xl border-2 cursor-pointer transition-all hover:scale-[1.02] ${
              formData.signatoryCount > 6
                ? 'border-black bg-black text-white shadow-lg'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
            }`}
            onClick={() => {
              const count = prompt('Combien de signataires ? (Entrez un nombre)');
              if (count && !isNaN(count) && parseInt(count) > 6) {
                handleSelect(parseInt(count));
              }
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`p-4 rounded-full ${
                  formData.signatoryCount > 6 ? 'bg-white/20' : 'bg-gray-100'
                }`}>
                  <Icon
                    icon="heroicons:plus-circle"
                    className={`w-8 h-8 ${
                      formData.signatoryCount > 6 ? 'text-white' : 'text-gray-600'
                    }`}
                  />
                </div>
                <div>
                  <div className={`text-lg font-semibold ${
                    formData.signatoryCount > 6 ? 'text-white' : 'text-gray-900'
                  }`}>
                    {formData.signatoryCount > 6 
                      ? `${formData.signatoryCount} signataires` 
                      : 'Plus de 6 signataires'}
                  </div>
                  <div className={`text-sm ${
                    formData.signatoryCount > 6 ? 'text-white/80' : 'text-gray-600'
                  }`}>
                    Cliquez pour saisir un nombre personnalisé
                  </div>
                </div>
              </div>
              {formData.signatoryCount > 6 && (
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <Icon icon="heroicons:check" className="w-5 h-5 text-black" />
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {errors.signatoryCount && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-600 flex items-center">
                <Icon icon="heroicons:exclamation-circle" className="w-5 h-5 mr-2" />
                {errors.signatoryCount}
              </p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <Icon icon="heroicons:information-circle" className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Information</p>
                <p>Le nombre de signataires correspond au nombre total de personnes qui devront apposer leur signature sur le document notarié.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Navigation */}
      <div className="flex-shrink-0 px-3 md:px-10 py-4 border-t border-gray-300 bg-[#F3F4F6] fixed lg:relative bottom-20 lg:bottom-auto left-0 right-0 z-50 lg:z-auto">
        <div className="flex justify-between">
          <button
            type="button"
            onClick={prevStep}
            className="btn-glassy-secondary px-6 md:px-8 py-3 text-gray-700 font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="btn-glassy px-6 md:px-8 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
          >
            Continue
          </button>
        </div>
      </div>
    </>
  );
};

export default SignatoryCount;


