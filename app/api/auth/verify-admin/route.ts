import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/server/auth-guard';
import { recordServerAuditLog } from '@/lib/server/audit-log-store';
import {
  claimInitialAdminPasscode,
  getAdminPasscodeStatus,
  verifyAdminPasscode,
} from '@/lib/server/admin-credential-store';
import {
  checkSlidingWindowRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from '@/lib/server/rate-limit';

const VerifyAdminSchema = z.object({
  action: z.enum(['verify', 'claim']).optional().default('verify'),
  password: z.string().min(4, 'كلمة المرور الإدارية يجب ألا تقل عن ٤ أحرف').max(256),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (auth.errorResponse) return auth.errorResponse;

  const status = getAdminPasscodeStatus();
  return NextResponse.json(
    {
      ok: true,
      configured: status.configured,
      source: status.source,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(req: NextRequest) {
  // Always verify session & admin role directly inside the route handler
  const auth = await requireAdminSession(req);
  if (auth.errorResponse) return auth.errorResponse;

  const ip = getClientIp(req);
  const userAgent = req.headers.get('user-agent') || 'متصفح الويب المعتمد';
  const rl = checkSlidingWindowRateLimit({
    key: `auth:verify-admin:${ip}:${auth.session.userId}`,
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.allowed) {
    recordServerAuditLog({
      userId: auth.session.userId,
      username: auth.session.username,
      fullName: auth.session.username,
      action: 'تجاوز حد التحقق الإداري',
      module: 'الأمن والصلاحيات السيادية',
      branchId: auth.session.branchId,
      details: 'تم إيقاف محاولات التحقق الإداري مؤقتاً لتجاوز الحد المسموح',
      ipAddress: ip,
      deviceInfo: userAgent,
      status: 'warning',
    });
    return rateLimitExceededResponse(
      'تم تجاوز الحد الأقصى لمحاولات التحقق الإداري. يرجى الانتظار ١٠ دقائق.',
      rl.retryAfterSeconds
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'بيانات الطلب غير صالحة.' }, { status: 400 });
  }

  const parsed = VerifyAdminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || 'يرجى إدخال كلمة المرور الإدارية بشكل صحيح.' },
      { status: 400 }
    );
  }

  const { action, password } = parsed.data;
  const status = getAdminPasscodeStatus();

  // First-run one-time atomic admin passcode setup (only when env secret is unset and unclaimed)
  if (action === 'claim') {
    if (status.configured) {
      return NextResponse.json(
        {
          ok: false,
          error: 'كلمة المرور الإدارية مهيأة مسبقاً على الخادم. يرجى إدخالها مباشرة للتحقق.',
        },
        { status: 409 }
      );
    }

    const claimed = claimInitialAdminPasscode(password, auth.session.username);
    if (!claimed.ok) {
      return NextResponse.json(
        { ok: false, error: 'تعذر تعيين كلمة المرور الإدارية. يرجى إدخال كلمة مرور لا تقل عن ٤ أحرف.' },
        { status: 400 }
      );
    }

    recordServerAuditLog({
      userId: auth.session.userId,
      username: auth.session.username,
      fullName: auth.session.username,
      action: 'تهيئة كلمة المرور الإدارية السيادية لأول مرة',
      module: 'الأمن والصلاحيات السيادية',
      branchId: auth.session.branchId,
      details: 'تم حفظ بصمة كلمة المرور الإدارية (scrypt) على الخادم بنجاح',
      ipAddress: ip,
      deviceInfo: userAgent,
      status: 'success',
    });

    return NextResponse.json(
      { ok: true, verified: true, claimed: true, userId: auth.session.userId, role: auth.session.role },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  // Standard verification path
  if (!status.configured) {
    return NextResponse.json(
      {
        ok: false,
        needsSetup: true,
        error: 'لم يتم تعيين كلمة المرور الإدارية بعد. يرجى اعتماد كلمة المرور الإدارية أولاً.',
      },
      { status: 409 }
    );
  }

  const verification = verifyAdminPasscode(password);
  if (!verification.valid) {
    recordServerAuditLog({
      userId: auth.session.userId,
      username: auth.session.username,
      fullName: auth.session.username,
      action: 'فشل التحقق الإداري',
      module: 'الأمن والصلاحيات السيادية',
      branchId: auth.session.branchId,
      details: 'إدخال كلمة مرور إدارية غير مطابقة',
      ipAddress: ip,
      deviceInfo: userAgent,
      status: 'failed',
    });
    return NextResponse.json(
      { ok: false, error: 'كلمة المرور الإدارية غير صحيحة.' },
      { status: 403 }
    );
  }

  recordServerAuditLog({
    userId: auth.session.userId,
    username: auth.session.username,
    fullName: auth.session.username,
    action: 'تحقق إداري سيادي ناجح',
    module: 'الأمن والصلاحيات السيادية',
    branchId: auth.session.branchId,
    details: 'تم تأكيد الصلاحية السيادية لتنفيذ إجراء حساس',
    ipAddress: ip,
    deviceInfo: userAgent,
    status: 'success',
  });

  return NextResponse.json(
    { ok: true, verified: true, userId: auth.session.userId, role: auth.session.role },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
