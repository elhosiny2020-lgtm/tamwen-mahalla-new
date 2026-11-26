import type { AuditLog } from '@/types';
import { INITIAL_AUDIT_LOGS } from '@/lib/mock-db';
import { sanitizeText } from '@/lib/zod-schemas';

/**
 * Server-side immutable in-memory audit log store with automatic PII / XSS string sanitization.
 * Records every sensitive action (login, logout, password reset, admin verification, user approval, etc.)
 * and restricts reading exclusively to administrative roles via /api/audit-logs.
 */

const MAX_SERVER_AUDIT_LOGS = 1000;

interface GlobalAuditState {
  __gharbiaServerAuditLogs?: AuditLog[];
}

const globalForAudit = globalThis as unknown as GlobalAuditState;

function getAuditStore(): AuditLog[] {
  if (!globalForAudit.__gharbiaServerAuditLogs) {
    globalForAudit.__gharbiaServerAuditLogs = [...INITIAL_AUDIT_LOGS];
  }
  return globalForAudit.__gharbiaServerAuditLogs;
}

export function getServerAuditLogs(limit = 200): AuditLog[] {
  const store = getAuditStore();
  const clamped = Math.max(1, Math.min(limit, MAX_SERVER_AUDIT_LOGS));
  return store.slice(0, clamped);
}

export function recordServerAuditLog(
  entry: Omit<AuditLog, 'id' | 'timestamp'> & { timestamp?: string }
): AuditLog {
  const store = getAuditStore();
  const record: AuditLog = {
    id: `srv-log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: entry.timestamp || new Date().toISOString(),
    userId: sanitizeText(entry.userId || 'anonymous').slice(0, 64),
    username: sanitizeText(entry.username || 'unknown').slice(0, 80),
    fullName: sanitizeText(entry.fullName || 'مستخدم النظام').slice(0, 140),
    action: sanitizeText(entry.action).slice(0, 140),
    module: sanitizeText(entry.module).slice(0, 140),
    branchId: entry.branchId ? sanitizeText(entry.branchId).slice(0, 40) : undefined,
    details: sanitizeText(entry.details).slice(0, 600),
    ipAddress: sanitizeText(entry.ipAddress || 'unknown').slice(0, 64),
    deviceInfo: sanitizeText(entry.deviceInfo || 'Web Client').slice(0, 200),
    status:
      entry.status === 'failed' || entry.status === 'warning' ? entry.status : 'success',
  };

  store.unshift(record);
  if (store.length > MAX_SERVER_AUDIT_LOGS) {
    store.length = MAX_SERVER_AUDIT_LOGS;
  }
  return record;
}
