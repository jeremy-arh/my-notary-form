"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const storageErrorListeners: ((error: { type: string; message: string; key: string }) => void)[] = [];

export const onStorageError = (callback: (error: { type: string; message: string; key: string }) => void) => {
  storageErrorListeners.push(callback);
  return () => {
    const index = storageErrorListeners.indexOf(callback);
    if (index > -1) storageErrorListeners.splice(index, 1);
  };
};

const emitStorageError = (error: { type: string; message: string; key: string }) => {
  storageErrorListeners.forEach((cb) => cb(error));
};

function readFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const item = window.localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  // Ref initialized synchronously from localStorage so setValue always
  // has the correct "prev" even before the loading useEffect fires.
  const valueRef = useRef<T>(readFromStorage(key, initialValue));

  useEffect(() => {
    const loaded = readFromStorage(key, initialValue);
    valueRef.current = loaded;
    setStoredValue(loaded);
    setIsLoaded(true);
  }, [key]);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    const prev = valueRef.current;
    const next = value instanceof Function ? value(prev) : value;
    valueRef.current = next;
    setStoredValue(next);
    try {
      if (typeof window !== "undefined") {
        const serialized = JSON.stringify(next);
        const sizeInMB = new Blob([serialized]).size / (1024 * 1024);
        if (sizeInMB > 4) {
          console.warn(`[LocalStorage] Data for "${key}" is ${sizeInMB.toFixed(2)}MB`);
        }
        window.localStorage.setItem(key, serialized);
      }
    } catch (error) {
      const err = error as { name?: string; code?: number };
      if (err.name === "QuotaExceededError" || err.code === 22 || err.code === 1014) {
        emitStorageError({ type: "quota_exceeded", message: "Storage quota exceeded", key });
      } else {
        emitStorageError({ type: "save_error", message: (error as Error).message, key });
      }
    }
  }, [key]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const parsed = JSON.parse(e.newValue) as T;
          valueRef.current = parsed;
          setStoredValue(parsed);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key]);

  return [storedValue, setValue, isLoaded];
}
