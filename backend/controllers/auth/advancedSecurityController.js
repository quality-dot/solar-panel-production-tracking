// Advanced Security Controller with Token Rotation
// Manufacturing-optimized security features with automatic token management

import { tokenRotationService } from '../../services/tokenRotationService.js';
import { sessionManager } from '../../services/sessionManager.js';
import { User } from '../../models/index.js';
import { 
  successResponse, 
  errorResponse, 
  manufacturingResponse 
} from '../../utils/index.js';
import { manufacturingLogger } from '../../middleware/logger.js';
import { 
  AuthenticationError, 
  ValidationError, 
  asyncHandler 
} from '../../middleware/errorHandler.js';
import { verifyToken, TOKEN_TYPES } from '../../utils/index.js';

/**
 * Advanced login with security monitoring
 * POST /api/v1/auth/advanced-login
 */
export const advancedLogin = asyncHandler(async (req, res) => {
  const { username, password, stationId } = req.body;

  // Validate input
  if (!username || !password) {
    throw new ValidationError('Username and password are required', {
      fields: ['username', 'password'],
      reason: 'missing_credentials'
    });
  }

  // Apply IP-based security restrictions
  const ipRestriction = await tokenRotationService.applyIPSecurityRestrictions(req.ip);
  if (!ipRestriction.allowed) {
    manufacturingLogger.warn('Login blocked due to IP restrictions', {
      ip: req.ip,
      reason: ipRestriction.reason,
      category: 'security'
    });

    return res.status(403).json(manufacturingResponse(
      { blocked: true, reason: ipRestriction.reason },
      'Access blocked due to security restrictions',
      {
        action: 'login_blocked',
        ip: req.ip,
        timestamp: req.timestamp
      }
    ));
  }

  // Authenticate user
  const user = await User.authenticate(username, password);
  
  // Generate device fingerprint
  const deviceFingerprint = tokenRotationService.generateDeviceFingerprint(req);
  
  // Check for suspicious activity
  const suspiciousActivity = await tokenRotationService.detectSuspiciousActivity(
    user.id, 
    deviceFingerprint, 
    req
  );

  // Enforce session limits
  const sessionLimit = await tokenRotationService.enforceSessionLimits(user.id);
  
  // Create session with security monitoring
  const sessionResult = await sessionManager.createSession(user, stationId);
  
  // Update session with device fingerprint
  await sessionManager.updateDeviceFingerprint(sessionResult.sessionId, deviceFingerprint);

  // Log advanced login with security details
  manufacturingLogger.info('Advanced login with security monitoring', {
    userId: user.id,
    username: user.username,
    role: user.role,
    sessionId: sessionResult.sessionId,
    stationId: stationId || 'not_specified',
    ip: req.ip,
    deviceFingerprint: deviceFingerprint.hash,
    suspicious: suspiciousActivity.suspicious,
    suspiciousReasons: suspiciousActivity.reasons,
    sessionLimitEnforced: sessionLimit.limitEnforced,
    category: 'authentication'
  });

  // Prepare response data
  const responseData = {
    user: user.toPublicJSON(),
    session: {
      id: sessionResult.sessionId,
      loginTime: sessionResult.sessionData.loginTime,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      stationContext: stationId || null
    },
    tokens: sessionResult.tokens,
    permissions: sessionResult.sessionData.permissions,
    security: {
      deviceFingerprint: deviceFingerprint.hash,
      suspicious: suspiciousActivity.suspicious,
      warnings: suspiciousActivity.reasons,
      sessionLimitEnforced: sessionLimit.limitEnforced
    }
  };

  res.status(200).json(manufacturingResponse(
    responseData,
    'Advanced login successful',
    {
      action: 'advanced_login',
      sessionId: sessionResult.sessionId,
      securityLevel: suspiciousActivity.suspicious ? 'high' : 'normal',
      timestamp: req.timestamp
    }
  ));
});

/**
 * Automatic token rotation endpoint
 * POST /api/v1/auth/token/rotate
 */
export const rotateTokens = asyncHandler(async (req, res) => {
  const { currentToken, reason } = req.body;

  if (!currentToken) {
    throw new ValidationError('Current token required', {
      field: 'currentToken',
      reason: 'missing_token'
    });
  }

  try {
    // Verify current token to get user ID
    const decoded = verifyToken(currentToken, TOKEN_TYPES.ACCESS);
    const userId = decoded.userId;

    // Rotate tokens
    const rotationResult = await tokenRotationService.rotateTokens(
      userId, 
      currentToken, 
      reason || 'manual_rotation'
    );

    res.status(200).json(manufacturingResponse(
      {
        newTokens: rotationResult.newTokens,
        newSessionId: rotationResult.newSessionId,
        rotatedAt: rotationResult.rotatedAt,
        reason: rotationResult.reason
      },
      'Token rotation completed successfully',
      {
        action: 'token_rotation',
        userId,
        oldSessionId: decoded.sessionId,
        newSessionId: rotationResult.newSessionId,
        timestamp: req.timestamp
      }
    ));
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    
    throw new AuthenticationError('Token rotation failed', {
      reason: 'rotation_error',
      details: error.message
    });
  }
});

/**
 * Get security statistics and monitoring data
 * GET /api/v1/auth/security/stats
 */
export const getSecurityStats = asyncHandler(async (req, res) => {
  // Only system admins and QC managers can view security stats
  if (!['SYSTEM_ADMIN', 'QC_MANAGER'].includes(req.user.role)) {
    throw new AuthenticationError('Insufficient permissions for security stats', {
      reason: 'insufficient_permissions'
    });
  }

  const [sessionStats, securityStats] = await Promise.all([
    sessionManager.getSessionStats(),
    tokenRotationService.getSecurityStats()
  ]);

  const combinedStats = {
    timestamp: new Date().toISOString(),
    sessions: sessionStats,
    security: securityStats,
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version
    }
  };

  res.status(200).json(manufacturingResponse(
    combinedStats,
    'Security statistics retrieved',
    {
      action: 'get_security_stats',
      timestamp: req.timestamp
    }
  ));
});

/**
 * Get user security profile
 * GET /api/v1/auth/security/profile/:userId
 */
export const getUserSecurityProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Check permissions
  if (req.user.role !== 'SYSTEM_ADMIN' && req.user.id !== userId) {
    throw new AuthenticationError('Access denied to user security profile', {
      reason: 'insufficient_permissions'
    });
  }

  // Get user's active sessions
  const activeSessions = await sessionManager.getUserActiveSessions(userId);
  
  // Get user details
  const user = await User.findById(userId);
  if (!user) {
    throw new ValidationError('User not found', {
      reason: 'user_not_found'
    });
  }

  // Analyze security profile
  const securityProfile = {
    userId: user.id,
    username: user.username,
    role: user.role,
    activeSessions: activeSessions.length,
    maxConcurrentSessions: tokenRotationService.maxConcurrentSessions,
    lastLogin: user.last_login,
    failedLoginAttempts: user.failed_login_attempts || 0,
    lockedUntil: user.locked_until,
    sessions: activeSessions.map(session => ({
      id: session.id,
      loginTime: session.loginTime,
      lastActivity: session.lastActivity,
      ipAddress: session.ipAddress,
      deviceFingerprint: session.deviceFingerprint?.hash,
      stationId: session.stationId
    })),
    securityScore: calculateSecurityScore(user, activeSessions)
  };

  res.status(200).json(manufacturingResponse(
    securityProfile,
    'User security profile retrieved',
    {
      action: 'get_user_security_profile',
      targetUserId: userId,
      timestamp: req.timestamp
    }
  ));
});

/**
 * Force logout user from all sessions with security logging
 * POST /api/v1/auth/security/force-logout
 */
export const forceLogoutWithSecurity = asyncHandler(async (req, res) => {
  const { userId, reason, securityIncident } = req.body;

  // Only system admins can force logout users
  if (req.user.role !== 'SYSTEM_ADMIN') {
    throw new AuthenticationError('Insufficient permissions for force logout', {
      reason: 'insufficient_permissions'
    });
  }

  if (!userId) {
    throw new ValidationError('User ID required', {
      field: 'userId',
      reason: 'missing_user_id'
    });
  }

  // Get user details for logging
  const user = await User.findById(userId);
  if (!user) {
    throw new ValidationError('User not found', {
      reason: 'user_not_found'
    });
  }

  // Force logout from all sessions
  const sessionsCount = await sessionManager.forceLogoutUser(userId, reason || 'admin_forced');

  // Log security incident if specified
  if (securityIncident) {
    manufacturingLogger.warn('Security incident - user force logged out', {
      adminUserId: req.user.id,
      adminUsername: req.user.username,
      targetUserId: userId,
      targetUsername: user.username,
      reason: reason || 'admin_forced',
      securityIncident,
      sessionsCount,
      category: 'security_incident'
    });
  }

  res.status(200).json(manufacturingResponse(
    {
      userId,
      username: user.username,
      sessionsCount,
      reason: reason || 'admin_forced',
      securityIncident: securityIncident || false,
      timestamp: new Date().toISOString()
    },
    'User force logged out from all sessions',
    {
      action: 'force_logout_with_security',
      targetUserId: userId,
      securityIncident: securityIncident || false,
      timestamp: req.timestamp
    }
  ));
});

/**
 * Update security settings for user
 * PUT /api/v1/auth/security/settings/:userId
 */
export const updateUserSecuritySettings = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { maxConcurrentSessions, deviceFingerprinting, ipRestrictions } = req.body;

  // Only system admins can update security settings
  if (req.user.role !== 'SYSTEM_ADMIN') {
    throw new AuthenticationError('Insufficient permissions for security settings', {
      reason: 'insufficient_permissions'
    });
  }

  // Validate settings
  if (maxConcurrentSessions && (maxConcurrentSessions < 1 || maxConcurrentSessions > 10)) {
    throw new ValidationError('Max concurrent sessions must be between 1 and 10', {
      field: 'maxConcurrentSessions',
      value: maxConcurrentSessions,
      reason: 'invalid_range'
    });
  }

  // Update user's security settings in Redis
  const { getRedisClient, REDIS_KEYS, generateRedisKey } = await import('../../config/redis.js');
  const redis = getRedisClient();
  
  const settingsKey = generateRedisKey(REDIS_KEYS.CACHE, `user:${userId}:security_settings`);
  const currentSettings = await redis.get(settingsKey);
  const existingSettings = currentSettings ? JSON.parse(currentSettings) : {};

  const updatedSettings = {
    ...existingSettings,
    maxConcurrentSessions: maxConcurrentSessions || existingSettings.maxConcurrentSessions,
    deviceFingerprinting: deviceFingerprinting !== undefined ? deviceFingerprinting : existingSettings.deviceFingerprinting,
    ipRestrictions: ipRestrictions || existingSettings.ipRestrictions,
    updatedAt: new Date().toISOString(),
    updatedBy: req.user.id
  };

  // Store updated settings
  await redis.setex(settingsKey, 3600, JSON.stringify(updatedSettings)); // 1 hour TTL

  // Log security settings update
  manufacturingLogger.info('User security settings updated', {
    adminUserId: req.user.id,
    adminUsername: req.user.username,
    targetUserId: userId,
    settings: updatedSettings,
    category: 'security'
  });

  res.status(200).json(manufacturingResponse(
    updatedSettings,
    'User security settings updated',
    {
      action: 'update_user_security_settings',
      targetUserId: userId,
      timestamp: req.timestamp
    }
  ));
});

/**
 * Calculate security score for user
 * Higher score = better security posture
 */
function calculateSecurityScore(user, activeSessions) {
  let score = 100; // Start with perfect score

  // Deduct points for failed login attempts
  if (user.failed_login_attempts > 0) {
    score -= Math.min(20, user.failed_login_attempts * 5);
  }

  // Deduct points for account lockout
  if (user.locked_until) {
    score -= 30;
  }

  // Deduct points for multiple active sessions
  if (activeSessions.length > 3) {
    score -= Math.min(20, (activeSessions.length - 3) * 5);
  }

  // Deduct points for multiple IP addresses
  const uniqueIPs = new Set(activeSessions.map(s => s.ipAddress).filter(Boolean));
  if (uniqueIPs.size > 2) {
    score -= Math.min(15, (uniqueIPs.size - 2) * 5);
  }

  // Ensure score doesn't go below 0
  return Math.max(0, Math.round(score));
}

// Default export for the entire controller
export default {
  advancedLogin,
  rotateTokens,
  getSecurityStats,
  getUserSecurityProfile,
  forceLogoutWithSecurity,
  updateUserSecuritySettings
};
