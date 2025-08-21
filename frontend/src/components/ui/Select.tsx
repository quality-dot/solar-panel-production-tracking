import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

// Select variants using class-variance-authority
const selectVariants = cva(
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
    'appearance-none', // Remove default browser styling
    'bg-white text-gray-900',
    'cursor-pointer',
    'hover:border-gray-400',
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
      selectSize: {
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
      selectSize: 'md',
      fullWidth: true,
    },
  }
);

// Option interface
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

// Select props interface
export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'>,
    VariantProps<typeof selectVariants> {
  // Label for the select
  label?: string;
  // Helper text below the select
  helperText?: string;
  // Error message
  error?: string;
  // Success message
  success?: string;
  // Warning message
  warning?: string;
  // Options for the select
  options: SelectOption[];
  // Selected value
  value?: string;
  // Change handler
  onChange?: (value: string, option: SelectOption) => void;
  // Placeholder text
  placeholder?: string;
  // Whether the select is searchable
  searchable?: boolean;
  // Whether to group options
  grouped?: boolean;
  // Custom variant classes
  variantClasses?: string;
}

// Main Select component
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      variant,
      selectSize,
      fullWidth,
      label,
      helperText,
      error,
      success,
      warning,
      options,
      placeholder = 'Select an option...',
      required = false,
      searchable = false,
      grouped = false,
      onChange,
      id,
      value,
      defaultValue,
      variantClasses,
      ...props
    },
    ref
  ) => {
    // State for search functionality
    const [searchQuery, setSearchQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState(value || defaultValue || '');
    
    // Refs
    const selectRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    
    // Determine the actual variant based on validation state
    const actualVariant = error ? 'error' : success ? 'success' : warning ? 'warning' : variant;
    
    // Generate unique ID if not provided
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    
    // Validation state
    const hasError = !!error;
    const hasSuccess = !!success;
    const hasWarning = !!warning;
    const hasHelperText = !!helperText;
    
    // Filter options based on search query
    const filteredOptions = searchable && searchQuery
      ? options.filter(option => 
          option.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : options;
    
    // Group options if needed
    const groupedOptions = grouped
      ? filteredOptions.reduce((groups, option) => {
          const group = option.group || 'Default';
          if (!groups[group]) groups[group] = [];
          groups[group].push(option);
          return groups;
        }, {} as Record<string, SelectOption[]>)
      : { '': filteredOptions };
    
    // Get selected option
    const selectedOption = options.find(option => option.value === selectedValue);
    
    // Handle option selection
    const handleOptionSelect = (option: SelectOption) => {
      if (option.disabled) return;
      
      setSelectedValue(option.value);
      setIsOpen(false);
      setSearchQuery('');
      
      // Call custom onChange if provided
      if (onChange) {
        onChange(option.value, option);
      }
      
      // Trigger native onChange event
      const event = new Event('change', { bubbles: true });
      Object.defineProperty(event, 'target', { value: { value: option.value } });
      selectRef.current?.dispatchEvent(event);
    };
    
    // Handle click outside to close dropdown
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setSearchQuery('');
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    // Focus search input when dropdown opens
    useEffect(() => {
      if (isOpen && searchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [isOpen, searchable]);

    return (
      <div className={cn('space-y-2', fullWidth ? 'w-full' : 'w-auto')}>
        {/* Label */}
        {label && (
          <label
            htmlFor={selectId}
            id={`${selectId}-label`}
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

        {/* Select Container */}
        <div className="relative" ref={selectRef}>
          {/* Custom Select Button */}
          <button
            type="button"
            className={cn(
              selectVariants({ variant: actualVariant, selectSize, fullWidth }),
              'text-left',
              'flex items-center justify-between',
              'cursor-pointer',
              variantClasses,
              className
            )}
            onClick={() => setIsOpen(!isOpen)}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-labelledby={label ? `${selectId}-label` : undefined}
            disabled={props.disabled}
            aria-invalid={hasError}
            aria-describedby={cn(
              hasError && `${selectId}-error`,
              hasSuccess && `${selectId}-success`,
              hasWarning && `${selectId}-warning`,
              hasHelperText && `${selectId}-helper`
            )}
          >
            <span className={cn(
              'truncate',
              !selectedOption && 'text-gray-400'
            )}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            
            {/* Custom dropdown arrow */}
            <svg
              className={cn(
                'w-4 h-4 text-gray-400 transition-transform duration-200',
                isOpen && 'rotate-180'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Hidden native select for form submission */}
          <select
            ref={ref}
            id={selectId}
            value={selectedValue}
            onChange={(e) => setSelectedValue(e.target.value)}
            className="sr-only"
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
              {/* Search Input */}
              {searchable && (
                <div className="sticky top-0 bg-white border-b border-gray-200 p-2">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search options..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {/* Options List */}
              <div className="py-1">
                {Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
                  <div key={groupName}>
                    {/* Group Header */}
                    {grouped && groupName !== 'Default' && groupName && (
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                        {groupName}
                      </div>
                    )}
                    
                    {/* Group Options */}
                    {groupOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={cn(
                          'w-full text-left px-3 py-2 text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none',
                          option.value === selectedValue && 'bg-blue-100 text-blue-900',
                          option.disabled && 'opacity-50 cursor-not-allowed text-gray-400'
                        )}
                        onClick={() => handleOptionSelect(option)}
                        disabled={option.disabled}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ))}
                
                {/* No options message */}
                {filteredOptions.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500 text-center">
                    No options found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Helper Text, Error, Success, Warning */}
        {(hasHelperText || hasError || hasSuccess || hasWarning) && (
          <div className="space-y-1">
            {hasError && (
              <p id={`${selectId}-error`} className="text-sm text-red-600">
                {error}
              </p>
            )}
            {hasSuccess && (
              <p id={`${selectId}-success`} className="text-sm text-green-600">
                {success}
              </p>
            )}
            {hasWarning && (
              <p id={`${selectId}-warning`} className="text-sm text-yellow-600">
                {warning}
              </p>
            )}
            {hasHelperText && !hasError && !hasSuccess && !hasWarning && (
              <p id={`${selectId}-helper`} className="text-sm text-gray-500">
                {helperText}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// Export select variants for external use
export { selectVariants };

export default Select;
