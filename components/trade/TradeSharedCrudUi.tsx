'use client';

import React, { useState } from 'react';
import { AlertTriangle, Ban, Edit3, Eye, Plus, Trash2, X } from 'lucide-react';
import { formatDateArabic, toArabicNumerals } from '@/lib/utils';
import ChicArabicDatepicker from '../ChicArabicDatepicker';

export interface TableActionButtonsProps {
  onView: () => void;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
  disableDelete?: boolean;
  /** عند true يُعرض زر "إلغاء / قيد عكسي" بدلاً من الحذف النهائي للسجلات المعتمدة */
  isApprovedImmutable?: boolean;
  onReverseOrCancel?: () => void;
  canDelete?: boolean;
  canEdit?: boolean;
  canAdd?: boolean;
  recordLabel?: string;
}

/**
 * أزرار الإجراءات الموحدة في نهاية كل جدول داخل المنظومة (عرض · إضافة · تعديل · حذف / إلغاء)
 * تتضمن نافذة تأكيد أمنية قبل الحذف وفق ضوابط سلامة البيانات.
 */
export function TableActionButtons({
  onView,
  onAdd,
  onEdit,
  onDelete,
  disableDelete = false,
  isApprovedImmutable = false,
  onReverseOrCancel,
  canDelete = true,
  canEdit = true,
  canAdd = true,
  recordLabel = 'هذا السجل',
}: TableActionButtonsProps) {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-center gap-1 whitespace-nowrap">
        <button
          type="button"
          onClick={onView}
          className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#164E83] border border-blue-200 text-[10.5px] font-black flex items-center gap-1 cursor-pointer transition-colors"
          title="عرض التفاصيل"
        >
          <Eye className="w-3 h-3" />
          <span>عرض</span>
        </button>

        {canAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10.5px] font-black flex items-center gap-1 cursor-pointer transition-colors"
            title="إضافة سجل جديد"
          >
            <Plus className="w-3 h-3" />
            <span>إضافة</span>
          </button>
        )}

        {canEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[10.5px] font-black flex items-center gap-1 cursor-pointer transition-colors"
            title="تعديل السجل"
          >
            <Edit3 className="w-3 h-3" />
            <span>تعديل</span>
          </button>
        )}

        {canDelete && (
          isApprovedImmutable ? (
            <button
              type="button"
              onClick={() => onReverseOrCancel?.()}
              className="px-2 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-300 text-[10.5px] font-black flex items-center gap-1 cursor-pointer transition-colors"
              title="لا يسمح بحذف حركة معتمدة نهائياً — تسجيل إلغاء أو قيد عكسي موثق"
            >
              <Ban className="w-3 h-3" />
              <span>قيد عكسي</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => !disableDelete && setConfirmDeleteOpen(true)}
              disabled={disableDelete}
              className={`px-2 py-1 rounded-lg border text-[10.5px] font-black flex items-center gap-1 transition-colors ${
                disableDelete
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200 cursor-pointer'
              }`}
              title={disableDelete ? 'لا يمكن الحذف لوجود ارتباطات معتمدة' : 'حذف السجل'}
            >
              <Trash2 className="w-3 h-3" />
              <span>حذف</span>
            </button>
          )
        )}
      </div>

      {confirmDeleteOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/55 flex items-center justify-center p-4 text-right"
          dir="rtl"
          onClick={() => setConfirmDeleteOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border-2 border-red-700 max-w-md w-full p-5 space-y-4 shadow-2xl whitespace-normal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-red-700 border-b border-red-100 pb-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h4 className="text-sm font-black text-[#102A43]">تأكيد حذف السجل</h4>
            </div>
            <p className="text-xs font-bold text-slate-700 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف ({recordLabel})؟ سيتم توثيق عملية الحذف في سجل التدقيق وتحديث الجدول فوراً.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-black cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDeleteOpen(false);
                  onDelete();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-black cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>تأكيد الحذف</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export interface EditableFieldSpec {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select';
  readOnly?: boolean;
  options?: string[];
}

interface UniversalCrudModalProps {
  mode: 'view' | 'edit';
  title: string;
  record: Record<string, unknown>;
  fields: EditableFieldSpec[];
  todayRef?: string;
  onClose: () => void;
  onSave?: (updated: Record<string, unknown>) => void;
}

/**
 * نافذة موحدة لعرض أو تعديل أي سجل في جداول المنظومة
 * مزودة بكالندر عربي أنيق (ChicArabicDatepicker) لاختيار تواريخ انتهاء التراخيص والبطاقات الضريبية والسجلات التجارية
 */
export function UniversalCrudModal({
  mode,
  title,
  record,
  fields,
  todayRef = '2026-11-25',
  onClose,
  onSave,
}: UniversalCrudModalProps) {
  const [draft, setDraft] = useState<Record<string, unknown>>(() => ({ ...record }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSave) {
      onSave(draft);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl border-2 border-[#102A43] max-w-3xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <span className="text-[10.5px] font-black text-[#164E83] block">
              {mode === 'view' ? 'معاينة واستعراض بيانات السجل الرسمي' : 'تعديل وتحديث بيانات السجل الرسمي'}
            </span>
            <h4 className="text-sm font-black text-[#102A43]">{title}</h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {mode === 'view' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              {fields.map((f) => {
                const rawVal = record[f.key];
                const strVal = rawVal !== undefined && rawVal !== null && String(rawVal) !== '' ? String(rawVal) : '—';
                const isDate = f.type === 'date' && strVal !== '—';
                const isExpired = isDate && strVal < todayRef;
                return (
                  <div key={f.key} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 font-bold block text-[10.5px]">{f.label}</span>
                    <span
                      className={`font-black block mt-0.5 break-words ${
                        isExpired ? 'text-red-700' : 'text-[#102A43]'
                      }`}
                    >
                      {isDate ? `${formatDateArabic(strVal)}${isExpired ? ' (منتهي)' : ''}` : toArabicNumerals(strVal)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black cursor-pointer"
              >
                إغلاق المعاينة
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {fields.map((f) => {
                const val = draft[f.key];
                if (f.type === 'date') {
                  return (
                    <div key={f.key}>
                      <ChicArabicDatepicker
                        label={f.label}
                        value={val !== undefined && val !== null ? String(val) : ''}
                        onChange={(nextIso) =>
                          setDraft((prev) => ({
                            ...prev,
                            [f.key]: nextIso,
                          }))
                        }
                        todayRef={todayRef}
                        disabled={f.readOnly}
                        compact
                      />
                    </div>
                  );
                }
                return (
                  <div key={f.key}>
                    <label className="font-black text-[#102A43] block mb-1">{f.label}</label>
                    {f.type === 'select' && f.options ? (
                      <select
                        value={val !== undefined && val !== null ? String(val) : ''}
                        disabled={f.readOnly}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            [f.key]: e.target.value,
                          }))
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl font-bold bg-white text-[#102A43]"
                      >
                        {f.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={f.type === 'select' ? 'text' : f.type || 'text'}
                        readOnly={f.readOnly}
                        value={val !== undefined && val !== null ? String(val) : ''}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value,
                          }))
                        }
                        className={`w-full px-2.5 py-1.5 border border-slate-300 rounded-xl font-bold text-[#102A43] ${
                          f.readOnly ? 'bg-slate-100' : 'bg-white'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-slate-200 text-slate-800 font-black cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] font-black cursor-pointer"
              >
                حفظ التعديلات
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
