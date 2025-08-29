/**
 * Basic Encryption Service
 * Task: 22.2 - Basic Data Encryption (PRD Scope: "Local data encryption")
 * Description: Simple encryption for local data storage as required by PRD
 * Date: 2025-01-27
 */

import crypto from 'crypto';
import loggerService from './loggerService.js';

class BasicEncryptionService {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.keyLength = 32;
    this.ivLength = 16;
    
    // Get encryption key from environment (required for local data encryption)
    this.encryptionKey = process.env.ENCRYPTION_MASTER_KEY;
    
    if (!this.encryptionKey) {
      throw new Error('ENCRYPTION_MASTER_KEY environment variable is required for local data encryption');
    }
    
    // Derive a stable key from the master key
    this.key = crypto.scryptSync(this.encryptionKey, 'local-data-salt', this.keyLength);
  }

  /**
   * Encrypt data for local storage
   */
  encrypt(data) {
    try {
      if (!data) return data;
      
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Return IV + encrypted data
      return iv.toString('hex') + ':' + encrypted;
      
    } catch (error) {
      loggerService.logSecurity('error', 'Encryption failed', {
        error: error.message,
        source: 'basic-encryption-service'
      });
      throw error;
    }
  }

  /**
   * Decrypt data from local storage
   */
  decrypt(encryptedData) {
    try {
      if (!encryptedData || !this.isEncrypted(encryptedData)) {
        return encryptedData;
      }
      
      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
      
    } catch (error) {
      loggerService.logSecurity('error', 'Decryption failed', {
        error: error.message,
        source: 'basic-encryption-service'
      });
      throw error;
    }
  }

  /**
   * Check if data is encrypted
   */
  isEncrypted(data) {
    return typeof data === 'string' && data.includes(':') && data.length > 32;
  }

  /**
   * Simple health check
   */
  healthCheck() {
    try {
      // Test encryption/decryption
      const testData = 'test-encryption';
      const encrypted = this.encrypt(testData);
      const decrypted = this.decrypt(encrypted);
      
      return {
        status: decrypted === testData ? 'healthy' : 'unhealthy',
        algorithm: this.algorithm,
        keyLength: this.keyLength
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

// Create singleton instance
const basicEncryptionService = new BasicEncryptionService();

export default basicEncryptionService;
export { BasicEncryptionService };
