import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/server/auth-guard';
import { recordServerAuditLog } from '@/lib/server/audit-log-store';
import { verifyFactoryResetPasscode } from '@/lib/server/admin-credential-store';
import {
  checkSlidingWindowRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from '@/lib/server/rate-limit';

const VerifyAdminSchema = z.object({
  action: z.enum(['verify', 'claim']).optional().default('verify'),
  password: z.string().min(4, 'كلمة مرور استعادة ضبط المصنع يجب ألا تقل عن ٤ أحرف').max(256),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (auth.errorResponse) return auth.errorResponse;

  const hasEnv = Boolean(process.env.FACTORY_RESET_PASSWORD?.trim());
  return NextResponse.json(
    {
      ok: true,
      configured: true,
      source: hasEnv ? 'env' : 'fixed',
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (auth.errorResponse) return auth.errorResponse;

  const ip = getClientIp(req);
  const userAgent = req.headers.get('user-agent') || 'متصفح الويب المعتمد';
  const rl = checkSlidingWindowRateLimit({
    key: `auth:verify-admin:${ip}:${auth.session.userId}`,
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.allowed) {
    recordServerAuditLog({
      userId: auth.session.userId,
      username: auth.session.username,
      fullName: auth.session.username,
      action: 'تجاوز حد التحقق بكلمة مرور استعادة ضبط المصنع',
      module: 'الأمن والصلاحيات السيادية',
      branchId: auth.session.branchId,
      details: 'تم إيقاف محاولات التحقق من كلمة مرور استعادة ضبط المصنع مؤقتاً لتجاوز الحد المسموح',
      ipAddress: ip,
      deviceInfo: userAgent,
      status: 'warning',
    });
    return rateLimitExceededResponse(
      'تم تجاوز الحد الأقصى لمحاولات التحقق بكلمة مرور استعادة ضبط المصنع. يرجى الانتظار قليلاً.',
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
      { ok: false, error: parsed.error.issues[0]?.message || 'يرجى إدخال كلمة مرور استعادة ضبط المصنع بشكل صحيح.' },
      { status: 400 }
    );
  }

  const cleanPass = parsed.data.password.trim();
  const check = verifyFactoryResetPasscode(cleanPass);

  if (!check.valid) {
    recordServerAuditLog({
      userId: auth.session.userId,
      username: auth.session.username,
      fullName: auth.session.username,
      action: 'فشل التحقق بكلمة مرور استعادة ضبط المصنع',
      module: 'الأمن والصلاحيات السيادية',
      branchId: auth.session.branchId,
      details: 'إدخال كلمة مرور غير مطابقة لكلمة مرور استعادة ضبط المصنع الموحدة',
      ipAddress: ip,
      deviceInfo: userAgent,
      status: 'failed',
    });
    return NextResponse.json(
      { ok: false, error: 'كلمة مرور استعادة ضبط المصنع غير صحيحة. لا يمكن تنفيذ التصفير.' },
      { status: 403 }
    );
  }

  recordServerAuditLog({
    userId: auth.session.userId,
    username: auth.session.username,
    fullName: auth.session.username,
    action: 'تحقق ناجح بكلمة مرور استعادة ضبط المصنع',
    module: 'الأمن والصلاحيات السيادية',
    branchId: auth.session.branchId,
    details: 'تم التحقق من كلمة مرور استعادة ضبط المصنع الموحدة لتنفيذ التصفير الفوري',
    ipAddress: ip,
    deviceInfo: userAgent,
    status: 'success',
  });

  return NextResponse.json(
    { ok: true, verified: true, userId: auth.session.userId, role: auth.session.role },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
