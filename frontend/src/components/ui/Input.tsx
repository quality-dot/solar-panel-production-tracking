import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

// Input variants using class-variance-authority
const inputVariants = cva(
  // Base styles
  [
    'block w-full',
    'px-3 py-2',
    'text-sm',
    'border border-gray-300',
    'rounded-lg',
    'min-h-[44px]', // Touch-friendly minimum height
    'transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'placeholder:text-gray-400',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-white text-gray-900',
          'hover:border-gray-400',
        ],
        error: [
          'bg-white text-gray-900',
          'border-red-500',
          'focus:ring-red-500 focus:border-red-500',
          'hover:border-red-600',
        ],
        success: [
          'bg-white text-gray-900',
          'border-green-500',
          'focus:ring-green-500 focus:border-green-500',
          'hover:border-green-600',
        ],
        warning: [
          'bg-white text-gray-900',
          'border-yellow-500',
          'focus:ring-yellow-500 focus:border-yellow-500',
          'hover:border-yellow-600',
        ],
      },
      inputSize: {
        sm: [
          'px-2 py-1.5',
          'text-xs',
          'min-h-[36px]',
          'rounded-md',
        ],
        md: [
          'px-3 py-2',
          'text-sm',
          'min-h-[44px]',
          'rounded-lg',
        ],
        lg: [
          'px-4 py-3',
          'text-base',
          'min-h-[52px]',
          'rounded-lg',
        ],
        xl: [
          'px-6 py-4',
          'text-lg',
          'min-h-[60px]',
          'rounded-xl',
        ],
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'md',
      fullWidth: true,
    },
  }
);

// Input props interface
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  // Label for the input
  label?: string;
  // Helper text below the input
  helperText?: string;
  // Error message
  error?: string;
  // Success message
  success?: string;
  // Warning message
  warning?: string;
  // Left icon
  leftIcon?: React.ReactNode;
  // Right icon
  rightIcon?: React.ReactNode;
  // Full width
  fullWidth?: boolean;
  // Whether the input is required
  required?: boolean;
  // Custom validation function
  validate?: (value: string) => string | undefined;
  // Show character count
  showCharacterCount?: boolean;
  // Maximum characters
  maxCharacters?: number;
  // Custom variant classes
  variantClasses?: string;
}

// Main Input component
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      inputSize,
      fullWidth,
      label,
      helperText,
      error,
      success,
      warning,
      leftIcon,
      rightIcon,
      required = false,
      validate,
      showCharacterCount = false,
      maxCharacters,
      variantClasses,
      id,
      ...props
    },
    ref
  ) => {
    // Determine the actual variant based on validation state
    const actualVariant = error ? 'error' : success ? 'success' : warning ? 'warning' : variant;
    
    // Generate unique ID if not provided
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    
    // Character count
    const currentLength = (props.value as string)?.length || 0;
    const hasMaxCharacters = maxCharacters && maxCharacters > 0;
    
    // Validation state
    const hasError = !!error;
    const hasSuccess = !!success;
    const hasWarning = !!warning;
    const hasHelperText = !!helperText;
    
    // Determine if we should show character count
    const shouldShowCharacterCount = showCharacterCount && hasMaxCharacters;

    return (
      <div className={cn('space-y-2', fullWidth ? 'w-full' : 'w-auto')}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
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
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
              {leftIcon}
            </div>
          )}

          {/* Input Element */}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              inputVariants({ variant: actualVariant, inputSize, fullWidth }),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              variantClasses,
              className
            )}
            aria-invalid={hasError}
            aria-describedby={cn(
              hasError && `${inputId}-error`,
              hasSuccess && `${inputId}-success`,
              hasWarning && `${inputId}-warning`,
              hasHelperText && `${inputId}-helper`,
              shouldShowCharacterCount && `${inputId}-count`
            )}
            {...props}
          />

          {/* Right Icon */}
          {rightIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>

        {/* Helper Text, Error, Success, Warning */}
        {(hasHelperText || hasError || hasSuccess || hasWarning) && (
          <div className="space-y-1">
            {hasError && (
              <p id={`${inputId}-error`} className="text-sm text-red-600">
                {error}
              </p>
            )}
            {hasSuccess && (
              <p id={`${inputId}-success`} className="text-sm text-green-600">
                {success}
              </p>
            )}
            {hasWarning && (
              <p id={`${inputId}-warning`} className="text-sm text-yellow-600">
                {warning}
              </p>
            )}
            {hasHelperText && !hasError && !hasSuccess && !hasWarning && (
              <p id={`${inputId}-helper`} className="text-sm text-gray-500">
                {helperText}
              </p>
            )}
          </div>
        )}

        {/* Character Count */}
        {shouldShowCharacterCount && (
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span id={`${inputId}-count`}>
              {currentLength} / {maxCharacters} characters
            </span>
            {currentLength > maxCharacters * 0.9 && (
              <span className={cn(
                'text-yellow-600',
                currentLength > maxCharacters && 'text-red-600'
              )}>
                {currentLength > maxCharacters ? 'Over limit' : 'Near limit'}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Export input variants for external use
export { inputVariants };

// Convenience exports for common input types
export const TextInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(
  (props, ref) => <Input {...props} ref={ref} type="text" />
);
TextInput.displayName = 'TextInput';

export const EmailInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(
  (props, ref) => <Input {...props} ref={ref} type="email" />
);
EmailInput.displayName = 'EmailInput';

export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(
  (props, ref) => <Input {...props} ref={ref} type="password" />
);
PasswordInput.displayName = 'PasswordInput';

export const NumberInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(
  (props, ref) => <Input {...props} ref={ref} type="number" />
);
NumberInput.displayName = 'NumberInput';

export const TelInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(
  (props, ref) => <Input {...props} ref={ref} type="tel" />
);
TelInput.displayName = 'TelInput';

export const UrlInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(
  (props, ref) => <Input {...props} ref={ref} type="url" />
);
UrlInput.displayName = 'UrlInput';

export const SearchInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(
  (props, ref) => <Input {...props} ref={ref} type="search" />
);
SearchInput.displayName = 'SearchInput';

export default Input;
