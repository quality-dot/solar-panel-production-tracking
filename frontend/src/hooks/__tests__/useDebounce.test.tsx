import { renderHook, act, waitFor } from '@testing-library/react';
import { useDebounce, useDebouncedCallback } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('useDebounce (value debouncing)', () => {
    it('should debounce value changes', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, { delay: 500 }),
        { initialProps: { value: 'initial' } }
      );

      expect(result.current.value).toBe('initial');
      expect(result.current.isDebouncing).toBe(false);

      // Change value multiple times quickly
      rerender({ value: 'changed1' });
      rerender({ value: 'changed2' });
      rerender({ value: 'changed3' });

      expect(result.current.value).toBe('initial');
      expect(result.current.isDebouncing).toBe(true);

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(result.current.value).toBe('changed3');
        expect(result.current.isDebouncing).toBe(false);
      });
    });

    it('should handle leading edge execution', async () => {
      const onDebounceStart = jest.fn();
      const onDebounceEnd = jest.fn();

      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, { 
          delay: 500, 
          leading: true,
          onDebounceStart,
          onDebounceEnd
        }),
        { initialProps: { value: 'initial' } }
      );

      expect(result.current.value).toBe('initial');

      // Change value
      rerender({ value: 'changed' });

      // Should execute immediately due to leading edge
      expect(result.current.value).toBe('changed');
      expect(result.current.isDebouncing).toBe(true);
      expect(onDebounceStart).toHaveBeenCalled();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(result.current.isDebouncing).toBe(false);
        expect(onDebounceEnd).toHaveBeenCalled();
      });
    });

    it('should handle maxWait option', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, { delay: 1000, maxWait: 2000 }),
        { initialProps: { value: 'initial' } }
      );

      expect(result.current.value).toBe('initial');

      // Change value
      rerender({ value: 'changed' });

      expect(result.current.value).toBe('initial');
      expect(result.current.isDebouncing).toBe(true);

      // Fast-forward past maxWait but before delay
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(result.current.value).toBe('changed');
        expect(result.current.isDebouncing).toBe(false);
      });
    });

    it('should cancel debounce', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, { delay: 500 }),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'changed' });

      expect(result.current.value).toBe('initial');
      expect(result.current.isDebouncing).toBe(true);

      act(() => {
        result.current.cancel();
      });

      expect(result.current.value).toBe('initial');
      expect(result.current.isDebouncing).toBe(false);

      // Fast-forward time to ensure no update happens
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current.value).toBe('initial');
    });

    it('should flush debounce immediately', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, { delay: 500 }),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'changed' });

      expect(result.current.value).toBe('initial');
      expect(result.current.isDebouncing).toBe(true);

      act(() => {
        result.current.flush();
      });

      expect(result.current.value).toBe('changed');
      expect(result.current.isDebouncing).toBe(false);
    });

    it('should check if debounce is pending', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, { delay: 500 }),
        { initialProps: { value: 'initial' } }
      );

      expect(result.current.isPending()).toBe(false);

      rerender({ value: 'changed' });

      expect(result.current.isPending()).toBe(true);

      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(result.current.isPending()).toBe(false);
      });
    });

    it('should track last update time', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, { delay: 100 }),
        { initialProps: { value: 'initial' } }
      );

      expect(result.current.lastUpdate).toBe(null);

      rerender({ value: 'changed' });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.lastUpdate).toBeInstanceOf(Date);
      });
    });

    it('should handle trailing edge only', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, { delay: 500, leading: false, trailing: true }),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'changed' });

      expect(result.current.value).toBe('initial');
      expect(result.current.isDebouncing).toBe(true);

      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(result.current.value).toBe('changed');
        expect(result.current.isDebouncing).toBe(false);
      });
    });

    it('should handle leading edge only', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, { delay: 500, leading: true, trailing: false }),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'changed' });

      expect(result.current.value).toBe('changed');
      expect(result.current.isDebouncing).toBe(true);

      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should not change again since trailing is false
      expect(result.current.value).toBe('changed');
    });

    it('should handle neither leading nor trailing', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, { delay: 500, leading: false, trailing: false }),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'changed' });

      expect(result.current.value).toBe('initial');
      expect(result.current.isDebouncing).toBe(false);

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current.value).toBe('initial');
    });

    it('should clean up timeouts on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { unmount, rerender } = renderHook(
        ({ value }) => useDebounce(value, { delay: 500 }),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'changed' });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('useDebouncedCallback', () => {
    it('should debounce function calls', async () => {
      const callback = jest.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(callback, { delay: 500 })
      );

      // Call function multiple times quickly
      act(() => {
        result.current.callback('arg1');
        result.current.callback('arg2');
        result.current.callback('arg3');
      });

      expect(callback).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith('arg3');
      });
    });

    it('should handle leading edge execution for callbacks', async () => {
      const callback = jest.fn();
      const onDebounceStart = jest.fn();
      const onDebounceEnd = jest.fn();

      const { result } = renderHook(() => 
        useDebouncedCallback(callback, { 
          delay: 500, 
          leading: true,
          onDebounceStart,
          onDebounceEnd
        })
      );

      act(() => {
        result.current.callback('arg');
      });

      expect(callback).toHaveBeenCalledWith('arg');
      expect(onDebounceStart).toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(onDebounceEnd).toHaveBeenCalled();
      });
    });

    it('should cancel debounced callback', async () => {
      const callback = jest.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(callback, { delay: 500 })
      );

      act(() => {
        result.current.callback('arg');
      });

      expect(callback).not.toHaveBeenCalled();

      act(() => {
        result.current.cancel();
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should flush debounced callback', async () => {
      const callback = jest.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(callback, { delay: 500 })
      );

      act(() => {
        result.current.callback('arg');
      });

      expect(callback).not.toHaveBeenCalled();

      act(() => {
        result.current.flush();
      });

      expect(callback).toHaveBeenCalledWith('arg');
    });

    it('should check if callback is pending', async () => {
      const callback = jest.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(callback, { delay: 500 })
      );

      expect(result.current.isPending()).toBe(false);

      act(() => {
        result.current.callback('arg');
      });

      expect(result.current.isPending()).toBe(true);

      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(result.current.isPending()).toBe(false);
      });
    });

    it('should handle maxWait for callbacks', async () => {
      const callback = jest.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(callback, { delay: 1000, maxWait: 2000 })
      );

      act(() => {
        result.current.callback('arg');
      });

      expect(callback).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith('arg');
      });
    });

    it('should handle multiple arguments', async () => {
      const callback = jest.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(callback, { delay: 100 })
      );

      act(() => {
        result.current.callback('arg1', 'arg2', { key: 'value' });
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith('arg1', 'arg2', { key: 'value' });
      });
    });

    it('should clean up timeouts on unmount for callbacks', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const callback = jest.fn();

      const { result, unmount } = renderHook(() => 
        useDebouncedCallback(callback, { delay: 500 })
      );

      act(() => {
        result.current.callback('arg');
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should handle callback with no arguments', async () => {
      const callback = jest.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(callback, { delay: 100 })
      );

      act(() => {
        result.current.callback();
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith();
      });
    });
  });

  describe('Integration tests', () => {
    it('should work with search input scenario', async () => {
      const searchCallback = jest.fn();
      const { result, rerender } = renderHook(
        ({ searchTerm }) => ({
          debouncedSearch: useDebounce(searchTerm, { delay: 300 }),
          debouncedCallback: useDebouncedCallback(searchCallback, { delay: 300 })
        }),
        { initialProps: { searchTerm: '' } }
      );

      // Simulate user typing
      rerender({ searchTerm: 's' });
      rerender({ searchTerm: 'so' });
      rerender({ searchTerm: 'sol' });
      rerender({ searchTerm: 'sola' });
      rerender({ searchTerm: 'solar' });

      expect(result.current.debouncedSearch.value).toBe('');
      expect(result.current.debouncedSearch.isDebouncing).toBe(true);

      act(() => {
        result.current.debouncedCallback.callback('solar');
      });

      expect(searchCallback).not.toHaveBeenCalled();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.debouncedSearch.value).toBe('solar');
        expect(result.current.debouncedSearch.isDebouncing).toBe(false);
        expect(searchCallback).toHaveBeenCalledWith('solar');
      });
    });

    it('should handle rapid value changes', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, { delay: 100 }),
        { initialProps: { value: 0 } }
      );

      // Rapidly change values
      for (let i = 1; i <= 10; i++) {
        rerender({ value: i });
        act(() => {
          jest.advanceTimersByTime(50);
        });
      }

      expect(result.current.value).toBe(0);
      expect(result.current.isDebouncing).toBe(true);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.value).toBe(10);
        expect(result.current.isDebouncing).toBe(false);
      });
    });
  });
});
