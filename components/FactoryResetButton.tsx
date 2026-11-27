'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  ShieldAlert,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { User } from '@/types';
import { getCurrentSessionUser } from '@/lib/mock-db';
import {
  TableResetCountItem,
  canUserExecuteFactoryReset,
  recordFactoryResetAudit,
} from '@/lib/factory-reset-engine';
import { useSystemPreferences } from '@/lib/user-preferences-store';
import { toArabicNumerals } from '@/lib/utils';
import { RoleGuard } from './RoleGuard';

interface FactoryResetButtonProps {
  sectionName: string;
  sectionKey?: string;
  description?: string;
  currentUser?: User | null;
  /** ملخص الجداول وعدد السجلات التي سيتم مسحها */
  tableSummary?: TableResetCountItem[];
  /** دالة اختيارية لجمع ملخص الجداول لحظياً عند فتح النافذة */
  getTableSummary?: (includeCustom: boolean) => TableResetCountItem[];
  /** خصائص اختيارية للتوافق مع الاستدعاءات السابقة (تم إلغاء مطالبة النسخة الاحتياطية وتنفيذ التصفير فوراً) */
  onCaptureBackup?: () => Record<string, unknown>;
  onRestoreBackup?: (snapshot: Record<string, unknown>) => void;
  /** دعم خيار مسح القوائم والإعدادات المخصصة داخل القسم */
  allowClearCustomLists?: boolean;
  onConfirmReset: (options?: { clearCustomLists: boolean }) => void;
  compact?: boolean;
}

/**
 * زر استعادة ضبط المصنع الفوري لكل قسم:
 * - لا يطلب نسخة احتياطية ولا يقوم بتنزيل أي ملفات
 * - ينفذ التصفير الفوري مباشرة عند التأكيد بدون طلب كلمة مرور
 * - يمسح كافة البيانات التشغيلية للقسم ويعيد الإعدادات للوضع الافتراضي ويوثق العملية في سجل التدقيق
 */
export default function FactoryResetButton({
  sectionName,
  description,
  currentUser,
  tableSummary,
  getTableSummary,
  allowClearCustomLists = true,
  onConfirmReset,
  compact = false,
}: FactoryResetButtonProps) {
  const { isRtl, t } = useSystemPreferences();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [includeCustomLists, setIncludeCustomLists] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState(false);

  const effectiveUser = useMemo<User | null>(
    () => currentUser ?? getCurrentSessionUser(),
    [currentUser]
  );

  const isAuthorized = canUserExecuteFactoryReset(effectiveUser);

  if (!isAuthorized) {
    return null;
  }

  const computedSummary: TableResetCountItem[] = getTableSummary
    ? getTableSummary(includeCustomLists)
    : tableSummary && tableSummary.length > 0
    ? tableSummary
    : [{ tableName: sectionName, count: 0 }];

  const totalToClear = computedSummary.reduce((sum, item) => sum + item.count, 0);

  const fmtNum = (n: number) => (isRtl ? toArabicNumerals(n) : String(n));

  const openModal = () => {
    setErrorMsg(null);
    setResetDone(false);
    setIncludeCustomLists(true);
    setConfirmOpen(true);
  };

  const handleExecuteImmediateWipe = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    if (!effectiveUser || !isAuthorized) {
      setErrorMsg(t('factoryResetAdminOnly'));
      return;
    }

    setExecuting(true);
    try {
      onConfirmReset({ clearCustomLists: includeCustomLists });
      recordFactoryResetAudit({
        user: effectiveUser,
        sectionName,
        backupId: 'DIRECT-WIPE-NO-BACKUP',
        tableSummary: computedSummary,
        clearCustomSettings: includeCustomLists,
        status: 'success',
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gharbia-audit-log-added'));
        window.dispatchEvent(new CustomEvent('gharbia-departments-updated'));
      }
      setResetDone(true);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'حدث خطأ غير متوقع أثناء تصفير بيانات القسم.';
      recordFactoryResetAudit({
        user: effectiveUser,
        sectionName,
        backupId: 'DIRECT-WIPE-NO-BACKUP',
        tableSummary: computedSummary,
        clearCustomSettings: includeCustomLists,
        status: 'failed',
        errorMessage: msg,
      });
      setErrorMsg(msg);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <RoleGuard user={effectiveUser} requireAdmin>
      <button
        type="button"
        onClick={openModal}
        className={`${
          compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3.5 py-2 text-xs'
        } rounded-xl bg-red-700 hover:bg-red-800 text-white font-black flex items-center gap-1.5 cursor-pointer border border-red-400/50 shadow-xs transition-colors whitespace-nowrap shrink-0`}
        title={`استعادة ضبط المصنع وتصفير البيانات فوراً — ${sectionName}`}
      >
        <RotateCcw className="w-3.5 h-3.5 shrink-0" />
        <span>{isRtl ? 'استعادة ضبط المصنع' : t('factoryResetBtn')}</span>
      </button>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          dir={isRtl ? 'rtl' : 'ltr'}
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="bg-white text-[#102A43] rounded-2xl border-2 border-red-700 max-w-xl w-full p-5 space-y-4 shadow-2xl my-auto max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* الترويسة */}
            <div className="flex items-start justify-between gap-3 border-b border-red-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10.5px] font-black text-red-700 block">
                    {isRtl
                      ? 'استعادة ضبط المصنع والتصفير الفوري المباشر'
                      : 'Immediate Direct Factory Reset'}
                  </span>
                  <h4 className="text-base font-black text-[#102A43]">{sectionName}</h4>
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

            {resetDone ? (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-black text-sm">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>
                      {isRtl
                        ? 'تم تنفيذ التصفير الفوري واستعادة ضبط المصنع بنجاح'
                        : 'Immediate Factory Reset Completed Successfully'}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-emerald-900 leading-relaxed">
                    {isRtl
                      ? `تم مسح وتصفير كافة السجلات والبيانات التشغيلية لقسم (${sectionName}) وإعادة الإعدادات إلى الوضع الافتراضي فوراً بدون إصدار نسخة احتياطية، وتم توثيق العملية في سجل التدقيق الأمني.`
                      : `All transactional data for (${sectionName}) has been immediately wiped and settings reset to default.`}
                  </p>
                </div>

                <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(false)}
                    className="px-5 py-2 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black cursor-pointer"
                  >
                    {t('close')}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleExecuteImmediateWipe} className="space-y-4">
                {/* تنبيه التصفير الفوري */}
                <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs font-bold text-red-900 leading-relaxed space-y-1.5">
                  <p className="font-black flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-700" />
                    <span>
                      {isRtl
                        ? 'تنبيه: سيتم تصفير كافة جداول وبيانات هذا القسم فوراً وبشكل نهائي بدون نسخة احتياطية بمجرد الضغط على زر التأكيد.'
                        : 'Warning: All transactional records for this module will be wiped immediately upon confirmation.'}
                    </span>
                  </p>
                  {description && <p className="text-red-800">{description}</p>}
                </div>

                {/* ملخص الجداول وعدد السجلات التي سيتم تصفيرها فوراً */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-3.5 py-2 text-xs font-black text-[#102A43] flex items-center justify-between">
                    <span>{t('factoryResetTableSummary')}</span>
                    <span className="num-cell text-red-700">
                      {fmtNum(totalToClear)} {t('recordsCount')}
                    </span>
                  </div>
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-[#102A43] text-white">
                        <th className="p-2">{t('factoryResetTableCol')}</th>
                        <th className="p-2 text-center">{t('factoryResetCountCol')}</th>
                        <th className="p-2 text-center">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {computedSummary.map((row) => (
                        <tr key={row.tableName} className="bg-white">
                          <td className="p-2 font-black text-[#102A43]">{row.tableName}</td>
                          <td className="p-2 text-center num-cell font-black text-red-700">
                            {fmtNum(row.count)}
                          </td>
                          <td className="p-2 text-center">
                            <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-black">
                              {isRtl ? 'تصفير فوري مباشر' : 'Immediate Wipe'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {allowClearCustomLists && (
                  <label className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-black text-amber-950 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeCustomLists}
                      onChange={(e) => setIncludeCustomLists(e.target.checked)}
                      className="w-4 h-4 accent-red-700 cursor-pointer"
                    />
                    <span>
                      {isRtl
                        ? 'إعادة ضبط الإعدادات والقوائم المخصصة إلى الوضع الافتراضي أيضاً'
                        : t('factoryResetIncludeCustomLists')}
                    </span>
                  </label>
                )}

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-red-100 border border-red-300 text-xs font-black text-red-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-black cursor-pointer"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={executing}
                    className="px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>
                      {executing
                        ? isRtl
                          ? 'جاري التصفير الفوري...'
                          : 'Wiping Data...'
                        : isRtl
                        ? 'تأكيد وتنفيذ التصفير الفوري الآن'
                        : 'Confirm & Execute Immediate Reset'}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </RoleGuard>
  );
}
