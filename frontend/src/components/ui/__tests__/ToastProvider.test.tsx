import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../ToastProvider';

// Test component that uses the toast hook
const TestComponent = () => {
  const toast = useToast();
  
  return (
    <div>
      <button onClick={() => toast.showSuccess('Success message', 'Success')}>
        Show Success
      </button>
      <button onClick={() => toast.showError('Error message', 'Error')}>
        Show Error
      </button>
      <button onClick={() => toast.showWarning('Warning message', 'Warning')}>
        Show Warning
      </button>
      <button onClick={() => toast.showInfo('Info message', 'Info')}>
        Show Info
      </button>
      <button onClick={() => toast.addToast({
        type: 'neutral',
        message: 'Custom message',
        title: 'Custom Title',
        position: 'top-center'
      })}>
        Show Custom
      </button>
      <button onClick={() => toast.clearToasts()}>
        Clear All
      </button>
      <div data-testid="toast-count">
        {toast.toasts.length} toasts
      </div>
    </div>
  );
};

// Wrapper component for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider maxToasts={3} defaultDuration={1000}>
    {children}
  </ToastProvider>
);

describe('ToastProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  describe('Toast Management', () => {
    it('should render without crashing', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );
      
      expect(screen.getByText('0 toasts')).toBeInTheDocument();
    });

    it('should add toasts when show methods are called', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Show Success'));
      expect(screen.getByText('1 toasts')).toBeInTheDocument();
      expect(screen.getByText('Success message')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Show Error'));
      expect(screen.getByText('2 toasts')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('should limit toasts based on maxToasts prop', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Add 4 toasts (max is 3)
      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Error'));
      fireEvent.click(screen.getByText('Show Warning'));
      fireEvent.click(screen.getByText('Show Info'));

      expect(screen.getByText('3 toasts')).toBeInTheDocument();
      expect(screen.getByText('Info message')).toBeInTheDocument();
      expect(screen.getByText('Warning message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
      // Success message should be removed (oldest)
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });

    it('should clear all toasts when clearToasts is called', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Error'));
      expect(screen.getByText('2 toasts')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Clear All'));
      expect(screen.getByText('0 toasts')).toBeInTheDocument();
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
      expect(screen.queryByText('Error message')).not.toBeInTheDocument();
    });
  });

  describe('Toast Types and Styling', () => {
    it('should render success toasts with correct styling', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Show Success'));
      
      const toastContent = screen.getByText('Success message').closest('[role="alert"]')?.querySelector('div');
      expect(toastContent).toHaveClass('border-green-200', 'text-green-800', 'bg-green-50');
      expect(screen.getByText('Success')).toBeInTheDocument();
    });

    it('should render error toasts with correct styling', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Show Error'));
      
      const toastContent = screen.getByText('Error message').closest('[role="alert"]')?.querySelector('div');
      expect(toastContent).toHaveClass('border-red-200', 'text-red-800', 'bg-red-50');
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('should render warning toasts with correct styling', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Show Warning'));
      
      const toastContent = screen.getByText('Warning message').closest('[role="alert"]')?.querySelector('div');
      expect(toastContent).toHaveClass('border-yellow-200', 'text-yellow-800', 'bg-yellow-50');
      expect(screen.getByText('Warning')).toBeInTheDocument();
    });

    it('should render info toasts with correct styling', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Show Info'));
      
      const toastContent = screen.getByText('Info message').closest('[role="alert"]')?.querySelector('div');
      expect(toastContent).toHaveClass('border-blue-200', 'text-blue-800', 'bg-blue-50');
      expect(screen.getByText('Info')).toBeInTheDocument();
    });

    it('should render custom toasts with specified properties', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Show Custom'));
      
      const toastContent = screen.getByText('Custom message').closest('[role="alert"]')?.querySelector('div');
      expect(toastContent).toHaveClass('border-gray-200', 'text-gray-800', 'bg-gray-50');
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });
  });

  describe('Toast Auto-Dismiss', () => {
    it('should auto-dismiss toasts after duration', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Show Success'));
      expect(screen.getByText('1 toasts')).toBeInTheDocument();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(1100); // 1000ms duration + buffer
      });

      await waitFor(() => {
        expect(screen.getByText('0 toasts')).toBeInTheDocument();
      });
    });

    it('should not auto-dismiss persistent toasts', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Show Error')); // Error toasts are persistent by default
      expect(screen.getByText('1 toasts')).toBeInTheDocument();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(screen.getByText('1 toasts')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  describe('Toast Interaction', () => {
    it('should close toast when close button is clicked', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Show Success'));
      expect(screen.getByText('1 toasts')).toBeInTheDocument();

      const closeButton = screen.getByLabelText('Close notification');
      fireEvent.click(closeButton);

      expect(screen.getByText('0 toasts')).toBeInTheDocument();
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });

        it('should remove toast when close button is clicked', () => {
      const TestComponentWithCallback = () => {
        const toast = useToast();
        
        return (
          <button onClick={() => {
            toast.addToast({
              type: 'success',
              message: 'Test message'
            });
          }}>
            Add Toast
          </button>
        );
      };

      render(
        <TestWrapper>
          <TestComponentWithCallback />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Add Toast'));
      expect(screen.getByText('Test message')).toBeInTheDocument();
      
      const closeButton = screen.getByLabelText('Close notification');
      fireEvent.click(closeButton);

      expect(screen.queryByText('Test message')).not.toBeInTheDocument();
    });
  });

  describe('Toast Positioning', () => {
    it('should position toasts correctly', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Show Custom')); // Uses top-center position
      
      const toastContainer = screen.getByText('Custom message').closest('[role="alert"]');
      expect(toastContainer).toHaveClass('top-center');
    });
  });

  describe('Toast Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Show Success'));
      
      const toastContainer = screen.getByText('Success message').closest('[role="alert"]');
      expect(toastContainer).toHaveAttribute('role', 'alert');
      expect(toastContainer).toHaveAttribute('aria-live', 'assertive');
    });

    it('should have accessible close button', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Show Success'));
      
      const closeButton = screen.getByLabelText('Close notification');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when useToast is used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useToast must be used within a ToastProvider');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Toast ID Generation', () => {
    it('should generate unique IDs for toasts', () => {
      const TestComponentWithIds = () => {
        const toast = useToast();
        const [toastIds, setToastIds] = React.useState<string[]>([]);
        
        const addToast = () => {
          const id = toast.addToast({
            type: 'success',
            message: 'Test message'
          });
          setToastIds(prev => [...prev, id]);
        };
        
        return (
          <div>
            <button onClick={addToast}>Add Toast</button>
            <div data-testid="toast-ids">{toastIds.join(',')}</div>
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestComponentWithIds />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Add Toast'));
      fireEvent.click(screen.getByText('Add Toast'));
      fireEvent.click(screen.getByText('Add Toast'));

      const ids = screen.getByTestId('toast-ids').textContent?.split(',');
      expect(ids).toHaveLength(3);
      expect(new Set(ids).size).toBe(3); // All IDs should be unique
    });
  });
});
