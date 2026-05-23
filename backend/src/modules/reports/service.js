import PDFDocument from 'pdfkit';
import analyticsService from '../analytics/service.js';
import projectService from '../projects/service.js';
import { User } from '../auth/model.js';
import Task from '../tasks/model.js';
import AppError from '../../utils/AppError.js';
import logger from '../../utils/logger.js';

/**
 * REPORTS MODULE - GENERATORS SERVICE (service.js)
 * Responsibility: Compiles data from other services to generate professional reports:
 *   1. CSV Generator: Outputs structured, escaped CSV strings.
 *   2. PDF Generator (pdfkit): Draws executive dashboards, project states, and employee productivities.
 */
class ReportsService {

  // ==========================================
  // 1. CSV REPORTS GENERATORS
  // ==========================================

  /**
   * Generates a CSV of all tasks inside a project
   */
  async generateProjectCsv(projectId, organizationId) {
    // 1. Load project details and tasks
    const project = await projectService.getProjectById(projectId, organizationId);
    const tasks = await Task.find({ projectId, organizationId }).populate('assigneeId', 'name email employeeId');

    // 2. Build CSV Headers
    const headers = ['Task ID', 'Title', 'Status', 'Priority', 'Assignee Name', 'Assignee Email', 'Start Date', 'End Date', 'Is Blocked'];
    const rows = [headers.join(',')];

    // 3. Populate Rows escaping fields securely
    for (const task of tasks) {
      const assigneeName = task.assigneeId ? task.assigneeId.name : 'Unassigned';
      const assigneeEmail = task.assigneeId ? task.assigneeId.email : 'N/A';
      const startDate = task.startDate ? task.startDate.toISOString().split('T')[0] : 'N/A';
      const endDate = task.endDate ? task.endDate.toISOString().split('T')[0] : 'N/A';
      const isBlocked = task.status === 'BLOCKED' ? 'YES' : 'NO';

      const fields = [
        task._id.toString(),
        this.escapeCsvField(task.title),
        task.status,
        task.priority,
        this.escapeCsvField(assigneeName),
        this.escapeCsvField(assigneeEmail),
        startDate,
        endDate,
        isBlocked
      ];

      rows.push(fields.join(','));
    }

    return {
      csv: rows.join('\n'),
      fileName: `project_report_${project.code}_${new Date().toISOString().split('T')[0]}.csv`
    };
  }

  /**
   * Generates a CSV list of employee productivity metrics
   */
  async generateEmployeeCsv(organizationId) {
    // 1. Fetch live user productivity from analytics aggregations
    const productivity = await analyticsService.getUserProductivity(organizationId);

    // 2. Build CSV Headers
    const headers = ['Employee ID', 'Name', 'Email', 'Department', 'Designation', 'Total Tasks Assigned', 'Completed Tasks', 'Completion Rate (%)'];
    const rows = [headers.join(',')];

    // 3. Populate rows
    for (const user of productivity) {
      const completionRate = user.totalTasks > 0 ? Math.round((user.completedTasks / user.totalTasks) * 100) : 0;
      
      const fields = [
        user.employeeId || 'N/A',
        this.escapeCsvField(user.name),
        this.escapeCsvField(user.email),
        this.escapeCsvField(user.department || 'N/A'),
        this.escapeCsvField(user.designation || 'N/A'),
        user.totalTasks,
        user.completedTasks,
        completionRate
      ];

      rows.push(fields.join(','));
    }

    return {
      csv: rows.join('\n'),
      fileName: `employee_productivity_${new Date().toISOString().split('T')[0]}.csv`
    };
  }

  // ==========================================
  // 2. PDF REPORTS GENERATORS (pdfkit)
  // ==========================================

  /**
   * Generates a beautiful executive Dashboard PDF report
   */
  async generateDashboardPdf(organizationId, res) {
    try {
      // 1. Retrieve executive metrics
      const kpis = await analyticsService.getKpiDashboard(organizationId);
      const trends = await analyticsService.getTaskCompletionTrends(organizationId);

      // 2. Initialize PDFKit document stream
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      doc.pipe(res);

      // Draw Header Logo & Title
      doc.fillColor('#0F172A').fontSize(24).font('Helvetica-Bold').text('TaskFlow Executive Dashboard', { align: 'left' });
      doc.fontSize(10).font('Helvetica').fillColor('#64748B').text(`Generated: ${new Date().toLocaleString()} | Tenant ID: ${organizationId}`, { align: 'left' });
      
      // Divider Line
      doc.moveDown(0.5);
      doc.rect(50, doc.y, 500, 2).fillColor('#6366F1').fill();
      
      doc.moveDown(1.5);
      doc.fillColor('#0F172A').fontSize(14).font('Helvetica-Bold').text('Key Performance Indicators (KPIs)');
      doc.moveDown(0.5);

      // KPI Grid Boxes Layout
      const startX = 50;
      const startY = doc.y;
      const boxWidth = 240;
      const boxHeight = 70;
      const spacing = 20;

      // Draw Box 1: Projects
      this.drawKpiBox(doc, startX, startY, boxWidth, boxHeight, 'Active Projects', kpis.totalProjects.toString(), '#6366F1');
      // Draw Box 2: Users
      this.drawKpiBox(doc, startX + boxWidth + spacing, startY, boxWidth, boxHeight, 'Active Users', kpis.totalUsers.toString(), '#10B981');
      
      // Draw Box 3: Task Completion Rate
      this.drawKpiBox(doc, startX, startY + boxHeight + spacing, boxWidth, boxHeight, 'Global Task Completion', `${kpis.globalTaskCompletionRate}%`, '#F59E0B');
      // Draw Box 4: Escalations
      this.drawKpiBox(doc, startX + boxWidth + spacing, startY + boxHeight + spacing, boxWidth, boxHeight, 'Escalated Tasks', kpis.totalEscalatedTasks.toString(), '#EF4444');

      doc.y = startY + (boxHeight * 2) + (spacing * 2) + 20;

      // Completion Trends Section
      doc.fillColor('#0F172A').fontSize(14).font('Helvetica-Bold').text('Historical Completion Trends (Past 6 Months)');
      doc.moveDown(0.5);

      // Draw a neat text table of trends
      const tableTop = doc.y;
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0F172A');
      doc.text('Month', 50, tableTop);
      doc.text('Completed Tasks Count', 250, tableTop);
      doc.rect(50, tableTop + 15, 500, 1).fillColor('#E2E8F0').fill();

      let currentY = tableTop + 25;
      doc.font('Helvetica').fillColor('#334155');
      
      for (const trend of trends) {
        doc.text(trend.month, 50, currentY);
        doc.text(trend.completedCount.toString(), 250, currentY);
        doc.rect(50, currentY + 15, 500, 0.5).fillColor('#F1F5F9').fill();
        currentY += 25;
      }

      // Add Page Footer
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.rect(50, 780, 500, 0.5).fillColor('#CBD5E1').fill();
        doc.fontSize(8).fillColor('#94A3B8').text('TaskFlow Analytics System | Confidential SaaS Compliance Report', 50, 790, { align: 'left' });
        doc.text(`Page ${i + 1} of ${pages.count}`, 500, 790, { align: 'right' });
      }

      doc.end();
      logger.info(`Report Service: Successfully generated dashboard PDF for organization: ${organizationId}`);
    } catch (err) {
      logger.error(`Report Service: Failed to generate dashboard PDF. Error: ${err.message}`);
      throw new AppError('Failed to compile dashboard PDF report.', 500);
    }
  }

  /**
   * Generates a beautiful Project status PDF report
   */
  async generateProjectPdf(projectId, organizationId, res) {
    try {
      const project = await projectService.getProjectById(projectId, organizationId);
      const projectAnalytics = await analyticsService.getProjectAnalytics(projectId, organizationId);

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      doc.pipe(res);

      // Header Details
      doc.fillColor('#0F172A').fontSize(24).font('Helvetica-Bold').text(`Project Report: ${project.name}`, { align: 'left' });
      doc.fontSize(10).font('Helvetica').fillColor('#64748B').text(`Shortcode: ${project.code} | Health Score: ${project.healthScore}/100`, { align: 'left' });
      
      // Divider
      doc.moveDown(0.5);
      doc.rect(50, doc.y, 500, 2).fillColor('#6366F1').fill();
      
      doc.moveDown(1.5);
      
      // Details Grid
      const startX = 50;
      const startY = doc.y;
      const boxWidth = 240;
      const boxHeight = 70;
      const spacing = 20;

      // Box 1: Total Tasks
      this.drawKpiBox(doc, startX, startY, boxWidth, boxHeight, 'Total Tasks', projectAnalytics.totalTasks.toString(), '#6366F1');
      // Box 2: Completed Tasks
      this.drawKpiBox(doc, startX + boxWidth + spacing, startY, boxWidth, boxHeight, 'Completed Tasks', projectAnalytics.completedTasks.toString(), '#10B981');
      
      // Box 3: Open Milestones
      this.drawKpiBox(doc, startX, startY + boxHeight + spacing, boxWidth, boxHeight, 'Open Milestones', projectAnalytics.activeMilestonesCount.toString(), '#F59E0B');
      // Box 4: Project Health Status
      const statusColor = project.healthScore >= 80 ? '#10B981' : project.healthScore >= 50 ? '#F59E0B' : '#EF4444';
      const healthStatus = project.healthScore >= 80 ? 'HEALTHY' : project.healthScore >= 50 ? 'WARNING' : 'CRITICAL';
      this.drawKpiBox(doc, startX + boxWidth + spacing, startY + boxHeight + spacing, boxWidth, boxHeight, 'Project Health Rating', healthStatus, statusColor);

      doc.y = startY + (boxHeight * 2) + (spacing * 2) + 20;

      // Tasks Allocation Section
      doc.fillColor('#0F172A').fontSize(14).font('Helvetica-Bold').text('Tasks State Breakdown');
      doc.moveDown(0.5);

      const tableTop = doc.y;
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0F172A');
      doc.text('Task Status State', 50, tableTop);
      doc.text('Total Tasks Count', 250, tableTop);
      doc.rect(50, tableTop + 15, 500, 1).fillColor('#E2E8F0').fill();

      let currentY = tableTop + 25;
      doc.font('Helvetica').fillColor('#334155');

      const statesBreakdown = projectAnalytics.statusBreakdown || [];
      for (const state of statesBreakdown) {
        doc.text(state.status, 50, currentY);
        doc.text(state.count.toString(), 250, currentY);
        doc.rect(50, currentY + 15, 500, 0.5).fillColor('#F1F5F9').fill();
        currentY += 25;
      }

      // Add Footer
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.rect(50, 780, 500, 0.5).fillColor('#CBD5E1').fill();
        doc.fontSize(8).fillColor('#94A3B8').text(`TaskFlow Project Metrics | Code: ${project.code}`, 50, 790, { align: 'left' });
        doc.text(`Page ${i + 1} of ${pages.count}`, 500, 790, { align: 'right' });
      }

      doc.end();
      logger.info(`Report Service: Successfully generated project PDF for Project ID: ${projectId}`);
    } catch (err) {
      logger.error(`Report Service: Failed to generate project PDF. Error: ${err.message}`);
      throw new AppError('Failed to compile project PDF report.', 500);
    }
  }

  // ==========================================
  // 3. PRIVATE DECORATION HELPERS
  // ==========================================

  /**
   * Draws a standardized colored KPI box grid block in pdfkit
   */
  drawKpiBox(doc, x, y, width, height, title, value, color) {
    // Background Border Panel
    doc.rect(x, y, width, height).fillColor('#F8FAFC').fill();
    doc.rect(x, y, width, height).strokeColor('#E2E8F0').lineWidth(1).stroke();
    
    // Colored Vertical Left Accent Bar
    doc.rect(x, y, 4, height).fillColor(color).fill();

    // Text details
    doc.fillColor('#64748B').fontSize(9).font('Helvetica-Bold').text(title.toUpperCase(), x + 15, y + 15);
    doc.fillColor('#0F172A').fontSize(18).font('Helvetica-Bold').text(value, x + 15, y + 32);
  }

  /**
   * Sanitizes text strings to comply with CSV formats, escaping double quotes
   */
  escapeCsvField(value) {
    if (value === null || value === undefined) return '';
    const stringValue = value.toString();
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }
}

export default new ReportsService();
