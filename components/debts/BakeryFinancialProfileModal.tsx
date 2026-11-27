'use client';

import React, { useMemo, useState } from 'react';
import {
  X,
  Printer,
  Download,
  BookOpenText,
  Store,
  ShieldCheck,
  Wallet,
  CreditCard,
  CalendarClock,
  BellRing,
  Scale,
  Paperclip,
  History,
  FileWarning,
  Layers,
  ListChecks,
} from 'lucide-react';
import {
  BakeryDebtItem,
  BakeryDebtRecord,
  BakeryRecord,
  BakeryViolationRecord,
  DebtAuditLogRecord,
  DebtFollowupRecord,
  DebtInstallmentRecord,
  DebtPaymentRecord,
  DebtSchedulePlan,
  DebtSettlementRecord,
  ViolationAppealRecord,
} from '@/types';
import { ComputedDebtAlert, round2 } from '@/lib/debts-engine';
import { exportCsvUtf8Bom } from '@/lib/debts-data';
import {
  formatArabicCurrency,
  formatArabicDecimal,
  formatArabicNumber,
  formatArabicPercent,
  formatDateArabic,
  toArabicNumerals,
} from '@/lib/utils';
import {
  AlertSeverityBadge,
  DebtPaymentBadge,
  InstallmentStatusBadge,
  OfficialPrintModal,
} from './DebtsSharedUi';

interface BakeryFinancialProfileModalProps {
  bakery: BakeryRecord | null;
  onClose: () => void;
  currentUserName: string;
  todayRef: string;
  debts: BakeryDebtRecord[];
  items: BakeryDebtItem[];
  payments: DebtPaymentRecord[];
  schedules: DebtSchedulePlan[];
  installments: DebtInstallmentRecord[];
  followups: DebtFollowupRecord[];
  settlements: DebtSettlementRecord[];
  alerts: ComputedDebtAlert[];
  violations: BakeryViolationRecord[];
  appeals: ViolationAppealRecord[];
  auditLogs: DebtAuditLogRecord[];
}

const PROFILE_TABS = [
  { id: 'basic', label: '١. البيانات الأساسية', icon: Store },
  { id: 'quota', label: '٢. الحصص والتأمين', icon: ShieldCheck },
  { id: 'debts', label: '٣. المديونيات المسجلة', icon: Wallet },
  { id: 'items', label: '٤. تفاصيل المديونيات', icon: ListChecks },
  { id: 'add_disp', label: '٥. الإضافات والتصرفات', icon: Layers },
  { id: 'payments', label: '٦. الدفعات والإيصالات', icon: CreditCard },
  { id: 'schedules', label: '٧. الجداول والأقساط', icon: CalendarClock },
  { id: 'alerts', label: '٨. التنبيهات والإنذارات', icon: BellRing },
  { id: 'statement', label: '٩. كشف الحساب التفصيلي', icon: BookOpenText },
  { id: 'appeals', label: '١٠. التظلمات والتسويات', icon: Scale },
  { id: 'docs', label: '١١. المستندات والمرفقات', icon: Paperclip },
  { id: 'audit', label: '١٢. سجل التعديلات', icon: History },
  { id: 'violations', label: '١٣. سجل المخالفات', icon: FileWarning },
] as const;

type ProfileTabId = (typeof PROFILE_TABS)[number]['id'];

export default function BakeryFinancialProfileModal({
  bakery,
  onClose,
  currentUserName,
  todayRef,
  debts,
  items,
  payments,
  schedules,
  installments,
  followups,
  settlements,
  alerts,
  violations,
  appeals,
  auditLogs,
}: BakeryFinancialProfileModalProps) {
  const [activeTab, setActiveTab] = useState<ProfileTabId>('statement');
  const [stmtFrom, setStmtFrom] = useState<string>('');
  const [stmtTo, setStmtTo] = useState<string>('');
  const [stmtType, setStmtType] = useState<string>('الكل');
  const [stmtAuth, setStmtAuth] = useState<string>('الكل');
  const [showPrintStatement, setShowPrintStatement] = useState(false);

  const bDebts = useMemo(
    () => (bakery ? debts.filter((d) => d.bakeryId === bakery.id || d.posNumber === bakery.posNumber) : []),
    [bakery, debts]
  );
  const bDebtIds = useMemo(() => new Set(bDebts.map((d) => d.id)), [bDebts]);
  const bItems = useMemo(() => items.filter((i) => bDebtIds.has(i.debtId)), [items, bDebtIds]);
  const bPayments = useMemo(
    () => (bakery ? payments.filter((p) => p.bakeryId === bakery.id || bDebtIds.has(p.debtId)) : []),
    [bakery, payments, bDebtIds]
  );
  const bSchedules = useMemo(
    () => (bakery ? schedules.filter((s) => s.bakeryId === bakery.id) : []),
    [bakery, schedules]
  );
  const bInsts = useMemo(
    () => (bakery ? installments.filter((i) => i.bakeryId === bakery.id) : []),
    [bakery, installments]
  );
  const bAlerts = useMemo(
    () => (bakery ? alerts.filter((a) => a.bakeryId === bakery.id) : []),
    [bakery, alerts]
  );
  const bFollowups = useMemo(
    () => (bakery ? followups.filter((f) => f.bakeryId === bakery.id) : []),
    [bakery, followups]
  );
  const bSettlements = useMemo(
    () => (bakery ? settlements.filter((s) => s.bakeryId === bakery.id) : []),
    [bakery, settlements]
  );
  const bViolations = useMemo(
    () => (bakery ? violations.filter((v) => v.bakeryId === bakery.id) : []),
    [bakery, violations]
  );
  const bAppeals = useMemo(
    () => (bakery ? appeals.filter((a) => a.bakeryId === bakery.id) : []),
    [bakery, appeals]
  );
  const bAudits = useMemo(
    () =>
      auditLogs.filter((l) =>
        bDebts.some((d) => l.recordRef.includes(d.debtNumber)) ||
        bViolations.some((v) => l.recordRef.includes(v.violationNumber))
      ),
    [auditLogs, bDebts, bViolations]
  );

  // ملخص الشريط العلوي
  const summary = useMemo(() => {
    const approved = bDebts.filter((d) => d.approvalStatus === 'معتمد');
    const totalDue = round2(approved.reduce((s, d) => s + d.netDueAmount, 0));
    const totalPaid = round2(approved.reduce((s, d) => s + d.totalPaidAmount, 0));
    const totalRem = round2(approved.reduce((s, d) => s + d.remainingAmount, 0));
    const overdue = round2(
      approved.filter((d) => d.delayDays > 0 && d.remainingAmount > 0).reduce((s, d) => s + d.remainingAmount, 0)
    );
    const dueInsts = round2(
      bInsts.filter((i) => i.remainingAmount > 0 && i.status !== 'ملغي بقرار معتمد').reduce((s, i) => s + i.remainingAmount, 0)
    );
    const pct = totalDue > 0 ? round2((totalPaid / totalDue) * 100) : 0;
    return { totalDue, totalPaid, totalRem, overdue, dueInsts, pct };
  }, [bDebts, bInsts]);

  // كشف الحساب التفصيلي المرتب زمنياً (مدين / دائن / رصيد تراكمي)
  const statementRows = useMemo(() => {
    interface LedgerRaw {
      id: string;
      date: string;
      kind: 'قيد مديونية' | 'دفعة سداد' | 'تسوية / خصم';
      ref: string;
      authority: string;
      description: string;
      debit: number;
      credit: number;
      status: string;
    }
    const entries: LedgerRaw[] = [];
    bDebts
      .filter((d) => d.approvalStatus === 'معتمد')
      .forEach((d) => {
        entries.push({
          id: `led-d-${d.id}`,
          date: d.violationDate,
          kind: 'قيد مديونية',
          ref: d.debtNumber,
          authority: d.issuingAuthority,
          description: `${d.violationType} (${d.minutesNumber})`,
          debit: d.grossBeforeSettlements,
          credit: 0,
          status: d.paymentStatus,
        });
        if (d.approvedSettlementsAmount > 0) {
          entries.push({
            id: `led-s-${d.id}`,
            date: d.violationDate,
            kind: 'تسوية / خصم',
            ref: `${d.debtNumber}-SET`,
            authority: d.issuingAuthority,
            description: 'تسويات وخصومات معتمدة',
            debit: 0,
            credit: d.approvedSettlementsAmount,
            status: 'معتمد',
          });
        }
      });

    bPayments
      .filter((p) => p.status === 'معتمد')
      .forEach((p) => {
        entries.push({
          id: `led-p-${p.id}`,
          date: p.paymentDate,
          kind: 'دفعة سداد',
          ref: p.receiptNumber,
          authority: p.collectionAuthority,
          description: `${p.paymentKind} (${p.paymentMethod}) — ${p.debtNumber}`,
          debit: 0,
          credit: p.amount,
          status: p.status,
        });
      });

    entries.sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    const withBalance = entries.map((e) => {
      running = round2(running + e.debit - e.credit);
      return { ...e, runningBalance: running };
    });

    return withBalance.filter((r) => {
      if (stmtFrom && r.date < stmtFrom) return false;
      if (stmtTo && r.date > stmtTo) return false;
      if (stmtType !== 'الكل' && r.kind !== stmtType) return false;
      if (stmtAuth !== 'الكل' && r.authority !== stmtAuth) return false;
      return true;
    });
  }, [bDebts, bPayments, stmtFrom, stmtTo, stmtType, stmtAuth]);

  const stmtAuthorities = useMemo(
    () => ['الكل', ...Array.from(new Set(bDebts.map((d) => d.issuingAuthority)))],
    [bDebts]
  );

  if (!bakery) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* رأس الملف المالي الموحد */}
        <div className="bg-[#102A43] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-black text-base flex items-center gap-2">
              <Store className="w-5 h-5 text-[#C6A15B]" />
              الملف المالي الموحد للمخبز: {bakery.name}
            </h2>
            <p className="text-[11px] font-bold text-slate-200 mt-0.5">
              صاحب المخبز: <strong className="text-white">{bakery.ownerName}</strong> · ماكينة POS:{' '}
              <strong className="num-cell text-[#C6A15B]">{toArabicNumerals(bakery.posNumber)}</strong> · القرية: {bakery.village} ({bakery.localUnit}) · هاتف:{' '}
              <span className="num-cell">{toArabicNumerals(bakery.phone)}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPrintStatement(true)}
              className="px-3 py-1.5 rounded-xl bg-[#C6A15B] text-[#102A43] font-black text-[11px] cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              طباعة كشف الحساب A4
            </button>
            <button type="button" onClick={onClose} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* الشريط الإحصائي الفوري */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-3 bg-slate-50 border-b border-slate-200 text-center">
          <div className="bg-white rounded-xl border border-slate-200 p-2">
            <span className="text-[10px] font-bold text-slate-500 block">إجمالي المستحق</span>
            <span className="num-cell font-black text-[12px] text-[#102A43]">{formatArabicCurrency(summary.totalDue)}</span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-2">
            <span className="text-[10px] font-bold text-slate-500 block">إجمالي المسدد</span>
            <span className="num-cell font-black text-[12px] text-emerald-700">{formatArabicCurrency(summary.totalPaid)}</span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-2">
            <span className="text-[10px] font-bold text-slate-500 block">المتبقي المفتوح</span>
            <span className="num-cell font-black text-[12px] text-red-700">{formatArabicCurrency(summary.totalRem)}</span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-2">
            <span className="text-[10px] font-bold text-slate-500 block">أقساط قيد السداد</span>
            <span className="num-cell font-black text-[12px] text-blue-800">{formatArabicCurrency(summary.dueInsts)}</span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-2">
            <span className="text-[10px] font-bold text-slate-500 block">المتأخرات الحالية</span>
            <span className="num-cell font-black text-[12px] text-rose-800">{formatArabicCurrency(summary.overdue)}</span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-2">
            <span className="text-[10px] font-bold text-slate-500 block">نسبة السداد</span>
            <span className="num-cell font-black text-[12px] text-emerald-800">{formatArabicPercent(summary.pct, 1)}</span>
          </div>
        </div>

        {/* التبويبات الـ 13 */}
        <div className="flex items-center gap-1 overflow-x-auto px-3 py-2 bg-white border-b border-slate-200 shrink-0">
          {PROFILE_TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-2.5 py-1.5 rounded-lg font-black text-[10.5px] whitespace-nowrap flex items-center gap-1 cursor-pointer transition-colors ${
                  active ? 'bg-[#102A43] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* محتوى التبويب المختار */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 text-[11px]">
          {activeTab === 'basic' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                ['اسم المخبز', bakery.name],
                ['رقم المخبز', toArabicNumerals(bakery.bakeryNumber)],
                ['اسم صاحب المخبز', bakery.ownerName],
                ['رقم ماكينة POS', toArabicNumerals(bakery.posNumber)],
                ['المدير المسؤول', bakery.managerName],
                ['الرقم القومي', toArabicNumerals(bakery.ownerNationalId)],
                ['التليفون', toArabicNumerals(bakery.phone)],
                ['القرية / الوحدة المحلية', `${bakery.village} — ${bakery.localUnit}`],
                ['نوع الخبز والحالة', `${bakery.breadType} (${bakery.activityStatus})`],
              ].map(([k, v]) => (
                <div key={k} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="text-[10px] font-bold text-slate-500 block">{k}</span>
                  <span className="font-black text-[#102A43]">{v || '—'}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'quota' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                ['الحصة التأمينية (شيكارة)', formatArabicDecimal(bakery.insuranceQuota, 3)],
                ['الحصة الفعلية اليومية', formatArabicNumber(bakery.actualQuota)],
                ['سعر الشيكارة التأميني', formatArabicCurrency(bakery.sackPriceEgp)],
                ['القيمة التأمينية المسددة', formatArabicCurrency(bakery.insuranceAmountEgp)],
                ['عدد الأرغفة اليومية المقرر', formatArabicNumber(bakery.dailyLoavesCount)],
                ['معامل الإنتاج', formatArabicNumber(bakery.productionFactor)],
                ['حالة التأمين', bakery.insuranceStatus],
                ['تفاصيل شيك التأمين', bakery.insuranceCheckDetails],
              ].map(([k, v]) => (
                <div key={k} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="text-[10px] font-bold text-slate-500 block">{k}</span>
                  <span className="num-cell font-black text-[#102A43]">{v || '—'}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'debts' && (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right">
                <thead className="bg-[#102A43] text-white font-black">
                  <tr>
                    <th className="p-2">رقم المديونية</th>
                    <th className="p-2">المخالفة</th>
                    <th className="p-2">الصافي</th>
                    <th className="p-2">المسدد</th>
                    <th className="p-2">المتبقي</th>
                    <th className="p-2">الاستحقاق</th>
                    <th className="p-2">الحالة</th>
                    <th className="p-2 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {bDebts.map((d) => (
                    <tr key={d.id} className="border-t border-slate-100 even:bg-slate-50">
                      <td className="p-2 num-cell font-black">{toArabicNumerals(d.debtNumber)}</td>
                      <td className="p-2 font-bold">{d.violationType}</td>
                      <td className="p-2 num-cell font-black">{formatArabicCurrency(d.netDueAmount)}</td>
                      <td className="p-2 num-cell text-emerald-700 font-black">{formatArabicCurrency(d.totalPaidAmount)}</td>
                      <td className="p-2 num-cell text-red-700 font-black">{formatArabicCurrency(d.remainingAmount)}</td>
                      <td className="p-2 num-cell">{formatDateArabic(d.dueDate)}</td>
                      <td className="p-2"><DebtPaymentBadge status={d.paymentStatus} /></td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => setActiveTab('statement')}
                          className="px-2 py-0.5 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer"
                        >
                          كشف الحساب
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'items' && (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right">
                <thead className="bg-[#102A43] text-white font-black">
                  <tr>
                    <th className="p-2">رقم البند</th>
                    <th className="p-2">النوع</th>
                    <th className="p-2">البيان</th>
                    <th className="p-2">المبلغ</th>
                    <th className="p-2">الحالة</th>
                    <th className="p-2 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {bItems.map((i) => (
                    <tr key={i.id} className="border-t border-slate-100">
                      <td className="p-2 num-cell font-black">{toArabicNumerals(i.itemNumber)}</td>
                      <td className="p-2 font-black">{i.itemType}</td>
                      <td className="p-2 font-bold">{i.description}</td>
                      <td className="p-2 num-cell font-black">{formatArabicCurrency(i.amount)}</td>
                      <td className="p-2 font-bold">{i.status}</td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => setActiveTab('debts')}
                          className="px-2 py-0.5 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer"
                        >
                          المديونية
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'add_disp' && (
            <div className="space-y-2">
              {bDebts.map((d) => (
                <div key={d.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-wrap justify-between gap-2">
                  <span className="font-black">{toArabicNumerals(d.debtNumber)} — {d.violationType}</span>
                  <div className="flex gap-4 num-cell font-black">
                    <span>الإضافات: {formatArabicCurrency(d.additionsAmount)}</span>
                    <span>التصرفات: {formatArabicCurrency(d.disposalsAmount)}</span>
                    <span>التسويات: {formatArabicCurrency(d.approvedSettlementsAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right">
                <thead className="bg-[#102A43] text-white font-black">
                  <tr>
                    <th className="p-2">رقم الإيصال</th>
                    <th className="p-2">التاريخ</th>
                    <th className="p-2">النوع والطريقة</th>
                    <th className="p-2">المبلغ</th>
                    <th className="p-2">المحصل</th>
                    <th className="p-2">الحالة</th>
                    <th className="p-2 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {bPayments.map((p) => (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="p-2 num-cell font-black">{toArabicNumerals(p.receiptNumber)}</td>
                      <td className="p-2 num-cell">{formatDateArabic(p.paymentDate)}</td>
                      <td className="p-2 font-bold">{p.paymentKind} ({p.paymentMethod})</td>
                      <td className="p-2 num-cell font-black text-emerald-700">{formatArabicCurrency(p.amount)}</td>
                      <td className="p-2 font-bold">{p.collectorName}</td>
                      <td className="p-2 font-black">{p.status}</td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => setShowPrintStatement(true)}
                          className="px-2 py-0.5 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer"
                        >
                          طباعة إيصال
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'schedules' && (
            <div className="space-y-3">
              {bSchedules.map((s) => (
                <div key={s.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex justify-between font-black">
                  <span>{toArabicNumerals(s.scheduleNumber)} — {s.scheduleType} ({toArabicNumerals(s.installmentsCount)} أقساط)</span>
                  <span className="num-cell">{formatArabicCurrency(s.scheduledAmount)} ({s.status})</span>
                </div>
              ))}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-right">
                  <thead className="bg-[#102A43] text-white font-black">
                    <tr>
                      <th className="p-2">القسط</th>
                      <th className="p-2">الاستحقاق</th>
                      <th className="p-2">القيمة</th>
                      <th className="p-2">المسدد</th>
                      <th className="p-2">المتبقي</th>
                      <th className="p-2">الحالة</th>
                      <th className="p-2 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bInsts.map((i) => (
                      <tr key={i.id} className="border-t border-slate-100">
                        <td className="p-2 num-cell font-black">قسط #{toArabicNumerals(i.installmentSerial)}</td>
                        <td className="p-2 num-cell">{formatDateArabic(i.dueDate)}</td>
                        <td className="p-2 num-cell font-black">{formatArabicCurrency(i.amount)}</td>
                        <td className="p-2 num-cell text-emerald-700">{formatArabicCurrency(i.paidAmount)}</td>
                        <td className="p-2 num-cell text-red-700 font-black">{formatArabicCurrency(i.remainingAmount)}</td>
                        <td className="p-2"><InstallmentStatusBadge status={i.status} /></td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => setActiveTab('payments')}
                            className="px-2 py-0.5 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer"
                          >
                            الدفعات
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-2">
              {bAlerts.map((a) => (
                <div key={a.id} className="p-3 rounded-xl border border-slate-200 flex justify-between items-center gap-2">
                  <div className="space-y-0.5">
                    <AlertSeverityBadge alert={a} />
                    <p className="font-bold text-slate-800 mt-1">{a.reasonText}</p>
                  </div>
                  <span className="num-cell font-black text-red-700">{formatArabicCurrency(a.amountDue)}</span>
                </div>
              ))}
              {bFollowups.map((f) => (
                <div key={f.id} className="p-3 rounded-xl border border-amber-200 bg-amber-50/50">
                  <div className="font-black text-amber-950">{f.actionType} ({toArabicNumerals(f.noticeNumber)}) — {formatDateArabic(f.noticeDate)}</div>
                  <div className="text-slate-700 font-bold">{f.employeeNotes} — النتيجة: {f.notifyResult}</div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'statement' && (
            <div className="space-y-3">
              {/* فلاتر كشف الحساب */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <input type="date" value={stmtFrom} onChange={(e) => setStmtFrom(e.target.value)} className="px-2 py-1 rounded border border-slate-300 bg-white font-bold" />
                  <input type="date" value={stmtTo} onChange={(e) => setStmtTo(e.target.value)} className="px-2 py-1 rounded border border-slate-300 bg-white font-bold" />
                  <select value={stmtType} onChange={(e) => setStmtType(e.target.value)} className="px-2 py-1 rounded border border-slate-300 bg-white font-black">
                    <option value="الكل">كل الحركات</option>
                    <option value="قيد مديونية">قيد مديونية</option>
                    <option value="دفعة سداد">دفعة سداد</option>
                    <option value="تسوية / خصم">تسوية / خصم</option>
                  </select>
                  <select value={stmtAuth} onChange={(e) => setStmtAuth(e.target.value)} className="px-2 py-1 rounded border border-slate-300 bg-white font-black">
                    {stmtAuthorities.map((a) => <option key={a} value={a}>{a === 'الكل' ? 'كل الجهات' : a}</option>)}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    exportCsvUtf8Bom(
                      `كشف_حساب_${bakery.posNumber}_${todayRef}`,
                      ['التاريخ', 'نوع الحركة', 'المرجع', 'الجهة', 'البيان', 'مدين', 'دائن', 'الرصيد التراكمي'],
                      statementRows.map((r) => [r.date, r.kind, r.ref, r.authority, r.description, r.debit, r.credit, r.runningBalance])
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-black flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  تصدير كشف الحساب CSV
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-right">
                  <thead className="bg-[#102A43] text-white font-black">
                    <tr>
                      <th className="p-2">التاريخ</th>
                      <th className="p-2">نوع الحركة</th>
                      <th className="p-2">المرجع</th>
                      <th className="p-2">الجهة</th>
                      <th className="p-2">البيان التفصيلي</th>
                      <th className="p-2">مدين (مستحق)</th>
                      <th className="p-2">دائن (سداد/تسوية)</th>
                      <th className="p-2">الرصيد التراكمي</th>
                      <th className="p-2 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statementRows.map((r) => (
                      <tr key={r.id} className="border-t border-slate-100 even:bg-slate-50">
                        <td className="p-2 num-cell font-bold">{formatDateArabic(r.date)}</td>
                        <td className="p-2 font-black">{r.kind}</td>
                        <td className="p-2 num-cell font-bold">{toArabicNumerals(r.ref)}</td>
                        <td className="p-2 font-bold text-slate-700">{r.authority}</td>
                        <td className="p-2 font-bold">{r.description}</td>
                        <td className="p-2 num-cell font-black text-red-700">{r.debit > 0 ? formatArabicCurrency(r.debit) : '—'}</td>
                        <td className="p-2 num-cell font-black text-emerald-700">{r.credit > 0 ? formatArabicCurrency(r.credit) : '—'}</td>
                        <td className="p-2 num-cell font-black text-[#102A43]">{formatArabicCurrency(r.runningBalance)}</td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => setShowPrintStatement(true)}
                            className="px-2 py-0.5 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer"
                          >
                            طباعة
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'appeals' && (
            <div className="space-y-2">
              {bSettlements.map((s) => (
                <div key={s.id} className="p-3 rounded-xl border border-teal-200 bg-teal-50/50 flex justify-between">
                  <span className="font-black">{s.settlementType} — {s.reason} ({s.referenceDoc})</span>
                  <span className="num-cell font-black text-teal-800">{formatArabicCurrency(s.amount)}</span>
                </div>
              ))}
              {bAppeals.map((a) => (
                <div key={a.id} className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 flex justify-between">
                  <span className="font-black">{toArabicNumerals(a.appealNumber)} — {a.reason}</span>
                  <span className="font-black text-amber-900">{a.decisionStatus}</span>
                </div>
              ))}
              {bSettlements.length === 0 && bAppeals.length === 0 && (
                <p className="text-center text-slate-500 py-6 font-bold">لا توجد تظلمات أو تسويات مسجلة لهذا المخبز.</p>
              )}
            </div>
          )}

          {activeTab === 'docs' && (
            <div className="space-y-2">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold">
                ترخيص المخبز: {toArabicNumerals(bakery.licenseNumber)} (ينتهي {formatDateArabic(bakery.licenseExpiryDate)}) · العقد: {bakery.leaseContractNumber}
              </div>
              {bDebts.map((d) => (
                <div key={d.id} className="p-3 rounded-xl border border-slate-200 flex justify-between">
                  <span className="font-bold">مرفق المديونية {toArabicNumerals(d.debtNumber)}: {d.attachmentRef || 'محضر رسمي مرفق'}</span>
                  <span className="num-cell text-slate-500">{formatDateArabic(d.violationDate)}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-2">
              {bAudits.map((l) => (
                <div key={l.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-0.5">
                  <div className="flex justify-between font-black">
                    <span>{l.operation} — {l.recordRef}</span>
                    <span className="num-cell text-slate-500">{formatDateArabic(l.timestamp, true)}</span>
                  </div>
                  <div className="text-slate-700 font-bold">بواسطة: {l.userName} · السبب: {l.reason}</div>
                </div>
              ))}
              {bAudits.length === 0 && <p className="text-center text-slate-500 py-6 font-bold">لا توجد حركات تدقيق مسجلة.</p>}
            </div>
          )}

          {activeTab === 'violations' && (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right">
                <thead className="bg-[#102A43] text-white font-black">
                  <tr>
                    <th className="p-2">رقم المخالفة</th>
                    <th className="p-2">المحضر</th>
                    <th className="p-2">التاريخ</th>
                    <th className="p-2">الوصف</th>
                    <th className="p-2">النقص</th>
                    <th className="p-2">الغرامة النهائية</th>
                    <th className="p-2">الحالة</th>
                    <th className="p-2 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {bViolations.map((v) => (
                    <tr key={v.id} className="border-t border-slate-100">
                      <td className="p-2 num-cell font-black">{toArabicNumerals(v.violationNumber)}</td>
                      <td className="p-2 num-cell font-bold">{toArabicNumerals(v.minutesNumber)}</td>
                      <td className="p-2 num-cell">{formatDateArabic(v.violationDate)}</td>
                      <td className="p-2 font-bold">{v.violationName}</td>
                      <td className="p-2 num-cell">{v.shortageGrams ? `${formatArabicDecimal(v.shortageGrams, 2)} جم` : '—'}</td>
                      <td className="p-2 num-cell font-black text-red-700">{formatArabicCurrency(v.finalFineAmount)}</td>
                      <td className="p-2 font-black">{v.status}</td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => setActiveTab('debts')}
                          className="px-2 py-0.5 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer"
                        >
                          عرض المديونية
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* معاينة الطباعة الرسمية لكشف الحساب */}
      <OfficialPrintModal
        open={showPrintStatement}
        onClose={() => setShowPrintStatement(false)}
        title={`كشف حساب تفصيلي للمخبز: ${bakery.name}`}
        subtitle={`صاحب المخبز: ${bakery.ownerName} · ماكينة POS: ${toArabicNumerals(bakery.posNumber)} · القرية: ${bakery.village}`}
        docNumber={`STMT-${bakery.bakeryNumber}`}
        printedBy={currentUserName}
        todayRef={todayRef}
      >
        <div className="grid grid-cols-3 gap-3 text-[11px] bg-slate-50 border border-slate-300 rounded-xl p-3 font-black">
          <div>إجمالي المستحق: <span className="num-cell">{formatArabicCurrency(summary.totalDue)}</span></div>
          <div>إجمالي المسدد: <span className="num-cell text-emerald-800">{formatArabicCurrency(summary.totalPaid)}</span></div>
          <div>الرصيد المتبقي: <span className="num-cell text-red-800">{formatArabicCurrency(summary.totalRem)}</span></div>
        </div>
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-[#102A43] text-white">
              <th className="border border-slate-400 p-1.5">التاريخ</th>
              <th className="border border-slate-400 p-1.5">الحركة</th>
              <th className="border border-slate-400 p-1.5">المرجع</th>
              <th className="border border-slate-400 p-1.5">البيان</th>
              <th className="border border-slate-400 p-1.5">مدين</th>
              <th className="border border-slate-400 p-1.5">دائن</th>
              <th className="border border-slate-400 p-1.5">الرصيد</th>
              <th className="border border-slate-400 p-1.5 print:hidden">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {statementRows.map((r) => (
              <tr key={r.id} className="even:bg-slate-50">
                <td className="border border-slate-300 p-1.5 num-cell">{formatDateArabic(r.date)}</td>
                <td className="border border-slate-300 p-1.5 font-black">{r.kind}</td>
                <td className="border border-slate-300 p-1.5 num-cell">{toArabicNumerals(r.ref)}</td>
                <td className="border border-slate-300 p-1.5">{r.description}</td>
                <td className="border border-slate-300 p-1.5 num-cell text-red-800">{r.debit > 0 ? formatArabicCurrency(r.debit) : '—'}</td>
                <td className="border border-slate-300 p-1.5 num-cell text-emerald-800">{r.credit > 0 ? formatArabicCurrency(r.credit) : '—'}</td>
                <td className="border border-slate-300 p-1.5 num-cell font-black">{formatArabicCurrency(r.runningBalance)}</td>
                <td className="border border-slate-300 p-1.5 print:hidden">
                  <button
                    type="button"
                    onClick={() => setShowPrintStatement(false)}
                    className="px-2 py-0.5 rounded bg-[#102A43] text-[#C6A15B] text-[9.5px] font-black cursor-pointer"
                  >
                    عودة
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </OfficialPrintModal>
    </div>
  );
}
