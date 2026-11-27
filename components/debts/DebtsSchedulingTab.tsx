'use client';

import React, { useMemo, useState } from 'react';
import {
  CalendarPlus,
  Eye,
  CalendarClock,
  CreditCard,
  PauseCircle,
  Search,
  Download,
  X,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  BakeryDebtRecord,
  DebtInstallmentRecord,
  DebtModuleSettings,
  DebtSchedulePlan,
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
import SmartAutoFitTable, { SmartTableColumn } from '@/components/SmartAutoFitTable';
import { InstallmentStatusBadge } from './DebtsSharedUi';

interface DebtsSchedulingTabProps {
  userId: string;
  currentUserName: string;
  debts: BakeryDebtRecord[];
  schedules: DebtSchedulePlan[];
  installments: DebtInstallmentRecord[];
  settings: DebtModuleSettings;
  todayRef: string;
  initialScheduleDebt?: BakeryDebtRecord | null;
  onClearInitialScheduleDebt?: () => void;
  onCreateSchedulePlan: (
    plan: Omit<DebtSchedulePlan, 'id' | 'scheduleNumber' | 'createdAt'>,
    generatedInstallments: DebtInstallmentRecord[]
  ) => { ok: boolean; error?: string };
  onPostponeInstallment: (installmentId: string, newDate: string, reason: string) => void;
  onPayInstallmentShortcut: (debt: BakeryDebtRecord, installment: DebtInstallmentRecord) => void;
  onOpenBakeryProfile: (bakeryId: string) => void;
}

export default function DebtsSchedulingTab({
  userId,
  currentUserName,
  debts,
  schedules,
  installments,
  settings,
  todayRef,
  initialScheduleDebt,
  onClearInitialScheduleDebt,
  onCreateSchedulePlan,
  onPostponeInstallment,
  onPayInstallmentShortcut,
  onOpenBakeryProfile,
}: DebtsSchedulingTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('الكل');
  const [sortKey, setSortKey] = useState<string>('dueDate');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const schedulableDebts = useMemo(
    () =>
      debts.filter(
        (d) =>
          d.approvalStatus === 'معتمد' &&
          d.remainingAmount > 0 &&
          !schedules.some((s) => s.debtId === d.id && (s.status === 'معتمد نشط' || s.status === 'متعثر'))
      ),
    [debts, schedules]
  );

  const [showCreateModal, setShowCreateModal] = useState(Boolean(initialScheduleDebt));
  const [sDebtId, setSDebtId] = useState<string>(initialScheduleDebt?.id || schedulableDebts[0]?.id || '');
  const [sType, setSType] = useState<ScheduleFrequencyType>('سداد شهري');
  const [sDownPayment, setSDownPayment] = useState<number>(0);
  const [sCount, setSCount] = useState<number>(3);
  const [sFirstDate, setSFirstDate] = useState<string>(todayRef);
  const [sDayHint, setSDayHint] = useState<string>('أول كل شهر');
  const [sNotes, setSNotes] = useState<string>('');
  const [sDraftInsts, setSDraftInsts] = useState<DebtInstallmentRecord[]>([]);
  const [sErr, setSErr] = useState<string>('');

  const [postponeInst, setPostponeInst] = useState<DebtInstallmentRecord | null>(null);
  const [postponeDate, setPostponeDate] = useState<string>(todayRef);
  const [postponeReason, setPostponeReason] = useState<string>('');

  const selectedDebt = useMemo(
    () => debts.find((d) => d.id === sDebtId) || schedulableDebts[0] || null,
    [debts, sDebtId, schedulableDebts]
  );

  const rebuildDraft = (
    debt: BakeryDebtRecord | null,
    downPay: number,
    freq: ScheduleFrequencyType,
    firstDate: string,
    count: number
  ) => {
    if (!debt) return;
    const schedAmt = Math.max(0, round2(debt.remainingAmount - Math.max(0, downPay)));
    const tempId = `sch-draft`;
    const list = generateInstallmentsDraft({
      scheduleId: tempId,
      scheduleNumber: 'DRAFT',
      debt,
      scheduledAmount: schedAmt,
      scheduleType: freq,
      firstInstallmentDate: firstDate,
      installmentsCount: freq === 'سداد دفعة واحدة' ? 1 : count,
    });
    setSDraftInsts(list);
  };

  const openNewPlanModal = (debt?: BakeryDebtRecord) => {
    const target = debt || schedulableDebts[0] || null;
    setSDebtId(target?.id || '');
    setSDownPayment(0);
    setSType('سداد شهري');
    setSCount(3);
    setSFirstDate(todayRef);
    setSErr('');
    rebuildDraft(target, 0, 'سداد شهري', todayRef, 3);
    setShowCreateModal(true);
  };

  const draftSum = useMemo(
    () => round2(sDraftInsts.reduce((s, i) => s + i.amount, 0)),
    [sDraftInsts]
  );

  const handleSavePlan = () => {
    setSErr('');
    if (!selectedDebt) {
      setSErr('لا توجد مديونية متاحة للجدولة.');
      return;
    }
    const scheduledAmount = round2(selectedDebt.remainingAmount - Math.max(0, sDownPayment));
    if (scheduledAmount <= 0) {
      setSErr('المبلغ المطلوب جدولته يجب أن يكون أكبر من صفر.');
      return;
    }
    if (Math.abs(draftSum - scheduledAmount) > 0.01) {
      setSErr(
        `مجموع الأقساط (${formatArabicCurrency(draftSum)}) يجب أن يطابق المبلغ المجدول (${formatArabicCurrency(scheduledAmount)}) بالقرش.`
      );
      return;
    }
    const sortedDates = [...sDraftInsts].map((i) => i.dueDate).sort();
    const res = onCreateSchedulePlan(
      {
        bakeryId: selectedDebt.bakeryId,
        bakeryName: selectedDebt.bakeryName,
        ownerName: selectedDebt.ownerName,
        posNumber: selectedDebt.posNumber,
        debtId: selectedDebt.id,
        debtNumber: selectedDebt.debtNumber,
        totalRemainingAtCreation: selectedDebt.remainingAmount,
        downPayment: round2(sDownPayment),
        scheduledAmount,
        scheduleType: sType,
        startDate: todayRef,
        installmentsCount: sDraftInsts.length,
        installmentAmount: sDraftInsts[0]?.amount || scheduledAmount,
        firstInstallmentDate: sortedDates[0] || sFirstDate,
        paymentDayHint: sDayHint,
        lastInstallmentDate: sortedDates[sortedDates.length - 1] || sFirstDate,
        notes: sNotes.trim(),
        responsibleUser: currentUserName,
        status: 'معتمد نشط',
      },
      sDraftInsts
    );
    if (!res.ok) {
      setSErr(res.error || 'تعذر حفظ الخطة');
      return;
    }
    setShowCreateModal(false);
    onClearInitialScheduleDebt?.();
  };

  const filteredInstallments = useMemo(() => {
    const q = normalizeSearchText(searchTerm);
    const list = installments.filter((i) => {
      if (statusFilter !== 'الكل' && i.status !== statusFilter) return false;
      if (!q) return true;
      return normalizeSearchText(
        `${i.scheduleNumber} ${i.debtNumber} ${i.bakeryName} ${i.ownerName} ${i.posNumber}`
      ).includes(q);
    });
    return [...list].sort((a, b) =>
      compareTableValues(
        (a as unknown as Record<string, unknown>)[sortKey],
        (b as unknown as Record<string, unknown>)[sortKey],
        sortAsc
      )
    );
  }, [installments, searchTerm, statusFilter, sortKey, sortAsc]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const instColumns: SmartTableColumn<DebtInstallmentRecord>[] = useMemo(
    () => [
      { key: 'scheduleNumber', label: 'رقم الجدول', headerText: 'رقم الجدول', type: 'numeric', sortable: true, render: (r) => <span className="num-cell font-black text-[#102A43]">{toArabicNumerals(r.scheduleNumber)}</span> },
      { key: 'installmentSerial', label: 'رقم القسط', headerText: 'رقم القسط', type: 'numeric', sortable: true, render: (r) => <span className="num-cell font-black">قسط #{toArabicNumerals(r.installmentSerial)}</span> },
      { key: 'debtNumber', label: 'رقم المديونية', headerText: 'رقم المديونية', type: 'numeric', sortable: true, render: (r) => <span className="num-cell font-bold">{toArabicNumerals(r.debtNumber)}</span> },
      {
        key: 'bakeryName',
        label: 'اسم المخبز',
        headerText: 'اسم المخبز',
        type: 'text',
        sortable: true,
        render: (r) => (
          <button type="button" onClick={() => onOpenBakeryProfile(r.bakeryId)} className="font-black text-[#164E83] hover:underline cursor-pointer text-right">
            {r.bakeryName}
          </button>
        ),
      },
      { key: 'ownerName', label: 'صاحب المخبز', headerText: 'صاحب المخبز', type: 'text', sortable: true, render: (r) => <span className="font-bold">{r.ownerName}</span> },
      {
        key: 'posNumber',
        label: 'رقم ماكينة POS',
        headerText: 'رقم ماكينة POS',
        type: 'numeric',
        sortable: true,
        render: (r) => (
          <button type="button" onClick={() => onOpenBakeryProfile(r.bakeryId)} className="num-cell font-black px-2 py-0.5 rounded bg-slate-100 hover:bg-[#102A43] hover:text-white cursor-pointer">
            {toArabicNumerals(r.posNumber)}
          </button>
        ),
      },
      { key: 'dueDate', label: 'تاريخ الاستحقاق', headerText: 'تاريخ الاستحقاق', type: 'date', sortable: true, render: (r) => <span className="num-cell font-black">{formatDateArabic(r.dueDate)}</span> },
      { key: 'amount', label: 'قيمة القسط', headerText: 'قيمة القسط', type: 'currency', sortable: true, render: (r) => <span className="num-cell font-black">{formatArabicCurrency(r.amount)}</span> },
      { key: 'paidAmount', label: 'المسدد', headerText: 'المسدد', type: 'currency', sortable: true, render: (r) => <span className="num-cell font-black text-emerald-700">{formatArabicCurrency(r.paidAmount)}</span> },
      { key: 'remainingAmount', label: 'المتبقي', headerText: 'المتبقي', type: 'currency', sortable: true, render: (r) => <span className="num-cell font-black text-red-700">{formatArabicCurrency(r.remainingAmount)}</span> },
      { key: 'actualPaidDate', label: 'تاريخ السداد الفعلي', headerText: 'تاريخ السداد الفعلي', type: 'date', sortable: true, render: (r) => <span className="num-cell font-bold">{r.actualPaidDate ? formatDateArabic(r.actualPaidDate) : '—'}</span> },
      { key: 'delayDays', label: 'أيام التأخير', headerText: 'أيام التأخير', type: 'numeric', sortable: true, render: (r) => <span className={`num-cell font-black ${r.delayDays > 0 ? 'text-red-700' : 'text-slate-500'}`}>{r.delayDays > 0 ? `${toArabicNumerals(r.delayDays)} يوم` : '٠'}</span> },
      { key: 'status', label: 'حالة القسط', headerText: 'حالة القسط', type: 'badge', sortable: true, render: (r) => <InstallmentStatusBadge status={r.status} /> },
      {
        key: 'actions',
        label: 'الإجراءات',
        headerText: 'الإجراءات',
        type: 'actions',
        render: (r) => (
          <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
            <button
              type="button"
              onClick={() => onOpenBakeryProfile(r.bakeryId)}
              title="عرض ملف المخبز"
              className="p-1.5 rounded-xl bg-blue-50 hover:bg-[#102A43] hover:text-white text-[#164E83] border border-blue-200 cursor-pointer transition-colors"
            >
              <Eye className="w-5 h-5" />
            </button>
            {r.remainingAmount > 0 && r.status !== 'ملغي بقرار معتمد' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const parent = debts.find((d) => d.id === r.debtId);
                    if (parent) onPayInstallmentShortcut(parent, r);
                  }}
                  title="سداد هذا القسط"
                  className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-700 hover:text-white text-emerald-800 border border-emerald-200 cursor-pointer transition-colors"
                >
                  <CreditCard className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPostponeInst(r);
                    setPostponeDate(r.dueDate);
                    setPostponeReason('');
                  }}
                  title="تأجيل / تعديل القسط بموافقة معتمدة"
                  className="p-1.5 rounded-xl bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-800 border border-amber-200 cursor-pointer transition-colors"
                >
                  <PauseCircle className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        ),
      },
    ],
    [debts, onOpenBakeryProfile, onPayInstallmentShortcut]
  );

  return (
    <div className="space-y-4">
      {/* ملخص الخطط النشطة */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث في الأقساط والجداول برقم الجدول، المديونية، اسم المخبز، صاحب المخبز أو POS..."
              className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-300 text-[12px] font-bold"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-2.5 py-2 rounded-xl border border-slate-300 text-[11px] font-black bg-slate-50">
              <option value="الكل">حالة القسط: الكل</option>
              {['مجدول', 'مستحق اليوم', 'تم السداد', 'مسدد جزئيًا', 'متأخر', 'متأخر جزئيًا', 'مؤجل بموافقة', 'ملغي بقرار معتمد'].map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => openNewPlanModal(initialScheduleDebt || undefined)}
              className="px-3.5 py-2 rounded-xl bg-[#102A43] text-white font-black text-[11px] hover:bg-[#164E83] cursor-pointer flex items-center gap-1.5"
            >
              <CalendarPlus className="w-4 h-4 text-[#C6A15B]" />
              إنشاء خطة جدولة أقساط جديدة
            </button>
            <button
              type="button"
              onClick={() =>
                exportCsvUtf8Bom(
                  `جدول_أقساط_المديونيات_${todayRef}`,
                  ['رقم الجدول', 'القسط', 'المديونية', 'المخبز', 'صاحب المخبز', 'POS', 'تاريخ الاستحقاق', 'القيمة', 'المسدد', 'المتبقي', 'الحالة'],
                  filteredInstallments.map((i) => [
                    i.scheduleNumber, i.installmentSerial, i.debtNumber, i.bakeryName, i.ownerName,
                    i.posNumber, i.dueDate, i.amount, i.paidAmount, i.remainingAmount, i.status,
                  ])
                )
              }
              className="px-3 py-2 rounded-xl bg-emerald-700 text-white font-black text-[11px] cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              تصدير CSV
            </button>
          </div>
        </div>

        {/* بطاقات ملخص الخطط الحالية */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {schedules.map((sch) => (
            <div key={sch.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col justify-between gap-1.5 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="num-cell font-black text-[#102A43]">{toArabicNumerals(sch.scheduleNumber)} · {sch.scheduleType}</span>
                <span className={`px-2 py-0.5 rounded font-black text-[10px] ${sch.status === 'متعثر' ? 'bg-red-100 text-red-900' : 'bg-blue-100 text-blue-900'}`}>
                  {sch.status}
                </span>
              </div>
              <div className="font-black text-[#164E83]">{sch.bakeryName} ({sch.ownerName} — <span className="num-cell">{toArabicNumerals(sch.posNumber)}</span>)</div>
              <div className="flex justify-between text-slate-700 font-bold">
                <span>المجدول: <strong className="num-cell">{formatArabicCurrency(sch.scheduledAmount)}</strong></span>
                <span>عدد الأقساط: <strong className="num-cell">{toArabicNumerals(sch.installmentsCount)}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* جدول الأقساط الرئيسي */}
      <SmartAutoFitTable
        tableId="bakery-debts-installments-registry"
        userId={userId}
        rows={filteredInstallments}
        totalCount={filteredInstallments.length}
        getRowId={(r) => r.id}
        columns={instColumns}
        sortKey={sortKey}
        sortAsc={sortAsc}
        onSort={handleSort}
        pinnedKeys={['scheduleNumber', 'installmentSerial', 'bakeryName', 'ownerName', 'posNumber']}
        maxHeightClass="max-h-[55vh]"
      />

      {/* نافذة إنشاء خطة جدولة أقساط جديدة */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-black text-base text-[#102A43] flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-[#C6A15B]" />
                إنشاء خطة جدولة مديونية وتوليد الأقساط الآلي
              </h3>
              <button
                type="button"
                onClick={() => { setShowCreateModal(false); onClearInitialScheduleDebt?.(); }}
                className="p-1.5 rounded-lg bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {sErr && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 font-black text-[11px] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {sErr}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-[10.5px] font-black text-slate-700 mb-1">اختر المديونية المراد جدولتها</label>
                <select
                  value={selectedDebt?.id || ''}
                  onChange={(e) => {
                    const found = debts.find((d) => d.id === e.target.value) || null;
                    setSDebtId(e.target.value);
                    rebuildDraft(found, sDownPayment, sType, sFirstDate, sCount);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[11px] font-black"
                >
                  {schedulableDebts.length === 0 ? (
                    <option value="">جميع المديونيات المتبقية مجدولة حالياً أو مسددة</option>
                  ) : (
                    schedulableDebts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.debtNumber} — {d.bakeryName} (POS: {d.posNumber}) — المتبقي: {formatArabicCurrency(d.remainingAmount)}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-black text-slate-700 mb-1">نظام الجدولة المعتمد (٨ أنظمة)</label>
                <select
                  value={sType}
                  onChange={(e) => {
                    const nt = e.target.value as ScheduleFrequencyType;
                    setSType(nt);
                    const cnt = nt === 'سداد دفعة واحدة' ? 1 : sCount;
                    setSCount(cnt);
                    rebuildDraft(selectedDebt, sDownPayment, nt, sFirstDate, cnt);
                  }}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-black"
                >
                  {settings.scheduleTypes.map((st) => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-black text-slate-700 mb-1">الدفعة المقدمة (ج.م)</label>
                <input
                  type="number"
                  min={0}
                  max={selectedDebt?.remainingAmount || 0}
                  step="0.01"
                  value={sDownPayment}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value) || 0);
                    setSDownPayment(val);
                    rebuildDraft(selectedDebt, val, sType, sFirstDate, sCount);
                  }}
                  className="num-cell w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[12px] font-black"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-black text-slate-700 mb-1">عدد الأقساط</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  disabled={sType === 'سداد دفعة واحدة'}
                  value={sCount}
                  onChange={(e) => {
                    const cnt = Math.max(1, Math.min(60, Number(e.target.value) || 1));
                    setSCount(cnt);
                    rebuildDraft(selectedDebt, sDownPayment, sType, sFirstDate, cnt);
                  }}
                  className="num-cell w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[12px] font-black"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-black text-slate-700 mb-1">تاريخ أول قسط</label>
                <input
                  type="date"
                  value={sFirstDate}
                  onChange={(e) => {
                    setSFirstDate(e.target.value);
                    rebuildDraft(selectedDebt, sDownPayment, sType, e.target.value, sCount);
                  }}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-bold"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-black text-slate-700 mb-1">يوم السداد الدوري</label>
                <input type="text" value={sDayHint} onChange={(e) => setSDayHint(e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-bold" />
              </div>

              <div>
                <label className="block text-[10.5px] font-black text-slate-700 mb-1">ملاحظات الجدولة</label>
                <input type="text" value={sNotes} onChange={(e) => setSNotes(e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-bold" />
              </div>
            </div>

            {/* معاينة وتعديل الأقساط قبل الاعتماد */}
            {sDraftInsts.length > 0 && (
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                <div className="flex flex-wrap items-center justify-between text-[11px] font-black">
                  <span>جدول الأقساط المولد (يمكن تعديل التواريخ أو المبالغ قبل الاعتماد النهائي):</span>
                  <span className="num-cell text-[#102A43]">إجمالي الأقساط: {formatArabicCurrency(draftSum)}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto">
                  {sDraftInsts.map((inst, idx) => (
                    <div key={inst.id} className="bg-white border border-slate-200 rounded-lg p-2 space-y-1.5 text-[11px]">
                      <div className="font-black text-[#102A43]">قسط #{toArabicNumerals(inst.installmentSerial)}</div>
                      <input
                        type="date"
                        value={inst.dueDate}
                        onChange={(e) => {
                          const next = [...sDraftInsts];
                          next[idx] = { ...next[idx], dueDate: e.target.value };
                          setSDraftInsts(next);
                        }}
                        className="w-full px-2 py-1 rounded border border-slate-300 text-[11px] font-bold"
                      />
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={inst.amount}
                        onChange={(e) => {
                          const val = Math.max(0, round2(Number(e.target.value) || 0));
                          const next = [...sDraftInsts];
                          next[idx] = { ...next[idx], amount: val, remainingAmount: val };
                          setSDraftInsts(next);
                        }}
                        className="num-cell w-full px-2 py-1 rounded border border-slate-300 text-[11px] font-black"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button type="button" onClick={() => { setShowCreateModal(false); onClearInitialScheduleDebt?.(); }} className="px-4 py-2 rounded-xl bg-slate-100 font-black text-[11px] cursor-pointer">
                إلغاء
              </button>
              <button type="button" disabled={!selectedDebt} onClick={handleSavePlan} className="px-5 py-2 rounded-xl bg-[#102A43] text-white font-black text-[11px] disabled:opacity-40 cursor-pointer flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#C6A15B]" />
                اعتماد وتفعيل خطة السداد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تأجيل قسط بموافقة معتمدة */}
      {postponeInst && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 w-full max-w-md space-y-3">
            <h4 className="font-black text-[13px] text-[#102A43]">
              تأجيل القسط #{toArabicNumerals(postponeInst.installmentSerial)} — {postponeInst.bakeryName}
            </h4>
            <div>
              <label className="block text-[10.5px] font-black mb-1">الموعد الجديد للاستحقاق</label>
              <input type="date" value={postponeDate} onChange={(e) => setPostponeDate(e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-bold" />
            </div>
            <div>
              <label className="block text-[10.5px] font-black mb-1">سبب التأجيل ومستند الموافقة</label>
              <textarea rows={2} value={postponeReason} onChange={(e) => setPostponeReason(e.target.value)} placeholder="أدخل سبب التأجيل المعتمد..." className="w-full p-2.5 rounded-lg border border-slate-300 text-[11px] font-bold" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPostponeInst(null)} className="px-3 py-1.5 rounded-lg bg-slate-100 font-black text-[11px] cursor-pointer">إلغاء</button>
              <button
                type="button"
                onClick={() => {
                  if (!postponeReason.trim()) return;
                  onPostponeInstallment(postponeInst.id, postponeDate, postponeReason.trim());
                  setPostponeInst(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-amber-600 text-white font-black text-[11px] cursor-pointer"
              >
                اعتماد التأجيل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
