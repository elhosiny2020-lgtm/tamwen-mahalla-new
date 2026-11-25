'use client';

import React, { useMemo, useState } from 'react';
import {
  BellRing,
  Volume2,
  VolumeX,
  CreditCard,
  BookOpenText,
  CalendarClock,
  PhoneCall,
  Printer,
  PauseCircle,
  CheckCheck,
  AlertTriangle,
  FileWarning,
  X,
} from 'lucide-react';
import {
  BakeryDebtRecord,
  DebtFollowupRecord,
  DebtInstallmentRecord,
  DebtModuleSettings,
} from '@/types';
import {
  ComputedDebtAlert,
  addDaysIso,
  classifyBakeryRisk,
  playDebtModuleSound,
  round2,
} from '@/lib/debts-engine';
import {
  formatArabicCurrency,
  formatDateArabic,
  toArabicNumerals,
} from '@/lib/utils';
import SmartAutoFitTable, { SmartTableColumn } from '@/components/SmartAutoFitTable';
import {
  AlertSeverityBadge,
  OfficialPrintModal,
  RiskBadge,
} from './DebtsSharedUi';

interface DebtsAlertsAndLateTabProps {
  mode: 'alerts' | 'late' | 'followups';
  userId: string;
  currentUserName: string;
  debts: BakeryDebtRecord[];
  installments: DebtInstallmentRecord[];
  alerts: ComputedDebtAlert[];
  followups: DebtFollowupRecord[];
  settings: DebtModuleSettings;
  todayRef: string;
  onUpdateSettings: (partial: Partial<DebtModuleSettings>) => void;
  onMarkAlertRead: (alertId: string) => void;
  onSnoozeAlert: (targetId: string, untilDate: string, reason: string) => void;
  onAddFollowup: (payload: Omit<DebtFollowupRecord, 'id' | 'createdAt' | 'noticeNumber'>) => void;
  onOpenBakeryProfile: (bakeryId: string) => void;
  onOpenPayModal: (debt: BakeryDebtRecord) => void;
  onOpenScheduleModal: (debt: BakeryDebtRecord) => void;
}

export default function DebtsAlertsAndLateTab({
  mode,
  userId,
  currentUserName,
  debts,
  alerts,
  followups,
  settings,
  todayRef,
  onUpdateSettings,
  onMarkAlertRead,
  onSnoozeAlert,
  onAddFollowup,
  onOpenBakeryProfile,
  onOpenPayModal,
  onOpenScheduleModal,
}: DebtsAlertsAndLateTabProps) {
  const [severityFilter, setSeverityFilter] = useState<string>('الكل');
  const [snoozeTarget, setSnoozeTarget] = useState<ComputedDebtAlert | null>(null);
  const [snoozeUntil, setSnoozeUntil] = useState<string>(addDaysIso(todayRef, 7));
  const [snoozeReason, setSnoozeReason] = useState<string>('');

  const [noticePreview, setNoticePreview] = useState<{
    title: string;
    body: string;
    docNumber: string;
  } | null>(null);

  // نموذج تسجيل متابعة رسمية
  const openDebts = useMemo(
    () => debts.filter((d) => d.approvalStatus === 'معتمد' && d.remainingAmount > 0),
    [debts]
  );
  const [flwDebtId, setFlwDebtId] = useState<string>(openDebts[0]?.id || '');
  const [flwAction, setFlwAction] = useState<DebtFollowupRecord['actionType']>('إخطار بتأخر السداد');
  const [flwMethod, setFlwMethod] = useState<DebtFollowupRecord['notifyMethod']>('تسليم باليد');
  const [flwResult, setFlwResult] = useState<DebtFollowupRecord['notifyResult']>('قيد المتابعة');
  const [flwNotes, setFlwNotes] = useState<string>('');
  const [flwNextAction, setFlwNextAction] = useState<string>('متابعة السداد في الموعد المحدد');
  const [flwNextDate, setFlwNextDate] = useState<string>(addDaysIso(todayRef, 3));

  const filteredAlerts = useMemo(() => {
    if (severityFilter === 'الكل') return alerts;
    if (severityFilter === 'غير مقروء') return alerts.filter((a) => !a.isRead);
    return alerts.filter((a) => a.statusLabel === severityFilter);
  }, [alerts, severityFilter]);

  const buildNoticeText = (templateKey: string, alertOrDebt: ComputedDebtAlert | BakeryDebtRecord) => {
    const raw =
      settings.noticeTemplates[templateKey] ||
      'السيد صاحب مخبز {اسم_المخبز} (POS: {رقم_الماكينة}) — يرجى سداد المبلغ المستحق {المبلغ_المطلوب} ج.م.';
    const isAlert = 'amountDue' in alertOrDebt;
    const d = isAlert
      ? debts.find((x) => x.id === alertOrDebt.debtId)
      : alertOrDebt;

    const mapVars: Record<string, string> = {
      '{اسم_المخبز}': alertOrDebt.bakeryName,
      '{رقم_الماكينة}': toArabicNumerals(alertOrDebt.posNumber),
      '{رقم_المديونية}': toArabicNumerals(alertOrDebt.debtNumber),
      '{المبلغ_المطلوب}': formatArabicCurrency(isAlert ? alertOrDebt.amountDue : alertOrDebt.remainingAmount),
      '{المبلغ_المتبقي}': formatArabicCurrency(d?.remainingAmount ?? (isAlert ? alertOrDebt.amountDue : alertOrDebt.remainingAmount)),
      '{تاريخ_الاستحقاق}': formatDateArabic(alertOrDebt.dueDate),
      '{أيام_التأخير}': toArabicNumerals(alertOrDebt.delayDays),
      '{الجهة}': d?.issuingAuthority || 'إدارة تموين مركز المحلة الكبرى',
    };

    let out = raw;
    Object.entries(mapVars).forEach(([k, v]) => {
      out = out.split(k).join(v);
    });
    return out;
  };

  // تجميع شاشة المخابز المتأخرة في السداد (القسم 9)
  const lateBakeriesRows = useMemo(() => {
    const byBakery = new Map<
      string,
      {
        bakeryId: string;
        bakeryName: string;
        ownerName: string;
        posNumber: string;
        village: string;
        localUnit: string;
        phone: string;
        overdueDebtsCount: number;
        totalOverdueAmount: number;
        maxDelayDays: number;
        lastPaymentDate: string;
        primaryDebt: BakeryDebtRecord;
      }
    >();

    debts.forEach((d) => {
      if (d.approvalStatus !== 'معتمد' || d.remainingAmount <= 0 || d.delayDays <= 0) return;
      const cur = byBakery.get(d.bakeryId);
      if (!cur) {
        byBakery.set(d.bakeryId, {
          bakeryId: d.bakeryId,
          bakeryName: d.bakeryName,
          ownerName: d.ownerName,
          posNumber: d.posNumber,
          village: d.village,
          localUnit: d.localUnit,
          phone: d.phone,
          overdueDebtsCount: 1,
          totalOverdueAmount: d.remainingAmount,
          maxDelayDays: d.delayDays,
          lastPaymentDate: d.lastPaymentDate || '',
          primaryDebt: d,
        });
      } else {
        cur.overdueDebtsCount += 1;
        cur.totalOverdueAmount = round2(cur.totalOverdueAmount + d.remainingAmount);
        cur.maxDelayDays = Math.max(cur.maxDelayDays, d.delayDays);
        if (d.lastPaymentDate && d.lastPaymentDate > cur.lastPaymentDate) {
          cur.lastPaymentDate = d.lastPaymentDate;
        }
      }
    });

    return Array.from(byBakery.values())
      .map((r) => ({
        ...r,
        risk: classifyBakeryRisk(r.maxDelayDays, r.totalOverdueAmount, settings),
      }))
      .sort((a, b) => b.maxDelayDays - a.maxDelayDays);
  }, [debts, settings]);

  const alertColumns: SmartTableColumn<ComputedDebtAlert>[] = useMemo(
    () => [
      { key: 'statusLabel', label: 'الحالة', headerText: 'الحالة', type: 'badge', sortable: true, render: (a) => <AlertSeverityBadge alert={a} /> },
      {
        key: 'bakeryName',
        label: 'اسم المخبز',
        headerText: 'اسم المخبز',
        type: 'text',
        sortable: true,
        render: (a) => (
          <button type="button" onClick={() => onOpenBakeryProfile(a.bakeryId)} className="font-black text-[#164E83] hover:underline cursor-pointer text-right">
            {a.bakeryName}
          </button>
        ),
      },
      { key: 'ownerName', label: 'صاحب المخبز', headerText: 'صاحب المخبز', type: 'text', sortable: true, render: (a) => <span className="font-bold">{a.ownerName}</span> },
      {
        key: 'posNumber',
        label: 'رقم ماكينة POS',
        headerText: 'رقم ماكينة POS',
        type: 'numeric',
        sortable: true,
        render: (a) => (
          <button type="button" onClick={() => onOpenBakeryProfile(a.bakeryId)} className="num-cell font-black px-2 py-0.5 rounded bg-slate-100 hover:bg-[#102A43] hover:text-white cursor-pointer">
            {toArabicNumerals(a.posNumber)}
          </button>
        ),
      },
      { key: 'debtNumber', label: 'رقم المديونية', headerText: 'رقم المديونية', type: 'numeric', sortable: true, render: (a) => <span className="num-cell font-black">{toArabicNumerals(a.debtNumber)}</span> },
      { key: 'amountDue', label: 'المبلغ المطلوب', headerText: 'المبلغ المطلوب', type: 'currency', sortable: true, render: (a) => <span className="num-cell font-black text-red-700">{formatArabicCurrency(a.amountDue)}</span> },
      { key: 'dueDate', label: 'تاريخ الاستحقاق', headerText: 'تاريخ الاستحقاق', type: 'date', sortable: true, render: (a) => <span className="num-cell font-black">{formatDateArabic(a.dueDate)}</span> },
      { key: 'delayDays', label: 'التأخير', headerText: 'التأخير', type: 'numeric', sortable: true, render: (a) => <span className={`num-cell font-black ${a.delayDays > 0 ? 'text-red-700' : 'text-slate-600'}`}>{a.delayDays > 0 ? `${toArabicNumerals(a.delayDays)} يوم` : 'في الموعد'}</span> },
      { key: 'reasonText', label: 'تفاصيل التنبيه', headerText: 'تفاصيل التنبيه', type: 'text', render: (a) => <span className="font-bold text-slate-700">{a.reasonText}</span> },
      {
        key: 'actions',
        label: 'إجراءات سريعة',
        headerText: 'إجراءات سريعة',
        type: 'actions',
        render: (a) => {
          const parentDebt = debts.find((d) => d.id === a.debtId);
          return (
            <div className="flex items-center gap-1 whitespace-nowrap">
              {parentDebt && (
                <>
                  <button type="button" onClick={() => onOpenPayModal(parentDebt)} title="تسجيل سداد فوري" className="p-1 rounded bg-emerald-50 hover:bg-emerald-700 hover:text-white text-emerald-800 cursor-pointer">
                    <CreditCard className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => onOpenScheduleModal(parentDebt)} title="جدولة المديونية" className="p-1 rounded bg-blue-50 hover:bg-blue-700 hover:text-white text-blue-800 cursor-pointer">
                    <CalendarClock className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <button type="button" onClick={() => onOpenBakeryProfile(a.bakeryId)} title="فتح كشف حساب المخبز" className="p-1 rounded bg-slate-100 hover:bg-[#102A43] hover:text-white text-[#102A43] cursor-pointer">
                <BookOpenText className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const tpl = a.delayDays > 0 ? 'إخطار بتأخر السداد' : 'مطالبة بسداد قسط مستحق';
                  setNoticePreview({
                    title: tpl,
                    body: buildNoticeText(tpl, a),
                    docNumber: `NOT-${a.debtNumber}`,
                  });
                }}
                title="طباعة مطالبة / إنذار رسمي"
                className="p-1 rounded bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-800 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setSnoozeTarget(a);
                  setSnoozeUntil(addDaysIso(todayRef, 5));
                  setSnoozeReason('');
                }}
                title="تأجيل التنبيه بسبب معتمد"
                className="p-1 rounded bg-slate-100 hover:bg-slate-700 hover:text-white text-slate-700 cursor-pointer"
              >
                <PauseCircle className="w-3.5 h-3.5" />
              </button>
              {!a.isRead && (
                <button type="button" onClick={() => onMarkAlertRead(a.id)} title="تحديد كمقروء" className="p-1 rounded bg-teal-50 hover:bg-teal-700 hover:text-white text-teal-800 cursor-pointer">
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debts, todayRef]
  );

  type LateRow = (typeof lateBakeriesRows)[number];
  const lateColumns: SmartTableColumn<LateRow>[] = useMemo(
    () => [
      { key: 'risk', label: 'تصنيف المخاطر', headerText: 'تصنيف المخاطر', type: 'badge', sortable: true, render: (r) => <RiskBadge risk={r.risk} /> },
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
      { key: 'village', label: 'القرية / الوحدة', headerText: 'القرية / الوحدة', type: 'text', sortable: true, render: (r) => <span className="font-bold text-slate-700">{r.village} · {r.localUnit}</span> },
      { key: 'phone', label: 'الهاتف', headerText: 'الهاتف', type: 'numeric', render: (r) => <span className="num-cell font-bold">{toArabicNumerals(r.phone)}</span> },
      { key: 'overdueDebtsCount', label: 'عدد المديونيات المتأخرة', headerText: 'عدد المتأخرة', type: 'numeric', sortable: true, render: (r) => <span className="num-cell font-black">{toArabicNumerals(r.overdueDebtsCount)}</span> },
      { key: 'totalOverdueAmount', label: 'إجمالي المبالغ المتأخرة', headerText: 'المتأخر', type: 'currency', sortable: true, render: (r) => <span className="num-cell font-black text-red-700">{formatArabicCurrency(r.totalOverdueAmount)}</span> },
      { key: 'maxDelayDays', label: 'أقصى مدة تأخير', headerText: 'مدة التأخير', type: 'numeric', sortable: true, render: (r) => <span className="num-cell font-black text-red-800">{toArabicNumerals(r.maxDelayDays)} يوم</span> },
      { key: 'lastPaymentDate', label: 'آخر سداد', headerText: 'آخر سداد', type: 'date', render: (r) => <span className="num-cell font-bold">{r.lastPaymentDate ? formatDateArabic(r.lastPaymentDate) : 'لا يوجد'}</span> },
      {
        key: 'actions',
        label: 'الإجراءات',
        headerText: 'الإجراءات',
        type: 'actions',
        render: (r) => (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => onOpenPayModal(r.primaryDebt)} title="تحصيل" className="p-1 rounded bg-emerald-50 text-emerald-800 hover:bg-emerald-700 hover:text-white cursor-pointer">
              <CreditCard className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                setNoticePreview({
                  title: 'إخطار بتأخر السداد',
                  body: buildNoticeText('إخطار بتأخر السداد', r.primaryDebt),
                  docNumber: `LATE-${r.primaryDebt.debtNumber}`,
                })
              }
              title="طباعة إنذار رسمي"
              className="p-1 rounded bg-red-50 text-red-800 hover:bg-red-700 hover:text-white cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onOpenBakeryProfile, onOpenPayModal]
  );

  const followupColumns: SmartTableColumn<DebtFollowupRecord>[] = useMemo(
    () => [
      { key: 'noticeNumber', label: 'رقم الإشعار', headerText: 'رقم الإشعار', type: 'numeric', sortable: true, render: (r) => <span className="num-cell font-black text-[#102A43]">{toArabicNumerals(r.noticeNumber)}</span> },
      { key: 'followupDate', label: 'تاريخ المتابعة', headerText: 'التاريخ', type: 'date', sortable: true, render: (r) => <span className="num-cell font-bold">{formatDateArabic(r.followupDate)}</span> },
      { key: 'bakeryName', label: 'اسم المخبز', headerText: 'اسم المخبز', type: 'text', sortable: true, render: (r) => <button type="button" onClick={() => onOpenBakeryProfile(r.bakeryId)} className="font-black text-[#164E83] hover:underline cursor-pointer">{r.bakeryName}</button> },
      { key: 'ownerName', label: 'اسم صاحب المخبز', headerText: 'اسم صاحب المخبز', type: 'text', render: (r) => <span className="font-bold">{r.ownerName}</span> },
      {
        key: 'posNumber',
        label: 'رقم ماكينة POS',
        headerText: 'رقم ماكينة POS',
        type: 'numeric',
        render: (r) => (
          <button type="button" onClick={() => onOpenBakeryProfile(r.bakeryId)} title="اضغط لفتح ملف المخبز" className="num-cell font-black px-2 py-0.5 rounded bg-slate-100 hover:bg-[#102A43] hover:text-white cursor-pointer">
            {toArabicNumerals(r.posNumber)}
          </button>
        ),
      },
      { key: 'actionType', label: 'نوع الإجراء / الإنذار', headerText: 'نوع الإجراء', type: 'badge', render: (r) => <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-black text-[10px]">{r.actionType}</span> },
      { key: 'notifyMethod', label: 'طريقة الإخطار', headerText: 'الطريقة', type: 'text', render: (r) => <span className="font-bold">{r.notifyMethod}</span> },
      { key: 'notifyResult', label: 'النتيجة', headerText: 'النتيجة', type: 'badge', render: (r) => <span className="font-black text-[#102A43]">{r.notifyResult}</span> },
      { key: 'nextFollowupDate', label: 'المتابعة القادمة', headerText: 'المتابعة القادمة', type: 'date', render: (r) => <span className="num-cell font-bold">{formatDateArabic(r.nextFollowupDate)}</span> },
      { key: 'employeeName', label: 'المسؤول', headerText: 'المسؤول', type: 'text', render: (r) => <span className="font-bold">{r.employeeName}</span> },
      {
        key: 'actions',
        label: 'طباعة',
        headerText: 'طباعة',
        type: 'actions',
        render: (r) => {
          const d = debts.find((x) => x.id === r.debtId);
          return d ? (
            <button
              type="button"
              onClick={() =>
                setNoticePreview({
                  title: r.actionType,
                  body: buildNoticeText(r.actionType, d),
                  docNumber: r.noticeNumber,
                })
              }
              className="p-1 rounded bg-slate-100 hover:bg-[#102A43] hover:text-white cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          ) : null;
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debts, onOpenBakeryProfile]
  );

  return (
    <div className="space-y-4">
      {mode === 'alerts' && (
        <>
          {/* شريط التحكم في التنبيهات المرئية والصوتية */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <BellRing className="w-5 h-5 text-red-700" />
              <span className="font-black text-[13px] text-[#102A43]">
                التنبيهات النشطة الفعلية: {toArabicNumerals(alerts.length)} (غير مقروء: {toArabicNumerals(alerts.filter((a) => !a.isRead).length)})
              </span>
              <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-[11px] font-black bg-slate-50">
                <option value="الكل">كل الحالات</option>
                <option value="غير مقروء">غير مقروء</option>
                <option value="تأخير شديد">تأخير شديد</option>
                <option value="متأخر">متأخر</option>
                <option value="مستحق اليوم">مستحق اليوم</option>
                <option value="اقترب الموعد">اقترب الموعد</option>
                <option value="مؤجل بموافقة">مؤجل بموافقة</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
                className={`px-3 py-1.5 rounded-xl font-black text-[11px] flex items-center gap-1.5 cursor-pointer ${
                  settings.soundEnabled ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                {settings.soundEnabled ? 'الصوت مفعل' : 'كتم الصوت'}
              </button>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.1}
                value={settings.soundVolume}
                onChange={(e) => onUpdateSettings({ soundVolume: Number(e.target.value) })}
                title="مستوى صوت التنبيهات"
                className="w-20 accent-[#102A43]"
              />
              <button
                type="button"
                onClick={() => playDebtModuleSound('overdue', true, settings.soundVolume, true)}
                className="px-2.5 py-1.5 rounded-xl bg-amber-100 text-amber-950 font-black text-[10.5px] cursor-pointer"
              >
                اختبار نغمة التنبيه
              </button>
              {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
                <button
                  type="button"
                  onClick={() => Notification.requestPermission().catch(() => {})}
                  className="px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-900 font-black text-[10.5px] cursor-pointer"
                >
                  تفعيل إشعارات المتصفح
                </button>
              )}
            </div>
          </div>

          <SmartAutoFitTable
            tableId="bakery-debts-alerts-center"
            userId={userId}
            rows={filteredAlerts}
            totalCount={filteredAlerts.length}
            getRowId={(a) => a.id}
            columns={alertColumns}
            maxHeightClass="max-h-[58vh]"
          />
        </>
      )}

      {mode === 'late' && (
        <>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-[11px] font-bold text-amber-950 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            تصنيف المخاطر أدناه («منتظم»، «يحتاج متابعة»، «متأخر»، «متعثر»، «شديد التعثر») هو مؤشر إداري لترتيب أولويات المتابعة والتحصيل فقط، ولا يُنشئ أي غرامة تلقائية بدون قرار ومراجعة رسمية.
          </div>
          <SmartAutoFitTable
            tableId="bakery-debts-late-bakeries"
            userId={userId}
            rows={lateBakeriesRows}
            totalCount={lateBakeriesRows.length}
            getRowId={(r) => r.bakeryId}
            columns={lateColumns}
            maxHeightClass="max-h-[58vh]"
          />
        </>
      )}

      {mode === 'followups' && (
        <div className="space-y-4">
          {/* نموذج تسجيل متابعة أو إصدار إنذار من النماذج الخمسة */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <h3 className="font-black text-[13px] text-[#102A43] flex items-center gap-2">
              <FileWarning className="w-4 h-4 text-[#C6A15B]" />
              تسجيل إجراء متابعة أو طباعة أحد النماذج الرسمية الخمسة للإنذارات
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <select value={flwDebtId} onChange={(e) => setFlwDebtId(e.target.value)} className="sm:col-span-2 px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-black">
                {openDebts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.debtNumber} — {d.bakeryName} (POS: {d.posNumber}) — المتبقي: {formatArabicCurrency(d.remainingAmount)}
                  </option>
                ))}
              </select>
              <select value={flwAction} onChange={(e) => setFlwAction(e.target.value as DebtFollowupRecord['actionType'])} className="px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-black">
                <option value="إشعار بقرب موعد السداد">١. إشعار بقرب موعد السداد</option>
                <option value="مطالبة بسداد قسط مستحق">٢. مطالبة بسداد قسط مستحق</option>
                <option value="إخطار بتأخر السداد">٣. إخطار بتأخر السداد</option>
                <option value="بيان بالمديونية المتبقية">٤. بيان بالمديونية المتبقية</option>
                <option value="إشعار بمراجعة موقف المديونية">٥. إشعار بمراجعة موقف المديونية</option>
                <option value="متابعة ميدانية / هاتفية">متابعة ميدانية / هاتفية</option>
              </select>
              <select value={flwMethod} onChange={(e) => setFlwMethod(e.target.value as DebtFollowupRecord['notifyMethod'])} className="px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-black">
                <option value="تسليم باليد">تسليم باليد</option>
                <option value="توقيع استلام بالإدارة">توقيع استلام بالإدارة</option>
                <option value="اتصال هاتفي">اتصال هاتفي</option>
                <option value="بريد مسجل">بريد مسجل</option>
              </select>
              <select value={flwResult} onChange={(e) => setFlwResult(e.target.value as DebtFollowupRecord['notifyResult'])} className="px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-black">
                <option value="قيد المتابعة">قيد المتابعة</option>
                <option value="تم الإخطار والتعهد بالسداد">تم الإخطار والتعهد بالسداد</option>
                <option value="طلب تأجيل / جدولة">طلب تأجيل / جدولة</option>
                <option value="لم يستجب">لم يستجب</option>
              </select>
              <input type="text" value={flwNotes} onChange={(e) => setFlwNotes(e.target.value)} placeholder="ملاحظات الموظف المختص..." className="sm:col-span-2 px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-bold" />
              <div className="flex items-center gap-1.5">
                <input type="date" value={flwNextDate} onChange={(e) => setFlwNextDate(e.target.value)} className="flex-1 px-2 py-2 rounded-lg border border-slate-300 text-[11px] font-bold" />
                <button
                  type="button"
                  onClick={() => {
                    const target = debts.find((d) => d.id === flwDebtId);
                    if (!target) return;
                    onAddFollowup({
                      followupDate: todayRef,
                      bakeryId: target.bakeryId,
                      bakeryName: target.bakeryName,
                      ownerName: target.ownerName,
                      posNumber: target.posNumber,
                      debtId: target.id,
                      debtNumber: target.debtNumber,
                      actionType: flwAction,
                      noticeDate: todayRef,
                      notifyMethod: flwMethod,
                      notifyResult: flwResult,
                      employeeNotes: flwNotes.trim() || 'تم الإخطار الرسمي وتوثيق الموقف',
                      nextAction: flwNextAction,
                      nextFollowupDate: flwNextDate,
                      employeeName: currentUserName,
                    });
                    setFlwNotes('');
                  }}
                  className="px-3.5 py-2 rounded-lg bg-[#102A43] text-white font-black text-[11px] cursor-pointer flex items-center gap-1"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-[#C6A15B]" />
                  حفظ
                </button>
              </div>
            </div>
          </div>

          <SmartAutoFitTable
            tableId="bakery-debts-followups-table"
            userId={userId}
            rows={followups}
            totalCount={followups.length}
            getRowId={(r) => r.id}
            columns={followupColumns}
            maxHeightClass="max-h-[50vh]"
          />
        </div>
      )}

      {/* نافذة تأجيل تنبيه بسبب معتمد */}
      {snoozeTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 w-full max-w-md space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-black text-[13px] text-[#102A43]">تأجيل التنبيه مؤقتاً بموافقة</h4>
              <button type="button" onClick={() => setSnoozeTarget(null)} className="p-1 rounded bg-slate-100 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="block text-[10.5px] font-black mb-1">تأجيل حتى تاريخ</label>
              <input type="date" value={snoozeUntil} onChange={(e) => setSnoozeUntil(e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-bold" />
            </div>
            <div>
              <label className="block text-[10.5px] font-black mb-1">سبب التأجيل الإلزامي</label>
              <textarea rows={2} value={snoozeReason} onChange={(e) => setSnoozeReason(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 text-[11px] font-bold" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setSnoozeTarget(null)} className="px-3 py-1.5 rounded-lg bg-slate-100 font-black text-[11px] cursor-pointer">إلغاء</button>
              <button
                type="button"
                onClick={() => {
                  if (!snoozeReason.trim()) return;
                  const targetKey = snoozeTarget.installmentId || snoozeTarget.debtId;
                  onSnoozeAlert(targetKey, snoozeUntil, snoozeReason.trim());
                  setSnoozeTarget(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-[#102A43] text-white font-black text-[11px] cursor-pointer"
              >
                اعتماد التأجيل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* معاينة الطباعة الرسمية للإشعارات والإنذارات */}
      {noticePreview && (
        <OfficialPrintModal
          open
          onClose={() => setNoticePreview(null)}
          title={noticePreview.title}
          subtitle="نموذج إخطار رسمي صادر من منظومة المديونيات والتحصيل"
          docNumber={noticePreview.docNumber}
          printedBy={currentUserName}
          todayRef={todayRef}
        >
          <div className="border-2 border-[#102A43] rounded-xl p-6 bg-slate-50 leading-loose text-[14px] font-bold text-[#102A43]">
            {noticePreview.body}
          </div>
        </OfficialPrintModal>
      )}
    </div>
  );
}
