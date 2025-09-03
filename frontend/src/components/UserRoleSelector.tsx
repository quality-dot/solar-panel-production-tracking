/**
 * UserRoleSelector Component
 * Allows users to view and manage their role (if they have permission)
 */

import React, { useState } from 'react';
import { useRBAC } from '../hooks/useRBAC';
import { UserRole } from '../services/rbacService';

export interface UserRoleSelectorProps {
  currentUserId?: string;
  onRoleChange?: (roleId: string) => void;
  showCurrentRole?: boolean;
  allowRoleChange?: boolean;
  className?: string;
}

export const UserRoleSelector: React.FC<UserRoleSelectorProps> = ({
  currentUserId,
  onRoleChange,
  showCurrentRole = true,
  allowRoleChange = false,
  className = ''
}) => {
  const {
    currentUser,
    userRole,
    availableRoles,
    hasPermission,
    updateUserRole,
    isAdmin
  } = useRBAC();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState(userRole?.id || '');

  // Check if user can manage roles
  const canManageRoles = hasPermission('users:manage') || isAdmin();

  // Handle role selection
  const handleRoleSelect = (roleId: string) => {
    setSelectedRoleId(roleId);
    setIsOpen(false);

    if (allowRoleChange && canManageRoles) {
      updateUserRole(roleId);
      onRoleChange?.(roleId);
    }
  };

  // Get role display name
  const getRoleDisplayName = (role: UserRole): string => {
    return `${role.name} (Level ${role.level})`;
  };

  // Get role description
  const getRoleDescription = (role: UserRole): string => {
    return role.description;
  };

  // Get role badge color
  const getRoleBadgeColor = (role: UserRole): string => {
    const colors: Record<string, string> = {
      'security-admin': 'bg-red-100 text-red-800',
      'security-analyst': 'bg-orange-100 text-orange-800',
      'security-operator': 'bg-yellow-100 text-yellow-800',
      'compliance-officer': 'bg-blue-100 text-blue-800',
      'auditor': 'bg-purple-100 text-purple-800',
      'viewer': 'bg-gray-100 text-gray-800'
    };
    return colors[role.id] || 'bg-gray-100 text-gray-800';
  };

  if (!currentUser || !userRole) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        No user role information available
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Current Role Display */}
      {showCurrentRole && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Role
          </label>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(userRole)}`}>
              {userRole.name}
            </span>
            <span className="text-sm text-gray-500">
              Level {userRole.level}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            {userRole.description}
          </p>
        </div>
      )}

      {/* Role Selector */}
      {allowRoleChange && canManageRoles && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Change Role
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <span className="block truncate">
                {availableRoles.find(role => role.id === selectedRoleId)?.name || 'Select a role'}
              </span>
              <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>

            {isOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                {availableRoles.map((role) => (
                  <div
                    key={role.id}
                    onClick={() => handleRoleSelect(role.id)}
                    className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-50 ${
                      selectedRoleId === role.id ? 'bg-indigo-100' : ''
                    }`}
                  >
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(role)}`}>
                        {role.name}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        Level {role.level}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {role.description}
                    </p>
                    {selectedRoleId === role.id && (
                      <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                        <svg className="h-5 w-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Permission Summary */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Role Permissions
        </label>
        <div className="space-y-2">
          {userRole.permissions.map((permission) => (
            <div key={permission.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-700">{permission.name}</span>
              <span className="text-gray-500 text-xs">
                {permission.resource}:{permission.action}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Access Denied Message */}
      {!canManageRoles && allowRoleChange && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                You don't have permission to change user roles.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserRoleSelector;
