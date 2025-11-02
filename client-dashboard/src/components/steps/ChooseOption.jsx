import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';

const ChooseOption = ({ formData, updateFormData, nextStep, prevStep }) => {
  const [notaryOptions, setNotaryOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Map database fields to component structure
      const mappedOptions = data.map(service => ({
        id: service.service_id,
        name: service.name,
        description: service.short_description || service.description,
        icon: service.icon || 'heroicons:document-text',
        color: service.color || 'bg-gray-100',
        iconColor: 'text-gray-600',
        basePrice: service.base_price
      }));

      setNotaryOptions(mappedOptions);
    } catch (error) {
      console.error('Error fetching services:', error);
      // Fallback to empty array on error
      setNotaryOptions([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleOption = (optionId) => {
    const currentOptions = formData.selectedOptions || [];
    const updatedOptions = currentOptions.includes(optionId)
      ? currentOptions.filter(id => id !== optionId)
      : [...currentOptions, optionId];

    updateFormData({ selectedOptions: updatedOptions });
  };

  return (
    <>
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-6 md:pt-10 pb-44 lg:pb-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Choose Your Service
            </h2>
            <p className="text-gray-600">
              Select one or more notary services you need
            </p>
          </div>

      {/* Options Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      ) : notaryOptions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No services available at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {notaryOptions.map((option) => {
          const isSelected = formData.selectedOptions?.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggleOption(option.id)}
              className={`text-left p-6 rounded-2xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${
                isSelected
                  ? 'border-black bg-white shadow-lg'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-xl ${option.color}`}>
                  <Icon
                    icon={option.icon}
                    className={`w-6 h-6 ${option.iconColor}`}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900">
                      {option.name}
                    </h3>
                    {isSelected && (
                      <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                        <Icon
                          icon="heroicons:check"
                          className="w-4 h-4 text-white"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      )}

      {/* Additional Services */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Icon icon="heroicons:sparkles" className="w-5 h-5 mr-2 text-gray-600" />
          Additional Services
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { id: 'urgent', label: 'Urgent Service (48h)', icon: 'heroicons:bolt' },
            { id: 'home-visit', label: 'Home Visit', icon: 'heroicons:home' },
            { id: 'translation', label: 'Translation Service', icon: 'heroicons:language' },
            { id: 'consultation', label: 'Legal Consultation', icon: 'heroicons:chat-bubble-left-right' }
          ].map((service) => {
            const isSelected = formData.selectedOptions?.includes(service.id);
            return (
              <label
                key={service.id}
                className="flex items-center p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleOption(service.id)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-black border-black'
                    : 'border-gray-300'
                }`}>
                  {isSelected && (
                    <Icon icon="heroicons:check" className="w-3 h-3 text-white" />
                  )}
                </div>
                <Icon icon={service.icon} className="w-5 h-5 text-gray-400 mr-2" />
                <span className="text-sm text-gray-700">{service.label}</span>
              </label>
            );
          })}
        </div>
      </div>
        </div>
      </div>

      {/* Fixed Navigation */}
      <div className="hidden lg:block flex-shrink-0 px-4 py-4 bg-[#F3F4F6] lg:relative bottom-20 lg:bottom-auto left-0 right-0 z-50 lg:z-auto lg:border-t lg:border-gray-300">
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
            onClick={nextStep}
            disabled={!formData.selectedOptions || formData.selectedOptions.length === 0}
            className="btn-glassy px-6 md:px-8 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            Continue
          </button>
        </div>
      </div>
    </>
  );
};

export default ChooseOption;
