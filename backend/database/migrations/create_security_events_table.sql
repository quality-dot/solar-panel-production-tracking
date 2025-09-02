-- Create security_events table for storing security event data
-- This table supports comprehensive security event tracking and audit trails

CREATE TABLE IF NOT EXISTS security_events (
    id VARCHAR(36) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    severity ENUM('critical', 'high', 'medium', 'low', 'info', 'debug') NOT NULL,
    category VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    data JSON,
    context JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    
    -- Indexes for performance
    INDEX idx_type (type),
    INDEX idx_severity (severity),
    INDEX idx_category (category),
    INDEX idx_created_at (created_at),
    INDEX idx_processed (processed),
    INDEX idx_context_user_id ((JSON_EXTRACT(context, '$.userId'))),
    INDEX idx_context_correlation_id ((JSON_EXTRACT(context, '$.correlationId'))),
    INDEX idx_context_session_id ((JSON_EXTRACT(context, '$.sessionId'))),
    INDEX idx_context_ip_address ((JSON_EXTRACT(context, '$.ipAddress'))),
    
    -- Composite indexes for common queries
    INDEX idx_type_severity (type, severity),
    INDEX idx_category_severity (category, severity),
    INDEX idx_created_at_severity (created_at, severity),
    INDEX idx_user_type (JSON_EXTRACT(context, '$.userId'), type),
    INDEX idx_correlation_created (JSON_EXTRACT(context, '$.correlationId'), created_at)
);

-- Create security_event_metrics table for aggregated metrics
CREATE TABLE IF NOT EXISTS security_event_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL,
    metric_value VARCHAR(100) NOT NULL,
    count INT DEFAULT 1,
    date_hour TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_metric (metric_type, metric_value, date_hour),
    INDEX idx_metric_type (metric_type),
    INDEX idx_date_hour (date_hour),
    INDEX idx_metric_type_date (metric_type, date_hour)
);

-- Create security_event_correlations table for tracking related events
CREATE TABLE IF NOT EXISTS security_event_correlations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    correlation_id VARCHAR(36) NOT NULL,
    event_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (event_id) REFERENCES security_events(id) ON DELETE CASCADE,
    INDEX idx_correlation_id (correlation_id),
    INDEX idx_event_id (event_id),
    INDEX idx_correlation_created (correlation_id, created_at)
);

-- Create security_event_alerts table for alert management
CREATE TABLE IF NOT EXISTS security_event_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(36) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    alert_severity ENUM('critical', 'high', 'medium', 'low') NOT NULL,
    alert_message TEXT NOT NULL,
    alert_data JSON,
    status ENUM('active', 'acknowledged', 'resolved', 'dismissed') DEFAULT 'active',
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMP NULL,
    resolved_by VARCHAR(100),
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (event_id) REFERENCES security_events(id) ON DELETE CASCADE,
    INDEX idx_event_id (event_id),
    INDEX idx_alert_type (alert_type),
    INDEX idx_alert_severity (alert_severity),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_acknowledged_by (acknowledged_by),
    INDEX idx_resolved_by (resolved_by)
);

-- Create security_event_retention_policy table for data retention management
CREATE TABLE IF NOT EXISTS security_event_retention_policy (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    retention_days INT NOT NULL,
    archive_before_delete BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_event_type (event_type),
    INDEX idx_is_active (is_active),
    INDEX idx_retention_days (retention_days)
);

-- Insert default retention policies
INSERT INTO security_event_retention_policy (event_type, retention_days, archive_before_delete) VALUES
('auth_success', 90, TRUE),
('auth_failure', 365, TRUE),
('auth_lockout', 365, TRUE),
('data_read', 30, FALSE),
('data_write', 90, TRUE),
('data_delete', 2555, TRUE), -- 7 years for compliance
('system_error', 90, TRUE),
('manufacturing_error', 365, TRUE),
('compliance_violation', 2555, TRUE), -- 7 years for compliance
('security_threat_detected', 2555, TRUE) -- 7 years for compliance
ON DUPLICATE KEY UPDATE retention_days = VALUES(retention_days);

-- Create view for recent security events with context
CREATE OR REPLACE VIEW recent_security_events AS
SELECT 
    se.id,
    se.type,
    se.severity,
    se.category,
    se.message,
    se.data,
    se.context,
    se.created_at,
    se.processed,
    JSON_EXTRACT(se.context, '$.userId') as user_id,
    JSON_EXTRACT(se.context, '$.correlationId') as correlation_id,
    JSON_EXTRACT(se.context, '$.sessionId') as session_id,
    JSON_EXTRACT(se.context, '$.ipAddress') as ip_address,
    JSON_EXTRACT(se.context, '$.source') as source
FROM security_events se
WHERE se.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY se.created_at DESC;

-- Create view for security event statistics
CREATE OR REPLACE VIEW security_event_stats AS
SELECT 
    DATE(created_at) as event_date,
    type,
    severity,
    category,
    COUNT(*) as event_count,
    COUNT(DISTINCT JSON_EXTRACT(context, '$.userId')) as unique_users,
    COUNT(DISTINCT JSON_EXTRACT(context, '$.ipAddress')) as unique_ips
FROM security_events
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(created_at), type, severity, category
ORDER BY event_date DESC, event_count DESC;

-- Create stored procedure for cleaning up old events
DELIMITER //
CREATE PROCEDURE CleanupOldSecurityEvents()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE event_type VARCHAR(50);
    DECLARE retention_days INT;
    DECLARE archive_before_delete BOOLEAN;
    
    DECLARE retention_cursor CURSOR FOR
        SELECT event_type, retention_days, archive_before_delete
        FROM security_event_retention_policy
        WHERE is_active = TRUE;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN retention_cursor;
    
    cleanup_loop: LOOP
        FETCH retention_cursor INTO event_type, retention_days, archive_before_delete;
        IF done THEN
            LEAVE cleanup_loop;
        END IF;
        
        -- Archive events if required
        IF archive_before_delete THEN
            INSERT INTO security_event_metrics (metric_type, metric_value, count, date_hour)
            SELECT 
                'archived_events',
                event_type,
                COUNT(*),
                DATE_FORMAT(NOW(), '%Y-%m-%d %H:00:00')
            FROM security_events
            WHERE type = event_type
            AND created_at < DATE_SUB(NOW(), INTERVAL retention_days DAY);
        END IF;
        
        -- Delete old events
        DELETE FROM security_events
        WHERE type = event_type
        AND created_at < DATE_SUB(NOW(), INTERVAL retention_days DAY);
        
    END LOOP;
    
    CLOSE retention_cursor;
END //
DELIMITER ;

-- Create event scheduler for automatic cleanup (if not exists)
SET GLOBAL event_scheduler = ON;

CREATE EVENT IF NOT EXISTS cleanup_security_events
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
  CALL CleanupOldSecurityEvents();
