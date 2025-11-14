import { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '@iconify/react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

const Signatories = ({ formData, updateFormData, nextStep, prevStep }) => {
  const [signatoriesByDocument, setSignatoriesByDocument] = useState({});
  const [autocompleteInstances, setAutocompleteInstances] = useState({});
  const [phoneErrors, setPhoneErrors] = useState({}); // Store phone errors by docKey_signatoryIndex
  const [emailErrors, setEmailErrors] = useState({}); // Store email errors by docKey_signatoryIndex
  const autocompleteRefs = useRef({});
  const googleMapsLoaded = useRef(false);

  // Load signatories from formData
  useEffect(() => {
    if (formData.signatoriesByDocument && Object.keys(formData.signatoriesByDocument).length > 0) {
      setSignatoriesByDocument(formData.signatoriesByDocument);
    } else {
      // Initialize with first signatory for each document
      const initialSignatories = {};
      if (formData.serviceDocuments) {
        Object.entries(formData.serviceDocuments).forEach(([serviceId, documents]) => {
          documents.forEach((doc, docIndex) => {
            const docKey = `${serviceId}_${docIndex}`;
            initialSignatories[docKey] = [
              {
                id: Date.now() + docIndex,
                firstName: '',
                lastName: '',
                birthDate: '',
                birthCity: '',
                postalAddress: '',
                email: '',
                phone: ''
              }
            ];
          });
        });
      }
      if (Object.keys(initialSignatories).length > 0) {
        setSignatoriesByDocument(initialSignatories);
        updateFormData({ signatoriesByDocument: initialSignatories });
      }
    }
  }, [formData.serviceDocuments]);

  // Sync local state with formData when formData changes externally
  useEffect(() => {
    if (formData.signatoriesByDocument && Object.keys(formData.signatoriesByDocument).length > 0) {
      // Only update if formData has more recent data (check by comparing keys)
      const formDataKeys = Object.keys(formData.signatoriesByDocument).sort().join(',');
      const localKeys = Object.keys(signatoriesByDocument).sort().join(',');
      if (formDataKeys !== localKeys) {
        setSignatoriesByDocument(formData.signatoriesByDocument);
      }
    }
  }, [formData.signatoriesByDocument]);

  // Load Google Maps Places API
  useEffect(() => {
    if (googleMapsLoaded.current) return;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      googleMapsLoaded.current = true;
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Initialize Google Places Autocomplete for an input
  const initAutocomplete = (inputId, docKey, signatoryIndex) => {
    if (!googleMapsLoaded.current || !window.google) return;

    const input = document.getElementById(inputId);
    if (!input || autocompleteInstances[inputId]) return;

    const autocomplete = new window.google.maps.places.Autocomplete(input, {
      types: ['address']
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        updateSignatoryField(docKey, signatoryIndex, 'postalAddress', place.formatted_address);
      }
    });

    setAutocompleteInstances(prev => ({
      ...prev,
      [inputId]: autocomplete
    }));
  };

  const updateSignatoryField = (docKey, signatoryIndex, field, value) => {
    const updated = { ...signatoriesByDocument };
    if (!updated[docKey]) {
      updated[docKey] = [];
    }
    if (!updated[docKey][signatoryIndex]) {
      updated[docKey][signatoryIndex] = { 
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
    updated[docKey][signatoryIndex][field] = value;
    setSignatoriesByDocument(updated);
    
    // Validate phone number in real-time
    if (field === 'phone') {
      const errorKey = `${docKey}_${signatoryIndex}`;
      if (value && value.length > 3) {
        if (!isValidPhoneNumber(value)) {
          setPhoneErrors(prev => ({ ...prev, [errorKey]: 'Please enter a valid phone number' }));
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
      const errorKey = `${docKey}_${signatoryIndex}`;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && value.trim()) {
        if (!emailRegex.test(value.trim())) {
          setEmailErrors(prev => ({ ...prev, [errorKey]: 'Please enter a valid email address' }));
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
    updateFormData({ signatoriesByDocument: updated });
  };

  const addSignatory = (docKey) => {
    const updated = { ...signatoriesByDocument };
    if (!updated[docKey]) {
      updated[docKey] = [];
    }
    updated[docKey].push({
      id: Date.now(),
      firstName: '',
      lastName: '',
      birthDate: '',
      birthCity: '',
      postalAddress: '',
      email: '',
      phone: ''
    });
    setSignatoriesByDocument(updated);
    updateFormData({ signatoriesByDocument: updated });
  };

  const removeSignatory = (docKey, signatoryIndex) => {
    const updated = { ...signatoriesByDocument };
    if (updated[docKey] && updated[docKey].length > 1) {
      updated[docKey].splice(signatoryIndex, 1);
      setSignatoriesByDocument(updated);
      updateFormData({ signatoriesByDocument: updated });
    }
  };

  const getDocumentName = (serviceId, docIndex) => {
    const documents = formData.serviceDocuments?.[serviceId] || [];
    return documents[docIndex]?.name || `Document ${docIndex + 1}`;
  };

  const getServiceName = (serviceId) => {
    // This will be fetched from services if needed
    return `Service ${serviceId.substring(0, 8)}`;
  };

  const validate = () => {
    // Use formData.signatoriesByDocument for validation to ensure consistency
    const signatoriesToValidate = formData.signatoriesByDocument || signatoriesByDocument;
    
    // Check that all documents have signatories
    if (!formData.serviceDocuments) {
      console.log('❌ [VALIDATION] No serviceDocuments');
      return false;
    }
    
    // First, ensure that every document has at least one signatory
    for (const [serviceId, documents] of Object.entries(formData.serviceDocuments)) {
      for (let docIndex = 0; docIndex < documents.length; docIndex++) {
        const docKey = `${serviceId}_${docIndex}`;
        const signatories = signatoriesToValidate[docKey];
        if (!signatories || !Array.isArray(signatories) || signatories.length === 0) {
          console.log(`❌ [VALIDATION] Document ${docKey} has no signatories`);
          return false;
        }
      }
    }
    
    // Then check that all signatories have required fields filled
    for (const [docKey, signatories] of Object.entries(signatoriesToValidate)) {
      if (!Array.isArray(signatories)) continue;
      for (let i = 0; i < signatories.length; i++) {
        const signatory = signatories[i];
        if (!signatory) {
          console.log(`❌ [VALIDATION] Signatory ${i} in ${docKey} is null/undefined`);
          return false;
        }
        const firstName = signatory.firstName?.trim();
        const lastName = signatory.lastName?.trim();
        const birthDate = signatory.birthDate?.trim();
        const birthCity = signatory.birthCity?.trim();
        const postalAddress = signatory.postalAddress?.trim();
        const email = signatory.email?.trim();
        const phone = signatory.phone?.trim();
        
        if (!firstName || !lastName || !birthDate || !birthCity || !postalAddress || !email || !phone) {
          console.log(`❌ [VALIDATION] Signatory ${i} in ${docKey} missing fields:`, {
            firstName: !!firstName,
            lastName: !!lastName,
            birthDate: !!birthDate,
            birthCity: !!birthCity,
            postalAddress: !!postalAddress,
            email: !!email,
            phone: !!phone,
            signatory
          });
          return false;
        }
        
        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          console.log(`❌ [VALIDATION] Signatory ${i} in ${docKey} has invalid email:`, email);
          return false;
        }
        
        // Validate phone number
        if (!isValidPhoneNumber(phone)) {
          console.log(`❌ [VALIDATION] Signatory ${i} in ${docKey} has invalid phone:`, phone);
          return false;
        }
      }
    }
    
    console.log('✅ [VALIDATION] All signatories are valid');
    return true;
  };

  const handleNext = () => {
    if (validate()) {
      nextStep();
    }
  };

  // Get all documents with their signatories
  const getAllDocuments = () => {
    const documents = [];
    if (formData.serviceDocuments) {
      Object.entries(formData.serviceDocuments).forEach(([serviceId, docs]) => {
        docs.forEach((doc, docIndex) => {
          const docKey = `${serviceId}_${docIndex}`;
          documents.push({
            serviceId,
            docIndex,
            docKey,
            document: doc,
            signatories: signatoriesByDocument[docKey] || []
          });
        });
      });
    }
    return documents;
  };

  const documents = getAllDocuments();

  // Memoize validation result to avoid unnecessary re-renders
  const isValid = useMemo(() => {
    return validate();
  }, [signatoriesByDocument, formData.signatoriesByDocument, formData.serviceDocuments]);

  return (
    <div className="h-full w-full flex flex-col relative">
      {/* Header */}
      <div className="flex-shrink-0 px-3 sm:px-4 pt-4 sm:pt-6 md:pt-10 pb-3 sm:pb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
          Add Signatories
        </h2>
        <p className="text-sm sm:text-base text-gray-600">
          For each document, add signatory information. The first signatory is included, each additional signatory costs $10.
        </p>
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 px-3 sm:px-4 pb-32 sm:pb-36 lg:pb-24 overflow-x-hidden" style={{ minHeight: 0 }}>
        {documents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No documents uploaded. Please go back to the previous step.</p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {documents.map(({ docKey, document, signatories }) => (
              <div
                key={docKey}
                className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200"
              >
                <div className="flex items-start space-x-3 sm:space-x-4 mb-4 sm:mb-6">
                  <div className="p-2 sm:p-3 bg-gray-100 rounded-lg sm:rounded-xl flex-shrink-0">
                    <Icon
                      icon="heroicons:document-text"
                      className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base text-gray-900 break-words">
                      {document.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      {signatories.length} signatory{signatories.length > 1 ? 'ies' : ''}
                      {signatories.length > 1 && (
                        <span className="ml-2 text-gray-500">
                          (+${((signatories.length - 1) * 10).toFixed(2)})
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  {signatories.map((signatory, signatoryIndex) => (
                    <div
                      key={signatory.id || signatoryIndex}
                      className="border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <h4 className="text-xs sm:text-sm font-semibold text-gray-900">
                          Signatory {signatoryIndex + 1}
                          {signatoryIndex === 0 && (
                            <span className="ml-2 text-xs text-gray-500">(included)</span>
                          )}
                          {signatoryIndex > 0 && (
                            <span className="ml-2 text-xs text-orange-600 font-medium">(+$10)</span>
                          )}
                        </h4>
                        {signatoryIndex > 0 && (
                          <button
                            type="button"
                            onClick={() => removeSignatory(docKey, signatoryIndex)}
                            className="p-1.5 sm:p-2 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                            aria-label="Remove signatory"
                          >
                            <Icon icon="heroicons:trash" className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                            First Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={signatory.firstName || ''}
                            onChange={(e) => updateSignatoryField(docKey, signatoryIndex, 'firstName', e.target.value)}
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            placeholder="First Name"
                          />
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                            Last Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={signatory.lastName || ''}
                            onChange={(e) => updateSignatoryField(docKey, signatoryIndex, 'lastName', e.target.value)}
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            placeholder="Last Name"
                          />
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                            Date of Birth <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={signatory.birthDate || ''}
                            onChange={(e) => updateSignatoryField(docKey, signatoryIndex, 'birthDate', e.target.value)}
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                            Birth City <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={signatory.birthCity || ''}
                            onChange={(e) => updateSignatoryField(docKey, signatoryIndex, 'birthCity', e.target.value)}
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            placeholder="Birth City"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                            Postal Address <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            id={`address_${docKey}_${signatoryIndex}`}
                            value={signatory.postalAddress || ''}
                            onChange={(e) => {
                              updateSignatoryField(docKey, signatoryIndex, 'postalAddress', e.target.value);
                              // Initialize autocomplete when user starts typing
                              if (googleMapsLoaded.current && window.google && !autocompleteInstances[`address_${docKey}_${signatoryIndex}`]) {
                                setTimeout(() => {
                                  initAutocomplete(`address_${docKey}_${signatoryIndex}`, docKey, signatoryIndex);
                                }, 100);
                              }
                            }}
                            onFocus={() => {
                              if (googleMapsLoaded.current && window.google && !autocompleteInstances[`address_${docKey}_${signatoryIndex}`]) {
                                initAutocomplete(`address_${docKey}_${signatoryIndex}`, docKey, signatoryIndex);
                              }
                            }}
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            placeholder="Start typing an address..."
                          />
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                            Email <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            value={signatory.email || ''}
                            onChange={(e) => updateSignatoryField(docKey, signatoryIndex, 'email', e.target.value)}
                            className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white border rounded-lg focus:ring-2 text-sm ${
                              emailErrors[`${docKey}_${signatoryIndex}`] 
                                ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                                : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                            }`}
                            placeholder="email@example.com"
                          />
                          {emailErrors[`${docKey}_${signatoryIndex}`] && (
                            <p className="mt-1 text-xs text-red-600 flex items-center">
                              <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                              <span>{emailErrors[`${docKey}_${signatoryIndex}`]}</span>
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                            Phone Number <span className="text-red-500">*</span>
                          </label>
                          <div className={`flex items-center bg-white border ${
                            phoneErrors[`${docKey}_${signatoryIndex}`] ? 'border-red-500' : 'border-gray-300'
                          } rounded-lg overflow-hidden transition-all focus-within:ring-2 ${
                            phoneErrors[`${docKey}_${signatoryIndex}`] ? 'focus-within:ring-red-500 focus-within:border-red-500' : 'focus-within:ring-indigo-500'
                          } pl-2 sm:pl-3 pr-2 sm:pr-3`}>
                            <PhoneInput
                              international
                              defaultCountry="US"
                              value={signatory.phone || ''}
                              onChange={(value) => updateSignatoryField(docKey, signatoryIndex, 'phone', value || '')}
                              className="phone-input-integrated w-full flex text-sm"
                              countrySelectProps={{
                                className: "pr-1 sm:pr-2 py-2 sm:py-2.5 border-0 outline-none bg-transparent cursor-pointer hover:bg-gray-100 transition-colors rounded-none text-xs sm:text-sm focus:outline-none focus:ring-0"
                              }}
                              numberInputProps={{
                                className: "flex-1 pl-1 sm:pl-2 py-2 sm:py-2.5 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-sm"
                              }}
                            />
                          </div>
                          {phoneErrors[`${docKey}_${signatoryIndex}`] && (
                            <p className="mt-1 text-xs text-red-600 flex items-center">
                              <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                              <span>{phoneErrors[`${docKey}_${signatoryIndex}`]}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => addSignatory(docKey)}
                  className="mt-4 sm:mt-6 w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Icon icon="heroicons:plus" className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm">Add Additional Signatory (+$10)</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fixed Navigation - Desktop only */}
      <div className="hidden lg:block lg:border-t lg:border-gray-300 bg-[#F3F4F6]">
        <div className="px-4 py-4 flex justify-between">
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
            disabled={!isValid}
            className="btn-glassy px-6 md:px-8 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            onMouseEnter={() => {
              // Debug on hover
              console.log('🔍 [DEBUG] Validation check:', isValid);
              console.log('🔍 [DEBUG] signatoriesByDocument:', signatoriesByDocument);
              console.log('🔍 [DEBUG] formData.signatoriesByDocument:', formData.signatoriesByDocument);
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default Signatories;

