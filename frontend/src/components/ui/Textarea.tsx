import React, { forwardRef, useState, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

// Textarea variants using class-variance-authority
const textareaVariants = cva(
  // Base styles
  [
    'block w-full',
    'px-3 py-2',
    'text-sm',
    'border border-gray-300',
    'rounded-lg',
    'min-h-[100px]', // Minimum height for textarea
    'transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'resize-vertical', // Allow vertical resizing only
    'bg-white text-gray-900',
    'placeholder:text-gray-400',
    'leading-relaxed',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-white text-gray-900',
          'hover:border-gray-400',
          'focus:border-blue-500',
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
      size: {
        sm: [
          'px-2 py-1.5',
          'text-xs',
          'min-h-[80px]',
          'rounded-md',
        ],
        md: [
          'px-3 py-2',
          'text-sm',
          'min-h-[100px]',
          'rounded-lg',
        ],
        lg: [
          'px-4 py-3',
          'text-base',
          'min-h-[120px]',
          'rounded-lg',
        ],
        xl: [
          'px-6 py-4',
          'text-lg',
          'min-h-[150px]',
          'rounded-xl',
        ],
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
      autoResize: {
        true: 'resize-none overflow-hidden',
        false: 'resize-vertical',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      fullWidth: true,
      autoResize: false,
    },
  }
);

// Textarea props interface
export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'>,
    VariantProps<typeof textareaVariants> {
  // Label for the textarea
  label?: string;
  // Helper text below the textarea
  helperText?: string;
  // Error message
  error?: string;
  // Success message
  success?: string;
  // Warning message
  warning?: string;
  // Whether the textarea is required
  required?: boolean;
  // Maximum character count
  maxLength?: number;
  // Show character count
  showCharCount?: boolean;
  // Whether to auto-resize based on content
  autoResize?: boolean;
  // Custom onChange handler
  onChange?: (value: string, event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  // Custom variant classes
  variantClasses?: string;
}

// Main Textarea component
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      autoResize,
      label,
      helperText,
      error,
      success,
      warning,
      required = false,
      maxLength,
      showCharCount = false,
      onChange,
      id,
      value,
      defaultValue,
      placeholder,
      rows = 4,
      variantClasses,
      ...props
    },
    ref
  ) => {
    // State for auto-resize functionality
    const [textareaHeight, setTextareaHeight] = useState<number | undefined>();
    const [currentValue, setCurrentValue] = useState(value || defaultValue || '');
    
    // Determine the actual variant based on validation state
    const actualVariant = error ? 'error' : success ? 'success' : warning ? 'warning' : variant;
    
    // Generate unique ID if not provided
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    
    // Validation state
    const hasError = !!error;
    const hasSuccess = !!success;
    const hasWarning = !!warning;
    const hasHelperText = !!helperText;
    
    // Character count
    const charCount = String(currentValue).length;
    const hasMaxLength = maxLength !== undefined;
    const isOverLimit = hasMaxLength && charCount > maxLength;
    
    // Auto-resize functionality
    const handleAutoResize = (element: HTMLTextAreaElement) => {
      if (!autoResize) return;
      
      // Reset height to auto to get the correct scrollHeight
      element.style.height = 'auto';
      
      // Set the height to match the content
      const newHeight = Math.max(
        element.scrollHeight,
        element.offsetHeight
      );
      
      element.style.height = `${newHeight}px`;
      setTextareaHeight(newHeight);
    };
    
    // Handle textarea change
    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = event.target.value;
      setCurrentValue(newValue);
      
      // Handle auto-resize
      if (autoResize) {
        handleAutoResize(event.target);
      }
      
      // Call custom onChange if provided
      if (onChange) {
        onChange(newValue, event);
      }
    };
    
    // Auto-resize on mount and when value changes
    useEffect(() => {
      if (autoResize && ref && typeof ref === 'object' && ref.current) {
        handleAutoResize(ref.current);
      }
    }, [autoResize, currentValue, ref]);
    
    // Update current value when prop changes
    useEffect(() => {
      if (value !== undefined) {
        setCurrentValue(value);
      }
    }, [value]);

    return (
      <div className={cn('space-y-2', fullWidth ? 'w-full' : 'w-auto')}>
        {/* Label */}
        {label && (
          <label
            htmlFor={textareaId}
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

        {/* Textarea Container */}
        <div className="relative">
          <textarea
            ref={ref}
            id={textareaId}
            value={currentValue}
            onChange={handleChange}
            placeholder={placeholder}
            rows={rows}
            maxLength={maxLength}
            className={cn(
              textareaVariants({ variant: actualVariant, size, fullWidth, autoResize }),
              'transition-all duration-200',
              variantClasses,
              className
            )}
            aria-invalid={hasError}
            aria-describedby={cn(
              hasError && `${textareaId}-error`,
              hasSuccess && `${textareaId}-success`,
              hasWarning && `${textareaId}-warning`,
              hasHelperText && `${textareaId}-helper`,
              showCharCount && `${textareaId}-char-count`
            )}
            {...props}
          />
          
          {/* Character count indicator */}
          {showCharCount && hasMaxLength && (
            <div className="absolute bottom-2 right-2 text-xs text-gray-400 pointer-events-none">
              <span className={cn(
                isOverLimit ? 'text-red-500' : 'text-gray-400'
              )}>
                {charCount}
              </span>
              <span className="text-gray-400">/{maxLength}</span>
            </div>
          )}
        </div>

        {/* Helper Text, Error, Success, Warning, Character Count */}
        {(hasHelperText || hasError || hasSuccess || hasWarning || showCharCount) && (
          <div className="space-y-1">
            {/* Character count (if not shown as overlay) */}
            {showCharCount && hasMaxLength && (
              <p 
                id={`${textareaId}-char-count`}
                className={cn(
                  'text-xs',
                  isOverLimit ? 'text-red-600' : 'text-gray-500'
                )}
              >
                {charCount} of {maxLength} characters
                {isOverLimit && (
                  <span className="ml-2 text-red-600 font-medium">
                    (Over limit)
                  </span>
                )}
              </p>
            )}
            
            {hasError && (
              <p id={`${textareaId}-error`} className="text-sm text-red-600">
                {error}
              </p>
            )}
            {hasSuccess && (
              <p id={`${textareaId}-success`} className="text-sm text-green-600">
                {success}
              </p>
            )}
            {hasWarning && (
              <p id={`${textareaId}-warning`} className="text-sm text-yellow-600">
                {warning}
              </p>
            )}
            {hasHelperText && !hasError && !hasSuccess && !hasWarning && (
              <p id={`${textareaId}-helper`} className="text-sm text-gray-500">
                {helperText}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// Export textarea variants for external use
export { textareaVariants };

export default Textarea;
