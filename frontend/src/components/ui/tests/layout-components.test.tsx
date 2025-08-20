import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import {
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

describe('Layout Components', () => {
  describe('Card Component', () => {
    test('renders with default props', () => {
      render(<Card>Card content</Card>);
      const card = screen.getByText('Card content').closest('[class*="bg-white"]');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('bg-white', 'rounded-lg', 'border');
    });

    test('renders with different variants', () => {
      const { rerender } = render(<Card variant="elevated">Elevated</Card>);
      expect(screen.getByText('Elevated').closest('[class*="shadow-md"]')).toHaveClass('shadow-md');

      rerender(<Card variant="outlined">Outlined</Card>);
      expect(screen.getByText('Outlined').closest('[class*="border-gray-300"]')).toHaveClass('border-gray-300', 'shadow-none');

      rerender(<Card variant="filled">Filled</Card>);
      expect(screen.getByText('Filled').closest('[class*="bg-gray-50"]')).toHaveClass('bg-gray-50');
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

    test('renders GridItem with span', () => {
      render(
        <Grid>
          <GridItem span={2}>Spanned Item</GridItem>
        </Grid>
      );
      const item = screen.getByText('Spanned Item').closest('div');
      expect(item).toHaveClass('col-span-2');
    });
  });

  describe('Navigation Component', () => {
    const navigationItems = [
      { id: 'home', label: 'Home', href: '/', active: true },
      { id: 'about', label: 'About', href: '/about' },
      { id: 'contact', label: 'Contact', href: '/contact' }
    ];

    test('renders with default props', () => {
      render(<Navigation items={navigationItems} />);
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('About')).toBeInTheDocument();
      expect(screen.getByText('Contact')).toBeInTheDocument();
    });

    test('renders with different variants', () => {
      const { rerender } = render(<Navigation items={navigationItems} variant="dark" />);
      expect(screen.getByRole('navigation')).toHaveClass('bg-gray-900', 'text-white');

      rerender(<Navigation items={navigationItems} variant="primary" />);
      expect(screen.getByRole('navigation')).toHaveClass('bg-blue-600', 'text-white');
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
  });
});
