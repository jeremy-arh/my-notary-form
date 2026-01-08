import { useState, useEffect } from 'react';

export const useLocalStorage = (key, initialValue) => {
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

  // Update localStorage whenever the value changes
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  }, [key, storedValue]);

  // Listen for storage events (e.g., when returning from external pages)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = JSON.parse(e.newValue);
          setStoredValue(newValue);
        } catch (error) {
          console.error(`Error parsing storage value for ${key}:`, error);
        }
      }
    };

    // Listen for storage events (works when localStorage changes from same origin)
    window.addEventListener('storage', handleStorageChange);
    
    // Also check localStorage directly on focus (for when returning from external pages)
    const handleFocus = () => {
      try {
        const item = window.localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          const currentStr = JSON.stringify(storedValue);
          const newStr = JSON.stringify(parsed);
          if (currentStr !== newStr) {
            setStoredValue(parsed);
          }
        }
      } catch (error) {
        console.error(`Error checking localStorage for ${key} on focus:`, error);
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
};
