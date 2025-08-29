// Encryption utilities for manufacturing data security
// Field-level encryption using pgcrypto and application-level encryption

import crypto from 'crypto';
import { config } from '../config/index.js';
import { manufacturingLogger } from '../middleware/logger.js';
import { ValidationError } from '../middleware/errorHandler.js';

/**
 * Encryption configuration for manufacturing environment
 */
export const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32, // 256 bits
  ivLength: 16,  // 128 bits
  tagLength: 16, // 128 bits
  keyRotationDays: 90,
  saltRounds: 12
};

/**
 * Key management for encryption operations
 */
class EncryptionKeyManager {
  constructor() {
    this.currentKey = null;
    this.keyVersion = 1;
    this.lastRotation = new Date();
    this.initializeKeys();
  }

  /**
   * Initialize encryption keys from environment or generate new ones
   */
  initializeKeys() {
    try {
      // Try to get key from environment first
      const envKey = process.env.ENCRYPTION_KEY;
      if (envKey && envKey.length >= ENCRYPTION_CONFIG.keyLength) {
        this.currentKey = Buffer.from(envKey, 'hex');
        manufacturingLogger.info('Encryption key loaded from environment', {
          keyVersion: this.keyVersion,
          keyLength: this.currentKey.length,
          category: 'encryption'
        });
      } else {
        // Generate new key if none exists
        this.generateNewKey();
      }
    } catch (error) {
      manufacturingLogger.error('Failed to initialize encryption keys', {
        error: error.message,
        category: 'encryption'
      });
      throw new Error('Encryption key initialization failed');
    }
  }

  /**
   * Generate new encryption key
   */
  generateNewKey() {
    try {
      this.currentKey = crypto.randomBytes(ENCRYPTION_CONFIG.keyLength);
      this.keyVersion++;
      this.lastRotation = new Date();
      
      manufacturingLogger.info('New encryption key generated', {
        keyVersion: this.keyVersion,
        keyLength: this.currentKey.length,
        category: 'encryption'
      });

      // Store key hash for verification (not the actual key)
      const keyHash = crypto.createHash('sha256').update(this.currentKey).digest('hex');
      manufacturingLogger.info('Encryption key hash stored', {
        keyVersion: this.keyVersion,
        keyHash: keyHash.substring(0, 16) + '...',
        category: 'encryption'
      });
    } catch (error) {
      manufacturingLogger.error('Failed to generate encryption key', {
        error: error.message,
        category: 'encryption'
      });
      throw new Error('Encryption key generation failed');
    }
  }

  /**
   * Get current encryption key
   */
  getCurrentKey() {
    if (!this.currentKey) {
      throw new Error('No encryption key available');
    }
    return this.currentKey;
  }

  /**
   * Check if key rotation is needed
   */
  shouldRotateKey() {
    const daysSinceRotation = (Date.now() - this.lastRotation.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceRotation >= ENCRYPTION_CONFIG.keyRotationDays;
  }

  /**
   * Rotate encryption key if needed
   */
  rotateKeyIfNeeded() {
    if (this.shouldRotateKey()) {
      manufacturingLogger.info('Initiating encryption key rotation', {
        currentVersion: this.keyVersion,
        daysSinceRotation: Math.floor((Date.now() - this.lastRotation.getTime()) / (1000 * 60 * 60 * 24)),
        category: 'encryption'
      });
      
      // For now, just generate new key
      // In production, this would involve re-encrypting existing data
      this.generateNewKey();
      return true;
    }
    return false;
  }

  /**
   * Force rotation of encryption key (for testing)
   */
  rotateKey() {
    const oldVersion = this.keyVersion;
    const oldKey = this.currentKey;
    
    manufacturingLogger.info('Forcing encryption key rotation', {
      oldVersion,
      oldKeyLength: oldKey ? oldKey.length : 0,
      category: 'encryption'
    });
    
    // Generate new key
    this.generateNewKey();
    
    const newVersion = this.keyVersion;
    const newKey = this.currentKey;
    
    manufacturingLogger.info('Encryption key rotation completed', {
      oldVersion,
      newVersion,
      newKeyLength: newKey ? newKey.length : 0,
      category: 'encryption'
    });
    
    return {
      success: true,
      oldVersion,
      newVersion,
      oldKeyLength: oldKey ? oldKey.length : 0,
      newKeyLength: newKey ? newKey.length : 0,
      timestamp: this.lastRotation.toISOString()
    };
  }
}

// Create singleton instance
export const keyManager = new EncryptionKeyManager();

/**
 * Encrypt sensitive data using AES-256-GCM
 */
export const encryptField = (plaintext) => {
  try {
    if (!plaintext || typeof plaintext !== 'string') {
      throw new ValidationError('Plaintext must be a non-empty string', {
        field: 'plaintext',
        reason: 'invalid_input'
      });
    }

    // Ensure we have a valid key
    const key = keyManager.getCurrentKey();
    
    // Generate random IV
    const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
    
    // Create cipher with IV
    const cipher = crypto.createCipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);
    cipher.setAAD(Buffer.from('manufacturing-data', 'utf8'));
    
    // Encrypt data
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag
    const tag = cipher.getAuthTag();
    
    // Combine IV, encrypted data, and tag
    const result = {
      encrypted: encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      keyVersion: keyManager.keyVersion,
      algorithm: ENCRYPTION_CONFIG.algorithm,
      timestamp: new Date().toISOString()
    };

    manufacturingLogger.debug('Field encrypted successfully', {
      keyVersion: keyManager.keyVersion,
      algorithm: ENCRYPTION_CONFIG.algorithm,
      category: 'encryption'
    });

    return result;
  } catch (error) {
    manufacturingLogger.error('Field encryption failed', {
      error: error.message,
      category: 'encryption'
    });
    throw new ValidationError('Field encryption failed', {
      reason: 'encryption_error',
      details: error.message
    });
  }
};

/**
 * Decrypt encrypted data
 */
export const decryptField = (encryptedData) => {
  try {
    if (!encryptedData || typeof encryptedData !== 'object') {
      throw new ValidationError('Encrypted data must be a valid object', {
        field: 'encryptedData',
        reason: 'invalid_input'
      });
    }

    const { encrypted, iv, tag, keyVersion, algorithm } = encryptedData;
    
    if (!encrypted || !iv || !tag) {
      throw new ValidationError('Missing required encryption components', {
        field: 'encryptedData',
        reason: 'missing_components'
      });
    }

    // Get current key (in production, you'd need to handle key versioning)
    const key = keyManager.getCurrentKey();
    
    // Create decipher with IV
    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));
    decipher.setAAD(Buffer.from('manufacturing-data', 'utf8'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    
    // Decrypt data
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    manufacturingLogger.debug('Field decrypted successfully', {
      keyVersion,
      algorithm,
      category: 'encryption'
    });

    return decrypted;
  } catch (error) {
    manufacturingLogger.error('Field decryption failed', {
      error: error.message,
      category: 'encryption'
    });
    throw new ValidationError('Field decryption failed', {
      reason: 'decryption_error',
      details: error.message
    });
  }
};

/**
 * Hash sensitive data for comparison (one-way)
 */
export const hashField = (data, salt = null) => {
  try {
    if (!data || typeof data !== 'string') {
      throw new ValidationError('Data must be a non-empty string', {
        field: 'data',
        reason: 'invalid_input'
      });
    }

    const useSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, useSalt, 10000, 64, 'sha512');
    
    return {
      hash: hash.toString('hex'),
      salt: useSalt
    };
  } catch (error) {
    manufacturingLogger.error('Field hashing failed', {
      error: error.message,
      category: 'encryption'
    });
    throw new ValidationError('Field hashing failed', {
      reason: 'hashing_error',
      details: error.message
    });
  }
};

/**
 * Verify hashed field
 */
export const verifyHashedField = (data, hash, salt) => {
  try {
    if (!data || !hash || !salt) {
      throw new ValidationError('Data, hash, and salt are required', {
        reason: 'missing_parameters'
      });
    }

    // Generate hash with the provided salt for comparison
    const computedHash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512').toString('hex');
    return computedHash === hash;
  } catch (error) {
    manufacturingLogger.error('Field hash verification failed', {
      error: error.message,
      category: 'encryption'
    });
    throw new ValidationError('Hash verification failed', {
      reason: 'verification_error',
      details: error.message
    });
  }
};

/**
 * Generate secure random values
 */
export const generateSecureRandom = (length = 32) => {
  try {
    return crypto.randomBytes(length).toString('hex');
  } catch (error) {
    manufacturingLogger.error('Secure random generation failed', {
      error: error.message,
      category: 'encryption'
    });
    throw new Error('Secure random generation failed');
  }
};

/**
 * Check encryption health and key status
 */
export const getEncryptionStatus = () => {
  try {
    const key = keyManager.getCurrentKey();
    const daysSinceRotation = (Date.now() - keyManager.lastRotation.getTime()) / (1000 * 60 * 60 * 24);
    
    return {
      status: 'healthy',
      keyVersion: keyManager.keyVersion,
      keyLength: key.length * 8, // Convert bytes to bits
      algorithm: ENCRYPTION_CONFIG.algorithm,
      lastRotation: keyManager.lastRotation.toISOString(),
      daysSinceRotation: Math.floor(daysSinceRotation),
      nextRotationDays: Math.max(0, ENCRYPTION_CONFIG.keyRotationDays - Math.floor(daysSinceRotation)),
      keyRotationNeeded: keyManager.shouldRotateKey()
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      category: 'encryption'
    };
  }
};

/**
 * Export all encryption functions
 */
export default {
  encryptField,
  decryptField,
  hashField,
  verifyHashedField,
  generateSecureRandom,
  getEncryptionStatus,
  keyManager,
  ENCRYPTION_CONFIG
};
