'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { toArabicNumerals } from '@/lib/utils';
import { useIsClient } from '@/hooks/use-is-client';
import { useSystemPreferences } from '@/lib/user-preferences-store';

export default function ClientClock() {
  const { prefs, t } = useSystemPreferences();
  const isAr = prefs.language === 'ar';
  const isClient = useIsClient();
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const locale = isAr ? 'ar-EG' : 'en-GB';
  const now = isClient ? new Date(nowMs) : null;
  const dayName = now ? now.toLocaleDateString(locale, { weekday: 'long' }) : '';
  const formattedDate = now
    ? now.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';
  const formattedTime = now
    ? now.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
    : '';

  const dateText = isClient ? (isAr ? toArabicNumerals(formattedDate) : formattedDate) : '';
  const timeText = isClient ? (isAr ? toArabicNumerals(formattedTime) : formattedTime) : '';

  return (
    <div className="flex flex-wrap items-center gap-2 bg-[#0B1F33]/80 px-3 py-1.5 rounded-xl border border-[#C6A15B]/40 shadow-xs">
      <div className="flex items-center gap-1.5 text-[11px] font-black text-white">
        <Calendar className="w-3.5 h-3.5 text-[#C6A15B] shrink-0" />
        <span className="text-[#C6A15B]">
          {t('todayLabel')}: {dayName || (isAr ? 'الخميس' : 'Thursday')}
        </span>
        <span className="text-slate-300">·</span>
        <span>{dateText || (isAr ? '٢٦ نوفمبر ٢٠٢٦' : '26 November 2026')}</span>
      </div>
      <div className="h-3.5 w-[1px] bg-white/20 hidden sm:block" />
      <div className="flex items-center gap-1.5 bg-[#102A43] px-2.5 py-0.5 rounded-lg border border-[#C6A15B]/30">
        <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="font-mono text-[11.5px] font-black text-emerald-300 tracking-wider tabular-nums">
          {timeText || (isAr ? '١٢:٠٠:٠٠ م' : '12:00:00 PM')}
        </span>
      </div>
    </div>
  );
}
