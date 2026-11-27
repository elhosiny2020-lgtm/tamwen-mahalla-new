import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/server/auth-guard';
import { recordServerAuditLog } from '@/lib/server/audit-log-store';
import {
  deleteServerUserPassword,
  setServerUserPassword,
} from '@/lib/server/admin-credential-store';
import { getClientIp } from '@/lib/server/rate-limit';

const ManagePasswordSchema = z.object({
  action: z.enum(['set', 'delete']),
  username: z.string().trim().min(1).max(80),
  password: z.string().min(4).max(256).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (auth.errorResponse) return auth.errorResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'بيانات الطلب غير صالحة.' }, { status: 400 });
  }

  const parsed = ManagePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'يرجى إدخال اسم المستخدم وكلمة المرور (٤ أحرف على الأقل).' },
      { status: 400 }
    );
  }

  const { action, username, password } = parsed.data;
  const ip = getClientIp(req);
  const userAgent = req.headers.get('user-agent') || 'متصفح الويب المعتمد';

  if (action === 'delete') {
    deleteServerUserPassword(username);
    recordServerAuditLog({
      userId: auth.session.userId,
      username: auth.session.username,
      fullName: auth.session.username,
      action: 'حذف كلمة مرور مستخدم',
      module: 'إدارة المستخدمين والصلاحيات',
      branchId: auth.session.branchId,
      details: `تم حذف كلمة مرور الحساب (${username}) وتعطيل الدخول بها لحين تعيين كلمة مرور جديدة`,
      ipAddress: ip,
      deviceInfo: userAgent,
      status: 'success',
    });
    return NextResponse.json({ ok: true, action: 'deleted' });
  }

  if (!password || password.trim().length < 4) {
    return NextResponse.json(
      { ok: false, error: 'كلمة المرور يجب ألا تقل عن ٤ أحرف.' },
      { status: 400 }
    );
  }

  const res = setServerUserPassword(username, password, auth.session.username);
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: 'تعذر تحديث كلمة المرور.' }, { status: 400 });
  }

  recordServerAuditLog({
    userId: auth.session.userId,
    username: auth.session.username,
    fullName: auth.session.username,
    action: 'إضافة / تعديل كلمة مرور مستخدم',
    module: 'إدارة المستخدمين والصلاحيات',
    branchId: auth.session.branchId,
    details: `تم تعيين أو تحديث كلمة مرور الحساب (${username}) بنجاح`,
    ipAddress: ip,
    deviceInfo: userAgent,
    status: 'success',
  });

  return NextResponse.json({ ok: true, action: 'set' });
}
