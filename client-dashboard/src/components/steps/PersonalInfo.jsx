import { useState } from 'react';
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

    if (!formData.address?.trim()) {
      newErrors.address = t('form.steps.personalInfo.validationAddress');
    }

    // Les champs auto-remplis ne sont pas obligatoires
    // Ils seront remplis automatiquement si disponibles dans l'adresse sélectionnée
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
      address: addressData.address || '',
      city: addressData.city || '',
      postalCode: addressData.postal_code || '',
      country: addressData.country || '',
      timezone: addressData.timezone || ''
    });
  };

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
            <span>{t('form.steps.personalInfo.address')} <span className="text-red-500 ml-1">*</span></span>
          </label>
          <div className={errors.address ? 'border-2 border-red-500 rounded-xl' : ''}>
            <AddressAutocomplete
              value={formData.address || ''}
              onChange={(value) => handleChange('address', value)}
              onAddressSelect={handleAddressSelect}
              placeholder={t('form.steps.personalInfo.placeholderAddress')}
              className={errors.address ? 'border-red-500' : ''}
            />
          </div>
          {errors.address && (
            <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center">
              <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
              <span>{errors.address}</span>
            </p>
          )}
        </div>

        {/* City, Postal Code & Country */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
          <div>
            <label htmlFor="city" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2 flex items-center">
              <Icon icon="heroicons:building-office-2" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-gray-400 flex-shrink-0" />
              <span>{t('form.steps.personalInfo.city')}</span>
            </label>
            <input
              type="text"
              id="city"
              value={formData.city || ''}
              disabled
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-2 rounded-xl text-gray-500 cursor-not-allowed text-sm sm:text-base ${
                errors.city ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder={t('form.steps.personalInfo.placeholderAutoFilled')}
            />
            {errors.city && (
              <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center">
                <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                <span>{errors.city}</span>
              </p>
            )}
          </div>

          <div>
            <label htmlFor="postalCode" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">
              {t('form.steps.personalInfo.postalCode')}
            </label>
            <input
              type="text"
              id="postalCode"
              value={formData.postalCode || ''}
              disabled
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-2 rounded-xl text-gray-500 cursor-not-allowed text-sm sm:text-base ${
                errors.postalCode ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder={t('form.steps.personalInfo.placeholderAutoFilled')}
            />
            {errors.postalCode && (
              <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center">
                <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                <span>{errors.postalCode}</span>
              </p>
            )}
          </div>

          <div className="sm:col-span-2 md:col-span-1 lg:col-span-1">
            <label htmlFor="country" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2 flex items-center">
              <Icon icon="heroicons:globe-americas" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-gray-400 flex-shrink-0" />
              <span>{t('form.steps.personalInfo.country')}</span>
            </label>
            <input
              type="text"
              id="country"
              value={formData.country || ''}
              disabled
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-2 rounded-xl text-gray-500 cursor-not-allowed text-sm sm:text-base ${
                errors.country ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder={t('form.steps.personalInfo.placeholderAutoFilled')}
            />
            {errors.country && (
              <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center">
                <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                <span>{errors.country}</span>
              </p>
            )}
          </div>
        </div>

        {/* Timezone */}
        <div>
          <label htmlFor="timezone" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2 flex items-center">
            <Icon icon="heroicons:clock" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-gray-400 flex-shrink-0" />
            <span>Timezone</span>
          </label>
          <input
            type="text"
            id="timezone"
            value={formData.timezone || ''}
            disabled
            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-2 rounded-xl text-gray-500 cursor-not-allowed text-sm sm:text-base ${
              errors.timezone ? 'border-red-500' : 'border-gray-200'
            }`}
            placeholder={t('form.steps.personalInfo.placeholderTimezone')}
          />
          {errors.timezone && (
            <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center">
              <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
              <span>{errors.timezone}</span>
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
