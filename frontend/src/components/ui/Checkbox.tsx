import React, { forwardRef, useState, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

// Checkbox variants using class-variance-authority
const checkboxVariants = cva(
  // Base styles
  [
    'relative',
    'inline-flex items-center justify-center',
    'w-5 h-5', // Touch-friendly size
    'border-2 border-gray-300',
    'rounded',
    'transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'bg-white',
    'cursor-pointer',
    'hover:border-gray-400',
    'peer', // For peer styling
  ],
  {
    variants: {
      variant: {
        default: [
          'border-gray-300',
          'hover:border-gray-400',
          'focus:border-blue-500',
        ],
        error: [
          'border-red-500',
          'hover:border-red-600',
          'focus:border-red-500',
          'focus:ring-red-500',
        ],
        success: [
          'border-green-500',
          'hover:border-green-600',
          'focus:border-green-500',
          'focus:ring-green-500',
        ],
        warning: [
          'border-yellow-500',
          'hover:border-yellow-600',
          'focus:border-yellow-500',
          'focus:ring-yellow-500',
        ],
      },
      checkboxSize: {
        sm: [
          'w-4 h-4',
          'text-xs',
        ],
        md: [
          'w-5 h-5',
          'text-sm',
        ],
        lg: [
          'w-6 h-6',
          'text-base',
        ],
        xl: [
          'w-7 h-7',
          'text-lg',
        ],
      },
      checked: {
        true: [
          'bg-blue-600',
          'border-blue-600',
          'hover:bg-blue-700',
          'hover:border-blue-700',
        ],
        false: [
          'bg-white',
          'border-gray-300',
        ],
      },
      indeterminate: {
        true: [
          'bg-blue-600',
          'border-blue-600',
          'hover:bg-blue-700',
          'hover:border-blue-700',
        ],
        false: [],
      },
    },
    defaultVariants: {
      variant: 'default',
      checkboxSize: 'md',
      checked: false,
      indeterminate: false,
    },
  }
);

// Checkbox props interface
export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>,
    VariantProps<typeof checkboxVariants> {
  // Label for the checkbox
  label?: string;
  // Helper text below the checkbox
  helperText?: string;
  // Error message
  error?: string;
  // Success message
  success?: string;
  // Warning message
  warning?: string;
  // Change handler
  onChange?: (checked: boolean) => void;
  // Custom variant classes
  variantClasses?: string;
}

// Main Checkbox component
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      variant,
      checkboxSize,
      checked: checkedProp,
      indeterminate: indeterminateProp,
      label,
      helperText,
      error,
      success,
      warning,
      required = false,
      indeterminate = false,
      onChange,
      id,
      defaultChecked,
      variantClasses,
      ...props
    },
    ref
  ) => {
    // State for controlled/uncontrolled behavior
    const [isChecked, setIsChecked] = useState(checkedProp ?? defaultChecked ?? false);
    const [isIndeterminate, setIsIndeterminate] = useState(indeterminate || indeterminateProp);
    
    // Determine the actual variant based on validation state
    const actualVariant = error ? 'error' : success ? 'success' : warning ? 'warning' : 'default';
    
    // Generate unique ID if not provided
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
    
    // Validation state
    const hasError = !!error;
    const hasSuccess = !!success;
    const hasWarning = !!warning;
    const hasHelperText = !!helperText;
    
    // Determine final checked and indeterminate states
    const finalChecked = checkedProp !== undefined ? checkedProp : isChecked;
    const finalIndeterminate = indeterminateProp !== undefined ? indeterminateProp : isIndeterminate;
    
    // Handle checkbox change
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newChecked = event.target.checked;
      setIsChecked(newChecked);
      setIsIndeterminate(false); // Clear indeterminate state when explicitly checked/unchecked
      
      // Call custom onChange if provided
      if (onChange) {
        onChange(newChecked);
      }
    };
    
    // Update internal state when controlled props change
    useEffect(() => {
      if (checkedProp !== undefined) {
        setIsChecked(checkedProp);
      }
    }, [checkedProp]);
    
    useEffect(() => {
      if (indeterminateProp !== undefined) {
        setIsIndeterminate(indeterminateProp);
      }
    }, [indeterminateProp]);
    
    // Set indeterminate attribute on the input element
    useEffect(() => {
      if (ref && typeof ref === 'object' && ref.current) {
        ref.current.indeterminate = finalIndeterminate;
      }
    }, [finalIndeterminate, ref]);

    return (
      <div className="space-y-2">
        {/* Checkbox Container */}
        <div className="flex items-start space-x-3">
          {/* Checkbox Input */}
          <div className="relative flex items-center">
            <input
              ref={ref}
              id={checkboxId}
              type="checkbox"
              checked={finalChecked}
              onChange={handleChange}
              className="sr-only peer"
              aria-invalid={hasError}
              aria-describedby={cn(
                hasError && `${checkboxId}-error`,
                hasSuccess && `${checkboxId}-success`,
                hasWarning && `${checkboxId}-warning`,
                hasHelperText && `${checkboxId}-helper`
              )}
              {...props}
            />
            
            {/* Custom Checkbox */}
            <label
              htmlFor={checkboxId}
              className={cn(
                checkboxVariants({ 
                  variant: actualVariant, 
                  checkboxSize, 
                  checked: finalChecked || finalIndeterminate,
                  indeterminate: finalIndeterminate
                }),
                'cursor-pointer',
                variantClasses,
                className
              )}
            >
              {/* Checkmark Icon */}
              {finalChecked && !finalIndeterminate && (
                <svg
                  className="w-3 h-3 text-white pointer-events-none"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              
              {/* Indeterminate Icon */}
              {finalIndeterminate && (
                <svg
                  className="w-3 h-3 text-white pointer-events-none"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </label>
          </div>

          {/* Label and Helper Text */}
          <div className="flex-1 min-w-0">
            {/* Label */}
            {label && (
              <label
                htmlFor={checkboxId}
                className={cn(
                  'block text-sm font-medium text-gray-700 cursor-pointer select-none',
                  hasError && 'text-red-700',
                  hasSuccess && 'text-green-700',
                  hasWarning && 'text-yellow-700',
                  checkboxSize === 'sm' && 'text-xs',
                  checkboxSize === 'lg' && 'text-base',
                  checkboxSize === 'xl' && 'text-lg'
                )}
              >
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}

            {/* Helper Text */}
            {hasHelperText && (
              <p className={cn(
                'mt-1 text-sm text-gray-500',
                checkboxSize === 'sm' && 'text-xs',
                checkboxSize === 'lg' && 'text-base',
                checkboxSize === 'xl' && 'text-lg'
              )}>
                {helperText}
              </p>
            )}
          </div>
        </div>

        {/* Error, Success, Warning Messages */}
        {(hasError || hasSuccess || hasWarning) && (
          <div className="ml-8 space-y-1">
            {hasError && (
              <p id={`${checkboxId}-error`} className="text-sm text-red-600">
                {error}
              </p>
            )}
            {hasSuccess && (
              <p id={`${checkboxId}-success`} className="text-sm text-green-600">
                {success}
              </p>
            )}
            {hasWarning && (
              <p id={`${checkboxId}-warning`} className="text-sm text-yellow-600">
                {warning}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

// Export checkbox variants for external use
export { checkboxVariants };

export default Checkbox;
