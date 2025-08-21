import { renderHook, act, waitFor } from '@testing-library/react';
import { useLocalStorage, LocalStorageError } from '../useLocalStorage';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null)
  };
})();

// Replace the global localStorage with our mock
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

describe('useLocalStorage', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  it('should initialize with default value when localStorage is empty', async () => {
    const { result } = renderHook(() => 
      useLocalStorage('test-key', { defaultValue: 'default' })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.value).toBe('default');
    expect(result.current.error).toBe(null);
    expect(result.current.isAvailable).toBe(true);
  });

  it('should initialize with stored value when localStorage has data', async () => {
    mockLocalStorage.setItem('test-key', JSON.stringify('stored-value'));

    const { result } = renderHook(() => 
      useLocalStorage('test-key', { defaultValue: 'default' })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.value).toBe('stored-value');
    expect(result.current.error).toBe(null);
  });

  it('should handle complex objects', async () => {
    const complexObject = {
      name: 'John',
      age: 30,
      preferences: {
        theme: 'dark',
        notifications: true
      },
      tags: ['user', 'admin']
    };

    const { result } = renderHook(() => 
      useLocalStorage('user-data', { defaultValue: null })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setValue(complexObject);
    });

    expect(result.current.value).toEqual(complexObject);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'user-data',
      JSON.stringify(complexObject)
    );
  });

  it('should handle setValue with function updater', async () => {
    const { result } = renderHook(() => 
      useLocalStorage('counter', { defaultValue: 0 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setValue(prev => prev + 1);
    });

    expect(result.current.value).toBe(1);

    act(() => {
      result.current.setValue(prev => prev * 2);
    });

    expect(result.current.value).toBe(2);
  });

  it('should remove value from localStorage', async () => {
    mockLocalStorage.setItem('test-key', JSON.stringify('initial-value'));

    const { result } = renderHook(() => 
      useLocalStorage('test-key', { defaultValue: 'default' })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.value).toBe('initial-value');

    act(() => {
      result.current.removeValue();
    });

    expect(result.current.value).toBe('default');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key');
  });

  it('should check if value exists', async () => {
    const { result } = renderHook(() => 
      useLocalStorage('existence-test', { defaultValue: null })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasValue()).toBe(false);

    act(() => {
      result.current.setValue('some-value');
    });

    expect(result.current.hasValue()).toBe(true);
  });

  it('should get snapshot without subscribing', async () => {
    mockLocalStorage.setItem('snapshot-test', JSON.stringify('snapshot-value'));

    const { result } = renderHook(() => 
      useLocalStorage('snapshot-test', { defaultValue: 'default' })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const snapshot = result.current.getSnapshot();
    expect(snapshot).toBe('snapshot-value');
  });

  it('should calculate storage size', async () => {
    const { result } = renderHook(() => 
      useLocalStorage('size-test', { defaultValue: '' })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setValue('test');
    });

    const size = result.current.getSize();
    expect(size).toBeGreaterThan(0);
  });

  it('should handle custom serializer', async () => {
    const customSerializer = {
      stringify: (value: Date) => value.toISOString(),
      parse: (value: string) => new Date(value)
    };

    const testDate = new Date('2023-01-01T00:00:00.000Z');

    const { result } = renderHook(() => 
      useLocalStorage('date-test', { 
        defaultValue: new Date(),
        serializer: customSerializer
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setValue(testDate);
    });

    expect(result.current.value).toEqual(testDate);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'date-test',
      testDate.toISOString()
    );
  });

  it('should handle localStorage errors gracefully', async () => {
    const onError = jest.fn();
    
    // Mock localStorage.setItem to throw an error
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });

    const { result } = renderHook(() => 
      useLocalStorage('error-test', { 
        defaultValue: 'default',
        onError
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setValue('new-value');
    });

    expect(result.current.error).toContain('Failed to write to localStorage');
    expect(onError).toHaveBeenCalledWith(expect.any(LocalStorageError));
  });

  it('should handle JSON parsing errors', async () => {
    const onError = jest.fn();
    
    // Set invalid JSON
    mockLocalStorage.getItem.mockReturnValue('invalid-json{');

    const { result } = renderHook(() => 
      useLocalStorage('parse-error-test', { 
        defaultValue: 'default',
        onError
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.value).toBe('default');
    expect(result.current.error).toContain('Failed to read from localStorage');
  });

  it('should handle storage events for cross-tab synchronization', async () => {
    const { result } = renderHook(() => 
      useLocalStorage('sync-test', { 
        defaultValue: 'initial',
        syncAcrossTabs: true
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.value).toBe('initial');

    // Simulate storage event from another tab
    act(() => {
      const storageEvent = new StorageEvent('storage', {
        key: 'sync-test',
        newValue: JSON.stringify('updated-from-another-tab')
      });
      window.dispatchEvent(storageEvent);
    });

    expect(result.current.value).toBe('updated-from-another-tab');
  });

  it('should not sync when syncAcrossTabs is false', async () => {
    const { result } = renderHook(() => 
      useLocalStorage('no-sync-test', { 
        defaultValue: 'initial',
        syncAcrossTabs: false
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.value).toBe('initial');

    // Simulate storage event from another tab
    act(() => {
      const storageEvent = new StorageEvent('storage', {
        key: 'no-sync-test',
        newValue: JSON.stringify('should-not-update')
      });
      window.dispatchEvent(storageEvent);
    });

    // Value should not change
    expect(result.current.value).toBe('initial');
  });

  it('should refresh value on demand', async () => {
    // Reset the mock to not throw errors
    mockLocalStorage.setItem.mockImplementation((key: string, value: string) => {
      (mockLocalStorage as any)[key] = value;
    });
    
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      return (mockLocalStorage as any)[key] || null;
    });
    
    mockLocalStorage.setItem('refresh-test', JSON.stringify('initial'));

    const { result } = renderHook(() => 
      useLocalStorage('refresh-test', { defaultValue: 'default' })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.value).toBe('initial');

    // Manually change localStorage (simulating external change)
    mockLocalStorage.setItem('refresh-test', JSON.stringify('externally-changed'));

    act(() => {
      result.current.refresh();
    });

    expect(result.current.value).toBe('externally-changed');
  });

  it('should handle undefined values correctly', async () => {
    const { result } = renderHook(() => 
      useLocalStorage('undefined-test', { defaultValue: 'default' })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setValue(undefined as any);
    });

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('undefined-test');
    expect(result.current.hasValue()).toBe(false);
  });

  it('should clean up event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => 
      useLocalStorage('cleanup-test', { 
        defaultValue: 'test',
        syncAcrossTabs: true
      })
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    
    removeEventListenerSpy.mockRestore();
  });

  it('should handle localStorage unavailability', async () => {
    // Mock localStorage to throw error on access
    const originalLocalStorage = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: () => { throw new Error('localStorage not available'); },
        setItem: () => { throw new Error('localStorage not available'); },
        removeItem: () => { throw new Error('localStorage not available'); }
      },
      writable: true
    });

    const { result } = renderHook(() => 
      useLocalStorage('unavailable-test', { defaultValue: 'default' })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.value).toBe('default');
    expect(result.current.isAvailable).toBe(false);
    expect(result.current.error).toContain('Failed to read from localStorage key "unavailable-test": localStorage is not available');

    // Restore original localStorage
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true
    });
  });

  it('should provide all required methods and properties', async () => {
    const { result } = renderHook(() => 
      useLocalStorage('api-test', { defaultValue: 'test' })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Check all expected properties and methods exist
    expect(result.current).toHaveProperty('value');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('setValue');
    expect(result.current).toHaveProperty('removeValue');
    expect(result.current).toHaveProperty('getSnapshot');
    expect(result.current).toHaveProperty('hasValue');
    expect(result.current).toHaveProperty('getSize');
    expect(result.current).toHaveProperty('isAvailable');
    expect(result.current).toHaveProperty('refresh');

    // Check that methods are functions
    expect(typeof result.current.setValue).toBe('function');
    expect(typeof result.current.removeValue).toBe('function');
    expect(typeof result.current.getSnapshot).toBe('function');
    expect(typeof result.current.hasValue).toBe('function');
    expect(typeof result.current.getSize).toBe('function');
    expect(typeof result.current.refresh).toBe('function');
  });
});
