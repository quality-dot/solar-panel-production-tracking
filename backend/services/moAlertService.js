// Manufacturing Order Alert Service
// Handles alert generation, notification, and management

import db from '../config/database.js';
import { manufacturingLogger } from '../middleware/logger.js';
import { getEventWebSocket } from './eventWebSocket.js';

class MOAlertService {
  constructor() {
    this.logger = manufacturingLogger;
    this.alertTypes = {
      PANELS_REMAINING: 'panels_remaining',
      LOW_PROGRESS: 'low_progress',
      HIGH_FAILURE_RATE: 'high_failure_rate',
      STATION_BOTTLENECK: 'station_bottleneck',
      SLOW_STATION: 'slow_station',
      READY_FOR_COMPLETION: 'ready_for_completion',
      MO_DELAYED: 'mo_delayed',
      MO_COMPLETED: 'mo_completed'
    };
    this.severityLevels = {
      INFO: 'info',
      WARNING: 'warning',
      CRITICAL: 'critical'
    };
    this.notificationChannels = {
      WEBSOCKET: 'websocket',
      EMAIL: 'email',
      SMS: 'sms',
      DASHBOARD: 'dashboard'
    };
  }

  /**
   * Create a new alert
   * @param {Object} alertData - Alert data
   * @returns {Promise<Object>} Created alert
   */
  async createAlert(alertData) {
    try {
      const {
        mo_id,
        alert_type,
        severity,
        title,
        message,
        threshold_value,
        current_value,
        station_id = null,
        notification_channels = ['websocket', 'dashboard']
      } = alertData;

      // Validate alert data
      this.validateAlertData(alertData);

      // Check if similar alert already exists (avoid duplicates)
      const existingAlert = await this.checkForDuplicateAlert(mo_id, alert_type, severity);
      if (existingAlert) {
        this.logger.debug('Duplicate alert prevented', {
          mo_id,
          alert_type,
          severity,
          existing_alert_id: existingAlert.id
        });
        return existingAlert;
      }

      const query = `
        INSERT INTO mo_alerts (
          mo_id,
          alert_type,
          severity,
          title,
          message,
          threshold_value,
          current_value,
          station_id,
          notification_channels,
          status,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const values = [
        mo_id,
        alert_type,
        severity,
        title,
        message,
        threshold_value,
        current_value,
        station_id,
        JSON.stringify(notification_channels),
        'ACTIVE'
      ];

      const result = await db.query(query, values);
      const newAlert = result.rows[0];

      // Send notifications
      await this.sendNotifications(newAlert);

      // Broadcast via WebSocket
      await this.broadcastAlert(newAlert);

      this.logger.info('MO alert created', {
        alert_id: newAlert.id,
        mo_id,
        alert_type,
        severity,
        title
      });

      return newAlert;

    } catch (error) {
      this.logger.error('Failed to create MO alert', {
        error: error.message,
        alertData
      });
      throw error;
    }
  }

  /**
   * Get alerts for a manufacturing order
   * @param {number} moId - Manufacturing order ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of alerts
   */
  async getMOAlerts(moId, filters = {}) {
    try {
      const {
        status = 'ACTIVE',
        severity = null,
        alert_type = null,
        limit = 50,
        offset = 0
      } = filters;

      let query = `
        SELECT 
          a.*,
          mo.order_number,
          mo.panel_type,
          mo.target_quantity
        FROM mo_alerts a
        JOIN manufacturing_orders mo ON a.mo_id = mo.id
        WHERE a.mo_id = $1
      `;

      const values = [moId];
      let paramCount = 1;

      if (status) {
        paramCount++;
        query += ` AND a.status = $${paramCount}`;
        values.push(status);
      }

      if (severity) {
        paramCount++;
        query += ` AND a.severity = $${paramCount}`;
        values.push(severity);
      }

      if (alert_type) {
        paramCount++;
        query += ` AND a.alert_type = $${paramCount}`;
        values.push(alert_type);
      }

      query += ` ORDER BY a.created_at DESC`;
      query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
      values.push(limit, offset);

      const result = await db.query(query, values);
      return result.rows;

    } catch (error) {
      this.logger.error('Failed to get MO alerts', {
        error: error.message,
        moId,
        filters
      });
      throw error;
    }
  }

  /**
   * Get all active alerts across all manufacturing orders
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of active alerts
   */
  async getAllActiveAlerts(filters = {}) {
    try {
      const {
        severity = null,
        alert_type = null,
        limit = 100,
        offset = 0
      } = filters;

      let query = `
        SELECT 
          a.*,
          mo.order_number,
          mo.panel_type,
          mo.target_quantity,
          mo.status as mo_status
        FROM mo_alerts a
        JOIN manufacturing_orders mo ON a.mo_id = mo.id
        WHERE a.status = 'ACTIVE'
      `;

      const values = [];
      let paramCount = 0;

      if (severity) {
        paramCount++;
        query += ` AND a.severity = $${paramCount}`;
        values.push(severity);
      }

      if (alert_type) {
        paramCount++;
        query += ` AND a.alert_type = $${paramCount}`;
        values.push(alert_type);
      }

      query += ` ORDER BY a.severity DESC, a.created_at DESC`;
      query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
      values.push(limit, offset);

      const result = await db.query(query, values);
      return result.rows;

    } catch (error) {
      this.logger.error('Failed to get all active alerts', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  /**
   * Acknowledge an alert
   * @param {number} alertId - Alert ID
   * @param {string} acknowledgedBy - User ID who acknowledged
   * @param {string} notes - Optional notes
   * @returns {Promise<Object>} Updated alert
   */
  async acknowledgeAlert(alertId, acknowledgedBy, notes = null) {
    try {
      const query = `
        UPDATE mo_alerts 
        SET 
          status = 'ACKNOWLEDGED',
          acknowledged_by = $1,
          acknowledged_at = CURRENT_TIMESTAMP,
          acknowledgment_notes = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND status = 'ACTIVE'
        RETURNING *
      `;

      const result = await db.query(query, [acknowledgedBy, notes, alertId]);
      
      if (result.rows.length === 0) {
        throw new Error('Alert not found or already acknowledged');
      }

      const updatedAlert = result.rows[0];

      this.logger.info('MO alert acknowledged', {
        alert_id: alertId,
        acknowledged_by: acknowledgedBy,
        notes
      });

      return updatedAlert;

    } catch (error) {
      this.logger.error('Failed to acknowledge alert', {
        error: error.message,
        alertId,
        acknowledgedBy
      });
      throw error;
    }
  }

  /**
   * Resolve an alert
   * @param {number} alertId - Alert ID
   * @param {string} resolvedBy - User ID who resolved
   * @param {string} resolutionNotes - Resolution notes
   * @returns {Promise<Object>} Updated alert
   */
  async resolveAlert(alertId, resolvedBy, resolutionNotes = null) {
    try {
      const query = `
        UPDATE mo_alerts 
        SET 
          status = 'RESOLVED',
          resolved_by = $1,
          resolved_at = CURRENT_TIMESTAMP,
          resolution_notes = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND status IN ('ACTIVE', 'ACKNOWLEDGED')
        RETURNING *
      `;

      const result = await db.query(query, [resolvedBy, resolutionNotes, alertId]);
      
      if (result.rows.length === 0) {
        throw new Error('Alert not found or already resolved');
      }

      const updatedAlert = result.rows[0];

      this.logger.info('MO alert resolved', {
        alert_id: alertId,
        resolved_by: resolvedBy,
        resolution_notes: resolutionNotes
      });

      return updatedAlert;

    } catch (error) {
      this.logger.error('Failed to resolve alert', {
        error: error.message,
        alertId,
        resolvedBy
      });
      throw error;
    }
  }

  /**
   * Auto-resolve alerts when conditions are no longer met
   * @param {number} moId - Manufacturing order ID
   * @param {Object} currentProgress - Current progress data
   */
  async autoResolveAlerts(moId, currentProgress) {
    try {
      const activeAlerts = await this.getMOAlerts(moId, { status: 'ACTIVE' });
      
      for (const alert of activeAlerts) {
        let shouldResolve = false;

        switch (alert.alert_type) {
          case this.alertTypes.PANELS_REMAINING:
            // Resolve if panels remaining is above threshold
            if (currentProgress.panels_remaining > alert.threshold_value) {
              shouldResolve = true;
            }
            break;

          case this.alertTypes.LOW_PROGRESS:
            // Resolve if progress is above threshold
            if (currentProgress.progress_percentage > alert.threshold_value) {
              shouldResolve = true;
            }
            break;

          case this.alertTypes.HIGH_FAILURE_RATE:
            // Resolve if failure rate is below threshold
            if (currentProgress.failure_rate < alert.threshold_value) {
              shouldResolve = true;
            }
            break;

          case this.alertTypes.STATION_BOTTLENECK:
            // Resolve if station queue is below threshold
            const stationQueue = this.getStationQueue(currentProgress, alert.station_id);
            if (stationQueue <= alert.threshold_value) {
              shouldResolve = true;
            }
            break;
        }

        if (shouldResolve) {
          await this.resolveAlert(
            alert.id,
            'system',
            `Auto-resolved: Condition no longer met. Current value: ${this.getCurrentValueForAlert(alert, currentProgress)}`
          );
        }
      }

    } catch (error) {
      this.logger.error('Failed to auto-resolve alerts', {
        error: error.message,
        moId
      });
    }
  }

  /**
   * Send notifications for an alert
   * @param {Object} alert - Alert object
   */
  async sendNotifications(alert) {
    try {
      const notificationChannels = JSON.parse(alert.notification_channels);

      for (const channel of notificationChannels) {
        switch (channel) {
          case this.notificationChannels.WEBSOCKET:
            await this.sendWebSocketNotification(alert);
            break;

          case this.notificationChannels.EMAIL:
            await this.sendEmailNotification(alert);
            break;

          case this.notificationChannels.SMS:
            await this.sendSMSNotification(alert);
            break;

          case this.notificationChannels.DASHBOARD:
            await this.sendDashboardNotification(alert);
            break;
        }
      }

    } catch (error) {
      this.logger.error('Failed to send alert notifications', {
        error: error.message,
        alert_id: alert.id
      });
    }
  }

  /**
   * Send WebSocket notification
   * @param {Object} alert - Alert object
   */
  async sendWebSocketNotification(alert) {
    try {
      const eventWebSocket = getEventWebSocket();
      if (eventWebSocket) {
        const event = {
          id: `mo_alert_${alert.id}_${Date.now()}`,
          eventType: 'MO_ALERT',
          timestamp: new Date().toISOString(),
          severity: alert.severity,
          eventData: {
            alert_id: alert.id,
            mo_id: alert.mo_id,
            alert_type: alert.alert_type,
            severity: alert.severity,
            title: alert.title,
            message: alert.message
          },
          context: {
            manufacturing_order_id: alert.mo_id,
            alert_id: alert.id
          },
          metadata: {
            threshold_value: alert.threshold_value,
            current_value: alert.current_value,
            station_id: alert.station_id
          }
        };

        eventWebSocket.broadcastEvent(event);
      }
    } catch (error) {
      this.logger.error('Failed to send WebSocket notification', {
        error: error.message,
        alert_id: alert.id
      });
    }
  }

  /**
   * Send email notification (placeholder)
   * @param {Object} alert - Alert object
   */
  async sendEmailNotification(alert) {
    // TODO: Implement email notification service
    this.logger.info('Email notification sent (placeholder)', {
      alert_id: alert.id,
      alert_type: alert.alert_type,
      severity: alert.severity
    });
  }

  /**
   * Send SMS notification (placeholder)
   * @param {Object} alert - Alert object
   */
  async sendSMSNotification(alert) {
    // TODO: Implement SMS notification service
    this.logger.info('SMS notification sent (placeholder)', {
      alert_id: alert.id,
      alert_type: alert.alert_type,
      severity: alert.severity
    });
  }

  /**
   * Send dashboard notification (placeholder)
   * @param {Object} alert - Alert object
   */
  async sendDashboardNotification(alert) {
    // TODO: Implement dashboard notification service
    this.logger.info('Dashboard notification sent (placeholder)', {
      alert_id: alert.id,
      alert_type: alert.alert_type,
      severity: alert.severity
    });
  }

  /**
   * Broadcast alert via WebSocket
   * @param {Object} alert - Alert object
   */
  async broadcastAlert(alert) {
    try {
      const eventWebSocket = getEventWebSocket();
      if (eventWebSocket) {
        const event = {
          id: `mo_alert_broadcast_${alert.id}_${Date.now()}`,
          eventType: 'MO_ALERT_BROADCAST',
          timestamp: new Date().toISOString(),
          severity: alert.severity,
          eventData: alert,
          context: {
            manufacturing_order_id: alert.mo_id,
            alert_id: alert.id
          }
        };

        eventWebSocket.broadcastEvent(event);
      }
    } catch (error) {
      this.logger.error('Failed to broadcast alert', {
        error: error.message,
        alert_id: alert.id
      });
    }
  }

  /**
   * Validate alert data
   * @param {Object} alertData - Alert data to validate
   */
  validateAlertData(alertData) {
    const { mo_id, alert_type, severity, title, message } = alertData;

    if (!mo_id) {
      throw new Error('MO ID is required');
    }

    if (!alert_type || !Object.values(this.alertTypes).includes(alert_type)) {
      throw new Error('Valid alert type is required');
    }

    if (!severity || !Object.values(this.severityLevels).includes(severity)) {
      throw new Error('Valid severity level is required');
    }

    if (!title || !message) {
      throw new Error('Title and message are required');
    }
  }

  /**
   * Check for duplicate alerts
   * @param {number} moId - Manufacturing order ID
   * @param {string} alertType - Alert type
   * @param {string} severity - Severity level
   * @returns {Promise<Object|null>} Existing alert or null
   */
  async checkForDuplicateAlert(moId, alertType, severity) {
    try {
      const query = `
        SELECT * FROM mo_alerts 
        WHERE mo_id = $1 
          AND alert_type = $2 
          AND severity = $3 
          AND status = 'ACTIVE'
          AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'
        ORDER BY created_at DESC 
        LIMIT 1
      `;

      const result = await db.query(query, [moId, alertType, severity]);
      return result.rows[0] || null;

    } catch (error) {
      this.logger.error('Failed to check for duplicate alerts', {
        error: error.message,
        moId,
        alertType,
        severity
      });
      return null;
    }
  }

  /**
   * Get station queue count from progress data
   * @param {Object} progressData - Progress data
   * @param {number} stationId - Station ID
   * @returns {number} Queue count
   */
  getStationQueue(progressData, stationId) {
    switch (stationId) {
      case 1: return progressData.at_station_1 || 0;
      case 2: return progressData.at_station_2 || 0;
      case 3: return progressData.at_station_3 || 0;
      case 4: return progressData.at_station_4 || 0;
      default: return 0;
    }
  }

  /**
   * Get current value for alert resolution
   * @param {Object} alert - Alert object
   * @param {Object} progressData - Current progress data
   * @returns {number} Current value
   */
  getCurrentValueForAlert(alert, progressData) {
    switch (alert.alert_type) {
      case this.alertTypes.PANELS_REMAINING:
        return progressData.panels_remaining;
      case this.alertTypes.LOW_PROGRESS:
        return progressData.progress_percentage;
      case this.alertTypes.HIGH_FAILURE_RATE:
        return progressData.failure_rate;
      case this.alertTypes.STATION_BOTTLENECK:
        return this.getStationQueue(progressData, alert.station_id);
      default:
        return 0;
    }
  }

  /**
   * Get alert statistics
   * @returns {Promise<Object>} Alert statistics
   */
  async getAlertStatistics() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_alerts,
          COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_alerts,
          COUNT(CASE WHEN status = 'ACKNOWLEDGED' THEN 1 END) as acknowledged_alerts,
          COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) as resolved_alerts,
          COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_alerts,
          COUNT(CASE WHEN severity = 'warning' THEN 1 END) as warning_alerts,
          COUNT(CASE WHEN severity = 'info' THEN 1 END) as info_alerts
        FROM mo_alerts
        WHERE created_at >= CURRENT_DATE
      `;

      const result = await db.query(query);
      return result.rows[0];

    } catch (error) {
      this.logger.error('Failed to get alert statistics', {
        error: error.message
      });
      throw error;
    }
  }
}

export default new MOAlertService();
