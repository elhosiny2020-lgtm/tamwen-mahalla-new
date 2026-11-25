-- ============================================================================
-- منظومة إدارة مديونيات أصحاب المخابز وحاسبة المخالفات والجزاءات التموينية
-- مديرية التموين والتجارة الداخلية بالغربية - إدارة تموين مركز المحلة الكبرى
-- ملاحظة: هذا السكربت المرجعي جاهز للتطبيق على قاعدة بيانات PostgreSQL / Supabase
-- مع استخدام NUMERIC(14,2) للمبالغ المالية وتفعيل RLS دون المساس بالجداول الحالية.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. جهات إصدار المديونيات
CREATE TABLE IF NOT EXISTS debt_authorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. أنواع المخالفات المالية
CREATE TABLE IF NOT EXISTS debt_violation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. طرق الدفع المعتمدة
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. المديونيات الرئيسية
CREATE TABLE IF NOT EXISTS bakery_debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number INTEGER NOT NULL,
  debt_number TEXT NOT NULL UNIQUE,
  bakery_id TEXT NOT NULL,
  bakery_file_number TEXT NOT NULL,
  bakery_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  pos_number TEXT NOT NULL,
  village TEXT NOT NULL,
  local_unit TEXT NOT NULL,
  phone TEXT NOT NULL,
  issuing_authority TEXT NOT NULL,
  violation_type TEXT NOT NULL,
  minutes_number TEXT NOT NULL,
  violation_date DATE NOT NULL,
  due_date DATE NOT NULL,
  description TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  attachment_ref TEXT,
  recorded_by TEXT NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'مسودة' CHECK (approval_status IN ('مسودة', 'قيد المراجعة', 'معتمد', 'مرفوض')),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  original_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (original_amount >= 0),
  prior_violations_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (prior_violations_amount >= 0),
  additions_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (additions_amount >= 0),
  disposals_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (disposals_amount >= 0),
  approved_settlements_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (approved_settlements_amount >= 0),
  advance_paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (advance_paid_amount >= 0),
  gross_before_settlements NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (gross_before_settlements >= 0),
  net_due_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (net_due_amount >= 0),
  total_paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_paid_amount >= 0),
  remaining_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (remaining_amount >= 0),
  payment_status TEXT NOT NULL DEFAULT 'غير مسدد',
  schedule_status TEXT NOT NULL DEFAULT 'غير مجدول',
  linked_violation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. تفاصيل بنود المديونية
CREATE TABLE IF NOT EXISTS bakery_debt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID NOT NULL REFERENCES bakery_debts(id) ON DELETE RESTRICT,
  item_number TEXT NOT NULL,
  item_type TEXT NOT NULL,
  description TEXT NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  remaining_amount NUMERIC(14,2) NOT NULL CHECK (remaining_amount >= 0),
  status TEXT NOT NULL DEFAULT 'مستحق',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. الدفعات
CREATE TABLE IF NOT EXISTS debt_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT NOT NULL UNIQUE,
  debt_id UUID NOT NULL REFERENCES bakery_debts(id) ON DELETE RESTRICT,
  bakery_id TEXT NOT NULL,
  pos_number TEXT NOT NULL,
  payment_date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  payment_kind TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  receipt_number TEXT NOT NULL UNIQUE,
  collection_authority TEXT NOT NULL,
  collector_name TEXT NOT NULL,
  balance_before NUMERIC(14,2) NOT NULL CHECK (balance_before >= 0),
  balance_after NUMERIC(14,2) NOT NULL CHECK (balance_after >= 0),
  status TEXT NOT NULL DEFAULT 'قيد المراجعة' CHECK (status IN ('معتمد', 'قيد المراجعة', 'ملغي')),
  installment_id UUID,
  notes TEXT DEFAULT '',
  approved_by TEXT,
  cancelled_by TEXT,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. خطط السداد
CREATE TABLE IF NOT EXISTS debt_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_number TEXT NOT NULL UNIQUE,
  bakery_id TEXT NOT NULL,
  pos_number TEXT NOT NULL,
  debt_id UUID NOT NULL REFERENCES bakery_debts(id) ON DELETE RESTRICT,
  total_remaining_at_creation NUMERIC(14,2) NOT NULL CHECK (total_remaining_at_creation >= 0),
  down_payment NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (down_payment >= 0),
  scheduled_amount NUMERIC(14,2) NOT NULL CHECK (scheduled_amount > 0),
  schedule_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  installments_count INTEGER NOT NULL CHECK (installments_count >= 1),
  installment_amount NUMERIC(14,2) NOT NULL CHECK (installment_amount >= 0),
  first_installment_date DATE NOT NULL,
  last_installment_date DATE NOT NULL,
  responsible_user TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'معتمد نشط',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. الأقساط
CREATE TABLE IF NOT EXISTS debt_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES debt_schedules(id) ON DELETE RESTRICT,
  debt_id UUID NOT NULL REFERENCES bakery_debts(id) ON DELETE RESTRICT,
  installment_serial INTEGER NOT NULL,
  bakery_id TEXT NOT NULL,
  pos_number TEXT NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  remaining_amount NUMERIC(14,2) NOT NULL CHECK (remaining_amount >= 0),
  actual_paid_date DATE,
  status TEXT NOT NULL DEFAULT 'مجدول',
  payment_method TEXT,
  receipt_number TEXT,
  postpone_reason TEXT,
  notes TEXT DEFAULT ''
);

-- 9. التنبيهات والإشعارات
CREATE TABLE IF NOT EXISTS debt_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID REFERENCES bakery_debts(id) ON DELETE CASCADE,
  installment_id UUID REFERENCES debt_installments(id) ON DELETE CASCADE,
  bakery_id TEXT NOT NULL,
  pos_number TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  due_date DATE NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. إجراءات المتابعة والإنذارات
CREATE TABLE IF NOT EXISTS debt_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  followup_date DATE NOT NULL,
  bakery_id TEXT NOT NULL,
  pos_number TEXT NOT NULL,
  debt_id UUID NOT NULL REFERENCES bakery_debts(id) ON DELETE RESTRICT,
  action_type TEXT NOT NULL,
  notice_date DATE NOT NULL,
  notice_number TEXT NOT NULL,
  notify_method TEXT NOT NULL,
  notify_result TEXT NOT NULL,
  employee_notes TEXT DEFAULT '',
  next_action TEXT DEFAULT '',
  next_followup_date DATE,
  employee_name TEXT NOT NULL,
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. الإيصالات
CREATE TABLE IF NOT EXISTS debt_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT NOT NULL UNIQUE,
  payment_id UUID NOT NULL REFERENCES debt_payments(id) ON DELETE RESTRICT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issued_by TEXT NOT NULL,
  reprint_count INTEGER NOT NULL DEFAULT 0
);

-- 12. التسويات
CREATE TABLE IF NOT EXISTS debt_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID NOT NULL REFERENCES bakery_debts(id) ON DELETE RESTRICT,
  settlement_type TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  reference_doc TEXT NOT NULL,
  created_by TEXT NOT NULL,
  approved_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. المرفقات
CREATE TABLE IF NOT EXISTS debt_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID REFERENCES bakery_debts(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. سجل التدقيق المالي (غير قابل للتعديل أو الحذف)
CREATE TABLE IF NOT EXISTS debt_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  record_ref TEXT NOT NULL,
  before_data TEXT DEFAULT '',
  after_data TEXT DEFAULT '',
  reason TEXT DEFAULT ''
);

-- 15. إعدادات القسم
CREATE TABLE IF NOT EXISTS debt_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settings_json JSONB NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. مكتبة أنواع وقواعد المخالفات
CREATE TABLE IF NOT EXISTS violation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  group_name TEXT NOT NULL,
  bread_category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS violation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  group_name TEXT NOT NULL,
  bread_category TEXT NOT NULL,
  decree_number TEXT NOT NULL,
  article_ref TEXT NOT NULL,
  formula_kind TEXT NOT NULL,
  first_amount_or_multiplier NUMERIC(14,3) NOT NULL,
  repeat_amount_or_multiplier NUMERIC(14,3) NOT NULL,
  repeat_window_days INTEGER NOT NULL DEFAULT 365,
  closure_measure_first TEXT DEFAULT 'لا يوجد',
  closure_days_first INTEGER NOT NULL DEFAULT 0,
  closure_measure_repeat TEXT DEFAULT 'لا يوجد',
  closure_days_repeat INTEGER NOT NULL DEFAULT 0,
  quota_deduction_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  quota_deduction_months INTEGER NOT NULL DEFAULT 0,
  effective_from DATE NOT NULL,
  effective_to DATE,
  legal_source TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS violation_legal_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES violation_rules(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL,
  decree_number TEXT NOT NULL,
  effective_from DATE NOT NULL,
  snapshot_summary TEXT NOT NULL,
  official_reference TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bakery_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_number TEXT NOT NULL UNIQUE,
  minutes_number TEXT NOT NULL UNIQUE,
  bakery_id TEXT NOT NULL,
  pos_number TEXT NOT NULL,
  violation_date DATE NOT NULL,
  rule_id UUID REFERENCES violation_rules(id),
  rule_code TEXT NOT NULL,
  violation_name TEXT NOT NULL,
  bread_category TEXT NOT NULL,
  official_weight_grams NUMERIC(8,2),
  actual_weight_grams NUMERIC(8,2),
  shortage_grams NUMERIC(8,2),
  daily_insurance_quota_snapshot NUMERIC(10,3),
  flour_unit_price_snapshot NUMERIC(12,2),
  is_repeat BOOLEAN NOT NULL DEFAULT FALSE,
  multiplier_applied NUMERIC(10,2) NOT NULL DEFAULT 1,
  base_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  final_fine_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  closure_measure TEXT DEFAULT 'لا يوجد',
  closure_days INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'مسودة' CHECK (status IN ('مسودة', 'قيد المراجعة', 'معتمد', 'مرفوض')),
  linked_debt_id UUID REFERENCES bakery_debts(id) ON DELETE RESTRICT,
  recorded_by TEXT NOT NULL,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS violation_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_id UUID NOT NULL REFERENCES bakery_violations(id) ON DELETE CASCADE,
  inputs_json JSONB NOT NULL,
  steps_json JSONB NOT NULL,
  legal_basis TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS violation_repetitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_id UUID NOT NULL REFERENCES bakery_violations(id) ON DELETE CASCADE,
  prior_violation_id UUID REFERENCES bakery_violations(id) ON DELETE RESTRICT,
  repeat_count INTEGER NOT NULL DEFAULT 1,
  window_days INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS violation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_id UUID NOT NULL REFERENCES bakery_violations(id) ON DELETE CASCADE,
  action_label TEXT NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 0,
  quota_deduction_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  approved_by TEXT
);

CREATE TABLE IF NOT EXISTS violation_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_id UUID NOT NULL REFERENCES bakery_violations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS violation_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_number TEXT NOT NULL UNIQUE,
  violation_id UUID NOT NULL REFERENCES bakery_violations(id) ON DELETE RESTRICT,
  bakery_id TEXT NOT NULL,
  pos_number TEXT NOT NULL,
  appeal_date DATE NOT NULL,
  reason TEXT NOT NULL,
  decision_status TEXT NOT NULL DEFAULT 'قيد الفحص',
  adjusted_amount NUMERIC(14,2),
  decided_by TEXT,
  decision_notes TEXT
);

-- الفهارس للبحث السريع والتصفية
CREATE INDEX IF NOT EXISTS idx_debts_bakery_pos ON bakery_debts (bakery_id, pos_number);
CREATE INDEX IF NOT EXISTS idx_debts_status ON bakery_debts (approval_status, payment_status, due_date);
CREATE INDEX IF NOT EXISTS idx_payments_debt ON debt_payments (debt_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_installments_due ON debt_installments (due_date, status);
CREATE INDEX IF NOT EXISTS idx_violations_pos_date ON bakery_violations (pos_number, rule_code, violation_date);

-- تفعيل سياسات الحماية Row Level Security (RLS)
ALTER TABLE bakery_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bakery_debt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bakery_violations ENABLE ROW LEVEL SECURITY;
