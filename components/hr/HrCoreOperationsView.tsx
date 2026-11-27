'use client';

import React, { useMemo, useState } from 'react';
import {
  Users,
  UserCheck,
  Clock,
  CalendarDays,
  ShieldAlert,
  Globe,
  GraduationCap,
  FileText,
  AlertTriangle,
  Search,
  PlusCircle,
  Upload,
  CheckCircle2,
  Printer,
  RefreshCw,
  Eye,
  Edit3,
  Trash2,
} from 'lucide-react';
import { User } from '@/types';
import {
  HrPersonnelStoreData,
  HrEmployeeUnifiedRecord,
  HrSmartAlertItem,
  HrAttendanceStatus,
  HrIncidentType,
  computeAttendanceTiming,
  computeRemainingDays,
  maskNationalId,
} from '@/lib/hr-personnel-store';
import { HrScreenId } from './HrRenewalAndReportsView';
import { HrProfileModalMode } from './HrEmployeeProfileModal';
import AnimatedStatCard from '../AnimatedStatCard';
import { toArabicNumerals, formatDateArabic, formatArabicCurrency, normalizeSearchText } from '@/lib/utils';

interface HrCoreOperationsViewProps {
  activeScreen: HrScreenId;
  setActiveScreen: (s: HrScreenId) => void;
  store: HrPersonnelStoreData;
  updateStore: (updater: (prev: HrPersonnelStoreData) => HrPersonnelStoreData) => void;
  currentUser: User;
  canViewFullNationalId: boolean;
  isHrAdminOrSupervisor: boolean;
  todayRef: string;
  smartAlerts: HrSmartAlertItem[];
  onOpenProfileModal: (mode: HrProfileModalMode, emp: HrEmployeeUnifiedRecord | null) => void;
  onNotify: (msg: string) => void;
}

export type DailyStatusFilter =
  | 'ALL'
  | 'ON_DUTY'
  | 'ON_LEAVE'
  | 'ON_MISSION'
  | 'ON_SECONDMENT'
  | 'EXPIRED'
  | 'NEEDS_RENEWAL'
  | 'STALLED_REQUEST';

export default function HrCoreOperationsView({
  activeScreen,
  setActiveScreen,
  store,
  updateStore,
  currentUser,
  canViewFullNationalId,
  isHrAdminOrSupervisor,
  todayRef,
  smartAlerts,
  onOpenProfileModal,
  onNotify,
}: HrCoreOperationsViewProps) {
  // فلاتر شاشة الموقف الوظيفي اليومي (Daily Staff Status)
  const [dailyFilter, setDailyFilter] = useState<DailyStatusFilter>('ALL');
  const [dailyAdminFilter, setDailyAdminFilter] = useState<string>('ALL');

  // فلاتر البحث الذكي لقاعدة بيانات العاملين (١٠ معايير بحث)
  const [empSearch, setEmpSearch] = useState('');
  const [empAdminFilter, setEmpAdminFilter] = useState('ALL');
  const [empDeptFilter, setEmpDeptFilter] = useState('ALL');
  const [empCategoryFilter, setEmpCategoryFilter] = useState('ALL');
  const [empStatusFilter, setEmpStatusFilter] = useState('ALL');

  // نماذج الحضور والانصراف واستيراد البصمة والإجازات
  const [attEmpId, setAttEmpId] = useState(store.employees[0]?.id || '');
  const [attDate, setAttDate] = useState(todayRef);
  const [attIn, setAttIn] = useState('08:20');
  const [attOut, setAttOut] = useState('14:00');
  const [attOverride, setAttOverride] = useState<string>('AUTO');

  // نماذج الإجازة
  const [leaveEmpId, setLeaveEmpId] = useState(store.employees[0]?.id || '');
  const [leaveType, setLeaveType] = useState<'اعتيادية' | 'عارضة' | 'مرضية' | 'مأمورية رسمية'>('اعتيادية');
  const [leaveStart, setLeaveStart] = useState(todayRef);
  const [leaveEnd, setLeaveEnd] = useState(todayRef);
  const [leaveSub, setLeaveSub] = useState('أ. خالد محمد الشناوي');

  // نماذج الإنذار والجزاء المعتمد
  const [warnEmpId, setWarnEmpId] = useState(store.employees[0]?.id || '');
  const [warnType, setWarnType] = useState<HrIncidentType>('تأخير');
  const [warnDesc, setWarnDesc] = useState('');
  const [warnDocNo, setWarnDocNo] = useState('');
  const [penEmpId, setPenEmpId] = useState(store.employees[0]?.id || '');
  const [penType, setPenType] = useState('لفت نظر / إنذار إداري');
  const [penDecisionNo, setPenDecisionNo] = useState('');
  const [penDecisionDate, setPenDecisionDate] = useState(todayRef);
  const [penValue, setPenValue] = useState('يوم واحد');

  // نماذج إضافة إعارة / خدمة عامة / عقد استعانة
  const [secEmpId, setSecEmpId] = useState(store.employees[0]?.id || '');
  const [secHost, setSecHost] = useState('');
  const [secDecNo, setSecDecNo] = useState('');
  const [secEnd, setSecEnd] = useState('2027-06-30');

  // حسابات الموقف الوظيفي اليومي الحية لكل موظف
  const dailyStaffRows = useMemo(() => {
    return store.employees.map((emp) => {
      const sec = store.secondments.find(
        (s) => s.employeeId === emp.id && s.status !== 'عاد الموظف للعمل' && s.status !== 'تم إنهاؤها بقرار'
      );
      const ps = store.publicServiceMembers.find((p) => p.employeeId === emp.id);
      const cnt = store.assistanceContracts.find((c) => c.employeeId === emp.id);
      const activeLeave = store.leaves.find(
        (l) => l.employeeId === emp.id && l.status === 'معتمدة' && l.startDate <= todayRef && l.endDate >= todayRef
      );
      const stalledReq = store.renewalRequests.find(
        (r) =>
          r.employeeId === emp.id &&
          ['تم الإرسال من الموظف', 'قيد مراجعة شؤون العاملين', 'مطلوب استكمال مستندات', 'قيد الاعتماد'].includes(r.workflowStatus)
      );

      const expiryDate = sec?.endDate || ps?.expectedEndDate || cnt?.contractEndDate || '';
      const remDays = expiryDate ? computeRemainingDays(expiryDate, todayRef) : null;

      const isExpired =
        emp.jobStatus === 'انتهت خدمته' ||
        (remDays !== null && remDays < 0) ||
        ps?.status === 'انتهت الخدمة' ||
        cnt?.status === 'منتهي';

      const needsRenewal =
        !isExpired &&
        remDays !== null &&
        remDays <= 90;

      const isOnMission =
        emp.jobStatus === 'مأمورية' ||
        (activeLeave && activeLeave.leaveType === 'مأمورية رسمية') ||
        store.attendance.some((a) => a.employeeId === emp.id && a.date === todayRef && a.dayStatus === 'مأمورية');

      const isOnLeave =
        !isOnMission &&
        (emp.jobStatus === 'إجازة' ||
          Boolean(activeLeave) ||
          store.attendance.some((a) => a.employeeId === emp.id && a.date === todayRef && a.dayStatus === 'إجازة'));

      const isOnSecondment = emp.jobStatus === 'معار' || Boolean(sec);
      const isOnDuty =
        !isExpired && !isOnLeave && !isOnMission && !isOnSecondment && emp.jobStatus === 'على رأس العمل';

      const primaryBadge = isExpired
        ? 'انتهت خدمته أو عقده'
        : isOnSecondment
        ? 'في إعارة'
        : isOnMission
        ? 'في مأمورية'
        : isOnLeave
        ? 'في إجازة'
        : emp.jobStatus;

      return {
        emp,
        primaryBadge,
        expiryDate,
        remDays,
        isOnDuty,
        isOnLeave,
        isOnMission,
        isOnSecondment,
        isExpired,
        needsRenewal,
        hasStalledRequest: Boolean(stalledReq),
        stalledRequestNumber: stalledReq?.requestNumber || '',
        stalledRequestStatus: stalledReq?.workflowStatus || '',
      };
    });
  }, [store, todayRef]);

  const dailyCounts = useMemo(
    () => ({
      onDuty: dailyStaffRows.filter((r) => r.isOnDuty).length,
      onLeave: dailyStaffRows.filter((r) => r.isOnLeave).length,
      onMission: dailyStaffRows.filter((r) => r.isOnMission).length,
      onSecondment: dailyStaffRows.filter((r) => r.isOnSecondment).length,
      expired: dailyStaffRows.filter((r) => r.isExpired).length,
      needsRenewal: dailyStaffRows.filter((r) => r.needsRenewal).length,
      stalled: dailyStaffRows.filter((r) => r.hasStalledRequest).length,
    }),
    [dailyStaffRows]
  );

  const filteredDailyStaffRows = useMemo(() => {
    return dailyStaffRows.filter((r) => {
      if (dailyAdminFilter !== 'ALL' && r.emp.supplyAdministration !== dailyAdminFilter) return false;
      switch (dailyFilter) {
        case 'ON_DUTY': return r.isOnDuty;
        case 'ON_LEAVE': return r.isOnLeave;
        case 'ON_MISSION': return r.isOnMission;
        case 'ON_SECONDMENT': return r.isOnSecondment;
        case 'EXPIRED': return r.isExpired;
        case 'NEEDS_RENEWAL': return r.needsRenewal;
        case 'STALLED_REQUEST': return r.hasStalledRequest;
        default: return true;
      }
    });
  }, [dailyStaffRows, dailyFilter, dailyAdminFilter]);

  const uniqueAdmins = useMemo(
    () => Array.from(new Set(store.employees.map((e) => e.supplyAdministration))),
    [store.employees]
  );
  const uniqueDepts = useMemo(
    () => Array.from(new Set(store.employees.map((e) => e.departmentName))),
    [store.employees]
  );

  // البحث الذكي في قاعدة بيانات العاملين (١٠ معايير)
  const filteredEmployees = useMemo(() => {
    const q = normalizeSearchText(empSearch);
    return store.employees.filter((e) => {
      if (empAdminFilter !== 'ALL' && e.supplyAdministration !== empAdminFilter) return false;
      if (empDeptFilter !== 'ALL' && e.departmentName !== empDeptFilter) return false;
      if (empCategoryFilter !== 'ALL' && e.employmentCategory !== empCategoryFilter) return false;
      if (empStatusFilter !== 'ALL' && e.jobStatus !== empStatusFilter) return false;
      if (!q) return true;
      return normalizeSearchText(
        `${e.nationalId} ${e.employeeCode} ${e.employeeNumber} ${e.fullName} ${e.phone} ${e.supplyAdministration} ${e.departmentName} ${e.jobTitle} ${e.appointmentType} ${e.jobStatus}`
      ).includes(q);
    });
  }, [store.employees, empSearch, empAdminFilter, empDeptFilter, empCategoryFilter, empStatusFilter]);

  // ===========================================================================
  // ١. لوحة التحكم الرئيسية للموارد البشرية (Clickable KPI Cards)
  // ===========================================================================
  if (activeScreen === 'dashboard') {
    const exp90 = smartAlerts.filter((a) => a.remainingDays <= 90 && a.remainingDays > 60).length;
    const exp60 = smartAlerts.filter((a) => a.remainingDays <= 60 && a.remainingDays > 30).length;
    const exp30 = smartAlerts.filter((a) => a.remainingDays <= 30).length;

    return (
      <div className="space-y-5">
        {/* أ. مؤشرات بيانات العاملين والموقف اليومي */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <AnimatedStatCard
            title="إجمالي العاملين المسجلين"
            value={store.employees.length}
            unit="ملف موحد"
            indicator={`مكتمل البيانات: ${toArabicNumerals(store.employees.filter((e) => e.isProfileComplete).length)}`}
            icon={Users}
            theme="navy"
            onClick={() => setActiveScreen('employees_db')}
          />
          <AnimatedStatCard
            title="على رأس العمل اليوم"
            value={dailyCounts.onDuty}
            unit="موظف منتظم"
            indicator="الموقف الوظيفي اليومي"
            icon={UserCheck}
            theme="green"
            onClick={() => { setDailyFilter('ON_DUTY'); setActiveScreen('daily_status'); }}
          />
          <AnimatedStatCard
            title="في إجازة / مأمورية / إعارة"
            value={dailyCounts.onLeave + dailyCounts.onMission + dailyCounts.onSecondment}
            unit="موظف"
            indicator={`إعارة: ${toArabicNumerals(dailyCounts.onSecondment)} · إجازة: ${toArabicNumerals(dailyCounts.onLeave)}`}
            icon={Globe}
            theme="teal"
            onClick={() => setActiveScreen('daily_status')}
          />
          <AnimatedStatCard
            title="ملفات تحتاج استكمال"
            value={store.employees.filter((e) => !e.isProfileComplete).length}
            unit="ملف وظيفي"
            indicator="نقص مستندات أو بيانات"
            icon={AlertTriangle}
            theme="red"
            onClick={() => setActiveScreen('smart_alerts')}
          />
        </div>

        {/* ب. مؤشرات العقود والفئات الخاصة وطلبات التجديد */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <h3 className="text-sm font-black text-[#102A43]">
              مؤشرات الفئات الخاصة والعقود وطلبات التجديد الإلكترونية (تنبيهات ٩٠ / ٦٠ / ٣٠ يوماً)
            </h3>
            <button
              type="button"
              onClick={() => setActiveScreen('renewal_requests')}
              className="px-3 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black cursor-pointer"
            >
              + إنشاء وطباعة طلب تجديد
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs">
            {[
              { label: 'مكلفي الخدمة العامة', val: store.publicServiceMembers.length, screen: 'public_service' as HrScreenId, cls: 'bg-blue-50 text-blue-950 border-blue-200' },
              { label: 'الاستعانة والعقود المؤقتة', val: store.assistanceContracts.length, screen: 'assistance_contracts' as HrScreenId, cls: 'bg-indigo-50 text-indigo-950 border-indigo-200' },
              { label: 'تنتهي خلال ٣٠ يوماً فأقل', val: exp30, screen: 'smart_alerts' as HrScreenId, cls: 'bg-red-50 text-red-950 border-red-200' },
              { label: 'تنتهي خلال ٦٠ يوماً', val: exp60, screen: 'smart_alerts' as HrScreenId, cls: 'bg-amber-50 text-amber-950 border-amber-200' },
              { label: 'تنتهي خلال ٩٠ يوماً', val: exp90, screen: 'smart_alerts' as HrScreenId, cls: 'bg-yellow-50 text-yellow-950 border-yellow-200' },
              { label: 'طلبات تجديد قيد المتابعة', val: dailyCounts.stalled, screen: 'renewal_workflow' as HrScreenId, cls: 'bg-purple-50 text-purple-950 border-purple-200' },
            ].map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => setActiveScreen(c.screen)}
                className={`p-3 rounded-xl border text-right hover:shadow-sm transition-all cursor-pointer ${c.cls}`}
              >
                <span className="block text-[10.5px] font-bold">{c.label}</span>
                <span className="num-cell text-xl font-black mt-1 block">{toArabicNumerals(c.val)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ج. مؤشرات الحضور والإجازات والإنذارات والجزاءات */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <AnimatedStatCard
            title="سجلات الحضور والانصراف"
            value={store.attendance.length}
            unit="حركة مسجلة"
            indicator={`متأخرين للمراجعة: ${toArabicNumerals(store.attendance.filter((a) => a.delayMinutes > 0).length)}`}
            icon={Clock}
            theme="navy"
            onClick={() => setActiveScreen('attendance')}
          />
          <AnimatedStatCard
            title="طلبات الإجازات المسجلة"
            value={store.leaves.length}
            unit="طلب إجازة"
            indicator={`بانتظار الاعتماد: ${toArabicNumerals(store.leaves.filter((l) => l.status === 'طلب جديد').length)}`}
            icon={CalendarDays}
            theme="gold"
            onClick={() => setActiveScreen('attendance')}
          />
          <AnimatedStatCard
            title="الإنذارات والجزاءات المعتمدة"
            value={store.warnings.length + store.disciplinaryActions.length}
            unit="سجل موثق"
            indicator="دون إصدار جزاء تلقائي"
            icon={ShieldAlert}
            theme="red"
            onClick={() => setActiveScreen('warnings_penalties')}
          />
          <AnimatedStatCard
            title="مركز التقارير (٤٦) والطباعة (١٥)"
            value={46}
            unit="تقريراً تخصصياً"
            indicator="PDF / Excel / A4"
            icon={FileText}
            theme="purple"
            onClick={() => setActiveScreen('reports_center')}
          />
        </div>
      </div>
    );
  }

  // ===========================================================================
  // ٢. مكون «الموقف الوظيفي اليومي» التفاعلي (Daily Staff Status)
  // ===========================================================================
  if (activeScreen === 'daily_status') {
    const statusCards: { id: DailyStatusFilter; label: string; count: number; color: string }[] = [
      { id: 'ALL', label: 'جميع العاملين بالمديرية', count: dailyStaffRows.length, color: 'bg-[#102A43] text-white border-[#102A43]' },
      { id: 'ON_DUTY', label: 'على رأس العمل', count: dailyCounts.onDuty, color: 'bg-emerald-50 text-emerald-950 border-emerald-300' },
      { id: 'ON_LEAVE', label: 'في إجازة', count: dailyCounts.onLeave, color: 'bg-amber-50 text-amber-950 border-amber-300' },
      { id: 'ON_MISSION', label: 'في مأمورية', count: dailyCounts.onMission, color: 'bg-sky-50 text-sky-950 border-sky-300' },
      { id: 'ON_SECONDMENT', label: 'في إعارة', count: dailyCounts.onSecondment, color: 'bg-indigo-50 text-indigo-950 border-indigo-300' },
      { id: 'EXPIRED', label: 'انتهت خدمتهم أو عقودهم', count: dailyCounts.expired, color: 'bg-red-50 text-red-950 border-red-300' },
      { id: 'NEEDS_RENEWAL', label: 'يحتاج لتجديد (≤ ٩٠ يوم)', count: dailyCounts.needsRenewal, color: 'bg-orange-50 text-orange-950 border-orange-300' },
      { id: 'STALLED_REQUEST', label: 'لديه طلب متوقف بشؤون العاملين', count: dailyCounts.stalled, color: 'bg-purple-50 text-purple-950 border-purple-300' },
    ];

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-black text-[#102A43]">
                ٢. لوحة «الموقف الوظيفي اليومي» التفاعلية (Daily Staff Status) — {formatDateArabic(todayRef)}
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                اضغط على أي بطاقة لتصفية الجدول فوراً وعرض حالة العاملين بالمديرية والإدارات التموينية بدقة لحظية
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <select
                value={dailyAdminFilter}
                onChange={(e) => setDailyAdminFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 font-black text-[#102A43] bg-slate-50"
              >
                <option value="ALL">كافة الإدارات التموينية</option>
                {uniqueAdmins.map((adm) => (
                  <option key={adm} value={adm}>{adm}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] font-black flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة الموقف اليومي</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {statusCards.map((card) => {
              const isSelected = dailyFilter === card.id;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setDailyFilter(card.id)}
                  className={`p-2.5 rounded-xl border-2 text-right transition-all cursor-pointer ${card.color} ${
                    isSelected ? 'ring-2 ring-[#C6A15B] scale-[1.02] shadow-md' : 'opacity-90 hover:opacity-100'
                  }`}
                >
                  <span className="block text-[10px] font-black leading-snug">{card.label}</span>
                  <span className="num-cell text-lg font-black mt-1 block">{toArabicNumerals(card.count)}</span>
                </button>
              );
            })}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  <th className="p-2 border border-slate-300">الكود / الوظيفي</th>
                  <th className="p-2 border border-slate-300">الاسم الرباعي</th>
                  <th className="p-2 border border-slate-300">الإدارة التموينية والقسم</th>
                  <th className="p-2 border border-slate-300">الفئة الوظيفية</th>
                  <th className="p-2 border border-slate-300 text-center">الموقف الوظيفي الحالي</th>
                  <th className="p-2 border border-slate-300 text-center">نهاية العقد/الإعارة</th>
                  <th className="p-2 border border-slate-300">حالة الطلبات المتوقفة</th>
                  <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredDailyStaffRows.map((row) => (
                  <tr key={row.emp.id} className="border-b border-slate-200 hover:bg-blue-50/40">
                    <td className="p-2 border border-slate-200 num-cell font-black text-[#164E83]">
                      <div>{row.emp.employeeCode}</div>
                      <div className="text-[10px] text-slate-500">{toArabicNumerals(row.emp.employeeNumber)}</div>
                    </td>
                    <td className="p-2 border border-slate-200 font-black text-[#102A43]">
                      <div>{row.emp.fullName}</div>
                      <div className="text-[10px] text-slate-500">{row.emp.jobTitle}</div>
                    </td>
                    <td className="p-2 border border-slate-200 font-bold">
                      <div>{row.emp.supplyAdministration}</div>
                      <div className="text-[10px] text-slate-500">{row.emp.departmentName}</div>
                    </td>
                    <td className="p-2 border border-slate-200 font-black">{row.emp.employmentCategory}</td>
                    <td className="p-2 border border-slate-200 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          row.isExpired
                            ? 'bg-red-100 text-red-950'
                            : row.isOnDuty
                            ? 'bg-emerald-100 text-emerald-950'
                            : 'bg-amber-100 text-amber-950'
                        }`}
                      >
                        {row.primaryBadge}
                      </span>
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-black">
                      {row.expiryDate ? (
                        <div>
                          <div>{formatDateArabic(row.expiryDate)}</div>
                          {row.remDays !== null && (
                            <div className={`text-[10px] ${row.remDays <= 30 ? 'text-red-700' : 'text-amber-700'}`}>
                              {row.remDays < 0 ? `منتهي منذ ${toArabicNumerals(Math.abs(row.remDays))} يوم` : `متبقي ${toArabicNumerals(row.remDays)} يوم`}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">تعيين دائم</span>
                      )}
                    </td>
                    <td className="p-2 border border-slate-200 font-bold text-purple-900">
                      {row.hasStalledRequest ? `${row.stalledRequestNumber} — ${row.stalledRequestStatus}` : 'لا توجد طلبات متوقفة'}
                    </td>
                    <td className="p-2 border border-slate-200 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenProfileModal('profile', row.emp)}
                          className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#164E83] border border-blue-200 text-[10.5px] font-black inline-flex items-center gap-1 cursor-pointer"
                          title="عرض الملف الموحد"
                        >
                          <Eye className="w-4.5 h-4.5 shrink-0" />
                          <span>عرض</span>
                        </button>
                        {isHrAdminOrSupervisor && (
                          <>
                            <button
                              type="button"
                              onClick={() => onOpenProfileModal('create', null)}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10.5px] font-black inline-flex items-center gap-1 cursor-pointer"
                              title="إضافة موظف جديد"
                            >
                              <PlusCircle className="w-4.5 h-4.5 shrink-0" />
                              <span>إضافة</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenProfileModal('edit', row.emp)}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[10.5px] font-black inline-flex items-center gap-1 cursor-pointer"
                              title="تعديل بيانات الموظف"
                            >
                              <Edit3 className="w-4.5 h-4.5 shrink-0" />
                              <span>تعديل</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                updateStore((prev) => ({
                                  ...prev,
                                  employees: prev.employees.filter((x) => x.id !== row.emp.id),
                                }));
                                onNotify(`تم حذف ملف الموظف (${row.emp.fullName}) بنجاح.`);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 text-[10.5px] font-black inline-flex items-center gap-1 cursor-pointer"
                              title="حذف السجل"
                            >
                              <Trash2 className="w-4.5 h-4.5 shrink-0" />
                              <span>حذف</span>
                            </button>
                          </>
                        )}
                        {(row.needsRenewal || row.isExpired) && (
                          <button
                            type="button"
                            onClick={() => setActiveScreen('renewal_requests')}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-600 text-white text-[10.5px] font-black cursor-pointer"
                          >
                            طلب تجديد
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredDailyStaffRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-5 text-center text-slate-500 font-bold">
                      لا يوجد موظفون مطابقون لهذا التصنيف اليوم.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // ٣. قاعدة بيانات العاملين – الملف الوظيفي الموحد (١٠ معايير بحث ذكية)
  // ===========================================================================
  if (activeScreen === 'employees_db') {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-black text-[#102A43]">
                ٣. قاعدة بيانات العاملين – الملف الوظيفي الموحد (بحث ذكي بـ ١٠ معايير · منع تكرار الرقم القومي)
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                ابحث بالرقم القومي أو الاسم الرباعي أو الكود أو الرقم الوظيفي أو الهاتف لفتح الملف الكامل ذي الـ ١٢ تبويباً
              </p>
            </div>
            {isHrAdminOrSupervisor && (
              <button
                type="button"
                onClick={() => onOpenProfileModal('create', null)}
                className="px-4 py-2 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>إضافة موظف جديد</span>
              </button>
            )}
          </div>

          {/* محرك البحث بـ ١٠ معايير */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
            <div className="relative lg:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                placeholder="بحث بالرقم القومي، الكود، الرقم الوظيفي، الاسم، الهاتف، المسمى..."
                className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-bold"
              />
            </div>
            <select value={empAdminFilter} onChange={(e) => setEmpAdminFilter(e.target.value)} className="px-2.5 py-2 rounded-xl border border-slate-300 font-black">
              <option value="ALL">جميع الإدارات التموينية</option>
              {uniqueAdmins.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={empDeptFilter} onChange={(e) => setEmpDeptFilter(e.target.value)} className="px-2.5 py-2 rounded-xl border border-slate-300 font-black">
              <option value="ALL">جميع الأقسام</option>
              {uniqueDepts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-1.5">
              <select value={empCategoryFilter} onChange={(e) => setEmpCategoryFilter(e.target.value)} className="px-2 py-2 rounded-xl border border-slate-300 font-black">
                <option value="ALL">كل الفئات</option>
                <option value="دائم">دائم</option>
                <option value="خدمة عامة">خدمة عامة</option>
                <option value="استعانة">استعانة</option>
                <option value="معار">معار</option>
              </select>
              <select value={empStatusFilter} onChange={(e) => setEmpStatusFilter(e.target.value)} className="px-2 py-2 rounded-xl border border-slate-300 font-black">
                <option value="ALL">كل الحالات</option>
                <option value="على رأس العمل">على رأس العمل</option>
                <option value="إجازة">إجازة</option>
                <option value="مأمورية">مأمورية</option>
                <option value="معار">معار</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  <th className="p-2 border border-slate-300">الكود / الوظيفي</th>
                  <th className="p-2 border border-slate-300">الاسم الرباعي</th>
                  <th className="p-2 border border-slate-300 text-center">الرقم القومي</th>
                  <th className="p-2 border border-slate-300">المسمى والدرجة</th>
                  <th className="p-2 border border-slate-300">الإدارة والقسم</th>
                  <th className="p-2 border border-slate-300 text-center">الفئة / الحالة</th>
                  <th className="p-2 border border-slate-300 text-center">الراتب الوظيفي</th>
                  <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="border-b border-slate-200 hover:bg-blue-50/40">
                    <td className="p-2 border border-slate-200 num-cell font-black text-[#164E83]">
                      <div>{emp.employeeCode}</div>
                      <div className="text-[10px] text-slate-500">{toArabicNumerals(emp.employeeNumber)}</div>
                    </td>
                    <td className="p-2 border border-slate-200 font-black text-[#102A43]">
                      <div>{emp.fullName}</div>
                      <div className="num-cell text-[10px] text-slate-500">{toArabicNumerals(emp.phone)}</div>
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-black">
                      {toArabicNumerals(maskNationalId(emp.nationalId, canViewFullNationalId))}
                    </td>
                    <td className="p-2 border border-slate-200 font-bold">
                      <div className="text-[#102A43]">{emp.jobTitle}</div>
                      <div className="text-[10px] text-slate-500">{emp.financialGrade}</div>
                    </td>
                    <td className="p-2 border border-slate-200 font-bold">
                      <div>{emp.supplyAdministration}</div>
                      <div className="text-[10px] text-slate-500">{emp.departmentName}</div>
                    </td>
                    <td className="p-2 border border-slate-200 text-center">
                      <div className="font-black text-[#164E83]">{emp.employmentCategory}</div>
                      <div className="text-[10px] font-bold text-emerald-800">{emp.jobStatus}</div>
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-black text-emerald-800">
                      {formatArabicCurrency(emp.approvedFunctionalWageEgp + emp.supplementaryWageEgp)}
                    </td>
                    <td className="p-2 border border-slate-200 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenProfileModal('profile', emp)}
                          className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#164E83] border border-blue-200 text-[10.5px] font-black inline-flex items-center gap-1 cursor-pointer"
                          title="عرض الملف الموحد (١٢ تبويب)"
                        >
                          <Eye className="w-4.5 h-4.5 shrink-0" />
                          <span>عرض</span>
                        </button>
                        {isHrAdminOrSupervisor && (
                          <>
                            <button
                              type="button"
                              onClick={() => onOpenProfileModal('create', null)}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10.5px] font-black inline-flex items-center gap-1 cursor-pointer"
                              title="إضافة موظف جديد"
                            >
                              <PlusCircle className="w-4.5 h-4.5 shrink-0" />
                              <span>إضافة</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenProfileModal('edit', emp)}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[10.5px] font-black inline-flex items-center gap-1 cursor-pointer"
                              title="تعديل بيانات الموظف"
                            >
                              <Edit3 className="w-4.5 h-4.5 shrink-0" />
                              <span>تعديل</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                updateStore((prev) => ({
                                  ...prev,
                                  employees: prev.employees.filter((x) => x.id !== emp.id),
                                }));
                                onNotify(`تم حذف ملف الموظف (${emp.fullName}) بنجاح.`);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 text-[10.5px] font-black inline-flex items-center gap-1 cursor-pointer"
                              title="حذف السجل"
                            >
                              <Trash2 className="w-4.5 h-4.5 shrink-0" />
                              <span>حذف</span>
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#102A43] border border-slate-300 text-[10.5px] font-black inline-flex items-center gap-1 cursor-pointer"
                          title="طباعة"
                        >
                          <Printer className="w-4.5 h-4.5 shrink-0" />
                          <span>طباعة</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // ٤. إدارة الحضور والانصراف والإجازات واستيراد البصمة (بلا جزاءات تلقائية)
  // ===========================================================================
  if (activeScreen === 'attendance') {
    const handleAddAttendance = (e: React.FormEvent) => {
      e.preventDefault();
      const emp = store.employees.find((x) => x.id === attEmpId);
      if (!emp) return;
      const duplicate = store.attendance.some((a) => a.employeeId === emp.id && a.date === attDate);
      if (duplicate) {
        onNotify(`يوجد سجل حضور مسجل بالفعل للموظف (${emp.fullName}) بتاريخ ${attDate} — تم منع التكرار.`);
        return;
      }
      const timing = computeAttendanceTiming({
        officialCheckIn: '08:00',
        actualCheckIn: attIn,
        officialCheckOut: '14:00',
        actualCheckOut: attOut,
        overrideStatus: attOverride === 'AUTO' ? undefined : (attOverride as HrAttendanceStatus),
      });
      updateStore((prev) => ({
        ...prev,
        attendance: [
          {
            id: `att-${Date.now()}`,
            date: attDate,
            employeeId: emp.id,
            employeeName: emp.fullName,
            employeeNumber: emp.employeeNumber,
            supplyAdministration: emp.supplyAdministration,
            departmentName: emp.departmentName,
            officialCheckIn: '08:00',
            actualCheckIn: attIn,
            officialCheckOut: '14:00',
            actualCheckOut: attOut,
            workHours: timing.workHours,
            delayMinutes: timing.delayMinutes,
            earlyLeaveMinutes: timing.earlyLeaveMinutes,
            dayStatus: timing.dayStatus,
            delayReason: timing.needsHumanReview ? 'بانتظار فحص ومراجعة شؤون العاملين' : '',
            notes: '',
            recordedBy: currentUser.fullName,
            needsHumanReview: timing.needsHumanReview,
          },
          ...prev.attendance,
        ],
      }));
      onNotify(
        `تم تسجيل حضور (${emp.fullName}): تأخير ${toArabicNumerals(timing.delayMinutes)} د — ${
          timing.needsHumanReview ? 'أحيل للمراجعة البشرية (دون جزاء تلقائي)' : 'منتظم'
        }.`
      );
    };

    const handleBiometricImportMock = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      onNotify(`تم فحص ملف البصمة (${file.name}) والتحقق من عدم تكرار السجلات اليومية بنجاح.`);
      e.target.value = '';
    };

    const handleAddLeave = (e: React.FormEvent) => {
      e.preventDefault();
      const emp = store.employees.find((x) => x.id === leaveEmpId);
      if (!emp) return;
      const days = Math.max(1, computeRemainingDays(leaveEnd, leaveStart) + 1);
      updateStore((prev) => ({
        ...prev,
        leaves: [
          {
            id: `lv-${Date.now()}`,
            requestNumber: `LVE-2026-${100 + prev.leaves.length + 1}`,
            employeeId: emp.id,
            employeeName: emp.fullName,
            employeeNumber: emp.employeeNumber,
            supplyAdministration: emp.supplyAdministration,
            departmentName: emp.departmentName,
            leaveType,
            startDate: leaveStart,
            endDate: leaveEnd,
            daysCount: days,
            substituteEmployeeName: leaveSub,
            status: 'طلب جديد',
            decisionNumber: '',
            attachmentName: 'طلب_إجازة_رسمي.pdf',
            notes: '',
          },
          ...prev.leaves,
        ],
      }));
      onNotify(`تم تسجيل طلب إجازة (${leaveType}) للموظف (${emp.fullName}) لمدة ${toArabicNumerals(days)} يوم.`);
    };

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div>
              <h3 className="text-sm font-black text-[#102A43]">
                ٤. إدارة الحضور والانصراف واستيراد أجهزة البصمة (التأخير = الحضور الفعلي − الرسمي · لا جزاء تلقائي)
              </h3>
            </div>
            <label className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>استيراد ملف البصمة (CSV/Excel)</span>
              <input type="file" accept=".csv,.xlsx,.txt" className="hidden" onChange={handleBiometricImportMock} />
            </label>
          </div>

          <form onSubmit={handleAddAttendance} className="grid grid-cols-1 sm:grid-cols-6 gap-2 text-xs items-end bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="sm:col-span-2">
              <label className="block font-black text-[#102A43] mb-1">الموظف</label>
              <select value={attEmpId} onChange={(e) => setAttEmpId(e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 font-black bg-white">
                {store.employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-black text-[#102A43] mb-1">التاريخ</label>
              <input type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)} className="w-full px-2 py-2 rounded-lg border border-slate-300 font-bold bg-white" />
            </div>
            <div className="grid grid-cols-2 gap-1">
              <div>
                <label className="block font-black text-[#102A43] mb-1">حضور</label>
                <input type="time" value={attIn} onChange={(e) => setAttIn(e.target.value)} className="w-full px-1.5 py-2 rounded-lg border border-slate-300 font-bold bg-white" />
              </div>
              <div>
                <label className="block font-black text-[#102A43] mb-1">انصراف</label>
                <input type="time" value={attOut} onChange={(e) => setAttOut(e.target.value)} className="w-full px-1.5 py-2 rounded-lg border border-slate-300 font-bold bg-white" />
              </div>
            </div>
            <div>
              <label className="block font-black text-[#102A43] mb-1">تصنيف خاص</label>
              <select value={attOverride} onChange={(e) => setAttOverride(e.target.value)} className="w-full px-2 py-2 rounded-lg border border-slate-300 font-bold bg-white">
                <option value="AUTO">حساب تلقائي</option>
                <option value="إجازة">إجازة</option>
                <option value="مأمورية">مأمورية</option>
                <option value="غائب">غائب</option>
              </select>
            </div>
            <button type="submit" className="px-3 py-2 rounded-lg bg-[#102A43] text-[#C6A15B] font-black cursor-pointer">
              + تسجيل حركة
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  <th className="p-2 border border-slate-300">التاريخ</th>
                  <th className="p-2 border border-slate-300">الموظف</th>
                  <th className="p-2 border border-slate-300 text-center">الحضور / الانصراف</th>
                  <th className="p-2 border border-slate-300 text-center">التأخير</th>
                  <th className="p-2 border border-slate-300 text-center">الانصراف المبكر</th>
                  <th className="p-2 border border-slate-300 text-center">الحالة والمراجعة</th>
                  <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {store.attendance.map((a) => (
                  <tr key={a.id} className="border-b border-slate-200 hover:bg-blue-50/40">
                    <td className="p-2 border border-slate-200 num-cell font-black">{formatDateArabic(a.date)}</td>
                    <td className="p-2 border border-slate-200 font-black text-[#102A43]">{a.employeeName}</td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-bold">
                      {toArabicNumerals(a.actualCheckIn || '—')} ← {toArabicNumerals(a.actualCheckOut || '—')}
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-black text-red-700">{toArabicNumerals(a.delayMinutes)} د</td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-black text-amber-700">{toArabicNumerals(a.earlyLeaveMinutes)} د</td>
                    <td className="p-2 border border-slate-200 text-center font-black">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-[#102A43]">{a.dayStatus}</span>
                      {a.needsHumanReview && <span className="block text-[10px] text-amber-800 mt-0.5">يحتاج مراجعة بشرية</span>}
                    </td>
                    <td className="p-2 border border-slate-200 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          updateStore((prev) => ({
                            ...prev,
                            attendance: prev.attendance.map((x) =>
                              x.id === a.id ? { ...x, needsHumanReview: false, delayReason: 'تمت المراجعة والتسوية البشرية' } : x
                            ),
                          }));
                          onNotify(`تم توثيق المراجعة البشرية لسجل (${a.employeeName}) دون إصدار جزاء تلقائي.`);
                        }}
                        className="px-2 py-1 rounded bg-emerald-700 text-white text-[10px] font-black cursor-pointer"
                      >
                        اعتماد المراجعة
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* طلبات الإجازات */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <h4 className="text-sm font-black text-[#102A43] border-b border-slate-200 pb-2">طلبات وسجلات الإجازات الرسمية</h4>
          <form onSubmit={handleAddLeave} className="grid grid-cols-1 sm:grid-cols-6 gap-2 text-xs items-end bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block font-black mb-1">الموظف</label>
              <select value={leaveEmpId} onChange={(e) => setLeaveEmpId(e.target.value)} className="w-full px-2 py-2 rounded-lg border border-slate-300 font-black bg-white">
                {store.employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-black mb-1">النوع</label>
              <select value={leaveType} onChange={(e) => setLeaveType(e.target.value as typeof leaveType)} className="w-full px-2 py-2 rounded-lg border border-slate-300 font-black bg-white">
                <option value="اعتيادية">اعتيادية</option>
                <option value="عارضة">عارضة</option>
                <option value="مرضية">مرضية</option>
                <option value="مأمورية رسمية">مأمورية رسمية</option>
              </select>
            </div>
            <div>
              <label className="block font-black mb-1">من</label>
              <input type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} className="w-full px-2 py-2 rounded-lg border border-slate-300 bg-white" />
            </div>
            <div>
              <label className="block font-black mb-1">إلى</label>
              <input type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} className="w-full px-2 py-2 rounded-lg border border-slate-300 bg-white" />
            </div>
            <div>
              <label className="block font-black mb-1">القائم بالعمل</label>
              <input type="text" value={leaveSub} onChange={(e) => setLeaveSub(e.target.value)} className="w-full px-2 py-2 rounded-lg border border-slate-300 bg-white font-bold" />
            </div>
            <button type="submit" className="px-3 py-2 rounded-lg bg-[#102A43] text-[#C6A15B] font-black cursor-pointer">+ تقديم إجازة</button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  <th className="p-2 border border-slate-300">رقم الطلب</th>
                  <th className="p-2 border border-slate-300">الموظف</th>
                  <th className="p-2 border border-slate-300">النوع والبديل</th>
                  <th className="p-2 border border-slate-300 text-center">الفترة / الأيام</th>
                  <th className="p-2 border border-slate-300 text-center">الحالة</th>
                  <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {store.leaves.map((l) => (
                  <tr key={l.id} className="border-b border-slate-200">
                    <td className="p-2 border border-slate-200 num-cell font-black text-[#164E83]">{l.requestNumber}</td>
                    <td className="p-2 border border-slate-200 font-black">{l.employeeName}</td>
                    <td className="p-2 border border-slate-200 font-bold">{l.leaveType} · البديل: {l.substituteEmployeeName}</td>
                    <td className="p-2 border border-slate-200 text-center num-cell">{formatDateArabic(l.startDate)} — {formatDateArabic(l.endDate)} ({toArabicNumerals(l.daysCount)} ي)</td>
                    <td className="p-2 border border-slate-200 text-center font-black">{l.status}</td>
                    <td className="p-2 border border-slate-200 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            updateStore((prev) => ({
                              ...prev,
                              leaves: prev.leaves.map((x) => (x.id === l.id ? { ...x, status: 'معتمدة', approvedBy: currentUser.fullName } : x)),
                            }));
                            onNotify(`تم اعتماد الإجازة (${l.requestNumber}).`);
                          }}
                          className="px-2 py-1 rounded bg-emerald-700 text-white text-[10px] font-black cursor-pointer"
                        >
                          اعتماد
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateStore((prev) => ({
                              ...prev,
                              leaves: prev.leaves.map((x) => (x.id === l.id ? { ...x, status: 'مرفوضة' } : x)),
                            }));
                            onNotify(`تم رفض الإجازة (${l.requestNumber}).`);
                          }}
                          className="px-2 py-1 rounded bg-red-700 text-white text-[10px] font-black cursor-pointer"
                        >
                          رفض
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // ٥. سجل الإنذارات والجزاءات المعتمدة والتظلمات (يشترط رقم قرار معتمد)
  // ===========================================================================
  if (activeScreen === 'warnings_penalties') {
    const handleAddWarning = (e: React.FormEvent) => {
      e.preventDefault();
      const emp = store.employees.find((x) => x.id === warnEmpId);
      if (!emp || !warnDesc.trim() || !warnDocNo.trim()) return;
      updateStore((prev) => ({
        ...prev,
        warnings: [
          {
            id: `wrn-${Date.now()}`,
            warningNumber: `WRN-2026-${100 + prev.warnings.length + 1}`,
            employeeId: emp.id,
            employeeName: emp.fullName,
            employeeNumber: emp.employeeNumber,
            supplyAdministration: emp.supplyAdministration,
            incidentDate: todayRef,
            incidentType: warnType,
            incidentDescription: warnDesc.trim(),
            issueDate: todayRef,
            issuingAuthority: currentUser.fullName,
            decisionOrDocNumber: warnDocNo.trim(),
            warningImageLabel: 'إنذار_رسمي.pdf',
            employeeNotifiedDate: todayRef,
            employeeResponse: '',
            status: 'مسجل ومبلغ للموظف',
            notes: '',
          },
          ...prev.warnings,
        ],
      }));
      setWarnDesc('');
      setWarnDocNo('');
      onNotify(`تم توثيق إنذار وظيفي للموظف (${emp.fullName}).`);
    };

    const handleAddPenalty = (e: React.FormEvent) => {
      e.preventDefault();
      const emp = store.employees.find((x) => x.id === penEmpId);
      if (!emp || !penDecisionNo.trim()) {
        onNotify('مرفوض: لا يُسجل أي جزاء إلا برقم وتاريخ قرار معتمد من السلطة المختصة.');
        return;
      }
      updateStore((prev) => ({
        ...prev,
        disciplinaryActions: [
          {
            id: `pen-${Date.now()}`,
            penaltyNumber: `PEN-2026-${100 + prev.disciplinaryActions.length + 1}`,
            employeeId: emp.id,
            employeeName: emp.fullName,
            employeeNumber: emp.employeeNumber,
            supplyAdministration: emp.supplyAdministration,
            penaltyType: penType,
            decisionDate: penDecisionDate,
            decisionNumber: penDecisionNo.trim(),
            competentAuthority: 'وكيل وزارة التموين بالغربية',
            penaltyDurationOrValue: penValue,
            executionDate: todayRef,
            grievanceStatus: 'لا يوجد تظلم',
            grievanceResult: '',
            attachments: `${penDecisionNo.trim()}.pdf`,
            notes: 'قرار معتمد ومسجل وفق الضوابط',
          },
          ...prev.disciplinaryActions,
        ],
      }));
      setPenDecisionNo('');
      onNotify(`تم تسجيل الجزاء المعتمد برقم قرار (${penDecisionNo}) في سجل الموظف (${emp.fullName}).`);
    };

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <h3 className="text-sm font-black text-[#102A43]">٥-أ. سجل الإنذارات والتنبيهات الوظيفية</h3>
            <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-950 text-[10.5px] font-black">
              لا يصدر أي جزاء تلقائياً من الحضور — يشترط قرار إداري معتمد
            </span>
          </div>
          <form onSubmit={handleAddWarning} className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
            <select value={warnEmpId} onChange={(e) => setWarnEmpId(e.target.value)} className="px-2 py-2 rounded-lg border border-slate-300 font-black bg-white">
              {store.employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
            </select>
            <select value={warnType} onChange={(e) => setWarnType(e.target.value as HrIncidentType)} className="px-2 py-2 rounded-lg border border-slate-300 font-black bg-white">
              <option value="تأخير">تأخير</option>
              <option value="غياب">غياب</option>
              <option value="انصراف مبكر">انصراف مبكر</option>
              <option value="مخالفة تعليمات العمل">مخالفة تعليمات العمل</option>
            </select>
            <input type="text" required value={warnDocNo} onChange={(e) => setWarnDocNo(e.target.value)} placeholder="رقم المستند / الخطاب *" className="px-2.5 py-2 rounded-lg border border-slate-300 bg-white font-bold" />
            <input type="text" required value={warnDesc} onChange={(e) => setWarnDesc(e.target.value)} placeholder="وصف الواقعة *" className="px-2.5 py-2 rounded-lg border border-slate-300 bg-white font-bold" />
            <button type="submit" className="px-3 py-2 rounded-lg bg-amber-700 text-white font-black cursor-pointer">+ تسجيل إنذار</button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  <th className="p-2 border border-slate-300">رقم الإنذار</th>
                  <th className="p-2 border border-slate-300">الموظف</th>
                  <th className="p-2 border border-slate-300">النوع والواقعة</th>
                  <th className="p-2 border border-slate-300 text-center">رقم المستند والتاريخ</th>
                  <th className="p-2 border border-slate-300 text-center">الحالة</th>
                  <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {store.warnings.map((w) => (
                  <tr key={w.id} className="border-b border-slate-200">
                    <td className="p-2 border border-slate-200 num-cell font-black text-amber-800">{w.warningNumber}</td>
                    <td className="p-2 border border-slate-200 font-black">{w.employeeName}</td>
                    <td className="p-2 border border-slate-200 font-bold">{w.incidentType}: {w.incidentDescription}</td>
                    <td className="p-2 border border-slate-200 text-center num-cell">{w.decisionOrDocNumber} ({formatDateArabic(w.issueDate)})</td>
                    <td className="p-2 border border-slate-200 text-center font-black">{w.status}</td>
                    <td className="p-2 border border-slate-200 text-center">
                      <button type="button" onClick={() => window.print()} className="px-2 py-1 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer">طباعة الإنذار</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* سجل الجزاءات المعتمدة */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <h3 className="text-sm font-black text-[#102A43] border-b border-slate-200 pb-2">
            ٥-ب. سجل الجزاءات التأديبية المعتمدة والتظلمات (مشروطة برقم قرار رسمي)
          </h3>
          <form onSubmit={handleAddPenalty} className="grid grid-cols-1 sm:grid-cols-6 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
            <select value={penEmpId} onChange={(e) => setPenEmpId(e.target.value)} className="px-2 py-2 rounded-lg border border-slate-300 font-black bg-white">
              {store.employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
            </select>
            <input type="text" required value={penType} onChange={(e) => setPenType(e.target.value)} placeholder="نوع الجزاء" className="px-2 py-2 rounded-lg border border-slate-300 bg-white font-bold" />
            <input type="text" required value={penDecisionNo} onChange={(e) => setPenDecisionNo(e.target.value)} placeholder="رقم القرار المعتمد *" className="px-2 py-2 rounded-lg border border-slate-300 bg-white font-black" />
            <input type="date" value={penDecisionDate} onChange={(e) => setPenDecisionDate(e.target.value)} className="px-2 py-2 rounded-lg border border-slate-300 bg-white" />
            <input type="text" required value={penValue} onChange={(e) => setPenValue(e.target.value)} placeholder="القيمة / المدة" className="px-2 py-2 rounded-lg border border-slate-300 bg-white font-bold" />
            <button type="submit" className="px-3 py-2 rounded-lg bg-red-800 text-white font-black cursor-pointer">+ قيد جزاء معتمد</button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  <th className="p-2 border border-slate-300">رقم القرار</th>
                  <th className="p-2 border border-slate-300">الموظف</th>
                  <th className="p-2 border border-slate-300">نوع وقيمة الجزاء</th>
                  <th className="p-2 border border-slate-300">الجهة وتاريخ القرار</th>
                  <th className="p-2 border border-slate-300 text-center">حالة التظلم</th>
                  <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {store.disciplinaryActions.map((p) => (
                  <tr key={p.id} className="border-b border-slate-200">
                    <td className="p-2 border border-slate-200 num-cell font-black text-red-800">{p.decisionNumber}</td>
                    <td className="p-2 border border-slate-200 font-black">{p.employeeName}</td>
                    <td className="p-2 border border-slate-200 font-bold">{p.penaltyType} ({p.penaltyDurationOrValue})</td>
                    <td className="p-2 border border-slate-200 num-cell">{p.competentAuthority} · {formatDateArabic(p.decisionDate)}</td>
                    <td className="p-2 border border-slate-200 text-center font-black">{p.grievanceStatus}</td>
                    <td className="p-2 border border-slate-200 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          updateStore((prev) => ({
                            ...prev,
                            disciplinaryActions: prev.disciplinaryActions.map((x) =>
                              x.id === p.id ? { ...x, grievanceStatus: 'تظلم قيد الفحص' } : x
                            ),
                          }));
                          onNotify(`تم تسجيل تظلم على القرار رقم (${p.decisionNumber}).`);
                        }}
                        className="px-2 py-1 rounded bg-purple-700 text-white text-[10px] font-black cursor-pointer"
                      >
                        تسجيل تظلم
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // ٦. سجل الإعارات والندب
  // ===========================================================================
  if (activeScreen === 'secondments') {
    const handleAddSecondment = (e: React.FormEvent) => {
      e.preventDefault();
      const emp = store.employees.find((x) => x.id === secEmpId);
      if (!emp || !secHost.trim() || !secDecNo.trim()) return;
      updateStore((prev) => ({
        ...prev,
        secondments: [
          {
            id: `sec-${Date.now()}`,
            secondmentNumber: `SEC-2026-${10 + prev.secondments.length + 1}`,
            employeeId: emp.id,
            employeeName: emp.fullName,
            nationalId: emp.nationalId,
            employeeNumber: emp.employeeNumber,
            originalJobTitle: emp.jobTitle,
            originalAdministration: emp.supplyAdministration,
            hostEntity: secHost.trim(),
            hostJobTitle: emp.jobTitle,
            decisionNumber: secDecNo.trim(),
            decisionDate: todayRef,
            startDate: todayRef,
            endDate: secEnd,
            durationLabel: 'سنة واحدة',
            lastRenewalDate: '',
            expectedReturnDate: secEnd,
            status: 'إعارة سارية',
            attachments: `${secDecNo.trim()}.pdf`,
            notes: '',
            previousPeriodsHistory: [],
          },
          ...prev.secondments,
        ],
      }));
      setSecHost('');
      setSecDecNo('');
      onNotify(`تم تسجيل إعارة الموظف (${emp.fullName}) إلى (${secHost}).`);
    };

    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <h3 className="text-sm sm:text-base font-black text-[#102A43]">٦. سجل الإعارات والندب الداخلي والخارجي</h3>
          <button
            type="button"
            onClick={() => setActiveScreen('renewal_requests')}
            className="px-3.5 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black cursor-pointer"
          >
            + طلب تجديد إعارة (A4)
          </button>
        </div>

        <form onSubmit={handleAddSecondment} className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
          <select value={secEmpId} onChange={(e) => setSecEmpId(e.target.value)} className="px-2 py-2 rounded-lg border border-slate-300 font-black bg-white">
            {store.employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
          </select>
          <input type="text" required value={secHost} onChange={(e) => setSecHost(e.target.value)} placeholder="الجهة المعار إليها *" className="px-2.5 py-2 rounded-lg border border-slate-300 bg-white font-bold" />
          <input type="text" required value={secDecNo} onChange={(e) => setSecDecNo(e.target.value)} placeholder="رقم قرار الإعارة *" className="px-2.5 py-2 rounded-lg border border-slate-300 bg-white font-black" />
          <input type="date" value={secEnd} onChange={(e) => setSecEnd(e.target.value)} className="px-2 py-2 rounded-lg border border-slate-300 bg-white" />
          <button type="submit" className="px-3 py-2 rounded-lg bg-[#102A43] text-[#C6A15B] font-black cursor-pointer">+ إضافة إعارة</button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#102A43] text-white">
                <th className="p-2 border border-slate-300">رقم الإعارة والقرار</th>
                <th className="p-2 border border-slate-300">الموظف والجهة الأصلية</th>
                <th className="p-2 border border-slate-300">الجهة المعار إليها</th>
                <th className="p-2 border border-slate-300 text-center">من — إلى</th>
                <th className="p-2 border border-slate-300 text-center">الحالة والتجديدات السابقة</th>
                <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {store.secondments.map((s) => (
                <tr key={s.id} className="border-b border-slate-200">
                  <td className="p-2 border border-slate-200 num-cell font-black text-[#164E83]">
                    <div>{s.secondmentNumber}</div>
                    <div className="text-[10px] text-slate-500">{s.decisionNumber}</div>
                  </td>
                  <td className="p-2 border border-slate-200 font-black">
                    <div>{s.employeeName}</div>
                    <div className="text-[10px] text-slate-500">{s.originalAdministration}</div>
                  </td>
                  <td className="p-2 border border-slate-200 font-bold text-[#102A43]">{s.hostEntity}</td>
                  <td className="p-2 border border-slate-200 text-center num-cell font-bold">
                    {formatDateArabic(s.startDate)} ← <span className="text-red-700 font-black">{formatDateArabic(s.endDate)}</span>
                  </td>
                  <td className="p-2 border border-slate-200 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-950 font-black">{s.status}</span>
                    <div className="text-[10px] text-slate-500 mt-0.5">فترات سابقة محفوظة: {toArabicNumerals(s.previousPeriodsHistory.length)}</div>
                  </td>
                  <td className="p-2 border border-slate-200 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button type="button" onClick={() => setActiveScreen('renewal_requests')} className="px-2 py-1 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer">تجديد</button>
                      <button
                        type="button"
                        onClick={() => {
                          updateStore((prev) => ({
                            ...prev,
                            secondments: prev.secondments.map((x) => (x.id === s.id ? { ...x, status: 'عاد الموظف للعمل' } : x)),
                          }));
                          onNotify(`تم تسجيل عودة الموظف (${s.employeeName}) للعمل من الإعارة.`);
                        }}
                        className="px-2 py-1 rounded bg-emerald-700 text-white text-[10px] font-black cursor-pointer"
                      >
                        عودة للعمل
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // ٧. إدارة موظفي الخدمة العامة
  // ===========================================================================
  if (activeScreen === 'public_service') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-[#102A43]">
              ٧. إدارة مكلفي الخدمة العامة (التكليفات · الحضور · تقييم المشرف · التمديد)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setActiveScreen('renewal_requests')}
            className="px-3.5 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black cursor-pointer"
          >
            + طلب تجديد / مد مدة التكليف
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#102A43] text-white">
                <th className="p-2 border border-slate-300">الكود والتكليف</th>
                <th className="p-2 border border-slate-300">الاسم والرقم القومي</th>
                <th className="p-2 border border-slate-300">المؤهل والجهة</th>
                <th className="p-2 border border-slate-300">الإدارة والمشرف</th>
                <th className="p-2 border border-slate-300 text-center">بداية / نهاية التكليف</th>
                <th className="p-2 border border-slate-300 text-center">الحضور والتقييم</th>
                <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {store.publicServiceMembers.map((ps) => (
                <tr key={ps.id} className="border-b border-slate-200">
                  <td className="p-2 border border-slate-200 num-cell font-black text-[#164E83]">
                    <div>{ps.memberCode}</div>
                    <div className="text-[10px] text-slate-500">{ps.assignmentNumber}</div>
                  </td>
                  <td className="p-2 border border-slate-200 font-black">
                    <div>{ps.fullName}</div>
                    <div className="num-cell text-[10px] text-slate-500">{toArabicNumerals(maskNationalId(ps.nationalId, canViewFullNationalId))}</div>
                  </td>
                  <td className="p-2 border border-slate-200 font-bold">
                    <div>{ps.qualification}</div>
                    <div className="text-[10px] text-slate-500">{ps.universityOrInstitute}</div>
                  </td>
                  <td className="p-2 border border-slate-200 font-bold">
                    <div>{ps.supplyAdministration} ({ps.departmentName})</div>
                    <div className="text-[10px] text-slate-500">المشرف: {ps.supervisorName}</div>
                  </td>
                  <td className="p-2 border border-slate-200 text-center num-cell font-bold">
                    {formatDateArabic(ps.serviceStartDate)} ← <span className="text-red-700 font-black">{formatDateArabic(ps.expectedEndDate)}</span>
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-black">
                    <div className="text-emerald-800">{ps.supervisorEvaluation}</div>
                    <div className="num-cell text-[10px] text-slate-600">حضور: {toArabicNumerals(ps.attendedDaysCount)} ي</div>
                  </td>
                  <td className="p-2 border border-slate-200 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button type="button" onClick={() => setActiveScreen('renewal_requests')} className="px-2 py-1 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer">طلب مد مدة</button>
                      <button type="button" onClick={() => window.print()} className="px-2 py-1 rounded bg-slate-200 text-[#102A43] text-[10px] font-black cursor-pointer">طباعة</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // ٨. إدارة موظفي الاستعانة والعقود المؤقتة (حفظ العقود السابقة دون استبدال)
  // ===========================================================================
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h3 className="text-sm sm:text-base font-black text-[#102A43]">
            ٨. إدارة موظفي الاستعانة والعقود المؤقتة (المقابل المالي · جهة التمويل · سجل التجديدات التاريخي)
          </h3>
          <p className="text-[11px] font-bold text-slate-600">
            كل تجديد معتمد ينشئ سجلاً جديداً ويحفظ العقد السابق كاملاً في سجل تجديدات العقود دون استبدال
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveScreen('renewal_requests')}
          className="px-3.5 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black cursor-pointer"
        >
          + إنشاء وطباعة طلب تجديد استعانة
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse text-[11px]">
          <thead>
            <tr className="bg-[#102A43] text-white">
              <th className="p-2 border border-slate-300">الكود ورقم العقد</th>
              <th className="p-2 border border-slate-300">الاسم والرقم القومي</th>
              <th className="p-2 border border-slate-300">طبيعة العمل والإدارة</th>
              <th className="p-2 border border-slate-300 text-center">المقابل المالي وجهه التمويل</th>
              <th className="p-2 border border-slate-300 text-center">بداية / نهاية العقد</th>
              <th className="p-2 border border-slate-300 text-center">الحالة والسجل التاريخي</th>
              <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {store.assistanceContracts.map((cnt) => (
              <tr key={cnt.id} className="border-b border-slate-200">
                <td className="p-2 border border-slate-200 num-cell font-black text-[#164E83]">
                  <div>{cnt.employeeCode}</div>
                  <div className="text-[10px] text-slate-500">{cnt.contractNumber}</div>
                </td>
                <td className="p-2 border border-slate-200 font-black">
                  <div>{cnt.fullName}</div>
                  <div className="num-cell text-[10px] text-slate-500">{toArabicNumerals(maskNationalId(cnt.nationalId, canViewFullNationalId))}</div>
                </td>
                <td className="p-2 border border-slate-200 font-bold">
                  <div>{cnt.jobNature}</div>
                  <div className="text-[10px] text-slate-500">{cnt.supplyAdministration} · المسؤول: {cnt.directManagerName}</div>
                </td>
                <td className="p-2 border border-slate-200 text-center font-black">
                  <div className="num-cell text-emerald-800">{formatArabicCurrency(cnt.financialCompensationEgp)}</div>
                  <div className="text-[10px] text-slate-500">{cnt.fundingAuthority}</div>
                </td>
                <td className="p-2 border border-slate-200 text-center num-cell font-bold">
                  {formatDateArabic(cnt.contractStartDate)} ← <span className="text-red-700 font-black">{formatDateArabic(cnt.contractEndDate)}</span>
                </td>
                <td className="p-2 border border-slate-200 text-center">
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-950 font-black">{cnt.status}</span>
                  <div className="text-[10px] text-slate-500 mt-0.5">عقود سابقة محفوظة: {toArabicNumerals(cnt.renewalsHistory.length)}</div>
                </td>
                <td className="p-2 border border-slate-200 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button type="button" onClick={() => setActiveScreen('renewal_requests')} className="px-2 py-1 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer">تجديد</button>
                    <button type="button" onClick={() => window.print()} className="px-2 py-1 rounded bg-slate-200 text-[#102A43] text-[10px] font-black cursor-pointer">طباعة</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
