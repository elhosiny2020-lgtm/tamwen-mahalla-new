import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/server/auth-guard';
import { getValidatedSupabaseAdminConfig } from '@/lib/server/supabase-admin';

const USER_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

const NotificationToneEnum = z.enum([
  'crystal_chime',
  'executive_bell',
  'digital_pulse',
  'soft_marimba',
  'urgent_radar',
  'classic_ping',
]);

const NotificationCategoryAudioSchema = z
  .object({
    enabled: z.boolean(),
    tone: NotificationToneEnum,
  })
  .strict();

const PreferencesPayloadSchema = z
  .object({
    userId: z.string().regex(USER_ID_REGEX),
    fontScale: z.number().int().min(80).max(150),
    language: z.enum(['ar', 'en']),
    themeId: z.enum([
      'frosted_teal',
      'gov_navy',
      'soft_white',
      'calm_gray',
      'calm_blue',
      'calm_green',
      'warm_beige',
      'royal_emerald',
      'indigo_horizon',
      'burgundy_gold',
      'desert_sand',
      'dark_mode',
      'midnight_aurora',
      'eye_comfort',
      'crystal_glass',
      'obsidian_glass',
      'aurora_glass',
      'emerald_glass',
      'sapphire_executive',
      'copper_editorial',
      'custom',
    ]),
    uiLayout: z
      .enum([
        'frosted_slate',
        'executive_command',
        'bento_mosaic',
        'royal_heritage',
        'ultra_minimal',
        'operations_cockpit',
        'liquid_glass',
        'glass_split',
      ])
      .optional()
      .default('frosted_slate'),
    customColors: z
      .object({
        background: z.string().regex(HEX_COLOR_REGEX),
        primary: z.string().regex(HEX_COLOR_REGEX),
        accent: z.string().regex(HEX_COLOR_REGEX),
      })
      .strict(),
    displayMode: z.enum(['auto', 'manual']),
    density: z.enum(['compact', 'comfortable', 'spacious']),
    notificationAudio: z
      .object({
        masterEnabled: z.boolean(),
        volume: z.number().min(0.1).max(1),
        categories: z
          .object({
            task: NotificationCategoryAudioSchema,
            approval: NotificationCategoryAudioSchema,
            system: NotificationCategoryAudioSchema,
            security: NotificationCategoryAudioSchema,
          })
          .strict(),
      })
      .strict()
      .optional(),
    updatedAt: z.string().max(64).optional(),
  })
  .strict();

export async function GET(request: NextRequest) {
  // Always verify session directly in route handler before touching Supabase
  const g = await requireSession(request);
  if (!g.ok) return g.response;

  const userId = request.nextUrl.searchParams.get('userId')?.trim() || '';
  if (!USER_ID_REGEX.test(userId) || userId === 'guest') {
    return NextResponse.json({ synced: false, source: 'local', preferences: null });
  }

  // Enforce strict per-user isolation: callers may only read their own preferences
  if (g.session.sub !== userId) {
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
        themeId: typeof row.theme_id === 'string' ? row.theme_id : 'frosted_teal',
        uiLayout: typeof row.ui_layout === 'string' ? row.ui_layout : 'frosted_slate',
        customColors: row.custom_colors || {
          background: '#BDC9D4',
          primary: '#253B4F',
          accent: '#94C9CE',
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

export async function POST(request: NextRequest) {
  // Always verify session directly in route handler before touching Supabase
  const g = await requireSession(request);
  if (!g.ok) return g.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'صيغة JSON غير صالحة.' }, { status: 400 });
  }

  const parsed = PreferencesPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'إعدادات العرض غير صالحة.' }, { status: 400 });
  }

  const data = parsed.data;
  if (g.session.sub !== data.userId) {
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
        ui_layout: data.uiLayout,
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
