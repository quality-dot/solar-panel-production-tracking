/**
 * StatisticalAnalyzer - Advanced statistical analysis for anomaly detection
 * Provides comprehensive statistical functions for pattern analysis and anomaly detection
 */

class StatisticalAnalyzer {
  constructor(options = {}) {
    this.options = {
      windowSize: options.windowSize || 100,
      sensitivity: options.sensitivity || 2.0, // Standard deviations for anomaly detection
      minDataPoints: options.minDataPoints || 10,
      enableTrendAnalysis: options.enableTrendAnalysis !== false,
      enableSeasonalityDetection: options.enableSeasonalityDetection !== false,
      ...options
    };
    
    this.dataWindows = new Map(); // Store data windows for different metrics
    this.baselines = new Map(); // Store baseline statistics
    this.anomalyHistory = new Map(); // Store anomaly detection history
  }

  /**
   * Add data point to a specific metric window
   */
  addDataPoint(metricName, value, timestamp = Date.now()) {
    if (!this.dataWindows.has(metricName)) {
      this.dataWindows.set(metricName, []);
    }

    const window = this.dataWindows.get(metricName);
    window.push({ value, timestamp });

    // Maintain window size
    if (window.length > this.options.windowSize) {
      window.shift();
    }

    // Update baseline if we have enough data
    if (window.length >= this.options.minDataPoints) {
      this.updateBaseline(metricName);
    }

    return this;
  }

  /**
   * Calculate basic statistics for a dataset
   */
  calculateStatistics(data) {
    if (!data || data.length === 0) {
      return null;
    }

    const values = data.map(d => typeof d === 'object' ? d.value : d);
    const sorted = [...values].sort((a, b) => a - b);
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);
    
    const median = this.calculateMedian(sorted);
    const q1 = this.calculatePercentile(sorted, 25);
    const q3 = this.calculatePercentile(sorted, 75);
    const iqr = q3 - q1;
    
    return {
      count: values.length,
      mean,
      median,
      standardDeviation,
      variance,
      min: Math.min(...values),
      max: Math.max(...values),
      range: Math.max(...values) - Math.min(...values),
      q1,
      q3,
      iqr,
      skewness: this.calculateSkewness(values, mean, standardDeviation),
      kurtosis: this.calculateKurtosis(values, mean, standardDeviation)
    };
  }

  /**
   * Calculate median value
   */
  calculateMedian(sortedData) {
    const n = sortedData.length;
    if (n % 2 === 0) {
      return (sortedData[n / 2 - 1] + sortedData[n / 2]) / 2;
    } else {
      return sortedData[Math.floor(n / 2)];
    }
  }

  /**
   * Calculate percentile
   */
  calculatePercentile(sortedData, percentile) {
    const index = (percentile / 100) * (sortedData.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (upper >= sortedData.length) {
      return sortedData[sortedData.length - 1];
    }

    return sortedData[lower] * (1 - weight) + sortedData[upper] * weight;
  }

  /**
   * Calculate skewness (measure of asymmetry)
   */
  calculateSkewness(values, mean, standardDeviation) {
    if (standardDeviation === 0) return 0;
    
    const n = values.length;
    const skewness = values.reduce((sum, val) => {
      return sum + Math.pow((val - mean) / standardDeviation, 3);
    }, 0) / n;
    
    return skewness;
  }

  /**
   * Calculate kurtosis (measure of tail heaviness)
   */
  calculateKurtosis(values, mean, standardDeviation) {
    if (standardDeviation === 0) return 0;
    
    const n = values.length;
    const kurtosis = values.reduce((sum, val) => {
      return sum + Math.pow((val - mean) / standardDeviation, 4);
    }, 0) / n;
    
    return kurtosis - 3; // Excess kurtosis
  }

  /**
   * Update baseline statistics for a metric
   */
  updateBaseline(metricName) {
    const window = this.dataWindows.get(metricName);
    if (!window || window.length < this.options.minDataPoints) {
      return;
    }

    const stats = this.calculateStatistics(window);
    if (stats) {
      this.baselines.set(metricName, {
        ...stats,
        lastUpdated: Date.now(),
        dataPoints: window.length
      });
    }
  }

  /**
   * Detect anomalies using statistical methods
   */
  detectAnomalies(metricName, value, timestamp = Date.now()) {
    const baseline = this.baselines.get(metricName);
    if (!baseline) {
      return {
        isAnomaly: false,
        reason: 'Insufficient baseline data',
        confidence: 0
      };
    }

    const anomalies = [];
    let maxConfidence = 0;

    // Z-Score anomaly detection
    const zScore = Math.abs((value - baseline.mean) / baseline.standardDeviation);
    if (zScore > this.options.sensitivity) {
      anomalies.push({
        type: 'z-score',
        severity: this.getSeverityFromZScore(zScore),
        confidence: Math.min(zScore / this.options.sensitivity, 1.0),
        details: {
          zScore,
          threshold: this.options.sensitivity,
          mean: baseline.mean,
          standardDeviation: baseline.standardDeviation
        }
      });
      maxConfidence = Math.max(maxConfidence, Math.min(zScore / this.options.sensitivity, 1.0));
    }

    // IQR anomaly detection
    const iqrLower = baseline.q1 - 1.5 * baseline.iqr;
    const iqrUpper = baseline.q3 + 1.5 * baseline.iqr;
    if (value < iqrLower || value > iqrUpper) {
      const distance = value < iqrLower ? 
        (iqrLower - value) / baseline.iqr : 
        (value - iqrUpper) / baseline.iqr;
      
      anomalies.push({
        type: 'iqr',
        severity: this.getSeverityFromDistance(distance),
        confidence: Math.min(distance / 2, 1.0),
        details: {
          value,
          iqrLower,
          iqrUpper,
          q1: baseline.q1,
          q3: baseline.q3,
          iqr: baseline.iqr
        }
      });
      maxConfidence = Math.max(maxConfidence, Math.min(distance / 2, 1.0));
    }

    // Trend anomaly detection
    if (this.options.enableTrendAnalysis) {
      const trendAnomaly = this.detectTrendAnomaly(metricName, value, timestamp);
      if (trendAnomaly.isAnomaly) {
        anomalies.push(trendAnomaly);
        maxConfidence = Math.max(maxConfidence, trendAnomaly.confidence);
      }
    }

    // Store anomaly in history
    if (anomalies.length > 0) {
      this.addAnomalyToHistory(metricName, {
        value,
        timestamp,
        anomalies,
        confidence: maxConfidence
      });
    }

    return {
      isAnomaly: anomalies.length > 0,
      anomalies,
      confidence: maxConfidence,
      baseline: {
        mean: baseline.mean,
        standardDeviation: baseline.standardDeviation,
        lastUpdated: baseline.lastUpdated
      }
    };
  }

  /**
   * Detect trend anomalies
   */
  detectTrendAnomaly(metricName, value, timestamp) {
    const window = this.dataWindows.get(metricName);
    if (!window || window.length < 5) {
      return { isAnomaly: false };
    }

    // Calculate recent trend
    const recentData = window.slice(-5);
    const trend = this.calculateTrend(recentData);
    
    // Check for sudden trend changes
    const baseline = this.baselines.get(metricName);
    if (baseline && Math.abs(trend.slope) > baseline.standardDeviation * 2) {
      return {
        type: 'trend',
        severity: 'high',
        confidence: Math.min(Math.abs(trend.slope) / (baseline.standardDeviation * 2), 1.0),
        details: {
          slope: trend.slope,
          rSquared: trend.rSquared,
          baselineStdDev: baseline.standardDeviation
        }
      };
    }

    return { isAnomaly: false };
  }

  /**
   * Calculate trend using linear regression
   */
  calculateTrend(data) {
    const n = data.length;
    const xValues = data.map((_, index) => index);
    const yValues = data.map(d => d.value);

    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = yValues.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
    const sumYY = yValues.reduce((sum, y) => sum + y * y, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssRes = yValues.reduce((sum, y, i) => {
      const predicted = slope * xValues[i] + intercept;
      return sum + Math.pow(y - predicted, 2);
    }, 0);
    const ssTot = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);

    return { slope, intercept, rSquared };
  }

  /**
   * Get severity level from Z-score
   */
  getSeverityFromZScore(zScore) {
    if (zScore >= 4) return 'critical';
    if (zScore >= 3) return 'high';
    if (zScore >= 2) return 'medium';
    return 'low';
  }

  /**
   * Get severity level from distance
   */
  getSeverityFromDistance(distance) {
    if (distance >= 3) return 'critical';
    if (distance >= 2) return 'high';
    if (distance >= 1) return 'medium';
    return 'low';
  }

  /**
   * Add anomaly to history
   */
  addAnomalyToHistory(metricName, anomalyData) {
    if (!this.anomalyHistory.has(metricName)) {
      this.anomalyHistory.set(metricName, []);
    }

    const history = this.anomalyHistory.get(metricName);
    history.push(anomalyData);

    // Keep only recent anomalies (last 100)
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get anomaly history for a metric
   */
  getAnomalyHistory(metricName, limit = 50) {
    const history = this.anomalyHistory.get(metricName) || [];
    return history.slice(-limit);
  }

  /**
   * Get baseline statistics for a metric
   */
  getBaseline(metricName) {
    return this.baselines.get(metricName);
  }

  /**
   * Get all baselines
   */
  getAllBaselines() {
    return Object.fromEntries(this.baselines);
  }

  /**
   * Reset baseline for a metric
   */
  resetBaseline(metricName) {
    this.baselines.delete(metricName);
    this.dataWindows.delete(metricName);
    this.anomalyHistory.delete(metricName);
  }

  /**
   * Get current data window for a metric
   */
  getDataWindow(metricName) {
    return this.dataWindows.get(metricName) || [];
  }

  /**
   * Calculate correlation between two metrics
   */
  calculateCorrelation(metricName1, metricName2) {
    const window1 = this.dataWindows.get(metricName1);
    const window2 = this.dataWindows.get(metricName2);

    if (!window1 || !window2 || window1.length !== window2.length) {
      return null;
    }

    const n = window1.length;
    const values1 = window1.map(d => d.value);
    const values2 = window2.map(d => d.value);

    const mean1 = values1.reduce((sum, val) => sum + val, 0) / n;
    const mean2 = values2.reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let sumSq1 = 0;
    let sumSq2 = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = values1[i] - mean1;
      const diff2 = values2[i] - mean2;
      numerator += diff1 * diff2;
      sumSq1 += diff1 * diff1;
      sumSq2 += diff2 * diff2;
    }

    const denominator = Math.sqrt(sumSq1 * sumSq2);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Detect seasonality in data
   */
  detectSeasonality(metricName, period = 24) {
    const window = this.dataWindows.get(metricName);
    if (!window || window.length < period * 2) {
      return { hasSeasonality: false };
    }

    const values = window.map(d => d.value);
    const n = values.length;
    
    // Calculate autocorrelation for the given period
    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    
    let autocorrelation = 0;
    for (let i = 0; i < n - period; i++) {
      autocorrelation += (values[i] - mean) * (values[i + period] - mean);
    }
    autocorrelation /= (n - period) * variance;

    return {
      hasSeasonality: Math.abs(autocorrelation) > 0.3,
      autocorrelation,
      period,
      strength: Math.abs(autocorrelation)
    };
  }

  /**
   * Get comprehensive analysis for a metric
   */
  getAnalysis(metricName) {
    const baseline = this.getBaseline(metricName);
    const window = this.getDataWindow(metricName);
    const anomalyHistory = this.getAnomalyHistory(metricName);
    const seasonality = this.detectSeasonality(metricName);

    return {
      metricName,
      baseline,
      currentWindow: {
        size: window.length,
        latestValue: window.length > 0 ? window[window.length - 1].value : null,
        latestTimestamp: window.length > 0 ? window[window.length - 1].timestamp : null
      },
      anomalyHistory: {
        count: anomalyHistory.length,
        recent: anomalyHistory.slice(-5)
      },
      seasonality,
      recommendations: this.generateRecommendations(baseline, anomalyHistory, seasonality)
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(baseline, anomalyHistory, seasonality) {
    const recommendations = [];

    if (!baseline) {
      recommendations.push('Collect more data to establish baseline');
      return recommendations;
    }

    if (anomalyHistory.length > 10) {
      recommendations.push('High anomaly frequency detected - investigate root cause');
    }

    if (baseline.standardDeviation > baseline.mean * 0.5) {
      recommendations.push('High variability detected - consider data quality improvements');
    }

    if (seasonality.hasSeasonality) {
      recommendations.push(`Seasonal pattern detected (period: ${seasonality.period}) - adjust thresholds accordingly`);
    }

    if (baseline.skewness > 2 || baseline.skewness < -2) {
      recommendations.push('Highly skewed distribution - consider log transformation');
    }

    return recommendations;
  }
}

export default StatisticalAnalyzer;
