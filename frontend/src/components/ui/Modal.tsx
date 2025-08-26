import React, { useEffect, useRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const modalVariants = cva(
  'fixed inset-0 z-50 flex items-center justify-center p-4',
  {
    variants: {
      size: {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-12',
        full: 'p-0',
      },
      variant: {
        default: '',
        centered: 'items-center justify-center',
        top: 'items-start justify-center pt-16',
        bottom: 'items-end justify-center pb-16',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  }
);

const modalContentVariants = cva(
  'bg-white rounded-lg shadow-xl border border-gray-200 w-full max-h-full overflow-hidden',
  {
    variants: {
      size: {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-2xl',
        full: 'max-w-full h-full rounded-none',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export interface ModalProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof modalVariants> {
  as?: React.ElementType;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  preventScroll?: boolean;
}

export const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({ 
    className, 
    size, 
    variant, 
    as: Component = 'div', 
    isOpen, 
    onClose, 
    title, 
    children, 
    showCloseButton = true, 
    closeOnOverlayClick = true,
    closeOnEscape = true,
    preventScroll = false,
    ...props 
  }, ref) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (isOpen) {
        if (preventScroll) {
          document.body.style.overflow = 'hidden';
        }

        if (closeOnEscape) {
          const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
              onClose();
            }
          };
          document.addEventListener('keydown', handleEscape);
          return () => document.removeEventListener('keydown', handleEscape);
        }
      } else {
        if (preventScroll) {
          document.body.style.overflow = 'unset';
        }
      }

      return () => {
        if (preventScroll) {
          document.body.style.overflow = 'unset';
        }
      };
    }, [isOpen, onClose, closeOnEscape, preventScroll]);

    useEffect(() => {
      if (isOpen && modalRef.current) {
        modalRef.current.focus();
      }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
      if (closeOnOverlayClick && e.target === e.currentTarget) {
        onClose();
      }
    };

    return (
      <Component
        ref={ref}
        className={cn(modalVariants({ size, variant }), className)}
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        {...props}
      >
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
        
        {/* Modal Content */}
        <div
          ref={modalRef}
          className={cn(
            modalContentVariants({ size }),
            'relative z-10 transform transition-all duration-300 ease-out'
          )}
          tabIndex={-1}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              {title && (
                <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="Close modal"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          )}
          
          {/* Body */}
          <div className="p-4">
            {children}
          </div>
        </div>
      </Component>
    );
  }
);

Modal.displayName = 'Modal';

export { modalVariants, modalContentVariants };
export default Modal;
