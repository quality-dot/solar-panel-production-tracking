import SyncErrorHandler, { ErrorInfo } from '../errorHandling';

describe('SyncErrorHandler', () => {
  describe('Error Categorization', () => {
    it('should categorize network errors correctly', () => {
      const error = new Error('Failed to fetch');
      const errorInfo = SyncErrorHandler.categorizeError(error);
      
      expect(errorInfo.type).toBe('network');
      expect(errorInfo.severity).toBe('medium');
      expect(errorInfo.retryable).toBe(true);
      expect(errorInfo.userMessage).toContain('Network connection issue');
    });

    it('should categorize timeout errors correctly', () => {
      const error = new Error('Request timeout after 30 seconds');
      const errorInfo = SyncErrorHandler.categorizeError(error);
      
      expect(errorInfo.type).toBe('timeout');
      expect(errorInfo.severity).toBe('medium');
      expect(errorInfo.retryable).toBe(true);
      expect(errorInfo.userMessage).toContain('Request timed out');
    });

    it('should categorize server errors correctly', () => {
      const error = new Error('HTTP 500: Internal Server Error');
      const errorInfo = SyncErrorHandler.categorizeError(error);
      
      expect(errorInfo.type).toBe('server');
      expect(errorInfo.severity).toBe('high');
      expect(errorInfo.retryable).toBe(true);
      expect(errorInfo.userMessage).toContain('Server is experiencing issues');
    });

    it('should categorize client errors correctly', () => {
      const error = new Error('HTTP 400: Bad Request');
      const errorInfo = SyncErrorHandler.categorizeError(error);
      
      expect(errorInfo.type).toBe('client');
      expect(errorInfo.severity).toBe('high');
      expect(errorInfo.retryable).toBe(false);
      expect(errorInfo.userMessage).toContain('Unable to process your request');
    });

    it('should categorize conflict errors correctly', () => {
      const error = new Error('HTTP 409: Conflict');
      const errorInfo = SyncErrorHandler.categorizeError(error);
      
      expect(errorInfo.type).toBe('conflict');
      expect(errorInfo.severity).toBe('medium');
      expect(errorInfo.retryable).toBe(false);
      expect(errorInfo.userMessage).toContain('Data conflict detected');
    });

    it('should categorize validation errors correctly', () => {
      const error = new Error('HTTP 422: Validation failed');
      const errorInfo = SyncErrorHandler.categorizeError(error);
      
      expect(errorInfo.type).toBe('validation');
      expect(errorInfo.severity).toBe('medium');
      expect(errorInfo.retryable).toBe(false);
      expect(errorInfo.userMessage).toContain('Data validation failed');
    });

    it('should categorize permission errors correctly', () => {
      const error = new Error('HTTP 403: Forbidden');
      const errorInfo = SyncErrorHandler.categorizeError(error);
      
      expect(errorInfo.type).toBe('permission');
      expect(errorInfo.severity).toBe('high');
      expect(errorInfo.retryable).toBe(false);
      expect(errorInfo.userMessage).toContain('don\'t have permission');
    });

    it('should categorize unknown errors correctly', () => {
      const error = new Error('Some random error message');
      const errorInfo = SyncErrorHandler.categorizeError(error);
      
      expect(errorInfo.type).toBe('unknown');
      expect(errorInfo.severity).toBe('medium');
      expect(errorInfo.retryable).toBe(true);
      expect(errorInfo.userMessage).toContain('unexpected error occurred');
    });

    it('should handle non-Error objects', () => {
      const error = 'String error message';
      const errorInfo = SyncErrorHandler.categorizeError(error);
      
      expect(errorInfo.type).toBe('unknown');
      expect(errorInfo.technicalMessage).toBe('String error message');
    });
  });

  describe('Retry Logic', () => {
    it('should allow retries for network errors', () => {
      const error = new Error('Failed to fetch');
      expect(SyncErrorHandler.shouldRetry(error, 0)).toBe(true);
      expect(SyncErrorHandler.shouldRetry(error, 4)).toBe(true);
      expect(SyncErrorHandler.shouldRetry(error, 5)).toBe(false);
    });

    it('should allow retries for timeout errors', () => {
      const error = new Error('Request timeout');
      expect(SyncErrorHandler.shouldRetry(error, 0)).toBe(true);
      expect(SyncErrorHandler.shouldRetry(error, 2)).toBe(true);
      expect(SyncErrorHandler.shouldRetry(error, 3)).toBe(false);
    });

    it('should allow retries for server errors', () => {
      const error = new Error('HTTP 500');
      expect(SyncErrorHandler.shouldRetry(error, 0)).toBe(true);
      expect(SyncErrorHandler.shouldRetry(error, 2)).toBe(true);
      expect(SyncErrorHandler.shouldRetry(error, 3)).toBe(false);
    });

    it('should not allow retries for client errors', () => {
      const error = new Error('HTTP 400');
      expect(SyncErrorHandler.shouldRetry(error, 0)).toBe(false);
      expect(SyncErrorHandler.shouldRetry(error, 5)).toBe(false);
    });

    it('should not allow retries for conflict errors', () => {
      const error = new Error('HTTP 409');
      expect(SyncErrorHandler.shouldRetry(error, 0)).toBe(false);
    });

    it('should not allow retries for validation errors', () => {
      const error = new Error('HTTP 422');
      expect(SyncErrorHandler.shouldRetry(error, 0)).toBe(false);
    });

    it('should not allow retries for permission errors', () => {
      const error = new Error('HTTP 403');
      expect(SyncErrorHandler.shouldRetry(error, 0)).toBe(false);
    });

    it('should allow limited retries for unknown errors', () => {
      const error = new Error('Unknown error');
      expect(SyncErrorHandler.shouldRetry(error, 0)).toBe(true);
      expect(SyncErrorHandler.shouldRetry(error, 1)).toBe(true);
      expect(SyncErrorHandler.shouldRetry(error, 2)).toBe(false);
    });
  });

  describe('Retry Delay Calculation', () => {
    it('should calculate exponential backoff with jitter for network errors', () => {
      const delay1 = SyncErrorHandler.getRetryDelay(0, 'network');
      const delay2 = SyncErrorHandler.getRetryDelay(1, 'network');
      const delay3 = SyncErrorHandler.getRetryDelay(2, 'network');
      
      expect(delay1).toBeGreaterThanOrEqual(2000);
      expect(delay1).toBeLessThanOrEqual(3000);
      expect(delay2).toBeGreaterThanOrEqual(4000);
      expect(delay2).toBeLessThanOrEqual(5000);
      expect(delay3).toBeGreaterThanOrEqual(8000);
      expect(delay3).toBeLessThanOrEqual(9000);
    });

    it('should calculate exponential backoff for timeout errors', () => {
      const delay1 = SyncErrorHandler.getRetryDelay(0, 'timeout');
      const delay2 = SyncErrorHandler.getRetryDelay(1, 'timeout');
      
      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeLessThanOrEqual(2000);
      expect(delay2).toBeGreaterThanOrEqual(2000);
      expect(delay2).toBeLessThanOrEqual(3000);
    });

    it('should calculate exponential backoff for server errors', () => {
      const delay1 = SyncErrorHandler.getRetryDelay(0, 'server');
      const delay2 = SyncErrorHandler.getRetryDelay(1, 'server');
      
      expect(delay1).toBeGreaterThanOrEqual(3000);
      expect(delay1).toBeLessThanOrEqual(4000);
      expect(delay2).toBeGreaterThanOrEqual(6000);
      expect(delay2).toBeLessThanOrEqual(7000);
    });

    it('should return 0 delay for non-retryable errors', () => {
      expect(SyncErrorHandler.getRetryDelay(0, 'client')).toBe(0);
      expect(SyncErrorHandler.getRetryDelay(0, 'conflict')).toBe(0);
      expect(SyncErrorHandler.getRetryDelay(0, 'validation')).toBe(0);
      expect(SyncErrorHandler.getRetryDelay(0, 'permission')).toBe(0);
    });

    it('should cap delay at 30 seconds', () => {
      const delay = SyncErrorHandler.getRetryDelay(10, 'network');
      expect(delay).toBeLessThanOrEqual(30000);
    });
  });

  describe('Error Message Formatting', () => {
    it('should format user-friendly error messages', () => {
      const error = new Error('Failed to fetch');
      const userMessage = SyncErrorHandler.formatErrorForUser(error);
      
      expect(userMessage).toContain('Network connection issue');
      expect(userMessage).toContain('Your data is safe');
      expect(userMessage).not.toContain('Failed to fetch');
    });

    it('should format technical error messages for logging', () => {
      const error = new Error('Failed to fetch');
      const logMessage = SyncErrorHandler.formatErrorForLogging(error);
      
      expect(logMessage).toContain('[NETWORK]');
      expect(logMessage).toContain('Failed to fetch');
    });

    it('should provide different messages for different error types', () => {
      const networkError = new Error('Failed to fetch');
      const serverError = new Error('HTTP 500');
      
      const networkMessage = SyncErrorHandler.formatErrorForUser(networkError);
      const serverMessage = SyncErrorHandler.formatErrorForUser(serverError);
      
      expect(networkMessage).not.toBe(serverMessage);
      expect(networkMessage).toContain('Network connection');
      expect(serverMessage).toContain('Server is experiencing');
    });
  });

  describe('Error Recommendations', () => {
    it('should provide recommendations for network errors', () => {
      const error = new Error('Failed to fetch');
      const errorInfo = SyncErrorHandler.categorizeError(error);
      
      expect(errorInfo.recommendations).toContain('Check your internet connection');
      expect(errorInfo.recommendations).toContain('Data will automatically sync when connection is restored');
    });

    it('should provide recommendations for server errors', () => {
      const error = new Error('HTTP 500');
      const errorInfo = SyncErrorHandler.categorizeError(error);
      
      expect(errorInfo.recommendations).toContain('This is a temporary server issue');
      expect(errorInfo.recommendations).toContain('Your data is safely stored locally');
    });

    it('should provide recommendations for client errors', () => {
      const error = new Error('HTTP 400');
      const errorInfo = SyncErrorHandler.categorizeError(error);
      
      expect(errorInfo.recommendations).toContain('Verify the data you entered is correct');
      expect(errorInfo.recommendations).toContain('Contact support if the issue persists');
    });

    it('should provide recommendations for permission errors', () => {
      const error = new Error('HTTP 403');
      const errorInfo = SyncErrorHandler.categorizeError(error);
      
      expect(errorInfo.recommendations).toContain('Contact your administrator for access');
      expect(errorInfo.recommendations).toContain('Verify you\'re logged in with the correct account');
    });
  });

  describe('Error Severity Levels', () => {
    it('should assign correct severity levels', () => {
      const networkError = new Error('Failed to fetch');
      const serverError = new Error('HTTP 500');
      const clientError = new Error('HTTP 400');
      
      expect(SyncErrorHandler.categorizeError(networkError).severity).toBe('medium');
      expect(SyncErrorHandler.categorizeError(serverError).severity).toBe('high');
      expect(SyncErrorHandler.categorizeError(clientError).severity).toBe('high');
    });
  });
});
