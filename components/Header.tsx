'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  LogOut,
  Building,
  Bell,
  Database,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { User, Branch } from '@/types';
import { getStoredBakeries } from '@/lib/mock-db';
import { evaluateDocumentExpiry } from '@/lib/bakery-math';
import { toArabicNumerals, getRoleArabicLabel } from '@/lib/utils';
import ClientClock from './ClientClock';

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
  const currentBranch = branches.find(
    (b) => b.id === (activeBranchId || currentUser.primaryBranchId)
  );
  const [showNotifPanel, setShowNotifPanel] = useState<boolean>(false);
  const [urgentAlerts, setUrgentAlerts] = useState<{ id: string; title: string; status: string }[]>([]);

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
    };
    const frameId = requestAnimationFrame(loadAlerts);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <header className="bg-[#102A43] text-white shadow-md border-b border-[#164E83] sticky top-0 z-40 print:hidden font-sans">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand & Official Sovereignty Identity with Official Emblem */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative w-11 h-11 rounded-xl overflow-hidden shadow-sm border border-[#C6A15B]/60 bg-white shrink-0">
            <Image
              src="/assets/aistudio/logo_4234585c.jpg"
              alt="شعار وزارة التموين والتجارة الداخلية"
              fill
              sizes="44px"
              className="object-cover"
              referrerPolicy="no-referrer"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[13px] sm:text-[15px] font-black tracking-tight text-white whitespace-nowrap">
                وزارة التموين والتجارة الداخلية — محافظة الغربية
              </h1>
            </div>
            <p className="text-[10.5px] text-[#C6A15B] font-extrabold">
              مديرية التموين بالغربية · {currentBranch?.arabicName || 'إدارة تموين مركز المحلة الكبرى'}
            </p>
          </div>
        </div>

        {/* Zone 2: Live Enterprise Telemetry */}
        <div className="hidden xl:flex items-center gap-3 text-[11px] text-slate-200 font-extrabold">
          <ClientClock />
          <div className="flex items-center gap-1.5 bg-[#164E83]/50 px-2.5 py-1 rounded-xl border border-white/10">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>قاعدة البيانات متصلة</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#164E83]/50 px-2.5 py-1 rounded-xl border border-white/10">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#C6A15B]" />
            <span>الحفظ التلقائي مفعل</span>
          </div>
        </div>

        {/* Zone 3: Branch Switch, Notification Center, User Account, Logout */}
        <div className="flex items-center gap-2 shrink-0">
          {onChangeBranch && (
            <button
              type="button"
              onClick={onChangeBranch}
              className="hidden md:flex items-center gap-1.5 bg-[#164E83] hover:bg-[#1e609e] px-2.5 py-1 rounded-xl border border-white/15 text-[11px] text-white font-black transition-colors cursor-pointer"
              title="تبديل الإدارة التموينية"
            >
              <Building className="w-3.5 h-3.5 text-[#C6A15B]" />
              <span className="max-w-[180px] truncate">
                {currentBranch?.arabicName || 'إدارة تموين مركز المحلة الكبرى'}
              </span>
              <RefreshCw className="w-3 h-3 text-[#C6A15B] mr-1" />
            </button>
          )}

          {/* Notification Center Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              className="p-2 bg-[#164E83]/70 hover:bg-[#164E83] rounded-xl border border-white/15 text-white relative cursor-pointer"
              title="مركز الإشعارات والتنبيهات"
            >
              <Bell className="w-4 h-4 text-[#C6A15B]" />
              {urgentAlerts.length > 0 && (
                <span className="num-cell absolute -top-1 -right-1 px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[10px] font-black">
                  {toArabicNumerals(urgentAlerts.length)}
                </span>
              )}
            </button>

            {showNotifPanel && (
              <div className="absolute left-0 mt-2 w-80 bg-white text-[#102A43] rounded-2xl shadow-2xl border border-slate-200 z-50 p-3 space-y-2 text-[11px] font-bold">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-black text-[#102A43]">مركز الإشعارات والتنبيهات ({toArabicNumerals(urgentAlerts.length)})</span>
                  <button
                    type="button"
                    onClick={() => setShowNotifPanel(false)}
                    className="text-slate-400 hover:text-slate-700 font-bold"
                  >
                    ✕
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1.5">
                  {urgentAlerts.map((item) => (
                    <div key={item.id} className="p-2 bg-[#F4F7FB] rounded-xl border border-slate-200 flex items-center justify-between">
                      <span className="font-extrabold text-[#102A43]">{item.title}</span>
                      <span className="text-[10px] font-extrabold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-2 bg-[#164E83]/40 px-2.5 py-1 rounded-xl border border-white/10">
            <div className="w-7 h-7 rounded-lg bg-[#C6A15B] text-[#102A43] flex items-center justify-center font-black text-[11px]">
              {currentUser.fullName.charAt(0)}
            </div>
            <div className="hidden sm:block text-right">
              <div className="text-[11px] font-black text-white max-w-[150px] truncate">{currentUser.fullName}</div>
              <div className="text-[10px] text-[#C6A15B] font-extrabold">{currentUser.jobTitle || getRoleArabicLabel(currentUser.role)}</div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1 bg-red-700 hover:bg-red-800 text-white px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-all shadow-xs cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">خروج</span>
          </button>
        </div>
      </div>
    </header>
  );
}
