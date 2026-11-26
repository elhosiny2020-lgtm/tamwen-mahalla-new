import { NextRequest, NextResponse } from 'next/server';

// In-memory sliding window. Per-instance only: replace with Redis/Supabase if running multiple instances.
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false, retryAfter: Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000)) };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return { ok: true, retryAfter: 0 };
}

/** On Cloud Run the LAST x-forwarded-for entry is the one appended by Google's frontend; earlier entries can be spoofed. */
export function clientIp(request: Request): string {
  const parts = (request.headers.get('x-forwarded-for') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 1] ?? 'unknown';
}

export function getClientIp(req: NextRequest | Request): string {
  return clientIp(req);
}

export function tooManyRequests(retryAfter: number): NextResponse {
  return NextResponse.json(
    { ok: false, error: 'عدد المحاولات كبير جداً. حاول مرة أخرى لاحقاً.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter), 'Cache-Control': 'no-store' } }
  );
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkSlidingWindowRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const res = rateLimit(params.key, params.limit, params.windowMs);
  return {
    allowed: res.ok,
    remaining: res.ok ? 1 : 0,
    retryAfterSeconds: res.retryAfter,
  };
}

export function rateLimitExceededResponse(messageAr: string, retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { ok: false, error: messageAr },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
        'Cache-Control': 'no-store',
      },
    }
  );
}
