import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { INITIAL_USERS } from '@/lib/mock-db';
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

const LoginBodySchema = z.object({
  username: z.string().trim().min(1, 'اسم المستخدم مطلوب').max(80),
  password: z.string().min(1, 'كلمة المرور مطلوبة').max(256),
  branchId: z.string().trim().max(40).optional(),
});

function timingSafeCompareStrings(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const hashB = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(hashA, hashB) && a.length === b.length;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkSlidingWindowRateLimit({
    key: `auth:login:${ip}`,
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.allowed) {
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

  const parsed = LoginBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'يرجى إدخال اسم المستخدم وكلمة المرور بشكل صحيح.' },
      { status: 400 }
    );
  }

  const { username, password, branchId } = parsed.data;
  const trimmedUsername = username.toLowerCase();
  const user = INITIAL_USERS.find((u) => u.username.toLowerCase() === trimmedUsername);

  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'بيانات الدخول غير صحيحة.' },
      { status: 401 }
    );
  }

  if (user.status === 'suspended' || user.status === 'inactive') {
    return NextResponse.json(
      { ok: false, error: 'عذراً، هذا الحساب موقوف إدارياً. يرجى مراجعة مدير النظام.' },
      { status: 403 }
    );
  }

  // TODO: Replace single ADMIN_BOOTSTRAP_PASSWORD check with per-user hashed credentials
  // (e.g. scrypt/argon2 password_hash column in Supabase users table) when DB auth is enabled.
  const bootstrapPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim() ?? '';
  if (!bootstrapPassword) {
    return NextResponse.json(
      { ok: false, error: 'خدمة المصادقة غير مهيأة بالكامل على الخادم حالياً.' },
      { status: 503 }
    );
  }

  if (!timingSafeCompareStrings(password, bootstrapPassword)) {
    return NextResponse.json(
      { ok: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' },
      { status: 401 }
    );
  }

  try {
    const token = await signSessionToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      branchId: branchId || user.primaryBranchId,
    });

    const response = NextResponse.json(
      {
        ok: true,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          primaryBranchId: branchId || user.primaryBranchId,
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
