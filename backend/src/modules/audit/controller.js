import auditLogService from './service.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { paginationResponse } from '../../utils/responseHelper.js';

/**
 * AUDIT LOGS MODULE - BOUNDARY CONTROLLERS (controller.js)
 * Responsibility: Wires Express HTTP bindings for administrative audit logs monitoring.
 */

/**
 * @desc    Get tenant audit logs (paginated)
 * @route   GET /api/audit
 * @access  Private (Requires Org Admin or dynamic dynamic dynamic role weights)
 */
export const getAuditLogs = asyncHandler(async (req, res) => {
  const { userId, entityType, action, page = 1, limit = 20 } = req.query;
  const organizationId = req.organizationId;

  // Compile filters based on query inputs
  const filter = {};
  if (userId) filter.userId = userId;
  if (entityType) filter.entityType = entityType;
  if (action) filter.action = action;

  const { logs, total } = await auditLogService.getLogs(organizationId, filter, page, limit);

  return paginationResponse(
    res,
    'Audit logs listed successfully.',
    logs,
    page,
    limit,
    total
  );
});
