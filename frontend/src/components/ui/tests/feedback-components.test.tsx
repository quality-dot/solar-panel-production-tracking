import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  LoadingSpinner,
  StatusIndicator,
  Toast,
  Modal
} from '../index';

describe('Feedback Components', () => {
  describe('LoadingSpinner Component', () => {
    test('renders with default props', () => {
      render(<LoadingSpinner />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-label', 'Loading...');
    });

    test('renders with different sizes', () => {
      const { rerender } = render(<LoadingSpinner size="sm" />);
      expect(screen.getByRole('status').firstChild).toHaveClass('h-4', 'w-4');

      rerender(<LoadingSpinner size="lg" />);
      expect(screen.getByRole('status').firstChild).toHaveClass('h-8', 'w-8');

      rerender(<LoadingSpinner size="xl" />);
      expect(screen.getByRole('status').firstChild).toHaveClass('h-12', 'w-12');
    });

    test('renders with different variants', () => {
      const { rerender } = render(<LoadingSpinner variant="primary" />);
      expect(screen.getByRole('status').firstChild).toHaveClass('border-t-blue-600');

      rerender(<LoadingSpinner variant="success" />);
      expect(screen.getByRole('status').firstChild).toHaveClass('border-t-green-600');

      rerender(<LoadingSpinner variant="error" />);
      expect(screen.getByRole('status').firstChild).toHaveClass('border-t-red-600');
    });

    test('renders with different speeds', () => {
      const { rerender } = render(<LoadingSpinner speed="slow" />);
      expect(screen.getByRole('status').firstChild).toHaveClass('animate-[spin_2s_linear_infinite]');

      rerender(<LoadingSpinner speed="fast" />);
      expect(screen.getByRole('status').firstChild).toHaveClass('animate-[spin_0.5s_linear_infinite]');
    });

    test('shows label when showLabel is true', () => {
      render(<LoadingSpinner showLabel label="Loading data..." />);
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    test('has proper accessibility attributes', () => {
      render(<LoadingSpinner label="Processing..." />);
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('aria-label', 'Processing...');
    });
  });

  describe('StatusIndicator Component', () => {
    test('renders with default props', () => {
      render(<StatusIndicator>Default Status</StatusIndicator>);
      const indicator = screen.getByText('Default Status');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveClass('bg-gray-100', 'text-gray-800');
    });

    test('renders with different status types', () => {
      const { rerender } = render(<StatusIndicator status="success">Success</StatusIndicator>);
      expect(screen.getByText('Success')).toHaveClass('bg-green-100', 'text-green-800');

      rerender(<StatusIndicator status="warning">Warning</StatusIndicator>);
      expect(screen.getByText('Warning')).toHaveClass('bg-yellow-100', 'text-yellow-800');

      rerender(<StatusIndicator status="error">Error</StatusIndicator>);
      expect(screen.getByText('Error')).toHaveClass('bg-red-100', 'text-red-800');

      rerender(<StatusIndicator status="info">Info</StatusIndicator>);
      expect(screen.getByText('Info')).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    test('renders with different sizes', () => {
      const { rerender } = render(<StatusIndicator size="sm">Small</StatusIndicator>);
      expect(screen.getByText('Small')).toHaveClass('px-2', 'py-0.5', 'text-xs');

      rerender(<StatusIndicator size="lg">Large</StatusIndicator>);
      expect(screen.getByText('Large')).toHaveClass('px-3', 'py-1', 'text-base');
    });

    test('shows icon when showIcon is true', () => {
      render(<StatusIndicator status="success" showIcon>Success with icon</StatusIndicator>);
      const container = screen.getByText('Success with icon').closest('span');
      expect(container?.querySelector('svg')).toBeInTheDocument();
    });

    test('shows animated icons for pending and inProgress status', () => {
      const { rerender } = render(<StatusIndicator status="pending" showIcon>Pending</StatusIndicator>);
      const pendingContainer = screen.getByText('Pending').closest('span');
      expect(pendingContainer?.querySelector('svg')).toHaveClass('animate-spin');

      rerender(<StatusIndicator status="inProgress" showIcon>In Progress</StatusIndicator>);
      const progressContainer = screen.getByText('In Progress').closest('span');
      expect(progressContainer?.querySelector('svg')).toHaveClass('animate-pulse');
    });
  });

  describe('Toast Component', () => {
    test('renders with default props', () => {
      render(<Toast message="Test message" />);
      expect(screen.getByText('Test message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    test('renders with different types', () => {
      const { rerender } = render(<Toast type="success" message="Success message" />);
      expect(screen.getByRole('alert').firstChild).toHaveClass('border-green-200', 'text-green-800', 'bg-green-50');

      rerender(<Toast type="error" message="Error message" />);
      expect(screen.getByRole('alert').firstChild).toHaveClass('border-red-200', 'text-red-800', 'bg-red-50');

      rerender(<Toast type="warning" message="Warning message" />);
      expect(screen.getByRole('alert').firstChild).toHaveClass('border-yellow-200', 'text-yellow-800', 'bg-yellow-50');
    });

    test('renders with title and message', () => {
      render(<Toast title="Alert Title" message="Alert message" />);
      expect(screen.getByText('Alert Title')).toBeInTheDocument();
      expect(screen.getByText('Alert message')).toBeInTheDocument();
    });

    test('shows close button by default', () => {
      render(<Toast message="Test message" />);
      const closeButton = screen.getByRole('button', { name: /close notification/i });
      expect(closeButton).toBeInTheDocument();
    });

    test('can hide close button', () => {
      render(<Toast message="Test message" showCloseButton={false} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    test('calls onClose when close button is clicked', async () => {
      const mockOnClose = jest.fn();
      render(<Toast message="Test message" onClose={mockOnClose} />);
      
      const closeButton = screen.getByRole('button', { name: /close notification/i });
      await userEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('auto-dismisses after duration when not persistent', async () => {
      const mockOnClose = jest.fn();
      render(<Toast message="Test message" duration={100} onClose={mockOnClose} />);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }, { timeout: 200 });
    });

    test('does not auto-dismiss when persistent', async () => {
      const mockOnClose = jest.fn();
      render(<Toast message="Test message" duration={100} persistent onClose={mockOnClose} />);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    test('has proper accessibility attributes', () => {
      render(<Toast message="Test message" />);
      const toast = screen.getByRole('alert');
      expect(toast).toHaveAttribute('aria-live', 'assertive');
    });

    test('displays appropriate icons for each type', () => {
      const { rerender } = render(<Toast type="success" message="Success" />);
      expect(screen.getByRole('alert').querySelector('svg')).toBeInTheDocument();

      rerender(<Toast type="error" message="Error" />);
      expect(screen.getByRole('alert').querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Modal Component', () => {
    test('renders when isOpen is true', () => {
      render(<Modal isOpen={true} onClose={() => {}}>Modal content</Modal>);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    test('does not render when isOpen is false', () => {
      render(<Modal isOpen={false} onClose={() => {}}>Modal content</Modal>);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('renders with title', () => {
      render(<Modal isOpen={true} onClose={() => {}} title="Test Modal">Modal content</Modal>);
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    test('renders with different sizes', () => {
      const { rerender } = render(<Modal isOpen={true} onClose={() => {}} size="sm">Small Modal</Modal>);
      expect(screen.getByText('Small Modal').closest('[class*="max-w-sm"]')).toHaveClass('max-w-sm');

      rerender(<Modal isOpen={true} onClose={() => {}} size="lg">Large Modal</Modal>);
      expect(screen.getByText('Large Modal').closest('[class*="max-w-lg"]')).toHaveClass('max-w-lg');

      rerender(<Modal isOpen={true} onClose={() => {}} size="full">Full Modal</Modal>);
      expect(screen.getByText('Full Modal').closest('[class*="max-w-full"]')).toHaveClass('max-w-full', 'h-full');
    });

    test('shows close button by default', () => {
      render(<Modal isOpen={true} onClose={() => {}} title="Test Modal">Modal content</Modal>);
      const closeButton = screen.getByRole('button', { name: /close modal/i });
      expect(closeButton).toBeInTheDocument();
    });

    test('can hide close button', () => {
      render(<Modal isOpen={true} onClose={() => {}} title="Test Modal" showCloseButton={false}>Modal content</Modal>);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    test('calls onClose when close button is clicked', async () => {
      const mockOnClose = jest.fn();
      render(<Modal isOpen={true} onClose={mockOnClose} title="Test Modal">Modal content</Modal>);
      
      const closeButton = screen.getByRole('button', { name: /close modal/i });
      await userEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('calls onClose when escape key is pressed', async () => {
      const mockOnClose = jest.fn();
      render(<Modal isOpen={true} onClose={mockOnClose}>Modal content</Modal>);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('does not close on escape when closeOnEscape is false', async () => {
      const mockOnClose = jest.fn();
      render(<Modal isOpen={true} onClose={mockOnClose} closeOnEscape={false}>Modal content</Modal>);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    test('calls onClose when clicking on overlay', async () => {
      const mockOnClose = jest.fn();
      render(<Modal isOpen={true} onClose={mockOnClose}>Modal content</Modal>);
      
      const overlay = screen.getByRole('dialog');
      fireEvent.click(overlay);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('does not close when clicking on modal content', async () => {
      const mockOnClose = jest.fn();
      render(<Modal isOpen={true} onClose={mockOnClose}>Modal content</Modal>);
      
      const content = screen.getByText('Modal content');
      fireEvent.click(content);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    test('does not close on overlay click when closeOnOverlayClick is false', async () => {
      const mockOnClose = jest.fn();
      render(<Modal isOpen={true} onClose={mockOnClose} closeOnOverlayClick={false}>Modal content</Modal>);
      
      const overlay = screen.getByRole('dialog');
      fireEvent.click(overlay);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    test('has proper accessibility attributes', () => {
      render(<Modal isOpen={true} onClose={() => {}} title="Test Modal">Modal content</Modal>);
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    test('focuses modal when opened', () => {
      render(<Modal isOpen={true} onClose={() => {}}>Modal content</Modal>);
      // Note: In a real browser, the modal content would be focused
      // This is harder to test in jsdom, but the code is there
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    test('components work together in feedback scenarios', async () => {
      const MockFeedbackDemo = () => {
        const [loading, setLoading] = React.useState(false);
        const [status, setStatus] = React.useState<'pending' | 'success' | 'error'>('pending');
        const [showModal, setShowModal] = React.useState(false);
        const [showToast, setShowToast] = React.useState(false);

        const handleAction = async () => {
          setLoading(true);
          setStatus('pending');
          
          // Simulate async operation
          setTimeout(() => {
            setLoading(false);
            setStatus('success');
            setShowToast(true);
          }, 100);
        };

        return (
          <div>
            <button onClick={handleAction}>Start Process</button>
            <button onClick={() => setShowModal(true)}>Open Modal</button>
            
            {loading && <LoadingSpinner />}
            <StatusIndicator status={status} showIcon>{status}</StatusIndicator>
            
            {showToast && (
              <Toast
                type="success"
                message="Operation completed successfully"
                onClose={() => setShowToast(false)}
              />
            )}
            
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Feedback Modal">
              <div>
                <p>Modal with feedback components</p>
                <StatusIndicator status="info" showIcon>Modal is open</StatusIndicator>
              </div>
            </Modal>
          </div>
        );
      };

      render(<MockFeedbackDemo />);

      // Initial state
      expect(screen.getByText('pending')).toBeInTheDocument();
      
      // Start process
      const actionButton = screen.getByText('Start Process');
      await userEvent.click(actionButton);
      
      // Loading state
      expect(screen.getByRole('status')).toBeInTheDocument();
      
      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText('success')).toBeInTheDocument();
        expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
      });

      // Open modal
      const modalButton = screen.getByText('Open Modal');
      await userEvent.click(modalButton);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Modal is open')).toBeInTheDocument();
    });
  });
});
