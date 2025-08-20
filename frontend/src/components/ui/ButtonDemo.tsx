import React, { useState } from 'react';
import {
  Button,
  PrimaryButton,
  SecondaryButton,
  SuccessButton,
  WarningButton,
  ErrorButton,
  OutlineButton,
  GhostButton,
  LinkButton,
  IconButton,
} from './Button';

// Simple icons for demo
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export const ButtonDemo: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleLoadingClick = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Button Component Demo</h1>
      
      {/* Variants */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Variants</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="success">Success</Button>
          <Button variant="warning">Warning</Button>
          <Button variant="error">Error</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <LinkButton>Link</LinkButton>
        </div>
      </section>

      {/* Sizes */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Sizes</h2>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="xs">Extra Small</Button>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button size="xl">Extra Large</Button>
        </div>
      </section>

      {/* Convenience Components */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Convenience Components</h2>
        <div className="flex flex-wrap gap-4">
          <PrimaryButton>Primary Button</PrimaryButton>
          <SecondaryButton>Secondary Button</SecondaryButton>
          <SuccessButton>Success Button</SuccessButton>
          <WarningButton>Warning Button</WarningButton>
          <ErrorButton>Error Button</ErrorButton>
          <OutlineButton>Outline Button</OutlineButton>
          <GhostButton>Ghost Button</GhostButton>
        </div>
      </section>

      {/* Icons */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">With Icons</h2>
        <div className="flex flex-wrap gap-4">
          <Button leftIcon={<PlusIcon />}>Add Item</Button>
          <Button rightIcon={<CheckIcon />}>Save</Button>
          <Button leftIcon={<PlusIcon />} rightIcon={<CheckIcon />}>
            Add & Save
          </Button>
        </div>
      </section>

      {/* Icon Buttons */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Icon Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <IconButton aria-label="Add item" leftIcon={<PlusIcon />} />
          <IconButton aria-label="Save" leftIcon={<CheckIcon />} />
          <IconButton aria-label="Delete" leftIcon={<TrashIcon />} variant="error" />
        </div>
      </section>

      {/* Loading States */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Loading States</h2>
        <div className="flex flex-wrap gap-4">
          <Button loading>Loading...</Button>
          <Button loading loadingText="Saving...">Save</Button>
          <Button loading leftIcon={<CheckIcon />} loadingText="Processing...">
            Process
          </Button>
          <Button onClick={handleLoadingClick} loading={loading}>
            {loading ? 'Loading...' : 'Click to Load'}
          </Button>
        </div>
      </section>

      {/* Full Width */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Full Width</h2>
        <div className="space-y-4">
          <Button fullWidth>Full Width Button</Button>
          <Button fullWidth variant="outline">Full Width Outline</Button>
        </div>
      </section>

      {/* Rounded Variants */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Rounded Variants</h2>
        <div className="flex flex-wrap gap-4">
          <Button rounded="none">No Rounded</Button>
          <Button rounded="sm">Small Rounded</Button>
          <Button rounded="md">Medium Rounded</Button>
          <Button rounded="lg">Large Rounded</Button>
          <Button rounded="xl">Extra Large Rounded</Button>
          <Button rounded="full">Full Rounded</Button>
        </div>
      </section>

      {/* Disabled States */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Disabled States</h2>
        <div className="flex flex-wrap gap-4">
          <Button disabled>Disabled</Button>
          <Button disabled variant="outline">Disabled Outline</Button>
          <Button disabled leftIcon={<PlusIcon />}>Disabled with Icon</Button>
        </div>
      </section>

      {/* Touch-Friendly Sizing */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Touch-Friendly Sizing (44px minimum)</h2>
        <div className="bg-gray-100 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-4">
            All buttons maintain a minimum 44x44px touch target for production floor tablet use.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button size="sm">Small (36px)</Button>
            <Button size="md">Medium (44px)</Button>
            <Button size="lg">Large (52px)</Button>
            <Button size="xl">Extra Large (60px)</Button>
          </div>
        </div>
      </section>

      {/* Accessibility Demo */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Accessibility Features</h2>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800 mb-4">
            Buttons include proper ARIA attributes, focus management, and keyboard navigation.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button aria-label="Custom accessible label">Custom Label</Button>
            <Button aria-describedby="button-description">With Description</Button>
            <div id="button-description" className="sr-only">
              This button performs a specific action
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ButtonDemo;
