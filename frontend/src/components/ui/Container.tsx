import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const containerVariants = cva(
  'mx-auto px-4 sm:px-6 lg:px-8',
  {
    variants: {
      size: {
        sm: 'max-w-3xl',
        md: 'max-w-4xl',
        lg: 'max-w-6xl',
        xl: 'max-w-7xl',
        full: 'max-w-none',
      },
      padding: {
        none: 'px-0',
        sm: 'px-2 sm:px-4',
        md: 'px-4 sm:px-6 lg:px-8',
        lg: 'px-6 sm:px-8 lg:px-12',
        xl: 'px-8 sm:px-12 lg:px-16',
      },
      spacing: {
        none: '',
        sm: 'py-4',
        md: 'py-6 sm:py-8',
        lg: 'py-8 sm:py-12',
        xl: 'py-12 sm:py-16',
      },
    },
    defaultVariants: {
      size: 'md',
      padding: 'md',
      spacing: 'md',
    },
  }
);

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {
  as?: React.ElementType;
  fluid?: boolean;
}

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size, padding, spacing, fluid, as: Component = 'div', ...props }, ref) => {
    const containerClasses = fluid 
      ? 'w-full px-4 sm:px-6 lg:px-8' 
      : containerVariants({ size, padding, spacing });
    
    return (
      <Component
        ref={ref}
        className={cn(containerClasses, className)}
        {...props}
      />
    );
  }
);

Container.displayName = 'Container';

export { containerVariants };
export default Container;
