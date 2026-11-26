import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/server/auth-guard';
import { recordServerAuditLog } from '@/lib/server/audit-log-store';
import {
  checkSlidingWindowRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from '@/lib/server/rate-limit';

const VerifyAdminSchema = z.object({
  password: z.string().min(1, 'كلمة المرور الإدارية مطلوبة').max(256),
});

function timingSafeCompareStrings(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const hashB = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(hashA, hashB) && a.length === b.length;
}

export async function POST(req: NextRequest) {
  // Always verify session & admin role directly inside the route handler
  const auth = await requireAdminSession(req);
  if (auth.errorResponse) return auth.errorResponse;

  const ip = getClientIp(req);
  const userAgent = req.headers.get('user-agent') || 'متصفح الويب المعتمد';
  const rl = checkSlidingWindowRateLimit({
    key: `auth:verify-admin:${ip}:${auth.session.userId}`,
    limit: 5,
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
      { ok: false, error: 'يرجى إدخال كلمة المرور الإدارية بشكل صحيح.' },
      { status: 400 }
    );
  }

  const bootstrapPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim() ?? '';
  if (!bootstrapPassword) {
    return NextResponse.json(
      { ok: false, error: 'خدمة التحقق الإداري غير مهيأة على الخادم حالياً.' },
      { status: 503 }
    );
  }

  const isMatch = timingSafeCompareStrings(parsed.data.password, bootstrapPassword);
  if (!isMatch) {
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
