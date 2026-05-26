import organizationService from '../organizations/service.js';
import asyncHandler from '../../utils/asyncHandler.js';
import auditLogService from '../audit/service.js';
import { successResponse } from '../../utils/responseHelper.js';

/**
 * List all organizations (Super Admin)
 * GET /api/superadmin/organizations
 */
export const listOrganizations = asyncHandler(async (req, res) => {
  const orgs = await organizationService.listOrganizations();
  return successResponse(res, 'Organizations list fetched successfully.', orgs);
});

/**
 * Delete an organization by id (Super Admin)
 * DELETE /api/superadmin/organizations/:id
 */
export const deleteOrganization = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await organizationService.deleteOrganization(id, req.user.id);

  // Fire audit log (non-blocking)
  auditLogService.logAction({
    userId: req.user.id,
    organizationId: result.before._id,
    action: 'DELETE_ORGANIZATION',
    entityType: 'ORGANIZATION',
    entityId: result.before._id,
    oldValue: result.before,
    newValue: result.after,
    ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
    userAgent: req.get('User-Agent') || 'unknown',
  });

  return successResponse(res, 'Organization deleted successfully.', result.after);
});

export const permanentDeleteOrganization = asyncHandler(async (req, res) => {
  const { id } = req.params;
  // Require explicit confirmation token to prevent accidental permanent deletions
  const confirmedByQuery = String(req.query.confirm || '').toLowerCase() === '1' || String(req.query.confirm || '').toLowerCase() === 'true';
  const confirmedByHeader = String(req.get('x-permanent-delete-confirm') || '').toLowerCase() === '1' || String(req.get('x-permanent-delete-confirm') || '').toLowerCase() === 'true';

  if (!confirmedByQuery && !confirmedByHeader) {
    // Provide instructions for correct confirmation
    return res.status(400).json({
      success: false,
      message: 'Permanent deletion requires explicit confirmation. Append `?confirm=1` to the request URL or provide header `x-permanent-delete-confirm: 1`.',
    });
  }
  const before = await organizationService.permanentlyDeleteOrganization(id);

  // Audit the permanent deletion
  auditLogService.logAction({
    userId: req.user.id,
    organizationId: before._id,
    action: 'PERMANENT_DELETE_ORGANIZATION',
    entityType: 'ORGANIZATION',
    entityId: before._id,
    oldValue: before,
    newValue: null,
    ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
    userAgent: req.get('User-Agent') || 'unknown',
  });

  return successResponse(res, 'Organization permanently deleted.', null);
});
