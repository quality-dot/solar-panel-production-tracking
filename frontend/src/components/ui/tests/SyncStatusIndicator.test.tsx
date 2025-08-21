import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SyncStatusIndicator } from '../SyncStatusIndicator';
import { useBackgroundSync } from '../../../hooks/useBackgroundSync';
import { SyncQueue } from '../../../database/config';

// Mock the useBackgroundSync hook
jest.mock('../../../hooks/useBackgroundSync');
const mockUseBackgroundSync = useBackgroundSync as jest.MockedFunction<typeof useBackgroundSync>;

describe('SyncStatusIndicator', () => {
  const defaultMockState = {
    isSyncing: false,
    progress: {
      total: 0,
      processed: 0,
      current: null as SyncQueue | null,
      status: 'idle' as const
    },
    lastSyncResult: null as any,
    syncStats: {
      pending: 0,
      failed: 0,
      lastSync: null as Date | null,
      syncHealth: 'good' as const
    },
    error: null as string | null,
    triggerSync: jest.fn(),
    retryFailedItems: jest.fn(),
    refreshSyncStats: jest.fn(),
    cleanupOldItems: jest.fn(),
    hasPendingItems: false,
    hasFailedItems: false,
    syncHealth: 'good' as const
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBackgroundSync.mockReturnValue(defaultMockState);
  });

  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      render(<SyncStatusIndicator />);
      
      expect(screen.getByText('Synced')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      render(<SyncStatusIndicator className="custom-class" />);
      
      const container = screen.getByText('Synced').closest('.sync-status-indicator');
      expect(container).toHaveClass('custom-class');
    });

    it('shows correct status when syncing', () => {
      mockUseBackgroundSync.mockReturnValue({
        ...defaultMockState,
        isSyncing: true,
        progress: {
          total: 10,
          processed: 5,
          current: { 
            id: 1,
            operation: 'create', 
            table: 'panels',
            data: { barcode: 'TEST123' },
            priority: 'high',
            createdAt: new Date(),
            retryCount: 0
          } as SyncQueue,
          status: 'syncing' as const
        }
      });

      render(<SyncStatusIndicator />);
      
      expect(screen.getAllByText('Syncing...')).toHaveLength(2); // One in status indicator, one in button
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('5 / 10')).toBeInTheDocument();
      expect(screen.getByText('Current: create panels')).toBeInTheDocument();
    });

    it('shows error state', () => {
      mockUseBackgroundSync.mockReturnValue({
        ...defaultMockState,
        error: 'Network connection failed'
      });

      render(<SyncStatusIndicator />);
      
      expect(screen.getByText('Sync Error')).toBeInTheDocument();
      expect(screen.getByText('Network connection failed')).toBeInTheDocument();
    });

    it('shows pending sync state', () => {
      mockUseBackgroundSync.mockReturnValue({
        ...defaultMockState,
        hasPendingItems: true,
        syncStats: {
          ...defaultMockState.syncStats!,
          pending: 5
        }
      });

      render(<SyncStatusIndicator />);
      
      expect(screen.getByText('Pending Sync')).toBeInTheDocument();
    });

    it('shows failed sync state', () => {
      mockUseBackgroundSync.mockReturnValue({
        ...defaultMockState,
        hasFailedItems: true,
        syncStats: {
          ...defaultMockState.syncStats!,
          failed: 2
        }
      });

      render(<SyncStatusIndicator />);
      
      expect(screen.getByText('Sync Failed')).toBeInTheDocument();
    });
  });

  describe('Progress Display', () => {
    it('shows progress bar when syncing', () => {
      mockUseBackgroundSync.mockReturnValue({
        ...defaultMockState,
        isSyncing: true,
        progress: {
          total: 10,
          processed: 5,
          current: null,
          status: 'syncing' as const
        }
      });

      render(<SyncStatusIndicator showProgress={true} />);
      
      const progressBar = screen.getByText('Progress').parentElement?.nextElementSibling;
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveClass('w-full', 'bg-gray-200');
      
      const progressFill = progressBar?.querySelector('.bg-blue-600');
      expect(progressFill).toBeInTheDocument();
    });

    it('hides progress when showProgress is false', () => {
      mockUseBackgroundSync.mockReturnValue({
        ...defaultMockState,
        isSyncing: true,
        progress: {
          total: 10,
          processed: 5,
          current: null,
          status: 'syncing' as const
        }
      });

      render(<SyncStatusIndicator showProgress={false} />);
      
      expect(screen.queryByText('Progress')).not.toBeInTheDocument();
    });

    it('shows current operation details', () => {
      mockUseBackgroundSync.mockReturnValue({
        ...defaultMockState,
        isSyncing: true,
        progress: {
          total: 10,
          processed: 5,
          current: { 
            id: 2,
            operation: 'update', 
            table: 'inspections',
            data: { id: 1, panelId: 1 },
            priority: 'medium',
            createdAt: new Date(),
            retryCount: 0
          } as SyncQueue,
          status: 'syncing' as const
        }
      });

      render(<SyncStatusIndicator />);
      
      expect(screen.getByText('Current: update inspections')).toBeInTheDocument();
    });
  });

  describe('Statistics Display', () => {
    it('shows sync statistics when showStats is true', () => {
      mockUseBackgroundSync.mockReturnValue({
        ...defaultMockState,
        syncStats: {
          pending: 5,
          failed: 2,
          lastSync: new Date('2023-01-01T12:00:00Z'),
          syncHealth: 'warning' as const
        },
        syncHealth: 'warning' as const
      });

      render(<SyncStatusIndicator showStats={true} />);
      
      expect(screen.getByText('Pending:')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Failed:')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Health:')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('Last Sync:')).toBeInTheDocument();
    });

    it('hides statistics when showStats is false', () => {
      render(<SyncStatusIndicator showStats={false} />);
      
      expect(screen.queryByText('Pending:')).not.toBeInTheDocument();
      expect(screen.queryByText('Failed:')).not.toBeInTheDocument();
    });

    it('shows different health statuses', () => {
      const { rerender } = render(<SyncStatusIndicator showStats={true} />);
      
      // Test critical health
      mockUseBackgroundSync.mockReturnValue({
        ...defaultMockState,
        syncStats: {
          ...defaultMockState.syncStats!,
          syncHealth: 'critical' as const
        },
        syncHealth: 'critical' as const
      });
      
      rerender(<SyncStatusIndicator showStats={true} />);
      expect(screen.getByText('Critical')).toBeInTheDocument();
      
      // Test good health
      mockUseBackgroundSync.mockReturnValue({
        ...defaultMockState,
        syncStats: {
          ...defaultMockState.syncStats!,
          syncHealth: 'good' as const
        },
        syncHealth: 'good' as const
      });
      
      rerender(<SyncStatusIndicator showStats={true} />);
      expect(screen.getByText('Good')).toBeInTheDocument();
    });
  });

  describe('Manual Controls', () => {
    it('shows manual sync button when showManualControls is true', () => {
      render(<SyncStatusIndicator showManualControls={true} />);
      
      expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument();
    });

    it('hides manual controls when showManualControls is false', () => {
      render(<SyncStatusIndicator showManualControls={false} />);
      
      expect(screen.queryByRole('button', { name: /sync now/i })).not.toBeInTheDocument();
    });

    it('handles manual sync button click', async () => {
      const mockTriggerSync = jest.fn();
      mockUseBackgroundSync.mockReturnValue({
        ...defaultMockState,
        triggerSync: mockTriggerSync
      });

      render(<SyncStatusIndicator />);
      
      const syncButton = screen.getByRole('button', { name: /sync now/i });
      await userEvent.click(syncButton);
      
      expect(mockTriggerSync).toHaveBeenCalledTimes(1);
    });

    it('disables sync button when syncing', () => {
      mockUseBackgroundSync.mockReturnValue({
        ...defaultMockState,
        isSyncing: true
      });

      render(<SyncStatusIndicator />);
      
      const syncButton = screen.getByRole('button', { name: /syncing.../i });
      expect(syncButton).toBeDisabled();
    });

    it('shows retry failed button when there are failed items', () => {
      const mockRetryFailedItems = jest.fn();
      mockUseBackgroundSync.mockReturnValue({
        ...defaultMockState,
        hasFailedItems: true,
        retryFailedItems: mockRetryFailedItems
      });

      render(<SyncStatusIndicator />);
      
      const retryButton = screen.getByRole('button', { name: /retry failed/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('handles retry failed button click', async () => {
      const mockRetryFailedItems = jest.fn();
      mockUseBackgroundSync.mockReturnValue({
        ...defaultMockState,
        hasFailedItems: true,
        retryFailedItems: mockRetryFailedItems
      });

      render(<SyncStatusIndicator />);
      
      const retryButton = screen.getByRole('button', { name: /retry failed/i });
      await userEvent.click(retryButton);
      
      expect(mockRetryFailedItems).toHaveBeenCalledTimes(1);
    });

    it('hides retry button when no failed items', () => {
      render(<SyncStatusIndicator />);
      
      expect(screen.queryByRole('button', { name: /retry failed/i })).not.toBeInTheDocument();
    });

    it('disables retry button when syncing', () => {
      const mockRetryFailedItems = jest.fn();
      mockUseBackgroundSync.mockReturnValue({
        ...defaultMockState,
        isSyncing: true,
        hasFailedItems: true,
        retryFailedItems: mockRetryFailedItems
      });

      render(<SyncStatusIndicator />);
      
      const retryButton = screen.getByRole('button', { name: /retry failed/i });
      expect(retryButton).toBeDisabled();
    });
  });

  describe('Status Indicator Colors', () => {
    it('shows correct status indicator colors for different states', () => {
      const { rerender } = render(<SyncStatusIndicator />);
      
      // Default state (success)
      let statusIndicator = screen.getByText('Synced').closest('span');
      expect(statusIndicator).toHaveClass('bg-green-100', 'text-green-800');
      
      // Error state
      mockUseBackgroundSync.mockReturnValue({
        ...defaultMockState,
        error: 'Network error'
      });
      
      rerender(<SyncStatusIndicator />);
      statusIndicator = screen.getByText('Sync Error').closest('span');
      expect(statusIndicator).toHaveClass('bg-red-100', 'text-red-800');
      
      // Warning state (syncing)
      mockUseBackgroundSync.mockReturnValue({
        ...defaultMockState,
        isSyncing: true
      });
      
      rerender(<SyncStatusIndicator />);
      statusIndicator = screen.getAllByText('Syncing...')[0].closest('span');
      expect(statusIndicator).toHaveClass('bg-yellow-100', 'text-yellow-800');
      
      // Warning state (pending)
      mockUseBackgroundSync.mockReturnValue({
        ...defaultMockState,
        hasPendingItems: true
      });
      
      rerender(<SyncStatusIndicator />);
      statusIndicator = screen.getByText('Pending Sync').closest('span');
      expect(statusIndicator).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });
  });

  describe('Error Handling', () => {
    it('handles sync errors gracefully', async () => {
      const mockTriggerSync = jest.fn().mockRejectedValue(new Error('Sync failed'));
      mockUseBackgroundSync.mockReturnValue({
        ...defaultMockState,
        triggerSync: mockTriggerSync
      });

      render(<SyncStatusIndicator />);
      
      const syncButton = screen.getByRole('button', { name: /sync now/i });
      await userEvent.click(syncButton);
      
      // Should not throw error, just log it
      expect(mockTriggerSync).toHaveBeenCalledTimes(1);
    });

    it('handles retry errors gracefully', async () => {
      const mockRetryFailedItems = jest.fn().mockRejectedValue(new Error('Retry failed'));
      mockUseBackgroundSync.mockReturnValue({
        ...defaultMockState,
        hasFailedItems: true,
        retryFailedItems: mockRetryFailedItems
      });

      render(<SyncStatusIndicator />);
      
      const retryButton = screen.getByRole('button', { name: /retry failed/i });
      await userEvent.click(retryButton);
      
      // Should not throw error, just log it
      expect(mockRetryFailedItems).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<SyncStatusIndicator />);
      
      // Check that buttons have proper roles
      expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument();
      
      // Check that status is announced
      expect(screen.getByText('Synced')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      render(<SyncStatusIndicator />);
      
      const syncButton = screen.getByRole('button', { name: /sync now/i });
      
      // Focus and press Enter
      syncButton.focus();
      await userEvent.keyboard('{Enter}');
      
      expect(defaultMockState.triggerSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration with useBackgroundSync', () => {
    it('calls useBackgroundSync with correct options', () => {
      render(<SyncStatusIndicator />);
      
      expect(mockUseBackgroundSync).toHaveBeenCalledWith({
        autoSyncOnOnline: true,
        syncInterval: 30000,
        enableNotifications: true
      });
    });

    it('updates display when sync state changes', () => {
      const { rerender } = render(<SyncStatusIndicator />);
      
      // Initial state
      expect(screen.getByText('Synced')).toBeInTheDocument();
      
      // Change to syncing state
      mockUseBackgroundSync.mockReturnValue({
        ...defaultMockState,
        isSyncing: true
      });
      
      rerender(<SyncStatusIndicator />);
      expect(screen.getAllByText('Syncing...')).toHaveLength(2);
    });
  });
});
