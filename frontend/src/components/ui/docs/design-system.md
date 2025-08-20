# Design System Documentation

The Solar Panel Production Tracking UI Design System provides a comprehensive set of design tokens, principles, and guidelines for building consistent and accessible interfaces.

## 🎯 Design Philosophy

### Production-First Design
Our design system prioritizes the needs of production floor workers:
- **High visibility** in industrial lighting conditions
- **Touch-friendly** interactions for gloved hands
- **Error prevention** through clear visual cues
- **Quick recognition** for time-sensitive decisions

### Accessibility by Default
Every component is designed with accessibility in mind:
- **WCAG 2.1 AA compliance** as the minimum standard
- **Keyboard navigation** for all interactive elements
- **Screen reader compatibility** with proper semantic markup
- **High contrast ratios** for visual clarity

### Scalable & Maintainable
The system grows with the application:
- **Consistent design tokens** across all components
- **Modular component architecture** for easy updates
- **TypeScript integration** for type safety
- **Comprehensive testing** for reliability

---

## 🎨 Color System

### Primary Colors

```css
/* Primary Blue - Used for main actions and branding */
--color-primary-50: #eff6ff;   /* Very light blue */
--color-primary-100: #dbeafe;  /* Light blue */
--color-primary-200: #bfdbfe;  /* Lighter blue */
--color-primary-300: #93c5fd;  /* Light medium blue */
--color-primary-400: #60a5fa;  /* Medium blue */
--color-primary-500: #3b82f6;  /* Base primary */
--color-primary-600: #2563eb;  /* Darker blue */
--color-primary-700: #1d4ed8;  /* Dark blue */
--color-primary-800: #1e40af;  /* Very dark blue */
--color-primary-900: #1e3a8a;  /* Darkest blue */
```

### Semantic Colors

```css
/* Success Green - For positive states and completed actions */
--color-success-50: #f0fdf4;
--color-success-500: #22c55e;
--color-success-700: #15803d;

/* Warning Yellow - For caution and pending states */
--color-warning-50: #fffbeb;
--color-warning-500: #f59e0b;
--color-warning-700: #a16207;

/* Error Red - For errors and destructive actions */
--color-error-50: #fef2f2;
--color-error-500: #ef4444;
--color-error-700: #b91c1c;

/* Info Blue - For informational content */
--color-info-50: #f0f9ff;
--color-info-500: #06b6d4;
--color-info-700: #0e7490;
```

### Neutral Colors

```css
/* Gray Scale - For text, borders, and backgrounds */
--color-gray-50: #f9fafb;
--color-gray-100: #f3f4f6;
--color-gray-200: #e5e7eb;
--color-gray-300: #d1d5db;
--color-gray-400: #9ca3af;
--color-gray-500: #6b7280;
--color-gray-600: #4b5563;
--color-gray-700: #374151;
--color-gray-800: #1f2937;
--color-gray-900: #111827;
```

### Color Usage Guidelines

#### Primary Actions
```typescript
// Use primary colors for main call-to-action buttons
<Button variant="primary">Start Production</Button>

// Use primary colors for active navigation items
<NavigationItem active>Dashboard</NavigationItem>
```

#### Status Communication
```typescript
// Use semantic colors to communicate status
<StatusIndicator status="success">Completed</StatusIndicator>
<StatusIndicator status="warning">Pending</StatusIndicator>
<StatusIndicator status="error">Failed</StatusIndicator>
```

#### Text Hierarchy
```typescript
// Use gray scale for text hierarchy
<h1 className="text-gray-900">Primary Heading</h1>
<p className="text-gray-700">Body text</p>
<span className="text-gray-500">Secondary text</span>
```

---

## 📏 Typography

### Font Stack

```css
/* Primary font family */
--font-family-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Monospace for code and data */
--font-family-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Font Sizes

```css
/* Text size scale */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
--text-5xl: 3rem;      /* 48px */
--text-6xl: 3.75rem;   /* 60px */
```

### Font Weights

```css
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-extrabold: 800;
```

### Typography Guidelines

#### Hierarchy Example
```typescript
function TypographyExample() {
  return (
    <div className="space-y-4">
      {/* Primary heading */}
      <h1 className="text-4xl font-bold text-gray-900">
        Production Dashboard
      </h1>
      
      {/* Secondary heading */}
      <h2 className="text-2xl font-semibold text-gray-800">
        Daily Summary
      </h2>
      
      {/* Section heading */}
      <h3 className="text-lg font-medium text-gray-700">
        Panel Status
      </h3>
      
      {/* Body text */}
      <p className="text-base text-gray-700">
        Monitor real-time production status and quality metrics.
      </p>
      
      {/* Supporting text */}
      <p className="text-sm text-gray-600">
        Last updated 5 minutes ago
      </p>
      
      {/* Data/code text */}
      <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
        SP001234
      </code>
    </div>
  );
}
```

#### Readable Line Heights
- **Headings**: 1.2 line height for compact spacing
- **Body text**: 1.5 line height for comfortable reading
- **Small text**: 1.4 line height for balance

---

## 📐 Spacing System

### Spacing Scale

```css
/* Spacing scale based on 4px grid */
--space-0: 0;
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-5: 1.25rem;  /* 20px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-10: 2.5rem;  /* 40px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
--space-20: 5rem;    /* 80px */
--space-24: 6rem;    /* 96px */
```

### Component Spacing Guidelines

#### Internal Spacing
```typescript
// Button padding
<Button className="px-4 py-2">      // Standard button
<Button className="px-6 py-3">      // Large button

// Card spacing
<Card className="p-6">              // Standard card
<CardContent className="space-y-4"> // Content spacing
```

#### Layout Spacing
```typescript
// Section spacing
<section className="mb-8">          // Between sections
<div className="space-y-6">         // Between cards
<div className="gap-4">             // Grid gap
```

---

## 🎯 Interactive States

### Button States

```css
/* Default state */
.button-default {
  background-color: var(--color-primary-500);
  color: white;
  transition: all 0.2s ease;
}

/* Hover state */
.button-default:hover {
  background-color: var(--color-primary-600);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* Active state */
.button-default:active {
  background-color: var(--color-primary-700);
  transform: translateY(0);
}

/* Focus state */
.button-default:focus {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}

/* Disabled state */
.button-default:disabled {
  background-color: var(--color-gray-300);
  color: var(--color-gray-500);
  cursor: not-allowed;
}
```

### Touch States

```css
/* Touch feedback for mobile */
@media (hover: none) {
  .button-default:active {
    background-color: var(--color-primary-700);
    transform: scale(0.98);
  }
}
```

---

## 📱 Responsive Design

### Breakpoints

```css
/* Mobile first breakpoints */
--breakpoint-sm: 640px;   /* Small tablets */
--breakpoint-md: 768px;   /* Large tablets */
--breakpoint-lg: 1024px;  /* Small laptops */
--breakpoint-xl: 1280px;  /* Large laptops */
--breakpoint-2xl: 1536px; /* Large screens */
```

### Touch Target Guidelines

```css
/* Minimum touch target sizes */
--touch-target-min: 44px;     /* Minimum for accessibility */
--touch-target-comfortable: 48px; /* Comfortable size */
--touch-target-large: 56px;   /* Large/primary actions */
```

### Responsive Typography

```css
/* Fluid typography scale */
.heading-responsive {
  font-size: clamp(1.5rem, 4vw, 3rem);
}

.text-responsive {
  font-size: clamp(0.875rem, 2vw, 1.125rem);
}
```

---

## 🌗 Dark Mode Support

### Color Variables

```css
/* Light mode (default) */
:root {
  --color-background: #ffffff;
  --color-surface: #f9fafb;
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-border: #e5e7eb;
}

/* Dark mode */
[data-theme="dark"] {
  --color-background: #111827;
  --color-surface: #1f2937;
  --color-text-primary: #f9fafb;
  --color-text-secondary: #d1d5db;
  --color-border: #374151;
}
```

### Implementation Example

```typescript
function ThemeAwareComponent() {
  return (
    <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent>
          Theme-aware content
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## ⚡ Animation & Motion

### Animation Principles

1. **Purposeful**: Every animation serves a functional purpose
2. **Performant**: Hardware-accelerated when possible
3. **Accessible**: Respects user motion preferences
4. **Consistent**: Same duration and easing across similar interactions

### Timing Functions

```css
/* Easing curves */
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### Animation Durations

```css
/* Duration scale */
--duration-fast: 150ms;     /* Quick feedback */
--duration-normal: 300ms;   /* Standard transitions */
--duration-slow: 500ms;     /* Complex animations */
```

### Common Animations

```css
/* Fade in/out */
.fade-enter {
  opacity: 0;
  transform: translateY(10px);
}

.fade-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: opacity var(--duration-normal) var(--ease-out),
              transform var(--duration-normal) var(--ease-out);
}

/* Scale feedback */
.scale-feedback:active {
  transform: scale(0.95);
  transition: transform var(--duration-fast) var(--ease-out);
}
```

### Reduced Motion Support

```css
/* Respect user preferences */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 🧩 Component Architecture

### Base Component Pattern

```typescript
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

// Define component variants
const componentVariants = cva(
  // Base classes that always apply
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-white border border-gray-300',
        primary: 'bg-blue-600 text-white',
        secondary: 'bg-gray-100 text-gray-900',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

// Props interface
export interface ComponentProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof componentVariants> {
  as?: React.ElementType;
}

// Component implementation
export const Component = React.forwardRef<HTMLButtonElement, ComponentProps>(
  ({ className, variant, size, as: Component = 'button', ...props }, ref) => {
    return (
      <Component
        className={cn(componentVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Component.displayName = 'Component';
```

### Compound Component Pattern

```typescript
// Main component
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, size }), className)}
      {...props}
    />
  )
);

// Sub-components
export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  )
);

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
```

---

## 🧪 Testing Design System

### Visual Regression Testing

```typescript
// Component snapshot testing
import { render } from '@testing-library/react';
import { Button } from '@/components/ui';

describe('Button Visual Tests', () => {
  test('renders all variants consistently', () => {
    const variants = ['default', 'primary', 'secondary', 'destructive'];
    const sizes = ['sm', 'md', 'lg', 'xl'];
    
    variants.forEach(variant => {
      sizes.forEach(size => {
        const { container } = render(
          <Button variant={variant} size={size}>
            Test Button
          </Button>
        );
        expect(container.firstChild).toMatchSnapshot(
          `button-${variant}-${size}`
        );
      });
    });
  });
});
```

### Accessibility Testing

```typescript
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Design System Accessibility', () => {
  test('color contrast meets WCAG standards', async () => {
    const { container } = render(
      <div>
        <Button variant="primary">Primary Button</Button>
        <Button variant="secondary">Secondary Button</Button>
        <StatusIndicator status="success">Success</StatusIndicator>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

---

## 📚 Design Tokens Reference

### Complete Token List

```typescript
// Design tokens as TypeScript constants
export const designTokens = {
  colors: {
    primary: {
      50: '#eff6ff',
      500: '#3b82f6',
      900: '#1e3a8a',
    },
    gray: {
      50: '#f9fafb',
      500: '#6b7280',
      900: '#111827',
    },
    success: {
      50: '#f0fdf4',
      500: '#22c55e',
      700: '#15803d',
    },
    // ... additional colors
  },
  spacing: {
    0: '0',
    1: '0.25rem',
    4: '1rem',
    8: '2rem',
    // ... additional spacing
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      // ... additional sizes
    },
  },
  animation: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    ease: {
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
} as const;
```

### Usage in Components

```typescript
import { designTokens } from './design-tokens';

const buttonStyles = {
  padding: `${designTokens.spacing[2]} ${designTokens.spacing[4]}`,
  fontSize: designTokens.typography.fontSize.base,
  fontFamily: designTokens.typography.fontFamily.sans.join(', '),
  backgroundColor: designTokens.colors.primary[500],
  transition: `all ${designTokens.animation.duration.normal} ${designTokens.animation.ease.out}`,
};
```

---

## 🚀 Future Enhancements

### Planned Features

1. **Component Generator**: CLI tool for creating new components with proper structure
2. **Theme Editor**: Visual tool for customizing design tokens
3. **Storybook Integration**: Interactive component documentation
4. **Design Tool Integration**: Figma tokens and export capabilities

### Version Management

The design system follows semantic versioning:
- **Major**: Breaking changes to component APIs
- **Minor**: New components or non-breaking feature additions  
- **Patch**: Bug fixes and small improvements

---

*This design system is continuously evolving. For the latest updates and examples, see the [component documentation](./README.md) and [live demos](../UIDemo.tsx).*
