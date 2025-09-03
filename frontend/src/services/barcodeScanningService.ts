/**
 * Barcode Scanning Service
 * Handles communication with backend barcode processing API
 * Supports offline scanning with local storage and sync capabilities
 */

// API base URL - can be configured based on environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Import encryption service for secure offline storage
import { encryptionService } from './encryptionService';

// API response types
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  metadata?: any;
}

interface BarcodeProcessResult {
  success: boolean;
  barcode: string;
  components: {
    raw: string;
    company: string;
    year: number;
    facility: string;
    panelType: string;
    powerRating: string;
    sequence: number;
  };
  validation: {
    isValid: boolean;
    errors: string[];
  };
  lineAssignment: {
    lineNumber: number;
    lineName: string;
    panelType: string;
    stationRange: number[];
    isValid: boolean;
  } | null;
  processedAt: string;
  manufacturing: {
    panelTypeEnum: string | null;
    lineType: string | null;
    initialStation: number | null;
  };
}

interface PanelData {
  barcode: string;
  panelType: string;
  powerRating: string;
  status: string;
  manufacturingOrder?: string;
  lineNumber?: number;
  stationNumber?: number;
  lineName?: string;
  stationRange?: number[];
}

interface BarcodeScanningError {
  message: string;
  code: string;
  details?: any;
}

export class BarcodeScanningService {
  private baseUrl: string;
  private isOnline: boolean = navigator.onLine;

  constructor() {
    this.baseUrl = API_BASE_URL;
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Process a barcode through the backend API or offline storage
   */
  async processBarcode(barcode: string): Promise<PanelData> {
    // If offline, process locally and store for sync
    if (!this.isOnline) {
      return this.processBarcodeOffline(barcode);
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/barcode/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ barcode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new BarcodeScanningError(
          errorData.message || 'Failed to process barcode',
          errorData.code || 'PROCESSING_ERROR',
          errorData.details
        );
      }

      const apiResponse: ApiResponse<BarcodeProcessResult> = await response.json();
      
      if (!apiResponse.success || !apiResponse.data.success) {
        throw new BarcodeScanningError(
          'Barcode validation failed',
          'VALIDATION_FAILED',
          apiResponse.data.validation?.errors
        );
      }

      const result = apiResponse.data;
      
      // Transform backend response to frontend PanelData format
      const panelData: PanelData = {
        barcode: result.barcode,
        panelType: result.components.panelType,
        powerRating: result.components.powerRating,
        status: 'Ready for Inspection',
        manufacturingOrder: `MO-${result.components.year}-${result.components.sequence}`,
        lineNumber: result.lineAssignment?.lineNumber,
        stationNumber: result.lineAssignment?.stationRange?.[0],
        lineName: result.lineAssignment?.lineName,
        stationRange: result.lineAssignment?.stationRange,
      };

      return panelData;
    } catch (error) {
      if (error instanceof BarcodeScanningError) {
        throw error;
      }
      
      // Handle network errors - fallback to offline processing
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn('Network error, falling back to offline processing:', error.message);
        return this.processBarcodeOffline(barcode);
      }
      
      throw new BarcodeScanningError(
        'Unknown error occurred while processing barcode',
        'UNKNOWN_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Process barcode offline with local validation and storage
   */
  private async processBarcodeOffline(barcode: string): Promise<PanelData> {
    // Validate barcode format locally
    const validation = this.validateBarcodeFormat(barcode);
    if (!validation.isValid) {
      throw new BarcodeScanningError(
        validation.error || 'Invalid barcode format',
        'VALIDATION_FAILED',
        { barcode, offline: true }
      );
    }

    // Parse barcode components locally
    const components = this.parseBarcodeOffline(barcode);
    
    // Create panel data with offline indicator
    const panelData: PanelData = {
      barcode: components.raw,
      panelType: components.panelType,
      powerRating: components.powerRating,
      status: 'Ready for Inspection (Offline)',
      manufacturingOrder: `MO-${components.year}-${components.sequence}`,
      lineNumber: components.lineNumber,
      stationNumber: components.stationNumber,
      lineName: `LINE_${components.lineNumber}`,
      stationRange: [components.stationNumber],
    };

    // Store for sync when online
    await this.storeOfflineScan(barcode, panelData);

    return panelData;
  }

  /**
   * Parse barcode components offline
   */
  private parseBarcodeOffline(barcode: string): any {
    // CRSYYFBPP##### format parsing
    const match = barcode.match(/^CRS(\d{2})YF(\d{2})PP(\d{5})$/);
    if (!match) {
      throw new BarcodeScanningError(
        'Invalid barcode format',
        'PARSING_ERROR',
        { barcode }
      );
    }

    const [, yearStr, facilityStr, sequenceStr] = match;
    const year = parseInt(yearStr);
    const facility = parseInt(facilityStr);
    const sequence = parseInt(sequenceStr);

    // Map facility to panel type and power rating
    const facilityConfigs: Record<number, { panelType: string; powerRating: string }> = {
      1: { panelType: 'BP', powerRating: '550' },
      2: { panelType: 'BP', powerRating: '600' },
      3: { panelType: 'BP', powerRating: '650' },
      4: { panelType: 'BP', powerRating: '700' },
    };

    const config = facilityConfigs[facility] || { panelType: 'BP', powerRating: '550' };

    return {
      raw: barcode,
      company: 'CRS',
      year: 2000 + year,
      facility: facility,
      panelType: config.panelType,
      powerRating: config.powerRating,
      sequence: sequence,
      lineNumber: facility,
      stationNumber: facility,
    };
  }

  /**
   * Store offline scan for later sync with encryption
   */
  private async storeOfflineScan(barcode: string, panelData: PanelData): Promise<void> {
    try {
      const offlineScan = {
        barcode,
        panelData,
        scannedAt: new Date().toISOString(),
        synced: false,
      };

      // Encrypt the offline scan data
      const encryptedData = await encryptionService.encrypt(offlineScan);

      // Store encrypted data in IndexedDB
      const db = await this.getOfflineDatabase();
      await db.offlineScans.add({
        id: Date.now() + Math.random(), // Unique ID for storage
        encryptedData,
        storedAt: new Date().toISOString(),
      });
      
      console.log('Offline scan stored securely for sync:', barcode);
    } catch (error) {
      console.error('Failed to store offline scan:', error);
      // Don't throw error - offline scan should still work even if storage fails
    }
  }

  /**
   * Get offline database instance with encryption support
   */
  private async getOfflineDatabase(): Promise<any> {
    // This would integrate with the existing Dexie database
    // For now, we'll use localStorage as a fallback with encryption
    return {
      offlineScans: {
        add: async (scan: any) => {
          const scans = JSON.parse(localStorage.getItem('encryptedOfflineScans') || '[]');
          scans.push(scan);
          localStorage.setItem('encryptedOfflineScans', JSON.stringify(scans));
        },
        getAll: async () => {
          return JSON.parse(localStorage.getItem('encryptedOfflineScans') || '[]');
        }
      }
    };
  }

  /**
   * Sync offline scans when back online
   */
  async syncOfflineScans(): Promise<{ synced: number; failed: number }> {
    if (!this.isOnline) {
      throw new BarcodeScanningError(
        'Cannot sync while offline',
        'OFFLINE_ERROR'
      );
    }

    try {
      const db = await this.getOfflineDatabase();
      const encryptedScans = await db.offlineScans.getAll();
      
      let synced = 0;
      let failed = 0;
      const updatedScans: any[] = [];

      for (const encryptedScan of encryptedScans) {
        try {
          // Decrypt the scan data
          const scan = await encryptionService.decrypt(encryptedScan.encryptedData);
          
          // Process the barcode through the backend
          await this.processBarcode(scan.barcode);
          
          // Mark as synced and re-encrypt
          scan.synced = true;
          const updatedEncryptedData = await encryptionService.encrypt(scan);
          
          updatedScans.push({
            ...encryptedScan,
            encryptedData: updatedEncryptedData,
          });
          
          synced++;
        } catch (error) {
          console.error('Failed to sync offline scan:', error);
          // Keep the original scan if sync failed
          updatedScans.push(encryptedScan);
          failed++;
        }
      }

      // Update localStorage with encrypted data
      localStorage.setItem('encryptedOfflineScans', JSON.stringify(updatedScans));

      return { synced, failed };
    } catch (error) {
      throw new BarcodeScanningError(
        'Failed to sync offline scans',
        'SYNC_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Parse barcode components without full validation
   */
  async parseBarcode(barcode: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/barcode/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ barcode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new BarcodeScanningError(
          errorData.message || 'Failed to parse barcode',
          errorData.code || 'PARSING_ERROR',
          errorData.details
        );
      }

      const apiResponse: ApiResponse<any> = await response.json();
      return apiResponse.data;
    } catch (error) {
      if (error instanceof BarcodeScanningError) {
        throw error;
      }
      
      throw new BarcodeScanningError(
        'Unknown error occurred while parsing barcode',
        'UNKNOWN_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Validate barcode format (client-side validation)
   */
  validateBarcodeFormat(barcode: string): { isValid: boolean; error?: string } {
    // CRSYYFBPP##### format validation
    const barcodePattern = /^CRS\d{2}YF\d{2}PP\d{5}$/;
    
    if (!barcodePattern.test(barcode)) {
      return {
        isValid: false,
        error: 'Invalid barcode format. Expected: CRSYYFBPP#####'
      };
    }

    return { isValid: true };
  }

  /**
   * Get barcode format information
   */
  async getBarcodeFormatInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/barcode/format-info`);
      
      if (!response.ok) {
        throw new BarcodeScanningError(
          'Failed to get barcode format information',
          'FORMAT_INFO_ERROR'
        );
      }

      const apiResponse: ApiResponse<any> = await response.json();
      return apiResponse.data;
    } catch (error) {
      if (error instanceof BarcodeScanningError) {
        throw error;
      }
      
      throw new BarcodeScanningError(
        'Unknown error occurred while getting format info',
        'UNKNOWN_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Generate a test barcode for development/testing
   */
  async generateTestBarcode(panelType: string = 'BP', powerRating: string = '550'): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/barcode/generate-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ panelType, powerRating }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new BarcodeScanningError(
          errorData.message || 'Failed to generate test barcode',
          errorData.code || 'GENERATION_ERROR',
          errorData.details
        );
      }

      const apiResponse: ApiResponse<{ barcode: string }> = await response.json();
      return apiResponse.data.barcode;
    } catch (error) {
      if (error instanceof BarcodeScanningError) {
        throw error;
      }
      
      throw new BarcodeScanningError(
        'Unknown error occurred while generating test barcode',
        'UNKNOWN_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Get offline scan status
   */
  async getOfflineScanStatus(): Promise<{ total: number; synced: number; pending: number }> {
    try {
      const encryptedScans = JSON.parse(localStorage.getItem('encryptedOfflineScans') || '[]');
      let synced = 0;
      let pending = 0;
      
      // Decrypt and check status of each scan
      for (const encryptedScan of encryptedScans) {
        try {
          const scan = await encryptionService.decrypt(encryptedScan.encryptedData);
          if (scan.synced) {
            synced++;
          } else {
            pending++;
          }
        } catch (error) {
          console.error('Failed to decrypt scan for status check:', error);
          // Count as pending if decryption fails
          pending++;
        }
      }
      
      return {
        total: encryptedScans.length,
        synced,
        pending
      };
    } catch (error) {
      return { total: 0, synced: 0, pending: 0 };
    }
  }

  /**
   * Check if currently online
   */
  isCurrentlyOnline(): boolean {
    return this.isOnline;
  }
}

// Create and export a singleton instance
const barcodeScanningService = new BarcodeScanningService();
export default barcodeScanningService;

// Export types for use in components
export type { PanelData, BarcodeScanningError, BarcodeProcessResult };
