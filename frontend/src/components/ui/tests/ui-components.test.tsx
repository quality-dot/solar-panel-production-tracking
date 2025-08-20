import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Button,
  Input,
  Select,
  Textarea,
  Checkbox,
  Radio,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Container,
  Grid,
  GridItem,
  Navigation,
  NavigationBrand,
  NavigationLogo,
  NavigationTitle
} from '../index';
import type { SelectOption, RadioOption } from '../index';

// Test data
const testSelectOptions: SelectOption[] = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3', disabled: true },
  { value: 'option4', label: 'Option 4', group: 'Group A' },
  { value: 'option5', label: 'Option 5', group: 'Group B' }
];

const testRadioOptions: RadioOption[] = [
  { value: 'radio1', label: 'Radio 1', description: 'First option' },
  { value: 'radio2', label: 'Radio 2', description: 'Second option' },
  { value: 'radio3', label: 'Radio 3', disabled: true },
  { value: 'radio4', label: 'Radio 4' }
];

describe('UI Components', () => {
  describe('Button Component', () => {
    test('renders with default props', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('bg-blue-600');
    });

    test('renders with different variants', () => {
      const { rerender } = render(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-gray-100');

      rerender(<Button variant="success">Success</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-green-600');

      rerender(<Button variant="warning">Warning</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-yellow-600');

      rerender(<Button variant="error">Error</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-red-600');
    });

    test('renders with different sizes', () => {
      const { rerender } = render(<Button size="sm">Small</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-3 py-1.5');

      rerender(<Button size="lg">Large</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-6 py-3');
    });

    test('handles click events', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('can be disabled', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:opacity-50');
    });

    test('renders with icon', () => {
      const icon = <span data-testid="icon">🚀</span>;
      render(<Button leftIcon={icon}>With Icon</Button>);
      
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveClass('inline-flex');
    });
  });

  describe('Input Component', () => {
    test('renders with default props', () => {
      render(<Input placeholder="Enter text" />);
      const input = screen.getByPlaceholderText('Enter text');
      expect(input).toBeInTheDocument();
      expect(input).toHaveClass('border-gray-300');
    });

    test('renders with label', () => {
      render(<Input label="Username" placeholder="Enter username" />);
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });

    test('renders with helper text', () => {
      render(<Input helperText="This is helpful text" />);
      expect(screen.getByText('This is helpful text')).toBeInTheDocument();
    });

    test('renders with error state', () => {
      render(<Input error="This field is required" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-red-500');
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    test('renders with success state', () => {
      render(<Input success="Great job!" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-green-500');
      expect(screen.getByText('Great job!')).toBeInTheDocument();
    });

    test('handles input changes', async () => {
      const handleChange = jest.fn();
      render(<Input onChange={handleChange} />);
      
      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'Hello');
      
      expect(handleChange).toHaveBeenCalled();
      expect(input).toHaveValue('Hello');
    });

    test('renders with different sizes', () => {
          const { rerender } = render(<Input inputSize="sm" />);
    expect(screen.getByRole('textbox')).toHaveClass('px-2 py-1.5');

    rerender(<Input inputSize="lg" />);
    expect(screen.getByRole('textbox')).toHaveClass('px-4 py-3');
    });

    test('can be disabled', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      expect(input).toHaveClass('disabled:opacity-50');
    });
  });

  describe('Select Component', () => {
    test('renders with default props', () => {
      render(<Select options={testSelectOptions} />);
      const select = screen.getByRole('button');
      expect(select).toBeInTheDocument();
      expect(select).toHaveTextContent('Select an option...');
    });

    test('renders with label', () => {
      render(<Select label="Choose option" options={testSelectOptions} />);
      expect(screen.getByText('Choose option')).toBeInTheDocument();
    });

    test('opens dropdown on click', async () => {
      render(<Select options={testSelectOptions} />);
      const select = screen.getByRole('button');
      
      await userEvent.click(select);
      
      // Use getAllByText and select button elements to avoid duplicate element issues
      const option1Buttons = screen.getAllByText('Option 1');
      const option1Button = option1Buttons.find(el => el.tagName === 'BUTTON');
      expect(option1Button).toBeInTheDocument();
      
      const option2Buttons = screen.getAllByText('Option 2');
      const option2Button = option2Buttons.find(el => el.tagName === 'BUTTON');
      expect(option2Button).toBeInTheDocument();
    });

    test('selects an option', async () => {
      const handleChange = jest.fn();
      render(<Select options={testSelectOptions} onChange={handleChange} />);
      
      const select = screen.getByRole('button');
      await userEvent.click(select);
      
      // Use getAllByText and select the button element (not the option)
      const option1Buttons = screen.getAllByText('Option 1');
      const option1Button = option1Buttons.find(el => el.tagName === 'BUTTON');
      expect(option1Button).toBeInTheDocument();
      
      await userEvent.click(option1Button!);
      
      expect(handleChange).toHaveBeenCalledWith('option1', testSelectOptions[0]);
      expect(select).toHaveTextContent('Option 1');
    });

    test('handles disabled options', async () => {
      render(<Select options={testSelectOptions} />);
      const select = screen.getByRole('button');
      
      await userEvent.click(select);
      
      // Use getAllByText and select the button element for disabled option
      const disabledOptionButtons = screen.getAllByText('Option 3');
      const disabledOptionButton = disabledOptionButtons.find(el => el.tagName === 'BUTTON');
      expect(disabledOptionButton).toBeInTheDocument();
      expect(disabledOptionButton).toHaveClass('opacity-50');
    });

    test('supports searchable options', async () => {
      render(<Select options={testSelectOptions} searchable />);
      const select = screen.getByRole('button');
      
      await userEvent.click(select);
      
      const searchInput = screen.getByPlaceholderText('Search options...');
      expect(searchInput).toBeInTheDocument();
      
      await userEvent.type(searchInput, 'Option 1');
      
      // Use getAllByText and select the button element
      const option1Buttons = screen.getAllByText('Option 1');
      const option1Button = option1Buttons.find(el => el.tagName === 'BUTTON');
      expect(option1Button).toBeInTheDocument();
      
      // Check that Option 2 button is not visible in the dropdown
      const option2Buttons = screen.getAllByText('Option 2');
      const visibleOption2Button = option2Buttons.find(el => 
        el.tagName === 'BUTTON' && 
        el.closest('[class*="absolute"]') && 
        !el.closest('[class*="sr-only"]')
      );
      expect(visibleOption2Button).toBeUndefined();
    });

    test('supports grouped options', async () => {
      render(<Select options={testSelectOptions} grouped />);
      const select = screen.getByRole('button');
      
      await userEvent.click(select);
      
      // Use more flexible text matching for group headers
      expect(screen.getByText(/Group A/i)).toBeInTheDocument();
      expect(screen.getByText(/Group B/i)).toBeInTheDocument();
    });

    test('renders with error state', () => {
      render(<Select options={testSelectOptions} error="Please select an option" />);
      const select = screen.getByRole('button');
      expect(select).toHaveClass('border-red-500');
      expect(screen.getByText('Please select an option')).toBeInTheDocument();
    });
  });

  describe('Textarea Component', () => {
    test('renders with default props', () => {
      render(<Textarea placeholder="Enter text" />);
      const textarea = screen.getByPlaceholderText('Enter text');
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveClass('border-gray-300');
    });

    test('renders with label', () => {
      render(<Textarea label="Description" placeholder="Enter description" />);
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
    });

    test('renders with helper text', () => {
      render(<Textarea helperText="Provide a detailed description" />);
      expect(screen.getByText('Provide a detailed description')).toBeInTheDocument();
    });

    test('handles input changes', async () => {
      const handleChange = jest.fn();
      render(<Textarea onChange={handleChange} />);
      
      const textarea = screen.getByRole('textbox');
      await userEvent.type(textarea, 'Hello world');
      
      expect(handleChange).toHaveBeenCalled();
      expect(textarea).toHaveValue('Hello world');
    });

    test('shows character count', () => {
      render(<Textarea maxLength={100} showCharCount />);
      expect(screen.getByText('0 of 100 characters')).toBeInTheDocument();
    });

    test('handles character limit exceeded', async () => {
      render(<Textarea maxLength={5} showCharCount />);
      const textarea = screen.getByRole('textbox');
      
      // Type more than the limit - the textarea will only accept 5 characters
      await userEvent.type(textarea, 'Too long text');
      
      // The textarea should only contain 5 characters due to maxLength
      expect(textarea).toHaveValue('Too l');
      
      // The character count should show 5 of 5 characters
      expect(screen.getByText('5 of 5 characters')).toBeInTheDocument();
    });

    test('supports auto-resize', () => {
      render(<Textarea autoResize />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('resize-none');
    });

    test('renders with different sizes', () => {
      const { rerender } = render(<Textarea size="sm" />);
      expect(screen.getByRole('textbox')).toHaveClass('px-2 py-1.5');

      rerender(<Textarea size="lg" />);
      expect(screen.getByRole('textbox')).toHaveClass('px-4 py-3');
    });
  });

  describe('Checkbox Component', () => {
    test('renders with default props', () => {
      render(<Checkbox label="Accept terms" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(screen.getByText('Accept terms')).toBeInTheDocument();
    });

    test('handles checkbox changes', async () => {
      const handleChange = jest.fn();
      render(<Checkbox label="Accept terms" onChange={handleChange} />);
      
      const checkbox = screen.getByRole('checkbox');
      await userEvent.click(checkbox);
      
      expect(handleChange).toHaveBeenCalledWith(true, expect.any(Object));
      expect(checkbox).toBeChecked();
    });

    test('supports controlled state', () => {
      render(<Checkbox label="Accept terms" checked />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    test('supports indeterminate state', () => {
      render(<Checkbox label="Select all" indeterminate />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('indeterminate', 'true');
    });

    test('renders with helper text', () => {
      render(<Checkbox label="Accept terms" helperText="You must accept to continue" />);
      expect(screen.getByText('You must accept to continue')).toBeInTheDocument();
    });

    test('renders with error state', () => {
      render(<Checkbox label="Accept terms" error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    test('renders with different sizes', () => {
          const { rerender } = render(<Checkbox label="Accept terms" checkboxSize="sm" />);
    expect(screen.getByRole('checkbox').closest('label')).toHaveClass('w-4 h-4');

    rerender(<Checkbox label="Accept terms" checkboxSize="lg" />);
    expect(screen.getByRole('checkbox').closest('label')).toHaveClass('w-6 h-6');
    });

    test('can be disabled', () => {
      render(<Checkbox label="Accept terms" disabled />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeDisabled();
    });
  });

  describe('Radio Component', () => {
    test('renders with default props', () => {
      render(<Radio options={testRadioOptions} />);
      const radioButtons = screen.getAllByRole('radio');
      expect(radioButtons).toHaveLength(4);
    });

    test('renders with label', () => {
      render(<Radio label="Choose option" options={testRadioOptions} />);
      expect(screen.getByText('Choose option')).toBeInTheDocument();
    });

    test('handles radio selection', async () => {
      const handleChange = jest.fn();
      render(<Radio options={testRadioOptions} onChange={handleChange} />);
      
      const radio1 = screen.getByDisplayValue('radio1');
      await userEvent.click(radio1);
      
      expect(handleChange).toHaveBeenCalledWith('radio1', testRadioOptions[0]);
      expect(radio1).toBeChecked();
    });

    test('supports controlled state', () => {
      render(<Radio options={testRadioOptions} value="radio2" />);
      const radio2 = screen.getByDisplayValue('radio2');
      expect(radio2).toBeChecked();
    });

    test('renders option descriptions', () => {
      render(<Radio options={testRadioOptions} />);
      expect(screen.getByText('First option')).toBeInTheDocument();
      expect(screen.getByText('Second option')).toBeInTheDocument();
    });

    test('handles disabled options', () => {
      render(<Radio options={testRadioOptions} />);
      const disabledRadio = screen.getByDisplayValue('radio3');
      expect(disabledRadio).toBeDisabled();
    });

    test('renders with helper text', () => {
      render(<Radio label="Choose option" options={testRadioOptions} helperText="Select one option" />);
      expect(screen.getByText('Select one option')).toBeInTheDocument();
    });

    test('renders with error state', () => {
      render(<Radio options={testRadioOptions} error="Please select an option" />);
      expect(screen.getByText('Please select an option')).toBeInTheDocument();
    });

    test('renders with different sizes', () => {
          const { rerender } = render(<Radio options={testRadioOptions} radioSize="sm" />);
    expect(screen.getAllByRole('radio')[0].closest('label')).toHaveClass('w-4 h-4');

    rerender(<Radio options={testRadioOptions} radioSize="lg" />);
    expect(screen.getAllByRole('radio')[0].closest('label')).toHaveClass('w-6 h-6');
    });
  });

  describe('Card Component', () => {
    test('renders with default props', () => {
      render(<Card>Card content</Card>);
      const card = screen.getByText('Card content').closest('div');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('bg-white', 'rounded-lg', 'border');
    });

    test('renders with different variants', () => {
      const { rerender } = render(<Card variant="elevated">Elevated</Card>);
      expect(screen.getByText('Elevated').closest('div')).toHaveClass('shadow-md');

      rerender(<Card variant="outlined">Outlined</Card>);
      expect(screen.getByText('Outlined').closest('div')).toHaveClass('border-gray-300', 'shadow-none');

      rerender(<Card variant="filled">Filled</Card>);
      expect(screen.getByText('Filled').closest('div')).toHaveClass('bg-gray-50');
    });

    test('renders with different sizes', () => {
      const { rerender } = render(<Card size="sm">Small</Card>);
      expect(screen.getByText('Small').closest('div')).toHaveClass('p-4');

      rerender(<Card size="lg">Large</Card>);
      expect(screen.getByText('Large').closest('div')).toHaveClass('p-8');
    });

    test('renders with header and footer', () => {
      render(
        <Card header="Card Header" footer="Card Footer">
          Card content
        </Card>
      );
      
      expect(screen.getByText('Card Header')).toBeInTheDocument();
      expect(screen.getByText('Card Footer')).toBeInTheDocument();
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    test('handles click events when interactive', async () => {
      const handleClick = jest.fn();
      render(<Card isClickable onClick={handleClick}>Clickable Card</Card>);
      
      const card = screen.getByText('Clickable Card').closest('div');
      expect(card).not.toBeNull();
      await userEvent.click(card!);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('supports keyboard navigation when interactive', async () => {
      const handleClick = jest.fn();
      render(<Card isClickable onClick={handleClick}>Clickable Card</Card>);
      
      const card = screen.getByText('Clickable Card').closest('div');
      expect(card).not.toBeNull();
      card!.focus();
      await userEvent.keyboard('{Enter}');
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('renders convenience components', () => {
      render(
        <Card>
          <CardHeader>Header</CardHeader>
          <CardContent>Content</CardContent>
          <CardFooter>Footer</CardFooter>
        </Card>
      );
      
      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('Footer')).toBeInTheDocument();
    });
  });

  describe('Container Component', () => {
    test('renders with default props', () => {
      render(<Container>Container content</Container>);
      const container = screen.getByText('Container content').closest('div');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('max-w-4xl', 'px-4', 'sm:px-6', 'lg:px-8');
    });

    test('renders with different sizes', () => {
      const { rerender } = render(<Container size="sm">Small</Container>);
      expect(screen.getByText('Small').closest('div')).toHaveClass('max-w-3xl');

      rerender(<Container size="lg">Large</Container>);
      expect(screen.getByText('Large').closest('div')).toHaveClass('max-w-6xl');

      rerender(<Container size="xl">Extra Large</Container>);
      expect(screen.getByText('Extra Large').closest('div')).toHaveClass('max-w-7xl');
    });

    test('renders with different padding', () => {
      const { rerender } = render(<Container padding="none">No Padding</Container>);
      expect(screen.getByText('No Padding').closest('div')).toHaveClass('px-0');

      rerender(<Container padding="lg">Large Padding</Container>);
      expect(screen.getByText('Large Padding').closest('div')).toHaveClass('px-6', 'sm:px-8', 'lg:px-12');
    });

    test('renders with different spacing', () => {
      const { rerender } = render(<Container spacing="none">No Spacing</Container>);
      expect(screen.getByText('No Spacing').closest('div')).not.toHaveClass('py-6');

      rerender(<Container spacing="lg">Large Spacing</Container>);
      expect(screen.getByText('Large Spacing').closest('div')).toHaveClass('py-8', 'sm:py-12');
    });

    test('renders as fluid container', () => {
      render(<Container fluid>Fluid Container</Container>);
      const container = screen.getByText('Fluid Container').closest('div');
      expect(container).toHaveClass('w-full');
      expect(container).not.toHaveClass('max-w-4xl');
    });
  });

  describe('Grid Component', () => {
    test('renders with default props', () => {
      render(<Grid>Grid content</Grid>);
      const grid = screen.getByText('Grid content').closest('div');
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveClass('grid', 'gap-4', 'grid-cols-1');
    });

    test('renders with different column counts', () => {
      const { rerender } = render(<Grid cols={2}>Two Columns</Grid>);
      expect(screen.getByText('Two Columns').closest('div')).toHaveClass('grid-cols-1', 'sm:grid-cols-2');

      rerender(<Grid cols={4}>Four Columns</Grid>);
      expect(screen.getByText('Four Columns').closest('div')).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-4');
    });

    test('renders with different gaps', () => {
      const { rerender } = render(<Grid gap="none">No Gap</Grid>);
      expect(screen.getByText('No Gap').closest('div')).toHaveClass('gap-0');

      rerender(<Grid gap="lg">Large Gap</Grid>);
      expect(screen.getByText('Large Gap').closest('div')).toHaveClass('gap-6');
    });

    test('renders with auto-fit', () => {
      render(<Grid autoFit minColWidth="200px">Auto-fit Grid</Grid>);
      const grid = screen.getByText('Auto-fit Grid').closest('div');
      expect(grid).toHaveClass('grid-cols-[repeat(auto-fit,minmax(200px,1fr))]');
    });

    test('renders with auto-fill', () => {
      render(<Grid autoFill minColWidth="250px">Auto-fill Grid</Grid>);
      const grid = screen.getByText('Auto-fill Grid').closest('div');
      expect(grid).toHaveClass('grid-cols-[repeat(auto-fill,minmax(250px,1fr))]');
    });

    test('renders GridItem with span', () => {
      render(
        <Grid>
          <GridItem span={2}>Spanned Item</GridItem>
        </Grid>
      );
      const item = screen.getByText('Spanned Item').closest('div');
      expect(item).toHaveClass('col-span-2');
    });

    test('renders GridItem with responsive span', () => {
      render(
        <Grid>
          <GridItem span={{ sm: 1, md: 2, lg: 3 }}>Responsive Item</GridItem>
        </Grid>
      );
      const item = screen.getByText('Responsive Item').closest('div');
      expect(item).toHaveClass('sm:col-span-1', 'md:col-span-2', 'lg:col-span-3');
    });
  });

  describe('Navigation Component', () => {
    const navigationItems = [
      { id: 'home', label: 'Home', href: '/', active: true },
      { id: 'about', label: 'About', href: '/about' },
      { id: 'contact', label: 'Contact', href: '/contact' },
      { id: 'settings', label: 'Settings', href: '/settings', disabled: true }
    ];

    test('renders with default props', () => {
      render(<Navigation items={navigationItems} />);
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('About')).toBeInTheDocument();
      expect(screen.getByText('Contact')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    test('renders with different variants', () => {
      const { rerender } = render(<Navigation items={navigationItems} variant="dark" />);
      expect(screen.getByRole('navigation')).toHaveClass('bg-gray-900', 'text-white');

      rerender(<Navigation items={navigationItems} variant="primary" />);
      expect(screen.getByRole('navigation')).toHaveClass('bg-blue-600', 'text-white');
    });

    test('renders with different sizes', () => {
      const { rerender } = render(<Navigation items={navigationItems} size="sm" />);
      expect(screen.getByRole('navigation')).toHaveClass('py-2');

      rerender(<Navigation items={navigationItems} size="lg" />);
      expect(screen.getByRole('navigation')).toHaveClass('py-6');
    });

    test('renders sticky navigation', () => {
      render(<Navigation items={navigationItems} sticky />);
      expect(screen.getByRole('navigation')).toHaveClass('sticky', 'top-0', 'z-50');
    });

    test('renders with logo and title', () => {
      const logo = <div data-testid="logo">Logo</div>;
      render(
        <Navigation items={navigationItems} logo={logo}>
          <NavigationBrand>
            <NavigationLogo>
              <div data-testid="logo-container">Logo Container</div>
            </NavigationLogo>
            <NavigationTitle>App Title</NavigationTitle>
          </NavigationBrand>
        </Navigation>
      );
      
      expect(screen.getByTestId('logo')).toBeInTheDocument();
      expect(screen.getByTestId('logo-container')).toBeInTheDocument();
      expect(screen.getByText('App Title')).toBeInTheDocument();
    });

    test('handles item clicks', async () => {
      const handleItemClick = jest.fn();
      render(<Navigation items={navigationItems} onItemClick={handleItemClick} />);
      
      await userEvent.click(screen.getByText('About'));
      expect(handleItemClick).toHaveBeenCalledWith(navigationItems[1]);
    });

    test('disables disabled items', () => {
      render(<Navigation items={navigationItems} />);
      const disabledItem = screen.getByText('Settings').closest('button');
      expect(disabledItem).toBeDisabled();
      expect(disabledItem).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    test('shows active state', () => {
      render(<Navigation items={navigationItems} />);
      const activeItem = screen.getByText('Home').closest('a');
      expect(activeItem).toHaveClass('text-gray-900', 'bg-gray-100');
    });

    test('renders with badges', () => {
      const itemsWithBadges = [
        { id: 'notifications', label: 'Notifications', badge: '3' },
        { id: 'messages', label: 'Messages', badge: '12' }
      ];
      
      render(<Navigation items={itemsWithBadges} />);
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    test('renders vertical orientation', () => {
      render(<Navigation items={navigationItems} orientation="vertical" />);
      const nav = screen.getByRole('navigation');
      expect(nav.querySelector('.flex-col')).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    test('components work together in a form', async () => {
      const handleSubmit = jest.fn();
      
      render(
        <form onSubmit={handleSubmit}>
          <Input label="Username" required />
          <Select label="Role" options={testSelectOptions} required />
          <Textarea label="Bio" maxLength={200} showCharCount />
          <Checkbox label="Accept terms" required />
          <Radio label="Experience Level" options={testRadioOptions} />
          <Button type="submit">Submit</Button>
        </form>
      );

      // Fill out the form
      await userEvent.type(screen.getByLabelText('Username'), 'john_doe');
      
      const roleSelect = screen.getByLabelText('Role');
      await userEvent.click(roleSelect);
      await userEvent.click(screen.getByText('Option 1'));
      
      await userEvent.type(screen.getByLabelText('Bio'), 'Software developer with 5 years experience');
      
      await userEvent.click(screen.getByLabelText('Accept terms'));
      
      const experienceRadio = screen.getByDisplayValue('radio1');
      await userEvent.click(experienceRadio);
      
      // Submit the form
      const submitButton = screen.getByRole('button', { name: /submit/i });
      await userEvent.click(submitButton);
      
      // Verify form data
      expect(screen.getByDisplayValue('john_doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Software developer with 5 years experience')).toBeInTheDocument();
      expect(screen.getByDisplayValue('radio1')).toBeChecked();
    });

    test('validation states work correctly', () => {
      render(
        <div>
          <Input error="Username is required" />
          <Select error="Please select a role" options={testSelectOptions} />
          <Textarea error="Bio is required" />
          <Checkbox error="You must accept terms" />
          <Radio error="Please select experience level" options={testRadioOptions} />
        </div>
      );

      // Check that all error states are applied
      expect(screen.getByText('Username is required')).toBeInTheDocument();
      expect(screen.getByText('Please select a role')).toBeInTheDocument();
      expect(screen.getByText('Bio is required')).toBeInTheDocument();
      expect(screen.getByText('You must accept terms')).toBeInTheDocument();
      expect(screen.getByText('Please select experience level')).toBeInTheDocument();
    });
  });
});
