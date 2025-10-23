import { useState } from 'react';
import { Icon } from '@iconify/react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

const PersonalInfo = ({ formData, updateFormData, nextStep, prevStep }) => {
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    updateFormData({ [field]: value });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
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

    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
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
    if (validate()) {
      nextStep();
    }
  };

  return (
    <>
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-3 md:px-10 pt-6 md:pt-10 pb-40 lg:pb-6">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              className={`w-full px-4 py-3 bg-white border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all ${
                errors.email ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="john.doe@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <Icon icon="heroicons:exclamation-circle" className="w-4 h-4 mr-1" />
                {errors.email}
              </p>
            )}
          </div>

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

export default PersonalInfo;
