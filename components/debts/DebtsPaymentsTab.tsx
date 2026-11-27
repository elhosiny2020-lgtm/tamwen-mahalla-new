'use client';

import React, { useMemo, useState } from 'react';
import {
  CreditCard,
  Search,
  Printer,
  Download,
  RotateCcw,
  PlusCircle,
  X,
  AlertTriangle,
  CheckCircle2,
  Ban,
} from 'lucide-react';
import {
  BakeryDebtRecord,
  DebtInstallmentRecord,
  DebtModuleSettings,
  DebtPaymentRecord,
} from '@/types';
import {
  compareTableValues,
  formatArabicCurrency,
  formatDateArabic,
  normalizeSearchText,
  toArabicNumerals,
} from '@/lib/utils';
import { round2 } from '@/lib/debts-engine';
import { exportCsvUtf8Bom } from '@/lib/debts-data';
import SmartAutoFitTable, { SmartTableColumn } from '@/components/SmartAutoFitTable';
import { OfficialPrintModal } from './DebtsSharedUi';

interface DebtsPaymentsTabProps {
  userId: string;
  currentUserName: string;
  debts: BakeryDebtRecord[];
  payments: DebtPaymentRecord[];
  installments: DebtInstallmentRecord[];
  settings: DebtModuleSettings;
  todayRef: string;
  initialPayDebt?: BakeryDebtRecord | null;
  onClearInitialPayDebt?: () => void;
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
  onCancelPayment: (paymentId: string, reason: string) => void;
  onOpenBakeryProfile: (bakeryId: string) => void;
}

export default function DebtsPaymentsTab({
  userId,
  currentUserName,
  debts,
  payments,
  installments,
  settings,
  todayRef,
  initialPayDebt,
  onClearInitialPayDebt,
  onRegisterPayment,
  onCancelPayment,
  onOpenBakeryProfile,
}: DebtsPaymentsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('الكل');
  const [methodFilter, setMethodFilter] = useState<string>('الكل');
  const [sortKey, setSortKey] = useState<string>('paymentDate');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const openDebts = useMemo(
    () => debts.filter((d) => d.approvalStatus === 'معتمد' && d.remainingAmount > 0),
    [debts]
  );

  const [showAddModal, setShowAddModal] = useState(Boolean(initialPayDebt));
  const [pDebtId, setPDebtId] = useState<string>(initialPayDebt?.id || openDebts[0]?.id || '');
  const [pDate, setPDate] = useState<string>(todayRef);
  const [pKind, setPKind] = useState<DebtPaymentRecord['paymentKind']>('دفعة جزئية');
  const [pMethod, setPMethod] = useState<string>(settings.paymentMethods[0] || 'نقدي');
  const [pReceipt, setPReceipt] = useState<string>('');
  const [pAuthority, setPAuthority] = useState<string>('خزينة إدارة تموين مركز المحلة الكبرى');
  const [pInstallmentId, setPInstallmentId] = useState<string>('');
  const [pAmount, setPAmount] = useState<number>(initialPayDebt?.remainingAmount || 0);
  const [pNotes, setPNotes] = useState<string>('');
  const [pErr, setPErr] = useState<string>('');

  const [printReceipt, setPrintReceipt] = useState<DebtPaymentRecord | null>(null);
  const [cancelTarget, setCancelTarget] = useState<DebtPaymentRecord | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  const selectedDebt = useMemo(
    () => debts.find((d) => d.id === pDebtId) || openDebts[0] || null,
    [debts, pDebtId, openDebts]
  );

  const debtOpenInstallments = useMemo(
    () =>
      installments.filter(
        (i) => i.debtId === selectedDebt?.id && i.remainingAmount > 0 && i.status !== 'ملغي بقرار معتمد'
      ),
    [installments, selectedDebt]
  );

  const filteredPayments = useMemo(() => {
    const q = normalizeSearchText(searchTerm);
    const list = payments.filter((p) => {
      if (statusFilter !== 'الكل' && p.status !== statusFilter) return false;
      if (methodFilter !== 'الكل' && p.paymentMethod !== methodFilter) return false;
      if (!q) return true;
      return normalizeSearchText(
        `${p.paymentNumber} ${p.receiptNumber} ${p.debtNumber} ${p.bakeryName} ${p.ownerName} ${p.posNumber} ${p.collectorName}`
      ).includes(q);
    });
    return [...list].sort((a, b) =>
      compareTableValues(
        (a as unknown as Record<string, unknown>)[sortKey],
        (b as unknown as Record<string, unknown>)[sortKey],
        sortAsc
      )
    );
  }, [payments, searchTerm, statusFilter, methodFilter, sortKey, sortAsc]);

  const totalCollectedApproved = useMemo(
    () => round2(filteredPayments.filter((p) => p.status === 'معتمد').reduce((s, p) => s + p.amount, 0)),
    [filteredPayments]
  );

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const openModalForDebt = (debt?: BakeryDebtRecord) => {
    const target = debt || openDebts[0];
    setPDebtId(target?.id || '');
    setPAmount(target?.remainingAmount || 0);
    setPKind('دفعة كاملة');
    setPReceipt(`REC-${String(payments.length + 88101)}`);
    setPInstallmentId('');
    setPErr('');
    setShowAddModal(true);
  };

  const handleSubmitPayment = () => {
    setPErr('');
    if (!selectedDebt) {
      setPErr('لا توجد مديونية معتمدة محددة للسداد.');
      return;
    }
    if (pAmount <= 0) {
      setPErr('يجب إدخال مبلغ سداد أكبر من صفر.');
      return;
    }
    if (!pReceipt.trim()) {
      setPErr('يجب إدخال رقم إيصال التحصيل المرجعي.');
      return;
    }
    const res = onRegisterPayment({
      debtId: selectedDebt.id,
      paymentDate: pDate,
      amount: round2(pAmount),
      paymentKind: pKind,
      paymentMethod: pMethod,
      receiptNumber: pReceipt.trim(),
      collectionAuthority: pAuthority.trim() || 'خزينة الإدارة',
      installmentId: pInstallmentId || undefined,
      notes: pNotes.trim(),
    });
    if (!res.ok) {
      setPErr(res.error || 'تعذر تسجيل الدفعة');
      return;
    }
    setShowAddModal(false);
    setPNotes('');
    onClearInitialPayDebt?.();
  };

  const columns: SmartTableColumn<DebtPaymentRecord>[] = useMemo(
    () => [
      {
        key: 'paymentNumber',
        label: 'رقم الدفعة',
        headerText: 'رقم الدفعة',
        type: 'numeric',
        sortable: true,
        render: (r) => <span className="num-cell font-black text-[#102A43]">{toArabicNumerals(r.paymentNumber)}</span>,
      },
      {
        key: 'receiptNumber',
        label: 'رقم الإيصال',
        headerText: 'رقم الإيصال',
        type: 'numeric',
        sortable: true,
        render: (r) => <span className="num-cell font-black text-[#164E83]">{toArabicNumerals(r.receiptNumber)}</span>,
      },
      {
        key: 'debtNumber',
        label: 'رقم المديونية',
        headerText: 'رقم المديونية',
        type: 'numeric',
        sortable: true,
        render: (r) => <span className="num-cell font-bold">{toArabicNumerals(r.debtNumber)}</span>,
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
            className="num-cell font-black px-2 py-0.5 rounded bg-slate-100 hover:bg-[#102A43] hover:text-white cursor-pointer"
          >
            {toArabicNumerals(r.posNumber)}
          </button>
        ),
      },
      {
        key: 'paymentDate',
        label: 'تاريخ السداد',
        headerText: 'تاريخ السداد',
        type: 'date',
        sortable: true,
        render: (r) => <span className="num-cell font-bold">{formatDateArabic(r.paymentDate)}</span>,
      },
      {
        key: 'amount',
        label: 'المبلغ المسدد',
        headerText: 'المبلغ المسدد',
        type: 'currency',
        sortable: true,
        render: (r) => <span className="num-cell font-black text-emerald-800">{formatArabicCurrency(r.amount)}</span>,
      },
      {
        key: 'paymentKind',
        label: 'نوع الدفعة',
        headerText: 'نوع الدفعة',
        type: 'badge',
        sortable: true,
        render: (r) => <span className="px-2 py-0.5 rounded bg-slate-100 font-black text-[10px]">{r.paymentKind}</span>,
      },
      {
        key: 'paymentMethod',
        label: 'طريقة الدفع',
        headerText: 'طريقة الدفع',
        type: 'text',
        sortable: true,
        render: (r) => <span className="font-bold">{r.paymentMethod}</span>,
      },
      {
        key: 'balanceBefore',
        label: 'الرصيد قبل',
        headerText: 'الرصيد قبل',
        type: 'currency',
        sortable: true,
        render: (r) => <span className="num-cell font-bold text-slate-600">{formatArabicCurrency(r.balanceBefore)}</span>,
      },
      {
        key: 'balanceAfter',
        label: 'الرصيد بعد',
        headerText: 'الرصيد بعد',
        type: 'currency',
        sortable: true,
        render: (r) => <span className="num-cell font-black text-[#102A43]">{formatArabicCurrency(r.balanceAfter)}</span>,
      },
      {
        key: 'collectorName',
        label: 'المحصل / الموظف',
        headerText: 'المحصل / الموظف',
        type: 'text',
        sortable: true,
        render: (r) => <span className="font-bold text-slate-700">{r.collectorName}</span>,
      },
      {
        key: 'status',
        label: 'الحالة',
        headerText: 'الحالة',
        type: 'badge',
        sortable: true,
        render: (r) =>
          r.status === 'معتمد' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-black text-[10px]">
              <CheckCircle2 className="w-3 h-3" /> معتمد
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-900 font-black text-[10px]">
              <Ban className="w-3 h-3" /> {r.status}
            </span>
          ),
      },
      {
        key: 'actions',
        label: 'الإجراءات',
        headerText: 'الإجراءات',
        type: 'actions',
        render: (r) => (
          <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
            <button
              type="button"
              onClick={() => setPrintReceipt(r)}
              title="عرض وطباعة إيصال رسمي"
              className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-[#102A43] hover:text-white text-[#164E83] border border-blue-200 text-[10.5px] font-black inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Printer className="w-5 h-5" />
              <span>عرض / طباعة</span>
            </button>
            {r.status === 'معتمد' && (
              <button
                type="button"
                onClick={() => {
                  setCancelTarget(r);
                  setCancelReason('');
                }}
                title="إلغاء / حذف عكسي للدفعة"
                className="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-700 hover:text-white text-red-800 border border-red-200 text-[10.5px] font-black inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                <span>إلغاء</span>
              </button>
            )}
          </div>
        ),
      },
    ],
    [onOpenBakeryProfile]
  );

  return (
    <div className="space-y-4">
      {/* شريط التحكم العلوي للدفعات والتحصيل */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث برقم الإيصال، رقم الدفعة، اسم المخبز، صاحب المخبز، رقم ماكينة POS أو اسم المحصل..."
              className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-300 text-[12px] font-bold"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-black text-[11px] num-cell">
              إجمالي المحصل المعتمد: {formatArabicCurrency(totalCollectedApproved)}
            </span>
            <button
              type="button"
              onClick={() => openModalForDebt()}
              className="px-3.5 py-2 rounded-xl bg-[#102A43] text-white font-black text-[11px] hover:bg-[#164E83] cursor-pointer flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4 text-[#C6A15B]" />
              تسجيل دفعة تحصيل جديدة
            </button>
            <button
              type="button"
              onClick={() => {
                exportCsvUtf8Bom(
                  `سجل_الدفعات_والتحصيل_${todayRef}`,
                  ['رقم الدفعة', 'رقم الإيصال', 'رقم المديونية', 'المخبز', 'صاحب المخبز', 'POS', 'التاريخ', 'المبلغ', 'الطريقة', 'الحالة'],
                  filteredPayments.map((p) => [
                    p.paymentNumber, p.receiptNumber, p.debtNumber, p.bakeryName, p.ownerName,
                    p.posNumber, p.paymentDate, p.amount, p.paymentMethod, p.status,
                  ])
                );
              }}
              className="px-3 py-2 rounded-xl bg-emerald-700 text-white font-black text-[11px] cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              تصدير CSV
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-[11px] font-black bg-slate-50">
            <option value="الكل">الحالة: الكل</option>
            <option value="معتمد">معتمد</option>
            <option value="ملغي">ملغي</option>
          </select>
          <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-[11px] font-black bg-slate-50">
            <option value="الكل">طريقة الدفع: الكل</option>
            {settings.paymentMethods.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <SmartAutoFitTable
        tableId="bakery-debts-payments-registry"
        userId={userId}
        rows={filteredPayments}
        totalCount={filteredPayments.length}
        getRowId={(p) => p.id}
        columns={columns}
        sortKey={sortKey}
        sortAsc={sortAsc}
        onSort={handleSort}
        pinnedKeys={['paymentNumber', 'receiptNumber', 'bakeryName', 'ownerName', 'posNumber']}
        maxHeightClass="max-h-[58vh]"
      />

      {/* نافذة تسجيل دفعة جديدة */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-black text-base text-[#102A43] flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-700" />
                تسجيل دفعة تحصيل وإصدار إيصال مالي
              </h3>
              <button
                type="button"
                onClick={() => { setShowAddModal(false); onClearInitialPayDebt?.(); }}
                className="p-1.5 rounded-lg bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {pErr && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 font-black text-[11px] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {pErr}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[10.5px] font-black text-slate-700 mb-1">اختر المديونية المعتمدة</label>
                <select
                  value={selectedDebt?.id || ''}
                  onChange={(e) => {
                    const found = debts.find((d) => d.id === e.target.value);
                    setPDebtId(e.target.value);
                    setPAmount(found?.remainingAmount || 0);
                    setPInstallmentId('');
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[11px] font-black"
                >
                  {openDebts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.debtNumber} — {d.bakeryName} (POS: {d.posNumber}) — المتبقي: {formatArabicCurrency(d.remainingAmount)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedDebt && (
                <div className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span>صاحب المخبز: <strong className="text-[#102A43]">{selectedDebt.ownerName}</strong> | ماكينة: <strong className="num-cell">{toArabicNumerals(selectedDebt.posNumber)}</strong></span>
                  <span>المتبقي الحالي: <strong className="num-cell text-red-700">{formatArabicCurrency(selectedDebt.remainingAmount)}</strong></span>
                </div>
              )}

              <div>
                <label className="block text-[10.5px] font-black text-slate-700 mb-1">نوع الدفعة</label>
                <select
                  value={pKind}
                  onChange={(e) => {
                    const k = e.target.value as DebtPaymentRecord['paymentKind'];
                    setPKind(k);
                    if (k === 'دفعة كاملة' && selectedDebt) setPAmount(selectedDebt.remainingAmount);
                  }}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-black"
                >
                  <option value="دفعة كاملة">دفعة كاملة</option>
                  <option value="دفعة جزئية">دفعة جزئية</option>
                  <option value="دفعة مقدمة">دفعة مقدمة</option>
                  <option value="دفعة قسط">دفعة قسط من جدول</option>
                  <option value="تسوية / رد معتمد">تسوية / رد معتمد</option>
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-black text-slate-700 mb-1">طريقة السداد</label>
                <select value={pMethod} onChange={(e) => setPMethod(e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-black">
                  {settings.paymentMethods.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {debtOpenInstallments.length > 0 && (
                <div className="sm:col-span-2">
                  <label className="block text-[10.5px] font-black text-slate-700 mb-1">ربط بقسط مجدول (اختياري)</label>
                  <select
                    value={pInstallmentId}
                    onChange={(e) => {
                      setPInstallmentId(e.target.value);
                      const inst = debtOpenInstallments.find((i) => i.id === e.target.value);
                      if (inst) {
                        setPAmount(inst.remainingAmount);
                        setPKind('دفعة قسط');
                      }
                    }}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-black"
                  >
                    <option value="">— سداد عام على المديونية —</option>
                    {debtOpenInstallments.map((i) => (
                      <option key={i.id} value={i.id}>
                        قسط #{toArabicNumerals(i.installmentSerial)} — استحقاق {formatDateArabic(i.dueDate)} — المتبقي {formatArabicCurrency(i.remainingAmount)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10.5px] font-black text-slate-700 mb-1">المبلغ المدفوع (ج.م)</label>
                <input type="number" min={0} step="0.01" value={pAmount} onChange={(e) => setPAmount(Math.max(0, Number(e.target.value) || 0))} className="num-cell w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[12px] font-black" />
              </div>

              <div>
                <label className="block text-[10.5px] font-black text-slate-700 mb-1">تاريخ السداد</label>
                <input type="date" value={pDate} onChange={(e) => setPDate(e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-bold" />
              </div>

              <div>
                <label className="block text-[10.5px] font-black text-slate-700 mb-1">رقم الإيصال المرجعي</label>
                <input type="text" value={pReceipt} onChange={(e) => setPReceipt(e.target.value)} className="num-cell w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-black" />
              </div>

              <div>
                <label className="block text-[10.5px] font-black text-slate-700 mb-1">جهة التحصيل</label>
                <input type="text" value={pAuthority} onChange={(e) => setPAuthority(e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-bold" />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10.5px] font-black text-slate-700 mb-1">ملاحظات الدفعة</label>
                <input type="text" value={pNotes} onChange={(e) => setPNotes(e.target.value)} placeholder="ملاحظات التحصيل أو رقم الشيك/التحويل..." className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-bold" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button type="button" onClick={() => { setShowAddModal(false); onClearInitialPayDebt?.(); }} className="px-4 py-2 rounded-xl bg-slate-100 font-black text-[11px] cursor-pointer">
                إلغاء
              </button>
              <button type="button" onClick={handleSubmitPayment} className="px-5 py-2 rounded-xl bg-emerald-700 text-white font-black text-[11px] hover:bg-emerald-800 cursor-pointer">
                اعتماد وتسجيل الدفعة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إلغاء وعكس دفعة (لا حذف فعلياً) */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 w-full max-w-md space-y-3">
            <h4 className="font-black text-[13px] text-red-900">
              إلغاء وعكس الدفعة رقم {toArabicNumerals(cancelTarget.paymentNumber)} ({formatArabicCurrency(cancelTarget.amount)})
            </h4>
            <p className="text-[11px] font-bold text-slate-600">
              لن يتم حذف السجل من قاعدة البيانات، بل سيتم وسمه بالحالة «ملغي» وإعادة احتساب المديونية المتبقية وتسجيل حركة عكسية في سجل التدقيق.
            </p>
            <textarea rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="سبب الإلغاء / العكس الإلزامي..." className="w-full p-2.5 rounded-xl border border-slate-300 text-[11px] font-bold" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCancelTarget(null)} className="px-3 py-1.5 rounded-lg bg-slate-100 font-black text-[11px] cursor-pointer">تراجع</button>
              <button
                type="button"
                onClick={() => {
                  if (!cancelReason.trim()) return;
                  onCancelPayment(cancelTarget.id, cancelReason.trim());
                  setCancelTarget(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-red-700 text-white font-black text-[11px] cursor-pointer"
              >
                تأكيد الإلغاء والعكس
              </button>
            </div>
          </div>
        </div>
      )}

      {/* معاينة إيصال السداد الرسمي للطباعة */}
      {printReceipt && (
        <OfficialPrintModal
          open
          onClose={() => setPrintReceipt(null)}
          title="إيصال سداد وتحصيل مديونية مخبز"
          subtitle={`حالة الإيصال: ${printReceipt.status}`}
          docNumber={printReceipt.receiptNumber}
          printedBy={currentUserName}
          todayRef={todayRef}
        >
          <div className="grid grid-cols-2 gap-3 text-[12px] border border-slate-300 rounded-xl p-4 bg-slate-50">
            <div>رقم الدفعة: <strong className="num-cell">{toArabicNumerals(printReceipt.paymentNumber)}</strong></div>
            <div>رقم الإيصال المرجعي: <strong className="num-cell">{toArabicNumerals(printReceipt.receiptNumber)}</strong></div>
            <div>اسم المخبز: <strong>{printReceipt.bakeryName}</strong></div>
            <div>صاحب المخبز: <strong>{printReceipt.ownerName}</strong></div>
            <div>رقم ماكينة POS: <strong className="num-cell">{toArabicNumerals(printReceipt.posNumber)}</strong></div>
            <div>رقم المديونية: <strong className="num-cell">{toArabicNumerals(printReceipt.debtNumber)}</strong></div>
            <div>تاريخ السداد: <strong className="num-cell">{formatDateArabic(printReceipt.paymentDate)}</strong></div>
            <div>طريقة الدفع: <strong>{printReceipt.paymentMethod} ({printReceipt.paymentKind})</strong></div>
            <div>الرصيد قبل السداد: <strong className="num-cell">{formatArabicCurrency(printReceipt.balanceBefore)}</strong></div>
            <div>الرصيد بعد السداد: <strong className="num-cell text-red-700">{formatArabicCurrency(printReceipt.balanceAfter)}</strong></div>
            <div className="col-span-2 pt-2 border-t border-slate-300 text-[14px]">
              المبلغ المحصل: <strong className="num-cell text-emerald-800">{formatArabicCurrency(printReceipt.amount)}</strong>
            </div>
            <div className="col-span-2 text-[11px] text-slate-700">
              جهة التحصيل: {printReceipt.collectionAuthority} — المحصل: {printReceipt.collectorName}
            </div>
          </div>
        </OfficialPrintModal>
      )}
    </div>
  );
}
