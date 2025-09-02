import assert from 'assert';
import { StatisticalAnalyzer } from '../utils/statisticalAnalyzer.js';

// Basic sanity tests (invoke with: node backend/test/test-statistical-analyzer.js)
const values = [10, 12, 11, 13, 12, 200];
const mean = StatisticalAnalyzer.mean(values);
const std = StatisticalAnalyzer.stdDev(values);
const { outliers } = StatisticalAnalyzer.detectOutliers(values, 2.5);

assert(mean > 0, 'mean should be > 0');
assert(std > 0, 'std should be > 0');
assert(outliers.length >= 1, 'should detect at least one outlier');

console.log('StatisticalAnalyzer tests passed:', { mean, std, outliers: outliers.map(o => o.value) });
