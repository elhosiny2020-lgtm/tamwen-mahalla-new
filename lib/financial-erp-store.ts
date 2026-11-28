'use client';

import type { BakeryRecord, DebtTransactionRecord } from '@/types';
import {
  ChartAccount,
  CostCenter,
  FinancialAuditEntry,
  FinancialErpState,
  FinancialRoleId,
  FiscalPeriod,
  round2,
} from './financial-erp-engine';
import { loadGrainMaintenanceStore } from './grain-maintenance-store';
import { loadHrPersonnelStore } from './hr-personnel-store';
import { loadWarehouseReceipts } from './ration-commodities-store';
import { loadCommercialSettlements } from './internal-trade-store';

export const FINANCIAL_ERP_STORAGE_KEY = 'gharbia_central_financial_erp_v1';

/**
 * Clean institutional initial state with ZERO fabricated balances, ZERO invented Egyptian government
 * account codes, ZERO invented decrees, and ZERO invented tax rates.
 * Administrators & financial specialists either configure/import their official Ministry of Finance
 * chart of accounts and decrees, or load a clearly labeled "Draft Starter Structure (قيد المراجعة)"
 * that requires formal review & activation before posting.
 */
export function createCleanInitialFinancialState(): FinancialErpState {
  const initialPeriods: FiscalPeriod[] = [
    {
      id: 'fp-2026-07',
      fiscalYearCode: '2026/2027',
      periodNumber: 1,
      nameAr: 'يوليو ٢٠٢٦ (الفترة ١)',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      status: 'open',
    },
    {
      id: 'fp-2026-08',
      fiscalYearCode: '2026/2027',
      periodNumber: 2,
      nameAr: 'أغسطس ٢٠٢٦ (الفترة ٢)',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      status: 'open',
    },
    {
      id: 'fp-2026-09',
      fiscalYearCode: '2026/2027',
      periodNumber: 3,
      nameAr: 'سبتمبر ٢٠٢٦ (الفترة ٣)',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      status: 'open',
    },
    {
      id: 'fp-2026-10',
      fiscalYearCode: '2026/2027',
      periodNumber: 4,
      nameAr: 'أكتوبر ٢٠٢٦ (الفترة ٤)',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      status: 'open',
    },
    {
      id: 'fp-2026-11',
      fiscalYearCode: '2026/2027',
      periodNumber: 5,
      nameAr: 'نوفمبر ٢٠٢٦ (الفترة ٥)',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      status: 'open',
    },
    {
      id: 'fp-2026-12',
      fiscalYearCode: '2026/2027',
      periodNumber: 6,
      nameAr: 'ديسمبر ٢٠٢٦ (الفترة ٦)',
      startDate: '2026-12-01',
      endDate: '2026-12-31',
      status: 'open',
    },
  ];

  const initialCostCenters: CostCenter[] = [
    {
      id: 'cc-hq',
      code: 'CC-GH-HQ',
      nameAr: 'ديوان عام مديرية التموين والتجارة الداخلية بالغربية',
      levelType: 'directorate',
      branchId: 'b-11',
      isActive: true,
    },
    {
      id: 'cc-bak',
      code: 'CC-GH-BAK',
      nameAr: 'قطاع الرقابة على المخابز والمديونيات',
      parentId: 'cc-hq',
      levelType: 'department',
      branchId: 'b-11',
      departmentCode: 'BAK',
      isActive: true,
    },
    {
      id: 'cc-comm',
      code: 'CC-GH-COMM',
      nameAr: 'قطاع السلع التموينية والتوريدات',
      parentId: 'cc-hq',
      levelType: 'department',
      branchId: 'b-11',
      departmentCode: 'COMM',
      isActive: true,
    },
    {
      id: 'cc-trade',
      code: 'CC-GH-TRADE',
      nameAr: 'قطاع التجارة الداخلية والرقابة التموينية',
      parentId: 'cc-hq',
      levelType: 'department',
      branchId: 'b-11',
      departmentCode: 'TRADE',
      isActive: true,
    },
    {
      id: 'cc-grain',
      code: 'CC-GH-GRAIN',
      nameAr: 'قطاع صيانة الحبوب والشون والمطاحن والثلاجات',
      parentId: 'cc-hq',
      levelType: 'department',
      branchId: 'b-11',
      departmentCode: 'GRAIN',
      isActive: true,
    },
    {
      id: 'cc-hr',
      code: 'CC-GH-HR',
      nameAr: 'قطاع الموارد البشرية وشؤون العاملين',
      parentId: 'cc-hq',
      levelType: 'department',
      branchId: 'b-11',
      departmentCode: 'HR',
      isActive: true,
    },
  ];

  // Structural 9 top-level classification groups ONLY (no invented Egyptian government posting codes).
  const initialAccounts: ChartAccount[] = [
    { id: 'coa-g-1', code: 'GRP-1', nameAr: 'الأصول', nameEn: 'Assets', level: 1, type: 'assets', normalBalance: 'debit', classification: 'رئيسي تجميعي', isGroup: true, allowPosting: false, allowedEntryTypes: [], status: 'active', validFrom: '2026-07-01' },
    { id: 'coa-g-2', code: 'GRP-2', nameAr: 'الالتزامات', nameEn: 'Liabilities', level: 1, type: 'liabilities', normalBalance: 'credit', classification: 'رئيسي تجميعي', isGroup: true, allowPosting: false, allowedEntryTypes: [], status: 'active', validFrom: '2026-07-01' },
    { id: 'coa-g-3', code: 'GRP-3', nameAr: 'صافي الأصول / حقوق الملكية', nameEn: 'Net Assets / Equity', level: 1, type: 'net_assets', normalBalance: 'credit', classification: 'رئيسي تجميعي', isGroup: true, allowPosting: false, allowedEntryTypes: [], status: 'active', validFrom: '2026-07-01' },
    { id: 'coa-g-4', code: 'GRP-4', nameAr: 'الإيرادات', nameEn: 'Revenues', level: 1, type: 'revenues', normalBalance: 'credit', classification: 'رئيسي تجميعي', isGroup: true, allowPosting: false, allowedEntryTypes: [], status: 'active', validFrom: '2026-07-01' },
    { id: 'coa-g-5', code: 'GRP-5', nameAr: 'المصروفات', nameEn: 'Expenses', level: 1, type: 'expenses', normalBalance: 'debit', classification: 'رئيسي تجميعي', isGroup: true, allowPosting: false, allowedEntryTypes: [], status: 'active', validFrom: '2026-07-01' },
    { id: 'coa-g-6', code: 'GRP-6', nameAr: 'الحسابات الوسيطة', nameEn: 'Clearing Accounts', level: 1, type: 'clearing', normalBalance: 'debit', classification: 'رئيسي تجميعي', isGroup: true, allowPosting: false, allowedEntryTypes: [], status: 'active', validFrom: '2026-07-01' },
    { id: 'coa-g-7', code: 'GRP-7', nameAr: 'حسابات التسوية', nameEn: 'Settlement Accounts', level: 1, type: 'settlement', normalBalance: 'debit', classification: 'رئيسي تجميعي', isGroup: true, allowPosting: false, allowedEntryTypes: [], status: 'active', validFrom: '2026-07-01' },
    { id: 'coa-g-8', code: 'GRP-8', nameAr: 'حسابات العهد والأمانات', nameEn: 'Custody & Deposits', level: 1, type: 'custody_deposits', normalBalance: 'debit', classification: 'رئيسي تجميعي', isGroup: true, allowPosting: false, allowedEntryTypes: [], status: 'active', validFrom: '2026-07-01' },
    { id: 'coa-g-9', code: 'GRP-9', nameAr: 'الحسابات النظامية (خارج الميزانية)', nameEn: 'Off-Balance Sheet Memo', level: 1, type: 'off_balance_memo', normalBalance: 'debit', classification: 'رئيسي تجميعي', isGroup: true, allowPosting: false, allowedEntryTypes: [], status: 'active', validFrom: '2026-07-01' },
  ];

  return {
    version: 1,
    policy: {
      basis: 'accrual',
      inventoryMethod: 'unconfigured',
      depreciationMethod: 'straight_line',
      segregationOfDutiesEnforced: true,
      allowOverBudgetWithAuthorityDoc: false,
      activeFiscalYearId: '2026/2027',
    },
    referenceDocs: [],
    periods: initialPeriods,
    costCenters: initialCostCenters,
    accounts: initialAccounts,
    journalEntries: [],
    budgetAllocations: [],
    budgetCommitments: [],
    budgetExpenses: [],
    treasuryAccounts: [],
    treasuryTransactions: [],
    bankReconciliations: [],
    revenues: [],
    procurements: [],
    debtors: [],
    inventory: [],
    fixedAssets: [],
    taxRules: [],
    auditLogs: [],
  };
}

/**
 * Optional draft starter sub-accounts (clearly prefixed DRAFT- and marked pending_review
 * so financial specialists can replace codes with official Ministry of Finance codes before activating).
 */
export function buildReviewableDraftSubAccounts(): ChartAccount[] {
  const validFrom = '2026-07-01';
  return [
    { id: 'coa-draft-cash', code: 'DRAFT-101', nameAr: 'الخزينة الرئيسية (كود مبدئي للمراجعة)', nameEn: 'Main Cashbox (Draft)', parentId: 'coa-g-1', level: 2, type: 'assets', normalBalance: 'debit', classification: 'أصول متداولة', isGroup: false, allowPosting: true, allowedEntryTypes: [], status: 'pending_review', validFrom, isTemplateDraft: true },
    { id: 'coa-draft-bank', code: 'DRAFT-102', nameAr: 'الحساب البنكي / الخزانة الموحدة (كود مبدئي)', nameEn: 'Bank / TSA Account (Draft)', parentId: 'coa-g-1', level: 2, type: 'assets', normalBalance: 'debit', classification: 'أصول متداولة', isGroup: false, allowPosting: true, allowedEntryTypes: [], status: 'pending_review', validFrom, isTemplateDraft: true },
    { id: 'coa-draft-debtors', code: 'DRAFT-103', nameAr: 'مديونيات أصحاب المخابز والغير (كود مبدئي)', nameEn: 'Debtors Control (Draft)', parentId: 'coa-g-1', level: 2, type: 'assets', normalBalance: 'debit', classification: 'ذمم مدينة', isGroup: false, allowPosting: true, allowedEntryTypes: [], status: 'pending_review', validFrom, isTemplateDraft: true },
    { id: 'coa-draft-inv', code: 'DRAFT-104', nameAr: 'المخزون السلعي والمستلزمات (كود مبدئي)', nameEn: 'Inventory Control (Draft)', parentId: 'coa-g-1', level: 2, type: 'assets', normalBalance: 'debit', classification: 'مخزون', isGroup: false, allowPosting: true, allowedEntryTypes: [], status: 'pending_review', validFrom, isTemplateDraft: true },
    { id: 'coa-draft-fa', code: 'DRAFT-105', nameAr: 'الأصول الثابتة والمعدات (كود مبدئي)', nameEn: 'Fixed Assets (Draft)', parentId: 'coa-g-1', level: 2, type: 'assets', normalBalance: 'debit', classification: 'أصول ثابتة', isGroup: false, allowPosting: true, allowedEntryTypes: [], status: 'pending_review', validFrom, isTemplateDraft: true },
    { id: 'coa-draft-accum', code: 'DRAFT-106', nameAr: 'مجمع إهلاك الأصول الثابتة (كود مبدئي)', nameEn: 'Accumulated Depreciation (Draft)', parentId: 'coa-g-1', level: 2, type: 'assets', normalBalance: 'credit', classification: 'مقابل أصول', isGroup: false, allowPosting: true, allowedEntryTypes: [], status: 'pending_review', validFrom, isTemplateDraft: true },
    { id: 'coa-draft-ap', code: 'DRAFT-201', nameAr: 'مستحقات الموردين والدائنون (كود مبدئي)', nameEn: 'Accounts Payable (Draft)', parentId: 'coa-g-2', level: 2, type: 'liabilities', normalBalance: 'credit', classification: 'التزامات متداولة', isGroup: false, allowPosting: true, allowedEntryTypes: [], status: 'pending_review', validFrom, isTemplateDraft: true },
    { id: 'coa-draft-rev-fine', code: 'DRAFT-401', nameAr: 'إيرادات الغرامات والرسوم المعتمدة (كود مبدئي)', nameEn: 'Approved Fines & Fees Revenue (Draft)', parentId: 'coa-g-4', level: 2, type: 'revenues', normalBalance: 'credit', classification: 'إيرادات تشغيلية', isGroup: false, allowPosting: true, allowedEntryTypes: [], status: 'pending_review', validFrom, isTemplateDraft: true },
    { id: 'coa-draft-exp-ops', code: 'DRAFT-501', nameAr: 'مصروفات التشغيل والصيانة (كود مبدئي)', nameEn: 'Operating & Maintenance Expenses (Draft)', parentId: 'coa-g-5', level: 2, type: 'expenses', normalBalance: 'debit', classification: 'مصروفات جارية', isGroup: false, allowPosting: true, allowedEntryTypes: [], status: 'pending_review', validFrom, isTemplateDraft: true },
    { id: 'coa-draft-exp-hr', code: 'DRAFT-502', nameAr: 'الأجور والمستحقات والبدلات (كود مبدئي)', nameEn: 'Payroll & Allowances (Draft)', parentId: 'coa-g-5', level: 2, type: 'expenses', normalBalance: 'debit', classification: 'مصروفات عاملين', isGroup: false, allowPosting: true, allowedEntryTypes: [], status: 'pending_review', validFrom, isTemplateDraft: true },
    { id: 'coa-draft-exp-dep', code: 'DRAFT-503', nameAr: 'مصروف الإهلاك الدوري (كود مبدئي)', nameEn: 'Depreciation Expense (Draft)', parentId: 'coa-g-5', level: 2, type: 'expenses', normalBalance: 'debit', classification: 'إهلاكات', isGroup: false, allowPosting: true, allowedEntryTypes: [], status: 'pending_review', validFrom, isTemplateDraft: true },
    { id: 'coa-draft-custody', code: 'DRAFT-801', nameAr: 'العهد المؤقتة والمستديمة والأمانات (كود مبدئي)', nameEn: 'Custody & Deposits (Draft)', parentId: 'coa-g-8', level: 2, type: 'custody_deposits', normalBalance: 'debit', classification: 'عهد وأمانات', isGroup: false, allowPosting: true, allowedEntryTypes: [], status: 'pending_review', validFrom, isTemplateDraft: true },
  ];
}

export function loadFinancialErpState(): FinancialErpState {
  if (typeof window === 'undefined') return createCleanInitialFinancialState();
  try {
    const raw = localStorage.getItem(FINANCIAL_ERP_STORAGE_KEY);
    if (!raw) return createCleanInitialFinancialState();
    const parsed = JSON.parse(raw) as Partial<FinancialErpState>;
    const base = createCleanInitialFinancialState();
    return {
      ...base,
      ...parsed,
      policy: { ...base.policy, ...(parsed.policy || {}) },
      accounts: Array.isArray(parsed.accounts) && parsed.accounts.length > 0 ? parsed.accounts : base.accounts,
      periods: Array.isArray(parsed.periods) && parsed.periods.length > 0 ? parsed.periods : base.periods,
      costCenters: Array.isArray(parsed.costCenters) && parsed.costCenters.length > 0 ? parsed.costCenters : base.costCenters,
    };
  } catch {
    return createCleanInitialFinancialState();
  }
}

export function saveFinancialErpState(state: FinancialErpState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FINANCIAL_ERP_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
}

export function appendFinancialAudit(
  state: FinancialErpState,
  entry: Omit<FinancialAuditEntry, 'id' | 'timestamp'>
): FinancialErpState {
  const newLog: FinancialAuditEntry = {
    ...entry,
    id: `faud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  return {
    ...state,
    auditLogs: [newLog, ...state.auditLogs].slice(0, 1000),
  };
}

/**
 * Axis 10 & 22: Read-only Cross-Department Live Integration Bridge
 * Reads real operational records from the existing Directorate modules so financial officers
 * can inspect source documents and stage approved financial movements into Draft Journal Entries
 * using idempotency keys (preventing duplicate posting across modules).
 */
export interface OperationalIntegrationItem {
  idempotencyKey: string;
  sourceModule:
    | 'bakeries'
    | 'bakery_debts'
    | 'commodities'
    | 'internal_trade'
    | 'grain_maintenance'
    | 'hr_payroll';
  sourceModuleAr: string;
  sourceRefId: string;
  documentNumber: string;
  branchId: string;
  departmentCode: string;
  titleAr: string;
  counterparty: string;
  amountEgp: number;
  date: string;
  recommendedTreatmentAr: string;
  alreadyLinked: boolean;
}

export function collectOperationalIntegrationItems(params: {
  bakeries: BakeryRecord[];
  debtTransactions: DebtTransactionRecord[];
  existingKeys: Set<string>;
}): OperationalIntegrationItem[] {
  const items: OperationalIntegrationItem[] = [];

  // 1. Bakery Debts & Collections (Axis 10.2)
  const bakeryBranchMap = new Map(params.bakeries.map((b) => [b.id, b.branchId]));
  for (const tx of params.debtTransactions.slice(0, 40)) {
    const key = `bakery_debts:${tx.id}`;
    items.push({
      idempotencyKey: key,
      sourceModule: 'bakery_debts',
      sourceModuleAr: 'مديونيات أصحاب المخابز',
      sourceRefId: tx.id,
      documentNumber: tx.receiptNumber || tx.id,
      branchId: bakeryBranchMap.get(tx.bakeryId) || 'b-03',
      departmentCode: 'DEBTS',
      titleAr:
        tx.notes?.trim() ||
        `${tx.category}: ${tx.direction === 'debit' ? 'إثبات مديونية / غرامة مخبز' : 'تحصيل سداد مديونية مخبز'}`,
      counterparty: tx.bakeryName || tx.bakeryId,
      amountEgp: round2(tx.amountEgp || 0),
      date: tx.date || new Date().toISOString().slice(0, 10),
      recommendedTreatmentAr:
        tx.direction === 'debit'
          ? 'إثبات مديونية بالأستاذ المساعد (مدين: مديونيات المخابز / دائن: إيرادات الغرامات أو التسوية بعد المراجعة)'
          : 'إثبات تحصيل فعلي (مدين: الخزينة أو البنك / دائن: مديونيات المخابز)',
      alreadyLinked: params.existingKeys.has(key),
    });
  }

  // 2. Bakeries Insurance Amounts (Axis 10.1 — informational until accounting treatment approved)
  for (const bak of params.bakeries.filter((b) => !b.isArchived && (b.insuranceAmountEgp || 0) > 0).slice(0, 20)) {
    const key = `bakeries:ins:${bak.id}`;
    items.push({
      idempotencyKey: key,
      sourceModule: 'bakeries',
      sourceModuleAr: 'إدارة المخابز (تأمينات)',
      sourceRefId: bak.id,
      documentNumber: bak.bakeryNumber || bak.id,
      branchId: bak.branchId || 'b-03',
      departmentCode: 'BAK',
      titleAr: `تأمين حصة المخبز رقم ${bak.bakeryNumber} (${bak.insuranceStatus || 'تأمين'})`,
      counterparty: `${bak.name} — ${bak.ownerName}`,
      amountEgp: round2(bak.insuranceAmountEgp || 0),
      date: bak.startDate || new Date().toISOString().slice(0, 10),
      recommendedTreatmentAr: 'تُعالج كأمانات / تأمينات لدى الغير بعد مراجعة المستند (لا تُعد إيراداً تلقائياً)',
      alreadyLinked: params.existingKeys.has(key),
    });
  }

  // 3. Supply Commodities / Ration Store (Axis 10.3)
  try {
    const receipts = loadWarehouseReceipts();
    for (const rec of receipts.slice(0, 15)) {
      const val = round2(rec.totalValueEgp || 0);
      if (val <= 0) continue;
      const key = `commodities:rec:${rec.id}`;
      items.push({
        idempotencyKey: key,
        sourceModule: 'commodities',
        sourceModuleAr: 'قسم السلع التموينية',
        sourceRefId: rec.id,
        documentNumber: rec.receiptNumber || rec.id,
        branchId: 'b-11',
        departmentCode: 'COMM',
        titleAr: `إذن استلام مخزني: ${rec.commodityName} (${rec.quantityReceived} ${rec.unit})`,
        counterparty: `${rec.supplierName} — ${rec.warehouseName}`,
        amountEgp: val,
        date: rec.receiptDate || new Date().toISOString().slice(0, 10),
        recommendedTreatmentAr: 'يُحدد القيد المخزني/المالي بعد مراجعة فاتورة التوريد وسعر التكلفة المعتمد',
        alreadyLinked: params.existingKeys.has(key),
      });
    }
  } catch {
    // ignore if unavailable
  }

  // 4. Internal Trade Violations & Settlements (Axis 10.4)
  try {
    const settlements = loadCommercialSettlements();
    for (const st of settlements.slice(0, 15)) {
      const val = round2(st.approvedSettlementAmountEgp || st.dueAmountEgp || 0);
      const key = `internal_trade:set:${st.id}`;
      items.push({
        idempotencyKey: key,
        sourceModule: 'internal_trade',
        sourceModuleAr: 'قسم التجارة الداخلية',
        sourceRefId: st.id,
        documentNumber: st.settlementRequestNumber || st.reportNumber || st.id,
        branchId: 'b-11',
        departmentCode: 'TRADE',
        titleAr: `تصالح/محضر تجارة داخلية: ${st.violationTypeSummary} (${st.status})`,
        counterparty: `${st.establishmentName} — ${st.traderName}`,
        amountEgp: val,
        date: st.requestDate || new Date().toISOString().slice(0, 10),
        recommendedTreatmentAr: 'يُرحل لحساب الغرامات/التصالحات فقط بعد صدور قرار قانوني وتصرف نهائي',
        alreadyLinked: params.existingKeys.has(key),
      });
    }
  } catch {
    // ignore
  }

  // 5. Grain Maintenance (Silos, Mills, Cold Storage — Axis 10.5)
  try {
    const grain = loadGrainMaintenanceStore();
    for (const order of (grain.maintenanceOrders || []).slice(0, 10)) {
      const val = round2(order.totalMaintenanceCostEgp || 0);
      const key = `grain_maintenance:ord:${order.id}`;
      items.push({
        idempotencyKey: key,
        sourceModule: 'grain_maintenance',
        sourceModuleAr: 'صيانة الحبوب (الشون والمطاحن)',
        sourceRefId: order.id,
        documentNumber: order.orderNumber || order.id,
        branchId: 'b-11',
        departmentCode: 'GRAIN',
        titleAr: `${order.maintenanceType}: ${order.facilityName} — ${order.assetName}`,
        counterparty: order.executingEntity,
        amountEgp: val,
        date: order.faultReportDate || new Date().toISOString().slice(0, 10),
        recommendedTreatmentAr: order.capitalizedToAsset
          ? 'عمرة رأسمالية مقترحة للرسملة على الأصل الثابت بعد اعتماد المراقب المالي'
          : 'مصروف صيانة تشغيلية يُرحل بعد مراجعة مستندات الصرف وأمر الشغل',
        alreadyLinked: params.existingKeys.has(key),
      });
    }
    for (const rec of (grain.receipts || []).slice(0, 8)) {
      const key = `grain_maintenance:rec:${rec.id}`;
      items.push({
        idempotencyKey: key,
        sourceModule: 'grain_maintenance',
        sourceModuleAr: 'صيانة الحبوب (توريد أقماح)',
        sourceRefId: rec.id,
        documentNumber: rec.receiptNumber || rec.id,
        branchId: 'b-11',
        departmentCode: 'GRAIN',
        titleAr: `استلام أقماح: ${rec.actualNetWeightTons} طن (${rec.wheatOrigin} — ${rec.cropSeason})`,
        counterparty: `${rec.supplierName} (${rec.supplierType})`,
        amountEgp: 0,
        date: rec.receiptDate || new Date().toISOString().slice(0, 10),
        recommendedTreatmentAr: 'يُحدد السعر المالي للطن وفق قرار التوريد الرسمي للموسم بعد الفرز والوزن',
        alreadyLinked: params.existingKeys.has(key),
      });
    }
  } catch {
    // ignore
  }

  // 6. HR Personnel Payroll & Benefits Summary (Axis 10.6 — informational summary, no automatic disbursement)
  try {
    const hr = loadHrPersonnelStore();
    if ((hr.employees || []).length > 0) {
      const key = `hr_payroll:summary:${new Date().toISOString().slice(0, 7)}`;
      items.push({
        idempotencyKey: key,
        sourceModule: 'hr_payroll',
        sourceModuleAr: 'الموارد البشرية',
        sourceRefId: `HR-${new Date().toISOString().slice(0, 7)}`,
        documentNumber: `PAY-${new Date().toISOString().slice(0, 7)}`,
        branchId: 'b-11',
        departmentCode: 'HR',
        titleAr: `بيان قوة العاملين المسجلين (${hr.employees.length} موظف) — بانتظار كشف المرتبات الرسمي`,
        counterparty: 'العاملون بمديرية التموين بالغربية',
        amountEgp: 0,
        date: new Date().toISOString().slice(0, 10),
        recommendedTreatmentAr: 'لا يُصرف راتب أو استقطاع تلقائياً إلا بعد إرفاق كشف المرتبات الرسمي واعتماد المراقب المالي',
        alreadyLinked: params.existingKeys.has(key),
      });
    }
  } catch {
    // ignore
  }

  return items;
}

/**
 * Safe CSV cell sanitizer preventing spreadsheet formula injection (=, +, -, @)
 */
export function sanitizeCsvCell(val: string | number | undefined | null): string {
  const str = String(val ?? '');
  const guarded = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${guarded.replace(/"/g, '""')}"`;
}

export function exportRowsToExcelCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const bom = '\uFEFF';
  const lines = [
    headers.map(sanitizeCsvCell).join(','),
    ...rows.map((r) => r.map(sanitizeCsvCell).join(',')),
  ];
  const blob = new Blob([bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function getFinancialRoleForUser(systemRole: string): FinancialRoleId {
  switch (systemRole) {
    case 'super_admin':
    case 'admin':
      return 'system_admin';
    case 'directorate_manager':
      return 'financial_director';
    case 'supply_admin_manager':
      return 'supply_admin_manager';
    case 'department_manager':
      return 'chief_accountant';
    case 'reviewer':
      return 'financial_reviewer';
    case 'viewer':
      return 'viewer_only';
    default:
      return 'accountant';
  }
}

/**
 * Opt-in interactive demonstration dataset for previewing live budget allocations,
 * commitments, actual expenses, available balance, and balanced double-entry journals.
 * Clearly flagged as demo/template data and reversible back to clean zero state in one click.
 */
export function buildInteractiveFinancialDemoState(actorName: string): FinancialErpState {
  const base = createCleanInitialFinancialState();
  const demoSubAccounts = buildReviewableDraftSubAccounts().map((a) => ({
    ...a,
    status: 'active' as const,
  }));
  const allAccounts = [...base.accounts, ...demoSubAccounts];
  const nowIso = new Date().toISOString();

  const bankAcc = allAccounts.find((a) => a.code === '1012') || demoSubAccounts[0];
  const revAcc = allAccounts.find((a) => a.code === '4011') || demoSubAccounts[0];
  const expAcc = allAccounts.find((a) => a.code === '5011') || demoSubAccounts[0];

  const allocations = [
    {
      id: 'demo-alloc-1',
      fiscalYearCode: '2026/2027',
      code: 'BUD-DEMO-01',
      titleAr: 'اعتماد صيانة وتطوير مقرات الإدارات والرقابة (بيانات معاينة تجريبية)',
      accountId: expAcc.id,
      branchId: 'b-11',
      departmentCode: 'FIN',
      costCenterId: 'cc-hq',
      estimatedAmount: 1_500_000,
      originalApprovedAmount: 1_500_000,
      additionsTransfersIn: 150_000,
      reductionsTransfersOut: 50_000,
      status: 'approved' as const,
      authorityDocRef: 'DEMO-ALLOC-2026-01',
    },
    {
      id: 'demo-alloc-2',
      fiscalYearCode: '2026/2027',
      code: 'BUD-DEMO-02',
      titleAr: 'اعتماد مستلزمات التفتيش والموازين والمعايرة (بيانات معاينة تجريبية)',
      accountId: expAcc.id,
      branchId: 'b-03',
      departmentCode: 'BAK',
      costCenterId: 'cc-mahalla',
      estimatedAmount: 900_000,
      originalApprovedAmount: 900_000,
      additionsTransfersIn: 0,
      reductionsTransfersOut: 0,
      status: 'approved' as const,
      authorityDocRef: 'DEMO-ALLOC-2026-02',
    },
    {
      id: 'demo-alloc-3',
      fiscalYearCode: '2026/2027',
      code: 'BUD-DEMO-03',
      titleAr: 'اعتماد التشغيل والصيانة الهندسية للصوامع والشون (بيانات معاينة تجريبية)',
      accountId: expAcc.id,
      branchId: 'b-01',
      departmentCode: 'GRAIN',
      costCenterId: 'cc-tanta1',
      estimatedAmount: 1_200_000,
      originalApprovedAmount: 1_200_000,
      additionsTransfersIn: 100_000,
      reductionsTransfersOut: 0,
      status: 'approved' as const,
      authorityDocRef: 'DEMO-ALLOC-2026-03',
    },
  ];

  const commitments = [
    {
      id: 'demo-comm-1',
      allocationId: 'demo-alloc-1',
      commitmentNumber: 'CMT-DEMO-001',
      description: 'ارتباط توريد أجهزة حاسب وطابعات للمكاتب التموينية (تجريبي)',
      committedAmount: 350_000,
      convertedToExpenseAmount: 150_000,
      status: 'partially_expensed' as const,
      createdBy: actorName,
      approvedBy: 'المدير المالي (معاينة)',
      createdAt: nowIso,
    },
    {
      id: 'demo-comm-2',
      allocationId: 'demo-alloc-3',
      commitmentNumber: 'CMT-DEMO-002',
      description: 'ارتباط معايرة موازين البسكول بالشون (تجريبي)',
      committedAmount: 220_000,
      convertedToExpenseAmount: 0,
      status: 'reserved' as const,
      createdBy: actorName,
      approvedBy: 'المدير المالي (معاينة)',
      createdAt: nowIso,
    },
  ];

  const expenses = [
    {
      id: 'demo-exp-1',
      allocationId: 'demo-alloc-1',
      commitmentId: 'demo-comm-1',
      documentNumber: 'EXP-DEMO-101',
      description: 'صرف الدفعة الأولى من ارتباط الأجهزة (دون خصم مزدوج)',
      amount: 150_000,
      expenseDate: '2026-07-12',
      status: 'posted' as const,
      journalEntryId: 'demo-je-2',
    },
    {
      id: 'demo-exp-2',
      allocationId: 'demo-alloc-2',
      documentNumber: 'EXP-DEMO-102',
      description: 'مصروفات مباشرة لحملات التفتيش الميداني (تجريبي)',
      amount: 285_000,
      expenseDate: '2026-07-18',
      status: 'posted' as const,
      journalEntryId: 'demo-je-2',
    },
    {
      id: 'demo-exp-3',
      allocationId: 'demo-alloc-3',
      documentNumber: 'EXP-DEMO-103',
      description: 'صيانة دورية لمعدات التخزين والشون (تجريبي)',
      amount: 410_000,
      expenseDate: '2026-08-05',
      status: 'posted' as const,
      journalEntryId: 'demo-je-3',
    },
  ];

  const journalEntries = [
    {
      id: 'demo-je-1',
      entryNumber: 'JV-DEMO-0001',
      entryDate: '2026-07-05',
      periodId: 'fp-2026-07',
      entryType: 'collection' as const,
      sourceModule: 'treasury' as const,
      documentNumber: 'REV-DEMO-001',
      idempotencyKey: 'demo:rev:001',
      description: 'إثبات تحصيل إيرادات ورسوم تموينية (بيانات تجريبية للمعاينة)',
      branchId: 'b-11',
      departmentCode: 'FIN',
      costCenterId: 'cc-hq',
      currency: 'EGP' as const,
      lines: [
        { id: 'djl-1', accountId: bankAcc.id, costCenterId: 'cc-hq', description: 'إيداع بنكي', debit: 1_120_000, credit: 0 },
        { id: 'djl-2', accountId: revAcc.id, costCenterId: 'cc-hq', description: 'إيرادات محصلة', debit: 0, credit: 1_120_000 },
      ],
      totalDebit: 1_120_000,
      totalCredit: 1_120_000,
      status: 'posted' as const,
      createdBy: actorName,
      reviewedBy: 'المراجع المالي (معاينة)',
      approvedBy: 'المدير المالي (معاينة)',
      postedBy: 'رئيس الحسابات (معاينة)',
      postedAt: nowIso,
      createdAt: nowIso,
    },
    {
      id: 'demo-je-2',
      entryNumber: 'JV-DEMO-0002',
      entryDate: '2026-07-18',
      periodId: 'fp-2026-07',
      entryType: 'disbursement' as const,
      sourceModule: 'manual' as const,
      documentNumber: 'EXP-DEMO-102',
      idempotencyKey: 'demo:exp:102',
      description: 'إثبات صرف مصروفات الفترة الأولى (بيانات تجريبية للمعاينة)',
      branchId: 'b-03',
      departmentCode: 'BAK',
      costCenterId: 'cc-mahalla',
      currency: 'EGP' as const,
      lines: [
        { id: 'djl-3', accountId: expAcc.id, costCenterId: 'cc-mahalla', description: 'مصروفات تشغيلية ومستلزمات', debit: 435_000, credit: 0 },
        { id: 'djl-4', accountId: bankAcc.id, costCenterId: 'cc-mahalla', description: 'سداد عبر الحساب البنكي', debit: 0, credit: 435_000 },
      ],
      totalDebit: 435_000,
      totalCredit: 435_000,
      status: 'posted' as const,
      createdBy: actorName,
      reviewedBy: 'المراجع المالي (معاينة)',
      approvedBy: 'المدير المالي (معاينة)',
      postedBy: 'رئيس الحسابات (معاينة)',
      postedAt: nowIso,
      createdAt: nowIso,
    },
    {
      id: 'demo-je-3',
      entryNumber: 'JV-DEMO-0003',
      entryDate: '2026-08-05',
      periodId: 'fp-2026-08',
      entryType: 'disbursement' as const,
      sourceModule: 'grain_maintenance' as const,
      documentNumber: 'EXP-DEMO-103',
      idempotencyKey: 'demo:exp:103',
      description: 'إثبات مصروفات الصيانة الهندسية للشون — الفترة الثانية (تجريبي)',
      branchId: 'b-01',
      departmentCode: 'GRAIN',
      costCenterId: 'cc-tanta1',
      currency: 'EGP' as const,
      lines: [
        { id: 'djl-5', accountId: expAcc.id, costCenterId: 'cc-tanta1', description: 'صيانة دورية للشون', debit: 410_000, credit: 0 },
        { id: 'djl-6', accountId: bankAcc.id, costCenterId: 'cc-tanta1', description: 'سداد بأمر دفع إلكتروني', debit: 0, credit: 410_000 },
      ],
      totalDebit: 410_000,
      totalCredit: 410_000,
      status: 'posted' as const,
      createdBy: actorName,
      reviewedBy: 'المراجع المالي (معاينة)',
      approvedBy: 'المدير المالي (معاينة)',
      postedBy: 'رئيس الحسابات (معاينة)',
      postedAt: nowIso,
      createdAt: nowIso,
    },
  ];

  return appendFinancialAudit(
    {
      ...base,
      accounts: allAccounts,
      budgetAllocations: allocations,
      budgetCommitments: commitments,
      budgetExpenses: expenses,
      journalEntries,
      revenues: [
        {
          id: 'demo-rev-1',
          revenueType: 'رسوم وتراخيص تموينية (تجريبي)',
          accrualBasis: 'تحصيل فوري',
          documentNumber: 'REV-DEMO-001',
          payerName: 'تحصيلات الإدارات التموينية (بيانات معاينة)',
          branchId: 'b-11',
          departmentCode: 'FIN',
          accountId: revAcc.id,
          amount: 1_120_000,
          dueDate: '2026-07-05',
          collectionDate: '2026-07-05',
          collectionMethod: 'تحويل بنكي',
          receiptNumber: 'RCPT-DEMO-01',
          status: 'collected',
          journalEntryId: 'demo-je-1',
        },
      ],
    },
    {
      actorName,
      actorRole: 'system_admin',
      action: 'تحميل بيانات تجريبية أولية لمعاينة تفاعل لوحة التحكم المالية',
      entityType: 'financial_dashboard_demo',
      entityId: 'demo-seed-v1',
      afterSummary: '٣ بنود اعتمادات (٣٫٨ مليون ج.م) + ارتباطان + ٣ مصروفات فعلية + ٣ قيود مزدوجة متوازنة',
    }
  );
}

