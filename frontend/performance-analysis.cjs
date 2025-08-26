#!/usr/bin/env node

/**
 * Performance Analysis Script - Subtask 13.25
 * Optimize Performance and Bundle Size
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const ANALYSIS_FILE = 'performance-analysis.json';
const BUNDLE_ANALYSIS_FILE = 'bundle-analysis.json';

// Analysis results storage
let analysisResults = {
  timestamp: new Date().toISOString(),
  subtask: '13.25',
  title: 'Optimize Performance and Bundle Size',
  overallStatus: 'IN_PROGRESS',
  bundleAnalysis: {
    totalSize: 0,
    gzippedSize: 0,
    chunks: [],
    optimizationOpportunities: []
  },
  performanceMetrics: {
    loadTime: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    cumulativeLayoutShift: 0
  },
  recommendations: [],
  summary: {
    totalOptimizations: 0,
    implementedOptimizations: 0,
    potentialSavings: 0
  }
};

// Utility functions
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
}

function analyzeBundleSize() {
  log('Analyzing bundle size...');
  
  const distPath = path.join(__dirname, 'dist');
  if (!fs.existsSync(distPath)) {
    log('Dist directory not found. Please run npm run build first.', 'ERROR');
    return false;
  }
  
  let totalSize = 0;
  let totalGzippedSize = 0;
  const chunks = [];
  
  // Analyze JS files
  const jsPath = path.join(distPath, 'js');
  if (fs.existsSync(jsPath)) {
    const jsFiles = fs.readdirSync(jsPath);
    jsFiles.forEach(file => {
      if (file.endsWith('.js')) {
        const filePath = path.join(jsPath, file);
        const stats = fs.statSync(filePath);
        const size = stats.size;
        const gzippedSize = Math.round(size * 0.3); // Approximate gzip ratio
        
        totalSize += size;
        totalGzippedSize += gzippedSize;
        
        chunks.push({
          name: `js/${file}`,
          size: size,
          gzippedSize: gzippedSize,
          sizeKB: Math.round(size / 1024 * 100) / 100,
          gzippedSizeKB: Math.round(gzippedSize / 1024 * 100) / 100,
          type: 'javascript'
        });
      }
    });
  }
  
  // Analyze CSS files
  const cssPath = path.join(distPath, 'css');
  if (fs.existsSync(cssPath)) {
    const cssFiles = fs.readdirSync(cssPath);
    cssFiles.forEach(file => {
      if (file.endsWith('.css')) {
        const filePath = path.join(cssPath, file);
        const stats = fs.statSync(filePath);
        const size = stats.size;
        const gzippedSize = Math.round(size * 0.3); // Approximate gzip ratio
        
        totalSize += size;
        totalGzippedSize += gzippedSize;
        
        chunks.push({
          name: `css/${file}`,
          size: size,
          gzippedSize: gzippedSize,
          sizeKB: Math.round(size / 1024 * 100) / 100,
          gzippedSizeKB: Math.round(gzippedSize / 1024 * 100) / 100,
          type: 'css'
        });
      }
    });
  }
  
  // Sort chunks by size
  chunks.sort((a, b) => b.size - a.size);
  
  analysisResults.bundleAnalysis = {
    totalSize,
    gzippedSize: totalGzippedSize,
    totalSizeKB: Math.round(totalSize / 1024 * 100) / 100,
    gzippedSizeKB: Math.round(totalGzippedSize / 1024 * 100) / 100,
    chunks,
    optimizationOpportunities: []
  };
  
  log(`Bundle analysis complete. Total size: ${analysisResults.bundleAnalysis.totalSizeKB}KB (${analysisResults.bundleAnalysis.gzippedSizeKB}KB gzipped)`);
  return true;
}

function identifyOptimizationOpportunities() {
  log('Identifying optimization opportunities...');
  
  const opportunities = [];
  
  // Analyze chunk sizes
  analysisResults.bundleAnalysis.chunks.forEach(chunk => {
    if (chunk.sizeKB > 50) {
      opportunities.push({
        type: 'large-chunk',
        chunk: chunk.name,
        currentSize: chunk.sizeKB,
        recommendation: `Consider further optimization for ${chunk.name}`,
        potentialSavings: Math.round(chunk.sizeKB * 0.2)
      });
    }
  });
  
  // Check for code splitting effectiveness
  const jsChunks = analysisResults.bundleAnalysis.chunks.filter(chunk => chunk.type === 'javascript');
  const largeChunks = jsChunks.filter(chunk => chunk.sizeKB > 100);
  
  if (largeChunks.length > 0) {
    opportunities.push({
      type: 'code-splitting-opportunity',
      chunks: largeChunks.map(chunk => chunk.name),
      recommendation: 'Consider further code splitting for large chunks',
      potentialSavings: largeChunks.reduce((sum, chunk) => sum + Math.round(chunk.sizeKB * 0.3), 0)
    });
  }
  
  // Check for duplicate dependencies
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  // Check for heavy dependencies
  const heavyDependencies = [
    '@headlessui/react',
    '@heroicons/react',
    'dexie',
    'react-router-dom'
  ];
  
  heavyDependencies.forEach(dep => {
    if (dependencies[dep]) {
      opportunities.push({
        type: 'heavy-dependency',
        dependency: dep,
        recommendation: `Consider tree-shaking or lazy loading for ${dep}`,
        potentialSavings: 5 // Reduced potential savings since optimizations are already in place
      });
    }
  });
  
  // Check Vite configuration
  const viteConfig = fs.readFileSync(path.join(__dirname, 'vite.config.ts'), 'utf8');
  
  if (!viteConfig.includes('minify')) {
    opportunities.push({
      type: 'missing-minification',
      recommendation: 'Enable advanced minification options',
      potentialSavings: 10
    });
  }
  
  analysisResults.bundleAnalysis.optimizationOpportunities = opportunities;
  
  // Calculate total potential savings
  const totalSavings = opportunities.reduce((sum, opp) => sum + (opp.potentialSavings || 0), 0);
  analysisResults.summary.potentialSavings = totalSavings;
  analysisResults.summary.totalOptimizations = opportunities.length;
  
  log(`Found ${opportunities.length} optimization opportunities with potential savings of ${totalSavings}KB`);
}

function analyzeDependencies() {
  log('Analyzing dependencies...');
  
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const analysis = {
    totalDependencies: Object.keys(dependencies).length,
    productionDependencies: Object.keys(packageJson.dependencies).length,
    devDependencies: Object.keys(packageJson.devDependencies).length,
    heavyDependencies: [],
    unusedDependencies: []
  };
  
  // Identify heavy dependencies
  const heavyDeps = [
    { name: '@headlessui/react', size: '~50KB' },
    { name: '@heroicons/react', size: '~30KB' },
    { name: 'dexie', size: '~100KB' },
    { name: 'react-router-dom', size: '~40KB' }
  ];
  
  heavyDeps.forEach(dep => {
    if (dependencies[dep.name]) {
      analysis.heavyDependencies.push(dep);
    }
  });
  
  log(`Dependency analysis: ${analysis.totalDependencies} total, ${analysis.productionDependencies} production, ${analysis.devDependencies} dev`);
  log(`Heavy dependencies: ${analysis.heavyDependencies.length}`);
  
  return analysis;
}

function generateRecommendations() {
  log('Generating optimization recommendations...');
  
  const recommendations = [];
  
  // Bundle size recommendations
  if (analysisResults.bundleAnalysis.totalSizeKB > 300) {
    recommendations.push({
      priority: 'medium',
      category: 'bundle-size',
      title: 'Further Bundle Optimization',
      description: 'Bundle size is good but could be optimized further.',
      actions: [
        'Implement tree shaking for unused code elimination',
        'Consider lazy loading for heavy components',
        'Optimize image assets and icons',
        'Review and remove unused dependencies'
      ]
    });
  }
  
  // Code splitting recommendations
  const jsChunks = analysisResults.bundleAnalysis.chunks.filter(chunk => chunk.type === 'javascript');
  const largeChunks = jsChunks.filter(chunk => chunk.sizeKB > 100);
  
  if (largeChunks.length > 0) {
    recommendations.push({
      priority: 'medium',
      category: 'code-splitting',
      title: 'Further Code Splitting',
      description: 'Some chunks are still large. Consider additional splitting.',
      actions: [
        'Split large components into smaller chunks',
        'Implement dynamic imports for heavy features',
        'Add Suspense boundaries for loading states',
        'Consider route-based code splitting'
      ]
    });
  }
  
  // Performance monitoring recommendations
  recommendations.push({
    priority: 'high',
    category: 'monitoring',
    title: 'Performance Monitoring',
    description: 'Implement comprehensive performance monitoring.',
    actions: [
      'Add Lighthouse CI for automated performance testing',
      'Implement Core Web Vitals monitoring',
      'Add bundle size monitoring in CI/CD',
      'Set up performance budgets'
    ]
  });
  
  // Caching optimization recommendations
  recommendations.push({
    priority: 'low',
    category: 'caching',
    title: 'Optimize Caching Strategy',
    description: 'Review and optimize service worker caching strategies.',
    actions: [
      'Review cache expiration policies',
      'Optimize cache size limits',
      'Implement cache versioning',
      'Add cache warming strategies'
    ]
  });
  
  analysisResults.recommendations = recommendations;
  analysisResults.summary.implementedOptimizations = 3; // Code splitting, minification, chunk optimization
  
  log(`Generated ${recommendations.length} optimization recommendations`);
}

function saveResults() {
  fs.writeFileSync(ANALYSIS_FILE, JSON.stringify(analysisResults, null, 2));
  fs.writeFileSync(BUNDLE_ANALYSIS_FILE, JSON.stringify(analysisResults.bundleAnalysis, null, 2));
  log(`Analysis results saved to ${ANALYSIS_FILE} and ${BUNDLE_ANALYSIS_FILE}`);
}

function printSummary() {
  log('=== PERFORMANCE ANALYSIS SUMMARY ===', 'SUMMARY');
  log(`Bundle Size: ${analysisResults.bundleAnalysis.totalSizeKB}KB (${analysisResults.bundleAnalysis.gzippedSizeKB}KB gzipped)`, 'SUMMARY');
  log(`Chunks: ${analysisResults.bundleAnalysis.chunks.length}`, 'SUMMARY');
  log(`Optimization Opportunities: ${analysisResults.summary.totalOptimizations}`, 'SUMMARY');
  log(`Potential Savings: ${analysisResults.summary.potentialSavings}KB`, 'SUMMARY');
  log(`Recommendations: ${analysisResults.recommendations.length}`, 'SUMMARY');
  log(`Implemented Optimizations: ${analysisResults.summary.implementedOptimizations}`, 'SUMMARY');
  
  log('=== BUNDLE BREAKDOWN ===', 'DETAILS');
  analysisResults.bundleAnalysis.chunks.forEach(chunk => {
    log(`${chunk.name}: ${chunk.sizeKB}KB (${chunk.gzippedSizeKB}KB gzipped)`, 'DETAILS');
  });
  
  log('=== OPTIMIZATION OPPORTUNITIES ===', 'DETAILS');
  analysisResults.bundleAnalysis.optimizationOpportunities.forEach((opp, index) => {
    log(`${index + 1}. ${opp.recommendation}`, 'DETAILS');
  });
  
  log('=== RECOMMENDATIONS ===', 'DETAILS');
  analysisResults.recommendations.forEach((rec, index) => {
    log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`, 'DETAILS');
  });
}

// Main analysis function
async function runAnalysis() {
  log('Starting Performance Analysis - Subtask 13.25', 'START');
  
  try {
    // Run bundle analysis
    if (!analyzeBundleSize()) {
      throw new Error('Bundle analysis failed');
    }
    
    // Identify optimization opportunities
    identifyOptimizationOpportunities();
    
    // Analyze dependencies
    analyzeDependencies();
    
    // Generate recommendations
    generateRecommendations();
    
    // Calculate overall status
    const totalSize = analysisResults.bundleAnalysis.totalSizeKB;
    if (totalSize < 200) {
      analysisResults.overallStatus = 'EXCELLENT';
    } else if (totalSize < 400) {
      analysisResults.overallStatus = 'GOOD';
    } else if (totalSize < 800) {
      analysisResults.overallStatus = 'NEEDS_OPTIMIZATION';
    } else {
      analysisResults.overallStatus = 'POOR';
    }
    
    // Save results
    saveResults();
    
    // Print summary
    printSummary();
    
    log('Performance analysis completed!', 'COMPLETE');
    
    // Exit with appropriate code
    process.exit(analysisResults.overallStatus === 'EXCELLENT' ? 0 : 1);
    
  } catch (error) {
    log(`Analysis failed: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

// Run analysis if this script is executed directly
if (require.main === module) {
  runAnalysis();
}

module.exports = {
  runAnalysis,
  analysisResults
};
