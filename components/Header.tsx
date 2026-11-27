'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  LogOut,
  Building,
  Bell,
  RefreshCw,
  MessageSquare,
  FileSpreadsheet,
} from 'lucide-react';
import { User, Branch } from '@/types';
import { getStoredBakeries } from '@/lib/mock-db';
import { evaluateDocumentExpiry } from '@/lib/bakery-math';
import { loadChatMessages, loadUnifiedNotifications } from '@/lib/major-debts-tasks-chat-store';
import { toArabicNumerals, getRoleArabicLabel } from '@/lib/utils';
import { useSystemPreferences } from '@/lib/user-preferences-store';
import ClientClock from './ClientClock';
import GlobalControlBar from './GlobalControlBar';

interface HeaderProps {
  currentUser: User;
  branches: Branch[];
  activeBranchId?: string;
  onChangeBranch?: () => void;
  onLogout: () => void;
}

export default function Header({
  currentUser,
  branches,
  activeBranchId,
  onChangeBranch,
  onLogout,
}: HeaderProps) {
  const { isRtl, t } = useSystemPreferences();
  const currentBranch = branches.find(
    (b) => b.id === (activeBranchId || currentUser.primaryBranchId)
  );
  const [showNotifPanel, setShowNotifPanel] = useState<boolean>(false);
  const [urgentAlerts, setUrgentAlerts] = useState<{ id: string; title: string; status: string }[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [unreadSystemNotifsCount, setUnreadSystemNotifsCount] = useState<number>(0);

  const openTasksSubTab = (subTab: 'internal_chat' | 'notifications' | 'reports_center') => {
    setShowNotifPanel(false);
    window.dispatchEvent(new CustomEvent('gharbia-open-tasks-subtab', { detail: { subTab } }));
  };

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

  const totalNotifCount = urgentAlerts.length + unreadSystemNotifsCount;

  return (
    <header className="app-header bg-[#102A43] text-white shadow-md border-b border-[#164E83] sticky top-0 z-40 print:hidden font-sans">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-2 min-h-16 flex flex-wrap items-center justify-between gap-2.5">
        {/* Zone 1: Brand & Official Sovereignty Identity */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-[#C6A15B]/60 bg-white shrink-0">
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
            <p className="text-[10.5px] text-[#C6A15B] font-extrabold leading-snug">
              {t('directorateTitle')} · {currentBranch?.arabicName || t('defaultBranch')}
            </p>
          </div>
        </div>

        {/* Zone 2: Clock & Date + Global Control Bar + Quick Enlarged Employee Chat & Notifications */}
        <div className="flex flex-wrap items-center gap-2">
          <ClientClock />
          <GlobalControlBar />
          <button
            type="button"
            onClick={() => openTasksSubTab('internal_chat')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-l from-[#C6A15B] to-[#d9b672] hover:from-[#b58f48] hover:to-[#C6A15B] text-[#102A43] font-black text-xs shadow-md border border-white/20 cursor-pointer transition-transform hover:scale-[1.02]"
            title="فتح المحادثات الداخلية والإشعارات بين الموظفين"
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span>المحادثات الداخلية والإشعارات</span>
            {(unreadChatCount + unreadSystemNotifsCount) > 0 && (
              <span className="num-cell px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black">
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
              className="hidden xl:flex items-center gap-1.5 bg-[#164E83] hover:bg-[#1e609e] px-2.5 py-1.5 rounded-xl border border-white/15 text-[11px] text-white font-black transition-colors cursor-pointer"
              title={t('switchBranch')}
            >
              <Building className="w-3.5 h-3.5 text-[#C6A15B]" />
              <span className="max-w-[140px] truncate">
                {currentBranch?.arabicName || t('defaultBranch')}
              </span>
              <RefreshCw className="w-3 h-3 text-[#C6A15B]" />
            </button>
          )}

          {/* Quick Reports Center Button */}
          <button
            type="button"
            onClick={() => openTasksSubTab('reports_center')}
            className="hidden md:flex items-center gap-1 px-2.5 py-1.5 bg-[#164E83]/80 hover:bg-[#164E83] rounded-xl border border-white/15 text-[11px] font-black text-white cursor-pointer"
            title="فتح مركز التقارير الموحد"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#C6A15B]" />
            <span>مركز التقارير</span>
          </button>

          {/* Notification Center Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              className="p-2 bg-[#164E83]/70 hover:bg-[#164E83] rounded-xl border border-white/15 text-white relative cursor-pointer"
              title={t('notificationsCenter')}
            >
              <Bell className="w-4 h-4 text-[#C6A15B]" />
              {totalNotifCount > 0 && (
                <span className="num-cell absolute -top-1 -right-1 px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[10px] font-black">
                  {isRtl ? toArabicNumerals(totalNotifCount) : totalNotifCount}
                </span>
              )}
            </button>

            {showNotifPanel && (
              <div
                className={`absolute ${isRtl ? 'left-0' : 'right-0'} mt-2 w-80 sm:w-96 bg-white text-[#102A43] rounded-2xl shadow-2xl border border-slate-200 z-50 p-3.5 space-y-2.5 text-[11px] font-bold`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-black text-[#102A43]">
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
                    className="px-2 py-2 rounded-xl bg-[#102A43] text-[#C6A15B] font-black text-[10.5px] cursor-pointer text-center"
                  >
                    المحادثات ({isRtl ? toArabicNumerals(unreadChatCount) : unreadChatCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => openTasksSubTab('notifications')}
                    className="px-2 py-2 rounded-xl bg-amber-500 text-[#102A43] font-black text-[10.5px] cursor-pointer text-center"
                  >
                    مركز التنبيهات
                  </button>
                  <button
                    type="button"
                    onClick={() => openTasksSubTab('reports_center')}
                    className="px-2 py-2 rounded-xl bg-[#164E83] text-white font-black text-[10.5px] cursor-pointer text-center"
                  >
                    مركز التقارير
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1.5">
                  {urgentAlerts.map((item) => (
                    <div key={item.id} className="p-2 bg-[#F4F7FB] rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                      <span className="font-extrabold text-[#102A43]">{item.title}</span>
                      <span className="text-[10px] font-extrabold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 shrink-0">
                        {item.status}
                      </span>
                    </div>
                  ))}
                  {urgentAlerts.length === 0 && (
                    <p className="text-center text-slate-500 py-3">لا توجد تنبيهات تراخيص عاجلة حالياً.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-2 bg-[#164E83]/40 px-2.5 py-1 rounded-xl border border-white/10">
            <div className="w-7 h-7 rounded-lg bg-[#C6A15B] text-[#102A43] flex items-center justify-center font-black text-[11px] shrink-0">
              {currentUser.fullName.charAt(0)}
            </div>
            <div className={`hidden sm:block ${isRtl ? 'text-right' : 'text-left'}`}>
              <div className="text-[11px] font-black text-white max-w-[135px] truncate">{currentUser.fullName}</div>
              <div className="text-[10px] text-[#C6A15B] font-extrabold max-w-[135px] truncate">
                {currentUser.jobTitle || getRoleArabicLabel(currentUser.role)}
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1 bg-red-700 hover:bg-red-800 text-white px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-all shadow-xs cursor-pointer whitespace-nowrap"
            title={t('logout')}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('logout')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
