'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  DatabaseBackup,
  Download,
  KeyRound,
  Lock,
  RotateCcw,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import { User } from '@/types';
import { getCurrentSessionUser } from '@/lib/mock-db';
import {
  FactoryResetBackupRecord,
  TableResetCountItem,
  canUserExecuteFactoryReset,
  createVerifiedSectionBackup,
  downloadBackupJsonFile,
  recordFactoryResetAudit,
  verifyAdminResetCredential,
} from '@/lib/factory-reset-engine';
import { useSystemPreferences } from '@/lib/user-preferences-store';
import { toArabicNumerals } from '@/lib/utils';

interface FactoryResetButtonProps {
  sectionName: string;
  sectionKey?: string;
  description?: string;
  currentUser?: User | null;
  /** ملخص الجداول وعدد السجلات التي سيتم مسحها */
  tableSummary?: TableResetCountItem[];
  /** دالة اختيارية لجمع ملخص الجداول لحظياً عند فتح النافذة */
  getTableSummary?: (includeCustom: boolean) => TableResetCountItem[];
  /** دالة اختيارية لالتقاط نسخة احتياطية كاملة قابلة للاسترجاع من بيانات القسم */
  onCaptureBackup?: () => Record<string, unknown>;
  /** دالة اختيارية لاسترجاع النسخة الاحتياطية عند الحاجة */
  onRestoreBackup?: (snapshot: Record<string, unknown>) => void;
  /** دعم خيار مسح القوائم والإعدادات المخصصة داخل القسم */
  allowClearCustomLists?: boolean;
  onConfirmReset: (options?: { clearCustomLists: boolean }) => void;
  compact?: boolean;
}

/**
 * زر إعادة ضبط المصنع المؤسسي المحمي:
 * - مقصور على مدير النظام وأصحاب الصلاحيات الإدارية العليا فقط
 * - يعرض اسم القسم وملخص الجداول وعدد السجلات التي سيتم حذفها
 * - ينشئ نسخة احتياطية قابلة للاسترجاع ويتحقق من سلامتها قبل التنفيذ (مع إمكانية تنزيلها)
 * - يطلب كتابة عبارة التأكيد (تأكيد إعادة ضبط المصنع) + التحقق الإداري بكلمة المرور
 * - يسجل العملية في سجل التدقيق الأمني العام ويحمي باقي الأقسام والحسابات
 */
export default function FactoryResetButton({
  sectionName,
  sectionKey,
  description,
  currentUser,
  tableSummary,
  getTableSummary,
  onCaptureBackup,
  onRestoreBackup,
  allowClearCustomLists = false,
  onConfirmReset,
  compact = false,
}: FactoryResetButtonProps) {
  const { isRtl, t } = useSystemPreferences();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [includeCustomLists, setIncludeCustomLists] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [adminCredential, setAdminCredential] = useState('');
  const [createdBackup, setCreatedBackup] = useState<FactoryResetBackupRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState(false);
  const [restoredMsg, setRestoredMsg] = useState<string | null>(null);

  const effectiveUser = useMemo<User | null>(
    () => currentUser ?? getCurrentSessionUser(),
    [currentUser]
  );

  const isAuthorized = canUserExecuteFactoryReset(effectiveUser);

  // عدم السماح لموظف عادي برؤية أو تنفيذ إعادة ضبط المصنع
  if (!isAuthorized) {
    return null;
  }

  const expectedPhrase = t('factoryResetPhraseExpected');
  const resolvedKey =
    sectionKey ||
    sectionName
      .replace(/\s+/g, '_')
      .slice(0, 18);

  const computedSummary: TableResetCountItem[] = getTableSummary
    ? getTableSummary(includeCustomLists)
    : tableSummary && tableSummary.length > 0
    ? tableSummary
    : [{ tableName: sectionName, count: 0 }];

  const totalToClear = computedSummary.reduce((sum, item) => sum + item.count, 0);

  const fmtNum = (n: number) => (isRtl ? toArabicNumerals(n) : String(n));

  const openModal = () => {
    setConfirmPhrase('');
    setAdminCredential('');
    setCreatedBackup(null);
    setErrorMsg(null);
    setResetDone(false);
    setRestoredMsg(null);
    setIncludeCustomLists(false);
    setConfirmOpen(true);
  };

  const handleCreateBackup = () => {
    setErrorMsg(null);
    if (!effectiveUser) {
      setErrorMsg('تعذر التحقق من جلسة المستخدم الحالية.');
      return;
    }
    const payload = onCaptureBackup
      ? onCaptureBackup()
      : {
          sectionName,
          capturedAt: new Date().toISOString(),
          tableSummary: computedSummary,
        };
    const res = createVerifiedSectionBackup({
      sectionKey: resolvedKey,
      sectionName,
      user: effectiveUser,
      tableSummary: computedSummary,
      snapshotPayload: payload,
    });
    if (!res.ok) {
      setCreatedBackup(null);
      setErrorMsg(res.error);
      return;
    }
    setCreatedBackup(res.backup);
  };

  const phraseMatches =
    confirmPhrase.trim() === 'تأكيد إعادة ضبط المصنع' ||
    confirmPhrase.trim().toUpperCase() === 'CONFIRM FACTORY RESET';

  const credentialValid = verifyAdminResetCredential(effectiveUser, adminCredential);
  const canExecute = Boolean(createdBackup && phraseMatches && credentialValid);

  const handleExecuteReset = async () => {
    setErrorMsg(null);
    if (!effectiveUser || !isAuthorized) {
      setErrorMsg(t('factoryResetAdminOnly'));
      return;
    }
    if (!createdBackup) {
      setErrorMsg(t('factoryResetBackupRequired'));
      return;
    }
    if (!phraseMatches) {
      setErrorMsg(
        isRtl
          ? 'يرجى كتابة عبارة التأكيد بالضبط: تأكيد إعادة ضبط المصنع'
          : 'Please type the exact phrase: CONFIRM FACTORY RESET'
      );
      return;
    }
    if (!credentialValid) {
      setErrorMsg(
        isRtl
          ? 'فشل التحقق الإداري: يرجى إدخال كلمة المرور الإدارية الصحيحة.'
          : 'Administrative verification failed: please enter your valid admin credential.'
      );
      return;
    }

    try {
      const verifyRes = await fetch('/api/auth/verify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminCredential }),
      });
      if (!verifyRes.ok) {
        const verifyData = (await verifyRes.json().catch(() => ({}))) as { error?: string };
        setErrorMsg(
          verifyData.error ||
            (isRtl
              ? 'فشل التحقق الإداري على الخادم — تم إيقاف عملية إعادة الضبط.'
              : 'Server administrative verification failed.')
        );
        return;
      }

      onConfirmReset({ clearCustomLists: includeCustomLists });
      recordFactoryResetAudit({
        user: effectiveUser,
        sectionName,
        backupId: createdBackup.backupId,
        tableSummary: computedSummary,
        clearCustomSettings: includeCustomLists,
        status: 'success',
      });
      setResetDone(true);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'حدث خطأ غير متوقع أثناء مسح جداول القسم — تم إيقاف العملية.';
      recordFactoryResetAudit({
        user: effectiveUser,
        sectionName,
        backupId: createdBackup.backupId,
        tableSummary: computedSummary,
        clearCustomSettings: includeCustomLists,
        status: 'failed',
        errorMessage: msg,
      });
      setErrorMsg(msg);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={`${
          compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3.5 py-2 text-xs'
        } rounded-xl bg-red-700 hover:bg-red-800 text-white font-black flex items-center gap-1.5 cursor-pointer border border-red-400/50 shadow-xs transition-colors whitespace-nowrap shrink-0`}
        title={`${t('factoryResetTitle')} — ${sectionName}`}
      >
        <RotateCcw className="w-3.5 h-3.5 shrink-0" />
        <span>{t('factoryResetBtn')}</span>
      </button>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          dir={isRtl ? 'rtl' : 'ltr'}
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="bg-white text-[#102A43] rounded-2xl border-2 border-red-700 max-w-2xl w-full p-5 space-y-4 shadow-2xl my-auto max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* الترويسة الأمنية */}
            <div className="flex items-start justify-between gap-3 border-b border-red-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10.5px] font-black text-red-700 block">
                    {t('factoryResetTitle')} · {t('factoryResetAdminOnly')}
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
                    <span>{t('factoryResetSuccessTitle')}</span>
                  </div>
                  <p className="text-xs font-bold text-emerald-900 leading-relaxed">
                    {t('factoryResetSuccessDesc')}
                  </p>
                  {createdBackup && (
                    <div className="p-2.5 rounded-xl bg-white border border-emerald-200 text-[11px] font-bold text-slate-700 space-y-1">
                      <div>
                        <span className="font-black text-[#102A43]">معرف النسخة الاحتياطية: </span>
                        <span className="font-mono">{createdBackup.backupId}</span>
                      </div>
                      <div>
                        <span className="font-black text-[#102A43]">موقع الحفظ: </span>
                        <span>{createdBackup.storageLocation}</span>
                      </div>
                    </div>
                  )}
                </div>

                {restoredMsg && (
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs font-black text-[#164E83]">
                    {restoredMsg}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    {createdBackup && (
                      <button
                        type="button"
                        onClick={() => downloadBackupJsonFile(createdBackup)}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#102A43] text-xs font-black flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{t('factoryResetDownloadBackupBtn')}</span>
                      </button>
                    )}
                    {createdBackup && onRestoreBackup && !restoredMsg && (
                      <button
                        type="button"
                        onClick={() => {
                          onRestoreBackup(createdBackup.snapshotPayload);
                          setRestoredMsg(
                            isRtl
                              ? `تم استرجاع النسخة الاحتياطية (${createdBackup.backupId}) بنجاح وإعادة البيانات فوراً.`
                              : `Backup (${createdBackup.backupId}) restored successfully.`
                          );
                        }}
                        className="px-3.5 py-2 rounded-xl bg-[#164E83] hover:bg-[#102A43] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                      >
                        <DatabaseBackup className="w-3.5 h-3.5" />
                        <span>{t('factoryResetRestoreBackupBtn')}</span>
                      </button>
                    )}
                  </div>
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
              <>
                {/* نطاق الحماية الأمني */}
                <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs font-bold text-red-900 leading-relaxed space-y-1.5">
                  <p className="font-black flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-700" />
                    <span>{t('factoryResetScopeWarn')}</span>
                  </p>
                  {description && <p className="text-red-800">{description}</p>}
                </div>

                {/* ملخص الجداول وعدد السجلات التي سيتم مسحها */}
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {computedSummary.map((row) => (
                        <tr key={row.tableName} className="bg-white">
                          <td className="p-2 font-black text-[#102A43]">{row.tableName}</td>
                          <td className="p-2 text-center num-cell font-black text-red-700">
                            {fmtNum(row.count)}
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
                    <span>{t('factoryResetIncludeCustomLists')}</span>
                  </label>
                )}

                {/* الخطوة ١: النسخة الاحتياطية الإلزامية قبل التنفيذ */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="text-xs font-black text-[#102A43] flex items-center gap-1.5">
                    <DatabaseBackup className="w-4 h-4 text-[#164E83]" />
                    <span>{t('factoryResetBackupStep')}</span>
                  </div>
                  {!createdBackup ? (
                    <button
                      type="button"
                      onClick={handleCreateBackup}
                      className="px-4 py-2 rounded-xl bg-[#164E83] hover:bg-[#102A43] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      <DatabaseBackup className="w-4 h-4 text-[#C6A15B]" />
                      <span>{t('factoryResetCreateBackupBtn')}</span>
                    </button>
                  ) : (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>{t('factoryResetBackupSuccess')}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => downloadBackupJsonFile(createdBackup)}
                          className="px-3 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-900 text-[11px] font-black flex items-center gap-1 cursor-pointer hover:bg-emerald-100"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{t('factoryResetDownloadBackupBtn')}</span>
                        </button>
                      </div>
                      <p className="text-[11px] font-bold text-emerald-900 break-words">
                        {createdBackup.storageLocation}
                      </p>
                    </div>
                  )}
                </div>

                {/* الخطوة ٢: عبارة التأكيد الحرفية */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[#102A43] block">
                    {t('factoryResetPhraseLabel')}{' '}
                    <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-black select-all">
                      {expectedPhrase}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={confirmPhrase}
                    onChange={(e) => setConfirmPhrase(e.target.value)}
                    placeholder={expectedPhrase}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-black outline-none ${
                      phraseMatches
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                        : 'border-slate-300 bg-white text-[#102A43]'
                    }`}
                  />
                </div>

                {/* الخطوة ٣: التحقق الإداري بكلمة المرور */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[#102A43] flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#164E83]" />
                    <span>{t('factoryResetPasswordLabel')}</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute top-2.5 right-3" />
                    <input
                      type="password"
                      value={adminCredential}
                      onChange={(e) => setAdminCredential(e.target.value)}
                      placeholder={t('factoryResetPasswordPlaceholder')}
                      className={`w-full pr-9 pl-3 py-2 rounded-xl border text-xs font-bold outline-none ${
                        credentialValid
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                          : 'border-slate-300 bg-white text-[#102A43]'
                      }`}
                    />
                  </div>
                  <p className="text-[10.5px] font-bold text-slate-500">
                    {isRtl
                      ? `حساب المسؤول الحالي: ${effectiveUser?.username || 'admin'} — أدخل كلمة مرور الحساب أو اسم المستخدم الإداري للتحقق.`
                      : `Active Admin: ${effectiveUser?.username || 'admin'} — re-enter your account password or admin username to verify.`}
                  </p>
                </div>

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
                    type="button"
                    disabled={!canExecute}
                    onClick={handleExecuteReset}
                    className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('factoryResetExecuteBtn')}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
