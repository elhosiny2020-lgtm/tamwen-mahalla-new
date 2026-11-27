'use client';

import React, { useMemo, useState } from 'react';
import {
  Calculator,
  Scale,
  AlertTriangle,
  ShieldCheck,
  Printer,
  Link2,
  BookMarked,
  PlusCircle,
  CheckCircle2,
  XCircle,
  FileWarning,
  X,
} from 'lucide-react';
import {
  BakeryDebtRecord,
  BakeryRecord,
  BakeryViolationRecord,
  DebtApprovalStatus,
  DebtModuleSettings,
  ViolationAppealRecord,
  ViolationBreadCategory,
  ViolationLegalVersion,
  ViolationRuleConfig,
} from '@/types';
import {
  calculateViolationPenalty,
  round2,
} from '@/lib/debts-engine';
import {
  compareTableValues,
  formatArabicCurrency,
  formatArabicDecimal,
  formatArabicNumber,
  formatDateArabic,
  normalizeSearchText,
  toArabicNumerals,
} from '@/lib/utils';
import SmartAutoFitTable, { SmartTableColumn } from '@/components/SmartAutoFitTable';
import ViolationCalculator, { WeightShortageCalculationOutput } from '@/components/ViolationCalculator';
import { ApprovalStatusBadge, OfficialPrintModal } from './DebtsSharedUi';

interface ViolationsCalculatorTabProps {
  userId: string;
  currentUserName: string;
  bakeries: BakeryRecord[];
  rules: ViolationRuleConfig[];
  legalVersions: ViolationLegalVersion[];
  violations: BakeryViolationRecord[];
  appeals: ViolationAppealRecord[];
  debts: BakeryDebtRecord[];
  settings: DebtModuleSettings;
  todayRef: string;
  onSaveViolation: (
    payload: Omit<BakeryViolationRecord, 'id' | 'violationNumber' | 'createdAt'>,
    autoLinkToDebt?: boolean
  ) => void;
  onChangeViolationStatus: (id: string, status: DebtApprovalStatus, reason?: string) => void;
  onLinkViolationToDebt: (violation: BakeryViolationRecord) => { ok: boolean; error?: string };
  onSaveRuleVersion: (
    rule: ViolationRuleConfig,
    officialReference: string,
    isNew: boolean
  ) => void;
  onToggleRuleActive: (ruleId: string) => void;
  onAddAppeal: (
    payload: Omit<ViolationAppealRecord, 'id' | 'appealNumber'>
  ) => void;
  onDecideAppeal: (
    appealId: string,
    decisionStatus: ViolationAppealRecord['decisionStatus'],
    adjustedAmount?: number,
    decisionNotes?: string
  ) => void;
  onOpenBakeryProfile: (bakeryId: string) => void;
}

export default function ViolationsCalculatorTab({
  userId,
  currentUserName,
  bakeries,
  rules,
  legalVersions,
  violations,
  appeals,
  settings,
  todayRef,
  onSaveViolation,
  onChangeViolationStatus,
  onLinkViolationToDebt,
  onSaveRuleVersion,
  onToggleRuleActive,
  onAddAppeal,
  onDecideAppeal,
  onOpenBakeryProfile,
}: ViolationsCalculatorTabProps) {
  const [subView, setSubView] = useState<'calculator' | 'records' | 'rules' | 'appeals'>('calculator');

  // مدخلات الحاسبة
  const [cBakeryId, setCBakeryId] = useState<string>(bakeries[0]?.id || '');
  const [cDate, setCDate] = useState<string>(todayRef);
  const [cMinutes, setCMinutes] = useState<string>('');
  const [cBreadCat, setCBreadCat] = useState<ViolationBreadCategory>('خبز بلدي مدعم');
  const [cRuleId, setCRuleId] = useState<string>('rule-14');
  const [cOfficialWeight, setCOfficialWeight] = useState<number>(settings.defaultBaladiWeightGrams || 90);
  const [cActualWeight, setCActualWeight] = useState<number>(78);
  const [cQuotaUnit, setCQuotaUnit] = useState<string>('شيكارة');
  const [cPriceUnit, setCPriceUnit] = useState<string>('شيكارة');
  const [cQuotaOverride, setCQuotaOverride] = useState<number>(bakeries[0]?.insuranceQuota || 35);
  const [cFlourPriceOverride, setCFlourPriceOverride] = useState<number>(
    bakeries[0]?.sackPriceEgp || settings.defaultFlourSackPriceEgp || 235
  );
  const [cDailySupportCost, setCDailySupportCost] = useState<number>(3500);
  const [cFlourQty, setCFlourQty] = useState<number>(4);
  const [cFlourUnitVal, setCFlourUnitVal] = useState<number>(750);
  const [cStopDays, setCStopDays] = useState<number>(2);
  const [cManualAmount, setCManualAmount] = useState<number>(2500);
  const [cRepeatMode, setCRepeatMode] = useState<'auto' | 'force_first' | 'force_repeat'>('auto');
  const [cNotes, setCNotes] = useState<string>('');
  const [actionBanner, setActionBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [printViol, setPrintViol] = useState<BakeryViolationRecord | null>(null);
  const [sortKey, setSortKey] = useState<string>('violationDate');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // إدارة القواعد القانونية
  const [ruleSearch, setRuleSearch] = useState('');
  const [editingRule, setEditingRule] = useState<ViolationRuleConfig | null>(null);
  const [isNewRule, setIsNewRule] = useState(false);
  const [officialRefInput, setOfficialRefInput] = useState('');

  // نموذج تظلم
  const [appealTargetId, setAppealTargetId] = useState<string>(violations[0]?.id || '');
  const [appealReason, setAppealReason] = useState<string>('');

  const selectedBakery = useMemo(
    () => bakeries.find((b) => b.id === cBakeryId) || bakeries[0],
    [bakeries, cBakeryId]
  );

  const availableRulesForCategory = useMemo(() => {
    const active = rules.filter((r) => r.isActive);
    if (cBreadCat === 'خبز بلدي مدعم') {
      return active.filter((r) => r.breadCategory === 'خبز بلدي مدعم');
    }
    return active.filter((r) => r.breadCategory === cBreadCat || r.formulaKind === 'tourist_fino_directive_5');
  }, [rules, cBreadCat]);

  const selectedRule = useMemo(
    () => availableRulesForCategory.find((r) => r.id === cRuleId) || availableRulesForCategory[0] || rules[0],
    [availableRulesForCategory, cRuleId, rules]
  );

  // حساب لحظي فوري بالمحرك المركزي
  const liveResult = useMemo(() => {
    if (!selectedBakery || !selectedRule) return null;
    return calculateViolationPenalty({
      rule: selectedRule,
      bakeryId: selectedBakery.id,
      posNumber: selectedBakery.posNumber,
      violationDate: cDate,
      breadCategory: cBreadCat,
      officialWeightGrams: cOfficialWeight,
      actualWeightGrams: cActualWeight,
      dailyInsuranceQuota: cQuotaOverride,
      flourUnitPrice: cFlourPriceOverride,
      quotaUnitLabel: cQuotaUnit,
      priceUnitLabel: cPriceUnit,
      dailySupportCostInput: cDailySupportCost,
      flourDisposedQty: cFlourQty,
      flourDisposedUnitPrice: cFlourUnitVal,
      stopDaysCount: cStopDays,
      manualAmount: cManualAmount,
      historicalViolations: violations,
      forceRepeatOverride:
        cRepeatMode === 'force_repeat' ? true : cRepeatMode === 'force_first' ? false : null,
    });
  }, [
    selectedBakery,
    selectedRule,
    cDate,
    cBreadCat,
    cOfficialWeight,
    cActualWeight,
    cQuotaOverride,
    cFlourPriceOverride,
    cQuotaUnit,
    cPriceUnit,
    cDailySupportCost,
    cFlourQty,
    cFlourUnitVal,
    cStopDays,
    cManualAmount,
    violations,
    cRepeatMode,
  ]);

  const handleBakerySelectChange = (bakeryId: string) => {
    setCBakeryId(bakeryId);
    const b = bakeries.find((x) => x.id === bakeryId);
    if (b) {
      setCQuotaOverride(b.insuranceQuota || round2(b.insuranceAmountEgp / (b.sackPriceEgp || 235)));
      setCFlourPriceOverride(b.sackPriceEgp || settings.defaultFlourSackPriceEgp);
    }
  };

  const handleBreadCatChange = (cat: ViolationBreadCategory) => {
    setCBreadCat(cat);
    if (cat === 'خبز بلدي مدعم') {
      setCOfficialWeight(settings.defaultBaladiWeightGrams || 90);
      setCRuleId('rule-14');
    } else if (cat === 'خبز سياحي حر') {
      setCOfficialWeight(settings.defaultTouristWeightGrams || 80);
      setCRuleId('rule-tf-01');
    } else if (cat === 'خبز فينو') {
      setCOfficialWeight(settings.defaultFinoWeightGrams || 60);
      setCRuleId('rule-tf-02');
    }
  };

  const handleSaveCalculation = (status: DebtApprovalStatus) => {
    setActionBanner(null);
    if (!selectedBakery || !selectedRule || !liveResult || !liveResult.isValid) {
      setActionBanner({ type: 'err', text: liveResult?.validationError || 'يرجى استكمال مدخلات الحساب الصحيحة.' });
      return;
    }
    if (!cMinutes.trim()) {
      setActionBanner({ type: 'err', text: 'يجب إدخال رقم المحضر قبل الحفظ أو الاعتماد.' });
      return;
    }
    onSaveViolation({
      minutesNumber: cMinutes.trim(),
      bakeryId: selectedBakery.id,
      bakeryName: selectedBakery.name,
      ownerName: selectedBakery.ownerName,
      posNumber: selectedBakery.posNumber,
      village: selectedBakery.village,
      localUnit: selectedBakery.localUnit,
      phone: selectedBakery.phone,
      violationDate: cDate,
      ruleId: selectedRule.id,
      ruleCode: selectedRule.code,
      violationName: selectedRule.name,
      groupName: selectedRule.groupName,
      breadCategory: cBreadCat,
      decreeRef: selectedRule.decreeNumber,
      articleRef: selectedRule.articleRef,
      officialWeightGrams: cOfficialWeight,
      actualWeightGrams: cActualWeight,
      shortageGrams: liveResult.shortageGrams,
      shortagePercent: liveResult.shortagePercent,
      weightTier: liveResult.weightTier,
      dailyInsuranceQuotaSnapshot: cQuotaOverride,
      flourUnitPriceSnapshot: cFlourPriceOverride,
      quotaUnitLabel: cQuotaUnit,
      priceUnitLabel: cPriceUnit,
      dailySupportCostInput: cDailySupportCost,
      flourDisposedQty: cFlourQty,
      flourDisposedUnitPrice: cFlourUnitVal,
      stopDaysCount: cStopDays,
      isRepeat: liveResult.isRepeat,
      repeatCountInWindow: liveResult.repeatCountInWindow,
      priorViolationId: liveResult.priorViolation?.id,
      priorViolationDate: liveResult.priorViolation?.violationDate,
      priorMinutesNumber: liveResult.priorViolation?.minutesNumber,
      multiplierApplied: liveResult.multiplierApplied,
      baseAmount: liveResult.baseAmount,
      finalFineAmount: liveResult.finalFineAmount,
      closureMeasure: liveResult.closureMeasure,
      closureDays: liveResult.closureDays,
      quotaDeductionPct: liveResult.quotaDeductionPct,
      quotaDeductionMonths: liveResult.quotaDeductionMonths,
      calculationSteps: liveResult.calculationSteps,
      legalBasisText: liveResult.legalBasisText,
      effectiveRuleDate: liveResult.effectiveRuleDate,
      status,
      recordedBy: currentUserName,
      approvedBy: status === 'معتمد' ? currentUserName : undefined,
      approvedAt: status === 'معتمد' ? new Date().toISOString() : undefined,
      notes: cNotes.trim(),
    });
    setActionBanner({ type: 'ok', text: `تم حفظ المخالفة (${status}) في السجل بنجاح.` });
    setCMinutes('');
    setCNotes('');
  };

  const sortedViolations = useMemo(() => {
    const enriched = violations.map((v) => {
      const liveBakery = bakeries.find((b) => b.id === v.bakeryId || b.name === v.bakeryName);
      return {
        ...v,
        ownerName: liveBakery?.ownerName || v.ownerName,
        posNumber: liveBakery?.posNumber || v.posNumber,
      };
    });
    return enriched.sort((a, b) =>
      compareTableValues(
        (a as unknown as Record<string, unknown>)[sortKey],
        (b as unknown as Record<string, unknown>)[sortKey],
        sortAsc
      )
    );
  }, [violations, bakeries, sortKey, sortAsc]);

  const handleRecordFromWeightCalculator = (
    output: WeightShortageCalculationOutput,
    approvalStatus: DebtApprovalStatus,
    autoLinkToDebt: boolean
  ) => {
    const weightRule = rules.find((r) => r.code === 'W-175-14' || r.id === 'rule-14') || rules[0];
    onSaveViolation(
      {
        minutesNumber: output.minutesNumber,
        bakeryId: output.bakeryId,
        bakeryName: output.bakeryName,
        ownerName: output.ownerName,
        posNumber: output.posNumber,
        village: output.village,
        localUnit: output.localUnit,
        phone: output.phone,
        violationDate: output.violationDate,
        ruleId: weightRule?.id || 'rule-14',
        ruleCode: weightRule?.code || 'W-175-14',
        violationName: 'إنتاج خبز بلدي مدعم ناقص الوزن (قرار ١٧٥ لسنة ٢٠٢٤)',
        groupName: 'مخالفات الوزن والجودة',
        breadCategory: 'خبز بلدي مدعم',
        decreeRef: 'القرار الوزاري رقم ١٧٥ لسنة ٢٠٢٤',
        articleRef: `المادة ١٤ — ${output.tierLabel}`,
        officialWeightGrams: output.officialWeightGrams,
        actualWeightGrams: output.actualWeightGrams,
        shortageGrams: output.shortageGrams,
        shortagePercent: output.shortagePercent,
        weightTier: output.tierNumber,
        dailyInsuranceQuotaSnapshot: output.insuranceQuota,
        flourUnitPriceSnapshot: output.sackPriceEgp,
        quotaUnitLabel: 'شيكارة',
        priceUnitLabel: 'شيكارة',
        isRepeat: output.isRepeat,
        repeatCountInWindow: output.isRepeat ? 1 : 0,
        multiplierApplied: output.legalMultiplier,
        baseAmount: output.baseAmountEgp,
        finalFineAmount: output.finalFineAmountEgp,
        closureMeasure: output.administrativeMeasure,
        closureDays: output.closureDays,
        quotaDeductionPct: 0,
        quotaDeductionMonths: 0,
        calculationSteps: [
          `الوزن الرسمي المقرر: ${formatArabicDecimal(output.officialWeightGrams, 1)} جم — الوزن الفعلي المضبوط: ${formatArabicDecimal(output.actualWeightGrams, 1)} جم`,
          `مقدار النقص: ${formatArabicDecimal(output.shortageGrams, 2)} جم (${output.tierLabel})`,
          `تطبيق المعادلة: ${output.formulaEquationText}`,
        ],
        legalBasisText: 'طبقاً لأحكام القرار الوزاري رقم ١٧٥ لسنة ٢٠٢٤ بشأن تنظيم العمل بالمخابز البلدية المدعمة.',
        effectiveRuleDate: '2024-10-15',
        status: approvalStatus,
        recordedBy: currentUserName,
        approvedBy: approvalStatus === 'معتمد' ? currentUserName : undefined,
        approvedAt: approvalStatus === 'معتمد' ? new Date().toISOString() : undefined,
        notes: output.notes,
      },
      autoLinkToDebt
    );
  };

  const violationColumns: SmartTableColumn<BakeryViolationRecord>[] = useMemo(
    () => [
      { key: 'violationNumber', label: 'رقم المخالفة', headerText: 'رقم المخالفة', type: 'numeric', sortable: true, render: (r) => <span className="num-cell font-black text-[#102A43]">{toArabicNumerals(r.violationNumber)}</span> },
      { key: 'minutesNumber', label: 'رقم المحضر', headerText: 'رقم المحضر', type: 'numeric', sortable: true, render: (r) => <span className="num-cell font-bold">{toArabicNumerals(r.minutesNumber)}</span> },
      { key: 'bakeryName', label: 'اسم المخبز', headerText: 'اسم المخبز', type: 'text', sortable: true, render: (r) => <button type="button" onClick={() => onOpenBakeryProfile(r.bakeryId)} className="font-black text-[#164E83] hover:underline cursor-pointer">{r.bakeryName}</button> },
      { key: 'ownerName', label: 'اسم صاحب المخبز', headerText: 'اسم صاحب المخبز', type: 'text', sortable: true, render: (r) => <button type="button" onClick={() => onOpenBakeryProfile(r.bakeryId)} className="font-black text-slate-800 hover:text-[#164E83] hover:underline cursor-pointer">{r.ownerName}</button> },
      { key: 'posNumber', label: 'رقم ماكينة POS', headerText: 'رقم ماكينة POS', type: 'numeric', sortable: true, render: (r) => <button type="button" onClick={() => onOpenBakeryProfile(r.bakeryId)} title="اضغط لفتح ملف المخبز" className="num-cell font-black px-2 py-0.5 rounded bg-slate-100 hover:bg-[#102A43] hover:text-white cursor-pointer">{toArabicNumerals(r.posNumber)}</button> },
      { key: 'violationDate', label: 'التاريخ', headerText: 'التاريخ', type: 'date', sortable: true, render: (r) => <span className="num-cell font-bold">{formatDateArabic(r.violationDate)}</span> },
      { key: 'violationName', label: 'المخالفة / نوع الخبز', headerText: 'المخالفة', type: 'text', sortable: true, render: (r) => <span className="font-bold">{r.violationName} ({r.breadCategory})</span> },
      { key: 'shortageGrams', label: 'النقص / المعامل', headerText: 'النقص / المعامل', type: 'numeric', sortable: true, render: (r) => <span className="num-cell font-black">{r.shortageGrams ? `${formatArabicDecimal(r.shortageGrams, 2)} جم (×${toArabicNumerals(r.multiplierApplied)})` : `×${toArabicNumerals(r.multiplierApplied)}`}</span> },
      { key: 'finalFineAmount', label: 'قيمة الجزاء', headerText: 'قيمة الجزاء', type: 'currency', sortable: true, render: (r) => <span className="num-cell font-black text-red-700">{formatArabicCurrency(r.finalFineAmount)}</span> },
      { key: 'closureMeasure', label: 'التدبير الإداري', headerText: 'التدبير', type: 'text', render: (r) => <span className="font-bold text-slate-700">{r.closureMeasure}</span> },
      { key: 'status', label: 'الاعتماد', headerText: 'الاعتماد', type: 'badge', sortable: true, render: (r) => <ApprovalStatusBadge status={r.status} /> },
      { key: 'linkedDebtNumber', label: 'الربط بالمديونية', headerText: 'رقم المديونية', type: 'numeric', render: (r) => <span className="num-cell font-black text-emerald-800">{r.linkedDebtNumber ? toArabicNumerals(r.linkedDebtNumber) : 'غير محول'}</span> },
      {
        key: 'actions',
        label: 'الإجراءات',
        headerText: 'الإجراءات',
        type: 'actions',
        render: (r) => (
          <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
            <button type="button" onClick={() => setPrintViol(r)} title="عرض وطباعة كشف الاحتساب الرسمي" className="p-1.5 rounded-xl bg-blue-50 hover:bg-[#102A43] hover:text-white text-[#164E83] border border-blue-200 cursor-pointer transition-colors">
              <Printer className="w-5 h-5" />
            </button>
            {(r.status === 'مسودة' || r.status === 'قيد المراجعة') && (
              <>
                <button type="button" onClick={() => onChangeViolationStatus(r.id, 'معتمد')} title="اعتماد المخالفة" className="p-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-700 hover:text-white text-emerald-900 border border-emerald-300 cursor-pointer transition-colors">
                  <CheckCircle2 className="w-5 h-5" />
                </button>
                <button type="button" onClick={() => onChangeViolationStatus(r.id, 'مرفوض', 'رفض بعد المراجعة')} title="رفض / إلغاء" className="p-1.5 rounded-xl bg-red-100 hover:bg-red-700 hover:text-white text-red-900 border border-red-300 cursor-pointer transition-colors">
                  <XCircle className="w-5 h-5" />
                </button>
              </>
            )}
            {r.status === 'معتمد' && !r.linkedDebtId && (
              <button
                type="button"
                onClick={() => {
                  const res = onLinkViolationToDebt(r);
                  setActionBanner(
                    res.ok
                      ? { type: 'ok', text: `تم تحويل المخالفة ${r.violationNumber} إلى مديونية معتمدة وربطها بكشف الحساب.` }
                      : { type: 'err', text: res.error || 'تعذر التحويل' }
                  );
                }}
                title="تحويل لمديونية"
                className="px-2.5 py-1.5 rounded-xl bg-[#102A43] text-white font-black text-[10.5px] hover:bg-[#164E83] cursor-pointer flex items-center gap-1.5"
              >
                <Link2 className="w-4.5 h-4.5 text-[#C6A15B]" />
                <span>تحويل لمديونية</span>
              </button>
            )}
          </div>
        ),
      },
    ],
    [onOpenBakeryProfile, onChangeViolationStatus, onLinkViolationToDebt]
  );

  const filteredRules = useMemo(() => {
    const q = normalizeSearchText(ruleSearch);
    return rules.filter((r) => {
      if (!q) return true;
      return normalizeSearchText(`${r.code} ${r.name} ${r.groupName} ${r.decreeNumber} ${r.breadCategory}`).includes(q);
    });
  }, [rules, ruleSearch]);

  const tierColors: Record<number, string> = {
    0: 'border-slate-300 bg-slate-50 text-[#102A43]',
    1: 'border-amber-300 bg-amber-50 text-amber-950',
    2: 'border-orange-300 bg-orange-50 text-orange-950',
    3: 'border-red-300 bg-red-50 text-red-950',
    4: 'border-rose-700 bg-rose-950 text-white',
  };

  return (
    <div className="space-y-4">
      {/* شريط التبديل الفرعي */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'calculator', label: 'حاسبة المخالفات ونقص الوزن (١٧٥ / ٢٠٢٤ و ٥ / ٢٠٢٦)', icon: Calculator },
            { id: 'records', label: `سجل المخالفات المحسوبة (${toArabicNumerals(violations.length)})`, icon: FileWarning },
            { id: 'rules', label: `مكتبة القواعد والقرارات (${toArabicNumerals(rules.length)})`, icon: BookMarked },
            { id: 'appeals', label: `التظلمات والمراجعات (${toArabicNumerals(appeals.length)})`, icon: Scale },
          ].map((t) => {
            const Icon = t.icon;
            const active = subView === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubView(t.id as typeof subView)}
                className={`px-3 py-2 rounded-xl font-black text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors ${
                  active ? 'bg-[#102A43] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {actionBanner && (
        <div
          className={`p-3 rounded-xl font-black text-[11px] flex items-center justify-between ${
            actionBanner.type === 'ok' ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' : 'bg-red-50 border border-red-200 text-red-900'
          }`}
        >
          <span>{actionBanner.text}</span>
          <button type="button" onClick={() => setActionBanner(null)} className="cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* 1. الحاسبة التفاعلية للمخالفات والجزاءات (حاسبة نقص الوزن ١٧٥/٢٠٢٤ + كافة المخالفات التموينية) */}
      {subView === 'calculator' && (
        <div className="space-y-4">
          <ViolationCalculator
            bakeries={bakeries}
            historicalViolations={sortedViolations}
            defaultOfficialWeight={settings.defaultBaladiWeightGrams || 90}
            defaultSackPriceEgp={settings.defaultFlourSackPriceEgp || 235}
            todayRef={todayRef}
            onOpenBakeryProfile={onOpenBakeryProfile}
            onRecordAndLinkDebt={handleRecordFromWeightCalculator}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* العمود الأيمن: مدخلات المخالفة والمخبز لكافة البنود الأخرى */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
              <h3 className="font-black text-[13px] text-[#102A43] border-b border-slate-100 pb-2">
                حاسبة كافة بنود المخالفات التموينية الأخرى (البلدي المدعم والسياحي والفينو — ٢٤ بنداً قانونياً)
              </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-[10.5px] font-black text-slate-700 mb-1">اختر المخبز (تُجلب الحصة وسعر الدقيق تلقائياً)</label>
                <select
                  value={cBakeryId}
                  onChange={(e) => handleBakerySelectChange(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-black"
                >
                  {bakeries.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} — POS: {b.posNumber} ({b.ownerName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-black text-slate-700 mb-1">تصنيف نوع الخبز (فصل تام للقواعد)</label>
                <select
                  value={cBreadCat}
                  onChange={(e) => handleBreadCatChange(e.target.value as ViolationBreadCategory)}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-black bg-amber-50/40"
                >
                  <option value="خبز بلدي مدعم">خبز بلدي مدعم (قرار ١٧٥/٢٠٢٤ — ٩٠ جم)</option>
                  <option value="خبز سياحي حر">خبز سياحي حر (توجيه ٥/٢٠٢٦ منفصل)</option>
                  <option value="خبز فينو">خبز فينو (توجيه ٥/٢٠٢٦ منفصل)</option>
                  <option value="أنواع أخرى وفق الترخيص">أنواع أخرى وفق الترخيص</option>
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-black text-slate-700 mb-1">تاريخ الواقعة / المحضر</label>
                <input type="date" value={cDate} onChange={(e) => setCDate(e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-bold" />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10.5px] font-black text-slate-700 mb-1">نوع المخالفة (من المكتبة الرسمية — {toArabicNumerals(availableRulesForCategory.length)} قاعدة متاحة)</label>
                <select
                  value={selectedRule?.id || ''}
                  onChange={(e) => setCRuleId(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-black"
                >
                  {availableRulesForCategory.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.code}] {r.name} — ({r.decreeNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-black text-slate-700 mb-1">رقم المحضر الرسمي</label>
                <input type="text" value={cMinutes} onChange={(e) => setCMinutes(e.target.value)} placeholder="مثال: محضر-2026-290" className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-bold" />
              </div>

              <div>
                <label className="block text-[10.5px] font-black text-slate-700 mb-1">التحقق من التكرار</label>
                <select value={cRepeatMode} onChange={(e) => setCRepeatMode(e.target.value as typeof cRepeatMode)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-black">
                  <option value="auto">فحص تلقائي من السجل المعتمد</option>
                  <option value="force_first">تحديد يدوياً: أول مرة</option>
                  <option value="force_repeat">تحديد يدوياً: مكرر داخل المدة</option>
                </select>
              </div>

              {/* مدخلات خاصة بمخالفة نقص الوزن */}
              {(selectedRule?.formulaKind === 'weight_shortage_175' || selectedRule?.formulaKind === 'tourist_fino_directive_5') && (
                <>
                  <div>
                    <label className="block text-[10.5px] font-black text-slate-700 mb-1">الوزن الرسمي المقرر (جم)</label>
                    <input type="number" min={1} step="0.5" value={cOfficialWeight} onChange={(e) => setCOfficialWeight(Number(e.target.value) || 0)} className="num-cell w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[12px] font-black" />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-black text-slate-700 mb-1">الوزن الفعلي المضبوط (جم)</label>
                    <input type="number" min={0} step="0.5" value={cActualWeight} onChange={(e) => setCActualWeight(Number(e.target.value) || 0)} className="num-cell w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[12px] font-black bg-amber-50/60" />
                  </div>
                </>
              )}

              {selectedRule?.formulaKind === 'weight_shortage_175' && (
                <>
                  <div>
                    <label className="block text-[10.5px] font-black text-slate-700 mb-1">الحصة التأمينية ({cQuotaUnit})</label>
                    <div className="flex gap-1">
                      <input type="number" min={0} step="0.001" value={cQuotaOverride} onChange={(e) => setCQuotaOverride(Number(e.target.value) || 0)} className="num-cell flex-1 min-w-0 px-2 py-2 rounded-lg border border-slate-300 text-[12px] font-black" />
                      <select value={cQuotaUnit} onChange={(e) => setCQuotaUnit(e.target.value)} className="px-1.5 rounded-lg border border-slate-300 text-[10px] font-black">
                        <option value="شيكارة">شيكارة</option>
                        <option value="طن">طن</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-black text-slate-700 mb-1">سعر الدقيق ({cPriceUnit})</label>
                    <div className="flex gap-1">
                      <input type="number" min={0} step="0.01" value={cFlourPriceOverride} onChange={(e) => setCFlourPriceOverride(Number(e.target.value) || 0)} className="num-cell flex-1 min-w-0 px-2 py-2 rounded-lg border border-slate-300 text-[12px] font-black" />
                      <select value={cPriceUnit} onChange={(e) => setCPriceUnit(e.target.value)} className="px-1.5 rounded-lg border border-slate-300 text-[10px] font-black">
                        <option value="شيكارة">شيكارة</option>
                        <option value="طن">طن</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {(selectedRule?.formulaKind === 'support_cost_daily_sales' || selectedRule?.formulaKind === 'daily_quota_support_cost') && (
                <div className="sm:col-span-2">
                  <label className="block text-[10.5px] font-black text-slate-700 mb-1">القيمة النقدية لتكلفة دعم إنتاج الخبز / مبيعات يوم المخالفة (ج.م)</label>
                  <input type="number" min={0} step="0.01" value={cDailySupportCost} onChange={(e) => setCDailySupportCost(Number(e.target.value) || 0)} className="num-cell w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[12px] font-black" />
                </div>
              )}

              {selectedRule?.formulaKind === 'flour_disposal_value' && (
                <>
                  <div>
                    <label className="block text-[10.5px] font-black text-slate-700 mb-1">كمية الدقيق المتصرف فيها</label>
                    <input type="number" min={0} step="0.5" value={cFlourQty} onChange={(e) => setCFlourQty(Number(e.target.value) || 0)} className="num-cell w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[12px] font-black" />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-black text-slate-700 mb-1">القيمة النقدية للوحدة (ج.م)</label>
                    <input type="number" min={0} step="0.01" value={cFlourUnitVal} onChange={(e) => setCFlourUnitVal(Number(e.target.value) || 0)} className="num-cell w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[12px] font-black" />
                  </div>
                </>
              )}

              {selectedRule?.formulaKind === 'fixed_per_day' && (
                <div className="sm:col-span-2">
                  <label className="block text-[10.5px] font-black text-slate-700 mb-1">عدد أيام التوقف بدون إذن</label>
                  <input type="number" min={1} value={cStopDays} onChange={(e) => setCStopDays(Number(e.target.value) || 0)} className="num-cell w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[12px] font-black" />
                </div>
              )}

              {selectedRule?.formulaKind === 'tourist_fino_directive_5' && (
                <div className="sm:col-span-2">
                  <label className="block text-[10.5px] font-black text-slate-700 mb-1">القيمة الأساسية المقررة بالتوجيه ٥/٢٠٢٦ (ج.م)</label>
                  <input type="number" min={0} value={cManualAmount} onChange={(e) => setCManualAmount(Number(e.target.value) || 0)} className="num-cell w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[12px] font-black" />
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block text-[10.5px] font-black text-slate-700 mb-1">ملاحظات الحملة والمحضر</label>
                <input type="text" value={cNotes} onChange={(e) => setCNotes(e.target.value)} placeholder="وصف إضافي لمرفقات العينة أو أقوال المدير المسؤول..." className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-bold" />
              </div>
            </div>
          </div>

          {/* العمود الأيسر: بطاقة النتائج الفورية والمقارنة والخطوات */}
          <div className="lg:col-span-6 space-y-3">
            {liveResult && (
              <div className={`rounded-2xl border-2 p-4 shadow-xs space-y-3 ${tierColors[liveResult.weightTier] || tierColors[0]}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/15 pb-2">
                  <span className="font-black text-[13px]">{liveResult.weightTierLabel}</span>
                  <span className="text-[10.5px] font-black px-2 py-0.5 rounded bg-white/80 text-[#102A43]">
                    {liveResult.isRepeat ? `تكرار (×${toArabicNumerals(liveResult.multiplierApplied)})` : `أول مرة (×${toArabicNumerals(liveResult.multiplierApplied)})`}
                  </span>
                </div>

                {!liveResult.isValid ? (
                  <div className="p-3 rounded-xl bg-red-100 text-red-950 font-black text-[12px] flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    {liveResult.validationError}
                  </div>
                ) : (
                  <>
                    {/* مقارنة الوزن الرسمي مقابل الفعلي ومقياس النقص */}
                    {liveResult.shortageGrams > 0 && (
                      <div className="bg-white/85 text-[#102A43] rounded-xl p-3 space-y-2">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 block">الوزن الرسمي</span>
                            <span className="num-cell font-black text-sm">{formatArabicDecimal(cOfficialWeight, 1)} جم</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 block">الوزن الفعلي</span>
                            <span className="num-cell font-black text-sm text-amber-800">{formatArabicDecimal(cActualWeight, 1)} جم</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 block">مقدار النقص</span>
                            <span className="num-cell font-black text-sm text-red-700">{formatArabicDecimal(liveResult.shortageGrams, 2)} جم ({formatArabicDecimal(liveResult.shortagePercent, 1)}٪)</span>
                          </div>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-600 rounded-full transition-all"
                            style={{ width: `${Math.min(100, Math.max(5, liveResult.shortagePercent))}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* النتيجة المالية الكبرى */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="bg-white/90 text-[#102A43] rounded-xl p-3">
                        <span className="text-[10px] font-bold text-slate-600 block">القيمة الأساسية للمخالفة</span>
                        <span className="num-cell font-black text-base">{formatArabicCurrency(liveResult.baseAmount)}</span>
                      </div>
                      <div className="bg-white text-[#102A43] rounded-xl p-3 border-2 border-[#C6A15B]">
                        <span className="text-[10px] font-bold text-slate-600 block">الغرامة النهائية المستحقة</span>
                        <span className="num-cell font-black text-xl text-red-700">{formatArabicCurrency(liveResult.finalFineAmount)}</span>
                      </div>
                    </div>

                    <div className="bg-white/85 text-[#102A43] rounded-xl p-3 space-y-1 text-[11px]">
                      <div className="font-black">التدبير الإداري / الغلق: <span className="text-red-800">{liveResult.closureMeasure}</span></div>
                      {liveResult.quotaDeductionPct > 0 && (
                        <div className="font-black text-rose-800">
                          خصم الحصة: {toArabicNumerals(liveResult.quotaDeductionPct)}٪ لمدة {toArabicNumerals(liveResult.quotaDeductionMonths)} أشهر
                        </div>
                      )}
                      {liveResult.priorViolation && (
                        <div className="font-bold text-amber-900">
                          مرتبط بمخالفة سابقة معتمدة: {toArabicNumerals(liveResult.priorViolation.violationNumber)} بتاريخ {formatDateArabic(liveResult.priorViolation.violationDate)}
                        </div>
                      )}
                    </div>

                    {/* خطوات الاحتساب التفصيلية */}
                    <div className="bg-white/90 text-[#102A43] rounded-xl p-3 space-y-1">
                      <p className="font-black text-[11px] border-b border-slate-200 pb-1">خطوات الاحتساب والأساس القانوني:</p>
                      {liveResult.calculationSteps.map((st, idx) => (
                        <p key={idx} className="text-[11px] font-bold text-slate-800 leading-relaxed">{st}</p>
                      ))}
                      <p className="text-[10px] font-bold text-slate-500 pt-1">{liveResult.legalBasisText}</p>
                    </div>

                    {/* أزرار الحفظ والاعتماد */}
                    <div className="flex flex-wrap justify-end gap-2 pt-1">
                      <button type="button" onClick={() => handleSaveCalculation('مسودة')} className="px-3.5 py-2 rounded-xl bg-white text-[#102A43] font-black text-[11px] border border-slate-300 cursor-pointer">
                        حفظ كمسودة (لا يحتسب تكراراً)
                      </button>
                      <button type="button" onClick={() => handleSaveCalculation('قيد المراجعة')} className="px-3.5 py-2 rounded-xl bg-amber-500 text-white font-black text-[11px] cursor-pointer">
                        إرسال للمراجعة
                      </button>
                      <button type="button" onClick={() => handleSaveCalculation('معتمد')} className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-black text-[11px] cursor-pointer flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" />
                        حفظ واعتماد المخالفة
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {/* 2. سجل المخالفات المحسوبة والربط بالمديونية */}
      {subView === 'records' && (
        <SmartAutoFitTable
          tableId="bakery-violations-records"
          userId={userId}
          rows={sortedViolations}
          totalCount={sortedViolations.length}
          getRowId={(r) => r.id}
          columns={violationColumns}
          sortKey={sortKey}
          sortAsc={sortAsc}
          onSort={(k) => {
            if (sortKey === k) setSortAsc(!sortAsc);
            else { setSortKey(k); setSortAsc(true); }
          }}
          pinnedKeys={['violationNumber', 'minutesNumber', 'bakeryName', 'ownerName', 'posNumber']}
          maxHeightClass="max-h-[58vh]"
        />
      )}

      {/* 3. إدارة مكتبة القواعد القانونية وإصداراتها */}
      {subView === 'rules' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-2">
            <input
              type="text"
              value={ruleSearch}
              onChange={(e) => setRuleSearch(e.target.value)}
              placeholder="ابحث في قواعد القرار ١٧٥/٢٠٢٤ والتوجيه ٥/٢٠٢٦..."
              className="flex-1 min-w-[240px] px-3 py-2 rounded-xl border border-slate-300 text-[12px] font-bold"
            />
            <button
              type="button"
              onClick={() => {
                setIsNewRule(true);
                setOfficialRefInput('');
                setEditingRule({
                  id: `rule-custom-${Date.now()}`,
                  code: `C-${rules.length + 1}`,
                  name: '',
                  groupName: 'مخالفات التشغيل والنظافة',
                  breadCategory: 'خبز بلدي مدعم',
                  decreeNumber: 'قرار وزاري جديد',
                  articleRef: '',
                  formulaKind: 'fixed_fine',
                  firstOffenseAmountOrMultiplier: 1000,
                  repeatAmountOrMultiplier: 2000,
                  repeatWindowDays: 365,
                  closureMeasureFirst: 'إنذار إداري',
                  closureDaysFirst: 0,
                  closureMeasureRepeat: 'غلق ١٥ يوماً',
                  closureDaysRepeat: 15,
                  quotaDeductionPct: 0,
                  quotaDeductionMonths: 0,
                  effectiveFrom: todayRef,
                  legalSource: '',
                  version: 1,
                  isActive: true,
                  requiredFields: [],
                  notes: '',
                });
              }}
              className="px-3.5 py-2 rounded-xl bg-[#102A43] text-white font-black text-[11px] cursor-pointer flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4 text-[#C6A15B]" />
              إضافة قاعدة قانونية جديدة
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredRules.map((r) => (
              <div key={r.id} className={`bg-white rounded-2xl border p-3.5 space-y-2 text-[11px] ${r.isActive ? 'border-slate-200' : 'border-red-200 bg-red-50/30 opacity-75'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="num-cell px-2 py-0.5 rounded bg-[#102A43] text-white font-black text-[10px] ml-1.5">{r.code}</span>
                    <span className="font-black text-[#102A43]">{r.name}</span>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-100 text-amber-950 shrink-0">v{toArabicNumerals(r.version)}</span>
                </div>
                <div className="text-slate-600 font-bold">{r.groupName} · {r.breadCategory} · {r.decreeNumber} ({r.articleRef})</div>
                <div className="text-[10px] text-slate-500 font-bold">المصدر الرسمي: {r.legalSource} | ساري من: <span className="num-cell">{formatDateArabic(r.effectiveFrom)}</span></div>
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewRule(false);
                      setOfficialRefInput(r.legalSource);
                      setEditingRule({ ...r });
                    }}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-[#102A43] hover:text-white font-black text-[10px] cursor-pointer"
                  >
                    تعديل بمرجع رسمي (إصدار جديد)
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleRuleActive(r.id)}
                    className={`px-2.5 py-1 rounded font-black text-[10px] cursor-pointer ${r.isActive ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}
                  >
                    {r.isActive ? 'تعطيل القاعدة' : 'إعادة تفعيل'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {legalVersions.length > 0 && (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2 text-[11px]">
              <h4 className="font-black text-[#102A43]">سجل الإصدارات التاريخية للقواعد القانونية (لا يُحذف أبداً)</h4>
              {legalVersions.map((v) => (
                <div key={v.id} className="bg-white rounded-lg border border-slate-200 p-2.5 flex flex-wrap justify-between gap-2 font-bold">
                  <span>{v.ruleCode} (إصدار {toArabicNumerals(v.version)}) — {v.snapshotSummary}</span>
                  <span className="text-slate-500">{v.officialReference}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. شاشة التظلمات */}
      {subView === 'appeals' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <h4 className="font-black text-[13px] text-[#102A43]">تقديم تظلم على مخالفة تموينية</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <select value={appealTargetId} onChange={(e) => setAppealTargetId(e.target.value)} className="px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-black">
                {violations.map((v) => (
                  <option key={v.id} value={v.id}>{v.violationNumber} — {v.bakeryName} ({formatArabicCurrency(v.finalFineAmount)})</option>
                ))}
              </select>
              <input type="text" value={appealReason} onChange={(e) => setAppealReason(e.target.value)} placeholder="سبب التظلم والمستند المقدم..." className="px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-bold" />
              <button
                type="button"
                onClick={() => {
                  const v = violations.find((x) => x.id === appealTargetId);
                  if (!v || !appealReason.trim()) return;
                  onAddAppeal({
                    violationId: v.id,
                    violationNumber: v.violationNumber,
                    bakeryId: v.bakeryId,
                    bakeryName: v.bakeryName,
                    posNumber: v.posNumber,
                    appealDate: todayRef,
                    reason: appealReason.trim(),
                    decisionStatus: 'قيد الفحص',
                  });
                  setAppealReason('');
                }}
                className="px-4 py-2 rounded-lg bg-[#102A43] text-white font-black text-[11px] cursor-pointer"
              >
                قيد التظلم للمراجعة
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {appeals.map((a) => (
              <div key={a.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 text-[11px]">
                <div>
                  <div className="font-black text-[#102A43]">
                    {toArabicNumerals(a.appealNumber)} — {a.bakeryName} (POS: {toArabicNumerals(a.posNumber)}) · مخالفة {toArabicNumerals(a.violationNumber)}
                  </div>
                  <div className="font-bold text-slate-700 mt-0.5">السبب: {a.reason} | الحالة: <strong className="text-[#164E83]">{a.decisionStatus}</strong></div>
                </div>
                {a.decisionStatus === 'قيد الفحص' && (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => onDecideAppeal(a.id, 'مقبول (تعديل/إلغاء)', 0, 'قُبل التظلم بعد مراجعة اللجنة')} className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-black cursor-pointer">
                      قبول التظلم
                    </button>
                    <button type="button" onClick={() => onDecideAppeal(a.id, 'مرفوض', undefined, 'ثبتت صحة المحضر')} className="px-3 py-1.5 rounded-lg bg-red-700 text-white font-black cursor-pointer">
                      رفض التظلم
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* نافذة تعديل/إضافة قاعدة قانونية */}
      {editingRule && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 w-full max-w-xl space-y-3 text-[11px]">
            <h4 className="font-black text-[13px] text-[#102A43]">{isNewRule ? 'إضافة قاعدة قانونية جديدة' : `تحديث القاعدة ${editingRule.code} (إنشاء إصدار جديد)`}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input type="text" value={editingRule.name} onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })} placeholder="اسم المخالفة" className="sm:col-span-2 px-2.5 py-2 rounded-lg border border-slate-300 font-bold" />
              <input type="text" value={editingRule.decreeNumber} onChange={(e) => setEditingRule({ ...editingRule, decreeNumber: e.target.value })} placeholder="رقم القرار الوزاري / التوجيه" className="px-2.5 py-2 rounded-lg border border-slate-300 font-bold" />
              <input type="text" value={editingRule.articleRef} onChange={(e) => setEditingRule({ ...editingRule, articleRef: e.target.value })} placeholder="المادة / البند" className="px-2.5 py-2 rounded-lg border border-slate-300 font-bold" />
              <input type="number" value={editingRule.firstOffenseAmountOrMultiplier} onChange={(e) => setEditingRule({ ...editingRule, firstOffenseAmountOrMultiplier: Number(e.target.value) || 0 })} placeholder="قيمة أو معامل أول مرة" className="num-cell px-2.5 py-2 rounded-lg border border-slate-300 font-black" />
              <input type="number" value={editingRule.repeatAmountOrMultiplier} onChange={(e) => setEditingRule({ ...editingRule, repeatAmountOrMultiplier: Number(e.target.value) || 0 })} placeholder="قيمة أو معامل التكرار" className="num-cell px-2.5 py-2 rounded-lg border border-slate-300 font-black" />
              <input type="text" value={officialRefInput} onChange={(e) => setOfficialRefInput(e.target.value)} placeholder="المرجع الرسمي للتعديل (إلزامي)" className="sm:col-span-2 px-2.5 py-2 rounded-lg border border-slate-300 font-bold bg-amber-50/40" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingRule(null)} className="px-3 py-1.5 rounded-lg bg-slate-100 font-black cursor-pointer">إلغاء</button>
              <button
                type="button"
                onClick={() => {
                  if (!editingRule.name.trim() || !officialRefInput.trim()) return;
                  onSaveRuleVersion({ ...editingRule, legalSource: officialRefInput.trim() }, officialRefInput.trim(), isNewRule);
                  setEditingRule(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-[#102A43] text-white font-black cursor-pointer"
              >
                حفظ واعتماد الإصدار
              </button>
            </div>
          </div>
        </div>
      )}

      {/* طباعة كشف احتساب المخالفة الرسمي */}
      {printViol && (
        <OfficialPrintModal
          open
          onClose={() => setPrintViol(null)}
          title="كشف احتساب مخالفة وجزاء تمويني رسمي"
          subtitle={`${printViol.violationName} — المحضر رقم ${toArabicNumerals(printViol.minutesNumber)}`}
          docNumber={printViol.violationNumber}
          printedBy={currentUserName}
          todayRef={todayRef}
        >
          <div className="grid grid-cols-2 gap-3 text-[12px] border border-slate-300 rounded-xl p-4 bg-slate-50">
            <div>اسم المخبز: <strong>{printViol.bakeryName}</strong></div>
            <div>صاحب المخبز: <strong>{printViol.ownerName}</strong></div>
            <div>رقم ماكينة POS: <strong className="num-cell">{toArabicNumerals(printViol.posNumber)}</strong></div>
            <div>تاريخ المخالفة: <strong className="num-cell">{formatDateArabic(printViol.violationDate)}</strong></div>
            <div>نوع الخبز: <strong>{printViol.breadCategory}</strong></div>
            <div>الحصة التأمينية وسعر الدقيق: <strong className="num-cell">{formatArabicNumber(printViol.dailyInsuranceQuotaSnapshot)} شيكارة × {formatArabicCurrency(printViol.flourUnitPriceSnapshot)}</strong></div>
            <div className="col-span-2 text-[14px] pt-2 border-t border-slate-300">
              قيمة الجزاء النهائي المستحق: <strong className="num-cell text-red-700">{formatArabicCurrency(printViol.finalFineAmount)}</strong> · التدبير: <strong>{printViol.closureMeasure}</strong>
            </div>
          </div>
          <div className="border border-slate-300 rounded-xl p-4 space-y-1.5 text-[11px]">
            <p className="font-black">تفصيل الخطوات الحسابية والأساس القانوني:</p>
            {printViol.calculationSteps.map((s, idx) => <p key={idx} className="font-bold">{s}</p>)}
            <p className="text-slate-600 pt-1">{printViol.legalBasisText}</p>
          </div>
        </OfficialPrintModal>
      )}
    </div>
  );
}
