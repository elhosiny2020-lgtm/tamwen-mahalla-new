-- ============================================================================
-- منظومة قسم السلع التموينية — مديرية التموين والتجارة الداخلية بالغربية
-- Supabase / PostgreSQL Migration:
--   1. ration_commodities (+ ration_commodity_price_history)
--   2. ration_merchants (+ ration_merchant_followup_logs)
--   3. ration_quotas
--   4. ration_warehouses (+ ration_warehouse_ledger_movements, transfers, stocktakes)
-- مع فهارس بحث سريعة وقيود تكامل مرجعي وسياسات أمان Row-Level Security (RLS).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- دالة مساعدة لتحديث الطابع الزمني updated_at تلقائياً
CREATE OR REPLACE FUNCTION public.set_ration_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- دالة مساعدة آمنة لاستخراج الدور الوظيفي من app_metadata المدار من الخادم فقط
CREATE OR REPLACE FUNCTION public.current_supply_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

-- ============================================================================
-- 1. جدول السلع التموينية (ration_commodities)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ration_commodities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity_code TEXT NOT NULL UNIQUE,
  commodity_name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  pack_weight_or_size TEXT NOT NULL DEFAULT '',
  official_subsidized_price_egp NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (official_subsidized_price_egp >= 0),
  wholesale_price_egp NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (wholesale_price_egp >= 0),
  merchant_margin_egp NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (merchant_margin_egp >= 0),
  official_free_price_egp NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (official_free_price_egp >= 0),
  max_quantity_per_beneficiary NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (max_quantity_per_beneficiary >= 0),
  max_quantity_per_card NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (max_quantity_per_card >= 0),
  supply_source TEXT NOT NULL DEFAULT '',
  storage_nature TEXT NOT NULL DEFAULT 'جاف' CHECK (storage_nature IN ('جاف', 'مبرد', 'حساس للرطوبة', 'معلب')),
  shelf_life_months INTEGER NOT NULL DEFAULT 12 CHECK (shelf_life_months >= 0),
  min_safety_stock NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (min_safety_stock >= 0),
  reorder_level NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  status TEXT NOT NULL DEFAULT 'نشط' CHECK (status IN ('نشط', 'موقوف مؤقتاً', 'غير متوفر', 'ملغى')),
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_ration_commodities_updated_at
  BEFORE UPDATE ON public.ration_commodities
  FOR EACH ROW EXECUTE FUNCTION public.set_ration_updated_at();

-- سجل تاريخ أسعار السلع (غير قابل للتعديل أو الحذف لضمان التدقيق)
CREATE TABLE IF NOT EXISTS public.ration_commodity_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity_id UUID NOT NULL REFERENCES public.ration_commodities(id) ON DELETE RESTRICT,
  commodity_code TEXT NOT NULL,
  commodity_name TEXT NOT NULL,
  previous_price_egp NUMERIC(12,2) NOT NULL CHECK (previous_price_egp >= 0),
  new_price_egp NUMERIC(12,2) NOT NULL CHECK (new_price_egp >= 0),
  effective_date DATE NOT NULL,
  price_source TEXT NOT NULL,
  decree_number TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'معتمد' CHECK (approval_status IN ('معتمد', 'قيد المراجعة')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. جدول التجار التموينيين (ration_merchants) — 30 حقلاً كاملاً بالتراخيص
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ration_merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_code TEXT NOT NULL UNIQUE,
  file_number TEXT NOT NULL UNIQUE,
  merchant_name TEXT NOT NULL,
  outlet_trade_name TEXT NOT NULL DEFAULT '',
  outlet_type TEXT NOT NULL DEFAULT 'بقال تمويني' CHECK (outlet_type IN ('بقال تمويني', 'مشروع جمعيتي', 'مجمع استهلاكي')),
  national_id TEXT NOT NULL,
  phone_number TEXT NOT NULL DEFAULT '',
  mobile_number TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  supply_administration TEXT NOT NULL,
  supply_office TEXT NOT NULL DEFAULT '',
  local_unit TEXT NOT NULL,
  village TEXT NOT NULL,
  detailed_address TEXT NOT NULL DEFAULT '',
  gps_coordinates TEXT NOT NULL DEFAULT '',
  pos_machine_number TEXT NOT NULL UNIQUE,
  smart_card_code TEXT NOT NULL DEFAULT '',
  wholesale_branch_name TEXT NOT NULL DEFAULT '',
  license_number TEXT NOT NULL DEFAULT '',
  license_expiry_date DATE,
  tax_card_number TEXT NOT NULL DEFAULT '',
  tax_card_expiry_date DATE,
  commercial_register_number TEXT NOT NULL DEFAULT '',
  commercial_register_expiry_date DATE,
  insurance_amount_egp NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (insurance_amount_egp >= 0),
  linked_cards_count INTEGER NOT NULL DEFAULT 0 CHECK (linked_cards_count >= 0),
  linked_beneficiaries_count INTEGER NOT NULL DEFAULT 0 CHECK (linked_beneficiaries_count >= 0),
  monthly_approved_quota_value_egp NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (monthly_approved_quota_value_egp >= 0),
  status TEXT NOT NULL DEFAULT 'نشط' CHECK (
    status IN ('نشط', 'موقوف مؤقتاً', 'تحت المراجعة', 'مغلق', 'منتهي الترخيص', 'مخالف', 'مسحوب الترخيص')
  ),
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_ration_merchants_updated_at
  BEFORE UPDATE ON public.ration_merchants
  FOR EACH ROW EXECUTE FUNCTION public.set_ration_updated_at();

-- سجل متابعة وتفتيش التجار التموينيين
CREATE TABLE IF NOT EXISTS public.ration_merchant_followup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.ration_merchants(id) ON DELETE RESTRICT,
  merchant_code TEXT NOT NULL,
  merchant_name TEXT NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('زيارة تفتيشية', 'شكوى مواطن', 'إنذار إداري', 'إيقاف مؤقت', 'تجديد مستندات')
  ),
  summary TEXT NOT NULL,
  recorded_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'مفتوح' CHECK (status IN ('مفتوح', 'تمت المعالجة')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. جدول الحصص التموينية (ration_quotas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ration_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quota_code TEXT NOT NULL UNIQUE,
  period_label TEXT NOT NULL,
  periodicity TEXT NOT NULL DEFAULT 'شهري' CHECK (
    periodicity IN ('يومي', 'أسبوعي', 'شهري', 'ربع سنوي', 'سنوي', 'موسمي')
  ),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  supply_administration TEXT NOT NULL,
  village TEXT NOT NULL,
  local_unit TEXT NOT NULL,
  merchant_id UUID NOT NULL REFERENCES public.ration_merchants(id) ON DELETE RESTRICT,
  merchant_name TEXT NOT NULL,
  commodity_id UUID NOT NULL REFERENCES public.ration_commodities(id) ON DELETE RESTRICT,
  commodity_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  original_approved_quota NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (original_approved_quota >= 0),
  amended_approved_quota NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (amended_approved_quota >= 0),
  supplied_quantity NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (supplied_quantity >= 0),
  dispensed_quantity NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (dispensed_quantity >= 0),
  remaining_quantity NUMERIC(14,3) GENERATED ALWAYS AS (GREATEST(amended_approved_quota - dispensed_quantity, 0)) STORED,
  amendment_reason TEXT NOT NULL DEFAULT '',
  amendment_decree_number TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'مفتوحة للصرف' CHECK (
    status IN ('مفتوحة للصرف', 'مكتملة', 'متأخرة التوريد', 'معدلة بقرار')
  ),
  approved_by TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_ration_quotas_date_range CHECK (end_date >= start_date)
);

CREATE TRIGGER trg_ration_quotas_updated_at
  BEFORE UPDATE ON public.ration_quotas
  FOR EACH ROW EXECUTE FUNCTION public.set_ration_updated_at();

-- ============================================================================
-- 4. جدول المخازن التموينية (ration_warehouses)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ration_warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_code TEXT NOT NULL UNIQUE,
  warehouse_name TEXT NOT NULL,
  supply_administration TEXT NOT NULL,
  village TEXT NOT NULL,
  local_unit TEXT NOT NULL,
  manager_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  capacity_tons NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (capacity_tons >= 0),
  current_occupancy_tons NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (current_occupancy_tons >= 0),
  license_number TEXT NOT NULL DEFAULT '',
  license_expiry_date DATE,
  tax_card_number TEXT NOT NULL DEFAULT '',
  tax_card_expiry_date DATE,
  commercial_register_number TEXT NOT NULL DEFAULT '',
  commercial_register_expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'نشط' CHECK (status IN ('نشط', 'صيانة', 'مغلق')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_ration_warehouses_updated_at
  BEFORE UPDATE ON public.ration_warehouses
  FOR EACH ROW EXECUTE FUNCTION public.set_ration_updated_at();

-- دفتر حركة المخازن (برصيد آلي محسوب غير قابل للحذف)
CREATE TABLE IF NOT EXISTS public.ration_warehouse_ledger_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_number TEXT NOT NULL UNIQUE,
  movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  warehouse_id UUID NOT NULL REFERENCES public.ration_warehouses(id) ON DELETE RESTRICT,
  commodity_id UUID NOT NULL REFERENCES public.ration_commodities(id) ON DELETE RESTRICT,
  unit TEXT NOT NULL,
  opening_balance NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (opening_balance >= 0),
  incoming_qty NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (incoming_qty >= 0),
  transfers_in_qty NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (transfers_in_qty >= 0),
  returns_qty NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (returns_qty >= 0),
  dispensed_qty NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (dispensed_qty >= 0),
  transfers_out_qty NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (transfers_out_qty >= 0),
  damaged_qty NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (damaged_qty >= 0),
  adjustments_qty NUMERIC(14,3) NOT NULL DEFAULT 0,
  computed_closing_balance NUMERIC(14,3) GENERATED ALWAYS AS (
    opening_balance + incoming_qty + transfers_in_qty + returns_qty
    - dispensed_qty - transfers_out_qty - damaged_qty - adjustments_qty
  ) STORED,
  reference_doc_number TEXT NOT NULL DEFAULT '',
  approval_status TEXT NOT NULL DEFAULT 'معتمد' CHECK (approval_status IN ('معتمد', 'قيد عكسي')),
  recorded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- الفهارس للأداء العالي والبحث والتصفية
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_ration_commodities_status_cat ON public.ration_commodities (status, category);
CREATE INDEX IF NOT EXISTS idx_ration_price_history_commodity ON public.ration_commodity_price_history (commodity_id, effective_date DESC);

CREATE INDEX IF NOT EXISTS idx_ration_merchants_geo ON public.ration_merchants (supply_administration, village, local_unit);
CREATE INDEX IF NOT EXISTS idx_ration_merchants_status ON public.ration_merchants (status, outlet_type);
CREATE INDEX IF NOT EXISTS idx_ration_merchants_expiries ON public.ration_merchants (license_expiry_date, tax_card_expiry_date, commercial_register_expiry_date);

CREATE INDEX IF NOT EXISTS idx_ration_quotas_merchant_commodity ON public.ration_quotas (merchant_id, commodity_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_ration_quotas_geo_status ON public.ration_quotas (village, local_unit, status);

CREATE INDEX IF NOT EXISTS idx_ration_warehouses_geo_status ON public.ration_warehouses (supply_administration, village, local_unit, status);
CREATE INDEX IF NOT EXISTS idx_ration_warehouses_expiries ON public.ration_warehouses (license_expiry_date, tax_card_expiry_date, commercial_register_expiry_date);
CREATE INDEX IF NOT EXISTS idx_ration_ledger_wh_comm ON public.ration_warehouse_ledger_movements (warehouse_id, commodity_id, movement_date DESC);

-- ============================================================================
-- سياسات الحماية Row Level Security (RLS)
-- ============================================================================
ALTER TABLE public.ration_commodities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ration_commodity_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ration_merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ration_merchant_followup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ration_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ration_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ration_warehouse_ledger_movements ENABLE ROW LEVEL SECURITY;

-- سياسات ration_commodities
DROP POLICY IF EXISTS "ration_commodities_select_authenticated" ON public.ration_commodities;
CREATE POLICY "ration_commodities_select_authenticated"
  ON public.ration_commodities FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "ration_commodities_insert_authorized" ON public.ration_commodities;
CREATE POLICY "ration_commodities_insert_authorized"
  ON public.ration_commodities FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_supply_role() IN ('super_admin', 'admin', 'supply_admin_manager', 'department_manager', 'ration_commodities_officer')
  );

DROP POLICY IF EXISTS "ration_commodities_update_authorized" ON public.ration_commodities;
CREATE POLICY "ration_commodities_update_authorized"
  ON public.ration_commodities FOR UPDATE
  TO authenticated
  USING (
    public.current_supply_role() IN ('super_admin', 'admin', 'supply_admin_manager', 'department_manager', 'ration_commodities_officer')
  )
  WITH CHECK (
    public.current_supply_role() IN ('super_admin', 'admin', 'supply_admin_manager', 'department_manager', 'ration_commodities_officer')
  );

DROP POLICY IF EXISTS "ration_commodities_delete_admin_only" ON public.ration_commodities;
CREATE POLICY "ration_commodities_delete_admin_only"
  ON public.ration_commodities FOR DELETE
  TO authenticated
  USING (public.current_supply_role() IN ('super_admin', 'admin'));

-- سياسات سجل الأسعار التاريخي (قراءة وإضافة فقط — ممنوع التعديل أو الحذف)
DROP POLICY IF EXISTS "ration_price_history_select_auth" ON public.ration_commodity_price_history;
CREATE POLICY "ration_price_history_select_auth"
  ON public.ration_commodity_price_history FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "ration_price_history_insert_authorized" ON public.ration_commodity_price_history;
CREATE POLICY "ration_price_history_insert_authorized"
  ON public.ration_commodity_price_history FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_supply_role() IN ('super_admin', 'admin', 'supply_admin_manager', 'department_manager', 'ration_commodities_officer')
  );

-- سياسات ration_merchants
DROP POLICY IF EXISTS "ration_merchants_select_authenticated" ON public.ration_merchants;
CREATE POLICY "ration_merchants_select_authenticated"
  ON public.ration_merchants FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "ration_merchants_insert_authorized" ON public.ration_merchants;
CREATE POLICY "ration_merchants_insert_authorized"
  ON public.ration_merchants FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_supply_role() IN ('super_admin', 'admin', 'supply_admin_manager', 'department_manager', 'ration_commodities_officer')
  );

DROP POLICY IF EXISTS "ration_merchants_update_authorized" ON public.ration_merchants;
CREATE POLICY "ration_merchants_update_authorized"
  ON public.ration_merchants FOR UPDATE
  TO authenticated
  USING (
    public.current_supply_role() IN ('super_admin', 'admin', 'supply_admin_manager', 'department_manager', 'ration_commodities_officer')
  )
  WITH CHECK (
    public.current_supply_role() IN ('super_admin', 'admin', 'supply_admin_manager', 'department_manager', 'ration_commodities_officer')
  );

DROP POLICY IF EXISTS "ration_merchants_delete_admin_only" ON public.ration_merchants;
CREATE POLICY "ration_merchants_delete_admin_only"
  ON public.ration_merchants FOR DELETE
  TO authenticated
  USING (public.current_supply_role() IN ('super_admin', 'admin'));

-- سياسات متابعة التجار
DROP POLICY IF EXISTS "ration_merchant_followups_select_auth" ON public.ration_merchant_followup_logs;
CREATE POLICY "ration_merchant_followups_select_auth"
  ON public.ration_merchant_followup_logs FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "ration_merchant_followups_insert_auth" ON public.ration_merchant_followup_logs;
CREATE POLICY "ration_merchant_followups_insert_auth"
  ON public.ration_merchant_followup_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_supply_role() IN ('super_admin', 'admin', 'supply_admin_manager', 'department_manager', 'ration_commodities_officer', 'inspector')
  );

-- سياسات ration_quotas
DROP POLICY IF EXISTS "ration_quotas_select_authenticated" ON public.ration_quotas;
CREATE POLICY "ration_quotas_select_authenticated"
  ON public.ration_quotas FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "ration_quotas_insert_authorized" ON public.ration_quotas;
CREATE POLICY "ration_quotas_insert_authorized"
  ON public.ration_quotas FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_supply_role() IN ('super_admin', 'admin', 'supply_admin_manager', 'department_manager', 'ration_commodities_officer')
  );

DROP POLICY IF EXISTS "ration_quotas_update_authorized" ON public.ration_quotas;
CREATE POLICY "ration_quotas_update_authorized"
  ON public.ration_quotas FOR UPDATE
  TO authenticated
  USING (
    public.current_supply_role() IN ('super_admin', 'admin', 'supply_admin_manager', 'department_manager', 'ration_commodities_officer')
  )
  WITH CHECK (
    public.current_supply_role() IN ('super_admin', 'admin', 'supply_admin_manager', 'department_manager', 'ration_commodities_officer')
  );

DROP POLICY IF EXISTS "ration_quotas_delete_admin_only" ON public.ration_quotas;
CREATE POLICY "ration_quotas_delete_admin_only"
  ON public.ration_quotas FOR DELETE
  TO authenticated
  USING (public.current_supply_role() IN ('super_admin', 'admin'));

-- سياسات ration_warehouses
DROP POLICY IF EXISTS "ration_warehouses_select_authenticated" ON public.ration_warehouses;
CREATE POLICY "ration_warehouses_select_authenticated"
  ON public.ration_warehouses FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "ration_warehouses_insert_authorized" ON public.ration_warehouses;
CREATE POLICY "ration_warehouses_insert_authorized"
  ON public.ration_warehouses FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_supply_role() IN ('super_admin', 'admin', 'supply_admin_manager', 'department_manager', 'warehouse_manager')
  );

DROP POLICY IF EXISTS "ration_warehouses_update_authorized" ON public.ration_warehouses;
CREATE POLICY "ration_warehouses_update_authorized"
  ON public.ration_warehouses FOR UPDATE
  TO authenticated
  USING (
    public.current_supply_role() IN ('super_admin', 'admin', 'supply_admin_manager', 'department_manager', 'warehouse_manager')
  )
  WITH CHECK (
    public.current_supply_role() IN ('super_admin', 'admin', 'supply_admin_manager', 'department_manager', 'warehouse_manager')
  );

DROP POLICY IF EXISTS "ration_warehouses_delete_admin_only" ON public.ration_warehouses;
CREATE POLICY "ration_warehouses_delete_admin_only"
  ON public.ration_warehouses FOR DELETE
  TO authenticated
  USING (public.current_supply_role() IN ('super_admin', 'admin'));

-- سياسات دفتر حركة المخازن (قراءة وإضافة فقط — ممنوع الحذف أو التلاعب بالرصيد)
DROP POLICY IF EXISTS "ration_ledger_select_authenticated" ON public.ration_warehouse_ledger_movements;
CREATE POLICY "ration_ledger_select_authenticated"
  ON public.ration_warehouse_ledger_movements FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "ration_ledger_insert_authorized" ON public.ration_warehouse_ledger_movements;
CREATE POLICY "ration_ledger_insert_authorized"
  ON public.ration_warehouse_ledger_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_supply_role() IN ('super_admin', 'admin', 'supply_admin_manager', 'department_manager', 'warehouse_manager')
  );
