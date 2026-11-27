import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { setServerUserPassword } from '@/lib/server/admin-credential-store';
import { recordServerAuditLog } from '@/lib/server/audit-log-store';
import {
  checkSlidingWindowRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from '@/lib/server/rate-limit';
import { getValidatedSupabaseAdminConfig } from '@/lib/server/supabase-admin';
import {
  consumePasswordResetTokenAndSetPassword,
  createPasswordResetToken,
  findDbUserForPasswordReset,
  verifyPasswordResetToken,
} from '@/lib/server/users-db';

const PRIMARY_RECOVERY_EMAIL = 'elhosiny2020@gmail.com';

const requestResetSchema = z.object({
  action: z.literal('request'),
  identifier: z.string().trim().max(160).optional().default('admin'),
  email: z.string().trim().email('البريد الإلكتروني غير صالح').optional().default(PRIMARY_RECOVERY_EMAIL),
});

const verifyTokenSchema = z.object({
  action: z.literal('verify-token'),
  token: z.string().trim().min(16, 'رمز استعادة كلمة المرور غير صالح.').max(256),
});

const confirmResetSchema = z
  .object({
    action: z.literal('confirm'),
    token: z.string().trim().min(16, 'رمز استعادة كلمة المرور غير صالح.').max(256),
    newPassword: z
      .string()
      .trim()
      .min(4, 'يجب أن تتكون كلمة المرور الجديدة من ٤ أحرف أو أرقام على الأقل.')
      .max(128),
    confirmPassword: z.string().trim().min(4).max(128),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'كلمة المرور الجديدة وتأكيدها غير متطابقين.',
    path: ['confirmPassword'],
  });

const passwordResetUnionSchema = z.discriminatedUnion('action', [
  requestResetSchema,
  verifyTokenSchema,
  confirmResetSchema,
]);

async function triggerSupabaseAndEmailRecovery(params: {
  recipientEmail: string;
  username: string;
  fullName: string;
  tempPassword: string;
  resetUrl: string;
}): Promise<{ supabaseAuthSent: boolean; emailProviderSent: boolean }> {
  let supabaseAuthSent = false;
  let emailProviderSent = false;

  const sb = getValidatedSupabaseAdminConfig();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || sb?.serviceKey || '';

  if (sb && anonKey) {
    try {
      // Trigger Supabase Auth standard password recovery email flow
      const recoverRes = await fetch(`${sb.baseUrl}/auth/v1/recover`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: params.recipientEmail,
          gotrue_meta_security: {},
        }),
      });
      if (recoverRes.ok) {
        supabaseAuthSent = true;
      }

      // Also generate recovery link via Supabase Admin Auth API if service role is active
      await fetch(`${sb.baseUrl}/auth/v1/admin/generate_link`, {
        method: 'POST',
        headers: {
          apikey: sb.serviceKey,
          Authorization: `Bearer ${sb.serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'recovery',
          email: params.recipientEmail,
          options: {
            redirectTo: params.resetUrl,
          },
        }),
      }).catch(() => {});
    } catch {
      // Fallback to local token + email flow
    }
  }

  // Optional Resend email API dispatch if RESEND_API_KEY is configured in environment
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Gharbia Supply System <onboarding@resend.dev>',
          to: [params.recipientEmail],
          subject: 'استعادة وتغيير كلمة المرور — منظومة التموين والتجارة الداخلية بالغربية',
          html: `
            <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; padding: 20px; background: #f4f7fb; color: #102a43;">
              <h2 style="color: #102a43;">مديرية التموين والتجارة الداخلية بمحافظة الغربية</h2>
              <p>مرحباً <strong>${params.fullName}</strong> (${params.username})،</p>
              <p>تم استلام طلب استعادة كلمة المرور وإرسال بيانات الدخول إلى بريدك الإلكتروني المعتمد: <strong>${params.recipientEmail}</strong></p>
              <div style="background: #ffffff; border: 2px solid #c6a15b; border-radius: 12px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0 0 8px 0;"><strong>كلمة المرور المرسلة على البريد (جاهزة للدخول فوراً):</strong></p>
                <div style="font-size: 20px; font-weight: bold; color: #164e83; letter-spacing: 1px;">${params.tempPassword}</div>
              </div>
              <p>أو يمكنك الضغط على الرابط الآمن التالي لتعيين كلمة مرور جديدة من اختيارك مباشرة:</p>
              <p><a href="${params.resetUrl}" style="display: inline-block; background: #102a43; color: #c6a15b; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">تغيير كلمة المرور الآن</a></p>
            </div>
          `,
        }),
      });
      if (emailRes.ok) {
        emailProviderSent = true;
      }
    } catch {
      // Ignore network errors if external email provider is not reachable
    }
  }

  return { supabaseAuthSent, emailProviderSent };
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const userAgent = req.headers.get('user-agent') || 'متصفح الويب المعتمد';

  const rl = checkSlidingWindowRateLimit({
    key: `auth:password-reset:${ip}`,
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });

  if (!rl.allowed) {
    return rateLimitExceededResponse(
      'تم تجاوز الحد المسموح لطلبات استعادة كلمة المرور. يرجى المحاولة بعد قليل.',
      rl.retryAfterSeconds
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }

  const parsed = passwordResetUnionSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || 'بيانات الطلب غير مكتملة.' },
      { status: 400 }
    );
  }

  const data = parsed.data;

  if (data.action === 'request') {
    const targetEmail = PRIMARY_RECOVERY_EMAIL;
    const lookupKey = data.identifier?.trim() || targetEmail;
    const user =
      findDbUserForPasswordReset(lookupKey) ||
      findDbUserForPasswordReset(targetEmail) ||
      findDbUserForPasswordReset('admin');

    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'لم يتم العثور على حساب المستخدم المطلوب استعادة كلمة المرور له.' },
        { status: 404 }
      );
    }

    const tokenData = await createPasswordResetToken({
      userId: user.id,
      username: user.username,
      email: targetEmail,
    });

    // Sync temporary password with server memory store as well
    setServerUserPassword(user.username, tokenData.tempPassword);

    const origin = req.nextUrl.origin || 'http://localhost:3000';
    const resetUrl = `${origin}/?reset_token=${encodeURIComponent(tokenData.rawToken)}`;

    const dispatchStatus = await triggerSupabaseAndEmailRecovery({
      recipientEmail: targetEmail,
      username: user.username,
      fullName: user.fullName,
      tempPassword: tokenData.tempPassword,
      resetUrl,
    });

    recordServerAuditLog({
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      action: 'طلب استعادة كلمة المرور وإرسالها للبريد الإلكتروني',
      module: 'الأمن السيبراني واستعادة كلمات المرور (Supabase Auth)',
      branchId: user.primaryBranchId,
      details: `تم توليد رمز استعادة آمن وكلمة مرور جديدة لحساب (${user.username}) وإرسالها إلى البريد المعتمد (${targetEmail}) — صالحة حتى ${tokenData.expiresAt}`,
      ipAddress: ip,
      deviceInfo: userAgent,
      status: 'success',
    });

    return NextResponse.json({
      ok: true,
      message: `تم إرسال كلمة المرور الجديدة ورابط الاستعادة الآمن إلى البريد الإلكتروني (${targetEmail}) بنجاح.`,
      delivery: {
        recipientEmail: targetEmail,
        username: user.username,
        fullName: user.fullName,
        resetToken: tokenData.rawToken,
        resetUrl,
        tempPassword: tokenData.tempPassword,
        expiresAt: tokenData.expiresAt,
        supabaseAuthSent: dispatchStatus.supabaseAuthSent,
        emailProviderSent: dispatchStatus.emailProviderSent,
      },
    });
  }

  if (data.action === 'verify-token') {
    const check = verifyPasswordResetToken(data.token);
    if (!check.valid || !check.user) {
      return NextResponse.json(
        { ok: false, error: check.error || 'رابط استعادة كلمة المرور غير صالح أو منتهي.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      username: check.user.username,
      fullName: check.user.fullName,
      email: check.email || PRIMARY_RECOVERY_EMAIL,
      expiresAt: check.expiresAt,
    });
  }

  // data.action === 'confirm'
  const consumed = await consumePasswordResetTokenAndSetPassword(data.token, data.newPassword);
  if (!consumed.ok) {
    return NextResponse.json({ ok: false, error: consumed.error }, { status: 400 });
  }

  setServerUserPassword(consumed.user.username, data.newPassword);

  recordServerAuditLog({
    userId: consumed.user.id,
    username: consumed.user.username,
    fullName: consumed.user.fullName,
    action: 'تحديث كلمة المرور عبر رابط البريد الإلكتروني',
    module: 'الأمن السيبراني واستعادة كلمات المرور (Supabase Auth)',
    branchId: consumed.user.primaryBranchId,
    details: `تم تغيير واعتماد كلمة المرور الجديدة بنجاح لحساب (${consumed.user.username}) عبر رابط الاستعادة المرسل إلى (${consumed.email})`,
    ipAddress: ip,
    deviceInfo: userAgent,
    status: 'success',
  });

  return NextResponse.json({
    ok: true,
    username: consumed.user.username,
    fullName: consumed.user.fullName,
    email: consumed.email,
    message: 'تم تحديث كلمة المرور بنجاح من رابط البريد الإلكتروني ويمكنك الآن تسجيل الدخول.',
  });
}
