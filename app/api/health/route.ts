import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { ok: true, status: 'healthy', timestamp: new Date().toISOString() },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
