import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const gridVariants = cva(
  'grid gap-4',
  {
    variants: {
      cols: {
        1: 'grid-cols-1',
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
        6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
        12: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-12',
      },
      gap: {
        none: 'gap-0',
        xs: 'gap-2',
        sm: 'gap-3',
        md: 'gap-4',
        lg: 'gap-6',
        xl: 'gap-8',
        '2xl': 'gap-10',
      },
      gapX: {
        none: 'gap-x-0',
        xs: 'gap-x-2',
        sm: 'gap-x-3',
        md: 'gap-x-4',
        lg: 'gap-x-6',
        xl: 'gap-x-8',
        '2xl': 'gap-x-10',
      },
      gapY: {
        none: 'gap-y-0',
        xs: 'gap-y-2',
        sm: 'gap-y-3',
        md: 'gap-y-4',
        lg: 'gap-y-6',
        xl: 'gap-y-8',
        '2xl': 'gap-y-10',
      },
      alignment: {
        start: 'items-start',
        center: 'items-center',
        end: 'items-end',
        stretch: 'items-stretch',
        baseline: 'items-baseline',
      },
      justify: {
        start: 'justify-start',
        center: 'justify-center',
        end: 'justify-end',
        between: 'justify-between',
        around: 'justify-around',
        evenly: 'justify-evenly',
      },
    },
    defaultVariants: {
      cols: 1,
      gap: 'md',
      alignment: 'stretch',
      justify: 'start',
    },
  }
);

export interface GridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gridVariants> {
  as?: React.ElementType;
  autoFit?: boolean;
  autoFill?: boolean;
  minColWidth?: string;
}

export const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ 
    className, 
    cols, 
    gap, 
    gapX, 
    gapY, 
    alignment, 
    justify, 
    autoFit = false,
    autoFill = false,
    minColWidth = '250px',
    children, 
    as: Component = 'div',
    ...props 
  }, ref) => {
    const gridClasses = cn(
      gridVariants({ cols, gap, gapX, gapY, alignment, justify }),
      autoFit && `grid-cols-[repeat(auto-fit,minmax(${minColWidth},1fr))]`,
      autoFill && `grid-cols-[repeat(auto-fill,minmax(${minColWidth},1fr))]`,
      className
    );
    
    return (
      <Component
        ref={ref}
        className={gridClasses}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Grid.displayName = 'Grid';

// Grid Item component for more control
export interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
  span?: number | { sm?: number; md?: number; lg?: number; xl?: number };
  start?: number | { sm?: number; md?: number; lg?: number; xl?: number };
  order?: number | { sm?: number; md?: number; lg?: number; xl?: number };
}

export const GridItem = React.forwardRef<HTMLDivElement, GridItemProps>(
  ({ 
    className, 
    span, 
    start, 
    order, 
    children, 
    as: Component = 'div',
    ...props 
  }, ref) => {
    const getSpanClasses = () => {
      if (typeof span === 'number') {
        return `col-span-${span}`;
      }
      if (typeof span === 'object') {
        return [
          span.sm && `sm:col-span-${span.sm}`,
          span.md && `md:col-span-${span.md}`,
          span.lg && `lg:col-span-${span.lg}`,
          span.xl && `xl:col-span-${span.xl}`,
        ].filter(Boolean).join(' ');
      }
      return '';
    };

    const getStartClasses = () => {
      if (typeof start === 'number') {
        return `col-start-${start}`;
      }
      if (typeof start === 'object') {
        return [
          start.sm && `sm:col-start-${start.sm}`,
          start.md && `md:col-start-${start.md}`,
          start.lg && `lg:col-start-${start.lg}`,
          start.xl && `xl:col-start-${start.xl}`,
        ].filter(Boolean).join(' ');
      }
      return '';
    };

    const getOrderClasses = () => {
      if (typeof order === 'number') {
        return `order-${order}`;
      }
      if (typeof order === 'object') {
        return [
          order.sm && `sm:order-${order.sm}`,
          order.md && `md:order-${order.md}`,
          order.lg && `lg:order-${order.lg}`,
          order.xl && `xl:order-${order.xl}`,
        ].filter(Boolean).join(' ');
      }
      return '';
    };

    const itemClasses = cn(
      getSpanClasses(),
      getStartClasses(),
      getOrderClasses(),
      className
    );
    
    return (
      <Component
        ref={ref}
        className={itemClasses}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

GridItem.displayName = 'GridItem';

export { gridVariants };
export default Grid;
