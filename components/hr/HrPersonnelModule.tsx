'use client';

import React, { useMemo, useState } from 'react';
import {
  LayoutDashboard,
  UserCheck,
  Users,
  Clock,
  ShieldAlert,
  Globe,
  GraduationCap,
  FileText,
  Send,
  CheckSquare,
  UserCog,
  Bell,
  BarChart3,
  Printer,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { User } from '@/types';
import {
  HrPersonnelStoreData,
  HrEmployeeUnifiedRecord,
  loadHrPersonnelStore,
  saveHrPersonnelStore,
  resetHrPersonnelStore,
  wipeHrPersonnelTransactionalData,
  evaluateHrSmartAlerts,
} from '@/lib/hr-personnel-store';
import { toArabicNumerals } from '@/lib/utils';
import FactoryResetButton from '@/components/FactoryResetButton';
import HrRenewalAndReportsView, { HrScreenId } from './HrRenewalAndReportsView';
import HrCoreOperationsView from './HrCoreOperationsView';
import HrEmployeeProfileModal, { HrProfileModalMode } from './HrEmployeeProfileModal';

interface HrPersonnelModuleProps {
  currentUser: User;
  todayRef: string;
}

const HR_NAV_TABS: { id: HrScreenId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: '١. لوحة الموارد البشرية', icon: LayoutDashboard },
  { id: 'daily_status', label: '٢. الموقف الوظيفي اليومي', icon: UserCheck },
  { id: 'employees_db', label: '٣. قاعدة بيانات العاملين الموحدة', icon: Users },
  { id: 'attendance', label: '٤. الحضور والانصراف والإجازات', icon: Clock },
  { id: 'warnings_penalties', label: '٥. الإنذارات والجزاءات', icon: ShieldAlert },
  { id: 'secondments', label: '٦. الإعارات والندب', icon: Globe },
  { id: 'public_service', label: '٧. الخدمة العامة', icon: GraduationCap },
  { id: 'assistance_contracts', label: '٨. الاستعانة والعقود المؤقتة', icon: FileText },
  { id: 'renewal_requests', label: '٩. طلبات التجديد والطباعة A4', icon: Send },
  { id: 'renewal_workflow', label: '١٠. اعتماد طلبات التجديد (١٥ حالة)', icon: CheckSquare },
  { id: 'self_service', label: '١١. الخدمات الذاتية للموظف', icon: UserCog },
  { id: 'smart_alerts', label: '١٢. التنبيهات الذكية', icon: Bell },
  { id: 'reports_center', label: '١٣. مركز التقارير (٤٦)', icon: BarChart3 },
  { id: 'print_center', label: '١٤. مركز الطباعة (١٥)', icon: Printer },
  { id: 'roles_and_tests', label: '١٥. الصلاحيات والاختبارات (٢٩)', icon: ShieldCheck },
];

export default function HrPersonnelModule({ currentUser, todayRef }: HrPersonnelModuleProps) {
  const [store, setStore] = useState<HrPersonnelStoreData>(() => loadHrPersonnelStore());
  const [activeScreen, setActiveScreen] = useState<HrScreenId>('dashboard');
  const [toast, setToast] = useState<string>('');
  const [modalState, setModalState] = useState<{
    open: boolean;
    mode: HrProfileModalMode;
    employee: HrEmployeeUnifiedRecord | null;
  }>({ open: false, mode: 'profile', employee: null });

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const updateStore = (updater: (prev: HrPersonnelStoreData) => HrPersonnelStoreData) => {
    setStore((prev) => {
      const next = updater(prev);
      saveHrPersonnelStore(next);
      return next;
    });
  };

  const isHrAdminOrSupervisor =
    currentUser.role === 'super_admin' ||
    currentUser.role === 'admin' ||
    currentUser.role === 'directorate_manager' ||
    currentUser.role === 'deputy_directorate' ||
    currentUser.role === 'supply_admin_manager' ||
    currentUser.role === 'hr_officer' ||
    currentUser.role === 'department_manager';

  const canViewFullNationalId =
    currentUser.role === 'super_admin' ||
    currentUser.role === 'admin' ||
    currentUser.role === 'directorate_manager' ||
    currentUser.role === 'hr_officer';

  const smartAlerts = useMemo(
    () => evaluateHrSmartAlerts(store, todayRef),
    [store, todayRef]
  );

  const activeTabLabel =
    HR_NAV_TABS.find((t) => t.id === activeScreen)?.label || 'إدارة الموارد البشرية';

  const getActiveScreenSummary = () => {
    switch (activeScreen) {
      case 'attendance':
        return [
          { tableName: 'سجلات الحضور والانصراف والبصمة', count: store.attendance.length },
          { tableName: 'طلبات الإجازات والمأموريات', count: store.leaves.length },
        ];
      case 'warnings_penalties':
        return [
          { tableName: 'سجل الإنذارات الوظيفية', count: store.warnings.length },
          { tableName: 'سجل الجزاءات والتظلمات', count: store.disciplinaryActions.length },
        ];
      case 'secondments':
        return [{ tableName: 'سجل الإعارات والندب', count: store.secondments.length }];
      case 'public_service':
        return [{ tableName: 'سجل مكلفي الخدمة العامة', count: store.publicServiceMembers.length }];
      case 'assistance_contracts':
        return [{ tableName: 'سجل عقود الاستعانة والعقود المؤقتة', count: store.assistanceContracts.length }];
      case 'renewal_requests':
      case 'renewal_workflow':
        return [{ tableName: 'طلبات التجديد الإلكترونية ودورة الاعتماد', count: store.renewalRequests.length }];
      case 'self_service':
        return [
          { tableName: 'طلبات تصحيح البيانات الوظيفية', count: store.dataCorrectionRequests.length },
          { tableName: 'طلبات التجديد المقدمة', count: store.renewalRequests.length },
        ];
      default:
        return [
          { tableName: 'سجلات الحضور والانصراف', count: store.attendance.length },
          { tableName: 'الإجازات والمأموريات', count: store.leaves.length },
          { tableName: 'الإنذارات والجزاءات', count: store.warnings.length + store.disciplinaryActions.length },
          { tableName: 'الإعارات والخدمة العامة والاستعانة', count: store.secondments.length + store.publicServiceMembers.length + store.assistanceContracts.length },
          { tableName: 'طلبات التجديد وتصحيح البيانات', count: store.renewalRequests.length + store.dataCorrectionRequests.length },
          { tableName: 'سجلات حركات وتدقيق الموارد البشرية', count: store.auditLogs.length + store.serviceHistory.length },
        ];
    }
  };

  const exportCsvUtf8Bom = (
    filename: string,
    headers: string[],
    rows: (string | number)[][]
  ) => {
    const csvLines = [
      headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','),
      ...rows.map((r) =>
        r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
      ),
    ];
    const blob = new Blob(['\uFEFF' + csvLines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${todayRef}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify(`تم تصدير التقرير (${filename}) بصيغة Excel CSV بالترميز العربي المعتمد.`);
  };

  const isCoreScreen =
    activeScreen === 'dashboard' ||
    activeScreen === 'daily_status' ||
    activeScreen === 'employees_db' ||
    activeScreen === 'attendance' ||
    activeScreen === 'warnings_penalties' ||
    activeScreen === 'secondments' ||
    activeScreen === 'public_service' ||
    activeScreen === 'assistance_contracts';

  return (
    <div className="space-y-4 font-sans">
      {/* الترويسة السيادية لقسم إدارة الموارد البشرية وشؤون العاملين */}
      <div className="bg-gradient-to-l from-[#0B1F33] via-[#102A43] to-[#164E83] text-white rounded-2xl p-5 shadow-md border border-[#164E83] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 print:hidden">
        <div>
          <span className="text-[11px] font-black text-[#C6A15B] block">
            منظومة التموين والتجارة الداخلية بالغربية · قاعدة البيانات التشغيلية المترابطة للموارد البشرية
          </span>
          <h2 className="text-lg sm:text-xl font-black mt-0.5">
            إدارة الموارد البشرية وشؤون العاملين
          </h2>
          <p className="text-[11px] text-slate-200 font-bold mt-0.5">
            إدارة ملفات العاملين الموحدة · الموقف الوظيفي اليومي · الحضور والبصمة · الإنذارات والجزاءات · الإعارات · الخدمة العامة · الاستعانة والعقود · طلبات التجديد الإلكترونية A4
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveScreen('daily_status')}
            className="px-3.5 py-2 rounded-xl bg-[#C6A15B] text-[#102A43] text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>الموقف الوظيفي اليومي</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveScreen('smart_alerts')}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            <span>التنبيهات النشطة ({toArabicNumerals(smartAlerts.filter((a) => a.processingStatus !== 'تم الإغلاق').length)})</span>
          </button>
          {isHrAdminOrSupervisor && (
            <>
              <FactoryResetButton
                sectionName="إدارة الموارد البشرية (جميع الوحدات الـ ١٥)"
                sectionKey="HR_ALL_MODULES"
                currentUser={currentUser}
                description="تصفير شامل وفوري لجميع البيانات التشغيلية عبر كافة وحدات الموارد البشرية (الحضور، الإجازات، الإنذارات، الإعارات، الخدمة العامة، العقود، طلبات التجديد، السجلات) وإعادة الإعدادات للوضع الافتراضي بدون طلب نسخة احتياطية."
                getTableSummary={() => [
                  { tableName: 'سجلات الحضور والانصراف', count: store.attendance.length },
                  { tableName: 'الإجازات والمأموريات', count: store.leaves.length },
                  { tableName: 'الإنذارات والجزاءات', count: store.warnings.length + store.disciplinaryActions.length },
                  { tableName: 'الإعارات والخدمة العامة والاستعانة', count: store.secondments.length + store.publicServiceMembers.length + store.assistanceContracts.length },
                  { tableName: 'طلبات التجديد وتصحيح البيانات', count: store.renewalRequests.length + store.dataCorrectionRequests.length },
                  { tableName: 'سجلات حركات وتدقيق الموارد البشرية', count: store.auditLogs.length + store.serviceHistory.length },
                ]}
                onConfirmReset={() => {
                  const wiped = wipeHrPersonnelTransactionalData('ALL');
                  setStore(wiped);
                  notify('تم تنفيذ استعادة ضبط المصنع والتصفير الشامل الفوري لجميع وحدات الموارد البشرية بدون نسخة احتياطية.');
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setStore(resetHrPersonnelStore());
                  notify('تمت إعادة تحميل البيانات التجريبية الأساسية للموارد البشرية.');
                }}
                className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer"
                title="إعادة تحميل البيانات التجريبية"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {toast && (
        <div className="bg-[#102A43] text-[#C6A15B] px-4 py-2.5 rounded-xl text-xs font-black shadow-md border border-[#C6A15B]/40 print:hidden">
          {toast}
        </div>
      )}

      {/* شريط التبويبات الـ ١٥ مع شريط استعادة ضبط المصنع للوحدة الفرعية المختارة */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2.5 space-y-2 shadow-xs print:hidden">
        <div className="flex flex-wrap gap-1.5">
          {HR_NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeScreen === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveScreen(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                  active
                    ? 'bg-[#102A43] text-[#C6A15B] shadow-sm'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {isHrAdminOrSupervisor && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 px-1">
            <div className="text-[11px] font-black text-[#102A43] flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-50 text-[#164E83] border border-blue-200">
                الوحدة النشطة: {activeTabLabel}
              </span>
              <span className="text-slate-500 font-bold">
                يمكنك تصفير البيانات التشغيلية لهذه الوحدة فقط أو لجميع وحدات الموارد البشرية فوراً
              </span>
            </div>
            <FactoryResetButton
              compact
              sectionName={`وحدة الموارد البشرية — ${activeTabLabel}`}
              sectionKey={`HR_SUB_${activeScreen.toUpperCase()}`}
              currentUser={currentUser}
              description={`تصفير كافة السجلات والبيانات التشغيلية لوحدة (${activeTabLabel}) وإعادة الإعدادات للوضع الافتراضي فوراً بدون طلب نسخة احتياطية.`}
              getTableSummary={() => getActiveScreenSummary()}
              onConfirmReset={() => {
                const wiped = wipeHrPersonnelTransactionalData(activeScreen);
                setStore(wiped);
                notify(`تم تنفيذ التصفير الفوري واستعادة ضبط المصنع لوحدة (${activeTabLabel}) بنجاح.`);
              }}
            />
          </div>
        )}
      </div>

      {/* عرض الشاشة النشطة */}
      {isCoreScreen ? (
        <HrCoreOperationsView
          activeScreen={activeScreen}
          setActiveScreen={setActiveScreen}
          store={store}
          updateStore={updateStore}
          currentUser={currentUser}
          canViewFullNationalId={canViewFullNationalId}
          isHrAdminOrSupervisor={isHrAdminOrSupervisor}
          todayRef={todayRef}
          smartAlerts={smartAlerts}
          onOpenProfileModal={(mode, employee) =>
            setModalState({ open: true, mode, employee })
          }
          onNotify={notify}
        />
      ) : (
        <HrRenewalAndReportsView
          activeScreen={activeScreen}
          setActiveScreen={setActiveScreen}
          store={store}
          updateStore={updateStore}
          currentUser={currentUser}
          canViewFullNationalId={canViewFullNationalId}
          isHrAdminOrSupervisor={isHrAdminOrSupervisor}
          todayRef={todayRef}
          smartAlerts={smartAlerts}
          onNotify={notify}
          onExportCsv={exportCsvUtf8Bom}
        />
      )}

      {/* نافذة الملف الوظيفي الموحد (١٢ تبويباً) / إضافة / تعديل موظف */}
      {modalState.open && (
        <HrEmployeeProfileModal
          mode={modalState.mode}
          employee={modalState.employee}
          store={store}
          updateStore={updateStore}
          currentUser={currentUser}
          canViewFullNationalId={canViewFullNationalId}
          isHrAdminOrSupervisor={isHrAdminOrSupervisor}
          todayRef={todayRef}
          onClose={() => setModalState({ open: false, mode: 'profile', employee: null })}
          onNotify={notify}
        />
      )}
    </div>
  );
}
