'use client';

import React, { useMemo, useState } from 'react';
import {
  Wallet,
  CheckCircle2,
  Coins,
  PlusCircle,
  Store,
  ShieldCheck,
  AlertTriangle,
  CalendarClock,
  Clock,
  AlertOctagon,
  CalendarRange,
  Scale,
  History,
  Layers,
  BadgePercent,
  TrendingUp,
  X,
  BarChart3,
} from 'lucide-react';
import {
  BakeryDebtRecord,
  BakeryRecord,
  DebtInstallmentRecord,
  DebtPaymentRecord,
} from '@/types';
import {
  formatArabicCurrency,
  formatArabicNumber,
  formatArabicPercent,
  formatDateArabic,
  toArabicNumerals,
} from '@/lib/utils';
import { diffDaysBetweenDates, round2 } from '@/lib/debts-engine';
import AnimatedStatCard from '@/components/AnimatedStatCard';
import SmartAutoFitTable, { SmartTableColumn } from '@/components/SmartAutoFitTable';
import { DebtPaymentBadge } from './DebtsSharedUi';

interface DebtsDashboardTabProps {
  userId: string;
  bakeries: BakeryRecord[];
  debts: BakeryDebtRecord[];
  payments: DebtPaymentRecord[];
  installments: DebtInstallmentRecord[];
  todayRef: string;
  onOpenBakeryProfile: (bakeryId: string) => void;
  onNavigateTab: (tabId: string) => void;
}

type DrilldownKey =
  | null
  | 'all_due'
  | 'collected'
  | 'remaining'
  | 'new_month'
  | 'bakeries_with_debt'
  | 'bakeries_paid'
  | 'bakeries_late'
  | 'inst_today'
  | 'inst_7days'
  | 'inst_late'
  | 'scheduled_total'
  | 'fines'
  | 'prior_violations'
  | 'additions_disposals'
  | 'settlements';

export default function DebtsDashboardTab({
  userId,
  debts,
  payments,
  installments,
  todayRef,
  onOpenBakeryProfile,
  onNavigateTab,
}: DebtsDashboardTabProps) {
  const [drilldown, setDrilldown] = useState<DrilldownKey>(null);

  const approvedDebts = useMemo(
    () => debts.filter((d) => d.approvalStatus === 'معتمد'),
    [debts]
  );

  const currentMonthPrefix = todayRef.slice(0, 7);

  const kpis = useMemo(() => {
    const totalDue = round2(approvedDebts.reduce((s, d) => s + d.netDueAmount, 0));
    const totalPaid = round2(approvedDebts.reduce((s, d) => s + d.totalPaidAmount, 0));
    const totalRemaining = round2(approvedDebts.reduce((s, d) => s + d.remainingAmount, 0));
    const newMonthTotal = round2(
      approvedDebts
        .filter((d) => d.violationDate.startsWith(currentMonthPrefix))
        .reduce((s, d) => s + d.netDueAmount, 0)
    );

    const byBakery = new Map<string, { due: number; paid: number; rem: number; late: boolean }>();
    approvedDebts.forEach((d) => {
      const cur = byBakery.get(d.bakeryId) || { due: 0, paid: 0, rem: 0, late: false };
      cur.due += d.netDueAmount;
      cur.paid += d.totalPaidAmount;
      cur.rem += d.remainingAmount;
      if (d.delayDays > 0 && d.remainingAmount > 0) cur.late = true;
      byBakery.set(d.bakeryId, cur);
    });

    const bakeriesWithDebtCount = Array.from(byBakery.values()).filter((v) => v.rem > 0).length;
    const bakeriesPaidCount = Array.from(byBakery.values()).filter((v) => v.due > 0 && v.rem <= 0).length;
    const bakeriesLateCount = Array.from(byBakery.values()).filter((v) => v.late).length;

    const openInsts = installments.filter(
      (i) => i.remainingAmount > 0 && i.status !== 'ملغي بقرار معتمد'
    );
    const instToday = openInsts.filter((i) => diffDaysBetweenDates(i.dueDate, todayRef) === 0);
    const inst7Days = openInsts.filter((i) => {
      const d = diffDaysBetweenDates(i.dueDate, todayRef);
      return d > 0 && d <= 7;
    });
    const instLate = openInsts.filter((i) => diffDaysBetweenDates(todayRef, i.dueDate) > 0);
    const totalScheduled = round2(openInsts.reduce((s, i) => s + i.remainingAmount, 0));

    const totalFines = round2(approvedDebts.reduce((s, d) => s + d.originalAmount, 0));
    const totalPrior = round2(approvedDebts.reduce((s, d) => s + d.priorViolationsAmount, 0));
    const totalAddDisp = round2(
      approvedDebts.reduce((s, d) => s + d.additionsAmount + d.disposalsAmount, 0)
    );
    const totalSettlements = round2(
      approvedDebts.reduce((s, d) => s + d.approvedSettlementsAmount, 0)
    );
    const collectionRate = totalDue > 0 ? round2((totalPaid / totalDue) * 100) : 0;

    return {
      totalDue,
      totalPaid,
      totalRemaining,
      newMonthTotal,
      bakeriesWithDebtCount,
      bakeriesPaidCount,
      bakeriesLateCount,
      instTodayCount: instToday.length,
      inst7DaysCount: inst7Days.length,
      instLateCount: instLate.length,
      totalScheduled,
      totalFines,
      totalPrior,
      totalAddDisp,
      totalSettlements,
      collectionRate,
    };
  }, [approvedDebts, installments, currentMonthPrefix, todayRef]);

  // البيانات التحليلية للرسوم البيانية السبعة
  const charts = useMemo(() => {
    const groupSum = (fn: (d: BakeryDebtRecord) => string, valFn: (d: BakeryDebtRecord) => number) => {
      const m = new Map<string, number>();
      approvedDebts.forEach((d) => {
        const k = fn(d) || 'غير محدد';
        m.set(k, round2((m.get(k) || 0) + valFn(d)));
      });
      return Array.from(m.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
    };

    const byVillage = groupSum((d) => d.village, (d) => d.remainingAmount || d.netDueAmount);
    const byLocalUnit = groupSum((d) => d.localUnit, (d) => d.netDueAmount);
    const byAuthority = groupSum((d) => d.issuingAuthority, (d) => d.netDueAmount);
    const byViolationType = groupSum((d) => d.violationType, (d) => d.netDueAmount);

    // آخر 12 شهر ثابتة انطلاقاً من todayRef
    const [yStr, mStr] = todayRef.split('-');
    const endYear = Number(yStr) || 2026;
    const endMonth = Number(mStr) || 11;
    const monthNames = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
    ];
    const monthlySeries: { ym: string; label: string; due: number; paid: number }[] = [];
    for (let offset = 11; offset >= 0; offset--) {
      const d = new Date(Date.UTC(endYear, endMonth - 1 - offset, 1));
      const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      const label = `${monthNames[d.getUTCMonth()]} ${toArabicNumerals(String(d.getUTCFullYear()).slice(2))}`;
      const due = round2(
        approvedDebts
          .filter((debt) => debt.violationDate.startsWith(ym))
          .reduce((s, debt) => s + debt.netDueAmount, 0)
      );
      const paid = round2(
        payments
          .filter((p) => p.status === 'معتمد' && p.paymentDate.startsWith(ym))
          .reduce((s, p) => s + p.amount, 0)
      );
      monthlySeries.push({ ym, label, due, paid });
    }

    return { byVillage, byLocalUnit, byAuthority, byViolationType, monthlySeries };
  }, [approvedDebts, payments, todayRef]);

  const drilldownRows = useMemo(() => {
    if (!drilldown) return [];
    switch (drilldown) {
      case 'collected':
        return approvedDebts.filter((d) => d.totalPaidAmount > 0);
      case 'remaining':
      case 'bakeries_with_debt':
        return approvedDebts.filter((d) => d.remainingAmount > 0);
      case 'new_month':
        return approvedDebts.filter((d) => d.violationDate.startsWith(currentMonthPrefix));
      case 'bakeries_paid':
        return approvedDebts.filter((d) => d.remainingAmount <= 0 && d.netDueAmount > 0);
      case 'bakeries_late':
        return approvedDebts.filter((d) => d.delayDays > 0 && d.remainingAmount > 0);
      case 'fines':
        return approvedDebts.filter((d) => d.originalAmount > 0);
      case 'prior_violations':
        return approvedDebts.filter((d) => d.priorViolationsAmount > 0);
      case 'additions_disposals':
        return approvedDebts.filter((d) => d.additionsAmount + d.disposalsAmount > 0);
      case 'settlements':
        return approvedDebts.filter((d) => d.approvedSettlementsAmount > 0);
      case 'scheduled_total':
        return approvedDebts.filter((d) => d.scheduleStatus === 'مجدول نشط' || d.scheduleStatus === 'متعثر');
      default:
        return approvedDebts;
    }
  }, [drilldown, approvedDebts, currentMonthPrefix]);

  const drilldownColumns: SmartTableColumn<BakeryDebtRecord>[] = useMemo(
    () => [
      {
        key: 'debtNumber',
        label: 'رقم المديونية',
        headerText: 'رقم المديونية',
        type: 'numeric',
        sortable: true,
        render: (r) => <span className="num-cell font-black text-[#102A43]">{toArabicNumerals(r.debtNumber)}</span>,
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
        key: 'ownerName',
        label: 'صاحب المخبز',
        headerText: 'صاحب المخبز',
        type: 'text',
        sortable: true,
        render: (r) => <span className="font-bold text-slate-800">{r.ownerName}</span>,
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
            className="num-cell font-black px-2 py-0.5 rounded bg-slate-100 hover:bg-[#102A43] hover:text-white transition-colors cursor-pointer"
          >
            {toArabicNumerals(r.posNumber)}
          </button>
        ),
      },
      {
        key: 'village',
        label: 'القرية',
        headerText: 'القرية',
        type: 'text',
        sortable: true,
        render: (r) => <span className="font-bold text-slate-700">{r.village}</span>,
      },
      {
        key: 'netDueAmount',
        label: 'صافي المستحق',
        headerText: 'صافي المستحق',
        type: 'currency',
        sortable: true,
        render: (r) => <span className="num-cell font-black text-[#102A43]">{formatArabicCurrency(r.netDueAmount)}</span>,
      },
      {
        key: 'totalPaidAmount',
        label: 'المسدد',
        headerText: 'المسدد',
        type: 'currency',
        sortable: true,
        render: (r) => <span className="num-cell font-black text-emerald-700">{formatArabicCurrency(r.totalPaidAmount)}</span>,
      },
      {
        key: 'remainingAmount',
        label: 'المتبقي',
        headerText: 'المتبقي',
        type: 'currency',
        sortable: true,
        render: (r) => <span className="num-cell font-black text-red-700">{formatArabicCurrency(r.remainingAmount)}</span>,
      },
      {
        key: 'dueDate',
        label: 'الاستحقاق',
        headerText: 'الاستحقاق',
        type: 'date',
        sortable: true,
        render: (r) => <span className="num-cell font-bold text-slate-700">{formatDateArabic(r.dueDate)}</span>,
      },
      {
        key: 'paymentStatus',
        label: 'الحالة',
        headerText: 'الحالة',
        type: 'badge',
        sortable: true,
        render: (r) => <DebtPaymentBadge status={r.paymentStatus} />,
      },
    ],
    [onOpenBakeryProfile]
  );

  const renderHorizontalBars = (
    title: string,
    items: { label: string; value: number }[],
    barColor: string
  ) => {
    const maxVal = Math.max(...items.map((i) => i.value), 1);
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h4 className="font-black text-[12px] text-[#102A43] flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-[#C6A15B]" />
            {title}
          </h4>
          <span className="text-[10px] font-bold text-slate-500">{toArabicNumerals(items.length)} بنود</span>
        </div>
        {items.length === 0 ? (
          <p className="text-[11px] font-bold text-slate-500 text-center py-6">لا توجد بيانات مسجلة حتى الآن</p>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => {
              const pct = Math.max(4, Math.round((item.value / maxVal) * 100));
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold gap-2">
                    <span className="text-slate-800 truncate">{item.label}</span>
                    <span className="num-cell font-black text-[#102A43] shrink-0">
                      {formatArabicCurrency(item.value)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const maxMonthlyVal = Math.max(
    ...charts.monthlySeries.flatMap((m) => [m.due, m.paid]),
    1
  );

  return (
    <div className="space-y-5">
      {/* البطاقات الإحصائية التفاعلية الـ 16 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <AnimatedStatCard
          title="١. إجمالي المديونيات المستحقة"
          value={kpis.totalDue}
          format="currency"
          icon={Wallet}
          theme="navy"
          indicator={`${toArabicNumerals(approvedDebts.length)} ملف معتمد`}
          onClick={() => setDrilldown('all_due')}
        />
        <AnimatedStatCard
          title="٢. إجمالي المبالغ التي تم تحصيلها"
          value={kpis.totalPaid}
          format="currency"
          icon={CheckCircle2}
          theme="green"
          indicator={`نسبة ${formatArabicPercent(kpis.collectionRate, 1)}`}
          onClick={() => setDrilldown('collected')}
        />
        <AnimatedStatCard
          title="٣. إجمالي المديونيات المتبقية"
          value={kpis.totalRemaining}
          format="currency"
          icon={Coins}
          theme="red"
          indicator="رصيد مفتوح للتحصيل"
          onClick={() => setDrilldown('remaining')}
        />
        <AnimatedStatCard
          title="٤. المديونيات الجديدة خلال الشهر الحالي"
          value={kpis.newMonthTotal}
          format="currency"
          icon={PlusCircle}
          theme="gold"
          indicator={formatDateArabic(todayRef)}
          onClick={() => setDrilldown('new_month')}
        />

        <AnimatedStatCard
          title="٥. عدد المخابز التي عليها مديونية"
          value={kpis.bakeriesWithDebtCount}
          unit="مخبز"
          icon={Store}
          theme="purple"
          onClick={() => setDrilldown('bakeries_with_debt')}
        />
        <AnimatedStatCard
          title="٦. عدد المخابز المسددة بالكامل"
          value={kpis.bakeriesPaidCount}
          unit="مخبز"
          icon={ShieldCheck}
          theme="green"
          onClick={() => setDrilldown('bakeries_paid')}
        />
        <AnimatedStatCard
          title="٧. عدد المخابز المتأخرة في السداد"
          value={kpis.bakeriesLateCount}
          unit="مخبز"
          icon={AlertTriangle}
          theme="red"
          onClick={() => setDrilldown('bakeries_late')}
        />
        <AnimatedStatCard
          title="٨. الأقساط المستحقة اليوم"
          value={kpis.instTodayCount}
          unit="قسط"
          icon={CalendarClock}
          theme="gold"
          onClick={() => onNavigateTab('alerts')}
        />

        <AnimatedStatCard
          title="٩. الأقساط المستحقة خلال ٧ أيام"
          value={kpis.inst7DaysCount}
          unit="قسط"
          icon={Clock}
          theme="teal"
          onClick={() => onNavigateTab('alerts')}
        />
        <AnimatedStatCard
          title="١٠. عدد الأقساط المتأخرة"
          value={kpis.instLateCount}
          unit="قسط"
          icon={AlertOctagon}
          theme="red"
          onClick={() => onNavigateTab('scheduling')}
        />
        <AnimatedStatCard
          title="١١. إجمالي المبالغ المجدولة"
          value={kpis.totalScheduled}
          format="currency"
          icon={CalendarRange}
          theme="navy"
          onClick={() => setDrilldown('scheduled_total')}
        />
        <AnimatedStatCard
          title="١٢. إجمالي الغرامات الأساسية"
          value={kpis.totalFines}
          format="currency"
          icon={Scale}
          theme="gold"
          onClick={() => setDrilldown('fines')}
        />

        <AnimatedStatCard
          title="١٣. إجمالي المخالفات السابقة"
          value={kpis.totalPrior}
          format="currency"
          icon={History}
          theme="purple"
          onClick={() => setDrilldown('prior_violations')}
        />
        <AnimatedStatCard
          title="١٤. إجمالي الإضافات والتصرفات"
          value={kpis.totalAddDisp}
          format="currency"
          icon={Layers}
          theme="teal"
          onClick={() => setDrilldown('additions_disposals')}
        />
        <AnimatedStatCard
          title="١٥. إجمالي التسويات المعتمدة"
          value={kpis.totalSettlements}
          format="currency"
          icon={BadgePercent}
          theme="navy"
          onClick={() => setDrilldown('settlements')}
        />
        <AnimatedStatCard
          title="١٦. نسبة التحصيل العامة"
          value={kpis.collectionRate}
          format="percent"
          decimals={1}
          icon={TrendingUp}
          theme="green"
          indicator={`محصل ${formatArabicNumber(kpis.totalPaid)} ج.م`}
          onClick={() => onNavigateTab('payments')}
        />
      </div>

      {/* نافذة الحفر التفصيلي التفاعلي عند الضغط على أي بطاقة */}
      {drilldown && (
        <div className="bg-white rounded-2xl border-2 border-[#102A43]/30 p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <h3 className="font-black text-[13px] text-[#102A43]">
              تفاصيل السجلات المرتبطة بالمؤشر ({toArabicNumerals(drilldownRows.length)} سجل)
            </h3>
            <button
              type="button"
              onClick={() => setDrilldown(null)}
              className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <SmartAutoFitTable
            tableId={`debts-drilldown-${drilldown}`}
            userId={userId}
            rows={drilldownRows}
            totalCount={drilldownRows.length}
            getRowId={(r) => r.id}
            columns={drilldownColumns}
            maxHeightClass="max-h-[38vh]"
          />
        </div>
      )}

      {/* الرسوم البيانية السبعة */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {renderHorizontalBars('١. توزيع المديونيات حسب القرية', charts.byVillage, 'bg-[#102A43]')}
        {renderHorizontalBars('٢. توزيع المديونيات حسب الوحدة المحلية', charts.byLocalUnit, 'bg-[#164E83]')}
        {renderHorizontalBars('٣. توزيع المديونيات حسب الجهة المصدرة', charts.byAuthority, 'bg-[#C6A15B]')}
        {renderHorizontalBars('٤. توزيع المديونيات حسب نوع المخالفة', charts.byViolationType, 'bg-red-700')}
      </div>

      {/* مقارنة المستحق مقابل المحصل + التحصيل الشهري + تطور آخر 12 شهراً */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* مقارنة المستحق مقابل المحصل */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <h4 className="font-black text-[12px] text-[#102A43] border-b border-slate-100 pb-2">
            ٦. مقارنة إجمالي المستحق مقابل المحصل
          </h4>
          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-[11px] font-black mb-1">
                <span>المستحق الصافي</span>
                <span className="num-cell text-[#102A43]">{formatArabicCurrency(kpis.totalDue)}</span>
              </div>
              <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#102A43] rounded-full w-full" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] font-black mb-1">
                <span>المحصل الفعلي ({formatArabicPercent(kpis.collectionRate, 1)})</span>
                <span className="num-cell text-emerald-700">{formatArabicCurrency(kpis.totalPaid)}</span>
              </div>
              <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, kpis.collectionRate)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] font-black mb-1">
                <span>المتبقي قيد التحصيل</span>
                <span className="num-cell text-red-700">{formatArabicCurrency(kpis.totalRemaining)}</span>
              </div>
              <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(0, Math.min(100, 100 - kpis.collectionRate))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* التحصيل الشهري وتطور المديونيات خلال آخر 12 شهراً */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 flex-wrap gap-2">
            <h4 className="font-black text-[12px] text-[#102A43]">
              ٥ و ٧. التحصيل الشهري وتطور المديونيات خلال آخر ١٢ شهراً
            </h4>
            <div className="flex items-center gap-3 text-[10px] font-black">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#102A43] inline-block" /> مديونيات مسجلة
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" /> تحصيلات معتمدة
              </span>
            </div>
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 items-end h-44 pt-4">
            {charts.monthlySeries.map((m) => {
              const duePct = Math.round((m.due / maxMonthlyVal) * 100);
              const paidPct = Math.round((m.paid / maxMonthlyVal) * 100);
              return (
                <div key={m.ym} className="flex flex-col items-center h-full justify-end gap-1 group">
                  <div className="w-full flex items-end justify-center gap-0.5 h-32">
                    <div
                      title={`مديونية ${m.label}: ${formatArabicCurrency(m.due)}`}
                      className="w-2.5 sm:w-3 bg-[#102A43] rounded-t transition-all duration-500"
                      style={{ height: `${Math.max(m.due > 0 ? 8 : 2, duePct)}%` }}
                    />
                    <div
                      title={`تحصيل ${m.label}: ${formatArabicCurrency(m.paid)}`}
                      className="w-2.5 sm:w-3 bg-emerald-600 rounded-t transition-all duration-500"
                      style={{ height: `${Math.max(m.paid > 0 ? 8 : 2, paidPct)}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-black text-slate-600 text-center leading-tight">
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
