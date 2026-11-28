'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  Link2,
  Printer,
  Scale,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import type { Branch } from '@/types';
import {
  computeAssetBookValue,
  computeBudgetMetrics,
  computeDebtorRemainingBalance,
  computeInventoryMetrics,
  computeStraightLineDepreciation,
  computeTrialBalance,
  ENTRY_STATUS_LABELS,
  FINANCIAL_ROLES,
  FinancialErpState,
  FinancialRoleId,
  FixedAssetRecord,
  InventoryItemRecord,
  JournalEntry,
  LegalReferenceDoc,
  ProcurementCycleRecord,
  RevenueRecord,
  round2,
  runMandatoryAccountingTests,
  TaxRuleConfig,
} from '@/lib/financial-erp-engine';
import {
  appendFinancialAudit,
  exportRowsToExcelCsv,
  OperationalIntegrationItem,
} from '@/lib/financial-erp-store';
import { formatArabicNumber, formatDateArabic, toArabicNumerals } from '@/lib/utils';

export interface OpsAndGovProps {
  activeSubTab: 'operations' | 'assets_inventory' | 'governance' | 'reports';
  state: FinancialErpState;
  onUpdateState: (next: FinancialErpState) => void;
  branches: Branch[];
  integrationItems: OperationalIntegrationItem[];
  actorName: string;
  actorRole: FinancialRoleId;
  branchFilter: string;
  periodFilter: string;
  onNotify: (msg: string) => void;
}

function makeRuntimeStamp(): string {
  return String(Date.now());
}

const PROCUREMENT_STAGES: { id: ProcurementCycleRecord['stage']; label: string }[] = [
  { id: 'purchase_request', label: '١. طلب شراء' },
  { id: 'budget_checked', label: '٢. مراجعة الاعتماد' },
  { id: 'approved', label: '٣. الموافقة' },
  { id: 'po_issued', label: '٤. أمر شراء/تعاقد' },
  { id: 'received_inspected', label: '٥. استلام وفحص' },
  { id: 'invoiced', label: '٦. تسجيل الفاتورة' },
  { id: 'accrued', label: '٧. إثبات الاستحقاق' },
  { id: 'payment_ordered', label: '٨. أمر الدفع' },
  { id: 'paid', label: '٩. السداد' },
  { id: 'posted', label: '١٠. القيد المرحّل' },
];

const OFFICIAL_REPORTS_CATALOG: { id: string; num: number; titleAr: string; category: string }[] = [
  { id: 'general_journal', num: 1, titleAr: 'دفتر اليومية العامة', category: 'الدفاتر الأساسية' },
  { id: 'general_ledger', num: 2, titleAr: 'دفتر الأستاذ العام', category: 'الدفاتر الأساسية' },
  { id: 'subsidiary_ledger', num: 3, titleAr: 'الأستاذ المساعد (المدينون)', category: 'الدفاتر الأساسية' },
  { id: 'trial_balance', num: 4, titleAr: 'ميزان المراجعة', category: 'القوائم والختامي' },
  { id: 'financial_position', num: 5, titleAr: 'قائمة المركز المالي', category: 'القوائم والختامي' },
  { id: 'revenue_expense', num: 6, titleAr: 'قائمة الإيرادات والمصروفات والأداء المالي', category: 'القوائم والختامي' },
  { id: 'cash_flow', num: 7, titleAr: 'تقرير التدفقات النقدية', category: 'القوائم والختامي' },
  { id: 'budget_execution', num: 8, titleAr: 'تقرير تنفيذ الموازنة', category: 'الموازنة' },
  { id: 'appropriations_available', num: 9, titleAr: 'تقرير الاعتمادات والمتاح للصرف', category: 'الموازنة' },
  { id: 'commitments', num: 10, titleAr: 'تقرير الالتزامات المحجوزة', category: 'الموازنة' },
  { id: 'expenses_report', num: 11, titleAr: 'تقرير المصروفات الفعلية', category: 'العمليات' },
  { id: 'revenues_report', num: 12, titleAr: 'تقرير الإيرادات والتحصيلات', category: 'العمليات' },
  { id: 'treasury_report', num: 13, titleAr: 'تقرير الخزينة والعهد النقدية', category: 'النقدية والبنوك' },
  { id: 'banks_report', num: 14, titleAr: 'تقرير الحسابات البنكية', category: 'النقدية والبنوك' },
  { id: 'bank_reconciliation', num: 15, titleAr: 'تقرير المطابقة البنكية والفروق', category: 'النقدية والبنوك' },
  { id: 'debtors_report', num: 16, titleAr: 'تقرير المديونيات والتحصيلات', category: 'المديونيات والموردين' },
  { id: 'vendors_report', num: 17, titleAr: 'تقرير الموردين ودورة المشتريات', category: 'المديونيات والموردين' },
  { id: 'inventory_report', num: 18, titleAr: 'تقرير المخزون والتكلفة', category: 'المخازن والأصول' },
  { id: 'fixed_assets', num: 19, titleAr: 'تقرير سجل الأصول الثابتة', category: 'المخازن والأصول' },
  { id: 'depreciation_report', num: 20, titleAr: 'تقرير الإهلاكات الدورية والمجمع', category: 'المخازن والأصول' },
  { id: 'cost_centers', num: 21, titleAr: 'تقرير تحليل مراكز التكلفة', category: 'التحليل المالي' },
  { id: 'settlements', num: 22, titleAr: 'تقرير التسويات المحاسبية', category: 'التحليل المالي' },
  { id: 'custody_report', num: 23, titleAr: 'تقرير العهد والأمانات', category: 'التحليل المالي' },
  { id: 'pending_entries', num: 24, titleAr: 'تقرير القيود المعلقة', category: 'الرقابة والتدقيق' },
  { id: 'variances', num: 25, titleAr: 'تقرير الانحرافات المالية عن الموازنة', category: 'الرقابة والتدقيق' },
  { id: 'account_movement', num: 26, titleAr: 'تقرير حركة الحساب التفصيلية', category: 'الرقابة والتدقيق' },
  { id: 'unapproved_ops', num: 27, titleAr: 'تقرير العمليات غير المعتمدة', category: 'الرقابة والتدقيق' },
  { id: 'audit_trail', num: 28, titleAr: 'تقرير سجل المراجعة والتدقيق (Audit Trail)', category: 'الرقابة والتدقيق' },
];

export default function FinancialOpsAndGovernancePanels({
  activeSubTab,
  state,
  onUpdateState,
  branches,
  integrationItems,
  actorName,
  actorRole,
  branchFilter,
  periodFilter,
  onNotify,
}: OpsAndGovProps) {
  // === Revenues, Procurement & Debtors State ===
  const [revType, setRevType] = useState('');
  const [revBasis, setRevBasis] = useState('');
  const [revDoc, setRevDoc] = useState('');
  const [revPayer, setRevPayer] = useState('');
  const [revAmt, setRevAmt] = useState('');

  const [procVendor, setProcVendor] = useState('');
  const [procInvNo, setProcInvNo] = useState('');
  const [procPrRef, setProcPrRef] = useState('');
  const [procCategory, setProcCategory] = useState('مستلزمات تشغيل');
  const [procAmt, setProcAmt] = useState('');

  const [debName, setDebName] = useState('');
  const [debCode, setDebCode] = useState('');
  const [debType, setDebType] = useState('مديونية مخبز / غرامة تموينية');
  const [debOpening, setDebOpening] = useState('');
  const [debNew, setDebNew] = useState('');
  const [debCollected, setDebCollected] = useState('');
  const [debCreditSettle, setDebCreditSettle] = useState('');

  // === Inventory & Fixed Assets State ===
  const [invCode, setInvCode] = useState('');
  const [invName, setInvName] = useState('');
  const [invUnit, setInvUnit] = useState('وحدة');
  const [invOpening, setInvOpening] = useState('');
  const [invIn, setInvIn] = useState('');
  const [invOut, setInvOut] = useState('');
  const [invCost, setInvCost] = useState('');

  const [faCode, setFaCode] = useState('');
  const [faName, setFaName] = useState('');
  const [faCategory, setFaCategory] = useState<FixedAssetRecord['category']>('equipment');
  const [faLocation, setFaLocation] = useState('ديوان عام المديرية');
  const [faDoc, setFaDoc] = useState('');
  const [faCost, setFaCost] = useState('');
  const [faSalvage, setFaSalvage] = useState('0');
  const [faLife, setFaLife] = useState('');
  const [faCustodian, setFaCustodian] = useState('');

  // === Governance, Legal Refs, Tax Rules & Tests State ===
  const [refNum, setRefNum] = useState('');
  const [refTitle, setRefTitle] = useState('');
  const [refAuthority, setRefAuthority] = useState('وزارة المالية / وزارة التموين');
  const [refCategory, setRefCategory] = useState<LegalReferenceDoc['category']>('mof_circular');
  const [refEffective, setRefEffective] = useState('2026-07-01');
  const [refScope, setRefScope] = useState('');
  const [refImpact, setRefImpact] = useState('');

  const [taxCode, setTaxCode] = useState('');
  const [taxName, setTaxName] = useState('');
  const [taxType, setTaxType] = useState<TaxRuleConfig['taxType']>('withholding');
  const [taxRate, setTaxRate] = useState('');
  const [taxRefId, setTaxRefId] = useState('');

  const [testSuiteOutput, setTestSuiteOutput] = useState<ReturnType<typeof runMandatoryAccountingTests> | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string>('trial_balance');
  const [restoreJsonText, setRestoreJsonText] = useState('');

  const postingAccounts = useMemo(
    () => state.accounts.filter((a) => !a.isGroup && a.allowPosting && a.status === 'active'),
    [state.accounts]
  );

  // ==================== HANDLERS: OPERATIONS & INTEGRATION ====================
  const handleAddRevenue = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(revAmt);
    if (!revType.trim() || !revDoc.trim() || !revPayer.trim() || !Number.isFinite(amt) || amt <= 0) {
      onNotify('يرجى إدخال نوع الإيراد والمستند والملزم بالسداد والقيمة.');
      return;
    }
    const rev: RevenueRecord = {
      id: `rev-${Date.now()}`,
      revenueType: revType.trim(),
      accrualBasis: revBasis.trim() || 'استحقاق بموجب سند رسمي',
      documentNumber: revDoc.trim(),
      payerName: revPayer.trim(),
      branchId: branchFilter === 'all' ? 'b-11' : branchFilter,
      departmentCode: 'FIN',
      accountId: postingAccounts[0]?.id || 'coa-g-4',
      amount: round2(amt),
      dueDate: new Date().toISOString().slice(0, 10),
      status: 'accrued',
    };
    onUpdateState(
      appendFinancialAudit(
        { ...state, revenues: [rev, ...state.revenues] },
        {
          actorName,
          actorRole,
          action: 'إثبات إيراد مستحق (لا يُعد محصلاً قبل السند الفعلي)',
          entityType: 'revenue_transactions',
          entityId: rev.id,
          documentNumber: rev.documentNumber,
          afterSummary: `${rev.payerName}: ${rev.amount} ج.م`,
        }
      )
    );
    setRevType('');
    setRevDoc('');
    setRevPayer('');
    setRevAmt('');
    onNotify('تم تسجيل الإيراد المستحق (بانتظار إثبات التحصيل الفعلي برقم إيصال رسمي).');
  };

  const handleMarkRevenueCollected = (revId: string) => {
    const receiptNo = `RCPT-${makeRuntimeStamp().slice(-6)}`;
    const updated = state.revenues.map((r) =>
      r.id === revId
        ? {
            ...r,
            status: 'collected' as const,
            collectionDate: new Date().toISOString().slice(0, 10),
            collectionMethod: 'إيصال تحصيل رسمي',
            receiptNumber: receiptNo,
          }
        : r
    );
    onUpdateState(
      appendFinancialAudit(
        { ...state, revenues: updated },
        {
          actorName,
          actorRole,
          action: 'إثبات التحصيل الفعلي لإيراد',
          entityType: 'revenue_transactions',
          entityId: revId,
          documentNumber: receiptNo,
          afterSummary: `إيصال رقم ${receiptNo}`,
        }
      )
    );
    onNotify(`تم إثبات التحصيل الفعلي للإيراد بإيصال رقم (${receiptNo}).`);
  };

  const handleAddProcurement = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(procAmt);
    if (!procVendor.trim() || !procInvNo.trim() || !procPrRef.trim() || !Number.isFinite(amt) || amt <= 0) {
      onNotify('يرجى استكمال اسم المورد ورقم الفاتورة وطلب الشراء والقيمة.');
      return;
    }
    // Duplicate invoice guard (Axis 8)
    const dup = state.procurements.find(
      (p) =>
        p.vendorName.trim().toLowerCase() === procVendor.trim().toLowerCase() &&
        p.invoiceNumber.trim().toLowerCase() === procInvNo.trim().toLowerCase()
    );
    if (dup) {
      onNotify(`مرفوض: الفاتورة رقم (${procInvNo}) مسجلة مسبقاً لنفس المورد — يمنع تكرار الفواتير.`);
      return;
    }
    const rec: ProcurementCycleRecord = {
      id: `proc-${Date.now()}`,
      vendorName: procVendor.trim(),
      vendorCode: `VND-${state.procurements.length + 1}`,
      invoiceNumber: procInvNo.trim(),
      invoiceDate: new Date().toISOString().slice(0, 10),
      purchaseRequestRef: procPrRef.trim(),
      branchId: branchFilter === 'all' ? 'b-11' : branchFilter,
      departmentCode: 'FIN',
      category: procCategory,
      amount: round2(amt),
      stage: 'purchase_request',
    };
    onUpdateState(
      appendFinancialAudit(
        { ...state, procurements: [rec, ...state.procurements] },
        {
          actorName,
          actorRole,
          action: 'بدء دورة مشتريات ومستحقات موردين',
          entityType: 'vendor_invoices',
          entityId: rec.id,
          documentNumber: rec.invoiceNumber,
          afterSummary: `${rec.vendorName} — ${rec.amount} ج.م`,
        }
      )
    );
    setProcVendor('');
    setProcInvNo('');
    setProcPrRef('');
    setProcAmt('');
    onNotify('تم فتح دورة الشراء والفاتورة بنجاح في مرحلة «طلب شراء».');
  };

  const handleAdvanceProcurementStage = (rec: ProcurementCycleRecord) => {
    const idx = PROCUREMENT_STAGES.findIndex((s) => s.id === rec.stage);
    if (idx < 0 || idx >= PROCUREMENT_STAGES.length - 1) return;
    const nextStage = PROCUREMENT_STAGES[idx + 1];
    const updated = state.procurements.map((p) =>
      p.id === rec.id ? { ...p, stage: nextStage.id } : p
    );
    onUpdateState(
      appendFinancialAudit(
        { ...state, procurements: updated },
        {
          actorName,
          actorRole,
          action: `ترقية دورة المشتريات ← ${nextStage.label}`,
          entityType: 'vendor_invoices',
          entityId: rec.id,
          documentNumber: rec.invoiceNumber,
          beforeSummary: rec.stage,
          afterSummary: nextStage.id,
        }
      )
    );
    onNotify(`تم نقل المستند (${rec.invoiceNumber}) إلى مرحلة «${nextStage.label}».`);
  };

  const handleAddDebtor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debCode.trim() || !debName.trim()) {
      onNotify('يرجى إدخال كود واسم المدين.');
      return;
    }
    const debtor = {
      id: `deb-${Date.now()}`,
      accountCode: debCode.trim(),
      debtorName: debName.trim(),
      branchId: branchFilter === 'all' ? 'b-11' : branchFilter,
      departmentCode: 'DEBTS',
      debtType: debType,
      openingBalance: round2(Number(debOpening || 0)),
      newDebts: round2(Number(debNew || 0)),
      approvedAdditions: 0,
      approvedCollections: round2(Number(debCollected || 0)),
      approvedCreditSettlements: round2(Number(debCreditSettle || 0)),
      dueDate: new Date().toISOString().slice(0, 10),
      status: 'active' as const,
      syncedRefKeys: [],
    };
    const rem = computeDebtorRemainingBalance(debtor);
    const finalDebtor = { ...debtor, status: rem <= 0 ? ('settled' as const) : ('active' as const) };
    onUpdateState(
      appendFinancialAudit(
        { ...state, debtors: [finalDebtor, ...state.debtors] },
        {
          actorName,
          actorRole,
          action: 'فتح حساب أستاذ مساعد مديونية',
          entityType: 'debtor_accounts',
          entityId: finalDebtor.id,
          afterSummary: `${finalDebtor.debtorName} — المتبقي ${rem} ج.م`,
        }
      )
    );
    setDebCode('');
    setDebName('');
    setDebOpening('');
    setDebNew('');
    setDebCollected('');
    setDebCreditSettle('');
    onNotify(`تم تسجيل المدين (${finalDebtor.debtorName}) برصيد متبقٍ ${formatArabicNumber(rem)} ج.م.`);
  };

  const handleStageOperationalItemToJournal = (item: OperationalIntegrationItem) => {
    if (item.alreadyLinked) {
      onNotify('تم ربط هذه الحركة التشغيلية مسبقاً بالنظام المالي — يمنع تكرار تسجيل الحركة مرتين.');
      return;
    }
    if (item.amountEgp <= 0) {
      onNotify('هذه الحركة مرجعية بقيمة صفر — أدخل القيمة والمستند الرسمي من شاشة إنشاء القيد بعد الاعتماد.');
      return;
    }
    if (postingAccounts.length < 2) {
      onNotify('يرجى تفعيل حسابين تفصيليين على الأقل في «دليل الحسابات» قبل ترحيل حركات الأقسام.');
      return;
    }
    const debitAcc = postingAccounts[0];
    const creditAcc = postingAccounts[1];
    const seq = state.journalEntries.length + 1;
    const stamp = makeRuntimeStamp();
    const entry: JournalEntry = {
      id: `je-sync-${stamp}`,
      entryNumber: `SYNC-2026-${String(seq).padStart(4, '0')}`,
      entryDate: item.date,
      periodId: state.periods[0]?.id || 'fp-2026-07',
      entryType: 'subledger_auto',
      sourceModule: item.sourceModule,
      sourceRefId: item.sourceRefId,
      documentNumber: item.documentNumber,
      idempotencyKey: item.idempotencyKey,
      description: `[ربط ${item.sourceModuleAr}] ${item.titleAr} — ${item.counterparty}`,
      branchId: item.branchId,
      departmentCode: item.departmentCode,
      currency: 'EGP',
      lines: [
        { id: `sl-1-${stamp}`, accountId: debitAcc.id, description: item.titleAr, debit: item.amountEgp, credit: 0 },
        { id: `sl-2-${stamp}`, accountId: creditAcc.id, description: item.counterparty, debit: 0, credit: item.amountEgp },
      ],
      totalDebit: item.amountEgp,
      totalCredit: item.amountEgp,
      status: 'draft',
      createdBy: actorName,
      createdAt: new Date().toISOString(),
    };

    onUpdateState(
      appendFinancialAudit(
        { ...state, journalEntries: [entry, ...state.journalEntries] },
        {
          actorName,
          actorRole,
          action: `سحب حركة تشغيلية إلى مسودة قيد محاسبي (${item.sourceModuleAr})`,
          entityType: 'journal_entries',
          entityId: entry.id,
          documentNumber: item.documentNumber,
          afterSummary: `${entry.entryNumber} بمبلغ ${item.amountEgp} ج.م (مفتاح منع التكرار: ${item.idempotencyKey})`,
          approvalStatus: 'draft',
        }
      )
    );
    onNotify(`تم تحويل الحركة إلى مسودة قيد (${entry.entryNumber}) لمراجعة التوجيه المحاسبي واعتمادها قبل الترحيل.`);
  };

  // ==================== HANDLERS: INVENTORY & FIXED ASSETS ====================
  const handleAddInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (state.policy.inventoryMethod === 'unconfigured') {
      onNotify('يرجى أولاً تحديد سياسة تقييم المخزون المعتمدة (FIFO أو المتوسط المرجح) قبل تسجيل التقييم.');
      return;
    }
    if (!invCode.trim() || !invName.trim()) {
      onNotify('يرجى إدخال كود واسم الصنف المخزني.');
      return;
    }
    const cost = round2(Number(invCost || 0));
    const item: InventoryItemRecord = {
      id: `inv-${Date.now()}`,
      itemCode: invCode.trim(),
      itemNameAr: invName.trim(),
      branchId: branchFilter === 'all' ? 'b-11' : branchFilter,
      departmentCode: 'STORE',
      unit: invUnit,
      openingQty: round2(Number(invOpening || 0)),
      approvedInQty: round2(Number(invIn || 0)),
      approvedOutQty: round2(Number(invOut || 0)),
      transfersInQty: 0,
      transfersOutQty: 0,
      adjustmentsQty: 0,
      unitCost: cost,
      minStockThreshold: 5,
      fifoLayers: [{ qty: round2(Number(invOpening || 0) + Number(invIn || 0)), unitCost: cost }],
    };
    onUpdateState(
      appendFinancialAudit(
        { ...state, inventory: [item, ...state.inventory] },
        {
          actorName,
          actorRole,
          action: 'تسجيل بطاقة صنف وتقييم مخزون',
          entityType: 'inventory_valuation',
          entityId: item.id,
          afterSummary: `${item.itemCode} - ${item.itemNameAr}`,
        }
      )
    );
    setInvCode('');
    setInvName('');
    setInvOpening('');
    setInvIn('');
    setInvOut('');
    setInvCost('');
    onNotify('تمت إضافة الصنف المخزني واحتساب قيمته وفق السياسة المعتمدة.');
  };

  const handleAddFixedAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = Number(faCost);
    const salvage = Number(faSalvage || 0);
    const life = Number(faLife);
    if (!faCode.trim() || !faName.trim() || !faDoc.trim() || !Number.isFinite(cost) || cost <= 0 || !Number.isFinite(life) || life <= 0) {
      onNotify('يرجى استكمال كود الأصل، الاسم، رقم المستند، تكلفة الاقتناء، والعمر الإنتاجي.');
      return;
    }
    if (salvage > cost) {
      onNotify('القيمة التخريدية لا يجوز أن تتجاوز تكلفة الاقتناء.');
      return;
    }
    const asset: FixedAssetRecord = {
      id: `fa-${Date.now()}`,
      assetCode: faCode.trim(),
      assetNameAr: faName.trim(),
      category: faCategory,
      branchId: branchFilter === 'all' ? 'b-11' : branchFilter,
      location: faLocation.trim() || 'ديوان عام المديرية',
      acquisitionDate: new Date().toISOString().slice(0, 10),
      inServiceDate: new Date().toISOString().slice(0, 10),
      acquisitionCost: round2(cost),
      documentNumber: faDoc.trim(),
      usefulLifeYears: life,
      salvageValue: round2(salvage),
      depreciationMethod: 'straight_line',
      accumulatedDepreciation: 0,
      impairmentLoss: 0,
      status: 'active',
      custodianName: faCustodian.trim() || actorName,
    };
    onUpdateState(
      appendFinancialAudit(
        { ...state, fixedAssets: [asset, ...state.fixedAssets] },
        {
          actorName,
          actorRole,
          action: 'إضافة أصل ثابت بسجل الأصول المركزي',
          entityType: 'fixed_assets',
          entityId: asset.id,
          documentNumber: asset.documentNumber,
          afterSummary: `${asset.assetCode}: ${asset.acquisitionCost} ج.م`,
        }
      )
    );
    setFaCode('');
    setFaName('');
    setFaDoc('');
    setFaCost('');
    setFaSalvage('0');
    setFaLife('');
    setFaCustodian('');
    onNotify('تم قيد الأصل الثابت بسجل الأصول المركزي.');
  };

  const handleRunAnnualDepreciation = (asset: FixedAssetRecord) => {
    const dep = computeStraightLineDepreciation(asset.acquisitionCost, asset.salvageValue, asset.usefulLifeYears);
    const maxDep = round2(asset.acquisitionCost - asset.salvageValue);
    const nextAccum = Math.min(maxDep, round2(asset.accumulatedDepreciation + dep.annualDepreciation));
    const delta = round2(nextAccum - asset.accumulatedDepreciation);
    if (delta <= 0) {
      onNotify('الأصل مهلك بالكامل حتى القيمة التخريدية.');
      return;
    }
    const updated = state.fixedAssets.map((a) =>
      a.id === asset.id ? { ...a, accumulatedDepreciation: nextAccum } : a
    );
    onUpdateState(
      appendFinancialAudit(
        { ...state, fixedAssets: updated },
        {
          actorName,
          actorRole,
          action: 'احتساب قسط إهلاك سنوي (القسط الثابت)',
          entityType: 'asset_depreciation',
          entityId: asset.id,
          beforeSummary: `مجمع سابق: ${asset.accumulatedDepreciation}`,
          afterSummary: `قسط الإهلاك: ${delta} | مجمع جديد: ${nextAccum}`,
        }
      )
    );
    onNotify(`تم احتساب قسط إهلاك قدره ${formatArabicNumber(delta)} ج.م للأصل (${asset.assetNameAr}).`);
  };

  // ==================== HANDLERS: GOVERNANCE, LEGAL, TAX, BACKUP ====================
  const handleAddLegalRef = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refNum.trim() || !refTitle.trim() || !refImpact.trim()) {
      onNotify('يرجى إدخال رقم القرار/المنشور وعنوانه وأثره المحاسبي.');
      return;
    }
    const doc: LegalReferenceDoc = {
      id: `lref-${Date.now()}`,
      decisionNumber: refNum.trim(),
      title: refTitle.trim(),
      issuingAuthority: refAuthority.trim(),
      category: refCategory,
      issueDate: refEffective,
      effectiveDate: refEffective,
      scope: refScope.trim() || 'ديوان عام المديرية والإدارات التموينية بالغربية',
      accountingImpact: refImpact.trim(),
      reviewStatus: 'pending_review',
    };
    onUpdateState(
      appendFinancialAudit(
        { ...state, referenceDocs: [doc, ...state.referenceDocs] },
        {
          actorName,
          actorRole,
          action: 'تسجيل مرجع قانوني / منشور مالي (قيد المراجعة)',
          entityType: 'accounting_reference_documents',
          entityId: doc.id,
          documentNumber: doc.decisionNumber,
          afterSummary: doc.title,
        }
      )
    );
    setRefNum('');
    setRefTitle('');
    setRefScope('');
    setRefImpact('');
    onNotify('تم تسجيل القرار المرجعي وبانتظار مراجعته واعتماده من المختص المالي.');
  };

  const handleAddTaxRule = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = Number(taxRate);
    const refDoc = state.referenceDocs.find((d) => d.id === taxRefId);
    if (!taxCode.trim() || !taxName.trim() || !refDoc || !Number.isFinite(rate) || rate < 0 || rate > 100) {
      onNotify('قاعدة إلزامية: لا يجوز إضافة نسبة ضريبة أو استقطاع إلا بربطها بقرار/مرجع رسمي مسجل ومراجع.');
      return;
    }
    const rule: TaxRuleConfig = {
      id: `tax-${Date.now()}`,
      code: taxCode.trim(),
      nameAr: taxName.trim(),
      taxType,
      ratePercent: rate,
      referenceDocId: refDoc.id,
      referenceDocLabel: `${refDoc.decisionNumber} — ${refDoc.title}`,
      effectiveFrom: refDoc.effectiveDate,
      isActive: true,
      approvedBy: actorName,
    };
    onUpdateState(
      appendFinancialAudit(
        { ...state, taxRules: [rule, ...state.taxRules] },
        {
          actorName,
          actorRole,
          action: 'تهيئة قاعدة ضريبية / استقطاع مرتبطة بسند رسمي',
          entityType: 'tax_rules_config',
          entityId: rule.id,
          documentNumber: refDoc.decisionNumber,
          afterSummary: `${rule.nameAr}: ${rule.ratePercent}%`,
        }
      )
    );
    setTaxCode('');
    setTaxName('');
    setTaxRate('');
    onNotify('تمت إضافة القاعدة الضريبية وربطها بالمرجع الرسمي بنجاح.');
  };

  const handleExportBackup = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gharbia-financial-erp-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify('تم تصدير نسخة احتياطية كاملة للنظام المالي والمحاسبي.');
  };

  const handleRestoreBackup = () => {
    try {
      const parsed = JSON.parse(restoreJsonText) as FinancialErpState;
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.accounts) || !Array.isArray(parsed.journalEntries)) {
        onNotify('ملف النسخة الاحتياطية غير صالح أو ناقص الهيكلة.');
        return;
      }
      onUpdateState(
        appendFinancialAudit(parsed, {
          actorName,
          actorRole,
          action: 'استعادة نسخة احتياطية معتمدة للنظام المالي',
          entityType: 'backup_restore',
          entityId: `restore-${Date.now()}`,
          afterSummary: `${parsed.accounts.length} حساب | ${parsed.journalEntries.length} قيد`,
        })
      );
      setRestoreJsonText('');
      onNotify('تمت استعادة النسخة الاحتياطية والتحقق من سلامة البيانات بنجاح.');
    } catch {
      onNotify('صيغة JSON غير صحيحة.');
    }
  };

  // ==================== OFFICIAL REPORT DATA BUILDER (28 REPORTS) ====================
  const activeReportData = useMemo(() => {
    const tb = computeTrialBalance(state.accounts, state.journalEntries, {
      periodId: periodFilter !== 'all' ? periodFilter : undefined,
      branchId: branchFilter,
    });

    switch (selectedReportId) {
      case 'trial_balance':
      case 'financial_position':
      case 'revenue_expense':
      case 'general_ledger':
      case 'account_movement':
        return {
          headers: ['كود الحساب', 'اسم الحساب', 'التصنيف', 'مجموع المدين', 'مجموع الدائن', 'رصيد مدين', 'رصيد دائن'],
          rows: tb.rows.map((r) => [
            r.code,
            r.nameAr,
            r.type,
            r.totalDebit,
            r.totalCredit,
            r.netDebit,
            r.netCredit,
          ]),
        };
      case 'general_journal':
      case 'pending_entries':
      case 'unapproved_ops': {
        const list =
          selectedReportId === 'general_journal'
            ? state.journalEntries
            : state.journalEntries.filter((e) => e.status !== 'posted' && e.status !== 'cancelled');
        return {
          headers: ['رقم القيد', 'التاريخ', 'رقم المستند', 'البيان', 'الإجمالي المدين', 'الإجمالي الدائن', 'الحالة', 'المحرر'],
          rows: list.map((e) => [
            e.entryNumber,
            e.entryDate,
            e.documentNumber,
            e.description,
            e.totalDebit,
            e.totalCredit,
            ENTRY_STATUS_LABELS[e.status],
            e.createdBy,
          ]),
        };
      }
      case 'budget_execution':
      case 'appropriations_available':
      case 'variances':
        return {
          headers: ['كود البند', 'الاعتماد', 'المعتمد المعدل', 'الالتزام المفتوح', 'المصروف الفعلي', 'المتاح', 'نسبة التنفيذ %'],
          rows: state.budgetAllocations.map((a) => {
            const m = computeBudgetMetrics(a, state.budgetCommitments, state.budgetExpenses);
            return [a.code, a.titleAr, m.adjustedBudget, m.reservedCommitmentsOpen, m.actualExpensesTotal, m.availableBalance, m.executionPercent];
          }),
        };
      case 'debtors_report':
      case 'subsidiary_ledger':
        return {
          headers: ['كود الحساب', 'المدين', 'النوع', 'أول المدة', 'مديونيات جديدة', 'تحصيلات', 'تسويات دائنة', 'المتبقي'],
          rows: state.debtors.map((d) => [
            d.accountCode,
            d.debtorName,
            d.debtType,
            d.openingBalance,
            d.newDebts,
            d.approvedCollections,
            d.approvedCreditSettlements,
            computeDebtorRemainingBalance(d),
          ]),
        };
      case 'fixed_assets':
      case 'depreciation_report':
        return {
          headers: ['كود الأصل', 'اسم الأصل', 'الموقع', 'التكلفة', 'التخريدية', 'العمر', 'مجمع الإهلاك', 'القيمة الدفترية'],
          rows: state.fixedAssets.map((a) => [
            a.assetCode,
            a.assetNameAr,
            a.location,
            a.acquisitionCost,
            a.salvageValue,
            a.usefulLifeYears,
            a.accumulatedDepreciation,
            computeAssetBookValue(a.acquisitionCost, a.accumulatedDepreciation, a.impairmentLoss),
          ]),
        };
      case 'inventory_report':
        return {
          headers: ['كود الصنف', 'اسم الصنف', 'الوحدة', 'رصيد أول المدة', 'وارد', 'منصرف', 'رصيد آخر المدة', 'القيمة الإجمالية'],
          rows: state.inventory.map((i) => {
            const m = computeInventoryMetrics(i, state.policy.inventoryMethod);
            return [i.itemCode, i.itemNameAr, i.unit, i.openingQty, i.approvedInQty, i.approvedOutQty, m.closingQty, m.totalValue];
          }),
        };
      case 'audit_trail':
        return {
          headers: ['التاريخ والوقت', 'المستخدم', 'الدور المالي', 'العملية', 'الكيان', 'المستند', 'الملخص'],
          rows: state.auditLogs.map((l) => [
            formatDateArabic(l.timestamp),
            l.actorName,
            l.actorRole,
            l.action,
            l.entityType,
            l.documentNumber || '-',
            l.afterSummary || l.reason || '-',
          ]),
        };
      default:
        return {
          headers: ['المرجع', 'البيان', 'التاريخ', 'القيمة (ج.م)', 'الحالة'],
          rows: [
            ...state.revenues.map((r) => [r.documentNumber, `إيراد: ${r.revenueType} (${r.payerName})`, r.dueDate, r.amount, r.status]),
            ...state.procurements.map((p) => [p.invoiceNumber, `مشتريات: ${p.vendorName}`, p.invoiceDate, p.amount, p.stage]),
            ...state.treasuryTransactions.map((t) => [t.documentNumber, `خزينة/بنك: ${t.counterparty}`, t.txDate, t.amount, ENTRY_STATUS_LABELS[t.status]]),
          ],
        };
    }
  }, [selectedReportId, state, periodFilter, branchFilter]);

  // ==================== RENDER: TAB 5 - OPERATIONS & DEPARTMENT INTEGRATION ====================
  if (activeSubTab === 'operations') {
    return (
      <div className="space-y-4">
        {/* Cross-Department Live Integration Bridge (Axes 10 & 22) */}
        <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div>
              <h4 className="text-xs font-black text-[#102A43] flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-[#164E83]" />
                <span>جسر التكامل المالي المباشر مع أقسام المنظومة ({toArabicNumerals(integrationItems.length)} حركة تشغيلية)</span>
              </h4>
              <p className="text-[11px] font-bold text-slate-600 mt-0.5">
                يقرأ النظام المستندات الأصلية من المخابز، المديونيات، السلع التموينية، التجارة الداخلية، صيانة الحبوب، والموارد البشرية ويمنع تكرار القيد عبر مفاتيح Idempotency ولا يحوّل أي حركة آلياً لإيراد أو مصروف دون مراجعة التوجيه المحاسبي.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-72 overflow-y-auto">
            {integrationItems.map((item) => (
              <div key={item.idempotencyKey} className="p-3 flex flex-wrap items-center justify-between gap-2 text-xs hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-[#164E83]">{item.sourceModuleAr}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-black text-[#102A43]">{item.titleAr}</span>
                  </div>
                  <p className="text-[10.5px] font-bold text-slate-600 mt-0.5">
                    الطرف: {item.counterparty} · مستند: {item.documentNumber} · التاريخ: {item.date}
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5">{item.recommendedTreatmentAr}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-black text-[#102A43] num-cell">
                    {formatArabicNumber(item.amountEgp)} ج.م
                  </span>
                  {item.alreadyLinked ? (
                    <span className="text-[10.5px] font-black text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>مرتبط مالياً</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStageOperationalItemToJournal(item)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#102A43] text-[#C6A15B] text-[10.5px] font-black cursor-pointer whitespace-nowrap"
                    >
                      تحويل لمسودة قيد
                    </button>
                  )}
                </div>
              </div>
            ))}
            {integrationItems.length === 0 && (
              <div className="py-6 text-center text-xs font-bold text-slate-500">
                لا توجد حركات تشغيلية جديدة بانتظار المراجعة المالية.
              </div>
            )}
          </div>
        </div>

        {/* Revenues & Procurement Cycle */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Revenues */}
          <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
            <h4 className="text-xs font-black text-[#102A43]">الإيرادات والتحصيلات الفعلية</h4>
            <form onSubmit={handleAddRevenue} className="grid grid-cols-2 gap-2">
              <input value={revType} onChange={(e) => setRevType(e.target.value)} placeholder="نوع الإيراد / الرسم" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
              <input value={revDoc} onChange={(e) => setRevDoc(e.target.value)} placeholder="رقم المستند المؤيد" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
              <input value={revPayer} onChange={(e) => setRevPayer(e.target.value)} placeholder="الجهة / الملزم بالسداد" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
              <input type="number" min="0" step="0.01" value={revAmt} onChange={(e) => setRevAmt(e.target.value)} placeholder="القيمة (ج.م)" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-black num-cell" />
              <input value={revBasis} onChange={(e) => setRevBasis(e.target.value)} placeholder="أساس الاستحقاق القانوني" className="col-span-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
              <button type="submit" className="col-span-2 py-2 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black cursor-pointer">
                تسجيل إيراد مستحق
              </button>
            </form>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-48 overflow-y-auto text-xs">
              {state.revenues.map((r) => (
                <div key={r.id} className="p-2.5 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-black text-[#102A43]">{r.revenueType} — {r.payerName}</p>
                    <p className="text-[10.5px] font-bold text-slate-500 num-cell">
                      {formatArabicNumber(r.amount)} ج.م · {r.status === 'collected' ? `محصّل (${r.receiptNumber})` : 'مستحق لم يُحصّل بعد'}
                    </p>
                  </div>
                  {r.status !== 'collected' && (
                    <button
                      type="button"
                      onClick={() => handleMarkRevenueCollected(r.id)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-[10.5px] font-black cursor-pointer whitespace-nowrap"
                    >
                      إثبات التحصيل الفعلي
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Procurement 10-Stage Cycle */}
          <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
            <h4 className="text-xs font-black text-[#102A43]">المصروفات ودورة المشتريات المستندية (مع منع تكرار الفواتير)</h4>
            <form onSubmit={handleAddProcurement} className="grid grid-cols-2 gap-2">
              <input value={procVendor} onChange={(e) => setProcVendor(e.target.value)} placeholder="اسم المورد" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
              <input value={procInvNo} onChange={(e) => setProcInvNo(e.target.value)} placeholder="رقم الفاتورة (فريد للمورد)" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
              <input value={procPrRef} onChange={(e) => setProcPrRef(e.target.value)} placeholder="رقم طلب الشراء" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
              <input type="number" min="0" step="0.01" value={procAmt} onChange={(e) => setProcAmt(e.target.value)} placeholder="القيمة (ج.م)" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-black num-cell" />
              <select value={procCategory} onChange={(e) => setProcCategory(e.target.value)} className="col-span-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white">
                <option value="مستلزمات تشغيل">مستلزمات تشغيل</option>
                <option value="مصروفات إدارية">مصروفات إدارية</option>
                <option value="صيانة وقطع غيار">صيانة وقطع غيار</option>
                <option value="كهرباء ومياه ووقود">كهرباء ومياه ووقود</option>
                <option value="خدمات وتعاقدات">خدمات وتعاقدات</option>
              </select>
              <button type="submit" className="col-span-2 py-2 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black cursor-pointer">
                بدء دورة شراء وفاتورة
              </button>
            </form>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-48 overflow-y-auto text-xs">
              {state.procurements.map((p) => {
                const st = PROCUREMENT_STAGES.find((s) => s.id === p.stage);
                return (
                  <div key={p.id} className="p-2.5 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-black text-[#102A43]">{p.vendorName} — فاتورة {p.invoiceNumber}</p>
                      <p className="text-[10.5px] font-bold text-slate-500 num-cell">
                        {formatArabicNumber(p.amount)} ج.م · المرحلة: {st?.label}
                      </p>
                    </div>
                    {p.stage !== 'posted' && (
                      <button
                        type="button"
                        onClick={() => handleAdvanceProcurementStage(p)}
                        className="px-2.5 py-1 rounded-lg bg-[#164E83] text-white text-[10.5px] font-black cursor-pointer whitespace-nowrap"
                      >
                        المرحلة التالية
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Debtors Subsidiary Ledger */}
        <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
          <h4 className="text-xs font-black text-[#102A43]">دفتر الأستاذ المساعد للمديونيات والمستحقات</h4>
          <form onSubmit={handleAddDebtor} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            <input value={debCode} onChange={(e) => setDebCode(e.target.value)} placeholder="كود المدين" className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
            <input value={debName} onChange={(e) => setDebName(e.target.value)} placeholder="اسم المدين / المخبز" className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
            <input type="number" min="0" step="0.01" value={debOpening} onChange={(e) => setDebOpening(e.target.value)} placeholder="أول المدة" className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-black num-cell" />
            <input type="number" min="0" step="0.01" value={debNew} onChange={(e) => setDebNew(e.target.value)} placeholder="مديونيات جديدة" className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-black num-cell" />
            <input type="number" min="0" step="0.01" value={debCollected} onChange={(e) => setDebCollected(e.target.value)} placeholder="تحصيلات معتمدة" className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-black num-cell" />
            <input type="number" min="0" step="0.01" value={debCreditSettle} onChange={(e) => setDebCreditSettle(e.target.value)} placeholder="تسوية دائنة" className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-black num-cell" />
            <button type="submit" className="py-2 px-3 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black cursor-pointer">
              تسجيل مدين
            </button>
          </form>
          {state.debtors.length > 0 && (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-[#102A43] text-[11px]">
                    <th className="py-2 px-3">الكود</th>
                    <th className="py-2 px-3">المدين</th>
                    <th className="py-2 px-3">أول المدة</th>
                    <th className="py-2 px-3">جديد</th>
                    <th className="py-2 px-3">تحصيلات</th>
                    <th className="py-2 px-3">تسويات دائنة</th>
                    <th className="py-2 px-3">الرصيد المتبقي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 num-cell">
                  {state.debtors.map((d) => (
                    <tr key={d.id}>
                      <td className="py-2 px-3 font-mono font-black text-[#164E83]">{d.accountCode}</td>
                      <td className="py-2 px-3 font-bold text-[#102A43]">{d.debtorName}</td>
                      <td className="py-2 px-3">{formatArabicNumber(d.openingBalance)}</td>
                      <td className="py-2 px-3">{formatArabicNumber(d.newDebts)}</td>
                      <td className="py-2 px-3 text-emerald-700 font-bold">{formatArabicNumber(d.approvedCollections)}</td>
                      <td className="py-2 px-3">{formatArabicNumber(d.approvedCreditSettlements)}</td>
                      <td className="py-2 px-3 font-black text-rose-800">{formatArabicNumber(computeDebtorRemainingBalance(d))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== RENDER: TAB 6 - INVENTORY & FIXED ASSETS ====================
  if (activeSubTab === 'assets_inventory') {
    return (
      <div className="space-y-4">
        {/* Inventory Valuation Policy & Register */}
        <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-black text-[#102A43] flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-[#164E83]" />
              <span>محاسبة المخازن والمخزون والتكلفة (Axis 11)</span>
            </h4>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-600">سياسة التقييم المعتمدة:</span>
              <select
                value={state.policy.inventoryMethod}
                onChange={(e) => {
                  const method = e.target.value as 'unconfigured' | 'fifo' | 'weighted_average';
                  onUpdateState(
                    appendFinancialAudit(
                      { ...state, policy: { ...state.policy, inventoryMethod: method } },
                      {
                        actorName,
                        actorRole,
                        action: 'تحديث سياسة تقييم المخزون',
                        entityType: 'accounting_policies',
                        entityId: 'inventory_method',
                        afterSummary: method,
                      }
                    )
                  );
                  onNotify('تم تحديث سياسة تقييم المخزون المعتمدة.');
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 font-black text-[#102A43] bg-white"
              >
                <option value="unconfigured">غير محددة بعد (تتطلب اعتماد المختص)</option>
                <option value="weighted_average">المتوسط المرجح (Weighted Average)</option>
                <option value="fifo">الوارد أولاً يصرف أولاً (FIFO)</option>
              </select>
            </div>
          </div>

          <form onSubmit={handleAddInventory} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            <input value={invCode} onChange={(e) => setInvCode(e.target.value)} placeholder="كود الصنف" className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
            <input value={invName} onChange={(e) => setInvName(e.target.value)} placeholder="اسم الصنف" className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
            <input value={invUnit} onChange={(e) => setInvUnit(e.target.value)} placeholder="الوحدة" className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
            <input type="number" min="0" step="0.01" value={invOpening} onChange={(e) => setInvOpening(e.target.value)} placeholder="أول المدة" className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-black num-cell" />
            <input type="number" min="0" step="0.01" value={invIn} onChange={(e) => setInvIn(e.target.value)} placeholder="وارد معتمد" className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-black num-cell" />
            <input type="number" min="0" step="0.01" value={invOut} onChange={(e) => setInvOut(e.target.value)} placeholder="منصرف معتمد" className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-black num-cell" />
            <div className="flex gap-1">
              <input type="number" min="0" step="0.01" value={invCost} onChange={(e) => setInvCost(e.target.value)} placeholder="سعر الوحدة" className="w-full px-2 py-2 rounded-xl border border-slate-200 text-xs font-black num-cell" />
              <button type="submit" className="px-3 py-2 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black cursor-pointer shrink-0">حفظ</button>
            </div>
          </form>

          {state.inventory.length > 0 && (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-[#102A43] text-[11px]">
                    <th className="py-2 px-3">الكود</th>
                    <th className="py-2 px-3">الصنف</th>
                    <th className="py-2 px-3">أول المدة</th>
                    <th className="py-2 px-3">وارد</th>
                    <th className="py-2 px-3">منصرف</th>
                    <th className="py-2 px-3">رصيد آخر المدة</th>
                    <th className="py-2 px-3">إجمالي القيمة (ج.م)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 num-cell">
                  {state.inventory.map((i) => {
                    const m = computeInventoryMetrics(i, state.policy.inventoryMethod);
                    return (
                      <tr key={i.id}>
                        <td className="py-2 px-3 font-mono font-black text-[#164E83]">{i.itemCode}</td>
                        <td className="py-2 px-3 font-bold text-[#102A43]">{i.itemNameAr}</td>
                        <td className="py-2 px-3">{formatArabicNumber(i.openingQty)}</td>
                        <td className="py-2 px-3">{formatArabicNumber(i.approvedInQty)}</td>
                        <td className="py-2 px-3">{formatArabicNumber(i.approvedOutQty)}</td>
                        <td className="py-2 px-3 font-black">{formatArabicNumber(m.closingQty)} {i.unit}</td>
                        <td className="py-2 px-3 font-black text-emerald-800">{formatArabicNumber(m.totalValue)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Fixed Assets & Straight-Line Depreciation */}
        <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
          <h4 className="text-xs font-black text-[#102A43] flex items-center gap-1.5">
            <Archive className="w-4 h-4 text-[#164E83]" />
            <span>سجل الأصول الثابتة المركزي والإهلاك (القسط الثابت — Axis 12)</span>
          </h4>
          <form onSubmit={handleAddFixedAsset} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <input value={faCode} onChange={(e) => setFaCode(e.target.value)} placeholder="كود الأصل" className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
            <input value={faName} onChange={(e) => setFaName(e.target.value)} placeholder="اسم الأصل الثابت" className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
            <select value={faCategory} onChange={(e) => setFaCategory(e.target.value as FixedAssetRecord['category'])} className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white">
              <option value="buildings">المباني</option>
              <option value="land">الأراضي</option>
              <option value="vehicles">السيارات</option>
              <option value="equipment">المعدات</option>
              <option value="devices">الأجهزة</option>
              <option value="machinery">الآلات</option>
              <option value="furniture">الأثاث</option>
              <option value="computers">أجهزة الحاسب</option>
              <option value="silo_mill_cold">معدات الشون والمطاحن والثلاجات</option>
            </select>
            <input value={faLocation} onChange={(e) => setFaLocation(e.target.value)} placeholder="الموقع" className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
            <input value={faDoc} onChange={(e) => setFaDoc(e.target.value)} placeholder="رقم المستند" className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
            <input type="number" min="0" step="0.01" value={faCost} onChange={(e) => setFaCost(e.target.value)} placeholder="تكلفة الاقتناء (ج.م)" className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-black num-cell" />
            <input type="number" min="0" step="0.01" value={faSalvage} onChange={(e) => setFaSalvage(e.target.value)} placeholder="القيمة التخريدية" className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-black num-cell" />
            <input type="number" min="1" step="0.5" value={faLife} onChange={(e) => setFaLife(e.target.value)} placeholder="العمر الإنتاجي (سنوات)" className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-black num-cell" />
            <input value={faCustodian} onChange={(e) => setFaCustodian(e.target.value)} placeholder="المسؤول عن العهدة" className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
            <button type="submit" className="py-2 px-3 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black cursor-pointer">
              + قيد أصل ثابت
            </button>
          </form>

          {state.fixedAssets.length > 0 && (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-[#102A43] text-white text-[11px]">
                    <th className="py-2 px-3">الكود</th>
                    <th className="py-2 px-3">الأصل</th>
                    <th className="py-2 px-3">التكلفة</th>
                    <th className="py-2 px-3">التخريدية</th>
                    <th className="py-2 px-3">القسط السنوي</th>
                    <th className="py-2 px-3">مجمع الإهلاك</th>
                    <th className="py-2 px-3">القيمة الدفترية</th>
                    <th className="py-2 px-3">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 num-cell">
                  {state.fixedAssets.map((a) => {
                    const dep = computeStraightLineDepreciation(a.acquisitionCost, a.salvageValue, a.usefulLifeYears);
                    const nbv = computeAssetBookValue(a.acquisitionCost, a.accumulatedDepreciation, a.impairmentLoss);
                    return (
                      <tr key={a.id}>
                        <td className="py-2 px-3 font-mono font-black text-[#164E83]">{a.assetCode}</td>
                        <td className="py-2 px-3 font-bold text-[#102A43]">{a.assetNameAr}</td>
                        <td className="py-2 px-3">{formatArabicNumber(a.acquisitionCost)}</td>
                        <td className="py-2 px-3">{formatArabicNumber(a.salvageValue)}</td>
                        <td className="py-2 px-3 font-bold text-amber-800">{formatArabicNumber(dep.annualDepreciation)}</td>
                        <td className="py-2 px-3 font-bold">{formatArabicNumber(a.accumulatedDepreciation)}</td>
                        <td className="py-2 px-3 font-black text-emerald-800">{formatArabicNumber(nbv)}</td>
                        <td className="py-2 px-3">
                          <button
                            type="button"
                            onClick={() => handleRunAnnualDepreciation(a)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#102A43] text-[10.5px] font-black cursor-pointer whitespace-nowrap"
                          >
                            ترحيل إهلاك سنة
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== RENDER: TAB 7 - GOVERNANCE, LEGAL, TAX, AUDIT & MANDATORY TESTS ====================
  if (activeSubTab === 'governance') {
    return (
      <div className="space-y-4">
        {/* Mandatory Accounting Acceptance Tests (Axis 23) */}
        <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-black text-[#102A43] flex items-center gap-1.5">
                <FlaskConical className="w-4 h-4 text-[#164E83]" />
                <span>مجموعة الاختبارات المحاسبية الإلزامية للقبول (المحور الثالث والعشرون)</span>
              </h4>
              <p className="text-[11px] font-bold text-slate-600 mt-0.5">
                تنفذ اختبارات معزولة للقيد المزدوج (١٠٬٠٠٠/١٠٬٠٠٠ و١٠٬٠٠٠/٩٬٠٠٠)، الموازنة ومنع ازدواج الخصم (٦٥٬٠٠٠)، المديونيات (٢٣٬٠٠٠)، إهلاك الأصول (١٠٬٠٠٠)، فصل الاختصاصات، منع التكرار، وحماية الإقفال.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const res = runMandatoryAccountingTests();
                setTestSuiteOutput(res);
                onNotify(
                  res.allPassed
                    ? `نجحت جميع الاختبارات المحاسبية الإلزامية (${toArabicNumerals(res.passedCount)}/${toArabicNumerals(res.totalCount)}).`
                    : 'أخفق أحد الاختبارات المحاسبية — يرجى المراجعة.'
                );
              }}
              className="px-4 py-2 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>تشغيل اختبارات القبول المحاسبية الآن</span>
            </button>
          </div>

          {testSuiteOutput && (
            <div className="space-y-2">
              <div
                className={`p-3 rounded-xl border text-xs font-black flex items-center justify-between ${
                  testSuiteOutput.allPassed
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <span>
                  {testSuiteOutput.allPassed
                    ? '✓ اجتازت المنظومة جميع اختبارات القبول المحاسبية والرقابية بنجاح كامل'
                    : '✗ يوجد اختبار لم يجتز المعايير'}
                </span>
                <span className="num-cell">
                  {toArabicNumerals(testSuiteOutput.passedCount)} / {toArabicNumerals(testSuiteOutput.totalCount)}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {testSuiteOutput.results.map((r) => (
                  <div
                    key={r.id}
                    className={`p-2.5 rounded-xl border text-[11px] flex items-start gap-2 ${
                      r.passed ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50 border-rose-200'
                    }`}
                  >
                    {r.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-black text-[#102A43]">{r.titleAr}</p>
                      <p className="font-bold text-slate-600 mt-0.5">النتيجة الفعلية: {r.actual}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Legal Reference Registry & Configurable Tax Rules (Zero Invented Rates/Decrees!) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <form onSubmit={handleAddLegalRef} className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2.5">
            <h4 className="text-xs font-black text-[#102A43] flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-[#164E83]" />
              <span>سجل المرجعية القانونية ومنشورات وزارة المالية (بدون نصوص مفترضة)</span>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <input value={refNum} onChange={(e) => setRefNum(e.target.value)} placeholder="رقم القانون / القرار / المنشور" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
              <input value={refAuthority} onChange={(e) => setRefAuthority(e.target.value)} placeholder="الجهة المصدرة" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
              <input value={refTitle} onChange={(e) => setRefTitle(e.target.value)} placeholder="عنوان القرار أو التعليمات الرسمية" className="col-span-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
              <select value={refCategory} onChange={(e) => setRefCategory(e.target.value as LegalReferenceDoc['category'])} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white">
                <option value="mof_circular">منشور وزارة المالية</option>
                <option value="law">قانون / لائحة مالية</option>
                <option value="budget_rule">قواعد الموازنة العامة</option>
                <option value="procurement">المشتريات والتعاقدات</option>
                <option value="tax">تعليمات ضريبية</option>
                <option value="supply_decree">قرار تمويني منظم</option>
              </select>
              <input type="date" value={refEffective} onChange={(e) => setRefEffective(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
              <input value={refScope} onChange={(e) => setRefScope(e.target.value)} placeholder="نطاق التطبيق" className="col-span-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
              <input value={refImpact} onChange={(e) => setRefImpact(e.target.value)} placeholder="المواد والبنود المؤثرة على المعالجة المحاسبية" className="col-span-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
            </div>
            <button type="submit" className="w-full py-2 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black cursor-pointer">
              تسجيل المرجع القانوني للمراجعة
            </button>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-40 overflow-y-auto text-[11px]">
              {state.referenceDocs.map((d) => (
                <div key={d.id} className="p-2">
                  <span className="font-black text-[#164E83] ml-2">{d.decisionNumber}</span>
                  <span className="font-bold text-[#102A43]">{d.title}</span>
                  <p className="text-[10px] text-slate-500">{d.issuingAuthority} · سارٍ من {d.effectiveDate}</p>
                </div>
              ))}
              {state.referenceDocs.length === 0 && (
                <p className="p-3 text-center text-slate-500 font-bold">
                  لم تُسجل قرارات أو منشورات مالية بعد — يجب إدخال المستندات الرسمية ومراجعتها قبل الاعتماد.
                </p>
              )}
            </div>
          </form>

          <form onSubmit={handleAddTaxRule} className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2.5">
            <h4 className="text-xs font-black text-[#102A43] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#164E83]" />
              <span>إعدادات الضرائب والاستقطاعات (مربوطة بالسند الرسمي فقط)</span>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <input value={taxCode} onChange={(e) => setTaxCode(e.target.value)} placeholder="كود القاعدة" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
              <input value={taxName} onChange={(e) => setTaxName(e.target.value)} placeholder="اسم الضريبة / الاستقطاع" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
              <select value={taxType} onChange={(e) => setTaxType(e.target.value as TaxRuleConfig['taxType'])} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white">
                <option value="vat">ضريبة القيمة المضافة</option>
                <option value="withholding">خصم وتحصيل تحت حساب الضريبة</option>
                <option value="payroll_tax">ضريبة المرتبات</option>
                <option value="social_insurance">التأمينات الاجتماعية</option>
                <option value="stamp_or_other">استقطاعات رسمية أخرى</option>
              </select>
              <input type="number" min="0" max="100" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="النسبة الرسمية %" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-black num-cell" />
              <select value={taxRefId} onChange={(e) => setTaxRefId(e.target.value)} className="col-span-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white">
                <option value="">-- اختر القرار/المنشور الرسمي المرجعي (إلزامي) --</option>
                {state.referenceDocs.map((d) => (
                  <option key={d.id} value={d.id}>{d.decisionNumber} — {d.title}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="w-full py-2 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black cursor-pointer">
              اعتماد قاعدة الضريبة / الاستقطاع
            </button>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-40 overflow-y-auto text-[11px]">
              {state.taxRules.map((tr) => (
                <div key={tr.id} className="p-2 flex items-center justify-between">
                  <div>
                    <span className="font-black text-[#102A43]">{tr.nameAr}</span>
                    <p className="text-[10px] text-slate-500">المصدر: {tr.referenceDocLabel}</p>
                  </div>
                  <span className="font-black text-[#164E83] num-cell">{toArabicNumerals(tr.ratePercent)}٪</span>
                </div>
              ))}
              {state.taxRules.length === 0 && (
                <p className="p-3 text-center text-slate-500 font-bold">
                  لا توجد نسب ضريبية مفترضة — سجّل المرجع الرسمي أولاً ثم أضف النسب المعتمدة.
                </p>
              )}
            </div>
          </form>
        </div>

        {/* 13 Financial Roles Matrix & Backup/Restore */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-[#102A43]">مصفوفة الأدوار المالية الـ ١٣ وفصل الاختصاصات</h4>
              <label className="flex items-center gap-1.5 text-[11px] font-black text-[#164E83] cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.policy.segregationOfDutiesEnforced}
                  onChange={(e) =>
                    onUpdateState(
                      appendFinancialAudit(
                        { ...state, policy: { ...state.policy, segregationOfDutiesEnforced: e.target.checked } },
                        {
                          actorName,
                          actorRole,
                          action: 'تحديث إعداد إلزامية فصل الاختصاصات',
                          entityType: 'accounting_policies',
                          entityId: 'sod',
                          afterSummary: e.target.checked ? 'مفعّل' : 'متجاوز للاختبار',
                        }
                      )
                    )
                  }
                  className="accent-[#102A43]"
                />
                <span>تفعيل فصل الاختصاصات الصارم</span>
              </label>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-56 overflow-y-auto">
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-[#102A43]">
                    <th className="py-1.5 px-2.5">الدور المالي</th>
                    <th className="py-1.5 px-2">إضافة</th>
                    <th className="py-1.5 px-2">مراجعة</th>
                    <th className="py-1.5 px-2">اعتماد</th>
                    <th className="py-1.5 px-2">ترحيل</th>
                    <th className="py-1.5 px-2">إقفال</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold">
                  {FINANCIAL_ROLES.map((r) => (
                    <tr key={r.id}>
                      <td className="py-1.5 px-2.5 font-black text-[#102A43]">{r.labelAr}</td>
                      <td className="py-1.5 px-2">{r.canCreate ? '✓' : '—'}</td>
                      <td className="py-1.5 px-2">{r.canReview ? '✓' : '—'}</td>
                      <td className="py-1.5 px-2">{r.canApprove ? '✓' : '—'}</td>
                      <td className="py-1.5 px-2">{r.canPost ? '✓' : '—'}</td>
                      <td className="py-1.5 px-2">{r.canClosePeriod ? '✓' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2.5">
            <h4 className="text-xs font-black text-[#102A43]">النسخ الاحتياطي واستعادة البيانات وسجل التدقيق غير القابل للحذف</h4>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="px-3 py-2 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تصدير نسخة احتياطية كاملة (JSON)</span>
              </button>
              <button
                type="button"
                onClick={handleRestoreBackup}
                disabled={!restoreJsonText.trim()}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[#102A43] text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>استعادة من JSON</span>
              </button>
            </div>
            <textarea
              value={restoreJsonText}
              onChange={(e) => setRestoreJsonText(e.target.value)}
              rows={2}
              placeholder="الصق محتوى النسخة الاحتياطية JSON هنا للتحقق والاستعادة..."
              className="w-full p-2.5 rounded-xl border border-slate-200 text-[11px] font-mono"
            />
            <div className="border border-slate-200 rounded-xl max-h-36 overflow-y-auto divide-y divide-slate-100 text-[10.5px]">
              {state.auditLogs.slice(0, 20).map((log) => (
                <div key={log.id} className="p-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-black text-[#102A43]">{log.action}</span>
                    <span className="text-slate-500 mr-1.5">({log.actorName})</span>
                  </div>
                  <span className="text-slate-500 num-cell shrink-0">{formatDateArabic(log.timestamp)}</span>
                </div>
              ))}
              {state.auditLogs.length === 0 && (
                <p className="p-3 text-center text-slate-500 font-bold">سجل التدقيق المالي غير قابل للمحو ويوثق كافة العمليات تلقائياً.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== RENDER: TAB 8 - 28 OFFICIAL FINANCIAL REPORTS CENTER ====================
  const activeMeta = OFFICIAL_REPORTS_CATALOG.find((r) => r.id === selectedReportId) || OFFICIAL_REPORTS_CATALOG[0];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h4 className="text-xs font-black text-[#102A43] flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#164E83]" />
              <span>مركز التقارير المالية والمحاسبية الرسمية (٢٨ تقريراً معتمداً)</span>
            </h4>
            <p className="text-[11px] font-bold text-slate-600 mt-0.5">
              يدعم التصفية حسب الفترة والإدارة والتصدير إلى Excel (CSV آمن) والطباعة الرسمية A4 مع إظهار مصدر البيانات وتاريخ الاستخراج.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                exportRowsToExcelCsv(
                  `gharbia-${activeMeta.id}-${new Date().toISOString().slice(0, 10)}.csv`,
                  activeReportData.headers,
                  activeReportData.rows
                );
                onNotify(`تم تصدير «${activeMeta.titleAr}» إلى ملف Excel CSV بنجاح.`);
              }}
              className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>تصدير Excel</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة رسمية A4</span>
            </button>
          </div>
        </div>

        {/* 28 Reports Selector Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 max-h-52 overflow-y-auto p-1">
          {OFFICIAL_REPORTS_CATALOG.map((rep) => (
            <button
              key={rep.id}
              type="button"
              onClick={() => setSelectedReportId(rep.id)}
              className={`px-2.5 py-2 rounded-xl border text-right text-[11px] font-black cursor-pointer transition-colors ${
                selectedReportId === rep.id
                  ? 'bg-[#102A43] text-[#C6A15B] border-[#102A43]'
                  : 'bg-slate-50 hover:bg-slate-100 text-[#102A43] border-slate-200'
              }`}
            >
              <span className="num-cell ml-1">{toArabicNumerals(rep.num)}.</span>
              <span>{rep.titleAr}</span>
            </button>
          ))}
        </div>

        {/* Official Report Preview Canvas */}
        <div className="rounded-xl border border-slate-300 bg-white p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2 text-xs">
            <div>
              <p className="font-black text-[#102A43]">
                محافظة الغربية — مديرية التموين والتجارة الداخلية | {activeMeta.titleAr}
              </p>
              <p className="text-[10.5px] font-bold text-slate-500">
                مصدر البيانات: النظام المالي والمحاسبي المركزي · الإدارة:{' '}
                {branchFilter === 'all'
                  ? 'جميع الإدارات التموينية'
                  : branches.find((b) => b.id === branchFilter)?.arabicName || branchFilter}
              </p>
            </div>
            <span className="text-[10.5px] font-bold text-slate-600 num-cell">
              تاريخ الاستخراج: {formatDateArabic(new Date().toISOString())}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-[#102A43] text-white text-[11px]">
                  {activeReportData.headers.map((h, i) => (
                    <th key={i} className="py-2 px-3 font-black">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 num-cell">
                {activeReportData.rows.map((row, ri) => (
                  <tr key={ri} className="hover:bg-slate-50">
                    {row.map((cell, ci) => (
                      <td key={ci} className="py-2 px-3 font-bold text-[#102A43]">
                        {typeof cell === 'number' ? formatArabicNumber(cell) : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
                {activeReportData.rows.length === 0 && (
                  <tr>
                    <td colSpan={activeReportData.headers.length} className="py-8 text-center text-slate-500 font-bold">
                      لا توجد سجلات مالية مطابقة لهذا التقرير حتى الآن.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
