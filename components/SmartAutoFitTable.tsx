'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AutoFitColumnSchema, AutoFitColumnType } from '@/lib/table-autofit';
import { useSmartAutoFit } from '@/hooks/useSmartAutoFit';
import { compareTableValues, toArabicNumerals } from '@/lib/utils';
import TableStats, { PinnableColumnItem } from './TableStats';
import SortableTh from './SortableTh';

export interface SmartTableColumn<T> {
  key: string;
  label: React.ReactNode;
  headerText: string;
  type: AutoFitColumnType;
  align?: 'right' | 'center' | 'left';
  sortable?: boolean;
  defaultWidth?: number;
  pinned?: boolean;
  sortValue?: (row: T) => unknown;
  measureValue?: (row: T) => string;
  render: (row: T, index: number) => React.ReactNode;
  cellClassName?: string | ((row: T) => string);
}

interface SmartAutoFitTableProps<T> {
  tableId: string;
  userId?: string;
  rows: T[];
  totalCount: number;
  getRowId: (row: T) => string;
  columns: SmartTableColumn<T>[];
  sortKey?: string;
  sortAsc?: boolean;
  onSort?: (key: string) => void;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onClearSelection?: () => void;
  pinnedKeys?: string[];
  onPinAll?: () => void;
  onUnpinAll?: () => void;
  onTogglePinColumn?: (key: string) => void;
  onResetPinDefaults?: () => void;
  onOpenHeaderCustomizer?: () => void;
  onNotify?: (msg: string) => void;
  emptyMessage?: string;
  maxHeightClass?: string;
  theadClassName?: string;
  selectable?: boolean;
}

const HIDDEN_COLS_STORAGE_PREFIX = 'gharbia_table_hidden_cols_v1_';

export default function SmartAutoFitTable<T>({
  tableId,
  userId = 'default',
  rows,
  totalCount,
  getRowId,
  columns,
  sortKey = '',
  sortAsc = true,
  onSort,
  selectedIds = [],
  onToggleSelect,
  onClearSelection,
  pinnedKeys,
  onPinAll,
  onUnpinAll,
  onTogglePinColumn,
  onResetPinDefaults,
  onOpenHeaderCustomizer,
  onNotify,
  emptyMessage = 'لا توجد بيانات مطابقة حالياً.',
  maxHeightClass = 'max-h-[60vh]',
  theadClassName = 'bg-[#102A43] text-white',
  selectable = false,
}: SmartAutoFitTableProps<T>) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);
  const [internalPinnedKeys, setInternalPinnedKeys] = useState<string[]>(() =>
    pinnedKeys && pinnedKeys.length > 0
      ? pinnedKeys
      : columns.filter((c) => c.pinned).map((c) => c.key)
  );
  const storageKey = `${HIDDEN_COLS_STORAGE_PREFIX}${userId}_${tableId}`;

  const effectivePinnedKeys = onTogglePinColumn && pinnedKeys ? pinnedKeys : internalPinnedKeys;

  const handleEffectiveUnpinAll = () => {
    setInternalPinnedKeys([]);
    onUnpinAll?.();
    onNotify?.('تم إلغاء تثبيت جميع الأعمدة في الجدول.');
  };

  const handleEffectivePinAll = () => {
    const firstTwo = columns.slice(0, 2).map((c) => c.key);
    setInternalPinnedKeys(firstTwo);
    onPinAll?.();
    onNotify?.('تم تثبيت الأعمدة التعريفية الأولى للجدول.');
  };

  const handleEffectiveTogglePin = (key: string) => {
    setInternalPinnedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
    onTogglePinColumn?.(key);
  };

  // Hydrate saved hidden columns post-mount cleanly (hydration-safe)
  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setHiddenKeys(parsed.filter((k): k is string => typeof k === 'string'));
            return;
          }
        }
      } catch {
        // Ignore storage errors
      }
      setHiddenKeys([]);
    });
    return () => cancelAnimationFrame(frameId);
  }, [storageKey]);

  const visibleColumns = useMemo(
    () => columns.filter((col) => col.type === 'actions' || !hiddenKeys.includes(col.key)),
    [columns, hiddenKeys]
  );

  const schemaColumns: AutoFitColumnSchema[] = useMemo(
    () =>
      visibleColumns.map((col) => ({
        key: col.key,
        label: col.headerText,
        type: col.type,
        defaultWidth: col.defaultWidth,
        pinned: effectivePinnedKeys.includes(col.key),
        sampleValues: rows.slice(0, 60).map((r) => {
          if (col.measureValue) return col.measureValue(r);
          const raw = (r as Record<string, unknown>)[col.key];
          return raw !== undefined && raw !== null ? toArabicNumerals(String(raw)) : '';
        }),
      })),
    [visibleColumns, rows, effectivePinnedKeys]
  );

  const {
    autoFitMode,
    widthsMap,
    hasSavedWidths,
    applyAutoFit,
    saveCurrentWidths,
    resetWidths,
    getColStyle,
    getCellWrapClass,
  } = useSmartAutoFit({
    tableId,
    userId,
    columns: schemaColumns,
    containerRef: scrollContainerRef,
    onNotify,
  });

  const handleToggleVisibleColumn = (key: string) => {
    setHiddenKeys((prev) => {
      const currentlyHidden = prev.includes(key);
      if (currentlyHidden) {
        return prev.filter((k) => k !== key);
      }
      const remainingVisibleDataCols = columns.filter(
        (c) => c.type !== 'actions' && c.key !== key && !prev.includes(c.key)
      );
      if (remainingVisibleDataCols.length === 0) return prev;
      return [...prev, key];
    });
  };

  const handleSaveFullLayout = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(hiddenKeys));
    } catch {
      // Ignore storage errors
    }
    saveCurrentWidths();
  };

  const handleResetFullLayout = () => {
    setHiddenKeys([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore storage errors
    }
    resetWidths();
  };

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const colDef = columns.find((c) => c.key === sortKey);
    return [...rows].sort((a, b) => {
      const va = colDef?.sortValue ? colDef.sortValue(a) : (a as Record<string, unknown>)[sortKey];
      const vb = colDef?.sortValue ? colDef.sortValue(b) : (b as Record<string, unknown>)[sortKey];
      return compareTableValues(va, vb, sortAsc);
    });
  }, [rows, columns, sortKey, sortAsc]);

  const { pinnedOffsetsMap, lastPinnedKey } = useMemo(() => {
    const offsets: Record<string, number> = {};
    let currentRight = selectable ? 34 : 0;
    let lastKey: string | null = null;
    visibleColumns.forEach((col) => {
      if (effectivePinnedKeys.includes(col.key)) {
        offsets[col.key] = currentRight;
        currentRight += widthsMap[col.key] || col.defaultWidth || 100;
        lastKey = col.key;
      }
    });
    return { pinnedOffsetsMap: offsets, lastPinnedKey: lastKey };
  }, [visibleColumns, effectivePinnedKeys, widthsMap, selectable]);

  const manageableColumns: PinnableColumnItem[] = useMemo(
    () =>
      columns
        .filter((c) => c.type !== 'actions')
        .map((c) => ({
          key: c.key,
          label: c.headerText,
          pinned: effectivePinnedKeys.includes(c.key),
          visible: !hiddenKeys.includes(c.key),
        })),
    [columns, effectivePinnedKeys, hiddenKeys]
  );

  return (
    <div className="space-y-2.5">
      <TableStats
        totalRecords={totalCount}
        displayedRecords={sortedRows.length}
        filteredRecords={sortedRows.length}
        selectedRecords={selectedIds.length}
        totalColumns={columns.length}
        visibleColumns={visibleColumns.length}
        columns={manageableColumns}
        onPinAll={handleEffectivePinAll}
        onUnpinAll={handleEffectiveUnpinAll}
        onTogglePinColumn={handleEffectiveTogglePin}
        onToggleVisibleColumn={handleToggleVisibleColumn}
        onResetPinDefaults={() => {
          setInternalPinnedKeys(columns.slice(0, 1).map((c) => c.key));
          onResetPinDefaults?.();
          setHiddenKeys([]);
        }}
        onOpenHeaderCustomizer={onOpenHeaderCustomizer}
        onClearSelection={onClearSelection}
        autoFitMode={autoFitMode}
        hasSavedWidths={hasSavedWidths || hiddenKeys.length > 0}
        onAutoFitAll={() => applyAutoFit('auto')}
        onAutoFitHeaders={() => applyAutoFit('headers')}
        onAutoFitData={() => applyAutoFit('data')}
        onDistributeEqual={() => applyAutoFit('equal')}
        onResetWidths={handleResetFullLayout}
        onSaveWidths={handleSaveFullLayout}
      />

      <div ref={scrollContainerRef} className={`overflow-auto ${maxHeightClass} compact-table-scroll border border-slate-200 rounded-xl bg-white shadow-2xs`}>
        <table className="min-w-full w-max text-right">
          <thead className={`${theadClassName} sticky top-0 z-20`}>
            <tr>
              {selectable && (
                <th className={`w-[34px] min-w-[34px] max-w-[34px] text-center sticky right-0 z-40 ${theadClassName}`}>تحديد</th>
              )}
              {visibleColumns.map((col) => {
                const isPinned = effectivePinnedKeys.includes(col.key) && pinnedOffsetsMap[col.key] !== undefined;
                const isLastPinned = lastPinnedKey === col.key;
                const style: React.CSSProperties = {
                  ...getColStyle(col.key),
                  ...(isPinned ? { right: `${pinnedOffsetsMap[col.key]}px` } : {}),
                };
                const pinClasses = isPinned
                  ? `sticky z-30 ${theadClassName.includes('bg-slate-100') ? 'bg-slate-100' : 'bg-[#102A43]'} ${
                      isLastPinned ? 'pinned-col-edge' : ''
                    }`
                  : '';

                if (col.sortable !== false && onSort) {
                  return (
                    <SortableTh
                      key={col.key}
                      label={col.label}
                      sortKey={col.key}
                      activeSortKey={sortKey}
                      sortAsc={sortAsc}
                      onSort={onSort}
                      align={col.align || 'right'}
                      style={style}
                      className={`autofit-header-cell ${pinClasses}`}
                    />
                  );
                }

                return (
                  <th
                    key={col.key}
                    style={style}
                    className={`autofit-header-cell ${col.align === 'center' ? 'text-center' : 'text-right'} ${pinClasses}`}
                  >
                    {col.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + (selectable ? 1 : 0)} className="py-10 text-center text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedRows.map((row, idx) => {
                const rowId = getRowId(row);
                const isSelected = selectedIds.includes(rowId);
                const rowBg = isSelected ? 'bg-amber-50' : idx % 2 === 0 ? 'bg-white' : 'bg-[#F4F7FB]';
                return (
                  <tr key={rowId} className={`${rowBg} hover:bg-blue-50/70 transition-colors`}>
                    {selectable && onToggleSelect && (
                      <td className={`w-[34px] min-w-[34px] max-w-[34px] text-center sticky right-0 z-10 ${rowBg}`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelect(rowId)}
                          className="w-3.5 h-3.5 accent-[#102A43] cursor-pointer"
                        />
                      </td>
                    )}
                    {visibleColumns.map((col) => {
                      const isPinned = effectivePinnedKeys.includes(col.key) && pinnedOffsetsMap[col.key] !== undefined;
                      const isLastPinned = lastPinnedKey === col.key;
                      const isNum = col.type === 'numeric' || col.type === 'currency' || col.type === 'date';
                      const extraCls =
                        typeof col.cellClassName === 'function' ? col.cellClassName(row) : col.cellClassName || '';
                      return (
                        <td
                          key={col.key}
                          style={{
                            ...getColStyle(col.key),
                            ...(isPinned ? { right: `${pinnedOffsetsMap[col.key]}px` } : {}),
                          }}
                          className={`${isNum ? 'num-cell' : getCellWrapClass(col.key)} ${
                            col.align === 'center' ? 'text-center' : 'text-right'
                          } ${isPinned ? `sticky z-10 ${rowBg}` : ''} ${
                            isLastPinned ? 'pinned-col-edge' : ''
                          } ${extraCls}`}
                        >
                          {col.render(row, idx)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
