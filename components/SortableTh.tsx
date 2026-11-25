'use client';

import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

interface SortableThProps {
  label: React.ReactNode;
  sortKey: string;
  activeSortKey: string;
  sortAsc: boolean;
  onSort: (key: string) => void;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  align?: 'right' | 'center' | 'left';
}

export default function SortableTh({
  label,
  sortKey,
  activeSortKey,
  sortAsc,
  onSort,
  className = '',
  style,
  title,
  align = 'right',
}: SortableThProps) {
  const isActive = activeSortKey === sortKey;

  const justifyClass =
    align === 'center' ? 'justify-center' : align === 'left' ? 'justify-end' : 'justify-between';

  return (
    <th
      onClick={() => onSort(sortKey)}
      style={style}
      title={title}
      aria-sort={isActive ? (sortAsc ? 'ascending' : 'descending') : 'none'}
      className={`cursor-pointer select-none transition-colors hover:brightness-110 ${className}`}
    >
      <div className={`flex items-center gap-1 ${justifyClass}`}>
        <span className="leading-tight">{label}</span>
        {isActive ? (
          sortAsc ? (
            <ArrowUp className="w-3 h-3 text-[#C6A15B] shrink-0" />
          ) : (
            <ArrowDown className="w-3 h-3 text-[#C6A15B] shrink-0" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-45 shrink-0" />
        )}
      </div>
    </th>
  );
}
