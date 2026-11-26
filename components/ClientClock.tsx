'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { toArabicNumerals } from '@/lib/utils';

export default function ClientClock() {
  const [dayName, setDayName] = useState<string>('');
  const [dateText, setDateText] = useState<string>('');
  const [timeText, setTimeText] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setDayName(
        now.toLocaleDateString('ar-EG', {
          weekday: 'long',
        })
      );
      setDateText(
        toArabicNumerals(
          now.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        )
      );
      setTimeText(
        toArabicNumerals(
          now.toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          })
        )
      );
    };
    const frameId = requestAnimationFrame(updateClock);
    const timer = setInterval(updateClock, 1000);
    return () => {
      cancelAnimationFrame(frameId);
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2 bg-[#0B1F33]/80 px-3 py-1.5 rounded-xl border border-[#C6A15B]/40 shadow-xs">
      <div className="flex items-center gap-1.5 text-[11px] font-black text-white">
        <Calendar className="w-3.5 h-3.5 text-[#C6A15B] shrink-0" />
        <span className="text-[#C6A15B]">اليوم: {dayName || 'الأربعاء'}</span>
        <span className="text-slate-300">·</span>
        <span>{dateText || '٢٥ نوفمبر ٢٠٢٦'}</span>
      </div>
      <div className="h-3.5 w-[1px] bg-white/20 hidden sm:block" />
      <div className="flex items-center gap-1.5 bg-[#102A43] px-2.5 py-0.5 rounded-lg border border-[#C6A15B]/30">
        <Clock className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
        <span className="font-mono text-[11.5px] font-black text-emerald-300 tracking-wider">
          {timeText || '١٢:٠٠:٠٠ م'}
        </span>
      </div>
    </div>
  );
}
