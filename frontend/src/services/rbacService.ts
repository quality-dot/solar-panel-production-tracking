/**
 * Role-Based Access Control (RBAC) Service
 * Manages user permissions and access control for the security dashboard
 */

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  lastLogin?: string;
  isActive: boolean;
}

export interface UserRole {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  level: number; // Higher number = more privileges
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: any;
}

export interface RBACConfig {
  roles: UserRole[];
  permissions: Permission[];
  defaultRole: string;
}

// Predefined roles for the security dashboard
export const SECURITY_ROLES: UserRole[] = [
  {
    id: 'security-admin',
    name: 'Security Administrator',
    description: 'Full access to all security features and administrative functions',
    level: 100,
    permissions: []
  },
  {
    id: 'security-analyst',
    name: 'Security Analyst',
    description: 'Access to security monitoring, alerts, and analysis tools',
    level: 80,
    permissions: []
  },
  {
    id: 'security-operator',
    name: 'Security Operator',
    description: 'Access to security monitoring and basic alert management',
    level: 60,
    permissions: []
  },
  {
    id: 'compliance-officer',
    name: 'Compliance Officer',
    description: 'Access to compliance monitoring and reporting',
    level: 70,
    permissions: []
  },
  {
    id: 'auditor',
    name: 'Auditor',
    description: 'Read-only access to security logs and compliance reports',
    level: 40,
    permissions: []
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Basic read-only access to security dashboard',
    level: 20,
    permissions: []
  }
];

// Predefined permissions for security dashboard features
export const SECURITY_PERMISSIONS: Permission[] = [
  // Dashboard access
  { id: 'dashboard:view', name: 'View Dashboard', resource: 'dashboard', action: 'read' },
  { id: 'dashboard:export', name: 'Export Dashboard Data', resource: 'dashboard', action: 'export' },
  
  // Security metrics
  { id: 'metrics:view', name: 'View Security Metrics', resource: 'metrics', action: 'read' },
  { id: 'metrics:configure', name: 'Configure Metrics', resource: 'metrics', action: 'write' },
  
  // Alerts
  { id: 'alerts:view', name: 'View Alerts', resource: 'alerts', action: 'read' },
  { id: 'alerts:acknowledge', name: 'Acknowledge Alerts', resource: 'alerts', action: 'acknowledge' },
  { id: 'alerts:resolve', name: 'Resolve Alerts', resource: 'alerts', action: 'resolve' },
  { id: 'alerts:configure', name: 'Configure Alert Rules', resource: 'alerts', action: 'write' },
  { id: 'alerts:delete', name: 'Delete Alerts', resource: 'alerts', action: 'delete' },
  
  // Compliance
  { id: 'compliance:view', name: 'View Compliance Status', resource: 'compliance', action: 'read' },
  { id: 'compliance:assess', name: 'Run Compliance Assessments', resource: 'compliance', action: 'assess' },
  { id: 'compliance:configure', name: 'Configure Compliance Rules', resource: 'compliance', action: 'write' },
  
  // Security events
  { id: 'events:view', name: 'View Security Events', resource: 'events', action: 'read' },
  { id: 'events:investigate', name: 'Investigate Security Events', resource: 'events', action: 'investigate' },
  { id: 'events:export', name: 'Export Security Events', resource: 'events', action: 'export' },
  
  // Settings
  { id: 'settings:view', name: 'View Settings', resource: 'settings', action: 'read' },
  { id: 'settings:configure', name: 'Configure Settings', resource: 'settings', action: 'write' },
  
  // User management
  { id: 'users:view', name: 'View Users', resource: 'users', action: 'read' },
  { id: 'users:manage', name: 'Manage Users', resource: 'users', action: 'write' },
  { id: 'users:delete', name: 'Delete Users', resource: 'users', action: 'delete' },
  
  // Reports
  { id: 'reports:view', name: 'View Reports', resource: 'reports', action: 'read' },
  { id: 'reports:generate', name: 'Generate Reports', resource: 'reports', action: 'write' },
  { id: 'reports:export', name: 'Export Reports', resource: 'reports', action: 'export' }
];

// Role-permission mappings
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  'security-admin': [
    'dashboard:view', 'dashboard:export',
    'metrics:view', 'metrics:configure',
    'alerts:view', 'alerts:acknowledge', 'alerts:resolve', 'alerts:configure', 'alerts:delete',
    'compliance:view', 'compliance:assess', 'compliance:configure',
    'events:view', 'events:investigate', 'events:export',
    'settings:view', 'settings:configure',
    'users:view', 'users:manage', 'users:delete',
    'reports:view', 'reports:generate', 'reports:export'
  ],
  'security-analyst': [
    'dashboard:view', 'dashboard:export',
    'metrics:view', 'metrics:configure',
    'alerts:view', 'alerts:acknowledge', 'alerts:resolve', 'alerts:configure',
    'compliance:view', 'compliance:assess',
    'events:view', 'events:investigate', 'events:export',
    'settings:view',
    'reports:view', 'reports:generate', 'reports:export'
  ],
  'security-operator': [
    'dashboard:view',
    'metrics:view',
    'alerts:view', 'alerts:acknowledge', 'alerts:resolve',
    'compliance:view',
    'events:view',
    'settings:view'
  ],
  'compliance-officer': [
    'dashboard:view',
    'metrics:view',
    'alerts:view',
    'compliance:view', 'compliance:assess', 'compliance:configure',
    'events:view',
    'settings:view',
    'reports:view', 'reports:generate', 'reports:export'
  ],
  'auditor': [
    'dashboard:view',
    'metrics:view',
    'alerts:view',
    'compliance:view',
    'events:view',
    'reports:view', 'reports:export'
  ],
  'viewer': [
    'dashboard:view',
    'metrics:view',
    'alerts:view',
    'compliance:view',
    'events:view'
  ]
};

export class RBACService {
  private currentUser: User | null = null;
  private config: RBACConfig;

  constructor() {
    this.config = {
      roles: SECURITY_ROLES,
      permissions: SECURITY_PERMISSIONS,
      defaultRole: 'viewer'
    };
    
    // Initialize role permissions
    this.initializeRolePermissions();
  }

  private initializeRolePermissions(): void {
    this.config.roles.forEach(role => {
      const permissionIds = ROLE_PERMISSIONS[role.id] || [];
      role.permissions = this.config.permissions.filter(p => permissionIds.includes(p.id));
    });
  }

  /**
   * Set the current user for RBAC checks
   */
  setCurrentUser(user: User): void {
    this.currentUser = user;
  }

  /**
   * Get the current user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if the current user has a specific permission
   */
  hasPermission(permissionId: string, resource?: string, action?: string): boolean {
    if (!this.currentUser) {
      return false;
    }

    // Check if user is active
    if (!this.currentUser.isActive) {
      return false;
    }

    // Check user-specific permissions first
    const userPermission = this.currentUser.permissions.find(p => p.id === permissionId);
    if (userPermission) {
      return this.evaluatePermissionConditions(userPermission);
    }

    // Check role-based permissions
    const rolePermission = this.currentUser.role.permissions.find(p => p.id === permissionId);
    if (rolePermission) {
      return this.evaluatePermissionConditions(rolePermission);
    }

    // Check by resource and action if provided
    if (resource && action) {
      const resourcePermission = this.currentUser.role.permissions.find(
        p => p.resource === resource && p.action === action
      );
      if (resourcePermission) {
        return this.evaluatePermissionConditions(resourcePermission);
      }
    }

    return false;
  }

  /**
   * Check if the current user has any of the specified permissions
   */
  hasAnyPermission(permissionIds: string[]): boolean {
    return permissionIds.some(permissionId => this.hasPermission(permissionId));
  }

  /**
   * Check if the current user has all of the specified permissions
   */
  hasAllPermissions(permissionIds: string[]): boolean {
    return permissionIds.every(permissionId => this.hasPermission(permissionId));
  }

  /**
   * Check if the current user has a specific role
   */
  hasRole(roleId: string): boolean {
    if (!this.currentUser) {
      return false;
    }
    return this.currentUser.role.id === roleId;
  }

  /**
   * Check if the current user has a role with minimum level
   */
  hasMinimumRoleLevel(level: number): boolean {
    if (!this.currentUser) {
      return false;
    }
    return this.currentUser.role.level >= level;
  }

  /**
   * Get all permissions for the current user
   */
  getUserPermissions(): Permission[] {
    if (!this.currentUser) {
      return [];
    }

    const userPermissions = [...this.currentUser.permissions];
    const rolePermissions = this.currentUser.role.permissions.filter(
      rolePerm => !userPermissions.some(userPerm => userPerm.id === rolePerm.id)
    );

    return [...userPermissions, ...rolePermissions];
  }

  /**
   * Get available roles
   */
  getAvailableRoles(): UserRole[] {
    return this.config.roles;
  }

  /**
   * Get role by ID
   */
  getRoleById(roleId: string): UserRole | undefined {
    return this.config.roles.find(role => role.id === roleId);
  }

  /**
   * Get permission by ID
   */
  getPermissionById(permissionId: string): Permission | undefined {
    return this.config.permissions.find(permission => permission.id === permissionId);
  }

  /**
   * Create a new role
   */
  createRole(role: Omit<UserRole, 'permissions'>): UserRole {
    const newRole: UserRole = {
      ...role,
      permissions: []
    };
    
    this.config.roles.push(newRole);
    return newRole;
  }

  /**
   * Update an existing role
   */
  updateRole(roleId: string, updates: Partial<UserRole>): boolean {
    const roleIndex = this.config.roles.findIndex(role => role.id === roleId);
    if (roleIndex === -1) {
      return false;
    }

    this.config.roles[roleIndex] = {
      ...this.config.roles[roleIndex],
      ...updates
    };

    return true;
  }

  /**
   * Delete a role
   */
  deleteRole(roleId: string): boolean {
    const roleIndex = this.config.roles.findIndex(role => role.id === roleId);
    if (roleIndex === -1) {
      return false;
    }

    this.config.roles.splice(roleIndex, 1);
    return true;
  }

  /**
   * Assign permissions to a role
   */
  assignPermissionsToRole(roleId: string, permissionIds: string[]): boolean {
    const role = this.getRoleById(roleId);
    if (!role) {
      return false;
    }

    const permissions = this.config.permissions.filter(p => permissionIds.includes(p.id));
    role.permissions = permissions;
    return true;
  }

  /**
   * Evaluate permission conditions
   */
  private evaluatePermissionConditions(permission: Permission): boolean {
    if (!permission.conditions || permission.conditions.length === 0) {
      return true;
    }

    // For now, return true for all conditions
    // In a real implementation, you would evaluate conditions against current context
    return true;
  }

  /**
   * Check if user can access a specific dashboard feature
   */
  canAccessFeature(feature: string): boolean {
    const featurePermissions: Record<string, string[]> = {
      'dashboard': ['dashboard:view'],
      'metrics': ['metrics:view'],
      'alerts': ['alerts:view'],
      'compliance': ['compliance:view'],
      'events': ['events:view'],
      'settings': ['settings:view'],
      'users': ['users:view'],
      'reports': ['reports:view']
    };

    const requiredPermissions = featurePermissions[feature] || [];
    return this.hasAnyPermission(requiredPermissions);
  }

  /**
   * Check if user can perform a specific action on a resource
   */
  canPerformAction(resource: string, action: string): boolean {
    return this.hasPermission(`${resource}:${action}`, resource, action);
  }

  /**
   * Get user's role level
   */
  getUserRoleLevel(): number {
    if (!this.currentUser) {
      return 0;
    }
    return this.currentUser.role.level;
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.hasRole('security-admin');
  }

  /**
   * Check if user is analyst or higher
   */
  isAnalystOrHigher(): boolean {
    return this.hasMinimumRoleLevel(80);
  }

  /**
   * Check if user is operator or higher
   */
  isOperatorOrHigher(): boolean {
    return this.hasMinimumRoleLevel(60);
  }

  /**
   * Get filtered data based on user permissions
   */
  filterDataByPermissions<T>(data: T[], permissionCheck: (item: T) => boolean): T[] {
    if (!this.currentUser) {
      return [];
    }

    return data.filter(permissionCheck);
  }

  /**
   * Log access attempt
   */
  logAccessAttempt(resource: string, action: string, success: boolean): void {
    if (!this.currentUser) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      userId: this.currentUser.id,
      username: this.currentUser.username,
      role: this.currentUser.role.name,
      resource,
      action,
      success,
      ipAddress: 'unknown', // Would be populated in real implementation
      userAgent: navigator.userAgent
    };

    // In a real implementation, this would be sent to a logging service
    console.log('RBAC Access Log:', logEntry);
  }
}

// Create singleton instance
export const rbacService = new RBACService();

// Export default
export default rbacService;
