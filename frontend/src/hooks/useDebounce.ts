import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseDebounceOptions {
  delay?: number;
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
  onDebounceStart?: () => void;
  onDebounceEnd?: () => void;
}

export interface DebounceState<T> {
  value: T;
  isDebouncing: boolean;
  lastUpdate: Date | null;
}

// Default options
const DEFAULT_OPTIONS: Required<UseDebounceOptions> = {
  delay: 500,
  leading: false,
  trailing: true,
  maxWait: 0,
  onDebounceStart: () => {},
  onDebounceEnd: () => {}
};

export const useDebounce = <T>(
  value: T,
  options: UseDebounceOptions = {}
) => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // State management
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Refs for tracking
  const timeoutRef = useRef<NodeJS.Timeout>();
  const maxWaitTimeoutRef = useRef<NodeJS.Timeout>();
  const lastValueRef = useRef<T>(value);
  const isMounted = useRef(true);

  // Update debounced value
  const updateDebouncedValue = useCallback((newValue: T) => {
    if (!isMounted.current) return;

    setDebouncedValue(newValue);
    setIsDebouncing(false);
    setLastUpdate(new Date());
    opts.onDebounceEnd();
  }, [opts]);

  // Debounce function
  const debounce = useCallback((newValue: T) => {
    if (!isMounted.current) return;

    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (maxWaitTimeoutRef.current) {
      clearTimeout(maxWaitTimeoutRef.current);
    }

    // Handle leading edge
    if (opts.leading && !isDebouncing) {
      updateDebouncedValue(newValue);
      setIsDebouncing(true);
      opts.onDebounceStart();
    }

    // Set up trailing edge timeout
    if (opts.trailing) {
      timeoutRef.current = setTimeout(() => {
        updateDebouncedValue(newValue);
      }, opts.delay);
    }

    // Set up max wait timeout
    if (opts.maxWait > 0) {
      maxWaitTimeoutRef.current = setTimeout(() => {
        updateDebouncedValue(newValue);
      }, opts.maxWait);
    }

    // Update debouncing state
    if ((!opts.leading || isDebouncing) && (opts.trailing || opts.maxWait > 0)) {
      setIsDebouncing(true);
      opts.onDebounceStart();
    }

    lastValueRef.current = newValue;
  }, [opts, isDebouncing, updateDebouncedValue]);

  // Effect to handle value changes
  useEffect(() => {
    if (value !== lastValueRef.current) {
      debounce(value);
    }
  }, [value, debounce]);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (maxWaitTimeoutRef.current) {
        clearTimeout(maxWaitTimeoutRef.current);
      }
    };
  }, []);

  // Cancel debounce
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (maxWaitTimeoutRef.current) {
      clearTimeout(maxWaitTimeoutRef.current);
    }
    setIsDebouncing(false);
    opts.onDebounceEnd();
  }, [opts]);

  // Flush debounce (execute immediately)
  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (maxWaitTimeoutRef.current) {
      clearTimeout(maxWaitTimeoutRef.current);
    }
    updateDebouncedValue(lastValueRef.current);
  }, [updateDebouncedValue]);

  // Check if debounce is pending
  const isPending = useCallback(() => {
    return isDebouncing;
  }, [isDebouncing]);

  return {
    // State
    value: debouncedValue,
    isDebouncing,
    lastUpdate,
    
    // Actions
    cancel,
    flush,
    isPending,
    
    // Utilities
    update: debounce
  };
};

// Hook for debouncing functions
export const useDebouncedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  options: UseDebounceOptions = {}
) => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Refs for tracking
  const timeoutRef = useRef<NodeJS.Timeout>();
  const maxWaitTimeoutRef = useRef<NodeJS.Timeout>();
  const lastArgsRef = useRef<Parameters<T>>();
  const isMounted = useRef(true);
  const isDebouncingRef = useRef(false);

  // Debounced function
  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (!isMounted.current) return;

    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (maxWaitTimeoutRef.current) {
      clearTimeout(maxWaitTimeoutRef.current);
    }

    // Handle leading edge
    if (opts.leading && !isDebouncingRef.current) {
      callback(...args);
      isDebouncingRef.current = true;
      opts.onDebounceStart();
    }

    // Set up trailing edge timeout
    if (opts.trailing) {
      timeoutRef.current = setTimeout(() => {
        if (isMounted.current) {
          callback(...args);
          isDebouncingRef.current = false;
          opts.onDebounceEnd();
        }
      }, opts.delay);
    }

    // Set up max wait timeout
    if (opts.maxWait > 0) {
      maxWaitTimeoutRef.current = setTimeout(() => {
        if (isMounted.current) {
          callback(...args);
          isDebouncingRef.current = false;
          opts.onDebounceEnd();
        }
      }, opts.maxWait);
    }

    // Update debouncing state
    if (!opts.leading || isDebouncingRef.current) {
      isDebouncingRef.current = true;
      opts.onDebounceStart();
    }

    lastArgsRef.current = args;
  }, [callback, opts]);

  // Cancel debounce
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (maxWaitTimeoutRef.current) {
      clearTimeout(maxWaitTimeoutRef.current);
    }
    isDebouncingRef.current = false;
    opts.onDebounceEnd();
  }, [opts]);

  // Flush debounce (execute immediately)
  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (maxWaitTimeoutRef.current) {
      clearTimeout(maxWaitTimeoutRef.current);
    }
    if (lastArgsRef.current) {
      callback(...lastArgsRef.current);
    }
    isDebouncingRef.current = false;
    opts.onDebounceEnd();
  }, [callback, opts]);

  // Check if debounce is pending
  const isPending = useCallback(() => {
    return isDebouncingRef.current;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (maxWaitTimeoutRef.current) {
        clearTimeout(maxWaitTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Function
    callback: debouncedCallback,
    
    // Actions
    cancel,
    flush,
    isPending
  };
};

export default useDebounce;
