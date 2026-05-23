import reportsService from './service.js';
import asyncHandler from '../../utils/asyncHandler.js';

/**
 * REPORTS MODULE - BOUNDARY CONTROLLERS (controller.js)
 * Responsibility: Wires Express HTTP bindings for Reports exports (PDF/CSV).
 */

/**
 * @desc    Export Project Tasks list to CSV
 * @route   GET /api/reports/projects/:projectId/csv
 * @access  Private (Requires VIEW_ANALYTICS permission)
 */
export const downloadProjectCsv = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { csv, fileName } = await reportsService.generateProjectCsv(projectId, req.organizationId);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  return res.status(200).send(csv);
});

/**
 * @desc    Export overall User productivity metric list to CSV
 * @route   GET /api/reports/employees/csv
 * @access  Private (Requires VIEW_ANALYTICS permission)
 */
export const downloadEmployeeCsv = asyncHandler(async (req, res) => {
  const { csv, fileName } = await reportsService.generateEmployeeCsv(req.organizationId);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  return res.status(200).send(csv);
});

/**
 * @desc    Stream Executive Dashboard report as PDF
 * @route   GET /api/reports/dashboard/pdf
 * @access  Private (Requires VIEW_ANALYTICS permission)
 */
export const downloadDashboardPdf = asyncHandler(async (req, res) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="executive_dashboard.pdf"');

  await reportsService.generateDashboardPdf(req.organizationId, res);
});

/**
 * @desc    Stream Project Status report as PDF
 * @route   GET /api/reports/projects/:projectId/pdf
 * @access  Private (Requires VIEW_ANALYTICS permission)
 */
export const downloadProjectPdf = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="project_report_${projectId}.pdf"`);

  await reportsService.generateProjectPdf(projectId, req.organizationId, res);
});
