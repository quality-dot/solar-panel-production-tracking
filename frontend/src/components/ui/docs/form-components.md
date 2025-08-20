# Form Components Documentation

Comprehensive documentation for form-related UI components designed for production floor environments.

## 🎯 Overview

Form components are designed with industrial use in mind, featuring:
- Large touch targets for gloved hands
- Clear visual feedback for all states
- Robust validation and error handling
- Accessibility-first design

---

## Button

A versatile button component with multiple variants, sizes, and states.

### Props

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  state?: 'default' | 'hover' | 'active' | 'disabled';
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  as?: React.ElementType;
}
```

### Usage Examples

#### Basic Button
```typescript
import { Button } from '@/components/ui';

function BasicExample() {
  return (
    <Button variant="primary" size="lg">
      Start Production
    </Button>
  );
}
```

#### Button with Icons
```typescript
function IconExample() {
  return (
    <Button 
      variant="secondary" 
      leftIcon={<CheckIcon />}
      rightIcon={<ArrowRightIcon />}
    >
      Complete Task
    </Button>
  );
}
```

#### Loading State
```typescript
function LoadingExample() {
  const [loading, setLoading] = useState(false);
  
  return (
    <Button 
      variant="primary" 
      loading={loading}
      onClick={() => setLoading(true)}
    >
      {loading ? 'Processing...' : 'Submit'}
    </Button>
  );
}
```

#### Full Width Button
```typescript
function FullWidthExample() {
  return (
    <Button variant="primary" fullWidth>
      Emergency Stop
    </Button>
  );
}
```

### Variants

- **default** - Standard button styling
- **primary** - Main action buttons (blue)
- **secondary** - Secondary actions (gray)
- **ghost** - Transparent background
- **link** - Text-only, link-style
- **destructive** - Dangerous actions (red)

### Sizes

- **sm** - Compact buttons (32px height)
- **md** - Standard buttons (40px height)
- **lg** - Large buttons (48px height) - *Recommended for touch*
- **xl** - Extra large buttons (56px height)

### Accessibility Features

- Proper ARIA labels and states
- Keyboard navigation (Enter/Space)
- Focus indicators
- Loading state announcements
- Icon alternative text

---

## Input

Text input component with validation, icons, and multiple states.

### Props

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'filled' | 'outlined';
  inputSize?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  helperText?: string;
  error?: string;
  success?: string;
  warning?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  required?: boolean;
  showCharacterCount?: boolean;
  maxCharacters?: number;
}
```

### Usage Examples

#### Basic Input
```typescript
import { Input } from '@/components/ui';

function BasicInputExample() {
  return (
    <Input 
      label="Panel Serial Number"
      placeholder="Enter serial number"
      required
    />
  );
}
```

#### Input with Validation
```typescript
function ValidationExample() {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const validate = (val: string) => {
    if (val.length < 8) {
      setError('Serial number must be at least 8 characters');
    } else {
      setError('');
    }
  };

  return (
    <Input 
      label="Panel Serial Number"
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        validate(e.target.value);
      }}
      error={error}
      helperText="Format: SPXXXXXXXX"
    />
  );
}
```

#### Input with Icons
```typescript
function IconInputExample() {
  return (
    <Input 
      label="Search Panels"
      leftIcon={<SearchIcon />}
      rightIcon={<QRCodeIcon />}
      placeholder="Scan or type barcode"
    />
  );
}
```

### States

- **Default** - Normal input state
- **Error** - Validation error with red styling
- **Success** - Validation success with green styling  
- **Warning** - Warning state with yellow styling
- **Disabled** - Non-interactive state

---

## Select

Dropdown selection component with search and grouping capabilities.

### Props

```typescript
interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  variant?: 'default' | 'filled' | 'outlined';
  selectSize?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  helperText?: string;
  error?: string;
  success?: string;
  warning?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  grouped?: boolean;
}

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}
```

### Usage Examples

#### Basic Select
```typescript
import { Select } from '@/components/ui';

const stations = [
  { value: 'cutting', label: 'Cutting Station' },
  { value: 'assembly', label: 'Assembly Station' },
  { value: 'testing', label: 'Testing Station' },
  { value: 'packaging', label: 'Packaging Station' }
];

function BasicSelectExample() {
  const [station, setStation] = useState('');

  return (
    <Select 
      label="Production Station"
      options={stations}
      value={station}
      onChange={setStation}
      placeholder="Select station"
    />
  );
}
```

#### Grouped Select
```typescript
const groupedOptions = [
  { value: 'cut1', label: 'Cutting Station 1', group: 'Cutting' },
  { value: 'cut2', label: 'Cutting Station 2', group: 'Cutting' },
  { value: 'asm1', label: 'Assembly Line A', group: 'Assembly' },
  { value: 'asm2', label: 'Assembly Line B', group: 'Assembly' },
];

function GroupedSelectExample() {
  return (
    <Select 
      label="Workstation"
      options={groupedOptions}
      grouped
      placeholder="Select workstation"
    />
  );
}
```

---

## Textarea

Multi-line text input with auto-resize and character counting.

### Props

```typescript
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  helperText?: string;
  error?: string;
  success?: string;
  warning?: string;
  fullWidth?: boolean;
  maxLength?: number;
  showCharCount?: boolean;
  autoResize?: boolean;
}
```

### Usage Examples

#### Basic Textarea
```typescript
import { Textarea } from '@/components/ui';

function BasicTextareaExample() {
  return (
    <Textarea 
      label="Quality Notes"
      placeholder="Enter inspection notes..."
      rows={4}
    />
  );
}
```

#### Auto-resize with Character Count
```typescript
function AutoResizeExample() {
  return (
    <Textarea 
      label="Incident Report"
      placeholder="Describe the incident..."
      autoResize
      maxLength={500}
      showCharCount
      helperText="Please provide detailed information"
    />
  );
}
```

---

## Checkbox

Single and grouped checkbox components with proper accessibility.

### Props

```typescript
interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  variant?: 'default' | 'success' | 'warning' | 'error';
  checkboxSize?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  helperText?: string;
  error?: string;
  success?: string;
  warning?: string;
  onChange?: (checked: boolean) => void;
}
```

### Usage Examples

#### Basic Checkbox
```typescript
import { Checkbox } from '@/components/ui';

function BasicCheckboxExample() {
  const [checked, setChecked] = useState(false);

  return (
    <Checkbox 
      label="Quality check completed"
      checked={checked}
      onChange={setChecked}
    />
  );
}
```

#### Checkbox Group
```typescript
function CheckboxGroupExample() {
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  const handleCheck = (item: string, checked: boolean) => {
    if (checked) {
      setCheckedItems(prev => [...prev, item]);
    } else {
      setCheckedItems(prev => prev.filter(i => i !== item));
    }
  };

  return (
    <div className="space-y-4">
      <h3>Inspection Checklist</h3>
      {[
        'Visual inspection complete',
        'Electrical testing passed',
        'Packaging verified',
        'Documentation updated'
      ].map(item => (
        <Checkbox 
          key={item}
          label={item}
          checked={checkedItems.includes(item)}
          onChange={(checked) => handleCheck(item, checked)}
        />
      ))}
    </div>
  );
}
```

---

## Radio

Radio button groups for exclusive selections.

### Props

```typescript
interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  variant?: 'default' | 'success' | 'warning' | 'error';
  radioSize?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  helperText?: string;
  error?: string;
  success?: string;
  warning?: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
}

interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}
```

### Usage Examples

#### Basic Radio Group
```typescript
import { Radio } from '@/components/ui';

const priorityOptions = [
  { value: 'low', label: 'Low Priority' },
  { value: 'medium', label: 'Medium Priority' },
  { value: 'high', label: 'High Priority' },
  { value: 'urgent', label: 'Urgent' }
];

function BasicRadioExample() {
  const [priority, setPriority] = useState('medium');

  return (
    <Radio 
      label="Task Priority"
      options={priorityOptions}
      value={priority}
      onChange={setPriority}
    />
  );
}
```

---

## 🎨 Styling Guidelines

### Touch Targets

All form components follow touch-friendly sizing:

- **Minimum 44px height** for all interactive elements
- **8px minimum spacing** between adjacent elements  
- **Large hit areas** extending beyond visual boundaries

### Visual Hierarchy

- **Primary actions** use high-contrast colors
- **Secondary actions** use muted colors
- **Destructive actions** use red variants
- **Success states** use green variants

### Error Handling

- **Clear error messages** with specific guidance
- **Inline validation** for immediate feedback
- **Error summaries** for complex forms
- **Recovery suggestions** when possible

## ♿ Accessibility Best Practices

### Labels and Descriptions

```typescript
// Good: Proper labeling
<Input 
  label="Panel Serial Number"
  helperText="Format: SPXXXXXXXX"
  required
  aria-describedby="serial-help"
/>

// Good: Error association
<Input 
  label="Panel Serial Number"
  error="Serial number is required"
  aria-invalid="true"
  aria-describedby="serial-error"
/>
```

### Keyboard Navigation

- All components support Tab navigation
- Enter/Space activation for buttons and checkboxes
- Arrow keys for radio groups and selects
- Escape to close dropdowns and modals

### Screen Reader Support

- Semantic HTML elements
- ARIA labels and descriptions  
- Live regions for dynamic content
- State announcements for changes

---

## 🧪 Testing Examples

### Basic Component Test

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui';

test('button handles click events', async () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>Click me</Button>);
  
  await userEvent.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### Accessibility Test

```typescript
test('input has proper accessibility attributes', () => {
  render(
    <Input 
      label="Test Input"
      helperText="Helper text"
      error="Error message"
    />
  );
  
  const input = screen.getByLabelText('Test Input');
  expect(input).toHaveAttribute('aria-describedby');
  expect(input).toHaveAttribute('aria-invalid', 'true');
});
```

---

## 📱 Mobile & PWA Considerations

### Touch Optimization

- **Larger touch targets** on mobile devices
- **Touch feedback** with visual/haptic responses
- **Gesture support** where appropriate
- **Offline functionality** with proper indicators

### Performance

- **Lazy loading** for heavy components
- **Debounced inputs** for search functionality
- **Efficient re-rendering** with React.memo
- **Bundle optimization** with tree-shaking

---

*For more examples and advanced usage, see the [UIDemo component](../UIDemo.tsx) and [test files](../tests/).*
