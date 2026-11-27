-- ============================================================================
-- جدول تفضيلات العرض والواجهة المستقلة لكل مستخدم (user_ui_preferences)
-- مديرية التموين والتجارة الداخلية بالغربية
-- يضمن عزل إعدادات كل مستخدم تماماً بحيث لا يمكن لمستخدم تعديل إعدادات مستخدم آخر
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.user_ui_preferences (
  user_id TEXT PRIMARY KEY,
  auth_uid UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  font_scale INTEGER NOT NULL DEFAULT 100 CHECK (font_scale BETWEEN 80 AND 150),
  language TEXT NOT NULL DEFAULT 'ar' CHECK (language IN ('ar', 'en')),
  theme_id TEXT NOT NULL DEFAULT 'frosted_teal' CHECK (
    theme_id IN (
      'frosted_teal',
      'gov_navy',
      'soft_white',
      'calm_gray',
      'calm_blue',
      'calm_green',
      'warm_beige',
      'dark_mode',
      'eye_comfort',
      'royal_emerald',
      'indigo_horizon',
      'burgundy_gold',
      'midnight_aurora',
      'desert_sand',
      'custom'
    )
  ),
  ui_layout TEXT NOT NULL DEFAULT 'frosted_slate' CHECK (
    ui_layout IN (
      'frosted_slate',
      'executive_command',
      'bento_mosaic',
      'royal_heritage',
      'ultra_minimal',
      'operations_cockpit'
    )
  ),
  custom_colors JSONB NOT NULL DEFAULT '{"background":"#BDC9D4","primary":"#253B4F","accent":"#94C9CE"}'::jsonb,
  display_mode TEXT NOT NULL DEFAULT 'auto' CHECK (display_mode IN ('auto', 'manual')),
  density TEXT NOT NULL DEFAULT 'comfortable' CHECK (density IN ('compact', 'comfortable', 'spacious')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.set_user_ui_prefs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_ui_preferences_updated_at ON public.user_ui_preferences;
CREATE TRIGGER trg_user_ui_preferences_updated_at
  BEFORE UPDATE ON public.user_ui_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_user_ui_prefs_updated_at();

ALTER TABLE public.user_ui_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ui_preferences FORCE ROW LEVEL SECURITY;

-- كل مستخدم يرى ويعدل صفه الشخصي فقط (auth.uid() = auth_uid)
DROP POLICY IF EXISTS "user_ui_prefs_select_own" ON public.user_ui_preferences;
CREATE POLICY "user_ui_prefs_select_own"
  ON public.user_ui_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_uid);

DROP POLICY IF EXISTS "user_ui_prefs_insert_own" ON public.user_ui_preferences;
CREATE POLICY "user_ui_prefs_insert_own"
  ON public.user_ui_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_uid);

DROP POLICY IF EXISTS "user_ui_prefs_update_own" ON public.user_ui_preferences;
CREATE POLICY "user_ui_prefs_update_own"
  ON public.user_ui_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_uid)
  WITH CHECK (auth.uid() = auth_uid);

DROP POLICY IF EXISTS "user_ui_prefs_delete_own" ON public.user_ui_preferences;
CREATE POLICY "user_ui_prefs_delete_own"
  ON public.user_ui_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = auth_uid);
