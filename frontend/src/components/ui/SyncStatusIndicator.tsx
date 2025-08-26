import React from 'react';
import { useBackgroundSync } from '../../hooks/useBackgroundSync';
import { Button } from './Button';
import { LoadingSpinner } from './LoadingSpinner';
import { StatusIndicator } from './StatusIndicator';

export interface SyncStatusIndicatorProps {
  showProgress?: boolean;
  showStats?: boolean;
  showManualControls?: boolean;
  className?: string;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  showProgress = true,
  showStats = true,
  showManualControls = true,
  className = ''
}) => {
  const {
    isSyncing,
    progress,
    syncStats,
    error,
    triggerSync,
    retryFailedItems,
    hasPendingItems,
    hasFailedItems,
    syncHealth
  } = useBackgroundSync({
    autoSyncOnOnline: true,
    syncInterval: 30000,
    enableNotifications: true
  });

  const getSyncStatusColor = () => {
    if (error) return 'error';
    if (isSyncing) return 'warning';
    if (hasFailedItems) return 'error';
    if (hasPendingItems) return 'warning';
    return 'success';
  };

  const getSyncStatusText = () => {
    if (error) return 'Sync Error';
    if (isSyncing) return 'Syncing...';
    if (hasFailedItems) return 'Sync Failed';
    if (hasPendingItems) return 'Pending Sync';
    return 'Synced';
  };

  const getSyncHealthColor = () => {
    switch (syncHealth) {
      case 'critical': return 'error';
      case 'warning': return 'warning';
      default: return 'success';
    }
  };

  const getSyncHealthText = () => {
    switch (syncHealth) {
      case 'critical': return 'Critical';
      case 'warning': return 'Warning';
      default: return 'Good';
    }
  };

  const handleManualSync = async () => {
    try {
      await triggerSync();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const handleRetryFailed = async () => {
    try {
      await retryFailedItems();
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };

  return (
    <div className={`sync-status-indicator ${className}`}>
      {/* Main Status */}
      <div className="flex items-center gap-2 mb-2">
        <StatusIndicator
          status={getSyncStatusColor()}
          size="sm"
        >
          {getSyncStatusText()}
        </StatusIndicator>

        {isSyncing && <LoadingSpinner size="sm" />}
      </div>

      {/* Error Display */}
      {error && (
        <div className="text-red-600 text-xs mb-2 p-2 bg-red-50 rounded">
          {error}
        </div>
      )}

      {/* Progress Bar */}
      {showProgress && isSyncing && progress.total > 0 && (
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{progress.processed} / {progress.total}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(progress.processed / progress.total) * 100}%`
              }}
            />
          </div>
          {progress.current && (
            <div className="text-xs text-gray-500 mt-1">
              Current: {progress.current.operation} {progress.current.table}
            </div>
          )}
        </div>
      )}

      {/* Sync Statistics */}
      {showStats && syncStats && (
        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
          <div className="flex justify-between">
            <span>Pending:</span>
            <span className="font-medium">{syncStats.pending}</span>
          </div>
          <div className="flex justify-between">
            <span>Failed:</span>
            <span className="font-medium">{syncStats.failed}</span>
          </div>
          <div className="flex justify-between">
            <span>Health:</span>
            <StatusIndicator
              status={getSyncHealthColor()}
              size="sm"
              className="ml-1"
            >
              {getSyncHealthText()}
            </StatusIndicator>

          </div>
          {syncStats.lastSync && (
            <div className="flex justify-between col-span-2">
              <span>Last Sync:</span>
              <span className="font-medium">
                {syncStats.lastSync.toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Manual Controls */}
      {showManualControls && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex-1"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
          
          {hasFailedItems && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleRetryFailed}
              disabled={isSyncing}
            >
              Retry Failed
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default SyncStatusIndicator;
