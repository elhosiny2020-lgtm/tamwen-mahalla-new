-- ============================================================================
-- قاعدة بيانات المستخدمين والصلاحيات والأقسام (system_users, system_departments)
-- مديرية التموين والتجارة الداخلية بالغربية
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.system_users (
  id TEXT PRIMARY KEY,
  auth_uid UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  national_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  password_salt TEXT,
  password_disabled BOOLEAN NOT NULL DEFAULT FALSE,
  job_title TEXT NOT NULL DEFAULT 'موظف تموين',
  job_grade TEXT NOT NULL DEFAULT 'الثالثة التخصصية',
  workplace TEXT NOT NULL DEFAULT 'مديرية التموين بالغربية',
  branch_ids JSONB NOT NULL DEFAULT '["b-03"]'::jsonb,
  primary_branch_id TEXT NOT NULL DEFAULT 'b-03',
  department_ids JSONB NOT NULL DEFAULT '["d-01","d-25"]'::jsonb,
  role TEXT NOT NULL DEFAULT 'bakery_officer',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'seconded', 'leave', 'suspended', 'inactive', 'pending')),
  employee_number TEXT,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_system_users_username_lower ON public.system_users (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_system_users_role ON public.system_users (role);
CREATE INDEX IF NOT EXISTS idx_system_users_status ON public.system_users (status);

CREATE OR REPLACE FUNCTION public.set_system_users_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_system_users_updated_at ON public.system_users;
CREATE TRIGGER trg_system_users_updated_at
  BEFORE UPDATE ON public.system_users
  FOR EACH ROW EXECUTE FUNCTION public.set_system_users_updated_at();

ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_users FORCE ROW LEVEL SECURITY;

-- الموظف يقرأ ملفه الشخصي فقط؛ ومدير النظام الأعلى يملك الصلاحية الكاملة عبر service_role
DROP POLICY IF EXISTS "system_users_select_own" ON public.system_users;
CREATE POLICY "system_users_select_own"
  ON public.system_users FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_uid);

DROP POLICY IF EXISTS "system_users_update_own_contact" ON public.system_users;
CREATE POLICY "system_users_update_own_contact"
  ON public.system_users FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_uid)
  WITH CHECK (auth.uid() = auth_uid);
