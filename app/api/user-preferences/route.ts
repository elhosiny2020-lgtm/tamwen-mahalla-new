import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const USER_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

const PreferencesPayloadSchema = z.object({
  userId: z.string().regex(USER_ID_REGEX),
  fontScale: z.number().int().min(80).max(150),
  language: z.enum(['ar', 'en']),
  themeId: z.enum([
    'gov_navy',
    'soft_white',
    'calm_gray',
    'calm_blue',
    'calm_green',
    'warm_beige',
    'dark_mode',
    'eye_comfort',
    'custom',
  ]),
  customColors: z.object({
    background: z.string().regex(HEX_COLOR_REGEX),
    primary: z.string().regex(HEX_COLOR_REGEX),
    accent: z.string().regex(HEX_COLOR_REGEX),
  }),
  displayMode: z.enum(['auto', 'manual']),
  density: z.enum(['compact', 'comfortable', 'spacious']),
  updatedAt: z.string().max(64).optional(),
});

function getValidatedSupabaseConfig(): { baseUrl: string; serviceKey: string } | null {
  const rawUrl = process.env.SUPABASE_URL?.trim() || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
  if (!rawUrl || !serviceKey) return null;

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return null;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '169.254.169.254' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.')
    ) {
      return null;
    }
    return { baseUrl: parsed.origin, serviceKey };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')?.trim() || '';
  const actorUserId = req.headers.get('x-actor-user-id')?.trim() || '';

  if (!USER_ID_REGEX.test(userId) || userId === 'guest') {
    return NextResponse.json({ synced: false, source: 'local', preferences: null });
  }

  // Enforce strict per-user isolation: callers may only read their own record
  if (actorUserId && actorUserId !== userId) {
    return NextResponse.json({ error: 'Forbidden cross-user preference read' }, { status: 403 });
  }

  const sb = getValidatedSupabaseConfig();
  if (!sb) {
    return NextResponse.json({ synced: false, source: 'local', preferences: null });
  }

  try {
    const endpoint = `${sb.baseUrl}/rest/v1/user_ui_preferences?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`;
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: sb.serviceKey,
        Authorization: `Bearer ${sb.serviceKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ synced: false, source: 'local', preferences: null });
    }

    const rows = (await res.json()) as Array<Record<string, unknown>>;
    const row = rows[0];
    if (!row) {
      return NextResponse.json({ synced: true, source: 'supabase', preferences: null });
    }

    return NextResponse.json({
      synced: true,
      source: 'supabase',
      preferences: {
        fontScale: Number(row.font_scale) || 100,
        language: row.language === 'en' ? 'en' : 'ar',
        themeId: typeof row.theme_id === 'string' ? row.theme_id : 'gov_navy',
        customColors: row.custom_colors || {
          background: '#F4F7FB',
          primary: '#102A43',
          accent: '#C6A15B',
        },
        displayMode: row.display_mode === 'manual' ? 'manual' : 'auto',
        density:
          row.density === 'compact' || row.density === 'spacious' ? row.density : 'comfortable',
        updatedAt: typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ synced: false, source: 'local', preferences: null });
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const parsed = PreferencesPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid preference settings' }, { status: 400 });
  }

  const data = parsed.data;
  const actorUserId = req.headers.get('x-actor-user-id')?.trim() || '';

  // Prevent any user from modifying another user's preferences
  if (actorUserId && actorUserId !== data.userId) {
    return NextResponse.json({ error: 'Forbidden cross-user preference update' }, { status: 403 });
  }

  if (data.userId === 'guest') {
    return NextResponse.json({ synced: false, source: 'local' });
  }

  const sb = getValidatedSupabaseConfig();
  if (!sb) {
    return NextResponse.json({ synced: false, source: 'local' });
  }

  try {
    const endpoint = `${sb.baseUrl}/rest/v1/user_ui_preferences?on_conflict=user_id`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: sb.serviceKey,
        Authorization: `Bearer ${sb.serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        user_id: data.userId,
        font_scale: data.fontScale,
        language: data.language,
        theme_id: data.themeId,
        custom_colors: data.customColors,
        display_mode: data.displayMode,
        density: data.density,
        updated_at: data.updatedAt || new Date().toISOString(),
      }),
    });

    return NextResponse.json({
      synced: res.ok,
      source: res.ok ? 'supabase' : 'local',
    });
  } catch {
    return NextResponse.json({ synced: false, source: 'local' });
  }
}
