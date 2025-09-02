import React from 'react';

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white shadow rounded-lg p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
        <p className="mt-2 text-gray-600">You do not have permission to view this page.</p>
        <div className="mt-6">
          <a href="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Go to Dashboard</a>
        </div>
      </div>
    </div>
  );
}
