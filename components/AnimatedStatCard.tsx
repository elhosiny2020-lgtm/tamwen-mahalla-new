'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { formatArabicDecimal, formatArabicNumber, formatArabicPercent } from '@/lib/utils';

export type StatColorTheme = 'navy' | 'green' | 'gold' | 'red' | 'teal' | 'purple' | 'blue';

interface AnimatedStatCardProps {
  title: string;
  value: number;
  subtitle?: string;
  unit?: string;
  format?: 'integer' | 'decimal' | 'currency' | 'percent';
  decimals?: number;
  icon: React.ElementType;
  theme: StatColorTheme;
  indicator?: string;
  compact?: boolean;
  delay?: number;
  onClick?: () => void;
}

const THEME_STYLES: Record<
  StatColorTheme,
  {
    cardBg: string;
    border: string;
    iconBox: string;
    valueColor: string;
    indicatorBg: string;
    topBar: string;
  }
> = {
  navy: {
    cardBg: 'bg-gradient-to-bl from-[#102A43]/[0.06] via-white to-white',
    border: 'border-[#102A43]/20 hover:border-[#102A43]/45',
    iconBox: 'bg-[#102A43] text-[#C6A15B]',
    valueColor: 'text-[#102A43]',
    indicatorBg: 'text-[#102A43] bg-[#102A43]/10',
    topBar: 'bg-[#102A43]',
  },
  green: {
    cardBg: 'bg-gradient-to-bl from-emerald-600/[0.08] via-white to-white',
    border: 'border-emerald-200 hover:border-emerald-500/60',
    iconBox: 'bg-emerald-700 text-white',
    valueColor: 'text-emerald-800',
    indicatorBg: 'text-emerald-800 bg-emerald-100/80',
    topBar: 'bg-emerald-700',
  },
  gold: {
    cardBg: 'bg-gradient-to-bl from-[#C6A15B]/[0.14] via-white to-white',
    border: 'border-[#C6A15B]/45 hover:border-[#C6A15B]',
    iconBox: 'bg-[#C6A15B] text-[#102A43]',
    valueColor: 'text-amber-900',
    indicatorBg: 'text-amber-900 bg-amber-100/80',
    topBar: 'bg-[#C6A15B]',
  },
  red: {
    cardBg: 'bg-gradient-to-bl from-red-600/[0.08] via-white to-white',
    border: 'border-red-200 hover:border-red-500/60',
    iconBox: 'bg-red-700 text-white',
    valueColor: 'text-red-800',
    indicatorBg: 'text-red-800 bg-red-100/80',
    topBar: 'bg-red-700',
  },
  teal: {
    cardBg: 'bg-gradient-to-bl from-teal-600/[0.08] via-white to-white',
    border: 'border-teal-200 hover:border-teal-500/60',
    iconBox: 'bg-teal-700 text-white',
    valueColor: 'text-teal-800',
    indicatorBg: 'text-teal-800 bg-teal-100/80',
    topBar: 'bg-teal-700',
  },
  purple: {
    cardBg: 'bg-gradient-to-bl from-indigo-600/[0.08] via-white to-white',
    border: 'border-indigo-200 hover:border-indigo-500/60',
    iconBox: 'bg-indigo-700 text-white',
    valueColor: 'text-indigo-900',
    indicatorBg: 'text-indigo-900 bg-indigo-100/80',
    topBar: 'bg-indigo-700',
  },
  blue: {
    cardBg: 'bg-gradient-to-bl from-[#164E83]/[0.08] via-white to-white',
    border: 'border-[#164E83]/25 hover:border-[#164E83]/60',
    iconBox: 'bg-[#164E83] text-white',
    valueColor: 'text-[#164E83]',
    indicatorBg: 'text-[#164E83] bg-[#164E83]/10',
    topBar: 'bg-[#164E83]',
  },
};

export default function AnimatedStatCard({
  title,
  value,
  subtitle,
  unit,
  format = 'integer',
  decimals = 3,
  icon: Icon,
  theme,
  indicator,
  compact = false,
  delay = 0,
  onClick,
}: AnimatedStatCardProps) {
  const safeTarget = Number.isFinite(value) ? value : 0;
  const [displayValue, setDisplayValue] = useState<number>(safeTarget);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      const frame = requestAnimationFrame(() => setDisplayValue(safeTarget));
      return () => cancelAnimationFrame(frame);
    }

    let rafId = 0;
    const duration = 680;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Smooth easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = safeTarget * eased;
      setDisplayValue(progress >= 1 ? safeTarget : current);
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [safeTarget]);

  const formattedNumber = (() => {
    if (format === 'decimal') return formatArabicDecimal(displayValue, decimals);
    if (format === 'currency') return `${formatArabicNumber(Math.round(displayValue))} ج.م`;
    if (format === 'percent') return formatArabicPercent(displayValue, decimals);
    return formatArabicNumber(Math.round(displayValue));
  })();

  const styles = THEME_STYLES[theme];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(delay, 0.3), ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border shadow-xs transition-shadow hover:shadow-md ${styles.cardBg} ${styles.border} ${
        compact ? 'p-3' : 'p-4'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className={`absolute top-0 right-0 left-0 h-1 ${styles.topBar}`} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <span
            className={`${
              compact ? 'text-[10.5px] leading-snug' : 'text-[11.5px] leading-snug'
            } font-black text-slate-700 block break-words whitespace-normal`}
            title={title}
          >
            {title}
          </span>
          <div
            className={`num-cell ${
              compact ? 'text-base sm:text-lg' : 'text-lg sm:text-[20px]'
            } font-black break-words leading-tight my-0.5 ${styles.valueColor}`}
          >
            {formattedNumber}
          </div>
          <div className="flex items-center flex-wrap gap-1">
            {unit && (
              <span className="text-[10px] font-extrabold text-slate-600 break-words whitespace-normal leading-tight">
                {unit}
              </span>
            )}
            {subtitle && !unit && (
              <span className="text-[10px] font-extrabold text-slate-600 break-words whitespace-normal leading-tight">
                {subtitle}
              </span>
            )}
            {indicator && (
              <span
                className={`text-[9.5px] font-black px-1.5 py-0.5 rounded break-words whitespace-normal leading-tight ${styles.indicatorBg}`}
              >
                {indicator}
              </span>
            )}
          </div>
        </div>
        <div
          className={`${compact ? 'w-8 h-8 rounded-xl' : 'w-10 h-10 rounded-xl'} flex items-center justify-center shrink-0 shadow-xs ${styles.iconBox}`}
        >
          <Icon className={compact ? 'w-4 h-4' : 'w-4.5 h-4.5'} />
        </div>
      </div>
    </motion.div>
  );
}
