# Feedback Components Documentation

Comprehensive documentation for user feedback and status UI components designed for production floor environments.

## 🎯 Overview

Feedback components provide crucial user interface feedback, featuring:
- Clear visual status indicators
- Accessible notifications and alerts
- Touch-friendly interactive elements
- Production-appropriate timing and animations

---

## LoadingSpinner

A versatile loading indicator with multiple variants, sizes, and animation speeds.

### Props

```typescript
interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'light' | 'dark';
  speed?: 'slow' | 'normal' | 'fast';
  as?: React.ElementType;
  label?: string;
  showLabel?: boolean;
}
```

### Usage Examples

#### Basic Loading Spinner
```typescript
import { LoadingSpinner } from '@/components/ui';

function BasicSpinnerExample() {
  return (
    <div className="flex items-center justify-center p-8">
      <LoadingSpinner size="lg" variant="primary" />
    </div>
  );
}
```

#### Loading Spinner with Label
```typescript
function SpinnerWithLabelExample() {
  return (
    <div className="text-center">
      <LoadingSpinner 
        size="xl" 
        variant="success" 
        showLabel 
        label="Processing panels..."
      />
    </div>
  );
}
```

#### Different Speeds and Contexts
```typescript
function SpinnerVariantsExample() {
  return (
    <div className="grid grid-cols-3 gap-8 p-8">
      {/* Fast spinner for quick operations */}
      <div className="text-center">
        <LoadingSpinner 
          size="md" 
          variant="primary" 
          speed="fast"
          showLabel
          label="Scanning..."
        />
      </div>
      
      {/* Normal spinner for standard operations */}
      <div className="text-center">
        <LoadingSpinner 
          size="lg" 
          variant="warning" 
          speed="normal"
          showLabel
          label="Processing..."
        />
      </div>
      
      {/* Slow spinner for long operations */}
      <div className="text-center">
        <LoadingSpinner 
          size="xl" 
          variant="success" 
          speed="slow"
          showLabel
          label="Analyzing..."
        />
      </div>
    </div>
  );
}
```

#### Loading States in Components
```typescript
function LoadingStateExample() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await processPanel();
      setData(result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <LoadingSpinner 
              size="lg" 
              variant="primary"
              showLabel
              label="Processing panel data..."
            />
          </div>
        ) : data ? (
          <div>Panel processed successfully!</div>
        ) : (
          <Button onClick={handleSubmit}>
            Process Panel
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

### Size Variants

- **sm** - 16px × 16px - For inline loading
- **md** - 24px × 24px - Standard size
- **lg** - 32px × 32px - Prominent loading states
- **xl** - 48px × 48px - Full-screen loading
- **2xl** - 64px × 64px - Major operation loading

### Color Variants

- **default/primary** - Blue for standard operations
- **secondary** - Gray for background operations
- **success** - Green for completion states
- **warning** - Yellow for cautionary operations
- **error** - Red for error recovery states
- **light** - White for dark backgrounds
- **dark** - Dark for light backgrounds

### Speed Variants

- **slow** - 2s rotation for long operations
- **normal** - 1s rotation for standard operations
- **fast** - 0.5s rotation for quick operations

---

## StatusIndicator

A status badge component with icons and color coding for various states.

### Props

```typescript
interface StatusIndicatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'pending' | 'completed' | 'inProgress' | 'failed';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  as?: React.ElementType;
  children: React.ReactNode;
}
```

### Usage Examples

#### Basic Status Indicators
```typescript
import { StatusIndicator } from '@/components/ui';

function BasicStatusExample() {
  return (
    <div className="space-y-4">
      <StatusIndicator status="success" showIcon>
        Quality Check Passed
      </StatusIndicator>
      
      <StatusIndicator status="warning" showIcon>
        Inspection Required
      </StatusIndicator>
      
      <StatusIndicator status="error" showIcon>
        Production Halted
      </StatusIndicator>
      
      <StatusIndicator status="info" showIcon>
        Maintenance Scheduled
      </StatusIndicator>
    </div>
  );
}
```

#### Production Status Dashboard
```typescript
function ProductionStatusExample() {
  const panels = [
    { id: 'SP001', status: 'completed', label: 'Completed' },
    { id: 'SP002', status: 'inProgress', label: 'In Progress' },
    { id: 'SP003', status: 'pending', label: 'Queued' },
    { id: 'SP004', status: 'failed', label: 'Failed QC' },
  ];

  return (
    <Card>
      <CardHeader>
        <h3>Panel Production Status</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {panels.map(panel => (
            <div key={panel.id} className="flex items-center justify-between">
              <span className="font-medium">{panel.id}</span>
              <StatusIndicator 
                status={panel.status as any} 
                showIcon 
                size="md"
              >
                {panel.label}
              </StatusIndicator>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

#### Dynamic Status Updates
```typescript
function DynamicStatusExample() {
  const [status, setStatus] = useState<'pending' | 'inProgress' | 'completed' | 'failed'>('pending');

  const processPanel = async () => {
    setStatus('inProgress');
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Random success/failure
    setStatus(Math.random() > 0.2 ? 'completed' : 'failed');
  };

  return (
    <Card>
      <CardContent>
        <div className="text-center space-y-4">
          <StatusIndicator status={status} showIcon size="lg">
            {status === 'pending' && 'Ready to Process'}
            {status === 'inProgress' && 'Processing Panel...'}
            {status === 'completed' && 'Panel Completed'}
            {status === 'failed' && 'Processing Failed'}
          </StatusIndicator>
          
          {status === 'pending' && (
            <Button onClick={processPanel} variant="primary">
              Start Processing
            </Button>
          )}
          
          {(status === 'completed' || status === 'failed') && (
            <Button onClick={() => setStatus('pending')} variant="secondary">
              Reset
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Status Types

- **success/completed** - Green with checkmark icon
- **warning** - Yellow with warning icon
- **error/failed** - Red with error icon
- **info** - Blue with info icon
- **neutral** - Gray with no special styling
- **pending** - Orange with animated spinner icon
- **inProgress** - Blue with animated pulse icon

### Animated Icons

- **pending** - Rotating spinner for queued items
- **inProgress** - Pulsing icon for active operations

---

## Toast

A notification component for temporary messages with auto-dismiss functionality.

### Props

```typescript
interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: 'success' | 'error' | 'warning' | 'info' | 'neutral';
  position?: 'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center';
  as?: React.ElementType;
  title?: string;
  message: string;
  duration?: number;
  onClose?: () => void;
  showCloseButton?: boolean;
  persistent?: boolean;
}
```

### Usage Examples

#### Basic Toast Notifications
```typescript
import { Toast } from '@/components/ui';

function BasicToastExample() {
  const [toasts, setToasts] = useState<any[]>([]);

  const showToast = (type: string, message: string) => {
    const newToast = {
      id: Date.now(),
      type,
      message,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Notification`
    };
    
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <div>
      <div className="space-x-4 mb-8">
        <Button onClick={() => showToast('success', 'Panel processed successfully!')}>
          Success Toast
        </Button>
        <Button onClick={() => showToast('error', 'Failed to process panel')}>
          Error Toast
        </Button>
        <Button onClick={() => showToast('warning', 'Maintenance required soon')}>
          Warning Toast
        </Button>
        <Button onClick={() => showToast('info', 'New panels available for processing')}>
          Info Toast
        </Button>
      </div>

      {/* Render toasts */}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          position="top-right"
          onClose={() => removeToast(toast.id)}
          duration={4000}
        />
      ))}
    </div>
  );
}
```

#### Production Floor Notifications
```typescript
function ProductionToastExample() {
  const notifyQualityCheck = (panelId: string, passed: boolean) => {
    if (passed) {
      return (
        <Toast
          type="success"
          title="Quality Check Passed"
          message={`Panel ${panelId} passed all quality checks`}
          position="top-center"
          duration={3000}
        />
      );
    } else {
      return (
        <Toast
          type="error"
          title="Quality Check Failed"
          message={`Panel ${panelId} requires inspection`}
          position="top-center"
          persistent
          showCloseButton
        />
      );
    }
  };

  const notifyMaintenanceAlert = () => (
    <Toast
      type="warning"
      title="Maintenance Alert"
      message="Station 3 requires maintenance in 30 minutes"
      position="bottom-center"
      duration={10000}
    />
  );

  const notifyShiftChange = () => (
    <Toast
      type="info"
      title="Shift Change"
      message="Next shift starts in 15 minutes"
      position="bottom-right"
      duration={5000}
    />
  );

  return (
    <div>
      {/* Toasts would be triggered by actual events */}
    </div>
  );
}
```

#### Toast with Custom Duration and Persistence
```typescript
function CustomToastExample() {
  const [showCriticalAlert, setShowCriticalAlert] = useState(false);
  const [showQuickUpdate, setShowQuickUpdate] = useState(false);

  return (
    <div>
      <div className="space-x-4">
        <Button onClick={() => setShowCriticalAlert(true)} variant="destructive">
          Critical Alert (Persistent)
        </Button>
        <Button onClick={() => setShowQuickUpdate(true)} variant="secondary">
          Quick Update (1s)
        </Button>
      </div>

      {showCriticalAlert && (
        <Toast
          type="error"
          title="EMERGENCY STOP"
          message="Production line halted - immediate attention required"
          position="top-center"
          persistent
          onClose={() => setShowCriticalAlert(false)}
        />
      )}

      {showQuickUpdate && (
        <Toast
          type="success"
          message="Settings saved"
          position="bottom-right"
          duration={1000}
          showCloseButton={false}
          onClose={() => setShowQuickUpdate(false)}
        />
      )}
    </div>
  );
}
```

### Position Options

- **top-left** - Upper left corner
- **top-right** - Upper right corner (default)
- **top-center** - Top center (good for alerts)
- **bottom-left** - Lower left corner
- **bottom-right** - Lower right corner
- **bottom-center** - Bottom center

### Auto-Dismiss Behavior

- **Default duration**: 5 seconds
- **Persistent toasts**: Don't auto-dismiss
- **Hover pause**: Pauses auto-dismiss on hover
- **Manual dismiss**: Always available with close button

---

## Modal

A modal dialog component for confirmations, forms, and detailed information display.

### Props

```typescript
interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  variant?: 'default' | 'centered' | 'top' | 'bottom';
  children: React.ReactNode;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  preventScroll?: boolean;
}
```

### Usage Examples

#### Basic Modal
```typescript
import { Modal } from '@/components/ui';

function BasicModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>
        Open Modal
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Panel Details"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Serial Number
            </label>
            <p className="text-lg">SP001234</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <StatusIndicator status="success" showIcon>
              Quality Passed
            </StatusIndicator>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Close
            </Button>
            <Button variant="primary">
              Edit Panel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
```

#### Confirmation Modal
```typescript
function ConfirmationModalExample() {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsDeleting(false);
    setShowConfirmation(false);
    // Handle successful deletion
  };

  return (
    <div>
      <Button 
        variant="destructive" 
        onClick={() => setShowConfirmation(true)}
      >
        Delete Panel
      </Button>

      <Modal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        title="Confirm Deletion"
        size="sm"
        closeOnOverlayClick={false}
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete panel SP001234? This action cannot be undone.
          </p>
          
          <div className="flex justify-end space-x-3">
            <Button 
              variant="secondary" 
              onClick={() => setShowConfirmation(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
              loading={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
```

#### Form Modal
```typescript
function FormModalExample() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    serialNumber: '',
    station: '',
    priority: 'medium'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Process form data
    console.log('Form submitted:', formData);
    setIsOpen(false);
  };

  return (
    <div>
      <Button onClick={() => setIsOpen(true)} variant="primary">
        Add New Panel
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Add New Panel"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Serial Number"
            value={formData.serialNumber}
            onChange={(e) => setFormData({
              ...formData, 
              serialNumber: e.target.value
            })}
            placeholder="SP000000"
            required
          />
          
          <Select
            label="Production Station"
            options={[
              { value: 'cutting', label: 'Cutting Station' },
              { value: 'assembly', label: 'Assembly Station' },
              { value: 'testing', label: 'Testing Station' }
            ]}
            value={formData.station}
            onChange={(value) => setFormData({
              ...formData, 
              station: value
            })}
            required
          />
          
          <Radio
            label="Priority Level"
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' }
            ]}
            value={formData.priority}
            onChange={(value) => setFormData({
              ...formData, 
              priority: value
            })}
          />
          
          <div className="flex justify-end space-x-3">
            <Button 
              type="button"
              variant="secondary" 
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add Panel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
```

#### Full-Screen Modal
```typescript
function FullScreenModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>
        Open Full Screen
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Production Dashboard"
        size="full"
        variant="centered"
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 pb-4 mb-6">
            <h2 className="text-2xl font-bold">Real-time Production Monitor</h2>
          </div>
          
          {/* Content */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h3>Active Stations</h3>
              </CardHeader>
              <CardContent>
                {/* Station data */}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <h3>Production Metrics</h3>
              </CardHeader>
              <CardContent>
                {/* Metrics data */}
              </CardContent>
            </Card>
          </div>
          
          {/* Footer */}
          <div className="border-t border-gray-200 pt-4 mt-6">
            <Button 
              variant="secondary" 
              onClick={() => setIsOpen(false)}
              className="w-full"
            >
              Close Dashboard
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
```

### Size Variants

- **sm** - 384px max width - For confirmations
- **md** - 512px max width - Standard dialogs
- **lg** - 640px max width - Forms and details
- **xl** - 896px max width - Complex content
- **full** - Full viewport - Immersive experiences

### Modal Behavior

- **Backdrop click** - Closes modal by default
- **Escape key** - Closes modal by default
- **Focus trapping** - Keeps focus within modal
- **Scroll prevention** - Prevents body scroll when open
- **Auto-focus** - Focuses modal on open

---

## 🎨 Feedback Design Principles

### Visual Hierarchy

Feedback components use clear visual hierarchy:

```typescript
// Critical alerts use high contrast
<Toast type="error" title="CRITICAL" />

// Success messages use positive reinforcement
<StatusIndicator status="success" showIcon />

// Loading states are subtle but visible
<LoadingSpinner variant="secondary" />
```

### Timing Guidelines

- **Quick feedback**: 1-2 seconds (save confirmations)
- **Standard notifications**: 3-5 seconds (status updates)
- **Important alerts**: 8-10 seconds (warnings)
- **Critical alerts**: Persistent (errors requiring action)

### Production Floor Considerations

- **High contrast** for visibility in various lighting
- **Large touch targets** for gloved hands
- **Clear icons** with text labels
- **Appropriate timing** for industrial environments

## ♿ Accessibility Features

### Screen Reader Support

```typescript
// Proper ARIA labels
<LoadingSpinner 
  role="status" 
  aria-label="Loading panel data"
/>

// Live regions for dynamic updates
<Toast 
  role="alert" 
  aria-live="assertive"
/>

// Modal accessibility
<Modal 
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
/>
```

### Keyboard Navigation

- **Tab navigation** through interactive elements
- **Enter/Space** activation for buttons
- **Escape** to close modals and dismiss notifications
- **Arrow keys** for focus management in complex components

### Visual Accessibility

- **High contrast ratios** (4.5:1 minimum)
- **Color-blind friendly** status indicators
- **Clear focus indicators** for keyboard users
- **Scalable text and icons**

---

## 🧪 Testing Feedback Components

### User Interaction Tests

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toast, Modal } from '@/components/ui';

test('toast auto-dismisses after duration', async () => {
  const onClose = jest.fn();
  render(
    <Toast 
      message="Test message" 
      duration={100} 
      onClose={onClose} 
    />
  );
  
  await waitFor(() => {
    expect(onClose).toHaveBeenCalledTimes(1);
  }, { timeout: 200 });
});

test('modal closes on escape key', async () => {
  const onClose = jest.fn();
  render(
    <Modal isOpen={true} onClose={onClose}>
      Content
    </Modal>
  );
  
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(1);
});
```

### Accessibility Testing

```typescript
test('loading spinner has proper accessibility attributes', () => {
  render(<LoadingSpinner label="Loading data" />);
  
  const spinner = screen.getByRole('status');
  expect(spinner).toHaveAttribute('aria-label', 'Loading data');
});

test('status indicator conveys meaning to screen readers', () => {
  render(
    <StatusIndicator status="error" showIcon>
      Failed
    </StatusIndicator>
  );
  
  // Icon should have appropriate color/styling for the status
  expect(screen.getByText('Failed')).toHaveClass('text-red-800');
});
```

---

## 📱 Mobile & Touch Considerations

### Touch-Friendly Interactions

- **Minimum 44px** touch targets for all interactive elements
- **Touch feedback** with visual state changes
- **Swipe gestures** for dismissing toasts (optional)
- **Long-press** for additional actions (context-sensitive)

### Mobile-Specific Behavior

```typescript
// Mobile-optimized modal
<Modal 
  size="full"
  variant="bottom"
  showCloseButton={true}
>
  {/* Content automatically optimized for mobile */}
</Modal>

// Touch-friendly toast positioning
<Toast 
  position="bottom-center"
  className="mx-4" // Side margins on mobile
/>
```

### Performance Considerations

- **Hardware acceleration** for animations
- **Minimal reflows** during state changes
- **Efficient event handling** for touch interactions
- **Battery-conscious** animation timing

---

*For more examples and implementation details, see the [UIDemo component](../UIDemo.tsx) and [test files](../tests/).*
