// AbuseIPDB client (22.7) - optional external check with safe fallback
// ES module

export class AbuseIpdbClient {
	constructor(options = {}) {
		this.apiKey = options.apiKey || process.env.ABUSEIPDB_API_KEY || '';
		this.baseUrl = options.baseUrl || 'https://api.abuseipdb.com/api/v2';
	}

	isEnabled() {
		return !!this.apiKey;
	}

	async checkIp(ipAddress) {
		// Validate basic IPv4/IPv6 format (very lenient)
		if (!ipAddress || typeof ipAddress !== 'string') {
			return this._fallback(ipAddress, 'invalid_ip');
		}

		if (!this.isEnabled() || typeof fetch !== 'function') {
			return this._fallback(ipAddress, 'no_api_key');
		}

		try {
			const url = `${this.baseUrl}/check?ipAddress=${encodeURIComponent(ipAddress)}&maxAgeInDays=90`;
			const res = await fetch(url, {
				headers: {
					Accept: 'application/json',
					Key: this.apiKey
				}
			});
			if (!res.ok) {
				return this._fallback(ipAddress, `http_${res.status}`);
			}
			const data = await res.json();
			const d = data?.data || {};
			const score = Number(d.abuseConfidenceScore || 0);
			return {
				provider: 'abuseipdb',
				supported: true,
				ip: ipAddress,
				reputation: score,
				isMalicious: score >= 50,
				countryCode: d.countryCode || null,
				usageType: d.usageType || null,
				isp: d.isp || null,
				lastReportedAt: d.lastReportedAt || null
			};
		} catch (e) {
			return this._fallback(ipAddress, 'exception');
		}
	}

	_fallback(ipAddress, reason) {
		return {
			provider: 'abuseipdb',
			supported: false,
			ip: ipAddress || null,
			reputation: 0,
			isMalicious: false,
			reason
		};
	}
}

export default AbuseIpdbClient;
