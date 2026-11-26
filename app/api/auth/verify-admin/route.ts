import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/server/auth-guard';
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
  const rl = checkSlidingWindowRateLimit({
    key: `auth:verify-admin:${ip}:${auth.session.userId}`,
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.allowed) {
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

  // TODO: Replace single ADMIN_BOOTSTRAP_PASSWORD check with per-user salted password hash
  // verification against database records once server-side user accounts table is active.
  const bootstrapPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim() ?? '';
  if (!bootstrapPassword) {
    return NextResponse.json(
      { ok: false, error: 'خدمة التحقق الإداري غير مهيأة على الخادم حالياً.' },
      { status: 503 }
    );
  }

  const isMatch = timingSafeCompareStrings(parsed.data.password, bootstrapPassword);
  if (!isMatch) {
    return NextResponse.json(
      { ok: false, error: 'كلمة المرور الإدارية غير صحيحة.' },
      { status: 403 }
    );
  }

  return NextResponse.json(
    { ok: true, verified: true, userId: auth.session.userId, role: auth.session.role },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
