import { useState } from 'react';
import { Icon } from '@iconify/react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { supabase } from '../../lib/supabase';
import AddressAutocomplete from '../AddressAutocomplete';

const PersonalInfo = ({ formData, updateFormData, nextStep, prevStep, isAuthenticated = false }) => {
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const handlePhoneChange = (value) => {
    updateFormData({ phone: value });

    // Clear error when user starts typing
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: '' }));
    }

    // Validate phone number in real-time if value exists
    if (value && value.length > 3) {
      if (!isValidPhoneNumber(value)) {
        setErrors(prev => ({ ...prev, phone: 'Please enter a valid phone number' }));
      }
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
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName?.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    // Only validate email and password if user is not authenticated
    if (!isAuthenticated) {
      if (!formData.email?.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Invalid email format';
      }

      // Password validation
      if (!formData.password?.trim()) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }

      if (!formData.confirmPassword?.trim()) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    if (!formData.phone?.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (formData.phone && !isValidPhoneNumber(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.address?.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!formData.city?.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.postalCode?.trim()) {
      newErrors.postalCode = 'Postal code is required';
    }

    if (!formData.country?.trim()) {
      newErrors.country = 'Country is required';
    }

    if (!formData.timezone?.trim()) {
      newErrors.timezone = 'Timezone is required';
    }

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
      nextStep();
    }
  };

  return (
    <>
      {/* Scrollable Content */}
      <div className="flex-1 overflow-x-hidden px-3 sm:px-4 pt-4 sm:pt-6 md:pt-10 pb-32 sm:pb-36 lg:pb-6">
        <div className="space-y-4 sm:space-y-6 max-w-full">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
              Your Personal Information
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              Please fill in your contact details
            </p>
          </div>

          <div className="space-y-3 sm:space-y-4">
        {/* First Name & Last Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label htmlFor="firstName" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2 flex items-center">
              <Icon icon="heroicons:user" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-gray-400 flex-shrink-0" />
              <span>First Name <span className="text-red-500 ml-1">*</span></span>
            </label>
            <input
              type="text"
              id="firstName"
              value={formData.firstName || ''}
              onChange={(e) => handleChange('firstName', e.target.value)}
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all text-sm sm:text-base ${
                errors.firstName ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="John"
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
              <span>Last Name <span className="text-red-500 ml-1">*</span></span>
            </label>
            <input
              type="text"
              id="lastName"
              value={formData.lastName || ''}
              onChange={(e) => handleChange('lastName', e.target.value)}
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all text-sm sm:text-base ${
                errors.lastName ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="Doe"
            />
            {errors.lastName && (
              <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center">
                <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                <span>{errors.lastName}</span>
              </p>
            )}
          </div>
        </div>

        {/* Email & Phone */}
        <div className={`grid grid-cols-1 ${!isAuthenticated ? 'sm:grid-cols-2' : ''} gap-3 sm:gap-4`}>
          {!isAuthenticated && (
            <div>
              <label htmlFor="email" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2 flex items-center">
                <Icon icon="heroicons:envelope" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-gray-400 flex-shrink-0" />
                <span>Email Address <span className="text-red-500 ml-1">*</span></span>
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
                placeholder="john.doe@example.com"
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
                  <span className="break-words">This email is already registered. Please login or use a different email.</span>
                </p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="phone" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2 flex items-center">
              <Icon icon="heroicons:phone" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-gray-400 flex-shrink-0" />
              <span>Phone Number <span className="text-red-500 ml-1">*</span></span>
            </label>
            <div className={`flex items-center bg-gray-50 border ${
              errors.phone ? 'border-red-500' : 'border-gray-200'
            } rounded-xl overflow-hidden transition-all focus-within:ring-2 ${
              errors.phone ? 'focus-within:ring-red-500' : 'focus-within:ring-black'
            } focus-within:border-black pl-2 sm:pl-4 pr-2 sm:pr-4`}>
              <PhoneInput
                international
                defaultCountry="US"
                value={formData.phone || ''}
                onChange={handlePhoneChange}
                className="phone-input-integrated w-full flex text-sm sm:text-base"
                countrySelectProps={{
                  className: "pr-1 sm:pr-2 py-2 sm:py-3 border-0 outline-none bg-transparent cursor-pointer hover:bg-gray-100 transition-colors rounded-none text-xs sm:text-sm"
                }}
                numberInputProps={{
                  className: "flex-1 pl-1 sm:pl-2 py-2 sm:py-3 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-sm sm:text-base"
                }}
              />
            </div>
            {errors.phone && (
              <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center">
                <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                <span>{errors.phone}</span>
              </p>
            )}
          </div>
        </div>

        {/* Password & Confirm Password - Only show for non-authenticated users */}
        {!isAuthenticated && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label htmlFor="password" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2 flex items-center">
                <Icon icon="heroicons:lock-closed" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-gray-400 flex-shrink-0" />
                <span>Mot de passe <span className="text-red-500 ml-1">*</span></span>
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
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
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

            <div>
              <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2 flex items-center">
                <Icon icon="heroicons:lock-closed" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-gray-400 flex-shrink-0" />
                <span>Confirmer le mot de passe <span className="text-red-500 ml-1">*</span></span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  value={formData.confirmPassword || ''}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-12 bg-white border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all text-sm sm:text-base ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors p-1"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  <Icon
                    icon={showConfirmPassword ? "heroicons:eye-slash" : "heroicons:eye"}
                    className="w-4 h-4 sm:w-5 sm:h-5"
                  />
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center">
                  <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                  <span>{errors.confirmPassword}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Address */}
        <div>
          <label htmlFor="address" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2 flex items-center">
            <Icon icon="heroicons:map-pin" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-gray-400 flex-shrink-0" />
            <span>Street Address <span className="text-red-500 ml-1">*</span></span>
          </label>
          <div className={errors.address ? 'border-2 border-red-500 rounded-xl' : ''}>
            <AddressAutocomplete
              value={formData.address || ''}
              onChange={(value) => handleChange('address', value)}
              onAddressSelect={handleAddressSelect}
              placeholder="Start typing an address..."
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label htmlFor="city" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2 flex items-center">
              <Icon icon="heroicons:building-office-2" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-gray-400 flex-shrink-0" />
              <span>City <span className="text-red-500 ml-1">*</span></span>
            </label>
            <input
              type="text"
              id="city"
              value={formData.city || ''}
              disabled
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-2 rounded-xl text-gray-500 cursor-not-allowed text-sm sm:text-base ${
                errors.city ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="Auto-filled from address"
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
              Postal Code <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              id="postalCode"
              value={formData.postalCode || ''}
              disabled
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-2 rounded-xl text-gray-500 cursor-not-allowed text-sm sm:text-base ${
                errors.postalCode ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="Auto-filled from address"
            />
            {errors.postalCode && (
              <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center">
                <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                <span>{errors.postalCode}</span>
              </p>
            )}
          </div>

          <div className="sm:col-span-2 lg:col-span-1">
            <label htmlFor="country" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2 flex items-center">
              <Icon icon="heroicons:globe-americas" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-gray-400 flex-shrink-0" />
              <span>Country <span className="text-red-500 ml-1">*</span></span>
            </label>
            <input
              type="text"
              id="country"
              value={formData.country || ''}
              disabled
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-2 rounded-xl text-gray-500 cursor-not-allowed text-sm sm:text-base ${
                errors.country ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="Auto-filled from address"
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
            <span>Timezone <span className="text-red-500 ml-1">*</span></span>
          </label>
          <input
            type="text"
            id="timezone"
            value={formData.timezone || ''}
            disabled
            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-2 rounded-xl text-gray-500 cursor-not-allowed text-sm sm:text-base ${
              errors.timezone ? 'border-red-500' : 'border-gray-200'
            }`}
            placeholder="Auto-filled from address (precise timezone)"
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
            <span>Additional Notes (Optional)</span>
          </label>
          <textarea
            id="notes"
            value={formData.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows="4"
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all resize-none text-sm sm:text-base"
            placeholder="Any additional information or special requests..."
          />
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
            onClick={handleNext}
            disabled={emailExists}
            className={`px-6 md:px-8 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 ${
              emailExists
                ? 'bg-red-500 hover:bg-red-600 cursor-not-allowed opacity-75'
                : 'btn-glassy'
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </>
  );
};

export default PersonalInfo;
