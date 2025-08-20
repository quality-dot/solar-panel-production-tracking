import React, { useState } from 'react';
import { Container, Card, CardHeader, CardContent, Grid, GridItem, Navigation, NavigationBrand, NavigationLogo, NavigationTitle, LoadingSpinner, StatusIndicator, Toast, Modal } from './index';

export const UIDemo: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', href: '/', active: true },
    { id: 'scan', label: 'Panel Scan', href: '/scan', active: false },
    { id: 'inspections', label: 'Inspections', href: '/inspections', active: false },
    { id: 'settings', label: 'Settings', href: '/settings', active: false },
    { id: 'ui-demo', label: 'UI Demo', href: '/ui-demo', active: false }
  ];

  const showToastMessage = (type: 'success' | 'error' | 'warning' | 'info') => {
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Demo */}
      <Navigation variant="default" size="lg" sticky items={navigationItems} className="mb-8">
        <NavigationBrand>
          <NavigationLogo>
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SP</span>
            </div>
          </NavigationLogo>
          <NavigationTitle>Solar Panel Tracker</NavigationTitle>
        </NavigationBrand>
      </Navigation>

      <Container size="xl" spacing="lg">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Solar Panel Production UI Components
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Testing Container, Card, Grid, Navigation, and Feedback components - this should work without errors.
          </p>
        </div>

        {/* Container Demo */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Container Component Test
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Container size="sm" className="bg-blue-50 p-4 rounded border-2 border-dashed border-blue-300">
              <p className="text-center text-blue-800 font-medium">Small Container</p>
              <p className="text-center text-blue-600 text-sm">max-w-3xl</p>
            </Container>
            
            <Container size="md" className="bg-green-50 p-4 rounded border-2 border-dashed border-green-300">
              <p className="text-center text-green-800 font-medium">Medium Container</p>
              <p className="text-center text-green-600 text-sm">max-w-4xl</p>
            </Container>
            
            <Container size="lg" className="bg-purple-50 p-4 rounded border-2 border-dashed border-purple-300">
              <p className="text-center text-purple-800 font-medium">Large Container</p>
              <p className="text-center text-purple-600 text-sm">max-w-6xl</p>
            </Container>
          </div>
        </div>

        {/* Card Demo */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Card Component Test
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card variant="default" size="md" className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">Default Card</h3>
                <p className="text-sm text-gray-600">Standard card with header</p>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">This is a default card with standard styling and hover effects.</p>
              </CardContent>
            </Card>

            <Card variant="elevated" size="md" className="hover:shadow-xl transition-shadow">
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">Elevated Card</h3>
                <p className="text-sm text-gray-600">Card with enhanced shadow</p>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">This card has an elevated appearance with enhanced shadows.</p>
              </CardContent>
            </Card>

            <Card variant="outlined" size="md" className="border-2 border-gray-300">
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">Outlined Card</h3>
                <p className="text-sm text-gray-600">Card with border emphasis</p>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">This card emphasizes borders with a thicker outline.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Grid Demo */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Grid Component Test
          </h2>
          
          <div className="space-y-8">
            {/* Basic Grid */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Basic Grid (3 columns)</h3>
              <Grid cols={3} gap="md">
                <GridItem className="bg-blue-100 p-4 rounded text-center">
                  <p className="font-medium text-blue-800">Grid Item 1</p>
                  <p className="text-sm text-blue-600">Basic grid item</p>
                </GridItem>
                <GridItem className="bg-green-100 p-4 rounded text-center">
                  <p className="font-medium text-green-800">Grid Item 2</p>
                  <p className="text-sm text-green-600">Basic grid item</p>
                </GridItem>
                <GridItem className="bg-purple-100 p-4 rounded text-center">
                  <p className="font-medium text-purple-800">Grid Item 3</p>
                  <p className="text-sm text-purple-600">Basic grid item</p>
                </GridItem>
              </Grid>
            </div>

            {/* Responsive Grid */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Responsive Grid</h3>
              <Grid cols={4} gap="lg" className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                <GridItem className="bg-yellow-100 p-4 rounded text-center">
                  <p className="font-medium text-yellow-800">Responsive 1</p>
                  <p className="text-sm text-yellow-600">Adapts to screen size</p>
                </GridItem>
                <GridItem className="bg-orange-100 p-4 rounded text-center">
                  <p className="font-medium text-orange-800">Responsive 2</p>
                  <p className="text-sm text-orange-600">Adapts to screen size</p>
                </GridItem>
                <GridItem className="bg-red-100 p-4 rounded text-center">
                  <p className="font-medium text-red-800">Responsive 3</p>
                  <p className="text-sm text-red-600">Adapts to screen size</p>
                </GridItem>
                <GridItem className="bg-pink-100 p-4 rounded text-center">
                  <p className="font-medium text-pink-800">Responsive 4</p>
                  <p className="text-sm text-pink-600">Adapts to screen size</p>
                </GridItem>
              </Grid>
            </div>

            {/* Auto-fit Grid */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Auto-fit Grid</h3>
              <Grid autoFit minColWidth="200px" gap="md">
                <GridItem className="bg-indigo-100 p-4 rounded text-center">
                  <p className="font-medium text-indigo-800">Auto-fit 1</p>
                  <p className="text-sm text-indigo-600">Min width: 200px</p>
                </GridItem>
                <GridItem className="bg-cyan-100 p-4 rounded text-center">
                  <p className="font-medium text-cyan-800">Auto-fit 2</p>
                  <p className="text-sm text-cyan-600">Min width: 200px</p>
                </GridItem>
                <GridItem className="bg-teal-100 p-4 rounded text-center">
                  <p className="font-medium text-teal-800">Auto-fit 3</p>
                  <p className="text-sm text-teal-600">Min width: 200px</p>
                </GridItem>
              </Grid>
            </div>
          </div>
        </div>

        {/* Feedback Components Demo */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Feedback Components Test
          </h2>
          
          <div className="space-y-8">
            {/* LoadingSpinner Demo */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Loading Spinner Variants</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <LoadingSpinner size="sm" variant="primary" />
                  <p className="text-sm text-gray-600 mt-2">Small Primary</p>
                </div>
                <div className="text-center">
                  <LoadingSpinner size="md" variant="success" />
                  <p className="text-sm text-gray-600 mt-2">Medium Success</p>
                </div>
                <div className="text-center">
                  <LoadingSpinner size="lg" variant="warning" />
                  <p className="text-sm text-gray-600 mt-2">Large Warning</p>
                </div>
                <div className="text-center">
                  <LoadingSpinner size="xl" variant="error" showLabel />
                  <p className="text-sm text-gray-600 mt-2">XL Error with Label</p>
                </div>
              </div>
            </div>

            {/* StatusIndicator Demo */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Status Indicators</h3>
              <div className="flex flex-wrap gap-4">
                <StatusIndicator status="success" showIcon>Completed</StatusIndicator>
                <StatusIndicator status="warning" showIcon>Pending</StatusIndicator>
                <StatusIndicator status="error" showIcon>Failed</StatusIndicator>
                <StatusIndicator status="info" showIcon>In Progress</StatusIndicator>
                <StatusIndicator status="neutral">Neutral</StatusIndicator>
              </div>
            </div>

            {/* Toast Demo */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Toast Notifications</h3>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => showToastMessage('success')}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Show Success Toast
                </button>
                <button
                  onClick={() => showToastMessage('error')}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Show Error Toast
                </button>
                <button
                  onClick={() => showToastMessage('warning')}
                  className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                >
                  Show Warning Toast
                </button>
                <button
                  onClick={() => showToastMessage('info')}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Show Info Toast
                </button>
              </div>
            </div>

            {/* Modal Demo */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Modal Component</h3>
              <div className="flex justify-center">
                <button
                  onClick={() => setShowModal(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Open Modal
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-lg text-gray-700 mb-4">
            🎉 All layout and feedback components are working correctly!
          </p>
          <p className="text-sm text-gray-500">
            Components tested: Container, Card, Grid, Navigation, LoadingSpinner, StatusIndicator, Toast, Modal
          </p>
        </div>
      </Container>

      {/* Toast Component */}
      {showToast && (
        <Toast
          type={toastType}
          position="top-right"
          title={`${toastType.charAt(0).toUpperCase() + toastType.slice(1)} Notification`}
          message={`This is a ${toastType} toast message for testing purposes.`}
          onClose={() => setShowToast(false)}
        />
      )}

      {/* Modal Component */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Test Modal"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            This is a test modal to demonstrate the Modal component functionality.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Confirm
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UIDemo;
