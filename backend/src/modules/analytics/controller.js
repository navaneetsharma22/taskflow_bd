import analyticsService from './service.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { successResponse } from '../../utils/responseHelper.js';
import cacheManager from '../../utils/cache.js';

/**
 * ANALYTICS MODULE - BOUNDARY CONTROLLERS (controller.js)
 * Responsibility: Wires Express HTTP bindings for Analytics aggregations reports.
 */

/**
 * @desc    Get detailed analytics for a project workspace
 * @route   GET /api/analytics/projects/:projectId
 * @access  Private (All authenticated members)
 */
export const getProjectAnalytics = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const analytics = await analyticsService.getProjectAnalytics(projectId, req.organizationId);
  return successResponse(res, 'Project analytics metrics calculated successfully.', analytics);
});

/**
 * @desc    Get employee productivity and league metrics table
 * @route   GET /api/analytics/productivity
 * @access  Private (Requires VIEW_ANALYTICS permission)
 */
export const getUserProductivity = asyncHandler(async (req, res) => {
  const productivity = await analyticsService.getUserProductivity(req.organizationId);
  return successResponse(res, 'User productivity telemetry metrics calculated successfully.', productivity);
});

/**
 * @desc    Get task completion monthly trends
 * @route   GET /api/analytics/trends/completion
 * @access  Private (Requires VIEW_ANALYTICS permission)
 */
export const getTaskCompletionTrends = asyncHandler(async (req, res) => {
  const trends = await analyticsService.getTaskCompletionTrends(req.organizationId);
  return successResponse(res, 'Task completion monthly trends calculated successfully.', trends);
});

/**
 * @desc    Get overdue and risk telemetry predict analysis
 * @route   GET /api/analytics/deadline-risks
 * @access  Private (Requires VIEW_ANALYTICS permission)
 */
export const getDeadlineRiskTelemetry = asyncHandler(async (req, res) => {
  const risks = await analyticsService.getDeadlineRiskTelemetry(req.organizationId);
  return successResponse(res, 'Deadline exposure risks telemetry calculated successfully.', risks);
});

/**
 * @desc    Get weekly sprint velocity metrics
 * @route   GET /api/analytics/velocity/:projectId
 * @access  Private (All authenticated members)
 */
export const getSprintVelocity = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const velocity = await analyticsService.getSprintVelocity(projectId, req.organizationId);
  return successResponse(res, 'Sprint weekly velocity metrics calculated successfully.', velocity);
});

/**
 * @desc    Get high-level dashboard performance summaries
 * @route   GET /api/analytics/kpis
 * @access  Private (Requires VIEW_ANALYTICS permission)
 */
export const getKpiDashboard = asyncHandler(async (req, res) => {
  const cacheKey = `tenant:${req.organizationId}:dashboard:kpis`;
  let kpis = await cacheManager.get(cacheKey);

  if (!kpis) {
    kpis = await analyticsService.getKpiDashboard(req.organizationId);
    // Cache Executive KPI Dashboard for 5 minutes
    await cacheManager.set(cacheKey, kpis, 300);
  }

  return successResponse(res, 'Executive KPI dashboard telemetry calculated successfully.', kpis);
});
