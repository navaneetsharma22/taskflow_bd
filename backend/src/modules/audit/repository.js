import AuditLog from './model.js';

/**
 * AUDIT LOGS MODULE - DATA REPOSITORY (repository.js)
 * Responsibility: Wires Mongoose queries for Audit Logs.
 * Enforces strict tenant boundaries and provides populated user expansions.
 */
class AuditLogRepository {
  
  async create(auditLogData) {
    return AuditLog.create(auditLogData);
  }

  async findAll(filter = {}, page = 1, limit = 20, organizationId) {
    const queryFilter = {
      ...filter,
      organizationId,
    };

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(queryFilter)
        .populate('userId', 'name email employeeId')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      AuditLog.countDocuments(queryFilter),
    ]);

    return { logs, total };
  }
}

export default new AuditLogRepository();
