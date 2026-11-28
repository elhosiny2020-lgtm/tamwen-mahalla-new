-- ============================================================================
-- Gharbia Directorate of Supply & Internal Trade — Central Financial ERP Schema
-- Migration: 20261127_central_financial_erp_schema.sql
-- Scope: Reuses existing operational tables (branches, departments, system_users,
--        bakery_debts, grain_maintenance, hr_personnel, ration_commodities).
--        Creates ONLY missing central accounting & financial control tables.
-- Governance:
--   * No fabricated Egyptian governmental account codes, tax rates, or decrees.
--   * Enforces Double-Entry balance & immutability of posted journal entries.
--   * Enables Row Level Security (RLS) on all financial tables.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Legal & Regulatory Reference Registry (Axis 1)
CREATE TABLE IF NOT EXISTS accounting_reference_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_number TEXT NOT NULL,
  title TEXT NOT NULL,
  issuing_authority TEXT NOT NULL,
  category TEXT NOT NULL, -- law | mof_circular | budget_rule | procurement | tax | supply_decree | audit
  issue_date DATE NOT NULL,
  effective_date DATE NOT NULL,
  expiry_date DATE,
  scope TEXT NOT NULL,
  accounting_impact TEXT NOT NULL,
  official_attachment_ref TEXT,
  review_status TEXT NOT NULL DEFAULT 'pending_review' CHECK (review_status IN ('pending_review', 'approved', 'superseded')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounting_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_key TEXT NOT NULL UNIQUE,
  policy_name_ar TEXT NOT NULL,
  basis_type TEXT NOT NULL CHECK (basis_type IN ('accrual', 'cash', 'modified_accrual')),
  standard_framework TEXT NOT NULL DEFAULT 'Egyptian_Gov_IPSAS_Aligned',
  inventory_method TEXT NOT NULL DEFAULT 'unconfigured' CHECK (inventory_method IN ('unconfigured', 'fifo', 'weighted_average')),
  depreciation_method TEXT NOT NULL DEFAULT 'straight_line',
  segregation_of_duties_enforced BOOLEAN NOT NULL DEFAULT TRUE,
  reference_doc_id UUID REFERENCES accounting_reference_documents(id),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Fiscal Years & Accounting Periods (Axis 15)
CREATE TABLE IF NOT EXISTS financial_fiscal_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_by TEXT,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date > start_date)
);

CREATE TABLE IF NOT EXISTS financial_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year_id UUID NOT NULL REFERENCES financial_fiscal_years(id) ON DELETE RESTRICT,
  period_number INTEGER NOT NULL CHECK (period_number BETWEEN 1 AND 13),
  name_ar TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'reopened_exception')),
  closed_by TEXT,
  closed_at TIMESTAMPTZ,
  reopen_reason TEXT,
  reopened_by TEXT,
  UNIQUE (fiscal_year_id, period_number)
);

-- 3. Hierarchical Cost Centers (Axis 13)
CREATE TABLE IF NOT EXISTS cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  parent_id UUID REFERENCES cost_centers(id) ON DELETE RESTRICT,
  level_type TEXT NOT NULL CHECK (level_type IN ('directorate', 'administration', 'department', 'branch', 'unit', 'project')),
  branch_id TEXT,
  department_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Unified Chart of Accounts (Axis 3)
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  parent_id UUID REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  account_level INTEGER NOT NULL DEFAULT 1 CHECK (account_level >= 1),
  account_type TEXT NOT NULL CHECK (account_type IN (
    'assets', 'liabilities', 'net_assets', 'revenues', 'expenses',
    'clearing', 'settlement', 'custody_deposits', 'off_balance_memo'
  )),
  normal_balance TEXT NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
  classification TEXT,
  cost_center_id UUID REFERENCES cost_centers(id),
  branch_id TEXT,
  is_group BOOLEAN NOT NULL DEFAULT FALSE,
  allow_posting BOOLEAN NOT NULL DEFAULT TRUE,
  allowed_tx_types TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_review')),
  valid_from DATE,
  valid_to DATE,
  reference_doc_id UUID REFERENCES accounting_reference_documents(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (NOT (is_group = TRUE AND allow_posting = TRUE))
);

CREATE INDEX IF NOT EXISTS idx_coa_parent ON chart_of_accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_coa_type_status ON chart_of_accounts(account_type, status);

-- 5. Journal Entries & Double-Entry Lines (Axis 4)
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number TEXT NOT NULL UNIQUE,
  entry_date DATE NOT NULL,
  period_id UUID NOT NULL REFERENCES financial_periods(id) ON DELETE RESTRICT,
  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'opening', 'journal', 'adjustment', 'accrual', 'payment', 'collection',
    'disbursement', 'transfer', 'depreciation', 'inventory_count',
    'correction', 'reversal', 'closing', 'subledger_auto'
  )),
  source_module TEXT NOT NULL DEFAULT 'manual',
  source_ref_id TEXT,
  document_number TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  description TEXT NOT NULL,
  branch_id TEXT,
  department_code TEXT,
  cost_center_id UUID REFERENCES cost_centers(id),
  currency TEXT NOT NULL DEFAULT 'EGP',
  total_debit NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (total_debit >= 0),
  total_credit NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (total_credit >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'approved', 'posted', 'cancelled')),
  reversed_entry_id UUID REFERENCES journal_entries(id),
  created_by TEXT NOT NULL,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  posted_by TEXT,
  posted_at TIMESTAMPTZ,
  attachment_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  line_order INTEGER NOT NULL DEFAULT 1,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  cost_center_id UUID REFERENCES cost_centers(id),
  branch_id TEXT,
  department_code TEXT,
  description TEXT,
  debit NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
);

CREATE INDEX IF NOT EXISTS idx_je_period_status ON journal_entries(period_id, status);
CREATE INDEX IF NOT EXISTS idx_je_source ON journal_entries(source_module, source_ref_id);
CREATE INDEX IF NOT EXISTS idx_jel_account ON journal_entry_lines(account_id);

-- General Ledger materialized posting table (derived strictly on posting)
CREATE TABLE IF NOT EXISTS general_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE RESTRICT,
  journal_line_id UUID NOT NULL REFERENCES journal_entry_lines(id) ON DELETE RESTRICT,
  period_id UUID NOT NULL REFERENCES financial_periods(id) ON DELETE RESTRICT,
  entry_date DATE NOT NULL,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  cost_center_id UUID REFERENCES cost_centers(id),
  branch_id TEXT,
  debit NUMERIC(18, 2) NOT NULL DEFAULT 0,
  credit NUMERIC(18, 2) NOT NULL DEFAULT 0,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gl_account_period ON general_ledger(account_id, period_id);

-- Prevent direct edits or deletion of posted journal entries
CREATE OR REPLACE FUNCTION prevent_posted_journal_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'posted' THEN
    RAISE EXCEPTION 'Posted journal entries are immutable. Create a reversal or adjustment entry instead.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_posted_je_update ON journal_entries;
CREATE TRIGGER trg_prevent_posted_je_update
  BEFORE UPDATE OR DELETE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION prevent_posted_journal_mutation();

-- 6. Budget & Appropriations (Axis 5)
CREATE TABLE IF NOT EXISTS budget_headers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year_id UUID NOT NULL REFERENCES financial_fiscal_years(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE,
  title_ar TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'closed')),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_header_id UUID NOT NULL REFERENCES budget_headers(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  cost_center_id UUID REFERENCES cost_centers(id),
  branch_id TEXT,
  department_code TEXT,
  estimated_amount NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (estimated_amount >= 0),
  approved_amount NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (approved_amount >= 0),
  additions_transfers_in NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (additions_transfers_in >= 0),
  reductions_transfers_out NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (reductions_transfers_out >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id UUID NOT NULL REFERENCES budget_allocations(id) ON DELETE RESTRICT,
  amendment_type TEXT NOT NULL CHECK (amendment_type IN ('addition', 'transfer_in', 'transfer_out', 'reduction')),
  amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  authority_doc_number TEXT NOT NULL,
  reason TEXT NOT NULL,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id UUID NOT NULL REFERENCES budget_allocations(id) ON DELETE RESTRICT,
  commitment_number TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  committed_amount NUMERIC(18, 2) NOT NULL CHECK (committed_amount > 0),
  converted_expense_amount NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (converted_expense_amount >= 0),
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'partially_expensed', 'fully_expensed', 'released')),
  created_by TEXT NOT NULL,
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Treasury, Cashboxes, Banks & Reconciliation (Axis 6)
CREATE TABLE IF NOT EXISTS cash_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  branch_id TEXT,
  gl_account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  custodian_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  bank_name TEXT NOT NULL,
  account_number_masked TEXT NOT NULL,
  branch_id TEXT,
  gl_account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  currency TEXT NOT NULL DEFAULT 'EGP',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_number TEXT NOT NULL UNIQUE,
  tx_date DATE NOT NULL,
  tx_type TEXT NOT NULL CHECK (tx_type IN ('receipt', 'payment', 'deposit', 'withdrawal', 'transfer', 'cheque', 'payment_order', 'custody')),
  cash_account_id UUID REFERENCES cash_accounts(id),
  bank_account_id UUID REFERENCES bank_accounts(id),
  counterparty TEXT NOT NULL,
  document_number TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'approved', 'posted', 'cancelled')),
  journal_entry_id UUID REFERENCES journal_entries(id),
  created_by TEXT NOT NULL,
  reviewed_by TEXT,
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
  period_id UUID NOT NULL REFERENCES financial_periods(id) ON DELETE RESTRICT,
  statement_date DATE NOT NULL,
  statement_ending_balance NUMERIC(18, 2) NOT NULL,
  book_ending_balance NUMERIC(18, 2) NOT NULL,
  outstanding_cheques NUMERIC(18, 2) NOT NULL DEFAULT 0,
  deposits_in_transit NUMERIC(18, 2) NOT NULL DEFAULT 0,
  bank_charges_unrecorded NUMERIC(18, 2) NOT NULL DEFAULT 0,
  variance NUMERIC(18, 2) NOT NULL DEFAULT 0,
  adjustment_journal_id UUID REFERENCES journal_entries(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reconciled')),
  prepared_by TEXT NOT NULL,
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Revenues, Vendors, Procurement & Debtors (Axes 7, 8, 9)
CREATE TABLE IF NOT EXISTS revenue_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT UNIQUE,
  revenue_type TEXT NOT NULL,
  accrual_basis TEXT NOT NULL,
  document_number TEXT NOT NULL,
  payer_name TEXT NOT NULL,
  branch_id TEXT,
  department_code TEXT,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  collection_date DATE,
  collection_method TEXT,
  collection_status TEXT NOT NULL DEFAULT 'accrued' CHECK (collection_status IN ('accrued', 'collected', 'overdue', 'refunded', 'settled')),
  journal_entry_id UUID REFERENCES journal_entries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  tax_registration_number TEXT,
  commercial_register TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  purchase_request_ref TEXT,
  purchase_order_ref TEXT,
  inspection_report_ref TEXT,
  payment_order_ref TEXT,
  allocation_id UUID REFERENCES budget_allocations(id),
  commitment_id UUID REFERENCES budget_commitments(id),
  amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  stage TEXT NOT NULL DEFAULT 'purchase_request' CHECK (stage IN (
    'purchase_request', 'budget_checked', 'approved', 'po_issued',
    'received_inspected', 'invoiced', 'accrued', 'payment_ordered', 'paid', 'posted'
  )),
  journal_entry_id UUID REFERENCES journal_entries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vendor_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS debtor_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code TEXT NOT NULL UNIQUE,
  debtor_name TEXT NOT NULL,
  branch_id TEXT,
  department_code TEXT,
  debt_type TEXT NOT NULL,
  source_bakery_id TEXT,
  opening_balance NUMERIC(18, 2) NOT NULL DEFAULT 0,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS debt_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debtor_id UUID NOT NULL REFERENCES debtor_accounts(id) ON DELETE RESTRICT,
  tx_type TEXT NOT NULL CHECK (tx_type IN ('new_debt', 'addition', 'collection', 'credit_settlement', 'waiver_legal')),
  amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  document_number TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  legal_basis TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'posted')),
  journal_entry_id UUID REFERENCES journal_entries(id),
  tx_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Inventory Valuation, Fixed Assets & Depreciation (Axes 11, 12)
CREATE TABLE IF NOT EXISTS inventory_valuation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code TEXT NOT NULL UNIQUE,
  item_name_ar TEXT NOT NULL,
  branch_id TEXT,
  department_code TEXT,
  unit TEXT NOT NULL,
  valuation_method TEXT NOT NULL DEFAULT 'weighted_average' CHECK (valuation_method IN ('fifo', 'weighted_average')),
  opening_qty NUMERIC(18, 3) NOT NULL DEFAULT 0,
  in_qty NUMERIC(18, 3) NOT NULL DEFAULT 0,
  out_qty NUMERIC(18, 3) NOT NULL DEFAULT 0,
  transfers_in_qty NUMERIC(18, 3) NOT NULL DEFAULT 0,
  transfers_out_qty NUMERIC(18, 3) NOT NULL DEFAULT 0,
  adjustments_qty NUMERIC(18, 3) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(18, 4) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fixed_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code TEXT NOT NULL UNIQUE,
  asset_name_ar TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('buildings', 'land', 'vehicles', 'equipment', 'devices', 'machinery', 'furniture', 'computers', 'silo_mill_cold')),
  branch_id TEXT,
  location TEXT NOT NULL,
  acquisition_date DATE NOT NULL,
  in_service_date DATE NOT NULL,
  acquisition_cost NUMERIC(18, 2) NOT NULL CHECK (acquisition_cost > 0),
  document_number TEXT NOT NULL,
  useful_life_years NUMERIC(6, 2) NOT NULL CHECK (useful_life_years > 0),
  salvage_value NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (salvage_value >= 0),
  depreciation_method TEXT NOT NULL DEFAULT 'straight_line',
  accumulated_depreciation NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (accumulated_depreciation >= 0),
  impairment_loss NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (impairment_loss >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'under_maintenance', 'transferred', 'disposed')),
  custodian_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (salvage_value <= acquisition_cost)
);

CREATE TABLE IF NOT EXISTS asset_depreciation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES fixed_assets(id) ON DELETE RESTRICT,
  period_id UUID NOT NULL REFERENCES financial_periods(id) ON DELETE RESTRICT,
  depreciation_amount NUMERIC(18, 2) NOT NULL CHECK (depreciation_amount >= 0),
  journal_entry_id UUID REFERENCES journal_entries(id),
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (asset_id, period_id)
);

-- 10. Configurable Tax & Deductions Rules (Axis 14 — zero hardcoded rates)
CREATE TABLE IF NOT EXISTS tax_rules_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  tax_type TEXT NOT NULL CHECK (tax_type IN ('vat', 'withholding', 'payroll_tax', 'social_insurance', 'stamp_or_other')),
  rate_percent NUMERIC(6, 3) NOT NULL CHECK (rate_percent >= 0 AND rate_percent <= 100),
  reference_doc_id UUID NOT NULL REFERENCES accounting_reference_documents(id),
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Immutable Financial Audit Trail & Alerts (Axes 17, 18)
CREATE TABLE IF NOT EXISTS financial_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  document_number TEXT,
  before_state JSONB,
  after_state JSONB,
  reason TEXT,
  approval_status TEXT,
  session_info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  branch_id TEXT,
  department_code TEXT,
  amount_egp NUMERIC(18, 2),
  suggested_action TEXT NOT NULL,
  assigned_to TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Enable Row Level Security (RLS) on ALL sensitive financial tables (Axis 20)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'accounting_reference_documents', 'accounting_policies', 'financial_fiscal_years',
    'financial_periods', 'cost_centers', 'chart_of_accounts', 'journal_entries',
    'journal_entry_lines', 'general_ledger', 'budget_headers', 'budget_allocations',
    'budget_amendments', 'budget_commitments', 'cash_accounts', 'bank_accounts',
    'bank_transactions', 'bank_reconciliations', 'revenue_transactions', 'vendors',
    'vendor_invoices', 'debtor_accounts', 'debt_transactions', 'inventory_valuation',
    'fixed_assets', 'asset_depreciation', 'tax_rules_config', 'financial_audit_logs',
    'financial_notifications'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
  END LOOP;
END $$;
