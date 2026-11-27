-- =============================================================================
-- منظومة التموين والتجارة الداخلية بالغربية — قسم صيانة الحبوب
-- إنشاء الجداول الناقصة فقط لقسم صيانة الحبوب دون المساس بجداول المخابز أو التجارة أو التموين
-- التاريخ: 2026-11-27
-- =============================================================================

-- 1. جدول إعدادات ومعايير قسم صيانة الحبوب
CREATE TABLE IF NOT EXISTS public.grain_section_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_moisture_pct NUMERIC(5,2) NOT NULL DEFAULT 13.00,
  max_allowed_moisture_pct NUMERIC(5,2) NOT NULL DEFAULT 14.50,
  moisture_deduction_multiplier NUMERIC(5,3) NOT NULL DEFAULT 1.150,
  standard_flour_extraction_pct NUMERIC(5,2) NOT NULL DEFAULT 87.50,
  standard_bran_pct NUMERIC(5,2) NOT NULL DEFAULT 12.00,
  max_allowed_mill_loss_pct NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  max_allowed_storage_loss_pct NUMERIC(5,2) NOT NULL DEFAULT 0.50,
  max_allowed_weight_diff_tons NUMERIC(8,3) NOT NULL DEFAULT 0.050,
  formula_reference_version TEXT NOT NULL DEFAULT 'قرار وزاري وضوابط صيانة الحبوب ٢٠٢٤ - v2.4',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. جدول مراكز التكلفة المالي والتشغيلي
CREATE TABLE IF NOT EXISTS public.grain_cost_centers (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  facility_type TEXT NOT NULL, -- شونة / صومعة / مطحن / ثلاجة / إدارة هندسية
  facility_id TEXT,
  administration TEXT NOT NULL DEFAULT 'إدارة تموين مركز المحلة الكبرى',
  allocated_budget_egp NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. جدول الشون والصوامع والهناجر والبناكر
CREATE TABLE IF NOT EXISTS public.grain_warehouses (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  facility_type TEXT NOT NULL, -- شونة ترابية مطورة / شونة أسفلتية / صومعة معدنية / صومعة خرسانية / هنجر / بنكر / مخزن
  supervising_authority TEXT NOT NULL,
  administration TEXT NOT NULL,
  local_unit TEXT NOT NULL,
  village_or_city TEXT NOT NULL,
  detailed_address TEXT NOT NULL,
  manager_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  design_capacity_tons NUMERIC(12,3) NOT NULL DEFAULT 0,
  actual_capacity_tons NUMERIC(12,3) NOT NULL DEFAULT 0,
  cells_count INTEGER NOT NULL DEFAULT 1,
  approved_opening_balance_tons NUMERIC(12,3) NOT NULL DEFAULT 0,
  operating_status TEXT NOT NULL DEFAULT 'عاملة',
  engineering_status TEXT NOT NULL DEFAULT 'ممتازة',
  safety_status TEXT NOT NULL DEFAULT 'مستوفاة',
  license_number TEXT NOT NULL,
  license_expiry_date DATE,
  last_inspection_date DATE,
  cost_center_id TEXT REFERENCES public.grain_cost_centers(id) ON DELETE SET NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. جدول الخلايا واللوطات التخزينية داخل الشون والصوامع
CREATE TABLE IF NOT EXISTS public.grain_storage_cells (
  id TEXT PRIMARY KEY,
  warehouse_id TEXT NOT NULL REFERENCES public.grain_warehouses(id) ON DELETE CASCADE,
  cell_code TEXT NOT NULL,
  cell_name TEXT NOT NULL,
  capacity_tons NUMERIC(12,3) NOT NULL DEFAULT 0,
  crop_season TEXT NOT NULL DEFAULT 'موسم ٢٠٢٦',
  purity_grade TEXT NOT NULL DEFAULT 'درجة ٢٣.٥ قيراط',
  status TEXT NOT NULL DEFAULT 'نشطة',
  UNIQUE (warehouse_id, cell_code)
);

-- 5. جدول الموازين الأرضية والبسكول ومعايرتها
CREATE TABLE IF NOT EXISTS public.grain_scales (
  id TEXT PRIMARY KEY,
  scale_code TEXT NOT NULL UNIQUE,
  scale_name TEXT NOT NULL,
  facility_type TEXT NOT NULL,
  facility_id TEXT NOT NULL,
  max_capacity_tons NUMERIC(10,3) NOT NULL DEFAULT 80,
  calibration_cert_number TEXT NOT NULL,
  last_calibration_date DATE NOT NULL,
  next_calibration_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'معتمد وصالح'
);

-- 6. جدول استلام وتوريد القمح والوزن والفحص الفني
CREATE TABLE IF NOT EXISTS public.grain_receipts (
  id TEXT PRIMARY KEY,
  receipt_number TEXT NOT NULL UNIQUE,
  weighing_ticket_number TEXT NOT NULL UNIQUE,
  inspection_report_number TEXT NOT NULL,
  receipt_date DATE NOT NULL,
  receipt_time TEXT NOT NULL DEFAULT '09:00',
  warehouse_id TEXT NOT NULL REFERENCES public.grain_warehouses(id) ON DELETE RESTRICT,
  cell_code TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_type TEXT NOT NULL, -- مزارع / جمعية زراعية / تاجر / جهة حكومية / تحويل من شونة أخرى
  wheat_origin TEXT NOT NULL,
  crop_season TEXT NOT NULL DEFAULT 'موسم ٢٠٢٦',
  vehicle_number TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  driver_national_id TEXT NOT NULL,
  gross_weight_tons NUMERIC(12,3) NOT NULL,
  tare_weight_tons NUMERIC(12,3) NOT NULL,
  actual_net_weight_tons NUMERIC(12,3) NOT NULL, -- الوزن الصافي الفعلي (الإجمالي - الفارغ) لا يتم استبداله
  documented_weight_tons NUMERIC(12,3) NOT NULL,
  weight_difference_tons NUMERIC(12,3) NOT NULL DEFAULT 0,
  moisture_pct NUMERIC(5,2) NOT NULL,
  impurities_pct NUMERIC(5,2) NOT NULL DEFAULT 0.80,
  purity_kirat NUMERIC(5,2) NOT NULL DEFAULT 23.50,
  weevil_infestation_status TEXT NOT NULL DEFAULT 'خالٍ من الإصابة',
  grain_temperature_c NUMERIC(5,2) NOT NULL DEFAULT 24.0,
  inspection_result TEXT NOT NULL DEFAULT 'مقبول', -- مقبول / مقبول مع ملاحظة / مرفوض / تحت الفحص
  receiving_committee TEXT NOT NULL,
  approving_officer TEXT NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'معتمد', -- مسودة / تحت المراجعة / معتمد / مرفوض / ملغى
  cancellation_reason TEXT,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. جدول قياسات وتصحيحات الرطوبة المنفصل (دون طمس الوزن الفعلي)
CREATE TABLE IF NOT EXISTS public.grain_moisture_records (
  id TEXT PRIMARY KEY,
  record_number TEXT NOT NULL UNIQUE,
  warehouse_id TEXT NOT NULL REFERENCES public.grain_warehouses(id) ON DELETE RESTRICT,
  receipt_id TEXT REFERENCES public.grain_receipts(id) ON DELETE SET NULL,
  cell_code TEXT NOT NULL,
  measurement_date DATE NOT NULL,
  measured_moisture_pct NUMERIC(5,2) NOT NULL,
  reference_moisture_pct NUMERIC(5,2) NOT NULL DEFAULT 13.00,
  moisture_variance_pct NUMERIC(5,2) NOT NULL,
  actual_weight_before_tons NUMERIC(12,3) NOT NULL,
  moisture_deduction_tons NUMERIC(12,3) NOT NULL DEFAULT 0,
  accounting_adjusted_weight_tons NUMERIC(12,3) NOT NULL,
  formula_reference TEXT NOT NULL,
  inspector_name TEXT NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'معتمد',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. جدول الجرد والفاقد والعجز والزيادة المنفصل
CREATE TABLE IF NOT EXISTS public.grain_loss_records (
  id TEXT PRIMARY KEY,
  record_number TEXT NOT NULL UNIQUE,
  warehouse_id TEXT NOT NULL REFERENCES public.grain_warehouses(id) ON DELETE RESTRICT,
  inventory_date DATE NOT NULL,
  book_balance_tons NUMERIC(12,3) NOT NULL,
  actual_physical_balance_tons NUMERIC(12,3) NOT NULL,
  variance_tons NUMERIC(12,3) NOT NULL, -- سالب للعجز، موجب للزيادة
  variance_pct NUMERIC(6,2) NOT NULL,
  allowed_loss_limit_pct NUMERIC(5,2) NOT NULL DEFAULT 0.50,
  variance_classification TEXT NOT NULL, -- فاقد طبيعي مسموح / عجز غير مبرر / زيادة جردية / مطابق
  cause_description TEXT NOT NULL,
  committee_report_number TEXT NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'معتمد', -- معتمد / تحت المراجعة / ملغى
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. جدول المطاحن وخطوط الإنتاج
CREATE TABLE IF NOT EXISTS public.grain_mills (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  mill_type TEXT NOT NULL, -- مطحن سلندرات / مطحن حجارة / مطحن قطاع عام / مطحن قطاع خاص
  owner_company TEXT NOT NULL,
  administration TEXT NOT NULL,
  local_unit TEXT NOT NULL,
  village_or_city TEXT NOT NULL,
  detailed_address TEXT NOT NULL,
  manager_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  daily_production_capacity_tons NUMERIC(12,3) NOT NULL,
  operating_lines_count INTEGER NOT NULL DEFAULT 2,
  target_extraction_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 87.50,
  linked_bakeries_count INTEGER NOT NULL DEFAULT 0,
  operating_status TEXT NOT NULL DEFAULT 'عامل',
  license_number TEXT NOT NULL,
  license_expiry_date DATE,
  cost_center_id TEXT REFERENCES public.grain_cost_centers(id) ON DELETE SET NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. جدول حركات صرف وتحويل القمح بين الشون والمطاحن
CREATE TABLE IF NOT EXISTS public.grain_movements (
  id TEXT PRIMARY KEY,
  movement_number TEXT NOT NULL UNIQUE,
  movement_date DATE NOT NULL,
  movement_type TEXT NOT NULL, -- صرف لمطحن / تحويل صادر لشونة / تحويل وارد من شونة
  source_warehouse_id TEXT NOT NULL REFERENCES public.grain_warehouses(id) ON DELETE RESTRICT,
  target_warehouse_id TEXT REFERENCES public.grain_warehouses(id) ON DELETE RESTRICT,
  target_mill_id TEXT REFERENCES public.grain_mills(id) ON DELETE RESTRICT,
  quantity_tons NUMERIC(12,3) NOT NULL,
  vehicle_number TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  weighing_ticket_number TEXT NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'معتمد',
  approved_by TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. جدول التشغيل اليومي للمطاحن ونسب الاستخراج
CREATE TABLE IF NOT EXISTS public.mill_daily_operations (
  id TEXT PRIMARY KEY,
  operation_number TEXT NOT NULL UNIQUE,
  operation_date DATE NOT NULL,
  mill_id TEXT NOT NULL REFERENCES public.grain_mills(id) ON DELETE RESTRICT,
  source_warehouse_id TEXT NOT NULL REFERENCES public.grain_warehouses(id) ON DELETE RESTRICT,
  opening_wheat_tons NUMERIC(12,3) NOT NULL DEFAULT 0,
  received_wheat_tons NUMERIC(12,3) NOT NULL DEFAULT 0,
  ground_wheat_tons NUMERIC(12,3) NOT NULL DEFAULT 0,
  flour_875_produced_tons NUMERIC(12,3) NOT NULL DEFAULT 0,
  coarse_bran_produced_tons NUMERIC(12,3) NOT NULL DEFAULT 0,
  fine_bran_produced_tons NUMERIC(12,3) NOT NULL DEFAULT 0,
  semolina_or_other_tons NUMERIC(12,3) NOT NULL DEFAULT 0,
  impurities_separated_tons NUMERIC(12,3) NOT NULL DEFAULT 0,
  flour_extraction_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
  bran_extraction_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
  grinding_loss_tons NUMERIC(12,3) NOT NULL DEFAULT 0,
  grinding_loss_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
  target_extraction_pct NUMERIC(5,2) NOT NULL DEFAULT 87.50,
  operation_status TEXT NOT NULL DEFAULT 'مكتمل', -- مكتمل / تحت التشغيل / غير مكتمل
  approval_status TEXT NOT NULL DEFAULT 'معتمد',
  shift_supervisor TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. جدول حصص الدقيق وصرفها للمخابز المرتبطة بجدول المخابز الحالي
CREATE TABLE IF NOT EXISTS public.flour_distribution_records (
  id TEXT PRIMARY KEY,
  voucher_number TEXT NOT NULL UNIQUE,
  distribution_date DATE NOT NULL,
  bakery_id TEXT NOT NULL, -- يرتبط مباشرة بجدول المخابز القائم دون تكرار قاعدة بيانات المخابز
  bakery_number TEXT NOT NULL,
  bakery_name TEXT NOT NULL,
  mill_id TEXT NOT NULL REFERENCES public.grain_mills(id) ON DELETE RESTRICT,
  daily_quota_sacks NUMERIC(10,2) NOT NULL, -- الشيكارة 50 كجم
  daily_quota_tons NUMERIC(10,3) NOT NULL,
  approved_days INTEGER NOT NULL DEFAULT 1,
  total_scheduled_tons NUMERIC(10,3) NOT NULL,
  issued_from_mill_tons NUMERIC(10,3) NOT NULL,
  received_by_bakery_tons NUMERIC(10,3) NOT NULL,
  remaining_quota_tons NUMERIC(10,3) NOT NULL,
  discrepancy_tons NUMERIC(10,3) NOT NULL DEFAULT 0,
  fulfillment_pct NUMERIC(6,2) NOT NULL DEFAULT 100.00,
  quota_status TEXT NOT NULL DEFAULT 'مستلمة بالكامل',
  approval_status TEXT NOT NULL DEFAULT 'معتمد',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. جدول الثلاجات ومخازن التبريد والتجميد
CREATE TABLE IF NOT EXISTS public.refrigerators (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  refrigerator_type TEXT NOT NULL, -- ثلاجة تبريد / ثلاجة تجميد / مخزن مبرد متعدد الغرف
  supervising_authority TEXT NOT NULL,
  administration TEXT NOT NULL,
  local_unit TEXT NOT NULL,
  village_or_city TEXT NOT NULL,
  detailed_address TEXT NOT NULL,
  manager_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  rooms_count INTEGER NOT NULL DEFAULT 4,
  total_capacity_tons NUMERIC(12,3) NOT NULL,
  approved_opening_stock_tons NUMERIC(12,3) NOT NULL DEFAULT 0,
  stored_product_category TEXT NOT NULL, -- لحوم ودواجن مجمدة / تقاوي بطاطس / خضروات وفاكهة / ألبان وجبن
  min_safe_temp_c NUMERIC(5,2) NOT NULL,
  max_safe_temp_c NUMERIC(5,2) NOT NULL,
  current_temp_c NUMERIC(5,2) NOT NULL,
  current_humidity_pct NUMERIC(5,2) NOT NULL DEFAULT 85.00,
  cooling_unit_status TEXT NOT NULL DEFAULT 'تعمل بكفاءة',
  backup_generator_status TEXT NOT NULL DEFAULT 'جاهز للعمل تلقائياً',
  operating_status TEXT NOT NULL DEFAULT 'عاملة',
  license_number TEXT NOT NULL,
  cost_center_id TEXT REFERENCES public.grain_cost_centers(id) ON DELETE SET NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. جدول سجل قراءات الحرارة والرطوبة وحركات مخزون الثلاجات
CREATE TABLE IF NOT EXISTS public.refrigerator_temperature_logs (
  id TEXT PRIMARY KEY,
  log_number TEXT NOT NULL UNIQUE,
  refrigerator_id TEXT NOT NULL REFERENCES public.refrigerators(id) ON DELETE CASCADE,
  room_code TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_date DATE NOT NULL,
  recorded_time TEXT NOT NULL,
  product_name TEXT NOT NULL,
  measured_temp_c NUMERIC(5,2) NOT NULL,
  min_allowed_temp_c NUMERIC(5,2) NOT NULL,
  max_allowed_temp_c NUMERIC(5,2) NOT NULL,
  humidity_pct NUMERIC(5,2) NOT NULL,
  power_source TEXT NOT NULL DEFAULT 'كهرباء عمومية',
  alarm_triggered BOOLEAN NOT NULL DEFAULT false,
  corrective_action TEXT DEFAULT '',
  recorded_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.refrigerator_movements (
  id TEXT PRIMARY KEY,
  movement_number TEXT NOT NULL UNIQUE,
  refrigerator_id TEXT NOT NULL REFERENCES public.refrigerators(id) ON DELETE RESTRICT,
  room_code TEXT NOT NULL,
  movement_date DATE NOT NULL,
  movement_type TEXT NOT NULL, -- وارد تخزين / منصرف / تالف مستبعد
  product_name TEXT NOT NULL,
  quantity_tons NUMERIC(12,3) NOT NULL,
  batch_expiry_date DATE,
  approval_status TEXT NOT NULL DEFAULT 'معتمد',
  approved_by TEXT NOT NULL,
  notes TEXT DEFAULT ''
);

-- 15. جدول الأصول الهندسية والمعدات (18 فئة معتمدة)
CREATE TABLE IF NOT EXISTS public.grain_assets (
  id TEXT PRIMARY KEY,
  asset_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  asset_category TEXT NOT NULL, -- ميزان بسكول / خط طحن / صومعة معدنية / وحدة تبريد / مولد كهرباء / سير ناقل ...
  facility_type TEXT NOT NULL, -- شونة / مطحن / ثلاجة
  facility_id TEXT NOT NULL,
  facility_name TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  model_number TEXT NOT NULL,
  serial_number TEXT NOT NULL UNIQUE,
  manufacture_year INTEGER NOT NULL,
  supply_date DATE NOT NULL,
  operation_start_date DATE NOT NULL,
  purchase_cost_egp NUMERIC(14,2) NOT NULL,
  capital_additions_egp NUMERIC(14,2) NOT NULL DEFAULT 0, -- الإضافات الرأسمالية التي ترفع قيمة الأصل أو عمره
  accumulated_depreciation_egp NUMERIC(14,2) NOT NULL DEFAULT 0,
  useful_life_years INTEGER NOT NULL DEFAULT 10,
  annual_depreciation_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  technical_condition TEXT NOT NULL DEFAULT 'ممتازة',
  operating_status TEXT NOT NULL DEFAULT 'عامل',
  warranty_expiry_date DATE,
  custodian_name TEXT NOT NULL,
  maintenance_interval_days INTEGER NOT NULL DEFAULT 90,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  cost_center_id TEXT REFERENCES public.grain_cost_centers(id) ON DELETE SET NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. جدول تقييم الأصول وإعادة التقييم والإهلاك السنوي
CREATE TABLE IF NOT EXISTS public.grain_asset_valuations (
  id TEXT PRIMARY KEY,
  valuation_number TEXT NOT NULL UNIQUE,
  asset_id TEXT NOT NULL REFERENCES public.grain_assets(id) ON DELETE CASCADE,
  valuation_date DATE NOT NULL,
  valuation_type TEXT NOT NULL, -- إهلاك دوري / إضافة رأسمالية / إعادة تقييم فني / تخريد جزئي
  historical_cost_egp NUMERIC(14,2) NOT NULL,
  capital_improvements_egp NUMERIC(14,2) NOT NULL DEFAULT 0,
  operating_maintenance_expenses_egp NUMERIC(14,2) NOT NULL DEFAULT 0, -- مصروف تشغيلي لا يرفع القيمة الدفترية تلقائياً
  accumulated_depreciation_egp NUMERIC(14,2) NOT NULL,
  net_book_value_egp NUMERIC(14,2) NOT NULL,
  estimated_replacement_value_egp NUMERIC(14,2) NOT NULL,
  committee_decision_number TEXT NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'معتمد',
  notes TEXT DEFAULT ''
);

-- 17. جدول أوامر العمل والصيانة الوقائية والطارئة
CREATE TABLE IF NOT EXISTS public.grain_maintenance_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  maintenance_type TEXT NOT NULL, -- صيانة وقائية دورية / صيانة طارئة / عمرة جسيمة / معايرة فنية
  fault_category TEXT NOT NULL, -- عطل ميكانيكي / عطل كهربائي / عطل تبريد / عطل ميزان / صيانة وقائية مجدولة
  priority TEXT NOT NULL DEFAULT 'عاجلة', -- طارئة جداً / عاجلة / متوسطة / عادية
  facility_type TEXT NOT NULL,
  facility_id TEXT NOT NULL,
  facility_name TEXT NOT NULL,
  asset_id TEXT NOT NULL REFERENCES public.grain_assets(id) ON DELETE RESTRICT,
  asset_name TEXT NOT NULL,
  fault_report_date DATE NOT NULL,
  work_start_date DATE NOT NULL,
  work_end_date DATE,
  downtime_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  fault_description TEXT NOT NULL,
  root_cause TEXT NOT NULL,
  work_performed TEXT NOT NULL,
  executing_entity TEXT NOT NULL, -- فريق الصيانة الداخلي / شركة متخصصة معتمدة
  engineer_name TEXT NOT NULL,
  spare_parts_cost_egp NUMERIC(12,2) NOT NULL DEFAULT 0,
  external_labor_cost_egp NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_maintenance_cost_egp NUMERIC(12,2) NOT NULL DEFAULT 0,
  capitalized_to_asset BOOLEAN NOT NULL DEFAULT false, -- هل تُمثل عمرة رأسمالية معتمدة أم مصروف صيانة تشغيلي
  post_maintenance_test_result TEXT NOT NULL DEFAULT 'تم الاختبار والتشغيل بنجاح',
  order_status TEXT NOT NULL DEFAULT 'مكتمل ومغلق', -- مفتوح / قيد التنفيذ / مكتمل ومغلق / ملغى
  approval_status TEXT NOT NULL DEFAULT 'معتمد',
  cost_center_id TEXT REFERENCES public.grain_cost_centers(id) ON DELETE SET NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. جدول قطع الغيار والمخزون الهندسي وحركات الصرف
CREATE TABLE IF NOT EXISTS public.spare_parts (
  id TEXT PRIMARY KEY,
  part_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- رومان بلي / سيور ناقلة / فلاتر / حساسات حرارة / خلايا وزن / ضواغط تبريد / قواطع كهرباء
  unit TEXT NOT NULL DEFAULT 'قطعة',
  warehouse_location TEXT NOT NULL,
  compatible_assets TEXT NOT NULL,
  approved_opening_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_reorder_level NUMERIC(12,2) NOT NULL DEFAULT 5,
  unit_cost_egp NUMERIC(12,2) NOT NULL DEFAULT 0,
  supplier_name TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.spare_parts_movements (
  id TEXT PRIMARY KEY,
  movement_number TEXT NOT NULL UNIQUE,
  part_id TEXT NOT NULL REFERENCES public.spare_parts(id) ON DELETE RESTRICT,
  movement_date DATE NOT NULL,
  movement_type TEXT NOT NULL, -- توريد للمخزن / صرف لأمر صيانة / مرتجع للمخزن / تسوية جردية
  quantity NUMERIC(12,2) NOT NULL,
  unit_cost_egp NUMERIC(12,2) NOT NULL,
  total_cost_egp NUMERIC(14,2) NOT NULL,
  maintenance_order_id TEXT REFERENCES public.grain_maintenance_orders(id) ON DELETE SET NULL,
  maintenance_order_status TEXT NOT NULL DEFAULT 'مكتمل ومغلق', -- لا يُخصم من المخزون إلا إذا كان أمر الصيانة مكتملاً/معتمداً
  facility_name TEXT NOT NULL,
  asset_name TEXT DEFAULT '',
  approval_status TEXT NOT NULL DEFAULT 'معتمد',
  approved_by TEXT NOT NULL,
  notes TEXT DEFAULT ''
);

-- 19. جدول الحسابات المالية الموحد ومراكز التكلفة (15 تصنيفاً مالياً)
CREATE TABLE IF NOT EXISTS public.grain_financial_transactions (
  id TEXT PRIMARY KEY,
  document_number TEXT NOT NULL UNIQUE,
  transaction_date DATE NOT NULL,
  account_category TEXT NOT NULL, -- تكلفة شراء/توريد أصل، صيانة دورية، صيانة طارئة، قطع غيار، تشغيل شونة، تشغيل مطحن، تشغيل ثلاجة، كهرباء وطاقة، نقل، معايرة موازين، مكافحة آفات، فاقد وعجز، إيرادات تخزين/طحن، تسويات، إهلاك
  entry_type TEXT NOT NULL, -- مصروف تشغيلي / مصروف رأسمالي / إيراد / تسوية مالية / قيد عكسي
  cost_center_id TEXT NOT NULL REFERENCES public.grain_cost_centers(id) ON DELETE RESTRICT,
  facility_type TEXT NOT NULL,
  facility_id TEXT NOT NULL,
  facility_name TEXT NOT NULL,
  related_reference_number TEXT NOT NULL, -- رقم أمر الصيانة أو إذن الاستلام أو التوريد
  debit_amount_egp NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit_amount_egp NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_amount_egp NUMERIC(14,2) NOT NULL DEFAULT 0,
  beneficiary_or_payer TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'أمر دفع إلكتروني حكومي',
  approval_status TEXT NOT NULL DEFAULT 'معتمد',
  approved_by TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 20. جدول سجل العمليات والتدقيق والمراجعة التاريخية لقسم صيانة الحبوب
CREATE TABLE IF NOT EXISTS public.grain_audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  action_type TEXT NOT NULL, -- إضافة / تعديل / اعتماد / إلغاء موثق / قيد عكسي / طباعة / تصدير
  target_screen TEXT NOT NULL,
  target_record_id TEXT NOT NULL,
  facility_name TEXT NOT NULL,
  before_summary TEXT DEFAULT '',
  after_summary TEXT DEFAULT '',
  reason TEXT DEFAULT ''
);

-- تفعيل سياسات حماية الصفوف RLS
ALTER TABLE public.grain_section_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grain_cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grain_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grain_storage_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grain_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grain_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grain_moisture_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grain_loss_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grain_mills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grain_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mill_daily_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flour_distribution_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refrigerators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refrigerator_temperature_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refrigerator_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grain_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grain_asset_valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grain_maintenance_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spare_parts_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grain_financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grain_audit_logs ENABLE ROW LEVEL SECURITY;
