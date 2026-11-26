'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutDashboard,
  Wallet,
  Calculator,
  CreditCard,
  CalendarClock,
  BellRing,
  AlertTriangle,
  PhoneCall,
  FileSpreadsheet,
  Settings2,
  History,
  CheckCircle2,
  X,
  Landmark,
  Wheat,
  FileBadge,
  ShieldAlert,
  FolderKanban,
  Table2,
  PlusCircle,
  BookOpenText,
  Scale,
  Printer,
  Users,
} from 'lucide-react';
import {
  BakeryDebtItem,
  BakeryDebtRecord,
  BakeryRecord,
  BakeryViolationRecord,
  DebtApprovalStatus,
  DebtAuditLogRecord,
  DebtFollowupRecord,
  DebtInstallmentRecord,
  DebtModuleSettings,
  DebtPaymentRecord,
  DebtSchedulePlan,
  DebtSettlementRecord,
  DebtTransactionRecord,
  User,
  ViolationAppealRecord,
  ViolationRuleConfig,
} from '@/types';
import {
  buildInitialDebtItems,
  buildRealTimeDebtAlerts,
  computeDebtFinancials,
  evaluateInstallmentStatus,
  playDebtModuleSound,
  round2,
} from '@/lib/debts-engine';
import {
  DebtsFullStore,
  getInitialDebtsStore,
  loadDebtsStore,
  saveDebtsStore,
} from '@/lib/debts-data';
import { formatArabicCurrency, toArabicNumerals } from '@/lib/utils';
import DebtsDashboardTab from './debts/DebtsDashboardTab';
import DebtsRegistryTab from './debts/DebtsRegistryTab';
import DebtsPaymentsTab from './debts/DebtsPaymentsTab';
import DebtsSchedulingTab from './debts/DebtsSchedulingTab';
import DebtsAlertsAndLateTab from './debts/DebtsAlertsAndLateTab';
import BakeryFinancialProfileModal from './debts/BakeryFinancialProfileModal';
import ViolationsCalculatorTab from './debts/ViolationsCalculatorTab';
import DebtsReportsAndSettingsTab from './debts/DebtsReportsAndSettingsTab';
import MajorDebtsFollowupTab from './debts/MajorDebtsFollowupTab';
import FactoryResetButton from './FactoryResetButton';

interface BakeryDebtsModuleProps {
  userId?: string;
  currentUser?: User;
  bakeries: BakeryRecord[];
  transactions: DebtTransactionRecord[];
  activeFocus: string;
  selectedStatementBakeryId: string;
  todayRef: string;
  onSelectStatementBakeryId: (id: string) => void;
  onAddTransaction: (tx: Omit<DebtTransactionRecord, 'id'>) => void;
  onSelectBakeryDetails: (bakery: BakeryRecord) => void;
}

type ModuleTabId =
  | 'dashboard'
  | 'major_debts'
  | 'registry'
  | 'calculator'
  | 'payments'
  | 'scheduling'
  | 'alerts'
  | 'late'
  | 'followups'
  | 'reports'
  | 'settings'
  | 'audit';

export default function BakeryDebtsModule({
  userId = 'usr-001',
  currentUser,
  bakeries,
  activeFocus,
  selectedStatementBakeryId,
  todayRef,
  onAddTransaction,
}: BakeryDebtsModuleProps) {
  const currentUserName = currentUser?.fullName || 'المسؤول المالي والرقابي';

  // تهيئة متوافقة بين الخادم والمتصفح (Hydration-safe)
  const [store, setStore] = useState<DebtsFullStore>(() => getInitialDebtsStore());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setStore(loadDebtsStore());
      setHydrated(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const updateStore = useCallback((updater: (prev: DebtsFullStore) => DebtsFullStore) => {
    setStore((prev) => {
      const next = updater(prev);
      saveDebtsStore(next);
      return next;
    });
  }, []);

  const [activeTab, setActiveTab] = useState<ModuleTabId>(() => {
    if (activeFocus === 'dbt-payments') return 'payments';
    if (activeFocus === 'dbt-fines') return 'calculator';
    return 'dashboard';
  });

  const [profileBakeryId, setProfileBakeryId] = useState<string | null>(
    activeFocus === 'dbt-statement' && selectedStatementBakeryId ? selectedStatementBakeryId : null
  );
  const [payModalDebt, setPayModalDebt] = useState<BakeryDebtRecord | null>(null);
  const [scheduleModalDebt, setScheduleModalDebt] = useState<BakeryDebtRecord | null>(null);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const notify = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // مزامنة activeFocus الخارجي عند تغييره
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (activeFocus === 'dbt-payments') setActiveTab('payments');
      else if (activeFocus === 'dbt-fines') setActiveTab('calculator');
      else if (activeFocus === 'dbt-statement' && selectedStatementBakeryId) {
        setProfileBakeryId(selectedStatementBakeryId);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [activeFocus, selectedStatementBakeryId]);

  // خريطة سريعة لسحب بيانات المخبز (صاحب المخبز + رقم ماكينة POS + الهاتف + القرية) ديناميكياً من منظومة إدارة المخابز
  const bakeryByIdMap = useMemo(() => {
    const map = new Map<string, BakeryRecord>();
    bakeries.forEach((b) => {
      map.set(b.id, b);
    });
    return map;
  }, [bakeries]);

  const enrichedPayments = useMemo(
    () =>
      store.payments.map((p) => {
        const liveB = bakeryByIdMap.get(p.bakeryId) || bakeries.find((b) => b.name === p.bakeryName);
        if (!liveB) return p;
        return {
          ...p,
          bakeryName: liveB.name,
          ownerName: liveB.ownerName,
          posNumber: liveB.posNumber,
        };
      }),
    [store.payments, bakeryByIdMap, bakeries]
  );

  // إعادة الحساب اللحظي لحالات الأقساط والمديونيات والتنبيهات من البيانات الفعلية مع المزامنة الديناميكية لرقم POS وصاحب المخبز
  const recomputedInstallments = useMemo(
    () =>
      store.installments.map((inst) => {
        const evaluated = evaluateInstallmentStatus(inst, todayRef);
        const liveB = bakeryByIdMap.get(evaluated.bakeryId) || bakeries.find((b) => b.name === evaluated.bakeryName);
        if (!liveB) return evaluated;
        return {
          ...evaluated,
          bakeryName: liveB.name,
          ownerName: liveB.ownerName,
          posNumber: liveB.posNumber,
        };
      }),
    [store.installments, todayRef, bakeryByIdMap, bakeries]
  );

  const recomputedDebts = useMemo(
    () =>
      store.debts.map((debt) => {
        const liveB = bakeryByIdMap.get(debt.bakeryId) || bakeries.find((b) => b.name === debt.bakeryName);
        const syncedDebt: BakeryDebtRecord = liveB
          ? {
              ...debt,
              bakeryFileNumber: liveB.bakeryNumber || debt.bakeryFileNumber,
              bakeryName: liveB.name,
              ownerName: liveB.ownerName,
              posNumber: liveB.posNumber,
              village: liveB.village || debt.village,
              localUnit: liveB.localUnit || debt.localUnit,
              phone: liveB.phone || debt.phone,
            }
          : debt;
        return computeDebtFinancials(syncedDebt, enrichedPayments, recomputedInstallments, todayRef);
      }),
    [store.debts, enrichedPayments, recomputedInstallments, todayRef, bakeryByIdMap, bakeries]
  );

  const computedAlerts = useMemo(
    () => buildRealTimeDebtAlerts(recomputedDebts, recomputedInstallments, store.settings, todayRef),
    [recomputedDebts, recomputedInstallments, store.settings, todayRef]
  );

  // صوت التنبيه الذكي مرة واحدة عند وجود متأخرات غير مقروءة بعد التحميل
  const soundedRef = useRef(false);
  useEffect(() => {
    if (!hydrated || soundedRef.current) return;
    const urgent = computedAlerts.find(
      (a) => !a.isRead && (a.severity === 'severe_overdue' || a.severity === 'overdue' || a.severity === 'due_today')
    );
    if (urgent) {
      soundedRef.current = true;
      playDebtModuleSound(
        urgent.severity === 'severe_overdue'
          ? 'severe_overdue'
          : urgent.severity === 'overdue'
          ? 'overdue'
          : 'due_today',
        store.settings.soundEnabled,
        store.settings.soundVolume
      );
    }
  }, [hydrated, computedAlerts, store.settings.soundEnabled, store.settings.soundVolume]);

  const appendAudit = (
    prev: DebtsFullStore,
    operation: DebtAuditLogRecord['operation'],
    recordRef: string,
    beforeData: string,
    afterData: string,
    reason: string
  ): DebtAuditLogRecord[] => [
    {
      id: `daud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId,
      userName: currentUserName,
      operation,
      recordRef,
      beforeData,
      afterData,
      reason,
    },
    ...prev.auditLogs,
  ];

  // إنشاء مديونية جديدة
  const handleCreateDebt = (
    payload: Omit<
      BakeryDebtRecord,
      | 'id'
      | 'serialNumber'
      | 'debtNumber'
      | 'grossBeforeSettlements'
      | 'netDueAmount'
      | 'totalPaidAmount'
      | 'remainingAmount'
      | 'paymentPercentage'
      | 'remainingPercentage'
      | 'paymentStatus'
      | 'scheduleStatus'
      | 'delayDays'
      | 'createdAt'
    >
  ) => {
    const serial = store.debts.length + 1;
    const debtNumber = `DBT-2026-${String(serial).padStart(3, '0')}`;
    const draft: BakeryDebtRecord = {
      ...payload,
      id: `debt-${Date.now()}`,
      serialNumber: serial,
      debtNumber,
      grossBeforeSettlements: 0,
      netDueAmount: 0,
      totalPaidAmount: 0,
      remainingAmount: 0,
      paymentPercentage: 0,
      remainingPercentage: 0,
      paymentStatus: 'غير مسدد',
      scheduleStatus: 'غير مجدول',
      delayDays: 0,
      createdAt: new Date().toISOString(),
    };
    const finalized = computeDebtFinancials(draft, [], [], todayRef);
    const newItems: BakeryDebtItem[] = buildInitialDebtItems(finalized);

    updateStore((prev) => ({
      ...prev,
      debts: [finalized, ...prev.debts],
      items: [...newItems, ...prev.items],
      auditLogs: appendAudit(
        prev,
        'إضافة مديونية',
        debtNumber,
        'جديد',
        `صافي ${formatArabicCurrency(finalized.netDueAmount)} (${finalized.approvalStatus})`,
        finalized.description
      ),
    }));

    if (finalized.approvalStatus === 'معتمد') {
      onAddTransaction({
        receiptNumber: finalized.debtNumber,
        bakeryId: finalized.bakeryId,
        bakeryName: finalized.bakeryName,
        village: finalized.village,
        date: finalized.violationDate,
        category: finalized.violationType.includes('غرامة') || finalized.violationType.includes('وزن') ? 'غرامة' : 'مديونية',
        amountEgp: finalized.netDueAmount,
        direction: 'debit',
        paymentMethod: 'قيد مديونية تموينية',
        status: 'معتمد',
        notes: finalized.description,
      });
    }
    notify(`تم حفظ المديونية ${toArabicNumerals(debtNumber)} بنجاح.`);
  };

  // تغيير حالة الاعتماد
  const handleChangeApproval = (debtId: string, newStatus: DebtApprovalStatus, reason?: string) => {
    const target = recomputedDebts.find((d) => d.id === debtId);
    if (!target) return;
    if (
      newStatus === 'معتمد' &&
      store.settings.enforceSeparationOfDuties &&
      target.recordedByUserId === userId
    ) {
      notify('قاعدة الفصل بين المهام مفعلة: لا يمكن لمن سجل المديونية اعتمادها بنفسه.', 'err');
      return;
    }

    updateStore((prev) => ({
      ...prev,
      debts: prev.debts.map((d) =>
        d.id === debtId
          ? {
              ...d,
              approvalStatus: newStatus,
              approvedBy: newStatus === 'معتمد' ? currentUserName : d.approvedBy,
              approvedAt: newStatus === 'معتمد' ? new Date().toISOString() : d.approvedAt,
              rejectionReason: reason || d.rejectionReason,
            }
          : d
      ),
      auditLogs: appendAudit(
        prev,
        newStatus === 'معتمد' ? 'اعتماد مديونية' : 'رفض مديونية',
        target.debtNumber,
        target.approvalStatus,
        newStatus,
        reason || 'مراجعة واعتماد المسؤول'
      ),
    }));

    if (newStatus === 'معتمد') {
      onAddTransaction({
        receiptNumber: target.debtNumber,
        bakeryId: target.bakeryId,
        bakeryName: target.bakeryName,
        village: target.village,
        date: target.violationDate,
        category: 'مديونية',
        amountEgp: target.netDueAmount,
        direction: 'debit',
        paymentMethod: 'قيد مديونية تموينية',
        status: 'معتمد',
        notes: target.description,
      });
    }
    notify(`تم تحديث حالة المديونية إلى: ${newStatus}.`);
  };

  // تطبيق تسوية أو خصم معتمد
  const handleApplySettlement = (
    debtId: string,
    type: DebtSettlementRecord['settlementType'],
    amount: number,
    reason: string,
    referenceDoc: string
  ) => {
    const target = recomputedDebts.find((d) => d.id === debtId);
    if (!target) return;
    const settlementRec: DebtSettlementRecord = {
      id: `set-${Date.now()}`,
      debtId,
      debtNumber: target.debtNumber,
      bakeryId: target.bakeryId,
      bakeryName: target.bakeryName,
      settlementType: type,
      amount: round2(amount),
      reason,
      referenceDoc,
      createdBy: currentUserName,
      approvedBy: currentUserName,
      createdAt: new Date().toISOString(),
    };

    updateStore((prev) => ({
      ...prev,
      debts: prev.debts.map((d) => {
        if (d.id !== debtId) return d;
        const nextSett =
          type === 'رد مبلغ'
            ? Math.max(0, round2(d.approvedSettlementsAmount - amount))
            : round2(d.approvedSettlementsAmount + amount);
        return { ...d, approvedSettlementsAmount: nextSett };
      }),
      settlements: [settlementRec, ...prev.settlements],
      auditLogs: appendAudit(
        prev,
        'تسوية مالية',
        target.debtNumber,
        `تسويات سابقة ${formatArabicCurrency(target.approvedSettlementsAmount)}`,
        `${type}: ${formatArabicCurrency(amount)}`,
        `${reason} (${referenceDoc})`
      ),
    }));
    notify(`تم اعتماد ${type} بقيمة ${formatArabicCurrency(amount)} بنجاح.`);
  };

  // تسجيل دفعة تحصيل
  const handleRegisterPayment = (payload: {
    debtId: string;
    paymentDate: string;
    amount: number;
    paymentKind: DebtPaymentRecord['paymentKind'];
    paymentMethod: string;
    receiptNumber: string;
    collectionAuthority: string;
    installmentId?: string;
    notes: string;
  }): { ok: boolean; error?: string } => {
    const debt = recomputedDebts.find((d) => d.id === payload.debtId);
    if (!debt) return { ok: false, error: 'المديونية غير موجودة.' };
    if (debt.approvalStatus !== 'معتمد') return { ok: false, error: 'لا يمكن التحصيل على مديونية غير معتمدة.' };

    // منع تكرار رقم الإيصال
    if (store.payments.some((p) => p.receiptNumber.trim() === payload.receiptNumber.trim() && p.status !== 'ملغي')) {
      return { ok: false, error: 'رقم الإيصال مسجل مسبقاً في عملية سداد أخرى.' };
    }

    // منع السداد الزائد عن المتبقي إلا في حالة التسوية/الرد المعتمد
    if (payload.paymentKind !== 'تسوية / رد معتمد' && payload.amount > debt.remainingAmount + 0.01) {
      return {
        ok: false,
        error: `المبلغ المدخل (${formatArabicCurrency(payload.amount)}) يتجاوز المتبقي (${formatArabicCurrency(debt.remainingAmount)}).`,
      };
    }

    const payNumber = `PAY-2026-${String(store.payments.length + 1).padStart(3, '0')}`;
    const balanceAfter = Math.max(0, round2(debt.remainingAmount - payload.amount));
    const newPayment: DebtPaymentRecord = {
      id: `pay-${Date.now()}`,
      paymentNumber: payNumber,
      debtId: debt.id,
      debtNumber: debt.debtNumber,
      bakeryId: debt.bakeryId,
      bakeryName: debt.bakeryName,
      ownerName: debt.ownerName,
      posNumber: debt.posNumber,
      paymentDate: payload.paymentDate,
      amount: round2(payload.amount),
      paymentKind: payload.paymentKind,
      paymentMethod: payload.paymentMethod,
      receiptNumber: payload.receiptNumber,
      collectionAuthority: payload.collectionAuthority,
      collectorName: currentUserName,
      balanceBefore: debt.remainingAmount,
      balanceAfter,
      status: 'معتمد',
      installmentId: payload.installmentId,
      notes: payload.notes,
      approvedBy: currentUserName,
      createdAt: new Date().toISOString(),
    };

    // توزيع الدفعة على القسط المحدد أو أقدم الأقساط المفتوحة
    updateStore((prev) => {
      let remToApply = round2(payload.amount);
      const updatedInsts = prev.installments.map((inst) => {
        if (inst.debtId !== debt.id || inst.remainingAmount <= 0 || inst.status === 'ملغي بقرار معتمد') {
          return inst;
        }
        if (payload.installmentId && inst.id !== payload.installmentId && remToApply > 0) {
          return inst;
        }
        if (remToApply <= 0) return inst;
        const applied = Math.min(inst.remainingAmount, remToApply);
        remToApply = round2(remToApply - applied);
        const newPaid = round2(inst.paidAmount + applied);
        const newRem = Math.max(0, round2(inst.amount - newPaid));
        return {
          ...inst,
          paidAmount: newPaid,
          remainingAmount: newRem,
          actualPaidDate: newRem <= 0 ? payload.paymentDate : inst.actualPaidDate,
          paymentMethod: payload.paymentMethod,
          receiptNumber: payload.receiptNumber,
        };
      });

      return {
        ...prev,
        payments: [newPayment, ...prev.payments],
        installments: updatedInsts,
        auditLogs: appendAudit(
          prev,
          'تسجيل دفعة',
          `${payNumber} / ${debt.debtNumber}`,
          `المتبقي ${formatArabicCurrency(debt.remainingAmount)}`,
          `سداد ${formatArabicCurrency(payload.amount)} — المتبقي ${formatArabicCurrency(balanceAfter)}`,
          `إيصال ${payload.receiptNumber} (${payload.paymentMethod})`
        ),
      };
    });

    onAddTransaction({
      receiptNumber: payload.receiptNumber,
      bakeryId: debt.bakeryId,
      bakeryName: debt.bakeryName,
      village: debt.village,
      date: payload.paymentDate,
      category: 'سداد نقدي / شيك',
      amountEgp: round2(payload.amount),
      direction: 'credit',
      paymentMethod: payload.paymentMethod,
      status: 'مسدد',
      notes: `تحصيل على ${debt.debtNumber} — ${payload.notes || payload.paymentKind}`,
    });

    notify(`تم تحصيل مبلغ ${formatArabicCurrency(payload.amount)} وإصدار الإيصال ${toArabicNumerals(payload.receiptNumber)}.`);
    return { ok: true };
  };

  // إلغاء وعكس دفعة (لا حذف فعلي)
  const handleCancelPayment = (paymentId: string, reason: string) => {
    const target = store.payments.find((p) => p.id === paymentId);
    if (!target || target.status === 'ملغي') return;

    updateStore((prev) => ({
      ...prev,
      payments: prev.payments.map((p) =>
        p.id === paymentId
          ? { ...p, status: 'ملغي', cancelledBy: currentUserName, cancelReason: reason }
          : p
      ),
      installments: prev.installments.map((inst) => {
        if (target.installmentId && inst.id === target.installmentId) {
          const newPaid = Math.max(0, round2(inst.paidAmount - target.amount));
          return {
            ...inst,
            paidAmount: newPaid,
            remainingAmount: round2(inst.amount - newPaid),
            actualPaidDate: undefined,
            status: 'مجدول',
          };
        }
        return inst;
      }),
      auditLogs: appendAudit(
        prev,
        'إلغاء دفعة',
        `${target.paymentNumber} / ${target.debtNumber}`,
        `معتمد (${formatArabicCurrency(target.amount)})`,
        'ملغي — عكس حركة تلقائي',
        reason
      ),
    }));
    notify(`تم إلغاء وعكس الدفعة ${toArabicNumerals(target.paymentNumber)} وإعادة احتساب الأرصدة.`);
  };

  // إنشاء خطة جدولة أقساط جديدة
  const handleCreateSchedulePlan = (
    plan: Omit<DebtSchedulePlan, 'id' | 'scheduleNumber' | 'createdAt'>,
    generatedInstallments: DebtInstallmentRecord[]
  ): { ok: boolean; error?: string } => {
    const hasActive = store.schedules.some(
      (s) => s.debtId === plan.debtId && (s.status === 'معتمد نشط' || s.status === 'متعثر')
    );
    if (hasActive) {
      return { ok: false, error: 'توجد خطة جدولة نشطة بالفعل لهذه المديونية؛ يمنع تداخل الخطط.' };
    }
    const scheduleId = `sch-${Date.now()}`;
    const scheduleNumber = `SCH-2026-${String(store.schedules.length + 1).padStart(3, '0')}`;
    const newPlan: DebtSchedulePlan = {
      ...plan,
      id: scheduleId,
      scheduleNumber,
      createdAt: new Date().toISOString(),
    };
    const finalInsts = generatedInstallments.map((inst, idx) => ({
      ...inst,
      id: `${scheduleId}-inst-${idx + 1}`,
      scheduleId,
      scheduleNumber,
    }));

    updateStore((prev) => ({
      ...prev,
      schedules: [newPlan, ...prev.schedules],
      installments: [...prev.installments, ...finalInsts],
      auditLogs: appendAudit(
        prev,
        'إنشاء جدول سداد',
        `${scheduleNumber} / ${plan.debtNumber}`,
        'غير مجدول',
        `${plan.scheduleType} (${toArabicNumerals(finalInsts.length)} أقساط)`,
        plan.notes || 'اعتماد خطة تقسيط'
      ),
    }));
    notify(`تم اعتماد خطة السداد ${toArabicNumerals(scheduleNumber)} بنجاح.`);
    return { ok: true };
  };

  const handlePostponeInstallment = (installmentId: string, newDate: string, reason: string) => {
    const inst = store.installments.find((i) => i.id === installmentId);
    if (!inst) return;
    updateStore((prev) => ({
      ...prev,
      installments: prev.installments.map((i) =>
        i.id === installmentId
          ? { ...i, dueDate: newDate, status: 'مؤجل بموافقة', postponeReason: reason }
          : i
      ),
      auditLogs: appendAudit(
        prev,
        'تأجيل قسط',
        `${inst.scheduleNumber} قسط #${inst.installmentSerial}`,
        inst.dueDate,
        `${newDate} (مؤجل بموافقة)`,
        reason
      ),
    }));
    notify('تم تأجيل القسط بموافقة معتمدة.');
  };

  const handleAddFollowup = (payload: Omit<DebtFollowupRecord, 'id' | 'createdAt' | 'noticeNumber'>) => {
    const noticeNumber = `NOT-2026-${String(store.followups.length + 410)}`;
    const rec: DebtFollowupRecord = {
      ...payload,
      id: `flw-${Date.now()}`,
      noticeNumber,
      createdAt: new Date().toISOString(),
    };
    updateStore((prev) => ({
      ...prev,
      followups: [rec, ...prev.followups],
      auditLogs: appendAudit(
        prev,
        'تسجيل متابعة',
        `${noticeNumber} / ${payload.debtNumber}`,
        '—',
        `${payload.actionType} (${payload.notifyResult})`,
        payload.employeeNotes
      ),
    }));
    notify(`تم توثيق إجراء المتابعة ${toArabicNumerals(noticeNumber)}.`);
  };

  // حفظ مخالفة من الحاسبة (مع خيار القيد والربط التلقائي في سجل المديونيات)
  const handleSaveViolation = (
    payload: Omit<BakeryViolationRecord, 'id' | 'violationNumber' | 'createdAt'>,
    autoLinkToDebt = false
  ) => {
    const violationNumber = `VL-2026-${String(store.violations.length + 1).padStart(3, '0')}`;
    const violId = `viol-${Date.now()}`;

    if (autoLinkToDebt && payload.status === 'معتمد') {
      const serial = store.debts.length + 1;
      const debtNumber = `DBT-2026-${String(serial).padStart(3, '0')}`;
      const debtId = `debt-${Date.now()}`;
      const rec: BakeryViolationRecord = {
        ...payload,
        id: violId,
        violationNumber,
        linkedDebtId: debtId,
        linkedDebtNumber: debtNumber,
        createdAt: new Date().toISOString(),
      };
      const newDebt = computeDebtFinancials(
        {
          id: debtId,
          serialNumber: serial,
          debtNumber,
          bakeryId: rec.bakeryId,
          bakeryFileNumber: bakeries.find((b) => b.id === rec.bakeryId)?.bakeryNumber || '',
          bakeryName: rec.bakeryName,
          ownerName: rec.ownerName,
          posNumber: rec.posNumber,
          village: rec.village,
          localUnit: rec.localUnit,
          phone: rec.phone,
          issuingAuthority: 'إدارة تموين مركز المحلة الكبرى',
          violationType: rec.violationName,
          minutesNumber: rec.minutesNumber,
          violationDate: rec.violationDate,
          dueDate: todayRef,
          description: `${rec.violationName} — ${rec.decreeRef} (${rec.articleRef})`,
          notes: rec.notes,
          recordedBy: currentUserName,
          recordedByUserId: userId,
          approvalStatus: 'معتمد',
          approvedBy: rec.approvedBy || currentUserName,
          approvedAt: new Date().toISOString(),
          originalAmount: rec.finalFineAmount,
          priorViolationsAmount: 0,
          additionsAmount: 0,
          disposalsAmount: 0,
          approvedSettlementsAmount: 0,
          advancePaidAmount: 0,
          grossBeforeSettlements: rec.finalFineAmount,
          netDueAmount: rec.finalFineAmount,
          totalPaidAmount: 0,
          remainingAmount: rec.finalFineAmount,
          paymentPercentage: 0,
          remainingPercentage: 100,
          paymentStatus: 'غير مسدد',
          scheduleStatus: 'غير مجدول',
          delayDays: 0,
          linkedViolationId: rec.id,
          breadTypeLabel: rec.breadCategory,
          officialWeightGrams: rec.officialWeightGrams,
          actualWeightGrams: rec.actualWeightGrams,
          shortageGrams: rec.shortageGrams,
          weightTierLabel: rec.weightTier ? `الشريحة ${toArabicNumerals(rec.weightTier)}` : undefined,
          penaltyMultiplier: rec.multiplierApplied,
          sackPriceAtViolation: rec.flourUnitPriceSnapshot,
          insuranceQuotaAtViolation: rec.dailyInsuranceQuotaSnapshot,
          baseFineAmount: rec.baseAmount,
          finalFineAmount: rec.finalFineAmount,
          createdAt: new Date().toISOString(),
        },
        [],
        [],
        todayRef
      );
      const newItems = buildInitialDebtItems(newDebt);
      updateStore((prev) => ({
        ...prev,
        debts: [newDebt, ...prev.debts],
        items: [...newItems, ...prev.items],
        violations: [rec, ...prev.violations],
        auditLogs: appendAudit(
          prev,
          'إضافة مديونية',
          `${debtNumber} ← ${violationNumber}`,
          'حاسبة نقص الوزن ١٧٥/٢٠٢٤',
          `مديونية معتمدة ${formatArabicCurrency(rec.finalFineAmount)} (POS: ${rec.posNumber})`,
          rec.violationName
        ),
      }));
      onAddTransaction({
        receiptNumber: debtNumber,
        bakeryId: rec.bakeryId,
        bakeryName: rec.bakeryName,
        village: rec.village,
        date: rec.violationDate,
        category: 'غرامة',
        amountEgp: rec.finalFineAmount,
        direction: 'debit',
        paymentMethod: 'قيد مخالفة نقص وزن ١٧٥/٢٠٢٤',
        status: 'معتمد',
        notes: `${rec.violationName} (محضر ${rec.minutesNumber})`,
      });
      notify(
        `تم اعتماد المخالفة ${toArabicNumerals(violationNumber)} وقيدها تلقائياً كمديونية (${toArabicNumerals(debtNumber)}) على مخبز ${rec.bakeryName}.`
      );
      return;
    }

    const rec: BakeryViolationRecord = {
      ...payload,
      id: violId,
      violationNumber,
      createdAt: new Date().toISOString(),
    };
    updateStore((prev) => ({
      ...prev,
      violations: [rec, ...prev.violations],
      auditLogs: appendAudit(
        prev,
        'حساب مخالفة',
        `${violationNumber} (${payload.minutesNumber})`,
        '—',
        `${formatArabicCurrency(payload.finalFineAmount)} (${payload.status})`,
        payload.violationName
      ),
    }));
  };

  const handleChangeViolationStatus = (id: string, status: DebtApprovalStatus, reason?: string) => {
    const v = store.violations.find((x) => x.id === id);
    if (!v) return;
    if (
      status === 'معتمد' &&
      store.settings.enforceSeparationOfDuties &&
      v.recordedBy === currentUserName
    ) {
      notify('قاعدة الفصل بين المهام مفعلة: لا يمكن لمن سجل المخالفة اعتمادها بنفسه.', 'err');
      return;
    }
    updateStore((prev) => ({
      ...prev,
      violations: prev.violations.map((x) =>
        x.id === id
          ? {
              ...x,
              status,
              approvedBy: status === 'معتمد' ? currentUserName : x.approvedBy,
              approvedAt: status === 'معتمد' ? new Date().toISOString() : x.approvedAt,
              rejectionReason: reason,
            }
          : x
      ),
      auditLogs: appendAudit(prev, 'اعتماد مخالفة', v.violationNumber, v.status, status, reason || 'مراجعة المخالفة'),
    }));
    notify(`تم تحديث حالة المخالفة إلى: ${status}.`);
  };

  // تحويل المخالفة المعتمدة إلى مديونية مع منع تكرار المحضر
  const handleLinkViolationToDebt = (v: BakeryViolationRecord): { ok: boolean; error?: string } => {
    if (v.status !== 'معتمد') {
      return { ok: false, error: 'يجب اعتماد المخالفة أولاً قبل تحويلها إلى مديونية.' };
    }
    if (v.linkedDebtId) {
      return { ok: false, error: 'هذه المخالفة محولة بالفعل إلى مديونية.' };
    }
    if (store.debts.some((d) => d.minutesNumber.trim() === v.minutesNumber.trim() && d.approvalStatus !== 'مرفوض')) {
      return { ok: false, error: `رقم المحضر ${v.minutesNumber} مسجل مسبقاً في المديونيات؛ يمنع التكرار.` };
    }

    const serial = store.debts.length + 1;
    const debtNumber = `DBT-2026-${String(serial).padStart(3, '0')}`;
    const debtId = `debt-${Date.now()}`;
    const newDebt = computeDebtFinancials(
      {
        id: debtId,
        serialNumber: serial,
        debtNumber,
        bakeryId: v.bakeryId,
        bakeryFileNumber: bakeries.find((b) => b.id === v.bakeryId)?.bakeryNumber || '',
        bakeryName: v.bakeryName,
        ownerName: v.ownerName,
        posNumber: v.posNumber,
        village: v.village,
        localUnit: v.localUnit,
        phone: v.phone,
        issuingAuthority: 'إدارة تموين مركز المحلة الكبرى',
        violationType: v.violationName,
        minutesNumber: v.minutesNumber,
        violationDate: v.violationDate,
        dueDate: todayRef,
        description: `${v.violationName} — ${v.decreeRef} (${v.articleRef})`,
        notes: v.notes,
        recordedBy: currentUserName,
        recordedByUserId: userId,
        approvalStatus: 'معتمد',
        approvedBy: v.approvedBy || currentUserName,
        approvedAt: new Date().toISOString(),
        originalAmount: v.finalFineAmount,
        priorViolationsAmount: 0,
        additionsAmount: 0,
        disposalsAmount: 0,
        approvedSettlementsAmount: 0,
        advancePaidAmount: 0,
        grossBeforeSettlements: v.finalFineAmount,
        netDueAmount: v.finalFineAmount,
        totalPaidAmount: 0,
        remainingAmount: v.finalFineAmount,
        paymentPercentage: 0,
        remainingPercentage: 100,
        paymentStatus: 'غير مسدد',
        scheduleStatus: 'غير مجدول',
        delayDays: 0,
        linkedViolationId: v.id,
        breadTypeLabel: v.breadCategory,
        officialWeightGrams: v.officialWeightGrams,
        actualWeightGrams: v.actualWeightGrams,
        shortageGrams: v.shortageGrams,
        weightTierLabel: v.weightTier ? `الشريحة ${toArabicNumerals(v.weightTier)}` : undefined,
        penaltyMultiplier: v.multiplierApplied,
        sackPriceAtViolation: v.flourUnitPriceSnapshot,
        insuranceQuotaAtViolation: v.dailyInsuranceQuotaSnapshot,
        baseFineAmount: v.baseAmount,
        finalFineAmount: v.finalFineAmount,
        createdAt: new Date().toISOString(),
      },
      [],
      [],
      todayRef
    );

    const newItems = buildInitialDebtItems(newDebt);
    updateStore((prev) => ({
      ...prev,
      debts: [newDebt, ...prev.debts],
      items: [...newItems, ...prev.items],
      violations: prev.violations.map((x) =>
        x.id === v.id ? { ...x, linkedDebtId: debtId, linkedDebtNumber: debtNumber } : x
      ),
      auditLogs: appendAudit(
        prev,
        'إضافة مديونية',
        `${debtNumber} ← ${v.violationNumber}`,
        'مخالفة غير محولة',
        `مديونية معتمدة ${formatArabicCurrency(v.finalFineAmount)}`,
        'تحويل تلقائي من حاسبة المخالفات'
      ),
    }));

    onAddTransaction({
      receiptNumber: debtNumber,
      bakeryId: v.bakeryId,
      bakeryName: v.bakeryName,
      village: v.village,
      date: v.violationDate,
      category: 'غرامة',
      amountEgp: v.finalFineAmount,
      direction: 'debit',
      paymentMethod: 'قيد مخالفة تموينية',
      status: 'معتمد',
      notes: `${v.violationName} (محضر ${v.minutesNumber})`,
    });
    return { ok: true };
  };

  const handleSaveRuleVersion = (
    rule: ViolationRuleConfig,
    officialReference: string,
    isNew: boolean
  ) => {
    updateStore((prev) => {
      const nextVersion = isNew ? 1 : rule.version + 1;
      const updatedRule = { ...rule, version: nextVersion };
      const nextRules = isNew
        ? [updatedRule, ...prev.rules]
        : prev.rules.map((r) => (r.id === rule.id ? updatedRule : r));
      const newVer = {
        id: `ver-${Date.now()}`,
        ruleId: updatedRule.id,
        ruleCode: updatedRule.code,
        version: nextVersion,
        decreeNumber: updatedRule.decreeNumber,
        effectiveFrom: updatedRule.effectiveFrom,
        snapshotSummary: `${updatedRule.name} — أول مرة: ${updatedRule.firstOffenseAmountOrMultiplier} / تكرار: ${updatedRule.repeatAmountOrMultiplier}`,
        changedBy: currentUserName,
        officialReference,
        changedAt: new Date().toISOString(),
      };
      return {
        ...prev,
        rules: nextRules,
        legalVersions: [newVer, ...prev.legalVersions],
        auditLogs: appendAudit(
          prev,
          'تعديل قاعدة قانونية',
          updatedRule.code,
          isNew ? 'جديد' : `v${rule.version}`,
          `v${nextVersion}`,
          officialReference
        ),
      };
    });
    notify('تم حفظ الإصدار القانوني الجديد وتوثيق المرجع الرسمي.');
  };

  const profileBakery = useMemo(
    () => bakeries.find((b) => b.id === profileBakeryId) || null,
    [bakeries, profileBakeryId]
  );

  const unreadAlertsCount = useMemo(
    () => computedAlerts.filter((a) => !a.isRead).length,
    [computedAlerts]
  );

  const openDebtsCount = useMemo(
    () => recomputedDebts.filter((d) => d.approvalStatus === 'معتمد' && d.remainingAmount > 0).length,
    [recomputedDebts]
  );

  const lateBakeriesCount = useMemo(
    () =>
      new Set(
        recomputedDebts
          .filter((d) => d.approvalStatus === 'معتمد' && d.remainingAmount > 0 && d.delayDays > 0)
          .map((d) => d.bakeryId)
      ).size,
    [recomputedDebts]
  );

  // ترتيب التبويبات الموحد والمتطابق تماماً مع ترتيب المجموعات الوظيفية في منظومة إدارة المخابز الأساسية:
  // ١. لوحة التحكم ← ٢. سجل المديونيات وأصحاب المخابز (POS) ← ٣. الحصص وحاسبة نقص الوزن (١٧٥/٢٠٢٤)
  // ← ٤. الجدولة والأقساط ← ٥. التنبيهات والإنذارات ← ٦. الرقابة والمتابعة ← ٧. المخابز المتأخرة
  // ← ٨. السداد والمدفوعات ← ٩. التقارير والإحصائيات (٣٦) ← ١٠. سجل التدقيق ← ١١. إعدادات القسم
  const navItems: { id: ModuleTabId; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'dashboard', label: '١. لوحة التحكم', icon: LayoutDashboard },
    { id: 'major_debts', label: '٢. المديونيات الكبرى والمتابعة المالية', icon: Wallet, badge: openDebtsCount },
    { id: 'registry', label: '٣. سجل المديونيات وأرقام POS', icon: Table2, badge: openDebtsCount },
    { id: 'calculator', label: '٤. حاسبة نقص الوزن والمخالفات (١٧٥/٢٠٢٤)', icon: Calculator, badge: store.violations.length },
    { id: 'scheduling', label: '٥. الجدولة والأقساط', icon: CalendarClock },
    { id: 'alerts', label: '٦. التنبيهات والتجديد المالي', icon: BellRing, badge: unreadAlertsCount },
    { id: 'followups', label: '٧. المتابعة والإنذارات الرسمية', icon: PhoneCall },
    { id: 'late', label: '٨. المخابز المتأخرة والمخاطر', icon: AlertTriangle, badge: lateBakeriesCount },
    { id: 'payments', label: '٩. السداد والمدفوعات والإيصالات', icon: CreditCard },
    { id: 'reports', label: '١٠. التقارير والإحصائيات (٣٦)', icon: FileSpreadsheet },
    { id: 'audit', label: '١١. سجل التدقيق المالي', icon: History },
    { id: 'settings', label: '١٢. إعدادات القسم', icon: Settings2 },
  ];

  // المجموعات الست المتطابقة بصرياً وهيكليةً مع BakeryNavigationGrid في منظومة إدارة المخابز
  const debtNavGroups: {
    id: string;
    title: string;
    groupIcon: React.ElementType;
    headerBg: string;
    borderAccent: string;
    activeBg: string;
    iconAccent: string;
    items: {
      id: string;
      label: string;
      tab?: ModuleTabId;
      action?: () => void;
      icon: React.ElementType;
      badgeCount?: number;
    }[];
  }[] = [
    {
      id: 'basic',
      title: '١. إدارة المديونيات والبيانات الأساسية',
      groupIcon: Landmark,
      headerBg: 'bg-[#102A43] text-white',
      borderAccent: 'border-[#102A43]/25',
      activeBg: 'bg-[#102A43] text-white',
      iconAccent: 'text-[#102A43]',
      items: [
        { id: 'g1-dash', label: 'لوحة التحكم', tab: 'dashboard', icon: LayoutDashboard },
        { id: 'g1-major', label: 'المديونيات الكبرى', tab: 'major_debts', icon: Wallet, badgeCount: openDebtsCount },
        { id: 'g1-reg', label: 'سجل المديونيات وPOS', tab: 'registry', icon: Table2, badgeCount: openDebtsCount },
      ],
    },
    {
      id: 'quotas_calc',
      title: '٢. الحصص التأمينية وحاسبة الوزن (١٧٥/٢٠٢٤)',
      groupIcon: Wheat,
      headerBg: 'bg-[#164E83] text-white',
      borderAccent: 'border-[#164E83]/25',
      activeBg: 'bg-[#164E83] text-white',
      iconAccent: 'text-[#164E83]',
      items: [
        { id: 'g2-calc', label: 'حاسبة نقص الوزن', tab: 'calculator', icon: Calculator },
        { id: 'g2-viols', label: 'سجل المخالفات', tab: 'calculator', icon: Scale, badgeCount: store.violations.length },
        { id: 'g2-rules', label: 'القرار ١٧٥/٢٠٢٤', tab: 'calculator', icon: FileBadge },
      ],
    },
    {
      id: 'schedules_alerts',
      title: '٣. الجدولة والأقساط والتنبيهات',
      groupIcon: FileBadge,
      headerBg: 'bg-emerald-900 text-white',
      borderAccent: 'border-emerald-900/25',
      activeBg: 'bg-emerald-900 text-white',
      iconAccent: 'text-emerald-800',
      items: [
        { id: 'g3-sched', label: 'خطط الجدولة', tab: 'scheduling', icon: CalendarClock },
        { id: 'g3-alerts', label: 'التنبيهات الذكية', tab: 'alerts', icon: BellRing, badgeCount: unreadAlertsCount },
        { id: 'g3-late', label: 'المخابز المتأخرة', tab: 'late', icon: AlertTriangle, badgeCount: lateBakeriesCount },
      ],
    },
    {
      id: 'inspection_followups',
      title: '٤. الرقابة والمتابعة والإنذارات',
      groupIcon: ShieldAlert,
      headerBg: 'bg-amber-900 text-white',
      borderAccent: 'border-amber-900/25',
      activeBg: 'bg-amber-900 text-white',
      iconAccent: 'text-amber-800',
      items: [
        { id: 'g4-flw', label: 'متابعة المخابز', tab: 'followups', icon: PhoneCall },
        { id: 'g4-warn', label: 'الإنذارات الرسمية', tab: 'alerts', icon: AlertTriangle },
        { id: 'g4-calc', label: 'غرامات الرقابة', tab: 'calculator', icon: Scale },
      ],
    },
    {
      id: 'financial_payments',
      title: '٥. المديونيات والحسابات المالية',
      groupIcon: Wallet,
      headerBg: 'bg-red-900 text-white',
      borderAccent: 'border-red-900/25',
      activeBg: 'bg-red-900 text-white',
      iconAccent: 'text-red-800',
      items: [
        { id: 'g5-debts', label: 'المديونيات', tab: 'registry', icon: Wallet },
        { id: 'g5-pay', label: 'السداد والمدفوعات', tab: 'payments', icon: CreditCard },
        {
          id: 'g5-stmt',
          label: 'كشف حساب مخبز',
          action: () => setProfileBakeryId(selectedStatementBakeryId || bakeries[0]?.id || null),
          icon: BookOpenText,
        },
      ],
    },
    {
      id: 'reports_admin',
      title: '٦. التقارير والإحصائيات والإدارة',
      groupIcon: FolderKanban,
      headerBg: 'bg-indigo-950 text-white',
      borderAccent: 'border-indigo-900/25',
      activeBg: 'bg-indigo-950 text-white',
      iconAccent: 'text-indigo-800',
      items: [
        { id: 'g6-rep', label: 'التقارير (٣٦)', tab: 'reports', icon: FileSpreadsheet },
        { id: 'g6-aud', label: 'سجل التدقيق', tab: 'audit', icon: History },
        { id: 'g6-set', label: 'إعدادات القسم', tab: 'settings', icon: Settings2 },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {/* رأس منظومة المديونيات وحاسبة المخالفات — متطابق مع رأس منظومة إدارة المخابز */}
      <div className="bg-[#102A43] text-white rounded-2xl p-5 shadow-md border border-[#164E83] space-y-3 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#C6A15B] font-extrabold mb-1">
              <span>محافظة الغربية</span>
              <span>·</span>
              <span>مديرية التموين والتجارة الداخلية بالغربية</span>
              <span>·</span>
              <span>إدارة تموين مركز المحلة الكبرى</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black flex items-center gap-2 text-white">
              <Wallet className="w-5 h-5 text-[#C6A15B]" />
              منظومة إدارة مديونيات أصحاب المخابز وحاسبة المخالفات التموينية (قرار ١٧٥ لسنة ٢٠٢٤)
            </h2>
            <p className="text-[11px] font-bold text-slate-200 mt-0.5">
              مربوطة ديناميكياً بسجل بيانات المخابز وأرقام ماكينات POS والحصص التأمينية وكشوف الحسابات
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-black shrink-0">
            <span className="px-3 py-2 rounded-xl bg-white/10 border border-white/15">
              إجمالي الصافي: <span className="num-cell text-[#C6A15B]">{formatArabicCurrency(recomputedDebts.filter((d) => d.approvalStatus === 'معتمد').reduce((s, d) => s + d.netDueAmount, 0))}</span>
            </span>
            <span className="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30">
              المتبقي المفتوح: <span className="num-cell text-amber-200">{formatArabicCurrency(recomputedDebts.filter((d) => d.approvalStatus === 'معتمد').reduce((s, d) => s + d.remainingAmount, 0))}</span>
            </span>
            <button
              type="button"
              onClick={() => setProfileBakeryId(selectedStatementBakeryId || bakeries[0]?.id || null)}
              className="px-3.5 py-2 rounded-xl bg-[#C6A15B] hover:bg-[#b58f48] text-[#102A43] font-black flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <BookOpenText className="w-4 h-4" />
              <span>كشف حساب مخبز (POS)</span>
            </button>
          </div>
        </div>

        {/* شريط التبويبات المرتب بنفس التسلسل المنطقي لمنظومة إدارة المخابز */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-white/15 pb-1">
          {navItems.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-black text-[11px] whitespace-nowrap flex items-center gap-1.5 cursor-pointer transition-all ${
                  active
                    ? 'bg-[#C6A15B] text-[#102A43] shadow-sm'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge && tab.badge > 0 ? (
                  <span
                    className={`num-cell px-1.5 py-0.5 rounded-full text-[9.5px] leading-none font-black ${
                      active ? 'bg-[#102A43] text-[#C6A15B]' : 'bg-red-600 text-white'
                    }`}
                  >
                    {toArabicNumerals(tab.badge)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* شبكة المجموعات الست المتطابقة مع منظومة إدارة المخابز الأساسية */}
      <nav
        aria-label="أقسام منظومة إدارة مديونيات أصحاب المخابز"
        className="bg-white rounded-2xl p-2.5 shadow-xs border border-slate-200 space-y-2 print:hidden"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-black text-[#102A43]">
              الوصول السريع لوظائف منظومة إدارة مديونيات أصحاب المخابز
            </span>
            <span className="text-[11px] font-extrabold text-slate-600">
              ({toArabicNumerals(6)} مجموعات متطابقة مع منظومة إدارة المخابز)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1 rounded-lg text-[11.5px] font-black flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'dashboard'
                  ? 'bg-[#C6A15B] text-[#102A43] border-[#C6A15B]'
                  : 'bg-[#102A43] text-white border-[#102A43]'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>لوحة التحكم</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('registry')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'registry'
                  ? 'bg-[#164E83] text-white border-[#164E83]'
                  : 'bg-[#F4F7FB] text-[#102A43] border-slate-300'
              }`}
            >
              <Table2 className="w-3.5 h-3.5 text-[#164E83]" />
              <span>سجل المديونيات وPOS</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('calculator')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'calculator'
                  ? 'bg-emerald-800 text-white border-emerald-800'
                  : 'bg-emerald-700 text-white border-emerald-700'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>حاسبة نقص الوزن (١٧٥/٢٠٢٤)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('payments')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'payments'
                  ? 'bg-teal-800 text-white border-teal-800'
                  : 'bg-teal-50 text-teal-900 border-teal-200'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>تسجيل سداد</span>
            </button>
            <FactoryResetButton
              sectionName="منظومة مديونيات أصحاب المخابز"
              compact
              onConfirmReset={() => {
                updateStore((prev) => ({
                  ...prev,
                  debts: [],
                  payments: [],
                  schedules: [],
                  installments: [],
                  settlements: [],
                  violations: [],
                  appeals: [],
                  followups: [],
                  auditLogs: [],
                  majorDebtFollowups: [],
                }));
                notify('تم تنفيذ إعادة ضبط المصنع ومسح جميع المديونيات والسدادات والأقساط والمخالفات بنجاح.');
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {debtNavGroups.map((group) => {
            const GroupIcon = group.groupIcon;
            return (
              <div
                key={group.id}
                className={`rounded-xl border ${group.borderAccent} bg-[#FAFBFD] overflow-hidden flex flex-col`}
              >
                <div className={`px-2.5 py-1.5 text-[11px] font-black flex items-center justify-between ${group.headerBg}`}>
                  <span className="flex items-center gap-1.5 truncate">
                    <GroupIcon className="w-3.5 h-3.5 text-[#C6A15B] shrink-0" />
                    <span className="truncate">{group.title}</span>
                  </span>
                  <span className="text-[10px] font-extrabold opacity-90 shrink-0">
                    {toArabicNumerals(group.items.length)} وظائف
                  </span>
                </div>
                <div className="p-1.5 grid grid-cols-3 gap-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isSelected = item.tab ? activeTab === item.tab : false;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (item.action) item.action();
                          else if (item.tab) setActiveTab(item.tab);
                        }}
                        className={`px-2 py-1 rounded-lg text-[10.5px] font-extrabold transition-all flex items-center justify-between gap-1 text-right cursor-pointer border ${
                          isSelected
                            ? `${group.activeBg} border-transparent shadow-xs`
                            : 'bg-white text-[#102A43] border-slate-200/90 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <span className="flex items-center gap-1 min-w-0">
                          <Icon
                            className={`w-3 h-3 shrink-0 ${
                              isSelected ? 'text-[#C6A15B]' : group.iconAccent
                            }`}
                          />
                          <span className="truncate leading-tight">{item.label}</span>
                        </span>
                        {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
                          <span
                            className={`num-cell px-1.5 py-0.5 rounded text-[9.5px] font-black shrink-0 ${
                              isSelected ? 'bg-[#C6A15B] text-[#102A43]' : 'bg-red-700 text-white'
                            }`}
                          >
                            {toArabicNumerals(item.badgeCount)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      {/* إشعار Toast غير حاجز */}
      {toast && (
        <div
          className={`p-3 rounded-xl font-black text-[11.5px] flex items-center justify-between shadow-sm ${
            toast.type === 'ok'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-950'
              : 'bg-red-50 border border-red-300 text-red-950'
          }`}
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {toast.msg}
          </span>
          <button type="button" onClick={() => setToast(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* محتوى التبويب النشط */}
      {activeTab === 'dashboard' && (
        <DebtsDashboardTab
          userId={userId}
          bakeries={bakeries}
          debts={recomputedDebts}
          payments={enrichedPayments}
          installments={recomputedInstallments}
          todayRef={todayRef}
          onOpenBakeryProfile={(id) => setProfileBakeryId(id)}
          onNavigateTab={(t) => setActiveTab(t as ModuleTabId)}
        />
      )}

      {activeTab === 'major_debts' && (
        <MajorDebtsFollowupTab
          userId={userId}
          currentUserName={currentUserName}
          bakeries={bakeries}
          debts={recomputedDebts}
          payments={enrichedPayments}
          schedules={store.schedules}
          installments={recomputedInstallments}
          settings={store.settings}
          todayRef={todayRef}
          onCreateSchedulePlan={handleCreateSchedulePlan}
          onRegisterPayment={handleRegisterPayment}
          onOpenBakeryProfile={(id) => setProfileBakeryId(id)}
        />
      )}

      {activeTab === 'registry' && (
        <DebtsRegistryTab
          userId={userId}
          currentUserName={currentUserName}
          bakeries={bakeries}
          debts={recomputedDebts}
          items={store.items}
          settlements={store.settlements}
          settings={store.settings}
          todayRef={todayRef}
          onCreateDebt={handleCreateDebt}
          onChangeApproval={handleChangeApproval}
          onApplySettlement={handleApplySettlement}
          onSaveFavoriteFilter={(fav) =>
            updateStore((prev) => ({
              ...prev,
              settings: { ...prev.settings, favoriteFilters: [...prev.settings.favoriteFilters, fav] },
            }))
          }
          onOpenBakeryProfile={(id) => setProfileBakeryId(id)}
          onOpenPayModal={(debt) => {
            setPayModalDebt(debt);
            setActiveTab('payments');
          }}
          onOpenScheduleModal={(debt) => {
            setScheduleModalDebt(debt);
            setActiveTab('scheduling');
          }}
        />
      )}

      {activeTab === 'calculator' && (
        <ViolationsCalculatorTab
          userId={userId}
          currentUserName={currentUserName}
          bakeries={bakeries}
          rules={store.rules}
          legalVersions={store.legalVersions}
          violations={store.violations}
          appeals={store.appeals}
          debts={recomputedDebts}
          settings={store.settings}
          todayRef={todayRef}
          onSaveViolation={handleSaveViolation}
          onChangeViolationStatus={handleChangeViolationStatus}
          onLinkViolationToDebt={handleLinkViolationToDebt}
          onSaveRuleVersion={handleSaveRuleVersion}
          onToggleRuleActive={(ruleId) =>
            updateStore((prev) => ({
              ...prev,
              rules: prev.rules.map((r) => (r.id === ruleId ? { ...r, isActive: !r.isActive } : r)),
            }))
          }
          onAddAppeal={(payload) => {
            const appealNumber = `APL-2026-${String(store.appeals.length + 1).padStart(3, '0')}`;
            updateStore((prev) => ({
              ...prev,
              appeals: [{ ...payload, id: `app-${Date.now()}`, appealNumber }, ...prev.appeals],
              auditLogs: appendAudit(prev, 'تسجيل تظلم', appealNumber, '—', payload.violationNumber, payload.reason),
            }));
            notify('تم قيد التظلم للمراجعة.');
          }}
          onDecideAppeal={(appealId, decisionStatus, adjustedAmount, decisionNotes) =>
            updateStore((prev) => ({
              ...prev,
              appeals: prev.appeals.map((a) =>
                a.id === appealId
                  ? { ...a, decisionStatus, adjustedAmount, decisionNotes, decidedBy: currentUserName }
                  : a
              ),
            }))
          }
          onOpenBakeryProfile={(id) => setProfileBakeryId(id)}
        />
      )}

      {activeTab === 'payments' && (
        <DebtsPaymentsTab
          userId={userId}
          currentUserName={currentUserName}
          debts={recomputedDebts}
          payments={enrichedPayments}
          installments={recomputedInstallments}
          settings={store.settings}
          todayRef={todayRef}
          initialPayDebt={payModalDebt}
          onClearInitialPayDebt={() => setPayModalDebt(null)}
          onRegisterPayment={handleRegisterPayment}
          onCancelPayment={handleCancelPayment}
          onOpenBakeryProfile={(id) => setProfileBakeryId(id)}
        />
      )}

      {activeTab === 'scheduling' && (
        <DebtsSchedulingTab
          userId={userId}
          currentUserName={currentUserName}
          debts={recomputedDebts}
          schedules={store.schedules}
          installments={recomputedInstallments}
          settings={store.settings}
          todayRef={todayRef}
          initialScheduleDebt={scheduleModalDebt}
          onClearInitialScheduleDebt={() => setScheduleModalDebt(null)}
          onCreateSchedulePlan={handleCreateSchedulePlan}
          onPostponeInstallment={handlePostponeInstallment}
          onPayInstallmentShortcut={(debt) => {
            setPayModalDebt(debt);
            setActiveTab('payments');
          }}
          onOpenBakeryProfile={(id) => setProfileBakeryId(id)}
        />
      )}

      {(activeTab === 'alerts' || activeTab === 'late' || activeTab === 'followups') && (
        <DebtsAlertsAndLateTab
          mode={activeTab}
          userId={userId}
          currentUserName={currentUserName}
          debts={recomputedDebts}
          installments={recomputedInstallments}
          alerts={computedAlerts}
          followups={store.followups}
          settings={store.settings}
          todayRef={todayRef}
          onUpdateSettings={(partial: Partial<DebtModuleSettings>) =>
            updateStore((prev) => ({
              ...prev,
              settings: { ...prev.settings, ...partial },
            }))
          }
          onMarkAlertRead={(alertId) =>
            updateStore((prev) => ({
              ...prev,
              settings: {
                ...prev.settings,
                readNotificationIds: Array.from(new Set([...prev.settings.readNotificationIds, alertId])),
              },
            }))
          }
          onSnoozeAlert={(targetId, untilDate, reason) =>
            updateStore((prev) => ({
              ...prev,
              settings: {
                ...prev.settings,
                snoozedAlerts: {
                  ...prev.settings.snoozedAlerts,
                  [targetId]: { untilDate, reason, approvedBy: currentUserName },
                },
              },
            }))
          }
          onAddFollowup={handleAddFollowup}
          onOpenBakeryProfile={(id) => setProfileBakeryId(id)}
          onOpenPayModal={(debt) => {
            setPayModalDebt(debt);
            setActiveTab('payments');
          }}
          onOpenScheduleModal={(debt) => {
            setScheduleModalDebt(debt);
            setActiveTab('scheduling');
          }}
        />
      )}

      {(activeTab === 'reports' || activeTab === 'settings' || activeTab === 'audit') && (
        <DebtsReportsAndSettingsTab
          mode={activeTab}
          userId={userId}
          currentUserName={currentUserName}
          bakeries={bakeries}
          debts={recomputedDebts}
          payments={enrichedPayments}
          schedules={store.schedules}
          installments={recomputedInstallments}
          followups={store.followups}
          violations={store.violations}
          appeals={store.appeals}
          rules={store.rules}
          auditLogs={store.auditLogs}
          settings={store.settings}
          todayRef={todayRef}
          onUpdateSettings={(partial) =>
            updateStore((prev) => ({
              ...prev,
              settings: { ...prev.settings, ...partial },
              auditLogs: appendAudit(prev, 'تغيير إعدادات النظام', 'SETTINGS', 'إعدادات سابقة', 'تحديث الإعدادات المالية', 'تعديل من لوحة الإعدادات'),
            }))
          }
          onExportFullBackup={() => {
            if (typeof window === 'undefined') return;
            const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `نسخة_احتياطية_مديونيات_ومخالفات_${todayRef}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            notify('تم تصدير النسخة الاحتياطية الكاملة بنجاح.');
          }}
        />
      )}

      {/* الملف المالي الموحد للمخبز (13 تبويباً) عند النقر على اسم المخبز أو رقم POS */}
      <BakeryFinancialProfileModal
        bakery={profileBakery}
        onClose={() => setProfileBakeryId(null)}
        currentUserName={currentUserName}
        todayRef={todayRef}
        debts={recomputedDebts}
        items={store.items}
        payments={store.payments}
        schedules={store.schedules}
        installments={recomputedInstallments}
        followups={store.followups}
        settlements={store.settlements}
        alerts={computedAlerts}
        violations={store.violations}
        appeals={store.appeals}
        auditLogs={store.auditLogs}
      />
    </div>
  );
}
