/**
 * CONSTANTS DIRECTORY - GLOBAL SaaS SYSTEM CONFIGURATIONS
 * Responsibility: Single source of truth for fixed values, configuration limits,
 * subscription tier rules, role levels, and platform permissions.
 * Prevents magic strings and magic numbers across the backend.
 */

// Enterprise SaaS Roles
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ORG_ADMIN: 'ORG_ADMIN',
  PROJECT_MANAGER: 'PROJECT_MANAGER',
  TEAM_LEAD: 'TEAM_LEAD',
  DEVELOPER: 'DEVELOPER',
  TESTER_QA: 'TESTER_QA',
  DESIGNER: 'DESIGNER',
  HR: 'HR',
  BUSINESS_ANALYST: 'BUSINESS_ANALYST',
  PRODUCT_OWNER: 'PRODUCT_OWNER',
  DEVOPS_ENGINEER: 'DEVOPS_ENGINEER',
  ARCHITECT: 'ARCHITECT',
  FINANCE: 'FINANCE',
  CLIENT: 'CLIENT',
  SUPPORT_TEAM: 'SUPPORT_TEAM',
};

// Subscription Tier Configuration Constraints
export const SUBSCRIPTION_PLANS = {
  FREE_TRIAL: 'FREE_TRIAL',
  GROWTH: 'GROWTH',
  ENTERPRISE: 'ENTERPRISE',
};

export const PLAN_LIMITS = {
  [SUBSCRIPTION_PLANS.FREE_TRIAL]: {
    maxUsers: 10,
    maxProjects: 3,
    maxStorageGb: 5, // 5 Gigabytes limit
    features: ['basic_tasks', 'direct_chat'],
  },
  [SUBSCRIPTION_PLANS.GROWTH]: {
    maxUsers: 50,
    maxProjects: 20,
    maxStorageGb: 50,
    features: ['basic_tasks', 'direct_chat', 'project_chat', 'timeline_view', 'basic_analytics'],
  },
  [SUBSCRIPTION_PLANS.ENTERPRISE]: {
    maxUsers: 99999, // unlimited
    maxProjects: 99999, // unlimited
    maxStorageGb: 1024, // 1 Terabyte limit
    features: [
      'basic_tasks',
      'direct_chat',
      'project_chat',
      'timeline_view',
      'basic_analytics',
      'ai_sprint_summary',
      'ai_deadline_prediction',
      'ip_whitelisting',
      'audit_logs',
      'two_factor_auth'
    ],
  },
};

// Task Status Flow State Engine
export const TASK_STATUS = {
  BACKLOG: 'BACKLOG',
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  BLOCKED: 'BLOCKED',
  COMPLETED: 'COMPLETED',
};

// Task Priority Levels
export const TASK_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

// Project Status Telemetry
export const PROJECT_STATUS = {
  PLANNING: 'PLANNING',
  ACTIVE: 'ACTIVE',
  ON_HOLD: 'ON_HOLD',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
};
