import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession, requireApiSession } from '@/lib/server/auth-guard';
import {
  clearServerDiagnostics,
  DiagnosticCategory,
  DiagnosticSeverity,
  getRuntimeHealthSnapshot,
  getServerDiagnostics,
  recordServerDiagnostic,
  runServerBuildSelfCheck,
} from '@/lib/server/diagnostics-store';
import { recordServerAuditLog } from '@/lib/server/audit-log-store';
import { checkSlidingWindowRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/server/rate-limit';

const diagnosticCreateSchema = z.object({
  action: z.enum(['log', 'self_check']).default('log'),
  severity: z.enum(['error', 'warning', 'info']).default('error'),
  category: z.enum(['build', 'server', 'runtime', 'database', 'auth']).default('runtime'),
  source: z.string().trim().min(1).max(120).default('client-runtime'),
  message: z.string().trim().min(1).max(600).optional(),
  details: z.string().trim().max(3000).optional(),
  stack: z.string().trim().max(4000).optional(),
  route: z.string().trim().max(200).optional(),
  statusCode: z.number().int().min(100).max(599).optional(),
});

/**
 * GET /api/admin/diagnostics
 * Strictly restricted to administrators. Returns redacted build, runtime, and server error logs + health metrics.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (auth.errorResponse) return auth.errorResponse;

  const limitParam = Number(req.nextUrl.searchParams.get('limit') || '150');
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(250, limitParam)) : 150;
  const severityParam = (req.nextUrl.searchParams.get('severity') || 'all') as DiagnosticSeverity | 'all';
  const categoryParam = (req.nextUrl.searchParams.get('category') || 'all') as DiagnosticCategory | 'all';
  const search = req.nextUrl.searchParams.get('search') || '';

  const validSeverities = new Set(['all', 'error', 'warning', 'info']);
  const validCategories = new Set(['all', 'build', 'server', 'runtime', 'database', 'auth']);

  const logs = getServerDiagnostics({
    limit,
    severity: validSeverities.has(severityParam) ? severityParam : 'all',
    category: validCategories.has(categoryParam) ? categoryParam : 'all',
    search,
  });

  const health = getRuntimeHealthSnapshot();

  return NextResponse.json(
    {
      ok: true,
      count: logs.length,
      logs,
      health,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

/**
 * POST /api/admin/diagnostics
 * Records a client/runtime error (authenticated users, rate-limited) or executes a live build/server self-check (admins only).
 */
export async function POST(req: NextRequest) {
  const auth = await requireApiSession(req);
  if (auth.errorResponse) return auth.errorResponse;

  const ip = getClientIp(req);
  const rl = checkSlidingWindowRateLimit({
    key: `api:diagnostics-write:${auth.session.userId}:${ip}`,
    limit: 40,
    windowMs: 5 * 60 * 1000,
  });
  if (!rl.allowed) {
    return rateLimitExceededResponse(
      'تم تجاوز الحد المسموح لتسجيل إشعارات التشخيص. يرجى المحاولة لاحقاً.',
      rl.retryAfterSeconds
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }

  const parsed = diagnosticCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || 'بيانات التشخيص غير صالحة.' },
      { status: 400 }
    );
  }

  if (parsed.data.action === 'self_check') {
    const adminCheck = await requireAdminSession(req);
    if (adminCheck.errorResponse) return adminCheck.errorResponse;

    const result = runServerBuildSelfCheck();
    return NextResponse.json(
      {
        ok: true,
        selfCheck: result,
        health: getRuntimeHealthSnapshot(),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  if (!parsed.data.message) {
    return NextResponse.json({ ok: false, error: 'رسالة الخطأ مطلوبة.' }, { status: 400 });
  }

  const entry = recordServerDiagnostic({
    severity: parsed.data.severity,
    category: parsed.data.category,
    source: parsed.data.source,
    message: parsed.data.message,
    details: parsed.data.details,
    stack: parsed.data.stack,
    route: parsed.data.route,
    statusCode: parsed.data.statusCode,
  });

  return NextResponse.json(
    { ok: true, entry },
    { status: 201, headers: { 'Cache-Control': 'no-store' } }
  );
}

/**
 * DELETE /api/admin/diagnostics
 * Clears resolved diagnostic log entries (strictly admin-only and audit-logged).
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (auth.errorResponse) return auth.errorResponse;

  const cleared = clearServerDiagnostics();
  recordServerAuditLog({
    userId: auth.session.userId,
    username: auth.session.username,
    fullName: auth.session.username,
    action: 'تنظيف سجل أخطاء التشغيل والبناء',
    module: 'تشخيص النظام والخادم',
    branchId: auth.session.branchId,
    details: `تم تفريغ ${cleared} سجل تشخيصي بواسطة مسؤول النظام.`,
    ipAddress: getClientIp(req),
    deviceInfo: req.headers.get('user-agent') || 'متصفح الويب',
    status: 'warning',
  });

  return NextResponse.json(
    { ok: true, cleared },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
