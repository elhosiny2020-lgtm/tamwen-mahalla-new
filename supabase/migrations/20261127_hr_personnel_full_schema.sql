-- =============================================================================
-- منظومة التموين والتجارة الداخلية بمحافظة الغربية
-- إدارة الموارد البشرية وشؤون العاملين (قاعدة البيانات التشغيلية المترابطة)
-- Migration: 20261127_hr_personnel_full_schema.sql
-- ملاحظة: ينشئ الجداول الناقصة فقط دون المساس بأي جداول أو بيانات للأقسام الأخرى
-- =============================================================================

-- ١. الجدول الرئيسي للعاملين (المعرف الفريد: الرقم القومي ١٤ رقماً + ربط بحساب المستخدم والإدارة والقسم)
CREATE TABLE IF NOT EXISTS public.hr_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code TEXT NOT NULL UNIQUE,
  employee_number TEXT NOT NULL UNIQUE,
  national_id VARCHAR(14) NOT NULL UNIQUE CHECK (char_length(national_id) = 14),
  full_name TEXT NOT NULL,
  user_account_id TEXT,
  branch_id TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  department_id TEXT NOT NULL,
  department_name TEXT NOT NULL,
  organizational_unit TEXT,
  work_location TEXT,
  employment_category TEXT NOT NULL DEFAULT 'دائم', -- دائم | خدمة عامة | استعانة | عقد مؤقت | منتدب | معار
  appointment_type TEXT NOT NULL DEFAULT 'تعيين دائم',
  job_status TEXT NOT NULL DEFAULT 'على رأس العمل', -- على رأس العمل | إجازة | مأمورية | منتدب | معار | موقوف | انتهت خدمته
  job_title TEXT NOT NULL,
  occupational_group TEXT,
  financial_grade TEXT NOT NULL,
  job_level TEXT,
  is_profile_complete BOOLEAN NOT NULL DEFAULT TRUE,
  missing_items_notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ٢. البيانات الشخصية للعاملين
CREATE TABLE IF NOT EXISTS public.hr_employee_personal_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  birth_date DATE,
  gender TEXT NOT NULL DEFAULT 'ذكر',
  birth_place TEXT,
  governorate TEXT NOT NULL DEFAULT 'الغربية',
  center_city TEXT NOT NULL DEFAULT 'المحلة الكبرى',
  village TEXT,
  detailed_address TEXT,
  phone VARCHAR(20) NOT NULL,
  alt_phone VARCHAR(20),
  email TEXT,
  marital_status TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone VARCHAR(20),
  personal_photo_url TEXT,
  national_id_copy_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ٣. البيانات الوظيفية وبيانات الدرجة والراتب المعتمدة
CREATE TABLE IF NOT EXISTS public.hr_employee_job_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  directorate_name TEXT NOT NULL DEFAULT 'مديرية التموين والتجارة الداخلية بالغربية',
  supply_administration TEXT NOT NULL,
  section_name TEXT NOT NULL,
  organizational_unit TEXT,
  workplace TEXT NOT NULL,
  appointment_date DATE,
  work_start_date DATE,
  confirmation_date DATE,
  appointment_decision_number TEXT,
  appointment_decision_date DATE,
  personnel_file_number TEXT,
  current_job_title TEXT NOT NULL,
  previous_jobs TEXT,
  financial_grade TEXT NOT NULL,
  grade_acquisition_date DATE,
  approved_functional_wage NUMERIC(12, 2) NOT NULL DEFAULT 0,
  supplementary_wage NUMERIC(12, 2) NOT NULL DEFAULT 0,
  approved_allowances NUMERIC(12, 2) NOT NULL DEFAULT 0,
  periodic_increments NUMERIC(12, 2) NOT NULL DEFAULT 0,
  last_promotion_date DATE,
  expected_next_promotion_date DATE,
  disbursement_authority TEXT,
  social_insurance_number TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ٤. المؤهلات العلمية والدورات التدريبية والخبرات السابقة
CREATE TABLE IF NOT EXISTS public.hr_employee_qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  qualification_degree TEXT NOT NULL,
  specialization TEXT,
  graduation_year INTEGER,
  Educational_institution TEXT,
  training_courses TEXT,
  previous_experience TEXT,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ٥. المستندات والمرفقات الرسمية بملف الموظف
CREATE TABLE IF NOT EXISTS public.hr_employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  document_code TEXT NOT NULL,
  document_title TEXT NOT NULL,
  document_type TEXT NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  is_confidential BOOLEAN NOT NULL DEFAULT FALSE,
  storage_path TEXT,
  verification_status TEXT NOT NULL DEFAULT 'مكتمل ومعتمد',
  uploaded_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ٦. السجل التاريخي للخدمة الوظيفية والقرارات (لا يستبدل البيانات السابقة أبداً)
CREATE TABLE IF NOT EXISTS public.hr_employee_service_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  action_category TEXT NOT NULL, -- قرار تعيين | نقل | ندب | إعارة | ترقية | تغيير مسمى | تغيير إدارة | تغيير مقر | إجازة | انقطاع | جزاء | إنهاء خدمة | عودة للعمل
  decision_number TEXT NOT NULL,
  decision_date DATE NOT NULL,
  effective_date DATE NOT NULL,
  issuing_authority TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT NOT NULL,
  attachment_name TEXT,
  notes TEXT,
  recorded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ٧. التكليفات والمهام الوظيفية للموظف
CREATE TABLE IF NOT EXISTS public.hr_employee_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  assignment_number TEXT NOT NULL,
  assignment_title TEXT NOT NULL,
  assigned_department TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  supervisor_name TEXT,
  status TEXT NOT NULL DEFAULT 'ساري',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ٨. سجل الحضور والانصراف اليومي
CREATE TABLE IF NOT EXISTS public.hr_attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_date DATE NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  official_check_in TIME NOT NULL DEFAULT '08:00',
  actual_check_in TIME,
  official_check_out TIME NOT NULL DEFAULT '14:00',
  actual_check_out TIME,
  work_hours NUMERIC(5, 2) NOT NULL DEFAULT 0,
  delay_minutes INTEGER NOT NULL DEFAULT 0,
  early_leave_minutes INTEGER NOT NULL DEFAULT 0,
  day_status TEXT NOT NULL, -- حاضر | غائب | مأذون | إجازة | مأمورية | منتدب | راحة | تأخير | انصراف مبكر | لم يتم تسجيل الحضور
  delay_reason TEXT,
  needs_human_review BOOLEAN NOT NULL DEFAULT FALSE,
  recorded_by TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(attendance_date, employee_id)
);

-- ٩. استيراد سجلات أجهزة البصمة والملفات الإلكترونية
CREATE TABLE IF NOT EXISTS public.hr_attendance_devices_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_code TEXT NOT NULL UNIQUE,
  device_name TEXT NOT NULL,
  import_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_rows INTEGER NOT NULL DEFAULT 0,
  accepted_rows INTEGER NOT NULL DEFAULT 0,
  duplicate_rows INTEGER NOT NULL DEFAULT 0,
  conflict_rows INTEGER NOT NULL DEFAULT 0,
  imported_by TEXT NOT NULL,
  notes TEXT
);

-- ١٠. سجل التأخيرات المرصودة للمراجعة
CREATE TABLE IF NOT EXISTS public.hr_late_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id UUID REFERENCES public.hr_attendance_records(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  late_date DATE NOT NULL,
  delay_minutes INTEGER NOT NULL,
  justification TEXT,
  review_status TEXT NOT NULL DEFAULT 'قيد المراجعة البشرية',
  reviewed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ١١. سجل الغياب المرصود للمراجعة
CREATE TABLE IF NOT EXISTS public.hr_absence_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  absence_date DATE NOT NULL,
  is_authorized BOOLEAN NOT NULL DEFAULT FALSE,
  reason TEXT,
  review_status TEXT NOT NULL DEFAULT 'قيد المراجعة البشرية',
  reviewed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ١٢. طلبات وسجلات الإجازات
CREATE TABLE IF NOT EXISTS public.hr_leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT NOT NULL UNIQUE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL, -- اعتيادية | عارضة | مرضية | وضع | رعاية طفل | بدون أجر | مأمورية
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INTEGER NOT NULL,
  substitute_employee_name TEXT,
  status TEXT NOT NULL DEFAULT 'طلب جديد', -- طلب جديد | معتمدة | مرفوضة | تحتاج استكمال مستندات
  decision_number TEXT,
  approved_by TEXT,
  attachment_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ١٣. أرصدة إجازات العاملين
CREATE TABLE IF NOT EXISTS public.hr_leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE UNIQUE,
  year INTEGER NOT NULL DEFAULT 2026,
  casual_leave_total INTEGER NOT NULL DEFAULT 7,
  casual_leave_used INTEGER NOT NULL DEFAULT 0,
  annual_leave_total INTEGER NOT NULL DEFAULT 30,
  annual_leave_used INTEGER NOT NULL DEFAULT 0,
  carried_over_balance INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ١٤. سجل المأموريات الرسمية
CREATE TABLE IF NOT EXISTS public.hr_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_number TEXT NOT NULL UNIQUE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  purpose TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'معتمدة',
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ١٥. سجل الإنذارات الوظيفية
CREATE TABLE IF NOT EXISTS public.hr_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warning_number TEXT NOT NULL UNIQUE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  incident_date DATE NOT NULL,
  incident_type TEXT NOT NULL, -- تأخير | غياب | انصراف مبكر | مخالفة تعليمات العمل | عدم تنفيذ تكليف | ملاحظات إدارية أخرى
  incident_description TEXT NOT NULL,
  issue_date DATE NOT NULL,
  issuing_authority TEXT NOT NULL,
  decision_or_doc_number TEXT NOT NULL,
  warning_image_url TEXT,
  employee_notified_date DATE,
  employee_response TEXT,
  status TEXT NOT NULL DEFAULT 'مسجل ومبلغ',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ١٦. سجل الجزاءات التأديبية المعتمدة (لا يصدر تلقائياً أبداً؛ يشترط قراراً معتمداً)
CREATE TABLE IF NOT EXISTS public.hr_disciplinary_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  penalty_number TEXT NOT NULL UNIQUE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  penalty_type TEXT NOT NULL,
  decision_date DATE NOT NULL,
  decision_number TEXT NOT NULL,
  competent_authority TEXT NOT NULL,
  penalty_duration_or_value TEXT NOT NULL,
  execution_date DATE,
  grievance_status TEXT NOT NULL DEFAULT 'لا يوجد تظلم',
  grievance_result TEXT,
  attachment_name TEXT,
  notes TEXT,
  recorded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ١٧. سجل التظلمات الوظيفية
CREATE TABLE IF NOT EXISTS public.hr_employee_grievances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grievance_number TEXT NOT NULL UNIQUE,
  penalty_id UUID REFERENCES public.hr_disciplinary_actions(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  submission_date DATE NOT NULL,
  grievance_text TEXT NOT NULL,
  committee_decision TEXT,
  status TEXT NOT NULL DEFAULT 'قيد الفحص',
  resolved_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ١٨. سجل الإعارات
CREATE TABLE IF NOT EXISTS public.hr_secondments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secondment_number TEXT NOT NULL UNIQUE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  original_job_title TEXT NOT NULL,
  original_department TEXT NOT NULL,
  host_entity TEXT NOT NULL,
  host_job_title TEXT NOT NULL,
  decision_number TEXT NOT NULL,
  decision_date DATE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_label TEXT NOT NULL,
  last_renewal_date DATE,
  expected_return_date DATE,
  status TEXT NOT NULL DEFAULT 'إعارة سارية',
  attachment_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ١٩. سجل تجديدات الإعارات التاريخي
CREATE TABLE IF NOT EXISTS public.hr_secondment_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secondment_id UUID NOT NULL REFERENCES public.hr_secondments(id) ON DELETE CASCADE,
  renewal_number TEXT NOT NULL UNIQUE,
  previous_end_date DATE NOT NULL,
  new_start_date DATE NOT NULL,
  new_end_date DATE NOT NULL,
  renewal_duration TEXT NOT NULL,
  approval_decision_number TEXT NOT NULL,
  approval_decision_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'تم التجديد',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ٢٠. سجل الندب الداخلي والخارجي
CREATE TABLE IF NOT EXISTS public.hr_deputations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deputation_number TEXT NOT NULL UNIQUE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  from_administration TEXT NOT NULL,
  to_administration TEXT NOT NULL,
  decision_number TEXT NOT NULL,
  decision_date DATE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ساري',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ٢١. قاعدة بيانات مكلفي الخدمة العامة
CREATE TABLE IF NOT EXISTS public.hr_public_service_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_code TEXT NOT NULL UNIQUE,
  employee_id UUID REFERENCES public.hr_employees(id) ON DELETE SET NULL,
  national_id VARCHAR(14) NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email TEXT,
  qualification TEXT NOT NULL,
  university_or_institute TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  assignment_number TEXT NOT NULL,
  assignment_date DATE NOT NULL,
  assigned_entity TEXT NOT NULL DEFAULT 'مديرية التموين والتجارة الداخلية بالغربية',
  supply_administration TEXT NOT NULL,
  department_name TEXT NOT NULL,
  work_location TEXT NOT NULL,
  supervisor_name TEXT NOT NULL,
  work_start_date DATE NOT NULL,
  prescribed_duration_months INTEGER NOT NULL DEFAULT 12,
  service_start_date DATE NOT NULL,
  expected_end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'على رأس العمل',
  supervisor_evaluation TEXT DEFAULT 'ممتاز',
  tasks_assigned TEXT,
  attachment_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ٢٢. تكليفات الخدمة العامة
CREATE TABLE IF NOT EXISTS public.hr_public_service_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.hr_public_service_members(id) ON DELETE CASCADE,
  task_title TEXT NOT NULL,
  department_name TEXT NOT NULL,
  assigned_date DATE NOT NULL,
  evaluation_score TEXT,
  notes TEXT
);

-- ٢٣. حضور وانصراف مكلفي الخدمة العامة
CREATE TABLE IF NOT EXISTS public.hr_public_service_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.hr_public_service_members(id) ON DELETE CASCADE,
  month_label TEXT NOT NULL,
  attended_days INTEGER NOT NULL DEFAULT 22,
  absence_days INTEGER NOT NULL DEFAULT 0,
  late_count INTEGER NOT NULL DEFAULT 0,
  supervisor_report TEXT
);

-- ٢٤. تجديدات وتمديدات الخدمة العامة
CREATE TABLE IF NOT EXISTS public.hr_public_service_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.hr_public_service_members(id) ON DELETE CASCADE,
  renewal_number TEXT NOT NULL UNIQUE,
  previous_end_date DATE NOT NULL,
  new_start_date DATE NOT NULL,
  new_end_date DATE NOT NULL,
  approval_number TEXT NOT NULL,
  approval_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'تم التجديد'
);

-- ٢٥. قاعدة بيانات موظفي الاستعانة
CREATE TABLE IF NOT EXISTS public.hr_assistance_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code TEXT NOT NULL UNIQUE,
  employee_id UUID REFERENCES public.hr_employees(id) ON DELETE SET NULL,
  national_id VARCHAR(14) NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email TEXT,
  qualification TEXT NOT NULL,
  job_nature TEXT NOT NULL,
  supply_administration TEXT NOT NULL,
  department_name TEXT NOT NULL,
  work_location TEXT NOT NULL,
  work_start_date DATE NOT NULL,
  direct_manager_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ٢٦. العقود المؤقتة وعقود الاستعانة
CREATE TABLE IF NOT EXISTS public.hr_employment_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number TEXT NOT NULL UNIQUE,
  assistance_employee_id UUID NOT NULL REFERENCES public.hr_assistance_employees(id) ON DELETE CASCADE,
  contract_type TEXT NOT NULL DEFAULT 'تعاقد بنظام الاستعانة',
  contract_issue_date DATE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 12,
  financial_compensation_egp NUMERIC(12, 2) NOT NULL DEFAULT 0,
  funding_authority TEXT,
  status TEXT NOT NULL DEFAULT 'ساري',
  contract_copy_url TEXT,
  required_documents TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ٢٧. سجل تجديدات العقود (يحتفظ بجميع العقود السابقة دون استبدال)
CREATE TABLE IF NOT EXISTS public.hr_contract_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renewal_number TEXT NOT NULL UNIQUE,
  previous_contract_id UUID NOT NULL REFERENCES public.hr_employment_contracts(id) ON DELETE CASCADE,
  previous_contract_number TEXT NOT NULL,
  request_date DATE NOT NULL,
  new_start_date DATE NOT NULL,
  new_end_date DATE NOT NULL,
  renewal_duration TEXT NOT NULL,
  approval_number TEXT NOT NULL,
  approval_date DATE NOT NULL,
  documents_list TEXT,
  status TEXT NOT NULL DEFAULT 'تم التجديد',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ٢٨. مستندات العقود
CREATE TABLE IF NOT EXISTS public.hr_contract_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.hr_employment_contracts(id) ON DELETE CASCADE,
  document_title TEXT NOT NULL,
  storage_path TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ٢٩. طلبات التجديد الإلكترونية (إعارة | خدمة عامة | استعانة)
CREATE TABLE IF NOT EXISTS public.hr_renewal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT NOT NULL UNIQUE,
  request_type TEXT NOT NULL, -- طلب تجديد إعارة | طلب تجديد خدمة عامة | طلب تجديد استعانة أو عقد مؤقت
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  national_id VARCHAR(14) NOT NULL,
  employee_code TEXT NOT NULL,
  employee_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  qualification TEXT,
  educational_institution TEXT,
  job_title TEXT NOT NULL,
  supply_administration TEXT NOT NULL,
  department_name TEXT NOT NULL,
  work_location TEXT NOT NULL,
  host_entity TEXT,
  original_reference_number TEXT NOT NULL, -- رقم قرار الإعارة أو التكليف أو العقد الحالي
  original_issue_date DATE,
  current_start_date DATE NOT NULL,
  current_end_date DATE NOT NULL,
  requested_renewal_duration TEXT NOT NULL,
  requested_new_start_date DATE NOT NULL,
  requested_new_end_date DATE NOT NULL,
  request_reason TEXT,
  workflow_status TEXT NOT NULL DEFAULT 'تم الإرسال من الموظف',
  hr_review_notes TEXT,
  hr_reviewer_name TEXT,
  hr_documents_complete BOOLEAN DEFAULT TRUE,
  financial_review_notes TEXT,
  financial_reviewer_name TEXT,
  approval_decision_Text TEXT,
  approver_name TEXT,
  approval_date DATE,
  issued_decision_number TEXT,
  rejection_reason TEXT,
  submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ٣٠. مرفقات طلبات التجديد
CREATE TABLE IF NOT EXISTS public.hr_renewal_request_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renewal_request_id UUID NOT NULL REFERENCES public.hr_renewal_requests(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ٣١. مراجعات شؤون العاملين والجهة المالية لطلبات التجديد
CREATE TABLE IF NOT EXISTS public.hr_renewal_request_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renewal_request_id UUID NOT NULL REFERENCES public.hr_renewal_requests(id) ON DELETE CASCADE,
  review_stage TEXT NOT NULL, -- مراجعة شؤون العاملين | مراجعة الجهة المالية | مراجعة المسؤول المختص
  reviewer_name TEXT NOT NULL,
  is_complete BOOLEAN NOT NULL DEFAULT TRUE,
  internal_notes TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ٣٢. اعتمادات طلبات التجديد
CREATE TABLE IF NOT EXISTS public.hr_renewal_request_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renewal_request_id UUID NOT NULL REFERENCES public.hr_renewal_requests(id) ON DELETE CASCADE,
  decision TEXT NOT NULL, -- يعتمد | لا يعتمد
  approver_name TEXT NOT NULL,
  decision_number TEXT,
  decision_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ٣٣. سجل حركات وتاريخ طلبات التجديد
CREATE TABLE IF NOT EXISTS public.hr_renewal_request_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renewal_request_id UUID NOT NULL REFERENCES public.hr_renewal_requests(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  action_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ٣٤. التنبيهات الذكية للموارد البشرية وإعداداتها وسجل التدقيق
CREATE TABLE IF NOT EXISTS public.hr_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_number TEXT NOT NULL UNIQUE,
  employee_id UUID REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  employee_code TEXT NOT NULL,
  alert_category TEXT NOT NULL, -- إعارة | خدمة عامة | استعانة | حضور | ملف وظيفي | طلب تجديد
  alert_title TEXT NOT NULL,
  supply_administration TEXT NOT NULL,
  expiry_date DATE,
  remaining_days INTEGER,
  recommended_renewal_start_date DATE,
  renewal_request_status TEXT,
  responsible_officer TEXT NOT NULL,
  required_action TEXT NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'مفتوح',
  closed_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hr_alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secondment_thresholds_days INTEGER[] NOT NULL DEFAULT ARRAY[90, 60, 30, 15, 7],
  public_service_thresholds_days INTEGER[] NOT NULL DEFAULT ARRAY[60, 30, 15, 7],
  assistance_contract_thresholds_days INTEGER[] NOT NULL DEFAULT ARRAY[90, 60, 30, 15, 7],
  max_request_processing_days INTEGER NOT NULL DEFAULT 7,
  prevent_daily_duplicate_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hr_report_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  directorate_header TEXT NOT NULL DEFAULT 'مديرية التموين والتجارة الداخلية بالغربية',
  department_header TEXT NOT NULL DEFAULT 'إدارة الموارد البشرية وشؤون العاملين',
  include_signatures BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hr_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_record_id TEXT NOT NULL,
  employee_name TEXT,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- عرض توافقي باسم hr_contracts يرتبط مباشرة بجدول العقود hr_employment_contracts
CREATE OR REPLACE VIEW public.hr_contracts AS
SELECT * FROM public.hr_employment_contracts;

-- =============================================================================
-- سياسات الأمان وحماية البيانات الشخصية على مستوى الصفوف (Row Level Security)
-- تضمن سرية الرقم القومي والبيانات الشخصية والجزاءات:
--   • الموظف العادي يرى بياناته وطلباته الخاصة فقط
--   • مسؤول الموارد البشرية والإدارة العليا يطلعون وفق الهيكل الإداري والصلاحيات
-- =============================================================================

CREATE OR REPLACE FUNCTION public.hr_current_user_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(auth.uid()::text, ''),
    NULLIF(auth.jwt() ->> 'sub', ''),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.hr_current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'role', ''),
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'role', ''),
    NULLIF(auth.jwt() ->> 'role', ''),
    'viewer'
  );
$$;

CREATE OR REPLACE FUNCTION public.hr_is_authorized_manager()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT public.hr_current_user_role() IN (
    'super_admin',
    'admin',
    'directorate_manager',
    'deputy_directorate',
    'supply_admin_manager',
    'hr_officer',
    'hr_manager',
    'hr_specialist',
    'personnel_director',
    'service_role'
  );
$$;

CREATE OR REPLACE FUNCTION public.hr_is_own_employee(emp_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.hr_employees e
    WHERE e.id = emp_uuid
      AND e.user_account_id IS NOT NULL
      AND e.user_account_id = public.hr_current_user_id()
  );
$$;

-- تفعيل RLS على كافة جداول الموارد البشرية الحساسة
ALTER TABLE public.hr_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_employee_personal_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_employee_job_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_employee_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_employee_service_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_employee_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_late_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_absence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_disciplinary_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_employee_grievances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_secondments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_deputations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_public_service_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_assistance_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_employment_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_renewal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_audit_logs ENABLE ROW LEVEL SECURITY;

-- ١. سياسات جدول العاملين الموحد hr_employees
DROP POLICY IF EXISTS hr_employees_select_policy ON public.hr_employees;
CREATE POLICY hr_employees_select_policy ON public.hr_employees
  FOR SELECT USING (
    public.hr_is_authorized_manager()
    OR (user_account_id IS NOT NULL AND user_account_id = public.hr_current_user_id())
  );

DROP POLICY IF EXISTS hr_employees_write_policy ON public.hr_employees;
CREATE POLICY hr_employees_write_policy ON public.hr_employees
  FOR ALL USING (public.hr_is_authorized_manager())
  WITH CHECK (public.hr_is_authorized_manager());

-- ٢. سياسات البيانات الشخصية السرية hr_employee_personal_data
DROP POLICY IF EXISTS hr_personal_data_select_policy ON public.hr_employee_personal_data;
CREATE POLICY hr_personal_data_select_policy ON public.hr_employee_personal_data
  FOR SELECT USING (
    public.hr_is_authorized_manager()
    OR public.hr_is_own_employee(employee_id)
  );

DROP POLICY IF EXISTS hr_personal_data_write_policy ON public.hr_employee_personal_data;
CREATE POLICY hr_personal_data_write_policy ON public.hr_employee_personal_data
  FOR ALL USING (public.hr_is_authorized_manager())
  WITH CHECK (public.hr_is_authorized_manager());

-- ٣. سياسات البيانات الوظيفية والمستندات والتدرج والحضور والأرصدة والإنذارات والجزاءات والإعارات
DROP POLICY IF EXISTS hr_job_records_select_policy ON public.hr_employee_job_records;
CREATE POLICY hr_job_records_select_policy ON public.hr_employee_job_records
  FOR SELECT USING (public.hr_is_authorized_manager() OR public.hr_is_own_employee(employee_id));

DROP POLICY IF EXISTS hr_documents_select_policy ON public.hr_employee_documents;
CREATE POLICY hr_documents_select_policy ON public.hr_employee_documents
  FOR SELECT USING (
    public.hr_is_authorized_manager()
    OR (NOT is_confidential AND public.hr_is_own_employee(employee_id))
  );

DROP POLICY IF EXISTS hr_service_history_select_policy ON public.hr_employee_service_history;
CREATE POLICY hr_service_history_select_policy ON public.hr_employee_service_history
  FOR SELECT USING (public.hr_is_authorized_manager() OR public.hr_is_own_employee(employee_id));

DROP POLICY IF EXISTS hr_attendance_select_policy ON public.hr_attendance_records;
CREATE POLICY hr_attendance_select_policy ON public.hr_attendance_records
  FOR SELECT USING (public.hr_is_authorized_manager() OR public.hr_is_own_employee(employee_id));

DROP POLICY IF EXISTS hr_leave_balances_select_policy ON public.hr_leave_balances;
CREATE POLICY hr_leave_balances_select_policy ON public.hr_leave_balances
  FOR SELECT USING (public.hr_is_authorized_manager() OR public.hr_is_own_employee(employee_id));

DROP POLICY IF EXISTS hr_warnings_select_policy ON public.hr_warnings;
CREATE POLICY hr_warnings_select_policy ON public.hr_warnings
  FOR SELECT USING (public.hr_is_authorized_manager() OR public.hr_is_own_employee(employee_id));

DROP POLICY IF EXISTS hr_disciplinary_select_policy ON public.hr_disciplinary_actions;
CREATE POLICY hr_disciplinary_select_policy ON public.hr_disciplinary_actions
  FOR SELECT USING (public.hr_is_authorized_manager() OR public.hr_is_own_employee(employee_id));

DROP POLICY IF EXISTS hr_disciplinary_write_policy ON public.hr_disciplinary_actions;
CREATE POLICY hr_disciplinary_write_policy ON public.hr_disciplinary_actions
  FOR ALL USING (public.hr_is_authorized_manager())
  WITH CHECK (public.hr_is_authorized_manager());

DROP POLICY IF EXISTS hr_secondments_select_policy ON public.hr_secondments;
CREATE POLICY hr_secondments_select_policy ON public.hr_secondments
  FOR SELECT USING (public.hr_is_authorized_manager() OR public.hr_is_own_employee(employee_id));

-- ٤. سياسات طلبات الإجازات hr_leave_requests (يرى الموظف طلباته فقط ويقدم لنفسه)
DROP POLICY IF EXISTS hr_leave_requests_select_policy ON public.hr_leave_requests;
CREATE POLICY hr_leave_requests_select_policy ON public.hr_leave_requests
  FOR SELECT USING (public.hr_is_authorized_manager() OR public.hr_is_own_employee(employee_id));

DROP POLICY IF EXISTS hr_leave_requests_insert_policy ON public.hr_leave_requests;
CREATE POLICY hr_leave_requests_insert_policy ON public.hr_leave_requests
  FOR INSERT WITH CHECK (public.hr_is_authorized_manager() OR public.hr_is_own_employee(employee_id));

DROP POLICY IF EXISTS hr_leave_requests_update_policy ON public.hr_leave_requests;
CREATE POLICY hr_leave_requests_update_policy ON public.hr_leave_requests
  FOR UPDATE USING (public.hr_is_authorized_manager());

-- ٥. سياسات طلبات التجديد الإلكترونية hr_renewal_requests
DROP POLICY IF EXISTS hr_renewal_requests_select_policy ON public.hr_renewal_requests;
CREATE POLICY hr_renewal_requests_select_policy ON public.hr_renewal_requests
  FOR SELECT USING (public.hr_is_authorized_manager() OR public.hr_is_own_employee(employee_id));

DROP POLICY IF EXISTS hr_renewal_requests_insert_policy ON public.hr_renewal_requests;
CREATE POLICY hr_renewal_requests_insert_policy ON public.hr_renewal_requests
  FOR INSERT WITH CHECK (public.hr_is_authorized_manager() OR public.hr_is_own_employee(employee_id));

DROP POLICY IF EXISTS hr_renewal_requests_update_policy ON public.hr_renewal_requests;
CREATE POLICY hr_renewal_requests_update_policy ON public.hr_renewal_requests
  FOR UPDATE USING (
    public.hr_is_authorized_manager()
    OR (public.hr_is_own_employee(employee_id) AND workflow_status IN ('طلب جديد', 'تم الحفظ كمسودة'))
  );

-- ٦. سياسات العقود والخدمة العامة والاستعانة والتنبيهات وسجل التدقيق
DROP POLICY IF EXISTS hr_contracts_select_policy ON public.hr_employment_contracts;
CREATE POLICY hr_contracts_select_policy ON public.hr_employment_contracts
  FOR SELECT USING (
    public.hr_is_authorized_manager()
    OR EXISTS (
      SELECT 1 FROM public.hr_assistance_employees a
      WHERE a.id = assistance_employee_id AND public.hr_is_own_employee(a.employee_id)
    )
  );

DROP POLICY IF EXISTS hr_public_service_select_policy ON public.hr_public_service_members;
CREATE POLICY hr_public_service_select_policy ON public.hr_public_service_members
  FOR SELECT USING (public.hr_is_authorized_manager() OR public.hr_is_own_employee(employee_id));

DROP POLICY IF EXISTS hr_assistance_select_policy ON public.hr_assistance_employees;
CREATE POLICY hr_assistance_select_policy ON public.hr_assistance_employees
  FOR SELECT USING (public.hr_is_authorized_manager() OR public.hr_is_own_employee(employee_id));

DROP POLICY IF EXISTS hr_alerts_manager_policy ON public.hr_alerts;
CREATE POLICY hr_alerts_manager_policy ON public.hr_alerts
  FOR ALL USING (public.hr_is_authorized_manager() OR public.hr_is_own_employee(employee_id))
  WITH CHECK (public.hr_is_authorized_manager());

DROP POLICY IF EXISTS hr_audit_logs_manager_policy ON public.hr_audit_logs;
CREATE POLICY hr_audit_logs_manager_policy ON public.hr_audit_logs
  FOR SELECT USING (public.hr_is_authorized_manager());

