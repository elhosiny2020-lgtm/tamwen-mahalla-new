import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/server/session-token';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// ONLY routes that must work without a session. Everything else under /api requires one.
// Before finalizing: list app/api/**/route.ts and keep here only the ones that truly need to be public.
const PUBLIC_API = new Set<string>(['/api/auth/login', '/api/auth/logout', '/api/auth/session', '/api/health']);

function deny(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

function isTrustedRequest(request: NextRequest): boolean {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const source = request.headers.get('origin') ?? request.headers.get('referer');
  if (host && source) {
    try {
      const sourceHost = new URL(source).host;
      const primaryHost = host.split(',')[0]?.trim();
      if (sourceHost === primaryHost) return true;
    } catch {
      return false;
    }
  }
  const site = request.headers.get('sec-fetch-site');
  if (site === 'same-origin') return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname.replace(/\/+$/, '') || '/';

  if (MUTATING_METHODS.has(request.method) && !isTrustedRequest(request)) {
    return deny(403, 'تم رفض الطلب لعدم تطابق المصدر (CSRF Protection).');
  }

  if (!PUBLIC_API.has(pathname)) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await verifySessionToken(token);
    if (!session) return deny(401, 'غير مصرح بالوصول — يرجى تسجيل الدخول أولاً.');
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
