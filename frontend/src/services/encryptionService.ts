/**
 * Encryption Service for Offline Data Storage
 * Provides AES-256 encryption for sensitive manufacturing data
 */

import { BarcodeScanningError } from './barcodeScanningService';

export class EncryptionService {
  private static instance: EncryptionService;
  private encryptionKey: CryptoKey | null = null;
  private readonly keyName = 'solar-panel-tracker-encryption-key';

  private constructor() {}

  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Initialize encryption key
   * Generates a new key or retrieves existing one from secure storage
   */
  public async initializeKey(): Promise<void> {
    try {
      // Try to get existing key from IndexedDB
      const existingKey = await this.getStoredKey();
      if (existingKey) {
        this.encryptionKey = existingKey;
        return;
      }

      // Generate new key if none exists
      this.encryptionKey = await this.generateNewKey();
      await this.storeKey(this.encryptionKey);
    } catch (error) {
      console.error('Failed to initialize encryption key:', error);
      throw new BarcodeScanningError(
        'Failed to initialize encryption',
        'ENCRYPTION_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Generate a new encryption key
   */
  private async generateNewKey(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Store encryption key securely
   */
  private async storeKey(key: CryptoKey): Promise<void> {
    try {
      const exportedKey = await window.crypto.subtle.exportKey('raw', key);
      const keyArray = new Uint8Array(exportedKey);
      
      // Store in IndexedDB for persistence
      const request = indexedDB.open('SolarPanelTracker', 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('encryption')) {
          db.createObjectStore('encryption');
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['encryption'], 'readwrite');
        const store = transaction.objectStore('encryption');
        store.put(keyArray, this.keyName);
      };
    } catch (error) {
      console.error('Failed to store encryption key:', error);
      // Fallback to sessionStorage (less secure but functional)
      const exportedKey = await window.crypto.subtle.exportKey('raw', key);
      const keyArray = new Uint8Array(exportedKey);
      sessionStorage.setItem(this.keyName, JSON.stringify(Array.from(keyArray)));
    }
  }

  /**
   * Retrieve stored encryption key
   */
  private async getStoredKey(): Promise<CryptoKey | null> {
    try {
      // Try IndexedDB first
      const request = indexedDB.open('SolarPanelTracker', 1);
      
      return new Promise((resolve) => {
        request.onsuccess = async (event) => {
          try {
            const db = (event.target as IDBOpenDBRequest).result;
            const transaction = db.transaction(['encryption'], 'readonly');
            const store = transaction.objectStore('encryption');
            const getRequest = store.get(this.keyName);
            
            getRequest.onsuccess = async () => {
              if (getRequest.result) {
                const keyArray = new Uint8Array(getRequest.result);
                const key = await window.crypto.subtle.importKey(
                  'raw',
                  keyArray,
                  { name: 'AES-GCM' },
                  true,
                  ['encrypt', 'decrypt']
                );
                resolve(key);
              } else {
                resolve(null);
              }
            };
            
            getRequest.onerror = () => resolve(null);
          } catch (error) {
            resolve(null);
          }
        };
        
        request.onerror = () => resolve(null);
      });
    } catch (error) {
      // Fallback to sessionStorage
      try {
        const storedKey = sessionStorage.getItem(this.keyName);
        if (storedKey) {
          const keyArray = new Uint8Array(JSON.parse(storedKey));
          return await window.crypto.subtle.importKey(
            'raw',
            keyArray,
            { name: 'AES-GCM' },
            true,
            ['encrypt', 'decrypt']
          );
        }
      } catch (fallbackError) {
        console.error('Failed to retrieve encryption key from fallback storage:', fallbackError);
      }
      return null;
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  public async encrypt(data: any): Promise<string> {
    if (!this.encryptionKey) {
      await this.initializeKey();
    }

    if (!this.encryptionKey) {
      throw new BarcodeScanningError(
        'Encryption key not available',
        'ENCRYPTION_ERROR'
      );
    }

    try {
      const dataString = JSON.stringify(data);
      const dataBuffer = new TextEncoder().encode(dataString);
      
      // Generate random IV
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt the data
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        this.encryptionKey,
        dataBuffer
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedBuffer), iv.length);

      // Convert to base64 for storage
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new BarcodeScanningError(
        'Failed to encrypt data',
        'ENCRYPTION_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  public async decrypt(encryptedData: string): Promise<any> {
    if (!this.encryptionKey) {
      await this.initializeKey();
    }

    if (!this.encryptionKey) {
      throw new BarcodeScanningError(
        'Encryption key not available',
        'ENCRYPTION_ERROR'
      );
    }

    try {
      // Convert from base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encryptedBuffer = combined.slice(12);

      // Decrypt the data
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        this.encryptionKey,
        encryptedBuffer
      );

      // Convert back to string and parse JSON
      const decryptedString = new TextDecoder().decode(decryptedBuffer);
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new BarcodeScanningError(
        'Failed to decrypt data',
        'ENCRYPTION_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Check if encryption is supported by the browser
   */
  public static isEncryptionSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.crypto &&
      window.crypto.subtle &&
      typeof window.crypto.subtle.generateKey === 'function'
    );
  }

  /**
   * Clear stored encryption key (for security)
   */
  public async clearKey(): Promise<void> {
    try {
      // Clear from IndexedDB
      const request = indexedDB.open('SolarPanelTracker', 1);
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['encryption'], 'readwrite');
        const store = transaction.objectStore('encryption');
        store.delete(this.keyName);
      };

      // Clear from sessionStorage
      sessionStorage.removeItem(this.keyName);
      
      // Clear from memory
      this.encryptionKey = null;
    } catch (error) {
      console.error('Failed to clear encryption key:', error);
    }
  }
}

// Export singleton instance
export const encryptionService = EncryptionService.getInstance();
export default encryptionService;
