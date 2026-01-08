import { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { supabase } from '../../lib/supabase';
import AddressAutocomplete from '../AddressAutocomplete';
import { useTranslation } from '../../hooks/useTranslation';

const PersonalInfo = ({ formData, updateFormData, nextStep, prevStep, isAuthenticated = false, handleContinueClick, getValidationErrorMessage, isPriceDetailsOpen, setIsPriceDetailsOpen }) => {
  const { t } = useTranslation();
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [phoneDefaultCountry, setPhoneDefaultCountry] = useState(null);
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
    
    // If user is a signatory, update the signatory information when personal info changes
    if (formData.isSignatory && (field === 'firstName' || field === 'lastName' || field === 'email' || field === 'phone' || field === 'address')) {
      const currentSignatories = formData.signatories || [];
      const updatedSignatories = currentSignatories.map(sig => {
        // Check if this is the user's signatory (by email or by matching current user info)
        const isUserSig = sig.email === formData.email && 
                         sig.firstName === formData.firstName && 
                         sig.lastName === formData.lastName;
        
        if (isUserSig) {
          return {
            ...sig,
            firstName: field === 'firstName' ? value : (sig.firstName || formData.firstName || ''),
            lastName: field === 'lastName' ? value : (sig.lastName || formData.lastName || ''),
            email: field === 'email' ? value : (sig.email || formData.email || ''),
            phone: field === 'phone' ? value : (sig.phone || formData.phone || ''),
            postalAddress: field === 'address' ? value : (sig.postalAddress || formData.address || '')
          };
        }
        return sig;
      });
      
      // Only update if we found and updated a signatory
      if (updatedSignatories.some((sig, idx) => {
        const originalSig = currentSignatories[idx];
        return sig.email === formData.email && 
               sig.firstName === formData.firstName && 
               sig.lastName === formData.lastName &&
               (sig.firstName !== originalSig?.firstName || 
                sig.lastName !== originalSig?.lastName || 
                sig.email !== originalSig?.email || 
                sig.phone !== originalSig?.phone ||
                sig.postalAddress !== originalSig?.postalAddress);
      })) {
        updateFormData({ signatories: updatedSignatories });
      }
    }
  };

  const checkEmailExists = async (email) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return;
    }

    // If user is authenticated, check if email is their own
    if (isAuthenticated) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email === email) {
          // User is editing their own email, that's fine
          setEmailExists(false);
          return;
        }
      } catch (error) {
        console.error('Error getting user:', error);
      }
    }

    try {
      // Check if email exists in client table
      const { data, error } = await supabase
        .from('client')
        .select('id')
        .eq('email', email)
        .maybeSingle();

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

    // Always validate email (even if authenticated, user can change it)
    if (!formData.email?.trim()) {
      newErrors.email = t('form.steps.personalInfo.validationEmail');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('form.steps.personalInfo.validationEmailInvalid');
    }

    // Only validate password if user is not authenticated
    if (!isAuthenticated) {
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

    // Validation du téléphone
    if (!formData.phone?.trim()) {
      newErrors.phone = t('form.steps.personalInfo.validationPhone') || 'Phone number is required';
    } else if (!isValidPhoneNumber(formData.phone)) {
      newErrors.phone = t('form.steps.personalInfo.validationPhoneInvalid') || 'Please enter a valid phone number';
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

  // Déterminer automatiquement le pays pour le téléphone via l'IP de l'utilisateur
  useEffect(() => {
    const STORAGE_KEY = 'notaryPhoneCountry';

    // Si un numéro est déjà renseigné, ne pas écraser
    if (formData.phone && formData.phone.length > 3) {
      return;
    }

    const fallbackFromLocale = () => {
      try {
        const lang = navigator.language || navigator.languages?.[0];
        if (lang && lang.includes('-')) {
          const code = lang.split('-')[1]?.toUpperCase();
          if (code && code.length === 2) return code;
        }
      } catch (_) {}
      return null;
    };

    // Essayer le cache local d'abord
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        setPhoneDefaultCountry(cached);
        return;
      }
    } catch (err) {
      console.warn('Could not read phone country from storage', err);
    }

    let isMounted = true;
    const detectCountry = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        clearTimeout(timeout);
        if (!response.ok) return;
        const data = await response.json();
        const countryCode = data?.country_code?.toUpperCase();
        if (countryCode && countryCode.length === 2) {
          if (!isMounted) return;
          setPhoneDefaultCountry(countryCode);
          try {
            localStorage.setItem(STORAGE_KEY, countryCode);
          } catch (err) {
            console.warn('Could not save phone country to storage', err);
          }
          return;
        }
      } catch (error) {
        console.warn('IP country detection failed', error);
      }

      // Fallback: utiliser la locale du navigateur
      const localeCountry = fallbackFromLocale();
      if (localeCountry) {
        if (!isMounted) return;
        setPhoneDefaultCountry(localeCountry);
        try {
          localStorage.setItem(STORAGE_KEY, localeCountry);
        } catch (err) {
          console.warn('Could not save phone country to storage', err);
        }
        return;
      }

      // Fallback final
      if (isMounted) {
        setPhoneDefaultCountry('FR');
      }
    };

    detectCountry();
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.phone]);

  // Initialiser automatiquement le signatory si isSignatory est true et que les informations sont disponibles
  useEffect(() => {
    if (!formData.isSignatory) {
      return;
    }
    
    const currentSignatories = formData.signatories || [];
    const hasRequiredInfo = formData.firstName && formData.lastName && formData.email;
    
    // Vérifier si l'utilisateur n'est pas déjà dans la liste
    const exists = currentSignatories.some(sig => 
      sig.email === formData.email && 
      sig.firstName === formData.firstName && 
      sig.lastName === formData.lastName
    );
    
    // Si les informations sont disponibles et que le signatory n'existe pas encore, l'ajouter
    if (hasRequiredInfo && !exists) {
      const signatory = {
        id: Date.now(),
        firstName: formData.firstName || '',
        lastName: formData.lastName || '',
        birthDate: '',
        birthCity: '',
        postalAddress: formData.address || '',
        email: formData.email || '',
        phone: formData.phone || ''
      };
      updateFormData({ 
        signatories: [...currentSignatories, signatory]
      });
    } else if (hasRequiredInfo && exists) {
      // Mettre à jour le signatory existant avec les informations actuelles
      const updatedSignatories = currentSignatories.map(sig => {
        const isUserSig = sig.email === formData.email && 
                         sig.firstName === formData.firstName && 
                         sig.lastName === formData.lastName;
        if (isUserSig) {
          return {
            ...sig,
            firstName: formData.firstName || '',
            lastName: formData.lastName || '',
            email: formData.email || '',
            phone: formData.phone || '',
            postalAddress: formData.address || ''
          };
        }
        return sig;
      });
      updateFormData({ signatories: updatedSignatories });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.isSignatory, formData.firstName, formData.lastName, formData.email, formData.phone, formData.address]);

  const handleNext = () => {
    if (emailExists && !isAuthenticated) {
      // Don't allow submission if email exists and user is not authenticated
      return;
    }
    if (validate()) {
      // Call original handleContinueClick or nextStep
      // L'envoi à Brevo est géré dans NotaryForm.handleContinueClick
      if (handleContinueClick) {
        handleContinueClick();
      } else {
        nextStep();
      }
    } else if (handleContinueClick) {
      handleContinueClick();
    }
  };

  return (
    <>
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 md:pt-8 pb-32 sm:pb-36 md:pb-6 lg:pb-6" style={{ minHeight: 0 }}>
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
          <div>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">
              {t('form.steps.personalInfo.title')}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
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
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all text-sm sm:text-base placeholder:text-gray-400 placeholder:italic ${
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
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all text-sm sm:text-base placeholder:text-gray-400 placeholder:italic ${
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

        {/* Email - Always show, editable even if authenticated */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
          {/* Email */}
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
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all text-sm sm:text-base placeholder:text-gray-400 placeholder:italic ${
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
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-12 bg-white border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all text-sm sm:text-base placeholder:text-gray-400 placeholder:italic ${
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
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2 flex items-center">
            <Icon icon="heroicons:phone" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-gray-400 flex-shrink-0" />
            <span>{t('form.steps.personalInfo.phone') || 'Phone Number'} <span className="text-red-500 ml-1">*</span></span>
          </label>
          <div className={`flex items-center bg-white border-2 rounded-xl overflow-hidden transition-all focus-within:ring-2 ${
            errors.phone ? 'border-red-500 focus-within:ring-red-500 focus-within:border-red-500' : 'border-gray-200 focus-within:ring-black focus-within:border-black'
          } pl-2 sm:pl-3 pr-2 sm:pr-3`}>
            <PhoneInput
              international
              defaultCountry={phoneDefaultCountry || undefined}
              value={formData.phone || ''}
              onChange={(value) => {
                handleChange('phone', value || '');
                // Valider le numéro de téléphone en temps réel
                if (value && value.length > 3) {
                  if (!isValidPhoneNumber(value)) {
                    setPhoneError(t('form.steps.personalInfo.validationPhoneInvalid') || 'Please enter a valid phone number');
                    setErrors(prev => ({ ...prev, phone: t('form.steps.personalInfo.validationPhoneInvalid') || 'Please enter a valid phone number' }));
                  } else {
                    setPhoneError('');
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.phone;
                      return newErrors;
                    });
                  }
                } else if (!value || value === '') {
                  setPhoneError('');
                  setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.phone;
                    return newErrors;
                  });
                }
              }}
              className="phone-input-integrated w-full flex text-sm sm:text-base"
              countrySelectProps={{
                className: "pr-1 sm:pr-2 py-2.5 sm:py-3 border-0 outline-none bg-transparent cursor-pointer hover:bg-gray-100 transition-colors rounded-none text-xs sm:text-sm focus:outline-none focus:ring-0"
              }}
              numberInputProps={{
                className: "flex-1 pl-1 sm:pl-2 py-2.5 sm:py-3 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-sm sm:text-base"
              }}
            />
          </div>
          {(errors.phone || phoneError) && (
            <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center">
              <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
              <span>{errors.phone || phoneError}</span>
            </p>
          )}
        </div>

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

        {/* Is Signatory Checkbox */}
        <label htmlFor="isSignatory" className="flex items-start space-x-3 cursor-pointer group">
          <div className="relative flex-shrink-0 mt-0.5">
            <input
              type="checkbox"
              id="isSignatory"
              checked={formData.isSignatory || false}
              onChange={(e) => {
                handleChange('isSignatory', e.target.checked);
                // Si coché, créer l'utilisateur comme signataire
                if (e.target.checked) {
                  const signatory = {
                    id: Date.now(),
                    firstName: formData.firstName || '',
                    lastName: formData.lastName || '',
                    birthDate: '',
                    birthCity: '',
                    postalAddress: formData.address || '',
                    email: formData.email || '',
                    phone: formData.phone || ''
                  };
                  const currentSignatories = formData.signatories || [];
                  // Vérifier si l'utilisateur n'est pas déjà dans la liste
                  const exists = currentSignatories.some(sig => 
                    sig.email === signatory.email && 
                    sig.firstName === signatory.firstName && 
                    sig.lastName === signatory.lastName
                  );
                  if (!exists) {
                    updateFormData({ 
                      signatories: [...currentSignatories, signatory],
                      isSignatory: true
                    });
                  }
                } else {
                  // Si décoché, retirer l'utilisateur de la liste des signataires
                  const currentSignatories = formData.signatories || [];
                  const filtered = currentSignatories.filter(sig => 
                    !(sig.email === formData.email && 
                      sig.firstName === formData.firstName && 
                      sig.lastName === formData.lastName)
                  );
                  updateFormData({ 
                    signatories: filtered,
                    isSignatory: false
                  });
                }
              }}
              className="sr-only peer"
            />
            <div className="w-5 h-5 border-2 border-blue-300 rounded transition-all flex items-center justify-center peer-checked:bg-blue-600 peer-checked:border-blue-600 group-hover:border-blue-400">
              {formData.isSignatory && (
                <Icon icon="heroicons:check" className="w-3 h-3 text-white" />
              )}
            </div>
          </div>
          <span className="text-xs sm:text-sm text-gray-700 select-none">
            {t('form.steps.personalInfo.isSignatory')}
          </span>
        </label>
          </div>
        </div>
      </div>

    </>
  );
};

export default PersonalInfo;
