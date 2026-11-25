'use client';

import { useState, useEffect, useMemo, useCallback, RefObject } from 'react';
import {
  AutoFitColumnSchema,
  AutoFitMode,
  ComputedColumnLayout,
  computeSmartColumnWidths,
} from '@/lib/table-autofit';
import {
  clearUserTableColumnWidths,
  getUserTableColumnWidths,
  saveUserTableColumnWidths,
} from '@/lib/mock-db';

interface UseSmartAutoFitOptions {
  tableId: string;
  userId?: string;
  columns: AutoFitColumnSchema[];
  containerRef: RefObject<HTMLDivElement | null>;
  initialMode?: AutoFitMode;
  /** إشعار اختياري عند الحفظ أو الاستعادة */
  onNotify?: (msg: string) => void;
}

export function useSmartAutoFit({
  tableId,
  userId,
  columns,
  containerRef,
  initialMode = 'auto',
  onNotify,
}: UseSmartAutoFitOptions) {
  const [autoFitMode, setAutoFitMode] = useState<AutoFitMode>(initialMode);
  const [savedWidths, setSavedWidths] = useState<Record<string, number> | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // تحميل التفضيلات المحفوظة للمستخدم بعد اكتمال hydration بأمان
  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      const stored = getUserTableColumnWidths(tableId, userId);
      if (stored && Object.keys(stored).length > 0) {
        setSavedWidths(stored);
        setAutoFitMode('saved');
      }
    });
    return () => cancelAnimationFrame(frameId);
  }, [tableId, userId]);

  // مراقبة تغير حجم الحاوية ونافذة المتصفح عبر ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let rafId = 0;
    const measureContainer = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const nextW = Math.round(containerRef.current.clientWidth);
        setContainerWidth((prev) => (Math.abs(prev - nextW) > 6 ? nextW : prev));
      });
    };

    measureContainer();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => measureContainer());
      observer.observe(el);
      return () => {
        cancelAnimationFrame(rafId);
        observer.disconnect();
      };
    }

    window.addEventListener('resize', measureContainer);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', measureContainer);
    };
  }, [containerRef]);

  const layouts: Record<string, ComputedColumnLayout> = useMemo(
    () => computeSmartColumnWidths(columns, autoFitMode, containerWidth, savedWidths),
    [columns, autoFitMode, containerWidth, savedWidths]
  );

  const widthsMap: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    columns.forEach((c) => {
      map[c.key] = layouts[c.key]?.width ?? c.defaultWidth ?? 110;
    });
    return map;
  }, [columns, layouts]);

  const applyAutoFit = useCallback(
    (mode: AutoFitMode) => {
      setAutoFitMode(mode);
      if (mode === 'auto') onNotify?.('تم تطبيق الاحتواء التلقائي الذكي لجميع الأعمدة');
      else if (mode === 'headers') onNotify?.('تم ضبط عرض الأعمدة لاحتواء العناوين كاملة بوضوح');
      else if (mode === 'data') onNotify?.('تم ضبط عرض الأعمدة لاحتواء البيانات المعروضة دون اقتصاص');
      else if (mode === 'equal') onNotify?.('تم توزيع عرض الأعمدة بالتساوي على مساحة الجدول');
      else if (mode === 'default') onNotify?.('تم استعادة العرض الافتراضي لجميع الأعمدة');
    },
    [onNotify]
  );

  const saveCurrentWidths = useCallback(() => {
    saveUserTableColumnWidths(tableId, widthsMap, userId);
    setSavedWidths(widthsMap);
    setAutoFitMode('saved');
    onNotify?.('تم حفظ عرض الأعمدة الحالي وتثبيته لحسابك');
  }, [tableId, userId, widthsMap, onNotify]);

  const resetWidths = useCallback(() => {
    clearUserTableColumnWidths(tableId, userId);
    setSavedWidths(null);
    setAutoFitMode('default');
    onNotify?.('تم مسح العرض المخصص واستعادة العرض الافتراضي للجدول');
  }, [tableId, userId, onNotify]);

  const getColStyle = useCallback(
    (key: string): React.CSSProperties => {
      const l = layouts[key];
      if (!l) return {};
      return {
        width: `${l.width}px`,
        minWidth: `${l.minWidth}px`,
        maxWidth: `${Math.max(l.width, l.maxWidth)}px`,
      };
    },
    [layouts]
  );

  const getCellWrapClass = useCallback(
    (key: string): string => {
      const l = layouts[key];
      if (!l) return '';
      return l.wrap ? 'autofit-wrap-cell' : 'whitespace-nowrap';
    },
    [layouts]
  );

  return {
    autoFitMode,
    layouts,
    widthsMap,
    hasSavedWidths: Boolean(savedWidths),
    applyAutoFit,
    saveCurrentWidths,
    resetWidths,
    getColStyle,
    getCellWrapClass,
  };
}
