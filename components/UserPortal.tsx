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
  MessageSquare,
  Bell,
  FileSpreadsheet,
  Sparkles,
  TrendingUp,
  Crown,
  Play,
} from 'lucide-react';
import {
  AuditLog,
  BakeryRecord,
  Branch,
  DailyTaskRecord,
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
  INITIAL_COMPLAINTS,
  getStoredComplaints,
  saveStoredComplaints,
  CitizenComplaintRecord,
} from '@/lib/mock-db';
import { evaluateDocumentExpiry } from '@/lib/bakery-math';
import {
  toArabicNumerals,
  formatArabicNumber,
  formatDateArabic,
  normalizeSearchText,
} from '@/lib/utils';
import dynamic from 'next/dynamic';
import type { GrainSubTabCode } from './DepartmentWorkspace';
import type { TasksModuleSubTab } from './DailyTasksAndInternalChatModule';
import type { InternalTradeScreenId } from './InternalTradeModule';
import AnimatedStatCard from './AnimatedStatCard';
import SmartAutoFitTable, { SmartTableColumn } from './SmartAutoFitTable';
import FactoryResetButton from './FactoryResetButton';
import { TableActionButtons } from './trade/TradeSharedCrudUi';
import AnalyticsDashboardWidget from './AnalyticsDashboardWidget';
import RealtimeToastNotifications from './RealtimeToastNotifications';
import { loadDebtsStore } from '@/lib/debts-data';

const ModuleLoadingFallback = () => (
  <div className="bg-white rounded-2xl border border-slate-200 p-10 flex flex-col items-center justify-center gap-3 text-[#102A43]">
    <div className="w-9 h-9 rounded-full border-4 border-[#102A43]/20 border-t-[#102A43] animate-spin" />
    <p className="text-xs font-black">جارٍ تحميل وحدة القسم...</p>
  </div>
);

const AdminDashboard = dynamic(() => import('./AdminDashboard'), { ssr: false, loading: ModuleLoadingFallback });
const BakeryManagementSystem = dynamic(() => import('./BakeryManagementSystem'), { ssr: false, loading: ModuleLoadingFallback });
const BakeryInspectionModule = dynamic(() => import('./BakeryInspectionModule'), { ssr: false, loading: ModuleLoadingFallback });
const BakeryDebtsModule = dynamic(() => import('./BakeryDebtsModule'), { ssr: false, loading: ModuleLoadingFallback });
const DepartmentWorkspace = dynamic(() => import('./DepartmentWorkspace'), { ssr: false, loading: ModuleLoadingFallback });
const DailyTasksAndInternalChatModule = dynamic(() => import('./DailyTasksAndInternalChatModule'), { ssr: false, loading: ModuleLoadingFallback });
const InternalTradeModule = dynamic(() => import('./InternalTradeModule'), { ssr: false, loading: ModuleLoadingFallback });
const RationCommoditiesModule = dynamic(() => import('./ration/RationCommoditiesModule'), { ssr: false, loading: ModuleLoadingFallback });
const DropdownListsManagerModule = dynamic(() => import('./DropdownListsManagerModule'), { ssr: false, loading: ModuleLoadingFallback });
const GrainMaintenanceModule = dynamic(() => import('./GrainMaintenanceModule'), { ssr: false, loading: ModuleLoadingFallback });
const HrPersonnelModule = dynamic(() => import('./hr/HrPersonnelModule'), { ssr: false, loading: ModuleLoadingFallback });
import {
  loadButaneWarehouses,
  loadCommercialEstablishments,
  loadFuelStations,
} from '@/lib/internal-trade-store';
import {
  loadRationCommodities,
  loadRationMerchants,
} from '@/lib/ration-commodities-store';
import { loadGrainMaintenanceStore } from '@/lib/grain-maintenance-store';
import { loadHrPersonnelStore } from '@/lib/hr-personnel-store';
import { loadChatMessages, loadDailyTasks, loadUnifiedNotifications } from '@/lib/major-debts-tasks-chat-store';
import { loadMasterDocExpiries, subscribeDropdownLists } from '@/lib/dropdown-lists-store';
import { useSystemPreferences } from '@/lib/user-preferences-store';
import { getLocalizedDepartmentDesc, getLocalizedDepartmentName } from '@/lib/i18n';
import { RoleGuard, hasRequiredRole } from './RoleGuard';

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
  const isDarkTheme =
    prefs.themeId === 'dark_mode' ||
    prefs.themeId === 'midnight_aurora' ||
    prefs.themeId === 'obsidian_glass' ||
    prefs.themeId === 'aurora_glass';
  const uiLayout = prefs.uiLayout;
  const isTopRibbonLayout = uiLayout === 'executive_command' || uiLayout === 'glass_split';
  const isCompactRailLayout = uiLayout === 'bento_mosaic';
  const isMinimalLayout = uiLayout === 'ultra_minimal';
  const isRoyalLayout = uiLayout === 'royal_heritage';
  const isCockpitLayout = uiLayout === 'operations_cockpit';
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [allDepartments, setAllDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [bakeries, setBakeries] = useState<BakeryRecord[]>(INITIAL_BAKERIES);
  const [allUsers, setAllUsers] = useState<User[]>(INITIAL_USERS);
  const [regRequests, setRegRequests] = useState<RegistrationRequest[]>(INITIAL_REGISTRATION_REQUESTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [inspections, setInspections] = useState<InspectionRecord[]>(INITIAL_INSPECTIONS);
  const [debtTransactions, setDebtTransactions] = useState<DebtTransactionRecord[]>(INITIAL_DEBT_TRANSACTIONS);
  const [todayRef, setTodayRef] = useState<string>('2026-11-25');

  const [activeDeptId, setActiveDeptId] = useState<string>('d-01');
  const [chartViewMode, setChartViewMode] = useState<'week' | 'month'>('week');
  const [recentTasks, setRecentTasks] = useState<DailyTaskRecord[]>([]);
  const [tradeInitialScreen, setTradeInitialScreen] = useState<InternalTradeScreenId>('dashboard');
  const [grainInitialSubTab, setGrainInitialSubTab] = useState<GrainSubTabCode>('GRAIN');
  const [tasksInitialSubTab, setTasksInitialSubTab] = useState<TasksModuleSubTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [sidebarSearch, setSidebarSearch] = useState<string>('');
  const [pinnedDeptIds, setPinnedDeptIds] = useState<string[]>(['d-01', 'd-02', 'd-03', 'd-04', 'd-07', 'd-26', 'd-25', 'd-12']);
  const [openSidebarGroups, setOpenSidebarGroups] = useState<Record<string, boolean>>({
    grp_cmd: true,
    grp_bakery: true,
    grp_trade: true,
    grp_ration: true,
    grp_grain: true,
    grp_citizens: true,
    grp_hr: true,
    grp_admin: true,
  });
  const [liveExtraCounts, setLiveExtraCounts] = useState({
    tradeMerchants: 5,
    gasEntities: 6,
    rationItemsAndMerchants: 10,
    managedDocs: 4,
    hrEmployees: 8,
    grainEntities: 10,
    debtsCount: 6,
    tasksCount: 6,
    unreadChat: 0,
    unreadNotifs: 0,
  });

  // Complaints table state
  const [complaintsList, setComplaintsList] = useState<CitizenComplaintRecord[]>(INITIAL_COMPLAINTS);
  const [compSearch, setCompSearch] = useState('');
  const [compSort, setCompSort] = useState<{ key: string; asc: boolean }>({ key: 'date', asc: false });
  const [selectedCompIds, setSelectedCompIds] = useState<string[]>([]);
  const [compPinnedCols, setCompPinnedCols] = useState<string[]>(['citizen']);

  // Debt statement focus when opened directly from DEBTS sidebar tab
  const [standaloneStatementBakeryId, setStandaloneStatementBakeryId] = useState<string>(INITIAL_BAKERIES[0]?.id || '');
  const [portalSelectedBakery, setPortalSelectedBakery] = useState<BakeryRecord | null>(null);

  const refreshAllPortalCounts = React.useCallback(() => {
    setBranches(getStoredBranches());
    setAllDepartments(getStoredDepartments());
    setBakeries(getStoredBakeries());
    setAllUsers(getStoredUsers());
    setRegRequests(getStoredRegistrationRequests());
    setAuditLogs(getStoredAuditLogs());
    setInspections(getStoredInspections());
    setDebtTransactions(getStoredDebtTransactions());
    setComplaintsList(getStoredComplaints());

    const msgs = loadChatMessages();
    const unreadChat = msgs.filter(
      (m) =>
        !m.isDeletedFromUi &&
        m.senderId !== currentUser.id &&
        !m.readByUserIds.includes(currentUser.id)
    ).length;
    const sysNotifs = loadUnifiedNotifications();
    const unreadNotifs = sysNotifs.filter(
      (n) => !n.isRead && (n.recipientUserId === 'ALL' || n.recipientUserId === currentUser.id)
    ).length;
    const allTasks = loadDailyTasks();
    setRecentTasks(allTasks.slice(0, 4));
    const gs = loadGrainMaintenanceStore();
    const grainTotal =
      gs.warehouses.length + gs.mills.length + gs.refrigerators.length + gs.assets.length;
    let debtsTotal = 0;
    try {
      debtsTotal = loadDebtsStore().debts.length;
    } catch {
      debtsTotal = 0;
    }
    setLiveExtraCounts({
      tradeMerchants: loadCommercialEstablishments().length,
      gasEntities: loadButaneWarehouses().length + loadFuelStations().length,
      rationItemsAndMerchants: loadRationCommodities().length + loadRationMerchants().length,
      managedDocs: loadMasterDocExpiries().length,
      hrEmployees: loadHrPersonnelStore().employees.length,
      grainEntities: grainTotal,
      debtsCount: debtsTotal,
      tasksCount: allTasks.length,
      unreadChat,
      unreadNotifs,
    });
  }, [currentUser.id]);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setTodayRef(new Date().toISOString().slice(0, 10));
      refreshAllPortalCounts();

      try {
        const savedTab = sessionStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
        if (savedTab) {
          if (savedTab === 'd-06') {
            setTradeInitialScreen('butane_management');
            setActiveDeptId('d-04');
          } else if (savedTab === 'd-15') {
            setTradeInitialScreen('field_inspection');
            setActiveDeptId('d-04');
          } else if (savedTab === 'd-16') {
            setTradeInitialScreen('field_violations');
            setActiveDeptId('d-04');
          } else if (savedTab === 'd-09') {
            setGrainInitialSubTab('SILOS');
            setActiveDeptId('d-08');
          } else if (savedTab === 'd-10') {
            setGrainInitialSubTab('MILLS');
            setActiveDeptId('d-08');
          } else if (savedTab === 'd-11') {
            setGrainInitialSubTab('COLD');
            setActiveDeptId('d-08');
          } else if (savedTab !== 'd-19') {
            setActiveDeptId(savedTab);
          }
        }
      } catch {
        // Ignore storage errors
      }
    });
    const onDepartmentsUpdated = () => {
      refreshAllPortalCounts();
    };
    const onOpenTasksSubTab = (ev: Event) => {
      const custom = ev as CustomEvent<{ subTab?: TasksModuleSubTab }>;
      if (custom.detail?.subTab) {
        setTasksInitialSubTab(custom.detail.subTab);
      }
      setActiveDeptId('d-25');
      setMobileMenuOpen(false);
      try {
        sessionStorage.setItem(ACTIVE_TAB_STORAGE_KEY, 'd-25');
      } catch {
        // Ignore storage errors
      }
    };
    const onChatUpdated = () => {
      refreshAllPortalCounts();
    };
    const onGlobalNavigate = (ev: Event) => {
      const custom = ev as CustomEvent<{
        departmentId?: string;
        departmentCode?: string;
        recordId?: string;
      }>;
      const detail = custom.detail;
      if (!detail) return;
      const depts = getStoredDepartments();
      let targetDeptId = detail.departmentId;
      if (!targetDeptId && detail.departmentCode) {
        const found = depts.find((d) => d.code === detail.departmentCode);
        if (found) targetDeptId = found.id;
      }
      if (targetDeptId) {
        setActiveDeptId(targetDeptId);
        setMobileMenuOpen(false);
        try {
          sessionStorage.setItem(ACTIVE_TAB_STORAGE_KEY, targetDeptId);
        } catch {
          // ignore
        }
      }
      if (detail.recordId && (detail.departmentCode === 'BAK' || targetDeptId === 'd-02')) {
        const foundBakery = getStoredBakeries().find((b) => b.id === detail.recordId);
        if (foundBakery) {
          setPortalSelectedBakery(foundBakery);
        }
      }
    };
    const unsubDropdowns = subscribeDropdownLists(() => {
      refreshAllPortalCounts();
    });
    window.addEventListener('gharbia-departments-updated', onDepartmentsUpdated);
    window.addEventListener('gharbia-open-tasks-subtab', onOpenTasksSubTab);
    window.addEventListener('gharbia-chat-updated', onChatUpdated);
    window.addEventListener('gharbia-audit-log-added', refreshAllPortalCounts);
    window.addEventListener('gharbia-inspections-reset', refreshAllPortalCounts);
    window.addEventListener('gharbia-global-navigate', onGlobalNavigate);
    window.addEventListener('storage', refreshAllPortalCounts);
    return () => {
      cancelAnimationFrame(frameId);
      unsubDropdowns();
      window.removeEventListener('gharbia-departments-updated', onDepartmentsUpdated);
      window.removeEventListener('gharbia-open-tasks-subtab', onOpenTasksSubTab);
      window.removeEventListener('gharbia-chat-updated', onChatUpdated);
      window.removeEventListener('gharbia-audit-log-added', refreshAllPortalCounts);
      window.removeEventListener('gharbia-inspections-reset', refreshAllPortalCounts);
      window.removeEventListener('gharbia-global-navigate', onGlobalNavigate);
      window.removeEventListener('storage', refreshAllPortalCounts);
    };
  }, [currentUser.id, refreshAllPortalCounts]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      refreshAllPortalCounts();
    });
    return () => cancelAnimationFrame(id);
  }, [activeDeptId, refreshAllPortalCounts]);

  const handleSelectDept = (deptId: string) => {
    let resolvedId = deptId;
    if (deptId === 'd-04') {
      setTradeInitialScreen('dashboard');
    } else if (deptId === 'd-06') {
      setTradeInitialScreen('butane_management');
      resolvedId = 'd-04';
    } else if (deptId === 'd-15') {
      setTradeInitialScreen('field_inspection');
      resolvedId = 'd-04';
    } else if (deptId === 'd-16') {
      setTradeInitialScreen('field_violations');
      resolvedId = 'd-04';
    } else if (deptId === 'd-08') {
      setGrainInitialSubTab('GRAIN');
    } else if (deptId === 'd-09') {
      setGrainInitialSubTab('SILOS');
      resolvedId = 'd-08';
    } else if (deptId === 'd-10') {
      setGrainInitialSubTab('MILLS');
      resolvedId = 'd-08';
    } else if (deptId === 'd-11') {
      setGrainInitialSubTab('COLD');
      resolvedId = 'd-08';
    }
    setActiveDeptId(resolvedId);
    setMobileMenuOpen(false);
    try {
      sessionStorage.setItem(ACTIVE_TAB_STORAGE_KEY, resolvedId);
    } catch {
      // Ignore storage errors
    }
  };

  const currentBranch = branches.find(
    (b) => b.id === (activeBranchId || currentUser.primaryBranchId)
  );

  const ADMIN_ONLY_DEPT_CODES = useMemo(() => new Set(['USERS', 'ROLES', 'AUDIT', 'BACK', 'SETT']), []);

  const allowedDepartments = useMemo(
    () =>
      allDepartments.filter((d) => {
        if (ADMIN_ONLY_DEPT_CODES.has(d.code) && !hasRequiredRole(currentUser.role, undefined, true)) {
          return false;
        }
        return (
          currentUser.departmentIds.includes(d.id) ||
          currentUser.role === 'super_admin' ||
          currentUser.role === 'admin'
        );
      }),
    [allDepartments, currentUser, ADMIN_ONLY_DEPT_CODES]
  );

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
            const newComp: CitizenComplaintRecord = {
              id: `comp-${Date.now()}`,
              citizen: 'مواطن جديد — مركز المحلة',
              phone: '01000000000',
              issue: 'بلاغ تمويني جديد قيد الفحص الميداني',
              status: 'جاري الفحص والتفتيش',
              date: todayRef,
            };
            setComplaintsList((prev) => {
              const next = [newComp, ...prev];
              saveStoredComplaints(next);
              return next;
            });
            setCompNotice('تمت إضافة بلاغ جديد إلى سجل الشكاوى.');
          }}
          onEdit={() => {
            setComplaintsList((prev) => {
              const next = prev.map((x) =>
                x.id === c.id ? { ...x, status: 'تم الحل وإعادة التفعيل' } : x
              );
              saveStoredComplaints(next);
              return next;
            });
            setCompNotice(`تم تحديث حالة شكوى (${c.citizen}) إلى تم الحل.`);
          }}
          onDelete={() => {
            setComplaintsList((prev) => {
              const next = prev.filter((x) => x.id !== c.id);
              saveStoredComplaints(next);
              return next;
            });
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

  // الأقسام الفرعية المدمجة والأقسام الإدارية المستبعدة من الشريط الأيمن بناءً على طلب المستخدم
  const CONSOLIDATED_SIDEBAR_SUB_CODES = useMemo(
    () =>
      new Set([
        'CTRL',
        'GAS',
        'INSP',
        'VIOL',
        'SILOS',
        'MILLS',
        'COLD',
        'REP',
        'BACK',
        'SETT',
        'FIN',
        'STORE',
        'ROLES',
        'DOCS',
      ]),
    []
  );

  const filteredSidebarDepts = useMemo(() => {
    const visibleDepts = allowedDepartments.filter((d) => !CONSOLIDATED_SIDEBAR_SUB_CODES.has(d.code));
    const q = normalizeSearchText(sidebarSearch);
    const list = q
      ? visibleDepts.filter(
          (d) => normalizeSearchText(`${d.arabicName} ${d.description}`).includes(q)
        )
      : visibleDepts;

    return [...list].sort((a, b) => {
      const aPinned = pinnedDeptIds.includes(a.id) ? 1 : 0;
      const bPinned = pinnedDeptIds.includes(b.id) ? 1 : 0;
      return bPinned - aPinned;
    });
  }, [allowedDepartments, CONSOLIDATED_SIDEBAR_SUB_CODES, sidebarSearch, pinnedDeptIds]);

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

  const grainEntitiesCount = liveExtraCounts.grainEntities;

  // عدادات حية رقمية مضبوطة ومتزامنة بجانب كل تبويب في شريط القوائم الأيمن
  const deptLiveCounts = useMemo<Record<string, number>>(
    () => ({
      DASH: ultraMetrics.totalBakeries,
      BAK: ultraMetrics.totalBakeries,
      DEBTS:
        liveExtraCounts.debtsCount ||
        bakeries.filter((b) => !b.isArchived && (b.remainingDebtEgp || 0) > 0).length ||
        debtTransactions.length,
      LISTS: liveExtraCounts.managedDocs,
      TASKS: liveExtraCounts.tasksCount,
      TRADE: liveExtraCounts.tradeMerchants + liveExtraCounts.gasEntities,
      GAS: liveExtraCounts.gasEntities,
      COMM: liveExtraCounts.rationItemsAndMerchants,
      GRAIN: grainEntitiesCount,
      HR: liveExtraCounts.hrEmployees,
      INSP: inspections.length,
      VIOL: ultraMetrics.totalViolations,
      COMP: complaintsList.length,
      USERS: allUsers.length,
      AUDIT: auditLogs.length,
    }),
    [
      ultraMetrics,
      bakeries,
      debtTransactions.length,
      liveExtraCounts,
      grainEntitiesCount,
      inspections.length,
      complaintsList.length,
      allUsers.length,
      auditLogs.length,
    ]
  );

  // تنظيم القائمة الجانبية مع وضع إدارة المهام اليومية والمتابعة مباشرة بعد إدارة القوائم المنسدلة وإظهار الموارد البشرية وسجل التدقيق
  const sidebarGroupedSections = useMemo(() => {
    const groupsDef: { id: string; title: string; codes: string[] }[] = [
      { id: 'grp_cmd', title: t('grp_cmd'), codes: ['DASH'] },
      { id: 'grp_bakery', title: t('grp_bakery'), codes: ['BAK', 'DEBTS', 'LISTS', 'TASKS'] },
      { id: 'grp_trade', title: t('grp_trade'), codes: ['TRADE'] },
      { id: 'grp_ration', title: t('grp_ration'), codes: ['COMM'] },
      { id: 'grp_grain', title: t('grp_grain'), codes: ['GRAIN'] },
      { id: 'grp_hr', title: isRtl ? 'الموارد البشرية وشؤون العاملين' : 'Human Resources & Personnel', codes: ['HR'] },
      { id: 'grp_citizens', title: t('grp_citizens'), codes: ['COMP'] },
      {
        id: 'grp_admin',
        title: t('grp_admin'),
        codes: ['USERS', 'AUDIT'],
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

  const firstName = currentUser.fullName.split(' ')[0] || currentUser.fullName;

  const weeklyBarSeries = useMemo(() => {
    const mult = chartViewMode === 'month' ? 3 : 1;
    const items = [
      { label: 'المخابز', value: Math.max(12, ultraMetrics.totalBakeries * mult), grad: 'from-[#DCECEF] to-[#94C9CE]' },
      { label: 'التجارة', value: Math.max(18, (liveExtraCounts.tradeMerchants + 14) * mult), grad: 'from-[#9BD1D6] to-[#5CA3AE]' },
      { label: 'التموين', value: Math.max(15, (liveExtraCounts.rationItemsAndMerchants + 8) * mult), grad: 'from-[#7EBCC5] to-[#4A8A96]' },
      { label: 'الرقابة', value: Math.max(22, (inspections.length + 18) * mult), grad: 'from-[#3B717E] to-[#254A58]' },
      { label: 'الحبوب', value: Math.max(14, (grainEntitiesCount + 12) * mult), grad: 'from-[#88B8D6] to-[#588BAE]' },
      { label: 'الموظفين', value: Math.max(16, (liveExtraCounts.hrEmployees + 11) * mult), grad: 'from-[#4B8196] to-[#2B5368]' },
      { label: 'المهام', value: Math.max(13, (recentTasks.length + 12) * mult), grad: 'from-[#8A8CC4] to-[#5E619B]' },
    ];
    const maxVal = Math.max(...items.map((i) => i.value), 1);
    return items.map((i) => ({ ...i, pct: Math.max(24, Math.round((i.value / maxVal) * 100)) }));
  }, [chartViewMode, ultraMetrics.totalBakeries, liveExtraCounts, inspections.length, grainEntitiesCount, recentTasks.length]);

  const sectorDonutSegments = useMemo(() => {
    const raw = [
      { label: 'المخابز البلدية', value: Math.max(ultraMetrics.totalBakeries, 12), color: '#5D9AC8' },
      { label: 'التجارة والوقود', value: Math.max(liveExtraCounts.tradeMerchants + liveExtraCounts.gasEntities, 8), color: '#2F6C7B' },
      { label: 'المهام والرقابة', value: Math.max(inspections.length + recentTasks.length, 6), color: '#7D7CB8' },
      { label: 'صيانة الحبوب', value: Math.max(grainEntitiesCount, 5), color: '#AEBFC9' },
      { label: 'الموارد البشرية', value: Math.max(liveExtraCounts.hrEmployees, 4), color: '#74B2AF' },
    ];
    const total = raw.reduce((s, x) => s + x.value, 0) || 1;
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    return raw.map((seg) => {
      const share = Math.round((seg.value / total) * 100);
      const dashLength = (seg.value / total) * circumference;
      const item = {
        ...seg,
        share,
        dashArray: `${dashLength} ${circumference - dashLength}`,
        dashOffset: -offset,
      };
      offset += dashLength;
      return item;
    });
  }, [ultraMetrics.totalBakeries, liveExtraCounts, inspections.length, recentTasks.length, grainEntitiesCount]);

  const renderSidebarTabs = (isMobile = false) => (
    <div className="flex flex-col h-full">
      {/* Top User Avatar & Greeting + Collapse Controls */}
      <div className="flex flex-col items-center text-center pb-4 mb-3 border-b border-white/12 relative">
        <div className="w-full flex items-center justify-between mb-2">
          {(!sidebarCollapsed || isMobile) && (
            <span className="text-[10px] font-black text-[#94C9CE] truncate">
              {currentBranch?.arabicName || 'تموين الغربية'}
            </span>
          )}
          <div className="flex items-center gap-1 mx-auto lg:mx-0 shrink-0">
            {isMobile ? (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 bg-[#314D66] text-white rounded-full cursor-pointer"
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
                    className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                      isSidebarPinned ? 'bg-[#DCECEF] text-[#1E3346]' : 'bg-[#314D66] text-slate-300 hover:text-white'
                    }`}
                    title={isSidebarPinned ? 'إلغاء تثبيت القائمة' : 'تثبيت القائمة مفتوحة'}
                  >
                    {isSidebarPinned ? <Pin className="w-3 h-3" /> : <PinOff className="w-3 h-3" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSidebarCollapsed(!sidebarCollapsed);
                    if (!sidebarCollapsed) setIsSidebarPinned(false);
                  }}
                  className="p-1.5 bg-[#314D66] hover:bg-[#3B717E] text-[#94C9CE] rounded-full transition-colors cursor-pointer"
                  title={sidebarCollapsed ? 'توسيع القائمة الجانبية' : 'طي القائمة الجانبية'}
                >
                  {sidebarCollapsed ? <PanelRightOpen className="w-3.5 h-3.5" /> : <PanelRightClose className="w-3.5 h-3.5" />}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-[#94C9CE] via-[#4B8592] to-[#253B4F] border-2 border-white/65 shadow-lg flex items-center justify-center text-white font-black text-xl">
          {currentUser.fullName.charAt(0)}
          <span className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#253B4F]" />
        </div>

        {(!sidebarCollapsed || isMobile) && (
          <div className="mt-2 min-w-0 w-full">
            <h3 className="text-sm font-black text-white truncate">أهلاً، {firstName}!</h3>
            <p className="text-[10.5px] font-bold text-[#94C9CE] truncate">{currentUser.jobTitle}</p>
          </div>
        )}
      </div>

      {/* Quick Search Inside Sidebar */}
      {(!sidebarCollapsed || isMobile) && (
        <div className="relative mb-3">
          <Search className={`w-3.5 h-3.5 text-slate-300 absolute ${isRtl ? 'right-3' : 'left-3'} top-2.5`} />
          <input
            type="text"
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            placeholder={t('searchDepartments')}
            className={`w-full ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-1.5 bg-[#182938]/75 border border-white/12 rounded-full text-[11px] text-white font-bold placeholder:text-slate-300 focus:outline-none focus:border-[#94C9CE]`}
          />
        </div>
      )}

      {/* القائمة الجانبية المنظمة حسب التخصص */}
      <nav
        aria-label={t('departments')}
        className="space-y-2.5 max-h-[calc(100vh-22rem)] overflow-y-auto compact-table-scroll pl-0.5 flex-1"
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
                  className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-black text-[#94C9CE] hover:text-white cursor-pointer border-b border-white/10"
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
                      className={`relative w-full flex items-center justify-between gap-1.5 py-2.5 rounded-2xl text-[11px] font-black transition-all cursor-pointer ${isRtl ? 'text-right' : 'text-left'} border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#94C9CE] ${
                        isSubNested && (!sidebarCollapsed || isMobile)
                          ? isRtl
                            ? 'pr-4 pl-2.5'
                            : 'pl-4 pr-2.5'
                          : 'px-2.5'
                      } ${
                        isActive
                          ? 'text-[#1E3346] border-white/80 shadow-[0_6px_16px_rgba(12,24,36,0.28)]'
                          : 'bg-white/[0.04] border-transparent text-slate-100 hover:bg-white/[0.11] hover:border-white/15'
                      }`}
                      title={localizedDeptName}
                    >
                      {isActive && (
                        <motion.span
                          layoutId={isMobile ? 'mobileActiveTabBg' : 'desktopActiveTabBg'}
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                          className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#E5F1F3] to-[#C2DCE0] z-0"
                        />
                      )}

                      <div className="relative z-10 flex items-center gap-2.5 min-w-0 flex-1">
                        <span
                          className={`relative w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isActive ? 'bg-[#253B4F] text-[#94C9CE]' : 'bg-[#182938]/75 text-[#94C9CE]'
                          }`}
                        >
                          {renderDeptIcon(dept.iconName, 'w-3.5 h-3.5')}
                          {sidebarCollapsed && !isMobile && typeof liveCount === 'number' && (
                            <span className="num-cell tabular-nums absolute -top-1.5 -left-1.5 min-w-[18px] h-[16px] px-1 rounded-full bg-[#3B717E] text-white border border-white/40 text-[9px] font-black flex items-center justify-center shadow-xs">
                              {isRtl ? toArabicNumerals(liveCount) : liveCount}
                            </span>
                          )}
                        </span>
                        {(!sidebarCollapsed || isMobile) && (
                          <span className={`leading-snug break-words whitespace-normal ${isRtl ? 'text-right' : 'text-left'}`}>
                            {localizedDeptName}
                          </span>
                        )}
                      </div>

                      {(!sidebarCollapsed || isMobile) && (
                        <div className="relative z-10 flex items-center gap-1.5 shrink-0">
                          {typeof liveCount === 'number' && (
                            <span
                              className={`num-cell tabular-nums min-w-[26px] h-[20px] px-1.5 rounded-lg text-[10px] font-black inline-flex items-center justify-center leading-none shadow-2xs transition-colors ${
                                isActive
                                  ? 'bg-[#1E3346] text-[#94C9CE] border border-[#1E3346]/20'
                                  : 'bg-[#142331]/90 text-[#94C9CE] border border-[#94C9CE]/25'
                              }`}
                              title={`إجمالي السجلات: ${isRtl ? toArabicNumerals(liveCount) : liveCount}`}
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
                                  ? 'text-[#253B4F]'
                                  : 'text-[#94C9CE]'
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

      {/* Bottom Spotlight Card inside Sidebar */}
      {(!sidebarCollapsed || isMobile) && (
        <div className="mt-3 rounded-[20px] bg-gradient-to-b from-[#1E3142] to-[#172635] border border-white/10 p-3.5 text-center space-y-2 shadow-inner">
          <div className="w-9 h-9 mx-auto rounded-full bg-white/12 border border-white/20 flex items-center justify-center text-[#E5F1F3]">
            <Crown className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-xs font-black text-white">المهام والمحادثات</p>
            <p className="text-[10px] font-bold text-slate-300 leading-snug mt-0.5">
              متابعة فورية بين الموظفين وتصدير التقارير
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setTasksInitialSubTab('internal_chat');
              handleSelectDept('d-25');
            }}
            className="w-full py-2 px-3 rounded-full bg-gradient-to-b from-[#4E8997] to-[#376A77] hover:brightness-110 text-white text-[11px] font-black shadow-md cursor-pointer transition-all"
          >
            فتح المحادثات الآن
          </button>
        </div>
      )}
    </div>
  );

  const workspaceFrameClass = (() => {
    if (isDarkTheme) {
      return 'rounded-[24px] bg-[#0F172A]/80 border border-slate-700/70 shadow-2xl p-3 sm:p-4 lg:p-5';
    }
    if (isMinimalLayout) {
      return 'rounded-2xl bg-white/95 border border-slate-200 p-3 sm:p-5';
    }
    if (isRoyalLayout) {
      return 'rounded-2xl bg-white/90 border-2 border-[#C6A15B]/45 shadow-md p-3 sm:p-4 lg:p-5';
    }
    if (isTopRibbonLayout) {
      return 'rounded-2xl bg-white/75 backdrop-blur-sm border border-white/80 shadow-sm p-3 sm:p-4 lg:p-5';
    }
    return 'app-workspace-frame rounded-[30px] bg-[#CEDAE3]/85 backdrop-blur-md border border-white/65 shadow-[0_24px_60px_-15px_rgba(24,42,60,0.35)] p-3 sm:p-4 lg:p-5';
  })();

  const cardSurfaceClass = isDarkTheme
    ? 'bg-[#131E31]/95 border border-slate-700/80 text-slate-100 shadow-lg'
    : isMinimalLayout
    ? 'bg-white border border-slate-200 text-[#1E3346]'
    : isRoyalLayout
    ? 'bg-white border border-[#C6A15B]/45 text-[#102A43] shadow-sm'
    : 'bg-gradient-to-br from-[#D7E2EB]/90 to-[#C8D6E2]/90 border border-white/75 text-[#1E3346] shadow-[0_12px_26px_-12px_rgba(30,51,70,0.24)]';

  const cardHeadingClass = isDarkTheme ? 'text-white' : 'text-[#1E3346]';
  const cardMutedClass = isDarkTheme ? 'text-slate-300' : 'text-[#4B6378]';

  return (
    <div
      className={`${workspaceFrameClass} flex flex-col ${
        isTopRibbonLayout ? '' : 'lg:flex-row'
      } gap-5 min-h-[calc(100vh-8rem)] font-sans transition-all`}
    >
      {/* Mobile Sidebar Trigger */}
      <div className="lg:hidden flex items-center justify-between bg-[#253B4F] text-white px-4 py-2.5 rounded-2xl border border-white/15 print:hidden">
        <div className="flex items-center gap-2 text-xs font-black">
          {renderDeptIcon(activeDept?.iconName || 'LayoutDashboard', 'w-4 h-4 text-[#94C9CE]')}
          <span>{activeDept?.arabicName}</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="px-3.5 py-1.5 bg-[#DCECEF] text-[#1E3346] rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
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
              className="app-sidebar w-[290px] max-w-[85vw] bg-gradient-to-b from-[#253B4F] via-[#213649] to-[#1A2B3B] text-white p-4 shadow-2xl border-l border-white/15 h-full"
            >
              {renderSidebarTabs(true)}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Executive Command Horizontal Top Department Ribbon (when uiLayout === 'executive_command') */}
      {isTopRibbonLayout && (
        <nav
          aria-label={t('departments')}
          className="hidden lg:flex flex-col gap-2.5 p-3 rounded-2xl border print:hidden"
          style={{
            backgroundColor: 'var(--app-header-bg, #102A43)',
            borderColor: 'var(--app-header-border, #1E3A5F)',
            color: 'var(--app-header-text, #FFFFFF)',
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center font-black text-sm">
                {currentUser.fullName.charAt(0)}
              </div>
              <div className="text-xs font-black">
                {firstName} · <span className="opacity-80 font-bold">{currentUser.jobTitle}</span>
              </div>
            </div>
            <div className="relative w-64">
              <Search className={`w-3.5 h-3.5 text-slate-300 absolute ${isRtl ? 'right-3' : 'left-3'} top-2`} />
              <input
                type="text"
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                placeholder={t('searchDepartments')}
                className={`w-full ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-1.5 bg-white/10 border border-white/15 rounded-xl text-[11px] text-white font-bold placeholder:text-slate-300 focus:outline-none`}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {filteredSidebarDepts.map((dept) => {
              const isActive = activeDeptId === dept.id;
              const liveCount = deptLiveCounts[dept.code];
              const localizedDeptName = getLocalizedDepartmentName(dept.code, dept.arabicName, prefs.language);
              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => handleSelectDept(dept.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                    isActive
                      ? 'bg-white text-[#102A43] border-white shadow-sm'
                      : 'bg-white/10 text-white/95 border-white/10 hover:bg-white/20'
                  }`}
                >
                  {renderDeptIcon(dept.iconName, 'w-3.5 h-3.5 shrink-0')}
                  <span>{localizedDeptName}</span>
                  {typeof liveCount === 'number' && (
                    <span className="num-cell text-[10px] opacity-75">
                      ({isRtl ? toArabicNumerals(liveCount) : liveCount})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Desktop Sidebar (Floating Slate, Compact Icon Rail for Bento, or Sovereign Frame) */}
      {!isTopRibbonLayout && (
        <motion.aside
          initial={false}
          animate={{
            width:
              sidebarCollapsed || isCompactRailLayout
                ? '86px'
                : effectiveDensity === 'compact'
                ? '252px'
                : effectiveDensity === 'spacious'
                ? '292px'
                : '276px',
          }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onMouseEnter={() => (!isSidebarPinned || isCompactRailLayout) && setSidebarCollapsed(false)}
          onMouseLeave={() => (!isSidebarPinned || isCompactRailLayout) && setSidebarCollapsed(true)}
          className={`app-sidebar hidden lg:flex flex-col bg-gradient-to-b from-[#253B4F] via-[#213649] to-[#1A2B3B] text-white ${
            isMinimalLayout || isRoyalLayout ? 'rounded-2xl' : 'rounded-[24px]'
          } shadow-[0_18px_40px_-12px_rgba(16,28,40,0.45)] border border-white/15 shrink-0 print:hidden overflow-hidden p-3.5 self-start sticky top-20`}
        >
          {renderSidebarTabs(false)}
        </motion.aside>
      )}

      {/* Main Content Viewport */}
      <section className="flex-1 min-w-0 space-y-4">
        {/* Top Workspace Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={`text-lg sm:text-xl font-black tracking-tight ${cardHeadingClass}`}>
              {activeDept ? getLocalizedDepartmentName(activeDept.code, activeDept.arabicName, prefs.language) : 'لوحة القيادة المركزية'}
            </h2>
            <span className={`hidden sm:inline text-[11px] font-bold ${cardMutedClass}`}>
              · {currentBranch?.arabicName || 'محافظة الغربية'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 flex-1 sm:flex-initial justify-end">
            <div className="relative flex-1 sm:w-64 max-w-xs">
              <Search className={`w-4 h-4 text-[#556C80] absolute ${isRtl ? 'right-3.5' : 'left-3.5'} top-2.5`} />
              <input
                type="text"
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                placeholder="بحث سريع في الأقسام والخدمات..."
                className={`w-full ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 rounded-full bg-[#DCE5EC]/90 border border-white/85 text-xs font-bold text-[#1E3346] placeholder:text-[#5E7488] shadow-inner focus:outline-none focus:ring-2 focus:ring-[#3B717E]`}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setTasksInitialSubTab('internal_chat');
                handleSelectDept('d-25');
              }}
              className="relative w-10 h-10 rounded-full bg-gradient-to-b from-[#EFF5F9] to-[#CFDDE7] hover:brightness-105 border border-white/85 shadow-sm flex items-center justify-center text-[#253B4F] cursor-pointer"
              title="المحادثات الداخلية بين الموظفين"
            >
              <MessageSquare className="w-4.5 h-4.5" />
              {liveExtraCounts.unreadChat > 0 && (
                <span className="num-cell absolute -top-1 -right-1 px-1.5 py-0.2 bg-[#3B717E] text-white rounded-full text-[9.5px] font-black">
                  {toArabicNumerals(liveExtraCounts.unreadChat)}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setTasksInitialSubTab('notifications');
                handleSelectDept('d-25');
              }}
              className="relative w-10 h-10 rounded-full bg-gradient-to-b from-[#EFF5F9] to-[#CFDDE7] hover:brightness-105 border border-white/85 shadow-sm flex items-center justify-center text-[#253B4F] cursor-pointer"
              title="مركز التنبيهات والإشعارات"
            >
              <Bell className="w-4.5 h-4.5" />
              {liveExtraCounts.unreadNotifs > 0 && (
                <span className="num-cell absolute -top-1 -right-1 px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[9.5px] font-black">
                  {toArabicNumerals(liveExtraCounts.unreadNotifs)}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setTasksInitialSubTab('reports_center');
                handleSelectDept('d-25');
              }}
              className="w-10 h-10 rounded-full bg-gradient-to-b from-[#6FAAB3] to-[#3B717E] hover:brightness-110 border border-white/50 shadow-sm flex items-center justify-center text-white cursor-pointer"
              title="مركز التقارير الموحد"
            >
              <FileSpreadsheet className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

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
              <div className="space-y-4">
                {/* 1. Central Command Hero Banner with Architectural Directorate Visual */}
                <div
                  className={`relative overflow-hidden ${
                    isMinimalLayout || isRoyalLayout ? 'rounded-2xl' : 'rounded-[24px]'
                  } p-5 sm:p-6 text-white shadow-[0_16px_34px_-12px_rgba(24,42,60,0.45)] border ${
                    isRoyalLayout ? 'border-[#C6A15B]/70' : 'border-white/20'
                  }`}
                  style={{ backgroundColor: 'var(--app-header-bg, #1E3344)' }}
                >
                  <Image
                    src="/images/dashboard/supply_command_hero.jpg"
                    alt="لوحة القيادة المركزية — مديرية التموين بالغربية"
                    fill
                    sizes="100vw"
                    className="object-cover opacity-35"
                    referrerPolicy="no-referrer"
                    priority
                  />
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(105deg, rgba(16,42,67,0.94) 0%, rgba(28,58,82,0.88) 55%, rgba(20,52,66,0.78) 100%)',
                    }}
                  />

                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
                    <div className="flex items-center gap-4">
                      <div
                        className="relative w-16 h-16 rounded-2xl overflow-hidden bg-white shrink-0 border-2 shadow-md"
                        style={{ borderColor: 'var(--app-accent, #94C9CE)' }}
                      >
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
                        <span
                          className="text-[11px] font-black block mb-0.5"
                          style={{ color: 'var(--app-accent, #94C9CE)' }}
                        >
                          {t('republicSubtitle')}
                        </span>
                        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                          مرحباً، {currentUser.fullName}
                        </h2>
                        <p className="text-xs text-slate-200 font-bold mt-1">
                          {t('centralDashboardTitle')} — متابعة فورية للمخابز والمديونيات والتجارة الداخلية والرقابة
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSelectDept('d-02')}
                        className="px-5 py-2.5 rounded-xl bg-white text-[#102A43] hover:bg-slate-100 font-black text-xs flex items-center gap-2 shadow-md cursor-pointer whitespace-nowrap"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{t('openBakerySystem')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTasksInitialSubTab('internal_chat');
                          handleSelectDept('d-25');
                        }}
                        className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-black text-xs flex items-center gap-2 border border-white/25 cursor-pointer whitespace-nowrap"
                      >
                        <MessageSquare className="w-4 h-4" style={{ color: 'var(--app-accent, #94C9CE)' }} />
                        <span>المحادثات الداخلية</span>
                        {(liveExtraCounts.unreadChat + liveExtraCounts.unreadNotifs) > 0 && (
                          <span className="num-cell px-1.5 py-0.5 rounded-md bg-red-600 text-white text-[10px]">
                            {toArabicNumerals(liveExtraCounts.unreadChat + liveExtraCounts.unreadNotifs)}
                          </span>
                        )}
                      </button>

                      <FactoryResetButton
                        sectionName="لوحة القيادة المركزية"
                        sectionKey="central_dashboard"
                        currentUser={currentUser}
                        tableSummary={[
                          { tableName: 'معاملات المديونيات اليومية', count: debtTransactions.length },
                          { tableName: 'محاضر التفتيش والحملات', count: inspections.length },
                          { tableName: 'سجل شكاوى المواطنين', count: complaintsList.length },
                        ]}
                        compact
                        onConfirmReset={() => {
                          setDebtTransactions([]);
                          saveStoredDebtTransactions([]);
                          setInspections([]);
                          saveStoredInspections([]);
                          setComplaintsList([]);
                          saveStoredComplaints([]);
                          refreshAllPortalCounts();
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Row of 4 Primary KPI Cards */}
                <div
                  className={`grid grid-cols-1 sm:grid-cols-2 ${
                    isRoyalLayout ? 'lg:grid-cols-3' : 'lg:grid-cols-4'
                  } gap-4`}
                >
                  <AnimatedStatCard
                    title="إجمالي المخابز المسجلة"
                    value={ultraMetrics.totalBakeries}
                    unit="مخبز بلدي مدعم"
                    indicator="نشط بالمنظومة"
                    icon={Flame}
                    theme="teal"
                    delay={0}
                    onClick={() => handleSelectDept('d-02')}
                  />
                  <AnimatedStatCard
                    title="إجمالي المستخدمين"
                    value={ultraMetrics.totalUsers}
                    unit="حساب وكادر إداري"
                    indicator={`${toArabicNumerals(ultraMetrics.totalBranches)} إدارات`}
                    icon={Users}
                    theme="blue"
                    delay={0.05}
                    onClick={() => handleSelectDept('d-22')}
                  />
                  <AnimatedStatCard
                    title="تنبيهات التراخيص والعقود"
                    value={ultraMetrics.totalAlerts}
                    unit="مستند قيد المتابعة"
                    indicator="تحديث يومي"
                    icon={AlertTriangle}
                    theme="navy"
                    delay={0.1}
                    onClick={() => handleSelectDept('d-02')}
                  />
                  {(!isRoyalLayout || isCockpitLayout) && (
                    <AnimatedStatCard
                      title="المخالفات والمحاضر"
                      value={ultraMetrics.totalViolations}
                      unit="محضر وحملة رقابية"
                      indicator="متابعة ميدانية"
                      icon={ShieldAlert}
                      theme="purple"
                      delay={0.15}
                      onClick={() => handleSelectDept('d-16')}
                    />
                  )}
                </div>

                {/* 2.5 D3.js Interactive Analytics Dashboard Widget */}
                <AnalyticsDashboardWidget
                  branches={branches}
                  bakeries={bakeries.filter((b) => !b.isArchived)}
                  users={allUsers}
                  auditLogs={auditLogs}
                  inspections={inspections}
                  debtTransactions={debtTransactions}
                  regRequests={regRequests}
                  activeBranchId={activeBranchId || currentUser.primaryBranchId}
                />

                {/* 3. Visual Sector Showcase Cards (Reference Images: Bakeries · Grain & Silos · Internal Trade) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      id: 'd-02',
                      title: 'منظومة المخابز والمديونيات',
                      subtitle: `${toArabicNumerals(ultraMetrics.totalBakeries)} مخبز مسجل · متابعة الحصص والدقيق`,
                      metric: `${formatArabicNumber(Math.round(ultraMetrics.totalDebts))} ج.م مديونيات`,
                      img: '/images/dashboard/sector_bakeries.jpg',
                      actionLabel: 'فتح منظومة المخابز',
                    },
                    {
                      id: 'd-08',
                      title: 'صيانة الحبوب والشون والمطاحن',
                      subtitle: `${toArabicNumerals(grainEntitiesCount)} موقع صيانة · الشون والصوامع والثلاجات`,
                      metric: 'فحص وجودة وأصول هندسية',
                      img: '/images/dashboard/sector_grain_silos.jpg',
                      actionLabel: 'فتح قطاع الحبوب',
                    },
                    {
                      id: 'd-04',
                      title: 'التجارة الداخلية والوقود والسلع',
                      subtitle: `${toArabicNumerals(liveExtraCounts.tradeMerchants + liveExtraCounts.gasEntities)} منشأة ومستودع · رقابة الأسواق`,
                      metric: `${toArabicNumerals(liveExtraCounts.rationItemsAndMerchants)} سلعة وتاجر تمويني`,
                      img: '/images/dashboard/sector_internal_trade.jpg',
                      actionLabel: 'فتح التجارة الداخلية',
                    },
                  ].map((sector) => (
                    <div
                      key={sector.id}
                      onClick={() => handleSelectDept(sector.id)}
                      className={`group relative overflow-hidden ${
                        isMinimalLayout ? 'rounded-xl' : 'rounded-2xl'
                      } border ${
                        isDarkTheme
                          ? 'border-slate-700 bg-[#131E31]'
                          : isRoyalLayout
                          ? 'border-[#C6A15B]/50 bg-white'
                          : 'border-white/75 bg-white'
                      } shadow-sm hover:shadow-lg transition-all cursor-pointer flex flex-col`}
                    >
                      <div className="relative h-36 w-full overflow-hidden bg-slate-900">
                        <Image
                          src={sector.img}
                          alt={sector.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/35 to-transparent" />
                        <div className="absolute bottom-2.5 right-3 left-3 flex items-end justify-between gap-2 text-white">
                          <h3 className="text-sm font-black leading-snug">{sector.title}</h3>
                          <span className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                      <div className="p-3.5 flex-1 flex flex-col justify-between gap-2">
                        <p className={`text-[11px] font-bold leading-snug ${cardMutedClass}`}>
                          {sector.subtitle}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10.5px] font-black">
                          <span className={`num-cell ${cardHeadingClass}`}>{sector.metric}</span>
                          <span style={{ color: isDarkTheme ? '#7DD3FC' : 'var(--app-primary-soft, #164E83)' }}>
                            {sector.actionLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 4. Visual Analytics Row: Capsule Bar Chart + SVG Donut Chart */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                  {/* Capsule Bar Chart */}
                  <div
                    className={`${
                      isCompactRailLayout ? 'xl:col-span-6' : 'xl:col-span-7'
                    } ${isMinimalLayout ? 'rounded-xl' : 'rounded-[24px]'} p-5 space-y-4 ${cardSurfaceClass}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className={`text-sm font-black ${cardHeadingClass}`}>نظرة عامة على النشاط والرقابة</h3>
                        <p className={`text-[11px] font-bold ${cardMutedClass}`}>توزيع العمليات التموينية والرقابية عبر القطاعات</p>
                      </div>
                      <div className="flex items-center gap-1 bg-black/5 dark:bg-white/10 p-1 rounded-xl border border-black/10 dark:border-white/15">
                        <button
                          type="button"
                          onClick={() => setChartViewMode('week')}
                          className={`px-3 py-1 rounded-lg text-[10.5px] font-black cursor-pointer transition-all whitespace-nowrap ${
                            chartViewMode === 'week'
                              ? 'bg-[#253B4F] text-white shadow-xs'
                              : cardMutedClass
                          }`}
                        >
                          هذا الأسبوع
                        </button>
                        <button
                          type="button"
                          onClick={() => setChartViewMode('month')}
                          className={`px-3 py-1 rounded-lg text-[10.5px] font-black cursor-pointer transition-all whitespace-nowrap ${
                            chartViewMode === 'month'
                              ? 'bg-[#253B4F] text-white shadow-xs'
                              : cardMutedClass
                          }`}
                        >
                          هذا الشهر
                        </button>
                      </div>
                    </div>

                    <div className="h-44 flex items-end justify-between gap-2.5 sm:gap-4 pt-3 px-2 border-b border-slate-300/60 dark:border-slate-700 pb-2">
                      {weeklyBarSeries.map((bar) => (
                        <div key={bar.label} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5 group">
                          <span className={`num-cell text-[10px] font-black opacity-80 group-hover:opacity-100 ${cardHeadingClass}`}>
                            {toArabicNumerals(bar.value)}
                          </span>
                          <div className="w-full max-w-[34px] h-28 flex items-end justify-center">
                            <div
                              className={`w-full rounded-full bg-gradient-to-b ${bar.grad} shadow-[0_6px_14px_rgba(30,51,70,0.22)] transition-all duration-300 group-hover:scale-y-105 origin-bottom`}
                              style={{ height: `${bar.pct}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-black truncate max-w-full ${cardMutedClass}`}>
                            {bar.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SVG Donut Chart */}
                  <div
                    className={`${
                      isCompactRailLayout ? 'xl:col-span-6' : 'xl:col-span-5'
                    } ${isMinimalLayout ? 'rounded-xl' : 'rounded-[24px]'} p-5 flex flex-col justify-between gap-3 ${cardSurfaceClass}`}
                  >
                    <div>
                      <h3 className={`text-sm font-black ${cardHeadingClass}`}>توزيع القطاعات والمنشآت</h3>
                      <p className={`text-[11px] font-bold ${cardMutedClass}`}>نسبة الحجم التشغيلي لكل قطاع داخل المديرية</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
                        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90 drop-shadow-sm">
                          <circle cx="60" cy="60" r="40" fill="none" stroke={isDarkTheme ? '#1E293B' : '#B7C8D6'} strokeWidth="18" />
                          {sectorDonutSegments.map((seg) => (
                            <circle
                              key={seg.label}
                              cx="60"
                              cy="60"
                              r="40"
                              fill="none"
                              stroke={seg.color}
                              strokeWidth="18"
                              strokeDasharray={seg.dashArray}
                              strokeDashoffset={seg.dashOffset}
                            />
                          ))}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className={`num-cell text-sm font-black ${cardHeadingClass}`}>
                            {toArabicNumerals(ultraMetrics.totalTransactions)}
                          </span>
                          <span className={`text-[9px] font-bold ${cardMutedClass}`}>عملية</span>
                        </div>
                      </div>

                      <div className="flex-1 w-full space-y-2">
                        {sectorDonutSegments.map((seg) => (
                          <div key={seg.label} className={`flex items-center justify-between gap-2 text-[11px] font-black ${cardHeadingClass}`}>
                            <span className="flex items-center gap-2 truncate">
                              <span className="w-3 h-3 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: seg.color }} />
                              <span className="truncate">{seg.label}</span>
                            </span>
                            <span className={`num-cell ${cardMutedClass}`}>{toArabicNumerals(seg.share)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Bottom 2-Column Activity & Financial Spotlight */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                  {/* Recent Tasks & Operations List */}
                  <div className={`xl:col-span-6 ${isMinimalLayout ? 'rounded-xl' : 'rounded-[24px]'} p-5 space-y-3 ${cardSurfaceClass}`}>
                    <div className="flex items-center justify-between">
                      <h3 className={`text-sm font-black ${cardHeadingClass}`}>أحدث المهام والتكليفات اليومية</h3>
                      <button
                        type="button"
                        onClick={() => handleSelectDept('d-25')}
                        className="px-3 py-1 rounded-xl bg-white/80 hover:bg-white text-[10.5px] font-black text-[#253B4F] border border-slate-200 cursor-pointer whitespace-nowrap"
                      >
                        عرض الكل
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {(recentTasks.length > 0 ? recentTasks.slice(0, 3) : [
                        { id: 't1', title: 'مراجعة حصص الدقيق اليومية للمخابز البلدية', primaryAssigneeName: 'قسم الرقابة التموينية', status: 'جارٍ التنفيذ' },
                        { id: 't2', title: 'تحصيل الأقساط المستحقة لمديونيات أصحاب المخابز', primaryAssigneeName: 'قسم المديونيات', status: 'مهمة يومية' },
                        { id: 't3', title: 'فحص مستودعات البوتاجاز ومحطات الوقود بالمركز', primaryAssigneeName: 'التجارة الداخلية', status: 'مكتملة' },
                      ]).map((task, idx) => (
                        <div
                          key={task.id}
                          onClick={() => handleSelectDept('d-25')}
                          className={`flex items-center justify-between gap-3 p-2.5 rounded-2xl border transition-all cursor-pointer ${
                            isDarkTheme
                              ? 'bg-slate-800/70 hover:bg-slate-800 border-slate-700'
                              : 'bg-white/75 hover:bg-white border-white/80'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs ${
                                idx === 0 ? 'bg-gradient-to-br from-[#3B717E] to-[#253B4F]' : idx === 1 ? 'bg-gradient-to-br from-[#6B7E9E] to-[#3B4B6B]' : 'bg-gradient-to-br from-[#5B9A93] to-[#2D625C]'
                              }`}
                            >
                              <ListChecks className="w-4.5 h-4.5" />
                            </div>
                            <div className="min-w-0">
                              <p className={`text-xs font-black truncate ${cardHeadingClass}`}>{task.title}</p>
                              <p className={`text-[10.5px] font-bold truncate ${cardMutedClass}`}>
                                {task.primaryAssigneeName} · {task.status}
                              </p>
                            </div>
                          </div>
                          <span className="w-8 h-8 rounded-xl bg-gradient-to-b from-[#6FAAB3] to-[#3B717E] text-white flex items-center justify-center shrink-0 shadow-xs">
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Spotlight Card */}
                  <div
                    className={`xl:col-span-6 ${isMinimalLayout ? 'rounded-xl' : 'rounded-[24px]'} border border-white/15 p-5 text-white shadow-[0_16px_34px_-12px_rgba(24,42,60,0.48)] flex flex-col justify-between gap-4`}
                    style={{
                      background:
                        'linear-gradient(135deg, var(--app-header-bg, #1C2F40) 0%, var(--app-primary-soft, #2C5566) 100%)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black flex items-center gap-1.5" style={{ color: 'var(--app-accent, #94C9CE)' }}>
                        <TrendingUp className="w-4 h-4" />
                        <span>الموقف المالي ومديونيات المخابز</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSelectDept('d-03')}
                        className="px-3 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-[10.5px] font-black text-white border border-white/20 cursor-pointer whitespace-nowrap"
                      >
                        عرض الكل
                      </button>
                    </div>

                    <div className="rounded-2xl bg-black/20 border border-white/10 p-4 flex items-center justify-between gap-4">
                      <div>
                        <span className="text-[11px] font-bold text-slate-300 block">إجمالي المديونيات المتبقية بالسجل</span>
                        <div className="num-cell text-2xl sm:text-3xl font-black text-white mt-1">
                          {formatArabicNumber(Math.round(ultraMetrics.totalDebts))} ج.م
                        </div>
                        <span className="text-[11px] font-extrabold block mt-1" style={{ color: 'var(--app-accent, #94C9CE)' }}>
                          عدد {toArabicNumerals(deptLiveCounts.DEBTS)} مخبزاً ضمن سجل المتابعة المالية
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectDept('d-03')}
                        className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white/30 transition-all flex items-center justify-center text-white shadow-lg border border-white/30 shrink-0 cursor-pointer"
                        title="فتح منظومة إدارة المديونيات"
                      >
                        <CreditCard className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                      <span>المعاملات الموثقة: <span className="num-cell" style={{ color: 'var(--app-accent, #94C9CE)' }}>{toArabicNumerals(ultraMetrics.totalTransactions)}</span></span>
                      <span>عمليات قيد المراجعة: <span className="num-cell" style={{ color: 'var(--app-accent, #94C9CE)' }}>{toArabicNumerals(ultraMetrics.pendingReviews)}</span></span>
                    </div>
                  </div>
                </div>

                {/* 6. Bottom Reports Spotlight Bar */}
                <div className={`${isMinimalLayout ? 'rounded-xl' : 'rounded-[22px]'} p-4 flex flex-wrap items-center justify-between gap-3 ${cardSurfaceClass}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#2B6270] dark:text-sky-300 shadow-xs shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <p className={`text-xs sm:text-sm font-black ${cardHeadingClass}`}>
                        مركز التقارير الموحد والتصدير الفوري
                      </p>
                      <p className={`text-[11px] font-bold ${cardMutedClass}`}>
                        ١٥ تقريراً رسمياً جاهزاً للطباعة والتصدير لجميع إدارات وأقسام المديرية
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTasksInitialSubTab('reports_center');
                      handleSelectDept('d-25');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#253B4F] hover:bg-[#164E83] text-white text-xs font-black shadow-sm cursor-pointer whitespace-nowrap"
                  >
                    استعراض التقارير الآن
                  </button>
                </div>

                {/* 7. Departments Directory Grid */}
                <div
                  className={`${isMinimalLayout ? 'rounded-xl' : 'rounded-[24px]'} p-5 space-y-4 ${
                    isDarkTheme
                      ? 'bg-[#131E31]/95 border border-slate-700/80'
                      : 'bg-white/85 backdrop-blur-md border border-white/80 shadow-xs'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 dark:border-slate-700 pb-3">
                    <div>
                      <h3 className={`text-[15px] font-black ${cardHeadingClass}`}>{t('mainDepartmentsTitle')}</h3>
                      <p className={`text-[11px] font-bold ${cardMutedClass}`}>{t('mainDepartmentsDesc')}</p>
                    </div>
                    <span className={`num-cell text-[11px] font-black ${cardMutedClass}`}>
                      {isRtl ? toArabicNumerals(filteredSidebarDepts.length) : filteredSidebarDepts.length} {t('authorizedSections')}
                    </span>
                  </div>

                  <div
                    className={`grid grid-cols-1 sm:grid-cols-2 ${
                      isCockpitLayout ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
                    } gap-3.5`}
                  >
                    {filteredSidebarDepts.map((dept) => (
                      <div
                        key={dept.id}
                        onClick={() => handleSelectDept(dept.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between shadow-xs ${
                          isDarkTheme
                            ? 'border-slate-700 bg-slate-800/60 hover:bg-slate-800 hover:border-sky-400/50'
                            : 'border-slate-200/80 hover:border-[#3B717E] bg-[#EEF3F7]/85 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#253B4F] text-[#94C9CE] flex items-center justify-center shrink-0">
                            {renderDeptIcon(dept.iconName, 'w-5 h-5')}
                          </div>
                          <div>
                            <h4 className={`text-[13px] font-black ${cardHeadingClass}`}>
                              {getLocalizedDepartmentName(dept.code, dept.arabicName, prefs.language)}
                            </h4>
                            <p className={`text-[11px] font-bold mt-0.5 leading-relaxed ${cardMutedClass}`}>
                              {getLocalizedDepartmentDesc(dept.code, dept.description, prefs.language)}
                            </p>
                          </div>
                        </div>
                        <div className={`mt-3.5 pt-2.5 border-t border-slate-200/70 dark:border-slate-700 flex items-center justify-between text-[10.5px] font-black ${cardMutedClass}`}>
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
              <RoleGuard
                user={currentUser}
                requireAdmin
                fallback={
                  <div className="bg-white p-6 rounded-2xl border border-red-200 text-center space-y-2">
                    <h3 className="text-sm font-black text-red-800">غير مصرح بالوصول إلى لوحة الإدارة السيادية</h3>
                    <p className="text-xs font-bold text-slate-600">
                      هذا القسم مقصور على مدير النظام والمسؤولين الإداريين المصرح لهم فقط.
                    </p>
                  </div>
                }
              >
                <AdminDashboard
                  userId={currentUser.id}
                  initialTab={activeDept?.code === 'AUDIT' ? 'audit' : 'users'}
                />
              </RoleGuard>
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
                            const restored = snap.complaintsList as CitizenComplaintRecord[];
                            setComplaintsList(restored);
                            saveStoredComplaints(restored);
                          }
                        }}
                        compact
                        onConfirmReset={() => {
                          setComplaintsList([]);
                          saveStoredComplaints([]);
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
                initialSubTab={tasksInitialSubTab}
                onNavigateToDepartment={(deptId) => handleSelectDept(deptId)}
                onSelectBakeryDetails={(b) => setPortalSelectedBakery(b)}
              />
            )}

            {(activeDept?.code === 'TRADE' || activeDept?.code === 'GAS') && (
              <InternalTradeModule
                currentUser={currentUser}
                todayRef={todayRef}
                initialScreen={activeDept.code === 'GAS' ? 'butane_management' : tradeInitialScreen}
                bakeries={bakeries.filter((b) => !b.isArchived)}
                inspections={inspections}
                onAddInspection={handleStandaloneAddInspection}
                onUpdateInspectionStatus={handleStandaloneUpdateInspection}
                onSelectBakeryDetails={(b) => setPortalSelectedBakery(b)}
              />
            )}

            {activeDept?.code === 'COMM' && (
              <RationCommoditiesModule currentUserName={currentUser.fullName} />
            )}

            {activeDept?.code === 'LISTS' && (
              <DropdownListsManagerModule currentUserName={currentUser.fullName} />
            )}

            {activeDept?.code === 'HR' && (
              <HrPersonnelModule currentUser={currentUser} todayRef={todayRef} />
            )}

            {(activeDept?.code === 'GRAIN' ||
              activeDept?.code === 'SILOS' ||
              activeDept?.code === 'MILLS' ||
              activeDept?.code === 'COLD') && (
              <GrainMaintenanceModule
                currentUser={currentUser}
                bakeries={bakeries.filter((b) => !b.isArchived)}
                todayRef={todayRef}
                initialScreen={
                  grainInitialSubTab === 'SILOS'
                    ? 'warehouses'
                    : grainInitialSubTab === 'MILLS'
                    ? 'mills'
                    : grainInitialSubTab === 'COLD'
                    ? 'refrigerators'
                    : 'dashboard'
                }
                onOpenBakeries={() => handleSelectDept('d-02')}
              />
            )}

            {activeDept &&
              activeDept.code !== 'DASH' &&
              activeDept.code !== 'BAK' &&
              activeDept.code !== 'DEBTS' &&
              activeDept.code !== 'TRADE' &&
              activeDept.code !== 'GAS' &&
              activeDept.code !== 'COMM' &&
              activeDept.code !== 'LISTS' &&
              activeDept.code !== 'HR' &&
              activeDept.code !== 'GRAIN' &&
              activeDept.code !== 'SILOS' &&
              activeDept.code !== 'MILLS' &&
              activeDept.code !== 'COLD' &&
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
                  initialGrainSubTab={grainInitialSubTab}
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
                    handleSelectDept('d-03');
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

      {/* نظام الإشعارات الفورية الحية (Real-Time Toast Notification System) */}
      <RealtimeToastNotifications
        currentUser={currentUser}
        onNavigateToDepartmentCode={(deptCode) => {
          const found = allDepartments.find((d) => d.code === deptCode);
          if (found) {
            handleSelectDept(found.id);
          }
        }}
      />
    </div>
  );
}
