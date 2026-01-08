import { useEffect, useRef, useState } from 'react';

/**
 * AddressAutocomplete Component
 * Uses Google Places Autocomplete API to auto-fill address fields
 * and Google Time Zone API to get precise timezone
 */
const AddressAutocomplete = ({ 
  value, 
  onChange, 
  onAddressSelect,
  placeholder = "Enter address...",
  className = ""
}) => {
  const containerRef = useRef(null);
  const autocompleteElementRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inputValue, setInputValue] = useState(value || '');

  // Sync inputValue with value prop when it changes externally
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value || '');
    }
  }, [value]);

  // Update placeholder when it changes (e.g., language change)
  useEffect(() => {
    if (containerRef.current) {
      const input = containerRef.current.querySelector('input');
      if (input && input.placeholder !== placeholder) {
        input.placeholder = placeholder;
      }
    }
  }, [placeholder]);

  useEffect(() => {
    // Check if API key is configured
    if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
      setError('Google Maps API key not configured. Add VITE_GOOGLE_MAPS_API_KEY to your .env file.');
      return;
    }

    // Load Google Maps script with loading=async parameter
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', initializeAutocomplete);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        // Small delay to ensure everything is ready
        setTimeout(initializeAutocomplete, 200);
      };
      script.onerror = () => {
        setError('Failed to load Google Maps API. Please check your API key and ensure Places API and Time Zone API are enabled.');
        setIsLoading(false);
      };
      document.head.appendChild(script);
    } else {
      // Google Maps already loaded, initialize immediately
      setTimeout(initializeAutocomplete, 200);
    }

    return () => {
      if (autocompleteElementRef.current) {
        // Cleanup if needed
      }
    };
  }, [placeholder]);

  const initializeAutocomplete = () => {
    if (!containerRef.current || !window.google?.maps?.places) {
      // If container is not ready yet, try again after a short delay
      setTimeout(() => {
        if (containerRef.current && window.google?.maps?.places) {
          initializeAutocomplete();
        }
      }, 100);
      return;
    }

    try {
      // Create a regular input element
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = placeholder;
      // Build className with proper border color handling
      const borderColor = className.includes('border-red-500') ? 'border-red-500' : 'border-gray-200';
      const baseClasses = 'w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all text-sm sm:text-base placeholder:text-gray-400 placeholder:italic';
      input.className = `${baseClasses} ${borderColor} ${className.replace('border-red-500', '').trim()}`;
      // Add inline style for placeholder to ensure it's styled correctly
      input.style.setProperty('--placeholder-color', '#9ca3af');
      if (inputValue) {
        input.value = inputValue;
      }
      
      // Add style element for placeholder styling if not already present
      if (!document.getElementById('address-autocomplete-placeholder-style')) {
        const style = document.createElement('style');
        style.id = 'address-autocomplete-placeholder-style';
        style.textContent = `
          .address-autocomplete-input::placeholder {
            color: #9ca3af !important;
            font-style: italic !important;
          }
        `;
        document.head.appendChild(style);
      }
      
      // Add a class to the input for styling
      input.classList.add('address-autocomplete-input');

      // Clear container and add the input
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(input);

      // Use Autocomplete API (stable and well-documented)
      const autocomplete = new window.google.maps.places.Autocomplete(input, {
        types: ['address'],
        fields: ['address_components', 'geometry', 'formatted_address', 'place_id']
      });

      // Listen to input changes - this allows free typing
      input.addEventListener('input', (e) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        if (onChange) {
          onChange(newValue);
        }
      });

      // Listen to place selection from autocomplete
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        
        if (!place.geometry || !place.address_components) {
          setError('No address details available for this place.');
          return;
        }

        // Show loader only when fetching timezone
        setIsLoading(true);

        // Extract address components
        const addressData = {
          formatted_address: place.formatted_address,
          address: '',
          city: '',
          postal_code: '',
          country: '',
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng()
        };

        // Parse address components
        place.address_components.forEach(component => {
          const types = component.types;
          
          // Parse street address (street_number and route)
          if (types.includes('street_number')) {
            addressData.address = component.long_name;
          } else if (types.includes('route')) {
            if (addressData.address) {
              addressData.address += ' ' + component.long_name;
            } else {
              addressData.address = component.long_name;
            }
          }
          // Parse city - check multiple possible types
          else if (types.includes('locality')) {
            addressData.city = component.long_name;
          } else if (types.includes('sublocality') && !addressData.city) {
            // Use sublocality if locality is not available
            addressData.city = component.long_name;
          } else if (types.includes('administrative_area_level_2') && !addressData.city) {
            // Fallback to administrative_area_level_2 if needed
            addressData.city = component.long_name;
          }
          // Parse postal code
          else if (types.includes('postal_code')) {
            addressData.postal_code = component.long_name;
          }
          // Parse country
          else if (types.includes('country')) {
            addressData.country = component.long_name;
          }
        });

        // Update input value with full formatted address
        const formattedAddress = place.formatted_address || addressData.address || '';
        setInputValue(formattedAddress);
        input.value = formattedAddress;
        if (onChange) {
          onChange(formattedAddress);
        }
        
        // Store the full formatted address in addressData
        addressData.address = formattedAddress;

        // Get timezone from Google Time Zone API
        getTimezoneFromCoordinates(addressData.latitude, addressData.longitude)
          .then(timezone => {
            addressData.timezone = timezone;
            setError(null);
            setIsLoading(false);
            if (onAddressSelect) {
              onAddressSelect(addressData);
            }
          })
          .catch(err => {
            console.error('Error getting timezone:', err);
            setError('Address selected but could not determine timezone. Please set it manually.');
            setIsLoading(false);
            if (onAddressSelect) {
              onAddressSelect(addressData);
            }
          });
      });

      autocompleteElementRef.current = autocomplete;

      setIsLoading(false);
    } catch (err) {
      console.error('Error initializing autocomplete:', err);
      setError(`Failed to initialize address autocomplete: ${err.message}. Please ensure Places API is enabled in Google Cloud Console.`);
      setIsLoading(false);
    }
  };

  /**
   * Get timezone from Google Time Zone API using coordinates
   */
  const getTimezoneFromCoordinates = async (latitude, longitude) => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const url = `https://maps.googleapis.com/maps/api/timezone/json?location=${latitude},${longitude}&timestamp=${timestamp}&key=${apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.timeZoneId) {
        return data.timeZoneId; // Returns IANA timezone identifier (e.g., "America/New_York")
      } else {
        throw new Error(data.errorMessage || 'Failed to get timezone');
      }
    } catch (err) {
      console.error('Error fetching timezone:', err);
      throw err;
    }
  };

  return (
    <div className="relative">
      <div 
        ref={containerRef}
        className={`w-full ${className}`}
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
        </div>
      )}
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
};

export default AddressAutocomplete;

