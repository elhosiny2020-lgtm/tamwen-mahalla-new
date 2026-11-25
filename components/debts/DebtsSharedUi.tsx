'use client';

import React from 'react';
import Image from 'next/image';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertOctagon,
  CalendarClock,
  Ban,
  ShieldCheck,
  Printer,
  X,
  PauseCircle,
  Sparkles,
} from 'lucide-react';
import {
  DebtApprovalStatus,
  DebtPaymentStatus,
  DebtScheduleStatus,
  InstallmentStatus,
  RiskClassification,
} from '@/types';
import { ComputedDebtAlert } from '@/lib/debts-engine';
import { formatDateArabic, toArabicNumerals } from '@/lib/utils';

export function ApprovalStatusBadge({ status }: { status: DebtApprovalStatus }) {
  if (status === 'معتمد') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-black text-[10px]">
        <ShieldCheck className="w-3 h-3" />
        معتمد
      </span>
    );
  }
  if (status === 'قيد المراجعة') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-black text-[10px]">
        <Clock className="w-3 h-3" />
        قيد المراجعة
      </span>
    );
  }
  if (status === 'مرفوض') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-900 font-black text-[10px]">
        <Ban className="w-3 h-3" />
        مرفوض
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-black text-[10px]">
      <Clock className="w-3 h-3" />
      مسودة
    </span>
  );
}

export function DebtPaymentBadge({ status }: { status: DebtPaymentStatus }) {
  if (status === 'مسدد بالكامل') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-black text-[10px]">
        <CheckCircle2 className="w-3 h-3" />
        مسدد بالكامل
      </span>
    );
  }
  if (status === 'متأخر') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-900 font-black text-[10px]">
        <AlertTriangle className="w-3 h-3" />
        متأخر
      </span>
    );
  }
  if (status === 'مسدد جزئيًا') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-black text-[10px]">
        <Clock className="w-3 h-3" />
        مسدد جزئيًا
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-black text-[10px] border border-slate-300">
      <Ban className="w-3 h-3" />
      غير مسدد
    </span>
  );
}

export function DebtScheduleBadge({ status }: { status: DebtScheduleStatus }) {
  if (status === 'مكتمل') {
    return <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-black text-[10px]">مكتمل</span>;
  }
  if (status === 'متعثر') {
    return <span className="px-2 py-0.5 rounded bg-red-50 text-red-800 border border-red-200 font-black text-[10px]">متعثر</span>;
  }
  if (status === 'مجدول نشط') {
    return <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-black text-[10px]">مجدول نشط</span>;
  }
  if (status === 'ملغي') {
    return <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-black text-[10px]">ملغي</span>;
  }
  return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">غير مجدول</span>;
}

export function InstallmentStatusBadge({ status }: { status: InstallmentStatus }) {
  const map: Record<InstallmentStatus, { cls: string; icon: React.ReactNode }> = {
    'تم السداد': { cls: 'bg-emerald-100 text-emerald-900', icon: <CheckCircle2 className="w-3 h-3" /> },
    'مجدول': { cls: 'bg-blue-100 text-blue-900', icon: <CalendarClock className="w-3 h-3" /> },
    'مستحق اليوم': { cls: 'bg-amber-200 text-amber-950', icon: <Clock className="w-3 h-3" /> },
    'مسدد جزئيًا': { cls: 'bg-teal-100 text-teal-900', icon: <Clock className="w-3 h-3" /> },
    'متأخر': { cls: 'bg-red-100 text-red-900', icon: <AlertTriangle className="w-3 h-3" /> },
    'متأخر جزئيًا': { cls: 'bg-rose-100 text-rose-900', icon: <AlertTriangle className="w-3 h-3" /> },
    'مؤجل بموافقة': { cls: 'bg-slate-200 text-slate-800', icon: <PauseCircle className="w-3 h-3" /> },
    'ملغي بقرار معتمد': { cls: 'bg-slate-100 text-slate-500 line-through', icon: <Ban className="w-3 h-3" /> },
  };
  const cfg = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-black text-[10px] ${cfg.cls}`}>
      {cfg.icon}
      {status}
    </span>
  );
}

export function RiskBadge({ risk }: { risk: RiskClassification }) {
  if (risk === 'منتظم') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-black text-[10px]">
        <CheckCircle2 className="w-3 h-3" />
        منتظم
      </span>
    );
  }
  if (risk === 'يحتاج متابعة') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-black text-[10px]">
        <Clock className="w-3 h-3" />
        يحتاج متابعة
      </span>
    );
  }
  if (risk === 'متأخر') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-100 text-orange-900 font-black text-[10px]">
        <AlertTriangle className="w-3 h-3" />
        متأخر
      </span>
    );
  }
  if (risk === 'متعثر') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-900 font-black text-[10px]">
        <AlertOctagon className="w-3 h-3" />
        متعثر
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-900 text-white font-black text-[10px]">
      <AlertOctagon className="w-3 h-3" />
      شديد التعثر
    </span>
  );
}

export function AlertSeverityBadge({ alert }: { alert: ComputedDebtAlert }) {
  const styles: Record<ComputedDebtAlert['severity'], { cls: string; icon: React.ReactNode }> = {
    paid: { cls: 'bg-emerald-100 text-emerald-900', icon: <CheckCircle2 className="w-3 h-3" /> },
    scheduled: { cls: 'bg-blue-100 text-blue-900', icon: <CalendarClock className="w-3 h-3" /> },
    near_due: { cls: 'bg-amber-100 text-amber-900', icon: <Clock className="w-3 h-3" /> },
    due_today: { cls: 'bg-orange-200 text-orange-950', icon: <Sparkles className="w-3 h-3" /> },
    overdue: { cls: 'bg-red-100 text-red-900', icon: <AlertTriangle className="w-3 h-3" /> },
    severe_overdue: { cls: 'bg-rose-900 text-white', icon: <AlertOctagon className="w-3 h-3" /> },
    postponed: { cls: 'bg-slate-200 text-slate-800', icon: <PauseCircle className="w-3 h-3" /> },
  };
  const cfg = styles[alert.severity];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-black text-[10px] ${cfg.cls}`}>
      {cfg.icon}
      {alert.statusLabel}
    </span>
  );
}

interface OfficialPrintModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  docNumber: string;
  printedBy: string;
  todayRef: string;
  children: React.ReactNode;
}

export function OfficialPrintModal({
  open,
  onClose,
  title,
  subtitle,
  docNumber,
  printedBy,
  todayRef,
  children,
}: OfficialPrintModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto print:static print:inset-auto print:bg-white print:p-0">
      <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden print:max-h-none print:border-0 print:shadow-none print:rounded-none">
        {/* شريط التحكم (يختفي عند الطباعة) */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#102A43] text-white print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-[#C6A15B]" />
            <span className="font-black text-[13px]">معاينة الطباعة الرسمية (A4 RTL) — {title}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-1.5 rounded-lg bg-[#C6A15B] text-[#102A43] font-black text-[11px] hover:bg-amber-400 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              طباعة المستند الآن
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              aria-label="إغلاق المعاينة"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* جسم المستند الرسمي */}
        <div className="p-6 overflow-y-auto space-y-5 text-[#102A43] print:p-2 print:overflow-visible" dir="rtl">
          <div className="flex items-center justify-between border-b-2 border-[#102A43] pb-3 gap-4">
            <div className="space-y-0.5 text-right">
              <p className="text-[11px] font-black text-[#102A43]">جمهورية مصر العربية — محافظة الغربية</p>
              <p className="text-[12px] font-black text-[#164E83]">مديرية التموين والتجارة الداخلية بالغربية</p>
              <p className="text-[11px] font-extrabold text-slate-700">إدارة تموين مركز المحلة الكبرى — منظومة الرقابة المالية والمديونيات</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-left text-[10px] font-bold text-slate-600 space-y-0.5">
                <p>رقم المستند: <span className="num-cell font-black text-[#102A43]">{toArabicNumerals(docNumber)}</span></p>
                <p>تاريخ الطباعة: <span className="num-cell font-black text-[#102A43]">{formatDateArabic(todayRef)}</span></p>
                <p>طُبع بمعرفة: <span className="font-black text-[#102A43]">{printedBy}</span></p>
              </div>
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#C6A15B] shrink-0 relative bg-slate-50">
                <Image
                  src="/assets/aistudio/logo_4234585c.jpg"
                  alt="شعار مديرية التموين بالغربية"
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>

          <div className="text-center bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4">
            <h2 className="text-base font-black text-[#102A43]">{title}</h2>
            {subtitle && <p className="text-[11px] font-bold text-slate-600 mt-0.5">{subtitle}</p>}
          </div>

          <div className="space-y-4">{children}</div>

          {/* تذييل التوقيعات */}
          <div className="grid grid-cols-3 gap-4 pt-6 mt-6 border-t border-slate-300 text-center text-[11px] font-black text-[#102A43]">
            <div>
              <p>الموظف المختص / المحصل</p>
              <p className="text-slate-500 font-bold mt-6">.................................</p>
            </div>
            <div>
              <p>مراجع الحسابات والرقابة</p>
              <p className="text-slate-500 font-bold mt-6">.................................</p>
            </div>
            <div>
              <p>يعتمد / مدير إدارة التموين</p>
              <p className="text-slate-500 font-bold mt-6">.................................</p>
            </div>
          </div>
          <p className="text-center text-[9.5px] font-bold text-slate-500 pt-2">
            تصميم وتطوير المهندس أحمد الحسيني — هاتف ٠١٠٠٤٤١٤٠٣٨ · مديرية التموين والتجارة الداخلية بالغربية
          </p>
        </div>
      </div>
    </div>
  );
}
