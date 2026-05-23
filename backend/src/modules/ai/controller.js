import aiService from './service.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { successResponse } from '../../utils/responseHelper.js';

/**
 * AI SERVICE MODULE - BOUNDARY CONTROLLERS (controller.js)
 * Responsibility: Wires Express HTTP bindings for generative AI requests.
 */

/**
 * @desc    Generate a Sprint Summary review for a project
 * @route   GET /api/ai/projects/:projectId/sprint-summary
 * @access  Private (Authenticated users only)
 */
export const getSprintSummary = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const summary = await aiService.generateSprintSummary(projectId, req.organizationId);

  return successResponse(res, 'Sprint summary generated successfully.', { summary }, 200);
});

/**
 * @desc    Assess project deadline risk factors
 * @route   GET /api/ai/projects/:projectId/deadline-risk
 * @access  Private (Authenticated users only)
 */
export const getDeadlineRisk = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const riskAssessment = await aiService.assessDeadlineRisk(projectId, req.organizationId);

  return successResponse(res, 'Deadline risk assessment completed successfully.', { riskAssessment }, 200);
});

/**
 * @desc    Predict developer workload and capacity metrics
 * @route   GET /api/ai/workload-prediction
 * @access  Private (Authenticated users only)
 */
export const getWorkloadPrediction = asyncHandler(async (req, res) => {
  const workloadPrediction = await aiService.predictWorkload(req.organizationId);

  return successResponse(res, 'Resource capacity predictions generated successfully.', { workloadPrediction }, 200);
});

/**
 * @desc    Generate executive AI operations report text
 * @route   GET /api/ai/executive-report
 * @access  Private (Requires ORG_ADMIN or SUPER_ADMIN access)
 */
export const getExecutiveReport = asyncHandler(async (req, res) => {
  const reportText = await aiService.generateAiReportText(req.organizationId);

  return successResponse(res, 'Executive strategy insights generated successfully.', { reportText }, 200);
});
