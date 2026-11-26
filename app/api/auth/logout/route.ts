import { NextRequest, NextResponse } from 'next/server';
import {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from '@/lib/server/session-token';
import { recordServerAuditLog } from '@/lib/server/audit-log-store';
import { getClientIp } from '@/lib/server/rate-limit';

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (session) {
    recordServerAuditLog({
      userId: session.userId,
      username: session.username,
      fullName: session.username,
      action: 'تسجيل خروج رسمي',
      module: 'بوابة المصادقة الموحدة',
      branchId: session.branchId,
      details: 'تم إنهاء جلسة المصادقة وإلغاء رمز الجلسة بنجاح',
      ipAddress: getClientIp(req),
      deviceInfo: req.headers.get('user-agent') || 'متصفح الويب المعتمد',
      status: 'success',
    });
  }

  const response = NextResponse.json(
    { ok: true },
    { headers: { 'Cache-Control': 'no-store' } }
  );
  response.cookies.set(SESSION_COOKIE_NAME, '', getSessionCookieOptions(0));
  return response;
}
