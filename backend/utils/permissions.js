// Role-based permissions system for manufacturing environment
// Comprehensive permission matrix for solar panel production tracking

/**
 * User roles for manufacturing environment
 * Defined here to avoid circular dependency issues
 */
export const USER_ROLES = {
  STATION_INSPECTOR: 'STATION_INSPECTOR',
  PRODUCTION_SUPERVISOR: 'PRODUCTION_SUPERVISOR', 
  QC_MANAGER: 'QC_MANAGER',
  SYSTEM_ADMIN: 'SYSTEM_ADMIN'
};

/**
 * Permission actions available in the manufacturing system
 */
export const PERMISSIONS = {
  // Station Operations
  STATION_SCAN_BARCODE: 'station:scan_barcode',
  STATION_SUBMIT_INSPECTION: 'station:submit_inspection',
  STATION_VIEW_QUEUE: 'station:view_queue',
  STATION_MANUAL_ENTRY: 'station:manual_entry',
  STATION_VIEW_ALL: 'station:view_all',
  STATION_CONFIGURE: 'station:configure',

  // Panel Management
  PANEL_VIEW: 'panel:view',
  PANEL_VIEW_ALL: 'panel:view_all',
  PANEL_CREATE: 'panel:create',
  PANEL_UPDATE: 'panel:update',
  PANEL_UPDATE_STATUS: 'panel:update_status',
  PANEL_VIEW_HISTORY: 'panel:view_history',
  PANEL_SEARCH: 'panel:search',

  // Manufacturing Orders
  MO_VIEW: 'mo:view',
  MO_VIEW_ALL: 'mo:view_all',
  MO_CREATE: 'mo:create',
  MO_UPDATE: 'mo:update',
  MO_CLOSE: 'mo:close',
  MO_GENERATE_REPORT: 'mo:generate_report',

  // Inspections
  INSPECTION_VIEW: 'inspection:view',
  INSPECTION_VIEW_ALL: 'inspection:view_all',
  INSPECTION_CREATE: 'inspection:create',
  INSPECTION_UPDATE: 'inspection:update',
  INSPECTION_DELETE: 'inspection:delete',
  INSPECTION_REVIEW: 'inspection:review',
  INSPECTION_STATS: 'inspection:stats',

  // Pallet Management
  PALLET_VIEW: 'pallet:view',
  PALLET_VIEW_ALL: 'pallet:view_all',
  PALLET_CREATE: 'pallet:create',
  PALLET_UPDATE: 'pallet:update',
  PALLET_COMPLETE: 'pallet:complete',
  PALLET_PRINT_LABEL: 'pallet:print_label',
  PALLET_GENERATE_SHEET: 'pallet:generate_sheet',

  // User Management
  USER_VIEW_PROFILE: 'user:view_profile',
  USER_VIEW_ALL: 'user:view_all',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_ASSIGN_STATIONS: 'user:assign_stations',
  USER_CHANGE_PASSWORD: 'user:change_password',

  // System Administration
  SYSTEM_VIEW_LOGS: 'system:view_logs',
  SYSTEM_VIEW_ANALYTICS: 'system:view_analytics',
  SYSTEM_CONFIGURE: 'system:configure',
  SYSTEM_BACKUP: 'system:backup',
  SYSTEM_MAINTENANCE: 'system:maintenance',

  // Data Export/Import
  DATA_EXPORT: 'data:export',
  DATA_IMPORT: 'data:import',
  DATA_VIEW_REPORTS: 'data:view_reports',

  // Quality Control
  QC_VIEW_STATS: 'qc:view_stats',
  QC_VIEW_FAILURES: 'qc:view_failures',
  QC_APPROVE_INSPECTION: 'qc:approve_inspection',
  QC_REJECT_INSPECTION: 'qc:reject_inspection',
  QC_GENERATE_REPORTS: 'qc:generate_reports',

  // Rework Management
  REWORK_INITIATE: 'rework:initiate',
  REWORK_VIEW: 'rework:view',
  REWORK_APPROVE: 'rework:approve',
  REWORK_COMPLETE: 'rework:complete'
};

/**
 * Role-based permission matrix
 * Defines what actions each role can perform
 */
export const ROLE_PERMISSIONS = {};

// Initialize role permissions after import
const initializeRolePermissions = () => {
  // Station Inspector permissions
  ROLE_PERMISSIONS[USER_ROLES.STATION_INSPECTOR] = [
  // Station Operations (only assigned stations)
  PERMISSIONS.STATION_SCAN_BARCODE,
  PERMISSIONS.STATION_SUBMIT_INSPECTION,
  PERMISSIONS.STATION_VIEW_QUEUE,
  PERMISSIONS.STATION_MANUAL_ENTRY,

  // Panel Management (limited)
  PERMISSIONS.PANEL_VIEW,
  PERMISSIONS.PANEL_CREATE,
  PERMISSIONS.PANEL_UPDATE_STATUS,
  PERMISSIONS.PANEL_VIEW_HISTORY,

  // Inspections (own inspections)
  PERMISSIONS.INSPECTION_VIEW,
  PERMISSIONS.INSPECTION_CREATE,
  PERMISSIONS.INSPECTION_UPDATE,

  // Pallet Management (basic)
  PERMISSIONS.PALLET_VIEW,
  PERMISSIONS.PALLET_CREATE,
  PERMISSIONS.PALLET_UPDATE,
  PERMISSIONS.PALLET_COMPLETE,
  PERMISSIONS.PALLET_PRINT_LABEL,

  // Manufacturing Orders (view only)
  PERMISSIONS.MO_VIEW,

  // User Management (own profile)
  PERMISSIONS.USER_VIEW_PROFILE,
  PERMISSIONS.USER_CHANGE_PASSWORD,

  // Rework (initiate only)
  PERMISSIONS.REWORK_INITIATE,
  PERMISSIONS.REWORK_VIEW
];

// Production Supervisor permissions
ROLE_PERMISSIONS[USER_ROLES.PRODUCTION_SUPERVISOR] = [
  // All Station Inspector permissions
  ...ROLE_PERMISSIONS[USER_ROLES.STATION_INSPECTOR],

    // Enhanced Station Operations
    PERMISSIONS.STATION_VIEW_ALL,
    PERMISSIONS.STATION_CONFIGURE,

    // Enhanced Panel Management
    PERMISSIONS.PANEL_VIEW_ALL,
    PERMISSIONS.PANEL_UPDATE,
    PERMISSIONS.PANEL_SEARCH,

    // Enhanced Manufacturing Orders
    PERMISSIONS.MO_VIEW_ALL,
    PERMISSIONS.MO_CREATE,
    PERMISSIONS.MO_UPDATE,
    PERMISSIONS.MO_CLOSE,

    // Enhanced Inspections
    PERMISSIONS.INSPECTION_VIEW_ALL,
    PERMISSIONS.INSPECTION_DELETE,

    // Enhanced Pallet Management
    PERMISSIONS.PALLET_VIEW_ALL,
    PERMISSIONS.PALLET_GENERATE_SHEET,

    // Basic User Management
    PERMISSIONS.USER_VIEW_ALL,
    PERMISSIONS.USER_ASSIGN_STATIONS,

    // Basic Analytics
    PERMISSIONS.DATA_VIEW_REPORTS,
    PERMISSIONS.SYSTEM_VIEW_ANALYTICS,

    // Enhanced Rework
    PERMISSIONS.REWORK_APPROVE,
    PERMISSIONS.REWORK_COMPLETE
  ],

// QC Manager permissions  
ROLE_PERMISSIONS[USER_ROLES.QC_MANAGER] = [
  // All Production Supervisor permissions
  ...ROLE_PERMISSIONS[USER_ROLES.PRODUCTION_SUPERVISOR],

    // Quality Control specific
    PERMISSIONS.QC_VIEW_STATS,
    PERMISSIONS.QC_VIEW_FAILURES,
    PERMISSIONS.QC_APPROVE_INSPECTION,
    PERMISSIONS.QC_REJECT_INSPECTION,
    PERMISSIONS.QC_GENERATE_REPORTS,

    // Enhanced Inspections
    PERMISSIONS.INSPECTION_REVIEW,
    PERMISSIONS.INSPECTION_STATS,

    // Enhanced Manufacturing Orders
    PERMISSIONS.MO_GENERATE_REPORT,

    // Data Management
    PERMISSIONS.DATA_EXPORT,
    PERMISSIONS.DATA_IMPORT,

    // Basic User Management
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_UPDATE,

    // System Monitoring
    PERMISSIONS.SYSTEM_VIEW_LOGS
  ],

// System Admin permissions
ROLE_PERMISSIONS[USER_ROLES.SYSTEM_ADMIN] = [
  // All permissions - system administrators have full access
  ...Object.values(PERMISSIONS)
];

// Close the initialization function
};

// Initialize role permissions
initializeRolePermissions();

/**
 * Permission categories for UI organization
 */
export const PERMISSION_CATEGORIES = {
  STATION: {
    name: 'Station Operations',
    description: 'Barcode scanning, inspections, and station management',
    permissions: [
      PERMISSIONS.STATION_SCAN_BARCODE,
      PERMISSIONS.STATION_SUBMIT_INSPECTION,
      PERMISSIONS.STATION_VIEW_QUEUE,
      PERMISSIONS.STATION_MANUAL_ENTRY,
      PERMISSIONS.STATION_VIEW_ALL,
      PERMISSIONS.STATION_CONFIGURE
    ]
  },

  PANEL: {
    name: 'Panel Management',
    description: 'Panel tracking, status updates, and history',
    permissions: [
      PERMISSIONS.PANEL_VIEW,
      PERMISSIONS.PANEL_VIEW_ALL,
      PERMISSIONS.PANEL_CREATE,
      PERMISSIONS.PANEL_UPDATE,
      PERMISSIONS.PANEL_UPDATE_STATUS,
      PERMISSIONS.PANEL_VIEW_HISTORY,
      PERMISSIONS.PANEL_SEARCH
    ]
  },

  MANUFACTURING: {
    name: 'Manufacturing Orders',
    description: 'Production order management and tracking',
    permissions: [
      PERMISSIONS.MO_VIEW,
      PERMISSIONS.MO_VIEW_ALL,
      PERMISSIONS.MO_CREATE,
      PERMISSIONS.MO_UPDATE,
      PERMISSIONS.MO_CLOSE,
      PERMISSIONS.MO_GENERATE_REPORT
    ]
  },

  QUALITY: {
    name: 'Quality Control',
    description: 'Inspections, quality statistics, and approval workflows',
    permissions: [
      PERMISSIONS.INSPECTION_VIEW,
      PERMISSIONS.INSPECTION_VIEW_ALL,
      PERMISSIONS.INSPECTION_CREATE,
      PERMISSIONS.INSPECTION_UPDATE,
      PERMISSIONS.INSPECTION_DELETE,
      PERMISSIONS.INSPECTION_REVIEW,
      PERMISSIONS.INSPECTION_STATS,
      PERMISSIONS.QC_VIEW_STATS,
      PERMISSIONS.QC_VIEW_FAILURES,
      PERMISSIONS.QC_APPROVE_INSPECTION,
      PERMISSIONS.QC_REJECT_INSPECTION,
      PERMISSIONS.QC_GENERATE_REPORTS
    ]
  },

  PALLET: {
    name: 'Pallet Management',
    description: 'Pallet creation, completion, and shipping',
    permissions: [
      PERMISSIONS.PALLET_VIEW,
      PERMISSIONS.PALLET_VIEW_ALL,
      PERMISSIONS.PALLET_CREATE,
      PERMISSIONS.PALLET_UPDATE,
      PERMISSIONS.PALLET_COMPLETE,
      PERMISSIONS.PALLET_PRINT_LABEL,
      PERMISSIONS.PALLET_GENERATE_SHEET
    ]
  },

  USER_ADMIN: {
    name: 'User Administration',
    description: 'User management and role assignments',
    permissions: [
      PERMISSIONS.USER_VIEW_PROFILE,
      PERMISSIONS.USER_VIEW_ALL,
      PERMISSIONS.USER_CREATE,
      PERMISSIONS.USER_UPDATE,
      PERMISSIONS.USER_DELETE,
      PERMISSIONS.USER_ASSIGN_STATIONS,
      PERMISSIONS.USER_CHANGE_PASSWORD
    ]
  },

  SYSTEM_ADMIN: {
    name: 'System Administration',
    description: 'System configuration, logs, and maintenance',
    permissions: [
      PERMISSIONS.SYSTEM_VIEW_LOGS,
      PERMISSIONS.SYSTEM_VIEW_ANALYTICS,
      PERMISSIONS.SYSTEM_CONFIGURE,
      PERMISSIONS.SYSTEM_BACKUP,
      PERMISSIONS.SYSTEM_MAINTENANCE
    ]
  },

  DATA: {
    name: 'Data Management',
    description: 'Import, export, and reporting capabilities',
    permissions: [
      PERMISSIONS.DATA_EXPORT,
      PERMISSIONS.DATA_IMPORT,
      PERMISSIONS.DATA_VIEW_REPORTS
    ]
  },

  REWORK: {
    name: 'Rework Management',
    description: 'Failure handling and rework processes',
    permissions: [
      PERMISSIONS.REWORK_INITIATE,
      PERMISSIONS.REWORK_VIEW,
      PERMISSIONS.REWORK_APPROVE,
      PERMISSIONS.REWORK_COMPLETE
    ]
  }
};

/**
 * Check if a user role has a specific permission
 */
export const hasPermission = (userRole, permission) => {
  if (!userRole || !permission) {
    return false;
  }

  const rolePermissions = ROLE_PERMISSIONS[userRole];
  if (!rolePermissions) {
    return false;
  }

  return rolePermissions.includes(permission);
};

/**
 * Get all permissions for a user role
 */
export const getRolePermissions = (userRole) => {
  if (!userRole) {
    return [];
  }

  return ROLE_PERMISSIONS[userRole] || [];
};

/**
 * Check if a user role has any permission from a list
 */
export const hasAnyPermission = (userRole, permissions) => {
  if (!userRole || !Array.isArray(permissions)) {
    return false;
  }

  return permissions.some(permission => hasPermission(userRole, permission));
};

/**
 * Check if a user role has all permissions from a list
 */
export const hasAllPermissions = (userRole, permissions) => {
  if (!userRole || !Array.isArray(permissions)) {
    return false;
  }

  return permissions.every(permission => hasPermission(userRole, permission));
};

/**
 * Get permission categories that a role has access to
 */
export const getRolePermissionCategories = (userRole) => {
  const userPermissions = getRolePermissions(userRole);
  const accessibleCategories = {};

  Object.entries(PERMISSION_CATEGORIES).forEach(([categoryKey, category]) => {
    const categoryPermissions = category.permissions.filter(permission => 
      userPermissions.includes(permission)
    );

    if (categoryPermissions.length > 0) {
      accessibleCategories[categoryKey] = {
        ...category,
        accessiblePermissions: categoryPermissions,
        hasFullAccess: categoryPermissions.length === category.permissions.length
      };
    }
  });

  return accessibleCategories;
};

/**
 * Station-specific permission checking for inspectors
 */
export const hasStationPermission = (user, permission, stationId) => {
  // Check basic permission first
  if (!hasPermission(user.role, permission)) {
    return false;
  }

  // Station inspectors are restricted to assigned stations
  if (user.role === USER_ROLES.STATION_INSPECTOR) {
    if (!stationId) {
      return false; // Station ID required for station-specific operations
    }

    return user.station_assignments && user.station_assignments.includes(stationId);
  }

  // Higher roles have access to all stations
  return true;
};

/**
 * Get readable permission description
 */
export const getPermissionDescription = (permission) => {
  const descriptions = {
    [PERMISSIONS.STATION_SCAN_BARCODE]: 'Scan barcodes at manufacturing stations',
    [PERMISSIONS.STATION_SUBMIT_INSPECTION]: 'Submit inspection results for panels',
    [PERMISSIONS.STATION_VIEW_QUEUE]: 'View panel queue at stations',
    [PERMISSIONS.STATION_MANUAL_ENTRY]: 'Manually enter panel data when scanning fails',
    [PERMISSIONS.STATION_VIEW_ALL]: 'View all station statuses and operations',
    [PERMISSIONS.STATION_CONFIGURE]: 'Configure station settings and criteria',

    [PERMISSIONS.PANEL_VIEW]: 'View panel information and status',
    [PERMISSIONS.PANEL_VIEW_ALL]: 'View all panels across all manufacturing orders',
    [PERMISSIONS.PANEL_CREATE]: 'Create new panel entries in the system',
    [PERMISSIONS.PANEL_UPDATE]: 'Update panel information and specifications',
    [PERMISSIONS.PANEL_UPDATE_STATUS]: 'Update panel workflow status',
    [PERMISSIONS.PANEL_VIEW_HISTORY]: 'View complete panel inspection history',
    [PERMISSIONS.PANEL_SEARCH]: 'Search panels by various criteria',

    [PERMISSIONS.MO_VIEW]: 'View manufacturing order details',
    [PERMISSIONS.MO_VIEW_ALL]: 'View all manufacturing orders',
    [PERMISSIONS.MO_CREATE]: 'Create new manufacturing orders',
    [PERMISSIONS.MO_UPDATE]: 'Update manufacturing order details',
    [PERMISSIONS.MO_CLOSE]: 'Close and complete manufacturing orders',
    [PERMISSIONS.MO_GENERATE_REPORT]: 'Generate manufacturing order reports',

    [PERMISSIONS.INSPECTION_VIEW]: 'View inspection records',
    [PERMISSIONS.INSPECTION_VIEW_ALL]: 'View all inspection records across the system',
    [PERMISSIONS.INSPECTION_CREATE]: 'Create new inspection records',
    [PERMISSIONS.INSPECTION_UPDATE]: 'Update existing inspection records',
    [PERMISSIONS.INSPECTION_DELETE]: 'Delete inspection records',
    [PERMISSIONS.INSPECTION_REVIEW]: 'Review and approve/reject inspections',
    [PERMISSIONS.INSPECTION_STATS]: 'View inspection statistics and analytics',

    [PERMISSIONS.PALLET_VIEW]: 'View pallet information and contents',
    [PERMISSIONS.PALLET_VIEW_ALL]: 'View all pallets in the system',
    [PERMISSIONS.PALLET_CREATE]: 'Create new pallets',
    [PERMISSIONS.PALLET_UPDATE]: 'Update pallet information',
    [PERMISSIONS.PALLET_COMPLETE]: 'Mark pallets as complete and ready for shipping',
    [PERMISSIONS.PALLET_PRINT_LABEL]: 'Print pallet labels and stickers',
    [PERMISSIONS.PALLET_GENERATE_SHEET]: 'Generate pallet content sheets',

    [PERMISSIONS.USER_VIEW_PROFILE]: 'View own user profile',
    [PERMISSIONS.USER_VIEW_ALL]: 'View all user profiles',
    [PERMISSIONS.USER_CREATE]: 'Create new user accounts',
    [PERMISSIONS.USER_UPDATE]: 'Update user account information',
    [PERMISSIONS.USER_DELETE]: 'Delete user accounts',
    [PERMISSIONS.USER_ASSIGN_STATIONS]: 'Assign stations to inspector users',
    [PERMISSIONS.USER_CHANGE_PASSWORD]: 'Change user passwords',

    [PERMISSIONS.SYSTEM_VIEW_LOGS]: 'View system logs and audit trails',
    [PERMISSIONS.SYSTEM_VIEW_ANALYTICS]: 'View production analytics and reports',
    [PERMISSIONS.SYSTEM_CONFIGURE]: 'Configure system settings',
    [PERMISSIONS.SYSTEM_BACKUP]: 'Perform system backups',
    [PERMISSIONS.SYSTEM_MAINTENANCE]: 'Perform system maintenance operations',

    [PERMISSIONS.DATA_EXPORT]: 'Export data in various formats',
    [PERMISSIONS.DATA_IMPORT]: 'Import data from external sources',
    [PERMISSIONS.DATA_VIEW_REPORTS]: 'View generated reports and analytics',

    [PERMISSIONS.QC_VIEW_STATS]: 'View quality control statistics',
    [PERMISSIONS.QC_VIEW_FAILURES]: 'View failure analysis and trends',
    [PERMISSIONS.QC_APPROVE_INSPECTION]: 'Approve quality control inspections',
    [PERMISSIONS.QC_REJECT_INSPECTION]: 'Reject quality control inspections',
    [PERMISSIONS.QC_GENERATE_REPORTS]: 'Generate quality control reports',

    [PERMISSIONS.REWORK_INITIATE]: 'Initiate rework processes for failed panels',
    [PERMISSIONS.REWORK_VIEW]: 'View rework queue and status',
    [PERMISSIONS.REWORK_APPROVE]: 'Approve rework completion',
    [PERMISSIONS.REWORK_COMPLETE]: 'Mark rework as completed'
  };

  return descriptions[permission] || 'Unknown permission';
};

export default {
  USER_ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  PERMISSION_CATEGORIES,
  hasPermission,
  getRolePermissions,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissionCategories,
  hasStationPermission,
  getPermissionDescription
};
