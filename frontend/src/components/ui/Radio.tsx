import React, { forwardRef, useState, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

// Radio variants using class-variance-authority
const radioVariants = cva(
  // Base styles
  [
    'relative',
    'inline-flex items-center justify-center',
    'w-5 h-5', // Touch-friendly size
    'border-2 border-gray-300',
    'rounded-full',
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
      radioSize: {
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
          'border-blue-600',
          'hover:border-blue-700',
        ],
        false: [
          'border-gray-300',
        ],
      },
    },
    defaultVariants: {
      variant: 'default',
      radioSize: 'md',
      checked: false,
    },
  }
);

// Radio option interface
export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
}

// Radio props interface
export interface RadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>,
    VariantProps<typeof radioVariants> {
  // Label for the radio group
  label?: string;
  // Helper text below the radio group
  helperText?: string;
  // Error message
  error?: string;
  // Success message
  success?: string;
  // Warning message
  warning?: string;
  // Options for the radio group
  options: RadioOption[];
  // Selected value
  value?: string;
  // Change handler
  onChange?: (value: string) => void;
  // Custom variant classes
  variantClasses?: string;
}

// Main Radio component
export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      className,
      variant,
      radioSize,
      label,
      helperText,
      error,
      success,
      warning,
      required = false,
      options,
      value: valueProp,
      defaultValue,
      onChange,
      id,
      name,
      variantClasses,
      ...props
    },
    ref
  ) => {
    // State for controlled/uncontrolled behavior
    const [selectedValue, setSelectedValue] = useState(valueProp ?? defaultValue ?? '');
    
    // Determine the actual variant based on validation state
    const actualVariant = error ? 'error' : success ? 'success' : warning ? 'warning' : variant;
    
    // Generate unique ID if not provided
    const radioGroupId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate unique name if not provided
    const radioGroupName = name || `radio-group-${Math.random().toString(36).substr(2, 9)}`;
    
    // Validation state
    const hasError = !!error;
    const hasSuccess = !!success;
    const hasWarning = !!warning;
    const hasHelperText = !!helperText;
    
    // Determine final selected value
    const finalValue = valueProp !== undefined ? valueProp : selectedValue;
    
    // Handle radio selection
    const handleRadioChange = (option: RadioOption) => {
      if (option.disabled) return;
      
      setSelectedValue(option.value);
      
      // Call custom onChange if provided
      if (onChange) {
        onChange(option.value);
      }
    };
    
    // Update internal state when controlled prop changes
    useEffect(() => {
      if (valueProp !== undefined) {
        setSelectedValue(valueProp);
      }
    }, [valueProp]);

    return (
      <div className="space-y-3">
        {/* Group Label */}
        {label && (
          <div>
            <label
              className={cn(
                'block text-sm font-medium text-gray-700',
                hasError && 'text-red-700',
                hasSuccess && 'text-green-700',
                hasWarning && 'text-yellow-700'
              )}
            >
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            
            {/* Helper Text */}
            {hasHelperText && (
              <p className="mt-1 text-sm text-gray-500">
                {helperText}
              </p>
            )}
          </div>
        )}

        {/* Radio Options */}
        <div className="space-y-2">
          {options.map((option, index) => {
            const optionId = `${radioGroupId}-${index}`;
            const isSelected = option.value === finalValue;
            const isDisabled = option.disabled || props.disabled;
            
            return (
              <div key={option.value} className="flex items-start space-x-3">
                {/* Radio Input */}
                <div className="relative flex items-center">
                  <input
                    ref={index === 0 ? ref : undefined}
                    id={optionId}
                    type="radio"
                    name={radioGroupName}
                    value={option.value}
                    checked={isSelected}
                    onChange={() => handleRadioChange(option)}
                    disabled={isDisabled}
                    className="sr-only peer"
                    aria-invalid={hasError}
                    aria-describedby={cn(
                      hasError && `${radioGroupId}-error`,
                      hasSuccess && `${radioGroupId}-success`,
                      hasWarning && `${radioGroupId}-warning`
                    )}
                    {...props}
                  />
                  
                  {/* Custom Radio */}
                  <label
                    htmlFor={optionId}
                    className={cn(
                      radioVariants({ 
                        variant: actualVariant, 
                        radioSize, 
                        checked: isSelected
                      }),
                      'cursor-pointer',
                      isDisabled && 'cursor-not-allowed opacity-50',
                      variantClasses,
                      className
                    )}
                  >
                    {/* Radio Dot */}
                    {isSelected && (
                      <div className={cn(
                        'w-2 h-2 bg-blue-600 rounded-full',
                        radioSize === 'sm' && 'w-1.5 h-1.5',
                        radioSize === 'lg' && 'w-2.5 h-2.5',
                        radioSize === 'xl' && 'w-3 h-3'
                      )} />
                    )}
                  </label>
                </div>

                {/* Option Label and Description */}
                <div className="flex-1 min-w-0">
                  <label
                    htmlFor={optionId}
                    className={cn(
                      'block text-sm font-medium cursor-pointer select-none',
                      isDisabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700',
                      hasError && !isDisabled && 'text-red-700',
                      hasSuccess && !isDisabled && 'text-green-700',
                      hasWarning && !isDisabled && 'text-yellow-700',
                      radioSize === 'sm' && 'text-xs',
                      radioSize === 'lg' && 'text-base',
                      radioSize === 'xl' && 'text-lg'
                    )}
                  >
                    {option.label}
                  </label>
                  
                  {/* Option Description */}
                  {option.description && (
                    <p className={cn(
                      'mt-1 text-sm',
                      isDisabled ? 'text-gray-400' : 'text-gray-500',
                      radioSize === 'sm' && 'text-xs',
                      radioSize === 'lg' && 'text-base',
                      radioSize === 'xl' && 'text-lg'
                    )}>
                      {option.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Error, Success, Warning Messages */}
        {(hasError || hasSuccess || hasWarning) && (
          <div className="space-y-1">
            {hasError && (
              <p id={`${radioGroupId}-error`} className="text-sm text-red-600">
                {error}
              </p>
            )}
            {hasSuccess && (
              <p id={`${radioGroupId}-success`} className="text-sm text-green-600">
                {success}
              </p>
            )}
            {hasWarning && (
              <p id={`${radioGroupId}-warning`} className="text-sm text-yellow-600">
                {warning}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Radio.displayName = 'Radio';

// Export radio variants for external use
export { radioVariants };

export default Radio;
