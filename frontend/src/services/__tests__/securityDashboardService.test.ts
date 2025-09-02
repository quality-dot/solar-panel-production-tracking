import { vi, expect, test, beforeEach } from 'vitest';
import securityDashboardService from '../securityDashboardService';

beforeEach(() => {
  // @ts-expect-error allow override
  global.fetch = vi.fn();
});

test('getRecentSecurityEvents maps API rows to SecurityEvent[]', async () => {
  const rows = [
    { id: 10, event_type: 'user.login.failed', severity: 'warning', timestamp: '2025-01-27T14:30:00Z', user_id: 'u1', source: 'api', correlation_id: 'c1', event_data: { attempts: 1 } }
  ];
  (global.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ events: rows }) });

  const events = await securityDashboardService.getRecentSecurityEvents(1);
  expect(events.length).toBe(1);
  expect(events[0]).toMatchObject({
    id: '10', eventType: 'user.login.failed', severity: 'warning', userId: 'u1', source: 'api', correlationId: 'c1'
  });
});
