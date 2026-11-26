'use client';

import React from 'react';
import { Clock, RefreshCw, LogOut, X } from 'lucide-react';
import { toArabicNumerals } from '@/lib/utils';

interface SessionExpiryBannerProps {
  remainingSeconds: number | null;
  isNearExpiration: boolean;
  onDismiss: () => void;
  onLogoutNow: () => void;
}

/**
 * Gentle, non-intrusive floating notification banner shown when the session token is near expiration.
 */
export default function SessionExpiryBanner({
  remainingSeconds,
  isNearExpiration,
  onDismiss,
  onLogoutNow,
}: SessionExpiryBannerProps) {
  if (!isNearExpiration || remainingSeconds === null) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${toArabicNumerals(minutes)}:${toArabicNumerals(
    String(seconds).padStart(2, '0')
  )}`;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 max-w-md bg-[#102A43]/95 backdrop-blur-md text-white border border-[#C6A15B]/60 rounded-2xl shadow-2xl p-3.5 flex items-start gap-3 font-sans print:hidden"
    >
      <div className="w-9 h-9 rounded-xl bg-[#C6A15B]/20 border border-[#C6A15B]/50 text-[#C6A15B] flex items-center justify-center shrink-0 mt-0.5">
        <Clock className="w-4 h-4 animate-pulse" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-[11.5px] font-black text-[#C6A15B]">
            تنبيه قرب انتهاء جلسة المصادقة
          </h4>
          <span className="num-cell text-[11px] font-black bg-[#164E83] text-white px-2 py-0.5 rounded-lg border border-white/15">
            {formattedTime}
          </span>
        </div>
        <p className="text-[10.5px] font-bold text-slate-200 mt-1 leading-relaxed">
          ستنتهي صلاحية جلسة العمل الحالية قريباً لحماية أمن البيانات، وسيتم توجيهك تلقائياً إلى شاشة تسجيل الدخول عند انتهاء الوقت.
        </p>

        <div className="flex items-center gap-2 mt-2.5">
          <button
            type="button"
            onClick={onDismiss}
            className="px-2.5 py-1 bg-[#164E83] hover:bg-[#1e609e] text-white rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3 h-3 text-[#C6A15B]" />
            <span>متابعة العمل</span>
          </button>
          <button
            type="button"
            onClick={onLogoutNow}
            className="px-2.5 py-1 bg-red-700/80 hover:bg-red-700 text-white rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer transition-colors"
          >
            <LogOut className="w-3 h-3" />
            <span>تسجيل الدخول مجدداً</span>
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="text-slate-400 hover:text-white p-1 cursor-pointer"
        title="إغلاق التنبيه"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
