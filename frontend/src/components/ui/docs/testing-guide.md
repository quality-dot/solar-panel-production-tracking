# Testing Guide

Comprehensive testing guide for the Solar Panel Production Tracking UI components, covering unit tests, integration tests, accessibility testing, and visual regression testing.

## 🎯 Testing Philosophy

### Testing Pyramid

Our testing strategy follows the testing pyramid principle:

1. **Unit Tests (70%)** - Fast, isolated component tests
2. **Integration Tests (20%)** - Component interaction tests  
3. **End-to-End Tests (10%)** - Full user workflow tests

### Testing Principles

- **User-Centric**: Test behavior, not implementation
- **Accessibility-First**: Every test includes accessibility checks
- **Production-Ready**: Test real-world scenarios and edge cases
- **Fast Feedback**: Tests run quickly and provide clear error messages

---

## 🛠️ Testing Setup

### Dependencies

```json
{
  "devDependencies": {
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0",
    "jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0",
    "ts-jest": "^29.0.0"
  }
}
```

### Jest Configuration

```javascript
// jest.config.cjs
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx}'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### Test Setup File

```typescript
// src/setupTests.ts
import '@testing-library/jest-dom';

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
```

---

## 🧪 Unit Testing

### Basic Component Testing

```typescript
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

describe('Button Component', () => {
  test('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  test('handles click events', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('applies variant classes correctly', () => {
    render(<Button variant="primary">Primary Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600', 'text-white');
  });

  test('forwards ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Button</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
```

### Props Testing Pattern

```typescript
describe('Button Props', () => {
  test.each([
    ['primary', 'bg-blue-600'],
    ['secondary', 'bg-gray-100'],
    ['destructive', 'bg-red-600'],
  ])('applies %s variant classes', (variant, expectedClass) => {
    render(<Button variant={variant as any}>Button</Button>);
    expect(screen.getByRole('button')).toHaveClass(expectedClass);
  });

  test.each([
    ['sm', 'px-3', 'py-1.5'],
    ['md', 'px-4', 'py-2'],
    ['lg', 'px-6', 'py-3'],
  ])('applies %s size classes', (size, expectedPadding, expectedPaddingY) => {
    render(<Button size={size as any}>Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass(expectedPadding, expectedPaddingY);
  });
});
```

### State Testing

```typescript
describe('Button States', () => {
  test('shows loading state correctly', () => {
    render(<Button loading>Loading Button</Button>);
    
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Loading Button')).toBeInTheDocument();
    // Could also test for loading spinner presence
  });

  test('disabled state prevents interaction', async () => {
    const handleClick = jest.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  test('fullWidth adds correct classes', () => {
    render(<Button fullWidth>Full Width</Button>);
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });
});
```

---

## 🔧 Integration Testing

### Form Component Integration

```typescript
import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input, Button, Select } from '../index';

describe('Form Integration', () => {
  test('form submission with validation', async () => {
    const onSubmit = jest.fn();
    
    function TestForm() {
      const [values, setValues] = useState({
        serialNumber: '',
        station: '',
      });
      const [errors, setErrors] = useState<Record<string, string>>({});

      const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};
        
        if (!values.serialNumber) {
          newErrors.serialNumber = 'Serial number is required';
        }
        if (!values.station) {
          newErrors.station = 'Station is required';
        }

        setErrors(newErrors);
        
        if (Object.keys(newErrors).length === 0) {
          onSubmit(values);
        }
      };

      return (
        <form onSubmit={handleSubmit}>
          <Input
            label="Serial Number"
            value={values.serialNumber}
            onChange={(e) => setValues(prev => ({ 
              ...prev, 
              serialNumber: e.target.value 
            }))}
            error={errors.serialNumber}
          />
          
          <Select
            label="Station"
            options={[
              { value: 'cutting', label: 'Cutting Station' },
              { value: 'assembly', label: 'Assembly Station' },
            ]}
            value={values.station}
            onChange={(value) => setValues(prev => ({ 
              ...prev, 
              station: value 
            }))}
            error={errors.station}
          />
          
          <Button type="submit">Submit</Button>
        </form>
      );
    }

    render(<TestForm />);

    // Test validation on empty submit
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(screen.getByText('Serial number is required')).toBeInTheDocument();
    expect(screen.getByText('Station is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    // Fill out form and submit
    await userEvent.type(
      screen.getByLabelText(/serial number/i), 
      'SP001234'
    );
    await userEvent.selectOptions(
      screen.getByLabelText(/station/i), 
      'cutting'
    );
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      serialNumber: 'SP001234',
      station: 'cutting',
    });
  });
});
```

### Modal Workflow Testing

```typescript
describe('Modal Workflow', () => {
  test('complete modal interaction flow', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    function ModalWorkflow() {
      const [isOpen, setIsOpen] = useState(false);

      return (
        <div>
          <Button onClick={() => setIsOpen(true)}>
            Open Modal
          </Button>
          
          <Modal
            isOpen={isOpen}
            onClose={() => {
              setIsOpen(false);
              onCancel();
            }}
            title="Confirm Action"
          >
            <p>Are you sure you want to proceed?</p>
            <div className="flex space-x-2 mt-4">
              <Button 
                variant="secondary"
                onClick={() => {
                  setIsOpen(false);
                  onCancel();
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="primary"
                onClick={() => {
                  setIsOpen(false);
                  onConfirm();
                }}
              >
                Confirm
              </Button>
            </div>
          </Modal>
        </div>
      );
    }

    render(<ModalWorkflow />);

    // Open modal
    await userEvent.click(screen.getByRole('button', { name: /open modal/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();

    // Test cancel
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onCancel).toHaveBeenCalledTimes(1);

    // Test confirm flow
    await userEvent.click(screen.getByRole('button', { name: /open modal/i }));
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
```

---

## ♿ Accessibility Testing

### ARIA Attributes Testing

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Button Accessibility', () => {
  test('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <Button>Default Button</Button>
        <Button variant="primary">Primary Button</Button>
        <Button disabled>Disabled Button</Button>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('supports aria-label for icon buttons', () => {
    render(
      <Button aria-label="Close dialog">
        <CloseIcon />
      </Button>
    );
    
    expect(screen.getByRole('button', { name: /close dialog/i }))
      .toBeInTheDocument();
  });

  test('announces loading state to screen readers', () => {
    render(<Button loading aria-label="Processing request">Submit</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    // Could also check for aria-describedby pointing to loading text
  });
});
```

### Keyboard Navigation Testing

```typescript
describe('Keyboard Navigation', () => {
  test('button responds to Enter and Space keys', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button');
    button.focus();

    // Test Enter key
    await userEvent.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Test Space key
    await userEvent.keyboard(' ');
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  test('modal traps focus correctly', async () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <Input label="First Input" />
        <Input label="Second Input" />
        <Button>Close</Button>
      </Modal>
    );

    const modal = screen.getByRole('dialog');
    const firstInput = screen.getByLabelText(/first input/i);
    const secondInput = screen.getByLabelText(/second input/i);
    const closeButton = screen.getByRole('button', { name: /close/i });

    // Tab through elements
    await userEvent.tab();
    expect(firstInput).toHaveFocus();

    await userEvent.tab();
    expect(secondInput).toHaveFocus();

    await userEvent.tab();
    expect(closeButton).toHaveFocus();

    // Tab should wrap back to first element
    await userEvent.tab();
    expect(firstInput).toHaveFocus();
  });
});
```

### Focus Management Testing

```typescript
describe('Focus Management', () => {
  test('modal focuses first focusable element on open', async () => {
    function FocusTest() {
      const [isOpen, setIsOpen] = useState(false);
      
      return (
        <div>
          <Button onClick={() => setIsOpen(true)}>Open</Button>
          <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
            <Input label="Auto-focused input" autoFocus />
            <Button>Submit</Button>
          </Modal>
        </div>
      );
    }

    render(<FocusTest />);
    
    await userEvent.click(screen.getByRole('button', { name: /open/i }));
    
    // Check that the input is focused when modal opens
    expect(screen.getByLabelText(/auto-focused input/i)).toHaveFocus();
  });

  test('restores focus when modal closes', async () => {
    function FocusRestoreTest() {
      const [isOpen, setIsOpen] = useState(false);
      
      return (
        <div>
          <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
          <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
            <Button onClick={() => setIsOpen(false)}>Close Modal</Button>
          </Modal>
        </div>
      );
    }

    render(<FocusRestoreTest />);
    
    const openButton = screen.getByRole('button', { name: /open modal/i });
    
    // Focus and click the open button
    openButton.focus();
    await userEvent.click(openButton);
    
    // Close the modal
    await userEvent.click(screen.getByRole('button', { name: /close modal/i }));
    
    // Focus should return to the open button
    expect(openButton).toHaveFocus();
  });
});
```

---

## 📱 Responsive Testing

### Viewport Testing

```typescript
// Test utilities for responsive testing
const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  window.dispatchEvent(new Event('resize'));
};

describe('Responsive Behavior', () => {
  test('navigation adapts to mobile viewport', () => {
    setViewport(375, 667); // iPhone SE

    render(
      <Navigation 
        items={[
          { id: 'home', label: 'Home', href: '/' },
          { id: 'about', label: 'About', href: '/about' },
        ]}
        showMobileToggle
        mobileBreakpoint="md"
      />
    );

    // Should show mobile toggle button
    expect(screen.getByRole('button', { name: /toggle menu/i }))
      .toBeInTheDocument();
  });

  test('grid responds to container size', () => {
    const { rerender } = render(
      <div style={{ width: '320px' }}>
        <Grid cols={4} className="grid-cols-1 md:grid-cols-4">
          <GridItem>Item 1</GridItem>
          <GridItem>Item 2</GridItem>
        </Grid>
      </div>
    );

    // Test mobile layout
    expect(screen.getByText('Item 1').closest('[class*="grid"]'))
      .toHaveClass('grid-cols-1');

    // Test desktop layout
    rerender(
      <div style={{ width: '1024px' }}>
        <Grid cols={4} className="grid-cols-1 md:grid-cols-4">
          <GridItem>Item 1</GridItem>
          <GridItem>Item 2</GridItem>
        </Grid>
      </div>
    );

    expect(screen.getByText('Item 1').closest('[class*="grid"]'))
      .toHaveClass('md:grid-cols-4');
  });
});
```

---

## ⏱️ Performance Testing

### Render Performance

```typescript
import { render } from '@testing-library/react';
import { performance } from 'perf_hooks';

describe('Performance Tests', () => {
  test('large grid renders efficiently', () => {
    const startTime = performance.now();
    
    const items = Array.from({ length: 1000 }, (_, i) => (
      <GridItem key={i}>
        <Card>
          <CardContent>Item {i}</CardContent>
        </Card>
      </GridItem>
    ));

    render(
      <Grid cols={4} gap="md">
        {items}
      </Grid>
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render 1000 items in under 100ms
    expect(renderTime).toBeLessThan(100);
  });

  test('component re-renders efficiently', () => {
    const Component = ({ count }: { count: number }) => (
      <div>
        {Array.from({ length: count }, (_, i) => (
          <Button key={i}>Button {i}</Button>
        ))}
      </div>
    );

    const { rerender } = render(<Component count={10} />);
    
    const startTime = performance.now();
    rerender(<Component count={20} />);
    const endTime = performance.now();

    const rerenderTime = endTime - startTime;
    expect(rerenderTime).toBeLessThan(50);
  });
});
```

---

## 🎨 Visual Regression Testing

### Snapshot Testing

```typescript
describe('Visual Snapshots', () => {
  test('button variants render consistently', () => {
    const variants = ['default', 'primary', 'secondary', 'destructive'] as const;
    const sizes = ['sm', 'md', 'lg', 'xl'] as const;

    variants.forEach(variant => {
      sizes.forEach(size => {
        const { container } = render(
          <Button variant={variant} size={size}>
            {variant} {size}
          </Button>
        );
        
        expect(container.firstChild).toMatchSnapshot(
          `button-${variant}-${size}`
        );
      });
    });
  });

  test('card layouts render consistently', () => {
    const { container } = render(
      <Card variant="elevated" size="lg">
        <CardHeader>
          <h3>Test Card</h3>
          <StatusIndicator status="success" showIcon>
            Active
          </StatusIndicator>
        </CardHeader>
        <CardContent>
          <p>This is test content for visual regression testing.</p>
        </CardContent>
        <CardFooter>
          <Button variant="primary">Action</Button>
          <Button variant="secondary">Cancel</Button>
        </CardFooter>
      </Card>
    );

    expect(container.firstChild).toMatchSnapshot('card-complex-layout');
  });
});
```

---

## 🚀 Test Utilities

### Custom Render Function

```typescript
// src/test-utils.tsx
import React from 'react';
import { render, RenderOptions } from '@testing-library/react';

// Theme provider wrapper
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <div data-theme="light">
      {children}
    </div>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

### Test Data Factories

```typescript
// src/test-data.ts
export const createTestPanel = (overrides = {}) => ({
  id: 'SP001234',
  serialNumber: 'SP001234',
  status: 'in-progress',
  station: 'assembly',
  qualityScore: 98,
  startTime: new Date('2024-01-01T09:00:00Z'),
  ...overrides,
});

export const createTestUser = (overrides = {}) => ({
  id: 'user123',
  name: 'John Doe',
  role: 'operator',
  station: 'assembly',
  ...overrides,
});
```

### Mock Factories

```typescript
// src/test-mocks.ts
export const mockApi = {
  getPanels: jest.fn(),
  createPanel: jest.fn(),
  updatePanel: jest.fn(),
  deletePanel: jest.fn(),
};

export const mockNotifications = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
};
```

---

## 📊 Coverage Guidelines

### Coverage Targets

- **Statements**: 90%+
- **Branches**: 85%+
- **Functions**: 90%+
- **Lines**: 90%+

### Coverage Analysis

```bash
# Generate coverage report
npm test -- --coverage

# View detailed coverage report
npm test -- --coverage --coverageReporters=html
open coverage/lcov-report/index.html
```

### Excluding Files from Coverage

```javascript
// jest.config.cjs
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/test-utils.tsx',
    '!src/setupTests.ts',
  ],
};
```

---

## 🔄 Continuous Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, development]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run linting
        run: npm run lint
        
      - name: Run type checking
        run: npm run type-check
        
      - name: Run tests
        run: npm test -- --coverage --watchAll=false
        
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

---

## 📝 Best Practices

### Test Organization

1. **Group related tests** using `describe` blocks
2. **Use descriptive test names** that explain the expected behavior
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **Test one thing at a time** in each test case

### Test Maintenance

1. **Keep tests simple** and focused
2. **Avoid testing implementation details**
3. **Use page object patterns** for complex interactions
4. **Regular test review** and cleanup

### Performance

1. **Use `screen.getBy*`** over `container.querySelector`
2. **Prefer `userEvent`** over `fireEvent` for realistic interactions
3. **Mock external dependencies** to improve test speed
4. **Parallelize test execution** when possible

---

*For more testing examples and patterns, see the individual component test files in the [tests directory](../tests/).*
