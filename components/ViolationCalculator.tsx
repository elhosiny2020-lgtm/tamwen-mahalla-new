'use client';

import React, { useMemo, useState } from 'react';
import {
  Calculator,
  Scale,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Link2,
  Sparkles,
  FileWarning,
  Building2,
  UserCheck,
  Cpu,
} from 'lucide-react';
import {
  BakeryRecord,
  BakeryViolationRecord,
  DebtApprovalStatus,
} from '@/types';
import { round2 } from '@/lib/debts-engine';
import {
  formatArabicCurrency,
  formatArabicDecimal,
  toArabicNumerals,
} from '@/lib/utils';

export interface WeightShortageCalculationOutput {
  bakeryId: string;
  bakeryName: string;
  ownerName: string;
  posNumber: string;
  village: string;
  localUnit: string;
  phone: string;
  minutesNumber: string;
  violationDate: string;
  officialWeightGrams: number;
  actualWeightGrams: number;
  shortageGrams: number;
  shortageRatio: number;
  shortagePercent: number;
  insuranceQuota: number;
  sackPriceEgp: number;
  tierNumber: 0 | 1 | 2 | 3 | 4;
  tierLabel: string;
  tierRangeText: string;
  isRepeat: boolean;
  legalMultiplier: number;
  baseAmountEgp: number;
  finalFineAmountEgp: number;
  administrativeMeasure: string;
  closureDays: number;
  formulaEquationText: string;
  notes: string;
}

interface ViolationCalculatorProps {
  bakeries: BakeryRecord[];
  historicalViolations?: BakeryViolationRecord[];
  defaultOfficialWeight?: number;
  defaultSackPriceEgp?: number;
  todayRef: string;
  onOpenBakeryProfile?: (bakeryId: string) => void;
  onRecordAndLinkDebt?: (
    output: WeightShortageCalculationOutput,
    approvalStatus: DebtApprovalStatus,
    autoLinkToDebt: boolean
  ) => void;
}

export default function ViolationCalculator({
  bakeries,
  historicalViolations = [],
  defaultOfficialWeight = 90,
  defaultSackPriceEgp = 235,
  todayRef,
  onOpenBakeryProfile,
  onRecordAndLinkDebt,
}: ViolationCalculatorProps) {
  const [selectedBakeryId, setSelectedBakeryId] = useState<string>(bakeries[0]?.id || '');
  const [posSearchQuery, setPosSearchQuery] = useState<string>('');
  const [officialWeight, setOfficialWeight] = useState<number>(defaultOfficialWeight || 90);
  const [actualWeight, setActualWeight] = useState<number>(76);
  const [insuranceQuota, setInsuranceQuota] = useState<number>(
    bakeries[0]?.insuranceQuota ||
      round2((bakeries[0]?.insuranceAmountEgp || 8225) / (bakeries[0]?.sackPriceEgp || defaultSackPriceEgp))
  );
  const [sackPriceEgp, setSackPriceEgp] = useState<number>(
    bakeries[0]?.sackPriceEgp || defaultSackPriceEgp || 235
  );
  const [repeatMode, setRepeatMode] = useState<'auto' | 'first' | 'repeat'>('auto');
  const [minutesNumber, setMinutesNumber] = useState<string>('');
  const [violationDate, setViolationDate] = useState<string>(todayRef);
  const [notes, setNotes] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const activeBakery = useMemo(
    () => bakeries.find((b) => b.id === selectedBakeryId) || bakeries[0] || null,
    [bakeries, selectedBakeryId]
  );

  // سحب بيانات المخبز تلقائياً من منظومة إدارة المخابز عند الاختيار أو البحث برقم ماكينة POS
  const handleSelectBakery = (bakeryId: string) => {
    setSelectedBakeryId(bakeryId);
    const found = bakeries.find((b) => b.id === bakeryId);
    if (found) {
      const autoQuota =
        found.insuranceQuota > 0
          ? found.insuranceQuota
          : round2((found.insuranceAmountEgp || 0) / (found.sackPriceEgp || defaultSackPriceEgp || 235));
      setInsuranceQuota(autoQuota);
      setSackPriceEgp(found.sackPriceEgp || defaultSackPriceEgp || 235);
    }
  };

  const handlePosQuickLookup = (val: string) => {
    setPosSearchQuery(val);
    const trimmed = val.trim();
    if (!trimmed) return;
    const matched = bakeries.find(
      (b) =>
        b.posNumber.includes(trimmed) ||
        b.bakeryNumber.includes(trimmed) ||
        b.name.includes(trimmed) ||
        b.ownerName.includes(trimmed)
    );
    if (matched) {
      handleSelectBakery(matched.id);
    }
  };

  // التحقق التلقائي من التكرار داخل السنة الميلادية لنفس المخبز ورقم ماكينة POS
  const autoRepeatDetected = useMemo(() => {
    if (!activeBakery) return { isRepeat: false, count: 0, lastMinutes: '' };
    const priorList = historicalViolations.filter(
      (v) =>
        v.status === 'معتمد' &&
        (v.bakeryId === activeBakery.id || v.posNumber === activeBakery.posNumber) &&
        (v.ruleCode === 'W-175-14' || v.violationName.includes('نقص وزن'))
    );
    return {
      isRepeat: priorList.length > 0,
      count: priorList.length,
      lastMinutes: priorList[0]?.minutesNumber || '',
    };
  }, [activeBakery, historicalViolations]);

  const effectiveIsRepeat =
    repeatMode === 'repeat'
      ? true
      : repeatMode === 'first'
      ? false
      : autoRepeatDetected.isRepeat;

  // الحساب الفوري طبقاً للقرار الوزاري رقم 175 لسنة 2024:
  // المعادلة: (مقدار النقص ÷ الوزن المقرر) × سعر الشيكارة × الحصة التأمينية × المعامل القانوني
  const calculation = useMemo(() => {
    const offW = Math.max(1, Number(officialWeight) || 90);
    const actW = Math.max(0, Number(actualWeight) || 0);
    const quota = Math.max(0, Number(insuranceQuota) || 0);
    const price = Math.max(0, Number(sackPriceEgp) || 0);

    const shortageGrams = round2(Math.max(0, offW - actW));
    const shortageRatio = offW > 0 ? shortageGrams / offW : 0;
    const shortagePercent = round2(shortageRatio * 100);

    // القيمة الأساسية = (مقدار النقص ÷ الوزن المقرر) × سعر الشيكارة × الحصة
    const baseAmountEgp = round2(shortageRatio * price * quota);

    let tierNumber: 0 | 1 | 2 | 3 | 4 = 0;
    let tierLabel = 'وزن مطابق للمواصفات القياسية';
    let tierRangeText = 'لا يوجد نقص في الوزن';
    let legalMultiplier = 0;
    let administrativeMeasure = 'لا يوجد إجراء عقابي — الوزن سليم';
    let closureDays = 0;

    if (shortageGrams > 0 && shortageGrams < 10) {
      tierNumber = 1;
      tierLabel = 'الشريحة الأولى (نقص أقل من ١٠ جرامات)';
      tierRangeText = 'من ٠٫١ جم إلى أقل من ١٠ جم';
      legalMultiplier = 1;
      administrativeMeasure =
        'تحصيل قيمة النقص في الوزن نقداً لصالح الهيئة العامة للسلع التموينية (معامل ×١)';
      closureDays = 0;
    } else if (shortageGrams >= 10 && shortageGrams < 20) {
      tierNumber = 2;
      tierLabel = 'الشريحة الثانية (نقص من ١٠ جم إلى أقل من ٢٠ جم)';
      tierRangeText = 'من ١٠ جم إلى ١٩٫٩٩ جم';
      legalMultiplier = effectiveIsRepeat ? 4 : 2;
      administrativeMeasure = effectiveIsRepeat
        ? 'تحصيل ٤ أضعاف قيمة النقص نقداً + غلق المخبز إدارياً لمدة شهر كامل للتكرار'
        : 'تحصيل ضعف قيمة النقص في الوزن نقداً (معامل ×٢)';
      closureDays = effectiveIsRepeat ? 30 : 0;
    } else if (shortageGrams >= 20 && shortageGrams < 30) {
      tierNumber = 3;
      tierLabel = 'الشريحة الثالثة (نقص من ٢٠ جم إلى أقل من ٣٠ جم)';
      tierRangeText = 'من ٢٠ جم إلى ٢٩٫٩٩ جم';
      legalMultiplier = effectiveIsRepeat ? 6 : 3;
      administrativeMeasure = effectiveIsRepeat
        ? 'تحصيل ٦ أضعاف قيمة النقص نقداً + غلق المخبز إدارياً لمدة شهرين للتكرار'
        : 'تحصيل ٣ أضعاف قيمة النقص في الوزن نقداً (معامل ×٣)';
      closureDays = effectiveIsRepeat ? 60 : 0;
    } else if (shortageGrams >= 30) {
      tierNumber = 4;
      tierLabel = 'الشريحة الرابعة (نقص ٣٠ جراماً فأكثر)';
      tierRangeText = '٣٠ جم فأكثر (مخالفة جسيمة)';
      legalMultiplier = effectiveIsRepeat ? 8 : 4;
      administrativeMeasure = effectiveIsRepeat
        ? 'تحصيل ٨ أضعاف قيمة النقص نقداً + غلق المخبز إدارياً لمدة ٦ أشهر للتكرار'
        : 'تحصيل ٤ أضعاف قيمة النقص نقداً + غلق المخبز إدارياً لمدة ٣ أشهر';
      closureDays = effectiveIsRepeat ? 180 : 90;
    }

    const finalFineAmountEgp = round2(baseAmountEgp * legalMultiplier);

    const formulaEquationText =
      shortageGrams > 0
        ? `(${formatArabicDecimal(shortageGrams, 2)} ÷ ${formatArabicDecimal(offW, 1)}) × ${formatArabicDecimal(price, 2)} ج.م × ${formatArabicDecimal(quota, 3)} شيكارة × معامل (${toArabicNumerals(legalMultiplier)}) = ${formatArabicCurrency(finalFineAmountEgp)}`
        : 'الوزن الفعلي يساوي أو يفوق الوزن المقرر (لا توجد غرامة)';

    return {
      offW,
      actW,
      quota,
      price,
      shortageGrams,
      shortageRatio,
      shortagePercent,
      baseAmountEgp,
      tierNumber,
      tierLabel,
      tierRangeText,
      legalMultiplier,
      finalFineAmountEgp,
      administrativeMeasure,
      closureDays,
      formulaEquationText,
    };
  }, [officialWeight, actualWeight, insuranceQuota, sackPriceEgp, effectiveIsRepeat]);

  // ألوان البطاقة الإحصائية الملونة حسب شريحة المخالفة طبقاً للقرار الوزاري 175 لسنة 2024
  const tierTheme = useMemo(() => {
    switch (calculation.tierNumber) {
      case 1:
        return {
          cardBg: 'bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-700 text-white border-amber-300',
          badgeBg: 'bg-white text-amber-900',
          boxBg: 'bg-white/95 text-[#102A43]',
          accentText: 'text-amber-800',
          barColor: 'bg-amber-400',
        };
      case 2:
        return {
          cardBg: 'bg-gradient-to-br from-orange-600 via-orange-700 to-amber-800 text-white border-orange-300',
          badgeBg: 'bg-white text-orange-900',
          boxBg: 'bg-white/95 text-[#102A43]',
          accentText: 'text-orange-800',
          barColor: 'bg-orange-400',
        };
      case 3:
        return {
          cardBg: 'bg-gradient-to-br from-red-700 via-red-800 to-rose-900 text-white border-red-300',
          badgeBg: 'bg-white text-red-900',
          boxBg: 'bg-white/95 text-[#102A43]',
          accentText: 'text-red-800',
          barColor: 'bg-red-400',
        };
      case 4:
        return {
          cardBg: 'bg-gradient-to-br from-rose-900 via-red-950 to-slate-950 text-white border-rose-400',
          badgeBg: 'bg-[#C6A15B] text-[#102A43]',
          boxBg: 'bg-white/95 text-[#102A43]',
          accentText: 'text-rose-900',
          barColor: 'bg-rose-500',
        };
      default:
        return {
          cardBg: 'bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 text-white border-emerald-300',
          badgeBg: 'bg-white text-emerald-900',
          boxBg: 'bg-white/95 text-[#102A43]',
          accentText: 'text-emerald-800',
          barColor: 'bg-emerald-400',
        };
    }
  }, [calculation.tierNumber]);

  const handleActionSubmit = (approvalStatus: DebtApprovalStatus, autoLinkToDebt: boolean) => {
    setFeedback(null);
    if (!activeBakery) {
      setFeedback({ type: 'err', text: 'يرجى اختيار المخبز أولاً.' });
      return;
    }
    if (calculation.shortageGrams <= 0) {
      setFeedback({ type: 'err', text: 'الوزن الفعلي مطابق للوزن الرسمي؛ لا يوجد نقص وزن لتسجيل مخالفة.' });
      return;
    }
    const effectiveMinutes =
      minutesNumber.trim() || `محضر-وزن-${toArabicNumerals(activeBakery.posNumber)}-${Date.now().toString().slice(-4)}`;

    if (onRecordAndLinkDebt) {
      onRecordAndLinkDebt(
        {
          bakeryId: activeBakery.id,
          bakeryName: activeBakery.name,
          ownerName: activeBakery.ownerName,
          posNumber: activeBakery.posNumber,
          village: activeBakery.village,
          localUnit: activeBakery.localUnit,
          phone: activeBakery.phone,
          minutesNumber: effectiveMinutes,
          violationDate,
          officialWeightGrams: calculation.offW,
          actualWeightGrams: calculation.actW,
          shortageGrams: calculation.shortageGrams,
          shortageRatio: calculation.shortageRatio,
          shortagePercent: calculation.shortagePercent,
          insuranceQuota: calculation.quota,
          sackPriceEgp: calculation.price,
          tierNumber: calculation.tierNumber,
          tierLabel: calculation.tierLabel,
          tierRangeText: calculation.tierRangeText,
          isRepeat: effectiveIsRepeat,
          legalMultiplier: calculation.legalMultiplier,
          baseAmountEgp: calculation.baseAmountEgp,
          finalFineAmountEgp: calculation.finalFineAmountEgp,
          administrativeMeasure: calculation.administrativeMeasure,
          closureDays: calculation.closureDays,
          formulaEquationText: calculation.formulaEquationText,
          notes: notes.trim() || `نقص وزن خبز بلدي مدعم بمقدار ${calculation.shortageGrams} جم — ${calculation.tierLabel}`,
        },
        approvalStatus,
        autoLinkToDebt
      );
      setFeedback({
        type: 'ok',
        text: autoLinkToDebt
          ? `تم اعتماد مخالفة نقص الوزن (${formatArabicCurrency(calculation.finalFineAmountEgp)}) وقيدها تلقائياً في سجل المديونيات للمخبز (${activeBakery.name} — POS: ${toArabicNumerals(activeBakery.posNumber)}).`
          : `تم حفظ مخالفة نقص الوزن (${approvalStatus}) في سجل المخالفات بنجاح.`,
      });
      setMinutesNumber('');
    }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-[#164E83]/20 shadow-sm overflow-hidden">
      {/* شريط عنوان الحاسبة القانونية */}
      <div className="bg-gradient-to-l from-[#102A43] via-[#164E83] to-[#102A43] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#C6A15B] text-[#102A43] flex items-center justify-center shrink-0">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[13.5px] font-black flex items-center gap-1.5">
              <span>حاسبة مخالفات نقص وزن الخبز البلدي المدعم</span>
              <span className="px-2 py-0.5 rounded-md bg-[#C6A15B] text-[#102A43] text-[10px] font-black">
                القرار الوزاري رقم ١٧٥ لسنة ٢٠٢٤
              </span>
            </h3>
            <p className="text-[10.5px] font-bold text-slate-200">
              المعادلة الرسمية: (مقدار النقص ÷ الوزن المقرر) × سعر الشيكارة × الحصة التأمينية × المعامل القانوني للشريحة
            </p>
          </div>
        </div>

        {/* شريط مرجعي سريع لشرائح القرار 175 لسنة 2024 */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-black">
          <span className="px-2 py-1 rounded-lg bg-amber-500/25 border border-amber-300/40 text-amber-100">
            شريحة ١ (&lt;١٠ جم): ×١
          </span>
          <span className="px-2 py-1 rounded-lg bg-orange-500/25 border border-orange-300/40 text-orange-100">
            شريحة ٢ (١٠-١٩٫٩ جم): ×٢ / تكرار ×٤
          </span>
          <span className="px-2 py-1 rounded-lg bg-red-500/30 border border-red-300/40 text-red-100">
            شريحة ٣ (٢٠-٢٩٫٩ جم): ×٣ / تكرار ×٦
          </span>
          <span className="px-2 py-1 rounded-lg bg-rose-700/50 border border-rose-300/50 text-white">
            شريحة ٤ (≥٣٠ جم): ×٤ / تكرار ×٨
          </span>
        </div>
      </div>

      {feedback && (
        <div
          className={`mx-4 mt-3 p-3 rounded-xl font-black text-[11.5px] flex items-center justify-between ${
            feedback.type === 'ok'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-950'
              : 'bg-red-50 border border-red-300 text-red-950'
          }`}
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {feedback.text}
          </span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-black px-2 py-0.5 rounded bg-white/80 cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* القسم الأيمن: حقول الإدخال الديناميكية وسحب بيانات المخبز وPOS */}
        <div className="lg:col-span-6 space-y-3 bg-[#F8FAFC] rounded-xl p-3.5 border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-[12px] font-black text-[#102A43] flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#164E83]" />
              ١. اختيار المخبز وسحب بيانات ماكينة POS والحصة التأمينية
            </span>
            {activeBakery && onOpenBakeryProfile && (
              <button
                type="button"
                onClick={() => onOpenBakeryProfile(activeBakery.id)}
                className="px-2.5 py-1 rounded-lg bg-[#102A43] hover:bg-[#164E83] text-white text-[10px] font-black cursor-pointer flex items-center gap-1"
              >
                <Cpu className="w-3 h-3 text-[#C6A15B]" />
                <span>ملف المخبز (POS: {toArabicNumerals(activeBakery.posNumber)})</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-5">
              <label className="block text-[10.5px] font-black text-slate-700 mb-1">
                بحث سريع برقم POS أو المخبز
              </label>
              <input
                type="text"
                value={posSearchQuery}
                onChange={(e) => handlePosQuickLookup(e.target.value)}
                placeholder="أدخل رقم ماكينة POS..."
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-[11px] font-black"
              />
            </div>

            <div className="sm:col-span-7">
              <label className="block text-[10.5px] font-black text-slate-700 mb-1">
                المخبز المسجل بالمنظومة (سحب تلقائي للبيانات)
              </label>
              <select
                value={selectedBakeryId}
                onChange={(e) => handleSelectBakery(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-[11px] font-black"
              >
                {bakeries.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} — POS: {b.posNumber} — ({b.ownerName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* شريط بيانات المخبز المسحوبة تلقائياً */}
          {activeBakery && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white rounded-xl p-2.5 border border-slate-200 text-[10.5px]">
              <div>
                <span className="text-slate-500 font-bold block">صاحب المخبز</span>
                <span className="font-black text-[#102A43] flex items-center gap-1 truncate">
                  <UserCheck className="w-3 h-3 text-[#164E83] shrink-0" />
                  {activeBakery.ownerName}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block">رقم ماكينة POS</span>
                <button
                  type="button"
                  onClick={() => onOpenBakeryProfile?.(activeBakery.id)}
                  className="num-cell font-black text-[#164E83] hover:underline cursor-pointer"
                >
                  {toArabicNumerals(activeBakery.posNumber)}
                </button>
              </div>
              <div>
                <span className="text-slate-500 font-bold block">القرية / الوحدة</span>
                <span className="font-black text-slate-800 truncate block">
                  {activeBakery.village} ({activeBakery.localUnit})
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block">الحصة الفعلية / التأمينية</span>
                <span className="num-cell font-black text-emerald-800">
                  {formatArabicDecimal(activeBakery.actualQuota, 0)} / {formatArabicDecimal(activeBakery.insuranceQuota, 2)} ش
                </span>
              </div>
            </div>
          )}

          {/* حقول الإدخال الديناميكية للوزن والحصة وسعر الشيكارة */}
          <div className="border-t border-slate-200 pt-2.5">
            <span className="text-[12px] font-black text-[#102A43] block mb-2">
              ٢. مدخلات معادلة نقص الوزن (الوزن الرسمي · الوزن الفعلي · الحصة التأمينية · سعر الشيكارة)
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[10.5px] font-black text-slate-700 mb-1">
                  الوزن الرسمي المقرر (جم)
                </label>
                <input
                  type="number"
                  min={1}
                  step="0.5"
                  value={officialWeight}
                  onChange={(e) => setOfficialWeight(Number(e.target.value) || 0)}
                  className="num-cell w-full px-2.5 py-2 rounded-lg border-2 border-[#164E83]/40 bg-white text-[13px] font-black text-[#102A43]"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-black text-red-800 mb-1">
                  الوزن الفعلي المضبوط (جم)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={actualWeight}
                  onChange={(e) => setActualWeight(Number(e.target.value) || 0)}
                  className="num-cell w-full px-2.5 py-2 rounded-lg border-2 border-red-400 bg-amber-50/70 text-[13px] font-black text-red-900"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-black text-slate-700 mb-1">
                  الحصة التأمينية (شيكارة)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.001"
                  value={insuranceQuota}
                  onChange={(e) => setInsuranceQuota(Number(e.target.value) || 0)}
                  className="num-cell w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-[12.5px] font-black text-[#102A43]"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-black text-slate-700 mb-1">
                  سعر الشيكارة (ج.م)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={sackPriceEgp}
                  onChange={(e) => setSackPriceEgp(Number(e.target.value) || 0)}
                  className="num-cell w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-[12.5px] font-black text-[#102A43]"
                />
              </div>
            </div>

            {/* أزرار اختبار سريع للشرائح الأربع */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-black text-slate-600">معاينة سريعة للشرائح:</span>
              {[
                { label: 'شريحة ١ (وزن ٨٣ جم → نقص ٧ جم)', weight: 83 },
                { label: 'شريحة ٢ (وزن ٧٦ جم → نقص ١٤ جم)', weight: 76 },
                { label: 'شريحة ٣ (وزن ٦٦ جم → نقص ٢٤ جم)', weight: 66 },
                { label: 'شريحة ٤ (وزن ٥٦ جم → نقص ٣٤ جم)', weight: 56 },
              ].map((preset) => (
                <button
                  key={preset.weight}
                  type="button"
                  onClick={() => {
                    setOfficialWeight(90);
                    setActualWeight(preset.weight);
                  }}
                  className={`px-2 py-1 rounded-md text-[10px] font-black cursor-pointer border transition-colors ${
                    actualWeight === preset.weight
                      ? 'bg-[#102A43] text-white border-[#102A43]'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* بيانات المحضر والتكرار */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 border-t border-slate-200 pt-2.5">
            <div>
              <label className="block text-[10.5px] font-black text-slate-700 mb-1">
                رقم المحضر / الإثبات
              </label>
              <input
                type="text"
                value={minutesNumber}
                onChange={(e) => setMinutesNumber(e.target.value)}
                placeholder="مثال: محضر-2026-315"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-[11px] font-black"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-black text-slate-700 mb-1">
                تاريخ الضبط
              </label>
              <input
                type="date"
                value={violationDate}
                onChange={(e) => setViolationDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-[11px] font-black"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-black text-slate-700 mb-1">
                حالة التكرار القانوني
              </label>
              <select
                value={repeatMode}
                onChange={(e) => setRepeatMode(e.target.value as 'auto' | 'first' | 'repeat')}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-[11px] font-black"
              >
                <option value="auto">
                  تلقائي ({autoRepeatDetected.isRepeat ? `مكرر — ${toArabicNumerals(autoRepeatDetected.count)} سابقة` : 'أول مرة'})
                </option>
                <option value="first">أول مرة (المعامل الأساسي)</option>
                <option value="repeat">تكرار داخل السنة (مضاعفة المعامل)</option>
              </select>
            </div>
          </div>
        </div>

        {/* القسم الأيسر: البطاقة الإحصائية الملونة للنتيجة وشريحة المخالفة والمعامل القانوني */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          <div className={`rounded-2xl border-2 p-4 shadow-md space-y-3.5 transition-all ${tierTheme.cardBg}`}>
            {/* رأس البطاقة الإحصائية الملونة */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/20 pb-2.5">
              <div>
                <span className="text-[10.5px] font-extrabold text-white/85 block">
                  تصنيف المخالفة طبقاً للقرار الوزاري رقم ١٧٥ لسنة ٢٠٢٤
                </span>
                <h4 className="text-[15px] font-black flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#C6A15B] shrink-0" />
                  <span>{calculation.tierLabel}</span>
                </h4>
              </div>

              <div className="flex items-center gap-1.5">
                <span className={`num-cell px-3 py-1 rounded-xl font-black text-[12px] shadow-xs ${tierTheme.badgeBg}`}>
                  المعامل القانوني: ×{toArabicNumerals(calculation.legalMultiplier)}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-black/25 text-white font-black text-[11px]">
                  {effectiveIsRepeat ? 'حالة تكرار' : 'أول مرة'}
                </span>
              </div>
            </div>

            {/* المؤشرات الرقمية الأربعة داخل البطاقة الإحصائية */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className={`rounded-xl p-2.5 text-center ${tierTheme.boxBg}`}>
                <span className="text-[10px] font-bold text-slate-500 block">مقدار النقص</span>
                <span className={`num-cell font-black text-[14px] ${tierTheme.accentText}`}>
                  {formatArabicDecimal(calculation.shortageGrams, 2)} جم
                </span>
                <span className="num-cell text-[10px] font-black text-slate-600 block">
                  ({formatArabicDecimal(calculation.shortagePercent, 1)}٪ من الرغيف)
                </span>
              </div>

              <div className={`rounded-xl p-2.5 text-center ${tierTheme.boxBg}`}>
                <span className="text-[10px] font-bold text-slate-500 block">القيمة الأساسية (×١)</span>
                <span className="num-cell font-black text-[13.5px] text-[#102A43]">
                  {formatArabicCurrency(calculation.baseAmountEgp)}
                </span>
                <span className="text-[9.5px] font-bold text-slate-500 block">قبل معامل الشريحة</span>
              </div>

              <div className={`rounded-xl p-2.5 text-center sm:col-span-2 border-2 border-[#C6A15B] ${tierTheme.boxBg}`}>
                <span className="text-[10px] font-black text-slate-600 block">
                  إجمالي الغرامة المالية المستحقة (شاملة المعامل ×{toArabicNumerals(calculation.legalMultiplier)})
                </span>
                <span className={`num-cell font-black text-[18px] ${tierTheme.accentText}`}>
                  {formatArabicCurrency(calculation.finalFineAmountEgp)}
                </span>
              </div>
            </div>

            {/* تمثيل المعادلة الحسابية بالتفصيل */}
            <div className="bg-black/25 rounded-xl p-3 space-y-1.5 border border-white/15">
              <div className="flex items-center justify-between text-[10.5px] font-black text-[#C6A15B]">
                <span>تطبيق المعادلة: (مقدار النقص ÷ الوزن المقرر) × سعر الشيكارة × الحصة × المعامل</span>
                <span className="num-cell">{calculation.tierRangeText}</span>
              </div>
              <p className="num-cell text-[12px] font-black text-white leading-relaxed">
                {calculation.formulaEquationText}
              </p>
              <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${tierTheme.barColor}`}
                  style={{ width: `${Math.min(100, Math.max(4, calculation.shortagePercent * 2))}%` }}
                />
              </div>
            </div>

            {/* الإجراء الإداري والغلق */}
            <div className={`rounded-xl p-2.5 flex items-center justify-between gap-2 ${tierTheme.boxBg}`}>
              <div className="flex items-center gap-2">
                <Scale className={`w-4 h-4 shrink-0 ${tierTheme.accentText}`} />
                <div className="text-[11px]">
                  <span className="font-bold text-slate-600">التدبير الإداري المقرر بالقرار ١٧٥/٢٠٢٤: </span>
                  <span className={`font-black ${tierTheme.accentText}`}>{calculation.administrativeMeasure}</span>
                </div>
              </div>
              {calculation.closureDays > 0 && (
                <span className="num-cell px-2 py-0.5 rounded bg-red-100 text-red-900 font-black text-[10px] shrink-0">
                  غلق {toArabicNumerals(calculation.closureDays)} يوماً
                </span>
              )}
            </div>

            {/* أزرار الحفظ والربط التلقائي بسجل المديونيات */}
            {onRecordAndLinkDebt && (
              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleActionSubmit('معتمد', false)}
                  className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/30 font-black text-[11px] cursor-pointer flex items-center gap-1.5"
                >
                  <FileWarning className="w-3.5 h-3.5" />
                  <span>حفظ في سجل المخالفات فقط</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleActionSubmit('معتمد', true)}
                  className="px-4 py-2 rounded-xl bg-[#C6A15B] hover:bg-[#d4b06a] text-[#102A43] font-black text-[11.5px] shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Link2 className="w-4 h-4" />
                  <span>اعتماد وقيد تلقائي في سجل مديونيات المخبز</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
