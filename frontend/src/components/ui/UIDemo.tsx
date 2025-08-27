import React, { useState } from 'react';

// Simplified UIDemo for testing
export const UIDemo: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Solar Panel Production UI Components
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Testing basic UI components - simplified version for debugging
          </p>
        </div>

        {/* Basic Component Test */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Basic Component Test
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-4 rounded border-2 border-dashed border-blue-300">
              <p className="text-center text-blue-800 font-medium">Test Container 1</p>
              <p className="text-center text-blue-600 text-sm">Basic div with styling</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded border-2 border-dashed border-green-300">
              <p className="text-center text-green-800 font-medium">Test Container 2</p>
              <p className="text-center text-green-600 text-sm">Basic div with styling</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded border-2 border-dashed border-purple-300">
              <p className="text-center text-purple-800 font-medium">Test Container 3</p>
              <p className="text-center text-purple-600 text-sm">Basic div with styling</p>
            </div>
          </div>
        </div>

        {/* Button Test */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Button Test
          </h2>
          
          <div className="flex justify-center space-x-4">
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              onClick={() => alert('Button 1 clicked!')}
            >
              Test Button 1
            </button>
            
            <button 
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              onClick={() => alert('Button 2 clicked!')}
            >
              Test Button 2
            </button>
            
            <button 
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
              onClick={() => setShowModal(true)}
            >
              Open Modal
            </button>
          </div>
        </div>

        {/* Modal Test */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">Test Modal</h3>
              <p className="text-gray-600 mb-4">This is a simple test modal to verify basic functionality.</p>
              <button 
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                onClick={() => setShowModal(false)}
              >
                Close Modal
              </button>
            </div>
          </div>
        )}

        {/* Status Test */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Status Test
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-4 h-4 bg-green-500 rounded-full mx-auto mb-2"></div>
              <span className="text-sm text-gray-600">Success</span>
            </div>
            <div className="text-center">
              <div className="w-4 h-4 bg-red-500 rounded-full mx-auto mb-2"></div>
              <span className="text-sm text-gray-600">Error</span>
            </div>
            <div className="text-center">
              <div className="w-4 h-4 bg-yellow-500 rounded-full mx-auto mb-2"></div>
              <span className="text-sm text-gray-600">Warning</span>
            </div>
            <div className="text-center">
              <div className="w-4 h-4 bg-blue-500 rounded-full mx-auto mb-2"></div>
              <span className="text-sm text-gray-600">Info</span>
            </div>
          </div>
        </div>

        {/* Navigation Test */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Navigation Test
          </h2>
          
          <nav className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">SP</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">Solar Panel Tracker</span>
              </div>
              <div className="flex space-x-4">
                <a href="/" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Dashboard</a>
                <a href="/scan" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Scan</a>
                <a href="/inspections" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Inspections</a>
                <a href="/settings" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Settings</a>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default UIDemo;
