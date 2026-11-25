'use client';

import React from 'react';
import TableControlsBar, { PinnableColumnItem, TableControlsBarProps } from './TableControlsBar';

export type { PinnableColumnItem };

export type TableStatsProps = TableControlsBarProps;

/**
 * مكون إحصائيات الجدول الحية (TableStats)
 * يوضع أعلى جميع جداول المنظومة لعرض إجمالي السجلات، السجلات المفلترة،
 * السجلات المعروضة، السجلات المحددة، وعدد الأعمدة مع أدوات تثبيت الأعمدة
 * وشريط الاحتواء التلقائي الذكي للجداول والأعمدة.
 */
export default function TableStats(props: TableStatsProps) {
  return <TableControlsBar {...props} />;
}
