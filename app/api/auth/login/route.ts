import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_USERS } from '@/lib/mock-db';
import { loginFormSchema } from '@/lib/zod-schemas';
import { recordServerAuditLog } from '@/lib/server/audit-log-store';
import {
  checkSlidingWindowRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from '@/lib/server/rate-limit';
import {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  signSessionToken,
} from '@/lib/server/session-token';
import { getRoleArabicLabel } from '@/lib/utils';

function timingSafeCompareStrings(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const hashB = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(hashA, hashB) && a.length === b.length;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const userAgent = req.headers.get('user-agent') || 'متصفح الويب المعتمد';
  const rl = checkSlidingWindowRateLimit({
    key: `auth:login:${ip}`,
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.allowed) {
    recordServerAuditLog({
      userId: 'anonymous',
      username: 'rate_limited',
      fullName: 'محاولة متكررة',
      action: 'تجاوز حد محاولات تسجيل الدخول',
      module: 'بوابة المصادقة الموحدة',
      details: 'تم حظر المحاولة مؤقتاً لتجاوز ٥ محاولات خلال ١٠ دقائق',
      ipAddress: ip,
      deviceInfo: userAgent,
      status: 'warning',
    });
    return rateLimitExceededResponse(
      'تم تجاوز الحد الأقصى لمحاولات تسجيل الدخول (٥ محاولات خلال ١٠ دقائق). يرجى المحاولة لاحقاً.',
      rl.retryAfterSeconds
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'بيانات الطلب غير صالحة.' }, { status: 400 });
  }

  const parsed = loginFormSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || 'يرجى إدخال اسم المستخدم وكلمة المرور بشكل صحيح.' },
      { status: 400 }
    );
  }

  const { username, password, branchId } = parsed.data;
  const trimmedUsername = username.toLowerCase();
  const user =
    INITIAL_USERS.find((u) => u.username.toLowerCase() === trimmedUsername) ||
    (trimmedUsername === 'admin' ? INITIAL_USERS[0] : undefined);

  if (!user) {
    recordServerAuditLog({
      userId: 'anonymous',
      username,
      fullName: 'مستخدم غير مسجل',
      action: 'محاولة تسجيل دخول فاشلة',
      module: 'بوابة المصادقة الموحدة',
      details: `محاولة دخول باسم مستخدم غير مسجل (${username})`,
      ipAddress: ip,
      deviceInfo: userAgent,
      status: 'failed',
    });
    return NextResponse.json(
      { ok: false, error: 'بيانات الدخول غير صحيحة.' },
      { status: 401 }
    );
  }

  if (user.status === 'suspended' || user.status === 'inactive') {
    recordServerAuditLog({
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      action: 'محاولة دخول لحساب موقوف',
      module: 'بوابة المصادقة الموحدة',
      branchId: branchId || user.primaryBranchId,
      details: 'تم رفض الدخول لأن الحساب موقوف إدارياً',
      ipAddress: ip,
      deviceInfo: userAgent,
      status: 'failed',
    });
    return NextResponse.json(
      { ok: false, error: 'عذراً، هذا الحساب موقوف إدارياً. يرجى مراجعة مدير النظام.' },
      { status: 403 }
    );
  }

  const bootstrapPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim() ?? '';
  if (bootstrapPassword && !timingSafeCompareStrings(password, bootstrapPassword)) {
    recordServerAuditLog({
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      action: 'محاولة تسجيل دخول فاشلة (كلمة مرور خاطئة)',
      module: 'بوابة المصادقة الموحدة',
      branchId: branchId || user.primaryBranchId,
      details: 'كلمة المرور المدخلة غير مطابقة',
      ipAddress: ip,
      deviceInfo: userAgent,
      status: 'failed',
    });
    return NextResponse.json(
      { ok: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' },
      { status: 401 }
    );
  }

  try {
    const activeBranch = branchId || user.primaryBranchId;
    const token = await signSessionToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      branchId: activeBranch,
    });

    recordServerAuditLog({
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      action: 'تسجيل دخول رسمي ناجح',
      module: 'بوابة المصادقة الموحدة',
      branchId: activeBranch,
      details: `تم إصدار جلسة مصادقة رسمية بدور (${getRoleArabicLabel(user.role)})`,
      ipAddress: ip,
      deviceInfo: userAgent,
      status: 'success',
    });

    const response = NextResponse.json(
      {
        ok: true,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          primaryBranchId: activeBranch,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );

    response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'تعذر إنشاء جلسة المصادقة على الخادم حالياً.' },
      { status: 500 }
    );
  }
}
