// Offline Data Management Service
// Task 10.6 - Offline/Online Transition Testing

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { manufacturingLogger } from '../middleware/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OFFLINE_DIR = path.join(__dirname, '..', 'offline-storage');

class OfflineDataService {
  constructor() {
    this.logger = manufacturingLogger;
    this.offlineDir = OFFLINE_DIR;
    this.syncQueue = [];
    this.isOnline = true;
    this.syncInProgress = false;
    this.ensureOfflineDirectory();
  }

  /**
   * Ensure offline storage directory exists
   */
  async ensureOfflineDirectory() {
    try {
      await fs.mkdir(this.offlineDir, { recursive: true });
      this.logger.info('Offline storage directory ensured', { path: this.offlineDir });
    } catch (error) {
      this.logger.error('Failed to create offline storage directory', { error: error.message });
    }
  }

  /**
   * Store data offline when network is unavailable
   */
  async storeOfflineData(dataType, data, options = {}) {
    try {
      const timestamp = new Date().toISOString();
      const filename = `${dataType}-${data.id || 'unknown'}-${Date.now()}.json`;
      const filepath = path.join(this.offlineDir, filename);

      const offlineData = {
        ...data,
        offline_sync_pending: true,
        offline_stored_at: timestamp,
        data_type: dataType,
        sync_priority: options.priority || 'normal',
        retry_count: 0,
        max_retries: options.maxRetries || 3
      };

      await fs.writeFile(filepath, JSON.stringify(offlineData, null, 2));
      
      // Add to sync queue
      this.syncQueue.push({
        filepath,
        dataType,
        priority: options.priority || 'normal',
        timestamp
      });

      this.logger.info('Data stored offline', {
        dataType,
        filename,
        priority: options.priority || 'normal'
      });

      return {
        success: true,
        filename,
        offline_stored_at: timestamp
      };

    } catch (error) {
      this.logger.error('Failed to store data offline', {
        dataType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Retrieve offline data by type and ID
   */
  async getOfflineData(dataType, id = null) {
    try {
      const files = await fs.readdir(this.offlineDir);
      const offlineFiles = files.filter(file => 
        file.startsWith(dataType) && file.endsWith('.json')
      );

      const offlineData = [];
      for (const file of offlineFiles) {
        const filepath = path.join(this.offlineDir, file);
        const data = JSON.parse(await fs.readFile(filepath, 'utf8'));
        
        if (!id || data.id === id) {
          offlineData.push(data);
        }
      }

      return offlineData;

    } catch (error) {
      this.logger.error('Failed to retrieve offline data', {
        dataType,
        id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update offline data
   */
  async updateOfflineData(dataType, id, updateData) {
    try {
      const offlineData = await this.getOfflineData(dataType, id);
      
      if (offlineData.length === 0) {
        throw new Error(`No offline data found for ${dataType} with ID ${id}`);
      }

      const updatedData = {
        ...offlineData[0],
        ...updateData,
        offline_updated_at: new Date().toISOString(),
        offline_sync_pending: true
      };

      const filename = `${dataType}-${id}-${Date.now()}.json`;
      const filepath = path.join(this.offlineDir, filename);

      await fs.writeFile(filepath, JSON.stringify(updatedData, null, 2));

      this.logger.info('Offline data updated', {
        dataType,
        id,
        filename
      });

      return {
        success: true,
        filename,
        updated_at: updatedData.offline_updated_at
      };

    } catch (error) {
      this.logger.error('Failed to update offline data', {
        dataType,
        id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Synchronize offline data when network is available
   */
  async synchronizeOfflineData() {
    if (this.syncInProgress || !this.isOnline) {
      return { success: false, message: 'Sync already in progress or offline' };
    }

    this.syncInProgress = true;
    const syncResults = {
      successful: 0,
      failed: 0,
      errors: []
    };

    try {
      // Sort sync queue by priority
      this.syncQueue.sort((a, b) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      for (const syncItem of this.syncQueue) {
        try {
          const data = JSON.parse(await fs.readFile(syncItem.filepath, 'utf8'));
          
          // Simulate sync to server
          const syncResult = await this.syncToServer(data);
          
          if (syncResult.success) {
            // Mark as synced and remove from queue
            data.offline_sync_pending = false;
            data.synced_at = new Date().toISOString();
            data.sync_status = 'SUCCESS';
            
            await fs.writeFile(syncItem.filepath, JSON.stringify(data, null, 2));
            syncResults.successful++;
            
            this.logger.info('Data synchronized successfully', {
              dataType: data.data_type,
              id: data.id
            });
          } else {
            syncResults.failed++;
            syncResults.errors.push({
              file: syncItem.filepath,
              error: syncResult.error
            });
          }

        } catch (error) {
          syncResults.failed++;
          syncResults.errors.push({
            file: syncItem.filepath,
            error: error.message
          });
        }
      }

      // Clean up successfully synced files
      await this.cleanupSyncedFiles();

      this.logger.info('Offline data synchronization completed', syncResults);

      return {
        success: true,
        results: syncResults
      };

    } catch (error) {
      this.logger.error('Failed to synchronize offline data', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Simulate sync to server (replace with actual API calls)
   */
  async syncToServer(data) {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Simulate occasional failures
      if (Math.random() < 0.1) {
        throw new Error('Simulated network error');
      }

      return { success: true, server_id: `server-${data.id}` };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up successfully synced files
   */
  async cleanupSyncedFiles() {
    try {
      const files = await fs.readdir(this.offlineDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filepath = path.join(this.offlineDir, file);
          const data = JSON.parse(await fs.readFile(filepath, 'utf8'));
          
          if (!data.offline_sync_pending && data.sync_status === 'SUCCESS') {
            await fs.unlink(filepath);
            this.logger.info('Synced file cleaned up', { file });
          }
        }
      }

    } catch (error) {
      this.logger.error('Failed to cleanup synced files', { error: error.message });
    }
  }

  /**
   * Set network status
   */
  setNetworkStatus(isOnline) {
    this.isOnline = isOnline;
    this.logger.info('Network status changed', { isOnline });
    
    if (isOnline && this.syncQueue.length > 0) {
      // Trigger sync when coming back online
      setTimeout(() => this.synchronizeOfflineData(), 1000);
    }
  }

  /**
   * Get sync queue status
   */
  getSyncQueueStatus() {
    return {
      queue_length: this.syncQueue.length,
      sync_in_progress: this.syncInProgress,
      is_online: this.isOnline,
      pending_by_priority: this.syncQueue.reduce((acc, item) => {
        acc[item.priority] = (acc[item.priority] || 0) + 1;
        return acc;
      }, {})
    };
  }

  /**
   * Validate offline data integrity
   */
  async validateOfflineDataIntegrity() {
    try {
      const files = await fs.readdir(this.offlineDir);
      const validationResults = {
        total_files: files.length,
        valid_files: 0,
        corrupted_files: 0,
        missing_required_fields: 0,
        errors: []
      };

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filepath = path.join(this.offlineDir, file);
            const data = JSON.parse(await fs.readFile(filepath, 'utf8'));
            
            // Basic validation
            if (data && typeof data === 'object') {
              validationResults.valid_files++;
              
              // Check required fields
              const requiredFields = ['id', 'data_type', 'offline_stored_at'];
              const missingFields = requiredFields.filter(field => !data[field]);
              
              if (missingFields.length > 0) {
                validationResults.missing_required_fields++;
                validationResults.errors.push({
                  file,
                  error: `Missing required fields: ${missingFields.join(', ')}`
                });
              }
            } else {
              validationResults.corrupted_files++;
              validationResults.errors.push({
                file,
                error: 'Invalid JSON structure'
              });
            }
          } catch (error) {
            validationResults.corrupted_files++;
            validationResults.errors.push({
              file,
              error: error.message
            });
          }
        }
      }

      this.logger.info('Offline data integrity validation completed', validationResults);
      return validationResults;

    } catch (error) {
      this.logger.error('Failed to validate offline data integrity', { error: error.message });
      throw error;
    }
  }

  /**
   * Get offline storage statistics
   */
  async getOfflineStorageStatistics() {
    try {
      const files = await fs.readdir(this.offlineDir);
      const stats = {
        total_files: files.length,
        total_size: 0,
        files_by_type: {},
        oldest_file: null,
        newest_file: null
      };

      let oldestTime = Infinity;
      let newestTime = 0;

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filepath = path.join(this.offlineDir, file);
          const fileStats = await fs.stat(filepath);
          
          stats.total_size += fileStats.size;
          
          // Parse data type from filename
          const dataType = file.split('-')[0];
          stats.files_by_type[dataType] = (stats.files_by_type[dataType] || 0) + 1;
          
          // Track oldest and newest files
          if (fileStats.mtime.getTime() < oldestTime) {
            oldestTime = fileStats.mtime.getTime();
            stats.oldest_file = file;
          }
          
          if (fileStats.mtime.getTime() > newestTime) {
            newestTime = fileStats.mtime.getTime();
            stats.newest_file = file;
          }
        }
      }

      stats.total_size_mb = (stats.total_size / 1024 / 1024).toFixed(2);
      
      return stats;

    } catch (error) {
      this.logger.error('Failed to get offline storage statistics', { error: error.message });
      throw error;
    }
  }

  /**
   * Clear all offline data (use with caution)
   */
  async clearAllOfflineData() {
    try {
      const files = await fs.readdir(this.offlineDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(this.offlineDir, file));
        }
      }

      this.syncQueue = [];
      
      this.logger.info('All offline data cleared', { files_cleared: files.length });
      
      return {
        success: true,
        files_cleared: files.length
      };

    } catch (error) {
      this.logger.error('Failed to clear offline data', { error: error.message });
      throw error;
    }
  }
}

export default new OfflineDataService();
