import queueSystemManager from '../../queues/manager.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { successResponse } from '../../utils/responseHelper.js';

/**
 * QUEUE SYSTEM MODULE - ADMINISTRATIVE CONTROLLERS (controller.js)
 * Responsibility: Wires Express HTTP bindings for administrative
 * queue monitoring and failed jobs registries.
 */

/**
 * @desc    Get all failed jobs currently logged in the registry
 * @route   GET /api/queues/failed-jobs
 * @access  Private (Requires Org Admin or Super Admin)
 */
export const getFailedJobs = asyncHandler(async (req, res) => {
  const failedJobs = queueSystemManager.getFailedJobs();

  return successResponse(
    res,
    'Failed queue jobs retrieved successfully.',
    {
      totalFailed: failedJobs.length,
      failedJobs,
    },
    200
  );
});

/**
 * @desc    Purge/clear all failed jobs logged in the registry
 * @route   DELETE /api/queues/failed-jobs
 * @access  Private (Requires Org Admin or Super Admin)
 */
export const clearFailedJobs = asyncHandler(async (req, res) => {
  queueSystemManager.clearFailedJobsRegistry();

  return successResponse(res, 'Failed queue jobs registry cleared successfully.', null, 200);
});
