import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../auth/ProtectedRoute';
import { AuthProvider } from '../../contexts/AuthContext';

function withAuthContext(ui: React.ReactNode) {
  return (
    <AuthProvider>
      <MemoryRouter initialEntries={["/secure"]}>
        <Routes>
          <Route path="/unauthorized" element={<div>UNAUTHORIZED</div>} />
          <Route
            path="/secure"
            element={
              <ProtectedRoute requiredRole="SYSTEM_ADMIN">
                <div>SECURE_CONTENT</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

// This test assumes no authenticated user in initial context -> should redirect
test('redirects to unauthorized when user not authenticated or lacks role', async () => {
  render(withAuthContext(<div />));
  expect(await screen.findByText('UNAUTHORIZED')).toBeInTheDocument();
});
