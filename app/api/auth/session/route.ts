import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/server/session-token';
import { isAdminRole } from '@/lib/server/auth-guard';

/**
 * GET /api/auth/session
 * Returns active session metadata including expiration timestamp (`exp`, `iat`, `remainingSeconds`)
 * and role claims so client-side hooks and role guards can inspect session state and detect near-expiration.
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    return NextResponse.json(
      {
        ok: false,
        authenticated: false,
        session: null,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const remainingSeconds = Math.max(0, session.exp - nowSec);

  return NextResponse.json(
    {
      ok: true,
      authenticated: true,
      session: {
        userId: session.userId,
        username: session.username,
        role: session.role,
        branchId: session.branchId,
        isAdmin: isAdminRole(session.role),
        iat: session.iat,
        exp: session.exp,
        remainingSeconds,
      },
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
