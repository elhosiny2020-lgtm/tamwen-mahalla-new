'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Flame,
  CreditCard,
  ShoppingBag,
  ShieldAlert,
  Fuel,
  Package,
  Wheat,
  Warehouse,
  Factory,
  ThermometerSnowflake,
  Users,
  Calculator,
  Boxes,
  SearchCheck,
  FileText,
  MessageSquareWarning,
  BarChart3,
  FolderArchive,
  Settings,
  UserCog,
  ShieldCheck,
  History,
  Database,
  Search,
  Star,
  PanelRightClose,
  PanelRightOpen,
  Building2,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Pin,
  PinOff,
  Menu,
  X,
  ListChecks,
  ChevronDown,
  ChevronLeft,
} from 'lucide-react';
import {
  AuditLog,
  BakeryRecord,
  Branch,
  DebtTransactionRecord,
  Department,
  InspectionRecord,
  RegistrationRequest,
  User,
} from '@/types';
import {
  INITIAL_BRANCHES,
  INITIAL_DEPARTMENTS,
  INITIAL_BAKERIES,
  INITIAL_USERS,
  INITIAL_REGISTRATION_REQUESTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_INSPECTIONS,
  INITIAL_DEBT_TRANSACTIONS,
  getStoredBranches,
  getStoredDepartments,
  getStoredBakeries,
  saveStoredBakeries,
  getStoredUsers,
  getStoredRegistrationRequests,
  getStoredAuditLogs,
  getStoredInspections,
  saveStoredInspections,
  getStoredDebtTransactions,
  saveStoredDebtTransactions,
} from '@/lib/mock-db';
import { evaluateDocumentExpiry } from '@/lib/bakery-math';
import {
  toArabicNumerals,
  formatArabicNumber,
  formatDateArabic,
  normalizeSearchText,
} from '@/lib/utils';
import AdminDashboard from './AdminDashboard';
import BakeryManagementSystem from './BakeryManagementSystem';
import BakeryInspectionModule from './BakeryInspectionModule';
import BakeryDebtsModule from './BakeryDebtsModule';
import DepartmentWorkspace from './DepartmentWorkspace';
import AnimatedStatCard from './AnimatedStatCard';
import SmartAutoFitTable, { SmartTableColumn } from './SmartAutoFitTable';
import DailyTasksAndInternalChatModule from './DailyTasksAndInternalChatModule';
import InternalTradeModule from './InternalTradeModule';
import RationCommoditiesModule from './ration/RationCommoditiesModule';
import DropdownListsManagerModule from './DropdownListsManagerModule';
import FactoryResetButton from './FactoryResetButton';
import { TableActionButtons } from './trade/TradeSharedCrudUi';
import {
  loadButaneWarehouses,
  loadCommercialEstablishments,
  loadFuelStations,
} from '@/lib/internal-trade-store';
import {
  loadRationCommodities,
  loadRationMerchants,
} from '@/lib/ration-commodities-store';
import { loadMasterDocExpiries, subscribeDropdownLists } from '@/lib/dropdown-lists-store';
import { useSystemPreferences } from '@/lib/user-preferences-store';
import { getLocalizedDepartmentDesc, getLocalizedDepartmentName } from '@/lib/i18n';

interface UserPortalProps {
  currentUser: User;
  activeBranchId?: string;
}

function renderDeptIcon(iconName: string, className: string) {
  switch (iconName) {
    case 'Flame': return <Flame className={className} />;
    case 'CreditCard': return <CreditCard className={className} />;
    case 'ShoppingBag': return <ShoppingBag className={className} />;
    case 'ShieldAlert': return <ShieldAlert className={className} />;
    case 'Fuel': return <Fuel className={className} />;
    case 'Package': return <Package className={className} />;
    case 'Wheat': return <Wheat className={className} />;
    case 'Warehouse': return <Warehouse className={className} />;
    case 'Factory': return <Factory className={className} />;
    case 'ThermometerSnowflake': return <ThermometerSnowflake className={className} />;
    case 'Users': return <Users className={className} />;
    case 'Calculator': return <Calculator className={className} />;
    case 'Boxes': return <Boxes className={className} />;
    case 'SearchCheck': return <SearchCheck className={className} />;
    case 'FileText': return <FileText className={className} />;
    case 'MessageSquareWarning': return <MessageSquareWarning className={className} />;
    case 'BarChart3': return <BarChart3 className={className} />;
    case 'FolderArchive': return <FolderArchive className={className} />;
    case 'Settings': return <Settings className={className} />;
    case 'UserCog': return <UserCog className={className} />;
    case 'ShieldCheck': return <ShieldCheck className={className} />;
    case 'History': return <History className={className} />;
    case 'Database': return <Database className={className} />;
    case 'ListChecks': return <ListChecks className={className} />;
    default: return <LayoutDashboard className={className} />;
  }
}

const ACTIVE_TAB_STORAGE_KEY = 'gharbia_supply_active_dept_tab_v1';

export default function UserPortal({ currentUser, activeBranchId }: UserPortalProps) {
  const { prefs, effectiveDensity, isRtl, t } = useSystemPreferences();
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [allDepartments, setAllDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [bakeries, setBakeries] = useState<BakeryRecord[]>(INITIAL_BAKERIES);
  const [allUsers, setAllUsers] = useState<User[]>(INITIAL_USERS);
  const [regRequests, setRegRequests] = useState<RegistrationRequest[]>(INITIAL_REGISTRATION_REQUESTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [inspections, setInspections] = useState<InspectionRecord[]>(INITIAL_INSPECTIONS);
  const [debtTransactions, setDebtTransactions] = useState<DebtTransactionRecord[]>(INITIAL_DEBT_TRANSACTIONS);
  const [todayRef, setTodayRef] = useState<string>('2026-11-25');

  const [activeDeptId, setActiveDeptId] = useState<string>('d-02');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [sidebarSearch, setSidebarSearch] = useState<string>('');
  const [pinnedDeptIds, setPinnedDeptIds] = useState<string[]>(['d-01', 'd-02', 'd-03', 'd-04', 'd-07', 'd-26', 'd-25']);
  const [openSidebarGroups, setOpenSidebarGroups] = useState<Record<string, boolean>>({
    grp_cmd: true,
    grp_bakery: true,
    grp_trade: true,
    grp_ration: true,
    grp_grain: true,
    grp_citizens: true,
    grp_admin: true,
  });
  const [liveExtraCounts, setLiveExtraCounts] = useState({
    tradeMerchants: 5,
    gasEntities: 6,
    rationItemsAndMerchants: 10,
    managedDocs: 4,
  });

  // Complaints table state
  const [compSearch, setCompSearch] = useState('');
  const [compSort, setCompSort] = useState<{ key: string; asc: boolean }>({ key: 'date', asc: false });
  const [selectedCompIds, setSelectedCompIds] = useState<string[]>([]);
  const [compPinnedCols, setCompPinnedCols] = useState<string[]>(['citizen']);

  // Debt statement focus when opened directly from DEBTS sidebar tab
  const [standaloneStatementBakeryId, setStandaloneStatementBakeryId] = useState<string>(INITIAL_BAKERIES[0]?.id || '');
  const [portalSelectedBakery, setPortalSelectedBakery] = useState<BakeryRecord | null>(null);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setBranches(getStoredBranches());
      setAllDepartments(getStoredDepartments());
      setBakeries(getStoredBakeries());
      setAllUsers(getStoredUsers());
      setRegRequests(getStoredRegistrationRequests());
      setAuditLogs(getStoredAuditLogs());
      setInspections(getStoredInspections());
      setDebtTransactions(getStoredDebtTransactions());
      setTodayRef(new Date().toISOString().slice(0, 10));
      setLiveExtraCounts({
        tradeMerchants: loadCommercialEstablishments().length,
        gasEntities: loadButaneWarehouses().length + loadFuelStations().length,
        rationItemsAndMerchants: loadRationCommodities().length + loadRationMerchants().length,
        managedDocs: loadMasterDocExpiries().length,
      });

      try {
        const savedTab = sessionStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
        if (savedTab) setActiveDeptId(savedTab);
      } catch {
        // Ignore storage errors
      }
    });
    const unsubDropdowns = subscribeDropdownLists(() => {
      setLiveExtraCounts((prev) => ({
        ...prev,
        managedDocs: loadMasterDocExpiries().length,
      }));
    });
    return () => {
      cancelAnimationFrame(frameId);
      unsubDropdowns();
    };
  }, []);

  const handleSelectDept = (deptId: string) => {
    setActiveDeptId(deptId);
    setMobileMenuOpen(false);
    try {
      sessionStorage.setItem(ACTIVE_TAB_STORAGE_KEY, deptId);
    } catch {
      // Ignore storage errors
    }
  };

  const currentBranch = branches.find(
    (b) => b.id === (activeBranchId || currentUser.primaryBranchId)
  );

  const allowedDepartments = useMemo(
    () =>
      allDepartments.filter(
        (d) =>
          currentUser.departmentIds.includes(d.id) ||
          currentUser.role === 'super_admin' ||
          currentUser.role === 'admin'
      ),
    [allDepartments, currentUser]
  );

  const [complaintsList, setComplaintsList] = useState([
    { id: 'comp-1', citizen: 'أحمد محمود الششتاوي', phone: '01011112222', issue: 'مراجعة أوزان رغيف الخبز بقرية الهياتم', status: 'جاري الفحص والتفتيش', date: '2026-11-24' },
    { id: 'comp-2', citizen: 'فاطمة علي أبو النجا', phone: '01233334444', issue: 'تحديث بيانات بطاقة تموينية بمركز المحلة', status: 'تم الحل وإعادة التفعيل', date: '2026-11-23' },
    { id: 'comp-3', citizen: 'سعيد عبد الرحمن الدسوقي', phone: '01122334455', issue: 'متابعة مواعيد تشغيل مخبز بقرية صفط تراب', status: 'تمت المعاينة والمطابقة', date: '2026-11-22' },
  ]);

  const [compNotice, setCompNotice] = useState('');

  const filteredComplaints = useMemo(() => {
    const q = normalizeSearchText(compSearch);
    return complaintsList.filter((c) => {
      if (!q) return true;
      return normalizeSearchText(`${c.citizen} ${c.phone} ${c.issue} ${c.status} ${c.date}`).includes(q);
    });
  }, [complaintsList, compSearch]);

  const complaintColumns: SmartTableColumn<(typeof complaintsList)[number]>[] = [
    {
      key: 'citizen',
      label: 'المواطن',
      headerText: 'المواطن',
      type: 'name',
      defaultWidth: 185,
      render: (c) => <span className="font-extrabold text-[#102A43]">{c.citizen}</span>,
    },
    {
      key: 'phone',
      label: 'رقم الهاتف',
      headerText: 'رقم الهاتف',
      type: 'numeric',
      align: 'center',
      defaultWidth: 135,
      measureValue: (c) => toArabicNumerals(c.phone),
      render: (c) => <span className="text-slate-700">{toArabicNumerals(c.phone)}</span>,
    },
    {
      key: 'issue',
      label: 'موضوع البلاغ أو الشكوى',
      headerText: 'موضوع البلاغ أو الشكوى',
      type: 'longText',
      defaultWidth: 280,
      measureValue: (c) => toArabicNumerals(c.issue),
      render: (c) => <span className="text-slate-800">{toArabicNumerals(c.issue)}</span>,
    },
    {
      key: 'date',
      label: 'التاريخ',
      headerText: 'التاريخ',
      type: 'date',
      align: 'center',
      defaultWidth: 135,
      measureValue: (c) => formatDateArabic(c.date),
      render: (c) => <span className="text-slate-700">{formatDateArabic(c.date)}</span>,
    },
    {
      key: 'status',
      label: 'حالة الشكوى',
      headerText: 'حالة الشكوى',
      type: 'badge',
      align: 'center',
      defaultWidth: 160,
      render: (c) => (
        <span className="bg-blue-50 text-blue-900 border border-blue-200 px-2.5 py-0.5 rounded text-[10px] font-extrabold">
          {c.status}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'الإجراءات',
      headerText: 'الإجراءات',
      type: 'actions',
      align: 'center',
      defaultWidth: 230,
      render: (c) => (
        <TableActionButtons
          recordLabel={c.citizen}
          onView={() => setCompNotice(`معاينة شكوى المواطن: ${c.citizen} — ${c.issue}`)}
          onAdd={() => {
            const newComp = {
              id: `comp-${Date.now()}`,
              citizen: 'مواطن جديد — مركز المحلة',
              phone: '01000000000',
              issue: 'بلاغ تمويني جديد قيد الفحص الميداني',
              status: 'جاري الفحص والتفتيش',
              date: todayRef,
            };
            setComplaintsList((prev) => [newComp, ...prev]);
            setCompNotice('تمت إضافة بلاغ جديد إلى سجل الشكاوى.');
          }}
          onEdit={() => {
            setComplaintsList((prev) =>
              prev.map((x) => (x.id === c.id ? { ...x, status: 'تم الحل وإعادة التفعيل' } : x))
            );
            setCompNotice(`تم تحديث حالة شكوى (${c.citizen}) إلى تم الحل.`);
          }}
          onDelete={() => {
            setComplaintsList((prev) => prev.filter((x) => x.id !== c.id));
            setCompNotice(`تم حذف شكوى (${c.citizen}) من الجدول.`);
          }}
        />
      ),
    },
  ];

  const activeDept = allDepartments.find((d) => d.id === activeDeptId) || allowedDepartments[0];

  const togglePinDept = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (pinnedDeptIds.includes(id)) {
      setPinnedDeptIds(pinnedDeptIds.filter((x) => x !== id));
    } else {
      setPinnedDeptIds([...pinnedDeptIds, id]);
    }
  };

  const filteredSidebarDepts = useMemo(() => {
    const q = normalizeSearchText(sidebarSearch);
    const list = q
      ? allowedDepartments.filter(
          (d) => normalizeSearchText(`${d.arabicName} ${d.description}`).includes(q)
        )
      : allowedDepartments;

    return [...list].sort((a, b) => {
      const aPinned = pinnedDeptIds.includes(a.id) ? 1 : 0;
      const bPinned = pinnedDeptIds.includes(b.id) ? 1 : 0;
      return bPinned - aPinned;
    });
  }, [allowedDepartments, sidebarSearch, pinnedDeptIds]);

  const ultraMetrics = useMemo(() => {
    const activeBaks = bakeries.filter((b) => !b.isArchived);
    const totalDebts = activeBaks.reduce((sum, b) => sum + (b.remainingDebtEgp || 0), 0);
    let docAlertsCount = 0;
    activeBaks.forEach((b) => {
      if (evaluateDocumentExpiry(b.licenseExpiryDate, b.licenseNumber, todayRef).severity !== 'valid') docAlertsCount++;
      if (evaluateDocumentExpiry(b.taxCardExpiryDate, b.taxCardNumber, todayRef).severity !== 'valid') docAlertsCount++;
      if (evaluateDocumentExpiry(b.leaseExpiryDate, b.leaseContractNumber, todayRef).severity !== 'valid') docAlertsCount++;
    });
    const pendingReqs = regRequests.filter((r) => r.status === 'pending').length;

    return {
      totalBakeries: activeBaks.length,
      totalUsers: allUsers.length,
      totalBranches: branches.length,
      totalDebts,
      totalViolations: inspections.filter((r) => r.type === 'مخالفة' || r.type === 'محضر رسمي').length,
      totalTransactions: auditLogs.length + debtTransactions.length + inspections.length,
      totalAlerts: docAlertsCount,
      pendingReviews: pendingReqs + activeBaks.filter((b) => b.activityStatus !== 'نشط').length,
    };
  }, [bakeries, allUsers, branches, regRequests, auditLogs, inspections, debtTransactions, todayRef]);

  // عدادات حية رقمية بجانب كل قسم في القائمة الجانبية
  const deptLiveCounts = useMemo<Record<string, number>>(
    () => ({
      DASH: ultraMetrics.totalAlerts,
      BAK: ultraMetrics.totalBakeries,
      DEBTS: bakeries.filter((b) => !b.isArchived && (b.remainingDebtEgp || 0) > 0).length || debtTransactions.length,
      TRADE: liveExtraCounts.tradeMerchants,
      GAS: liveExtraCounts.gasEntities,
      COMM: liveExtraCounts.rationItemsAndMerchants,
      CTRL: ultraMetrics.totalAlerts + ultraMetrics.totalViolations,
      INSP: inspections.length,
      VIOL: ultraMetrics.totalViolations,
      COMP: complaintsList.length,
      LISTS: liveExtraCounts.managedDocs,
      USERS: allUsers.length,
      ROLES: branches.length,
      AUDIT: auditLogs.length,
      TASKS: ultraMetrics.pendingReviews,
    }),
    [ultraMetrics, bakeries, debtTransactions.length, liveExtraCounts, inspections.length, complaintsList.length, allUsers.length, branches.length, auditLogs.length]
  );

  // تنظيم القائمة الجانبية في مجموعات منطقية مترابطة مع دعم العربية والإنجليزية
  const sidebarGroupedSections = useMemo(() => {
    const groupsDef: { id: string; title: string; codes: string[] }[] = [
      { id: 'grp_cmd', title: t('grp_cmd'), codes: ['DASH', 'CTRL'] },
      { id: 'grp_bakery', title: t('grp_bakery'), codes: ['BAK', 'DEBTS'] },
      { id: 'grp_trade', title: t('grp_trade'), codes: ['TRADE', 'GAS', 'INSP', 'VIOL'] },
      { id: 'grp_ration', title: t('grp_ration'), codes: ['COMM'] },
      { id: 'grp_grain', title: t('grp_grain'), codes: ['GRAIN', 'SILOS', 'MILLS', 'COLD'] },
      { id: 'grp_citizens', title: t('grp_citizens'), codes: ['COMP', 'TASKS'] },
      {
        id: 'grp_admin',
        title: t('grp_admin'),
        codes: ['LISTS', 'REP', 'DOCS', 'BACK', 'SETT', 'USERS', 'ROLES', 'AUDIT', 'HR', 'FIN', 'STORE'],
      },
    ];
    const usedIds = new Set<string>();
    const sections = groupsDef
      .map((g) => {
        const items = g.codes
          .map((code) => filteredSidebarDepts.find((d) => d.code === code))
          .filter((d): d is Department => Boolean(d));
        items.forEach((d) => usedIds.add(d.id));
        return { id: g.id, title: g.title, items };
      })
      .filter((s) => s.items.length > 0);

    const remaining = filteredSidebarDepts.filter((d) => !usedIds.has(d.id));
    if (remaining.length > 0) {
      sections.push({ id: 'grp_other', title: isRtl ? 'أقسام أخرى' : 'Other Sections', items: remaining });
    }
    return sections;
  }, [filteredSidebarDepts, t, isRtl]);

  const handleStandaloneAddInspection = (record: Omit<InspectionRecord, 'id'>) => {
    const updated = [{ ...record, id: `ins-${Date.now()}` }, ...inspections];
    setInspections(updated);
    saveStoredInspections(updated);
  };

  const handleStandaloneUpdateInspection = (id: string, status: InspectionRecord['status']) => {
    const updated = inspections.map((r) => (r.id === id ? { ...r, status } : r));
    setInspections(updated);
    saveStoredInspections(updated);
  };

  const handleStandaloneAddDebt = (tx: Omit<DebtTransactionRecord, 'id'>) => {
    const updatedTx = [{ ...tx, id: `dbt-${Date.now()}` }, ...debtTransactions];
    setDebtTransactions(updatedTx);
    saveStoredDebtTransactions(updatedTx);
    const updatedBakeries = bakeries.map((b) => {
      if (b.id !== tx.bakeryId) return b;
      const delta = tx.direction === 'debit' ? tx.amountEgp : -tx.amountEgp;
      return { ...b, remainingDebtEgp: Math.max(0, (b.remainingDebtEgp || 0) + delta) };
    });
    setBakeries(updatedBakeries);
    saveStoredBakeries(updatedBakeries);
  };

  const renderSidebarTabs = (isMobile = false) => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/15">
        {(!sidebarCollapsed || isMobile) && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-white shrink-0 border border-[#C6A15B]">
              <Image
                src="/assets/aistudio/logo_4234585c.jpg"
                alt="شعار الوزارة"
                fill
                sizes="32px"
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="truncate">
              <span className="text-[10px] font-black text-[#C6A15B] block">القائمة الرئيسية للأقسام</span>
              <h3 className="text-[11px] font-black text-white truncate max-w-[155px]">
                {currentBranch?.arabicName || 'إدارة تموين مركز المحلة الكبرى'}
              </h3>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 mx-auto lg:mx-0 shrink-0">
          {isMobile ? (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 bg-[#164E83] text-white rounded-xl cursor-pointer"
              title="إغلاق القائمة"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <>
              {!sidebarCollapsed && (
                <button
                  type="button"
                  onClick={() => setIsSidebarPinned(!isSidebarPinned)}
                  className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                    isSidebarPinned ? 'bg-[#C6A15B] text-[#102A43]' : 'bg-[#164E83] text-slate-300 hover:text-white'
                  }`}
                  title={isSidebarPinned ? 'إلغاء تثبيت القائمة' : 'تثبيت القائمة مفتوحة'}
                >
                  {isSidebarPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setSidebarCollapsed(!sidebarCollapsed);
                  if (!sidebarCollapsed) setIsSidebarPinned(false);
                }}
                className="p-2 bg-[#164E83] hover:bg-[#1e609e] text-[#C6A15B] rounded-xl transition-colors cursor-pointer"
                title={sidebarCollapsed ? 'توسيع القائمة الجانبية' : 'طي القائمة الجانبية'}
              >
                {sidebarCollapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Quick Search Inside Sidebar */}
      {(!sidebarCollapsed || isMobile) && (
        <div className="relative mb-3">
          <Search className={`w-3.5 h-3.5 text-slate-300 absolute ${isRtl ? 'right-3' : 'left-3'} top-3`} />
          <input
            type="text"
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            placeholder={t('searchDepartments')}
            className={`w-full ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2 bg-[#164E83]/50 border border-white/15 rounded-xl text-[11px] text-white font-bold placeholder:text-slate-300 focus:outline-none focus:border-[#C6A15B]`}
          />
        </div>
      )}

      {/* القائمة الجانبية المنظمة حسب التخصص مع عدادات رقمية حية بجانب كل قسم */}
      <nav
        aria-label={t('departments')}
        className="space-y-2.5 max-h-[calc(100vh-14.5rem)] overflow-y-auto compact-table-scroll pl-0.5"
      >
        {sidebarGroupedSections.map((section) => {
          const isGroupOpen = openSidebarGroups[section.id] ?? true;
          return (
            <div key={section.id} className="space-y-1">
              {(!sidebarCollapsed || isMobile) && (
                <button
                  type="button"
                  onClick={() =>
                    setOpenSidebarGroups((prev) => ({ ...prev, [section.id]: !isGroupOpen }))
                  }
                  className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-black text-[#C6A15B] hover:text-white cursor-pointer border-b border-white/10"
                >
                  <span className="truncate">{section.title}</span>
                  {isGroupOpen ? (
                    <ChevronDown className="w-3 h-3 shrink-0" />
                  ) : (
                    <ChevronLeft className="w-3 h-3 shrink-0" />
                  )}
                </button>
              )}

              {(isGroupOpen || (sidebarCollapsed && !isMobile)) &&
                section.items.map((dept) => {
                  const isActive = activeDeptId === dept.id;
                  const isPinned = pinnedDeptIds.includes(dept.id);
                  const liveCount = deptLiveCounts[dept.code];
                  const isSubNested = dept.code === 'GAS' || dept.code === 'INSP' || dept.code === 'VIOL';
                  const localizedDeptName = getLocalizedDepartmentName(dept.code, dept.arabicName, prefs.language);

                  return (
                    <motion.button
                      key={dept.id}
                      type="button"
                      onClick={() => handleSelectDept(dept.id)}
                      whileHover={{ x: isRtl ? -3 : 3 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                      className={`relative w-full flex items-center justify-between gap-1.5 py-2 rounded-xl text-[11px] font-black transition-colors cursor-pointer ${isRtl ? 'text-right' : 'text-left'} border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B] ${
                        isSubNested && (!sidebarCollapsed || isMobile)
                          ? isRtl
                            ? 'pr-4 pl-2.5'
                            : 'pl-4 pr-2.5'
                          : 'px-2.5'
                      } ${
                        isActive
                          ? 'text-[#102A43] border-[#C6A15B] shadow-md'
                          : 'bg-[#164E83]/25 border-white/10 text-slate-100 hover:bg-[#164E83]/60 hover:border-white/25'
                      }`}
                      title={localizedDeptName}
                    >
                      {isActive && (
                        <motion.span
                          layoutId={isMobile ? 'mobileActiveTabBg' : 'desktopActiveTabBg'}
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                          className="absolute inset-0 rounded-xl bg-gradient-to-l from-[#C6A15B] via-[#d8b878] to-[#C6A15B] z-0"
                        />
                      )}
                      {isActive && (
                        <motion.span
                          layoutId={isMobile ? 'mobileActiveTabBar' : 'desktopActiveTabBar'}
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                          className={`absolute ${isRtl ? 'right-0 rounded-l-full' : 'left-0 rounded-r-full'} top-1.5 bottom-1.5 w-1 bg-[#102A43] z-10`}
                        />
                      )}

                      <div className="relative z-10 flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isActive ? 'bg-[#102A43] text-[#C6A15B]' : 'bg-[#0B1F33]/60 text-[#C6A15B]'
                          }`}
                        >
                          {renderDeptIcon(dept.iconName, 'w-3.5 h-3.5')}
                        </span>
                        {(!sidebarCollapsed || isMobile) && (
                          <span className={`leading-snug break-words whitespace-normal ${isRtl ? 'text-right' : 'text-left'}`}>
                            {localizedDeptName}
                          </span>
                        )}
                      </div>

                      {(!sidebarCollapsed || isMobile) && (
                        <div className="relative z-10 flex items-center gap-1 shrink-0">
                          {typeof liveCount === 'number' && (
                            <span
                              className={`num-cell px-1.5 py-0.5 rounded-md text-[9.5px] font-black ${
                                isActive
                                  ? 'bg-[#102A43] text-[#C6A15B]'
                                  : 'bg-[#0B1F33]/80 text-[#C6A15B] border border-[#C6A15B]/35'
                              }`}
                            >
                              {isRtl ? toArabicNumerals(liveCount) : liveCount}
                            </span>
                          )}
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => togglePinDept(e, dept.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                togglePinDept(e as unknown as React.MouseEvent, dept.id);
                              }
                            }}
                            className={`p-0.5 rounded hover:bg-black/10 shrink-0 ${
                              isPinned
                                ? isActive
                                  ? 'text-[#102A43]'
                                  : 'text-[#C6A15B]'
                                : 'text-slate-400 opacity-45 hover:opacity-100'
                            }`}
                            title={isPinned ? 'إلغاء التثبيت بالمفضلة' : 'تثبيت بالمفضلة'}
                          >
                            <Star className="w-3 h-3 fill-current" />
                          </span>
                        </div>
                      )}
                    </motion.button>
                  );
                })}
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-5 min-h-[calc(100vh-7rem)] font-sans">
      {/* Mobile Sidebar Trigger */}
      <div className="lg:hidden flex items-center justify-between bg-[#102A43] text-white px-4 py-2.5 rounded-xl border border-[#164E83] print:hidden">
        <div className="flex items-center gap-2 text-xs font-black">
          {renderDeptIcon(activeDept?.iconName || 'LayoutDashboard', 'w-4 h-4 text-[#C6A15B]')}
          <span>{activeDept?.arabicName}</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="px-3 py-1.5 bg-[#C6A15B] text-[#102A43] rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer"
        >
          <Menu className="w-4 h-4" />
          <span>الأقسام</span>
        </button>
      </div>

      {/* Mobile Drawer Sidebar */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 lg:hidden flex justify-start"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-[290px] max-w-[85vw] bg-gradient-to-b from-[#0B1F33] via-[#102A43] to-[#0B1F33] text-white p-4 shadow-2xl border-l border-[#C6A15B]/30 h-full"
            >
              {renderSidebarTabs(true)}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Animated Tabbed Sidebar (adaptive width per Display Density) */}
      <motion.aside
        initial={false}
        animate={{
          width: sidebarCollapsed
            ? '84px'
            : effectiveDensity === 'compact'
            ? '252px'
            : effectiveDensity === 'spacious'
            ? '292px'
            : '276px',
        }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        onMouseEnter={() => !isSidebarPinned && setSidebarCollapsed(false)}
        onMouseLeave={() => !isSidebarPinned && setSidebarCollapsed(true)}
        className="app-sidebar hidden lg:block bg-gradient-to-b from-[#0B1F33] via-[#102A43] to-[#0B1F33] text-white rounded-2xl shadow-lg border border-[#164E83] shrink-0 print:hidden overflow-hidden p-3 self-start sticky top-20"
      >
        {renderSidebarTabs(false)}
      </motion.aside>

      {/* Main Content Viewport (section — avoids nested <main> landmark) */}
      <section className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeDept?.id || 'default'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {activeDept?.code === 'BAK' && (
              <BakeryManagementSystem
                currentUser={currentUser}
                branchName={currentBranch?.arabicName || 'إدارة تموين مركز المحلة الكبرى'}
              />
            )}

            {activeDept?.code === 'DASH' && (
              <div className="space-y-5">
                {/* Hero Sovereign Banner */}
                <div className="bg-gradient-to-l from-[#0B1F33] via-[#102A43] to-[#164E83] text-white rounded-2xl p-6 shadow-md border border-[#164E83] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-white shrink-0 border-2 border-[#C6A15B] shadow-md">
                      <Image
                        src="/assets/aistudio/logo_4234585c.jpg"
                        alt="شعار وزارة التموين"
                        fill
                        sizes="64px"
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-[#C6A15B] mb-1">
                        {t('republicSubtitle')}
                      </p>
                      <h2 className="text-xl sm:text-2xl font-black">
                        {t('centralDashboardTitle')} — {currentBranch?.arabicName}
                      </h2>
                      <p className="text-[11px] text-slate-200 font-bold mt-1">
                        {t('centralDashboardDesc')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectDept('d-02')}
                    className="px-5 py-3 bg-[#C6A15B] hover:bg-[#b58f48] text-[#102A43] font-black rounded-xl text-[11px] flex items-center gap-2 shrink-0 shadow-md cursor-pointer"
                  >
                    <Flame className="w-4 h-4" />
                    <span>{t('openBakerySystem')}</span>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                </div>

                {/* 8 Animated Colored Enterprise KPI Cards across all 6 themes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <AnimatedStatCard
                    title="إجمالي المخابز المسجلة"
                    value={ultraMetrics.totalBakeries}
                    unit="مخبز بلدي مدعم"
                    indicator="إجماليات المركز"
                    icon={Flame}
                    theme="navy"
                    delay={0}
                    onClick={() => handleSelectDept('d-02')}
                  />
                  <AnimatedStatCard
                    title="إجمالي المستخدمين"
                    value={ultraMetrics.totalUsers}
                    unit="حساب معتمد"
                    indicator="كادر إداري"
                    icon={Users}
                    theme="purple"
                    delay={0.04}
                    onClick={() => handleSelectDept('d-22')}
                  />
                  <AnimatedStatCard
                    title="الإدارات التموينية بالمحافظة"
                    value={ultraMetrics.totalBranches}
                    unit="إدارة تموينية"
                    indicator="محافظة الغربية"
                    icon={Building2}
                    theme="teal"
                    delay={0.08}
                    onClick={() => handleSelectDept('d-22')}
                  />
                  <AnimatedStatCard
                    title="إجمالي المديونيات المتبقية"
                    value={ultraMetrics.totalDebts}
                    format="currency"
                    indicator="مؤشر مالي"
                    icon={CreditCard}
                    theme="gold"
                    delay={0.12}
                    onClick={() => handleSelectDept('d-03')}
                  />
                  <AnimatedStatCard
                    title="المخالفات والمحاضر الرقابية"
                    value={ultraMetrics.totalViolations}
                    unit="محضر ومخالفة"
                    indicator="حملات التفتيش"
                    icon={ShieldAlert}
                    theme="red"
                    delay={0.16}
                    onClick={() => handleSelectDept('d-16')}
                  />
                  <AnimatedStatCard
                    title="المعاملات والحركات الموثقة"
                    value={ultraMetrics.totalTransactions}
                    unit="عملية مسجلة"
                    indicator="عمليات مكتملة"
                    icon={History}
                    theme="green"
                    delay={0.2}
                    onClick={() => handleSelectDept('d-23')}
                  />
                  <AnimatedStatCard
                    title="تنبيهات التراخيص والعقود"
                    value={ultraMetrics.totalAlerts}
                    unit="مستند للتجديد"
                    indicator="تنبيهات عاجلة"
                    icon={AlertTriangle}
                    theme="red"
                    delay={0.24}
                    onClick={() => handleSelectDept('d-02')}
                  />
                  <AnimatedStatCard
                    title="عمليات قيد المراجعة"
                    value={ultraMetrics.pendingReviews}
                    unit="طلب / مخبز"
                    indicator="متابعة إدارية"
                    icon={CheckCircle2}
                    theme="purple"
                    delay={0.28}
                    onClick={() => handleSelectDept('d-22')}
                  />
                </div>

                {/* Departments Directory Grid */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-[15px] font-black text-[#102A43]">{t('mainDepartmentsTitle')}</h3>
                      <p className="text-[11px] font-bold text-slate-600">{t('mainDepartmentsDesc')}</p>
                    </div>
                    <span className="num-cell text-[11px] font-black text-[#164E83]">
                      {isRtl ? toArabicNumerals(allowedDepartments.length) : allowedDepartments.length} {t('authorizedSections')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {allowedDepartments.map((dept) => (
                      <div
                        key={dept.id}
                        onClick={() => handleSelectDept(dept.id)}
                        className="p-4 rounded-xl border border-slate-200 hover:border-[#102A43] bg-[#F4F7FB]/50 hover:bg-white transition-all cursor-pointer flex flex-col justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#102A43] text-[#C6A15B] flex items-center justify-center shrink-0">
                            {renderDeptIcon(dept.iconName, 'w-5 h-5')}
                          </div>
                          <div>
                            <h4 className="text-[13px] font-black text-[#102A43]">
                              {getLocalizedDepartmentName(dept.code, dept.arabicName, prefs.language)}
                            </h4>
                            <p className="text-[11px] font-bold text-slate-600 mt-0.5 leading-relaxed">
                              {getLocalizedDepartmentDesc(dept.code, dept.description, prefs.language)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3.5 pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-[10.5px] font-black text-[#164E83]">
                          <span>
                            {dept.code === 'BAK'
                              ? `${isRtl ? toArabicNumerals(ultraMetrics.totalBakeries) : ultraMetrics.totalBakeries} ${t('registeredBakeries')}`
                              : t('activeWithData')}
                          </span>
                          <span className="flex items-center gap-1">
                            <span>{t('openSection')}</span>
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeDept?.code === 'DEBTS' && (
              <BakeryDebtsModule
                userId={currentUser.id}
                currentUser={currentUser}
                bakeries={bakeries.filter((b) => !b.isArchived)}
                transactions={debtTransactions}
                activeFocus="dbt-all"
                selectedStatementBakeryId={standaloneStatementBakeryId}
                todayRef={todayRef}
                onSelectStatementBakeryId={(id) => setStandaloneStatementBakeryId(id)}
                onAddTransaction={handleStandaloneAddDebt}
                onSelectBakeryDetails={(b) => setPortalSelectedBakery(b)}
              />
            )}

            {(activeDept?.code === 'INSP' || activeDept?.code === 'VIOL') && (
              <BakeryInspectionModule
                bakeries={bakeries.filter((b) => !b.isArchived)}
                inspections={inspections}
                currentUser={currentUser}
                activeFocus={activeDept.code === 'INSP' ? 'ins-campaigns' : 'ins-violations'}
                todayRef={todayRef}
                onAddInspection={handleStandaloneAddInspection}
                onUpdateStatus={handleStandaloneUpdateInspection}
                onSelectBakeryDetails={(b) => setPortalSelectedBakery(b)}
              />
            )}

            {(activeDept?.code === 'ROLES' || activeDept?.code === 'USERS' || activeDept?.code === 'AUDIT') && (
              <AdminDashboard userId={currentUser.id} />
            )}

            {activeDept?.code === 'COMP' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <AnimatedStatCard
                    title="إجمالي شكاوى المواطنين"
                    value={complaintsList.length}
                    unit="شكوى مسجلة"
                    icon={MessageSquareWarning}
                    theme="navy"
                  />
                  <AnimatedStatCard
                    title="شكاوى قيد الفحص"
                    value={complaintsList.filter((c) => c.status.includes('جاري')).length}
                    unit="جاري المتابعة"
                    icon={AlertTriangle}
                    theme="gold"
                  />
                  <AnimatedStatCard
                    title="شكاوى تم حلها"
                    value={complaintsList.filter((c) => !c.status.includes('جاري')).length}
                    unit="منجز ومغلق"
                    icon={CheckCircle2}
                    theme="green"
                  />
                </div>

                {compNotice && (
                  <div className="bg-[#102A43] text-[#C6A15B] px-4 py-2 rounded-xl text-[11px] font-black">
                    {compNotice}
                  </div>
                )}

                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-[13px] font-black text-[#102A43]">شكاوى وبلاغات المواطنين الواردة</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative min-w-[230px]">
                        <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                        <input
                          type="text"
                          value={compSearch}
                          onChange={(e) => setCompSearch(e.target.value)}
                          placeholder="بحث باسم المواطن أو رقم الهاتف..."
                          className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-bold"
                        />
                      </div>
                      <FactoryResetButton
                        sectionName="الشكاوى وخدمة المواطنين"
                        sectionKey="complaints"
                        currentUser={currentUser}
                        tableSummary={[
                          { tableName: 'سجل شكاوى وبلاغات المواطنين', count: complaintsList.length },
                        ]}
                        onCaptureBackup={() => ({ complaintsList })}
                        onRestoreBackup={(snap) => {
                          if (Array.isArray(snap.complaintsList)) {
                            setComplaintsList(snap.complaintsList as typeof complaintsList);
                          }
                        }}
                        compact
                        onConfirmReset={() => {
                          setComplaintsList([]);
                          setSelectedCompIds([]);
                          setCompNotice('تم تنفيذ إعادة ضبط المصنع ومسح جميع الشكاوى المدخلة.');
                        }}
                      />
                    </div>
                  </div>
                  <SmartAutoFitTable
                    tableId="user_complaints"
                    userId={currentUser.id}
                    rows={filteredComplaints}
                    totalCount={complaintsList.length}
                    getRowId={(c) => c.id}
                    columns={complaintColumns}
                    sortKey={compSort.key}
                    sortAsc={compSort.asc}
                    onSort={(k) => setCompSort((s) => ({ key: k, asc: s.key === k ? !s.asc : true }))}
                    selectable
                    selectedIds={selectedCompIds}
                    onToggleSelect={(id) =>
                      setSelectedCompIds((prev) =>
                        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                      )
                    }
                    onClearSelection={() => setSelectedCompIds([])}
                    pinnedKeys={compPinnedCols}
                    onPinAll={() => setCompPinnedCols(['citizen', 'phone'])}
                    onUnpinAll={() => setCompPinnedCols([])}
                    onTogglePinColumn={(k) =>
                      setCompPinnedCols((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]))
                    }
                    onResetPinDefaults={() => setCompPinnedCols(['citizen'])}
                    onNotify={(msg) => {
                      setCompNotice(msg);
                      setTimeout(() => setCompNotice(''), 2800);
                    }}
                    emptyMessage="لا توجد شكاوى مطابقة حالياً."
                  />
                </div>
              </div>
            )}

            {activeDept?.code === 'TASKS' && (
              <DailyTasksAndInternalChatModule
                currentUser={currentUser}
                allUsers={allUsers}
                departments={allDepartments}
                bakeries={bakeries.filter((b) => !b.isArchived)}
                inspections={inspections}
                todayRef={todayRef}
                onNavigateToDepartment={(deptId) => handleSelectDept(deptId)}
                onSelectBakeryDetails={(b) => setPortalSelectedBakery(b)}
              />
            )}

            {(activeDept?.code === 'TRADE' || activeDept?.code === 'GAS') && (
              <InternalTradeModule
                key={activeDept.code}
                currentUser={currentUser}
                todayRef={todayRef}
                initialScreen={activeDept.code === 'GAS' ? 'butane_management' : 'dashboard'}
              />
            )}

            {activeDept?.code === 'COMM' && (
              <RationCommoditiesModule currentUserName={currentUser.fullName} />
            )}

            {activeDept?.code === 'LISTS' && (
              <DropdownListsManagerModule currentUserName={currentUser.fullName} />
            )}

            {activeDept &&
              activeDept.code !== 'DASH' &&
              activeDept.code !== 'BAK' &&
              activeDept.code !== 'DEBTS' &&
              activeDept.code !== 'TRADE' &&
              activeDept.code !== 'GAS' &&
              activeDept.code !== 'COMM' &&
              activeDept.code !== 'LISTS' &&
              activeDept.code !== 'TASKS' &&
              activeDept.code !== 'INSP' &&
              activeDept.code !== 'VIOL' &&
              activeDept.code !== 'COMP' &&
              activeDept.code !== 'ROLES' &&
              activeDept.code !== 'USERS' &&
              activeDept.code !== 'AUDIT' && (
                <DepartmentWorkspace
                  userId={currentUser.id}
                  dept={activeDept}
                  currentBranch={currentBranch}
                  bakeries={bakeries}
                  users={allUsers}
                  branches={branches}
                  inspections={inspections}
                  debtTransactions={debtTransactions}
                  auditLogs={auditLogs}
                  onOpenBakeries={() => handleSelectDept('d-02')}
                />
              )}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* نافذة ملف المخبز السريعة عند الضغط على رقم ماكينة POS أو اسم صاحب المخبز في جداول UserPortal */}
      {portalSelectedBakery && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPortalSelectedBakery(null)}
        >
          <div
            className="bg-white rounded-2xl border-2 border-[#102A43] shadow-2xl max-w-2xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#102A43] text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10.5px] font-black text-[#C6A15B] block">
                  ملف المخبز الموحد — مرتبط برقم ماكينة POS ({toArabicNumerals(portalSelectedBakery.posNumber)})
                </span>
                <h3 className="text-base font-black">{portalSelectedBakery.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPortalSelectedBakery(null)}
                className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-black cursor-pointer"
              >
                إغلاق ✕
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">اسم صاحب المخبز</span>
                  <span className="font-black text-[#102A43] text-sm">{portalSelectedBakery.ownerName}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">رقم ماكينة POS</span>
                  <span className="num-cell font-black text-[#164E83] text-sm">
                    {toArabicNumerals(portalSelectedBakery.posNumber)}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">رقم المخبز / الحالة</span>
                  <span className="num-cell font-black text-emerald-800 text-sm">
                    #{toArabicNumerals(portalSelectedBakery.bakeryNumber)} ({portalSelectedBakery.operationStatus})
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">القرية / الوحدة المحلية</span>
                  <span className="font-black text-slate-800">
                    {portalSelectedBakery.village} — {portalSelectedBakery.localUnit}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">الحصة الفعلية / التأمينية</span>
                  <span className="num-cell font-black text-[#102A43]">
                    {toArabicNumerals(portalSelectedBakery.actualQuota)} / {toArabicNumerals(portalSelectedBakery.insuranceQuota)} شيكارة
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">المديونية المتبقية بالسجل</span>
                  <span className="num-cell font-black text-red-700">
                    {formatArabicNumber(portalSelectedBakery.remainingDebtEgp || 0)} ج.م
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    const bId = portalSelectedBakery.id;
                    setPortalSelectedBakery(null);
                    setStandaloneStatementBakeryId(bId);
                    handleSelectDept('d-15');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#164E83] hover:bg-[#102A43] text-white font-black cursor-pointer"
                >
                  فتح كشف الحساب المالي والمديونيات
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPortalSelectedBakery(null);
                    handleSelectDept('d-02');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#C6A15B] hover:bg-[#b58f48] text-[#102A43] font-black cursor-pointer"
                >
                  فتح في منظومة الرقابة على المخابز
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
