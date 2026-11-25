import { toArabicNumerals } from '@/lib/utils';

export type AutoFitColumnType =
  | 'numeric'
  | 'currency'
  | 'date'
  | 'name'
  | 'longText'
  | 'badge'
  | 'text'
  | 'actions';

export type AutoFitMode = 'auto' | 'headers' | 'data' | 'equal' | 'default' | 'saved';

export interface AutoFitColumnSchema {
  key: string;
  label: string;
  type: AutoFitColumnType;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  pinned?: boolean;
  /** قيم نصية مقاسة للعمود في البيانات الظاهرة */
  sampleValues?: string[];
}

export interface ComputedColumnLayout {
  width: number;
  minWidth: number;
  maxWidth: number;
  wrap: boolean;
}

const TYPE_BOUNDS: Record<
  AutoFitColumnType,
  { min: number; max: number; defaultW: number; wrap: boolean; padding: number }
> = {
  numeric: { min: 46, max: 150, defaultW: 72, wrap: false, padding: 18 },
  currency: { min: 82, max: 158, defaultW: 98, wrap: false, padding: 18 },
  date: { min: 80, max: 170, defaultW: 92, wrap: false, padding: 18 },
  name: { min: 105, max: 195, defaultW: 138, wrap: true, padding: 18 },
  longText: { min: 130, max: 215, defaultW: 170, wrap: true, padding: 18 },
  badge: { min: 74, max: 145, defaultW: 94, wrap: false, padding: 20 },
  text: { min: 72, max: 150, defaultW: 102, wrap: true, padding: 16 },
  actions: { min: 98, max: 155, defaultW: 118, wrap: false, padding: 16 },
};

let cachedCanvasContext: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (cachedCanvasContext) return cachedCanvasContext;
  const canvas = document.createElement('canvas');
  cachedCanvasContext = canvas.getContext('2d');
  return cachedCanvasContext;
}

/**
 * قياس عرض النص بدقة عالية باستخدام Canvas 2D أو تقدير متوافق مع الخادم (SSR-safe)
 */
export function measureTextPixelWidth(
  text: string,
  fontWeight: 700 | 800 = 700,
  fontSizePx = 11
): number {
  const normalized = toArabicNumerals(text).trim();
  if (!normalized) return 0;

  const ctx = getMeasureContext();
  if (ctx) {
    ctx.font = `${fontWeight} ${fontSizePx}px Cairo, "IBM Plex Sans Arabic", system-ui, sans-serif`;
    return Math.ceil(ctx.measureText(normalized).width);
  }

  // Deterministic SSR fallback matching Arabic glyph width proportions
  let total = 0;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (ch === ' ') total += fontSizePx * 0.32;
    else if (/[٠-٩0-9.,:/-]/.test(ch)) total += fontSizePx * 0.58;
    else total += fontSizePx * 0.68;
  }
  return Math.ceil(total);
}

/**
 * تحديد نوع العمود تلقائياً في منظومة المخابز لضمان تطبيق القواعد النوعية الصحيحة
 */
export function getBakeryColumnAutoFitType(key: string): AutoFitColumnType {
  if (
    key === 'insuranceAmountEgp' ||
    key === 'totalInsuranceValueEgp' ||
    key === 'sackPriceEgp' ||
    key === 'remainingDebtEgp'
  ) {
    return 'currency';
  }
  if (key.includes('Date')) {
    return 'date';
  }
  if (
    key === 'serialNumber' ||
    key === 'bakeryNumber' ||
    key === 'posNumber' ||
    key === 'ownerNationalId' ||
    key === 'phone' ||
    key === 'productionFactor' ||
    key === 'breadTypesCount' ||
    key === 'dailyCapacitySacks' ||
    key === 'insuranceQuota' ||
    key === 'actualQuota' ||
    key === 'dailySacksCount' ||
    key === 'dailyLoavesCount' ||
    key === 'villagePopulation' ||
    key === 'beneficiaries2023' ||
    key === 'beneficiaries2024' ||
    key === 'beneficiaries2025' ||
    key === 'avgPerCapitaOverall' ||
    key === 'avgPerCapita2023' ||
    key === 'avgPerCapita2024' ||
    key === 'avgPerCapita2025' ||
    key === 'cumulativeAvgDifference' ||
    key === 'dailyShareActual2025' ||
    key === 'taxCardNumber' ||
    key === 'licenseNumber'
  ) {
    return 'numeric';
  }
  if (key === 'name' || key === 'ownerName' || key === 'managerName') {
    return 'name';
  }
  if (
    key === 'address' ||
    key === 'insuranceCheckDetails' ||
    key === 'documentNotes' ||
    key === 'localUnit' ||
    key === 'leaseContractNumber'
  ) {
    return 'longText';
  }
  if (
    key === 'activityStatus' ||
    key === 'insuranceStatus' ||
    key === 'leaseContractType' ||
    key === 'operationStatus'
  ) {
    return 'badge';
  }
  return 'text';
}

/**
 * حساب عروض الأعمدة وفق وضع الاحتواء التلقائي الذكي المختار
 */
export function computeSmartColumnWidths(
  columns: AutoFitColumnSchema[],
  mode: AutoFitMode,
  containerWidth = 0,
  savedWidths?: Record<string, number> | null
): Record<string, ComputedColumnLayout> {
  const result: Record<string, ComputedColumnLayout> = {};
  if (columns.length === 0) return result;

  // حساب العرض المتساوي إذا اختار المستخدم وضع التوزيع المتساوي
  if (mode === 'equal') {
    const safeContainer = containerWidth > 320 ? containerWidth - 42 : columns.length * 105;
    const perCol = Math.max(76, Math.floor(safeContainer / columns.length));
    columns.forEach((col) => {
      const bounds = TYPE_BOUNDS[col.type];
      const w = Math.max(bounds.min, perCol);
      result[col.key] = {
        width: w,
        minWidth: bounds.min,
        maxWidth: Math.max(w, bounds.max),
        wrap: col.type !== 'numeric' && col.type !== 'currency' && col.type !== 'date',
      };
    });
    return result;
  }

  let totalRawWidth = 0;

  columns.forEach((col) => {
    const bounds = TYPE_BOUNDS[col.type];
    const minW = col.minWidth ?? bounds.min;
    const maxW = col.maxWidth ?? bounds.max;
    const defaultW = col.defaultWidth ?? bounds.defaultW;

    if (mode === 'default') {
      const w = Math.max(minW, Math.min(maxW, defaultW));
      result[col.key] = { width: w, minWidth: minW, maxWidth: maxW, wrap: bounds.wrap };
      totalRawWidth += w;
      return;
    }

    if (mode === 'saved' && savedWidths && typeof savedWidths[col.key] === 'number') {
      const savedW = Math.max(minW, Math.min(320, savedWidths[col.key]));
      result[col.key] = {
        width: savedW,
        minWidth: minW,
        maxWidth: Math.max(maxW, savedW),
        wrap: bounds.wrap,
      };
      totalRawWidth += savedW;
      return;
    }

    // قياس عنوان العمود (يدعم العناوين متعددة الكلمات بذكاء: يتيح سطرين للعناوين الطويلة عند الحاجة)
    const labelText = toArabicNumerals(col.label || '');
    const rawHeaderW = measureTextPixelWidth(labelText, 800, 11);
    // إذا كان العنوان طويلاً جداً (أكثر من كلمتين)، نحسب عرض السطرين كحد أدنى منطقي مع مساحة لأيقونات الفرز والتثبيت
    const words = labelText.split(/\s+/).filter(Boolean);
    const headerIdealW =
      words.length >= 3 && rawHeaderW > 110
        ? Math.ceil(rawHeaderW * 0.62) + 32
        : rawHeaderW + 32;

    // قياس بيانات العمود الفعلية المعروضة
    let maxDataW = 0;
    const samples = col.sampleValues || [];
    for (let i = 0; i < samples.length; i++) {
      const val = samples[i];
      if (!val) continue;
      const measured = measureTextPixelWidth(val, 700, 11);
      if (measured > maxDataW) maxDataW = measured;
    }
    const dataIdealW = maxDataW > 0 ? maxDataW + bounds.padding : defaultW;

    // إضافة مساحة إضافية طفيفة لعمود تاريخ انتهاء الترخيص لوجود شارة الحالة بجانبه
    const extraBadgeW = col.key === 'licenseExpiryDate' ? 60 : 0;

    let targetW = defaultW;
    if (mode === 'headers') {
      targetW = headerIdealW;
    } else if (mode === 'data') {
      targetW = dataIdealW + extraBadgeW;
    } else {
      // الوضع الذكي المتوازن: يأخذ الأكبر بين العنوان والبيانات ضمن الحدود النوعية
      targetW = Math.max(headerIdealW, dataIdealW + extraBadgeW);
    }

    const clampedW = Math.max(minW, Math.min(maxW, Math.round(targetW)));
    result[col.key] = {
      width: clampedW,
      minWidth: minW,
      maxWidth: maxW,
      wrap: bounds.wrap,
    };
    totalRawWidth += clampedW;
  });

  // إذا كان إجمالي عرض الجدول أصغر من عرض الحاوية المتاح في وضع الاحتواء الكامل/العناوين/البيانات، نوزع الفائض بتناسب ذكي على الأعمدة النصية والأسماء
  if (
    (mode === 'auto' || mode === 'headers' || mode === 'data') &&
    containerWidth > 320 &&
    totalRawWidth > 0 &&
    totalRawWidth < containerWidth - 52
  ) {
    const spare = containerWidth - 52 - totalRawWidth;
    const expandable = columns.filter(
      (c) => c.type === 'name' || c.type === 'longText' || c.type === 'text'
    );
    const targets = expandable.length > 0 ? expandable : columns;
    const bonusEach = Math.floor(spare / targets.length);
    if (bonusEach > 2) {
      targets.forEach((c) => {
        const cur = result[c.key];
        if (!cur) return;
        const expanded = Math.min(cur.maxWidth + 45, cur.width + bonusEach);
        result[c.key] = {
          ...cur,
          width: expanded,
          maxWidth: Math.max(cur.maxWidth, expanded),
        };
      });
    }
  }

  return result;
}
