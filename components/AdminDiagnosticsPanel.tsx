'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Info,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Terminal,
  Trash2,
} from 'lucide-react';
import type {
  DiagnosticCategory,
  DiagnosticLogEntry,
  DiagnosticSeverity,
  RuntimeHealthSnapshot,
} from '@/lib/server/diagnostics-store';
import { formatDateArabic, toArabicNumerals } from '@/lib/utils';

interface SelfCheckItem {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

const SEVERITY_LABELS: Record<DiagnosticSeverity, string> = {
  error: 'خطأ حرج',
  warning: 'تحذير',
  info: 'معلومة تشغيل',
};

const CATEGORY_LABELS: Record<DiagnosticCategory, string> = {
  build: 'بناء النظام (Build)',
  server: 'الخادم (Server)',
  runtime: 'التشغيل (Runtime)',
  database: 'قاعدة البيانات (DB)',
  auth: 'المصادقة والأمان',
};

export default function AdminDiagnosticsPanel({
  onNotify,
}: {
  onNotify?: (msg: string) => void;
}) {
  const [logs, setLogs] = useState<DiagnosticLogEntry[]>([]);
  const [health, setHealth] = useState<RuntimeHealthSnapshot | null>(null);
  const [selfChecks, setSelfChecks] = useState<SelfCheckItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [runningCheck, setRunningCheck] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<DiagnosticSeverity | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<DiagnosticCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchDiagnostics = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (severityFilter !== 'all') params.set('severity', severityFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/admin/diagnostics?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'تعذر تحميل سجلات التشخيص من الخادم.');
      }
      setLogs(Array.isArray(data.logs) ? data.logs : []);
      setHealth(data.health || null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر الاتصال بخدمة التشخيص.');
    } finally {
      setLoading(false);
    }
  }, [severityFilter, categoryFilter, searchQuery]);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      void fetchDiagnostics();
    });
    return () => cancelAnimationFrame(frameId);
  }, [fetchDiagnostics]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchDiagnostics();
    }, 15000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchDiagnostics]);

  // Capture unhandled client runtime errors while an admin has the panel mounted
  useEffect(() => {
    const onWindowError = (event: ErrorEvent) => {
      fetch('/api/admin/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'log',
          severity: 'error',
          category: 'runtime',
          source: 'window.onerror',
          message: event.message || 'Unhandled browser runtime error',
          details: `${event.filename || ''}:${event.lineno || 0}:${event.colno || 0}`,
          stack: event.error instanceof Error ? event.error.stack : undefined,
          route: window.location.pathname,
        }),
      }).catch(() => {});
    };

    window.addEventListener('error', onWindowError);
    return () => window.removeEventListener('error', onWindowError);
  }, []);

  const handleRunSelfCheck = async () => {
    setRunningCheck(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'self_check' }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'فشل تشغيل الفحص الذاتي للخادم.');
      }
      setSelfChecks(Array.isArray(data.selfCheck?.checks) ? data.selfCheck.checks : []);
      if (data.health) setHealth(data.health);
      onNotify?.('تم تشغيل فحص سلامة البناء والخادم وتحديث سجلات التشخيص.');
      await fetchDiagnostics();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر تنفيذ الفحص الذاتي.');
    } finally {
      setRunningCheck(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      const res = await fetch('/api/admin/diagnostics', {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'تعذر تفريغ السجلات التشخيصية.');
      }
      setLogs([]);
      onNotify?.(`تم تفريغ ${toArabicNumerals(data.cleared || 0)} سجل تشخيصي وتوثيق العملية في التدقيق الأمني.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر تفريغ السجلات.');
    }
  };

  const handleExportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      health,
      selfChecks,
      logs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gharbia-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify?.('تم تصدير تقرير أخطاء التشغيل والبناء بصيغة JSON.');
  };

  const handleCopyEntry = async (entry: DiagnosticLogEntry) => {
    const text = `[${entry.timestamp}] [${entry.severity.toUpperCase()}] [${entry.category}] ${entry.source}\nMessage: ${entry.message}${
      entry.details ? `\nDetails: ${entry.details}` : ''
    }${entry.stack ? `\nStack:\n${entry.stack}` : ''}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      onNotify?.('تعذر النسخ التلقائي للحافظة.');
    }
  };

  const stats = useMemo(() => {
    const errors = logs.filter((l) => l.severity === 'error').length;
    const warnings = logs.filter((l) => l.severity === 'warning').length;
    const buildRelated = logs.filter((l) => l.category === 'build').length;
    return { total: logs.length, errors, warnings, buildRelated };
  }, [logs]);

  const formatUptime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${toArabicNumerals(h)} س ${toArabicNumerals(m)} د`;
    if (m > 0) return `${toArabicNumerals(m)} د ${toArabicNumerals(s)} ث`;
    return `${toArabicNumerals(s)} ثانية`;
  };

  return (
    <div className="bg-white/92 backdrop-blur-md rounded-[22px] shadow-xs border border-slate-200 p-4 sm:p-5 space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#102A43] text-[#C6A15B] flex items-center justify-center shrink-0">
            <Terminal className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-[#102A43]">
              مركز تشخيص أخطاء التشغيل والبناء والخادم (Runtime &amp; Build Diagnostics)
            </h3>
            <p className="text-[11px] font-bold text-slate-600 mt-0.5">
              رصد فوري لأخطاء الخادم والبناء الإنتاجي والذاكرة مع تنقيح تلقائي للبيانات الحساسة (مقصور على مديري النظام)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRunSelfCheck}
            disabled={runningCheck}
            className="px-3 py-2 rounded-xl bg-[#102A43] hover:bg-[#164E83] disabled:opacity-60 text-[#C6A15B] text-[11px] font-black flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${runningCheck ? 'animate-pulse' : ''}`} />
            <span>{runningCheck ? 'جارٍ الفحص...' : 'فحص سلامة البناء والخادم'}</span>
          </button>

          <button
            type="button"
            onClick={() => setAutoRefresh((v) => !v)}
            className={`px-3 py-2 rounded-xl border text-[11px] font-black flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
              autoRefresh
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{autoRefresh ? 'تحديث تلقائي: مفعّل' : 'تحديث تلقائي'}</span>
          </button>

          <button
            type="button"
            onClick={fetchDiagnostics}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#102A43] text-[11px] font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#102A43] text-[11px] font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير JSON</span>
          </button>

          <button
            type="button"
            onClick={handleClearLogs}
            disabled={logs.length === 0}
            className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 disabled:opacity-40 text-rose-800 border border-rose-200 text-[11px] font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>تفريغ السجل</span>
          </button>
        </div>
      </div>

      {/* Live Server & Build Health Metrics */}
      {health && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span>بيئة التشغيل والخادم</span>
              <Server className="w-4 h-4 text-[#164E83]" />
            </div>
            <p className="text-sm font-black text-[#102A43] num-cell">
              {health.nodeVersion} · {health.nodeEnv}
            </p>
            <p className="text-[10.5px] font-bold text-slate-500">
              مدة التشغيل: {formatUptime(health.uptimeSeconds)}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span>استهلاك ذاكرة الخادم</span>
              <Activity className="w-4 h-4 text-emerald-700" />
            </div>
            <p className="text-sm font-black text-[#102A43] num-cell">
              {toArabicNumerals(health.memoryMb.heapUsed)} / {toArabicNumerals(health.memoryMb.heapTotal)} MB
            </p>
            <p className="text-[10.5px] font-bold text-slate-500 num-cell">
              إجمالي RSS: {toArabicNumerals(health.memoryMb.rss)} MB
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span>حالة البناء الإنتاجي (.next)</span>
              {health.buildStatus.prodNextDirExists ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              )}
            </div>
            <p className="text-sm font-black text-[#102A43] truncate">
              {health.buildStatus.prodNextDirExists ? 'مخرجات البناء جاهزة' : 'بانتظار البناء'}
            </p>
            <p className="text-[10.5px] font-bold text-slate-500 truncate">
              عزل التطوير: {health.buildStatus.distIsolationActive ? 'مفعّل (.next-dev)' : 'غير نشط'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span>ملخص الأحداث المسجلة</span>
              <AlertOctagon className={`w-4 h-4 ${stats.errors > 0 ? 'text-rose-600' : 'text-emerald-700'}`} />
            </div>
            <p className="text-sm font-black text-[#102A43] num-cell">
              {toArabicNumerals(stats.errors)} خطأ · {toArabicNumerals(stats.warnings)} تحذير
            </p>
            <p className="text-[10.5px] font-bold text-slate-500 num-cell">
              إجمالي السجلات: {toArabicNumerals(stats.total)} ({toArabicNumerals(stats.buildRelated)} خاص بالبناء)
            </p>
          </div>
        </div>
      )}

      {/* Self-Check Results Banner */}
      {selfChecks.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
          <div className="text-xs font-black text-[#102A43] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#164E83]" />
            <span>نتائج فحص سلامة البناء وبيئة التشغيل</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {selfChecks.map((chk) => (
              <div
                key={chk.id}
                className={`p-2.5 rounded-lg border text-[11px] flex items-start gap-2 ${
                  chk.status === 'pass'
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : chk.status === 'warn'
                    ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                    : 'bg-rose-50/70 border-rose-200 text-rose-950'
                }`}
              >
                {chk.status === 'pass' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                ) : chk.status === 'warn' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                ) : (
                  <AlertOctagon className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className="font-black">{chk.label}</p>
                  <p className="font-bold opacity-90 mt-0.5">{chk.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-black flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['all', 'error', 'warning', 'info'] as const).map((sev) => (
            <button
              key={sev}
              type="button"
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black border cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                severityFilter === sev
                  ? 'bg-[#102A43] text-[#C6A15B] border-[#102A43]'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {sev === 'all' ? 'كل المستويات' : SEVERITY_LABELS[sev]}
            </button>
          ))}

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as DiagnosticCategory | 'all')}
            className="px-3 py-1.5 rounded-lg text-[11px] font-black border border-slate-200 bg-white text-[#102A43] cursor-pointer"
          >
            <option value="all">كل المصادر</option>
            <option value="build">بناء النظام (Build)</option>
            <option value="server">الخادم (Server)</option>
            <option value="runtime">التشغيل (Runtime)</option>
            <option value="database">قاعدة البيانات (DB)</option>
            <option value="auth">المصادقة والأمان</option>
          </select>
        </div>

        <div className="relative min-w-[240px] flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في رسائل الأخطاء أو المسارات..."
            className="w-full pr-9 pl-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-bold text-[#102A43] focus:outline-none focus:ring-2 focus:ring-[#164E83]"
          />
        </div>
      </div>

      {/* Diagnostic Log Entries List */}
      <div className="space-y-2">
        {loading && logs.length === 0 ? (
          <div className="py-10 text-center text-xs font-bold text-slate-500">
            جارٍ تحميل سجلات التشخيص والأخطاء من الخادم...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-10 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 space-y-1">
            <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
            <p className="text-xs font-black text-[#102A43]">لا توجد أخطاء أو تحذيرات مطابقة لمعايير البحث</p>
            <p className="text-[11px] font-bold text-slate-500">
              يمكنك الضغط على «فحص سلامة البناء والخادم» لتنفيذ تشخيص مباشر لبيئة التشغيل.
            </p>
          </div>
        ) : (
          logs.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const hasDetails = Boolean(entry.details || entry.stack || entry.route);
            return (
              <div
                key={entry.id}
                className={`rounded-xl border transition-colors ${
                  entry.severity === 'error'
                    ? 'border-rose-200 bg-rose-50/35'
                    : entry.severity === 'warning'
                    ? 'border-amber-200 bg-amber-50/35'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="p-3 flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {entry.severity === 'error' ? (
                      <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    ) : entry.severity === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-4 h-4 text-[#164E83] shrink-0 mt-0.5" />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] font-bold text-slate-500">
                        <span
                          className={`font-black ${
                            entry.severity === 'error'
                              ? 'text-rose-800'
                              : entry.severity === 'warning'
                              ? 'text-amber-800'
                              : 'text-[#164E83]'
                          }`}
                        >
                          {SEVERITY_LABELS[entry.severity]}
                        </span>
                        <span>·</span>
                        <span className="text-slate-700 font-black">{CATEGORY_LABELS[entry.category]}</span>
                        <span>·</span>
                        <span className="font-mono text-[10px] text-slate-600">{entry.source}</span>
                        <span>·</span>
                        <span className="num-cell">{formatDateArabic(entry.timestamp)}</span>
                      </div>
                      <p className="text-xs font-black text-[#102A43] mt-1 break-words">{entry.message}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyEntry(entry)}
                      className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[10px] font-black text-slate-700 flex items-center gap-1 cursor-pointer"
                      title="نسخ تفاصيل الخطأ"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedId === entry.id ? 'تم النسخ' : 'نسخ'}</span>
                    </button>
                    {hasDetails && (
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[10px] font-black text-[#102A43] flex items-center gap-1 cursor-pointer"
                      >
                        <span>{isExpanded ? 'إخفاء التفاصيل' : 'التفاصيل'}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && hasDetails && (
                  <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-200/70 space-y-2 text-[11px]">
                    {entry.route && (
                      <div className="font-bold text-slate-700">
                        المسار: <span className="font-mono text-[#164E83]">{entry.route}</span>
                        {entry.statusCode ? ` (HTTP ${entry.statusCode})` : ''}
                      </div>
                    )}
                    {entry.details && (
                      <div className="p-2.5 rounded-lg bg-slate-100 text-slate-800 font-bold break-words">
                        {entry.details}
                      </div>
                    )}
                    {entry.stack && (
                      <pre
                        dir="ltr"
                        className="p-3 rounded-lg bg-[#0F172A] text-sky-200 font-mono text-[10.5px] overflow-x-auto max-h-56 leading-relaxed"
                      >
                        {entry.stack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
