export interface ErrorInfo {
  type: 'network' | 'timeout' | 'server' | 'client' | 'conflict' | 'unknown' | 'validation' | 'permission';
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  userMessage: string;
  technicalMessage: string;
  recommendations: string[];
}

export class SyncErrorHandler {
  private static readonly ERROR_PATTERNS = {
    network: [
      'Failed to fetch',
      'NetworkError',
      'ERR_NETWORK',
      'ERR_INTERNET_DISCONNECTED',
      'ERR_NETWORK_CHANGED'
    ],
    timeout: [
      'timeout',
      'aborted',
      'ERR_TIMED_OUT',
      'ERR_CONNECTION_TIMED_OUT'
    ],
    permission: [
      '401',
      '403',
      'Unauthorized',
      'Forbidden',
      'Access denied'
    ],
    server: [
      '500',
      '502',
      '503',
      '504',
      'Internal Server Error',
      'Bad Gateway',
      'Service Unavailable',
      'Gateway Timeout'
    ],
    client: [
      '400',
      '404',
      'Bad Request',
      'Not Found'
    ],
    conflict: [
      '409',
      'Conflict',
      'Version conflict',
      'Data conflict'
    ],
    validation: [
      '422',
      'Validation failed',
      'Invalid data',
      'Constraint violation'
    ]
  };

  static categorizeError(error: any): ErrorInfo {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorString = errorMessage.toLowerCase();

    // Check for specific error patterns
    for (const [type, patterns] of Object.entries(this.ERROR_PATTERNS)) {
      for (const pattern of patterns) {
        if (errorString.includes(pattern.toLowerCase())) {
          return this.createErrorInfo(type as ErrorInfo['type'], errorMessage);
        }
      }
    }

    // Default to unknown error
    return this.createErrorInfo('unknown', errorMessage);
  }

  private static createErrorInfo(type: ErrorInfo['type'], technicalMessage: string): ErrorInfo {
    const errorMap: Record<ErrorInfo['type'], {
      severity: ErrorInfo['severity'];
      retryable: boolean;
      userMessage: string;
      recommendations: string[];
    }> = {
      network: {
        severity: 'medium',
        retryable: true,
        userMessage: 'Network connection issue detected. Your data is safe and will sync when connection is restored.',
        recommendations: [
          'Check your internet connection',
          'Try moving to an area with better signal',
          'Data will automatically sync when connection is restored'
        ]
      },
      timeout: {
        severity: 'medium',
        retryable: true,
        userMessage: 'Request timed out. The system will retry automatically.',
        recommendations: [
          'Check your internet connection speed',
          'Try again in a few moments',
          'The system will retry automatically'
        ]
      },
      server: {
        severity: 'high',
        retryable: true,
        userMessage: 'Server is experiencing issues. Your data is safe and will sync when the server is available.',
        recommendations: [
          'This is a temporary server issue',
          'Your data is safely stored locally',
          'The system will retry automatically when the server is available'
        ]
      },
      client: {
        severity: 'high',
        retryable: false,
        userMessage: 'Unable to process your request. Please check your data and try again.',
        recommendations: [
          'Verify the data you entered is correct',
          'Check if you have permission to perform this action',
          'Contact support if the issue persists'
        ]
      },
      conflict: {
        severity: 'medium',
        retryable: false,
        userMessage: 'Data conflict detected. The system will resolve this automatically.',
        recommendations: [
          'The system is resolving the data conflict',
          'Your latest changes will be preserved',
          'No action required from you'
        ]
      },
      validation: {
        severity: 'medium',
        retryable: false,
        userMessage: 'Data validation failed. Please check your input and try again.',
        recommendations: [
          'Review the data you entered',
          'Ensure all required fields are filled',
          'Check for any formatting issues'
        ]
      },
      permission: {
        severity: 'high',
        retryable: false,
        userMessage: 'You don\'t have permission to perform this action.',
        recommendations: [
          'Contact your administrator for access',
          'Verify you\'re logged in with the correct account',
          'Check if your permissions have changed'
        ]
      },
      unknown: {
        severity: 'medium',
        retryable: true,
        userMessage: 'An unexpected error occurred. The system will retry automatically.',
        recommendations: [
          'The system will retry automatically',
          'If the issue persists, contact support',
          'Your data is safely stored locally'
        ]
      }
    };

    const errorConfig = errorMap[type];

    return {
      type,
      severity: errorConfig.severity,
      retryable: errorConfig.retryable,
      userMessage: errorConfig.userMessage,
      technicalMessage,
      recommendations: errorConfig.recommendations
    };
  }

  static shouldRetry(error: any, retryCount: number): boolean {
    const errorInfo = this.categorizeError(error);
    
    if (!errorInfo.retryable) {
      return false;
    }

    // Don't retry too many times
    const maxRetries = this.getMaxRetriesForErrorType(errorInfo.type);
    return retryCount < maxRetries;
  }

  private static getMaxRetriesForErrorType(type: ErrorInfo['type']): number {
    const retryLimits: Record<ErrorInfo['type'], number> = {
      network: 5,
      timeout: 3,
      server: 3,
      client: 0, // Never retry client errors
      conflict: 0, // Never retry conflicts
      validation: 0, // Never retry validation errors
      permission: 0, // Never retry permission errors
      unknown: 2
    };

    return retryLimits[type];
  }



  private static getBaseDelayForErrorType(type: ErrorInfo['type']): number {
    const baseDelays: Record<ErrorInfo['type'], number> = {
      network: 2000,
      timeout: 1000,
      server: 3000,
      client: 0,
      conflict: 0,
      validation: 0,
      permission: 0,
      unknown: 2000
    };

    return baseDelays[type];
  }

  static getRetryDelay(retryCount: number, errorType: ErrorInfo['type']): number {
    const baseDelay = this.getBaseDelayForErrorType(errorType);
    if (baseDelay === 0) return 0;
    
    const exponentialDelay = baseDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  static formatErrorForUser(error: any): string {
    const errorInfo = this.categorizeError(error);
    return errorInfo.userMessage;
  }

  static formatErrorForLogging(error: any): string {
    const errorInfo = this.categorizeError(error);
    return `[${errorInfo.type.toUpperCase()}] ${errorInfo.technicalMessage}`;
  }
}

export default SyncErrorHandler;
