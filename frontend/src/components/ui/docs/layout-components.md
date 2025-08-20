# Layout Components Documentation

Comprehensive documentation for layout and structural UI components designed for responsive design and production floor environments.

## 🎯 Overview

Layout components provide the structural foundation for the application, featuring:
- Responsive design patterns
- Flexible grid systems
- Consistent spacing and alignment
- Mobile-first approach

---

## Container

A responsive container component that centers content and provides consistent max-widths across breakpoints.

### Props

```typescript
interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  spacing?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fluid?: boolean;
  as?: React.ElementType;
}
```

### Usage Examples

#### Basic Container
```typescript
import { Container } from '@/components/ui';

function BasicContainerExample() {
  return (
    <Container size="lg" spacing="md">
      <h1>Production Dashboard</h1>
      <p>Content is automatically centered and responsive</p>
    </Container>
  );
}
```

#### Full Width Container
```typescript
function FullWidthExample() {
  return (
    <Container size="full" spacing="lg">
      <div className="bg-blue-50 p-8">
        <h2>Full Width Section</h2>
        <p>Takes up the entire viewport width</p>
      </div>
    </Container>
  );
}
```

#### Fluid Container
```typescript
function FluidExample() {
  return (
    <Container fluid spacing="none">
      {/* No max-width restrictions, fills parent */}
      <div className="w-full bg-gray-100 p-4">
        Fluid container content
      </div>
    </Container>
  );
}
```

### Size Variants

- **sm** - max-width: 640px (sm)
- **md** - max-width: 768px (md)  
- **lg** - max-width: 1024px (lg)
- **xl** - max-width: 1280px (xl)
- **full** - max-width: 100%

### Spacing Variants

- **none** - No padding
- **xs** - 8px padding
- **sm** - 16px padding
- **md** - 24px padding
- **lg** - 32px padding
- **xl** - 48px padding

---

## Card

A flexible content container with header, body, and footer sections.

### Props

```typescript
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  interactive?: boolean;
  as?: React.ElementType;
}
```

### Components

- **Card** - Main container
- **CardHeader** - Header section with title and actions
- **CardContent** - Main content area
- **CardFooter** - Footer section with actions

### Usage Examples

#### Basic Card
```typescript
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui';

function BasicCardExample() {
  return (
    <Card variant="default" size="md">
      <CardHeader>
        <h3>Panel Status</h3>
        <span className="text-sm text-gray-500">ID: SP001234</span>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p><strong>Status:</strong> In Production</p>
          <p><strong>Progress:</strong> 75%</p>
          <p><strong>ETA:</strong> 2 hours</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="primary">View Details</Button>
        <Button variant="secondary">Edit</Button>
      </CardFooter>
    </Card>
  );
}
```

#### Interactive Card
```typescript
function InteractiveCardExample() {
  const [selected, setSelected] = useState(false);

  return (
    <Card 
      variant="outlined" 
      interactive
      className={cn(
        'cursor-pointer transition-all',
        selected && 'ring-2 ring-blue-500'
      )}
      onClick={() => setSelected(!selected)}
    >
      <CardContent>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <CheckIcon className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h4>Quality Check Passed</h4>
            <p className="text-sm text-gray-600">Panel SP001234</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### Card with Complex Layout
```typescript
function ComplexCardExample() {
  return (
    <Card variant="elevated" size="lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3>Production Line A</h3>
            <p className="text-sm text-gray-600">Status: Active</p>
          </div>
          <StatusIndicator status="success" showIcon>
            Operating
          </StatusIndicator>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">24</div>
            <div className="text-sm text-gray-600">Panels Today</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">98%</div>
            <div className="text-sm text-gray-600">Quality Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">2.3h</div>
            <div className="text-sm text-gray-600">Avg Time</div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <div className="flex space-x-2 w-full">
          <Button variant="primary" className="flex-1">
            View Details
          </Button>
          <Button variant="secondary" className="flex-1">
            Pause Line
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
```

### Variants

- **default** - Standard card with subtle border
- **elevated** - Card with shadow elevation
- **outlined** - Card with prominent border
- **filled** - Card with background color

### Interactive Features

- **Hover effects** when interactive prop is true
- **Focus indicators** for keyboard navigation
- **Touch feedback** for mobile interactions
- **State management** support

---

## Grid

A powerful grid system with responsive columns, gaps, and auto-fit capabilities.

### Props

```typescript
interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: number | 'auto';
  rows?: number | 'auto';
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  autoFit?: boolean;
  autoFill?: boolean;
  minColWidth?: string;
  minRowHeight?: string;
  as?: React.ElementType;
}

interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  colSpan?: number | 'full';
  rowSpan?: number | 'full';
  colStart?: number;
  colEnd?: number;
  rowStart?: number;
  rowEnd?: number;
  as?: React.ElementType;
}
```

### Components

- **Grid** - Grid container
- **GridItem** - Grid item with spanning capabilities

### Usage Examples

#### Basic Grid
```typescript
import { Grid, GridItem } from '@/components/ui';

function BasicGridExample() {
  return (
    <Grid cols={3} gap="md">
      <GridItem>
        <Card>
          <CardContent>Panel 1</CardContent>
        </Card>
      </GridItem>
      <GridItem>
        <Card>
          <CardContent>Panel 2</CardContent>
        </Card>
      </GridItem>
      <GridItem>
        <Card>
          <CardContent>Panel 3</CardContent>
        </Card>
      </GridItem>
    </Grid>
  );
}
```

#### Responsive Grid
```typescript
function ResponsiveGridExample() {
  return (
    <Grid 
      cols={4} 
      gap="lg"
      className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
    >
      {Array.from({length: 8}).map((_, i) => (
        <GridItem key={i}>
          <Card>
            <CardContent>
              <h4>Station {i + 1}</h4>
              <StatusIndicator status="success">Active</StatusIndicator>
            </CardContent>
          </Card>
        </GridItem>
      ))}
    </Grid>
  );
}
```

#### Auto-Fit Grid
```typescript
function AutoFitGridExample() {
  return (
    <Grid 
      autoFit 
      minColWidth="250px" 
      gap="md"
    >
      {panels.map(panel => (
        <GridItem key={panel.id}>
          <Card>
            <CardHeader>
              <h4>{panel.serialNumber}</h4>
            </CardHeader>
            <CardContent>
              <StatusIndicator status={panel.status}>
                {panel.statusLabel}
              </StatusIndicator>
            </CardContent>
          </Card>
        </GridItem>
      ))}
    </Grid>
  );
}
```

#### Grid Item Spanning
```typescript
function SpanningGridExample() {
  return (
    <Grid cols={4} rows={3} gap="md">
      <GridItem colSpan={2} rowSpan={2}>
        <Card className="h-full">
          <CardHeader>
            <h3>Production Overview</h3>
          </CardHeader>
          <CardContent>
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-bold">156</div>
                <div>Panels Today</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </GridItem>
      
      <GridItem>
        <Card>
          <CardContent>Quality Rate</CardContent>
        </Card>
      </GridItem>
      
      <GridItem>
        <Card>
          <CardContent>Efficiency</CardContent>
        </Card>
      </GridItem>
      
      <GridItem colSpan={2}>
        <Card>
          <CardContent>Recent Activity</CardContent>
        </Card>
      </GridItem>
    </Grid>
  );
}
```

### Gap Sizes

- **none** - 0px gap
- **xs** - 4px gap
- **sm** - 8px gap
- **md** - 16px gap
- **lg** - 24px gap
- **xl** - 32px gap

### Advanced Features

- **Auto-fit** - Automatically fits columns based on min width
- **Auto-fill** - Fills available space with columns
- **Responsive breakpoints** - Works with Tailwind responsive classes
- **Nested grids** - Grids can be nested within grid items

---

## Navigation

A comprehensive navigation component with mobile support and accessibility features.

### Props

```typescript
interface NavigationProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'default' | 'compact' | 'sidebar';
  size?: 'sm' | 'md' | 'lg';
  position?: 'static' | 'sticky' | 'fixed';
  items?: NavigationItem[];
  children?: React.ReactNode;
  mobileBreakpoint?: 'sm' | 'md' | 'lg';
  showMobileToggle?: boolean;
  as?: React.ElementType;
}

interface NavigationItem {
  id: string;
  label: string;
  href: string;
  active?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  badge?: string | number;
}
```

### Components

- **Navigation** - Main navigation container
- **NavigationBrand** - Brand/logo section
- **NavigationLogo** - Logo component
- **NavigationTitle** - Title component

### Usage Examples

#### Basic Navigation
```typescript
import { 
  Navigation, 
  NavigationBrand, 
  NavigationLogo, 
  NavigationTitle 
} from '@/components/ui';

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', href: '/', active: true },
  { id: 'scan', label: 'Panel Scan', href: '/scan' },
  { id: 'inspect', label: 'Inspections', href: '/inspections' },
  { id: 'reports', label: 'Reports', href: '/reports' },
  { id: 'settings', label: 'Settings', href: '/settings' }
];

function BasicNavigationExample() {
  return (
    <Navigation 
      variant="default" 
      size="lg" 
      items={navigationItems}
      sticky
    >
      <NavigationBrand>
        <NavigationLogo>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">SP</span>
          </div>
        </NavigationLogo>
        <NavigationTitle>
          Solar Panel Tracker
        </NavigationTitle>
      </NavigationBrand>
    </Navigation>
  );
}
```

#### Navigation with Icons and Badges
```typescript
function IconNavigationExample() {
  const itemsWithIcons = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      href: '/', 
      active: true,
      icon: <DashboardIcon />
    },
    { 
      id: 'scan', 
      label: 'Scan', 
      href: '/scan',
      icon: <QRCodeIcon />
    },
    { 
      id: 'alerts', 
      label: 'Alerts', 
      href: '/alerts',
      icon: <AlertIcon />,
      badge: 3
    }
  ];

  return (
    <Navigation 
      variant="sidebar" 
      items={itemsWithIcons}
    >
      <NavigationBrand>
        <NavigationTitle>Production Control</NavigationTitle>
      </NavigationBrand>
    </Navigation>
  );
}
```

#### Compact Mobile Navigation
```typescript
function CompactNavigationExample() {
  return (
    <Navigation 
      variant="compact" 
      size="md"
      showMobileToggle
      mobileBreakpoint="md"
      items={navigationItems}
    >
      <NavigationBrand>
        <NavigationLogo>
          <span className="text-xl font-bold">SP</span>
        </NavigationLogo>
      </NavigationBrand>
    </Navigation>
  );
}
```

### Variants

- **default** - Standard horizontal navigation
- **compact** - Condensed navigation for smaller screens
- **sidebar** - Vertical sidebar navigation

### Features

- **Mobile responsive** with hamburger menu
- **Active state management** for current page
- **Badge support** for notifications
- **Icon support** for visual hierarchy
- **Keyboard navigation** support
- **Sticky/fixed positioning** options

### Accessibility

- **ARIA navigation landmarks**
- **Keyboard navigation** (Tab, Enter, Arrow keys)
- **Screen reader support** with proper labeling
- **Focus management** for mobile toggle
- **Semantic HTML** structure

---

## 🎨 Layout Design Principles

### Responsive Design

All layout components follow mobile-first responsive principles:

```typescript
// Mobile-first responsive grid
<Grid 
  cols={1}
  className="md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
  gap="md"
>
  {/* Grid items */}
</Grid>
```

### Consistent Spacing

Layout components use a consistent spacing scale:

- **4px** (xs) - Tight spacing
- **8px** (sm) - Small spacing  
- **16px** (md) - Standard spacing
- **24px** (lg) - Large spacing
- **32px** (xl) - Extra large spacing

### Flexible Layouts

Components are designed to be composable and flexible:

```typescript
function ComplexLayout() {
  return (
    <Container size="xl">
      <Navigation items={navItems} />
      
      <Grid cols={12} gap="lg">
        <GridItem colSpan={8}>
          <Card>
            <CardContent>Main content area</CardContent>
          </Card>
        </GridItem>
        
        <GridItem colSpan={4}>
          <Card>
            <CardContent>Sidebar content</CardContent>
          </Card>
        </GridItem>
      </Grid>
    </Container>
  );
}
```

## 📱 Mobile Considerations

### Touch-Friendly Navigation

- **Minimum 44px** touch targets for navigation items
- **Easy-to-reach** hamburger menu placement
- **Swipe gestures** support (when appropriate)
- **Large tap areas** for menu items

### Responsive Breakpoints

- **sm**: 640px
- **md**: 768px  
- **lg**: 1024px
- **xl**: 1280px

### Performance Optimizations

- **Lazy loading** for off-screen content
- **Efficient re-rendering** with React optimization
- **CSS-only animations** for smooth interactions
- **Minimal JavaScript** for layout calculations

---

## 🧪 Testing Layout Components

### Responsive Testing

```typescript
import { render, screen } from '@testing-library/react';
import { Container } from '@/components/ui';

test('container responds to size changes', () => {
  const { rerender } = render(
    <Container size="sm">Content</Container>
  );
  
  expect(screen.getByText('Content').closest('div'))
    .toHaveClass('max-w-sm');
    
  rerender(<Container size="lg">Content</Container>);
  
  expect(screen.getByText('Content').closest('div'))
    .toHaveClass('max-w-lg');
});
```

### Grid Layout Testing

```typescript
test('grid creates proper column structure', () => {
  render(
    <Grid cols={3} data-testid="grid">
      <GridItem>Item 1</GridItem>
      <GridItem>Item 2</GridItem>
      <GridItem>Item 3</GridItem>
    </Grid>
  );
  
  expect(screen.getByTestId('grid'))
    .toHaveClass('grid-cols-3');
});
```

---

*For more examples and implementation details, see the [UIDemo component](../UIDemo.tsx) and [test files](../tests/).*
