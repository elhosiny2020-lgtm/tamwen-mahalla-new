'use client';

import React, { useState, useMemo } from 'react';
import {
  ClipboardCheck,
  AlertOctagon,
  FileWarning,
  Eye,
  FileBarChart2,
  PlusCircle,
  Search,
  CheckCircle2,
  Printer,
  Calculator,
} from 'lucide-react';
import { BakeryRecord, BakeryViolationRecord, DebtApprovalStatus, InspectionRecord, User } from '@/types';
import {
  compareTableValues,
  formatArabicNumber,
  formatDateArabic,
  normalizeSearchText,
  toArabicNumerals,
} from '@/lib/utils';
import { loadDebtsStore, saveDebtsStore } from '@/lib/debts-data';
import { saveStoredInspections } from '@/lib/mock-db';
import { buildInitialDebtItems, computeDebtFinancials } from '@/lib/debts-engine';
import AnimatedStatCard from './AnimatedStatCard';
import SmartAutoFitTable, { SmartTableColumn } from './SmartAutoFitTable';
import ViolationCalculator, { WeightShortageCalculationOutput } from './ViolationCalculator';
import OfficialViolationReportBuilder from './OfficialViolationReportBuilder';
import FactoryResetButton from './FactoryResetButton';
import { TableActionButtons } from './trade/TradeSharedCrudUi';

interface BakeryInspectionModuleProps {
  bakeries: BakeryRecord[];
  inspections: InspectionRecord[];
  currentUser: User;
  activeFocus: string;
  todayRef: string;
  onAddInspection: (record: Omit<InspectionRecord, 'id'>) => void;
  onUpdateStatus: (id: string, status: InspectionRecord['status']) => void;
  onSelectBakeryDetails: (bakery: BakeryRecord) => void;
  onResetInspections?: () => void;
}

type EnrichedInspectionRecord = InspectionRecord & {
  ownerName: string;
  posNumber: string;
};

export default function BakeryInspectionModule({
  bakeries,
  inspections,
  currentUser,
  activeFocus,
  todayRef,
  onAddInspection,
  onUpdateStatus,
  onSelectBakeryDetails,
  onResetInspections,
}: BakeryInspectionModuleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<string>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [showCalculator, setShowCalculator] = useState<boolean>(activeFocus === 'ins-violations');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pinnedCols, setPinnedCols] = useState<string[]>([
    'recordNumber',
    'bakeryName',
    'ownerName',
    'posNumber',
  ]);
  const [toastMsg, setToastMsg] = useState<string>('');
  const [deletedInspectionIds, setDeletedInspectionIds] = useState<string[]>([]);

  const [newBakeryId, setNewBakeryId] = useState<string>(bakeries[0]?.id || '');
  const [newType, setNewType] = useState<InspectionRecord['type']>('مخالفة');
  const [newTitle, setNewTitle] = useState<string>('');
  const [newFine, setNewFine] = useState<number>(0);
  const [newStatus, setNewStatus] = useState<InspectionRecord['status']>('قيد التحقيق');
  const [newNotes, setNewNotes] = useState<string>('');

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const notify = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const focusMeta: Record<string, { title: string; subtitle: string; typeFilter?: InspectionRecord['type'] }> = {
    'ins-campaigns': {
      title: 'الحملات التموينية المفاجئة والمخططة',
      subtitle: 'سجل الحملات الرقابية الميدانية على مخابز المركز ونتائج التفتيش',
      typeFilter: 'حملة تموينية',
    },
    'ins-violations': {
      title: 'سجل المخالفات التموينية للمخابز وحاسبة نقص الوزن (قرار ١٧٥ لسنة ٢٠٢٤)',
      subtitle: 'رصد مخالفات الأوزان والمواصفات والتصرف في الدقيق والغرامات المقررة والربط التلقائي بالمديونيات',
      typeFilter: 'مخالفة',
    },
    'ins-minutes': {
      title: 'المحاضر التموينية الرسمية المحررة',
      subtitle: 'متابعة المحاضر المقيدة والمحالة للجهات المختصة والنيابة',
      typeFilter: 'محضر رسمي',
    },
    'ins-followup': {
      title: 'متابعة المخابز الدورية وحالات التوقف',
      subtitle: 'تقارير المرور اليومي والتأكد من انتظام الإنتاج ومواعيد التشغيل',
      typeFilter: 'متابعة دورية',
    },
    'ins-reports': {
      title: 'التقارير الرقابية الشاملة والملخص الإحصائي',
      subtitle: 'إجمالي الحملات والمخالفات والمحاضر والغرامات المحررة على مستوى الإدارة',
    },
  };

  const currentMeta = focusMeta[activeFocus] || focusMeta['ins-reports'];

  // سحب اسم صاحب المخبز ورقم ماكينة POS تلقائياً من منظومة إدارة المخابز الحالية
  const enrichedInspections: EnrichedInspectionRecord[] = useMemo(() => {
    return inspections
      .filter((rec) => !deletedInspectionIds.includes(rec.id))
      .map((rec) => {
        const matchedBakery = bakeries.find(
          (b) => b.id === rec.bakeryId || b.name === rec.bakeryName
        );
        return {
          ...rec,
          ownerName: matchedBakery?.ownerName || 'غير مسجل',
          posNumber: matchedBakery?.posNumber || '—',
        };
      });
  }, [inspections, bakeries, deletedInspectionIds]);

  const filteredRecords = useMemo(() => {
    const q = normalizeSearchText(searchTerm);
    const list = enrichedInspections.filter((rec) => {
      if (currentMeta.typeFilter && rec.type !== currentMeta.typeFilter) return false;
      if (statusFilter !== 'all' && rec.status !== statusFilter) return false;
      if (q) {
        const text = normalizeSearchText(
          `${rec.recordNumber} ${rec.bakeryName} ${rec.ownerName} ${rec.posNumber} ${rec.village} ${rec.inspectorName} ${rec.violationTitle} ${rec.notes}`
        );
        if (!text.includes(q)) return false;
      }
      return true;
    });
    return [...list].sort((a, b) =>
      compareTableValues(
        (a as unknown as Record<string, unknown>)[sortKey],
        (b as unknown as Record<string, unknown>)[sortKey],
        sortAsc
      )
    );
  }, [enrichedInspections, currentMeta.typeFilter, statusFilter, searchTerm, sortKey, sortAsc]);

  const stats = useMemo(() => {
    const total = inspections.length;
    const violations = inspections.filter((r) => r.type === 'مخالفة' || r.type === 'محضر رسمي').length;
    const campaigns = inspections.filter((r) => r.type === 'حملة تموينية').length;
    const totalFines = inspections.reduce((sum, r) => sum + (r.fineAmountEgp || 0), 0);
    return { total, violations, campaigns, totalFines };
  }, [inspections]);

  const handleSubmitNew = (e: React.FormEvent) => {
    e.preventDefault();
    const targetBakery = bakeries.find((b) => b.id === newBakeryId) || bakeries[0];
    if (!targetBakery || !newTitle.trim()) return;

    const prefix =
      newType === 'حملة تموينية'
        ? 'حملة'
        : newType === 'متابعة دورية'
        ? 'متابعة'
        : 'محضر';

    onAddInspection({
      recordNumber: `${prefix}-${todayRef.slice(0, 4)}-${Math.floor(200 + inspections.length * 13)}`,
      bakeryId: targetBakery.id,
      bakeryName: targetBakery.name,
      village: targetBakery.village,
      type: newType,
      date: todayRef,
      inspectorName: currentUser.fullName,
      violationTitle: newTitle.trim(),
      fineAmountEgp: Number(newFine) || 0,
      status: newStatus,
      notes: newNotes.trim() || 'تم القيد إلكترونياً بمنظومة الرقابة على المخابز',
    });

    setNewTitle('');
    setNewFine(0);
    setNewNotes('');
    setShowAddForm(false);
    notify('تم تسجيل المخالفة / السجل الرقابي بنجاح.');
  };

  // ربط نتيجة حاسبة نقص الوزن (قرار 175 لسنة 2024) تلقائياً بسجل المخالفات وسجل مديونيات المخابز
  const handleRecordFromCalculator = (
    output: WeightShortageCalculationOutput,
    approvalStatus: DebtApprovalStatus,
    autoLinkToDebt: boolean
  ) => {
    onAddInspection({
      recordNumber: output.minutesNumber,
      bakeryId: output.bakeryId,
      bakeryName: output.bakeryName,
      village: output.village,
      type: 'مخالفة',
      date: output.violationDate,
      inspectorName: currentUser.fullName,
      violationTitle: `نقص وزن خبز بلدي مدعم (${output.shortageGrams} جم — ${output.tierLabel} — معامل ×${output.legalMultiplier})`,
      fineAmountEgp: output.finalFineAmountEgp,
      status: 'قيد التحقيق',
      notes: output.formulaEquationText,
    });

    if (typeof window !== 'undefined') {
      const store = loadDebtsStore();
      const serial = store.debts.length + 1;
      const debtNumber = `DBT-2026-${String(serial).padStart(3, '0')}`;
      const debtId = `debt-${Date.now()}`;
      const violId = `viol-${Date.now()}`;
      const violationNumber = `VL-2026-${String(store.violations.length + 1).padStart(3, '0')}`;

      const newViol: BakeryViolationRecord = {
        id: violId,
        violationNumber,
        minutesNumber: output.minutesNumber,
        bakeryId: output.bakeryId,
        bakeryName: output.bakeryName,
        ownerName: output.ownerName,
        posNumber: output.posNumber,
        village: output.village,
        localUnit: output.localUnit,
        phone: output.phone,
        violationDate: output.violationDate,
        ruleId: 'rule-14',
        ruleCode: 'W-175-14',
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
        calculationSteps: [output.formulaEquationText],
        legalBasisText: 'طبقاً للقرار الوزاري رقم ١٧٥ لسنة ٢٠٢٤',
        effectiveRuleDate: '2024-10-15',
        status: approvalStatus,
        linkedDebtId: autoLinkToDebt ? debtId : undefined,
        linkedDebtNumber: autoLinkToDebt ? debtNumber : undefined,
        recordedBy: currentUser.fullName,
        approvedBy: approvalStatus === 'معتمد' ? currentUser.fullName : undefined,
        approvedAt: approvalStatus === 'معتمد' ? new Date().toISOString() : undefined,
        notes: output.notes,
        createdAt: new Date().toISOString(),
      };

      let nextDebts = store.debts;
      let nextItems = store.items;

      if (autoLinkToDebt) {
        const newDebt = computeDebtFinancials(
          {
            id: debtId,
            serialNumber: serial,
            debtNumber,
            bakeryId: output.bakeryId,
            bakeryFileNumber: bakeries.find((b) => b.id === output.bakeryId)?.bakeryNumber || '',
            bakeryName: output.bakeryName,
            ownerName: output.ownerName,
            posNumber: output.posNumber,
            village: output.village,
            localUnit: output.localUnit,
            phone: output.phone,
            issuingAuthority: 'إدارة تموين مركز المحلة الكبرى',
            violationType: 'مخالفة نقص وزن خبز بلدي مدعم (١٧٥/٢٠٢٤)',
            minutesNumber: output.minutesNumber,
            violationDate: output.violationDate,
            dueDate: todayRef,
            description: `${output.tierLabel} — ${output.formulaEquationText}`,
            notes: output.notes,
            recordedBy: currentUser.fullName,
            recordedByUserId: currentUser.id,
            approvalStatus: 'معتمد',
            approvedBy: currentUser.fullName,
            approvedAt: new Date().toISOString(),
            originalAmount: output.finalFineAmountEgp,
            priorViolationsAmount: 0,
            additionsAmount: 0,
            disposalsAmount: 0,
            approvedSettlementsAmount: 0,
            advancePaidAmount: 0,
            grossBeforeSettlements: output.finalFineAmountEgp,
            netDueAmount: output.finalFineAmountEgp,
            totalPaidAmount: 0,
            remainingAmount: output.finalFineAmountEgp,
            paymentPercentage: 0,
            remainingPercentage: 100,
            paymentStatus: 'غير مسدد',
            scheduleStatus: 'غير مجدول',
            delayDays: 0,
            linkedViolationId: violId,
            breadTypeLabel: 'خبز بلدي مدعم',
            officialWeightGrams: output.officialWeightGrams,
            actualWeightGrams: output.actualWeightGrams,
            shortageGrams: output.shortageGrams,
            weightTierLabel: output.tierLabel,
            penaltyMultiplier: output.legalMultiplier,
            sackPriceAtViolation: output.sackPriceEgp,
            insuranceQuotaAtViolation: output.insuranceQuota,
            baseFineAmount: output.baseAmountEgp,
            finalFineAmount: output.finalFineAmountEgp,
            createdAt: new Date().toISOString(),
          },
          [],
          [],
          todayRef
        );
        nextDebts = [newDebt, ...store.debts];
        nextItems = [...buildInitialDebtItems(newDebt), ...store.items];
      }

      saveDebtsStore({
        ...store,
        debts: nextDebts,
        items: nextItems,
        violations: [newViol, ...store.violations],
      });
    }
    notify('تم قيد مخالفة نقص الوزن وربطها بسجل المديونيات بنجاح.');
  };

  const togglePin = (key: string) =>
    setPinnedCols((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const columns: SmartTableColumn<EnrichedInspectionRecord>[] = useMemo(
    () => [
      {
        key: 'recordNumber',
        label: 'رقم السجل',
        headerText: 'رقم السجل',
        type: 'numeric',
        defaultWidth: 120,
        measureValue: (rec) => toArabicNumerals(rec.recordNumber),
        render: (rec) => <span className="num-cell font-black text-[#164E83]">{toArabicNumerals(rec.recordNumber)}</span>,
      },
      {
        key: 'bakeryName',
        label: 'المخبز',
        headerText: 'المخبز',
        type: 'name',
        defaultWidth: 168,
        render: (rec) => {
          const bakery = bakeries.find((b) => b.id === rec.bakeryId || b.name === rec.bakeryName);
          return bakery ? (
            <button
              type="button"
              onClick={() => onSelectBakeryDetails(bakery)}
              className="font-extrabold text-[#102A43] hover:text-[#164E83] hover:underline text-right cursor-pointer"
            >
              {rec.bakeryName}
            </button>
          ) : (
            <span className="font-extrabold text-[#102A43]">{rec.bakeryName}</span>
          );
        },
      },
      {
        key: 'ownerName',
        label: 'اسم صاحب المخبز',
        headerText: 'اسم صاحب المخبز',
        type: 'name',
        defaultWidth: 165,
        measureValue: (rec) => rec.ownerName,
        render: (rec) => {
          const bakery = bakeries.find((b) => b.id === rec.bakeryId || b.name === rec.bakeryName);
          return bakery ? (
            <button
              type="button"
              onClick={() => onSelectBakeryDetails(bakery)}
              className="font-black text-slate-800 hover:text-[#164E83] hover:underline text-right cursor-pointer"
            >
              {rec.ownerName}
            </button>
          ) : (
            <span className="font-bold text-slate-800">{rec.ownerName}</span>
          );
        },
      },
      {
        key: 'posNumber',
        label: 'رقم ماكينة POS',
        headerText: 'رقم ماكينة POS',
        type: 'numeric',
        align: 'center',
        defaultWidth: 130,
        measureValue: (rec) => toArabicNumerals(rec.posNumber),
        render: (rec) => {
          const bakery = bakeries.find((b) => b.id === rec.bakeryId || b.name === rec.bakeryName);
          return bakery ? (
            <button
              type="button"
              onClick={() => onSelectBakeryDetails(bakery)}
              title="اضغط لفتح ملف المخبز"
              className="num-cell font-black px-2 py-0.5 rounded bg-slate-100 hover:bg-[#102A43] hover:text-white text-[#102A43] transition-colors cursor-pointer"
            >
              {toArabicNumerals(rec.posNumber)}
            </button>
          ) : (
            <span className="num-cell font-black text-slate-700">{toArabicNumerals(rec.posNumber)}</span>
          );
        },
      },
      {
        key: 'date',
        label: 'التاريخ',
        headerText: 'التاريخ',
        type: 'date',
        align: 'center',
        defaultWidth: 108,
        measureValue: (rec) => formatDateArabic(rec.date),
        render: (rec) => <span className="num-cell text-slate-700">{formatDateArabic(rec.date)}</span>,
      },
      {
        key: 'village',
        label: 'القرية',
        headerText: 'القرية',
        type: 'text',
        defaultWidth: 105,
        render: (rec) => <span className="text-slate-700">{rec.village}</span>,
      },
      {
        key: 'type',
        label: 'النوع',
        headerText: 'النوع',
        type: 'badge',
        align: 'center',
        defaultWidth: 112,
        render: (rec) => (
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-extrabold border whitespace-nowrap ${
              rec.type === 'مخالفة' || rec.type === 'محضر رسمي'
                ? 'bg-red-50 text-red-800 border-red-200'
                : 'bg-blue-50 text-blue-900 border-blue-200'
            }`}
          >
            {rec.type}
          </span>
        ),
      },
      {
        key: 'violationTitle',
        label: 'بيان التفتيش / المخالفة',
        headerText: 'بيان التفتيش / المخالفة',
        type: 'longText',
        defaultWidth: 230,
        measureValue: (rec) => toArabicNumerals(rec.violationTitle),
        render: (rec) => <span className="text-slate-800">{toArabicNumerals(rec.violationTitle)}</span>,
      },
      {
        key: 'inspectorName',
        label: 'المفتش المسؤول',
        headerText: 'المفتش المسؤول',
        type: 'name',
        defaultWidth: 155,
        render: (rec) => <span className="text-slate-800">{rec.inspectorName}</span>,
      },
      {
        key: 'fineAmountEgp',
        label: 'الغرامة (ج.م)',
        headerText: 'الغرامة (ج.م)',
        type: 'currency',
        align: 'center',
        defaultWidth: 115,
        measureValue: (rec) => (rec.fineAmountEgp > 0 ? `${formatArabicNumber(rec.fineAmountEgp)} ج.م` : '—'),
        render: (rec) => (
          <span className="num-cell font-black text-red-800">
            {rec.fineAmountEgp > 0 ? `${formatArabicNumber(rec.fineAmountEgp)} ج.م` : '—'}
          </span>
        ),
      },
      {
        key: 'status',
        label: 'الحالة',
        headerText: 'الحالة',
        type: 'badge',
        align: 'center',
        defaultWidth: 115,
        render: (rec) => (
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-extrabold border whitespace-nowrap ${
              rec.status === 'مطابق' || rec.status === 'تم التسوية' || rec.status === 'مغلق'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : rec.status === 'محال للنيابة'
                ? 'bg-red-700 text-white border-red-800'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {rec.status}
          </span>
        ),
      },
      {
        key: 'actions',
        label: 'الإجراءات',
        headerText: 'الإجراءات',
        type: 'actions',
        align: 'center',
        sortable: false,
        defaultWidth: 320,
        render: (rec) => (
          <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
            <TableActionButtons
              recordLabel={`${rec.recordNumber} — ${rec.bakeryName}`}
              onView={() => {
                const matched = bakeries.find((b) => b.id === rec.bakeryId);
                if (matched) onSelectBakeryDetails(matched);
                else {
                  setToastMsg(`معاينة المحضر رقم ${rec.recordNumber}: ${rec.violationTitle}`);
                  setTimeout(() => setToastMsg(''), 3000);
                }
              }}
              onAdd={() => setShowAddForm(true)}
              onEdit={() => {
                const nextStatus: InspectionRecord['status'] =
                  rec.status === 'تم التسوية' ? 'قيد التحقيق' : 'تم التسوية';
                onUpdateStatus(rec.id, nextStatus);
                setToastMsg(`تم تحديث حالة السجل (${rec.recordNumber}) إلى: ${nextStatus}`);
                setTimeout(() => setToastMsg(''), 3000);
              }}
              onDelete={() => {
                const nextIds = [...deletedInspectionIds, rec.id];
                setDeletedInspectionIds(nextIds);
                saveStoredInspections(inspections.filter((item) => !nextIds.includes(item.id)));
                window.dispatchEvent(new Event('gharbia-departments-updated'));
                setToastMsg(`تم حذف السجل الرقابي (${rec.recordNumber}) بنجاح.`);
                setTimeout(() => setToastMsg(''), 3000);
              }}
            />
          </div>
        ),
      },
    ],
    [bakeries, inspections, deletedInspectionIds, onSelectBakeryDetails, onUpdateStatus]
  );

  return (
    <div className="space-y-4">
      {toastMsg && (
        <div className="bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-md flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#C6A15B]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Animated Colored KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AnimatedStatCard
          title="إجمالي السجلات الرقابية"
          value={stats.total}
          unit="سجل موثق"
          icon={ClipboardCheck}
          theme="navy"
          compact
          delay={0}
        />
        <AnimatedStatCard
          title="الحملات التموينية"
          value={stats.campaigns}
          unit="حملة ميدانية"
          icon={Eye}
          theme="teal"
          compact
          delay={0.05}
        />
        <AnimatedStatCard
          title="المخالفات والمحاضر"
          value={stats.violations}
          unit="محضر ومخالفة"
          icon={AlertOctagon}
          theme="red"
          compact
          delay={0.1}
        />
        <AnimatedStatCard
          title="إجمالي الغرامات المرصودة"
          value={stats.totalFines}
          format="currency"
          indicator="مستحقات رقابية"
          icon={FileWarning}
          theme="gold"
          compact
          delay={0.15}
        />
      </div>

      {/* حاسبة نقص وزن الخبز البلدي المدعم طبقاً للقرار الوزاري ١٧٥ لسنة ٢٠٢٤ */}
      {(showCalculator || activeFocus === 'ins-violations') && (
        <ViolationCalculator
          bakeries={bakeries}
          todayRef={todayRef}
          onOpenBakeryProfile={(bakeryId) => {
            const b = bakeries.find((x) => x.id === bakeryId);
            if (b) onSelectBakeryDetails(b);
          }}
          onRecordAndLinkDebt={handleRecordFromCalculator}
        />
      )}

      {/* منظومة تحرير محاضر مخالفات المخابز متعددة البنود والدليل الشامل (أ-ح) والربط بالمديونيات */}
      <OfficialViolationReportBuilder
        userId={currentUser.id}
        currentUserName={currentUser.fullName}
        bakeries={bakeries}
        todayRef={todayRef}
        onSelectBakeryDetails={onSelectBakeryDetails}
        onNotify={notify}
      />

      {/* Header & Filter Card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-4 bg-[#102A43] text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-black flex items-center gap-2">
              <FileBarChart2 className="w-4 h-4 text-[#C6A15B]" />
              <span>{currentMeta.title}</span>
            </h2>
            <p className="text-xs font-bold text-slate-300 mt-0.5">{currentMeta.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCalculator(!showCalculator)}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Calculator className="w-4 h-4 text-[#C6A15B]" />
              <span>{showCalculator ? 'إخفاء حاسبة نقص الوزن' : 'حاسبة نقص الوزن (١٧٥/٢٠٢٤)'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3.5 py-2 bg-[#C6A15B] hover:bg-[#b58f48] text-[#102A43] rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>تسجيل حملة / مخالفة / محضر</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-[#164E83] hover:bg-[#1e609e] text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#C6A15B]" />
              <span>طباعة التقرير الرقابي</span>
            </button>
            <FactoryResetButton
              sectionName={`التفتيش والرقابة والمخالفات — ${currentMeta.title}`}
              sectionKey="INSPECTIONS_VIOLATIONS"
              currentUser={currentUser}
              description="تصفير كافة سجلات الحملات التموينية والمخالفات والمحاضر فوراً وإعادة الإعدادات للوضع الافتراضي بدون طلب نسخة احتياطية."
              getTableSummary={() => [
                { tableName: 'الحملات التموينية الميدانية', count: stats.campaigns },
                { tableName: 'المخالفات والمحاضر المحررة', count: stats.violations },
                { tableName: 'إجمالي السجلات الرقابية', count: stats.total },
              ]}
              onConfirmReset={() => {
                saveStoredInspections([]);
                if (onResetInspections) {
                  onResetInspections();
                } else {
                  window.dispatchEvent(new CustomEvent('gharbia-inspections-reset'));
                }
                notify('تم تنفيذ التصفير الفوري واستعادة ضبط المصنع لسجلات التفتيش والمخالفات.');
              }}
            />
          </div>
        </div>

        {/* Add New Inspection Form */}
        {showAddForm && (
          <form onSubmit={handleSubmitNew} className="p-4 bg-[#F4F7FB] border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-bold">
            <div>
              <label className="block font-extrabold text-[#102A43] mb-1">المخبز المعني *</label>
              <select
                value={newBakeryId}
                onChange={(e) => setNewBakeryId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
              >
                {bakeries.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} — POS: {b.posNumber} — ({b.ownerName})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-extrabold text-[#102A43] mb-1">تصنيف الإجراء الرقابي *</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as InspectionRecord['type'])}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
              >
                <option value="حملة تموينية">حملة تموينية</option>
                <option value="مخالفة">مخالفة</option>
                <option value="محضر رسمي">محضر رسمي</option>
                <option value="متابعة دورية">متابعة دورية</option>
              </select>
            </div>
            <div>
              <label className="block font-extrabold text-[#102A43] mb-1">قيمة الغرامة المقدرة (ج.م)</label>
              <input
                type="number"
                min={0}
                value={newFine}
                onChange={(e) => setNewFine(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-extrabold text-[#102A43] mb-1">وصف المخالفة أو نتيجة المرور *</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="مثال: نقص وزن الرغيف / عدم نظافة أدوات العجين / مطابقة تامة..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block font-extrabold text-[#102A43] mb-1">حالة الإجراء</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as InspectionRecord['status'])}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
              >
                <option value="قيد التحقيق">قيد التحقيق</option>
                <option value="محال للنيابة">محال للنيابة</option>
                <option value="تم التسوية">تم التسوية</option>
                <option value="مطابق">مطابق</option>
                <option value="مغلق">مغلق</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between gap-3 pt-1">
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="ملاحظات المفتش الميداني (اختياري)..."
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-extrabold cursor-pointer shrink-0"
              >
                حفظ وتوثيق السجل
              </button>
            </div>
          </form>
        )}

        {/* Filter Bar */}
        <div className="p-3 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث برقم المحضر، رقم ماكينة POS، اسم صاحب المخبز، المخبز، القرية أو وصف المخالفة..."
              className="w-full pr-9 pl-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-extrabold text-[#102A43]"
            >
              <option value="all">جميع الحالات</option>
              <option value="قيد التحقيق">قيد التحقيق</option>
              <option value="محال للنيابة">محال للنيابة</option>
              <option value="تم التسوية">تم التسوية</option>
              <option value="مطابق">مطابق</option>
              <option value="مغلق">مغلق</option>
            </select>
          </div>
        </div>
      </div>

      {/* Unified Smart Auto-Fit Inspection Table */}
      <SmartAutoFitTable
        tableId={`inspections_${activeFocus}`}
        userId={currentUser.id}
        rows={filteredRecords}
        totalCount={inspections.length}
        getRowId={(r) => r.id}
        columns={columns}
        sortKey={sortKey}
        sortAsc={sortAsc}
        onSort={handleSort}
        selectable
        selectedIds={selectedIds}
        onToggleSelect={(id) =>
          setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
        }
        onClearSelection={() => setSelectedIds([])}
        pinnedKeys={pinnedCols}
        onPinAll={() => setPinnedCols(['recordNumber', 'bakeryName', 'ownerName', 'posNumber'])}
        onUnpinAll={() => setPinnedCols([])}
        onTogglePinColumn={togglePin}
        onResetPinDefaults={() => setPinnedCols(['recordNumber', 'bakeryName', 'ownerName', 'posNumber'])}
        onNotify={notify}
        theadClassName="bg-slate-100 text-[#102A43] border-b border-slate-300"
        emptyMessage="لا توجد سجلات رقابية مطابقة في هذا القسم حالياً."
      />
    </div>
  );
}
