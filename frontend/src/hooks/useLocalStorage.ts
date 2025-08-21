import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseLocalStorageOptions<T> {
  defaultValue?: T;
  serializer?: {
    stringify: (value: T) => string;
    parse: (value: string) => T;
  };
  syncAcrossTabs?: boolean;
  onError?: (error: Error) => void;
}

export interface LocalStorageState<T> {
  value: T;
  loading: boolean;
  error: string | null;
}

// Default serializer using JSON
const defaultSerializer = {
  stringify: JSON.stringify,
  parse: JSON.parse
};

// Custom error types
export class LocalStorageError extends Error {
  public readonly cause?: Error;
  
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'LocalStorageError';
    this.cause = cause;
  }
}

export const useLocalStorage = <T>(
  key: string,
  options: UseLocalStorageOptions<T> = {}
) => {
  const {
    defaultValue,
    serializer = defaultSerializer,
    syncAcrossTabs = true,
    onError
  } = options;

  // Refs for stable references
  const keyRef = useRef(key);
  const defaultValueRef = useRef(defaultValue);
  const serializerRef = useRef(serializer);
  const syncAcrossTabsRef = useRef(syncAcrossTabs);
  const onErrorRef = useRef(onError);
  const isMounted = useRef(true);

  // Update refs when options change
  useEffect(() => {
    keyRef.current = key;
    defaultValueRef.current = defaultValue;
    serializerRef.current = serializer;
    syncAcrossTabsRef.current = syncAcrossTabs;
    onErrorRef.current = onError;
  }, [key, defaultValue, serializer, syncAcrossTabs, onError]);

  // State management
  const [state, setState] = useState<LocalStorageState<T>>({
    value: defaultValue as T,
    loading: true,
    error: null
  });

  // Check if localStorage is available
  const isLocalStorageAvailable = useCallback((): boolean => {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Read value from localStorage
  const readValue = useCallback((): T => {
    try {
      if (!isLocalStorageAvailable()) {
        throw new Error('localStorage is not available');
      }

      const item = localStorage.getItem(keyRef.current);
      
      if (item === null) {
        return defaultValueRef.current as T;
      }

      return serializerRef.current.parse(item);
    } catch (error) {
      const localStorageError = new LocalStorageError(
        `Failed to read from localStorage key "${keyRef.current}": ${(error as Error).message}`,
        error as Error
      );
      
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          error: localStorageError.message,
          loading: false
        }));
        
        if (onErrorRef.current) {
          onErrorRef.current(localStorageError);
        }
      }
      
      return defaultValueRef.current as T;
    }
  }, [isLocalStorageAvailable]);

  // Write value to localStorage
  const writeValue = useCallback((value: T): void => {
    try {
      if (!isLocalStorageAvailable()) {
        throw new Error('localStorage is not available');
      }

      if (value === undefined) {
        localStorage.removeItem(keyRef.current);
      } else {
        localStorage.setItem(keyRef.current, serializerRef.current.stringify(value));
      }

      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          value,
          error: null
        }));
      }
    } catch (error) {
      const localStorageError = new LocalStorageError(
        `Failed to write to localStorage key "${keyRef.current}": ${(error as Error).message}`,
        error as Error
      );
      
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          error: localStorageError.message
        }));
        
        if (onErrorRef.current) {
          onErrorRef.current(localStorageError);
        }
      }
    }
  }, [isLocalStorageAvailable]);

  // Remove value from localStorage
  const removeValue = useCallback((): void => {
    try {
      if (!isLocalStorageAvailable()) {
        throw new Error('localStorage is not available');
      }

      localStorage.removeItem(keyRef.current);
      
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          value: defaultValueRef.current as T,
          error: null
        }));
      }
    } catch (error) {
      const localStorageError = new LocalStorageError(
        `Failed to remove from localStorage key "${keyRef.current}": ${(error as Error).message}`,
        error as Error
      );
      
      if (onErrorRef.current) {
        onErrorRef.current(localStorageError);
      }
    }
  }, [isLocalStorageAvailable]);

  // Set value with validation
  const setValue = useCallback((value: T | ((prevValue: T) => T)): void => {
    try {
      const newValue = typeof value === 'function' 
        ? (value as (prevValue: T) => T)(state.value)
        : value;
      
      // Handle undefined values by removing the item
      if (newValue === undefined) {
        localStorage.removeItem(keyRef.current);
        if (isMounted.current) {
          setState(prev => ({
            ...prev,
            value: defaultValueRef.current as T,
            error: null
          }));
        }
      } else {
        writeValue(newValue);
      }
    } catch (error) {
      const localStorageError = new LocalStorageError(
        `Failed to update localStorage key "${keyRef.current}": ${(error as Error).message}`,
        error as Error
      );
      
      if (onErrorRef.current) {
        onErrorRef.current(localStorageError);
      }
    }
  }, [state.value, writeValue]);

  // Get value without subscribing to changes
  const getSnapshot = useCallback((): T => {
    return readValue();
  }, [readValue]);

  // Check if key exists in localStorage
  const hasValue = useCallback((): boolean => {
    try {
      if (!isLocalStorageAvailable()) return false;
      return localStorage.getItem(keyRef.current) !== null;
    } catch {
      return false;
    }
  }, [isLocalStorageAvailable]);

  // Get the size of the stored value in bytes
  const getSize = useCallback((): number => {
    try {
      if (!isLocalStorageAvailable()) return 0;
      
      const item = localStorage.getItem(keyRef.current);
      return item ? new Blob([item]).size : 0;
    } catch {
      return 0;
    }
  }, [isLocalStorageAvailable]);

  // Handle storage events (for cross-tab synchronization)
  const handleStorageChange = useCallback((e: StorageEvent) => {
    if (e.key === keyRef.current) {
      if (isMounted.current) {
        try {
          const newValue = e.newValue === null 
            ? defaultValueRef.current as T 
            : serializerRef.current.parse(e.newValue);
          
          setState(prev => ({
            ...prev,
            value: newValue,
            error: null
          }));
        } catch (error) {
          const localStorageError = new LocalStorageError(
            `Failed to sync from storage event for key "${keyRef.current}": ${(error as Error).message}`,
            error as Error
          );
          
          if (onErrorRef.current) {
            onErrorRef.current(localStorageError);
          }
        }
      }
    }
  }, []);

  // Initialize and set up storage event listener
  useEffect(() => {
    isMounted.current = true;

    // Read initial value and handle errors
    try {
      if (!isLocalStorageAvailable()) {
        throw new Error('localStorage is not available');
      }

      const item = localStorage.getItem(keyRef.current);
      
      if (item === null) {
        setState({
          value: defaultValueRef.current as T,
          loading: false,
          error: null
        });
      } else {
        const parsedValue = serializerRef.current.parse(item);
        setState({
          value: parsedValue,
          loading: false,
          error: null
        });
      }
    } catch (error) {
      const localStorageError = new LocalStorageError(
        `Failed to read from localStorage key "${keyRef.current}": ${(error as Error).message}`,
        error as Error
      );
      
      setState({
        value: defaultValueRef.current as T,
        loading: false,
        error: localStorageError.message
      });
      
      if (onErrorRef.current) {
        onErrorRef.current(localStorageError);
      }
    }

    // Set up cross-tab synchronization
    if (syncAcrossTabsRef.current) {
      window.addEventListener('storage', handleStorageChange);
    }

    // Cleanup function
    return () => {
      isMounted.current = false;
      if (syncAcrossTabsRef.current) {
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, [key, isLocalStorageAvailable]); // Include isLocalStorageAvailable

  return {
    // State
    value: state.value,
    loading: state.loading,
    error: state.error,
    
    // Actions
    setValue,
    removeValue,
    
    // Utilities
    getSnapshot,
    hasValue,
    getSize,
    isAvailable: isLocalStorageAvailable(),
    
    // Advanced
    refresh: () => {
      const newValue = readValue();
      setState(prev => ({
        ...prev,
        value: newValue,
        error: null
      }));
    }
  };
};

export default useLocalStorage;
