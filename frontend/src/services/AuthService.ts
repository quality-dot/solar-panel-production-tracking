import { User, AuthTokens } from '../contexts/AuthContext';

// API base URL - can be configured based on environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// API response types
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  metadata?: any;
}

interface LoginResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
  };
  permissions: {
    role: string;
    stationAccess: number[];
    canAccessAllStations: boolean;
  };
  session: {
    loginTime: string;
    expiresAt: string;
    stationContext: string | null;
  };
}

interface UserProfileResponse {
  user: User;
  permissions: {
    role: string;
    stationAccess: number[];
    canAccessAllStations: boolean;
  };
}

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

interface StationAccessResponse {
  hasAccess: boolean;
  stationId: number;
  userRole: string;
  assignedStations: number[];
}

// Error handling
class AuthServiceError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'AuthServiceError';
  }
}

// Helper function to handle API responses
const handleApiResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    let errorMessage = 'Authentication failed';
    let errorCode: string | undefined;

    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
      errorCode = errorData.code;
    } catch {
      // If we can't parse the error response, use the status text
      errorMessage = response.statusText || errorMessage;
    }

    throw new AuthServiceError(errorMessage, response.status, errorCode);
  }

  try {
    const data: ApiResponse<T> = await response.json();
    return data.data;
  } catch (error) {
    throw new AuthServiceError('Failed to parse response', response.status);
  }
};

// Helper function to get auth headers
const getAuthHeaders = (accessToken?: string): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
};

/**
 * Authentication Service
 * Handles all authentication-related API calls
 */
export class AuthService {
  /**
   * User login
   * @param username - User's username
   * @param password - User's password
   * @param stationId - Optional station ID for context
   * @returns Promise with login response
   */
  static async login(
    username: string,
    password: string,
    stationId?: string
  ): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ username, password, stationId }),
      credentials: 'include', // Include cookies for refresh token
    });

    return handleApiResponse<LoginResponse>(response);
  }

  /**
   * User logout
   * @param accessToken - Current access token
   * @returns Promise indicating success
   */
  static async logout(accessToken: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(accessToken),
      credentials: 'include',
    });

    if (!response.ok) {
      // Log the error but don't throw - we want to logout locally regardless
      console.warn('Logout API call failed:', response.status, response.statusText);
    }
  }

  /**
   * Refresh access token
   * @param refreshToken - Current refresh token
   * @returns Promise with new tokens
   */
  static async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ refreshToken }),
      credentials: 'include',
    });

    const data = await handleApiResponse<{ tokens: any }>(response);
    return data.tokens;
  }

  /**
   * Get current user profile
   * @param accessToken - Current access token
   * @returns Promise with user profile
   */
  static async getProfile(accessToken: string): Promise<UserProfileResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
      method: 'GET',
      headers: getAuthHeaders(accessToken),
      credentials: 'include',
    });

    return handleApiResponse<UserProfileResponse>(response);
  }

  /**
   * Change user password
   * @param accessToken - Current access token
   * @param currentPassword - Current password
   * @param newPassword - New password
   * @returns Promise indicating success
   */
  static async changePassword(
    accessToken: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/change-password`, {
      method: 'POST',
      headers: getAuthHeaders(accessToken),
      body: JSON.stringify({ currentPassword, newPassword }),
      credentials: 'include',
    });

    await handleApiResponse<void>(response);
  }

  /**
   * Check if user has access to specific station
   * @param accessToken - Current access token
   * @param stationId - Station ID to check
   * @returns Promise with access information
   */
  static async checkStationAccess(
    accessToken: string,
    stationId: number
  ): Promise<StationAccessResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/station-access/${stationId}`, {
      method: 'GET',
      headers: getAuthHeaders(accessToken),
      credentials: 'include',
    });

    return handleApiResponse<StationAccessResponse>(response);
  }

  /**
   * Validate token without making a full profile request
   * @param accessToken - Token to validate
   * @returns Promise indicating if token is valid
   */
  static async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        method: 'GET',
        headers: getAuthHeaders(accessToken),
        credentials: 'include',
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get token expiration information
   * @param token - JWT token to analyze
   * @returns Token expiration info or null if invalid
   */
  static getTokenExpiration(token: string): { expiresAt: Date; expiresInMinutes: number } | null {
    try {
      // Decode JWT payload (without verification - just for expiration check)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresAt = new Date(payload.exp * 1000);
      const now = new Date();
      const expiresInMinutes = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60));

      return {
        expiresAt,
        expiresInMinutes,
      };
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired or will expire soon
   * @param token - JWT token to check
   * @param bufferMinutes - Buffer time in minutes (default: 2)
   * @returns True if token is expired or will expire within buffer time
   */
  static isTokenExpired(token: string, bufferMinutes: number = 2): boolean {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return true;

    return expiration.expiresInMinutes <= bufferMinutes;
  }

  /**
   * Create a new AuthTokens object from API response
   * @param tokens - Tokens from API response
   * @returns Formatted AuthTokens object
   */
  static createAuthTokens(tokens: any): AuthTokens {
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: new Date(tokens.expiresAt || Date.now() + 15 * 60 * 1000),
    };
  }
}

// Export error class for use in components
export { AuthServiceError };

// Export default instance
export default AuthService;
