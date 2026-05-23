import auditLogRepository from './repository.js';
import logger from '../../utils/logger.js';

/**
 * AUDIT LOGS MODULE - SERVICE LAYER (service.js)
 * Responsibility: Implements core Enterprise Audit logging and queries:
 *   1. Non-blocking Async Dispatch: Tracks security events without degrading latency.
 *   2. Filtering queries for administrative monitoring dashboard views.
 */
class AuditLogService {

  /**
   * Fires a fire-and-forget asynchronous audit logger event.
   * This completely prevents tracking constraints from slowing down main database requests.
   */
  logAction({
    userId,
    organizationId,
    action,
    entityType,
    entityId,
    oldValue = null,
    newValue = null,
    ipAddress = '127.0.0.1',
    userAgent = 'System Process',
  }) {
    // Execute asynchronously (non-blocking)
    auditLogRepository.create({
      userId,
      organizationId,
      action,
      entityType,
      entityId,
      oldValue,
      newValue,
      ipAddress,
      userAgent,
    })
    .then((log) => {
      logger.info(`Audit Log: Successfully recorded [Action: ${action}] by User: ${userId} | Log ID: ${log._id}`);
    })
    .catch((err) => {
      logger.error(`Audit Log Failure: Failed to record audit log. Error: ${err.message}`);
    });
  }

  /**
   * Fetches paginated audit logs for administrators
   */
  async getLogs(organizationId, filter = {}, page = 1, limit = 20) {
    return auditLogRepository.findAll(filter, page, limit, organizationId);
  }
}

export default new AuditLogService();
