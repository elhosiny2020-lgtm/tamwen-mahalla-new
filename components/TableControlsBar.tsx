'use client';

import React from 'react';
import { Pin } from 'lucide-react';
import { formatArabicNumber } from '@/lib/utils';
import { AutoFitMode } from '@/lib/table-autofit';
import TableToolbar, { TableColumnItem } from './TableToolbar';

export type PinnableColumnItem = TableColumnItem;

export interface TableControlsBarProps {
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
  onToggleVisibleColumn?: (key: string) => void;
  onMoveColumn?: (key: string, direction: 'up' | 'down') => void;
  onResetPinDefaults?: () => void;
  onOpenHeaderCustomizer?: () => void;
  onClearSelection?: () => void;
  extraControls?: React.ReactNode;
  /** أدوات نظام الاحتواء التلقائي الذكي للجداول والأعمدة */
  autoFitMode?: AutoFitMode;
  hasSavedWidths?: boolean;
  onAutoFitAll?: () => void;
  onAutoFitHeaders?: () => void;
  onAutoFitData?: () => void;
  onDistributeEqual?: () => void;
  onResetWidths?: () => void;
  onSaveWidths?: () => void;
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
  onToggleVisibleColumn,
  onMoveColumn,
  onResetPinDefaults,
  onOpenHeaderCustomizer,
  onClearSelection,
  extraControls,
  autoFitMode,
  hasSavedWidths,
  onAutoFitAll,
  onAutoFitHeaders,
  onAutoFitData,
  onDistributeEqual,
  onResetWidths,
  onSaveWidths,
}: TableControlsBarProps) {
  const pinnedCount = columns ? columns.filter((c) => c.pinned && c.visible !== false).length : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 space-y-1.5 print:hidden shadow-2xs">
      {/* Row 1: Automatic Live TableStats Counters */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-bold text-[#102A43]">
          <span className="flex items-center gap-1">
            <span className="text-slate-600">إجمالي السجلات:</span>
            <strong className="num-cell text-[#102A43] font-black">{formatArabicNumber(totalRecords)}</strong>
          </span>
          <span className="text-slate-300">·</span>
          <span className="flex items-center gap-1">
            <span className="text-slate-600">المعروضة:</span>
            <strong className="num-cell text-[#164E83] font-black">{formatArabicNumber(displayedRecords)}</strong>
          </span>
          <span className="text-slate-300">·</span>
          <span className="flex items-center gap-1">
            <span className="text-slate-600">بعد التصفية:</span>
            <strong className="num-cell text-emerald-800 font-black">{formatArabicNumber(filteredRecords)}</strong>
          </span>
          <span className="text-slate-300">·</span>
          <span className="flex items-center gap-1">
            <span className="text-slate-600">المحددة:</span>
            <strong className={`num-cell font-black ${selectedRecords > 0 ? 'text-amber-800' : 'text-slate-700'}`}>
              {formatArabicNumber(selectedRecords)}
            </strong>
            {selectedRecords > 0 && onClearSelection && (
              <button
                type="button"
                onClick={onClearSelection}
                className="text-[10.5px] font-extrabold text-red-700 hover:underline mr-1 cursor-pointer"
                title="إلغاء تحديد الصفوف"
              >
                (إلغاء)
              </button>
            )}
          </span>
          <span className="text-slate-300">·</span>
          <span className="flex items-center gap-1">
            <span className="text-slate-600">الأعمدة:</span>
            <strong className="num-cell text-[#102A43] font-black">{formatArabicNumber(totalColumns)}</strong>
          </span>
          <span className="text-slate-300">·</span>
          <span className="flex items-center gap-1">
            <span className="text-slate-600">الظاهرة:</span>
            <strong className="num-cell text-teal-800 font-black">{formatArabicNumber(visibleColumns)}</strong>
          </span>
          {columns && pinnedCount > 0 && (
            <>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1 text-indigo-800">
                <Pin className="w-3.5 h-3.5" />
                <span>مثبتة:</span>
                <strong className="num-cell font-black">{formatArabicNumber(pinnedCount)}</strong>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Row 2: Unified TableToolbar for Column Management, Auto-Fit, Equal Distribution & Save Layout */}
      <TableToolbar
        columns={columns}
        onPinAll={onPinAll}
        onUnpinAll={onUnpinAll}
        onTogglePinColumn={onTogglePinColumn}
        onToggleVisibleColumn={onToggleVisibleColumn}
        onMoveColumn={onMoveColumn}
        onResetPinDefaults={onResetPinDefaults}
        onOpenHeaderCustomizer={onOpenHeaderCustomizer}
        extraControls={extraControls}
        autoFitMode={autoFitMode}
        hasSavedWidths={hasSavedWidths}
        onAutoFitAll={onAutoFitAll}
        onAutoFitHeaders={onAutoFitHeaders}
        onAutoFitData={onAutoFitData}
        onDistributeEqual={onDistributeEqual}
        onResetWidths={onResetWidths}
        onSaveWidths={onSaveWidths}
      />
    </div>
  );
}
