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
  Maximize2,
  AlignJustify,
  Type,
  Database,
  Save,
  Undo2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toArabicNumerals } from '@/lib/utils';
import { AutoFitMode } from '@/lib/table-autofit';
import { useSystemPreferences } from '@/lib/user-preferences-store';

export interface TableColumnItem {
  key: string;
  label: string;
  pinned: boolean;
  visible?: boolean;
}

export interface TableToolbarProps {
  tableName?: string;
  totalRows?: number;
  pinnedCount?: number;
  onClearPins?: () => void;
  onManualPin?: () => void;
  columns?: TableColumnItem[];
  onPinAll?: () => void;
  onUnpinAll?: () => void;
  onTogglePinColumn?: (key: string) => void;
  onToggleVisibleColumn?: (key: string) => void;
  onMoveColumn?: (key: string, direction: 'up' | 'down') => void;
  onResetPinDefaults?: () => void;
  onOpenHeaderCustomizer?: () => void;
  extraControls?: React.ReactNode;
  /** خيارات التحكم الذكي في عرض وتخطيط الأعمدة */
  autoFitMode?: AutoFitMode;
  hasSavedWidths?: boolean;
  onAutoFitAll?: () => void;
  onAutoFitHeaders?: () => void;
  onAutoFitData?: () => void;
  onDistributeEqual?: () => void;
  onResetWidths?: () => void;
  onSaveWidths?: () => void;
  compact?: boolean;
}

/**
 * شريط أدوات إدارة الأعمدة الموحد (TableToolbar)
 * يوفر خيارات التحكم الموحدة في الأعمدة:
 * احتواء تلقائي، احتواء العناوين فقط، احتواء البيانات فقط،
 * توزيع بالتساوي، استعادة الافتراضي، حفظ التخطيط، وتثبيت وإظهار/إخفاء الأعمدة.
 */
export default function TableToolbar({
  tableName,
  totalRows,
  pinnedCount,
  onClearPins,
  onManualPin,
  columns,
  onPinAll,
  onUnpinAll,
  onTogglePinColumn,
  onToggleVisibleColumn,
  onMoveColumn,
  onResetPinDefaults,
  onOpenHeaderCustomizer,
  extraControls,
  autoFitMode,
  hasSavedWidths,
  onAutoFitAll,
  onAutoFitHeaders,
  onAutoFitData,
  onDistributeEqual,
  onResetWidths,
  onSaveWidths,
  compact = false,
}: TableToolbarProps) {
  const { isRtl, t } = useSystemPreferences();
  const [showColumnManager, setShowColumnManager] = useState(false);

  const effectiveUnpinAll = onUnpinAll || onClearPins;

  const hasAutoFitControls = Boolean(
    onAutoFitAll ||
      onAutoFitHeaders ||
      onAutoFitData ||
      onDistributeEqual ||
      onResetWidths ||
      onSaveWidths
  );

  const hasColumnActions = Boolean(
    onPinAll ||
      effectiveUnpinAll ||
      onManualPin ||
      (columns && (onTogglePinColumn || onToggleVisibleColumn)) ||
      onOpenHeaderCustomizer ||
      extraControls
  );

  if (!hasAutoFitControls && !hasColumnActions && !tableName) return null;

  const visibleColCount = columns ? columns.filter((c) => c.visible !== false).length : 0;

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-1.5 pt-1.5 border-t border-slate-100'}>
      {/* شريط التحكم الموحد في الأعمدة والتخطيط */}
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        {tableName && (
          <div className="flex items-center gap-2 text-xs font-black text-[#102A43]">
            <Columns3 className="w-3.5 h-3.5 text-[#C6A15B] shrink-0" />
            <span>{tableName}</span>
            {typeof totalRows === 'number' && (
              <span className="num-cell px-2 py-0.5 rounded-full bg-[#F4F7FB] border border-slate-200 text-[10.5px] font-black text-[#164E83]">
                {isRtl ? toArabicNumerals(totalRows) : totalRows} {t('recordsCount')}
              </span>
            )}
          </div>
        )}
        {hasAutoFitControls && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] font-black text-[#164E83] flex items-center gap-1 ml-1">
              <Maximize2 className="w-3 h-3 text-[#C6A15B]" />
              <span>{isRtl ? 'أدوات الأعمدة:' : 'Column Tools:'}</span>
            </span>

            {onAutoFitAll && (
              <button
                type="button"
                onClick={onAutoFitAll}
                className={`px-2 py-0.5 rounded-md text-[10.5px] font-extrabold flex items-center gap-1 cursor-pointer border transition-colors ${
                  autoFitMode === 'auto'
                    ? 'bg-[#102A43] text-white border-[#102A43] shadow-2xs'
                    : 'bg-[#F4F7FB] hover:bg-slate-200 text-[#102A43] border-slate-300'
                }`}
                title="تعديل عرض جميع الأعمدة تلقائياً حسب العنوان والمحتوى"
              >
                <Maximize2 className="w-3 h-3 text-[#C6A15B]" />
                <span>{isRtl ? 'احتواء تلقائي' : 'Auto Fit'}</span>
              </button>
            )}

            {onAutoFitHeaders && (
              <button
                type="button"
                onClick={onAutoFitHeaders}
                className={`px-2 py-0.5 rounded-md text-[10.5px] font-extrabold flex items-center gap-1 cursor-pointer border transition-colors ${
                  autoFitMode === 'headers'
                    ? 'bg-[#164E83] text-white border-[#164E83]'
                    : 'bg-white hover:bg-slate-100 text-[#102A43] border-slate-300'
                }`}
                title={isRtl ? 'ضبط عرض الأعمدة لاحتواء نصوص العناوين بالكامل' : 'Fit columns to header labels'}
              >
                <Type className="w-3 h-3" />
                <span>{isRtl ? 'احتواء العناوين' : 'Fit Headers'}</span>
              </button>
            )}

            {onAutoFitData && (
              <button
                type="button"
                onClick={onAutoFitData}
                className={`px-2 py-0.5 rounded-md text-[10.5px] font-extrabold flex items-center gap-1 cursor-pointer border transition-colors ${
                  autoFitMode === 'data'
                    ? 'bg-[#164E83] text-white border-[#164E83]'
                    : 'bg-white hover:bg-slate-100 text-[#102A43] border-slate-300'
                }`}
                title={isRtl ? 'ضبط عرض الأعمدة لاحتواء قيم البيانات' : 'Fit columns to data values'}
              >
                <Database className="w-3 h-3" />
                <span>{isRtl ? 'احتواء البيانات' : 'Fit Data'}</span>
              </button>
            )}

            {onDistributeEqual && (
              <button
                type="button"
                onClick={onDistributeEqual}
                className={`px-2 py-0.5 rounded-md text-[10.5px] font-extrabold flex items-center gap-1 cursor-pointer border transition-colors ${
                  autoFitMode === 'equal'
                    ? 'bg-[#164E83] text-white border-[#164E83]'
                    : 'bg-white hover:bg-slate-100 text-[#102A43] border-slate-300'
                }`}
                title={isRtl ? 'توزيع عرض الجدول بالتساوي على جميع الأعمدة' : 'Distribute columns equally'}
              >
                <AlignJustify className="w-3 h-3" />
                <span>{isRtl ? 'توزيع بالتساوي' : 'Equal Width'}</span>
              </button>
            )}

            {onResetWidths && (
              <button
                type="button"
                onClick={onResetWidths}
                className={`px-2 py-0.5 rounded-md text-[10.5px] font-extrabold flex items-center gap-1 cursor-pointer border transition-colors ${
                  autoFitMode === 'default'
                    ? 'bg-slate-700 text-white border-slate-700'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                }`}
                title={isRtl ? 'استعادة العروض والتخطيط الافتراضي للجدول' : 'Reset default column widths'}
              >
                <Undo2 className="w-3 h-3" />
                <span>{isRtl ? 'استعادة الافتراضي' : 'Reset Default'}</span>
              </button>
            )}

            {onSaveWidths && (
              <button
                type="button"
                onClick={onSaveWidths}
                className={`px-2 py-0.5 rounded-md text-[10.5px] font-black flex items-center gap-1 cursor-pointer border transition-colors ${
                  autoFitMode === 'saved' || hasSavedWidths
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-700'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}
                title={isRtl ? 'حفظ تخطيط الأعمدة وعروضها لحسابك الحالي' : 'Save layout for your account'}
              >
                <Save className="w-3 h-3" />
                <span>{isRtl ? 'حفظ التخطيط' : 'Save Layout'}</span>
              </button>
            )}
          </div>
        )}

        {hasColumnActions && (
          <div className="flex flex-wrap items-center gap-1">
            {effectiveUnpinAll && (
              <button
                type="button"
                onClick={effectiveUnpinAll}
                className={`px-2.5 py-0.5 border rounded-md text-[10.5px] font-black flex items-center gap-1 cursor-pointer transition-colors ${
                  pinnedCount === 0
                    ? 'bg-red-700 text-white border-red-700'
                    : 'bg-red-50 hover:bg-red-100 text-red-800 border-red-300'
                }`}
                title={isRtl ? 'إلغاء تثبيت جميع الأعمدة والعودة للعرض الطبيعي' : 'Unpin all columns'}
              >
                <PinOff className={`w-3 h-3 ${pinnedCount === 0 ? 'text-white' : 'text-red-700'}`} />
                <span>{t('unpinAll')}</span>
              </button>
            )}

            {((columns && (onTogglePinColumn || onToggleVisibleColumn)) || onManualPin) && (
              <button
                type="button"
                onClick={() => {
                  if (columns && (onTogglePinColumn || onToggleVisibleColumn)) {
                    setShowColumnManager((v) => !v);
                  }
                  if (onManualPin) {
                    onManualPin();
                  }
                }}
                className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-black flex items-center gap-1 cursor-pointer border transition-colors ${
                  showColumnManager || (typeof pinnedCount === 'number' && pinnedCount > 0)
                    ? 'bg-[#C6A15B] text-[#102A43] border-[#C6A15B]'
                    : 'bg-[#102A43] hover:bg-[#164E83] text-white border-[#102A43]'
                }`}
                title={isRtl ? 'اختيار وتثبيت الأعمدة يدوياً عموداً بعمود' : 'Pin or hide columns manually'}
              >
                <Pin className={`w-3 h-3 ${showColumnManager || (typeof pinnedCount === 'number' && pinnedCount > 0) ? 'text-[#102A43]' : 'text-[#C6A15B]'}`} />
                <span>{t('manualPin')}</span>
              </button>
            )}

            {onPinAll && (
              <button
                type="button"
                onClick={onPinAll}
                className="px-2 py-0.5 bg-[#F4F7FB] hover:bg-slate-200 text-[#102A43] border border-slate-300 rounded-md text-[10.5px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
                title={isRtl ? 'تثبيت الأعمدة التعريفية تلقائياً مع الحفاظ على التمرير الأفقي' : 'Auto-pin key columns'}
              >
                <Columns3 className="w-3 h-3 text-[#164E83]" />
                <span>{isRtl ? 'تثبيت تلقائي' : 'Auto Pin'}</span>
              </button>
            )}

            {onOpenHeaderCustomizer && (
              <button
                type="button"
                onClick={onOpenHeaderCustomizer}
                className="px-2 py-0.5 bg-[#164E83] hover:bg-[#102A43] text-white rounded-md text-[10.5px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <SlidersHorizontal className="w-3 h-3 text-[#C6A15B]" />
                <span>{isRtl ? 'تخصيص الرؤوس' : 'Headers'}</span>
              </button>
            )}

            {extraControls}
          </div>
        )}
      </div>

      {/* لوحة إدارة إظهار/إخفاء وتثبيت وترتيب الأعمدة */}
      {showColumnManager && columns && (
        <div className="p-2.5 bg-[#F4F7FB] border border-slate-200 rounded-xl space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-200">
            <div className="flex items-center gap-1.5 text-[11.5px] font-black text-[#102A43]">
              <CheckSquare className="w-3.5 h-3.5 text-[#164E83]" />
              <span>إدارة وتخصيص الأعمدة (تثبيت، إظهار/إخفاء، وترتيب العرض لكل مستخدم)</span>
            </div>
            <div className="flex items-center gap-1.5">
              {onResetPinDefaults && (
                <button
                  type="button"
                  onClick={onResetPinDefaults}
                  className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-md text-[10.5px] font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>استعادة الافتراضي</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowColumnManager(false)}
                className="p-0.5 text-slate-500 hover:text-[#102A43] cursor-pointer"
                title="إغلاق"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 max-h-48 overflow-y-auto compact-table-scroll pr-1">
            {columns.map((col, idx, arr) => {
              const isVisible = col.visible !== false;
              const cannotHideLast = isVisible && visibleColCount <= 1;
              return (
                <div
                  key={col.key}
                  className={`flex items-center justify-between gap-1 px-2 py-1 rounded-md border text-[10.5px] font-extrabold transition-colors ${
                    !isVisible
                      ? 'bg-slate-100 text-slate-400 border-slate-200 opacity-75'
                      : col.pinned
                      ? 'bg-[#102A43] text-white border-[#102A43]'
                      : 'bg-white text-[#102A43] border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {onToggleVisibleColumn && (
                      <button
                        type="button"
                        disabled={cannotHideLast}
                        onClick={() => onToggleVisibleColumn(col.key)}
                        className="p-0.5 shrink-0 cursor-pointer disabled:opacity-30"
                        title={isVisible ? `إخفاء عمود ${col.label}` : `إظهار عمود ${col.label}`}
                      >
                        {isVisible ? (
                          <Eye className={`w-3.5 h-3.5 ${col.pinned ? 'text-[#C6A15B]' : 'text-emerald-700'}`} />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>
                    )}

                    {onTogglePinColumn ? (
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
                    ) : (
                      <span className="truncate">{toArabicNumerals(col.label)}</span>
                    )}
                  </div>

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
              );
            })}
          </div>

          <p className="text-[10.5px] text-slate-600 font-bold">
            ملاحظة: يمكنك إظهار أو إخفاء أي عمود وتثبيته وضبط عرضه (احتواء تلقائي / توزيع بالتساوي) ثم الضغط على «حفظ التخطيط» للاحتفاظ بالإعدادات لحسابك.
          </p>
        </div>
      )}
    </div>
  );
}
