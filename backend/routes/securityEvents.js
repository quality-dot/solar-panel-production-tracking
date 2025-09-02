import express from 'express';
import { securityEventService } from '../services/securityEventService.js';

const router = express.Router();

// List security events with filters
router.get('/', async (req, res) => {
	try {
		const { eventType, severity, source, userId, correlationId, startDate, endDate, limit, offset } = req.query;
		const filters = {
			eventType,
			severity,
			source,
			userId: userId ? Number(userId) : undefined,
			correlationId,
			startDate: startDate ? new Date(startDate) : undefined,
			endDate: endDate ? new Date(endDate) : undefined,
			limit: limit ? Number(limit) : undefined,
			offset: offset ? Number(offset) : undefined
		};
		const events = await securityEventService.getEvents(filters);
		res.status(200).json({ success: true, count: events.length, events });
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
});

// Get security event statistics
router.get('/stats', async (req, res) => {
	try {
		const range = req.query.range || '24h';
		const stats = await securityEventService.getStatistics(range);
		res.status(200).json({ success: true, range, stats });
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
});

// List threat metrics and recent aggregation
router.get('/threat-metrics', async (req, res) => {
	try {
		const metrics = securityEventService.getMetrics();
		const recent = securityEventService.getCachedEvents(100);
		const lastAggregation = securityEventService.lastThreatAggregation || null;
		res.status(200).json({ success: true, metrics, lastAggregation, recentCount: recent.length });
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
});

// Server-Sent Events stream for real-time security events
router.get('/stream', async (req, res) => {
	// SSE headers
	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Connection', 'keep-alive');
	// Allow dev frontend to connect to SSE
	res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
	res.setHeader('Access-Control-Allow-Credentials', 'true');
	res.flushHeaders?.();

	const sendEvent = (event) => {
		res.write(`event: securityEvent\n`);
		res.write(`data: ${JSON.stringify(event)}\n\n`);
	};

	// Send initial snapshot
	try {
		const recent = securityEventService.getCachedEvents(50);
		res.write(`event: snapshot\n`);
		res.write(`data: ${JSON.stringify({ events: recent, metrics: securityEventService.getMetrics() })}\n\n`);
	} catch {}

	// Heartbeat to keep connection alive
	const heartbeat = setInterval(() => {
		res.write(`event: ping\n`);
		res.write(`data: {"ts": ${Date.now()}}\n\n`);
	}, 25000);

	// Subscribe to events
	const listener = (event) => sendEvent(event);
	securityEventService.securityEmitter.on('securityEvent', listener);

	// Cleanup on client disconnect
	req.on('close', () => {
		clearInterval(heartbeat);
		securityEventService.securityEmitter.off('securityEvent', listener);
		// Avoid ending the response here to prevent header/state errors on some proxies
	});
});

export default router;
