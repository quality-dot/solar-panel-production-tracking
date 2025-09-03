import assert from 'assert';
import { AbuseIpdbClient } from '../utils/abuseIpdbClient.js';

const client = new AbuseIpdbClient({ apiKey: '' }); // force fallback

const run = async () => {
  const res = await client.checkIp('8.8.8.8');
  assert(res.provider === 'abuseipdb');
  assert(res.supported === false, 'Should fallback without API key');
  assert(res.isMalicious === false);
  console.log('AbuseIPDB client fallback test passed:', res.reason);
};

run();
