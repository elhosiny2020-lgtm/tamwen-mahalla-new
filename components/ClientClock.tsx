'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { toArabicNumerals } from '@/lib/utils';

export default function ClientClock() {
  const [clockText, setClockText] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClockText(
        toArabicNumerals(
          now.toLocaleDateString('ar-EG', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }) +
            ' · ' +
            now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        )
      );
    };
    const frameId = requestAnimationFrame(updateClock);
    const timer = setInterval(updateClock, 30000);
    return () => {
      cancelAnimationFrame(frameId);
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="flex items-center gap-1.5 bg-[#164E83]/50 px-3 py-1.5 rounded-xl border border-white/10">
      <Clock className="w-3.5 h-3.5 text-[#C6A15B]" />
      <span className="font-mono">{clockText || 'التوقيت المحلي'}</span>
    </div>
  );
}
