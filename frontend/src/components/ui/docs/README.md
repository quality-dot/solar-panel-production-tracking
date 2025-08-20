# UI Components Documentation

A comprehensive collection of production-ready UI components for the Solar Panel Production Tracking PWA. These components are designed specifically for industrial environments with focus on accessibility, touch-friendly interactions, and robust error handling.

## 📋 Table of Contents

- [Overview](#overview)
- [Design Principles](#design-principles)
- [Component Categories](#component-categories)
- [Usage Guidelines](#usage-guidelines)
- [Accessibility Features](#accessibility-features)
- [Testing](#testing)
- [Contributing](#contributing)

## 🎯 Overview

This UI component library provides a complete set of reusable components built with:

- **React 18** with TypeScript for type safety
- **Tailwind CSS** for consistent styling
- **Class Variance Authority (CVA)** for variant management
- **ARIA Standards** for accessibility compliance
- **Touch-First Design** for production floor use

## 🎨 Design Principles

### 1. Production Floor First
- Large touch targets (minimum 44px)
- High contrast ratios for visibility in various lighting
- Clear visual feedback for all interactions
- Minimal cognitive load for operators

### 2. Accessibility by Default
- WCAG 2.1 AA compliance
- Screen reader support
- Keyboard navigation
- Focus management

### 3. Consistent & Predictable
- Unified design tokens
- Consistent spacing and sizing
- Predictable interaction patterns
- Semantic color usage

### 4. Performance Optimized
- Lightweight bundle size
- Hardware-accelerated animations
- Efficient re-rendering
- Tree-shakeable exports

## 📦 Component Categories

### Form Components
- **[Button](./form-components.md#button)** - Primary actions, secondary actions, icon buttons
- **[Input](./form-components.md#input)** - Text inputs with validation and accessibility
- **[Select](./form-components.md#select)** - Dropdown selections with search capabilities
- **[Textarea](./form-components.md#textarea)** - Multi-line text input with auto-resize
- **[Checkbox](./form-components.md#checkbox)** - Single and group selections
- **[Radio](./form-components.md#radio)** - Exclusive selections with grouping

### Layout Components
- **[Container](./layout-components.md#container)** - Responsive content containers
- **[Card](./layout-components.md#card)** - Content cards with headers and footers
- **[Grid](./layout-components.md#grid)** - Flexible grid system with responsive breakpoints
- **[Navigation](./layout-components.md#navigation)** - App navigation with mobile support

### Feedback Components
- **[LoadingSpinner](./feedback-components.md#loadingspinner)** - Loading states with variants
- **[StatusIndicator](./feedback-components.md#statusindicator)** - Status badges with icons
- **[Toast](./feedback-components.md#toast)** - Notification messages
- **[Modal](./feedback-components.md#modal)** - Dialog overlays and confirmations

## 🚀 Usage Guidelines

### Installation

Components are available through the main export:

```typescript
import { Button, Card, LoadingSpinner } from '@/components/ui';
```

### Basic Usage

```typescript
import React from 'react';
import { Button, Card, CardHeader, CardContent } from '@/components/ui';

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <h3>Production Status</h3>
      </CardHeader>
      <CardContent>
        <Button variant="primary" size="lg">
          Start Production
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Styling Customization

All components accept a `className` prop for custom styling:

```typescript
<Button 
  variant="primary" 
  className="w-full mb-4" 
>
  Custom Styled Button
</Button>
```

### Variant System

Components use a consistent variant system:

```typescript
// Size variants
size="sm" | "md" | "lg" | "xl"

// Color variants
variant="default" | "primary" | "secondary" | "success" | "warning" | "error"

// State variants
state="default" | "hover" | "active" | "disabled"
```

## ♿ Accessibility Features

### Keyboard Navigation
- All interactive components support keyboard navigation
- Tab order follows logical flow
- Enter/Space activation for buttons
- Arrow key navigation for lists and grids

### Screen Reader Support
- Semantic HTML elements
- ARIA labels and descriptions
- Live regions for dynamic content
- Role definitions for custom components

### Visual Accessibility
- High contrast color schemes
- Clear focus indicators
- Scalable text and icons
- Color-blind friendly palettes

### Touch Accessibility
- Minimum 44px touch targets
- Adequate spacing between elements
- Touch feedback animations
- Gesture support where appropriate

## 🧪 Testing

### Testing Philosophy
- All components have comprehensive test coverage
- Tests include accessibility verification
- User interaction testing with React Testing Library
- Visual regression testing capabilities

### Running Tests

```bash
# Run all component tests
npm test

# Run specific component tests
npm test -- Button.test.tsx

# Run tests with coverage
npm test -- --coverage
```

### Test Categories

1. **Unit Tests** - Component rendering and props
2. **Interaction Tests** - User interactions and events
3. **Accessibility Tests** - ARIA attributes and keyboard navigation
4. **Integration Tests** - Component combinations and workflows

## 🤝 Contributing

### Adding New Components

1. Create component file in appropriate category
2. Add to main export in `index.ts`
3. Create comprehensive tests
4. Add documentation with examples
5. Update this README with new component

### Component Structure

```
ComponentName/
├── ComponentName.tsx       # Main component
├── ComponentName.test.tsx  # Tests
├── ComponentName.stories.tsx # Storybook stories (optional)
└── docs/
    └── component-name.md   # Documentation
```

### Code Standards

- TypeScript strict mode
- ESLint configuration compliance
- Prettier formatting
- Consistent naming conventions
- Comprehensive prop documentation

---

## 📚 Detailed Documentation

For detailed documentation of each component, including props, examples, and best practices:

- **[Form Components](./form-components.md)** - Interactive form elements (Button, Input, Select, Textarea, Checkbox, Radio)
- **[Layout Components](./layout-components.md)** - Structural layout components (Container, Card, Grid, Navigation)
- **[Feedback Components](./feedback-components.md)** - User feedback and status components (LoadingSpinner, StatusIndicator, Toast, Modal)
- **[Design System](./design-system.md)** - Design tokens, principles, and guidelines
- **[Testing Guide](./testing-guide.md)** - Comprehensive testing documentation and best practices

---

## 🔗 Quick Links

- **[Component Demo](../UIDemo.tsx)** - Live component showcase with all examples
- **[Test Suite](../tests/README.md)** - Testing documentation and coverage
- **[Component Tests](../tests/)** - Individual test files for each component category
- **[Design Tokens](./design-system.md#design-tokens-reference)** - Complete token reference
- **[Accessibility Guide](./testing-guide.md#accessibility-testing)** - WCAG compliance and testing

---

## 📋 Component Status

### ✅ Completed Components

| Component | Tests | Documentation | Accessibility | Production Ready |
|-----------|-------|---------------|---------------|------------------|
| **Button** | ✅ 100% | ✅ Complete | ✅ WCAG 2.1 AA | ✅ Yes |
| **Input** | ✅ 100% | ✅ Complete | ✅ WCAG 2.1 AA | ✅ Yes |
| **Select** | ✅ 100% | ✅ Complete | ✅ WCAG 2.1 AA | ✅ Yes |
| **Textarea** | ✅ 100% | ✅ Complete | ✅ WCAG 2.1 AA | ✅ Yes |
| **Checkbox** | ✅ 100% | ✅ Complete | ✅ WCAG 2.1 AA | ✅ Yes |
| **Radio** | ✅ 100% | ✅ Complete | ✅ WCAG 2.1 AA | ✅ Yes |
| **Container** | ✅ 100% | ✅ Complete | ✅ WCAG 2.1 AA | ✅ Yes |
| **Card** | ✅ 100% | ✅ Complete | ✅ WCAG 2.1 AA | ✅ Yes |
| **Grid** | ✅ 100% | ✅ Complete | ✅ WCAG 2.1 AA | ✅ Yes |
| **Navigation** | ✅ 100% | ✅ Complete | ✅ WCAG 2.1 AA | ✅ Yes |
| **LoadingSpinner** | ✅ 100% | ✅ Complete | ✅ WCAG 2.1 AA | ✅ Yes |
| **StatusIndicator** | ✅ 100% | ✅ Complete | ✅ WCAG 2.1 AA | ✅ Yes |
| **Toast** | ✅ 100% | ✅ Complete | ✅ WCAG 2.1 AA | ✅ Yes |
| **Modal** | ✅ 100% | ✅ Complete | ✅ WCAG 2.1 AA | ✅ Yes |

**Total**: 14 components, 96+ tests, 100% documentation coverage
