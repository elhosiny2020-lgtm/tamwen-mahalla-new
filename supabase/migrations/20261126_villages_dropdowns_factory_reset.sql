-- ============================================================================
-- منظومة التموين والتجارة الداخلية بالغربية
-- مخطط القرى والوحدات المحلية المتدرجة + القوائم المنسدلة الذكية + إعادة ضبط المصنع الآمنة
-- ============================================================================

-- 1. جدول القرى والشياخات الرئيسي
CREATE TABLE IF NOT EXISTS public.managed_villages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  village_name TEXT NOT NULL,
  supply_administration TEXT NOT NULL DEFAULT 'إدارة تموين مركز المحلة الكبرى',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_managed_villages_name_admin UNIQUE (village_name, supply_administration)
);

-- 2. جدول الوحدات المحلية التابعة لكل قرية (عدد غير محدود لكل قرية)
CREATE TABLE IF NOT EXISTS public.managed_local_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  village_id UUID NOT NULL REFERENCES public.managed_villages(id) ON DELETE RESTRICT,
  unit_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_managed_local_units_per_village UNIQUE (village_id, unit_name)
);

CREATE INDEX IF NOT EXISTS idx_managed_local_units_village_id
  ON public.managed_local_units(village_id);

-- 3. جدول مجموعات القوائم المنسدلة (يدعم إنشاء قوائم جديدة مستقبلاً دون تعديل برمجي)
CREATE TABLE IF NOT EXISTS public.dropdown_list_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_key TEXT NOT NULL UNIQUE,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_ar TEXT DEFAULT '',
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. جدول عناصر القوائم المنسدلة (يدعم التسلسل الهرمي + الترتيب + التعطيل الآمن + منع التكرار)
CREATE TABLE IF NOT EXISTS public.dropdown_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_key TEXT NOT NULL REFERENCES public.dropdown_list_groups(group_key) ON DELETE RESTRICT,
  parent_item_id UUID REFERENCES public.dropdown_list_items(id) ON DELETE RESTRICT,
  label TEXT NOT NULL,
  authority_or_meta TEXT DEFAULT '',
  default_validity_months INTEGER NOT NULL DEFAULT 12,
  default_expiry_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_dropdown_item_label_per_group UNIQUE (group_key, label)
);

CREATE INDEX IF NOT EXISTS idx_dropdown_list_items_group_key
  ON public.dropdown_list_items(group_key, sort_order);

-- 5. جدول النسخ الاحتياطية القابلة للاسترجاع قبل إعادة ضبط المصنع
CREATE TABLE IF NOT EXISTS public.section_factory_reset_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL,
  section_name TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  total_records INTEGER NOT NULL DEFAULT 0,
  tables_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
  snapshot_payload JSONB NOT NULL,
  checksum TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. جدول سجل التدقيق الأمني لعمليات إعادة ضبط المصنع (محمي من الحذف)
CREATE TABLE IF NOT EXISTS public.factory_reset_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL,
  section_name TEXT NOT NULL,
  executed_by_user_id TEXT NOT NULL,
  executed_by_name TEXT NOT NULL,
  executed_by_role TEXT NOT NULL,
  backup_id UUID REFERENCES public.section_factory_reset_backups(id) ON DELETE SET NULL,
  include_custom_lists BOOLEAN NOT NULL DEFAULT FALSE,
  total_deleted_records INTEGER NOT NULL DEFAULT 0,
  tables_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('completed', 'aborted', 'failed')),
  error_message TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. تفعيل سياسات الحماية Row Level Security
ALTER TABLE public.managed_villages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.managed_local_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dropdown_list_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dropdown_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_factory_reset_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factory_reset_audit_logs ENABLE ROW LEVEL SECURITY;
