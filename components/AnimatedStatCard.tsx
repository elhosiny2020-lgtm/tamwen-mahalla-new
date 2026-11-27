'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { formatArabicDecimal, formatArabicNumber, formatArabicPercent } from '@/lib/utils';
import { useSystemPreferences } from '@/lib/user-preferences-store';

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
    indicatorColor: string;
    subtitleColor: string;
    darkIconBox: string;
    darkAccentBorder: string;
  }
> = {
  navy: {
    cardBg: 'bg-gradient-to-br from-[#D9E4EC] via-[#CBD9E3] to-[#BDCDD9]',
    border: 'border-white/75 hover:border-white',
    iconBox: 'bg-[#EEF5F9] text-[#253B4F] shadow-[0_4px_10px_rgba(37,59,79,0.16)]',
    valueColor: 'text-[#182B3B]',
    indicatorColor: 'text-[#253B4F]',
    subtitleColor: 'text-[#395166]',
    darkIconBox: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
    darkAccentBorder: 'border-sky-400/25 hover:border-sky-400/50',
  },
  green: {
    cardBg: 'bg-gradient-to-br from-[#CFE8E4] via-[#BBDCD7] to-[#A6CFC9]',
    border: 'border-white/75 hover:border-white',
    iconBox: 'bg-[#E9F7F5] text-[#1D5C54] shadow-[0_4px_10px_rgba(29,92,84,0.16)]',
    valueColor: 'text-[#133A35]',
    indicatorColor: 'text-[#154A43]',
    subtitleColor: 'text-[#245952]',
    darkIconBox: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
    darkAccentBorder: 'border-emerald-400/25 hover:border-emerald-400/50',
  },
  gold: {
    cardBg: 'bg-gradient-to-br from-[#EDE4D4] via-[#E3D5BE] to-[#D7C6AA]',
    border: 'border-white/75 hover:border-white',
    iconBox: 'bg-[#FAF5EB] text-[#6B4E1B] shadow-[0_4px_10px_rgba(107,78,27,0.16)]',
    valueColor: 'text-[#3D2C0F]',
    indicatorColor: 'text-[#6B4E1B]',
    subtitleColor: 'text-[#5E461D]',
    darkIconBox: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
    darkAccentBorder: 'border-amber-400/25 hover:border-amber-400/50',
  },
  red: {
    cardBg: 'bg-gradient-to-br from-[#EFE0E3] via-[#E7CED3] to-[#DDBCC3]',
    border: 'border-white/75 hover:border-white',
    iconBox: 'bg-[#FBF3F5] text-[#882B3B] shadow-[0_4px_10px_rgba(136,43,59,0.16)]',
    valueColor: 'text-[#521823]',
    indicatorColor: 'text-[#882B3B]',
    subtitleColor: 'text-[#6B2835]',
    darkIconBox: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
    darkAccentBorder: 'border-rose-400/25 hover:border-rose-400/50',
  },
  teal: {
    cardBg: 'bg-gradient-to-br from-[#B5D7DC] via-[#A1CAD0] to-[#8FBCC4]',
    border: 'border-white/75 hover:border-white',
    iconBox: 'bg-[#DFF1F3] text-[#2B6270] shadow-[0_4px_10px_rgba(43,98,112,0.18)]',
    valueColor: 'text-[#142D37]',
    indicatorColor: 'text-[#193A46]',
    subtitleColor: 'text-[#214B59]',
    darkIconBox: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30',
    darkAccentBorder: 'border-cyan-400/25 hover:border-cyan-400/50',
  },
  purple: {
    cardBg: 'bg-gradient-to-br from-[#A6ACCC] via-[#959BC0] to-[#858BB3]',
    border: 'border-white/65 hover:border-white',
    iconBox: 'bg-[#E3E6F4] text-[#353B6B] shadow-[0_4px_10px_rgba(53,59,107,0.18)]',
    valueColor: 'text-[#171A38]',
    indicatorColor: 'text-[#1F2347]',
    subtitleColor: 'text-[#252A4D]',
    darkIconBox: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30',
    darkAccentBorder: 'border-indigo-400/25 hover:border-indigo-400/50',
  },
  blue: {
    cardBg: 'bg-gradient-to-br from-[#E2EBF2] via-[#D3DFE8] to-[#C4D3DF]',
    border: 'border-white/80 hover:border-white',
    iconBox: 'bg-[#F4F8FB] text-[#254E6B] shadow-[0_4px_10px_rgba(37,78,107,0.16)]',
    valueColor: 'text-[#172C3D]',
    indicatorColor: 'text-[#1F3A52]',
    subtitleColor: 'text-[#314F69]',
    darkIconBox: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
    darkAccentBorder: 'border-blue-400/25 hover:border-blue-400/50',
  },
};

export default function AnimatedStatCard({
  title,
  value,
  subtitle,
  unit,
  format = 'integer',
  decimals = 2,
  icon: Icon,
  theme,
  indicator,
  compact = false,
  delay = 0,
  onClick,
}: AnimatedStatCardProps) {
  const { prefs } = useSystemPreferences();
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
  const isDarkTheme =
    prefs.themeId === 'dark_mode' ||
    prefs.themeId === 'midnight_aurora' ||
    prefs.themeId === 'obsidian_glass' ||
    prefs.themeId === 'aurora_glass' ||
    prefs.themeId === 'cyber_ocean_dark' ||
    prefs.themeId === 'deep_ocean_flame';
  const layout = prefs.uiLayout;

  const containerStyleClass = (() => {
    if (layout === 'cyber_hud_cockpit' || prefs.themeId === 'cyber_ocean_dark') {
      return 'rounded-2xl bg-[#092236]/85 border border-cyan-400/35 shadow-[0_14px_32px_-12px_rgba(0,12,24,0.75)]';
    }
    if (isDarkTheme) {
      return `rounded-2xl bg-[#131E31]/95 ${styles.darkAccentBorder} shadow-lg`;
    }
    if (layout === 'tactile_clay_3d' || prefs.themeId === 'clay_slate_3d') {
      return 'rounded-[26px] bg-[#C8D6DF] border border-white/65 shadow-[10px_12px_22px_rgba(32,54,72,0.22),-6px_-6px_14px_rgba(255,255,255,0.5),inset_0_2px_2px_rgba(255,255,255,0.72)]';
    }
    if (layout === 'floating_top_glass') {
      return 'rounded-[24px] bg-white/80 backdrop-blur-xl border border-white/90 shadow-[0_14px_30px_-14px_rgba(20,58,107,0.16)]';
    }
    if (layout === 'clean_light_sidebar') {
      return 'rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 shadow-[0_6px_18px_-10px_rgba(15,23,42,0.1)]';
    }
    if (layout === 'ultra_minimal') {
      return 'rounded-xl bg-white border border-slate-200 hover:border-slate-400 shadow-none';
    }
    if (layout === 'royal_heritage') {
      return 'rounded-xl bg-white border border-[#C6A15B]/45 hover:border-[#C6A15B] shadow-sm';
    }
    if (layout === 'executive_command') {
      return 'rounded-2xl bg-white border border-slate-200 hover:border-[#164E83] shadow-sm';
    }
    if (layout === 'operations_cockpit') {
      return `rounded-2xl ${styles.cardBg} ${styles.border} shadow-md`;
    }
    return `rounded-[22px] border shadow-[0_10px_24px_-10px_rgba(30,51,70,0.24),inset_0_1px_0_rgba(255,255,255,0.65)] hover:shadow-[0_14px_28px_-10px_rgba(30,51,70,0.34)] ${styles.cardBg} ${styles.border}`;
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(delay, 0.3), ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      onClick={onClick}
      className={`relative overflow-hidden transition-all ${containerStyleClass} ${
        compact ? 'p-3.5' : 'p-4'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div
            className={`${compact ? 'w-9 h-9 rounded-xl' : 'w-10 h-10 rounded-xl'} flex items-center justify-center shrink-0 border ${
              isDarkTheme
                ? styles.darkIconBox
                : layout === 'ultra_minimal'
                ? 'bg-slate-100 text-[#102A43] border-slate-200'
                : `${styles.iconBox} border-white/80`
            }`}
          >
            <Icon className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
          </div>
          {indicator && (
            <span
              className={`text-[10px] font-black leading-tight ${
                isDarkTheme ? 'text-slate-300' : styles.indicatorColor
              }`}
            >
              {indicator}
            </span>
          )}
        </div>

        <div className="min-w-0 space-y-0.5">
          <span
            className={`${
              compact ? 'text-[11px] leading-snug' : 'text-xs leading-snug'
            } font-black block break-words whitespace-normal ${
              isDarkTheme ? 'text-slate-300' : styles.subtitleColor
            }`}
            title={title}
          >
            {title}
          </span>
          <div
            className={`num-cell ${
              compact ? 'text-lg sm:text-xl' : 'text-2xl sm:text-[26px]'
            } font-black break-words leading-tight ${
              isDarkTheme ? 'text-white' : styles.valueColor
            }`}
          >
            {formattedNumber}
          </div>
          {(unit || subtitle) && (
            <span
              className={`text-[10.5px] font-extrabold block leading-tight ${
                isDarkTheme ? 'text-slate-400' : styles.subtitleColor
              }`}
            >
              {unit || subtitle}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
