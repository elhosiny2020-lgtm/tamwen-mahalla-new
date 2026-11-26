import { NextRequest, NextResponse } from 'next/server';

/**
 * In-memory sliding window rate limiter keyed by IP + route (+ optional userId).
 * Note: For multi-instance horizontal scaling, replace backing store with Redis/Upstash.
 */

interface RateBucket {
  timestamps: number[];
}

const rateBuckets = new Map<string, RateBucket>();
const MAX_BUCKETS = 5000;

export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip')?.trim();
  return realIp || 'unknown';
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
  const now = Date.now();
  const cutoff = now - params.windowMs;

  if (rateBuckets.size > MAX_BUCKETS) {
    for (const [k, bucket] of rateBuckets.entries()) {
      const active = bucket.timestamps.filter((t) => t > cutoff);
      if (active.length === 0) {
        rateBuckets.delete(k);
      } else {
        bucket.timestamps = active;
      }
    }
  }

  const bucket = rateBuckets.get(params.key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  if (bucket.timestamps.length >= params.limit) {
    const oldestInWindow = bucket.timestamps[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldestInWindow + params.windowMs - now) / 1000));
    rateBuckets.set(params.key, bucket);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  bucket.timestamps.push(now);
  rateBuckets.set(params.key, bucket);
  return {
    allowed: true,
    remaining: Math.max(0, params.limit - bucket.timestamps.length),
    retryAfterSeconds: 0,
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
