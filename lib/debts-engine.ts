import {
  BakeryDebtItem,
  BakeryDebtRecord,
  BakeryViolationRecord,
  DebtInstallmentRecord,
  DebtModuleSettings,
  DebtPaymentRecord,
  DebtSchedulePlan,
  InstallmentStatus,
  RiskClassification,
  ScheduleFrequencyType,
  ViolationBreadCategory,
  ViolationRuleConfig,
} from '@/types';
import { formatArabicDecimal, formatArabicNumber, toArabicNumerals } from '@/lib/utils';

/**
 * تقريب مالي دقيق للجنيه والقرش (منزلتان عشريتان بالقرش الصحيح)
 */
export function round2(val: number): number {
  const num = Number(val);
  if (!Number.isFinite(num) || Number.isNaN(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * حساب فرق الأيام بين تاريخين YYYY-MM-DD (موجب يعني target بعد ref، سالب يعني قبله)
 */
export function diffDaysBetweenDates(targetDateStr: string, refDateStr: string): number {
  const parseUtc = (s: string): number | null => {
    const m = String(s || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  };
  const t = parseUtc(targetDateStr);
  const r = parseUtc(refDateStr);
  if (t === null || r === null) return 0;
  return Math.round((t - r) / (1000 * 60 * 60 * 24));
}

export function addDaysIso(dateStr: string, days: number): string {
  const m = String(dateStr || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  const base = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : new Date();
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export function addMonthsIso(dateStr: string, months: number): string {
  const m = String(dateStr || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  const base = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : new Date();
  const targetDay = base.getUTCDate();
  base.setUTCMonth(base.getUTCMonth() + months);
  if (base.getUTCDate() < targetDay) {
    base.setUTCDate(0);
  }
  return base.toISOString().slice(0, 10);
}

/**
 * 5- المحرك المحاسبي المركزي الموحد لحساب المديونيات
 * يطبق المعادلات المعتمدة بدقة القرش ويمنع القسمة على صفر وتكرار الدفعات
 */
export function computeDebtFinancials(
  debt: BakeryDebtRecord,
  payments: DebtPaymentRecord[],
  installments: DebtInstallmentRecord[],
  todayRef: string
): BakeryDebtRecord {
  const orig = Math.max(0, round2(debt.originalAmount));
  const prior = Math.max(0, round2(debt.priorViolationsAmount));
  const add = Math.max(0, round2(debt.additionsAmount));
  const disp = Math.max(0, round2(debt.disposalsAmount));
  const sett = Math.max(0, round2(debt.approvedSettlementsAmount));
  const adv = Math.max(0, round2(debt.advancePaidAmount));

  // إجمالي المديونية قبل التسويات = قيمة المخالفة + المخالفات السابقة + الإضافات + التصرفات
  const grossBeforeSettlements = round2(orig + prior + add + disp);

  // صافي المديونية المستحقة = إجمالي المديونية قبل التسويات − التسويات والخصومات المعتمدة
  const netDueAmount = Math.max(0, round2(grossBeforeSettlements - sett));

  // إجمالي المدفوعات = مجموع الدفعات المقبولة والمعتمدة (مع استبعاد الملغاة وقيد المراجعة)
  const validPayments = payments.filter((p) => p.debtId === debt.id && p.status === 'معتمد');
  const paymentsSum = round2(validPayments.reduce((s, p) => s + Math.max(0, round2(p.amount)), 0));
  const totalPaidAmount = Math.min(netDueAmount, round2(paymentsSum + adv));

  // المتبقي = صافي المديونية المستحقة − إجمالي المدفوعات
  const remainingAmount = Math.max(0, round2(netDueAmount - totalPaidAmount));

  // نسبة السداد والمتبقي مع منع القسمة على صفر
  const paymentPercentage = netDueAmount > 0 ? round2((totalPaidAmount / netDueAmount) * 100) : 0;
  const remainingPercentage = netDueAmount > 0 ? round2((remainingAmount / netDueAmount) * 100) : 0;

  const sortedValidPayments = [...validPayments].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
  const lastPaymentDate = sortedValidPayments[0]?.paymentDate || debt.lastPaymentDate;

  const debtInsts = installments
    .filter((i) => i.debtId === debt.id && i.status !== 'ملغي بقرار معتمد')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const openInsts = debtInsts.filter((i) => i.remainingAmount > 0);
  const nextInstallmentDate = openInsts[0]?.dueDate;

  // حساب أيام التأخير الفعلي من أقدم قسط مفتوح أو من تاريخ الاستحقاق
  let delayDays = 0;
  if (remainingAmount > 0) {
    const oldestDue = openInsts[0]?.dueDate || debt.dueDate;
    const diff = diffDaysBetweenDates(todayRef, oldestDue);
    delayDays = diff > 0 ? diff : 0;
  }

  let paymentStatus: BakeryDebtRecord['paymentStatus'] = 'غير مسدد';
  if (remainingAmount <= 0 && netDueAmount > 0) {
    paymentStatus = 'مسدد بالكامل';
  } else if (delayDays > 0) {
    paymentStatus = 'متأخر';
  } else if (totalPaidAmount > 0) {
    paymentStatus = 'مسدد جزئيًا';
  }

  let scheduleStatus: BakeryDebtRecord['scheduleStatus'] = debt.scheduleStatus;
  if (debtInsts.length > 0) {
    if (remainingAmount <= 0 || openInsts.length === 0) {
      scheduleStatus = 'مكتمل';
    } else if (openInsts.some((i) => diffDaysBetweenDates(todayRef, i.dueDate) > 15)) {
      scheduleStatus = 'متعثر';
    } else {
      scheduleStatus = 'مجدول نشط';
    }
  } else if (scheduleStatus !== 'ملغي') {
    scheduleStatus = 'غير مجدول';
  }

  return {
    ...debt,
    originalAmount: orig,
    priorViolationsAmount: prior,
    additionsAmount: add,
    disposalsAmount: disp,
    approvedSettlementsAmount: sett,
    advancePaidAmount: adv,
    grossBeforeSettlements,
    netDueAmount,
    totalPaidAmount,
    remainingAmount,
    paymentPercentage,
    remainingPercentage,
    paymentStatus,
    scheduleStatus,
    lastPaymentDate,
    nextInstallmentDate,
    delayDays,
  };
}

/**
 * تحديث حالات الأقساط وأيام التأخير تلقائياً بناءً على التاريخ الفعلي والمدفوعات
 */
export function evaluateInstallmentStatus(
  inst: DebtInstallmentRecord,
  todayRef: string
): DebtInstallmentRecord {
  const amt = Math.max(0, round2(inst.amount));
  const paid = Math.min(amt, Math.max(0, round2(inst.paidAmount)));
  const rem = Math.max(0, round2(amt - paid));

  if (inst.status === 'ملغي بقرار معتمد') {
    return { ...inst, amount: amt, paidAmount: paid, remainingAmount: 0, delayDays: 0 };
  }
  if (rem <= 0) {
    return { ...inst, amount: amt, paidAmount: amt, remainingAmount: 0, delayDays: 0, status: 'تم السداد' };
  }
  if (inst.status === 'مؤجل بموافقة') {
    const diff = diffDaysBetweenDates(todayRef, inst.dueDate);
    return { ...inst, amount: amt, paidAmount: paid, remainingAmount: rem, delayDays: Math.max(0, diff) };
  }

  const diff = diffDaysBetweenDates(todayRef, inst.dueDate); // > 0 means overdue
  let status: InstallmentStatus = 'مجدول';
  if (diff > 0) {
    status = paid > 0 ? 'متأخر جزئيًا' : 'متأخر';
  } else if (diff === 0) {
    status = paid > 0 ? 'مسدد جزئيًا' : 'مستحق اليوم';
  } else if (paid > 0) {
    status = 'مسدد جزئيًا';
  }

  return {
    ...inst,
    amount: amt,
    paidAmount: paid,
    remainingAmount: rem,
    delayDays: Math.max(0, diff),
    status,
  };
}

/**
 * 7- توليد جدول الأقساط مع معالجة فروق التقريب في القسط الأخير بدقة القرش
 */
export function generateInstallmentsDraft(params: {
  scheduleId: string;
  scheduleNumber: string;
  debt: BakeryDebtRecord;
  scheduledAmount: number;
  scheduleType: ScheduleFrequencyType;
  firstInstallmentDate: string;
  installmentsCount: number;
  customDates?: string[];
}): DebtInstallmentRecord[] {
  const totalToSchedule = Math.max(0, round2(params.scheduledAmount));
  const count = params.scheduleType === 'سداد دفعة واحدة' ? 1 : Math.max(1, Math.min(60, Math.round(params.installmentsCount)));
  if (totalToSchedule <= 0) return [];

  // حساب القسط بالقرش ومعالجة فرق التقريب في القسط الأخير تماماً
  const totalPiastres = Math.round(totalToSchedule * 100);
  const basePiastres = Math.floor(totalPiastres / count);
  const remainderPiastres = totalPiastres - basePiastres * count;

  const list: DebtInstallmentRecord[] = [];
  for (let i = 0; i < count; i++) {
    let dueDate = params.firstInstallmentDate;
    if (params.customDates && params.customDates[i]) {
      dueDate = params.customDates[i];
    } else if (i > 0) {
      if (params.scheduleType === 'سداد أسبوعي') {
        dueDate = addDaysIso(params.firstInstallmentDate, i * 7);
      } else if (params.scheduleType === 'سداد كل 15 يومًا') {
        dueDate = addDaysIso(params.firstInstallmentDate, i * 15);
      } else if (params.scheduleType === 'سداد بمواعيد موسمية وفق اعتماد المسؤول') {
        dueDate = addMonthsIso(params.firstInstallmentDate, i * 3);
      } else {
        dueDate = addMonthsIso(params.firstInstallmentDate, i);
      }
    }

    const piastres = i === count - 1 ? basePiastres + remainderPiastres : basePiastres;
    const amount = round2(piastres / 100);

    list.push({
      id: `${params.scheduleId}-inst-${i + 1}`,
      scheduleId: params.scheduleId,
      scheduleNumber: params.scheduleNumber,
      installmentSerial: i + 1,
      debtId: params.debt.id,
      debtNumber: params.debt.debtNumber,
      bakeryId: params.debt.bakeryId,
      bakeryName: params.debt.bakeryName,
      ownerName: params.debt.ownerName,
      posNumber: params.debt.posNumber,
      dueDate,
      amount,
      paidAmount: 0,
      remainingAmount: amount,
      delayDays: 0,
      status: 'مجدول',
    });
  }
  return list;
}

/**
 * 8- بناء التنبيهات والإنذارات الذكية المبنية على تواريخ الاستحقاق الفعلية
 */
export interface ComputedDebtAlert {
  id: string;
  bakeryId: string;
  bakeryName: string;
  ownerName: string;
  posNumber: string;
  phone: string;
  debtId: string;
  debtNumber: string;
  installmentId?: string;
  installmentSerial?: number;
  amountDue: number;
  dueDate: string;
  daysDelta: number; // negative = days before due, 0 = due today, positive = days overdue
  delayDays: number;
  totalBakeryOverdue: number;
  lastPaymentDate?: string;
  responsibleUser: string;
  severity: 'paid' | 'scheduled' | 'near_due' | 'due_today' | 'overdue' | 'severe_overdue' | 'postponed';
  statusLabel: string;
  reasonText: string;
  isRead: boolean;
  isSnoozed: boolean;
}

export function buildRealTimeDebtAlerts(
  debts: BakeryDebtRecord[],
  installments: DebtInstallmentRecord[],
  settings: DebtModuleSettings,
  todayRef: string
): ComputedDebtAlert[] {
  const alerts: ComputedDebtAlert[] = [];
  const maxBefore = Math.max(...settings.notifyBeforeDays, 7);

  // إجمالي المتأخرات لكل مخبز
  const overdueByBakery = new Map<string, number>();
  debts.forEach((d) => {
    if (d.approvalStatus === 'معتمد' && d.remainingAmount > 0 && d.delayDays > 0) {
      overdueByBakery.set(d.bakeryId, round2((overdueByBakery.get(d.bakeryId) || 0) + d.remainingAmount));
    }
  });

  // تنبيهات الأقساط الفعلية
  installments.forEach((inst) => {
    const parentDebt = debts.find((d) => d.id === inst.debtId);
    if (!parentDebt || parentDebt.approvalStatus !== 'معتمد') return;
    if (inst.status === 'ملغي بقرار معتمد' || inst.remainingAmount <= 0) return;

    const snooze = settings.snoozedAlerts[inst.id];
    const isSnoozed = Boolean(snooze && snooze.untilDate >= todayRef);
    const delta = diffDaysBetweenDates(todayRef, inst.dueDate); // >0 overdue, 0 today, <0 upcoming

    let severity: ComputedDebtAlert['severity'] = 'scheduled';
    let statusLabel = 'قسط مجدول';
    let reasonText = `موعد الاستحقاق ${inst.dueDate}`;

    if (inst.status === 'مؤجل بموافقة' || isSnoozed) {
      severity = 'postponed';
      statusLabel = 'مؤجل بموافقة';
      reasonText = snooze?.reason || inst.postponeReason || 'تأجيل معتمد للمتابعة';
    } else if (delta > settings.riskThresholds.defaultedDays) {
      severity = 'severe_overdue';
      statusLabel = 'تأخير شديد';
      reasonText = `تأخر ${toArabicNumerals(delta)} يوماً عن موعد القسط رقم ${toArabicNumerals(inst.installmentSerial)}`;
    } else if (delta > 0) {
      severity = 'overdue';
      statusLabel = 'متأخر';
      reasonText = `متأخر منذ ${toArabicNumerals(delta)} يوماً عن استحقاق القسط رقم ${toArabicNumerals(inst.installmentSerial)}`;
    } else if (delta === 0) {
      severity = 'due_today';
      statusLabel = 'مستحق اليوم';
      reasonText = `يستحق السداد اليوم (القسط رقم ${toArabicNumerals(inst.installmentSerial)})`;
    } else if (Math.abs(delta) <= maxBefore) {
      severity = 'near_due';
      statusLabel = 'اقترب الموعد';
      reasonText = `يتبقى ${toArabicNumerals(Math.abs(delta))} يوم على استحقاق القسط رقم ${toArabicNumerals(inst.installmentSerial)}`;
    } else {
      return; // بعيد جداً عن نافذة التنبيه
    }

    const alertId = `al-inst-${inst.id}`;
    alerts.push({
      id: alertId,
      bakeryId: parentDebt.bakeryId,
      bakeryName: parentDebt.bakeryName,
      ownerName: parentDebt.ownerName,
      posNumber: parentDebt.posNumber,
      phone: parentDebt.phone,
      debtId: parentDebt.id,
      debtNumber: parentDebt.debtNumber,
      installmentId: inst.id,
      installmentSerial: inst.installmentSerial,
      amountDue: inst.remainingAmount,
      dueDate: inst.dueDate,
      daysDelta: delta,
      delayDays: Math.max(0, delta),
      totalBakeryOverdue: overdueByBakery.get(parentDebt.bakeryId) || inst.remainingAmount,
      lastPaymentDate: parentDebt.lastPaymentDate,
      responsibleUser: parentDebt.recordedBy,
      severity,
      statusLabel,
      reasonText,
      isRead: settings.readNotificationIds.includes(alertId),
      isSnoozed,
    });
  });

  // تنبيهات المديونيات غير المجدولة التي حان أو اقترب استحقاقها
  debts.forEach((d) => {
    if (d.approvalStatus !== 'معتمد' || d.remainingAmount <= 0) return;
    const hasActiveInst = installments.some((i) => i.debtId === d.id && i.remainingAmount > 0 && i.status !== 'ملغي بقرار معتمد');
    if (hasActiveInst) return;

    const delta = diffDaysBetweenDates(todayRef, d.dueDate);
    if (delta < -maxBefore) return;

    const snooze = settings.snoozedAlerts[d.id];
    const isSnoozed = Boolean(snooze && snooze.untilDate >= todayRef);

    let severity: ComputedDebtAlert['severity'] = 'near_due';
    let statusLabel = 'اقترب الموعد';
    let reasonText = `يتبقى ${toArabicNumerals(Math.abs(delta))} يوم على استحقاق المديونية`;

    if (isSnoozed) {
      severity = 'postponed';
      statusLabel = 'مؤجل بموافقة';
      reasonText = snooze.reason;
    } else if (delta > settings.riskThresholds.defaultedDays) {
      severity = 'severe_overdue';
      statusLabel = 'تأخير شديد';
      reasonText = `مديونية غير مجدولة متأخرة منذ ${toArabicNumerals(delta)} يوماً`;
    } else if (delta > 0) {
      severity = 'overdue';
      statusLabel = 'متأخر';
      reasonText = `مديونية متأخرة منذ ${toArabicNumerals(delta)} يوماً`;
    } else if (delta === 0) {
      severity = 'due_today';
      statusLabel = 'مستحق اليوم';
      reasonText = 'مديونية مستحقة السداد اليوم';
    }

    const alertId = `al-debt-${d.id}`;
    alerts.push({
      id: alertId,
      bakeryId: d.bakeryId,
      bakeryName: d.bakeryName,
      ownerName: d.ownerName,
      posNumber: d.posNumber,
      phone: d.phone,
      debtId: d.id,
      debtNumber: d.debtNumber,
      amountDue: d.remainingAmount,
      dueDate: d.dueDate,
      daysDelta: delta,
      delayDays: Math.max(0, delta),
      totalBakeryOverdue: overdueByBakery.get(d.bakeryId) || d.remainingAmount,
      lastPaymentDate: d.lastPaymentDate,
      responsibleUser: d.recordedBy,
      severity,
      statusLabel,
      reasonText,
      isRead: settings.readNotificationIds.includes(alertId),
      isSnoozed,
    });
  });

  // ترتيب حسب الأولوية (الأشد تأخراً ثم المستحق اليوم ثم القريب)
  const priority: Record<ComputedDebtAlert['severity'], number> = {
    severe_overdue: 0,
    overdue: 1,
    due_today: 2,
    near_due: 3,
    postponed: 4,
    scheduled: 5,
    paid: 6,
  };
  return alerts.sort((a, b) => priority[a.severity] - priority[b.severity] || b.delayDays - a.delayDays);
}

/**
 * 9- تصنيف المخاطر المبني على قواعد قابلة للتعديل (للمتابعة الإدارية فقط)
 */
export function classifyBakeryRisk(
  maxDelayDays: number,
  overdueAmount: number,
  settings: DebtModuleSettings
): RiskClassification {
  if (overdueAmount <= 0 || maxDelayDays <= 0) return 'منتظم';
  if (maxDelayDays >= settings.riskThresholds.severelyDefaultedDays) return 'شديد التعثر';
  if (maxDelayDays >= settings.riskThresholds.defaultedDays) return 'متعثر';
  if (maxDelayDays >= settings.riskThresholds.lateDays) return 'متأخر';
  if (maxDelayDays >= settings.riskThresholds.needsFollowupDays) return 'يحتاج متابعة';
  return 'منتظم';
}

/**
 * أصوات التنبيه الذكية لقسم المديونيات (بدون تكرار مزعج)
 */
let lastSoundPlayedAt = 0;
export function playDebtModuleSound(
  kind: 'near_due' | 'due_today' | 'overdue' | 'severe_overdue',
  enabled: boolean,
  volume = 0.6,
  forceTest = false
): void {
  if (!enabled || typeof window === 'undefined') return;
  const now = Date.now();
  if (!forceTest && now - lastSoundPlayedAt < 5000) return; // منع تكرار الصوت المزعج
  lastSoundPlayedAt = now;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const gain = ctx.createGain();
    gain.gain.value = Math.max(0.05, Math.min(1, volume));
    gain.connect(ctx.destination);

    const tone = (freq: number, start: number, dur: number, type: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      osc.connect(gain);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    };

    if (kind === 'near_due') {
      tone(587.33, 0, 0.12, 'sine');
      tone(783.99, 0.14, 0.16, 'sine');
    } else if (kind === 'due_today') {
      tone(659.25, 0, 0.14, 'triangle');
      tone(880, 0.16, 0.2, 'triangle');
    } else if (kind === 'overdue') {
      tone(440, 0, 0.16, 'sawtooth');
      tone(392, 0.2, 0.22, 'sawtooth');
    } else {
      // severe_overdue
      tone(523.25, 0, 0.12, 'square');
      tone(349.23, 0.14, 0.14, 'square');
      tone(523.25, 0.3, 0.18, 'square');
    }
  } catch {
    // Ignore browser autoplay restrictions
  }
}

/**
 * ============================================================================
 * محرك احتساب مخالفات المخابز ونقص وزن الرغيف (القرار 175 لسنة 2024 والتوجيه 5 لسنة 2026)
 * ============================================================================
 */
export interface ViolationEngineInput {
  rule: ViolationRuleConfig;
  bakeryId: string;
  posNumber: string;
  violationDate: string;
  breadCategory: ViolationBreadCategory;
  // لنقص الوزن (البلدي المدعم 175/2024)
  officialWeightGrams?: number;
  actualWeightGrams?: number;
  dailyInsuranceQuota?: number;
  flourUnitPrice?: number;
  quotaUnitLabel?: string;
  priceUnitLabel?: string;
  // لباقي المخالفات
  dailySupportCostInput?: number;
  flourDisposedQty?: number;
  flourDisposedUnitPrice?: number;
  stopDaysCount?: number;
  manualAmount?: number;
  // التحقق من التكرار أو تحديده يدوياً للاختبار
  historicalViolations: BakeryViolationRecord[];
  forceRepeatOverride?: boolean | null;
}

export interface ViolationEngineOutput {
  isValid: boolean;
  validationError?: string;
  shortageGrams: number;
  shortagePercent: number;
  weightTier: number; // 1..4 for weight shortage, 0 otherwise
  weightTierLabel: string;
  isRepeat: boolean;
  repeatCountInWindow: number;
  priorViolation?: BakeryViolationRecord;
  multiplierApplied: number;
  baseAmount: number;
  finalFineAmount: number;
  closureMeasure: string;
  closureDays: number;
  quotaDeductionPct: number;
  quotaDeductionMonths: number;
  calculationSteps: string[];
  legalBasisText: string;
  effectiveRuleDate: string;
}

export function calculateViolationPenalty(input: ViolationEngineInput): ViolationEngineOutput {
  const { rule, bakeryId, posNumber, violationDate, breadCategory, historicalViolations } = input;
  const steps: string[] = [];

  const emptyInvalid = (err: string): ViolationEngineOutput => ({
    isValid: false,
    validationError: err,
    shortageGrams: 0,
    shortagePercent: 0,
    weightTier: 0,
    weightTierLabel: '—',
    isRepeat: false,
    repeatCountInWindow: 0,
    multiplierApplied: 1,
    baseAmount: 0,
    finalFineAmount: 0,
    closureMeasure: 'لا يوجد',
    closureDays: 0,
    quotaDeductionPct: 0,
    quotaDeductionMonths: 0,
    calculationSteps: [err],
    legalBasisText: `${rule.decreeNumber} (${rule.articleRef})`,
    effectiveRuleDate: rule.effectiveFrom,
  });

  if (!bakeryId || !violationDate) {
    return emptyInvalid('يجب اختيار المخبز وتاريخ الواقعة أولاً.');
  }

  // التحقق من عدم الخلط بين قواعد البلدي المدعم (175/2024) وقواعد السياحي والفينو (توجيه 5/2026)
  if (
    breadCategory === 'خبز بلدي مدعم' &&
    rule.breadCategory !== 'خبز بلدي مدعم' &&
    rule.formulaKind === 'tourist_fino_directive_5'
  ) {
    return emptyInvalid('لا يجوز تطبيق قواعد الخبز السياحي والفينو على الخبز البلدي المدعم.');
  }
  if (
    (breadCategory === 'خبز سياحي حر' || breadCategory === 'خبز فينو') &&
    rule.formulaKind === 'weight_shortage_175'
  ) {
    return emptyInvalid('معادلة القرار 175 لسنة 2024 (نقص وزن 90 جم) خاصة بالخبز البلدي المدعم فقط؛ اختر قاعدة التوجيه 5 لسنة 2026 للسياحي والفينو.');
  }

  // دالة مساعدة للبحث عن التكرار داخل نافذة قانونية محددة من السجلات المعتمدة فقط (بدون المسودات)
  const findPriorApproved = (windowDays: number, extraMatch?: (v: BakeryViolationRecord) => boolean) => {
    const approvedPriors = historicalViolations
      .filter((v) => {
        if (v.status !== 'معتمد') return false; // المسودات والمرفوضة لا تحتسب تكراراً
        const sameBakery = v.bakeryId === bakeryId || (posNumber && v.posNumber === posNumber);
        if (!sameBakery) return false;
        if (v.ruleCode !== rule.code) return false;
        if (extraMatch && !extraMatch(v)) return false;
        const delta = diffDaysBetweenDates(violationDate, v.violationDate);
        return delta >= 0 && delta <= windowDays;
      })
      .sort((a, b) => b.violationDate.localeCompare(a.violationDate));
    return approvedPriors;
  };

  // 1. حاسبة نقص وزن الرغيف البلدي المدعم (القرار الوزاري 175 لسنة 2024 - المادة الرابعة البند التاسع)
  if (rule.formulaKind === 'weight_shortage_175') {
    const officialW = Number(input.officialWeightGrams);
    const actualW = Number(input.actualWeightGrams);
    const quota = Number(input.dailyInsuranceQuota);
    const flourPrice = Number(input.flourUnitPrice);

    if (!Number.isFinite(officialW) || officialW <= 0) {
      return emptyInvalid('يجب إدخال الوزن الرسمي المقرر للرغيف بقيمة صحيحة أكبر من صفر.');
    }
    if (!Number.isFinite(actualW) || actualW < 0) {
      return emptyInvalid('يجب إدخال الوزن الفعلي للرغيف بقيمة موجبة صحيحة.');
    }
    if (actualW >= officialW) {
      return emptyInvalid('الوزن الفعلي أكبر من أو يساوي الوزن الرسمي المقرر — لا توجد مخالفة نقص وزن.');
    }
    if (!Number.isFinite(quota) || quota <= 0) {
      return emptyInvalid('الحصة اليومية التأمينية للمخبز غير مكتملة أو تساوي صفراً.');
    }
    if (!Number.isFinite(flourPrice) || flourPrice <= 0) {
      return emptyInvalid('سعر الدقيق المقرر وقت المخالفة غير مكتمل أو يساوي صفراً.');
    }
    if (
      input.quotaUnitLabel &&
      input.priceUnitLabel &&
      input.quotaUnitLabel !== input.priceUnitLabel
    ) {
      return emptyInvalid('وحدة قياس الحصة التأمينية لا تطابق وحدة تسعير الدقيق — يجب توحيد الوحدات قبل اعتماد الحساب.');
    }

    const shortageGrams = round2(officialW - actualW);
    const shortagePercent = round2((shortageGrams / officialW) * 100);

    // تحديد الشريحة والمدة القانونية للتكرار بدقة وفق الجدول المرجعي:
    let weightTier = 1;
    let weightTierLabel = 'الشريحة ١ (نقص أقل من ١٠ جم)';
    let firstMult = 1;
    let repeatMult = 1;
    let windowDays = 0;
    let closureFirst = 'لا يوجد وفق هذا البند';
    let closureDaysFirst = 0;
    let closureRepeat = 'لا يوجد وفق هذا البند';
    let closureDaysRepeat = 0;

    if (shortageGrams < 10) {
      weightTier = 1;
      weightTierLabel = 'الشريحة ١ (نقص أقل من ١٠ جم)';
      firstMult = 1;
      repeatMult = 1;
      windowDays = 0;
    } else if (shortageGrams < 20) {
      weightTier = 2;
      weightTierLabel = 'الشريحة ٢ (من ١٠ إلى أقل من ٢٠ جم)';
      firstMult = 2;
      repeatMult = 4;
      windowDays = 30; // شهر واحد
    } else if (shortageGrams < 30) {
      weightTier = 3;
      weightTierLabel = 'الشريحة ٣ (من ٢٠ إلى أقل من ٣٠ جم)';
      firstMult = 3;
      repeatMult = 6;
      windowDays = 90; // 3 أشهر
      closureFirst = 'غلق شهر';
      closureDaysFirst = 30;
      closureRepeat = 'غلق شهرين';
      closureDaysRepeat = 60;
    } else {
      weightTier = 4;
      weightTierLabel = 'الشريحة ٤ (٣٠ جم فأكثر)';
      firstMult = 4;
      repeatMult = 8;
      windowDays = 180; // 6 أشهر
      closureFirst = 'غلق ٣ أشهر';
      closureDaysFirst = 90;
      closureRepeat = 'غلق ٦ أشهر';
      closureDaysRepeat = 180;
    }

    const priors = windowDays > 0 ? findPriorApproved(windowDays) : [];
    const autoRepeat = priors.length > 0;
    const isRepeat =
      input.forceRepeatOverride === true
        ? windowDays > 0
        : input.forceRepeatOverride === false
        ? false
        : autoRepeat;

    const multiplierApplied = isRepeat ? repeatMult : firstMult;
    const closureMeasure = isRepeat ? closureRepeat : closureFirst;
    const closureDays = isRepeat ? closureDaysRepeat : closureDaysFirst;

    // المعادلة الأساسية: (النقص ÷ الوزن الرسمي) × الحصة التأمينية × سعر الدقيق المعتمد
    const baseAmount = round2((shortageGrams / officialW) * quota * flourPrice);
    const finalFineAmount = round2(baseAmount * multiplierApplied);

    steps.push(`١) مقدار النقص = ${formatArabicDecimal(officialW, 2)} − ${formatArabicDecimal(actualW, 2)} = ${formatArabicDecimal(shortageGrams, 2)} جم (بنسبة ${formatArabicDecimal(shortagePercent, 2)}٪)`);
    steps.push(`٢) الشريحة القانونية: ${weightTierLabel}`);
    steps.push(
      `٣) التحقق من التكرار (${windowDays > 0 ? `خلال ${toArabicNumerals(windowDays)} يوماً` : 'شريحة أولى بدون مضاعفة'}): ${
        isRepeat
          ? `مخالفة مكررة داخل المدة القانونية ← معامل ${toArabicNumerals(multiplierApplied)}`
          : `المخالفة الأولى (أو خارج مدة التكرار) ← معامل ${toArabicNumerals(multiplierApplied)}`
      }`
    );
    steps.push(
      `٤) القيمة الأساسية = (${formatArabicDecimal(shortageGrams, 2)} ÷ ${formatArabicDecimal(officialW, 2)}) × ${formatArabicDecimal(quota, 3)} × ${formatArabicNumber(flourPrice)} = ${formatArabicDecimal(baseAmount, 2)} ج.م`
    );
    steps.push(
      `٥) قيمة المخالفة النهائية = ${formatArabicDecimal(baseAmount, 2)} × ${toArabicNumerals(multiplierApplied)} = ${formatArabicDecimal(finalFineAmount, 2)} ج.م`
    );
    steps.push(`٦) التدبير الإداري: ${closureMeasure}`);

    return {
      isValid: true,
      shortageGrams,
      shortagePercent,
      weightTier,
      weightTierLabel,
      isRepeat,
      repeatCountInWindow: priors.length,
      priorViolation: priors[0],
      multiplierApplied,
      baseAmount,
      finalFineAmount,
      closureMeasure,
      closureDays,
      quotaDeductionPct: 0,
      quotaDeductionMonths: 0,
      calculationSteps: steps,
      legalBasisText: `${rule.decreeNumber} — ${rule.articleRef} (${rule.legalSource})`,
      effectiveRuleDate: rule.effectiveFrom,
    };
  }

  // التحقق من التكرار لباقي المخالفات
  const priors = findPriorApproved(rule.repeatWindowDays || 365);
  const autoRepeat = priors.length > 0;
  const isRepeat =
    input.forceRepeatOverride === true
      ? true
      : input.forceRepeatOverride === false
      ? false
      : autoRepeat;

  // 2. مخالفات تكلفة دعم مبيعات يوم المخالفة أو الحصة اليومية (×2 أول مرة / ×4 تكرار)
  if (rule.formulaKind === 'support_cost_daily_sales' || rule.formulaKind === 'daily_quota_support_cost') {
    const baseCost = Number(input.dailySupportCostInput);
    if (!Number.isFinite(baseCost) || baseCost <= 0) {
      return emptyInvalid('يجب إدخال القيمة النقدية لتكلفة دعم إنتاج الخبز بقيمة موجبة صحيحة.');
    }
    const mult = isRepeat ? rule.repeatAmountOrMultiplier : rule.firstOffenseAmountOrMultiplier;
    const finalFineAmount = round2(baseCost * mult);
    const closureMeasure = isRepeat ? rule.closureMeasureRepeat : rule.closureMeasureFirst;
    const closureDays = isRepeat ? rule.closureDaysRepeat : rule.closureDaysFirst;
    const quotaPct = isRepeat ? rule.quotaDeductionPct : 0;
    const quotaMonths = isRepeat ? rule.quotaDeductionMonths : 0;

    steps.push(`١) تكلفة دعم إنتاج الخبز المقررة: ${formatArabicDecimal(baseCost, 2)} ج.م`);
    steps.push(
      `٢) حالة التكرار (خلال ${toArabicNumerals(rule.repeatWindowDays)} يوماً): ${
        isRepeat ? `مكررة ← معامل ${toArabicNumerals(mult)}` : `أول مرة ← معامل ${toArabicNumerals(mult)}`
      }`
    );
    steps.push(`٣) الغرامة النهائية = ${formatArabicDecimal(baseCost, 2)} × ${toArabicNumerals(mult)} = ${formatArabicDecimal(finalFineAmount, 2)} ج.م`);
    if (closureMeasure && closureMeasure !== 'لا يوجد') steps.push(`٤) التدبير الإداري: ${closureMeasure}`);
    if (quotaPct > 0) steps.push(`٥) خصم الحصة: ${toArabicNumerals(quotaPct)}٪ لمدة ${toArabicNumerals(quotaMonths)} أشهر`);

    return {
      isValid: true,
      shortageGrams: 0,
      shortagePercent: 0,
      weightTier: 0,
      weightTierLabel: rule.groupName,
      isRepeat,
      repeatCountInWindow: priors.length,
      priorViolation: priors[0],
      multiplierApplied: mult,
      baseAmount: round2(baseCost),
      finalFineAmount,
      closureMeasure: closureMeasure || 'لا يوجد',
      closureDays,
      quotaDeductionPct: quotaPct,
      quotaDeductionMonths: quotaMonths,
      calculationSteps: steps,
      legalBasisText: `${rule.decreeNumber} — ${rule.articleRef}`,
      effectiveRuleDate: rule.effectiveFrom,
    };
  }

  // 3. التصرف في الدقيق (كمية الدقيق × القيمة النقدية للوحدة × معامل 2 / 4 + خصم 25% لمدة 3 أشهر عند التكرار)
  if (rule.formulaKind === 'flour_disposal_value') {
    const qty = Number(input.flourDisposedQty);
    const unitPrice = Number(input.flourDisposedUnitPrice);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unitPrice) || unitPrice <= 0) {
      return emptyInvalid('يجب إدخال كمية الدقيق المتصرف فيها والقيمة النقدية للوحدة بشكل صحيح.');
    }
    const baseAmount = round2(qty * unitPrice);
    const mult = isRepeat ? rule.repeatAmountOrMultiplier : rule.firstOffenseAmountOrMultiplier;
    const finalFineAmount = round2(baseAmount * mult);
    const quotaPct = isRepeat ? rule.quotaDeductionPct : 0;
    const quotaMonths = isRepeat ? rule.quotaDeductionMonths : 0;

    steps.push(`١) القيمة النقدية للكمية المتصرف فيها = ${formatArabicDecimal(qty, 2)} × ${formatArabicDecimal(unitPrice, 2)} = ${formatArabicDecimal(baseAmount, 2)} ج.م`);
    steps.push(`٢) المعامل المطبق: ${isRepeat ? `تكرار ← ×${toArabicNumerals(mult)}` : `أول مرة ← ×${toArabicNumerals(mult)}`}`);
    steps.push(`٣) الغرامة النهائية = ${formatArabicDecimal(finalFineAmount, 2)} ج.م`);
    if (quotaPct > 0) steps.push(`٤) خصم ${toArabicNumerals(quotaPct)}٪ من حصة الدقيق لمدة ${toArabicNumerals(quotaMonths)} أشهر`);

    return {
      isValid: true,
      shortageGrams: 0,
      shortagePercent: 0,
      weightTier: 0,
      weightTierLabel: rule.groupName,
      isRepeat,
      repeatCountInWindow: priors.length,
      priorViolation: priors[0],
      multiplierApplied: mult,
      baseAmount,
      finalFineAmount,
      closureMeasure: isRepeat ? rule.closureMeasureRepeat : rule.closureMeasureFirst,
      closureDays: isRepeat ? rule.closureDaysRepeat : rule.closureDaysFirst,
      quotaDeductionPct: quotaPct,
      quotaDeductionMonths: quotaMonths,
      calculationSteps: steps,
      legalBasisText: `${rule.decreeNumber} — ${rule.articleRef}`,
      effectiveRuleDate: rule.effectiveFrom,
    };
  }

  // 4. توقف المخبز عن الإنتاج بدون إذن (1000 ج.م/يوم أول مرة، 2000 ج.م/يوم عند التكرار)
  if (rule.formulaKind === 'fixed_per_day') {
    const days = Math.max(0, Math.round(Number(input.stopDaysCount)));
    if (!Number.isFinite(days) || days <= 0) {
      return emptyInvalid('يجب إدخال عدد أيام التوقف أو الغلق الفعلي بقيمة أكبر من صفر.');
    }
    const rate = isRepeat ? rule.repeatAmountOrMultiplier : rule.firstOffenseAmountOrMultiplier;
    const finalFineAmount = round2(days * rate);

    steps.push(`١) عدد أيام الغلق/التوقف المثبتة: ${toArabicNumerals(days)} يوم`);
    steps.push(`٢) فئة الغرامة لليوم: ${formatArabicNumber(rate)} ج.م (${isRepeat ? 'مكررة خلال عام' : 'المخالفة الأولى'})`);
    steps.push(`٣) إجمالي الغرامة = ${toArabicNumerals(days)} × ${formatArabicNumber(rate)} = ${formatArabicDecimal(finalFineAmount, 2)} ج.م`);

    return {
      isValid: true,
      shortageGrams: 0,
      shortagePercent: 0,
      weightTier: 0,
      weightTierLabel: rule.groupName,
      isRepeat,
      repeatCountInWindow: priors.length,
      priorViolation: priors[0],
      multiplierApplied: isRepeat ? 2 : 1,
      baseAmount: round2(rate),
      finalFineAmount,
      closureMeasure: isRepeat ? rule.closureMeasureRepeat : rule.closureMeasureFirst,
      closureDays: isRepeat ? rule.closureDaysRepeat : rule.closureDaysFirst,
      quotaDeductionPct: 0,
      quotaDeductionMonths: 0,
      calculationSteps: steps,
      legalBasisText: `${rule.decreeNumber} — ${rule.articleRef}`,
      effectiveRuleDate: rule.effectiveFrom,
    };
  }

  // 5. التوجيه الوزاري 5 لسنة 2026 (الخبز السياحي الحر والفينو - منفصل تماماً عن البلدي)
  if (rule.formulaKind === 'tourist_fino_directive_5') {
    const officialW = Number(input.officialWeightGrams || 80);
    const actualW = Number(input.actualWeightGrams || 0);
    const baseAmt = Number(input.manualAmount || rule.firstOffenseAmountOrMultiplier);
    if (actualW <= 0 || actualW >= officialW) {
      return emptyInvalid('يجب إدخال الوزن الفعلي أقل من الوزن المقرر للخبز السياحي/الفينو وفق التوجيه 5 لسنة 2026.');
    }
    const shortageGrams = round2(officialW - actualW);
    const shortagePercent = round2((shortageGrams / officialW) * 100);
    const mult = isRepeat ? 2 : 1;
    const finalFineAmount = round2(baseAmt * mult);

    steps.push(`١) نوع الخبز: ${breadCategory} — خاضع للتوجيه الوزاري رقم ٥ لسنة ٢٠٢٦ (منفصل عن منظومة البلدي المدعم)`);
    steps.push(`٢) النقص = ${formatArabicDecimal(officialW, 2)} − ${formatArabicDecimal(actualW, 2)} = ${formatArabicDecimal(shortageGrams, 2)} جم (${formatArabicDecimal(shortagePercent, 2)}٪)`);
    steps.push(`٣) قيمة المخالفة المقررة: ${formatArabicDecimal(finalFineAmount, 2)} ج.م`);

    return {
      isValid: true,
      shortageGrams,
      shortagePercent,
      weightTier: 0,
      weightTierLabel: 'التوجيه ٥ لسنة ٢٠٢٦ (سياحي / فينو)',
      isRepeat,
      repeatCountInWindow: priors.length,
      priorViolation: priors[0],
      multiplierApplied: mult,
      baseAmount: round2(baseAmt),
      finalFineAmount,
      closureMeasure: isRepeat ? rule.closureMeasureRepeat : rule.closureMeasureFirst,
      closureDays: isRepeat ? rule.closureDaysRepeat : rule.closureDaysFirst,
      quotaDeductionPct: 0,
      quotaDeductionMonths: 0,
      calculationSteps: steps,
      legalBasisText: `${rule.decreeNumber} — ${rule.articleRef}`,
      effectiveRuleDate: rule.effectiveFrom,
    };
  }

  // 6. الغرامات الثابتة أو المخصصة
  const amt =
    rule.formulaKind === 'custom_manual'
      ? Number(input.manualAmount || 0)
      : isRepeat
      ? rule.repeatAmountOrMultiplier
      : rule.firstOffenseAmountOrMultiplier;

  if (!Number.isFinite(amt) || amt < 0) {
    return emptyInvalid('قيمة الغرامة المدخلة غير صالحة.');
  }

  // شرط التكرار 3 مرات خلال 3 أشهر لمخالفة عدم مطابقة المواصفات الظاهرية
  const tripleRepeatTriggered = rule.code === 'V-15' ? priors.length >= 2 : isRepeat;
  const finalAmt =
    rule.code === 'V-15'
      ? tripleRepeatTriggered
        ? rule.repeatAmountOrMultiplier
        : rule.firstOffenseAmountOrMultiplier
      : round2(amt);

  const quotaPct = tripleRepeatTriggered ? rule.quotaDeductionPct : 0;
  const quotaMonths = tripleRepeatTriggered ? rule.quotaDeductionMonths : 0;

  steps.push(`١) المخالفة: ${rule.name} (${rule.decreeNumber} - ${rule.articleRef})`);
  steps.push(`٢) حالة التكرار: ${tripleRepeatTriggered ? 'مكررة داخل المدة القانونية' : 'الحالة الأولى'}`);
  steps.push(`٣) قيمة الغرامة: ${formatArabicDecimal(finalAmt, 2)} ج.م`);
  if (quotaPct > 0) steps.push(`٤) خصم الحصة: ${toArabicNumerals(quotaPct)}٪ لمدة ${toArabicNumerals(quotaMonths)} شهر`);

  return {
    isValid: true,
    shortageGrams: 0,
    shortagePercent: 0,
    weightTier: 0,
    weightTierLabel: rule.groupName,
    isRepeat: tripleRepeatTriggered,
    repeatCountInWindow: priors.length,
    priorViolation: priors[0],
    multiplierApplied: tripleRepeatTriggered ? 2 : 1,
    baseAmount: round2(rule.firstOffenseAmountOrMultiplier),
    finalFineAmount: finalAmt,
    closureMeasure: tripleRepeatTriggered ? rule.closureMeasureRepeat : rule.closureMeasureFirst,
    closureDays: tripleRepeatTriggered ? rule.closureDaysRepeat : rule.closureDaysFirst,
    quotaDeductionPct: quotaPct,
    quotaDeductionMonths: quotaMonths,
    calculationSteps: steps,
    legalBasisText: `${rule.decreeNumber} — ${rule.articleRef}`,
    effectiveRuleDate: rule.effectiveFrom,
  };
}

/**
 * 20- اختبارات إلزامية معزولة (تعمل على بيانات اختبار مستقلة دون المساس ببيانات المخابز الحقيقية)
 */
export interface AccountingTestCaseResult {
  id: string;
  title: string;
  passed: boolean;
  expected: string;
  actual: string;
}

export function runIsolatedFinancialSelfTests(rules: ViolationRuleConfig[]): AccountingTestCaseResult[] {
  const results: AccountingTestCaseResult[] = [];
  const weightRule = rules.find((r) => r.formulaKind === 'weight_shortage_175') || rules[0];

  const makeMockDebt = (overrides: Partial<BakeryDebtRecord> = {}): BakeryDebtRecord => ({
    id: 'test-debt-1',
    serialNumber: 1,
    debtNumber: 'TEST-001',
    bakeryId: 'test-bak',
    bakeryFileNumber: '9999',
    bakeryName: 'مخبز اختباري معزول',
    ownerName: 'صاحب مخبز اختباري',
    posNumber: 'POS-TEST-01',
    village: 'قرية اختبار',
    localUnit: 'وحدة اختبار',
    phone: '01000000000',
    issuingAuthority: 'تموين المحلة',
    violationType: 'نقص وزن',
    minutesNumber: 'T-1',
    violationDate: '2026-11-01',
    dueDate: '2026-11-20',
    description: '',
    notes: '',
    recordedBy: 'نظام الاختبار',
    approvalStatus: 'معتمد',
    originalAmount: 10000,
    priorViolationsAmount: 2000,
    additionsAmount: 500,
    disposalsAmount: 300,
    approvedSettlementsAmount: 800,
    advancePaidAmount: 0,
    grossBeforeSettlements: 12800,
    netDueAmount: 12000,
    totalPaidAmount: 0,
    remainingAmount: 12000,
    paymentPercentage: 0,
    remainingPercentage: 100,
    paymentStatus: 'غير مسدد',
    scheduleStatus: 'غير مجدول',
    delayDays: 0,
    createdAt: '2026-11-01T00:00:00Z',
    ...overrides,
  });

  // 1. معادلات المديونية والرصيد مع استبعاد الدفعة الملغاة ومنع القسمة على صفر
  const d1 = makeMockDebt();
  const pays: DebtPaymentRecord[] = [
    {
      id: 'tp-1', paymentNumber: 'P1', debtId: 'test-debt-1', debtNumber: 'TEST-001',
      bakeryId: 'test-bak', bakeryName: 'مخبز اختباري', ownerName: 'اختبار', posNumber: 'POS-TEST-01',
      paymentDate: '2026-11-10', amount: 3000, paymentKind: 'دفعة جزئية', paymentMethod: 'نقدي',
      receiptNumber: 'TR-1', collectionAuthority: 'الخزينة', collectorName: 'محصل',
      balanceBefore: 12000, balanceAfter: 9000, status: 'معتمد', notes: '', createdAt: '',
    },
    {
      id: 'tp-2', paymentNumber: 'P2', debtId: 'test-debt-1', debtNumber: 'TEST-001',
      bakeryId: 'test-bak', bakeryName: 'مخبز اختباري', ownerName: 'اختبار', posNumber: 'POS-TEST-01',
      paymentDate: '2026-11-12', amount: 5000, paymentKind: 'دفعة جزئية', paymentMethod: 'نقدي',
      receiptNumber: 'TR-2', collectionAuthority: 'الخزينة', collectorName: 'محصل',
      balanceBefore: 9000, balanceAfter: 9000, status: 'ملغي', notes: 'ملغاة', createdAt: '',
    },
  ];
  const calcD1 = computeDebtFinancials(d1, pays, [], '2026-11-25');
  results.push({
    id: 't-debt-math',
    title: 'احتساب صافي المديونية واستبعاد الدفعات الملغاة',
    passed: calcD1.grossBeforeSettlements === 12800 && calcD1.netDueAmount === 12000 && calcD1.totalPaidAmount === 3000 && calcD1.remainingAmount === 9000 && calcD1.paymentPercentage === 25,
    expected: 'صافي ١٢٠٠٠ | مدفوع ٣٠٠٠ | متبقي ٩٠٠٠ (٢٥٪)',
    actual: `صافي ${calcD1.netDueAmount} | مدفوع ${calcD1.totalPaidAmount} | متبقي ${calcD1.remainingAmount} (${calcD1.paymentPercentage}٪)`,
  });

  // 2. منع القسمة على صفر
  const zeroDebt = computeDebtFinancials(makeMockDebt({ originalAmount: 0, priorViolationsAmount: 0, additionsAmount: 0, disposalsAmount: 0, approvedSettlementsAmount: 0 }), [], [], '2026-11-25');
  results.push({
    id: 't-zero-div',
    title: 'منع القسمة على صفر عند صافي مديونية = ٠',
    passed: zeroDebt.paymentPercentage === 0 && zeroDebt.remainingPercentage === 0,
    expected: '٠٪ سداد / ٠٪ متبقي',
    actual: `${zeroDebt.paymentPercentage}٪ / ${zeroDebt.remainingPercentage}٪`,
  });

  // 3. معالجة فرق التقريب في القسط الأخير (1000 ÷ 3 = 333.33 + 333.33 + 333.34 = 1000.00)
  const insts = generateInstallmentsDraft({
    scheduleId: 'ts-1',
    scheduleNumber: 'SCH-T1',
    debt: d1,
    scheduledAmount: 1000,
    scheduleType: 'سداد شهري',
    firstInstallmentDate: '2026-12-01',
    installmentsCount: 3,
  });
  const instSum = round2(insts.reduce((s, i) => s + i.amount, 0));
  results.push({
    id: 't-installment-rounding',
    title: 'توزيع الأقساط ومعالجة فرق التقريب في القسط الأخير (١٠٠٠ ÷ ٣)',
    passed: insts.length === 3 && insts[0].amount === 333.33 && insts[2].amount === 333.34 && instSum === 1000,
    expected: '٣٣٣٫٣٣ + ٣٣٣٫٣٣ + ٣٣٣٫٣٤ = ١٠٠٠',
    actual: `${insts.map((i) => i.amount).join(' + ')} = ${instSum}`,
  });

  // 4. اختبارات شرائح نقص الوزن (5جم، 9جم، 10جم، 15جم، 20جم، 25جم، 30جم، 35جم)
  const weightCases = [
    { actual: 85, expectedTier: 1, expectedMult: 1, expectedClosure: 0, label: 'نقص ٥ جم (شريحة ١)' },
    { actual: 81, expectedTier: 1, expectedMult: 1, expectedClosure: 0, label: 'نقص ٩ جم = ٢٣٥ ج.م (شريحة ١)' },
    { actual: 80, expectedTier: 2, expectedMult: 2, expectedClosure: 0, label: 'نقص ١٠ جم (شريحة ٢)' },
    { actual: 75, expectedTier: 2, expectedMult: 2, expectedClosure: 0, label: 'نقص ١٥ جم (شريحة ٢)' },
    { actual: 70, expectedTier: 3, expectedMult: 3, expectedClosure: 30, label: 'نقص ٢٠ جم + غلق شهر (شريحة ٣)' },
    { actual: 65, expectedTier: 3, expectedMult: 3, expectedClosure: 30, label: 'نقص ٢٥ جم + غلق شهر (شريحة ٣)' },
    { actual: 60, expectedTier: 4, expectedMult: 4, expectedClosure: 90, label: 'نقص ٣٠ جم + غلق ٣ أشهر (شريحة ٤)' },
    { actual: 55, expectedTier: 4, expectedMult: 4, expectedClosure: 90, label: 'نقص ٣٥ جم + غلق ٣ أشهر (شريحة ٤)' },
  ];

  weightCases.forEach((wc, idx) => {
    const res = calculateViolationPenalty({
      rule: weightRule,
      bakeryId: 'test-bak',
      posNumber: 'POS-TEST-01',
      violationDate: '2026-11-25',
      breadCategory: 'خبز بلدي مدعم',
      officialWeightGrams: 90,
      actualWeightGrams: wc.actual,
      dailyInsuranceQuota: 10,
      flourUnitPrice: 235,
      quotaUnitLabel: 'شيكارة',
      priceUnitLabel: 'شيكارة',
      historicalViolations: [],
    });
    const extraCheck = wc.actual === 81 ? res.finalFineAmount === 235 : true;
    results.push({
      id: `t-weight-${idx}`,
      title: wc.label,
      passed: res.isValid && res.weightTier === wc.expectedTier && res.multiplierApplied === wc.expectedMult && res.closureDays === wc.expectedClosure && extraCheck,
      expected: `شريحة ${wc.expectedTier} | معامل ${wc.expectedMult} | غلق ${wc.expectedClosure} يوم`,
      actual: `شريحة ${res.weightTier} | معامل ${res.multiplierApplied} | غلق ${res.closureDays} يوم | ${res.finalFineAmount} ج.م`,
    });
  });

  // 5. اختبار التكرار داخل وخارج المدة القانونية (شريحة 2 = 30 يوم)
  const priorApproved: BakeryViolationRecord = {
    id: 'tv-prior', violationNumber: 'V-T1', minutesNumber: 'M-T1',
    bakeryId: 'test-bak', bakeryName: 'مخبز اختباري', ownerName: 'اختبار', posNumber: 'POS-TEST-01',
    village: 'قرية', localUnit: 'وحدة', phone: '010', violationDate: '2026-11-10',
    ruleId: weightRule.id, ruleCode: weightRule.code, violationName: weightRule.name,
    groupName: weightRule.groupName, breadCategory: 'خبز بلدي مدعم', decreeRef: weightRule.decreeNumber, articleRef: weightRule.articleRef,
    isRepeat: false, repeatCountInWindow: 0, multiplierApplied: 2, baseAmount: 391.67, finalFineAmount: 783.34,
    closureMeasure: 'لا يوجد', closureDays: 0, quotaDeductionPct: 0, quotaDeductionMonths: 0,
    calculationSteps: [], legalBasisText: '', effectiveRuleDate: '2024-11-05', status: 'معتمد', recordedBy: 'اختبار', notes: '', createdAt: '',
  };

  const repeatInside = calculateViolationPenalty({
    rule: weightRule, bakeryId: 'test-bak', posNumber: 'POS-TEST-01', violationDate: '2026-11-25',
    breadCategory: 'خبز بلدي مدعم', officialWeightGrams: 90, actualWeightGrams: 75,
    dailyInsuranceQuota: 10, flourUnitPrice: 235, historicalViolations: [priorApproved],
  });
  results.push({
    id: 't-repeat-inside',
    title: 'اكتشاف التكرار داخل المدة القانونية (١٥ يوم < ٣٠ يوم)',
    passed: repeatInside.isRepeat && repeatInside.multiplierApplied === 4,
    expected: 'مكررة · معامل ٤',
    actual: `${repeatInside.isRepeat ? 'مكررة' : 'أولى'} · معامل ${repeatInside.multiplierApplied}`,
  });

  const repeatOutside = calculateViolationPenalty({
    rule: weightRule, bakeryId: 'test-bak', posNumber: 'POS-TEST-01', violationDate: '2026-12-25',
    breadCategory: 'خبز بلدي مدعم', officialWeightGrams: 90, actualWeightGrams: 75,
    dailyInsuranceQuota: 10, flourUnitPrice: 235, historicalViolations: [priorApproved],
  });
  results.push({
    id: 't-repeat-outside',
    title: 'عدم تطبيق معامل التكرار خارج المدة القانونية (٤٥ يوم > ٣٠ يوم)',
    passed: !repeatOutside.isRepeat && repeatOutside.multiplierApplied === 2,
    expected: 'أولى · معامل ٢',
    actual: `${repeatOutside.isRepeat ? 'مكررة' : 'أولى'} · معامل ${repeatOutside.multiplierApplied}`,
  });

  // 6. منع اختلاف وحدة الحصة عن وحدة التسعير + منع وزن >= الرسمي
  const unitMismatch = calculateViolationPenalty({
    rule: weightRule, bakeryId: 'test-bak', posNumber: 'POS-TEST-01', violationDate: '2026-11-25',
    breadCategory: 'خبز بلدي مدعم', officialWeightGrams: 90, actualWeightGrams: 75,
    dailyInsuranceQuota: 10, flourUnitPrice: 235, quotaUnitLabel: 'شيكارة', priceUnitLabel: 'طن',
    historicalViolations: [],
  });
  results.push({
    id: 't-unit-mismatch',
    title: 'منع الحساب عند اختلاف وحدة الحصة عن وحدة تسعير الدقيق',
    passed: !unitMismatch.isValid,
    expected: 'رفض الحساب وتنبيه توحيد الوحدات',
    actual: unitMismatch.validationError || 'تم التمرير بالخطأ',
  });

  const noShortage = calculateViolationPenalty({
    rule: weightRule, bakeryId: 'test-bak', posNumber: 'POS-TEST-01', violationDate: '2026-11-25',
    breadCategory: 'خبز بلدي مدعم', officialWeightGrams: 90, actualWeightGrams: 92,
    dailyInsuranceQuota: 10, flourUnitPrice: 235, historicalViolations: [],
  });
  results.push({
    id: 't-no-shortage',
    title: 'منع احتساب غرامة عند عدم وجود نقص وزن (٩٢ >= ٩٠ جم)',
    passed: !noShortage.isValid,
    expected: 'رفض الحساب لعدم وجود نقص',
    actual: noShortage.validationError || 'تم التمرير بالخطأ',
  });

  return results;
}

/**
 * ملخص البنود المالية المستقلة للمديونية
 */
export function buildInitialDebtItems(debt: BakeryDebtRecord): BakeryDebtItem[] {
  const items: BakeryDebtItem[] = [];
  let idx = 1;
  if (debt.originalAmount > 0) {
    items.push({
      id: `${debt.id}-item-${idx}`,
      debtId: debt.id,
      itemNumber: `${debt.debtNumber}-${idx}`,
      itemType: 'قيمة المخالفة',
      description: debt.violationType,
      dueDate: debt.dueDate,
      amount: debt.originalAmount,
      paidAmount: 0,
      remainingAmount: debt.originalAmount,
      status: 'مستحق',
      notes: 'قيمة المخالفة الأساسية المعتمدة',
    });
    idx++;
  }
  if (debt.priorViolationsAmount > 0) {
    items.push({
      id: `${debt.id}-item-${idx}`,
      debtId: debt.id,
      itemNumber: `${debt.debtNumber}-${idx}`,
      itemType: 'المخالفات السابقة',
      description: 'مخالفات سابقة مرتبطة بالمطالبة',
      dueDate: debt.dueDate,
      amount: debt.priorViolationsAmount,
      paidAmount: 0,
      remainingAmount: debt.priorViolationsAmount,
      status: 'مستحق',
      notes: '',
    });
    idx++;
  }
  if (debt.additionsAmount > 0) {
    items.push({
      id: `${debt.id}-item-${idx}`,
      debtId: debt.id,
      itemNumber: `${debt.debtNumber}-${idx}`,
      itemType: 'الإضافات',
      description: 'إضافات مالية معتمدة',
      dueDate: debt.dueDate,
      amount: debt.additionsAmount,
      paidAmount: 0,
      remainingAmount: debt.additionsAmount,
      status: 'مستحق',
      notes: '',
    });
    idx++;
  }
  if (debt.disposalsAmount > 0) {
    items.push({
      id: `${debt.id}-item-${idx}`,
      debtId: debt.id,
      itemNumber: `${debt.debtNumber}-${idx}`,
      itemType: 'التصرفات',
      description: 'قيمة تصرفات تموينية',
      dueDate: debt.dueDate,
      amount: debt.disposalsAmount,
      paidAmount: 0,
      remainingAmount: debt.disposalsAmount,
      status: 'مستحق',
      notes: '',
    });
    idx++;
  }
  if (debt.approvedSettlementsAmount > 0) {
    items.push({
      id: `${debt.id}-item-${idx}`,
      debtId: debt.id,
      itemNumber: `${debt.debtNumber}-${idx}`,
      itemType: 'التسويات',
      description: 'تسويات وخصومات معتمدة',
      dueDate: debt.dueDate,
      amount: debt.approvedSettlementsAmount,
      paidAmount: debt.approvedSettlementsAmount,
      remainingAmount: 0,
      status: 'مسدد',
      notes: 'مخصومة وفق قرار التسوية',
    });
  }
  return items;
}
