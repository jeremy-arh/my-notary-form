import { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';
import { trackPersonalInfoCompleted as trackAnalyticsPersonalInfoCompleted } from '../../utils/analytics';
import AddressAutocomplete from '../AddressAutocomplete';
import PriceDetails from '../PriceDetails';
import { useTranslation } from '../../hooks/useTranslation';

const PersonalInfo = ({ formData, updateFormData, nextStep, prevStep, isAuthenticated = false, handleContinueClick, getValidationErrorMessage, isPriceDetailsOpen, setIsPriceDetailsOpen }) => {
  const { t } = useTranslation();
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  const geocodeTimeoutRef = useRef(null);

  const handleChange = (field, value) => {
    updateFormData({ [field]: value });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    // Reset email exists error when email changes
    if (field === 'email' && emailExists) {
      setEmailExists(false);
    }
  };

  const checkEmailExists = async (email) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return;
    }

    try {
      // Check if email exists in client table
      const { data, error } = await supabase
        .from('client')
        .select('id')
        .eq('email', email)
        .single();

      if (data && !error) {
        setEmailExists(true);
      } else {
        setEmailExists(false);
      }
    } catch (error) {
      console.error('Error checking email:', error);
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.firstName?.trim()) {
      newErrors.firstName = t('form.steps.personalInfo.validationFirstName');
    }

    if (!formData.lastName?.trim()) {
      newErrors.lastName = t('form.steps.personalInfo.validationLastName');
    }

    // Only validate email and password if user is not authenticated
    if (!isAuthenticated) {
      if (!formData.email?.trim()) {
        newErrors.email = t('form.steps.personalInfo.validationEmail');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = t('form.steps.personalInfo.validationEmailInvalid');
      }

      // Password validation
      if (!formData.password?.trim()) {
        newErrors.password = t('form.steps.personalInfo.validationPassword');
      } else if (formData.password.length < 6) {
        newErrors.password = t('form.steps.personalInfo.validationPasswordMin');
      }
    }

    // Validation de l'adresse complète (obligatoire)
    if (!formData.address?.trim()) {
      newErrors.address = t('form.steps.personalInfo.validationAddress');
    }

    // if (!formData.city?.trim()) {
    //   newErrors.city = 'City is required';
    // }

    // if (!formData.postalCode?.trim()) {
    //   newErrors.postalCode = 'Postal code is required';
    // }

    // if (!formData.country?.trim()) {
    //   newErrors.country = 'Country is required';
    // }

    // if (!formData.timezone?.trim()) {
    //   newErrors.timezone = 'Timezone is required';
    // }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddressSelect = (addressData) => {
    updateFormData({
      // Utiliser formatted_address si disponible, sinon utiliser address
      address: addressData.formatted_address || addressData.address || '',
      city: addressData.city || '',
      postalCode: addressData.postal_code || '',
      country: addressData.country || '',
      timezone: addressData.timezone || '',
      // Marquer que ces champs ont été remplis par l'autocomplétion
      _addressAutoFilled: true
    });
  };

  // Fonction pour géocoder une adresse manuellement tapée et compléter les champs manquants
  // Cette fonction est aussi appelée automatiquement via useEffect
  const geocodeAddress = async (address, currentFormData = formData) => {
    if (!address || !address.trim()) {
      return;
    }

    // Ne pas géocoder si les champs sont déjà remplis
    if (currentFormData.city && currentFormData.postalCode && currentFormData.country && currentFormData.timezone) {
      return;
    }

    // Ne pas géocoder si l'adresse a été remplie via l'autocomplétion
    if (currentFormData._addressAutoFilled) {
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('Google Maps API key not configured, cannot geocode address');
      return;
    }

    setIsGeocodingAddress(true);

    try {
      // Utiliser l'API Geocoding de Google pour obtenir les détails de l'adresse
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
      
      const response = await fetch(geocodeUrl);
      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        const addressComponents = result.address_components;
        const geometry = result.geometry;

        // Extraire les informations de l'adresse
        const addressData = {
          formatted_address: result.formatted_address || address,
          city: '',
          postal_code: '',
          country: '',
          latitude: geometry.location.lat,
          longitude: geometry.location.lng
        };

        // Parser les composants d'adresse
        addressComponents.forEach(component => {
          const types = component.types;
          
          if (types.includes('locality')) {
            addressData.city = component.long_name;
          } else if (types.includes('sublocality') && !addressData.city) {
            addressData.city = component.long_name;
          } else if (types.includes('administrative_area_level_2') && !addressData.city) {
            addressData.city = component.long_name;
          } else if (types.includes('postal_code')) {
            addressData.postal_code = component.long_name;
          } else if (types.includes('country')) {
            addressData.country = component.long_name;
          }
        });

        // Obtenir le timezone si on a les coordonnées
        if (addressData.latitude && addressData.longitude) {
          try {
            const timestamp = Math.floor(Date.now() / 1000);
            const timezoneUrl = `https://maps.googleapis.com/maps/api/timezone/json?location=${addressData.latitude},${addressData.longitude}&timestamp=${timestamp}&key=${apiKey}`;
            
            const timezoneResponse = await fetch(timezoneUrl);
            const timezoneData = await timezoneResponse.json();

            if (timezoneData.status === 'OK' && timezoneData.timeZoneId) {
              addressData.timezone = timezoneData.timeZoneId;
            }
          } catch (timezoneError) {
            console.warn('Could not get timezone:', timezoneError);
          }
        }

        // Mettre à jour les champs manquants uniquement, y compris l'adresse complète
        const updates = {};
        // Mettre à jour l'adresse avec l'adresse complète formatée
        if (addressData.formatted_address && addressData.formatted_address !== currentFormData.address) {
          updates.address = addressData.formatted_address;
        }
        if (addressData.city && !currentFormData.city) {
          updates.city = addressData.city;
        }
        if (addressData.postal_code && !currentFormData.postalCode) {
          updates.postalCode = addressData.postal_code;
        }
        if (addressData.country && !currentFormData.country) {
          updates.country = addressData.country;
        }
        if (addressData.timezone && !currentFormData.timezone) {
          updates.timezone = addressData.timezone;
        }

        if (Object.keys(updates).length > 0) {
          updateFormData(updates);
        }
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
    } finally {
      setIsGeocodingAddress(false);
    }
  };

  // Géocoder automatiquement l'adresse après un délai si elle n'a pas été remplie via l'autocomplétion
  useEffect(() => {
    // Nettoyer le timeout précédent
    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current);
    }

    const address = formData.address;
    const isAutoFilled = formData._addressAutoFilled;
    const hasCity = formData.city;
    const hasPostalCode = formData.postalCode;
    const hasCountry = formData.country;
    const hasTimezone = formData.timezone;

    // Si l'adresse a été remplie via l'autocomplétion, ne pas géocoder
    if (isAutoFilled) {
      return;
    }

    // Si l'adresse est vide ou les champs sont déjà remplis, ne pas géocoder
    if (!address || !address.trim()) {
      return;
    }

    if (hasCity && hasPostalCode && hasCountry && hasTimezone) {
      return;
    }

    // Attendre 1.5 secondes après la dernière modification pour géocoder
    geocodeTimeoutRef.current = setTimeout(() => {
      geocodeAddress(address);
    }, 1500);

    return () => {
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.address, formData._addressAutoFilled, formData.city, formData.postalCode, formData.country, formData.timezone]);

  const handleNext = () => {
    if (emailExists) {
      // Don't allow submission if email exists
      return;
    }
    if (validate()) {
      // Track personal info completed
      trackAnalyticsPersonalInfoCompleted(isAuthenticated);
      nextStep();
    } else if (handleContinueClick) {
      handleContinueClick();
    }
  };

  return (
    <>
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 md:pt-8 pb-32 sm:pb-36 md:pb-6 lg:pb-6" style={{ minHeight: 0 }}>
        <div className="space-y-4 sm:space-y-6 md:space-y-8 max-w-full">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
              {t('form.steps.personalInfo.title')}
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600">
              {t('form.steps.personalInfo.subtitle')}
            </p>
          </div>

          <div className="space-y-3 sm:space-y-4 md:space-y-5">
        {/* First Name & Last Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
          <div>
            <label htmlFor="firstName" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2 flex items-center">
              <Icon icon="heroicons:user" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-gray-400 flex-shrink-0" />
              <span>{t('form.steps.personalInfo.firstName')} <span className="text-red-500 ml-1">*</span></span>
            </label>
            <input
              type="text"
              id="firstName"
              value={formData.firstName || ''}
              onChange={(e) => handleChange('firstName', e.target.value)}
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all text-sm sm:text-base ${
                errors.firstName ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder={t('form.steps.personalInfo.placeholderFirstName')}
            />
            {errors.firstName && (
              <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center">
                <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                <span>{errors.firstName}</span>
              </p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2 flex items-center">
              <Icon icon="heroicons:user" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-gray-400 flex-shrink-0" />
              <span>{t('form.steps.personalInfo.lastName')} <span className="text-red-500 ml-1">*</span></span>
            </label>
            <input
              type="text"
              id="lastName"
              value={formData.lastName || ''}
              onChange={(e) => handleChange('lastName', e.target.value)}
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all text-sm sm:text-base ${
                errors.lastName ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder={t('form.steps.personalInfo.placeholderLastName')}
            />
            {errors.lastName && (
              <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center">
                <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                <span>{errors.lastName}</span>
              </p>
            )}
          </div>
        </div>

        {/* Email - Only show for non-authenticated users */}
        {!isAuthenticated && (
          <div>
            <label htmlFor="email" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2 flex items-center">
              <Icon icon="heroicons:envelope" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-gray-400 flex-shrink-0" />
              <span>{t('form.steps.personalInfo.email')} <span className="text-red-500 ml-1">*</span></span>
            </label>
            <input
              type="email"
              id="email"
              value={formData.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={(e) => checkEmailExists(e.target.value)}
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all text-sm sm:text-base ${
                errors.email || emailExists ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder={t('form.steps.personalInfo.placeholderEmail')}
            />
            {errors.email && (
              <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center">
                <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                <span>{errors.email}</span>
              </p>
            )}
            {emailExists && !errors.email && (
              <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-start">
                <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0 mt-0.5" />
                <span className="break-words">{t('form.steps.personalInfo.emailExists')}</span>
              </p>
            )}
          </div>
        )}

        {/* Password - Only show for non-authenticated users */}
        {!isAuthenticated && (
          <div>
            <label htmlFor="password" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2 flex items-center">
              <Icon icon="heroicons:lock-closed" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-gray-400 flex-shrink-0" />
              <span>{t('form.steps.personalInfo.password')} <span className="text-red-500 ml-1">*</span></span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={formData.password || ''}
                onChange={(e) => handleChange('password', e.target.value)}
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-12 bg-white border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all text-sm sm:text-base ${
                  errors.password ? 'border-red-500' : 'border-gray-200'
                }`}
                placeholder={t('form.steps.personalInfo.placeholderPassword')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors p-1"
                aria-label={showPassword ? t('form.steps.personalInfo.hidePassword') : t('form.steps.personalInfo.showPassword')}
              >
                <Icon
                  icon={showPassword ? "heroicons:eye-slash" : "heroicons:eye"}
                  className="w-4 h-4 sm:w-5 sm:h-5"
                />
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center">
                <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                <span>{errors.password}</span>
              </p>
            )}
          </div>
        )}

        {/* Address */}
        <div>
          <label htmlFor="address" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2 flex items-center">
            <Icon icon="heroicons:map-pin" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-gray-400 flex-shrink-0" />
            <span>{t('form.steps.personalInfo.fullAddress')} <span className="text-red-500 ml-1">*</span></span>
          </label>
          <div className={errors.address ? 'border-2 border-red-500 rounded-xl' : ''}>
            <div className="relative">
              <AddressAutocomplete
                value={formData.address || ''}
                onChange={(value) => {
                  handleChange('address', value);
                  // Réinitialiser le flag d'autocomplétion si l'utilisateur modifie manuellement
                  if (formData._addressAutoFilled) {
                    updateFormData({ _addressAutoFilled: false });
                  }
                }}
                onAddressSelect={handleAddressSelect}
                placeholder={t('form.steps.personalInfo.placeholderAddress')}
                className={errors.address ? 'border-red-500' : ''}
              />
              {isGeocodingAddress && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                </div>
              )}
            </div>
          </div>
          {errors.address && (
            <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center">
              <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
              <span>{errors.address}</span>
            </p>
          )}
        </div>


        {/* Additional Notes */}
        <div>
          <label htmlFor="notes" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2 flex items-center">
            <Icon icon="heroicons:pencil-square" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-gray-400 flex-shrink-0" />
            <span>{t('form.steps.personalInfo.additionalNotesOptional')}</span>
          </label>
          <textarea
            id="notes"
            value={formData.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows="4"
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all resize-none text-sm sm:text-base"
            placeholder={t('form.steps.personalInfo.placeholderNotes')}
          />
        </div>
          </div>
        </div>
      </div>

      {/* Price Details + Fixed Navigation */}
      <div className="hidden xl:block flex-shrink-0 bg-[#F3F4F6] xl:relative bottom-20 xl:bottom-auto left-0 right-0 z-50 xl:z-auto xl:border-t xl:border-gray-300">
        <PriceDetails 
          formData={formData} 
          isOpen={isPriceDetailsOpen}
          onToggle={setIsPriceDetailsOpen}
        />
        <div className="px-4 py-4 flex justify-between border-t border-gray-300">
          <button
            type="button"
            onClick={prevStep}
            className="btn-glassy-secondary px-6 md:px-8 py-3 text-gray-700 font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
          >
            {t('form.navigation.back')}
          </button>
          <button
            type="button"
            onClick={handleNext}
            className={`px-6 md:px-8 py-3 text-white font-semibold rounded-full transition-all ${
              emailExists
                ? 'bg-red-500 hover:bg-red-600 opacity-75'
                : 'btn-glassy hover:scale-105 active:scale-95'
            }`}
          >
            {t('form.navigation.continue')}
          </button>
        </div>
      </div>
    </>
  );
};

export default PersonalInfo;
