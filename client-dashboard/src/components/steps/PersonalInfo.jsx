import { useState } from 'react';
import { Icon } from '@iconify/react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { supabase } from '../../lib/supabase';

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
      <div className="flex-1 overflow-y-auto px-3 md:px-10 pt-6 md:pt-10 pb-44 lg:pb-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Your Personal Information
            </h2>
            <p className="text-gray-600">
              Please fill in your contact details
            </p>
          </div>

          <div className="space-y-4">
        {/* First Name & Last Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-semibold text-gray-900 mb-2 flex items-center">
              <Icon icon="heroicons:user" className="w-4 h-4 mr-2 text-gray-400" />
              First Name <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              id="firstName"
              value={formData.firstName || ''}
              onChange={(e) => handleChange('firstName', e.target.value)}
              className={`w-full px-4 py-3 bg-white border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all ${
                errors.firstName ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="John"
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <Icon icon="heroicons:exclamation-circle" className="w-4 h-4 mr-1" />
                {errors.firstName}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-semibold text-gray-900 mb-2 flex items-center">
              <Icon icon="heroicons:user" className="w-4 h-4 mr-2 text-gray-400" />
              Last Name <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              id="lastName"
              value={formData.lastName || ''}
              onChange={(e) => handleChange('lastName', e.target.value)}
              className={`w-full px-4 py-3 bg-white border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all ${
                errors.lastName ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="Doe"
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <Icon icon="heroicons:exclamation-circle" className="w-4 h-4 mr-1" />
                {errors.lastName}
              </p>
            )}
          </div>
        </div>

        {/* Email & Phone */}
        <div className={`grid grid-cols-1 ${!isAuthenticated ? 'md:grid-cols-2' : ''} gap-4`}>
          {!isAuthenticated && (
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2 flex items-center">
                <Icon icon="heroicons:envelope" className="w-4 h-4 mr-2 text-gray-400" />
                Email Address <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="email"
                id="email"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={(e) => checkEmailExists(e.target.value)}
                className={`w-full px-4 py-3 bg-white border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all ${
                  errors.email || emailExists ? 'border-red-500' : 'border-gray-200'
                }`}
                placeholder="john.doe@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <Icon icon="heroicons:exclamation-circle" className="w-4 h-4 mr-1" />
                  {errors.email}
                </p>
              )}
              {emailExists && !errors.email && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <Icon icon="heroicons:exclamation-circle" className="w-4 h-4 mr-1" />
                  This email is already registered. Please login or use a different email.
                </p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 mb-2 flex items-center">
              <Icon icon="heroicons:phone" className="w-4 h-4 mr-2 text-gray-400" />
              Phone Number <span className="text-red-500 ml-1">*</span>
            </label>
            <PhoneInput
              international
              defaultCountry="US"
              value={formData.phone || ''}
              onChange={(value) => handleChange('phone', value)}
              className={`phone-input ${errors.phone ? 'phone-input-error' : ''}`}
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <Icon icon="heroicons:exclamation-circle" className="w-4 h-4 mr-1" />
                {errors.phone}
              </p>
            )}
          </div>
        </div>

        {/* Password & Confirm Password - Only show for non-authenticated users */}
        {!isAuthenticated && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2 flex items-center">
                <Icon icon="heroicons:lock-closed" className="w-4 h-4 mr-2 text-gray-400" />
                Mot de passe <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={formData.password || ''}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className={`w-full px-4 py-3 pr-12 bg-white border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all ${
                    errors.password ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <Icon
                    icon={showPassword ? "heroicons:eye-slash" : "heroicons:eye"}
                    className="w-5 h-5"
                  />
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <Icon icon="heroicons:exclamation-circle" className="w-4 h-4 mr-1" />
                  {errors.password}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-900 mb-2 flex items-center">
                <Icon icon="heroicons:lock-closed" className="w-4 h-4 mr-2 text-gray-400" />
                Confirmer le mot de passe <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  value={formData.confirmPassword || ''}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  className={`w-full px-4 py-3 pr-12 bg-white border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <Icon
                    icon={showConfirmPassword ? "heroicons:eye-slash" : "heroicons:eye"}
                    className="w-5 h-5"
                  />
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <Icon icon="heroicons:exclamation-circle" className="w-4 h-4 mr-1" />
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Address */}
        <div>
          <label htmlFor="address" className="block text-sm font-semibold text-gray-900 mb-2 flex items-center">
            <Icon icon="heroicons:map-pin" className="w-4 h-4 mr-2 text-gray-400" />
            Street Address <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="text"
            id="address"
            value={formData.address || ''}
            onChange={(e) => handleChange('address', e.target.value)}
            className={`w-full px-4 py-3 bg-white border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all ${
              errors.address ? 'border-red-500' : 'border-gray-200'
            }`}
            placeholder="123 Main Street"
          />
          {errors.address && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <Icon icon="heroicons:exclamation-circle" className="w-4 h-4 mr-1" />
              {errors.address}
            </p>
          )}
        </div>

        {/* City, Postal Code & Country */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="city" className="block text-sm font-semibold text-gray-900 mb-2 flex items-center">
              <Icon icon="heroicons:building-office-2" className="w-4 h-4 mr-2 text-gray-400" />
              City <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              id="city"
              value={formData.city || ''}
              onChange={(e) => handleChange('city', e.target.value)}
              className={`w-full px-4 py-3 bg-white border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all ${
                errors.city ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="New York"
            />
            {errors.city && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <Icon icon="heroicons:exclamation-circle" className="w-4 h-4 mr-1" />
                {errors.city}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="postalCode" className="block text-sm font-semibold text-gray-900 mb-2">
              Postal Code <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              id="postalCode"
              value={formData.postalCode || ''}
              onChange={(e) => handleChange('postalCode', e.target.value.toUpperCase())}
              className={`w-full px-4 py-3 bg-white border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all ${
                errors.postalCode ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="10001"
            />
            {errors.postalCode && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <Icon icon="heroicons:exclamation-circle" className="w-4 h-4 mr-1" />
                {errors.postalCode}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-semibold text-gray-900 mb-2 flex items-center">
              <Icon icon="heroicons:globe-americas" className="w-4 h-4 mr-2 text-gray-400" />
              Country <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              id="country"
              value={formData.country || ''}
              onChange={(e) => handleChange('country', e.target.value)}
              className={`w-full px-4 py-3 bg-white border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all ${
                errors.country ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="United States"
            />
            {errors.country && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <Icon icon="heroicons:exclamation-circle" className="w-4 h-4 mr-1" />
                {errors.country}
              </p>
            )}
          </div>
        </div>

        {/* Additional Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-semibold text-gray-900 mb-2 flex items-center">
            <Icon icon="heroicons:pencil-square" className="w-4 h-4 mr-2 text-gray-400" />
            Additional Notes (Optional)
          </label>
          <textarea
            id="notes"
            value={formData.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows="4"
            className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all resize-none"
            placeholder="Any additional information or special requests..."
          />
        </div>
          </div>
        </div>
      </div>

      {/* Fixed Navigation */}
      <div className="flex-shrink-0 px-3 md:px-10 py-4 bg-[#F3F4F6] fixed lg:relative bottom-[72px] lg:bottom-auto left-0 right-0 z-50 lg:z-auto lg:border-t lg:border-gray-300">
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
