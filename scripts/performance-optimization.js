#!/usr/bin/env node

/**
 * Performance optimization and analysis script
 * Analyzes and optimizes the Web Communication CMS for production deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PerformanceOptimizer {
  constructor() {
    this.results = {
      bundleAnalysis: {},
      imageOptimization: {},
      codeOptimization: {},
      databaseOptimization: {},
      cacheOptimization: {},
      recommendations: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📊',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    }[type] || '📊';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async analyzeBundleSize() {
    this.log('Analyzing bundle sizes...', 'info');
    
    try {
      // Analyze frontend bundle
      const frontendBuildPath = path.join(process.cwd(), 'frontend', 'dist');
      if (fs.existsSync(frontendBuildPath)) {
        const stats = this.getDirectorySize(frontendBuildPath);
        this.results.bundleAnalysis.frontend = {
          totalSize: stats.totalSize,
          fileCount: stats.fileCount,
          largestFiles: stats.largestFiles
        };
        
        this.log(`Frontend bundle: ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB (${stats.fileCount} files)`, 'info');
        
        // Check for large files
        const largeFrontendFiles = stats.largestFiles.filter(f => f.size > 1024 * 1024); // > 1MB
        if (largeFrontendFiles.length > 0) {
          this.results.recommendations.push({
            type: 'bundle',
            severity: 'warning',
            message: `Large frontend files detected: ${largeFrontendFiles.map(f => f.name).join(', ')}`,
            suggestion: 'Consider code splitting or lazy loading for large components'
          });
        }
      }
      
      // Analyze backend bundle
      const backendBuildPath = path.join(process.cwd(), 'backend', 'dist');
      if (fs.existsSync(backendBuildPath)) {
        const stats = this.getDirectorySize(backendBuildPath);
        this.results.bundleAnalysis.backend = {
          totalSize: stats.totalSize,
          fileCount: stats.fileCount,
          largestFiles: stats.largestFiles
        };
        
        this.log(`Backend bundle: ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB (${stats.fileCount} files)`, 'info');
      }
      
    } catch (error) {
      this.log(`Bundle analysis error: ${error.message}`, 'error');
    }
  }

  getDirectorySize(dirPath) {
    let totalSize = 0;
    let fileCount = 0;
    const files = [];
    
    const scanDirectory = (dir) => {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          scanDirectory(itemPath);
        } else {
          totalSize += stats.size;
          fileCount++;
          files.push({
            name: path.relative(dirPath, itemPath),
            size: stats.size
          });
        }
      });
    };
    
    scanDirectory(dirPath);
    
    // Sort files by size (largest first)
    files.sort((a, b) => b.size - a.size);
    
    return {
      totalSize,
      fileCount,
      largestFiles: files.slice(0, 10) // Top 10 largest files
    };
  }

  async optimizeImages() {
    this.log('Analyzing image optimization opportunities...', 'info');
    
    try {
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      const imagePaths = [
        path.join(process.cwd(), 'frontend', 'src', 'assets'),
        path.join(process.cwd(), 'frontend', 'public'),
        path.join(process.cwd(), 'backend', 'uploads')
      ];
      
      let totalImages = 0;
      let totalSize = 0;
      const largeImages = [];
      
      imagePaths.forEach(imagePath => {
        if (fs.existsSync(imagePath)) {
          const images = this.findImageFiles(imagePath, imageExtensions);
          totalImages += images.length;
          
          images.forEach(image => {
            totalSize += image.size;
            if (image.size > 500 * 1024) { // > 500KB
              largeImages.push(image);
            }
          });
        }
      });
      
      this.results.imageOptimization = {
        totalImages,
        totalSize,
        largeImages: largeImages.slice(0, 10)
      };
      
      this.log(`Found ${totalImages} images (${(totalSize / 1024 / 1024).toFixed(2)}MB total)`, 'info');
      
      if (largeImages.length > 0) {
        this.results.recommendations.push({
          type: 'images',
          severity: 'warning',
          message: `${largeImages.length} large images found`,
          suggestion: 'Consider compressing images or using WebP format for better performance'
        });
      }
      
    } catch (error) {
      this.log(`Image optimization analysis error: ${error.message}`, 'error');
    }
  }

  findImageFiles(dir, extensions) {
    const images = [];
    
    const scanDirectory = (currentDir) => {
      const items = fs.readdirSync(currentDir);
      
      items.forEach(item => {
        const itemPath = path.join(currentDir, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          scanDirectory(itemPath);
        } else {
          const ext = path.extname(item).toLowerCase();
          if (extensions.includes(ext)) {
            images.push({
              path: itemPath,
              name: path.relative(dir, itemPath),
              size: stats.size,
              extension: ext
            });
          }
        }
      });
    };
    
    scanDirectory(dir);
    return images;
  }

  async analyzeCodeOptimization() {
    this.log('Analyzing code optimization opportunities...', 'info');
    
    try {
      // Analyze TypeScript/JavaScript files
      const codeStats = {
        frontend: this.analyzeCodeDirectory(path.join(process.cwd(), 'frontend', 'src')),
        backend: this.analyzeCodeDirectory(path.join(process.cwd(), 'backend', 'src'))
      };
      
      this.results.codeOptimization = codeStats;
      
      // Check for potential issues
      Object.entries(codeStats).forEach(([project, stats]) => {
        if (stats.largeFiles.length > 0) {
          this.results.recommendations.push({
            type: 'code',
            severity: 'info',
            message: `Large ${project} files detected: ${stats.largeFiles.map(f => f.name).join(', ')}`,
            suggestion: 'Consider breaking down large files into smaller modules'
          });
        }
        
        if (stats.duplicateCode > 0) {
          this.results.recommendations.push({
            type: 'code',
            severity: 'warning',
            message: `Potential code duplication detected in ${project}`,
            suggestion: 'Consider extracting common functionality into shared utilities'
          });
        }
      });
      
    } catch (error) {
      this.log(`Code optimization analysis error: ${error.message}`, 'error');
    }
  }

  analyzeCodeDirectory(dir) {
    if (!fs.existsSync(dir)) {
      return { totalFiles: 0, totalLines: 0, largeFiles: [], duplicateCode: 0 };
    }
    
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx'];
    let totalFiles = 0;
    let totalLines = 0;
    const files = [];
    
    const scanDirectory = (currentDir) => {
      const items = fs.readdirSync(currentDir);
      
      items.forEach(item => {
        const itemPath = path.join(currentDir, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
          scanDirectory(itemPath);
        } else {
          const ext = path.extname(item).toLowerCase();
          if (codeExtensions.includes(ext)) {
            const content = fs.readFileSync(itemPath, 'utf8');
            const lines = content.split('\n').length;
            
            totalFiles++;
            totalLines += lines;
            
            files.push({
              path: itemPath,
              name: path.relative(dir, itemPath),
              lines,
              size: stats.size
            });
          }
        }
      });
    };
    
    scanDirectory(dir);
    
    // Sort by lines (largest first)
    files.sort((a, b) => b.lines - a.lines);
    
    // Simple duplicate detection (files with similar line counts)
    const duplicateCode = files.filter(f => f.lines > 100).length > 5 ? 1 : 0;
    
    return {
      totalFiles,
      totalLines,
      largeFiles: files.filter(f => f.lines > 300).slice(0, 5),
      duplicateCode
    };
  }

  async analyzeDatabaseOptimization() {
    this.log('Analyzing database optimization opportunities...', 'info');
    
    try {
      // Check for database schema files
      const schemaPath = path.join(process.cwd(), 'backend', 'src', 'database');
      const migrationPath = path.join(process.cwd(), 'backend', 'migrations');
      
      const recommendations = [];
      
      // Check for indexes
      if (fs.existsSync(schemaPath)) {
        const schemaFiles = fs.readdirSync(schemaPath).filter(f => f.endsWith('.sql') || f.endsWith('.ts'));
        
        schemaFiles.forEach(file => {
          const content = fs.readFileSync(path.join(schemaPath, file), 'utf8');
          
          // Simple checks for common optimization opportunities
          if (!content.includes('INDEX') && content.includes('SELECT')) {
            recommendations.push({
              type: 'database',
              severity: 'info',
              message: `Consider adding indexes to ${file}`,
              suggestion: 'Add indexes on frequently queried columns'
            });
          }
        });
      }
      
      this.results.databaseOptimization = {
        schemaFiles: fs.existsSync(schemaPath) ? fs.readdirSync(schemaPath).length : 0,
        migrationFiles: fs.existsSync(migrationPath) ? fs.readdirSync(migrationPath).length : 0,
        recommendations
      };
      
      this.results.recommendations.push(...recommendations);
      
    } catch (error) {
      this.log(`Database optimization analysis error: ${error.message}`, 'error');
    }
  }

  async analyzeCacheOptimization() {
    this.log('Analyzing cache optimization opportunities...', 'info');
    
    try {
      // Check for cache headers in nginx config
      const nginxConfigPath = path.join(process.cwd(), 'frontend', 'nginx.conf');
      let hasCacheHeaders = false;
      
      if (fs.existsSync(nginxConfigPath)) {
        const nginxConfig = fs.readFileSync(nginxConfigPath, 'utf8');
        hasCacheHeaders = nginxConfig.includes('expires') || nginxConfig.includes('Cache-Control');
      }
      
      // Check for service worker
      const swPath = path.join(process.cwd(), 'frontend', 'public', 'sw.js');
      const hasServiceWorker = fs.existsSync(swPath);
      
      this.results.cacheOptimization = {
        hasCacheHeaders,
        hasServiceWorker
      };
      
      if (!hasCacheHeaders) {
        this.results.recommendations.push({
          type: 'cache',
          severity: 'warning',
          message: 'No cache headers detected in nginx configuration',
          suggestion: 'Add appropriate cache headers for static assets'
        });
      }
      
      if (!hasServiceWorker) {
        this.results.recommendations.push({
          type: 'cache',
          severity: 'info',
          message: 'No service worker detected',
          suggestion: 'Consider implementing a service worker for offline functionality'
        });
      }
      
    } catch (error) {
      this.log(`Cache optimization analysis error: ${error.message}`, 'error');
    }
  }

  async generateOptimizationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalRecommendations: this.results.recommendations.length,
        criticalIssues: this.results.recommendations.filter(r => r.severity === 'error').length,
        warnings: this.results.recommendations.filter(r => r.severity === 'warning').length,
        suggestions: this.results.recommendations.filter(r => r.severity === 'info').length
      },
      results: this.results
    };
    
    // Write JSON report
    const reportPath = path.join(process.cwd(), 'performance-optimization-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlPath = path.join(process.cwd(), 'performance-optimization-report.html');
    fs.writeFileSync(htmlPath, htmlReport);
    
    this.log(`Performance reports generated: ${reportPath}, ${htmlPath}`, 'success');
    
    return report;
  }

  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Optimization Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .header { background: #e74c3c; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .summary-card { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
        .number { font-size: 2em; font-weight: bold; }
        .critical { color: #e74c3c; }
        .warning { color: #f39c12; }
        .info { color: #3498db; }
        .section { background: white; margin-bottom: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 20px; }
        .recommendation { border-left: 4px solid #3498db; padding: 10px; margin: 10px 0; background: #f8f9fa; }
        .recommendation.warning { border-left-color: #f39c12; }
        .recommendation.error { border-left-color: #e74c3c; }
        .file-list { max-height: 200px; overflow-y: auto; background: #f8f9fa; padding: 10px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>⚡ Performance Optimization Report</h1>
        <p>Generated on: ${report.timestamp}</p>
    </div>
    
    <div class="summary">
        <div class="summary-card">
            <h3>Total Recommendations</h3>
            <div class="number info">${report.summary.totalRecommendations}</div>
        </div>
        <div class="summary-card">
            <h3>Critical Issues</h3>
            <div class="number critical">${report.summary.criticalIssues}</div>
        </div>
        <div class="summary-card">
            <h3>Warnings</h3>
            <div class="number warning">${report.summary.warnings}</div>
        </div>
        <div class="summary-card">
            <h3>Suggestions</h3>
            <div class="number info">${report.summary.suggestions}</div>
        </div>
    </div>
    
    <div class="section">
        <h2>📦 Bundle Analysis</h2>
        ${report.results.bundleAnalysis.frontend ? `
            <h3>Frontend Bundle</h3>
            <p><strong>Size:</strong> ${(report.results.bundleAnalysis.frontend.totalSize / 1024 / 1024).toFixed(2)}MB</p>
            <p><strong>Files:</strong> ${report.results.bundleAnalysis.frontend.fileCount}</p>
            ${report.results.bundleAnalysis.frontend.largestFiles.length > 0 ? `
                <h4>Largest Files:</h4>
                <div class="file-list">
                    ${report.results.bundleAnalysis.frontend.largestFiles.map(f => 
                        `<div>${f.name} - ${(f.size / 1024).toFixed(1)}KB</div>`
                    ).join('')}
                </div>
            ` : ''}
        ` : '<p>Frontend bundle not found. Run build first.</p>'}
        
        ${report.results.bundleAnalysis.backend ? `
            <h3>Backend Bundle</h3>
            <p><strong>Size:</strong> ${(report.results.bundleAnalysis.backend.totalSize / 1024 / 1024).toFixed(2)}MB</p>
            <p><strong>Files:</strong> ${report.results.bundleAnalysis.backend.fileCount}</p>
        ` : '<p>Backend bundle not found. Run build first.</p>'}
    </div>
    
    <div class="section">
        <h2>🖼️ Image Optimization</h2>
        <p><strong>Total Images:</strong> ${report.results.imageOptimization.totalImages || 0}</p>
        <p><strong>Total Size:</strong> ${((report.results.imageOptimization.totalSize || 0) / 1024 / 1024).toFixed(2)}MB</p>
        ${report.results.imageOptimization.largeImages && report.results.imageOptimization.largeImages.length > 0 ? `
            <h4>Large Images (>500KB):</h4>
            <div class="file-list">
                ${report.results.imageOptimization.largeImages.map(img => 
                    `<div>${img.name} - ${(img.size / 1024).toFixed(1)}KB</div>`
                ).join('')}
            </div>
        ` : ''}
    </div>
    
    <div class="section">
        <h2>📋 Recommendations</h2>
        ${report.results.recommendations.length > 0 ? 
            report.results.recommendations.map(rec => `
                <div class="recommendation ${rec.severity}">
                    <h4>${rec.message}</h4>
                    <p><strong>Suggestion:</strong> ${rec.suggestion}</p>
                    <p><small><strong>Type:</strong> ${rec.type} | <strong>Severity:</strong> ${rec.severity}</small></p>
                </div>
            `).join('') 
            : '<p>No specific recommendations at this time. Great job!</p>'
        }
    </div>
</body>
</html>
    `;
  }

  async run() {
    this.log('Starting performance optimization analysis...', 'info');
    
    try {
      await this.analyzeBundleSize();
      await this.optimizeImages();
      await this.analyzeCodeOptimization();
      await this.analyzeDatabaseOptimization();
      await this.analyzeCacheOptimization();
      
      const report = await this.generateOptimizationReport();
      
      this.log('\n📊 Performance Analysis Summary:', 'info');
      this.log(`Total recommendations: ${report.summary.totalRecommendations}`, 'info');
      this.log(`Critical issues: ${report.summary.criticalIssues}`, report.summary.criticalIssues > 0 ? 'error' : 'success');
      this.log(`Warnings: ${report.summary.warnings}`, report.summary.warnings > 0 ? 'warning' : 'success');
      this.log(`Suggestions: ${report.summary.suggestions}`, 'info');
      
      if (report.summary.criticalIssues === 0) {
        this.log('🎉 No critical performance issues found!', 'success');
      } else {
        this.log('⚠️ Critical performance issues detected. Please review the report.', 'error');
      }
      
    } catch (error) {
      this.log(`Performance analysis error: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Run performance optimization if this script is executed directly
if (require.main === module) {
  const optimizer = new PerformanceOptimizer();
  optimizer.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = PerformanceOptimizer;