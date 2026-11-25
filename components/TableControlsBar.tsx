'use client';

import React, { useState } from 'react';
import {
  Pin,
  PinOff,
  Columns3,
  SlidersHorizontal,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  X,
  CheckSquare,
} from 'lucide-react';
import { formatArabicNumber, toArabicNumerals } from '@/lib/utils';

export interface PinnableColumnItem {
  key: string;
  label: string;
  pinned: boolean;
  visible?: boolean;
}

interface TableControlsBarProps {
  totalRecords: number;
  displayedRecords: number;
  filteredRecords: number;
  selectedRecords: number;
  totalColumns: number;
  visibleColumns: number;
  columns?: PinnableColumnItem[];
  onPinAll?: () => void;
  onUnpinAll?: () => void;
  onTogglePinColumn?: (key: string) => void;
  onMoveColumn?: (key: string, direction: 'up' | 'down') => void;
  onResetPinDefaults?: () => void;
  onOpenHeaderCustomizer?: () => void;
  onClearSelection?: () => void;
  extraControls?: React.ReactNode;
}

export default function TableControlsBar({
  totalRecords,
  displayedRecords,
  filteredRecords,
  selectedRecords,
  totalColumns,
  visibleColumns,
  columns,
  onPinAll,
  onUnpinAll,
  onTogglePinColumn,
  onMoveColumn,
  onResetPinDefaults,
  onOpenHeaderCustomizer,
  onClearSelection,
  extraControls,
}: TableControlsBarProps) {
  const [showPinManager, setShowPinManager] = useState(false);

  const pinnedCount = columns ? columns.filter((c) => c.pinned && c.visible !== false).length : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 space-y-2 print:hidden">
      {/* Row 1: Automatic Live Counters */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-[#102A43]">
          <span className="flex items-center gap-1">
            <span className="text-slate-500">إجمالي السجلات:</span>
            <strong className="num-cell text-[#102A43] font-black">{formatArabicNumber(totalRecords)}</strong>
          </span>
          <span className="text-slate-300">·</span>
          <span className="flex items-center gap-1">
            <span className="text-slate-500">المعروضة:</span>
            <strong className="num-cell text-[#164E83] font-black">{formatArabicNumber(displayedRecords)}</strong>
          </span>
          <span className="text-slate-300">·</span>
          <span className="flex items-center gap-1">
            <span className="text-slate-500">بعد التصفية:</span>
            <strong className="num-cell text-emerald-800 font-black">{formatArabicNumber(filteredRecords)}</strong>
          </span>
          <span className="text-slate-300">·</span>
          <span className="flex items-center gap-1">
            <span className="text-slate-500">المحددة:</span>
            <strong className={`num-cell font-black ${selectedRecords > 0 ? 'text-amber-800' : 'text-slate-700'}`}>
              {formatArabicNumber(selectedRecords)}
            </strong>
            {selectedRecords > 0 && onClearSelection && (
              <button
                type="button"
                onClick={onClearSelection}
                className="text-[10px] text-red-700 hover:underline mr-1 cursor-pointer"
                title="إلغاء تحديد الصفوف"
              >
                (إلغاء)
              </button>
            )}
          </span>
          <span className="text-slate-300">·</span>
          <span className="flex items-center gap-1">
            <span className="text-slate-500">الأعمدة:</span>
            <strong className="num-cell text-[#102A43] font-black">{formatArabicNumber(totalColumns)}</strong>
          </span>
          <span className="text-slate-300">·</span>
          <span className="flex items-center gap-1">
            <span className="text-slate-500">الظاهرة:</span>
            <strong className="num-cell text-teal-800 font-black">{formatArabicNumber(visibleColumns)}</strong>
          </span>
          {columns && pinnedCount > 0 && (
            <>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1 text-indigo-800">
                <Pin className="w-3 h-3" />
                <span>مثبتة:</span>
                <strong className="num-cell font-black">{formatArabicNumber(pinnedCount)}</strong>
              </span>
            </>
          )}
        </div>

        {/* Row 2 / Right Actions: Column Pinning & Header Customizer */}
        <div className="flex flex-wrap items-center gap-1.5">
          {onPinAll && (
            <button
              type="button"
              onClick={onPinAll}
              className="px-2.5 py-1 bg-[#102A43] hover:bg-[#164E83] text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="تثبيت الأعمدة مع الحفاظ على التمرير الأفقي داخل الجدول"
            >
              <Pin className="w-3 h-3 text-[#C6A15B]" />
              <span>تثبيت الكل</span>
            </button>
          )}
          {onUnpinAll && (
            <button
              type="button"
              onClick={onUnpinAll}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="إلغاء تثبيت جميع الأعمدة والعودة للعرض الطبيعي"
            >
              <PinOff className="w-3 h-3" />
              <span>إلغاء تثبيت الكل</span>
            </button>
          )}
          {columns && onTogglePinColumn && (
            <button
              type="button"
              onClick={() => setShowPinManager((v) => !v)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer border transition-colors ${
                showPinManager
                  ? 'bg-[#C6A15B] text-[#102A43] border-[#C6A15B]'
                  : 'bg-[#F4F7FB] hover:bg-slate-200 text-[#102A43] border-slate-300'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>إدارة الأعمدة المثبتة</span>
            </button>
          )}
          {onOpenHeaderCustomizer && (
            <button
              type="button"
              onClick={onOpenHeaderCustomizer}
              className="px-2.5 py-1 bg-[#164E83] hover:bg-[#102A43] text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#C6A15B]" />
              <span>تخصيص رؤوس الأعمدة</span>
            </button>
          )}
          {extraControls}
        </div>
      </div>

      {/* Expandable Pinned Columns Manager Panel */}
      {showPinManager && columns && onTogglePinColumn && (
        <div className="p-3 bg-[#F4F7FB] border border-slate-200 rounded-xl space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2 text-xs font-black text-[#102A43]">
              <CheckSquare className="w-4 h-4 text-[#164E83]" />
              <span>إدارة تثبيت وترتيب الأعمدة (يتم الحفظ تلقائياً لكل مستخدم)</span>
            </div>
            <div className="flex items-center gap-2">
              {onResetPinDefaults && (
                <button
                  type="button"
                  onClick={onResetPinDefaults}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>استعادة الافتراضي</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowPinManager(false)}
                className="p-1 text-slate-500 hover:text-[#102A43] cursor-pointer"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 max-h-48 overflow-y-auto compact-table-scroll pr-1">
            {columns
              .filter((c) => c.visible !== false)
              .map((col, idx, arr) => (
                <div
                  key={col.key}
                  className={`flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-bold transition-colors ${
                    col.pinned
                      ? 'bg-[#102A43] text-white border-[#102A43]'
                      : 'bg-white text-[#102A43] border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onTogglePinColumn(col.key)}
                    className="flex items-center gap-1 min-w-0 flex-1 text-right cursor-pointer"
                    title={col.pinned ? `إلغاء تثبيت ${col.label}` : `تثبيت عمود ${col.label}`}
                  >
                    {col.pinned ? (
                      <Pin className="w-3 h-3 text-[#C6A15B] shrink-0" />
                    ) : (
                      <PinOff className="w-3 h-3 text-slate-400 shrink-0" />
                    )}
                    <span className="truncate">{toArabicNumerals(col.label)}</span>
                  </button>
                  {onMoveColumn && (
                    <div className="flex items-center shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => onMoveColumn(col.key, 'up')}
                        className="p-0.5 opacity-70 hover:opacity-100 disabled:opacity-25 cursor-pointer"
                        title="تقديم العمود"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === arr.length - 1}
                        onClick={() => onMoveColumn(col.key, 'down')}
                        className="p-0.5 opacity-70 hover:opacity-100 disabled:opacity-25 cursor-pointer"
                        title="تأخير العمود"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
          <p className="text-[10.5px] text-slate-500 font-bold">
            ملاحظة: في الجداول العريضة يتم تفعيل وضع التثبيت الذكي لضمان بقاء شريط التمرير الأفقي فعالاً وظهور جميع البيانات دون تجميد الصفحة.
          </p>
        </div>
      )}
    </div>
  );
}
