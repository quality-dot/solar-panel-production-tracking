import React, { useState, useRef, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const navigationVariants = cva(
  'bg-white border-b border-gray-200',
  {
    variants: {
      variant: {
        default: 'bg-white border-gray-200',
        dark: 'bg-gray-900 border-gray-700 text-white',
        primary: 'bg-blue-600 border-blue-700 text-white',
        secondary: 'bg-gray-100 border-gray-300 text-gray-900',
      },
      size: {
        sm: 'py-2',
        md: 'py-4',
        lg: 'py-6',
      },
      sticky: {
        true: 'sticky top-0 z-50',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      sticky: false,
    },
  }
);

export interface NavigationItem {
  id: string;
  label: string;
  href?: string;
  icon?: React.ReactNode;
  children?: NavigationItem[];
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  badge?: string | number;
}

export interface NavigationProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof navigationVariants> {
  as?: React.ElementType;
  items: NavigationItem[];
  logo?: React.ReactNode;
  onItemClick?: (item: NavigationItem) => void;
  showMobileMenu?: boolean;
  onMobileMenuToggle?: (open: boolean) => void;
  mobileBreakpoint?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  showActiveIndicator?: boolean;
}

export const Navigation = React.forwardRef<HTMLElement, NavigationProps>(
  ({ 
    className, 
    variant, 
    size, 
    sticky, 
    items, 
    logo, 
    onItemClick,
    showMobileMenu = false,
    onMobileMenuToggle,
    mobileBreakpoint = 'lg',
    orientation = 'horizontal',
    showActiveIndicator = true,
    children, 
    as: Component = 'nav',
    ...props 
  }, ref) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeItem, setActiveItem] = useState<string | null>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    const handleItemClick = (item: NavigationItem) => {
      if (item.disabled) return;
      
      if (item.onClick) {
        item.onClick();
      } else if (onItemClick) {
        onItemClick(item);
      }
      
      if (item.children) {
        setActiveItem(activeItem === item.id ? null : item.id);
      } else {
        setActiveItem(item.id);
        setMobileMenuOpen(false);
      }
    };

    const toggleMobileMenu = () => {
      const newState = !mobileMenuOpen;
      setMobileMenuOpen(newState);
      onMobileMenuToggle?.(newState);
    };

    // Close mobile menu when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
          setMobileMenuOpen(false);
        }
      };

      if (mobileMenuOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [mobileMenuOpen]);

    const renderNavigationItem = (item: NavigationItem, isMobile = false) => {
      const isActive = item.active || activeItem === item.id;
      const hasChildren = item.children && item.children.length > 0;
      
      const itemClasses = cn(
        'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
        {
          'text-gray-900 bg-gray-100': isActive && variant === 'default',
          'text-white bg-blue-700': isActive && variant === 'primary',
          'text-gray-900 bg-gray-200': isActive && variant === 'secondary',
          'text-white bg-gray-800': isActive && variant === 'dark',
          'text-gray-600 hover:text-gray-900 hover:bg-gray-50': !isActive && variant === 'default',
          'text-blue-200 hover:text-white hover:bg-blue-700': !isActive && variant === 'primary',
          'text-gray-700 hover:text-gray-900 hover:bg-gray-200': !isActive && variant === 'secondary',
          'text-gray-300 hover:text-white hover:bg-gray-800': !isActive && variant === 'dark',
          'opacity-50 cursor-not-allowed': item.disabled,
          'w-full justify-between': isMobile && hasChildren,
        }
      );

      const content = (
        <>
          {item.icon && <span className="mr-2">{item.icon}</span>}
          <span className="flex-1">{item.label}</span>
          {item.badge && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {item.badge}
            </span>
          )}
          {hasChildren && (
            <svg
              className={cn(
                'ml-2 h-4 w-4 transition-transform duration-200',
                isActive ? 'rotate-180' : ''
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </>
      );

      if (item.href && !hasChildren) {
        return (
          <a
            key={item.id}
            href={item.href}
            className={itemClasses}
            onClick={(e) => {
              e.preventDefault();
              handleItemClick(item);
            }}
          >
            {content}
          </a>
        );
      }

      return (
        <button
          key={item.id}
          className={itemClasses}
          onClick={() => handleItemClick(item)}
          disabled={item.disabled}
        >
          {content}
        </button>
      );
    };

    const renderNavigationItems = (isMobile = false) => (
      <div className={cn(
        'flex',
        {
          'flex-col space-y-1': isMobile || orientation === 'vertical',
          'flex-row space-x-1': !isMobile && orientation === 'horizontal',
        }
      )}>
        {items.map((item) => (
          <div key={item.id}>
            {renderNavigationItem(item, isMobile)}
            {item.children && activeItem === item.id && (
              <div className={cn(
                'mt-1',
                {
                  'ml-4': !isMobile,
                  'ml-2': isMobile,
                }
              )}>
                {item.children.map((child) => renderNavigationItem(child, isMobile))}
              </div>
            )}
          </div>
        ))}
      </div>
    );

    return (
      <Component
        ref={ref}
        className={cn(
          navigationVariants({ variant, size, sticky }),
          className
        )}
        {...props}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Logo */}
            {logo && (
              <div className="flex-shrink-0">
                {logo}
              </div>
            )}

            {/* Desktop Navigation */}
            <div className={`hidden ${mobileBreakpoint}:block`}>
              {renderNavigationItems(false)}
            </div>

            {/* Mobile menu button */}
            <div className={`${mobileBreakpoint}:hidden`}>
              <button
                onClick={toggleMobileMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                aria-expanded="false"
                aria-label="Toggle navigation menu"
              >
                <svg
                  className={cn(
                    'h-6 w-6 transition-transform duration-200',
                    mobileMenuOpen ? 'rotate-180' : ''
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div
              ref={mobileMenuRef}
              className={`${mobileBreakpoint}:hidden mt-4 pb-4 border-t border-gray-200`}
            >
              {renderNavigationItems(true)}
            </div>
          )}
        </div>

        {children}
      </Component>
    );
  }
);

Navigation.displayName = 'Navigation';

// Convenience components
export const NavigationBrand = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center', className)}
      {...props}
    />
  )
);
NavigationBrand.displayName = 'NavigationBrand';

export const NavigationLogo = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex-shrink-0', className)}
      {...props}
    />
  )
);
NavigationLogo.displayName = 'NavigationLogo';

export const NavigationTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h1
      ref={ref}
      className={cn('text-lg font-semibold', className)}
      {...props}
    />
  )
);
NavigationTitle.displayName = 'NavigationTitle';

export { navigationVariants };
export default Navigation;
