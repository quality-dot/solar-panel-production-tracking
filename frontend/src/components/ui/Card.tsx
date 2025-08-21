import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const cardVariants = cva(
  'bg-white rounded-lg border',
  {
    variants: {
      variant: {
        default: 'border-gray-200 shadow-sm',
        elevated: 'border-gray-200 shadow-md',
        outlined: 'border-gray-300 shadow-none',
        filled: 'bg-gray-50 border-gray-200',
        interactive: 'border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer',
      },
      size: {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
      padding: {
        none: 'p-0',
        sm: 'p-3',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
      radius: {
        none: 'rounded-none',
        sm: 'rounded-md',
        md: 'rounded-lg',
        lg: 'rounded-xl',
        xl: 'rounded-2xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      padding: 'md',
      radius: 'md',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  as?: React.ElementType;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  isClickable?: boolean;
  onClick?: () => void;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ 
    className, 
    variant, 
    size, 
    padding, 
    radius, 
    header, 
    footer, 
    children, 
    as: Component = 'div',
    isClickable = false,
    onClick,
    ...props 
  }, ref) => {
    const isInteractive = isClickable || onClick;
    const actualVariant = isInteractive ? 'interactive' : variant;
    
    return (
      <Component
        ref={ref}
        className={cn(
          cardVariants({ variant: actualVariant, size, padding, radius }),
          isInteractive && 'cursor-pointer',
          className
        )}
        onClick={onClick}
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onKeyDown={isInteractive ? (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        } : undefined}
        {...props}
      >
        {header && (
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            {header}
          </div>
        )}
        
        <div className="flex-1">
          {children}
        </div>
        
        {footer && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            {footer}
          </div>
        )}
      </Component>
    );
  }
);

Card.displayName = 'Card';

// Convenience components
export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-6 py-4 border-b border-gray-200 bg-gray-50', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-6 py-4', className)}
      {...props}
    />
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-6 py-4 border-t border-gray-200 bg-gray-50', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

export { cardVariants };
export default Card;
