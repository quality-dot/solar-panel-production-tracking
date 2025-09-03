// Export Service
// Provides comprehensive export capabilities for CSV, Excel, and PDF formats
// Task 10.4.4 - Build Export Capabilities for MO Reports (CSV, Excel, PDF)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import createCsvWriter from 'csv-writer';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { manufacturingLogger } from '../middleware/logger.js';
import historicalDataService from './historicalDataService.js';
import fbPanelReportingService from './fbPanelReportingService.js';
import productionMetricsService from './productionMetricsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ExportService {
  constructor() {
    this.logger = manufacturingLogger;
    this.exportDir = path.join(__dirname, '../exports');
    this.ensureExportDirectory();
  }

  /**
   * Ensure export directory exists
   */
  ensureExportDirectory() {
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  /**
   * Export manufacturing orders to CSV
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Export options
   * @returns {Object} Export result with file path
   */
  async exportManufacturingOrdersToCSV(filters = {}, options = {}) {
    try {
      const {
        includePanels = false,
        includeStatistics = true,
        customFields = []
      } = options;

      // Get historical data
      const historicalData = await historicalDataService.getHistoricalManufacturingOrders(filters, {
        page: 1,
        limit: 10000 // Large limit for export
      });

      const filename = `manufacturing_orders_${this.generateTimestamp()}.csv`;
      const filepath = path.join(this.exportDir, filename);

      // Define CSV headers
      const headers = [
        { id: 'id', title: 'ID' },
        { id: 'order_number', title: 'Order Number' },
        { id: 'panel_type', title: 'Panel Type' },
        { id: 'target_quantity', title: 'Target Quantity' },
        { id: 'completed_quantity', title: 'Completed Quantity' },
        { id: 'failed_quantity', title: 'Failed Quantity' },
        { id: 'in_progress_quantity', title: 'In Progress Quantity' },
        { id: 'status', title: 'Status' },
        { id: 'priority', title: 'Priority' },
        { id: 'customer_name', title: 'Customer Name' },
        { id: 'customer_po', title: 'Customer PO' },
        { id: 'created_by_username', title: 'Created By' },
        { id: 'created_at', title: 'Created At' },
        { id: 'started_at', title: 'Started At' },
        { id: 'completed_at', title: 'Completed At' },
        { id: 'completion_percentage', title: 'Completion %' },
        { id: 'failure_rate', title: 'Failure Rate %' },
        { id: 'duration_hours', title: 'Duration (Hours)' },
        { id: 'total_panels', title: 'Total Panels' },
        { id: 'avg_wattage', title: 'Avg Wattage' }
      ];

      // Add custom fields if specified
      if (customFields.length > 0) {
        customFields.forEach(field => {
          headers.push({ id: field, title: field.replace(/_/g, ' ').toUpperCase() });
        });
      }

      // Create CSV writer
      const csvWriter = createCsvWriter.createObjectCsvWriter({
        path: filepath,
        header: headers
      });

      // Prepare data for export
      const exportData = historicalData.data.map(mo => ({
        ...mo,
        created_at: this.formatDate(mo.created_at),
        started_at: this.formatDate(mo.started_at),
        completed_at: this.formatDate(mo.completed_at),
        completion_percentage: mo.completion_percentage || 0,
        failure_rate: mo.failure_rate || 0,
        duration_hours: mo.duration_hours || 0,
        total_panels: mo.total_panels || 0,
        avg_wattage: mo.avg_wattage || 0
      }));

      // Write CSV file
      await csvWriter.writeRecords(exportData);

      this.logger.info('Manufacturing orders exported to CSV', {
        filename,
        recordCount: exportData.length,
        filters
      });

      return {
        success: true,
        filename,
        filepath,
        recordCount: exportData.length,
        format: 'CSV',
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Failed to export manufacturing orders to CSV', {
        error: error.message,
        filters,
        options
      });
      throw error;
    }
  }

  /**
   * Export panels to CSV
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Export options
   * @returns {Object} Export result with file path
   */
  async exportPanelsToCSV(filters = {}, options = {}) {
    try {
      const {
        includeMOInfo = true,
        includeStationInfo = true,
        includeElectricalData = true
      } = options;

      // Get historical panel data
      const historicalData = await historicalDataService.getHistoricalPanels(filters, {
        page: 1,
        limit: 50000 // Large limit for export
      });

      const filename = `panels_${this.generateTimestamp()}.csv`;
      const filepath = path.join(this.exportDir, filename);

      // Define CSV headers
      const headers = [
        { id: 'id', title: 'Panel ID' },
        { id: 'barcode', title: 'Barcode' },
        { id: 'panel_type', title: 'Panel Type' },
        { id: 'frame_type', title: 'Frame Type' },
        { id: 'backsheet_type', title: 'Backsheet Type' },
        { id: 'line_assignment', title: 'Line Assignment' },
        { id: 'status', title: 'Status' },
        { id: 'rework_count', title: 'Rework Count' },
        { id: 'quality_notes', title: 'Quality Notes' },
        { id: 'created_at', title: 'Created At' },
        { id: 'completed_at', title: 'Completed At' }
      ];

      if (includeMOInfo) {
        headers.push(
          { id: 'order_number', title: 'MO Number' },
          { id: 'customer_name', title: 'Customer Name' },
          { id: 'customer_po', title: 'Customer PO' }
        );
      }

      if (includeStationInfo) {
        headers.push(
          { id: 'current_station_name', title: 'Current Station' },
          { id: 'station_1_completed_at', title: 'Station 1 Completed' },
          { id: 'station_2_completed_at', title: 'Station 2 Completed' },
          { id: 'station_3_completed_at', title: 'Station 3 Completed' },
          { id: 'station_4_completed_at', title: 'Station 4 Completed' }
        );
      }

      if (includeElectricalData) {
        headers.push(
          { id: 'wattage_pmax', title: 'Wattage (Pmax)' },
          { id: 'vmp', title: 'Vmp' },
          { id: 'imp', title: 'Imp' },
          { id: 'voc_theoretical', title: 'Voc Theoretical' },
          { id: 'isc_theoretical', title: 'Isc Theoretical' },
          { id: 'efficiency_percentage', title: 'Efficiency %' }
        );
      }

      // Create CSV writer
      const csvWriter = createCsvWriter.createObjectCsvWriter({
        path: filepath,
        header: headers
      });

      // Prepare data for export
      const exportData = historicalData.data.map(panel => ({
        ...panel,
        created_at: this.formatDate(panel.created_at),
        completed_at: this.formatDate(panel.completed_at),
        station_1_completed_at: this.formatDate(panel.station_1_completed_at),
        station_2_completed_at: this.formatDate(panel.station_2_completed_at),
        station_3_completed_at: this.formatDate(panel.station_3_completed_at),
        station_4_completed_at: this.formatDate(panel.station_4_completed_at),
        efficiency_percentage: panel.efficiency_percentage || 0
      }));

      // Write CSV file
      await csvWriter.writeRecords(exportData);

      this.logger.info('Panels exported to CSV', {
        filename,
        recordCount: exportData.length,
        filters
      });

      return {
        success: true,
        filename,
        filepath,
        recordCount: exportData.length,
        format: 'CSV',
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Failed to export panels to CSV', {
        error: error.message,
        filters,
        options
      });
      throw error;
    }
  }

  /**
   * Export F/B panel report to Excel
   * @param {number} moId - Manufacturing order ID
   * @param {Object} options - Export options
   * @returns {Object} Export result with file path
   */
  async exportFBReportToExcel(moId, options = {}) {
    try {
      const {
        includeDetails = true,
        includeReworkHistory = true,
        includeQualityAnalysis = true
      } = options;

      // Get F/B report data
      const fbReport = await fbPanelReportingService.generateFBReportByMO(moId, {
        includeDetails,
        includeReworkHistory,
        includeQualityAnalysis
      });

      const filename = `fb_report_mo_${moId}_${this.generateTimestamp()}.xlsx`;
      const filepath = path.join(this.exportDir, filename);

      // Create new workbook
      const workbook = XLSX.utils.book_new();

      // Sheet 1: MO Summary
      const moSummaryData = [
        ['Manufacturing Order Summary'],
        ['Order Number', fbReport.manufacturingOrder.order_number],
        ['Panel Type', fbReport.manufacturingOrder.panel_type],
        ['Target Quantity', fbReport.manufacturingOrder.target_quantity],
        ['Completed Quantity', fbReport.manufacturingOrder.completed_quantity],
        ['Failed Quantity', fbReport.manufacturingOrder.failed_quantity],
        ['Customer Name', fbReport.manufacturingOrder.customer_name],
        ['Customer PO', fbReport.manufacturingOrder.customer_po],
        ['Created At', this.formatDate(fbReport.manufacturingOrder.created_at)],
        ['Completed At', this.formatDate(fbReport.manufacturingOrder.completed_at)],
        [''],
        ['Failed Panel Statistics'],
        ['Total Failed Panels', fbReport.statistics.counts.totalFailed],
        ['Panels with Rework', fbReport.statistics.counts.withRework],
        ['Panels without Rework', fbReport.statistics.counts.withoutRework],
        ['Total Reworks', fbReport.statistics.counts.totalReworks],
        ['Average Reworks per Panel', fbReport.statistics.averages.reworksPerPanel]
      ];

      const moSummarySheet = XLSX.utils.aoa_to_sheet(moSummaryData);
      XLSX.utils.book_append_sheet(workbook, moSummarySheet, 'MO Summary');

      // Sheet 2: Failed Panels
      if (fbReport.failedPanels.length > 0) {
        const failedPanelsData = fbReport.failedPanels.map(panel => [
          panel.barcode,
          panel.panel_type,
          panel.frame_type,
          panel.backsheet_type,
          panel.line_assignment,
          panel.status,
          panel.rework_count,
          panel.rework_reason,
          panel.quality_notes,
          this.formatDate(panel.created_at),
          this.formatDate(panel.completed_at),
          panel.current_station_name
        ]);

        const headers = [
          'Barcode', 'Panel Type', 'Frame Type', 'Backsheet Type',
          'Line Assignment', 'Status', 'Rework Count', 'Rework Reason',
          'Quality Notes', 'Created At', 'Completed At', 'Current Station'
        ];

        const failedPanelsSheet = XLSX.utils.aoa_to_sheet([headers, ...failedPanelsData]);
        XLSX.utils.book_append_sheet(workbook, failedPanelsSheet, 'Failed Panels');
      }

      // Sheet 3: Station Breakdown
      if (fbReport.stationBreakdown) {
        const stationData = Object.entries(fbReport.stationBreakdown).map(([station, data]) => [
          station,
          data.totalInspections,
          data.failedInspections,
          data.passedInspections,
          data.failureRate
        ]);

        const stationHeaders = ['Station', 'Total Inspections', 'Failed Inspections', 'Passed Inspections', 'Failure Rate %'];
        const stationSheet = XLSX.utils.aoa_to_sheet([stationHeaders, ...stationData]);
        XLSX.utils.book_append_sheet(workbook, stationSheet, 'Station Breakdown');
      }

      // Sheet 4: Quality Analysis
      if (fbReport.qualityAnalysis) {
        const qualityData = [
          ['Quality Analysis'],
          ['Panels with Notes', fbReport.qualityAnalysis.documentation.panelsWithNotes],
          ['Panels without Notes', fbReport.qualityAnalysis.documentation.panelsWithoutNotes],
          ['Documentation Rate %', fbReport.qualityAnalysis.documentation.documentationRate],
          [''],
          ['Failure Patterns']
        ];

        Object.entries(fbReport.qualityAnalysis.failurePatterns).forEach(([pattern, count]) => {
          qualityData.push([pattern, count]);
        });

        const qualitySheet = XLSX.utils.aoa_to_sheet(qualityData);
        XLSX.utils.book_append_sheet(workbook, qualitySheet, 'Quality Analysis');
      }

      // Write Excel file
      XLSX.writeFile(workbook, filepath);

      this.logger.info('F/B report exported to Excel', {
        filename,
        moId,
        failedPanelsCount: fbReport.failedPanels.length
      });

      return {
        success: true,
        filename,
        filepath,
        recordCount: fbReport.failedPanels.length,
        format: 'Excel',
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Failed to export F/B report to Excel', {
        error: error.message,
        moId,
        options
      });
      throw error;
    }
  }

  /**
   * Export production metrics to PDF
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Export options
   * @returns {Object} Export result with file path
   */
  async exportProductionMetricsToPDF(filters = {}, options = {}) {
    try {
      const {
        includeCharts = false,
        includeRecommendations = true,
        includeDetailedMetrics = true
      } = options;

      // Get production metrics
      const metrics = await productionMetricsService.calculateProductionMetrics(filters);
      const realTimeMetrics = await productionMetricsService.getRealTimeMetrics(filters);

      const filename = `production_metrics_${this.generateTimestamp()}.pdf`;
      const filepath = path.join(this.exportDir, filename);

      // Create PDF document
      const doc = new jsPDF();
      let yPosition = 20;

      // Title
      doc.setFontSize(20);
      doc.text('Production Metrics Report', 20, yPosition);
      yPosition += 20;

      // Period information
      doc.setFontSize(12);
      doc.text(`Report Period: ${this.formatDate(filters.dateFrom)} to ${this.formatDate(filters.dateTo)}`, 20, yPosition);
      yPosition += 10;
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPosition);
      yPosition += 20;

      // Executive Summary
      doc.setFontSize(16);
      doc.text('Executive Summary', 20, yPosition);
      yPosition += 15;

      doc.setFontSize(10);
      const summaryData = [
        ['Metric', 'Value'],
        ['Total Panels', metrics.production.total_panels],
        ['Completed Panels', metrics.production.completed_panels],
        ['Failed Panels', metrics.production.failed_panels],
        ['Overall Equipment Effectiveness (OEE)', `${metrics.derived.kpis.oee}%`],
        ['First Pass Yield', `${metrics.derived.kpis.firstPassYield}%`],
        ['Failure Rate', `${metrics.derived.kpis.failureRate}%`],
        ['Rework Rate', `${metrics.derived.kpis.reworkRate}%`]
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [summaryData[0]],
        body: summaryData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });

      yPosition = doc.lastAutoTable.finalY + 20;

      // Production Statistics
      if (includeDetailedMetrics) {
        doc.setFontSize(16);
        doc.text('Production Statistics', 20, yPosition);
        yPosition += 15;

        const productionData = [
          ['Panel Type', 'Count'],
          ['Type 36', metrics.production.type_36_panels],
          ['Type 40', metrics.production.type_40_panels],
          ['Type 60', metrics.production.type_60_panels],
          ['Type 72', metrics.production.type_72_panels],
          ['Type 144', metrics.production.type_144_panels]
        ];

        autoTable(doc, {
          startY: yPosition,
          head: [productionData[0]],
          body: productionData.slice(1),
          theme: 'grid',
          headStyles: { fillColor: [52, 152, 219] }
        });

        yPosition = doc.lastAutoTable.finalY + 20;
      }

      // Station Performance
      if (metrics.station.stations.length > 0) {
        doc.setFontSize(16);
        doc.text('Station Performance', 20, yPosition);
        yPosition += 15;

        const stationData = metrics.station.stations.map(station => [
          station.name,
          station.total_panels_processed,
          station.completed_panels,
          station.failed_panels,
          `${station.efficiency}%`,
          `${station.failureRate}%`
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [['Station', 'Total Processed', 'Completed', 'Failed', 'Efficiency', 'Failure Rate']],
          body: stationData,
          theme: 'grid',
          headStyles: { fillColor: [46, 204, 113] }
        });

        yPosition = doc.lastAutoTable.finalY + 20;
      }

      // Quality Metrics
      doc.setFontSize(16);
      doc.text('Quality Metrics', 20, yPosition);
      yPosition += 15;

      const qualityData = [
        ['Metric', 'Value'],
        ['Pass Rate', `${metrics.quality.rates.passRate}%`],
        ['Failure Rate', `${metrics.quality.rates.failureRate}%`],
        ['Rework Rate', `${metrics.quality.rates.reworkRate}%`],
        ['First Pass Yield', `${metrics.quality.rates.firstPassYield}%`],
        ['Average Wattage', `${metrics.production.avg_wattage || 0}W`],
        ['Average Vmp', `${metrics.production.avg_vmp || 0}V`],
        ['Average Imp', `${metrics.production.avg_imp || 0}A`]
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [qualityData[0]],
        body: qualityData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [155, 89, 182] }
      });

      yPosition = doc.lastAutoTable.finalY + 20;

      // Recommendations
      if (includeRecommendations && metrics.derived.recommendations) {
        doc.setFontSize(16);
        doc.text('Recommendations', 20, yPosition);
        yPosition += 15;

        doc.setFontSize(10);
        metrics.derived.recommendations.forEach((rec, index) => {
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }
          
          doc.setFont(undefined, 'bold');
          doc.text(`${index + 1}. ${rec.type} (${rec.priority})`, 20, yPosition);
          yPosition += 8;
          
          doc.setFont(undefined, 'normal');
          doc.text(rec.message, 20, yPosition);
          yPosition += 8;
          
          doc.text(`Action: ${rec.action}`, 20, yPosition);
          yPosition += 15;
        });
      }

      // Save PDF
      doc.save(filepath);

      this.logger.info('Production metrics exported to PDF', {
        filename,
        filters
      });

      return {
        success: true,
        filename,
        filepath,
        format: 'PDF',
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Failed to export production metrics to PDF', {
        error: error.message,
        filters,
        options
      });
      throw error;
    }
  }

  /**
   * Export comprehensive report combining multiple data sources
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Export options
   * @returns {Object} Export result with file path
   */
  async exportComprehensiveReport(filters = {}, options = {}) {
    try {
      const {
        format = 'Excel', // 'Excel' or 'PDF'
        includeMOData = true,
        includePanelData = true,
        includeFBReports = true,
        includeMetrics = true
      } = options;

      const filename = `comprehensive_report_${this.generateTimestamp()}.${format.toLowerCase()}`;
      const filepath = path.join(this.exportDir, filename);

      if (format === 'Excel') {
        return await this.exportComprehensiveReportToExcel(filters, options, filename, filepath);
      } else if (format === 'PDF') {
        return await this.exportComprehensiveReportToPDF(filters, options, filename, filepath);
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }

    } catch (error) {
      this.logger.error('Failed to export comprehensive report', {
        error: error.message,
        filters,
        options
      });
      throw error;
    }
  }

  /**
   * Export comprehensive report to Excel
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Export options
   * @param {string} filename - Filename
   * @param {string} filepath - File path
   * @returns {Object} Export result
   */
  async exportComprehensiveReportToExcel(filters, options, filename, filepath) {
    const workbook = XLSX.utils.book_new();

    // Get all data
    const [moData, panelData, metrics] = await Promise.all([
      options.includeMOData ? historicalDataService.getHistoricalManufacturingOrders(filters, { page: 1, limit: 10000 }) : null,
      options.includePanelData ? historicalDataService.getHistoricalPanels(filters, { page: 1, limit: 50000 }) : null,
      options.includeMetrics ? productionMetricsService.calculateProductionMetrics(filters) : null
    ]);

    // Sheet 1: Executive Summary
    if (metrics) {
      const summaryData = [
        ['Executive Summary'],
        ['Report Period', `${this.formatDate(filters.dateFrom)} to ${this.formatDate(filters.dateTo)}`],
        ['Generated', new Date().toLocaleString()],
        [''],
        ['Key Metrics'],
        ['Total Manufacturing Orders', moData?.data.length || 0],
        ['Total Panels', panelData?.data.length || 0],
        ['Completed Panels', metrics.production.completed_panels],
        ['Failed Panels', metrics.production.failed_panels],
        ['OEE', `${metrics.derived.kpis.oee}%`],
        ['First Pass Yield', `${metrics.derived.kpis.firstPassYield}%`],
        ['Failure Rate', `${metrics.derived.kpis.failureRate}%`]
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');
    }

    // Sheet 2: Manufacturing Orders
    if (moData && moData.data.length > 0) {
      const moHeaders = [
        'ID', 'Order Number', 'Panel Type', 'Target Quantity', 'Completed Quantity',
        'Failed Quantity', 'Status', 'Customer Name', 'Created At', 'Completed At'
      ];
      
      const moSheetData = moData.data.map(mo => [
        mo.id, mo.order_number, mo.panel_type, mo.target_quantity,
        mo.completed_quantity, mo.failed_quantity, mo.status,
        mo.customer_name, this.formatDate(mo.created_at), this.formatDate(mo.completed_at)
      ]);

      const moSheet = XLSX.utils.aoa_to_sheet([moHeaders, ...moSheetData]);
      XLSX.utils.book_append_sheet(workbook, moSheet, 'Manufacturing Orders');
    }

    // Sheet 3: Panels
    if (panelData && panelData.data.length > 0) {
      const panelHeaders = [
        'ID', 'Barcode', 'Panel Type', 'Status', 'MO Number',
        'Customer Name', 'Created At', 'Completed At', 'Wattage'
      ];
      
      const panelSheetData = panelData.data.map(panel => [
        panel.id, panel.barcode, panel.panel_type, panel.status,
        panel.order_number, panel.customer_name,
        this.formatDate(panel.created_at), this.formatDate(panel.completed_at),
        panel.wattage_pmax
      ]);

      const panelSheet = XLSX.utils.aoa_to_sheet([panelHeaders, ...panelSheetData]);
      XLSX.utils.book_append_sheet(workbook, panelSheet, 'Panels');
    }

    // Write Excel file
    XLSX.writeFile(workbook, filepath);

    this.logger.info('Comprehensive report exported to Excel', {
      filename,
      moCount: moData?.data.length || 0,
      panelCount: panelData?.data.length || 0
    });

    return {
      success: true,
      filename,
      filepath,
      format: 'Excel',
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Export comprehensive report to PDF
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Export options
   * @param {string} filename - Filename
   * @param {string} filepath - File path
   * @returns {Object} Export result
   */
  async exportComprehensiveReportToPDF(filters, options, filename, filepath) {
    // Implementation for comprehensive PDF report
    // This would combine multiple data sources into a single PDF
    throw new Error('Comprehensive PDF export not yet implemented');
  }

  /**
   * Get list of exported files
   * @param {Object} filters - Filter criteria
   * @returns {Array} List of exported files
   */
  async getExportedFiles(filters = {}) {
    try {
      const { format, dateFrom, dateTo } = filters;
      
      const files = fs.readdirSync(this.exportDir);
      let filteredFiles = files;

      // Filter by format
      if (format) {
        filteredFiles = filteredFiles.filter(file => file.endsWith(`.${format.toLowerCase()}`));
      }

      // Filter by date range
      if (dateFrom || dateTo) {
        filteredFiles = filteredFiles.filter(file => {
          const stats = fs.statSync(path.join(this.exportDir, file));
          const fileDate = stats.mtime;
          
          if (dateFrom && fileDate < new Date(dateFrom)) return false;
          if (dateTo && fileDate > new Date(dateTo)) return false;
          
          return true;
        });
      }

      // Get file information
      const fileInfo = filteredFiles.map(file => {
        const filepath = path.join(this.exportDir, file);
        const stats = fs.statSync(filepath);
        
        return {
          filename: file,
          filepath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          format: path.extname(file).substring(1).toUpperCase()
        };
      });

      return fileInfo.sort((a, b) => b.modified - a.modified);

    } catch (error) {
      this.logger.error('Failed to get exported files', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  /**
   * Delete exported file
   * @param {string} filename - Filename to delete
   * @returns {Object} Deletion result
   */
  async deleteExportedFile(filename) {
    try {
      const filepath = path.join(this.exportDir, filename);
      
      if (!fs.existsSync(filepath)) {
        throw new Error(`File ${filename} not found`);
      }

      fs.unlinkSync(filepath);

      this.logger.info('Exported file deleted', { filename });

      return {
        success: true,
        message: `File ${filename} deleted successfully`
      };

    } catch (error) {
      this.logger.error('Failed to delete exported file', {
        error: error.message,
        filename
      });
      throw error;
    }
  }

  /**
   * Generate timestamp for filenames
   * @returns {string} Timestamp string
   */
  generateTimestamp() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
  }

  /**
   * Format date for display
   * @param {string|Date} date - Date to format
   * @returns {string} Formatted date
   */
  formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleString();
  }
}

export default new ExportService();
