/**
 * Event WebSocket Service
 * Task: 22.3 - Event Collection System
 * Description: Real-time event streaming for connected clients
 * Date: 2025-08-28
 */

import WebSocket from 'ws';
import loggerService from './loggerService.js';

export class EventWebSocket {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // Map client to subscription filters
    this.setupWebSocket();
    
    loggerService.logSecurity('info', 'Event WebSocket server initialized', {
      source: 'event-websocket'
    });
  }
  
  /**
   * Setup WebSocket server
   */
  setupWebSocket() {
    this.wss.on('connection', (ws, request) => {
      const clientId = this.generateClientId();
      
      this.clients.set(ws, {
        id: clientId,
        filters: {},
        connectedAt: new Date(),
        ip: request.socket.remoteAddress,
        userAgent: request.headers['user-agent'],
        subscriptions: new Set()
      });
      
      loggerService.logSecurity('info', 'WebSocket client connected', {
        clientId,
        ip: request.socket.remoteAddress,
        userAgent: request.headers['user-agent'],
        source: 'event-websocket'
      });
      
      // Handle client messages
      ws.on('message', (message) => {
        this.handleClientMessage(ws, message);
      });
      
      // Handle client disconnect
      ws.on('close', () => {
        this.handleClientDisconnect(ws);
      });
      
      // Handle errors
      ws.on('error', (error) => {
        this.handleClientError(ws, error);
      });
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection_established',
        clientId,
        timestamp: new Date().toISOString(),
        message: 'Connected to Event Streaming Service'
      }));
    });
  }
  
  /**
   * Handle client messages (subscription filters)
   */
  handleClientMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      const client = this.clients.get(ws);
      
      if (!client) {
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Client not found',
          timestamp: new Date().toISOString()
        }));
        return;
      }
      
      switch (data.type) {
        case 'subscribe':
          this.handleSubscription(ws, client, data);
          break;
          
        case 'unsubscribe':
          this.handleUnsubscription(ws, client, data);
          break;
          
        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
          break;
          
        case 'get_status':
          this.sendClientStatus(ws, client);
          break;
          
        default:
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Unknown message type',
            timestamp: new Date().toISOString()
          }));
      }
      
    } catch (error) {
      loggerService.logSecurity('error', 'Failed to handle client message', {
        error: error.message,
        source: 'event-websocket'
      });
      
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Invalid message format',
        timestamp: new Date().toISOString()
      }));
    }
  }
  
  /**
   * Handle client subscription
   */
  handleSubscription(ws, client, data) {
    const { eventTypes, severity, userId, sourceIp, timeRange } = data;
    
    // Update client filters
    client.filters = {
      eventTypes: eventTypes || [],
      severity: severity || [],
      userId: userId || null,
      sourceIp: sourceIp || null,
      timeRange: timeRange || '24h'
    };
    
    // Add to subscriptions
    if (eventTypes && eventTypes.length > 0) {
      eventTypes.forEach(type => client.subscriptions.add(type));
    }
    
    // Send confirmation
    ws.send(JSON.stringify({
      type: 'subscription_updated',
      filters: client.filters,
      subscriptions: Array.from(client.subscriptions),
      timestamp: new Date().toISOString()
    }));
    
    loggerService.logSecurity('info', 'Client subscription updated', {
      clientId: client.id,
      filters: client.filters,
      source: 'event-websocket'
    });
  }
  
  /**
   * Handle client unsubscription
   */
  handleUnsubscription(ws, client, data) {
    const { eventTypes } = data;
    
    if (eventTypes && eventTypes.length > 0) {
      eventTypes.forEach(type => client.subscriptions.delete(type));
    } else {
      // Unsubscribe from all
      client.subscriptions.clear();
    }
    
    // Clear filters
    client.filters = {};
    
    // Send confirmation
    ws.send(JSON.stringify({
      type: 'subscription_updated',
      filters: client.filters,
      subscriptions: Array.from(client.subscriptions),
      timestamp: new Date().toISOString()
    }));
    
    loggerService.logSecurity('info', 'Client unsubscribed', {
      clientId: client.id,
      eventTypes: eventTypes || 'all',
      source: 'event-websocket'
    });
  }
  
  /**
   * Send client status
   */
  sendClientStatus(ws, client) {
    ws.send(JSON.stringify({
      type: 'client_status',
      clientId: client.id,
      connectedAt: client.connectedAt,
      filters: client.filters,
      subscriptions: Array.from(client.subscriptions),
      timestamp: new Date().toISOString()
    }));
  }
  
  /**
   * Handle client disconnect
   */
  handleClientDisconnect(ws) {
    const client = this.clients.get(ws);
    
    if (client) {
      loggerService.logSecurity('info', 'WebSocket client disconnected', {
        clientId: client.id,
        connectionDuration: Date.now() - client.connectedAt.getTime(),
        source: 'event-websocket'
      });
      
      this.clients.delete(ws);
    }
  }
  
  /**
   * Handle client errors
   */
  handleClientError(ws, error) {
    const client = this.clients.get(ws);
    
    loggerService.logSecurity('error', 'WebSocket client error', {
      clientId: client?.id,
      error: error.message,
      source: 'event-websocket'
    });
  }
  
  /**
   * Broadcast events to connected clients
   */
  broadcastEvent(event) {
    const eventMessage = JSON.stringify({
      type: 'security_event',
      event: {
        id: event.id,
        eventType: event.eventType,
        timestamp: event.timestamp,
        severity: event.severity,
        eventData: event.eventData,
        context: event.context,
        metadata: event.metadata
      }
    });
    
    let broadcastCount = 0;
    
    for (const [ws, client] of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        // Check if client is subscribed to this event type
        if (this.shouldSendToClient(event, client)) {
          ws.send(eventMessage);
          broadcastCount++;
        }
      }
    }
    
    loggerService.logSecurity('debug', 'Event broadcasted to clients', {
      eventId: event.id,
      eventType: event.eventType,
      clientCount: broadcastCount,
      source: 'event-websocket'
    });
  }
  
  /**
   * Check if event should be sent to client based on filters
   */
  shouldSendToClient(event, client) {
    // No filters, send all events
    if (!client.filters || Object.keys(client.filters).length === 0) {
      return true;
    }
    
    const { eventTypes, severity, userId, sourceIp, timeRange } = client.filters;
    
    // Check event type filter
    if (eventTypes && eventTypes.length > 0 && 
        !eventTypes.includes(event.eventType)) {
      return false;
    }
    
    // Check severity filter
    if (severity && severity.length > 0 && 
        !severity.includes(event.severity)) {
      return false;
    }
    
    // Check user filter
    if (userId && event.userId !== userId) {
      return false;
    }
    
    // Check source IP filter
    if (sourceIp && event.sourceIp !== sourceIp) {
      return false;
    }
    
    // Check time range filter
    if (timeRange && !this.isInTimeRange(event.timestamp, timeRange)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Check if event timestamp is within specified time range
   */
  isInTimeRange(timestamp, timeRange) {
    const eventTime = new Date(timestamp);
    const now = new Date();
    
    switch (timeRange) {
      case '1h':
        return (now - eventTime) <= 3600000; // 1 hour
      case '6h':
        return (now - eventTime) <= 21600000; // 6 hours
      case '12h':
        return (now - eventTime) <= 43200000; // 12 hours
      case '24h':
        return (now - eventTime) <= 86400000; // 24 hours
      case '7d':
        return (now - eventTime) <= 604800000; // 7 days
      case '30d':
        return (now - eventTime) <= 2592000000; // 30 days
      default:
        return true; // No time filter
    }
  }
  
  /**
   * Send system message to all clients
   */
  broadcastSystemMessage(message, type = 'info') {
    const systemMessage = JSON.stringify({
      type: 'system_message',
      message,
      messageType: type,
      timestamp: new Date().toISOString()
    });
    
    let broadcastCount = 0;
    
    for (const [ws, client] of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(systemMessage);
        broadcastCount++;
      }
    }
    
    loggerService.logSecurity('info', 'System message broadcasted', {
      message,
      messageType: type,
      clientCount: broadcastCount,
      source: 'event-websocket'
    });
  }
  
  /**
   * Send message to specific client
   */
  sendToClient(clientId, message) {
    for (const [ws, client] of this.clients) {
      if (client.id === clientId && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          ...message,
          timestamp: new Date().toISOString()
        }));
        return true;
      }
    }
    
    loggerService.logSecurity('warn', 'Client not found for message', {
      clientId,
      source: 'event-websocket'
    });
    
    return false;
  }
  
  /**
   * Generate unique client ID
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get connection statistics
   */
  getConnectionStats() {
    const stats = {
      totalConnections: this.clients.size,
      activeConnections: 0,
      connections: []
    };
    
    for (const [ws, client] of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        stats.activeConnections++;
        stats.connections.push({
          id: client.id,
          connectedAt: client.connectedAt,
          ip: client.ip,
          userAgent: client.userAgent,
          filters: client.filters,
          subscriptions: Array.from(client.subscriptions)
        });
      }
    }
    
    return stats;
  }
  
  /**
   * Get client information
   */
  getClientInfo(clientId) {
    for (const [ws, client] of this.clients) {
      if (client.id === clientId) {
        return {
          id: client.id,
          connectedAt: client.connectedAt,
          ip: client.ip,
          userAgent: client.userAgent,
          filters: client.filters,
          subscriptions: Array.from(client.subscriptions),
          connectionStatus: ws.readyState === WebSocket.OPEN ? 'active' : 'inactive'
        };
      }
    }
    
    return null;
  }
  
  /**
   * Disconnect specific client
   */
  disconnectClient(clientId) {
    for (const [ws, client] of this.clients) {
      if (client.id === clientId) {
        ws.close(1000, 'Administrative disconnect');
        this.clients.delete(ws);
        
        loggerService.logSecurity('info', 'Client administratively disconnected', {
          clientId,
          source: 'event-websocket'
        });
        
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Disconnect all clients
   */
  disconnectAllClients(reason = 'Server shutdown') {
    for (const [ws, client] of this.clients) {
      ws.close(1001, reason);
    }
    
    this.clients.clear();
    
    loggerService.logSecurity('info', 'All clients disconnected', {
      reason,
      source: 'event-websocket'
    });
  }
  
  /**
   * Health check
   */
  getHealthStatus() {
    const stats = this.getConnectionStats();
    
    return {
      status: 'healthy',
      totalConnections: stats.totalConnections,
      activeConnections: stats.activeConnections,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Cleanup resources
   */
  cleanup() {
    this.disconnectAllClients('Service cleanup');
    this.wss.close();
    
    loggerService.logSecurity('info', 'Event WebSocket service cleaned up', {
      source: 'event-websocket'
    });
  }
}

// Export singleton instance
export let eventWebSocket = null;

/**
 * Initialize WebSocket service
 */
export function initializeEventWebSocket(server) {
  if (!eventWebSocket) {
    eventWebSocket = new EventWebSocket(server);
  }
  return eventWebSocket;
}

/**
 * Get WebSocket service instance
 */
export function getEventWebSocket() {
  return eventWebSocket;
}

export default EventWebSocket;
