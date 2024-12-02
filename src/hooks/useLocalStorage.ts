import { useState, useCallback } from 'react';

type SetValue<T> = (value: T | ((prev: T) => T)) => void;

interface StorageError extends Error {
  key: string;
  operation: 'read' | 'write';
}

/**
 * Hook to handle localStorage with type safety and error handling
 * @template T The type of the stored value
 * @param {string} key The localStorage key
 * @param {T} initialValue The initial value if no value exists in localStorage
 * @returns {[T, SetValue<T>, StorageError | null]} Tuple of [storedValue, setValue, error]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, SetValue<T>, StorageError | null] {
  // State to store our value and any errors
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      const storageError: StorageError = {
        name: 'StorageError',
        message: `Error reading localStorage key "${key}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        key,
        operation: 'read'
      };
      console.warn(storageError);
      return initialValue;
    }
  });

  const [error, setError] = useState<StorageError | null>(null);

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue: SetValue<T> = useCallback((value: T | ((prev: T) => T)) => {
    try {
      setError(null);
      // Allow value to be a function for same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      const storageError: StorageError = {
        name: 'StorageError',
        message: `Error setting localStorage key "${key}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        key,
        operation: 'write'
      };
      console.warn(storageError);
      setError(storageError);
    }
  }, [key, storedValue]);

  return [storedValue, setValue, error];
} 