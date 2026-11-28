/**
 * Central Institutional Financial & Accounting ERP Engine
 * Gharbia Directorate of Supply & Internal Trade
 *
 * Pure deterministic accounting calculations, double-entry validation,
 * segregation of duties enforcement, period closing guards, smart alert rules,
 * and mandatory acceptance test suite (Axis 23).
 *
 * STRICT GOVERNANCE:
 * - Zero invented official Egyptian governmental account codes, decrees, or tax rates.
 * - Balances are derived strictly from posted journal entries (never overwritten manually).
 * - Posted journal entries are immutable; corrections require reversal/adjustment entries.
 */

export type FinancialRoleId =
  | 'system_admin'
  | 'financial_director'
  | 'chief_accountant'
  | 'accountant'
  | 'financial_reviewer'
  | 'treasurer'
  | 'warehouse_keeper'
  | 'assets_officer'
  | 'budget_officer'
  | 'supply_admin_manager'
  | 'financial_controller'
  | 'internal_auditor'
  | 'viewer_only';

export interface FinancialRoleMeta {
  id: FinancialRoleId;
  labelAr: string;
  canCreate: boolean;
  canReview: boolean;
  canApprove: boolean;
  canPost: boolean;
  canClosePeriod: boolean;
  canReopenPeriod: boolean;
  canExport: boolean;
}

export const FINANCIAL_ROLES: FinancialRoleMeta[] = [
  { id: 'system_admin', labelAr: 'مدير النظام', canCreate: true, canReview: true, canApprove: true, canPost: true, canClosePeriod: true, canReopenPeriod: true, canExport: true },
  { id: 'financial_director', labelAr: 'المدير المالي', canCreate: false, canReview: true, canApprove: true, canPost: true, canClosePeriod: true, canReopenPeriod: true, canExport: true },
  { id: 'chief_accountant', labelAr: 'رئيس الحسابات', canCreate: true, canReview: true, canApprove: true, canPost: true, canClosePeriod: true, canReopenPeriod: false, canExport: true },
  { id: 'accountant', labelAr: 'المحاسب', canCreate: true, canReview: false, canApprove: false, canPost: false, canClosePeriod: false, canReopenPeriod: false, canExport: true },
  { id: 'financial_reviewer', labelAr: 'المراجع المالي', canCreate: false, canReview: true, canApprove: false, canPost: false, canClosePeriod: false, canReopenPeriod: false, canExport: true },
  { id: 'treasurer', labelAr: 'أمين الخزينة', canCreate: true, canReview: false, canApprove: false, canPost: false, canClosePeriod: false, canReopenPeriod: false, canExport: true },
  { id: 'warehouse_keeper', labelAr: 'أمين المخزن', canCreate: true, canReview: false, canApprove: false, canPost: false, canClosePeriod: false, canReopenPeriod: false, canExport: true },
  { id: 'assets_officer', labelAr: 'مسؤول الأصول', canCreate: true, canReview: false, canApprove: false, canPost: false, canClosePeriod: false, canReopenPeriod: false, canExport: true },
  { id: 'budget_officer', labelAr: 'مسؤول الموازنة', canCreate: true, canReview: true, canApprove: false, canPost: false, canClosePeriod: false, canReopenPeriod: false, canExport: true },
  { id: 'supply_admin_manager', labelAr: 'مدير الإدارة التموينية', canCreate: false, canReview: true, canApprove: true, canPost: false, canClosePeriod: false, canReopenPeriod: false, canExport: true },
  { id: 'financial_controller', labelAr: 'مراقب مالي', canCreate: false, canReview: true, canApprove: true, canPost: false, canClosePeriod: false, canReopenPeriod: true, canExport: true },
  { id: 'internal_auditor', labelAr: 'مراجع داخلي', canCreate: false, canReview: true, canApprove: false, canPost: false, canClosePeriod: false, canReopenPeriod: false, canExport: true },
  { id: 'viewer_only', labelAr: 'مستخدم للعرض فقط', canCreate: false, canReview: false, canApprove: false, canPost: false, canClosePeriod: false, canReopenPeriod: false, canExport: true },
];

export type AccountType =
  | 'assets'
  | 'liabilities'
  | 'net_assets'
  | 'revenues'
  | 'expenses'
  | 'clearing'
  | 'settlement'
  | 'custody_deposits'
  | 'off_balance_memo';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, { ar: string; normal: 'debit' | 'credit' }> = {
  assets: { ar: 'الأصول', normal: 'debit' },
  liabilities: { ar: 'الالتزامات', normal: 'credit' },
  net_assets: { ar: 'صافي الأصول / حقوق الملكية', normal: 'credit' },
  revenues: { ar: 'الإيرادات', normal: 'credit' },
  expenses: { ar: 'المصروفات', normal: 'debit' },
  clearing: { ar: 'الحسابات الوسيطة', normal: 'debit' },
  settlement: { ar: 'حسابات التسوية', normal: 'debit' },
  custody_deposits: { ar: 'حسابات العهد والأمانات', normal: 'debit' },
  off_balance_memo: { ar: 'الحسابات النظامية (خارج الميزانية)', normal: 'debit' },
};

export interface LegalReferenceDoc {
  id: string;
  decisionNumber: string;
  title: string;
  issuingAuthority: string;
  category:
    | 'law'
    | 'mof_circular'
    | 'budget_rule'
    | 'procurement'
    | 'inventory_assets'
    | 'tax'
    | 'debt_settlement'
    | 'audit_control'
    | 'supply_decree';
  issueDate: string;
  effectiveDate: string;
  expiryDate?: string;
  scope: string;
  accountingImpact: string;
  officialAttachmentRef?: string;
  reviewStatus: 'pending_review' | 'approved' | 'superseded';
  reviewedBy?: string;
}

export interface AccountingPolicyConfig {
  basis: 'accrual' | 'cash' | 'modified_accrual';
  inventoryMethod: 'unconfigured' | 'fifo' | 'weighted_average';
  depreciationMethod: 'straight_line';
  segregationOfDutiesEnforced: boolean;
  allowOverBudgetWithAuthorityDoc: boolean;
  activeFiscalYearId: string;
  lastReviewedBy?: string;
  lastReviewedAt?: string;
}

export interface FiscalPeriod {
  id: string;
  fiscalYearCode: string;
  periodNumber: number;
  nameAr: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed' | 'reopened_exception';
  closedBy?: string;
  closedAt?: string;
  reopenReason?: string;
}

export interface CostCenter {
  id: string;
  code: string;
  nameAr: string;
  parentId?: string;
  levelType: 'directorate' | 'administration' | 'department' | 'branch' | 'unit' | 'project';
  branchId?: string;
  departmentCode?: string;
  isActive: boolean;
}

export interface ChartAccount {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  parentId?: string;
  level: number;
  type: AccountType;
  normalBalance: 'debit' | 'credit';
  classification: string;
  costCenterId?: string;
  branchId?: string;
  isGroup: boolean;
  allowPosting: boolean;
  allowedEntryTypes: JournalEntryType[];
  status: 'active' | 'inactive' | 'pending_review';
  validFrom: string;
  validTo?: string;
  isTemplateDraft?: boolean;
}

export type JournalEntryType =
  | 'opening'
  | 'journal'
  | 'adjustment'
  | 'accrual'
  | 'payment'
  | 'collection'
  | 'disbursement'
  | 'transfer'
  | 'depreciation'
  | 'inventory_count'
  | 'correction'
  | 'reversal'
  | 'closing'
  | 'subledger_auto';

export const JOURNAL_ENTRY_TYPE_LABELS: Record<JournalEntryType, string> = {
  opening: 'قيد افتتاحي',
  journal: 'قيد يومية',
  adjustment: 'قيد تسوية',
  accrual: 'قيد استحقاق',
  payment: 'قيد سداد',
  collection: 'قيد تحصيل',
  disbursement: 'قيد صرف',
  transfer: 'قيد تحويل',
  depreciation: 'قيد إهلاك',
  inventory_count: 'قيد جرد',
  correction: 'قيد تصحيح',
  reversal: 'قيد عكسي',
  closing: 'قيد إقفال',
  subledger_auto: 'قيد آلي من قسم تشغيلي',
};

export type EntryStatus = 'draft' | 'under_review' | 'approved' | 'posted' | 'cancelled';

export const ENTRY_STATUS_LABELS: Record<EntryStatus, string> = {
  draft: 'مسودة',
  under_review: 'قيد المراجعة',
  approved: 'معتمدة',
  posted: 'مرحّلة',
  cancelled: 'ملغاة',
};

export interface JournalEntryLine {
  id: string;
  accountId: string;
  costCenterId?: string;
  branchId?: string;
  departmentCode?: string;
  description: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  periodId: string;
  entryType: JournalEntryType;
  sourceModule:
    | 'manual'
    | 'bakeries'
    | 'bakery_debts'
    | 'commodities'
    | 'internal_trade'
    | 'grain_maintenance'
    | 'hr_payroll'
    | 'treasury'
    | 'procurement'
    | 'fixed_assets'
    | 'inventory';
  sourceRefId?: string;
  documentNumber: string;
  idempotencyKey: string;
  description: string;
  branchId: string;
  departmentCode: string;
  costCenterId?: string;
  currency: 'EGP';
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  status: EntryStatus;
  reversedEntryId?: string;
  createdBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  postedBy?: string;
  postedAt?: string;
  attachmentRef?: string;
  createdAt: string;
}

export interface BudgetAllocation {
  id: string;
  fiscalYearCode: string;
  code: string;
  titleAr: string;
  accountId: string;
  branchId: string;
  departmentCode: string;
  costCenterId?: string;
  estimatedAmount: number;
  originalApprovedAmount: number;
  additionsTransfersIn: number;
  reductionsTransfersOut: number;
  status: 'draft' | 'approved' | 'closed';
  authorityDocRef?: string;
}

export interface BudgetCommitment {
  id: string;
  allocationId: string;
  commitmentNumber: string;
  description: string;
  committedAmount: number;
  convertedToExpenseAmount: number;
  status: 'reserved' | 'partially_expensed' | 'fully_expensed' | 'released';
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
}

export interface BudgetExpenseRecord {
  id: string;
  allocationId: string;
  commitmentId?: string; // If linked to commitment, does NOT double-deduct from available balance
  documentNumber: string;
  description: string;
  amount: number;
  expenseDate: string;
  status: 'draft' | 'approved' | 'posted';
  journalEntryId?: string;
}

export interface TreasuryAccount {
  id: string;
  code: string;
  nameAr: string;
  kind: 'cashbox' | 'bank';
  bankName?: string;
  maskedAccountNo?: string;
  branchId: string;
  glAccountId: string;
  custodianName: string;
  isActive: boolean;
}

export interface TreasuryTransaction {
  id: string;
  txNumber: string;
  txDate: string;
  txType: 'receipt' | 'payment' | 'deposit' | 'withdrawal' | 'transfer' | 'cheque' | 'payment_order' | 'custody';
  treasuryAccountId: string;
  counterparty: string;
  documentNumber: string;
  paymentMethod: 'نقدي' | 'شيك' | 'أمر دفع إلكتروني' | 'تحويل بنكي';
  amount: number;
  status: EntryStatus;
  journalEntryId?: string;
  createdBy: string;
  reviewedBy?: string;
  approvedBy?: string;
}

export interface BankReconciliationRecord {
  id: string;
  bankAccountId: string;
  periodId: string;
  statementDate: string;
  statementEndingBalance: number;
  bookEndingBalance: number;
  outstandingCheques: number;
  depositsInTransit: number;
  bankChargesUnrecorded: number;
  adjustedBankBalance: number;
  adjustedBookBalance: number;
  variance: number;
  adjustmentJournalId?: string;
  status: 'open' | 'reconciled';
  preparedBy: string;
  notes: string;
}

export interface RevenueRecord {
  id: string;
  revenueType: string;
  accrualBasis: string;
  documentNumber: string;
  payerName: string;
  branchId: string;
  departmentCode: string;
  accountId: string;
  amount: number;
  dueDate: string;
  collectionDate?: string;
  collectionMethod?: string;
  receiptNumber?: string;
  status: 'accrued' | 'collected' | 'overdue' | 'refunded' | 'settled';
  journalEntryId?: string;
}

export interface ProcurementCycleRecord {
  id: string;
  vendorName: string;
  vendorCode: string;
  invoiceNumber: string;
  invoiceDate: string;
  purchaseRequestRef: string;
  purchaseOrderRef?: string;
  inspectionReportRef?: string;
  paymentOrderRef?: string;
  allocationId?: string;
  commitmentId?: string;
  branchId: string;
  departmentCode: string;
  category: string;
  amount: number;
  stage:
    | 'purchase_request'
    | 'budget_checked'
    | 'approved'
    | 'po_issued'
    | 'received_inspected'
    | 'invoiced'
    | 'accrued'
    | 'payment_ordered'
    | 'paid'
    | 'posted';
  journalEntryId?: string;
}

export interface DebtorAccount {
  id: string;
  accountCode: string;
  debtorName: string;
  branchId: string;
  departmentCode: string;
  debtType: string;
  sourceBakeryId?: string;
  openingBalance: number;
  newDebts: number;
  approvedAdditions: number;
  approvedCollections: number;
  approvedCreditSettlements: number;
  dueDate: string;
  status: 'active' | 'overdue' | 'settled';
  syncedRefKeys: string[];
}

export interface InventoryItemRecord {
  id: string;
  itemCode: string;
  itemNameAr: string;
  branchId: string;
  departmentCode: string;
  unit: string;
  openingQty: number;
  approvedInQty: number;
  approvedOutQty: number;
  transfersInQty: number;
  transfersOutQty: number;
  adjustmentsQty: number;
  unitCost: number;
  minStockThreshold: number;
  fifoLayers: { qty: number; unitCost: number }[];
}

export interface FixedAssetRecord {
  id: string;
  assetCode: string;
  assetNameAr: string;
  category:
    | 'buildings'
    | 'land'
    | 'vehicles'
    | 'equipment'
    | 'devices'
    | 'machinery'
    | 'furniture'
    | 'computers'
    | 'silo_mill_cold';
  branchId: string;
  location: string;
  acquisitionDate: string;
  inServiceDate: string;
  acquisitionCost: number;
  documentNumber: string;
  usefulLifeYears: number;
  salvageValue: number;
  depreciationMethod: 'straight_line';
  accumulatedDepreciation: number;
  impairmentLoss: number;
  status: 'active' | 'under_maintenance' | 'transferred' | 'disposed';
  custodianName: string;
}

export interface TaxRuleConfig {
  id: string;
  code: string;
  nameAr: string;
  taxType: 'vat' | 'withholding' | 'payroll_tax' | 'social_insurance' | 'stamp_or_other';
  ratePercent: number;
  referenceDocId: string;
  referenceDocLabel: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  approvedBy?: string;
}

export interface FinancialAuditEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: FinancialRoleId;
  action: string;
  entityType: string;
  entityId: string;
  documentNumber?: string;
  beforeSummary?: string;
  afterSummary?: string;
  reason?: string;
  approvalStatus?: string;
}

export interface SmartFinancialAlert {
  id: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  branchId?: string;
  departmentCode?: string;
  amountEgp?: number;
  createdAt: string;
  suggestedAction: string;
  responsibleRole: string;
  status: 'open' | 'acknowledged';
}

export interface FinancialErpState {
  version: number;
  policy: AccountingPolicyConfig;
  referenceDocs: LegalReferenceDoc[];
  periods: FiscalPeriod[];
  costCenters: CostCenter[];
  accounts: ChartAccount[];
  journalEntries: JournalEntry[];
  budgetAllocations: BudgetAllocation[];
  budgetCommitments: BudgetCommitment[];
  budgetExpenses: BudgetExpenseRecord[];
  treasuryAccounts: TreasuryAccount[];
  treasuryTransactions: TreasuryTransaction[];
  bankReconciliations: BankReconciliationRecord[];
  revenues: RevenueRecord[];
  procurements: ProcurementCycleRecord[];
  debtors: DebtorAccount[];
  inventory: InventoryItemRecord[];
  fixedAssets: FixedAssetRecord[];
  taxRules: TaxRuleConfig[];
  auditLogs: FinancialAuditEntry[];
}

// ============================================================================
// CORE MATHEMATICAL & VALIDATION ENGINE
// ============================================================================

export function round2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

/**
 * Axis 4: Strict Double-Entry & Control Validation
 */
export function validateJournalEntry(
  draft: {
    id?: string;
    entryDate: string;
    periodId: string;
    entryType: JournalEntryType;
    documentNumber: string;
    idempotencyKey: string;
    description: string;
    lines: JournalEntryLine[];
  },
  accounts: ChartAccount[],
  existingEntries: JournalEntry[],
  periods: FiscalPeriod[]
): { valid: boolean; errors: string[]; totalDebit: number; totalCredit: number } {
  const errors: string[] = [];
  const period = periods.find((p) => p.id === draft.periodId);

  if (!period) {
    errors.push('الفترة المحاسبية غير محددة أو غير موجودة.');
  } else if (period.status === 'closed') {
    errors.push(`لا يجوز الترحيل في فترة محاسبية مغلقة (${period.nameAr}).`);
  }

  if (!draft.documentNumber.trim()) {
    errors.push('رقم المستند المؤيد إلزامي ولا يسمح بالترحيل دون مستند مرجعي.');
  }

  if (!draft.description.trim()) {
    errors.push('بيان القيد المحاسبي مطلوب.');
  }

  if (!draft.lines || draft.lines.length < 2) {
    errors.push('يجب أن يحتوي القيد المزدوج على سطرين على الأقل (طرف مدين وطرف دائن).');
  }

  // Idempotency / duplicate document check
  if (draft.idempotencyKey.trim()) {
    const duplicate = existingEntries.find(
      (e) =>
        e.id !== draft.id &&
        e.status !== 'cancelled' &&
        e.idempotencyKey === draft.idempotencyKey.trim()
    );
    if (duplicate) {
      errors.push(`تم رصد قيد مكرر لنفس المستند المرجعي (${duplicate.entryNumber}). يمنع تكرار القيد.`);
    }
  }

  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  let totalDebit = 0;
  let totalCredit = 0;

  for (let i = 0; i < (draft.lines || []).length; i++) {
    const line = draft.lines[i];
    const acc = accountMap.get(line.accountId);
    if (!acc) {
      errors.push(`السطر ${i + 1}: الحساب المحاسبي غير موجود في دليل الحسابات.`);
      continue;
    }
    if (acc.isGroup || !acc.allowPosting) {
      errors.push(`السطر ${i + 1}: لا يجوز الترحيل على حساب تجميعي (${acc.code} - ${acc.nameAr}).`);
    }
    if (acc.status !== 'active') {
      errors.push(`السطر ${i + 1}: لا يجوز الترحيل على حساب غير نشط (${acc.code} - ${acc.nameAr}).`);
    }
    if (acc.allowedEntryTypes.length > 0 && !acc.allowedEntryTypes.includes(draft.entryType)) {
      errors.push(`السطر ${i + 1}: نوع القيد غير مسموح به على الحساب (${acc.code}).`);
    }
    if (line.debit < 0 || line.credit < 0) {
      errors.push(`السطر ${i + 1}: القيم السالبة غير مسموح بها في المدين أو الدائن.`);
    }
    if ((line.debit > 0 && line.credit > 0) || (line.debit === 0 && line.credit === 0)) {
      errors.push(`السطر ${i + 1}: يجب إدخال قيمة موجبة في المدين فقط أو الدائن فقط.`);
    }
    totalDebit = round2(totalDebit + line.debit);
    totalCredit = round2(totalCredit + line.credit);
  }

  if (totalDebit <= 0 || totalCredit <= 0) {
    errors.push('يجب أن يكون إجمالي القيد أكبر من صفر.');
  } else if (Math.abs(totalDebit - totalCredit) >= 0.005) {
    errors.push(
      `القيد غير متوازن: إجمالي المدين (${totalDebit.toFixed(2)}) لا يساوي إجمالي الدائن (${totalCredit.toFixed(2)}).`
    );
  }

  return { valid: errors.length === 0, errors, totalDebit, totalCredit };
}

/**
 * Axis 17: Segregation of Duties check for workflow transitions
 */
export function checkSegregationOfDuties(params: {
  action: 'review' | 'approve' | 'post';
  actorName: string;
  actorRole: FinancialRoleId;
  entry: JournalEntry;
  enforced: boolean;
}): { allowed: boolean; reason?: string } {
  const roleMeta = FINANCIAL_ROLES.find((r) => r.id === params.actorRole);
  if (!roleMeta) return { allowed: false, reason: 'الدور المالي غير معروف.' };

  if (params.action === 'review' && !roleMeta.canReview) {
    return { allowed: false, reason: `دور «${roleMeta.labelAr}» لا يملك صلاحية مراجعة القيود.` };
  }
  if (params.action === 'approve' && !roleMeta.canApprove) {
    return { allowed: false, reason: `دور «${roleMeta.labelAr}» لا يملك صلاحية اعتماد القيود.` };
  }
  if (params.action === 'post' && !roleMeta.canPost) {
    return { allowed: false, reason: `دور «${roleMeta.labelAr}» لا يملك صلاحية ترحيل القيود.` };
  }

  if (params.enforced) {
    if (params.action === 'review' && params.entry.createdBy === params.actorName) {
      return {
        allowed: false,
        reason: 'فصل الاختصاصات: لا يجوز لمحرر القيد مراجعة قيده منفرداً.',
      };
    }
    if (params.action === 'approve' && params.entry.createdBy === params.actorName) {
      return {
        allowed: false,
        reason: 'فصل الاختصاصات: لا يجوز لمحرر القيد اعتماده منفرداً.',
      };
    }
    if (params.action === 'post' && params.entry.createdBy === params.actorName && params.entry.approvedBy === params.actorName) {
      return {
        allowed: false,
        reason: 'فصل الاختصاصات: لا يجوز لنفس المستخدم إنشاء القيد واعتماده وترحيله منفرداً.',
      };
    }
  }

  return { allowed: true };
}

/**
 * Axis 5: Budget Equations (prevents double deduction when commitments convert to actual expenses)
 */
export function computeBudgetMetrics(
  allocation: BudgetAllocation,
  commitments: BudgetCommitment[],
  expenses: BudgetExpenseRecord[]
): {
  adjustedBudget: number;
  reservedCommitmentsOpen: number;
  actualExpensesTotal: number;
  directExpensesUncommitted: number;
  availableBalance: number;
  executionPercent: number;
} {
  const adjustedBudget = round2(
    allocation.originalApprovedAmount +
      allocation.additionsTransfersIn -
      allocation.reductionsTransfersOut
  );

  const allocCommitments = commitments.filter(
    (c) => c.allocationId === allocation.id && c.status !== 'released'
  );
  const allocExpenses = expenses.filter(
    (e) => e.allocationId === allocation.id && (e.status === 'approved' || e.status === 'posted')
  );

  // Open reserved commitments = committed minus whatever portion already moved to actual expense
  const reservedCommitmentsOpen = round2(
    allocCommitments.reduce((sum, c) => {
      const linkedExpenses = allocExpenses
        .filter((e) => e.commitmentId === c.id)
        .reduce((s, e) => s + e.amount, 0);
      const converted = Math.max(c.convertedToExpenseAmount, linkedExpenses);
      return sum + Math.max(0, c.committedAmount - converted);
    }, 0)
  );

  const actualExpensesTotal = round2(allocExpenses.reduce((s, e) => s + e.amount, 0));
  const directExpensesUncommitted = round2(
    allocExpenses.filter((e) => !e.commitmentId).reduce((s, e) => s + e.amount, 0)
  );

  // Available = Adjusted - Open Reserved Commitments - Actual Expenses
  // Notice: when a 20,000 commitment converts to a 20,000 linked expense, reservedCommitmentsOpen drops by 20,000
  // while actualExpensesTotal rises by 20,000 -> NET available stays identical (ZERO double deduction!)
  const availableBalance = round2(adjustedBudget - reservedCommitmentsOpen - actualExpensesTotal);
  const executionPercent =
    adjustedBudget > 0 ? round2((actualExpensesTotal / adjustedBudget) * 100) : 0;

  return {
    adjustedBudget,
    reservedCommitmentsOpen,
    actualExpensesTotal,
    directExpensesUncommitted,
    availableBalance,
    executionPercent,
  };
}

/**
 * Axis 9: Debtor Remaining Balance Formula
 * Remaining = Opening + New Debts + Approved Additions - Approved Collections - Approved Credit Settlements
 */
export function computeDebtorRemainingBalance(debtor: {
  openingBalance: number;
  newDebts: number;
  approvedAdditions: number;
  approvedCollections: number;
  approvedCreditSettlements: number;
}): number {
  return round2(
    debtor.openingBalance +
      debtor.newDebts +
      debtor.approvedAdditions -
      debtor.approvedCollections -
      debtor.approvedCreditSettlements
  );
}

/**
 * Axis 11: Inventory Closing Quantity & Valuation (FIFO / Weighted Average)
 */
export function computeInventoryMetrics(
  item: InventoryItemRecord,
  method: 'unconfigured' | 'fifo' | 'weighted_average'
): { closingQty: number; totalValue: number; effectiveUnitCost: number } {
  const closingQty = round2(
    item.openingQty +
      item.approvedInQty -
      item.approvedOutQty +
      item.transfersInQty -
      item.transfersOutQty +
      item.adjustmentsQty
  );
  if (closingQty <= 0) {
    return { closingQty: Math.max(0, closingQty), totalValue: 0, effectiveUnitCost: item.unitCost };
  }

  if (method === 'fifo' && item.fifoLayers.length > 0) {
    // FIFO keeps newest layers in ending inventory
    let remaining = closingQty;
    let val = 0;
    for (let i = item.fifoLayers.length - 1; i >= 0 && remaining > 0; i--) {
      const layer = item.fifoLayers[i];
      const take = Math.min(remaining, layer.qty);
      val += take * layer.unitCost;
      remaining -= take;
    }
    if (remaining > 0) val += remaining * item.unitCost;
    const totalValue = round2(val);
    return {
      closingQty,
      totalValue,
      effectiveUnitCost: closingQty > 0 ? round2(totalValue / closingQty) : item.unitCost,
    };
  }

  const totalValue = round2(closingQty * item.unitCost);
  return { closingQty, totalValue, effectiveUnitCost: item.unitCost };
}

/**
 * Axis 12: Fixed Assets Straight-Line Depreciation & Net Book Value
 */
export function computeStraightLineDepreciation(
  acquisitionCost: number,
  salvageValue: number,
  usefulLifeYears: number
): { annualDepreciation: number; monthlyDepreciation: number } {
  if (usefulLifeYears <= 0 || acquisitionCost <= salvageValue) {
    return { annualDepreciation: 0, monthlyDepreciation: 0 };
  }
  const annualDepreciation = round2((acquisitionCost - salvageValue) / usefulLifeYears);
  const monthlyDepreciation = round2(annualDepreciation / 12);
  return { annualDepreciation, monthlyDepreciation };
}

export function computeAssetBookValue(
  acquisitionCost: number,
  accumulatedDepreciation: number,
  impairmentLoss: number = 0
): number {
  return round2(Math.max(0, acquisitionCost - accumulatedDepreciation - impairmentLoss));
}

/**
 * Axis 4 & 16: Derive General Ledger & Trial Balance strictly from POSTED Journal Entries
 */
export interface TrialBalanceRow {
  accountId: string;
  code: string;
  nameAr: string;
  type: AccountType;
  normalBalance: 'debit' | 'credit';
  totalDebit: number;
  totalCredit: number;
  netDebit: number;
  netCredit: number;
  signedBalance: number;
}

export function computeTrialBalance(
  accounts: ChartAccount[],
  entries: JournalEntry[],
  filters?: { periodId?: string; branchId?: string; departmentCode?: string; costCenterId?: string }
): {
  rows: TrialBalanceRow[];
  sumDebit: number;
  sumCredit: number;
  sumNetDebit: number;
  sumNetCredit: number;
  isBalanced: boolean;
} {
  const posted = entries.filter((e) => {
    if (e.status !== 'posted') return false;
    if (filters?.periodId && e.periodId !== filters.periodId) return false;
    if (filters?.branchId && filters.branchId !== 'all' && e.branchId !== filters.branchId) return false;
    if (filters?.departmentCode && filters.departmentCode !== 'all' && e.departmentCode !== filters.departmentCode) return false;
    if (filters?.costCenterId && filters.costCenterId !== 'all' && e.costCenterId !== filters.costCenterId) return false;
    return true;
  });

  const totals = new Map<string, { debit: number; credit: number }>();
  for (const entry of posted) {
    for (const line of entry.lines) {
      const prev = totals.get(line.accountId) || { debit: 0, credit: 0 };
      totals.set(line.accountId, {
        debit: round2(prev.debit + line.debit),
        credit: round2(prev.credit + line.credit),
      });
    }
  }

  const rows: TrialBalanceRow[] = [];
  let sumDebit = 0;
  let sumCredit = 0;
  let sumNetDebit = 0;
  let sumNetCredit = 0;

  for (const acc of accounts) {
    if (acc.isGroup) continue;
    const t = totals.get(acc.id);
    if (!t || (t.debit === 0 && t.credit === 0)) continue;
    const diff = round2(t.debit - t.credit);
    const netDebit = diff > 0 ? diff : 0;
    const netCredit = diff < 0 ? Math.abs(diff) : 0;
    const signedBalance = acc.normalBalance === 'debit' ? diff : -diff;

    rows.push({
      accountId: acc.id,
      code: acc.code,
      nameAr: acc.nameAr,
      type: acc.type,
      normalBalance: acc.normalBalance,
      totalDebit: t.debit,
      totalCredit: t.credit,
      netDebit,
      netCredit,
      signedBalance: round2(signedBalance),
    });

    sumDebit = round2(sumDebit + t.debit);
    sumCredit = round2(sumCredit + t.credit);
    sumNetDebit = round2(sumNetDebit + netDebit);
    sumNetCredit = round2(sumNetCredit + netCredit);
  }

  rows.sort((a, b) => a.code.localeCompare(b.code));
  const isBalanced = Math.abs(sumDebit - sumCredit) < 0.005 && Math.abs(sumNetDebit - sumNetCredit) < 0.005;

  return { rows, sumDebit, sumCredit, sumNetDebit, sumNetCredit, isBalanced };
}

/**
 * Axis 15: Period Closing Readiness Validator
 */
export function evaluatePeriodClosingReadiness(
  period: FiscalPeriod,
  entries: JournalEntry[],
  reconciliations: BankReconciliationRecord[]
): { canClose: boolean; blockers: string[] } {
  const blockers: string[] = [];
  const periodEntries = entries.filter((e) => e.periodId === period.id && e.status !== 'cancelled');

  const pendingEntries = periodEntries.filter((e) => e.status !== 'posted');
  if (pendingEntries.length > 0) {
    blockers.push(`يوجد ${pendingEntries.length} قيود معلقة لم تُرحّل بعد في هذه الفترة.`);
  }

  const unbalanced = periodEntries.filter((e) => Math.abs(e.totalDebit - e.totalCredit) >= 0.005);
  if (unbalanced.length > 0) {
    blockers.push(`يوجد ${unbalanced.length} قيود غير متوازنة داخل الفترة.`);
  }

  const openRecs = reconciliations.filter(
    (r) => r.periodId === period.id && (r.status !== 'reconciled' || Math.abs(r.variance) >= 0.005)
  );
  if (openRecs.length > 0) {
    blockers.push(`يوجد ${openRecs.length} مطابقات بنكية مفتوحة أو بها فروق غير مسوّاة.`);
  }

  return { canClose: blockers.length === 0, blockers };
}

/**
 * Axis 18: Smart Financial Alerts Engine (strictly advisory, never auto-mutates balances)
 */
export function generateSmartFinancialAlerts(state: FinancialErpState): SmartFinancialAlert[] {
  const alerts: SmartFinancialAlert[] = [];
  const nowIso = new Date().toISOString();

  // 1. Near-exhaustion or over-budget allocations
  for (const alloc of state.budgetAllocations) {
    const m = computeBudgetMetrics(alloc, state.budgetCommitments, state.budgetExpenses);
    if (m.availableBalance < 0) {
      alerts.push({
        id: `al-bgt-over-${alloc.id}`,
        alertType: 'تجاوز الاعتماد المالي المعتمد',
        severity: 'critical',
        branchId: alloc.branchId,
        departmentCode: alloc.departmentCode,
        amountEgp: Math.abs(m.availableBalance),
        createdAt: nowIso,
        suggestedAction: 'إيقاف الصرف الفوري وطلب مناقلة أو اعتماد إضافي بسند قانوني معتمد.',
        responsibleRole: 'مسؤول الموازنة / المدير المالي',
        status: 'open',
      });
    } else if (m.executionPercent >= 85 && m.adjustedBudget > 0) {
      alerts.push({
        id: `al-bgt-near-${alloc.id}`,
        alertType: 'اعتماد مالي قارب على النفاد',
        severity: 'high',
        branchId: alloc.branchId,
        departmentCode: alloc.departmentCode,
        amountEgp: m.availableBalance,
        createdAt: nowIso,
        suggestedAction: 'مراجعة الالتزامات المحجوزة ودراسة إجراء مناقلة مالية قبل نفاد البند.',
        responsibleRole: 'مسؤول الموازنة',
        status: 'open',
      });
    }
  }

  // 2. Unapproved / pending journal entries
  const pendingJournal = state.journalEntries.filter(
    (e) => e.status === 'draft' || e.status === 'under_review' || e.status === 'approved'
  );
  if (pendingJournal.length > 0) {
    alerts.push({
      id: 'al-pending-je',
      alertType: 'قيود يومية معلقة بانتظار المراجعة أو الترحيل',
      severity: 'medium',
      amountEgp: round2(pendingJournal.reduce((s, e) => s + e.totalDebit, 0)),
      createdAt: nowIso,
      suggestedAction: 'استكمال دورة المراجعة والاعتماد والترحيل قبل إقفال الفترة المحاسبية.',
      responsibleRole: 'المراجع المالي / رئيس الحسابات',
      status: 'open',
    });
  }

  // 3. Bank reconciliation variances
  for (const rec of state.bankReconciliations) {
    if (Math.abs(rec.variance) >= 0.01) {
      alerts.push({
        id: `al-rec-${rec.id}`,
        alertType: 'فروق مطابقة بنكية غير مسوّاة',
        severity: 'high',
        amountEgp: Math.abs(rec.variance),
        createdAt: nowIso,
        suggestedAction: 'فحص كشف البنك وإعداد قيد تسوية محاسبي معتمد لمعالجة الفرق.',
        responsibleRole: 'رئيس الحسابات / أمين الخزينة',
        status: 'open',
      });
    }
  }

  // 4. Overdue debtors
  const overdueDebtors = state.debtors.filter(
    (d) => computeDebtorRemainingBalance(d) > 0 && d.status === 'overdue'
  );
  if (overdueDebtors.length > 0) {
    const totalOverdue = round2(
      overdueDebtors.reduce((s, d) => s + computeDebtorRemainingBalance(d), 0)
    );
    alerts.push({
      id: 'al-overdue-debtors',
      alertType: 'مديونيات متأخرة واجبة التحصيل',
      severity: 'high',
      amountEgp: totalOverdue,
      createdAt: nowIso,
      suggestedAction: 'متابعة التحصيل مع إدارات التموين المختصة وإصدار إخطارات سداد رسمية.',
      responsibleRole: 'مسؤول المديونيات والتحصيل',
      status: 'open',
    });
  }

  // 5. Low inventory stock
  for (const item of state.inventory) {
    const m = computeInventoryMetrics(item, state.policy.inventoryMethod);
    if (m.closingQty <= item.minStockThreshold && item.minStockThreshold > 0) {
      alerts.push({
        id: `al-inv-${item.id}`,
        alertType: `انخفاض رصيد المخزون: ${item.itemNameAr}`,
        severity: 'medium',
        branchId: item.branchId,
        departmentCode: item.departmentCode,
        amountEgp: m.totalValue,
        createdAt: nowIso,
        suggestedAction: 'مراجعة بطاقة الصنف ورفع طلب شراء وفق الاعتماد المالي المتاح.',
        responsibleRole: 'أمين المخزن',
        status: 'open',
      });
    }
  }

  // 6. Governance readiness check (unconfigured inventory policy or pending legal refs)
  if (state.policy.inventoryMethod === 'unconfigured') {
    alerts.push({
      id: 'al-policy-inv',
      alertType: 'سياسة تقييم المخزون لم تُعتمد بعد',
      severity: 'low',
      createdAt: nowIso,
      suggestedAction: 'تحديد واعتماد سياسة تقييم المخزون (FIFO أو المتوسط المرجح) من المختص المالي.',
      responsibleRole: 'المدير المالي / المراقب المالي',
      status: 'open',
    });
  }

  return alerts;
}

// ============================================================================
// AXIS 23: MANDATORY ACCOUNTING ACCEPTANCE TEST SUITE
// ============================================================================

export interface AccountingTestResult {
  id: string;
  category: string;
  titleAr: string;
  expected: string;
  actual: string;
  passed: boolean;
}

export function runMandatoryAccountingTests(): {
  allPassed: boolean;
  passedCount: number;
  totalCount: number;
  results: AccountingTestResult[];
} {
  const results: AccountingTestResult[] = [];

  const testPeriods: FiscalPeriod[] = [
    {
      id: 'p-test-open',
      fiscalYearCode: 'FY-TEST',
      periodNumber: 1,
      nameAr: 'فترة اختبار مفتوحة',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      status: 'open',
    },
  ];

  const testAccounts: ChartAccount[] = [
    {
      id: 'a-grp',
      code: '1',
      nameAr: 'الأصول (تجميعي)',
      nameEn: 'Assets Group',
      level: 1,
      type: 'assets',
      normalBalance: 'debit',
      classification: 'رئيسي',
      isGroup: true,
      allowPosting: false,
      allowedEntryTypes: [],
      status: 'active',
      validFrom: '2026-07-01',
    },
    {
      id: 'a-cash',
      code: '1101',
      nameAr: 'حساب نقدية اختباري',
      nameEn: 'Test Cash',
      parentId: 'a-grp',
      level: 2,
      type: 'assets',
      normalBalance: 'debit',
      classification: 'فرعي',
      isGroup: false,
      allowPosting: true,
      allowedEntryTypes: [],
      status: 'active',
      validFrom: '2026-07-01',
    },
    {
      id: 'a-rev',
      code: '4101',
      nameAr: 'حساب إيرادات اختباري',
      nameEn: 'Test Revenue',
      level: 2,
      type: 'revenues',
      normalBalance: 'credit',
      classification: 'فرعي',
      isGroup: false,
      allowPosting: true,
      allowedEntryTypes: [],
      status: 'active',
      validFrom: '2026-07-01',
    },
    {
      id: 'a-inactive',
      code: '5199',
      nameAr: 'حساب موقوف اختباري',
      nameEn: 'Inactive Account',
      level: 2,
      type: 'expenses',
      normalBalance: 'debit',
      classification: 'فرعي',
      isGroup: false,
      allowPosting: true,
      allowedEntryTypes: [],
      status: 'inactive',
      validFrom: '2026-07-01',
    },
  ];

  // Test 1: Double Entry Balanced (10,000 / 10,000 -> Accept)
  const t1 = validateJournalEntry(
    {
      entryDate: '2026-07-10',
      periodId: 'p-test-open',
      entryType: 'journal',
      documentNumber: 'DOC-T1',
      idempotencyKey: 'TEST-DOC-T1',
      description: 'اختبار قيد مزدوج متوازن',
      lines: [
        { id: 'l1', accountId: 'a-cash', description: 'مدين', debit: 10000, credit: 0 },
        { id: 'l2', accountId: 'a-rev', description: 'دائن', debit: 0, credit: 10000 },
      ],
    },
    testAccounts,
    [],
    testPeriods
  );
  results.push({
    id: 'test-double-entry-balanced',
    category: 'القيد المزدوج',
    titleAr: 'قبول قيد متوازن (مدين ١٠٬٠٠٠ = دائن ١٠٬٠٠٠)',
    expected: 'مقبول (valid = true)',
    actual: t1.valid ? 'مقبول (10,000 = 10,000)' : `مرفوض: ${t1.errors.join(' | ')}`,
    passed: t1.valid && t1.totalDebit === 10000 && t1.totalCredit === 10000,
  });

  // Test 2: Double Entry Unbalanced (10,000 / 9,000 -> Reject)
  const t2 = validateJournalEntry(
    {
      entryDate: '2026-07-10',
      periodId: 'p-test-open',
      entryType: 'journal',
      documentNumber: 'DOC-T2',
      idempotencyKey: 'TEST-DOC-T2',
      description: 'اختبار قيد غير متوازن',
      lines: [
        { id: 'l1', accountId: 'a-cash', description: 'مدين', debit: 10000, credit: 0 },
        { id: 'l2', accountId: 'a-rev', description: 'دائن', debit: 0, credit: 9000 },
      ],
    },
    testAccounts,
    [],
    testPeriods
  );
  results.push({
    id: 'test-double-entry-unbalanced',
    category: 'القيد المزدوج',
    titleAr: 'رفض قيد غير متوازن (مدين ١٠٬٠٠٠ ≠ دائن ٩٬٠٠٠)',
    expected: 'مرفوض لعدم التوازن',
    actual: !t2.valid ? 'مرفوض بنجاح' : 'تم القبول بالخطأ!',
    passed: !t2.valid,
  });

  // Test 3: Budget Calculation (100,000 - 20,000 commitment - 15,000 independent expense = 65,000) & no double deduction
  const testAlloc: BudgetAllocation = {
    id: 'alloc-1',
    fiscalYearCode: 'FY-TEST',
    code: 'B-1',
    titleAr: 'اعتماد اختباري',
    accountId: 'a-cash',
    branchId: 'b-11',
    departmentCode: 'FIN',
    estimatedAmount: 100000,
    originalApprovedAmount: 100000,
    additionsTransfersIn: 0,
    reductionsTransfersOut: 0,
    status: 'approved',
  };
  const testCommit: BudgetCommitment[] = [
    {
      id: 'com-1',
      allocationId: 'alloc-1',
      commitmentNumber: 'C-01',
      description: 'حجز التزام تجريبي',
      committedAmount: 20000,
      convertedToExpenseAmount: 0,
      status: 'reserved',
      createdBy: 'tester',
      createdAt: '2026-07-01',
    },
  ];
  const testDirectExp: BudgetExpenseRecord[] = [
    {
      id: 'exp-1',
      allocationId: 'alloc-1',
      documentNumber: 'EXP-1',
      description: 'مصروف مستقل',
      amount: 15000,
      expenseDate: '2026-07-05',
      status: 'posted',
    },
  ];
  const b1 = computeBudgetMetrics(testAlloc, testCommit, testDirectExp);
  // Now convert 10,000 of the 20,000 commitment into an actual linked expense — available MUST remain 65,000!
  const b2 = computeBudgetMetrics(testAlloc, testCommit, [
    ...testDirectExp,
    {
      id: 'exp-2',
      allocationId: 'alloc-1',
      commitmentId: 'com-1',
      documentNumber: 'EXP-2',
      description: 'صرف جزء من الالتزام المحجوز',
      amount: 10000,
      expenseDate: '2026-07-06',
      status: 'posted',
    },
  ]);
  results.push({
    id: 'test-budget-available',
    category: 'الموازنة والاعتمادات',
    titleAr: 'معادلة المتاح (١٠٠٬٠٠٠ - ٢٠٬٠٠٠ التزام - ١٥٬٠٠٠ مصروف مستقل = ٦٥٬٠٠٠) ومنع الازدواج',
    expected: 'المتاح = 65,000 قبل وبعد تحويل الالتزام لمصروف فعلي',
    actual: `قبل التحويل: ${b1.availableBalance} | بعد تحويل 10,000 من الالتزام: ${b2.availableBalance}`,
    passed: b1.availableBalance === 65000 && b2.availableBalance === 65000,
  });

  // Test 4: Debtors Formula (20,000 + 10,000 - 5,000 - 2,000 = 23,000)
  const debtorRes = computeDebtorRemainingBalance({
    openingBalance: 20000,
    newDebts: 10000,
    approvedAdditions: 0,
    approvedCollections: 5000,
    approvedCreditSettlements: 2000,
  });
  results.push({
    id: 'test-debtor-balance',
    category: 'المديونيات',
    titleAr: 'معادلة المديونيات (٢٠٬٠٠٠ + ١٠٬٠٠٠ - ٥٬٠٠٠ - ٢٬٠٠٠ = ٢٣٬٠٠٠)',
    expected: '23,000 جنيه',
    actual: `${debtorRes} جنيه`,
    passed: debtorRes === 23000,
  });

  // Test 5: Fixed Asset Straight-Line Depreciation ((100,000 - 10,000) / 9 = 10,000)
  const dep = computeStraightLineDepreciation(100000, 10000, 9);
  const nbvYear1 = computeAssetBookValue(100000, dep.annualDepreciation, 0);
  results.push({
    id: 'test-asset-depreciation',
    category: 'الأصول الثابتة',
    titleAr: 'إهلاك القسط الثابت ((١٠٠٬٠٠٠ - ١٠٬٠٠٠) ÷ ٩ سنوات = ١٠٬٠٠٠ سنوياً)',
    expected: 'الإهلاك السنوي = 10,000 | صافي القيمة الدفترية = 90,000',
    actual: `الإهلاك السنوي = ${dep.annualDepreciation} | صافي القيمة = ${nbvYear1}`,
    passed: dep.annualDepreciation === 10000 && nbvYear1 === 90000,
  });

  // Test 6: Block posting to inactive or group accounts
  const tInactive = validateJournalEntry(
    {
      entryDate: '2026-07-10',
      periodId: 'p-test-open',
      entryType: 'journal',
      documentNumber: 'DOC-T6',
      idempotencyKey: 'TEST-DOC-T6',
      description: 'اختبار الترحيل على حساب موقوف وتجميعي',
      lines: [
        { id: 'l1', accountId: 'a-inactive', description: 'موقوف', debit: 500, credit: 0 },
        { id: 'l2', accountId: 'a-grp', description: 'تجميعي', debit: 0, credit: 500 },
      ],
    },
    testAccounts,
    [],
    testPeriods
  );
  results.push({
    id: 'test-inactive-group-block',
    category: 'سلامة دليل الحسابات',
    titleAr: 'منع الترحيل على حساب غير نشط أو حساب تجميعي',
    expected: 'مرفوض (خطأان: غير نشط + تجميعي)',
    actual: !tInactive.valid ? `مرفوض بنجاح (${tInactive.errors.length} ملاحظات)` : 'تم القبول بالخطأ!',
    passed: !tInactive.valid && tInactive.errors.length >= 2,
  });

  // Test 7: Prevent duplicate document posting (Idempotency)
  const existingEntry: JournalEntry = {
    id: 'je-ex-1',
    entryNumber: 'JE-0001',
    entryDate: '2026-07-10',
    periodId: 'p-test-open',
    entryType: 'journal',
    sourceModule: 'bakery_debts',
    documentNumber: 'DOC-DUP-1',
    idempotencyKey: 'bakery_debts:DOC-DUP-1',
    description: 'قيد أصلي',
    branchId: 'b-11',
    departmentCode: 'FIN',
    currency: 'EGP',
    lines: [
      { id: 'l1', accountId: 'a-cash', description: 'مدين', debit: 1000, credit: 0 },
      { id: 'l2', accountId: 'a-rev', description: 'دائن', debit: 0, credit: 1000 },
    ],
    totalDebit: 1000,
    totalCredit: 1000,
    status: 'posted',
    createdBy: 'accountant_a',
    createdAt: '2026-07-10T10:00:00Z',
  };
  const tDup = validateJournalEntry(
    {
      entryDate: '2026-07-10',
      periodId: 'p-test-open',
      entryType: 'journal',
      documentNumber: 'DOC-DUP-1',
      idempotencyKey: 'bakery_debts:DOC-DUP-1',
      description: 'محاولة تكرار قيد',
      lines: [
        { id: 'l1', accountId: 'a-cash', description: 'مدين', debit: 1000, credit: 0 },
        { id: 'l2', accountId: 'a-rev', description: 'دائن', debit: 0, credit: 1000 },
      ],
    },
    testAccounts,
    [existingEntry],
    testPeriods
  );
  results.push({
    id: 'test-idempotency-dup',
    category: 'منع الازدواج',
    titleAr: 'منع تكرار القيد لنفس المستند المرجعي (Idempotency)',
    expected: 'مرفوض للتكرار',
    actual: !tDup.valid ? 'تم منع التكرار بنجاح' : 'تم القبول بالخطأ!',
    passed: !tDup.valid,
  });

  // Test 8: Segregation of Duties (Creator cannot review/approve own entry)
  const tSod = checkSegregationOfDuties({
    action: 'approve',
    actorName: 'accountant_a',
    actorRole: 'chief_accountant',
    entry: existingEntry,
    enforced: true,
  });
  results.push({
    id: 'test-segregation-duties',
    category: 'الرقابة الداخلية',
    titleAr: 'تطبيق الفصل بين الاختصاصات (منع محرر القيد من اعتماده منفرداً)',
    expected: 'مرفوض لفصل الاختصاصات',
    actual: !tSod.allowed ? 'مرفوض بنجاح' : 'تم السماح بالخطأ!',
    passed: !tSod.allowed,
  });

  // Test 9: Block period close when unposted/pending entries exist
  const draftEntry: JournalEntry = { ...existingEntry, id: 'je-draft', status: 'draft' };
  const tClose = evaluatePeriodClosingReadiness(testPeriods[0], [draftEntry], []);
  results.push({
    id: 'test-period-close-guard',
    category: 'الإقفال المالي',
    titleAr: 'منع إقفال فترة مالية بها قيود معلقة أو غير متوازنة',
    expected: 'مرفوض لوجود قيود معلقة',
    actual: !tClose.canClose ? 'تم منع الإقفال بنجاح' : 'تم السماح بالإقفال بالخطأ!',
    passed: !tClose.canClose,
  });

  const passedCount = results.filter((r) => r.passed).length;
  return {
    allPassed: passedCount === results.length,
    passedCount,
    totalCount: results.length,
    results,
  };
}
