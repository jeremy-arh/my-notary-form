import { useState, useEffect, useRef, useCallback } from 'react';

// Flag to prevent focus restoration from overwriting fresh data
let lastUpdateTimestamp = 0;
const PROTECTION_DELAY = 2000; // 2 seconds protection after an update

// Event emitter for storage errors (to notify components)
const storageErrorListeners = [];
export const onStorageError = (callback) => {
  storageErrorListeners.push(callback);
  return () => {
    const index = storageErrorListeners.indexOf(callback);
    if (index > -1) storageErrorListeners.splice(index, 1);
  };
};
const emitStorageError = (error) => {
  storageErrorListeners.forEach(cb => cb(error));
};

export const useLocalStorage = (key, initialValue) => {
  const isUpdating = useRef(false);
  
  // Get initial value from localStorage or use provided initial value
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      return initialValue;
    }
  });

  // Custom setter that marks updates
  const setValue = useCallback((value) => {
    isUpdating.current = true;
    lastUpdateTimestamp = Date.now();
    setStoredValue(value);
    // Reset flag after a short delay
    setTimeout(() => {
      isUpdating.current = false;
    }, 100);
  }, []);

  // Update localStorage whenever the value changes
  useEffect(() => {
    try {
      const serialized = JSON.stringify(storedValue);
      
      // Check size before saving (localStorage limit is ~5-10MB)
      const sizeInMB = new Blob([serialized]).size / (1024 * 1024);
      
      // Debug logging for notaryFormData
      if (key === 'notaryFormData' && storedValue.serviceDocuments) {
        const docCount = Object.values(storedValue.serviceDocuments).reduce((sum, docs) => sum + (docs?.length || 0), 0);
        console.log(`💾 [LocalStorage] Saving ${key}: ${docCount} documents, size: ${sizeInMB.toFixed(2)}MB`);
      }
      
      if (sizeInMB > 4) {
        console.warn(`⚠️ [LocalStorage] Data for "${key}" is ${sizeInMB.toFixed(2)}MB - approaching localStorage limit!`);
      }
      
      window.localStorage.setItem(key, serialized);
    } catch (error) {
      // Check if it's a quota exceeded error
      if (error.name === 'QuotaExceededError' || error.code === 22 || error.code === 1014) {
        console.error(`❌ [LocalStorage] QUOTA EXCEEDED for "${key}"!`);
        
        // Emit error to notify components
        emitStorageError({
          type: 'quota_exceeded',
          message: 'Storage quota exceeded',
          key
        });
      } else {
        console.error(`Error saving ${key} to localStorage:`, error);
        emitStorageError({
          type: 'save_error',
          message: error.message,
          key
        });
      }
    }
  }, [key, storedValue]);

  // Listen for storage events (e.g., when returning from external pages)
  // BUT: Disable focus restoration as it causes race conditions with uploads
  useEffect(() => {
    const handleStorageChange = (e) => {
      // Only handle changes from OTHER tabs/windows
      if (e.key === key && e.newValue !== null) {
        // Don't restore if we just made an update (protection against race conditions)
        if (Date.now() - lastUpdateTimestamp < PROTECTION_DELAY) {
          console.log(`🛡️ [LocalStorage] Ignoring storage event during protection period for "${key}"`);
          return;
        }
        
        try {
          const newValue = JSON.parse(e.newValue);
          setStoredValue(newValue);
        } catch (error) {
          console.error(`Error parsing storage value for ${key}:`, error);
        }
      }
    };

    // Listen for storage events (works when localStorage changes from OTHER tabs)
    window.addEventListener('storage', handleStorageChange);
    
    // REMOVED: handleFocus was causing race conditions by restoring old data
    // when user clicks on the window after uploading a file.
    // The useLocalStorage hook already handles persistence correctly.

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);

  return [storedValue, setValue];
};
