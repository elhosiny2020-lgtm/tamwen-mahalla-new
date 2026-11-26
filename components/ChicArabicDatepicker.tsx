'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatDateArabic, toArabicNumerals } from '@/lib/utils';

const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

const ARABIC_WEEKDAYS = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];

interface ChicArabicDatepickerProps {
  value: string;
  onChange: (nextIsoDate: string) => void;
  label?: string;
  placeholder?: string;
  todayRef?: string;
  disabled?: boolean;
  compact?: boolean;
}

function parseIsoDate(iso?: string): { year: number; month: number; day: number } | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m - 1, day: d };
}

function toIsoDate(year: number, monthIndex: number, day: number): string {
  const mm = String(monthIndex + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

export default function ChicArabicDatepicker({
  value,
  onChange,
  label,
  placeholder = 'اختر التاريخ من التقويم...',
  todayRef = '2026-11-25',
  disabled = false,
  compact = false,
}: ChicArabicDatepickerProps) {
  const parsed = parseIsoDate(value);
  const parsedToday = parseIsoDate(todayRef) || { year: 2026, month: 10, day: 25 };

  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState<number>(parsed?.year ?? parsedToday.year);
  const [viewMonth, setViewMonth] = useState<number>(parsed?.month ?? parsedToday.month);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun..6=Sat
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewYear, viewMonth]);

  const isExpired = Boolean(value && value !== '—' && /^\d{4}-\d{2}-\d{2}$/.test(value) && value < todayRef);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const applyPresetYears = (yearsToAdd: number) => {
    const base = new Date(parsedToday.year, parsedToday.month, parsedToday.day);
    base.setFullYear(base.getFullYear() + yearsToAdd);
    const iso = toIsoDate(base.getFullYear(), base.getMonth(), base.getDate());
    onChange(iso);
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full" dir="rtl">
      {label && (
        <label className="font-black text-[#102A43] text-[11px] block mb-1">{label}</label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          const p = parseIsoDate(value);
          if (p) {
            setViewYear(p.year);
            setViewMonth(p.month);
          }
          setIsOpen((o) => !o);
        }}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border transition-all text-right ${
          compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-2 text-xs'
        } ${
          disabled
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : isOpen
            ? 'bg-white border-[#C6A15B] ring-2 ring-[#C6A15B]/30 text-[#102A43] cursor-pointer'
            : isExpired
            ? 'bg-red-50/70 border-red-300 text-red-800 hover:border-red-500 cursor-pointer'
            : 'bg-white border-slate-300 text-[#102A43] hover:border-[#164E83] cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <CalendarIcon
            className={`w-3.5 h-3.5 shrink-0 ${
              isExpired ? 'text-red-600' : 'text-[#164E83]'
            }`}
          />
          <span className="num-cell font-black truncate">
            {value && value !== '—'
              ? `${formatDateArabic(value)}${isExpired ? ' (منتهي)' : ''}`
              : placeholder}
          </span>
        </div>
        {value && value !== '—' && !disabled && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation();
                onChange('');
              }
            }}
            className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700"
            title="مسح التاريخ"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-[290px] bg-white rounded-2xl border-2 border-[#102A43] shadow-2xl z-50 overflow-hidden">
          {/* ترويسة التقويم الملكي */}
          <div className="bg-gradient-to-l from-[#102A43] to-[#164E83] text-white px-3 py-2.5 flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#C6A15B] cursor-pointer"
              title="الشهر السابق"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="bg-[#0B1F33] text-white text-xs font-black px-2 py-1 rounded-lg border border-[#C6A15B]/40 cursor-pointer"
              >
                {ARABIC_MONTHS.map((mName, idx) => (
                  <option key={mName} value={idx}>
                    {mName}
                  </option>
                ))}
              </select>
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="bg-[#0B1F33] text-[#C6A15B] text-xs font-black px-2 py-1 rounded-lg border border-[#C6A15B]/40 num-cell cursor-pointer"
              >
                {Array.from({ length: 21 }, (_, idx) => 2020 + idx).map((yr) => (
                  <option key={yr} value={yr}>
                    {toArabicNumerals(yr)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#C6A15B] cursor-pointer"
              title="الشهر التالي"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* أيام الأسبوع */}
          <div className="grid grid-cols-7 gap-1 px-3 pt-2.5 pb-1 bg-slate-50 border-b border-slate-200 text-center">
            {ARABIC_WEEKDAYS.map((wd) => (
              <span key={wd} className="text-[10.5px] font-black text-[#164E83]">
                {wd}
              </span>
            ))}
          </div>

          {/* شبكة الأيام */}
          <div className="grid grid-cols-7 gap-1 p-2.5">
            {calendarCells.map((day, idx) => {
              if (day === null) {
                return <span key={`empty-${idx}`} className="h-8" />;
              }
              const cellIso = toIsoDate(viewYear, viewMonth, day);
              const isSelected = cellIso === value;
              const isToday = cellIso === todayRef;
              return (
                <button
                  key={cellIso}
                  type="button"
                  onClick={() => {
                    onChange(cellIso);
                    setIsOpen(false);
                  }}
                  className={`h-8 rounded-lg text-[11px] font-black num-cell transition-all cursor-pointer flex items-center justify-center ${
                    isSelected
                      ? 'bg-[#102A43] text-[#C6A15B] shadow-sm ring-2 ring-[#C6A15B]/60'
                      : isToday
                      ? 'bg-[#C6A15B]/25 text-[#102A43] border border-[#C6A15B]'
                      : 'hover:bg-blue-50 text-slate-800'
                  }`}
                >
                  {toArabicNumerals(day)}
                </button>
              );
            })}
          </div>

          {/* أزرار الاختيار السريع للفترات */}
          <div className="px-2.5 pb-2.5 pt-1.5 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => applyPresetYears(0)}
              className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-[10px] font-black text-[#102A43] cursor-pointer"
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={() => applyPresetYears(1)}
              className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-black text-emerald-800 cursor-pointer"
            >
              +١ سنة
            </button>
            <button
              type="button"
              onClick={() => applyPresetYears(2)}
              className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[10px] font-black text-[#164E83] cursor-pointer"
            >
              +٢ سنة
            </button>
            <button
              type="button"
              onClick={() => applyPresetYears(3)}
              className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[10px] font-black text-amber-900 cursor-pointer"
            >
              +٣ سنوات
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
