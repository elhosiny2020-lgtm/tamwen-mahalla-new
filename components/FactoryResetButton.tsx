'use client';

import React, { useState } from 'react';
import { AlertTriangle, RotateCcw, Trash2, X } from 'lucide-react';

interface FactoryResetButtonProps {
  sectionName: string;
  description?: string;
  onConfirmReset: () => void;
  compact?: boolean;
}

/**
 * زر إعادة ضبط المصنع للبيانات المدخلة داخل القسم (مع نافذة تأكيد أمنية دون window.confirm)
 * يقوم بمسح كافة البيانات المدخلة في جداول القسم (تجار / مخابز / أرقام / قرى / تواريخ / تراخيص / سجلات)
 */
export default function FactoryResetButton({
  sectionName,
  description = 'سيتم مسح جميع البيانات المدخلة في جداول هذا القسم بالكامل (التجار / أصحاب المخابز / الأرقام المسجلة / القرى والوحدات المحلية / التواريخ / السجلات والتراخيص) لبدء إدخال بيانات جديدة من الصفر.',
  onConfirmReset,
  compact = false,
}: FactoryResetButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className={`${
          compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3.5 py-2 text-xs'
        } rounded-xl bg-red-700 hover:bg-red-800 text-white font-black flex items-center gap-1.5 cursor-pointer border border-red-400/40 shadow-xs transition-colors whitespace-nowrap`}
        title={`إعادة ضبط المصنع وتفريغ جداول ${sectionName}`}
      >
        <RotateCcw className="w-3.5 h-3.5 shrink-0" />
        <span>إعادة ضبط المصنع</span>
      </button>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
          dir="rtl"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border-2 border-red-700 max-w-lg w-full p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-red-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10.5px] font-black text-red-700 block">
                    تنبيه أمني — إعادة ضبط المصنع للقسم
                  </span>
                  <h4 className="text-sm font-black text-[#102A43]">
                    تأكيد مسح البيانات المدخلة في: {sectionName}
                  </h4>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs font-bold text-red-900 leading-relaxed space-y-1.5">
              <p>{description}</p>
              <p className="font-black text-red-800">
                ملاحظة: لا يؤثر هذا الإجراء على الأقسام الأخرى في المنظومة، ويمكنك البدء فوراً بإدخال بياناتك الفعلية الجديدة في الجداول الفارغة.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-black cursor-pointer"
              >
                إلغاء وتراجع
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirmReset();
                  setConfirmOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>تأكيد إعادة ضبط المصنع ومسح الجداول</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
