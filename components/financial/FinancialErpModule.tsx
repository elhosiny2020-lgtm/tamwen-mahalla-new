'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpLeft,
  BarChart3,
  BookOpen,
  Boxes,
  Briefcase,
  Building2,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Coins,
  FileSpreadsheet,
  Filter,
  Landmark,
  Layers,
  Link2,
  Scale,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import type { BakeryRecord, Branch, DebtTransactionRecord, User } from '@/types';
import {
  computeBudgetMetrics,
  computeDebtorRemainingBalance,
  computeInventoryMetrics,
  computeTrialBalance,
  ENTRY_STATUS_LABELS,
  FINANCIAL_ROLES,
  FinancialErpState,
  FinancialRoleId,
  generateSmartFinancialAlerts,
  round2,
} from '@/lib/financial-erp-engine';
import {
  appendFinancialAudit,
  buildInteractiveFinancialDemoState,
  collectOperationalIntegrationItems,
  createCleanInitialFinancialState,
  getFinancialRoleForUser,
  loadFinancialErpState,
  saveFinancialErpState,
} from '@/lib/financial-erp-store';
import { formatArabicNumber, toArabicNumerals } from '@/lib/utils';
import FinancialBudgetDashboardCard from './FinancialBudgetDashboardCard';
import FinancialCorePanels from './FinancialCorePanels';
import FinancialOpsAndGovernancePanels from './FinancialOpsAndGovernancePanels';

export type FinancialErpTab =
  | 'dashboard'
  | 'coa'
  | 'journal'
  | 'budget'
  | 'treasury'
  | 'operations'
  | 'assets_inventory'
  | 'governance'
  | 'reports';

interface FinancialErpModuleProps {
  currentUser: User;
  branches: Branch[];
  bakeries: BakeryRecord[];
  debtTransactions: DebtTransactionRecord[];
}

interface KpiCardDescriptor {
  id: string;
  title: string;
  value: number;
  unit: 'egp' | 'count';
  targetTab: FinancialErpTab;
  tone: 'navy' | 'emerald' | 'amber' | 'rose' | 'sky' | 'indigo';
  subtitle: string;
  drillRows: { label: string; meta: string; amount?: number }[];
}

const TAB_ITEMS: { id: FinancialErpTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'لوحة التحكم المركزية (١٨ مؤشراً)', icon: BarChart3 },
  { id: 'coa', label: 'دليل الحسابات والفترات والتكلفة', icon: Layers },
  { id: 'journal', label: 'القيود والأستاذ وميزان المراجعة', icon: BookOpen },
  { id: 'budget', label: 'الموازنة والاعتمادات', icon: Scale },
  { id: 'treasury', label: 'الخزينة والبنوك والمطابقة', icon: Landmark },
  { id: 'operations', label: 'الإيرادات والمشتريات والمديونيات والربط', icon: Link2 },
  { id: 'assets_inventory', label: 'المخازن والأصول والإهلاك', icon: Boxes },
  { id: 'governance', label: 'الحوكمة والضرائب واختبارات القبول', icon: ShieldCheck },
  { id: 'reports', label: 'مركز التقارير الرسمية (٢٨)', icon: FileSpreadsheet },
];

function makeStamp(): string {
  return String(Date.now());
}

export default function FinancialErpModule({
  currentUser,
  branches,
  bakeries,
  debtTransactions,
}: FinancialErpModuleProps) {
  const [state, setState] = useState<FinancialErpState>(() => createCleanInitialFinancialState());
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<FinancialErpTab>('dashboard');
  const [activeFinancialRole, setActiveFinancialRole] = useState<FinancialRoleId>(() =>
    getFinancialRoleForUser(currentUser.role)
  );
  const [notice, setNotice] = useState<string | null>(null);

  // Global Dashboard & Workspace Filters (Axis 3.3)
  const [fiscalYearFilter, setFiscalYearFilter] = useState<string>('ALL');
  const [periodFilter, setPeriodFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [costCenterFilter, setCostCenterFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Selected KPI for Drill-down Panel
  const [selectedKpiId, setSelectedKpiId] = useState<string | null>(null);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      const loaded = loadFinancialErpState();
      setState(loaded);
      setIsLoaded(true);
    });
    return () => cancelAnimationFrame(frameId);
  }, []);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => {
      setNotice((prev) => (prev === msg ? null : prev));
    }, 5500);
  };

  const handleUpdateState = (next: FinancialErpState) => {
    setState(next);
    saveFinancialErpState(next);
  };

  const hasDemoData = useMemo(
    () => state.budgetAllocations.some((a) => a.id.startsWith('demo-')),
    [state.budgetAllocations]
  );

  const handleLoadInteractiveDemo = () => {
    const actor = currentUser.fullName.split('—')[0].trim();
    const demoState = buildInteractiveFinancialDemoState(actor);
    handleUpdateState(demoState);
    showNotice('تم تحميل البيانات التجريبية الأولية (٣ بنود اعتمادات وقيود مزدوجة متوازنة) لمعاينة تفاعل لوحة التحكم المالية.');
  };

  const handleResetCleanFinancialState = () => {
    const clean = createCleanInitialFinancialState();
    handleUpdateState(clean);
    showNotice('تم تصفير البيانات التجريبية والعودة للوضع المحاسبي النظيف دون أرصدة وهمية.');
  };

  const handleQuickSimulateExpense = (allocationId: string, amount: number, label: string) => {
    const alloc = state.budgetAllocations.find((a) => a.id === allocationId);
    if (!alloc) return;
    const metrics = computeBudgetMetrics(alloc, state.budgetCommitments, state.budgetExpenses);
    if (amount > metrics.availableBalance && !state.policy.allowOverBudgetWithAuthorityDoc) {
      showNotice(
        `تعذر الصرف: المبلغ المطلوب (${formatArabicNumber(amount)} ج.م) يتجاوز الرصيد المتاح (${formatArabicNumber(metrics.availableBalance)} ج.م).`
      );
      return;
    }
    const stamp = makeStamp();
    const newExp = {
      id: `sim-exp-${stamp}`,
      allocationId,
      documentNumber: `SIM-${stamp.slice(-5)}`,
      description: label,
      amount,
      expenseDate: new Date().toISOString().slice(0, 10),
      status: 'posted' as const,
    };
    const next = appendFinancialAudit(
      { ...state, budgetExpenses: [newExp, ...state.budgetExpenses] },
      {
        actorName: currentUser.fullName.split('—')[0].trim(),
        actorRole: activeFinancialRole,
        action: 'تسجيل مصروف تفاعلي على بند الموازنة',
        entityType: 'budget_expenses',
        entityId: newExp.id,
        documentNumber: newExp.documentNumber,
        afterSummary: `${label} بقيمة ${amount} ج.م`,
      }
    );
    handleUpdateState(next);
    showNotice(`تم تسجيل المصروف (${formatArabicNumber(amount)} ج.م) وتحديث الاعتمادات والمتاح فوراً.`);
  };

  const fiscalYears = useMemo(
    () => Array.from(new Set(state.periods.map((p) => p.fiscalYearCode))),
    [state.periods]
  );

  const existingIntegrationKeys = useMemo(() => {
    const keys = new Set<string>();
    state.journalEntries.forEach((e) => {
      if (e.idempotencyKey) keys.add(e.idempotencyKey);
    });
    state.debtors.forEach((d) => {
      (d.syncedRefKeys || []).forEach((k) => keys.add(k));
    });
    return keys;
  }, [state.journalEntries, state.debtors]);

  const integrationItems = useMemo(
    () =>
      isLoaded
        ? collectOperationalIntegrationItems({
            bakeries,
            debtTransactions,
            existingKeys: existingIntegrationKeys,
          })
        : [],
    [isLoaded, bakeries, debtTransactions, existingIntegrationKeys]
  );

  const filteredPeriods = useMemo(
    () =>
      state.periods.filter((p) =>
        fiscalYearFilter === 'ALL' ? true : p.fiscalYearCode === fiscalYearFilter
      ),
    [state.periods, fiscalYearFilter]
  );

  const activePeriodIds = useMemo(() => {
    if (periodFilter !== 'ALL') return new Set([periodFilter]);
    return new Set(filteredPeriods.map((p) => p.id));
  }, [periodFilter, filteredPeriods]);

  const filteredEntries = useMemo(
    () =>
      state.journalEntries.filter((e) => {
        if (!activePeriodIds.has(e.periodId)) return false;
        if (branchFilter !== 'ALL' && e.branchId !== branchFilter) return false;
        if (departmentFilter !== 'ALL' && e.departmentCode !== departmentFilter) return false;
        if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
        if (
          costCenterFilter !== 'ALL' &&
          e.costCenterId !== costCenterFilter &&
          !e.lines.some((l) => l.costCenterId === costCenterFilter)
        ) {
          return false;
        }
        return true;
      }),
    [state.journalEntries, activePeriodIds, branchFilter, departmentFilter, statusFilter, costCenterFilter]
  );

  const filteredAllocations = useMemo(
    () =>
      state.budgetAllocations.filter((a) => {
        if (fiscalYearFilter !== 'ALL' && a.fiscalYearCode !== fiscalYearFilter) return false;
        if (branchFilter !== 'ALL' && a.branchId !== branchFilter) return false;
        if (departmentFilter !== 'ALL' && a.departmentCode !== departmentFilter) return false;
        if (costCenterFilter !== 'ALL' && a.costCenterId !== costCenterFilter) return false;
        return true;
      }),
    [state.budgetAllocations, fiscalYearFilter, branchFilter, departmentFilter, costCenterFilter]
  );

  const filteredRevenues = useMemo(
    () =>
      state.revenues.filter((r) => {
        if (branchFilter !== 'ALL' && r.branchId !== branchFilter) return false;
        if (departmentFilter !== 'ALL' && r.departmentCode !== departmentFilter) return false;
        return true;
      }),
    [state.revenues, branchFilter, departmentFilter]
  );

  const filteredProcurements = useMemo(
    () =>
      state.procurements.filter((p) => {
        if (branchFilter !== 'ALL' && p.branchId !== branchFilter) return false;
        if (departmentFilter !== 'ALL' && p.departmentCode !== departmentFilter) return false;
        return true;
      }),
    [state.procurements, branchFilter, departmentFilter]
  );

  const filteredDebtors = useMemo(
    () =>
      state.debtors.filter((d) => (branchFilter === 'ALL' ? true : d.branchId === branchFilter)),
    [state.debtors, branchFilter]
  );

  const trialBalance = useMemo(
    () => computeTrialBalance(state.accounts, filteredEntries),
    [state.accounts, filteredEntries]
  );

  const smartAlerts = useMemo(() => generateSmartFinancialAlerts(state), [state]);

  // Helper to compute treasury book balance strictly from approved/posted treasury transactions
  const treasuryBalances = useMemo(() => {
    const map = new Map<string, number>();
    for (const acc of state.treasuryAccounts) {
      map.set(acc.id, 0);
    }
    for (const tx of state.treasuryTransactions) {
      if (tx.status !== 'approved' && tx.status !== 'posted') continue;
      const cur = map.get(tx.treasuryAccountId) || 0;
      const isInflow = tx.txType === 'receipt' || tx.txType === 'deposit';
      map.set(tx.treasuryAccountId, round2(isInflow ? cur + tx.amount : cur - tx.amount));
    }
    return map;
  }, [state.treasuryAccounts, state.treasuryTransactions]);

  // Compute all 18 Mandatory Executive KPIs (Axis 3.1 — strictly derived from actual state, zero fabricated balances)
  const kpiCards = useMemo<KpiCardDescriptor[]>(() => {
    const budgetRows = filteredAllocations.map((alloc) => ({
      alloc,
      metrics: computeBudgetMetrics(alloc, state.budgetCommitments, state.budgetExpenses),
    }));
    const totalAllocations = round2(budgetRows.reduce((s, r) => s + r.metrics.adjustedBudget, 0));
    const totalActualExpenses = round2(
      budgetRows.reduce((s, r) => s + r.metrics.actualExpensesTotal, 0)
    );
    const totalCommitments = round2(
      budgetRows.reduce((s, r) => s + r.metrics.reservedCommitmentsOpen, 0)
    );
    const totalAvailableBudget = round2(
      budgetRows.reduce((s, r) => s + r.metrics.availableBalance, 0)
    );

    const collectedRevenues = filteredRevenues.filter((r) => r.status === 'collected');
    const accruedRevenues = filteredRevenues.filter(
      (r) => r.status === 'accrued' || r.status === 'overdue'
    );
    const totalCollectedRev = round2(collectedRevenues.reduce((s, r) => s + r.amount, 0));
    const totalAccruedRev = round2(accruedRevenues.reduce((s, r) => s + r.amount, 0));

    const debtorBalances = filteredDebtors.map((d) => ({
      debtor: d,
      remaining: computeDebtorRemainingBalance(d),
    }));
    const totalDebtors = round2(debtorBalances.reduce((s, r) => s + r.remaining, 0));

    const unpaidPayables = filteredProcurements.filter(
      (p) => p.stage !== 'paid' && p.stage !== 'posted'
    );
    const totalPayables = round2(unpaidPayables.reduce((s, p) => s + p.amount, 0));

    const cashboxes = state.treasuryAccounts.filter(
      (t) => t.kind === 'cashbox' && (branchFilter === 'ALL' || t.branchId === branchFilter)
    );
    const banks = state.treasuryAccounts.filter(
      (t) => t.kind === 'bank' && (branchFilter === 'ALL' || t.branchId === branchFilter)
    );
    const totalCashboxes = round2(
      cashboxes.reduce((s, c) => s + (treasuryBalances.get(c.id) || 0), 0)
    );
    const totalBanks = round2(banks.reduce((s, b) => s + (treasuryBalances.get(b.id) || 0), 0));

    const filteredAssets = state.fixedAssets.filter(
      (a) => branchFilter === 'ALL' || a.branchId === branchFilter
    );
    const totalAssetsCost = round2(filteredAssets.reduce((s, a) => s + a.acquisitionCost, 0));
    const totalDepreciation = round2(
      filteredAssets.reduce((s, a) => s + a.accumulatedDepreciation, 0)
    );

    const custodyRows = trialBalance.rows.filter((r) => r.type === 'custody_deposits');
    const totalCustody = round2(
      custodyRows.reduce((s, r) => s + Math.max(0, r.netDebit - r.netCredit), 0)
    );

    const inventoryVals = state.inventory.map((item) => ({
      item,
      metrics: computeInventoryMetrics(item, state.policy.inventoryMethod),
    }));
    const totalInventoryValue = round2(inventoryVals.reduce((s, i) => s + i.metrics.totalValue, 0));

    const unpaidDuesList = unpaidPayables.filter(
      (p) => p.stage === 'invoiced' || p.stage === 'accrued' || p.stage === 'payment_ordered'
    );
    const unpaidDues = round2(unpaidDuesList.reduce((s, p) => s + p.amount, 0));

    const pendingSettlementEntries = filteredEntries.filter(
      (e) =>
        (e.entryType === 'adjustment' || e.entryType === 'correction') &&
        e.status !== 'posted' &&
        e.status !== 'cancelled'
    );
    const pendingSettlementsValue = round2(
      pendingSettlementEntries.reduce((s, e) => s + e.totalDebit, 0)
    );

    const awaitingApprovalEntries = filteredEntries.filter(
      (e) => e.status === 'under_review' || e.status === 'approved'
    );
    const awaitingApprovalProc = filteredProcurements.filter(
      (p) => p.stage === 'purchase_request' || p.stage === 'budget_checked' || p.stage === 'invoiced'
    );
    const pendingApprovalsCount = awaitingApprovalEntries.length + awaitingApprovalProc.length;

    const reconDiffs = state.bankReconciliations.map((r) => ({
      rec: r,
      diff: round2(r.variance),
    }));
    const totalReconDiff = round2(reconDiffs.reduce((s, r) => s + Math.abs(r.diff), 0));

    return [
      {
        id: 'kpi-01',
        title: '١. إجمالي الاعتمادات المالية',
        value: totalAllocations,
        unit: 'egp',
        targetTab: 'budget',
        tone: 'navy',
        subtitle: `${toArabicNumerals(budgetRows.length)} بند موازنة بعد التعديلات`,
        drillRows: budgetRows.map((r) => ({
          label: `${r.alloc.code} — ${r.alloc.titleAr}`,
          meta: `السنة المالية ${r.alloc.fiscalYearCode}`,
          amount: r.metrics.adjustedBudget,
        })),
      },
      {
        id: 'kpi-02',
        title: '٢. إجمالي المصروفات الفعلية',
        value: totalActualExpenses,
        unit: 'egp',
        targetTab: 'budget',
        tone: 'rose',
        subtitle: 'من واقع الصرف الفعلي على البنود',
        drillRows: budgetRows
          .filter((r) => r.metrics.actualExpensesTotal > 0)
          .map((r) => ({
            label: `${r.alloc.code} — ${r.alloc.titleAr}`,
            meta: `نسبة التنفيذ ${toArabicNumerals(r.metrics.executionPercent)}٪`,
            amount: r.metrics.actualExpensesTotal,
          })),
      },
      {
        id: 'kpi-03',
        title: '٣. إجمالي الالتزامات المالية',
        value: totalCommitments,
        unit: 'egp',
        targetTab: 'budget',
        tone: 'amber',
        subtitle: 'ارتباطات محجوزة دون خصم مزدوج',
        drillRows: state.budgetCommitments
          .filter((c) => c.status === 'reserved' || c.status === 'partially_expensed')
          .map((c) => ({
            label: c.commitmentNumber,
            meta: c.description,
            amount: round2(Math.max(0, c.committedAmount - c.convertedToExpenseAmount)),
          })),
      },
      {
        id: 'kpi-04',
        title: '٤. إجمالي المتاح من الاعتمادات',
        value: totalAvailableBudget,
        unit: 'egp',
        targetTab: 'budget',
        tone: 'emerald',
        subtitle: 'الاعتماد المعدل − (الارتباطات + المنصرف)',
        drillRows: budgetRows.map((r) => ({
          label: `${r.alloc.code} — ${r.alloc.titleAr}`,
          meta: r.metrics.availableBalance < 0 ? 'تجاوز اعتماد!' : 'رصيد متاح',
          amount: r.metrics.availableBalance,
        })),
      },
      {
        id: 'kpi-05',
        title: '٥. إجمالي الإيرادات المحصلة',
        value: totalCollectedRev,
        unit: 'egp',
        targetTab: 'operations',
        tone: 'emerald',
        subtitle: `${toArabicNumerals(collectedRevenues.length)} إيصال تحصيل معتمد`,
        drillRows: collectedRevenues.map((r) => ({
          label: `${r.receiptNumber || r.documentNumber} — ${r.payerName}`,
          meta: `${r.revenueType} • ${r.collectionDate || r.dueDate}`,
          amount: r.amount,
        })),
      },
      {
        id: 'kpi-06',
        title: '٦. إجمالي الإيرادات المستحقة',
        value: totalAccruedRev,
        unit: 'egp',
        targetTab: 'operations',
        tone: 'sky',
        subtitle: `${toArabicNumerals(accruedRevenues.length)} مطالبة قيد التحصيل`,
        drillRows: accruedRevenues.map((r) => ({
          label: `${r.documentNumber} — ${r.payerName}`,
          meta: `${r.revenueType} • استحقاق ${r.dueDate}`,
          amount: r.amount,
        })),
      },
      {
        id: 'kpi-07',
        title: '٧. إجمالي المديونيات',
        value: totalDebtors,
        unit: 'egp',
        targetTab: 'operations',
        tone: 'rose',
        subtitle: `${toArabicNumerals(debtorBalances.length)} ملف مدين بأستاذ المديونيات`,
        drillRows: debtorBalances.map((d) => ({
          label: d.debtor.debtorName,
          meta: `${d.debtor.debtType} • ${d.debtor.status}`,
          amount: d.remaining,
        })),
      },
      {
        id: 'kpi-08',
        title: '٨. إجمالي المستحقات للغير',
        value: totalPayables,
        unit: 'egp',
        targetTab: 'operations',
        tone: 'amber',
        subtitle: `${toArabicNumerals(unpaidPayables.length)} مطالبة/أمر توريد مفتوح`,
        drillRows: unpaidPayables.map((p) => ({
          label: `${p.purchaseRequestRef} — ${p.vendorName}`,
          meta: `${p.category} (${p.stage})`,
          amount: p.amount,
        })),
      },
      {
        id: 'kpi-09',
        title: '٩. إجمالي أرصدة الخزائن',
        value: totalCashboxes,
        unit: 'egp',
        targetTab: 'treasury',
        tone: 'indigo',
        subtitle: `${toArabicNumerals(cashboxes.length)} خزينة (رصيد دفتري من الحركات)`,
        drillRows: cashboxes.map((c) => ({
          label: c.nameAr,
          meta: `كود ${c.code} • أمين الخزينة: ${c.custodianName}`,
          amount: treasuryBalances.get(c.id) || 0,
        })),
      },
      {
        id: 'kpi-10',
        title: '١٠. إجمالي أرصدة الحسابات البنكية',
        value: totalBanks,
        unit: 'egp',
        targetTab: 'treasury',
        tone: 'navy',
        subtitle: `${toArabicNumerals(banks.length)} حساب بنكي (دفتري من الحركات)`,
        drillRows: banks.map((b) => ({
          label: b.nameAr,
          meta: `${b.bankName || 'بنك'} — ${b.maskedAccountNo || b.code}`,
          amount: treasuryBalances.get(b.id) || 0,
        })),
      },
      {
        id: 'kpi-11',
        title: '١١. إجمالي الأصول الثابتة',
        value: totalAssetsCost,
        unit: 'egp',
        targetTab: 'assets_inventory',
        tone: 'sky',
        subtitle: `${toArabicNumerals(filteredAssets.length)} أصل مسجل بالتكلفة التاريخية`,
        drillRows: filteredAssets.map((a) => ({
          label: `${a.assetCode} — ${a.assetNameAr}`,
          meta: `${a.category} • ${a.status}`,
          amount: a.acquisitionCost,
        })),
      },
      {
        id: 'kpi-12',
        title: '١٢. إجمالي الإهلاكات',
        value: totalDepreciation,
        unit: 'egp',
        targetTab: 'assets_inventory',
        tone: 'amber',
        subtitle: 'مجمع الإهلاك المحسوب بالقسط الثابت',
        drillRows: filteredAssets.map((a) => ({
          label: `${a.assetCode} — ${a.assetNameAr}`,
          meta: `العمر الإنتاجي ${toArabicNumerals(a.usefulLifeYears)} سنة`,
          amount: a.accumulatedDepreciation,
        })),
      },
      {
        id: 'kpi-13',
        title: '١٣. إجمالي العهد',
        value: totalCustody,
        unit: 'egp',
        targetTab: 'journal',
        tone: 'indigo',
        subtitle: 'من أرصدة حسابات العهد والأمانات المرحلة',
        drillRows: custodyRows.map((c) => ({
          label: `${c.code} — ${c.nameAr}`,
          meta: 'رصيد أستاذ عام مرحّل',
          amount: round2(c.netDebit - c.netCredit),
        })),
      },
      {
        id: 'kpi-14',
        title: '١٤. إجمالي المخزون بالقيمة',
        value: totalInventoryValue,
        unit: 'egp',
        targetTab: 'assets_inventory',
        tone: 'emerald',
        subtitle: `سياسة التقييم: ${
          state.policy.inventoryMethod === 'fifo'
            ? 'FIFO'
            : state.policy.inventoryMethod === 'weighted_average'
            ? 'متوسط مرجح'
            : 'تُضبط من الإدارة'
        }`,
        drillRows: inventoryVals.map((i) => ({
          label: `${i.item.itemCode} — ${i.item.itemNameAr}`,
          meta: `الكمية: ${toArabicNumerals(i.metrics.closingQty)} ${i.item.unit}`,
          amount: i.metrics.totalValue,
        })),
      },
      {
        id: 'kpi-15',
        title: '١٥. إجمالي المستحقات غير المسددة',
        value: unpaidDues,
        unit: 'egp',
        targetTab: 'operations',
        tone: 'rose',
        subtitle: 'فواتير مستحقة وأوامر دفع بانتظار الصرف',
        drillRows: unpaidDuesList.map((p) => ({
          label: `${p.invoiceNumber || p.purchaseRequestRef} — ${p.vendorName}`,
          meta: p.category,
          amount: p.amount,
        })),
      },
      {
        id: 'kpi-16',
        title: '١٦. إجمالي التسويات المعلقة',
        value: pendingSettlementsValue,
        unit: 'egp',
        targetTab: 'journal',
        tone: 'amber',
        subtitle: `${toArabicNumerals(pendingSettlementEntries.length)} قيد تسوية/تصحيح غير مرحّل`,
        drillRows: pendingSettlementEntries.map((e) => ({
          label: `${e.entryNumber} — ${e.description}`,
          meta: ENTRY_STATUS_LABELS[e.status],
          amount: e.totalDebit,
        })),
      },
      {
        id: 'kpi-17',
        title: '١٧. العمليات التي تنتظر الاعتماد',
        value: pendingApprovalsCount,
        unit: 'count',
        targetTab: 'journal',
        tone: 'sky',
        subtitle: `${toArabicNumerals(awaitingApprovalEntries.length)} قيد + ${toArabicNumerals(awaitingApprovalProc.length)} دورة صرف`,
        drillRows: [
          ...awaitingApprovalEntries.map((e) => ({
            label: `قيد ${e.entryNumber}: ${e.description}`,
            meta: `${ENTRY_STATUS_LABELS[e.status]} • ${e.entryDate}`,
            amount: e.totalDebit,
          })),
          ...awaitingApprovalProc.map((p) => ({
            label: `طلب ${p.purchaseRequestRef}: ${p.vendorName}`,
            meta: `${p.category} (${p.stage})`,
            amount: p.amount,
          })),
        ],
      },
      {
        id: 'kpi-18',
        title: '١٨. فروق التسويات والمطابقات',
        value: totalReconDiff,
        unit: 'egp',
        targetTab: 'treasury',
        tone: totalReconDiff > 0 ? 'rose' : 'emerald',
        subtitle: `${toArabicNumerals(state.bankReconciliations.length)} مذكرة مطابقة بنكية`,
        drillRows: reconDiffs.map((r) => ({
          label: `مطابقة ${r.rec.statementDate}`,
          meta: r.rec.status === 'reconciled' ? 'متطابقة تماماً' : 'يوجد فرق يتطلب قيد تسوية',
          amount: r.diff,
        })),
      },
    ];
  }, [
    filteredAllocations,
    state.budgetCommitments,
    state.budgetExpenses,
    filteredRevenues,
    filteredDebtors,
    filteredProcurements,
    state.treasuryAccounts,
    treasuryBalances,
    branchFilter,
    state.fixedAssets,
    trialBalance.rows,
    state.inventory,
    state.policy.inventoryMethod,
    filteredEntries,
    state.bankReconciliations,
  ]);

  const selectedKpi = useMemo(
    () => kpiCards.find((k) => k.id === selectedKpiId) || null,
    [kpiCards, selectedKpiId]
  );

  // Period Comparison Data (Revenues vs Expenses across periods — strictly from posted entries)
  const periodComparison = useMemo(() => {
    return filteredPeriods.map((p) => {
      const pEntries = filteredEntries.filter((e) => e.periodId === p.id && e.status === 'posted');
      const tb = computeTrialBalance(state.accounts, pEntries);
      const rev = round2(
        tb.rows
          .filter((r) => r.type === 'revenues')
          .reduce((s, r) => s + Math.max(0, r.netCredit - r.netDebit), 0)
      );
      const exp = round2(
        tb.rows
          .filter((r) => r.type === 'expenses')
          .reduce((s, r) => s + Math.max(0, r.netDebit - r.netCredit), 0)
      );
      return { period: p, rev, exp, entriesCount: pEntries.length };
    });
  }, [filteredPeriods, filteredEntries, state.accounts]);

  const maxPeriodAmount = useMemo(
    () => Math.max(1, ...periodComparison.map((c) => Math.max(c.rev, c.exp))),
    [periodComparison]
  );

  const activeRoleMeta = useMemo(
    () => FINANCIAL_ROLES.find((r) => r.id === activeFinancialRole) || FINANCIAL_ROLES[0],
    [activeFinancialRole]
  );

  const unlinkedIntegrationCount = useMemo(
    () => integrationItems.filter((i) => !i.alreadyLinked).length,
    [integrationItems]
  );

  const toneStyles: Record<KpiCardDescriptor['tone'], { border: string; badge: string; text: string }> = {
    navy: { border: 'border-[#102A43]/20 hover:border-[#102A43]', badge: 'bg-[#102A43]/10 text-[#102A43]', text: 'text-[#102A43]' },
    emerald: { border: 'border-emerald-200 hover:border-emerald-500', badge: 'bg-emerald-50 text-emerald-800', text: 'text-emerald-800' },
    amber: { border: 'border-amber-200 hover:border-amber-500', badge: 'bg-amber-50 text-amber-800', text: 'text-amber-800' },
    rose: { border: 'border-rose-200 hover:border-rose-500', badge: 'bg-rose-50 text-rose-800', text: 'text-rose-800' },
    sky: { border: 'border-sky-200 hover:border-sky-500', badge: 'bg-sky-50 text-sky-800', text: 'text-sky-800' },
    indigo: { border: 'border-indigo-200 hover:border-indigo-500', badge: 'bg-indigo-50 text-indigo-800', text: 'text-indigo-800' },
  };

  return (
    <div className="space-y-4 pb-8" dir="rtl">
      {/* Executive Institutional Header */}
      <div className="bg-gradient-to-l from-[#102A43] via-[#1B3B5A] to-[#244E73] text-white rounded-2xl p-5 shadow-md border border-[#102A43]/40">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] font-bold text-sky-200">
              <Building2 className="w-4 h-4" />
              <span>محافظة الغربية • مديرية التموين والتجارة الداخلية • النظام المالي والمحاسبي المركزي ERP</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5">
              <Calculator className="w-6 h-6 text-amber-300" />
              <span>الإدارة المالية والمحاسبية المركزية</span>
            </h1>
            <p className="text-xs text-slate-200 max-w-3xl leading-relaxed">
              نظام قيد مزدوج مؤسسي (IFRS / IAS / IPSAS) بقاعدة بيانات موحدة، وفصل صارم للمهام (Segregation of Duties)، وربط حي بجميع أقسام المديرية دون أرصدة وهمية أو نسب قانونية مفترضة.
            </p>
          </div>

          {/* Active Financial Role & Governance Indicator */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 min-w-[270px] space-y-2">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-bold text-sky-200 flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" />
                الدور المالي النشط (١٣ دوراً)
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-200 font-black text-[10px]">
                فصل مهام مفعّل
              </span>
            </div>
            <select
              value={activeFinancialRole}
              onChange={(e) => {
                setActiveFinancialRole(e.target.value as FinancialRoleId);
                showNotice('تم تبديل الدور المالي لاختبار الصلاحيات وفصل المهام.');
              }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-white text-[#102A43] text-xs font-black focus:outline-none"
              aria-label="الدور المالي النشط"
            >
              {FINANCIAL_ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.labelAr}
                </option>
              ))}
            </select>
            <div className="flex items-center justify-between text-[10.5px] text-slate-200">
              <span>المستخدم: {currentUser.fullName.split('—')[0].trim()}</span>
              <span>
                {activeRoleMeta.canPost
                  ? 'صلاحية ترحيل'
                  : activeRoleMeta.canApprove
                  ? 'صلاحية اعتماد'
                  : activeRoleMeta.canReview
                  ? 'صلاحية مراجعة'
                  : 'إعداد/عرض'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-4 pt-3 border-t border-white/15 flex flex-wrap gap-1.5">
          {TAB_ITEMS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#102A43] shadow-sm'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.id === 'operations' && unlinkedIntegrationCount > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                      isActive ? 'bg-amber-100 text-amber-900' : 'bg-amber-400 text-[#102A43]'
                    }`}
                  >
                    {toArabicNumerals(unlinkedIntegrationCount)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Toast Notification */}
      {notice && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl px-4 py-2.5 text-xs font-black flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Global Filter Bar (Axis 3.3) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 font-black text-[#102A43] pl-2 border-l border-slate-200">
            <Filter className="w-4 h-4 text-[#1B4965]" />
            <span>فلاتر المنظومة المالية:</span>
          </div>

          <select
            value={fiscalYearFilter}
            onChange={(e) => {
              setFiscalYearFilter(e.target.value);
              setPeriodFilter('ALL');
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 font-bold text-[#102A43]"
          >
            <option value="ALL">كل السنوات المالية</option>
            {fiscalYears.map((fy) => (
              <option key={fy} value={fy}>
                السنة المالية {fy}
              </option>
            ))}
          </select>

          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 font-bold text-[#102A43]"
          >
            <option value="ALL">كل الفترات المحاسبية</option>
            {filteredPeriods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nameAr}
              </option>
            ))}
          </select>

          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 font-bold text-[#102A43]"
          >
            <option value="ALL">كل الإدارات التموينية والديوان</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.arabicName}
              </option>
            ))}
          </select>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 font-bold text-[#102A43]"
          >
            <option value="ALL">كل الأقسام</option>
            <option value="FIN">الإدارة المالية والمحاسبية</option>
            <option value="BAK">إدارة المخابز</option>
            <option value="DEBTS">المديونيات والتحصيل</option>
            <option value="COMM">السلع التموينية</option>
            <option value="TRADE">التجارة الداخلية</option>
            <option value="GRAIN">صيانة الحبوب والصوامع</option>
            <option value="HR">الموارد البشرية</option>
          </select>

          <select
            value={costCenterFilter}
            onChange={(e) => setCostCenterFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 font-bold text-[#102A43]"
          >
            <option value="ALL">كل مراكز التكلفة</option>
            {state.costCenters.map((cc) => (
              <option key={cc.id} value={cc.id}>
                {cc.code} — {cc.nameAr}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 font-bold text-[#102A43]"
          >
            <option value="ALL">كل حالات الاعتماد</option>
            <option value="draft">مسودة</option>
            <option value="under_review">قيد المراجعة</option>
            <option value="approved">معتمدة</option>
            <option value="posted">مرحّلة نهائياً</option>
            <option value="cancelled">ملغاة</option>
          </select>

          {(fiscalYearFilter !== 'ALL' ||
            periodFilter !== 'ALL' ||
            branchFilter !== 'ALL' ||
            departmentFilter !== 'ALL' ||
            costCenterFilter !== 'ALL' ||
            statusFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setFiscalYearFilter('ALL');
                setPeriodFilter('ALL');
                setBranchFilter('ALL');
                setDepartmentFilter('ALL');
                setCostCenterFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-[#102A43] font-black cursor-pointer"
            >
              إعادة ضبط الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: CENTRAL FINANCIAL DASHBOARD (AXIS 3 — INTERACTIVE BUDGET OVERVIEW + ALL 18 CLICKABLE KPIs + CHARTS + SMART ALERTS) */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          <FinancialBudgetDashboardCard
            allocations={filteredAllocations}
            commitments={state.budgetCommitments}
            expenses={state.budgetExpenses}
            hasDemoData={hasDemoData}
            onLoadDemoData={handleLoadInteractiveDemo}
            onResetCleanState={handleResetCleanFinancialState}
            onQuickSimulateExpense={handleQuickSimulateExpense}
          />

          {/* Accounting Readiness Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-500">توازن ميزان المراجعة (القيود المرحلة)</div>
                <div className="text-sm font-black text-[#102A43] mt-1 flex items-center gap-1.5">
                  {trialBalance.isBalanced ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>متوازن تماماً (مدين = دائن)</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>يوجد فرق بميزان المراجعة!</span>
                    </>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                  إجمالي الحركة: {formatArabicNumber(trialBalance.sumDebit)} ج.م
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('journal')}
                className="px-3 py-1.5 rounded-lg bg-[#102A43] text-white text-[11px] font-black cursor-pointer"
              >
                فتح الأستاذ
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-500">جسر الربط مع أقسام المديرية</div>
                <div className="text-sm font-black text-[#102A43] mt-1">
                  {toArabicNumerals(integrationItems.length)} مستند تشغيلي حي
                </div>
                <div className="text-[11px] text-amber-700 font-bold mt-0.5">
                  {toArabicNumerals(unlinkedIntegrationCount)} بانتظار المراجعة والمعالجة المحاسبية
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('operations')}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-[11px] font-black cursor-pointer"
              >
                مراجعة الربط
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-500">حالة تأسيس دليل الحسابات</div>
                <div className="text-sm font-black text-[#102A43] mt-1">
                  {toArabicNumerals(state.accounts.length)} حساب (
                  {toArabicNumerals(
                    state.accounts.filter((a) => a.allowPosting && a.status === 'active').length
                  )}{' '}
                  قابل للترحيل)
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  دون أرصدة وهمية — جميع الأرقام من القيود المرحلة
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('coa')}
                className="px-3 py-1.5 rounded-lg bg-sky-700 text-white text-[11px] font-black cursor-pointer"
              >
                دليل الحسابات
              </button>
            </div>
          </div>

          {/* 18 Clickable Executive KPIs Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div>
                <h2 className="text-sm font-black text-[#102A43] flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#1B4965]" />
                  <span>المؤشرات المالية الاستراتيجية (١٨ مؤشراً قابلاً للنقر والتفصيل الفوري)</span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  انقر على أي مؤشر لعرض التفاصيل الفورية (Drill-Down) أو الانتقال المباشر إلى شاشته المتخصصة.
                </p>
              </div>
              <span className="text-[11px] font-bold text-slate-500">
                العملة المعتمدة: الجنيه المصري (ج.م)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
              {kpiCards.map((kpi) => {
                const style = toneStyles[kpi.tone];
                const isSelected = selectedKpiId === kpi.id;
                return (
                  <button
                    key={kpi.id}
                    type="button"
                    onClick={() => setSelectedKpiId(isSelected ? null : kpi.id)}
                    className={`text-right rounded-xl border p-3 transition-all cursor-pointer flex flex-col justify-between gap-1.5 bg-white ${
                      isSelected ? 'ring-2 ring-[#102A43] border-[#102A43] bg-slate-50' : style.border
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-[11px] font-black text-[#102A43] leading-snug">
                        {kpi.title}
                      </span>
                      <ArrowUpLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </div>
                    <div className={`text-base font-black tabular-nums ${style.text}`}>
                      {kpi.unit === 'egp'
                        ? `${formatArabicNumber(kpi.value)} ج.م`
                        : `${toArabicNumerals(kpi.value)} عملية`}
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold leading-tight">
                      {kpi.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Interactive Drill-Down Panel */}
            {selectedKpi && (
              <div className="mt-3 rounded-xl border-2 border-[#102A43]/25 bg-slate-50 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div>
                    <h3 className="text-sm font-black text-[#102A43]">
                      تفصيل المؤشر (Drill-Down): {selectedKpi.title}
                    </h3>
                    <p className="text-[11px] text-slate-600">{selectedKpi.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab(selectedKpi.targetTab)}
                      className="px-3 py-1.5 rounded-lg bg-[#102A43] text-white text-xs font-black cursor-pointer"
                    >
                      الانتقال للشاشة المتخصصة
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedKpiId(null)}
                      className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
                      aria-label="إغلاق التفصيل"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {selectedKpi.drillRows.length === 0 ? (
                  <p className="text-xs font-bold text-slate-500 py-3 text-center">
                    لا توجد سجلات مالية مرحلة لهذا المؤشر وفق الفلاتر الحالية — يمكنك البدء بتسجيل العمليات من الشاشة المتخصصة.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                    {selectedKpi.drillRows.slice(0, 20).map((row, idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded-lg border border-slate-200 px-3 py-2 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-black text-[#102A43] truncate">{row.label}</div>
                          <div className="text-[10.5px] text-slate-500 truncate">{row.meta}</div>
                        </div>
                        {typeof row.amount === 'number' && (
                          <div className="font-black text-[#1B4965] tabular-nums shrink-0">
                            {formatArabicNumber(row.amount)} ج.م
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Grid: Period Comparison Chart + Smart Financial Alerts (Axis 3.2 & Axis 19) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Period Comparison Chart */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-black text-[#102A43] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>مقارنة الإيرادات والمصروفات عبر الفترات المالية (من القيود المرحلة فقط)</span>
                </h3>
                <div className="flex items-center gap-3 text-[10.5px] font-bold">
                  <span className="flex items-center gap-1 text-emerald-700">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block" /> الإيرادات
                  </span>
                  <span className="flex items-center gap-1 text-rose-700">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-600 inline-block" /> المصروفات
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                {periodComparison.map(({ period, rev, exp, entriesCount }) => (
                  <div key={period.id} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#102A43]">
                      <span>
                        {period.nameAr} ({toArabicNumerals(entriesCount)} قيد مرحّل)
                      </span>
                      <span className="tabular-nums text-slate-600">
                        إيراد: {formatArabicNumber(rev)} | مصروف: {formatArabicNumber(exp)} ج.م
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.round((rev / maxPeriodAmount) * 100))}%` }}
                        />
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.round((exp / maxPeriodAmount) * 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Smart Financial Alerts (Axis 19 — Advisory Only) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-black text-[#102A43] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>التنبيهات المالية والرقابية الذكية (استشاري فقط)</span>
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[#102A43] text-[10px] font-black">
                  {toArabicNumerals(smartAlerts.length)} تنبيه
                </span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {smartAlerts.length === 0 ? (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center text-xs font-bold text-emerald-900 flex flex-col items-center gap-1.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>لا توجد إنذارات أو مخالفات مالية مرصودة حالياً.</span>
                  </div>
                ) : (
                  smartAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`rounded-xl border p-3 text-xs space-y-1 ${
                        alert.severity === 'critical' || alert.severity === 'high'
                          ? 'bg-rose-50 border-rose-200 text-rose-950'
                          : alert.severity === 'medium'
                          ? 'bg-amber-50 border-amber-200 text-amber-950'
                          : 'bg-sky-50 border-sky-200 text-sky-950'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 font-black">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          {alert.alertType}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/70">
                          {alert.responsibleRole}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed opacity-90">{alert.suggestedAction}</p>
                      {typeof alert.amountEgp === 'number' && alert.amountEgp > 0 && (
                        <div className="text-[10.5px] font-black tabular-nums">
                          القيمة المرصودة: {formatArabicNumber(alert.amountEgp)} ج.م
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  التنبيهات لا تغيّر أي قيد أو رصيد تلقائياً
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('governance')}
                  className="text-[#102A43] font-black hover:underline cursor-pointer flex items-center gap-1"
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  <span>تشغيل اختبارات القبول</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TABS 2-5: CORE ACCOUNTING PANELS */}
      {(activeTab === 'coa' || activeTab === 'journal' || activeTab === 'budget' || activeTab === 'treasury') && (
        <FinancialCorePanels
          activeSubTab={activeTab}
          state={state}
          onUpdateState={handleUpdateState}
          branches={branches}
          actorName={currentUser.fullName.split('—')[0].trim()}
          actorRole={activeFinancialRole}
          branchFilter={branchFilter}
          periodFilter={periodFilter}
          onNotify={showNotice}
        />
      )}

      {/* TABS 6-9: OPERATIONS, ASSETS/INVENTORY, GOVERNANCE & 28 OFFICIAL REPORTS */}
      {(activeTab === 'operations' ||
        activeTab === 'assets_inventory' ||
        activeTab === 'governance' ||
        activeTab === 'reports') && (
        <FinancialOpsAndGovernancePanels
          activeSubTab={activeTab}
          state={state}
          onUpdateState={handleUpdateState}
          branches={branches}
          integrationItems={integrationItems}
          actorName={currentUser.fullName.split('—')[0].trim()}
          actorRole={activeFinancialRole}
          branchFilter={branchFilter}
          periodFilter={periodFilter}
          onNotify={showNotice}
        />
      )}
    </div>
  );
}
