-- ============================================================================
-- Unified Chart of Accounts (دليل الحسابات الموحد) — Hierarchical DDL Schema
-- Gharbia Directorate of Supply & Internal Trade
--
-- Features:
-- 1. Strict multi-level accounting hierarchy (parent_account_id self-reference).
-- 2. Account code, Arabic/English names, account nature (debit/credit),
--    9 institutional account groups, summary vs. posting control.
-- 3. Database-level CHECK constraints & trigger preventing:
--    - Self-parenting cycles
--    - Posting directly to summary/group accounts
--    - Attaching children to non-group leaf accounts
--    - Mismatched hierarchy levels (child level MUST equal parent level + 1)
-- 4. Row Level Security (RLS) enabled by default.
-- 5. Zero fabricated official Ministry of Finance account codes hardcoded.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code VARCHAR(32) NOT NULL UNIQUE,
  account_name_ar TEXT NOT NULL,
  account_name_en TEXT,
  parent_account_id UUID NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  hierarchy_level SMALLINT NOT NULL DEFAULT 1 CHECK (hierarchy_level BETWEEN 1 AND 6),
  hierarchy_path TEXT NOT NULL DEFAULT '',
  account_type VARCHAR(32) NOT NULL CHECK (
    account_type IN (
      'assets',
      'liabilities',
      'net_assets',
      'revenues',
      'expenses',
      'clearing',
      'settlement',
      'custody_deposits',
      'off_balance_memo'
    )
  ),
  account_nature VARCHAR(10) NOT NULL CHECK (account_nature IN ('debit', 'credit')),
  classification TEXT NOT NULL DEFAULT 'general',
  is_group BOOLEAN NOT NULL DEFAULT FALSE,
  allow_posting BOOLEAN NOT NULL DEFAULT TRUE,
  branch_id TEXT NULL,
  cost_center_id TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_review')),
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to DATE NULL,
  is_template_draft BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_by TEXT NOT NULL,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Accounting hierarchy & posting invariants
  CONSTRAINT chk_coa_no_self_parent CHECK (parent_account_id IS NULL OR parent_account_id <> id),
  CONSTRAINT chk_coa_group_cannot_post CHECK (NOT (is_group = TRUE AND allow_posting = TRUE)),
  CONSTRAINT chk_coa_root_level CHECK (
    (parent_account_id IS NULL AND hierarchy_level = 1)
    OR (parent_account_id IS NOT NULL AND hierarchy_level > 1)
  ),
  CONSTRAINT chk_coa_valid_dates CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

-- Indexes for fast hierarchical lookups & ledger aggregation
CREATE INDEX IF NOT EXISTS idx_coa_parent_id ON public.chart_of_accounts(parent_account_id);
CREATE INDEX IF NOT EXISTS idx_coa_type_status ON public.chart_of_accounts(account_type, status);
CREATE INDEX IF NOT EXISTS idx_coa_posting ON public.chart_of_accounts(allow_posting, status) WHERE allow_posting = TRUE;
CREATE INDEX IF NOT EXISTS idx_coa_branch ON public.chart_of_accounts(branch_id);

-- Enforce strict parent-child hierarchy rules and automatically maintain hierarchy_path
CREATE OR REPLACE FUNCTION public.enforce_coa_hierarchy_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_parent RECORD;
BEGIN
  NEW.updated_at := NOW();

  IF NEW.parent_account_id IS NULL THEN
    NEW.hierarchy_level := 1;
    NEW.hierarchy_path := NEW.account_code;
  ELSE
    SELECT id, account_code, hierarchy_level, hierarchy_path, is_group, account_type
    INTO v_parent
    FROM public.chart_of_accounts
    WHERE id = NEW.parent_account_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'الحساب الأب غير موجود في دليل الحسابات (parent_account_id=%).', NEW.parent_account_id;
    END IF;

    IF v_parent.is_group IS NOT TRUE THEN
      RAISE EXCEPTION 'لا يجوز تفريع حساب فرعي تحت حساب ترحيلي غير تجميعي (%).', v_parent.account_code;
    END IF;

    IF NEW.hierarchy_level <> v_parent.hierarchy_level + 1 THEN
      NEW.hierarchy_level := v_parent.hierarchy_level + 1;
    END IF;

    IF NEW.hierarchy_level > 6 THEN
      RAISE EXCEPTION 'تم تجاوز الحد الأقصى لمستويات هرمية دليل الحسابات (٦ مستويات).';
    END IF;

    NEW.hierarchy_path := v_parent.hierarchy_path || '.' || NEW.account_code;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_coa_hierarchy_integrity ON public.chart_of_accounts;
CREATE TRIGGER trg_coa_hierarchy_integrity
BEFORE INSERT OR UPDATE ON public.chart_of_accounts
FOR EACH ROW
EXECUTE FUNCTION public.enforce_coa_hierarchy_integrity();

-- Row Level Security (RLS)
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coa_authenticated_read ON public.chart_of_accounts;
CREATE POLICY coa_authenticated_read
  ON public.chart_of_accounts
  FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS coa_financial_admin_write ON public.chart_of_accounts;
CREATE POLICY coa_financial_admin_write
  ON public.chart_of_accounts
  FOR ALL
  TO authenticated
  USING (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') IN (
      'super_admin',
      'admin',
      'financial_director',
      'chief_accountant'
    )
  )
  WITH CHECK (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') IN (
      'super_admin',
      'admin',
      'financial_director',
      'chief_accountant'
    )
  );

COMMENT ON TABLE public.chart_of_accounts IS
  'دليل الحسابات الموحد الهرمي لمديرية التموين والتجارة الداخلية بالغربية — يدعم ٦ مستويات ومنع الترحيل على الحسابات التجميعية.';
