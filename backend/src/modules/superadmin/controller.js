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
 * Create a new organization (Super Admin)
 * POST /api/superadmin/organizations
 */
export const createOrganization = asyncHandler(async (req, res) => {
  const { name, subscriptionPlan, industry, companySize, website, email, phone, address, description } = req.body;
  const org = await organizationService.createOrganization({ name, subscriptionPlan, industry, companySize, website, email, phone, address, description });

  // Fire audit log (non-blocking)
  auditLogService.logAction({
    userId: req.user.id,
    organizationId: org._id,
    action: 'CREATE_ORGANIZATION',
    entityType: 'ORGANIZATION',
    entityId: org._id,
    oldValue: null,
    newValue: org,
    ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
    userAgent: req.get('User-Agent') || 'unknown',
  });

  return successResponse(res, 'Organization created successfully.', org, 201);
});

/**
 * Provision a new Org Admin for an existing organization (Super Admin)
 * POST /api/superadmin/organizations/:id/admin
 */
export const provisionOrgAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { adminName, adminEmail, adminPassword, adminEmployeeId } = req.body;

  if (!adminEmail || !adminPassword || !adminEmployeeId) {
    return res.status(400).json({
      success: false,
      message: 'Admin email, password, and employee ID are required.'
    });
  }

  // Verify organization exists
  const org = await organizationService.getOrganizationById(id);

  // Check if admin email already exists globally
  const { User } = await import('../auth/model.js');
  const existingUser = await User.findOne({ email: adminEmail.toLowerCase() });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'Admin email address is already registered on this platform.'
    });
  }

  // Create the Org Admin user inside the organization
  const adminUser = await User.create({
    name: adminName || 'Org Admin',
    email: adminEmail,
    password: adminPassword,
    role: 'ORG_ADMIN',
    organizationId: org._id,
    employeeId: adminEmployeeId,
    status: 'ACTIVE',
  });

  // Fire audit log (non-blocking)
  auditLogService.logAction({
    userId: req.user.id,
    organizationId: org._id,
    action: 'PROVISION_ORGANIZATION_ADMIN',
    entityType: 'USER',
    entityId: adminUser._id,
    oldValue: null,
    newValue: { id: adminUser._id, email: adminUser.email, employeeId: adminUser.employeeId },
    ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
    userAgent: req.get('User-Agent') || 'unknown',
  });

  return successResponse(res, 'Organization Admin provisioned successfully.', {
    id: adminUser._id,
    name: adminUser.name,
    email: adminUser.email,
    role: adminUser.role,
    organizationId: adminUser.organizationId,
    employeeId: adminUser.employeeId,
  }, 201);
});

/**
 * Update organization status (Super Admin)
 * PATCH /api/superadmin/organizations/:id/status
 */
export const updateOrganizationStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const before = await organizationService.getOrganizationById(id);
  const updatedOrg = await organizationService.updateStatus(id, status);

  // Fire audit log (non-blocking)
  auditLogService.logAction({
    userId: req.user.id,
    organizationId: id,
    action: 'UPDATE_ORGANIZATION_STATUS',
    entityType: 'ORGANIZATION',
    entityId: id,
    oldValue: { status: before.status },
    newValue: { status: updatedOrg.status },
    ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
    userAgent: req.get('User-Agent') || 'unknown',
  });

  return successResponse(res, `Organization status updated to ${status}.`, updatedOrg);
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
