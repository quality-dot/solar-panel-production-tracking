// Error Handling System Tests
// Comprehensive testing for circuit breakers, retry mechanisms, and recovery

import { jest } from '@jest/globals';
import {
  ManufacturingError,
  CircuitBreaker,
  RetryMechanism,
  ErrorRecoverySystem,
  ErrorAggregator
} from '../errorHandling.js';

describe('ManufacturingError', () => {
  test('should create error with all properties', () => {
    const error = new ManufacturingError(
      'Test error message',
      'TEST_ERROR',
      { context: 'test' },
      'ERROR',
      true
    );

    expect(error.message).toBe('Test error message');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.context).toEqual({ context: 'test' });
    expect(error.severity).toBe('ERROR');
    expect(error.recoverable).toBe(true);
    expect(error.errorId).toBeDefined();
    expect(error.timestamp).toBeDefined();
  });

  test('should serialize to JSON correctly', () => {
    const error = new ManufacturingError('Test', 'TEST', {}, 'WARN', false);
    const json = error.toJSON();

    expect(json.errorId).toBeDefined();
    expect(json.name).toBe('ManufacturingError');
    expect(json.code).toBe('TEST');
    expect(json.message).toBe('Test');
    expect(json.severity).toBe('WARN');
    expect(json.recoverable).toBe(false);
  });
});

describe('CircuitBreaker', () => {
  let circuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      name: 'test-service',
      failureThreshold: 3,
      recoveryTimeout: 1000
    });
  });

  test('should start in CLOSED state', () => {
    expect(circuitBreaker.state).toBe('CLOSED');
    expect(circuitBreaker.failureCount).toBe(0);
  });

  test('should execute operation successfully when CLOSED', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    
    const result = await circuitBreaker.execute(operation);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
    expect(circuitBreaker.state).toBe('CLOSED');
    expect(circuitBreaker.failureCount).toBe(0);
  });

  test('should track failures and open circuit when threshold exceeded', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('Test failure'));

    // First two failures should keep circuit CLOSED
    for (let i = 0; i < 2; i++) {
      try {
        await circuitBreaker.execute(operation);
      } catch (error) {
        // Expected to fail
      }
    }
    
    expect(circuitBreaker.state).toBe('CLOSED');
    expect(circuitBreaker.failureCount).toBe(2);

    // Third failure should OPEN the circuit
    try {
      await circuitBreaker.execute(operation);
    } catch (error) {
      // Expected to fail
    }
    
    expect(circuitBreaker.state).toBe('OPEN');
    expect(circuitBreaker.failureCount).toBe(3);
  });

  test('should reject requests immediately when OPEN', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    
    // Force circuit to OPEN state
    circuitBreaker.state = 'OPEN';
    circuitBreaker.failureCount = 5;
    circuitBreaker.lastFailureTime = Date.now();

    try {
      await circuitBreaker.execute(operation);
      fail('Should have thrown error');
    } catch (error) {
      expect(error).toBeInstanceOf(ManufacturingError);
      expect(error.code).toBe('CIRCUIT_BREAKER_OPEN');
    }

    expect(operation).not.toHaveBeenCalled();
  });

  test('should execute fallback when circuit is OPEN', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    const fallback = jest.fn().mockResolvedValue('fallback result');
    
    // Force circuit to OPEN state
    circuitBreaker.state = 'OPEN';
    circuitBreaker.failureCount = 5;
    circuitBreaker.lastFailureTime = Date.now();

    const result = await circuitBreaker.execute(operation, fallback);
    
    expect(result).toBe('fallback result');
    expect(operation).not.toHaveBeenCalled();
    expect(fallback).toHaveBeenCalledWith(expect.any(ManufacturingError));
  });

  test('should transition to HALF_OPEN after recovery timeout', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    
    // Force circuit to OPEN state with old failure time
    circuitBreaker.state = 'OPEN';
    circuitBreaker.failureCount = 5;
    circuitBreaker.lastFailureTime = Date.now() - 2000; // 2 seconds ago
    circuitBreaker.recoveryTimeout = 1000; // 1 second timeout

    const result = await circuitBreaker.execute(operation);
    
    expect(result).toBe('success');
    expect(circuitBreaker.state).toBe('CLOSED'); // Should close after successful execution
    expect(circuitBreaker.failureCount).toBe(0);
  });

  test('should provide accurate statistics', () => {
    circuitBreaker.stats.totalCalls = 10;
    circuitBreaker.stats.totalFailures = 3;
    circuitBreaker.stats.totalSuccesses = 7;
    
    const stats = circuitBreaker.getStats();
    
    expect(stats.name).toBe('test-service');
    expect(stats.state).toBe('CLOSED');
    expect(stats.stats.failureRate).toBe('30.00%');
  });

  test('should reset circuit breaker state', () => {
    circuitBreaker.state = 'OPEN';
    circuitBreaker.failureCount = 5;
    circuitBreaker.lastFailureTime = Date.now();
    
    circuitBreaker.reset();
    
    expect(circuitBreaker.state).toBe('CLOSED');
    expect(circuitBreaker.failureCount).toBe(0);
    expect(circuitBreaker.lastFailureTime).toBeNull();
  });
});

describe('RetryMechanism', () => {
  let retryMechanism;

  beforeEach(() => {
    retryMechanism = new RetryMechanism({
      maxAttempts: 3,
      baseDelay: 100,
      backoffMultiplier: 2,
      jitter: false // Disable jitter for predictable tests
    });
  });

  test('should succeed on first attempt', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    
    const result = await retryMechanism.execute(operation);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
    expect(operation).toHaveBeenCalledWith(1);
  });

  test('should retry on retryable errors', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockRejectedValueOnce(new Error('ETIMEDOUT'))
      .mockResolvedValue('success');

    const result = await retryMechanism.execute(operation);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  test('should not retry on non-retryable errors', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('INVALID_INPUT'));

    try {
      await retryMechanism.execute(operation);
      fail('Should have thrown error');
    } catch (error) {
      expect(error.message).toContain('INVALID_INPUT');
    }

    expect(operation).toHaveBeenCalledTimes(1);
  });

  test('should exhaust all retries and throw enhanced error', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('ECONNRESET'));

    try {
      await retryMechanism.execute(operation);
      fail('Should have thrown error');
    } catch (error) {
      expect(error).toBeInstanceOf(ManufacturingError);
      expect(error.code).toBe('RETRY_EXHAUSTED');
      expect(error.context.attemptHistory).toHaveLength(3);
    }

    expect(operation).toHaveBeenCalledTimes(3);
  });

  test('should calculate exponential backoff delays', () => {
    const delay1 = retryMechanism.calculateDelay(1);
    const delay2 = retryMechanism.calculateDelay(2);
    const delay3 = retryMechanism.calculateDelay(3);

    expect(delay1).toBe(100);  // baseDelay * 2^0
    expect(delay2).toBe(200);  // baseDelay * 2^1
    expect(delay3).toBe(400);  // baseDelay * 2^2
  });

  test('should respect maximum delay limit', () => {
    retryMechanism.maxDelay = 300;
    
    const delay = retryMechanism.calculateDelay(5); // Would be 1600 without limit
    
    expect(delay).toBe(300);
  });
});

describe('ErrorRecoverySystem', () => {
  let errorRecoverySystem;

  beforeEach(() => {
    errorRecoverySystem = new ErrorRecoverySystem();
  });

  test('should execute operation with circuit breaker protection', async () => {
    const operation = jest.fn().mockResolvedValue('success');

    const result = await errorRecoverySystem.executeWithRecovery(operation, {
      serviceName: 'database',
      circuitBreakerEnabled: true,
      retryEnabled: false
    });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  test('should execute operation with retry mechanism', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValue('success');

    const result = await errorRecoverySystem.executeWithRecovery(operation, {
      serviceName: 'database',
      circuitBreakerEnabled: false,
      retryEnabled: true
    });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  test('should execute fallback strategy on failure', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('Service unavailable'));
    const fallbackFn = jest.fn().mockResolvedValue('fallback result');

    errorRecoverySystem.registerFallbackStrategy('testFallback', fallbackFn);

    const result = await errorRecoverySystem.executeWithRecovery(operation, {
      serviceName: 'unknown', // No circuit breaker
      fallbackStrategy: 'testFallback',
      retryEnabled: false
    });

    expect(result).toBe('fallback result');
    expect(fallbackFn).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object)
    );
  });

  test('should get circuit breaker statistics', () => {
    const stats = errorRecoverySystem.getCircuitBreakerStats();

    expect(stats).toHaveProperty('database');
    expect(stats).toHaveProperty('barcodeProcessing');
    expect(stats).toHaveProperty('cache');
    
    expect(stats.database.name).toBe('database');
    expect(stats.database.state).toBe('CLOSED');
  });

  test('should reset circuit breakers', () => {
    // Force a circuit breaker to OPEN state
    const circuitBreaker = errorRecoverySystem.circuitBreakers.get('database');
    circuitBreaker.state = 'OPEN';
    circuitBreaker.failureCount = 5;

    errorRecoverySystem.resetCircuitBreaker('database');

    expect(circuitBreaker.state).toBe('CLOSED');
    expect(circuitBreaker.failureCount).toBe(0);
  });
});

describe('ErrorAggregator', () => {
  let errorAggregator;

  beforeEach(() => {
    errorAggregator = new ErrorAggregator();
  });

  test('should record errors with metadata', () => {
    const error = new ManufacturingError('Test error', 'TEST_CODE');
    
    errorAggregator.recordError(error, 'testService', { context: 'test' });
    
    const stats = errorAggregator.getStats();
    expect(stats.totalErrors).toBe(1);
    expect(stats.errorsByService.testService.total).toBe(1);
  });

  test('should track error counts by code', () => {
    const error1 = new ManufacturingError('Error 1', 'CODE_A');
    const error2 = new ManufacturingError('Error 2', 'CODE_A');
    const error3 = new ManufacturingError('Error 3', 'CODE_B');
    
    errorAggregator.recordError(error1, 'service1');
    errorAggregator.recordError(error2, 'service1');
    errorAggregator.recordError(error3, 'service2');
    
    const stats = errorAggregator.getStats();
    expect(stats.topErrors).toContainEqual({ code: 'CODE_A', count: 2 });
    expect(stats.topErrors).toContainEqual({ code: 'CODE_B', count: 1 });
  });

  test('should return recent errors with limit', () => {
    // Add multiple errors
    for (let i = 0; i < 10; i++) {
      const error = new ManufacturingError(`Error ${i}`, `CODE_${i}`);
      errorAggregator.recordError(error, 'testService');
    }
    
    const recentErrors = errorAggregator.getRecentErrors(5);
    
    expect(recentErrors).toHaveLength(5);
    expect(recentErrors[4].error.message).toBe('Error 9'); // Most recent
  });

  test('should clear old errors', () => {
    // Add an error
    const error = new ManufacturingError('Old error', 'OLD_CODE');
    errorAggregator.recordError(error, 'testService');
    
    // Manually set old timestamp
    errorAggregator.recentErrors[0].timestamp = new Date(Date.now() - 2000).toISOString();
    
    // Clear errors older than 1 second
    errorAggregator.clearOldErrors(1000);
    
    expect(errorAggregator.recentErrors).toHaveLength(0);
  });

  test('should maintain error history limits', () => {
    errorAggregator.maxRecentErrors = 5;
    
    // Add more errors than the limit
    for (let i = 0; i < 10; i++) {
      const error = new ManufacturingError(`Error ${i}`, `CODE_${i}`);
      errorAggregator.recordError(error, 'testService');
    }
    
    expect(errorAggregator.recentErrors).toHaveLength(5);
  });
});

describe('Integration Tests', () => {
  test('should handle complex failure and recovery scenario', async () => {
    const errorRecoverySystem = new ErrorRecoverySystem();
    let callCount = 0;
    
    const operation = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= 3) {
        throw new Error('ECONNRESET'); // Retryable error
      }
      return 'success after retries';
    });

    const result = await errorRecoverySystem.executeWithRecovery(operation, {
      serviceName: 'database',
      retryEnabled: true,
      circuitBreakerEnabled: true,
      context: { operation: 'integrationTest' }
    });

    expect(result).toBe('success after retries');
    expect(operation).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  });

  test('should trigger circuit breaker after repeated failures', async () => {
    const errorRecoverySystem = new ErrorRecoverySystem();
    const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));
    const fallback = jest.fn().mockResolvedValue('fallback result');

    // Execute enough failures to trip the circuit breaker
    for (let i = 0; i < 6; i++) {
      try {
        await errorRecoverySystem.executeWithRecovery(operation, {
          serviceName: 'database',
          retryEnabled: false,
          circuitBreakerEnabled: true
        });
      } catch (error) {
        // Expected failures
      }
    }

    // Next call should trigger circuit breaker with fallback
    const result = await errorRecoverySystem.executeWithRecovery(operation, {
      serviceName: 'database',
      fallbackStrategy: fallback,
      retryEnabled: false,
      circuitBreakerEnabled: true
    });

    expect(result).toBe('fallback result');
    
    const stats = errorRecoverySystem.getCircuitBreakerStats();
    expect(stats.database.state).toBe('OPEN');
  });
});
