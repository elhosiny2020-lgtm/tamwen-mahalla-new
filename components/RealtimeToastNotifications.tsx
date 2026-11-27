'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  ShieldAlert,
  UserCheck,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { getStoredRegistrationRequests } from '@/lib/mock-db';
import { loadDailyTasks } from '@/lib/major-debts-tasks-chat-store';
import { loadHrPersonnelStore } from '@/lib/hr-personnel-store';
import { toArabicNumerals } from '@/lib/utils';
import { useSystemPreferences } from '@/lib/user-preferences-store';
import {
  DEFAULT_NOTIFICATION_AUDIO_PREFS,
  playNotificationForCategory,
} from '@/lib/notification-sound-engine';
import { User } from '@/types';

export type RealtimeToastCategory = 'task' | 'approval' | 'system' | 'security';

export interface RealtimeToastItem {
  id: string;
  title: string;
  message: string;
  category: RealtimeToastCategory;
  timestamp: string;
  actionLabel?: string;
  departmentCode?: string;
}

export function pushRealtimeToast(
  toast: Omit<RealtimeToastItem, 'id' | 'timestamp'>
): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('gharbia-toast-alert', {
      detail: {
        ...toast,
        id: `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    })
  );
}

interface RealtimeToastNotificationsProps {
  currentUser: User;
  onNavigateToDepartmentCode?: (deptCode: string) => void;
}

export default function RealtimeToastNotifications({
  currentUser,
  onNavigateToDepartmentCode,
}: RealtimeToastNotificationsProps) {
  const { isRtl, prefs } = useSystemPreferences();
  const [toasts, setToasts] = useState<RealtimeToastItem[]>([]);
  const audioPrefsRef = useRef(prefs.notificationAudio || DEFAULT_NOTIFICATION_AUDIO_PREFS);
  const recentToastTimestampsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    audioPrefsRef.current = prefs.notificationAudio || DEFAULT_NOTIFICATION_AUDIO_PREFS;
  }, [prefs.notificationAudio]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const enqueueToast = useCallback((item: RealtimeToastItem) => {
    const dedupeKey = `${item.category}::${item.title}::${item.message}`;
    const now = Date.now();
    const lastSeen = recentToastTimestampsRef.current.get(dedupeKey) ?? 0;
    if (now - lastSeen < 2500) {
      return;
    }
    recentToastTimestampsRef.current.set(dedupeKey, now);
    if (recentToastTimestampsRef.current.size > 40) {
      for (const [k, ts] of recentToastTimestampsRef.current.entries()) {
        if (now - ts > 15_000) recentToastTimestampsRef.current.delete(k);
      }
    }

    playNotificationForCategory(item.category, audioPrefsRef.current);
    setToasts((prev) => [item, ...prev].slice(0, 4));
  }, []);

  // فحص تلقائي عند فتح المنظومة للمهام الجديدة والاعتمادات الإدارية المعلقة وتحديثات النظام
  useEffect(() => {
    const timer = setTimeout(() => {
      const tasks = loadDailyTasks();
      const myPendingTasks = tasks.filter(
        (t) =>
          t.status !== 'مكتملة' &&
          t.status !== 'ملغاة بسبب موثق' &&
          (t.primaryAssigneeId === currentUser.id ||
            t.participantIds.includes(currentUser.id) ||
            currentUser.role === 'super_admin')
      );

      const regReqs = getStoredRegistrationRequests().filter((r) => r.status === 'pending');
      const hrStore = loadHrPersonnelStore();
      const pendingRenewals = hrStore.renewalRequests.filter(
        (r) =>
          r.workflowStatus === 'تم الإرسال من الموظف' ||
          r.workflowStatus === 'قيد مراجعة شؤون العاملين'
      );

      if (myPendingTasks.length > 0) {
        enqueueToast({
          id: `init-task-${Date.now()}`,
          title: 'مهام وتكليفات نشطة بالمنظومة',
          message: `يوجد عدد (${toArabicNumerals(myPendingTasks.length)}) مهام يومية قيد المتابعة والتنفيذ (${myPendingTasks[0].title}).`,
          category: 'task',
          timestamp: 'الآن',
          actionLabel: 'فتح إدارة المهام',
          departmentCode: 'TASKS',
        });
      }

      if (regReqs.length > 0 || pendingRenewals.length > 0) {
        const totalPending = regReqs.length + pendingRenewals.length;
        enqueueToast({
          id: `init-appr-${Date.now() + 1}`,
          title: 'اعتمادات إدارية معلقة تنتظر المراجعة',
          message: `يوجد (${toArabicNumerals(totalPending)}) طلبات اعتماد معلقة (${toArabicNumerals(regReqs.length)} حسابات مستخدمين · ${toArabicNumerals(pendingRenewals.length)} طلبات تجديد موارد بشرية).`,
          category: 'approval',
          timestamp: 'الآن',
          actionLabel: regReqs.length > 0 ? 'مراجعة الحسابات' : 'طلبات التجديد',
          departmentCode: regReqs.length > 0 ? 'USERS' : 'HR',
        });
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [currentUser.id, currentUser.role, enqueueToast]);

  // الاستماع اللحظي لأحداث النظام والتدقيق والمهام الجديدة
  useEffect(() => {
    const onCustomToast = (e: Event) => {
      const custom = e as CustomEvent<RealtimeToastItem>;
      if (custom.detail) {
        enqueueToast(custom.detail);
      }
    };

    const onAuditLogAdded = (e: Event) => {
      const custom = e as CustomEvent<{
        action?: string;
        module?: string;
        details?: string;
        status?: string;
      }>;
      const d = custom.detail;
      if (!d || !d.action) return;
      enqueueToast({
        id: `aud-toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: `${d.action} · ${d.module || 'النظام'}`,
        message: d.details || 'تم تحديث البيانات وتوثيق العملية في سجل التدقيق الأمني.',
        category: d.status === 'failed' ? 'security' : 'system',
        timestamp: new Date().toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        actionLabel: 'سجل التدقيق',
        departmentCode: 'AUDIT',
      });
    };

    const onChatUpdated = () => {
      enqueueToast({
        id: `chat-toast-${Date.now()}`,
        title: 'تحديث في المحادثات الداخلية والمهام',
        message: 'تم استلام رسالة أو إشعار داخلي جديد في مركز المهام والمحادثات.',
        category: 'task',
        timestamp: 'الآن',
        actionLabel: 'فتح المحادثات',
        departmentCode: 'TASKS',
      });
    };

    window.addEventListener('gharbia-toast-alert', onCustomToast);
    window.addEventListener('gharbia-audit-log-added', onAuditLogAdded);
    window.addEventListener('gharbia-chat-updated', onChatUpdated);
    return () => {
      window.removeEventListener('gharbia-toast-alert', onCustomToast);
      window.removeEventListener('gharbia-audit-log-added', onAuditLogAdded);
      window.removeEventListener('gharbia-chat-updated', onChatUpdated);
    };
  }, [enqueueToast]);

  // إخفاء تلقائي بعد 8 ثوانٍ لكل تنبيه
  useEffect(() => {
    if (toasts.length === 0) return;
    const interval = setTimeout(() => {
      setToasts((prev) => prev.slice(0, -1));
    }, 8000);
    return () => clearTimeout(interval);
  }, [toasts]);

  if (toasts.length === 0) return null;

  const getCategoryStyle = (cat: RealtimeToastCategory) => {
    switch (cat) {
      case 'task':
        return {
          border: 'border-[#164E83]',
          iconBg: 'bg-[#164E83] text-[#C6A15B]',
          icon: ClipboardList,
        };
      case 'approval':
        return {
          border: 'border-[#C6A15B]',
          iconBg: 'bg-amber-600 text-white',
          icon: UserCheck,
        };
      case 'security':
        return {
          border: 'border-red-600',
          iconBg: 'bg-red-700 text-white',
          icon: ShieldAlert,
        };
      case 'system':
      default:
        return {
          border: 'border-emerald-600',
          iconBg: 'bg-emerald-700 text-white',
          icon: CheckCircle2,
        };
    }
  };

  return (
    <div
      aria-live="polite"
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`fixed bottom-4 ${
        isRtl ? 'left-4' : 'right-4'
      } z-[90] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none print:hidden`}
    >
      {toasts.map((item) => {
        const style = getCategoryStyle(item.category);
        const Icon = style.icon;
        return (
          <div
            key={item.id}
            className={`pointer-events-auto bg-white/98 backdrop-blur-md text-[#102A43] rounded-2xl border-r-4 border ${style.border} shadow-2xl p-3.5 flex items-start gap-3 transition-all`}
          >
            <div
              className={`w-9 h-9 rounded-xl ${style.iconBg} flex items-center justify-center shrink-0 mt-0.5`}
            >
              <Icon className="w-4 h-4" />
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-[#102A43] truncate">
                  {item.title}
                </span>
                <span className="text-[10px] font-bold text-slate-400 shrink-0">
                  {item.timestamp}
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-700 leading-snug break-words">
                {item.message}
              </p>
              <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                {item.actionLabel && item.departmentCode && onNavigateToDepartmentCode ? (
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateToDepartmentCode(item.departmentCode!);
                      dismissToast(item.id);
                    }}
                    className="text-[10.5px] font-black text-[#164E83] hover:text-[#102A43] underline cursor-pointer"
                  >
                    {item.actionLabel} ←
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent('gharbia-open-profile-settings'))
                  }
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-[#164E83] cursor-pointer"
                  title="تخصيص نغمات وصوت الإشعارات"
                >
                  {prefs.notificationAudio?.masterEnabled &&
                  prefs.notificationAudio?.categories?.[item.category]?.enabled ? (
                    <Volume2 className="w-3 h-3 text-emerald-700" />
                  ) : (
                    <VolumeX className="w-3 h-3 text-slate-400" />
                  )}
                  <span>إعدادات الصوت</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => dismissToast(item.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
              title="إغلاق التنبيه"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
