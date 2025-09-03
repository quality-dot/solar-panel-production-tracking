// API client for manufacturing system
// Handles HTTP requests with authentication and error handling

class ApiClient {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    this.authToken = null;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  setAuthToken(token) {
    this.authToken = token;
    if (token) {
      this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.defaultHeaders['Authorization'];
    }
  }

  clearAuthToken() {
    this.authToken = null;
    delete this.defaultHeaders['Authorization'];
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: { ...this.defaultHeaders, ...options.headers },
      ...options,
    };

    // Add session ID to headers if available
    const sessionData = localStorage.getItem('auth_session');
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        if (session.sessionId) {
          config.headers['X-Session-ID'] = session.sessionId;
        }
      } catch (error) {
        console.error('Error parsing session data:', error);
      }
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          statusText: response.statusText,
          data: data,
          response: response
        };
      }

      return data;
    } catch (error) {
      if (error.status === 401) {
        // Handle unauthorized access
        this.handleUnauthorized();
      }
      throw error;
    }
  }

  async get(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'GET',
      ...options,
    });
  }

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    });
  }

  async patch(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...options,
    });
  }

  async delete(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  handleUnauthorized() {
    // Clear authentication data
    localStorage.removeItem('auth_tokens');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_session');
    this.clearAuthToken();

    // Redirect to login page
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  // Authentication endpoints
  async login(credentials) {
    return this.post('/api/v1/auth/login', credentials);
  }

  async logout(sessionId) {
    return this.post('/api/v1/auth/logout', { sessionId });
  }

  async refreshToken(refreshToken) {
    return this.post('/api/v1/auth/refresh', { refreshToken });
  }

  // Password reset endpoints
  async forgotPassword(email) {
    return this.post('/api/v1/auth/forgot-password', { email });
  }

  async resetPassword(token, newPassword) {
    return this.post('/api/v1/auth/reset-password', { token, newPassword });
  }

  async validateResetToken(token) {
    return this.get(`/api/v1/auth/validate-reset-token/${token}`);
  }

  // User management endpoints
  async getUsers(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.get(`/api/v1/auth/users?${params}`);
  }

  async getUser(userId) {
    return this.get(`/api/v1/auth/users/${userId}`);
  }

  async createUser(userData) {
    return this.post('/api/v1/auth/users', userData);
  }

  async updateUser(userId, userData) {
    return this.put(`/api/v1/auth/users/${userId}`, userData);
  }

  async deleteUser(userId, hardDelete = false) {
    return this.delete(`/api/v1/auth/users/${userId}`, { hardDelete });
  }

  async getUserStatistics() {
    return this.get('/api/v1/auth/users/statistics');
  }

  // Session management endpoints
  async getSessionInfo(sessionId) {
    return this.get(`/api/v1/auth/sessions/${sessionId}`);
  }

  async getUserSessions(userId) {
    return this.get(`/api/v1/auth/sessions/user/${userId}`);
  }

  async invalidateSession(sessionId, reason) {
    return this.delete(`/api/v1/auth/sessions/${sessionId}`, { reason });
  }

  async invalidateAllUserSessions(userId, reason) {
    return this.delete(`/api/v1/auth/sessions/user/${userId}/all`, { reason });
  }

  async getSessionStatistics() {
    return this.get('/api/v1/auth/sessions/statistics');
  }

  async checkTokenBlacklist(token) {
    return this.post('/api/v1/auth/sessions/check-token', { token });
  }

  async forceSessionCleanup() {
    return this.post('/api/v1/auth/sessions/cleanup');
  }

  async getSessionConfig() {
    return this.get('/api/v1/auth/sessions/config');
  }

  // Account lockout endpoints
  async getAccountLockoutStatus(userId) {
    return this.get(`/api/v1/auth/account-lockout/status/${userId}`);
  }

  async unlockAccount(userId, reason) {
    return this.post(`/api/v1/auth/account-lockout/unlock/${userId}`, { reason });
  }

  async getLockoutStatistics() {
    return this.get('/api/v1/auth/account-lockout/statistics');
  }

  async getUserLockoutHistory(userId) {
    return this.get(`/api/v1/auth/account-lockout/history/${userId}`);
  }

  async getLockoutConfig() {
    return this.get('/api/v1/auth/account-lockout/config');
  }

  // Manufacturing endpoints
  async getManufacturingOrders(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.get(`/api/v1/manufacturing-orders?${params}`);
  }

  async getManufacturingOrder(orderId) {
    return this.get(`/api/v1/manufacturing-orders/${orderId}`);
  }

  async createManufacturingOrder(orderData) {
    return this.post('/api/v1/manufacturing-orders', orderData);
  }

  async updateManufacturingOrder(orderId, orderData) {
    return this.put(`/api/v1/manufacturing-orders/${orderId}`, orderData);
  }

  async getPanels(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.get(`/api/v1/panels?${params}`);
  }

  async getPanel(panelId) {
    return this.get(`/api/v1/panels/${panelId}`);
  }

  async getStations() {
    return this.get('/api/v1/stations');
  }

  async getStation(stationId) {
    return this.get(`/api/v1/stations/${stationId}`);
  }

  async getInspections(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.get(`/api/v1/inspections?${params}`);
  }

  async getInspection(inspectionId) {
    return this.get(`/api/v1/inspections/${inspectionId}`);
  }

  async createInspection(inspectionData) {
    return this.post('/api/v1/inspections', inspectionData);
  }

  async getPallets(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.get(`/api/v1/pallets?${params}`);
  }

  async getPallet(palletId) {
    return this.get(`/api/v1/pallets/${palletId}`);
  }

  // Utility methods
  async uploadFile(endpoint, file, additionalData = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    Object.keys(additionalData).forEach(key => {
      formData.append(key, additionalData[key]);
    });

    return this.request(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        ...this.defaultHeaders,
        // Don't set Content-Type for FormData, let browser set it
        'Content-Type': undefined,
      },
    });
  }

  async downloadFile(endpoint, filename) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: this.defaultHeaders,
    });

    if (!response.ok) {
      throw new Error('Download failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
