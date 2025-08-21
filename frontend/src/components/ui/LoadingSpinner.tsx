import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const loadingSpinnerVariants = cva(
  'animate-spin rounded-full border-2 border-gray-200',
  {
    variants: {
      size: {
        sm: 'h-4 w-4 border-t-2',
        md: 'h-6 w-6 border-t-2',
        lg: 'h-8 w-8 border-t-2',
        xl: 'h-12 w-12 border-t-3',
        '2xl': 'h-16 w-16 border-t-4',
      },
      variant: {
        default: 'border-t-blue-600',
        primary: 'border-t-blue-600',
        secondary: 'border-t-gray-600',
        success: 'border-t-green-600',
        warning: 'border-t-yellow-600',
        error: 'border-t-red-600',
        light: 'border-t-white',
        dark: 'border-t-gray-900',
      },
      speed: {
        slow: 'animate-[spin_2s_linear_infinite]',
        normal: 'animate-spin',
        fast: 'animate-[spin_0.5s_linear_infinite]',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
      speed: 'normal',
    },
  }
);

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof loadingSpinnerVariants> {
  as?: React.ElementType;
  label?: string;
  showLabel?: boolean;
}

export const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size, variant, speed, as: Component = 'div', label = 'Loading...', showLabel = false, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn('flex flex-col items-center justify-center', className)}
        role="status"
        aria-label={label}
        {...props}
      >
        <div className={cn(loadingSpinnerVariants({ size, variant, speed }))} />
        {showLabel && (
          <span className="mt-2 text-sm text-gray-600 font-medium">{label}</span>
        )}
      </Component>
    );
  }
);

LoadingSpinner.displayName = 'LoadingSpinner';

export { loadingSpinnerVariants };
export default LoadingSpinner;
