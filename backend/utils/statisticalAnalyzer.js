// StatisticalAnalyzer for anomaly detection (22.7)
// ES module

export class StatisticalAnalyzer {
	static sanitize(values) {
		return (values || []).map(Number).filter((v) => Number.isFinite(v));
	}

	static mean(values) {
		const nums = this.sanitize(values);
		if (nums.length === 0) return 0;
		return nums.reduce((a, b) => a + b, 0) / nums.length;
	}

	static variance(values) {
		const nums = this.sanitize(values);
		if (nums.length <= 1) return 0;
		const m = this.mean(nums);
		return nums.reduce((acc, v) => acc + Math.pow(v - m, 2), 0) / (nums.length - 1);
	}

	static stdDev(values) {
		return Math.sqrt(this.variance(values));
	}

	// Z-score based outlier detection
	static detectOutliers(values, threshold = 3) {
		const nums = this.sanitize(values);
		if (nums.length === 0) return { outliers: [], stats: { mean: 0, stdDev: 0 } };
		const mean = this.mean(nums);
		const std = this.stdDev(nums);
		if (std === 0) return { outliers: [], stats: { mean, stdDev: std } };
		const outliers = nums
			.map((v, idx) => ({ value: v, index: idx, z: Math.abs((v - mean) / std) }))
			.filter((x) => x.z >= threshold);
		return { outliers, stats: { mean, stdDev: std } };
	}

	// Rolling window anomaly: flag last point if beyond k*std from rolling mean
	static isLastPointAnomalous(values, k = 3) {
		const nums = this.sanitize(values);
		if (nums.length < 3) return { anomalous: false, stats: { mean: this.mean(nums), stdDev: this.stdDev(nums) } };
		const baseline = nums.slice(0, -1);
		const last = nums[nums.length - 1];
		const mean = this.mean(baseline);
		const std = this.stdDev(baseline);
		if (std === 0) return { anomalous: false, stats: { mean, stdDev: std, last } };
		const z = Math.abs((last - mean) / std);
		return { anomalous: z >= k, stats: { mean, stdDev: std, last, z } };
	}
}

export default StatisticalAnalyzer;
