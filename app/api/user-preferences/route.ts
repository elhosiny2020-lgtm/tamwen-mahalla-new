import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiSession } from '@/lib/server/auth-guard';
import { getValidatedSupabaseAdminConfig } from '@/lib/server/supabase-admin';

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

export async function GET(req: NextRequest) {
  // Always verify session directly in route handler before touching Supabase
  const auth = await requireApiSession(req);
  if (auth.errorResponse) return auth.errorResponse;

  const userId = req.nextUrl.searchParams.get('userId')?.trim() || '';
  if (!USER_ID_REGEX.test(userId) || userId === 'guest') {
    return NextResponse.json({ synced: false, source: 'local', preferences: null });
  }

  // Enforce strict per-user isolation: callers may only read their own preferences
  if (auth.session.userId !== userId) {
    return NextResponse.json(
      { ok: false, error: 'غير مسموح بقراءة تفضيلات مستخدم آخر.' },
      { status: 403 }
    );
  }

  const sb = getValidatedSupabaseAdminConfig();
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
  // Always verify session directly in route handler before touching Supabase
  const auth = await requireApiSession(req);
  if (auth.errorResponse) return auth.errorResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'صيغة JSON غير صالحة.' }, { status: 400 });
  }

  const parsed = PreferencesPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'إعدادات العرض غير صالحة.' }, { status: 400 });
  }

  const data = parsed.data;
  if (auth.session.userId !== data.userId) {
    return NextResponse.json(
      { ok: false, error: 'غير مسموح بتعديل تفضيلات مستخدم آخر.' },
      { status: 403 }
    );
  }

  if (data.userId === 'guest') {
    return NextResponse.json({ synced: false, source: 'local' });
  }

  const sb = getValidatedSupabaseAdminConfig();
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
