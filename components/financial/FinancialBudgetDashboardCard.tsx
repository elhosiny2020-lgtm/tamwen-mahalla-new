'use client';

import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  FlaskConical,
  PlusCircle,
  RotateCcw,
  Scale,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import {
  BudgetAllocation,
  BudgetCommitment,
  BudgetExpenseRecord,
  computeBudgetMetrics,
  round2,
} from '@/lib/financial-erp-engine';
import { formatArabicNumber, toArabicNumerals } from '@/lib/utils';

interface FinancialBudgetDashboardCardProps {
  allocations: BudgetAllocation[];
  commitments: BudgetCommitment[];
  expenses: BudgetExpenseRecord[];
  hasDemoData: boolean;
  onLoadDemoData: () => void;
  onResetCleanState: () => void;
  onQuickSimulateExpense: (allocationId: string, amount: number, label: string) => void;
}

export default function FinancialBudgetDashboardCard({
  allocations,
  commitments,
  expenses,
  hasDemoData,
  onLoadDemoData,
  onResetCleanState,
  onQuickSimulateExpense,
}: FinancialBudgetDashboardCardProps) {
  const [selectedAllocId, setSelectedAllocId] = useState<string>('');
  const [simAmount, setSimAmount] = useState<string>('50000');
  const [simDesc, setSimDesc] = useState<string>('مصروف تشغيلي تجريبي مباشر');

  const summary = useMemo(() => {
    const rows = allocations.map((alloc) => ({
      alloc,
      metrics: computeBudgetMetrics(alloc, commitments, expenses),
    }));
    const totalAllocations = round2(rows.reduce((s, r) => s + r.metrics.adjustedBudget, 0));
    const totalSpent = round2(rows.reduce((s, r) => s + r.metrics.actualExpensesTotal, 0));
    const totalOpenCommitments = round2(
      rows.reduce((s, r) => s + r.metrics.reservedCommitmentsOpen, 0)
    );
    const totalAvailable = round2(rows.reduce((s, r) => s + r.metrics.availableBalance, 0));
    const execPct = totalAllocations > 0 ? round2((totalSpent / totalAllocations) * 100) : 0;
    const reservedPct =
      totalAllocations > 0 ? round2((totalOpenCommitments / totalAllocations) * 100) : 0;

    return {
      rows,
      totalAllocations,
      totalSpent,
      totalOpenCommitments,
      totalAvailable,
      execPct,
      reservedPct,
    };
  }, [allocations, commitments, expenses]);

  const effectiveAllocId = selectedAllocId || allocations[0]?.id || '';

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(simAmount);
    if (!effectiveAllocId || !Number.isFinite(numeric) || numeric <= 0) return;
    onQuickSimulateExpense(effectiveAllocId, round2(numeric), simDesc.trim() || 'مصروف تجريبي');
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm sm:text-base font-black text-[#102A43] flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#1B4965]" />
            <span>ملخص الموقف المالي التفاعلي للاعتمادات والمصروفات</span>
            {hasDemoData && (
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-black">
                وضع المعاينة التجريبية
              </span>
            )}
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            عرض مباشر لإجمالي الاعتمادات المعدّلة، والمصروفات الفعلية، والمتاح بعد استبعاد الارتباطات المفتوحة (دون خصم مزدوج).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onLoadDemoData}
            className="px-3 py-1.5 rounded-xl bg-[#102A43] hover:bg-[#1B3B5A] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <FlaskConical className="w-3.5 h-3.5 text-amber-300" />
            <span>تحميل بيانات تجريبية أولية</span>
          </button>
          {allocations.length > 0 && (
            <button
              type="button"
              onClick={onResetCleanState}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#102A43] text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تصفير للوضع النظيف</span>
            </button>
          )}
        </div>
      </div>

      {/* 3 Primary Executive Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#102A43]/20 bg-slate-50/70 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>إجمالي الاعتمادات المالية</span>
            <Scale className="w-4 h-4 text-[#102A43]" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#102A43] tabular-nums">
            {formatArabicNumber(summary.totalAllocations)} ج.م
          </div>
          <div className="text-[11px] text-slate-500 font-semibold">
            {toArabicNumerals(allocations.length)} بند موازنة معتمد بعد الإضافات والمناقلات
          </div>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-rose-800">
            <span>المصروفات الفعلية</span>
            <TrendingDown className="w-4 h-4 text-rose-700" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-800 tabular-nums">
            {formatArabicNumber(summary.totalSpent)} ج.م
          </div>
          <div className="text-[11px] text-rose-700 font-semibold">
            نسبة التنفيذ الفعلي: {toArabicNumerals(summary.execPct)}٪ • ارتباطات مفتوحة:{' '}
            {formatArabicNumber(summary.totalOpenCommitments)} ج.م
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
            <span>المتاح من الاعتمادات</span>
            <Wallet className="w-4 h-4 text-emerald-700" />
          </div>
          <div
            className={`text-xl sm:text-2xl font-black tabular-nums ${
              summary.totalAvailable < 0 ? 'text-rose-700' : 'text-emerald-800'
            }`}
          >
            {formatArabicNumber(summary.totalAvailable)} ج.م
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>المعادلة: الاعتماد المعدّل − (الارتباطات المفتوحة + المنصرف)</span>
          </div>
        </div>
      </div>

      {/* Interactive Stacked Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between text-[11px] font-bold text-slate-600">
          <span>توزيع استهلاك الاعتماد المالي</span>
          <span className="tabular-nums">
            منصرف فعلي {toArabicNumerals(summary.execPct)}٪ • ارتباطات محجوزة{' '}
            {toArabicNumerals(summary.reservedPct)}٪ • متاح{' '}
            {toArabicNumerals(
              Math.max(0, round2(100 - summary.execPct - summary.reservedPct))
            )}
            ٪
          </span>
        </div>
        <div className="h-3.5 w-full rounded-full bg-emerald-100 overflow-hidden flex border border-slate-200">
          <div
            className="h-full bg-rose-600 transition-all duration-300"
            style={{ width: `${Math.min(100, summary.execPct)}%` }}
            title="المصروفات الفعلية"
          />
          <div
            className="h-full bg-amber-400 transition-all duration-300"
            style={{
              width: `${Math.min(Math.max(0, 100 - summary.execPct), summary.reservedPct)}%`,
            }}
            title="الارتباطات المفتوحة"
          />
        </div>
      </div>

      {/* Live Breakdown & Interactive Expense Simulator */}
      {summary.rows.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-1">
          <div className="lg:col-span-7 space-y-2">
            {summary.rows.map(({ alloc, metrics }) => (
              <div
                key={alloc.id}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-1.5 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-black text-[#102A43]">
                    {alloc.code} — {alloc.titleAr}
                  </span>
                  <span className="text-[11px] font-black text-emerald-800 tabular-nums">
                    متاح: {formatArabicNumber(metrics.availableBalance)} ج.م
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-600 tabular-nums">
                  <span>اعتماد: {formatArabicNumber(metrics.adjustedBudget)} ج.م</span>
                  <span>منصرف: {formatArabicNumber(metrics.actualExpensesTotal)} ج.م</span>
                  <span>ارتباطات: {formatArabicNumber(metrics.reservedCommitmentsOpen)} ج.م</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-[#1B4965] rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, metrics.executionPercent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleQuickSubmit}
            className="lg:col-span-5 rounded-xl border border-slate-200 bg-[#F8FAFC] p-3.5 space-y-2.5 text-xs"
          >
            <div className="font-black text-[#102A43] flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-[#1B4965]" />
              <span>محاكي تفاعل فوري — تسجيل مصروف على بند</span>
            </div>
            <select
              value={effectiveAllocId}
              onChange={(e) => setSelectedAllocId(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white font-bold text-[#102A43]"
            >
              {allocations.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.titleAr}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={1}
                step="0.01"
                value={simAmount}
                onChange={(e) => setSimAmount(e.target.value)}
                placeholder="المبلغ (ج.م)"
                className="px-2.5 py-2 rounded-lg border border-slate-300 bg-white font-bold text-[#102A43]"
              />
              <input
                type="text"
                value={simDesc}
                onChange={(e) => setSimDesc(e.target.value)}
                placeholder="بيان المصروف"
                className="px-2.5 py-2 rounded-lg border border-slate-300 bg-white font-bold text-[#102A43]"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-black cursor-pointer transition-colors"
            >
              تسجيل المصروف وتحديث المؤشرات فوراً
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
