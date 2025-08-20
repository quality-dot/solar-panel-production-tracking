# UI Components Tests

This directory contains comprehensive tests for all UI components in the Solar Panel Production Tracking system.

## 📁 Test Structure

```
tests/
├── README.md                          # This file
├── run-tests.cjs                      # Basic test runner
├── run-tests.js                       # ES module test runner  
├── ui-components.test.tsx             # Form component tests
├── layout-components.test.tsx         # Layout component tests
├── feedback-components.test.tsx       # Feedback component tests
└── integration.test.tsx               # Cross-component integration tests
```

## 🚀 Running Tests

### All Tests
```bash
# Run all component tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

### Specific Test Files
```bash
# Run form component tests
npm test -- src/components/ui/tests/ui-components.test.tsx

# Run layout component tests  
npm test -- src/components/ui/tests/layout-components.test.tsx

# Run feedback component tests
npm test -- src/components/ui/tests/feedback-components.test.tsx
```

### Simple Test Runner (Fallback)
```bash
# If Jest is not available, use the simple runner
node src/components/ui/tests/run-tests.cjs
```

## 📊 Test Coverage

Our test suite maintains high coverage across all component categories:

### Coverage Summary
- **Form Components**: 36+ tests covering all variants, sizes, and interactions
- **Layout Components**: 24+ tests covering responsive behavior and composition
- **Feedback Components**: 36+ tests covering animations, timing, and accessibility
- **Integration Tests**: Cross-component workflows and real-world scenarios

### Coverage Breakdown by Component

#### Form Components ✅
- **Button**: Variants, sizes, states, interactions, accessibility
- **Input**: Validation, icons, error states, character counting
- **Select**: Options, grouping, search, keyboard navigation
- **Textarea**: Auto-resize, character limits, validation
- **Checkbox**: Individual and group selections, states
- **Radio**: Group behavior, validation, accessibility

#### Layout Components ✅  
- **Container**: Responsive sizing, spacing variants, fluid behavior
- **Card**: Variants, compound components, interactive states
- **Grid**: Column layouts, responsive behavior, auto-fit/fill
- **Navigation**: Mobile responsiveness, active states, accessibility

#### Feedback Components ✅
- **LoadingSpinner**: Sizes, variants, speeds, accessibility labels
- **StatusIndicator**: Status types, icons, animations, semantic meaning
- **Toast**: Auto-dismiss, positioning, persistence, user interactions
- **Modal**: Focus management, keyboard navigation, overlay interactions

## 🧪 Test Categories

### 1. Unit Tests
Test individual component functionality in isolation:

```typescript
test('button renders with correct variant classes', () => {
  render(<Button variant="primary">Test</Button>);
  expect(screen.getByRole('button')).toHaveClass('bg-blue-600');
});
```

### 2. Interaction Tests
Test user interactions and event handling:

```typescript
test('button handles click events', async () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>Click me</Button>);
  
  await userEvent.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### 3. Accessibility Tests
Verify WCAG compliance and screen reader compatibility:

```typescript
test('input has proper accessibility attributes', () => {
  render(<Input label="Test Input" error="Error message" />);
  
  const input = screen.getByLabelText('Test Input');
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(input).toHaveAttribute('aria-describedby');
});
```

### 4. Responsive Tests
Test behavior across different viewport sizes:

```typescript
test('navigation adapts to mobile viewport', () => {
  render(<Navigation showMobileToggle items={navItems} />);
  expect(screen.getByRole('button', { name: /toggle menu/i }))
    .toBeInTheDocument();
});
```

### 5. Integration Tests
Test component combinations and workflows:

```typescript
test('form submission with validation workflow', async () => {
  render(<ContactForm />);
  
  // Test validation
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));
  expect(screen.getByText('Name is required')).toBeInTheDocument();
  
  // Fill form and submit
  await userEvent.type(screen.getByLabelText(/name/i), 'John Doe');
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));
  
  expect(mockSubmit).toHaveBeenCalledWith({ name: 'John Doe' });
});
```

## 🎯 Testing Philosophy

### User-Centric Testing
We test components from a user's perspective:
- **What the user sees** (text, labels, visual elements)
- **What the user can do** (click, type, navigate)
- **How the system responds** (feedback, state changes)

### Accessibility-First Testing
Every test includes accessibility considerations:
- **Semantic markup** verification
- **ARIA attributes** testing
- **Keyboard navigation** support
- **Screen reader** compatibility

### Production-Ready Testing
Tests simulate real production scenarios:
- **Touch interactions** for mobile/tablet use
- **Error conditions** and edge cases
- **Performance considerations** for large datasets
- **Browser compatibility** issues

## 🛠️ Test Utilities

### Custom Matchers
Extended Jest matchers for better assertions:

```typescript
// Example custom matcher usage
expect(button).toHaveAccessibleName('Save document');
expect(modal).toTrapFocus();
expect(toast).toAutoDismissAfter(5000);
```

### Test Data Factories
Consistent test data generation:

```typescript
const panel = createTestPanel({
  serialNumber: 'SP001234',
  status: 'in-progress',
  station: 'assembly'
});
```

### Mock Services
Simulated API responses and external dependencies:

```typescript
mockPanelService.getPanels.mockResolvedValue([
  createTestPanel({ id: '1' }),
  createTestPanel({ id: '2' })
]);
```

## 🔧 Test Configuration

### Jest Setup
Our Jest configuration optimizes for:
- **TypeScript** support with ts-jest
- **JSX/TSX** transformation
- **Module path mapping** for clean imports
- **Coverage collection** with appropriate thresholds

### Testing Library Setup
React Testing Library configuration includes:
- **jest-dom** extended matchers
- **user-event** for realistic interactions
- **Custom render** function with providers
- **Screen reader** testing utilities

### Mock Setup
Global mocks for browser APIs:
- **ResizeObserver** for responsive components
- **IntersectionObserver** for visibility detection
- **matchMedia** for media query testing
- **localStorage/sessionStorage** for persistence

## 📈 Coverage Goals

### Minimum Thresholds
- **Statements**: 90%
- **Branches**: 85%
- **Functions**: 90%
- **Lines**: 90%

### Per-Component Targets
Each component should have:
- **100% function coverage** - All public methods tested
- **95% line coverage** - Most code paths exercised
- **90% branch coverage** - All conditional logic tested

### Excluded from Coverage
- **Type definitions** (*.d.ts files)
- **Story files** (*.stories.tsx files)
- **Test utilities** and setup files
- **Generated code** and build artifacts

## 🚨 Common Testing Patterns

### Testing Component Variants
```typescript
test.each([
  ['primary', 'bg-blue-600'],
  ['secondary', 'bg-gray-100'],
  ['destructive', 'bg-red-600'],
])('applies %s variant classes', (variant, expectedClass) => {
  render(<Button variant={variant as any}>Button</Button>);
  expect(screen.getByRole('button')).toHaveClass(expectedClass);
});
```

### Testing Async Behavior
```typescript
test('shows loading state during async operation', async () => {
  const promise = Promise.resolve();
  mockApi.saveData.mockReturnValue(promise);
  
  render(<SaveButton />);
  await userEvent.click(screen.getByRole('button'));
  
  expect(screen.getByText('Saving...')).toBeInTheDocument();
  
  await act(() => promise);
  expect(screen.getByText('Saved!')).toBeInTheDocument();
});
```

### Testing Error States
```typescript
test('displays error message when validation fails', async () => {
  render(<ValidationForm />);
  
  await userEvent.type(screen.getByLabelText(/email/i), 'invalid-email');
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));
  
  expect(screen.getByText('Please enter a valid email address'))
    .toBeInTheDocument();
});
```

## 🐛 Debugging Tests

### Common Issues

1. **Element not found**: Use `screen.debug()` to see rendered output
2. **Timing issues**: Use `waitFor()` for async operations
3. **Event not firing**: Prefer `userEvent` over `fireEvent`
4. **Mock not working**: Ensure mock is called before component render

### Debugging Commands
```bash
# Debug specific test
npm test -- --testNamePattern="button renders" --verbose

# Run single test file with debugging
npm test -- src/components/ui/tests/ui-components.test.tsx --no-coverage --verbose

# Use Jest's built-in debugger
node --inspect-brk node_modules/.bin/jest --runInBand --testNamePattern="specific test"
```

## 📚 Additional Resources

### Documentation
- [Testing Guide](../docs/testing-guide.md) - Comprehensive testing documentation
- [Component Documentation](../docs/) - Individual component documentation
- [Design System](../docs/design-system.md) - Design principles and tokens

### External Resources
- [React Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [ARIA Testing Guide](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/)

---

## 🤝 Contributing

### Adding New Tests

1. **Follow naming conventions**: `ComponentName.test.tsx`
2. **Group related tests**: Use `describe` blocks appropriately
3. **Include accessibility tests**: Test ARIA attributes and keyboard navigation
4. **Add integration scenarios**: Test real-world component usage
5. **Update coverage thresholds**: If adding significant new functionality

### Test Review Checklist

- [ ] Tests are user-focused, not implementation-focused
- [ ] All interactive elements have accessibility tests
- [ ] Error states and edge cases are covered
- [ ] Async operations are properly awaited
- [ ] Mock data is realistic and consistent
- [ ] Test names clearly describe expected behavior

---

*Keep tests simple, focused, and maintainable. Test behavior, not implementation.*
