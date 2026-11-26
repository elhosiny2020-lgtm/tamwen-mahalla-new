import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@/types';
import {
  SESSION_COOKIE_NAME,
  SessionPayload,
  verifySessionToken,
} from './session-token';

const ADMIN_ROLES = new Set<UserRole>([
  'super_admin',
  'admin',
  'supply_admin_manager',
  'department_manager',
]);

export function isAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.has(role);
}

export async function requireApiSession(
  req: NextRequest
): Promise<{ session: SessionPayload; errorResponse?: never } | { session?: never; errorResponse: NextResponse }> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  try {
    const session = await verifySessionToken(token);
    if (!session) {
      return {
        errorResponse: NextResponse.json(
          { ok: false, error: 'غير مصرح بالوصول — يرجى تسجيل الدخول أولاً.' },
          { status: 401, headers: { 'Cache-Control': 'no-store' } }
        ),
      };
    }
    return { session };
  } catch {
    return {
      errorResponse: NextResponse.json(
        { ok: false, error: 'تعذر التحقق من جلسة المصادقة في الخادم.' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      ),
    };
  }
}

export async function requireAdminSession(
  req: NextRequest
): Promise<{ session: SessionPayload; errorResponse?: never } | { session?: never; errorResponse: NextResponse }> {
  const auth = await requireApiSession(req);
  if (auth.errorResponse) return auth;

  if (!isAdminRole(auth.session.role)) {
    return {
      errorResponse: NextResponse.json(
        { ok: false, error: 'غير مسموح — هذا الإجراء مقصور على مدير النظام والمسؤولين المصرح لهم فقط.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      ),
    };
  }

  return { session: auth.session };
}
