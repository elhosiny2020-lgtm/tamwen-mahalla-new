import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession, requireApiSession } from '@/lib/server/auth-guard';
import { getServerAuditLogs, recordServerAuditLog } from '@/lib/server/audit-log-store';
import { getClientIp, checkSlidingWindowRateLimit, rateLimitExceededResponse } from '@/lib/server/rate-limit';
import { auditLogCreateSchema } from '@/lib/zod-schemas';

/**
 * GET /api/audit-logs
 * Strictly restricted to administrative roles (super_admin, admin, supply_admin_manager, department_manager).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (auth.errorResponse) return auth.errorResponse;

  const limitParam = Number(req.nextUrl.searchParams.get('limit') || '200');
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(500, limitParam)) : 200;
  const actionFilter = req.nextUrl.searchParams.get('action')?.trim().toLowerCase() || '';
  const statusFilter = req.nextUrl.searchParams.get('status')?.trim().toLowerCase() || '';

  let logs = getServerAuditLogs(limit);

  if (actionFilter) {
    logs = logs.filter(
      (l) =>
        l.action.toLowerCase().includes(actionFilter) ||
        l.module.toLowerCase().includes(actionFilter) ||
        l.details.toLowerCase().includes(actionFilter)
    );
  }

  if (statusFilter === 'success' || statusFilter === 'failed' || statusFilter === 'warning') {
    logs = logs.filter((l) => l.status === statusFilter);
  }

  return NextResponse.json(
    {
      ok: true,
      count: logs.length,
      logs,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

/**
 * POST /api/audit-logs
 * Logs a sensitive user action on the server after validating with Zod and sanitizing strings.
 */
export async function POST(req: NextRequest) {
  const auth = await requireApiSession(req);
  if (auth.errorResponse) return auth.errorResponse;

  const ip = getClientIp(req);
  const rl = checkSlidingWindowRateLimit({
    key: `api:audit-write:${auth.session.userId}:${ip}`,
    limit: 60,
    windowMs: 5 * 60 * 1000,
  });
  if (!rl.allowed) {
    return rateLimitExceededResponse(
      'تم تجاوز الحد المسموح لتسجيل أحداث التدقيق. يرجى الانتظار قليلاً.',
      rl.retryAfterSeconds
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }

  const parsed = auditLogCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || 'بيانات سجل التدقيق غير صالحة.' },
      { status: 400 }
    );
  }

  const userAgent = req.headers.get('user-agent') || 'متصفح الويب المعتمد';
  const entry = recordServerAuditLog({
    userId: auth.session.userId,
    username: auth.session.username,
    fullName: parsed.data.fullName || auth.session.username,
    action: parsed.data.action,
    module: parsed.data.module,
    branchId: parsed.data.branchId || auth.session.branchId,
    details: parsed.data.details,
    ipAddress: ip,
    deviceInfo: userAgent,
    status: parsed.data.status,
  });

  return NextResponse.json(
    { ok: true, log: entry },
    { status: 201, headers: { 'Cache-Control': 'no-store' } }
  );
}
