import type { UserRole } from '@/types';

/**
 * Edge-compatible HMAC-SHA256 session token signer & verifier using Web Crypto API only.
 * No node:crypto and no Buffer imports so middleware.ts runs natively on the Edge runtime.
 */

export const SESSION_COOKIE_NAME = 'gharbia_supply_session';
export const DEFAULT_SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 hours

export interface SessionPayload {
  sub?: string;
  userId: string;
  username: string;
  role: UserRole;
  branchId?: string;
  iat: number;
  exp: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Ephemeral in-memory fallback secret (32 random bytes = 64 hex chars) when AUTH_SECRET is not configured in env
const globalForAuth = globalThis as unknown as { __gharbiaEphemeralAuthSecret?: string };

function getOrGenerateEphemeralSecret(): string {
  if (!globalForAuth.__gharbiaEphemeralAuthSecret) {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    globalForAuth.__gharbiaEphemeralAuthSecret = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return globalForAuth.__gharbiaEphemeralAuthSecret;
}

function getValidatedAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim() ?? '';
  if (secret.length >= 32) {
    return secret;
  }
  return getOrGenerateEphemeralSecret();
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(input: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(input)) return null;
  const padded = input + '='.repeat((4 - (input.length % 4)) % 4);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function importHmacKey(secret: string, usage: 'sign' | 'verify'): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage]
  );
}

/**
 * Constant-time string comparison using Web Crypto SHA-256 digests (Edge-compatible).
 */
export async function constantTimeCompareEdge(a: string, b: string): Promise<boolean> {
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);
  const bytesA = new Uint8Array(hashA);
  const bytesB = new Uint8Array(hashB);
  let diff = a.length ^ b.length;
  for (let i = 0; i < bytesA.length; i++) {
    diff |= bytesA[i] ^ bytesB[i];
  }
  return diff === 0;
}

export async function signSessionToken(
  claims: Omit<SessionPayload, 'iat' | 'exp'>,
  ttlSeconds: number = DEFAULT_SESSION_TTL_SECONDS
): Promise<string> {
  const secret = getValidatedAuthSecret();
  const nowSec = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: claims.sub || claims.userId,
    userId: claims.userId,
    username: claims.username,
    role: claims.role,
    branchId: claims.branchId,
    iat: nowSec,
    exp: nowSec + ttlSeconds,
  };

  const headerPart = bytesToBase64Url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payloadPart = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signingInput = `${headerPart}.${payloadPart}`;

  const key = await importHmacKey(secret, 'sign');
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput));
  const signaturePart = bytesToBase64Url(new Uint8Array(signatureBuffer));

  return `${signingInput}.${signaturePart}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) {
    return null;
  }
  const secret = getValidatedAuthSecret();

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerPart, payloadPart, signaturePart] = parts;
  const sigBytes = base64UrlToBytes(signaturePart);
  const payloadBytes = base64UrlToBytes(payloadPart);
  if (!sigBytes || !payloadBytes) return null;

  try {
    const key = await importHmacKey(secret, 'verify');
    const signingInputBytes = encoder.encode(`${headerPart}.${payloadPart}`);
    const sigBuffer = new ArrayBuffer(sigBytes.byteLength);
    new Uint8Array(sigBuffer).set(sigBytes);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBuffer,
      signingInputBytes
    );
    if (!valid) return null;

    const decoded = JSON.parse(decoder.decode(payloadBytes)) as Partial<SessionPayload>;
    const resolvedUserId = decoded?.userId || decoded?.sub;
    if (
      !decoded ||
      typeof resolvedUserId !== 'string' ||
      !resolvedUserId ||
      typeof decoded.username !== 'string' ||
      !decoded.username ||
      typeof decoded.role !== 'string' ||
      typeof decoded.exp !== 'number'
    ) {
      return null;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (decoded.exp <= nowSec) {
      return null;
    }

    return {
      sub: resolvedUserId,
      userId: resolvedUserId,
      username: decoded.username,
      role: decoded.role as UserRole,
      branchId: typeof decoded.branchId === 'string' ? decoded.branchId : undefined,
      iat: typeof decoded.iat === 'number' ? decoded.iat : nowSec,
      exp: decoded.exp,
    };
  } catch {
    return null;
  }
}

export function getSessionCookieOptions(maxAgeSeconds: number = DEFAULT_SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'none' as const,
    partitioned: true,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
