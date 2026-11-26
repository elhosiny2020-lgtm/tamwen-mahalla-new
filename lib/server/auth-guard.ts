import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@/types';
import { SESSION_COOKIE_NAME, verifySessionToken, type SessionPayload } from '@/lib/server/session-token';

// SECURITY NOTE: All Supabase tables must have Row Level Security (RLS) enabled in Supabase when connected.

export type Guard = { ok: true; session: SessionPayload } | { ok: false; response: NextResponse };

const ADMIN_ROLES = new Set<UserRole>([
  'super_admin',
  'admin',
  'supply_admin_manager',
  'department_manager',
]);

export function isAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.has(role);
}

function fail(status: number, error: string): Guard {
  return { ok: false, response: NextResponse.json({ ok: false, error }, { status, headers: { 'Cache-Control': 'no-store' } }) };
}

/** Call at the top of EVERY route handler / server action (middleware alone is not enough). */
export async function requireSession(request: NextRequest): Promise<Guard> {
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  return session ? { ok: true, session } : fail(401, 'غير مصرح بالوصول — يرجى تسجيل الدخول أولاً.');
}

/** For admin-only or role-restricted actions. */
export async function requireRole(request: NextRequest, roles: string[]): Promise<Guard> {
  const guard = await requireSession(request);
  if (!guard.ok) return guard;
  return roles.includes(guard.session.role) ? guard : fail(403, 'ليست لديك صلاحية لتنفيذ هذا الإجراء.');
}

export async function requireApiSession(
  req: NextRequest
): Promise<{ session: SessionPayload; errorResponse?: never } | { session?: never; errorResponse: NextResponse }> {
  const guard = await requireSession(req);
  if (!guard.ok) {
    return { errorResponse: guard.response };
  }
  return { session: guard.session };
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
