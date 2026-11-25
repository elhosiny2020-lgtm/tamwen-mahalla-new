'use client';

import React, { useMemo, useState } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Settings2,
  History,
  FlaskConical,
  CheckCircle2,
  XCircle,
  Plus,
} from 'lucide-react';
import {
  BakeryDebtRecord,
  BakeryRecord,
  BakeryViolationRecord,
  DebtAuditLogRecord,
  DebtFollowupRecord,
  DebtInstallmentRecord,
  DebtModuleSettings,
  DebtPaymentRecord,
  DebtSchedulePlan,
  ViolationAppealRecord,
  ViolationRuleConfig,
} from '@/types';
import { runIsolatedFinancialSelfTests } from '@/lib/debts-engine';
import { exportCsvUtf8Bom } from '@/lib/debts-data';
import {
  formatArabicCurrency,
  formatArabicDecimal,
  formatArabicPercent,
  formatDateArabic,
  toArabicNumerals,
} from '@/lib/utils';
import SmartAutoFitTable, { SmartTableColumn } from '@/components/SmartAutoFitTable';
import { OfficialPrintModal } from './DebtsSharedUi';

interface DebtsReportsAndSettingsTabProps {
  mode: 'reports' | 'settings' | 'audit';
  userId: string;
  currentUserName: string;
  bakeries: BakeryRecord[];
  debts: BakeryDebtRecord[];
  payments: DebtPaymentRecord[];
  schedules: DebtSchedulePlan[];
  installments: DebtInstallmentRecord[];
  followups: DebtFollowupRecord[];
  violations: BakeryViolationRecord[];
  appeals: ViolationAppealRecord[];
  rules: ViolationRuleConfig[];
  auditLogs: DebtAuditLogRecord[];
  settings: DebtModuleSettings;
  todayRef: string;
  onUpdateSettings: (partial: Partial<DebtModuleSettings>) => void;
  onExportFullBackup: () => void;
}

const DEBT_REPORTS_CATALOG = [
  { id: 'd-01', title: '١. إجمالي مديونيات المخابز' },
  { id: 'd-02', title: '٢. تفاصيل المديونيات المتبقية' },
  { id: 'd-03', title: '٣. المخابز المسددة بالكامل' },
  { id: 'd-04', title: '٤. المخابز المسددة جزئياً' },
  { id: 'd-05', title: '٥. المخابز المتأخرة في السداد' },
  { id: 'd-06', title: '٦. المخابز المتعثرة (تصنيف الخطر)' },
  { id: 'd-07', title: '٧. الأقساط المستحقة اليوم' },
  { id: 'd-08', title: '٨. الأقساط المستحقة خلال ٧ أيام' },
  { id: 'd-09', title: '٩. الأقساط المتأخرة' },
  { id: 'd-10', title: '١٠. التحصيل اليومي والدفعات' },
  { id: 'd-11', title: '١١. التحصيل الأسبوعي المجدول' },
  { id: 'd-12', title: '١٢. التحصيل الشهري حسب المخابز' },
  { id: 'd-13', title: '١٣. تقرير المديونيات حسب القرية' },
  { id: 'd-14', title: '١٤. تقرير المديونيات حسب الوحدة المحلية' },
  { id: 'd-15', title: '١٥. تقرير المديونيات حسب الجهة المصدرة' },
  { id: 'd-16', title: '١٦. تقرير المديونيات حسب نوع المخالفة' },
  { id: 'd-17', title: '١٧. تقرير التسويات والخصومات المعتمدة' },
  { id: 'd-18', title: '١٨. كشف حساب تفصيلي لمخبز (أعلى الأرصدة)' },
  { id: 'd-19', title: '١٩. المخابز الملتزمة بالسداد في مواعيدها' },
  { id: 'd-20', title: '٢٠. تقرير مقارن للمديونيات مقابل التحصيل' },
  { id: 'd-21', title: '٢١. سجل إجراءات المتابعة والإنذارات' },
  { id: 'd-22', title: '٢٢. ملخص المديونيات التنفيذي للإدارة' },
] as const;

const VIOLATION_REPORTS_CATALOG = [
  { id: 'v-01', title: '٢٣. تقرير مخالفات نقص وزن الرغيف (١٧٥/٢٠٢٤)' },
  { id: 'v-02', title: '٢٤. تقرير المخالفات المكررة داخل المدة القانونية' },
  { id: 'v-03', title: '٢٥. تقرير المخابز الصادر بحقها قرارات غلق' },
  { id: 'v-04', title: '٢٦. تقرير المخابز المعرضة لخصم الحصة' },
  { id: 'v-05', title: '٢٧. تقرير مخالفات منظومة صرف الخبز (POS)' },
  { id: 'v-06', title: '٢٨. تقرير مخالفات الدقيق والتصرف في الحصص' },
  { id: 'v-07', title: '٢٩. تقرير مخالفات التشغيل والنظافة والتفتيش' },
  { id: 'v-08', title: '٣٠. تقرير مخالفات الخبز السياحي والفينو (توجيه ٥/٢٠٢٦)' },
  { id: 'v-09', title: '٣١. كشف المخالفات المحولة لمديونيات مالية' },
  { id: 'v-10', title: '٣٢. تقرير المخالفات المعتمدة مقابل المسودات' },
  { id: 'v-11', title: '٣٣. تقرير التظلمات وقرارات اللجان' },
  { id: 'v-12', title: '٣٤. مقارنة المخالفات حسب القرية والوحدة' },
  { id: 'v-13', title: '٣٥. سجل القرارات والقواعد القانونية الفعالة' },
  { id: 'v-14', title: '٣٦. التقرير الإحصائي الموحد للمخالفات التموينية' },
] as const;

export default function DebtsReportsAndSettingsTab({
  mode,
  userId,
  currentUserName,
  debts,
  payments,
  installments,
  followups,
  violations,
  appeals,
  rules,
  auditLogs,
  settings,
  todayRef,
  onUpdateSettings,
  onExportFullBackup,
}: DebtsReportsAndSettingsTabProps) {
  const [selectedReportId, setSelectedReportId] = useState<string>('d-01');
  const [showPrint, setShowPrint] = useState(false);

  // إعدادات قابلة للإضافة
  const [newAuthority, setNewAuthority] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newMethod, setNewMethod] = useState('');

  // نتائج الاختبارات المعزولة
  const selfTestResults = useMemo(() => runIsolatedFinancialSelfTests(rules), [rules]);
  const passedTestsCount = selfTestResults.filter((t) => t.passed).length;

  const activeReportTitle = useMemo(() => {
    return (
      [...DEBT_REPORTS_CATALOG, ...VIOLATION_REPORTS_CATALOG].find((r) => r.id === selectedReportId)?.title ||
      'تقرير مالي ورقابي'
    );
  }, [selectedReportId]);

  // بناء صفوف وأعمدة التقرير المختار بصيغة موحدة شاملة POS بجوار صاحب المخبز
  const reportTable = useMemo((): { headers: string[]; rows: (string | number)[][] } => {
    if (selectedReportId.startsWith('v-')) {
      let filtered = violations;
      if (selectedReportId === 'v-01') filtered = violations.filter((v) => (v.shortageGrams || 0) > 0);
      else if (selectedReportId === 'v-02') filtered = violations.filter((v) => v.isRepeat);
      else if (selectedReportId === 'v-03') filtered = violations.filter((v) => v.closureDays > 0);
      else if (selectedReportId === 'v-04') filtered = violations.filter((v) => v.quotaDeductionPct > 0);
      else if (selectedReportId === 'v-05') filtered = violations.filter((v) => v.groupName === 'مخالفات منظومة صرف الخبز');
      else if (selectedReportId === 'v-06') filtered = violations.filter((v) => v.groupName === 'مخالفات الدقيق والتصرف في الحصص');
      else if (selectedReportId === 'v-08') filtered = violations.filter((v) => v.breadCategory !== 'خبز بلدي مدعم');
      else if (selectedReportId === 'v-09') filtered = violations.filter((v) => Boolean(v.linkedDebtId));

      if (selectedReportId === 'v-11') {
        return {
          headers: ['رقم التظلم', 'المخبز', 'رقم ماكينة POS', 'رقم المخالفة', 'تاريخ التظلم', 'السبب', 'قرار اللجنة'],
          rows: appeals.map((a) => [
            a.appealNumber, a.bakeryName, a.posNumber, a.violationNumber, a.appealDate, a.reason, a.decisionStatus,
          ]),
        };
      }

      return {
        headers: ['رقم المخالفة', 'المحضر', 'المخبز', 'صاحب المخبز', 'رقم ماكينة POS', 'التاريخ', 'الوصف', 'النقص', 'القيمة النهائية', 'الحالة', 'الربط بالمديونية'],
        rows: filtered.map((v) => [
          v.violationNumber, v.minutesNumber, v.bakeryName, v.ownerName, v.posNumber, v.violationDate,
          v.violationName, v.shortageGrams ? `${v.shortageGrams} جم` : '—', v.finalFineAmount, v.status, v.linkedDebtNumber || '—',
        ]),
      };
    }

    if (selectedReportId === 'd-07' || selectedReportId === 'd-08' || selectedReportId === 'd-09') {
      const list = installments.filter((i) => {
        if (selectedReportId === 'd-09') return i.delayDays > 0 && i.remainingAmount > 0;
        if (selectedReportId === 'd-07') return i.status === 'مستحق اليوم';
        return i.remainingAmount > 0;
      });
      return {
        headers: ['رقم الجدول', 'القسط', 'المخبز', 'صاحب المخبز', 'رقم ماكينة POS', 'تاريخ الاستحقاق', 'القيمة', 'المتبقي', 'التأخير (يوم)', 'الحالة'],
        rows: list.map((i) => [
          i.scheduleNumber, i.installmentSerial, i.bakeryName, i.ownerName, i.posNumber,
          i.dueDate, i.amount, i.remainingAmount, i.delayDays, i.status,
        ]),
      };
    }

    if (selectedReportId === 'd-10') {
      return {
        headers: ['رقم الدفعة', 'الإيصال', 'المخبز', 'صاحب المخبز', 'رقم ماكينة POS', 'التاريخ', 'المبلغ', 'الطريقة', 'المحصل', 'الحالة'],
        rows: payments.map((p) => [
          p.paymentNumber, p.receiptNumber, p.bakeryName, p.ownerName, p.posNumber,
          p.paymentDate, p.amount, p.paymentMethod, p.collectorName, p.status,
        ]),
      };
    }

    if (selectedReportId === 'd-21') {
      return {
        headers: ['رقم الإشعار', 'التاريخ', 'المخبز', 'صاحب المخبز', 'رقم ماكينة POS', 'نوع الإجراء', 'الطريقة', 'النتيجة', 'المسؤول'],
        rows: followups.map((f) => [
          f.noticeNumber, f.followupDate, f.bakeryName, f.ownerName, f.posNumber,
          f.actionType, f.notifyMethod, f.notifyResult, f.employeeName,
        ]),
      };
    }

    let list = debts;
    if (selectedReportId === 'd-02') list = debts.filter((d) => d.remainingAmount > 0);
    else if (selectedReportId === 'd-03') list = debts.filter((d) => d.paymentStatus === 'مسدد بالكامل');
    else if (selectedReportId === 'd-04') list = debts.filter((d) => d.paymentStatus === 'مسدد جزئيًا');
    else if (selectedReportId === 'd-05' || selectedReportId === 'd-06') list = debts.filter((d) => d.delayDays > 0 && d.remainingAmount > 0);
    else if (selectedReportId === 'd-17') list = debts.filter((d) => d.approvedSettlementsAmount > 0);
    else if (selectedReportId === 'd-19') list = debts.filter((d) => d.delayDays === 0);

    return {
      headers: ['رقم المديونية', 'اسم المخبز', 'صاحب المخبز', 'رقم ماكينة POS', 'القرية', 'الجهة', 'المخالفة', 'صافي المستحق', 'المسدد', 'المتبقي', 'نسبة السداد', 'الحالة'],
      rows: list.map((d) => [
        d.debtNumber, d.bakeryName, d.ownerName, d.posNumber, d.village, d.issuingAuthority,
        d.violationType, d.netDueAmount, d.totalPaidAmount, d.remainingAmount, `${d.paymentPercentage}%`, d.paymentStatus,
      ]),
    };
  }, [selectedReportId, debts, payments, installments, followups, violations, appeals]);

  const auditColumns: SmartTableColumn<DebtAuditLogRecord>[] = useMemo(
    () => [
      { key: 'timestamp', label: 'التاريخ والوقت', headerText: 'التاريخ والوقت', type: 'date', sortable: true, render: (r) => <span className="num-cell font-bold">{formatDateArabic(r.timestamp, true)}</span> },
      { key: 'userName', label: 'المستخدم المنفذ', headerText: 'المستخدم', type: 'text', sortable: true, render: (r) => <span className="font-black text-[#102A43]">{r.userName}</span> },
      { key: 'operation', label: 'نوع العملية', headerText: 'العملية', type: 'badge', sortable: true, render: (r) => <span className="px-2 py-0.5 rounded bg-slate-100 font-black text-[10px]">{r.operation}</span> },
      { key: 'recordRef', label: 'السجل المرجعي', headerText: 'المرجع', type: 'numeric', sortable: true, render: (r) => <span className="num-cell font-black text-[#164E83]">{toArabicNumerals(r.recordRef)}</span> },
      { key: 'beforeData', label: 'القيمة قبل التعديل', headerText: 'قبل', type: 'text', render: (r) => <span className="font-bold text-slate-600">{r.beforeData}</span> },
      { key: 'afterData', label: 'القيمة بعد التعديل', headerText: 'بعد', type: 'text', render: (r) => <span className="font-bold text-emerald-800">{r.afterData}</span> },
      { key: 'reason', label: 'السبب / الملاحظة', headerText: 'السبب', type: 'text', render: (r) => <span className="font-bold">{r.reason}</span> },
    ],
    []
  );

  return (
    <div className="space-y-4">
      {mode === 'reports' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-black text-[13px] text-[#102A43] flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#C6A15B]" />
                مركز التقارير المتخصص (٢٢ تقرير مديونيات وتحصيل + ١٤ تقرير مخالفات)
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportCsvUtf8Bom(`${activeReportTitle}_${todayRef}`, reportTable.headers, reportTable.rows)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white font-black text-[11px] cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  تصدير Excel (UTF-8 BOM)
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrint(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#102A43] text-white font-black text-[11px] cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-[#C6A15B]" />
                  طباعة التقرير A4
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10.5px] font-black text-slate-700 mb-1">تقارير المديونيات والتحصيل (٢٢ تقريراً)</label>
                <select
                  value={selectedReportId.startsWith('d-') ? selectedReportId : ''}
                  onChange={(e) => e.target.value && setSelectedReportId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-[11px] font-black bg-slate-50"
                >
                  <option value="">— اختر من تقارير المديونيات —</option>
                  {DEBT_REPORTS_CATALOG.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10.5px] font-black text-slate-700 mb-1">تقارير المخالفات والجزاءات (١٤ تقريراً)</label>
                <select
                  value={selectedReportId.startsWith('v-') ? selectedReportId : ''}
                  onChange={(e) => e.target.value && setSelectedReportId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-[11px] font-black bg-amber-50/40"
                >
                  <option value="">— اختر من تقارير المخالفات —</option>
                  {VIOLATION_REPORTS_CATALOG.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* معاينة التقرير التفاعلي */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-[12px] font-black text-[#102A43]">
              <span>{activeReportTitle}</span>
              <span className="num-cell text-slate-600">{toArabicNumerals(reportTable.rows.length)} صف</span>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[52vh]">
              <table className="w-full text-right text-[11px]">
                <thead className="bg-[#102A43] text-white font-black sticky top-0">
                  <tr>
                    {reportTable.headers.map((h) => <th key={h} className="p-2 whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {reportTable.rows.length === 0 ? (
                    <tr><td colSpan={reportTable.headers.length} className="p-6 text-center font-bold text-slate-500">لا توجد سجلات مطابقة لهذا التقرير حالياً.</td></tr>
                  ) : (
                    reportTable.rows.map((row, idx) => (
                      <tr key={idx} className="border-t border-slate-100 even:bg-slate-50">
                        {row.map((cell, ci) => (
                          <td key={ci} className="p-2 font-bold whitespace-nowrap num-cell">
                            {typeof cell === 'number' ? formatArabicDecimal(cell, 2).replace(/٫00$/, '') : toArabicNumerals(String(cell))}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {mode === 'settings' && (
        <div className="space-y-4">
          {/* إعدادات النظام المالي */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 text-[11px]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <h3 className="font-black text-[14px] text-[#102A43] flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-[#C6A15B]" />
                إعدادات المنظومة المالية وحاسبة المخالفات والرقابة
              </h3>
              <button
                type="button"
                onClick={onExportFullBackup}
                className="px-3.5 py-2 rounded-xl bg-[#102A43] text-white font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#C6A15B]" />
                نسخة احتياطية كاملة للمديونيات (JSON)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block font-black mb-1">الوزن الرسمي للرغيف البلدي (جم)</label>
                <input type="number" value={settings.defaultBaladiWeightGrams} onChange={(e) => onUpdateSettings({ defaultBaladiWeightGrams: Number(e.target.value) || 90 })} className="num-cell w-full px-2.5 py-2 rounded-lg border border-slate-300 font-black" />
              </div>
              <div>
                <label className="block font-black mb-1">سعر شيكارة الدقيق الافتراضي (ج.م)</label>
                <input type="number" value={settings.defaultFlourSackPriceEgp} onChange={(e) => onUpdateSettings({ defaultFlourSackPriceEgp: Number(e.target.value) || 235 })} className="num-cell w-full px-2.5 py-2 rounded-lg border border-slate-300 font-black" />
              </div>
              <div>
                <label className="block font-black mb-1">عتبة المتأخر (أيام)</label>
                <input
                  type="number"
                  value={settings.riskThresholds.lateDays}
                  onChange={(e) => onUpdateSettings({ riskThresholds: { ...settings.riskThresholds, lateDays: Number(e.target.value) || 8 } })}
                  className="num-cell w-full px-2.5 py-2 rounded-lg border border-slate-300 font-black"
                />
              </div>
              <div>
                <label className="block font-black mb-1">عتبة المتعثر (أيام)</label>
                <input
                  type="number"
                  value={settings.riskThresholds.defaultedDays}
                  onChange={(e) => onUpdateSettings({ riskThresholds: { ...settings.riskThresholds, defaultedDays: Number(e.target.value) || 16 } })}
                  className="num-cell w-full px-2.5 py-2 rounded-lg border border-slate-300 font-black"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
              <div>
                <span className="font-black text-[#102A43] block">قاعدة الفصل بين المسجل والمعتمد (Separation of Duties)</span>
                <span className="text-slate-600 font-bold">عند التفعيل يُمنع نفس المستخدم الذي سجل المديونية أو المخالفة من اعتمادها بنفسه</span>
              </div>
              <button
                type="button"
                onClick={() => onUpdateSettings({ enforceSeparationOfDuties: !settings.enforceSeparationOfDuties })}
                className={`px-3.5 py-1.5 rounded-xl font-black cursor-pointer ${
                  settings.enforceSeparationOfDuties ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-800'
                }`}
              >
                {settings.enforceSeparationOfDuties ? 'مفعل (إلزامي)' : 'غير مفعل (مرن)'}
              </button>
            </div>

            {/* القوائم المخصصة */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  title: 'الجهات الصادر عنها المديونيات',
                  list: settings.authorities,
                  val: newAuthority,
                  setVal: setNewAuthority,
                  onAdd: () => {
                    if (!newAuthority.trim()) return;
                    onUpdateSettings({ authorities: [...settings.authorities, newAuthority.trim()] });
                    setNewAuthority('');
                  },
                },
                {
                  title: 'تصنيفات المخالفات',
                  list: settings.violationCategories,
                  val: newCategory,
                  setVal: setNewCategory,
                  onAdd: () => {
                    if (!newCategory.trim()) return;
                    onUpdateSettings({ violationCategories: [...settings.violationCategories, newCategory.trim()] });
                    setNewCategory('');
                  },
                },
                {
                  title: 'طرق الدفع المعتمدة',
                  list: settings.paymentMethods,
                  val: newMethod,
                  setVal: setNewMethod,
                  onAdd: () => {
                    if (!newMethod.trim()) return;
                    onUpdateSettings({ paymentMethods: [...settings.paymentMethods, newMethod.trim()] });
                    setNewMethod('');
                  },
                },
              ].map((grp) => (
                <div key={grp.title} className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50/60">
                  <span className="font-black text-[#102A43] block">{grp.title}</span>
                  <div className="flex gap-1">
                    <input type="text" value={grp.val} onChange={(e) => grp.setVal(e.target.value)} placeholder="إضافة بند..." className="flex-1 min-w-0 px-2 py-1 rounded border border-slate-300 bg-white font-bold" />
                    <button type="button" onClick={grp.onAdd} className="px-2 py-1 rounded bg-[#102A43] text-white cursor-pointer"><Plus className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {grp.list.map((item) => (
                      <span key={item} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-bold">{item}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 20- لوحة الاختبارات المعزولة الآلية */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h4 className="font-black text-[13px] text-[#102A43] flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-emerald-700" />
                حزمة اختبارات التحقق المحاسبي والقانوني المعزولة ({toArabicNumerals(passedTestsCount)} / {toArabicNumerals(selfTestResults.length)} ناجحة)
              </h4>
              <span className="text-[10.5px] font-bold text-slate-600">تعمل على بيانات اختبار مستقلة ولا تمس أي سجل حقيقي</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px]">
              {selfTestResults.map((t) => (
                <div key={t.id} className={`p-3 rounded-xl border flex items-start gap-2 ${t.passed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  {t.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />}
                  <div className="space-y-0.5">
                    <div className="font-black text-[#102A43]">{t.title}</div>
                    <div className="text-slate-600 font-bold">المتوقع: {t.expected}</div>
                    <div className="text-slate-800 font-bold">النتيجة الفعلية: {t.actual}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === 'audit' && (
        <div className="space-y-3">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[11px] font-bold text-[#102A43] flex items-center gap-2">
            <History className="w-4 h-4 text-[#C6A15B] shrink-0" />
            سجل التدقيق المالي غير قابل للتعديل أو الحذف ويحفظ كافة العمليات (المديونيات، الدفعات، الإلغاء، الجدولة، التأجيل، الإشعارات، وحساب المخالفات).
          </div>
          <SmartAutoFitTable
            tableId="bakery-debts-audit-log"
            userId={userId}
            rows={auditLogs}
            totalCount={auditLogs.length}
            getRowId={(r) => r.id}
            columns={auditColumns}
            maxHeightClass="max-h-[60vh]"
          />
        </div>
      )}

      <OfficialPrintModal
        open={showPrint}
        onClose={() => setShowPrint(false)}
        title={activeReportTitle}
        subtitle={`إجمالي السجلات: ${toArabicNumerals(reportTable.rows.length)}`}
        docNumber={`RPT-${selectedReportId.toUpperCase()}`}
        printedBy={currentUserName}
        todayRef={todayRef}
      >
        <table className="w-full border-collapse text-[9.5px]">
          <thead>
            <tr className="bg-[#102A43] text-white">
              {reportTable.headers.map((h) => <th key={h} className="border border-slate-400 p-1.5">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {reportTable.rows.map((row, idx) => (
              <tr key={idx} className="even:bg-slate-50">
                {row.map((cell, ci) => (
                  <td key={ci} className="border border-slate-300 p-1.5 num-cell">
                    {typeof cell === 'number' ? formatArabicDecimal(cell, 2).replace(/٫00$/, '') : toArabicNumerals(String(cell))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </OfficialPrintModal>
    </div>
  );
}
