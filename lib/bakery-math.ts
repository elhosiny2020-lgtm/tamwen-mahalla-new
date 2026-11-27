import { BakeryRecord, DocumentStatusLabel } from '@/types';

/**
 * ربط قرى مركز المحلة الكبرى بالوحدات المحلية التابعة لها تلقائياً
 */
export const MAHALLA_VILLAGE_TO_LOCAL_UNIT: Record<string, string> = {
  'صفط تراب': 'الوحدة المحلية بصفط تراب',
  'الهياتم': 'الوحدة المحلية بالهياتم',
  'البنوان': 'الوحدة المحلية بالبنوان',
  'محلة أبو علي': 'الوحدة المحلية بمحلة أبو علي',
  'شبرا بابل': 'الوحدة المحلية بشبرا بابل',
  'دمرو': 'الوحدة المحلية بدمرو',
  'المعتمدية': 'الوحدة المحلية بالمعتمدية',
  'نمرة البصل': 'الوحدة المحلية بنمرة البصل',
  'بشبيش': 'الوحدة المحلية ببشبيش',
  'الجابرية': 'الوحدة المحلية بالجابرية',
  'القيصرية': 'الوحدة المحلية بالقيصرية',
  'ميت السراج': 'الوحدة المحلية بصفط تراب',
  'الشهيدي': 'الوحدة المحلية بالهياتم',
  'ديرب هاشم': 'الوحدة المحلية بمحلة أبو علي',
  'بطينة': 'الوحدة المحلية بمحلة أبو علي',
  'كفر الجنينة': 'الوحدة المحلية بنمرة البصل',
  'بلقينا': 'الوحدة المحلية بالمعتمدية',
  'عياش': 'الوحدة المحلية بشبرا بابل',
  'سامول': 'الوحدة المحلية بدمرو',
  'أبو النجا': 'بندر المحلة الكبرى',
  'منشية البكري': 'بندر المحلة الكبرى',
};

export const MAHALLA_VILLAGES = Object.keys(MAHALLA_VILLAGE_TO_LOCAL_UNIT);
export const MAHALLA_LOCAL_UNITS = Array.from(new Set(Object.values(MAHALLA_VILLAGE_TO_LOCAL_UNIT)));

/**
 * تقريب آمن إلى منزلتين عشريتين للمتوسطات
 */
export function round2(val: number): number {
  if (!Number.isFinite(val) || Number.isNaN(val)) return 0;
  return Math.round(val * 100) / 100;
}

/**
 * تقريب آمن إلى 3 منازل عشرية للحصص
 */
export function round3(val: number): number {
  if (!Number.isFinite(val) || Number.isNaN(val)) return 0;
  return Math.round(val * 1000) / 1000;
}

/**
 * المعادلة الأولى: حساب الحصة التأمينية
 * الحصة التأمينية = المبلغ التأميني ÷ 235 ÷ 3
 */
export function calculateInsuranceQuota(insuranceAmountEgp: number): number {
  const amount = Number(insuranceAmountEgp) || 0;
  if (amount <= 0) return 0;
  return round3(amount / 235 / 3);
}

/**
 * المعادلة الثانية: حساب الأرغفة اليومية
 * عدد الأرغفة اليومية = الحصة الفعلية × معامل إنتاج الخبز (660 أو 725)
 */
export function calculateDailyLoaves(actualQuota: number, productionFactor: 660 | 725): number {
  const quota = Number(actualQuota) || 0;
  const factor = productionFactor === 725 ? 725 : 660;
  if (quota <= 0) return 0;
  return Math.round(quota * factor);
}

/**
 * المعادلات الثالثة والرابعة والخامسة والسابعة: متوسط نصيب الفرد اليومي للسنة (رقمان عشريان)
 * متوسط السنة = عدد الأرغفة اليومية ÷ عدد المستفيدين للسنة (مع منع القسمة على صفر)
 */
export function calculatePerCapitaAverage(dailyLoaves: number, beneficiaries: number): number {
  const loaves = Number(dailyLoaves) || 0;
  const ben = Number(beneficiaries) || 0;
  if (loaves <= 0 || ben <= 0) return 0;
  return round2(loaves / ben);
}

/**
 * المعادلة السادسة: الفرق التراكمي بين متوسطات 2023 و2024 و2025 (رقمان عشريان)
 * الفرق التراكمي = متوسط 2023 − متوسط 2024 − متوسط 2025
 */
export function calculateCumulativeAvgDifference(avg2023: number, avg2024: number, avg2025: number): number {
  const a23 = Number(avg2023) || 0;
  const a24 = Number(avg2024) || 0;
  const a25 = Number(avg2025) || 0;
  return round2(a23 - a24 - a25);
}

/**
 * دالة شاملة لإعادة حساب المعادلات السبع لأي سجل مخبز دون المساس بالقيم الأصلية المدخلة يدوياً
 */
export function computeBakeryEquations<T extends Partial<BakeryRecord>>(input: T): T & {
  insuranceQuota: number;
  dailyLoavesCount: number;
  avgPerCapita2023: number;
  avgPerCapita2024: number;
  avgPerCapita2025: number;
  cumulativeAvgDifference: number;
  dailyShareActual2025: number;
  totalInsuranceValueEgp: number;
} {
  const insuranceAmountEgp = Number(input.insuranceAmountEgp) || 0;
  const actualQuota = Number(input.actualQuota) || 0;
  const sackPriceEgp = Number(input.sackPriceEgp) || 235;
  const factor: 660 | 725 = input.productionFactor === 725 ? 725 : 660;

  const ben2023 = Number(input.beneficiaries2023) || 0;
  const ben2024 = Number(input.beneficiaries2024) || 0;
  const ben2025 = Number(input.beneficiaries2025) || 0;

  // 1. الحصة التأمينية
  const insuranceQuota = calculateInsuranceQuota(insuranceAmountEgp);
  // 2. عدد الأرغفة اليومية
  const dailyLoavesCount = calculateDailyLoaves(actualQuota, factor);
  // 3. متوسط 2023
  const avgPerCapita2023 = calculatePerCapitaAverage(dailyLoavesCount, ben2023);
  // 4. متوسط 2024
  const avgPerCapita2024 = calculatePerCapitaAverage(dailyLoavesCount, ben2024);
  // 5. متوسط 2025
  const avgPerCapita2025 = calculatePerCapitaAverage(dailyLoavesCount, ben2025);
  // 6. الفرق التراكمي
  const cumulativeAvgDifference = calculateCumulativeAvgDifference(avgPerCapita2023, avgPerCapita2024, avgPerCapita2025);
  // 7. نصيب الفرد اليومي وفق الحصة الفعلية لعام 2025
  const dailyShareActual2025 = calculatePerCapitaAverage(dailyLoavesCount, ben2025);

  const totalInsuranceValueEgp = Math.round(actualQuota * sackPriceEgp * 3);

  return {
    ...input,
    insuranceQuota,
    dailyLoavesCount,
    avgPerCapita2023,
    avgPerCapita2024,
    avgPerCapita2025,
    cumulativeAvgDifference,
    dailyShareActual2025,
    totalInsuranceValueEgp,
  };
}

/**
 * حساب عدد الأيام المتبقية وحالة المستند بناءً على تاريخ الانتهاء الفعلي
 */
export function evaluateDocumentExpiry(
  expiryDateStr?: string,
  docNumber?: string,
  referenceDateStr?: string
): {
  daysRemaining: number | null;
  status: DocumentStatusLabel;
  severity: 'valid' | 'warn30' | 'warn15' | 'warn7' | 'warn3' | 'today' | 'expired' | 'missing' | 'review';
} {
  if (!docNumber || docNumber.trim() === '') {
    return { daysRemaining: null, status: 'لا يوجد مستند', severity: 'missing' };
  }
  if (!expiryDateStr || expiryDateStr.trim() === '') {
    return { daysRemaining: null, status: 'يحتاج إلى مراجعة', severity: 'review' };
  }

  const parseDateToUtcDay = (str: string): number | null => {
    const match = str.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
    const parsed = new Date(str);
    if (Number.isNaN(parsed.getTime())) return null;
    return Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
  };

  const expiryUtc = parseDateToUtcDay(expiryDateStr);
  if (expiryUtc === null) {
    return { daysRemaining: null, status: 'يحتاج إلى مراجعة', severity: 'review' };
  }

  let todayUtc: number;
  if (referenceDateStr) {
    const refUtc = parseDateToUtcDay(referenceDateStr);
    todayUtc = refUtc ?? Date.UTC(2026, 10, 25);
  } else {
    const now = new Date();
    todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const diffMs = expiryUtc - todayUtc;
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return { daysRemaining: days, status: 'منتهي', severity: 'expired' };
  }
  if (days === 0) {
    return { daysRemaining: 0, status: 'ينتهي اليوم', severity: 'today' };
  }
  if (days <= 3) {
    return { daysRemaining: days, status: 'ينتهي خلال 3 أيام', severity: 'warn3' };
  }
  if (days <= 7) {
    return { daysRemaining: days, status: 'ينتهي خلال 7 أيام', severity: 'warn7' };
  }
  if (days <= 15) {
    return { daysRemaining: days, status: 'ينتهي خلال 15 يومًا', severity: 'warn15' };
  }
  if (days <= 30) {
    return { daysRemaining: days, status: 'ينتهي خلال 30 يومًا', severity: 'warn30' };
  }

  return { daysRemaining: days, status: 'ساري', severity: 'valid' };
}

/**
 * تنبيه صوتي ذكي باستخدام Web Audio API مع نغمات مميزة لكل نوع تنبيه
 */
export function playAlertSound(
  type: 'new_alert' | 'expired_license' | 'expiring_contract' | 'test',
  volume = 0.6
): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const gainNode = ctx.createGain();
    gainNode.gain.value = Math.max(0.05, Math.min(1, volume));
    gainNode.connect(ctx.destination);

    const playTone = (freq: number, startTime: number, duration: number, oscType: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      osc.type = oscType;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
      osc.connect(gainNode);
      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    if (type === 'expired_license') {
      // صوت تحذيري مزدوج للتراخيص المنتهية
      playTone(520, 0, 0.16, 'triangle');
      playTone(410, 0.2, 0.24, 'triangle');
    } else if (type === 'expiring_contract') {
      // صوت مميز للعقود القريبة من الانتهاء
      playTone(587.33, 0, 0.14, 'sine');
      playTone(783.99, 0.16, 0.18, 'sine');
    } else {
      // صوت تنبيه جديد أو اختبار
      playTone(659.25, 0, 0.12, 'sine');
      playTone(880, 0.14, 0.18, 'sine');
    }
  } catch {
    // Ignore audio context errors when browser blocks autoplay
  }
}
