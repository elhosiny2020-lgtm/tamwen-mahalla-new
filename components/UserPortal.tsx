'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
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
} from 'lucide-react';
import { AuditLog, BakeryRecord, Branch, Department, RegistrationRequest, User } from '@/types';
import {
  INITIAL_BRANCHES,
  INITIAL_DEPARTMENTS,
  INITIAL_BAKERIES,
  INITIAL_USERS,
  INITIAL_REGISTRATION_REQUESTS,
  INITIAL_AUDIT_LOGS,
  getStoredBranches,
  getStoredDepartments,
  getStoredBakeries,
  getStoredUsers,
  getStoredRegistrationRequests,
  getStoredAuditLogs,
} from '@/lib/mock-db';
import { evaluateDocumentExpiry } from '@/lib/bakery-math';
import { toArabicNumerals, formatArabicNumber, compareTableValues, formatDateArabic } from '@/lib/utils';
import AdminDashboard from './AdminDashboard';
import BakeryManagementSystem from './BakeryManagementSystem';
import SortableTh from './SortableTh';

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
    default: return <LayoutDashboard className={className} />;
  }
}

export default function UserPortal({ currentUser, activeBranchId }: UserPortalProps) {
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [allDepartments, setAllDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [bakeries, setBakeries] = useState<BakeryRecord[]>(INITIAL_BAKERIES);
  const [allUsers, setAllUsers] = useState<User[]>(INITIAL_USERS);
  const [regRequests, setRegRequests] = useState<RegistrationRequest[]>(INITIAL_REGISTRATION_REQUESTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [todayRef, setTodayRef] = useState<string>('2026-11-25');
  const [compSort, setCompSort] = useState<{ key: string; asc: boolean }>({ key: 'date', asc: false });

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setBranches(getStoredBranches());
      setAllDepartments(getStoredDepartments());
      setBakeries(getStoredBakeries());
      setAllUsers(getStoredUsers());
      setRegRequests(getStoredRegistrationRequests());
      setAuditLogs(getStoredAuditLogs());
      setTodayRef(new Date().toISOString().slice(0, 10));
    });
    return () => cancelAnimationFrame(frameId);
  }, []);

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

  const [activeDeptId, setActiveDeptId] = useState<string>('d-02');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(true); // مطوية افتراضياً
  const [isSidebarPinned, setIsSidebarPinned] = useState<boolean>(false);
  const [sidebarSearch, setSidebarSearch] = useState<string>('');
  const [pinnedDeptIds, setPinnedDeptIds] = useState<string[]>(['d-01', 'd-02', 'd-03', 'd-22']);

  const [complaintsList] = useState([
    { id: 'comp-1', citizen: 'أحمد محمود الششتاوي', phone: '٠١٠١١١١٢٢٢٢', issue: 'مراجعة أوزان رغيف الخبز بقرية الهياتم', status: 'جاري الفحص والتفتيش', date: '٢٠٢٦-١١-٢٤' },
    { id: 'comp-2', citizen: 'فاطمة علي أبو النجا', phone: '٠١٢٣٣٣٣٤٤٤٤', issue: 'تحديث بيانات بطاقة تموينية بمركز المحلة', status: 'تم الحل وإعادة التفعيل', date: '٢٠٢٦-١١-٢٣' },
  ]);

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
    const q = sidebarSearch.trim().toLowerCase();
    const list = q
      ? allowedDepartments.filter(
          (d) => d.arabicName.toLowerCase().includes(q) || d.description.toLowerCase().includes(q)
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
      totalViolations: 14,
      totalTransactions: auditLogs.length + activeBaks.length * 12,
      totalAlerts: docAlertsCount,
      pendingReviews: pendingReqs + activeBaks.filter((b) => b.activityStatus !== 'نشط').length,
    };
  }, [bakeries, allUsers, branches, regRequests, auditLogs, todayRef]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-7rem)] font-sans">
      {/* Smart Animated Collapsible Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? '80px' : '280px' }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        onMouseEnter={() => !isSidebarPinned && setSidebarCollapsed(false)}
        onMouseLeave={() => !isSidebarPinned && setSidebarCollapsed(true)}
        className="bg-[#102A43] text-white rounded-2xl shadow-xl border border-[#164E83] shrink-0 print:hidden overflow-hidden p-3.5"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2.5">
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
                <span className="text-[10px] font-black text-[#C6A15B] block">الإدارة التموينية الحالية</span>
                <h3 className="text-xs font-black text-white truncate max-w-[140px]">
                  {currentBranch?.arabicName || 'إدارة تموين مركز المحلة الكبرى'}
                </h3>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 mx-auto lg:mx-0">
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
          </div>
        </div>

        {/* Search inside sidebar */}
        {!sidebarCollapsed && (
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder="بحث سريع في الأقسام..."
              className="w-full pr-9 pl-3 py-2 bg-[#164E83]/50 border border-white/15 rounded-xl text-xs text-white font-bold placeholder:text-slate-300 focus:outline-none focus:border-[#C6A15B]"
            />
          </div>
        )}

        <nav className="space-y-1 max-h-[calc(100vh-15rem)] overflow-y-auto pr-0.5">
          {filteredSidebarDepts.map((dept) => {
            const isActive = activeDeptId === dept.id;
            const isPinned = pinnedDeptIds.includes(dept.id);
            return (
              <div
                key={dept.id}
                onClick={() => setActiveDeptId(dept.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#C6A15B] text-[#102A43] shadow-md font-black'
                    : 'text-slate-200 hover:bg-[#164E83]/60 hover:text-white'
                }`}
                title={dept.arabicName}
              >
                <div className="flex items-center gap-2.5 truncate">
                  {renderDeptIcon(
                    dept.iconName,
                    `w-4 h-4 shrink-0 ${isActive ? 'text-[#102A43]' : 'text-[#C6A15B]'}`
                  )}
                  {!sidebarCollapsed && <span className="truncate">{dept.arabicName}</span>}
                </div>

                {!sidebarCollapsed && (
                  <button
                    type="button"
                    onClick={(e) => togglePinDept(e, dept.id)}
                    className={`p-1 rounded hover:bg-black/10 ${
                      isPinned
                        ? isActive
                          ? 'text-[#102A43]'
                          : 'text-[#C6A15B]'
                        : 'text-slate-400 opacity-50 hover:opacity-100'
                    }`}
                    title={isPinned ? 'إلغاء تثبيت القسم' : 'تثبيت في المفضلة'}
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                  </button>
                )}
              </div>
            );
          })}
        </nav>
      </motion.aside>

      {/* Main Content Viewport */}
      <main className="flex-1 min-w-0">
        {activeDept?.code === 'BAK' && (
          <BakeryManagementSystem
            currentUser={currentUser}
            branchName={currentBranch?.arabicName || 'إدارة تموين مركز المحلة الكبرى'}
          />
        )}

        {activeDept?.code === 'DASH' && (
          <div className="space-y-6">
            {/* Hero Sovereign Banner */}
            <div className="bg-[#102A43] text-white rounded-2xl p-6 sm:p-8 shadow-lg border border-[#164E83] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
                  <p className="text-xs font-black text-[#C6A15B] mb-1">
                    جمهورية مصر العربية · وزارة التموين والتجارة الداخلية · محافظة الغربية
                  </p>
                  <h2 className="text-xl sm:text-2xl font-black">
                    لوحة القيادة المركزية (ULTRA DASHBOARD) — {currentBranch?.arabicName}
                  </h2>
                  <p className="text-xs text-slate-200 font-bold mt-1">
                    منصة رقمية موحدة لإدارة البيانات والخدمات التموينية، وتعزيز كفاءة المتابعة والرقابة، ودعم اتخاذ القرار.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveDeptId('d-02')}
                className="px-5 py-3 bg-[#C6A15B] hover:bg-[#b58f48] text-[#102A43] font-black rounded-xl text-xs flex items-center gap-2 shrink-0 shadow-md cursor-pointer"
              >
                <Flame className="w-4 h-4" />
                <span>فتح منظومة إدارة المخابز والحصص</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>

            {/* 8 Luxury Enterprise KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: 'إجمالي المخابز المسجلة', val: toArabicNumerals(ultraMetrics.totalBakeries), desc: 'مخابز بلدية مدعمة بمركز المحلة', icon: Flame, actionDept: 'd-02' },
                { title: 'إجمالي المستخدمين', val: toArabicNumerals(ultraMetrics.totalUsers), desc: 'حسابات موظفين ومفتشين معتمدة', icon: Users, actionDept: 'd-22' },
                { title: 'إجمالي الإدارات التموينية', val: toArabicNumerals(ultraMetrics.totalBranches), desc: 'إدارات تموين محافظة الغربية', icon: Building2, actionDept: 'd-22' },
                { title: 'إجمالي المديونيات المتبقية', val: `${formatArabicNumber(ultraMetrics.totalDebts)} ج.م`, desc: 'مستحقات وغرامات قيد التحصيل', icon: CreditCard, actionDept: 'd-03' },
                { title: 'إجمالي المخالفات والمحاضر', val: toArabicNumerals(ultraMetrics.totalViolations), desc: 'محاضر رقابية وحملات تفتيشية', icon: ShieldAlert, actionDept: 'd-16' },
                { title: 'إجمالي المعاملات الموثقة', val: toArabicNumerals(ultraMetrics.totalTransactions), desc: 'عمليات صرف وتدقيق بالسجل', icon: History, actionDept: 'd-23' },
                { title: 'التنبيهات والمستندات المنتهية', val: toArabicNumerals(ultraMetrics.totalAlerts), desc: 'تراخيص وعقود تحتاج للتجديد', icon: AlertTriangle, actionDept: 'd-02' },
                { title: 'عمليات تحتاج إلى مراجعة', val: toArabicNumerals(ultraMetrics.pendingReviews), desc: 'طلبات اعتماد ومخابز قيد الفحص', icon: CheckCircle2, actionDept: 'd-22' },
              ].map((card, i) => {
                const Icon = card.icon;
                return (
                  <div
                    key={i}
                    onClick={() => setActiveDeptId(card.actionDept)}
                    className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-[#164E83] shadow-sm transition-all cursor-pointer flex items-start justify-between"
                  >
                    <div>
                      <span className="text-xs font-black text-slate-600 block">{card.title}</span>
                      <div className="text-2xl font-black font-mono tabular-nums text-[#102A43] my-1.5">
                        {card.val}
                      </div>
                      <span className="text-[11px] font-bold text-slate-500">{card.desc}</span>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-[#F4F7FB] text-[#102A43] border border-slate-200 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-[#164E83]" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 12 Main Enterprise Departments Directory Grid */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-[#102A43]">الأقسام الرئيسية لمنظومة الإدارة الرقمية المتكاملة</h3>
                  <p className="text-xs font-bold text-slate-500">اضغط على أي قسم للانتقال المباشر إلى سجلاته ومعاملاته</p>
                </div>
                <span className="text-xs font-mono font-black text-[#164E83]">{toArabicNumerals(allowedDepartments.length)} قسماً مصرحاً</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allowedDepartments.map((dept) => (
                  <div
                    key={dept.id}
                    onClick={() => setActiveDeptId(dept.id)}
                    className="p-4 rounded-xl border border-slate-200 hover:border-[#102A43] bg-[#F4F7FB]/50 hover:bg-white transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#102A43] text-[#C6A15B] flex items-center justify-center shrink-0">
                        {renderDeptIcon(dept.iconName, 'w-5 h-5')}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-[#102A43]">{dept.arabicName}</h4>
                        <p className="text-xs font-bold text-slate-600 mt-0.5 leading-relaxed">{dept.description}</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-[11px] font-black text-[#164E83]">
                      <span>{dept.code === 'BAK' ? `${toArabicNumerals(ultraMetrics.totalBakeries)} مخبز مسجل` : 'قسم مفعل'}</span>
                      <span className="flex items-center gap-1">
                        <span>فتح القسم</span>
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {(activeDept?.code === 'ROLES' || activeDept?.code === 'USERS' || activeDept?.code === 'AUDIT') && (
          <AdminDashboard />
        )}

        {activeDept?.code === 'COMP' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
            <h3 className="text-sm font-black text-[#102A43]">شكاوى وبلاغات المواطنين الواردة</h3>
            <div className="overflow-auto max-h-[60vh] compact-table-scroll">
              <table className="w-full text-right">
                <thead className="bg-[#102A43] text-white sticky top-0 z-10">
                  <tr>
                    <SortableTh label="المواطن" sortKey="citizen" activeSortKey={compSort.key} sortAsc={compSort.asc} onSort={(k) => setCompSort(s => ({ key: k, asc: s.key === k ? !s.asc : true }))} />
                    <SortableTh label="رقم الهاتف" sortKey="phone" activeSortKey={compSort.key} sortAsc={compSort.asc} onSort={(k) => setCompSort(s => ({ key: k, asc: s.key === k ? !s.asc : true }))} align="center" />
                    <SortableTh label="موضوع البلاغ أو الشكوى" sortKey="issue" activeSortKey={compSort.key} sortAsc={compSort.asc} onSort={(k) => setCompSort(s => ({ key: k, asc: s.key === k ? !s.asc : true }))} />
                    <SortableTh label="التاريخ" sortKey="date" activeSortKey={compSort.key} sortAsc={compSort.asc} onSort={(k) => setCompSort(s => ({ key: k, asc: s.key === k ? !s.asc : true }))} align="center" />
                    <SortableTh label="حالة الشكوى" sortKey="status" activeSortKey={compSort.key} sortAsc={compSort.asc} onSort={(k) => setCompSort(s => ({ key: k, asc: s.key === k ? !s.asc : true }))} align="center" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {[...complaintsList]
                    .sort((a, b) =>
                      compareTableValues(
                        a[compSort.key as keyof typeof a],
                        b[compSort.key as keyof typeof b],
                        compSort.asc
                      )
                    )
                    .map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="font-bold text-[#102A43]">{c.citizen}</td>
                        <td className="num-cell text-center text-slate-700">{toArabicNumerals(c.phone)}</td>
                        <td className="text-slate-800">{toArabicNumerals(c.issue)}</td>
                        <td className="num-cell text-center text-slate-600">{formatDateArabic(c.date)}</td>
                        <td className="text-center whitespace-nowrap">
                          <span className="bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded text-[10.5px] font-bold">
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeDept?.code !== 'DASH' &&
          activeDept?.code !== 'BAK' &&
          activeDept?.code !== 'COMP' &&
          activeDept?.code !== 'ROLES' &&
          activeDept?.code !== 'USERS' &&
          activeDept?.code !== 'AUDIT' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#102A43] text-[#C6A15B] flex items-center justify-center">
                    {renderDeptIcon(activeDept?.iconName || 'LayoutDashboard', 'w-5 h-5')}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[#102A43]">{activeDept?.arabicName}</h2>
                    <p className="text-xs font-bold text-slate-500">{activeDept?.description}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDeptId('d-02')}
                  className="px-4 py-2 bg-[#102A43] text-white rounded-xl text-xs font-black cursor-pointer shadow-sm"
                >
                  الانتقال إلى منظومة المخابز
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-[#F4F7FB] rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 block">الإدارة المختصة</span>
                  <strong className="text-sm font-black text-[#102A43]">
                    {currentBranch?.arabicName || 'إدارة تموين مركز المحلة الكبرى'}
                  </strong>
                </div>
                <div className="p-4 bg-[#F4F7FB] rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 block">إجمالي المخابز المرتبطة بالفرع</span>
                  <strong className="text-sm font-black font-mono text-[#164E83]">
                    {toArabicNumerals(ultraMetrics.totalBakeries)} مخبز
                  </strong>
                </div>
                <div className="p-4 bg-[#F4F7FB] rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 block">إجمالي المديونيات المسجلة</span>
                  <strong className="text-sm font-black font-mono text-emerald-800">
                    {formatArabicNumber(ultraMetrics.totalDebts)} ج.م
                  </strong>
                </div>
              </div>
            </div>
          )}
      </main>
    </div>
  );
}
