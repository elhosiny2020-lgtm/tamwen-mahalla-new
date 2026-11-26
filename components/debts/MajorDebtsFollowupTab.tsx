'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  CreditCard,
  Download,
  History,
  Printer,
  Search,
  Settings2,
  ShieldAlert,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import {
  BakeryDebtRecord,
  BakeryRecord,
  DebtInstallmentRecord,
  DebtModuleSettings,
  DebtPaymentRecord,
  DebtSchedulePlan,
  DebtThresholdSetting,
  MajorDebtComparisonRule,
  MajorDebtScopeType,
  ScheduleFrequencyType,
} from '@/types';
import {
  compareTableValues,
  formatArabicCurrency,
  formatDateArabic,
  normalizeSearchText,
  toArabicNumerals,
} from '@/lib/utils';
import { generateInstallmentsDraft, round2 } from '@/lib/debts-engine';
import { exportCsvUtf8Bom } from '@/lib/debts-data';
import {
  loadDebtThresholdSetting,
  saveDebtThresholdSetting,
} from '@/lib/major-debts-tasks-chat-store';
import SmartAutoFitTable, { SmartTableColumn } from '@/components/SmartAutoFitTable';
import { OfficialPrintModal } from './DebtsSharedUi';

interface MajorDebtsFollowupTabProps {
  userId: string;
  currentUserName: string;
  bakeries: BakeryRecord[];
  debts: BakeryDebtRecord[];
  payments: DebtPaymentRecord[];
  schedules: DebtSchedulePlan[];
  installments: DebtInstallmentRecord[];
  settings: DebtModuleSettings;
  todayRef: string;
  onCreateSchedulePlan: (
    plan: Omit<DebtSchedulePlan, 'id' | 'scheduleNumber' | 'createdAt'>,
    generatedInstallments: DebtInstallmentRecord[]
  ) => { ok: boolean; error?: string };
  onRegisterPayment: (payload: {
    debtId: string;
    paymentDate: string;
    amount: number;
    paymentKind: DebtPaymentRecord['paymentKind'];
    paymentMethod: string;
    receiptNumber: string;
    collectionAuthority: string;
    installmentId?: string;
    notes: string;
  }) => { ok: boolean; error?: string };
  onOpenBakeryProfile: (bakeryId: string) => void;
}

export interface AggregatedBakeryMajorDebtRow {
  serial: number;
  bakeryId: string;
  bakeryNumber: string;
  ownerName: string;
  posNumber: string;
  bakeryName: string;
  supplyBranchName: string;
  village: string;
  localUnit: string;
  phone: string;
  totalViolationsEgp: number;
  totalAdditionsEgp: number;
  totalDisposalsEgp: number;
  totalPaidEgp: number;
  netCurrentDebtEgp: number;
  thresholdAmountEgp: number;
  exceedAmountEgp: number;
  paymentSystemLabel: string;
  installmentAmountEgp: number;
  installmentsCount: number;
  paidInstallmentsAmountEgp: number;
  remainingInstallmentsAmountEgp: number;
  paymentStartDate: string;
  lastPaymentDate: string;
  nextDueDate: string;
  paymentStatusLabel: string;
  colorClassKey: 'green' | 'orange' | 'red' | 'dark_red' | 'blue';
  colorClassTitle: string;
  primaryDebt: BakeryDebtRecord | null;
  hasLateInstallment: boolean;
  hasRegularSchedule: boolean;
  meetsThresholdRule: boolean;
}

export default function MajorDebtsFollowupTab({
  userId,
  currentUserName,
  bakeries,
  debts,
  payments,
  schedules,
  installments,
  todayRef,
  onCreateSchedulePlan,
  onRegisterPayment,
  onOpenBakeryProfile,
}: MajorDebtsFollowupTabProps) {
  const [thresholdSetting, setThresholdSetting] = useState<DebtThresholdSetting>(() =>
    loadDebtThresholdSetting()
  );

  // حقول تحرير إعداد الحد المالي
  const [inputThreshold, setInputThreshold] = useState<string>(
    String(thresholdSetting.thresholdAmountEgp)
  );
  const [inputWarnPct, setInputWarnPct] = useState<number>(
    thresholdSetting.warningApproachPercent
  );
  const [inputScopeType, setInputScopeType] = useState<MajorDebtScopeType>(
    thresholdSetting.scopeType
  );
  const [inputScopeValue, setInputScopeValue] = useState<string>(
    thresholdSetting.scopeTargetValue
  );
  const [inputRule, setInputRule] = useState<MajorDebtComparisonRule>(
    thresholdSetting.comparisonRule
  );
  const [inputNotes, setInputNotes] = useState<string>('');
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showOnlyExceeding, setShowOnlyExceeding] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [colorFilter, setColorFilter] = useState<string>('ALL');
  const [sortKey, setSortKey] = useState<string>('netCurrentDebtEgp');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [pinnedCols, setPinnedCols] = useState<string[]>([
    'serial',
    'bakeryNumber',
    'ownerName',
    'posNumber',
    'bakeryName',
  ]);
  const [printOpen, setPrintOpen] = useState<boolean>(false);

  // نافذة إنشاء خطة سداد مرنة (بحساب عدد الأقساط أو قيمة القسط + معالجة فروق التقريب)
  const [planTargetRow, setPlanTargetRow] = useState<AggregatedBakeryMajorDebtRow | null>(null);
  const [planCalculationMode, setPlanCalculationMode] = useState<'by_count' | 'by_amount'>('by_count');
  const [planFrequency, setPlanFrequency] = useState<string>('شهري');
  const [planDownPayment, setPlanDownPayment] = useState<number>(0);
  const [planInstallmentsCount, setPlanInstallmentsCount] = useState<number>(3);
  const [planInstallmentValue, setPlanInstallmentValue] = useState<number>(1000);
  const [planFirstDate, setPlanFirstDate] = useState<string>(todayRef);
  const [planDueDaysHint, setPlanDueDaysHint] = useState<string>('اليوم الأول من كل دورة');
  const [planResponsibleEmp, setPlanResponsibleEmp] = useState<string>(currentUserName);
  const [planApprovalState, setPlanApprovalState] = useState<'معتمد نشط' | 'مسودة'>('معتمد نشط');
  const [planNotes, setPlanNotes] = useState<string>('');
  const [planCustomDates, setPlanCustomDates] = useState<string[]>([]);
  const [planError, setPlanError] = useState<string>('');

  // نافذة جدول الأقساط المستقل وتسجيل دفعة موثقة
  const [inspectRowInstallments, setInspectRowInstallments] =
    useState<AggregatedBakeryMajorDebtRow | null>(null);
  const [payInstTarget, setPayInstTarget] = useState<DebtInstallmentRecord | null>(null);
  const [payAmountInput, setPayAmountInput] = useState<number>(0);
  const [payMethodInput, setPayMethodInput] = useState<string>('نقداً');
  const [payReceiptInput, setPayReceiptInput] = useState<string>('');
  const [payDateInput, setPayDateInput] = useState<string>(todayRef);
  const [payNotesInput, setPayNotesInput] = useState<string>('');
  const [payAllowOverdueException, setPayAllowOverdueException] = useState<boolean>(false);
  const [payFeedback, setPayFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const uniqueVillages = useMemo(
    () => Array.from(new Set(bakeries.map((b) => b.village).filter(Boolean))),
    [bakeries]
  );

  const handleSaveThresholdSetting = () => {
    const numVal = Math.max(0, Number(inputThreshold) || 0);
    const nowIso = new Date().toISOString();
    const nextHistory = [
      {
        id: `th-hist-${Date.now()}`,
        thresholdAmountEgp: numVal,
        warningApproachPercent: inputWarnPct,
        scopeType: inputScopeType,
        scopeTargetValue: inputScopeValue || 'جميع المخابز',
        comparisonRule: inputRule,
        changedBy: currentUserName,
        changedAt: nowIso,
        notes: inputNotes.trim() || 'تحديث الحد المالي للمديونية الكبرى',
      },
      ...thresholdSetting.history,
    ];
    const updated: DebtThresholdSetting = {
      thresholdAmountEgp: numVal,
      warningApproachPercent: inputWarnPct,
      scopeType: inputScopeType,
      scopeTargetValue: inputScopeValue || 'جميع المخابز',
      comparisonRule: inputRule,
      updatedBy: currentUserName,
      updatedAt: nowIso,
      history: nextHistory,
    };
    setThresholdSetting(updated);
    saveDebtThresholdSetting(updated);
    setInputNotes('');
  };

  // تجميع بيانات كافة المخابز وبناء جدول المديونيات الكبرى بـ ٢٦ عموداً
  const allMajorRows: AggregatedBakeryMajorDebtRow[] = useMemo(() => {
    const approvedDebts = debts.filter((d) => d.approvalStatus === 'معتمد');
    const th = thresholdSetting.thresholdAmountEgp;
    const warnFloor = round2(th * (thresholdSetting.warningApproachPercent / 100));

    return bakeries
      .filter((b) => {
        if (thresholdSetting.scopeType === 'village' && thresholdSetting.scopeTargetValue) {
          return b.village === thresholdSetting.scopeTargetValue;
        }
        if (thresholdSetting.scopeType === 'bakery' && thresholdSetting.scopeTargetValue) {
          return b.id === thresholdSetting.scopeTargetValue || b.name === thresholdSetting.scopeTargetValue;
        }
        return true;
      })
      .map((b, idx) => {
        const bDebts = approvedDebts.filter((d) => d.bakeryId === b.id);
        const bSchedules = schedules.filter(
          (s) => s.bakeryId === b.id && (s.status === 'معتمد نشط' || s.status === 'متعثر')
        );
        const bInsts = installments.filter(
          (i) => i.bakeryId === b.id && i.status !== 'ملغي بقرار معتمد'
        );
        const bPayments = payments.filter((p) => p.bakeryId === b.id && p.status === 'معتمد');

        const totalViolationsEgp = round2(
          bDebts.reduce((s, d) => s + d.originalAmount + d.priorViolationsAmount, 0)
        );
        const totalAdditionsEgp = round2(bDebts.reduce((s, d) => s + d.additionsAmount, 0));
        const totalDisposalsEgp = round2(bDebts.reduce((s, d) => s + d.disposalsAmount, 0));
        const totalPaidEgp = round2(bDebts.reduce((s, d) => s + d.totalPaidAmount, 0));
        const netCurrentDebtEgp = round2(
          bDebts.reduce((s, d) => s + d.remainingAmount, 0) || b.remainingDebtEgp || 0
        );

        const meetsThresholdRule =
          thresholdSetting.comparisonRule === 'gte'
            ? netCurrentDebtEgp >= th && netCurrentDebtEgp > 0
            : netCurrentDebtEgp > th;

        const exceedAmountEgp = Math.max(0, round2(netCurrentDebtEgp - th));

        const activePlan = bSchedules[0] || null;
        const openInsts = bInsts
          .filter((i) => i.remainingAmount > 0)
          .sort((x, y) => x.dueDate.localeCompare(y.dueDate));
        const hasLateInstallment =
          bInsts.some((i) => i.remainingAmount > 0 && i.dueDate < todayRef) ||
          bDebts.some((d) => d.remainingAmount > 0 && d.delayDays > 0);
        const hasRegularSchedule = Boolean(activePlan) && !hasLateInstallment && netCurrentDebtEgp > 0;

        // ألوان وتصنيفات المديونية الخمسة المطلوبة
        let colorClassKey: AggregatedBakeryMajorDebtRow['colorClassKey'] = 'green';
        let colorClassTitle = 'أقل من الحد المحدد';
        if (meetsThresholdRule && hasLateInstallment) {
          colorClassKey = 'dark_red';
          colorClassTitle = 'مديونية كبرى متأخرة عن السداد';
        } else if (meetsThresholdRule && hasRegularSchedule) {
          colorClassKey = 'blue';
          colorClassTitle = 'مديونية لديها جدول سداد منتظم';
        } else if (meetsThresholdRule) {
          colorClassKey = 'red';
          colorClassTitle = 'مديونية تجاوزت الحد المحدد';
        } else if (netCurrentDebtEgp >= warnFloor && netCurrentDebtEgp > 0) {
          colorClassKey = 'orange';
          colorClassTitle = 'اقتربت من الحد المحدد';
        } else if (hasRegularSchedule) {
          colorClassKey = 'blue';
          colorClassTitle = 'جدول سداد منتظم';
        }

        const paidInstsAmt = round2(bInsts.reduce((s, i) => s + i.paidAmount, 0));
        const remInstsAmt = round2(bInsts.reduce((s, i) => s + i.remainingAmount, 0));
        const lastPay = [...bPayments].sort((x, y) => y.paymentDate.localeCompare(x.paymentDate))[0];

        let paymentStatusLabel = 'مسدد / لا توجد مديونية';
        if (netCurrentDebtEgp > 0) {
          if (hasLateInstallment) paymentStatusLabel = 'متأخر عن السداد';
          else if (hasRegularSchedule) paymentStatusLabel = 'منتظم بجدول سداد';
          else if (totalPaidEgp > 0) paymentStatusLabel = 'مسدد جزئياً';
          else paymentStatusLabel = 'غير مسدد (بدون جدول)';
        }

        const primaryDebt =
          bDebts.find((d) => d.remainingAmount > 0) || bDebts[0] || null;

        return {
          serial: idx + 1,
          bakeryId: b.id,
          bakeryNumber: b.bakeryNumber,
          ownerName: b.ownerName,
          posNumber: b.posNumber,
          bakeryName: b.name,
          supplyBranchName: 'إدارة تموين مركز المحلة الكبرى',
          village: b.village,
          localUnit: b.localUnit,
          phone: b.phone,
          totalViolationsEgp,
          totalAdditionsEgp,
          totalDisposalsEgp,
          totalPaidEgp,
          netCurrentDebtEgp,
          thresholdAmountEgp: th,
          exceedAmountEgp,
          paymentSystemLabel: activePlan ? activePlan.scheduleType : 'بدون جدولة',
          installmentAmountEgp: activePlan ? activePlan.installmentAmount : 0,
          installmentsCount: activePlan ? activePlan.installmentsCount : bInsts.length,
          paidInstallmentsAmountEgp: paidInstsAmt,
          remainingInstallmentsAmountEgp: remInstsAmt,
          paymentStartDate: activePlan ? activePlan.firstInstallmentDate : bDebts[0]?.violationDate || '—',
          lastPaymentDate: lastPay?.paymentDate || bDebts[0]?.lastPaymentDate || '—',
          nextDueDate: openInsts[0]?.dueDate || bDebts[0]?.dueDate || '—',
          paymentStatusLabel,
          colorClassKey,
          colorClassTitle,
          primaryDebt,
          hasLateInstallment,
          hasRegularSchedule,
          meetsThresholdRule,
        };
      });
  }, [bakeries, debts, schedules, installments, payments, thresholdSetting, todayRef]);

  // البطاقات الإحصائية السبع أعلى الجدول
  const kpiStats = useMemo(() => {
    const majorOnes = allMajorRows.filter((r) => r.meetsThresholdRule);
    const totalMajorBakeries = majorOnes.length;
    const totalMajorDebtsValue = round2(
      majorOnes.reduce((s, r) => s + r.netCurrentDebtEgp, 0)
    );
    const totalCollectedValue = round2(
      allMajorRows.reduce((s, r) => s + r.totalPaidEgp, 0)
    );
    const totalRemainingValue = round2(
      allMajorRows.reduce((s, r) => s + r.netCurrentDebtEgp, 0)
    );
    const regularBakeriesCount = allMajorRows.filter((r) => r.hasRegularSchedule).length;
    const lateBakeriesCount = allMajorRows.filter((r) => r.hasLateInstallment).length;
    const dueInstallmentsCount = installments.filter(
      (i) => i.remainingAmount > 0 && i.status !== 'ملغي بقرار معتمد'
    ).length;

    return {
      totalMajorBakeries,
      totalMajorDebtsValue,
      totalCollectedValue,
      totalRemainingValue,
      regularBakeriesCount,
      lateBakeriesCount,
      dueInstallmentsCount,
    };
  }, [allMajorRows, installments]);

  const filteredRows = useMemo(() => {
    const q = normalizeSearchText(searchTerm);
    const list = allMajorRows.filter((r) => {
      if (showOnlyExceeding && !r.meetsThresholdRule) return false;
      if (colorFilter !== 'ALL' && r.colorClassKey !== colorFilter) return false;
      if (!q) return true;
      return normalizeSearchText(
        `${r.bakeryNumber} ${r.ownerName} ${r.posNumber} ${r.bakeryName} ${r.village} ${r.localUnit} ${r.phone} ${r.paymentStatusLabel}`
      ).includes(q);
    });

    return [...list].sort((a, b) =>
      compareTableValues(
        (a as unknown as Record<string, unknown>)[sortKey],
        (b as unknown as Record<string, unknown>)[sortKey],
        sortAsc
      )
    );
  }, [allMajorRows, showOnlyExceeding, colorFilter, searchTerm, sortKey, sortAsc]);

  // حساب الأقساط التلقائي في نافذة إنشاء خطة السداد (يدعم الطريقتين + معالجة فرق التقريب في القسط الأخير)
  const computedDraftPlan = useMemo(() => {
    if (!planTargetRow) return null;
    const totalDebt = planTargetRow.netCurrentDebtEgp;
    const netToSchedule = Math.max(0, round2(totalDebt - Math.max(0, planDownPayment)));
    if (netToSchedule <= 0) {
      return {
        totalDebt,
        netToSchedule: 0,
        count: 0,
        baseInstallment: 0,
        lastInstallment: 0,
        installments: [] as { serial: number; dueDate: string; amount: number }[],
      };
    }

    let count = Math.max(1, Math.floor(planInstallmentsCount || 1));
    let baseInstallment = 0;

    if (planCalculationMode === 'by_count') {
      baseInstallment = Math.floor((netToSchedule / count) * 100) / 100;
    } else {
      const requestedVal = Math.max(1, Number(planInstallmentValue) || netToSchedule);
      count = Math.max(1, Math.ceil(netToSchedule / requestedVal));
      baseInstallment = count === 1 ? netToSchedule : requestedVal;
    }

    const items: { serial: number; dueDate: string; amount: number }[] = [];
    let accumulated = 0;
    const baseDate = new Date(`${planFirstDate}T00:00:00Z`);

    for (let i = 0; i < count; i++) {
      const isLast = i === count - 1;
      const amt = isLast
        ? Math.max(0, round2(netToSchedule - accumulated))
        : Math.min(baseInstallment, round2(netToSchedule - accumulated));
      accumulated = round2(accumulated + amt);

      const d = new Date(baseDate.getTime());
      if (planFrequency === 'يومي') d.setUTCDate(d.getUTCDate() + i);
      else if (planFrequency === 'أسبوعي') d.setUTCDate(d.getUTCDate() + i * 7);
      else if (planFrequency === 'شهري') d.setUTCMonth(d.getUTCMonth() + i);
      else if (planFrequency === 'سنوي') d.setUTCFullYear(d.getUTCFullYear() + i);
      else if (planFrequency === 'دفعات بمواعيد مخصصة' && planCustomDates[i]) {
        items.push({ serial: i + 1, dueDate: planCustomDates[i], amount: amt });
        continue;
      } else {
        d.setUTCDate(d.getUTCDate() + i * 15);
      }

      items.push({
        serial: i + 1,
        dueDate: d.toISOString().slice(0, 10),
        amount: amt,
      });
    }

    return {
      totalDebt,
      netToSchedule,
      count: items.length,
      baseInstallment: items[0]?.amount || 0,
      lastInstallment: items[items.length - 1]?.amount || 0,
      installments: items,
    };
  }, [
    planTargetRow,
    planDownPayment,
    planCalculationMode,
    planInstallmentsCount,
    planInstallmentValue,
    planFrequency,
    planFirstDate,
    planCustomDates,
  ]);

  const handleOpenCreatePlan = useCallback(
    (row: AggregatedBakeryMajorDebtRow) => {
      setPlanTargetRow(row);
      setPlanDownPayment(0);
      setPlanCalculationMode('by_count');
      setPlanFrequency('شهري');
      setPlanInstallmentsCount(3);
      setPlanInstallmentValue(Math.max(500, round2(row.netCurrentDebtEgp / 3)));
      setPlanFirstDate(todayRef);
      setPlanResponsibleEmp(currentUserName);
      setPlanApprovalState('معتمد نشط');
      setPlanNotes('');
      setPlanError('');
    },
    [todayRef, currentUserName]
  );

  const handleConfirmCreatePlan = () => {
    if (!planTargetRow || !computedDraftPlan) return;
    if (!planTargetRow.primaryDebt) {
      setPlanError('يجب قيد مديونية معتمدة أولاً لهذا المخبز قبل إنشاء جدول سداد.');
      return;
    }
    if (computedDraftPlan.netToSchedule <= 0 || computedDraftPlan.installments.length === 0) {
      setPlanError('صافي المبلغ المراد جدولته يجب أن يكون أكبر من صفر.');
      return;
    }

    const mappedScheduleType: ScheduleFrequencyType =
      planFrequency === 'أسبوعي'
        ? 'سداد أسبوعي'
        : planFrequency === 'شهري'
        ? 'سداد شهري'
        : 'سداد بمواعيد مخصصة';

    const generatedInsts: DebtInstallmentRecord[] = generateInstallmentsDraft({
      scheduleId: 'sch-temp',
      scheduleNumber: 'DRAFT',
      debt: planTargetRow.primaryDebt,
      scheduledAmount: computedDraftPlan.netToSchedule,
      scheduleType: mappedScheduleType,
      firstInstallmentDate: planFirstDate,
      installmentsCount: computedDraftPlan.count,
    }).map((inst, idx) => ({
      ...inst,
      dueDate: computedDraftPlan.installments[idx]?.dueDate || inst.dueDate,
      amount: computedDraftPlan.installments[idx]?.amount ?? inst.amount,
      remainingAmount: computedDraftPlan.installments[idx]?.amount ?? inst.remainingAmount,
      paidAmount: 0, // قاعدة إلزامية: لا يعتبر القسط مسدداً بمجرد إدخال خطة السداد
    }));

    const res = onCreateSchedulePlan(
      {
        bakeryId: planTargetRow.bakeryId,
        bakeryName: planTargetRow.bakeryName,
        ownerName: planTargetRow.ownerName,
        posNumber: planTargetRow.posNumber,
        debtId: planTargetRow.primaryDebt.id,
        debtNumber: planTargetRow.primaryDebt.debtNumber,
        totalRemainingAtCreation: computedDraftPlan.totalDebt,
        downPayment: round2(planDownPayment),
        scheduledAmount: computedDraftPlan.netToSchedule,
        scheduleType: mappedScheduleType,
        startDate: todayRef,
        installmentsCount: computedDraftPlan.count,
        installmentAmount: computedDraftPlan.baseInstallment,
        firstInstallmentDate: computedDraftPlan.installments[0].dueDate,
        paymentDayHint: `${planFrequency} — ${planDueDaysHint}`,
        lastInstallmentDate:
          computedDraftPlan.installments[computedDraftPlan.installments.length - 1].dueDate,
        notes: planNotes.trim() || `خطة سداد (${planFrequency})`,
        responsibleUser: planResponsibleEmp,
        status: planApprovalState,
      },
      generatedInsts
    );

    if (!res.ok) {
      setPlanError(res.error || 'تعذر حفظ خطة السداد.');
      return;
    }
    setPlanTargetRow(null);
  };

  const renderColorBadge = (row: AggregatedBakeryMajorDebtRow) => {
    const map: Record<AggregatedBakeryMajorDebtRow['colorClassKey'], string> = {
      green: 'bg-emerald-100 text-emerald-950 border-emerald-400',
      orange: 'bg-amber-100 text-amber-950 border-amber-400',
      red: 'bg-red-100 text-red-950 border-red-400',
      dark_red: 'bg-red-950 text-white border-red-900',
      blue: 'bg-blue-100 text-blue-950 border-blue-400',
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-md text-[10px] font-black border whitespace-nowrap inline-block ${
          map[row.colorClassKey]
        }`}
      >
        {row.paymentStatusLabel} · {row.colorClassTitle}
      </span>
    );
  };

  const columns: SmartTableColumn<AggregatedBakeryMajorDebtRow>[] = useMemo(
    () => [
      {
        key: 'serial',
        label: 'م',
        headerText: 'مسلسل',
        type: 'numeric',
        sortable: true,
        render: (r) => <span className="num-cell font-black">{toArabicNumerals(r.serial)}</span>,
      },
      {
        key: 'bakeryNumber',
        label: 'رقم المخبز',
        headerText: 'رقم المخبز',
        type: 'numeric',
        sortable: true,
        render: (r) => (
          <span className="num-cell font-black text-[#102A43]">#{toArabicNumerals(r.bakeryNumber)}</span>
        ),
      },
      {
        key: 'ownerName',
        label: 'اسم صاحب المخبز',
        headerText: 'اسم صاحب المخبز',
        type: 'text',
        sortable: true,
        render: (r) => (
          <button
            type="button"
            onClick={() => onOpenBakeryProfile(r.bakeryId)}
            className="font-black text-[#102A43] hover:text-[#164E83] hover:underline cursor-pointer text-right"
          >
            {r.ownerName}
          </button>
        ),
      },
      {
        key: 'posNumber',
        label: 'رقم ماكينة POS',
        headerText: 'رقم ماكينة POS',
        type: 'numeric',
        sortable: true,
        render: (r) => (
          <button
            type="button"
            onClick={() => onOpenBakeryProfile(r.bakeryId)}
            className="num-cell font-black px-2 py-0.5 rounded bg-slate-100 hover:bg-[#102A43] hover:text-white text-[#102A43] cursor-pointer"
          >
            {toArabicNumerals(r.posNumber)}
          </button>
        ),
      },
      {
        key: 'bakeryName',
        label: 'اسم المخبز',
        headerText: 'اسم المخبز',
        type: 'text',
        sortable: true,
        render: (r) => (
          <button
            type="button"
            onClick={() => onOpenBakeryProfile(r.bakeryId)}
            className="font-black text-[#164E83] hover:underline cursor-pointer text-right"
          >
            {r.bakeryName}
          </button>
        ),
      },
      {
        key: 'supplyBranchName',
        label: 'الإدارة التموينية',
        headerText: 'الإدارة التموينية',
        type: 'text',
        sortable: true,
        render: (r) => <span className="font-bold text-slate-700">{r.supplyBranchName}</span>,
      },
      {
        key: 'village',
        label: 'القرية',
        headerText: 'القرية',
        type: 'text',
        sortable: true,
        render: (r) => <span className="font-bold">{r.village}</span>,
      },
      {
        key: 'localUnit',
        label: 'الوحدة المحلية',
        headerText: 'الوحدة المحلية',
        type: 'text',
        sortable: true,
        render: (r) => <span className="font-bold text-slate-600">{r.localUnit}</span>,
      },
      {
        key: 'phone',
        label: 'رقم الهاتف',
        headerText: 'رقم الهاتف',
        type: 'numeric',
        sortable: true,
        render: (r) => <span className="num-cell font-bold">{toArabicNumerals(r.phone)}</span>,
      },
      {
        key: 'totalViolationsEgp',
        label: 'إجمالي المخالفات',
        headerText: 'إجمالي المخالفات',
        type: 'currency',
        sortable: true,
        render: (r) => (
          <span className="num-cell font-black text-slate-800">
            {formatArabicCurrency(r.totalViolationsEgp)}
          </span>
        ),
      },
      {
        key: 'totalAdditionsEgp',
        label: 'إجمالي الإضافات',
        headerText: 'إجمالي الإضافات',
        type: 'currency',
        sortable: true,
        render: (r) => (
          <span className="num-cell font-bold text-amber-800">
            {formatArabicCurrency(r.totalAdditionsEgp)}
          </span>
        ),
      },
      {
        key: 'totalDisposalsEgp',
        label: 'إجمالي التصرفات',
        headerText: 'إجمالي التصرفات',
        type: 'currency',
        sortable: true,
        render: (r) => (
          <span className="num-cell font-bold text-purple-800">
            {formatArabicCurrency(r.totalDisposalsEgp)}
          </span>
        ),
      },
      {
        key: 'totalPaidEgp',
        label: 'إجمالي المسدد',
        headerText: 'إجمالي المسدد',
        type: 'currency',
        sortable: true,
        render: (r) => (
          <span className="num-cell font-black text-emerald-700">
            {formatArabicCurrency(r.totalPaidEgp)}
          </span>
        ),
      },
      {
        key: 'netCurrentDebtEgp',
        label: 'صافي المديونية الحالية',
        headerText: 'صافي المديونية الحالية',
        type: 'currency',
        sortable: true,
        render: (r) => (
          <span className="num-cell font-black text-red-700">
            {formatArabicCurrency(r.netCurrentDebtEgp)}
          </span>
        ),
      },
      {
        key: 'thresholdAmountEgp',
        label: 'الحد المالي المحدد',
        headerText: 'الحد المالي المحدد',
        type: 'currency',
        sortable: true,
        render: (r) => (
          <span className="num-cell font-bold text-slate-700">
            {formatArabicCurrency(r.thresholdAmountEgp)}
          </span>
        ),
      },
      {
        key: 'exceedAmountEgp',
        label: 'قيمة التجاوز عن الحد',
        headerText: 'قيمة التجاوز عن الحد',
        type: 'currency',
        sortable: true,
        render: (r) => (
          <span
            className={`num-cell font-black ${
              r.exceedAmountEgp > 0 ? 'text-red-800 bg-red-50 px-1.5 py-0.5 rounded' : 'text-slate-500'
            }`}
          >
            {formatArabicCurrency(r.exceedAmountEgp)}
          </span>
        ),
      },
      {
        key: 'paymentSystemLabel',
        label: 'نظام السداد',
        headerText: 'نظام السداد',
        type: 'text',
        sortable: true,
        render: (r) => <span className="font-black text-[#164E83]">{r.paymentSystemLabel}</span>,
      },
      {
        key: 'installmentAmountEgp',
        label: 'قيمة القسط',
        headerText: 'قيمة القسط',
        type: 'currency',
        sortable: true,
        render: (r) => (
          <span className="num-cell font-bold">
            {r.installmentAmountEgp > 0 ? formatArabicCurrency(r.installmentAmountEgp) : '—'}
          </span>
        ),
      },
      {
        key: 'installmentsCount',
        label: 'عدد الأقساط',
        headerText: 'عدد الأقساط',
        type: 'numeric',
        sortable: true,
        render: (r) => (
          <span className="num-cell font-black">{toArabicNumerals(r.installmentsCount)}</span>
        ),
      },
      {
        key: 'paidInstallmentsAmountEgp',
        label: 'قيمة الأقساط المسددة',
        headerText: 'قيمة الأقساط المسددة',
        type: 'currency',
        sortable: true,
        render: (r) => (
          <span className="num-cell font-bold text-emerald-700">
            {formatArabicCurrency(r.paidInstallmentsAmountEgp)}
          </span>
        ),
      },
      {
        key: 'remainingInstallmentsAmountEgp',
        label: 'قيمة الأقساط المتبقية',
        headerText: 'قيمة الأقساط المتبقية',
        type: 'currency',
        sortable: true,
        render: (r) => (
          <span className="num-cell font-bold text-amber-900">
            {formatArabicCurrency(r.remainingInstallmentsAmountEgp)}
          </span>
        ),
      },
      {
        key: 'paymentStartDate',
        label: 'تاريخ بداية السداد',
        headerText: 'تاريخ بداية السداد',
        type: 'date',
        sortable: true,
        render: (r) => (
          <span className="num-cell font-bold">
            {r.paymentStartDate !== '—' ? formatDateArabic(r.paymentStartDate) : '—'}
          </span>
        ),
      },
      {
        key: 'lastPaymentDate',
        label: 'تاريخ آخر دفعة',
        headerText: 'تاريخ آخر دفعة',
        type: 'date',
        sortable: true,
        render: (r) => (
          <span className="num-cell font-bold">
            {r.lastPaymentDate !== '—' ? formatDateArabic(r.lastPaymentDate) : '—'}
          </span>
        ),
      },
      {
        key: 'nextDueDate',
        label: 'تاريخ الاستحقاق القادم',
        headerText: 'تاريخ الاستحقاق القادم',
        type: 'date',
        sortable: true,
        render: (r) => (
          <span className="num-cell font-black text-[#102A43]">
            {r.nextDueDate !== '—' ? formatDateArabic(r.nextDueDate) : '—'}
          </span>
        ),
      },
      {
        key: 'paymentStatusLabel',
        label: 'حالة السداد والتصنيف',
        headerText: 'حالة السداد والتصنيف',
        type: 'badge',
        sortable: true,
        render: (r) => renderColorBadge(r),
      },
      {
        key: 'actions',
        label: 'الإجراءات',
        headerText: 'الإجراءات',
        type: 'actions',
        render: (r) => (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleOpenCreatePlan(r)}
              className="px-2 py-1 rounded bg-[#164E83] hover:bg-[#102A43] text-white text-[10px] font-black flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <CalendarPlus className="w-3 h-3" />
              <span>إنشاء جدول سداد</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setInspectRowInstallments(r);
                setPayFeedback(null);
              }}
              className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-black flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <CreditCard className="w-3 h-3" />
              <span>الأقساط والسداد</span>
            </button>
          </div>
        ),
      },
    ],
    [onOpenBakeryProfile, handleOpenCreatePlan]
  );

  const handleExportExcel = () => {
    exportCsvUtf8Bom(
      `المديونيات_الكبرى_والمتابعة_المالية_${todayRef}`,
      [
        'مسلسل',
        'رقم المخبز',
        'اسم صاحب المخبز',
        'رقم ماكينة POS',
        'اسم المخبز',
        'الإدارة التموينية',
        'القرية',
        'الوحدة المحلية',
        'رقم الهاتف',
        'إجمالي المخالفات',
        'إجمالي الإضافات',
        'إجمالي التصرفات',
        'إجمالي المسدد',
        'صافي المديونية الحالية',
        'الحد المالي المحدد',
        'قيمة التجاوز عن الحد',
        'نظام السداد',
        'قيمة القسط',
        'عدد الأقساط',
        'قيمة الأقساط المسددة',
        'قيمة الأقساط المتبقية',
        'تاريخ بداية السداد',
        'تاريخ آخر دفعة',
        'تاريخ الاستحقاق القادم',
        'حالة السداد',
      ],
      filteredRows.map((r) => [
        r.serial,
        r.bakeryNumber,
        r.ownerName,
        r.posNumber,
        r.bakeryName,
        r.supplyBranchName,
        r.village,
        r.localUnit,
        r.phone,
        r.totalViolationsEgp,
        r.totalAdditionsEgp,
        r.totalDisposalsEgp,
        r.totalPaidEgp,
        r.netCurrentDebtEgp,
        r.thresholdAmountEgp,
        r.exceedAmountEgp,
        r.paymentSystemLabel,
        r.installmentAmountEgp,
        r.installmentsCount,
        r.paidInstallmentsAmountEgp,
        r.remainingInstallmentsAmountEgp,
        r.paymentStartDate,
        r.lastPaymentDate,
        r.nextDueDate,
        `${r.paymentStatusLabel} (${r.colorClassTitle})`,
      ])
    );
  };

  return (
    <div className="space-y-4">
      {/* ١. إعداد الحد المالي للمديونية الكبرى مع سجل القيم التاريخي */}
      <div className="bg-white rounded-2xl border-2 border-[#102A43]/20 p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#102A43] text-[#C6A15B] flex items-center justify-center">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#102A43]">
                إعداد «حد المديونية الكبرى» وقواعد المقارنة والنطاق
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                آخر تحديث بواسطة: <span className="text-[#164E83]">{thresholdSetting.updatedBy}</span> — بتاريخ:{' '}
                <span className="num-cell">{formatDateArabic(thresholdSetting.updatedAt.slice(0, 10))}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#102A43] text-[11px] font-black flex items-center gap-1.5 cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-[#164E83]" />
            <span>السجل التاريخي لتغييرات الحد ({toArabicNumerals(thresholdSetting.history.length)})</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
          <div>
            <label className="block font-black text-slate-700 mb-1">
              الحد المالي للمديونية الكبرى (ج.م)
            </label>
            <input
              type="number"
              min={0}
              step="100"
              value={inputThreshold}
              onChange={(e) => setInputThreshold(e.target.value)}
              placeholder="مثال: 100000"
              className="num-cell w-full px-3 py-1.5 rounded-xl border border-slate-300 font-black text-[#102A43] bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-black text-slate-700 mb-1">قاعدة بدء التصنيف</label>
            <select
              value={inputRule}
              onChange={(e) => setInputRule(e.target.value as MajorDebtComparisonRule)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 font-bold bg-white"
            >
              <option value="gte">عند المساواة بالحد أو تجاوزه (≥)</option>
              <option value="gt">عند تجاوز الحد المالي فقط (&gt;)</option>
            </select>
          </div>

          <div>
            <label className="block font-black text-slate-700 mb-1">نسبة تنبيه الاقتراب (٪)</label>
            <input
              type="number"
              min={50}
              max={99}
              value={inputWarnPct}
              onChange={(e) => setInputWarnPct(Number(e.target.value) || 80)}
              className="num-cell w-full px-3 py-1.5 rounded-xl border border-slate-300 font-black"
            />
          </div>

          <div>
            <label className="block font-black text-slate-700 mb-1">نطاق تطبيق الحد</label>
            <select
              value={inputScopeType}
              onChange={(e) => {
                const next = e.target.value as MajorDebtScopeType;
                setInputScopeType(next);
                if (next === 'all') setInputScopeValue('جميع المخابز');
                else if (next === 'branch') setInputScopeValue('إدارة تموين مركز المحلة الكبرى');
                else if (next === 'village') setInputScopeValue(uniqueVillages[0] || '');
                else setInputScopeValue(bakeries[0]?.id || '');
              }}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 font-bold bg-white"
            >
              <option value="all">جميع المخابز</option>
              <option value="branch">إدارة تموين محددة</option>
              <option value="village">قرية محددة</option>
              <option value="bakery">مخبز محدد</option>
            </select>
          </div>

          <div>
            <label className="block font-black text-slate-700 mb-1">الجهة / القرية / المخبز</label>
            {inputScopeType === 'village' ? (
              <select
                value={inputScopeValue}
                onChange={(e) => setInputScopeValue(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 font-bold bg-white"
              >
                {uniqueVillages.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            ) : inputScopeType === 'bakery' ? (
              <select
                value={inputScopeValue}
                onChange={(e) => setInputScopeValue(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 font-bold bg-white"
              >
                {bakeries.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.posNumber})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={inputScopeValue}
                onChange={(e) => setInputScopeValue(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-bold bg-slate-50"
              />
            )}
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleSaveThresholdSetting}
              className="w-full py-2 px-3 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] font-black cursor-pointer transition-colors"
            >
              اعتماد وحفظ الحد المالي
            </button>
          </div>
        </div>
      </div>

      {/* ٢. البطاقات الإحصائية السبع للمديونيات الكبرى */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <div className="bg-[#102A43] text-white p-3 rounded-xl border border-[#164E83]">
          <span className="text-[10.5px] font-bold text-slate-300 block">
            مخابز المديونيات الكبرى
          </span>
          <span className="num-cell text-lg font-black text-[#C6A15B]">
            {toArabicNumerals(kpiStats.totalMajorBakeries)} مخبز
          </span>
        </div>
        <div className="bg-red-900 text-white p-3 rounded-xl border border-red-800">
          <span className="text-[10.5px] font-bold text-red-200 block">
            قيمة المديونيات الكبرى
          </span>
          <span className="num-cell text-sm font-black">
            {formatArabicCurrency(kpiStats.totalMajorDebtsValue)}
          </span>
        </div>
        <div className="bg-emerald-900 text-white p-3 rounded-xl border border-emerald-800">
          <span className="text-[10.5px] font-bold text-emerald-200 block">
            إجمالي المبالغ المحصلة
          </span>
          <span className="num-cell text-sm font-black">
            {formatArabicCurrency(kpiStats.totalCollectedValue)}
          </span>
        </div>
        <div className="bg-amber-900 text-white p-3 rounded-xl border border-amber-800">
          <span className="text-[10.5px] font-bold text-amber-200 block">
            إجمالي المبالغ المتبقية
          </span>
          <span className="num-cell text-sm font-black">
            {formatArabicCurrency(kpiStats.totalRemainingValue)}
          </span>
        </div>
        <div className="bg-blue-900 text-white p-3 rounded-xl border border-blue-800">
          <span className="text-[10.5px] font-bold text-blue-200 block">
            المخابز المنتظمة في السداد
          </span>
          <span className="num-cell text-lg font-black">
            {toArabicNumerals(kpiStats.regularBakeriesCount)}
          </span>
        </div>
        <div className="bg-rose-950 text-white p-3 rounded-xl border border-rose-900">
          <span className="text-[10.5px] font-bold text-rose-200 block">
            المخابز المتأخرة عن السداد
          </span>
          <span className="num-cell text-lg font-black">
            {toArabicNumerals(kpiStats.lateBakeriesCount)}
          </span>
        </div>
        <div className="bg-[#164E83] text-white p-3 rounded-xl border border-blue-700">
          <span className="text-[10.5px] font-bold text-blue-200 block">
            الأقساط المستحقة المفتوحة
          </span>
          <span className="num-cell text-lg font-black text-[#C6A15B]">
            {toArabicNumerals(kpiStats.dueInstallmentsCount)} قسط
          </span>
        </div>
      </div>

      {/* ٣. شريط ألوان وتصنيفات المديونية والبحث والتصدير */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-black">
            <button
              type="button"
              onClick={() => setColorFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg border cursor-pointer ${
                colorFilter === 'ALL'
                  ? 'bg-[#102A43] text-white border-[#102A43]'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              جميع التصنيفات ({toArabicNumerals(allMajorRows.length)})
            </button>
            <button
              type="button"
              onClick={() => setColorFilter('green')}
              className={`px-2.5 py-1 rounded-lg border cursor-pointer ${
                colorFilter === 'green'
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-emerald-50 text-emerald-950 border-emerald-300'
              }`}
            >
              أخضر: أقل من الحد
            </button>
            <button
              type="button"
              onClick={() => setColorFilter('orange')}
              className={`px-2.5 py-1 rounded-lg border cursor-pointer ${
                colorFilter === 'orange'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-amber-50 text-amber-950 border-amber-300'
              }`}
            >
              برتقالي: اقتربت من الحد
            </button>
            <button
              type="button"
              onClick={() => setColorFilter('red')}
              className={`px-2.5 py-1 rounded-lg border cursor-pointer ${
                colorFilter === 'red'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-red-50 text-red-950 border-red-300'
              }`}
            >
              أحمر: تجاوزت الحد المحدد
            </button>
            <button
              type="button"
              onClick={() => setColorFilter('dark_red')}
              className={`px-2.5 py-1 rounded-lg border cursor-pointer ${
                colorFilter === 'dark_red'
                  ? 'bg-red-950 text-white border-red-950'
                  : 'bg-red-900/15 text-red-950 border-red-400'
              }`}
            >
              أحمر داكن: كبرى متأخرة
            </button>
            <button
              type="button"
              onClick={() => setColorFilter('blue')}
              className={`px-2.5 py-1 rounded-lg border cursor-pointer ${
                colorFilter === 'blue'
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'bg-blue-50 text-blue-950 border-blue-300'
              }`}
            >
              أزرق: جدول سداد منتظم
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-[11px] font-black text-[#102A43] cursor-pointer bg-slate-100 px-3 py-1.5 rounded-xl">
              <input
                type="checkbox"
                checked={showOnlyExceeding}
                onChange={(e) => setShowOnlyExceeding(e.target.checked)}
              />
              <span>إظهار المتجاوزين للحد فقط</span>
            </label>
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير Excel</span>
            </button>
            <button
              type="button"
              onClick={() => setPrintOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-[11px] font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة تقرير A4</span>
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث برقم المخبز أو صاحب المخبز أو رقم ماكينة POS أو القرية أو الهاتف..."
            className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50 focus:bg-white"
          />
        </div>

        <SmartAutoFitTable
          tableId="major_debts_followup_table"
          userId={userId}
          rows={filteredRows}
          totalCount={allMajorRows.length}
          getRowId={(r) => r.bakeryId}
          columns={columns}
          sortKey={sortKey}
          sortAsc={sortAsc}
          onSort={(k) => {
            if (sortKey === k) setSortAsc(!sortAsc);
            else {
              setSortKey(k);
              setSortAsc(false);
            }
          }}
          pinnedKeys={pinnedCols}
          onPinAll={() =>
            setPinnedCols(['serial', 'bakeryNumber', 'ownerName', 'posNumber', 'bakeryName'])
          }
          onUnpinAll={() => setPinnedCols([])}
          onTogglePinColumn={(k) =>
            setPinnedCols((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]))
          }
          onResetPinDefaults={() =>
            setPinnedCols(['serial', 'bakeryNumber', 'ownerName', 'posNumber', 'bakeryName'])
          }
          emptyMessage="لا توجد سجلات مديونيات مطابقة لشروط البحث الحالية."
        />
      </div>

      {/* ٤. نافذة إنشاء جدول سداد مرن (بطريقتين: تحديد قيمة القسط أو تحديد عدد الأقساط + معالجة فروق التقريب) */}
      {planTargetRow && computedDraftPlan && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setPlanTargetRow(null)}
        >
          <div
            className="bg-white rounded-2xl border-2 border-[#102A43] shadow-2xl max-w-3xl w-full overflow-hidden my-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#102A43] text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10.5px] font-black text-[#C6A15B] block">
                  إعداد خطة سداد وجدولة مديونية — POS: {toArabicNumerals(planTargetRow.posNumber)}
                </span>
                <h3 className="text-sm sm:text-base font-black">
                  {planTargetRow.bakeryName} — صاحب المخبز: {planTargetRow.ownerName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPlanTargetRow(null)}
                className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {planError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-red-900 font-black">
                  {planError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 font-bold block">إجمالي المديونية الحالية</span>
                  <span className="num-cell text-base font-black text-red-700">
                    {formatArabicCurrency(computedDraftPlan.totalDebt)}
                  </span>
                </div>
                <div>
                  <label className="text-slate-600 font-black block mb-1">
                    المبلغ المسدد مقدماً (إن وجد)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={computedDraftPlan.totalDebt}
                    value={planDownPayment}
                    onChange={(e) => setPlanDownPayment(Number(e.target.value) || 0)}
                    className="num-cell w-full px-2.5 py-1 rounded-lg border border-slate-300 font-black bg-white"
                  />
                </div>
                <div>
                  <span className="text-slate-500 font-bold block">صافي المبلغ المراد جدولته</span>
                  <span className="num-cell text-base font-black text-[#164E83]">
                    {formatArabicCurrency(computedDraftPlan.netToSchedule)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block font-black text-slate-700 mb-1">دورية السداد</label>
                  <select
                    value={planFrequency}
                    onChange={(e) => setPlanFrequency(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-bold"
                  >
                    <option value="يومي">يومي</option>
                    <option value="أسبوعي">أسبوعي</option>
                    <option value="شهري">شهري</option>
                    <option value="سنوي">سنوي</option>
                    <option value="دفعات بمواعيد مخصصة">دفعات بمواعيد مخصصة يحددها المستخدم</option>
                  </select>
                </div>

                <div>
                  <label className="block font-black text-slate-700 mb-1">طريقة الحساب التلقائي</label>
                  <select
                    value={planCalculationMode}
                    onChange={(e) =>
                      setPlanCalculationMode(e.target.value as 'by_count' | 'by_amount')
                    }
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-bold"
                  >
                    <option value="by_count">تحديد عدد الأقساط ← يحسب قيمة القسط</option>
                    <option value="by_amount">تحديد قيمة القسط ← يحسب عدد الأقساط</option>
                  </select>
                </div>

                {planCalculationMode === 'by_count' ? (
                  <div>
                    <label className="block font-black text-slate-700 mb-1">
                      عدد الأقساط المطلوب
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={planInstallmentsCount}
                      onChange={(e) => setPlanInstallmentsCount(Math.max(1, Number(e.target.value) || 1))}
                      className="num-cell w-full px-3 py-1.5 rounded-xl border border-slate-300 font-black"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block font-black text-slate-700 mb-1">
                      قيمة القسط المطلوبة (ج.م)
                    </label>
                    <input
                      type="number"
                      min={100}
                      step={100}
                      value={planInstallmentValue}
                      onChange={(e) =>
                        setPlanInstallmentValue(Math.max(1, Number(e.target.value) || 500))
                      }
                      className="num-cell w-full px-3 py-1.5 rounded-xl border border-slate-300 font-black"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-black text-slate-700 mb-1">تاريخ أول قسط</label>
                  <input
                    type="date"
                    value={planFirstDate}
                    onChange={(e) => setPlanFirstDate(e.target.value)}
                    className="num-cell w-full px-3 py-1.5 rounded-xl border border-slate-300 font-black"
                  />
                </div>

                <div>
                  <label className="block font-black text-slate-700 mb-1">أيام الاستحقاق</label>
                  <input
                    type="text"
                    value={planDueDaysHint}
                    onChange={(e) => setPlanDueDaysHint(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-black text-slate-700 mb-1">
                    الموظف المسؤول عن المتابعة
                  </label>
                  <input
                    type="text"
                    value={planResponsibleEmp}
                    onChange={(e) => setPlanResponsibleEmp(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
              </div>

              {/* معاينة جدول الأقساط المتولد مع تسوية فرق التقريب في القسط الأخير */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-black text-[#102A43]">
                    جدول الأقساط المتولد ({toArabicNumerals(computedDraftPlan.count)} أقساط) — القسط الأخير يعالج فروق التقريب تلقائياً
                  </span>
                  <span className="num-cell font-black text-emerald-800">
                    إجمالي الأقساط: {formatArabicCurrency(
                      computedDraftPlan.installments.reduce((s, i) => s + i.amount, 0)
                    )}
                  </span>
                </div>
                <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-lg bg-white">
                  <table className="w-full text-right text-[11px]">
                    <thead className="bg-[#102A43] text-white">
                      <tr>
                        <th className="p-2">رقم القسط</th>
                        <th className="p-2">تاريخ الاستحقاق</th>
                        <th className="p-2">قيمة القسط المستحق</th>
                        <th className="p-2">حالة القسط عند الإنشاء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {computedDraftPlan.installments.map((item, idx) => (
                        <tr key={item.serial} className="border-b border-slate-100">
                          <td className="p-2 num-cell font-black">
                            قسط #{toArabicNumerals(item.serial)}
                          </td>
                          <td className="p-2 num-cell font-bold">
                            {planFrequency === 'دفعات بمواعيد مخصصة' ? (
                              <input
                                type="date"
                                value={planCustomDates[idx] || item.dueDate}
                                onChange={(e) => {
                                  const next = [...planCustomDates];
                                  next[idx] = e.target.value;
                                  setPlanCustomDates(next);
                                }}
                                className="px-2 py-0.5 border border-slate-300 rounded text-[11px]"
                              />
                            ) : (
                              formatDateArabic(item.dueDate)
                            )}
                          </td>
                          <td className="p-2 num-cell font-black text-[#164E83]">
                            {formatArabicCurrency(item.amount)}
                          </td>
                          <td className="p-2 font-bold text-slate-600">
                            لم يستحق (لا يعتبر مسدداً إلا بحركة سداد موثقة)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPlanTargetRow(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-black cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCreatePlan}
                  className="px-5 py-2 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] font-black cursor-pointer"
                >
                  اعتماد وإنشاء جدول السداد
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ٥. نافذة جدول الأقساط المستقل وتسجيل دفعة سداد موثقة */}
      {inspectRowInstallments && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setInspectRowInstallments(null)}
        >
          <div
            className="bg-white rounded-2xl border-2 border-[#102A43] shadow-2xl max-w-4xl w-full overflow-hidden my-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#102A43] text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10.5px] font-black text-[#C6A15B] block">
                  جدول الأقساط المستقل وحركات التحصيل — POS: {toArabicNumerals(inspectRowInstallments.posNumber)}
                </span>
                <h3 className="text-sm sm:text-base font-black">
                  {inspectRowInstallments.bakeryName} — {inspectRowInstallments.ownerName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectRowInstallments(null)}
                className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {payFeedback && (
                <div
                  className={`p-3 rounded-xl font-black ${
                    payFeedback.ok
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-950'
                      : 'bg-red-50 border border-red-300 text-red-950'
                  }`}
                >
                  {payFeedback.msg}
                </div>
              )}

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-right text-[11px]">
                  <thead className="bg-[#102A43] text-white">
                    <tr>
                      <th className="p-2">رقم القسط</th>
                      <th className="p-2">تاريخ الاستحقاق</th>
                      <th className="p-2">قيمة القسط المستحق</th>
                      <th className="p-2">المبلغ المدفوع</th>
                      <th className="p-2">المتبقي من القسط</th>
                      <th className="p-2">تاريخ السداد الفعلي</th>
                      <th className="p-2">طريقة الدفع</th>
                      <th className="p-2">رقم الإيصال</th>
                      <th className="p-2">حالة القسط</th>
                      <th className="p-2">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installments
                      .filter((i) => i.bakeryId === inspectRowInstallments.bakeryId)
                      .map((inst) => (
                        <tr key={inst.id} className="border-b border-slate-100">
                          <td className="p-2 num-cell font-black">
                            قسط #{toArabicNumerals(inst.installmentSerial)}
                          </td>
                          <td className="p-2 num-cell font-bold">{formatDateArabic(inst.dueDate)}</td>
                          <td className="p-2 num-cell font-black">
                            {formatArabicCurrency(inst.amount)}
                          </td>
                          <td className="p-2 num-cell font-black text-emerald-700">
                            {formatArabicCurrency(inst.paidAmount)}
                          </td>
                          <td className="p-2 num-cell font-black text-red-700">
                            {formatArabicCurrency(inst.remainingAmount)}
                          </td>
                          <td className="p-2 num-cell">
                            {inst.actualPaidDate ? formatDateArabic(inst.actualPaidDate) : '—'}
                          </td>
                          <td className="p-2 font-bold">{inst.paymentMethod || '—'}</td>
                          <td className="p-2 num-cell font-bold">
                            {inst.receiptNumber ? toArabicNumerals(inst.receiptNumber) : '—'}
                          </td>
                          <td className="p-2 font-black">{inst.status}</td>
                          <td className="p-2">
                            {inst.remainingAmount > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPayInstTarget(inst);
                                  setPayAmountInput(inst.remainingAmount);
                                  setPayReceiptInput(`REC-${Math.floor(10000 + Math.random() * 89999)}`);
                                }}
                                className="px-2 py-1 rounded bg-emerald-700 text-white font-black text-[10px] cursor-pointer"
                              >
                                سداد القسط
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {payInstTarget && (
                <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-300 space-y-3">
                  <h4 className="font-black text-emerald-950">
                    تسجيل حركة سداد موثقة على القسط #{toArabicNumerals(payInstTarget.installmentSerial)}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block font-black mb-1">المبلغ المدفوع (ج.م)</label>
                      <input
                        type="number"
                        min={1}
                        value={payAmountInput}
                        onChange={(e) => setPayAmountInput(Number(e.target.value) || 0)}
                        className="num-cell w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-black bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-black mb-1">طريقة السداد</label>
                      <select
                        value={payMethodInput}
                        onChange={(e) => setPayMethodInput(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white"
                      >
                        <option value="نقداً">نقداً</option>
                        <option value="تحويل بنكي">تحويل بنكي</option>
                        <option value="إنستاباي">إنستاباي</option>
                        <option value="فودافون كاش">فودافون كاش</option>
                        <option value="دفع إلكتروني">دفع إلكتروني</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-black mb-1">رقم الإيصال الموحد (منع التكرار)</label>
                      <input
                        type="text"
                        value={payReceiptInput}
                        onChange={(e) => setPayReceiptInput(e.target.value)}
                        className="num-cell w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-black bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-black mb-1">تاريخ السداد الفعلي</label>
                      <input
                        type="date"
                        value={payDateInput}
                        onChange={(e) => setPayDateInput(e.target.value)}
                        className="num-cell w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-black bg-white"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={payAllowOverdueException}
                        onChange={(e) => setPayAllowOverdueException(e.target.checked)}
                      />
                      <span>صلاحية استثنائية موثقة لتسوية المبالغ المتجاوزة</span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPayInstTarget(null)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-black cursor-pointer"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const res = onRegisterPayment({
                            debtId: payInstTarget.debtId,
                            paymentDate: payDateInput,
                            amount: payAmountInput,
                            paymentKind: payAllowOverdueException ? 'تسوية / رد معتمد' : 'دفعة قسط',
                            paymentMethod: payMethodInput,
                            receiptNumber: payReceiptInput,
                            collectionAuthority: 'خزينة إدارة تموين مركز المحلة الكبرى',
                            installmentId: payInstTarget.id,
                            notes: payNotesInput || `سداد قسط #${payInstTarget.installmentSerial}`,
                          });
                          if (!res.ok) {
                            setPayFeedback({ ok: false, msg: res.error || 'تعذر تسجيل الدفعة.' });
                          } else {
                            setPayFeedback({
                              ok: true,
                              msg: `تم توثيق السداد بإيصال ${payReceiptInput} وتحديث المتبقي تلقائياً.`,
                            });
                            setPayInstTarget(null);
                          }
                        }}
                        className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-black cursor-pointer"
                      >
                        تأكيد وقيد الإيصال
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ٦. نافذة السجل التاريخي لتغييرات حد المديونية الكبرى */}
      {showHistoryModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            className="bg-white rounded-2xl border-2 border-[#102A43] shadow-2xl max-w-2xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#102A43] text-white px-5 py-3 flex items-center justify-between">
              <h3 className="text-sm font-black">
                السجل التاريخي لقيم وتغييرات «حد المديونية الكبرى»
              </h3>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded bg-white/15 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 font-black text-[#102A43]">
                  <tr>
                    <th className="p-2">التاريخ</th>
                    <th className="p-2">الحد المالي</th>
                    <th className="p-2">القاعدة والنطاق</th>
                    <th className="p-2">المستخدم</th>
                    <th className="p-2">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {thresholdSetting.history.map((h) => (
                    <tr key={h.id} className="border-b border-slate-100">
                      <td className="p-2 num-cell font-bold">
                        {formatDateArabic(h.changedAt.slice(0, 10))}
                      </td>
                      <td className="p-2 num-cell font-black text-red-700">
                        {formatArabicCurrency(h.thresholdAmountEgp)}
                      </td>
                      <td className="p-2 font-bold">
                        {h.comparisonRule === 'gte' ? '≥ المساواة أو التجاوز' : '> التجاوز'} ({h.scopeTargetValue})
                      </td>
                      <td className="p-2 font-black text-[#164E83]">{h.changedBy}</td>
                      <td className="p-2 text-slate-600">{h.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ٧. نافذة طباعة تقرير المديونيات الكبرى A4 */}
      <OfficialPrintModal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        title="تقرير المديونيات الكبرى والمتابعة المالية للمخابز"
        subtitle={`الحد المالي المعتمد: ${formatArabicCurrency(thresholdSetting.thresholdAmountEgp)}`}
        docNumber={`MAJ-${todayRef}`}
        printedBy={currentUserName}
        todayRef={todayRef}
      >
        <table className="w-full text-right text-[10px] border-collapse border border-slate-300">
          <thead className="bg-slate-100 font-black">
            <tr>
              <th className="border border-slate-300 p-1.5">م</th>
              <th className="border border-slate-300 p-1.5">رقم المخبز</th>
              <th className="border border-slate-300 p-1.5">صاحب المخبز</th>
              <th className="border border-slate-300 p-1.5">POS</th>
              <th className="border border-slate-300 p-1.5">اسم المخبز</th>
              <th className="border border-slate-300 p-1.5">القرية</th>
              <th className="border border-slate-300 p-1.5">المسدد</th>
              <th className="border border-slate-300 p-1.5">صافي المديونية</th>
              <th className="border border-slate-300 p-1.5">التجاوز عن الحد</th>
              <th className="border border-slate-300 p-1.5">حالة السداد</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => (
              <tr key={r.bakeryId}>
                <td className="border border-slate-300 p-1.5 num-cell">{toArabicNumerals(r.serial)}</td>
                <td className="border border-slate-300 p-1.5 num-cell">{toArabicNumerals(r.bakeryNumber)}</td>
                <td className="border border-slate-300 p-1.5 font-bold">{r.ownerName}</td>
                <td className="border border-slate-300 p-1.5 num-cell">{toArabicNumerals(r.posNumber)}</td>
                <td className="border border-slate-300 p-1.5 font-black">{r.bakeryName}</td>
                <td className="border border-slate-300 p-1.5">{r.village}</td>
                <td className="border border-slate-300 p-1.5 num-cell">{formatArabicCurrency(r.totalPaidEgp)}</td>
                <td className="border border-slate-300 p-1.5 num-cell font-black">{formatArabicCurrency(r.netCurrentDebtEgp)}</td>
                <td className="border border-slate-300 p-1.5 num-cell">{formatArabicCurrency(r.exceedAmountEgp)}</td>
                <td className="border border-slate-300 p-1.5">{r.paymentStatusLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </OfficialPrintModal>
    </div>
  );
}
