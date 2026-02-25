import { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '@iconify/react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useTranslation } from '../../hooks/useTranslation';
import { trackSignatoriesAdded } from '../../utils/analytics';

const Signatories = ({ formData, updateFormData, nextStep, prevStep, handleContinueClick, getValidationErrorMessage }) => {
  const { formatPriceSync } = useCurrency();
  const { t } = useTranslation();
  const handleContinue = () => {
    // Call original handleContinueClick or nextStep
    if (handleContinueClick) {
      handleContinueClick();
    } else {
      nextStep();
    }
  };
  const [signatories, setSignatories] = useState([]);
  const [autocompleteInstances, setAutocompleteInstances] = useState({});
  const [phoneErrors, setPhoneErrors] = useState({}); // Store phone errors by signatoryIndex
  const [emailErrors, setEmailErrors] = useState({}); // Store email errors by signatoryIndex
  const [editingIndex, setEditingIndex] = useState(null); // Track which signatory is being edited
  const autocompleteRefs = useRef({});
  const googleMapsLoaded = useRef(false);
  const userAutoAddedRef = useRef(false);

  // Helper: check if a signatory is the current user (from formData)
  const isUserSignatory = (sig) => {
    return sig?.email === formData.email &&
           sig?.firstName === formData.firstName &&
           sig?.lastName === formData.lastName;
  };

  // Auto-add the logged-in user as the first signatory when they reach this step
  useEffect(() => {
    const hasUserInfo = formData.firstName?.trim() && formData.lastName?.trim() && formData.email?.trim();
    if (!hasUserInfo) return;

    const currentSignatories = formData.signatories || [];
    const userAsSignatory = {
      id: Date.now(),
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      birthDate: '',
      birthCity: '',
      postalAddress: formData.address || '',
      email: formData.email.trim(),
      phone: formData.phone?.trim() || ''
    };

    // Case 1: No signatories yet - add user as first
    if (currentSignatories.length === 0) {
      if (!userAutoAddedRef.current) {
        userAutoAddedRef.current = true;
        updateFormData({ signatories: [userAsSignatory], isSignatory: true });
      }
      return;
    }

    // Case 2: First signatory is not the user - ensure user is first
    const firstIsUser = isUserSignatory(currentSignatories[0]);
    if (!firstIsUser) {
      const userIndex = currentSignatories.findIndex(isUserSignatory);
      let newSignatories;
      if (userIndex >= 0) {
        // User exists elsewhere - move to first position
        newSignatories = [
          { ...currentSignatories[userIndex], ...userAsSignatory },
          ...currentSignatories.filter((_, i) => i !== userIndex)
        ];
      } else {
        // User not in list - add as first
        newSignatories = [userAsSignatory, ...currentSignatories];
      }
      updateFormData({ signatories: newSignatories, isSignatory: true });
    } else {
      // First is user - sync their info in case they updated Personal Info
      const first = currentSignatories[0];
      const hasEssentialChanges =
        first.firstName !== formData.firstName?.trim() ||
        first.lastName !== formData.lastName?.trim() ||
        first.email !== formData.email?.trim() ||
        first.phone !== (formData.phone?.trim() || '');
      if (hasEssentialChanges) {
        updateFormData({
          signatories: [{ ...first, ...userAsSignatory }, ...currentSignatories.slice(1)],
          isSignatory: true
        });
      }
    }
  }, [formData.firstName, formData.lastName, formData.email, formData.phone, formData.address]);

  // Load signatories from formData and update whenever formData.signatories changes
  useEffect(() => {
    if (formData.signatories && Array.isArray(formData.signatories)) {
      // Update local state with formData.signatories
      // Use JSON.stringify to detect deep changes, but only update if different
      const currentStr = JSON.stringify(signatories.map(s => ({ id: s.id, firstName: s.firstName, lastName: s.lastName, email: s.email })));
      const newStr = JSON.stringify(formData.signatories.map(s => ({ id: s.id, firstName: s.firstName, lastName: s.lastName, email: s.email })));
      
      if (currentStr !== newStr) {
        setSignatories(formData.signatories);
      }
    } else if (!formData.signatories || formData.signatories.length === 0) {
      // Only clear if we have signatories locally but formData is empty
      if (signatories.length > 0) {
        setSignatories([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.signatories]);

  // Load Google Maps API for address autocomplete
  useEffect(() => {
    if (googleMapsLoaded.current) return;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('Google Maps API key not configured, address autocomplete will not work');
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      googleMapsLoaded.current = true;
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup script if component unmounts
      const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  const initAutocomplete = (inputId, signatoryIndex) => {
    const input = document.getElementById(inputId);
    if (!input || autocompleteInstances[inputId]) return;

    const autocomplete = new window.google.maps.places.Autocomplete(input, {
      types: ['address']
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        updateSignatoryField(signatoryIndex, 'postalAddress', place.formatted_address);
      }
    });

    setAutocompleteInstances(prev => ({
      ...prev,
      [inputId]: autocomplete
    }));
  };

  const updateSignatoryField = (signatoryIndex, field, value) => {
    const updated = [...signatories];
    if (!updated[signatoryIndex]) {
      updated[signatoryIndex] = { 
        id: Date.now() + signatoryIndex,
        firstName: '',
        lastName: '',
        birthDate: '',
        birthCity: '',
        postalAddress: '',
        email: '',
        phone: ''
      };
    }
    updated[signatoryIndex][field] = value;
    setSignatories(updated);
    
    // Validate phone number in real-time
    if (field === 'phone') {
      const errorKey = signatoryIndex;
      if (value && value.length > 3) {
        if (!isValidPhoneNumber(value)) {
          setPhoneErrors(prev => ({ ...prev, [errorKey]: t('form.steps.signatories.validationPhoneInvalid') }));
        } else {
          setPhoneErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[errorKey];
            return newErrors;
          });
        }
      } else if (value === '' || !value) {
        setPhoneErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[errorKey];
          return newErrors;
        });
      }
    }
    
    // Validate email in real-time
    if (field === 'email') {
      const errorKey = signatoryIndex;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && value.trim()) {
        if (!emailRegex.test(value.trim())) {
setEmailErrors(prev => ({ ...prev, [errorKey]: t('form.steps.signatories.validationEmailInvalid') }));
        } else {
          setEmailErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[errorKey];
            return newErrors;
          });
        }
      } else if (value === '' || !value) {
        setEmailErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[errorKey];
          return newErrors;
        });
      }
    }
    
    // Update formData immediately to keep validation in sync
    updateFormData({ signatories: updated });
  };

  const addSignatory = () => {
    const updated = [...signatories];
    const newSignatory = {
      id: Date.now(),
      firstName: '',
      lastName: '',
      birthDate: '',
      birthCity: '',
      postalAddress: '',
      email: '',
      phone: '',
      _isNew: true // Flag to mark as new/temporary
    };
    updated.push(newSignatory);
    setSignatories(updated);
    updateFormData({ signatories: updated });
    
    // Set the new signatory to editing mode
    setEditingIndex(updated.length - 1);
  };

  const removeSignatory = (signatoryIndex) => {
    const updated = [...signatories];
    updated.splice(signatoryIndex, 1);
    setSignatories(updated);
    updateFormData({ signatories: updated });
    
    // If removing the one being edited, exit edit mode
    if (editingIndex === signatoryIndex) {
      setEditingIndex(null);
    } else if (editingIndex > signatoryIndex) {
      // Adjust editing index if removing a signatory before the one being edited
      setEditingIndex(editingIndex - 1);
    }
    
    // Clean up errors for removed signatory
    setPhoneErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[signatoryIndex];
      // Shift error keys for signatories after the removed one
      const shiftedErrors = {};
      Object.keys(newErrors).forEach(key => {
        const keyNum = parseInt(key);
        if (keyNum > signatoryIndex) {
          shiftedErrors[keyNum - 1] = newErrors[key];
        } else if (keyNum < signatoryIndex) {
          shiftedErrors[keyNum] = newErrors[key];
        }
      });
      return shiftedErrors;
    });
    
    setEmailErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[signatoryIndex];
      // Shift error keys for signatories after the removed one
      const shiftedErrors = {};
      Object.keys(newErrors).forEach(key => {
        const keyNum = parseInt(key);
        if (keyNum > signatoryIndex) {
          shiftedErrors[keyNum - 1] = newErrors[key];
        } else if (keyNum < signatoryIndex) {
          shiftedErrors[keyNum] = newErrors[key];
        }
      });
      return shiftedErrors;
    });
  };

  const validate = () => {
    // Use formData.signatories for validation to ensure consistency
    const signatoriesToValidate = formData.signatories || signatories;
    
    // Check that there is at least one signatory
    if (!signatoriesToValidate || !Array.isArray(signatoriesToValidate) || signatoriesToValidate.length === 0) {
      console.log('❌ [VALIDATION] No signatories');
      return false;
    }
    
    // Check that all signatories have required fields filled
    for (let i = 0; i < signatoriesToValidate.length; i++) {
      const signatory = signatoriesToValidate[i];
      if (!signatory) {
        console.log(`❌ [VALIDATION] Signatory ${i} is null/undefined`);
        return false;
      }
      const firstName = signatory.firstName?.trim();
      const lastName = signatory.lastName?.trim();
      const email = signatory.email?.trim();
      const phone = signatory.phone?.trim();
      
      if (!firstName || !lastName || !email || !phone) {
        console.log(`❌ [VALIDATION] Signatory ${i} missing fields:`, {
          firstName: !!firstName,
          lastName: !!lastName,
          email: !!email,
          phone: !!phone
        });
        return false;
      }
      
      // Validate phone number
      if (!isValidPhoneNumber(phone)) {
        console.log(`❌ [VALIDATION] Signatory ${i} has invalid phone:`, phone);
        return false;
      }
    }
    
    console.log('✅ [VALIDATION] All signatories are valid');
    return true;
  };

  const handleNext = () => {
    if (validate()) {
      // Track signatories completed before continuing
      if (formData.signatories && formData.signatories.length > 0) {
        trackSignatoriesAdded(formData.signatories.length);
      }
      nextStep();
    } else if (handleContinueClick) {
      handleContinueClick();
    }
  };

  // Memoize validation result to avoid unnecessary re-renders
  const isValid = useMemo(() => {
    return validate();
  }, [signatories, formData.signatories]);

  // Get initials from name
  const getInitials = (firstName, lastName) => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return (first + last) || '?';
  };

  return (
    <>
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 md:pt-8 pb-32 sm:pb-36 md:pb-6 lg:pb-6" style={{ minHeight: 0 }}>
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
          <div>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">
              {t('form.steps.signatories.title')}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              {t('form.steps.signatories.subtitle')}
              {signatories.length > 1 && (
                <span className="block mt-1">
                  {t('form.steps.signatories.firstSignatoryIncluded')} {formatPriceSync(45, 'EUR')}.
                </span>
              )}
            </p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {/* Signatories list - Card view */}
            {signatories.length > 0 && (
              signatories.map((signatory, signatoryIndex) => {
                // Don't show signatories that are new and not being edited (empty signatories)
                if (signatory._isNew && editingIndex !== signatoryIndex) {
                  return null;
                }
                
                return editingIndex === signatoryIndex ? (
                  // Edit mode - show form
                  <div
                    key={signatory.id || signatoryIndex}
                    className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                        {t('form.steps.signatories.editSignatory')} {signatoryIndex + 1}
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          // If it's a new signatory, remove it when canceling
                          if (signatory._isNew) {
                            removeSignatory(signatoryIndex);
                          }
                          setEditingIndex(null);
                        }}
                        className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                        aria-label="Cancel editing"
                      >
                        <Icon icon="heroicons:x-mark" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                          {t('form.steps.signatories.firstName')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={signatory.firstName || ''}
                          onChange={(e) => updateSignatoryField(signatoryIndex, 'firstName', e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm placeholder:text-gray-400 placeholder:italic"
                          placeholder="John"
                        />
                      </div>

                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                          {t('form.steps.signatories.lastName')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={signatory.lastName || ''}
                          onChange={(e) => updateSignatoryField(signatoryIndex, 'lastName', e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm placeholder:text-gray-400 placeholder:italic"
                          placeholder="Doe"
                        />
                      </div>

                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                          {t('form.steps.signatories.email')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={signatory.email || ''}
                          onChange={(e) => updateSignatoryField(signatoryIndex, 'email', e.target.value)}
                          className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white border rounded-lg focus:ring-2 text-sm placeholder:text-gray-400 placeholder:italic ${
                            emailErrors[signatoryIndex] 
                              ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                              : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                          }`}
                          placeholder={t('form.steps.signatories.placeholderEmail')}
                        />
                        {emailErrors[signatoryIndex] && (
                          <p className="mt-1 text-xs text-red-600 flex items-center">
                            <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                            <span>{emailErrors[signatoryIndex]}</span>
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                          {t('form.steps.signatories.phone')} <span className="text-red-500">*</span>
                        </label>
                        <div className={`flex items-center bg-white border ${
                          phoneErrors[signatoryIndex] ? 'border-red-500' : 'border-gray-300'
                        } rounded-lg overflow-hidden transition-all focus-within:ring-2 ${
                          phoneErrors[signatoryIndex] ? 'focus-within:ring-red-500 focus-within:border-red-500' : 'focus-within:ring-indigo-500'
                        } pl-2 sm:pl-3 pr-2 sm:pr-3`}>
                          <PhoneInput
                            international
                            defaultCountry="US"
                            value={signatory.phone || ''}
                            onChange={(value) => updateSignatoryField(signatoryIndex, 'phone', value || '')}
                            className="phone-input-integrated w-full flex text-sm"
                            countrySelectProps={{
                              className: "pr-1 sm:pr-2 py-2 sm:py-2.5 border-0 outline-none bg-transparent cursor-pointer hover:bg-gray-100 transition-colors rounded-none text-xs sm:text-sm focus:outline-none focus:ring-0"
                            }}
                            numberInputProps={{
                              className: "flex-1 pl-1 sm:pl-2 py-2 sm:py-2.5 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-sm"
                            }}
                          />
                        </div>
                        {phoneErrors[signatoryIndex] && (
                          <p className="mt-1 text-xs text-red-600 flex items-center">
                            <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                            <span>{phoneErrors[signatoryIndex]}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 sm:mt-6 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          // Check if signatory has at least some basic info
                          const hasBasicInfo = signatory.firstName?.trim() || 
                                             signatory.lastName?.trim() || 
                                             signatory.email?.trim();
                          
                          if (hasBasicInfo) {
                            // Remove the _isNew flag when saving
                            const updated = [...signatories];
                            if (updated[signatoryIndex]) {
                              delete updated[signatoryIndex]._isNew;
                              setSignatories(updated);
                              updateFormData({ signatories: updated });
                              
                              // Track signatory added in analytics only when actually saved
                              if (signatory._isNew) {
                                trackSignatoriesAdded(updated.length);
                              }
                            }
                            setEditingIndex(null);
                          } else {
                            // If no basic info, remove the signatory
                            if (signatory._isNew) {
                              removeSignatory(signatoryIndex);
                            }
                            setEditingIndex(null);
                          }
                        }}
                        className="px-4 sm:px-6 py-2 sm:py-2.5 bg-black text-white font-medium rounded-lg transition-colors hover:bg-gray-800 text-sm flex items-center gap-2"
                      >
                        <Icon icon="heroicons:check" className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>{t('form.steps.signatories.saveChanges')}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode - show card
                  <div
                    key={signatory.id || signatoryIndex}
                    className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                        {/* Avatar circle with initials */}
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-semibold text-sm sm:text-base">
                            {getInitials(signatory.firstName, signatory.lastName)}
                          </span>
                        </div>
                        
                        {/* Name and email */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                            {signatory.firstName} {signatory.lastName}
                            {isUserSignatory(signatory) && (
                              <span className="ml-2 text-xs text-gray-500 font-normal">{t('form.steps.signatories.youLabel')}</span>
                            )}
                            {(() => {
                              // Le premier signataire (index 0) est toujours gratuit
                              // Les signataires suivants (index > 0) sont payants
                              if (signatoryIndex === 0) {
                                return null;
                              }
                              
                              // Afficher le prix pour les signataires supplémentaires
                              return (
                                <span className="ml-2 text-xs text-orange-600 font-medium">(+{formatPriceSync(45, 'EUR')})</span>
                              );
                            })()}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600 truncate mt-0.5">
                            {signatory.email || t('form.steps.signatories.noEmail')}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons - hide remove for first signatory (user) */}
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingIndex(signatoryIndex)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          aria-label="Edit signatory"
                        >
                          <Icon icon="heroicons:pencil" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                        </button>
                        {!(signatoryIndex === 0 && isUserSignatory(signatory)) && (
                          <button
                            type="button"
                            onClick={() => removeSignatory(signatoryIndex)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                            aria-label="Remove signatory"
                          >
                            <Icon icon="heroicons:trash" className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }).filter(Boolean)
            )}

            {/* Add signatory card - Hide when adding a new signatory */}
            {!(editingIndex !== null && signatories[editingIndex]?._isNew) && (
              <button
                type="button"
                onClick={addSignatory}
                className="w-full bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left"
              >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                    {t('form.steps.signatories.addSignatory')}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    {signatories.length === 0 
                      ? t('form.steps.signatories.addAnotherSignatory')
                      : `${t('form.steps.signatories.addAnotherSignatory')} (+${formatPriceSync(45, 'EUR')})`
                    }
                  </p>
                </div>
                <Icon icon="heroicons:plus" className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 flex-shrink-0" />
              </div>
            </button>
            )}

            {/* No signatories message - shown below the add button */}
            {signatories.length === 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-600">{t('form.steps.signatories.noSignatoriesYet')}</p>
              </div>
            )}
          </div>

          {/* Information Block */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl p-4 sm:p-6 flex items-start gap-3 sm:gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <Icon icon="heroicons:information-circle" className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <p className="text-xs sm:text-sm text-blue-900 break-words leading-relaxed">
                {t('form.steps.signatories.infoBlockTextPart1')}
              </p>
              <p className="text-xs sm:text-sm text-blue-900 break-words leading-relaxed">
                {t('form.steps.signatories.infoBlockTextPart2')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Signatories;
