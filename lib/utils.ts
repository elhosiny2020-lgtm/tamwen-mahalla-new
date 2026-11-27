import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * تحويل الأرقام اللاتينية إلى أرقام عربية هندية (٠١٢٣٤٥٦٧٨٩)
 */
export function toArabicNumerals(input: string | number | undefined | null): string {
  if (input === undefined || input === null) return '';
  const str = String(input);
  return str.replace(/[0-9]/g, (match) => ARABIC_DIGITS[Number(match)]);
}

/**
 * تحويل الأرقام العربية الهندية أو الفارسية إلى أرقام لاتينية قياسية (0-9) للفرز والحسابات
 */
export function arabicToWesternDigits(input: string | number | undefined | null): string {
  if (input === undefined || input === null) return '';
  return String(input)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/**
 * تطبيع نص البحث لدعم الأرقام العربية الهندية واللاتينية وتوحيد الهمزات والتاء المربوطة
 */
export function normalizeSearchText(input: string | number | undefined | null): string {
  if (input === undefined || input === null) return '';
  return arabicToWesternDigits(String(input))
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * تنسيق أرقام حتمي متوافق بين الخادم والمتصفح لمنع أخطاء Hydration
 */
export function formatArabicNumber(value: number | string | undefined | null): string {
  const num = Number(arabicToWesternDigits(value ?? 0).replace(/[,٬\s]/g, '').replace(/٫/g, '.'));
  if (!Number.isFinite(num)) return '٠';
  const isNegative = num < 0;
  const absStr = String(Math.abs(num));
  const parts = absStr.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  return toArabicNumerals(`${isNegative ? '-' : ''}${parts.join('٫')}`);
}

/**
 * تنسيق رقم عشري ثابت المنازل بأرقام عربية هندية (رقمين عشريين افتراضياً للمتوسطات)
 */
export function formatArabicDecimal(value: number | string | undefined | null, decimals = 2): string {
  const num = Number(arabicToWesternDigits(value ?? 0).replace(/[,٬\s]/g, '').replace(/٫/g, '.'));
  if (!Number.isFinite(num)) return toArabicNumerals((0).toFixed(decimals)).replace('.', '٫');
  return toArabicNumerals(num.toFixed(decimals)).replace('.', '٫');
}

/**
 * تنسيق المبالغ المالية بالجنيه المصري بأرقام عربية هندية
 */
export function formatArabicCurrency(value: number | string | undefined | null): string {
  return `${formatArabicNumber(value)} ج.م`;
}

/**
 * تنسيق النسب المئوية بأرقام عربية هندية
 */
export function formatArabicPercent(value: number | string | undefined | null, decimals = 1): string {
  const num = Number(arabicToWesternDigits(value ?? 0).replace(/[,٬\s]/g, '').replace(/٫/g, '.'));
  if (!Number.isFinite(num)) return '٠٪';
  const formatted = decimals > 0 ? num.toFixed(decimals).replace(/\.0+$/, '') : String(Math.round(num));
  return `${toArabicNumerals(formatted).replace('.', '٫')}٪`;
}

/**
 * تنسيق تاريخ ووقت ISO بشكل حتمي متوافق بين الخادم والمتصفح
 */
export function formatDateArabic(isoOrDateStr?: string | null, includeTime = false): string {
  if (!isoOrDateStr) return '—';
  const western = arabicToWesternDigits(isoOrDateStr).trim();
  const match = western.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (match) {
    const [, year, month, day, hours, minutes] = match;
    const datePart = `${year}/${month}/${day}`;
    if (includeTime && hours && minutes) {
      return toArabicNumerals(`${datePart} · ${hours}:${minutes}`);
    }
    return toArabicNumerals(datePart);
  }
  return toArabicNumerals(isoOrDateStr);
}

/**
 * ترجمة الأدوار الوظيفية إلى العربية الرسمية لمنع ظهور أي مصطلح إنجليزي للمستخدم
 */
const ROLE_ARABIC_MAP: Record<string, string> = {
  super_admin: 'مدير النظام العام',
  admin: 'مدير النظام',
  directorate_manager: 'وكيل وزارة / مدير المديرية',
  deputy_directorate: 'نائب مدير المديرية',
  supply_admin_manager: 'مدير إدارة تموينية',
  supply_deputy: 'وكيل إدارة تموينية',
  department_manager: 'مدير قسم',
  section_head: 'رئيس شعبة',
  supply_inspector: 'مفتش تموين',
  control_inspector: 'مفتش رقابة تموينية',
  bakery_officer: 'مسؤول المخابز والحصص',
  debts_officer: 'مسؤول المديونيات والتحصيل',
  internal_trade_officer: 'مسؤول التجارة الداخلية',
  commodities_officer: 'مسؤول السلع التموينية',
  grain_officer: 'مسؤول صيانة الحبوب',
  hr_officer: 'مسؤول الموارد البشرية',
  financial_officer: 'مسؤول الشؤون المالية',
  warehouse_officer: 'أمين مخزن وعهد',
  reports_officer: 'مسؤول التقارير والإحصاء',
  data_entry: 'مدخل بيانات',
  reviewer: 'مراجع ومدقق بيانات',
  collector: 'محصل مالي',
  monitor: 'مراقب ميداني',
  viewer: 'مطلع فقط',
  custom: 'صلاحيات مخصصة',
};

export function getRoleArabicLabel(role?: string | null): string {
  if (!role) return 'موظف تموين';
  return ROLE_ARABIC_MAP[role] || role;
}

/**
 * استخراج طابع زمني (Timestamp) للفرز الزمني الدقيق
 */
export function parseDateTimestamp(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return Number.isNaN(val.getTime()) ? null : val.getTime();
  if (typeof val !== 'string') return null;

  const s = arabicToWesternDigits(val).trim();
  if (!s || s === '—' || s === '-' || s === 'غير محدد') return null;

  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s·]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (isoMatch) {
    const [, y, m, d, hh = '0', mm = '0', ss = '0'] = isoMatch;
    const ts = Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
    return Number.isNaN(ts) ? null : ts;
  }

  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    const ts = Date.UTC(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(ts) ? null : ts;
  }

  return null;
}

/**
 * استخراج قيمة رقمية حقيقية من النصوص (يدعم الأرقام العربية والهندية والكسور والسالب والفواصل والعملات)
 */
export function parseSortableNumber(val: unknown): number | null {
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : null;
  }
  if (typeof val !== 'string') return null;

  const western = arabicToWesternDigits(val).trim();
  if (!western || western === '—' || western === '-') return null;

  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(western)) return null;
  if (/\d+-\d+-\d+/.test(western)) return null;

  const cleaned = western
    .replace(/ج\.م|جنيه|شيكارة|شكائر|رغيف|يومًا|يوماً|يوم|فرد|مخبز|طن|أسطوانة|موظف|محضر|%|٪/g, '')
    .replace(/[,٬\s]/g, '')
    .replace(/٫/g, '.')
    .trim();

  if (/^-?\d+(?:\.\d+)?$/.test(cleaned)) {
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function isEmptySortableValue(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === 'string') {
    const t = val.trim();
    return t === '' || t === '—' || t === '-' || t === 'غير مسجل' || t === 'غير محدد';
  }
  return false;
}

/**
 * دالة فرز عامة حقيقية للجداول:
 * - تفرز الأرقام رقمياً (دعم الأرقام العربية والهندية واللاتينية والفواصل والسالب والكسور والعملات)
 * - تفرز التواريخ زمنياً بدقة
 * - تفرز النصوص العربية بشكل طبيعي (numeric: true)
 * - تضع القيم الفارغة في النهاية دائماً
 */
export function compareTableValues(a: unknown, b: unknown, asc = true): number {
  const emptyA = isEmptySortableValue(a);
  const emptyB = isEmptySortableValue(b);
  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;

  const dateA = parseDateTimestamp(a);
  const dateB = parseDateTimestamp(b);
  if (dateA !== null && dateB !== null) {
    return asc ? dateA - dateB : dateB - dateA;
  }

  const numA = parseSortableNumber(a);
  const numB = parseSortableNumber(b);
  if (numA !== null && numB !== null) {
    return asc ? numA - numB : numB - numA;
  }

  const strA = arabicToWesternDigits(String(a)).trim();
  const strB = arabicToWesternDigits(String(b)).trim();
  const cmp = strA.localeCompare(strB, 'ar', { numeric: true, sensitivity: 'base' });
  return asc ? cmp : -cmp;
}
