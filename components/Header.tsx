'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import {
  LogOut,
  Building,
  Bell,
  RefreshCw,
  MessageSquare,
  FileSpreadsheet,
  Search,
  X,
  ArrowUpLeft,
  Flame,
  Users,
  ShoppingBag,
  Package,
  ClipboardList,
  ShieldCheck,
  LayoutDashboard,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { User, Branch } from '@/types';
import {
  getStoredBakeries,
  getStoredDepartments,
  getStoredUsers,
} from '@/lib/mock-db';
import { evaluateDocumentExpiry } from '@/lib/bakery-math';
import {
  loadChatMessages,
  loadDailyTasks,
  loadUnifiedNotifications,
} from '@/lib/major-debts-tasks-chat-store';
import { loadHrPersonnelStore } from '@/lib/hr-personnel-store';
import {
  loadButaneWarehouses,
  loadCommercialEstablishments,
  loadFuelStations,
} from '@/lib/internal-trade-store';
import {
  loadRationCommodities,
  loadRationMerchants,
} from '@/lib/ration-commodities-store';
import {
  toArabicNumerals,
  getRoleArabicLabel,
  normalizeSearchText,
} from '@/lib/utils';
import { useSystemPreferences } from '@/lib/user-preferences-store';
import ClientClock from './ClientClock';
import GlobalControlBar from './GlobalControlBar';
import UserProfileSettingsModal from './UserProfileSettingsModal';

interface HeaderProps {
  currentUser: User;
  branches: Branch[];
  activeBranchId?: string;
  onChangeBranch?: () => void;
  onLogout: () => void;
}

interface GlobalSearchResultItem {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  badge: string;
  branchId?: string;
  departmentCode?: string;
  departmentId?: string;
  recordId?: string;
}

export default function Header({
  currentUser,
  branches,
  activeBranchId,
  onChangeBranch,
  onLogout,
}: HeaderProps) {
  const { isRtl, t, prefs } = useSystemPreferences();
  const currentBranch = branches.find(
    (b) => b.id === (activeBranchId || currentUser.primaryBranchId)
  );
  const [showNotifPanel, setShowNotifPanel] = useState<boolean>(false);
  const [urgentAlerts, setUrgentAlerts] = useState<{ id: string; title: string; status: string }[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [unreadSystemNotifsCount, setUnreadSystemNotifsCount] = useState<number>(0);
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  // Global Search Bar State
  const [globalQuery, setGlobalQuery] = useState<string>('');
  const [searchFocused, setSearchFocused] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const openTasksSubTab = (subTab: 'internal_chat' | 'notifications' | 'reports_center') => {
    setShowNotifPanel(false);
    window.dispatchEvent(new CustomEvent('gharbia-open-tasks-subtab', { detail: { subTab } }));
  };

  useEffect(() => {
    const onOpenProfile = () => {
      setShowNotifPanel(false);
      setShowProfileSettings(true);
    };
    window.addEventListener('gharbia-open-profile-settings', onOpenProfile);
    return () => window.removeEventListener('gharbia-open-profile-settings', onOpenProfile);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchFocused(true);
      } else if (e.key === 'Escape') {
        setSearchFocused(false);
      }
    };
    const onClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setSearchFocused(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

  useEffect(() => {
    const loadAlerts = () => {
      const bakeries = getStoredBakeries();
      const list: { id: string; title: string; status: string }[] = [];
      bakeries.forEach((b) => {
        const lic = evaluateDocumentExpiry(b.licenseExpiryDate, b.licenseNumber);
        if (lic.severity !== 'valid') {
          list.push({ id: `${b.id}-lic`, title: `رخصة ${b.name} (${b.village})`, status: lic.status });
        }
        const lease = evaluateDocumentExpiry(b.leaseExpiryDate, b.leaseContractNumber);
        if (lease.severity !== 'valid') {
          list.push({ id: `${b.id}-lease`, title: `عقد ${b.name} (${b.village})`, status: lease.status });
        }
      });
      setUrgentAlerts(list);

      const msgs = loadChatMessages();
      const chatUnread = msgs.filter(
        (m) =>
          !m.isDeletedFromUi &&
          m.senderId !== currentUser.id &&
          !m.readByUserIds.includes(currentUser.id)
      ).length;
      setUnreadChatCount(chatUnread);

      const sysNotifs = loadUnifiedNotifications();
      const notifUnread = sysNotifs.filter(
        (n) => !n.isRead && (n.recipientUserId === 'ALL' || n.recipientUserId === currentUser.id)
      ).length;
      setUnreadSystemNotifsCount(notifUnread);
    };
    const frameId = requestAnimationFrame(loadAlerts);
    window.addEventListener('storage', loadAlerts);
    window.addEventListener('gharbia-chat-updated', loadAlerts);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('storage', loadAlerts);
      window.removeEventListener('gharbia-chat-updated', loadAlerts);
    };
  }, [currentUser.id]);

  // محرك البحث الشامل عبر جميع الأقسام والفروع والمستخدمين والسجلات
  const globalSearchResults = useMemo<GlobalSearchResultItem[]>(() => {
    const q = normalizeSearchText(globalQuery);
    if (!q) return [];

    const results: GlobalSearchResultItem[] = [];

    // ١. الفروع والإدارات التموينية
    branches.forEach((br) => {
      const hay = normalizeSearchText(`${br.arabicName} ${br.name} ${br.code} ${br.managerName || ''} ${br.address || ''}`);
      if (hay.includes(q)) {
        results.push({
          id: `br-${br.id}`,
          category: 'الإدارات والفروع التموينية',
          title: br.arabicName,
          subtitle: `مدير الإدارة: ${br.managerName || '—'} · ${br.address || 'محافظة الغربية'}`,
          badge: br.code,
          branchId: br.id,
        });
      }
    });

    // ٢. الأقسام والوحدات الرئيسية بالمنظومة
    getStoredDepartments().forEach((dept) => {
      const hay = normalizeSearchText(`${dept.arabicName} ${dept.name} ${dept.code} ${dept.description}`);
      if (hay.includes(q)) {
        results.push({
          id: `dept-${dept.id}`,
          category: 'أقسام ووحدات المنظومة',
          title: dept.arabicName,
          subtitle: dept.description,
          badge: dept.code,
          departmentId: dept.id,
          departmentCode: dept.code,
        });
      }
    });

    // ٣. المخابز البلدية والحصص
    getStoredBakeries().forEach((bak) => {
      const hay = normalizeSearchText(
        `${bak.name} ${bak.bakeryNumber} ${bak.ownerName} ${bak.posNumber} ${bak.village} ${bak.localUnit} ${bak.licenseNumber}`
      );
      if (hay.includes(q)) {
        results.push({
          id: `bak-${bak.id}`,
          category: 'منظومة المخابز',
          title: `${bak.name} (مخبز رقم ${toArabicNumerals(bak.bakeryNumber)})`,
          subtitle: `صاحب المخبز: ${bak.ownerName} · القرية: ${bak.village} · الحصة: ${toArabicNumerals(bak.actualQuota)} شيكارة`,
          badge: bak.activityStatus,
          departmentCode: 'BAK',
          recordId: bak.id,
        });
      }
    });

    // ٤. ملفات المستخدمين والصلاحيات
    getStoredUsers().forEach((usr) => {
      const hay = normalizeSearchText(
        `${usr.fullName} ${usr.username} ${usr.email} ${usr.nationalId} ${usr.jobTitle} ${usr.phone}`
      );
      if (hay.includes(q)) {
        results.push({
          id: `usr-${usr.id}`,
          category: 'المستخدمون والصلاحيات',
          title: usr.fullName,
          subtitle: `المستخدم: ${usr.username} · البريد: ${usr.email} · ${getRoleArabicLabel(usr.role)}`,
          badge: usr.status === 'active' ? 'نشط' : 'معلق',
          departmentCode: 'USERS',
          recordId: usr.id,
        });
      }
    });

    // ٥. موظفو الموارد البشرية
    try {
      const hr = loadHrPersonnelStore();
      hr.employees.forEach((emp) => {
        const hay = normalizeSearchText(
          `${emp.fullName} ${emp.employeeCode} ${emp.employeeNumber} ${emp.nationalId} ${emp.jobTitle} ${emp.supplyAdministration}`
        );
        if (hay.includes(q)) {
          results.push({
            id: `hr-${emp.id}`,
            category: 'الموارد البشرية وشؤون العاملين',
            title: emp.fullName,
            subtitle: `${emp.jobTitle} · كود: ${emp.employeeCode} · ${emp.supplyAdministration}`,
            badge: emp.jobStatus,
            departmentCode: 'HR',
            recordId: emp.id,
          });
        }
      });
    } catch {
      // ignore
    }

    // ٦. التجارة الداخلية والوقود والبوتاجاز
    try {
      loadCommercialEstablishments().forEach((est) => {
        const hay = normalizeSearchText(`${est.name} ${est.ownerName} ${est.autoCode} ${est.village} ${est.category}`);
        if (hay.includes(q)) {
          results.push({
            id: `trd-${est.id}`,
            category: 'التجارة الداخلية والأسواق',
            title: est.name,
            subtitle: `المالك: ${est.ownerName} · التصنيف: ${est.category} · ${est.village}`,
            badge: est.autoCode,
            departmentCode: 'TRADE',
            recordId: est.id,
          });
        }
      });
      loadFuelStations().forEach((st) => {
        const hay = normalizeSearchText(`${st.stationName} ${st.ownerOrManagerName} ${st.stationCode} ${st.operatingCompany} ${st.village}`);
        if (hay.includes(q)) {
          results.push({
            id: `fuel-${st.id}`,
            category: 'المواد البترولية والوقود',
            title: st.stationName,
            subtitle: `الشركة: ${st.operatingCompany} · ${st.village}`,
            badge: st.stationCode,
            departmentCode: 'TRADE',
            recordId: st.id,
          });
        }
      });
      loadButaneWarehouses().forEach((wh) => {
        const hay = normalizeSearchText(`${wh.warehouseName} ${wh.ownerName} ${wh.warehouseCode} ${wh.village}`);
        if (hay.includes(q)) {
          results.push({
            id: `but-${wh.id}`,
            category: 'مستودعات البوتاجاز',
            title: wh.warehouseName,
            subtitle: `المسؤول: ${wh.ownerName} · ${wh.village}`,
            badge: wh.warehouseCode,
            departmentCode: 'TRADE',
            recordId: wh.id,
          });
        }
      });
    } catch {
      // ignore
    }

    // ٧. السلع التموينية والتجار
    try {
      loadRationCommodities().forEach((cm) => {
        const hay = normalizeSearchText(`${cm.commodityName} ${cm.commodityCode} ${cm.category} ${cm.supplySource}`);
        if (hay.includes(q)) {
          results.push({
            id: `comm-${cm.id}`,
            category: 'السلع التموينية',
            title: cm.commodityName,
            subtitle: `التصنيف: ${cm.category} · السعر الرسمي: ${toArabicNumerals(cm.officialSubsidizedPriceEgp)} ج.م / ${cm.unit}`,
            badge: cm.commodityCode,
            departmentCode: 'COMM',
            recordId: cm.id,
          });
        }
      });
      loadRationMerchants().forEach((mr) => {
        const hay = normalizeSearchText(`${mr.outletTradeName} ${mr.merchantName} ${mr.merchantCode} ${mr.village}`);
        if (hay.includes(q)) {
          results.push({
            id: `mrch-${mr.id}`,
            category: 'تجار ومنافذ التموين',
            title: mr.outletTradeName,
            subtitle: `التاجر: ${mr.merchantName} · القرية: ${mr.village}`,
            badge: mr.merchantCode,
            departmentCode: 'COMM',
            recordId: mr.id,
          });
        }
      });
    } catch {
      // ignore
    }

    // ٨. المهام اليومية
    try {
      loadDailyTasks().forEach((tsk) => {
        const hay = normalizeSearchText(`${tsk.title} ${tsk.taskNumber} ${tsk.primaryAssigneeName} ${tsk.departmentName}`);
        if (hay.includes(q)) {
          results.push({
            id: `tsk-${tsk.id}`,
            category: 'المهام اليومية والمتابعة',
            title: tsk.title,
            subtitle: `المكلف: ${tsk.primaryAssigneeName} · ${tsk.departmentName}`,
            badge: tsk.status,
            departmentCode: 'TASKS',
            recordId: tsk.id,
          });
        }
      });
    } catch {
      // ignore
    }

    return results.slice(0, 18);
  }, [globalQuery, branches]);

  const handleSelectSearchResult = (item: GlobalSearchResultItem) => {
    setSearchFocused(false);
    setGlobalQuery('');
    window.dispatchEvent(
      new CustomEvent('gharbia-global-navigate', {
        detail: {
          branchId: item.branchId,
          departmentId: item.departmentId,
          departmentCode: item.departmentCode,
          recordId: item.recordId,
          queryText: item.title,
        },
      })
    );
  };

  const totalNotifCount = urgentAlerts.length + unreadSystemNotifsCount;

  return (
    <header className="app-header bg-[#253B4F] text-white shadow-md border-b border-white/15 sticky top-0 z-40 print:hidden font-sans transition-colors">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-2 min-h-16 flex flex-wrap items-center justify-between gap-2.5">
        {/* Zone 1: Brand & Official Sovereignty Identity */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            className="relative w-10 h-10 rounded-xl overflow-hidden shadow-sm border bg-white shrink-0"
            style={{ borderColor: 'var(--app-accent, #94C9CE)' }}
          >
            <Image
              src="/assets/aistudio/logo_4234585c.jpg"
              alt={t('ministryTitle')}
              fill
              sizes="40px"
              className="object-cover"
              referrerPolicy="no-referrer"
              priority
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-[12.5px] sm:text-[14px] font-black tracking-tight text-white leading-snug">
              {t('ministryTitle')}
            </h1>
            <p className="text-[10.5px] font-extrabold leading-snug opacity-90" style={{ color: 'var(--app-accent, #94C9CE)' }}>
              {t('directorateTitle')} · {currentBranch?.arabicName || t('defaultBranch')}
            </p>
          </div>
        </div>

        {/* Zone 1.5: Global Search Bar Across All Modules, Branches & User Profiles */}
        <div
          ref={searchContainerRef}
          className="relative flex-1 min-w-[230px] max-w-md mx-1"
        >
          <div className="relative flex items-center">
            <Search
              className={`w-4 h-4 text-slate-300 absolute ${
                isRtl ? 'right-3' : 'left-3'
              } pointer-events-none`}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={globalQuery}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => {
                setGlobalQuery(e.target.value);
                setSearchFocused(true);
              }}
              placeholder={
                isRtl
                  ? 'بحث شامل في جميع الأقسام، المخابز، الموظفين، الفروع، والتجارة... (Ctrl+K)'
                  : 'Global search across modules, branches, bakeries & users... (Ctrl+K)'
              }
              className={`w-full ${
                isRtl ? 'pr-9 pl-8' : 'pl-9 pr-8'
              } py-1.5 rounded-xl bg-white/14 hover:bg-white/20 focus:bg-white focus:text-[#102A43] text-white placeholder:text-slate-200/80 focus:placeholder:text-slate-400 border border-white/25 focus:border-[#C6A15B] text-[11.5px] font-black outline-none transition-all shadow-inner`}
            />
            {globalQuery && (
              <button
                type="button"
                onClick={() => {
                  setGlobalQuery('');
                  searchInputRef.current?.focus();
                }}
                className={`absolute ${
                  isRtl ? 'left-2.5' : 'right-2.5'
                } text-slate-400 hover:text-red-600 cursor-pointer`}
                title="مسح البحث"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* نافذة نتائج البحث الشامل الفورية */}
          {searchFocused && globalQuery.trim().length > 0 && (
            <div
              className="app-popover absolute left-0 right-0 mt-2 bg-white text-[#102A43] rounded-2xl shadow-2xl border-2 border-[#102A43]/20 z-50 max-h-96 overflow-y-auto p-2.5 space-y-1.5"
              dir={isRtl ? 'rtl' : 'ltr'}
            >
              <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 text-[10.5px] font-black text-slate-500">
                <span>
                  نتائج البحث الشامل في المنظومة ({toArabicNumerals(globalSearchResults.length)})
                </span>
                <span>اضغط للانتقال الفوري</span>
              </div>

              {globalSearchResults.length === 0 ? (
                <div className="py-6 text-center text-xs font-bold text-slate-500">
                  لا توجد نتائج مطابقة لـ «{globalQuery}» في أي قسم أو فرع.
                </div>
              ) : (
                globalSearchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSearchResult(item)}
                    className="w-full text-right p-2.5 rounded-xl hover:bg-[#F4F7FB] border border-transparent hover:border-slate-200 transition-all flex items-start justify-between gap-2 cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-[#164E83]">
                        <span>{item.category}</span>
                        <span>·</span>
                        <span className="text-[#C6A15B]">{item.badge}</span>
                      </div>
                      <div className="text-xs font-black text-[#102A43] group-hover:text-[#164E83] truncate mt-0.5">
                        {item.title}
                      </div>
                      <div className="text-[10.5px] font-bold text-slate-600 truncate">
                        {item.subtitle}
                      </div>
                    </div>
                    <ArrowUpLeft className="w-4 h-4 text-slate-400 group-hover:text-[#102A43] shrink-0 mt-1" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Zone 2: Clock & Date + Global Control Bar (UX/UI Studio) + Quick Staff Chat */}
        <div className="flex flex-wrap items-center gap-2">
          <ClientClock />
          <GlobalControlBar />
          <button
            type="button"
            onClick={() => openTasksSubTab('internal_chat')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white text-[#102A43] hover:bg-slate-100 font-black text-[11px] shadow-sm border border-white/70 cursor-pointer transition-colors whitespace-nowrap shrink-0"
            title="فتح المحادثات الداخلية والإشعارات بين الموظفين"
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0 text-[#2B6270]" />
            <span>المحادثات الداخلية والإشعارات</span>
            {(unreadChatCount + unreadSystemNotifsCount) > 0 && (
              <span className="num-cell px-1.5 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-black">
                {isRtl ? toArabicNumerals(unreadChatCount + unreadSystemNotifsCount) : unreadChatCount + unreadSystemNotifsCount}
              </span>
            )}
          </button>
        </div>

        {/* Zone 3: Branch Switch, Notification Center, Reports Shortcut, User Account, Logout */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onChangeBranch && (
            <button
              type="button"
              onClick={onChangeBranch}
              className="hidden xl:flex items-center gap-1.5 bg-white/12 hover:bg-white/22 px-3 py-1.5 rounded-xl border border-white/15 text-[11px] text-white font-black transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title={t('switchBranch')}
            >
              <Building className="w-3.5 h-3.5" style={{ color: 'var(--app-accent, #94C9CE)' }} />
              <span className="max-w-[140px] truncate">
                {currentBranch?.arabicName || t('defaultBranch')}
              </span>
              <RefreshCw className="w-3 h-3 opacity-80" />
            </button>
          )}

          {/* Quick Reports Center Button */}
          <button
            type="button"
            onClick={() => openTasksSubTab('reports_center')}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-white/12 hover:bg-white/22 rounded-xl border border-white/15 text-[11px] font-black text-white cursor-pointer whitespace-nowrap shrink-0"
            title="فتح مركز التقارير الموحد"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" style={{ color: 'var(--app-accent, #94C9CE)' }} />
            <span>مركز التقارير</span>
          </button>

          {/* Notification Center Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              className="p-2 bg-white/12 hover:bg-white/22 rounded-xl border border-white/15 text-white relative cursor-pointer shrink-0"
              title={t('notificationsCenter')}
            >
              <Bell className="w-4 h-4" style={{ color: 'var(--app-accent, #94C9CE)' }} />
              {totalNotifCount > 0 && (
                <span className="num-cell absolute -top-1 -right-1 px-1.5 py-0.2 bg-red-600 text-white rounded-md text-[10px] font-black">
                  {isRtl ? toArabicNumerals(totalNotifCount) : totalNotifCount}
                </span>
              )}
            </button>

            {showNotifPanel && (
              <div
                className={`app-popover absolute ${isRtl ? 'left-0' : 'right-0'} mt-2 w-80 sm:w-96 bg-white text-[#1E3346] rounded-2xl shadow-2xl border border-slate-200 z-50 p-3.5 space-y-2.5 text-[11px] font-bold`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-black text-[#1E3346]">
                    {t('notificationsCenter')} ({isRtl ? toArabicNumerals(totalNotifCount) : totalNotifCount})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNotifPanel(false)}
                    className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => openTasksSubTab('internal_chat')}
                    className="px-2 py-2 rounded-xl bg-[#253B4F] text-[#94C9CE] font-black text-[10.5px] cursor-pointer text-center"
                  >
                    المحادثات ({isRtl ? toArabicNumerals(unreadChatCount) : unreadChatCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => openTasksSubTab('notifications')}
                    className="px-2 py-2 rounded-xl bg-[#DCECEF] text-[#1E3346] font-black text-[10.5px] cursor-pointer text-center"
                  >
                    مركز التنبيهات
                  </button>
                  <button
                    type="button"
                    onClick={() => openTasksSubTab('reports_center')}
                    className="px-2 py-2 rounded-xl bg-[#3B717E] text-white font-black text-[10.5px] cursor-pointer text-center"
                  >
                    مركز التقارير
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1.5">
                  {urgentAlerts.map((item) => (
                    <div key={item.id} className="p-2 bg-[#EEF3F7] rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                      <span className="font-extrabold text-[#1E3346]">{item.title}</span>
                      <span className="text-[10px] font-extrabold text-red-700 shrink-0">
                        {item.status}
                      </span>
                    </div>
                  ))}
                  {urgentAlerts.length === 0 && (
                    <p className="text-center text-slate-500 py-3">لا توجد تنبيهات تراخيص عاجلة حالياً.</p>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotifPanel(false);
                      setShowProfileSettings(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 hover:bg-[#102A43] hover:text-white text-[#102A43] font-black text-[11px] flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    {prefs.notificationAudio?.masterEnabled ? (
                      <Volume2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-red-600" />
                    )}
                    <span>إعدادات نغمات الإشعارات والصوت</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Interactive User Profile & Notification Sound Settings Trigger */}
          <button
            type="button"
            onClick={() => setShowProfileSettings(true)}
            title="إعدادات الملف الشخصي ونغمات التنبيه الصوتي"
            className="flex items-center gap-2 bg-white/12 hover:bg-white/22 px-2.5 py-1 rounded-xl border border-white/15 shrink-0 cursor-pointer transition-colors group"
          >
            <div className="w-7 h-7 rounded-lg bg-white text-[#1E3346] flex items-center justify-center font-black text-[11px] shrink-0 relative">
              {currentUser.fullName.charAt(0)}
              <span
                className={`absolute -bottom-1 -left-1 w-3.5 h-3.5 rounded-full flex items-center justify-center border border-[#253B4F] ${
                  prefs.notificationAudio?.masterEnabled
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-500 text-white'
                }`}
              >
                {prefs.notificationAudio?.masterEnabled ? (
                  <Volume2 className="w-2 h-2" />
                ) : (
                  <VolumeX className="w-2 h-2" />
                )}
              </span>
            </div>
            <div className={`hidden sm:block ${isRtl ? 'text-right' : 'text-left'}`}>
              <div className="text-[11px] font-black text-white max-w-[135px] truncate">{currentUser.fullName}</div>
              <div className="text-[10px] font-extrabold max-w-[135px] truncate flex items-center gap-1" style={{ color: 'var(--app-accent, #94C9CE)' }}>
                <span className="truncate">{currentUser.jobTitle || getRoleArabicLabel(currentUser.role)}</span>
                <Settings className="w-3 h-3 shrink-0 opacity-80 group-hover:rotate-45 transition-transform" />
              </div>
            </div>
          </button>

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1 bg-red-600/90 hover:bg-red-700 text-white px-3 py-1.5 rounded-xl text-[11px] font-black transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0"
            title={t('logout')}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('logout')}</span>
          </button>
        </div>
      </div>

      <UserProfileSettingsModal
        open={showProfileSettings}
        onClose={() => setShowProfileSettings(false)}
        currentUser={currentUser}
        currentBranch={currentBranch}
      />
    </header>
  );
}
