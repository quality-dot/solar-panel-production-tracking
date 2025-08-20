import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

// Button variants using class-variance-authority
const buttonVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center',
    'font-medium transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'active:scale-95',
    'min-h-[44px] min-w-[44px]', // Touch-friendly minimum size
    'px-4 py-2', // Default padding
    'rounded-lg', // Default border radius
    'text-sm', // Default text size
    'shadow-sm', // Subtle shadow
    'hover:shadow-md', // Enhanced shadow on hover
    'focus:ring-blue-500', // Default focus ring color
  ],
  {
    variants: {
      variant: {
        // Primary button - main actions
        primary: [
          'bg-blue-600 text-white',
          'hover:bg-blue-700',
          'active:bg-blue-800',
          'focus:ring-blue-500',
          'border border-blue-600',
        ],
        // Secondary button - secondary actions
        secondary: [
          'bg-gray-100 text-gray-900',
          'hover:bg-gray-200',
          'active:bg-gray-300',
          'focus:ring-gray-500',
          'border border-gray-300',
        ],
        // Success button - positive actions
        success: [
          'bg-green-600 text-white',
          'hover:bg-green-700',
          'active:bg-green-800',
          'focus:ring-green-500',
          'border border-green-600',
        ],
        // Warning button - caution actions
        warning: [
          'bg-yellow-600 text-white',
          'hover:bg-yellow-700',
          'active:bg-yellow-800',
          'focus:ring-yellow-500',
          'border border-yellow-600',
        ],
        // Error button - destructive actions
        error: [
          'bg-red-600 text-white',
          'hover:bg-red-700',
          'active:bg-red-800',
          'focus:ring-red-500',
          'border border-red-600',
        ],
        // Outline button - subtle actions
        outline: [
          'bg-transparent text-gray-700',
          'hover:bg-gray-50',
          'active:bg-gray-100',
          'focus:ring-gray-500',
          'border border-gray-300',
        ],
        // Ghost button - minimal actions
        ghost: [
          'bg-transparent text-gray-700',
          'hover:bg-gray-100',
          'active:bg-gray-200',
          'focus:ring-gray-500',
          'border border-transparent',
        ],
        // Link button - navigation actions
        link: [
          'bg-transparent text-blue-600',
          'hover:text-blue-700',
          'hover:underline',
          'focus:ring-blue-500',
          'border border-transparent',
          'p-0 min-h-auto min-w-auto',
        ],
      },
      size: {
        // Extra small - for compact spaces
        xs: [
          'px-2 py-1',
          'text-xs',
          'min-h-[32px] min-w-[32px]',
          'rounded',
        ],
        // Small - for secondary actions
        sm: [
          'px-3 py-1.5',
          'text-sm',
          'min-h-[36px] min-w-[36px]',
          'rounded-md',
        ],
        // Medium - default size
        md: [
          'px-4 py-2',
          'text-sm',
          'min-h-[44px] min-w-[44px]',
          'rounded-lg',
        ],
        // Large - for primary actions
        lg: [
          'px-6 py-3',
          'text-base',
          'min-h-[52px] min-w-[52px]',
          'rounded-lg',
        ],
        // Extra large - for prominent actions
        xl: [
          'px-8 py-4',
          'text-lg',
          'min-h-[60px] min-w-[60px]',
          'rounded-xl',
        ],
      },
      // Loading state
      loading: {
        true: 'cursor-wait',
        false: '',
      },
      // Full width
      fullWidth: {
        true: 'w-full',
        false: '',
      },
      // Rounded corners
      rounded: {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        full: 'rounded-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      loading: false,
      fullWidth: false,
      rounded: 'lg',
    },
  }
);

// Button props interface
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  // Loading state with spinner
  loading?: boolean;
  // Loading text (shows instead of children when loading)
  loadingText?: string;
  // Left icon
  leftIcon?: React.ReactNode;
  // Right icon
  rightIcon?: React.ReactNode;
  // Full width
  fullWidth?: boolean;
  // Custom rounded corners
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  // Custom variant classes
  variantClasses?: string;
}

// Loading spinner component
const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

// Main Button component
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      rounded,
      variantClasses,
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Determine if button should be disabled
    const isDisabled = disabled || loading;
    
    // Determine loading text
    const displayText = loading && loadingText ? loadingText : children;
    
    // Determine icon size based on button size
    const iconSize = size === 'xs' || size === 'sm' ? 'sm' : size === 'lg' || size === 'xl' ? 'lg' : 'md';

    return (
      <button
        className={cn(
          buttonVariants({ variant, size, loading, fullWidth, rounded }),
          variantClasses,
          className
        )}
        ref={ref}
        disabled={isDisabled}
        type={type}
        aria-disabled={isDisabled}
        aria-busy={loading}
        {...props}
      >
        {/* Left icon or loading spinner */}
        {loading ? (
          <LoadingSpinner size={iconSize} />
        ) : leftIcon ? (
          <span className="mr-2 flex-shrink-0">{leftIcon}</span>
        ) : null}

        {/* Button text */}
        {displayText && (
          <span className={cn('flex-shrink-0', loading && leftIcon && 'ml-2')}>
            {displayText}
          </span>
        )}

        {/* Right icon */}
        {rightIcon && !loading && (
          <span className="ml-2 flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Export button variants for external use
export { buttonVariants };

// Convenience exports for common button types
export const PrimaryButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button {...props} ref={ref} variant="primary" />
);
PrimaryButton.displayName = 'PrimaryButton';

export const SecondaryButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button {...props} ref={ref} variant="secondary" />
);
SecondaryButton.displayName = 'SecondaryButton';

export const SuccessButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button {...props} ref={ref} variant="success" />
);
SuccessButton.displayName = 'SuccessButton';

export const WarningButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button {...props} ref={ref} variant="warning" />
);
WarningButton.displayName = 'WarningButton';

export const ErrorButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button {...props} ref={ref} variant="error" />
);
ErrorButton.displayName = 'ErrorButton';

export const OutlineButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button {...props} ref={ref} variant="outline" />
);
OutlineButton.displayName = 'OutlineButton';

export const GhostButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button {...props} ref={ref} variant="ghost" />
);
GhostButton.displayName = 'GhostButton';

export const LinkButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button {...props} ref={ref} variant="link" />
);
LinkButton.displayName = 'LinkButton';

// Icon button component for buttons with only icons
export const IconButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children'> & { icon?: React.ReactNode }>(
  ({ className, size = 'md', icon, ...props }, ref) => (
    <Button
      {...props}
      ref={ref}
      size={size}
      className={cn('p-0', className)}
      aria-label={props['aria-label'] || 'Button'}
    >
      {icon}
    </Button>
  )
);
IconButton.displayName = 'IconButton';

export default Button;
