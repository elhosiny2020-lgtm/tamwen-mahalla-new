'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  BookOpen,
  Building2,
  CheckCircle2,
  Landmark,
  Lock,
  Plus,
  RotateCcw,
  Scale,
  ShieldCheck,
  Unlock,
  Wallet,
} from 'lucide-react';
import type { Branch } from '@/types';
import {
  ACCOUNT_TYPE_LABELS,
  AccountType,
  BudgetAllocation,
  BudgetCommitment,
  ChartAccount,
  checkSegregationOfDuties,
  computeBudgetMetrics,
  computeTrialBalance,
  ENTRY_STATUS_LABELS,
  evaluatePeriodClosingReadiness,
  FinancialErpState,
  FinancialRoleId,
  JOURNAL_ENTRY_TYPE_LABELS,
  JournalEntry,
  JournalEntryLine,
  JournalEntryType,
  round2,
  validateJournalEntry,
} from '@/lib/financial-erp-engine';
import { appendFinancialAudit, buildReviewableDraftSubAccounts } from '@/lib/financial-erp-store';
import { formatArabicNumber, toArabicNumerals } from '@/lib/utils';

export interface CorePanelsProps {
  activeSubTab: 'coa' | 'journal' | 'budget' | 'treasury';
  state: FinancialErpState;
  onUpdateState: (next: FinancialErpState) => void;
  branches: Branch[];
  actorName: string;
  actorRole: FinancialRoleId;
  branchFilter: string;
  periodFilter: string;
  onNotify: (msg: string) => void;
}

export default function FinancialCorePanels({
  activeSubTab,
  state,
  onUpdateState,
  branches,
  actorName,
  actorRole,
  branchFilter,
  periodFilter,
  onNotify,
}: CorePanelsProps) {
  // === COA & Cost Centers & Periods State ===
  const [coaCode, setCoaCode] = useState('');
  const [coaNameAr, setCoaNameAr] = useState('');
  const [coaNameEn, setCoaNameEn] = useState('');
  const [coaType, setCoaType] = useState<AccountType>('assets');
  const [coaParentId, setCoaParentId] = useState('coa-g-1');
  const [coaIsGroup, setCoaIsGroup] = useState(false);

  const [ccCode, setCcCode] = useState('');
  const [ccNameAr, setCcNameAr] = useState('');
  const [ccLevel, setCcLevel] = useState<'administration' | 'department' | 'branch' | 'unit' | 'project'>('unit');
  const [ccBranchId, setCcBranchId] = useState('b-11');
  const [reopenReason, setReopenReason] = useState('');

  // === Journal Builder State ===
  const [journalSubView, setJournalSubView] = useState<'list' | 'create' | 'review' | 'gl'>('list');
  const [jeDate, setJeDate] = useState('2026-07-15');
  const [jePeriodId, setJePeriodId] = useState(state.periods[0]?.id || 'fp-2026-07');
  const [jeType, setJeType] = useState<JournalEntryType>('journal');
  const [jeDocNo, setJeDocNo] = useState('');
  const [jeDesc, setJeDesc] = useState('');
  const [jeBranchId, setJeBranchId] = useState('b-11');
  const [jeDeptCode, setJeDeptCode] = useState('FIN');
  const [jeCostCenterId, setJeCostCenterId] = useState(state.costCenters[0]?.id || '');
  const [jeLines, setJeLines] = useState<JournalEntryLine[]>([
    { id: 'ln-1', accountId: '', description: '', debit: 0, credit: 0 },
    { id: 'ln-2', accountId: '', description: '', debit: 0, credit: 0 },
  ]);
  const [jeErrors, setJeErrors] = useState<string[]>([]);
  const [glAccountFilter, setGlAccountFilter] = useState<string>('all');

  // === Budget State ===
  const [bgtCode, setBgtCode] = useState('');
  const [bgtTitle, setBgtTitle] = useState('');
  const [bgtAccountId, setBgtAccountId] = useState('');
  const [bgtBranchId, setBgtBranchId] = useState('b-11');
  const [bgtAmount, setBgtAmount] = useState('');
  const [bgtDocRef, setBgtDocRef] = useState('');

  const [comAllocId, setComAllocId] = useState('');
  const [comDesc, setComDesc] = useState('');
  const [comAmount, setComAmount] = useState('');

  const [expAllocId, setExpAllocId] = useState('');
  const [expCommitId, setExpCommitId] = useState('');
  const [expDoc, setExpDoc] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');

  // === Treasury & Reconciliation State ===
  const [trKind, setTrKind] = useState<'cashbox' | 'bank'>('cashbox');
  const [trCode, setTrCode] = useState('');
  const [trName, setTrName] = useState('');
  const [trBankName, setTrBankName] = useState('');
  const [trGlAccountId, setTrGlAccountId] = useState('');
  const [trCustodian, setTrCustodian] = useState('');

  const [txAccountId, setTxAccountId] = useState('');
  const [txType, setTxType] = useState<'receipt' | 'payment' | 'deposit' | 'withdrawal' | 'transfer' | 'cheque' | 'payment_order' | 'custody'>('receipt');
  const [txCounterparty, setTxCounterparty] = useState('');
  const [txDocNo, setTxDocNo] = useState('');
  const [txMethod, setTxMethod] = useState<'نقدي' | 'شيك' | 'أمر دفع إلكتروني' | 'تحويل بنكي'>('أمر دفع إلكتروني');
  const [txAmount, setTxAmount] = useState('');

  const [recBankId, setRecBankId] = useState('');
  const [recStmtBal, setRecStmtBal] = useState('');
  const [recBookBal, setRecBookBal] = useState('');
  const [recOutCheques, setRecOutCheques] = useState('0');
  const [recDepositsTransit, setRecDepositsTransit] = useState('0');
  const [recBankCharges, setRecBankCharges] = useState('0');
  const [recNotes, setRecNotes] = useState('');

  const postingAccounts = useMemo(
    () => state.accounts.filter((a) => !a.isGroup && a.allowPosting && a.status === 'active'),
    [state.accounts]
  );

  const trialBalance = useMemo(
    () =>
      computeTrialBalance(state.accounts, state.journalEntries, {
        periodId: periodFilter !== 'all' ? periodFilter : undefined,
        branchId: branchFilter,
      }),
    [state.accounts, state.journalEntries, periodFilter, branchFilter]
  );

  // ==================== HANDLERS: COA, PERIODS, COST CENTERS ====================
  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = coaCode.trim();
    if (!cleanCode || !coaNameAr.trim()) {
      onNotify('يرجى إدخال كود الحساب واسمه بالعربية.');
      return;
    }
    if (state.accounts.some((a) => a.code.toLowerCase() === cleanCode.toLowerCase())) {
      onNotify('مرفوض: كود الحساب مستخدم بالفعل — يُمنع تكرار أكواد الحسابات.');
      return;
    }
    const parent = state.accounts.find((a) => a.id === coaParentId);
    const newAcc: ChartAccount = {
      id: `coa-${Date.now()}`,
      code: cleanCode,
      nameAr: coaNameAr.trim(),
      nameEn: coaNameEn.trim() || cleanCode,
      parentId: parent?.id,
      level: parent ? parent.level + 1 : 2,
      type: coaType,
      normalBalance: ACCOUNT_TYPE_LABELS[coaType].normal,
      classification: coaIsGroup ? 'حساب تجميعي' : 'حساب تفصيلي قابل للترحيل',
      isGroup: coaIsGroup,
      allowPosting: !coaIsGroup,
      allowedEntryTypes: [],
      status: 'active',
      validFrom: '2026-07-01',
    };
    const next = appendFinancialAudit(
      { ...state, accounts: [...state.accounts, newAcc] },
      {
        actorName,
        actorRole,
        action: 'إضافة حساب بدليل الحسابات',
        entityType: 'chart_of_accounts',
        entityId: newAcc.id,
        afterSummary: `${newAcc.code} - ${newAcc.nameAr}`,
      }
    );
    onUpdateState(next);
    setCoaCode('');
    setCoaNameAr('');
    setCoaNameEn('');
    onNotify(`تمت إضافة الحساب (${newAcc.code} - ${newAcc.nameAr}) بنجاح.`);
  };

  const handleLoadDraftCoaTemplate = () => {
    const drafts = buildReviewableDraftSubAccounts();
    const existingCodes = new Set(state.accounts.map((a) => a.code));
    const toAdd = drafts.filter((d) => !existingCodes.has(d.code));
    if (toAdd.length === 0) {
      onNotify('مسودة الحسابات الاسترشادية مضافة بالفعل.');
      return;
    }
    const next = appendFinancialAudit(
      { ...state, accounts: [...state.accounts, ...toAdd] },
      {
        actorName,
        actorRole,
        action: 'تحميل مسودة حسابات استرشادية للمراجعة (غير معتمدة رسمياً)',
        entityType: 'chart_of_accounts',
        entityId: 'draft-template',
        afterSummary: `أُضيف ${toAdd.length} حساباً بحالة قيد المراجعة (DRAFT-*)`,
      }
    );
    onUpdateState(next);
    onNotify(`تمت إضافة ${toArabicNumerals(toAdd.length)} حسابات مسودة بحالة «قيد المراجعة». يجب مراجعة الأكواد وتفعيلها قبل الترحيل.`);
  };

  const handleToggleAccountStatus = (acc: ChartAccount) => {
    const hasPostedUsage = state.journalEntries.some(
      (je) => je.status === 'posted' && je.lines.some((l) => l.accountId === acc.id)
    );
    const nextStatus: ChartAccount['status'] =
      acc.status === 'active' ? 'inactive' : 'active';
    if (nextStatus === 'inactive' && hasPostedUsage) {
      // Allowed to deactivate to prevent future postings while keeping historical ledger intact
    }
    const updated = state.accounts.map((a) => (a.id === acc.id ? { ...a, status: nextStatus } : a));
    onUpdateState(
      appendFinancialAudit(
        { ...state, accounts: updated },
        {
          actorName,
          actorRole,
          action: nextStatus === 'active' ? 'اعتماد وتفعيل حساب للترحيل' : 'إيقاف حساب عن الترحيل',
          entityType: 'chart_of_accounts',
          entityId: acc.id,
          beforeSummary: acc.status,
          afterSummary: nextStatus,
        }
      )
    );
    onNotify(
      nextStatus === 'active'
        ? `تم تفعيل الحساب (${acc.code}) للترحيل.`
        : `تم إيقاف الحساب (${acc.code}) ومنع الترحيل عليه.`
    );
  };

  const handleActivateAllDraftAccounts = () => {
    const pendingCount = state.accounts.filter((a) => a.status === 'pending_review').length;
    if (pendingCount === 0) {
      onNotify('لا توجد حسابات بانتظار المراجعة.');
      return;
    }
    const updated = state.accounts.map((a) =>
      a.status === 'pending_review' ? { ...a, status: 'active' as const } : a
    );
    onUpdateState(
      appendFinancialAudit(
        { ...state, accounts: updated },
        {
          actorName,
          actorRole,
          action: 'اعتماد وتفعيل جميع الحسابات المراجعة',
          entityType: 'chart_of_accounts',
          entityId: 'bulk-activate',
          afterSummary: `تفعيل ${pendingCount} حساب`,
        }
      )
    );
    onNotify(`تم اعتماد وتفعيل ${toArabicNumerals(pendingCount)} حساباً للترحيل المحاسبي.`);
  };

  const handleAddCostCenter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ccCode.trim() || !ccNameAr.trim()) return;
    if (state.costCenters.some((c) => c.code.toLowerCase() === ccCode.trim().toLowerCase())) {
      onNotify('كود مركز التكلفة مستخدم بالفعل.');
      return;
    }
    const cc = {
      id: `cc-${Date.now()}`,
      code: ccCode.trim(),
      nameAr: ccNameAr.trim(),
      parentId: 'cc-hq',
      levelType: ccLevel,
      branchId: ccBranchId,
      isActive: true,
    };
    onUpdateState(
      appendFinancialAudit(
        { ...state, costCenters: [...state.costCenters, cc] },
        {
          actorName,
          actorRole,
          action: 'إضافة مركز تكلفة',
          entityType: 'cost_centers',
          entityId: cc.id,
          afterSummary: `${cc.code} - ${cc.nameAr}`,
        }
      )
    );
    setCcCode('');
    setCcNameAr('');
    onNotify('تمت إضافة مركز التكلفة بنجاح.');
  };

  const handleCloseOrReopenPeriod = (periodId: string, action: 'close' | 'reopen') => {
    const period = state.periods.find((p) => p.id === periodId);
    if (!period) return;
    if (action === 'close') {
      const check = evaluatePeriodClosingReadiness(period, state.journalEntries, state.bankReconciliations);
      if (!check.canClose) {
        onNotify(`تعذر إقفال الفترة: ${check.blockers.join(' — ')}`);
        return;
      }
      const updated = state.periods.map((p) =>
        p.id === periodId
          ? { ...p, status: 'closed' as const, closedBy: actorName, closedAt: new Date().toISOString() }
          : p
      );
      onUpdateState(
        appendFinancialAudit(
          { ...state, periods: updated },
          {
            actorName,
            actorRole,
            action: 'إقفال فترة محاسبية',
            entityType: 'financial_periods',
            entityId: periodId,
            afterSummary: `تم إقفال ${period.nameAr}`,
          }
        )
      );
      onNotify(`تم إقفال ${period.nameAr} بنجاح ومنع أي ترحيل جديد بها.`);
    } else {
      if (!reopenReason.trim()) {
        onNotify('يلزم كتابة سبب رسمي موثق لإعادة فتح الفترة المغلقة بصلاحية استثنائية.');
        return;
      }
      const updated = state.periods.map((p) =>
        p.id === periodId
          ? { ...p, status: 'reopened_exception' as const, reopenReason: reopenReason.trim() }
          : p
      );
      onUpdateState(
        appendFinancialAudit(
          { ...state, periods: updated },
          {
            actorName,
            actorRole,
            action: 'إعادة فتح فترة مغلقة بصلاحية استثنائية',
            entityType: 'financial_periods',
            entityId: periodId,
            reason: reopenReason.trim(),
          }
        )
      );
      setReopenReason('');
      onNotify(`تمت إعادة فتح ${period.nameAr} استثنائياً وتوثيق السبب في سجل التدقيق.`);
    }
  };

  // ==================== HANDLERS: JOURNAL ENTRIES ====================
  const handleCreateJournalEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const idempotencyKey = `manual:${jeDocNo.trim()}`;
    const check = validateJournalEntry(
      {
        entryDate: jeDate,
        periodId: jePeriodId,
        entryType: jeType,
        documentNumber: jeDocNo,
        idempotencyKey,
        description: jeDesc,
        lines: jeLines,
      },
      state.accounts,
      state.journalEntries,
      state.periods
    );

    if (!check.valid) {
      setJeErrors(check.errors);
      onNotify('تعذر حفظ القيد: يرجى مراجعة أخطاء القيد المزدوج الموضحة.');
      return;
    }

    setJeErrors([]);
    const seq = state.journalEntries.length + 1;
    const newEntry: JournalEntry = {
      id: `je-${Date.now()}`,
      entryNumber: `JE-2026-${String(seq).padStart(4, '0')}`,
      entryDate: jeDate,
      periodId: jePeriodId,
      entryType: jeType,
      sourceModule: 'manual',
      documentNumber: jeDocNo.trim(),
      idempotencyKey,
      description: jeDesc.trim(),
      branchId: jeBranchId,
      departmentCode: jeDeptCode,
      costCenterId: jeCostCenterId || undefined,
      currency: 'EGP',
      lines: jeLines.map((l) => ({ ...l })),
      totalDebit: check.totalDebit,
      totalCredit: check.totalCredit,
      status: 'draft',
      createdBy: actorName,
      createdAt: new Date().toISOString(),
    };

    onUpdateState(
      appendFinancialAudit(
        { ...state, journalEntries: [newEntry, ...state.journalEntries] },
        {
          actorName,
          actorRole,
          action: 'إنشاء قيد يومية (مسودة)',
          entityType: 'journal_entries',
          entityId: newEntry.id,
          documentNumber: newEntry.documentNumber,
          afterSummary: `${newEntry.entryNumber} بمبلغ ${newEntry.totalDebit} ج.م`,
          approvalStatus: 'draft',
        }
      )
    );
    setJeDocNo('');
    setJeDesc('');
    setJeLines([
      { id: `ln-${Date.now()}-1`, accountId: '', description: '', debit: 0, credit: 0 },
      { id: `ln-${Date.now()}-2`, accountId: '', description: '', debit: 0, credit: 0 },
    ]);
    setJournalSubView('review');
    onNotify(`تم تسجيل القيد (${newEntry.entryNumber}) كمسودة متوازنة وبانتظار المراجعة والاعتماد.`);
  };

  const handleTransitionEntry = (entry: JournalEntry, action: 'review' | 'approve' | 'post' | 'cancel') => {
    if (entry.status === 'posted') {
      onNotify('ممنوع: القيد المرحّل غير قابل للتعديل أو الحذف. استخدم «إنشاء قيد عكسي» للتصحيح.');
      return;
    }

    if (action !== 'cancel') {
      const sod = checkSegregationOfDuties({
        action,
        actorName,
        actorRole,
        entry,
        enforced: state.policy.segregationOfDutiesEnforced,
      });
      if (!sod.allowed) {
        onNotify(sod.reason || 'غير مسموح وفق قواعد فصل الاختصاصات.');
        return;
      }

      if (action === 'post') {
        const recheck = validateJournalEntry(entry, state.accounts, state.journalEntries, state.periods);
        if (!recheck.valid) {
          onNotify(`تعذر الترحيل: ${recheck.errors.join(' — ')}`);
          return;
        }
      }
    }

    const nowIso = new Date().toISOString();
    const nextStatus =
      action === 'review'
        ? 'under_review'
        : action === 'approve'
        ? 'approved'
        : action === 'post'
        ? 'posted'
        : 'cancelled';

    const updated = state.journalEntries.map((je) => {
      if (je.id !== entry.id) return je;
      return {
        ...je,
        status: nextStatus as JournalEntry['status'],
        reviewedBy: action === 'review' ? actorName : je.reviewedBy,
        reviewedAt: action === 'review' ? nowIso : je.reviewedAt,
        approvedBy: action === 'approve' ? actorName : je.approvedBy,
        approvedAt: action === 'approve' ? nowIso : je.approvedAt,
        postedBy: action === 'post' ? actorName : je.postedBy,
        postedAt: action === 'post' ? nowIso : je.postedAt,
      };
    });

    onUpdateState(
      appendFinancialAudit(
        { ...state, journalEntries: updated },
        {
          actorName,
          actorRole,
          action: `تحديث حالة قيد يومية ← ${ENTRY_STATUS_LABELS[nextStatus]}`,
          entityType: 'journal_entries',
          entityId: entry.id,
          documentNumber: entry.documentNumber,
          beforeSummary: ENTRY_STATUS_LABELS[entry.status],
          afterSummary: ENTRY_STATUS_LABELS[nextStatus],
          approvalStatus: nextStatus,
        }
      )
    );
    onNotify(`تم تحديث القيد (${entry.entryNumber}) إلى «${ENTRY_STATUS_LABELS[nextStatus]}».`);
  };

  const handleCreateReversalEntry = (original: JournalEntry) => {
    const revKey = `reversal:${original.id}`;
    if (state.journalEntries.some((e) => e.idempotencyKey === revKey && e.status !== 'cancelled')) {
      onNotify('تم إنشاء قيد عكسي لهذا القيد بالفعل.');
      return;
    }
    const seq = state.journalEntries.length + 1;
    const revEntry: JournalEntry = {
      ...original,
      id: `je-rev-${Date.now()}`,
      entryNumber: `REV-2026-${String(seq).padStart(4, '0')}`,
      entryDate: new Date().toISOString().slice(0, 10),
      entryType: 'reversal',
      documentNumber: `REV-${original.documentNumber}`,
      idempotencyKey: revKey,
      description: `قيد عكسي موثق لتصحيح القيد ${original.entryNumber}: ${original.description}`,
      lines: original.lines.map((l, idx) => ({
        ...l,
        id: `rev-ln-${Date.now()}-${idx}`,
        debit: l.credit,
        credit: l.debit,
      })),
      status: 'draft',
      reversedEntryId: original.id,
      createdBy: actorName,
      reviewedBy: undefined,
      approvedBy: undefined,
      postedBy: undefined,
      createdAt: new Date().toISOString(),
    };
    onUpdateState(
      appendFinancialAudit(
        { ...state, journalEntries: [revEntry, ...state.journalEntries] },
        {
          actorName,
          actorRole,
          action: 'إنشاء قيد عكسي لتصحيح قيد مرحّل',
          entityType: 'journal_entries',
          entityId: revEntry.id,
          documentNumber: revEntry.documentNumber,
          afterSummary: `عكس القيد ${original.entryNumber}`,
        }
      )
    );
    onNotify(`تم إنشاء القيد العكسي (${revEntry.entryNumber}) كمسودة بانتظار الاعتماد والترحيل.`);
  };

  // ==================== HANDLERS: BUDGET & TREASURY ====================
  const handleAddBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(bgtAmount);
    if (!bgtCode.trim() || !bgtTitle.trim() || !bgtAccountId || !Number.isFinite(amt) || amt <= 0) {
      onNotify('يرجى استكمال بيانات بند الاعتماد المالي ومبلغ الاعتماد.');
      return;
    }
    const alloc: BudgetAllocation = {
      id: `bgt-${Date.now()}`,
      fiscalYearCode: state.policy.activeFiscalYearId,
      code: bgtCode.trim(),
      titleAr: bgtTitle.trim(),
      accountId: bgtAccountId,
      branchId: bgtBranchId,
      departmentCode: 'FIN',
      estimatedAmount: round2(amt),
      originalApprovedAmount: round2(amt),
      additionsTransfersIn: 0,
      reductionsTransfersOut: 0,
      status: 'approved',
      authorityDocRef: bgtDocRef.trim() || undefined,
    };
    onUpdateState(
      appendFinancialAudit(
        { ...state, budgetAllocations: [alloc, ...state.budgetAllocations] },
        {
          actorName,
          actorRole,
          action: 'تسجيل اعتماد مالي بالموازنة',
          entityType: 'budget_allocations',
          entityId: alloc.id,
          documentNumber: alloc.authorityDocRef,
          afterSummary: `${alloc.code}: ${alloc.originalApprovedAmount} ج.م`,
        }
      )
    );
    setBgtCode('');
    setBgtTitle('');
    setBgtAmount('');
    setBgtDocRef('');
    onNotify('تم تسجيل الاعتماد المالي بالموازنة بنجاح.');
  };

  const handleAddCommitment = (e: React.FormEvent) => {
    e.preventDefault();
    const alloc = state.budgetAllocations.find((a) => a.id === comAllocId);
    const amt = Number(comAmount);
    if (!alloc || !comDesc.trim() || !Number.isFinite(amt) || amt <= 0) {
      onNotify('يرجى اختيار بند الاعتماد وإدخال وصف ومبلغ الالتزام.');
      return;
    }
    const metrics = computeBudgetMetrics(alloc, state.budgetCommitments, state.budgetExpenses);
    if (amt > metrics.availableBalance && !state.policy.allowOverBudgetWithAuthorityDoc) {
      onNotify(
        `مرفوض: مبلغ الالتزام (${amt}) يتجاوز المتاح من الاعتماد (${metrics.availableBalance} ج.م). لا يسمح بتجاوز الاعتماد دون سند قانوني.`
      );
      return;
    }
    const commit: BudgetCommitment = {
      id: `com-${Date.now()}`,
      allocationId: alloc.id,
      commitmentNumber: `COM-${state.budgetCommitments.length + 1}`,
      description: comDesc.trim(),
      committedAmount: round2(amt),
      convertedToExpenseAmount: 0,
      status: 'reserved',
      createdBy: actorName,
      createdAt: new Date().toISOString(),
    };
    onUpdateState(
      appendFinancialAudit(
        { ...state, budgetCommitments: [commit, ...state.budgetCommitments] },
        {
          actorName,
          actorRole,
          action: 'حجز التزام مالي على اعتماد',
          entityType: 'budget_commitments',
          entityId: commit.id,
          afterSummary: `${commit.commitmentNumber}: ${commit.committedAmount} ج.م`,
        }
      )
    );
    setComDesc('');
    setComAmount('');
    onNotify('تم حجز الالتزام المالي وخصمه من المتاح للصرف.');
  };

  const handleAddBudgetExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const alloc = state.budgetAllocations.find((a) => a.id === expAllocId);
    const amt = Number(expAmount);
    if (!alloc || !expDoc.trim() || !expDesc.trim() || !Number.isFinite(amt) || amt <= 0) {
      onNotify('يرجى استكمال بيانات المصروف الفعلي ورقم المستند.');
      return;
    }
    const metrics = computeBudgetMetrics(alloc, state.budgetCommitments, state.budgetExpenses);
    // If expense is linked to an existing commitment, check against commitment open balance; else check available balance
    if (!expCommitId && amt > metrics.availableBalance && !state.policy.allowOverBudgetWithAuthorityDoc) {
      onNotify(
        `مرفوض: المصروف المستقل (${amt}) يتجاوز المتاح من الاعتماد (${metrics.availableBalance} ج.م).`
      );
      return;
    }

    const newExp = {
      id: `bexp-${Date.now()}`,
      allocationId: alloc.id,
      commitmentId: expCommitId || undefined,
      documentNumber: expDoc.trim(),
      description: expDesc.trim(),
      amount: round2(amt),
      expenseDate: new Date().toISOString().slice(0, 10),
      status: 'posted' as const,
    };

    const updatedCommits = state.budgetCommitments.map((c) => {
      if (c.id !== expCommitId) return c;
      const converted = round2(c.convertedToExpenseAmount + amt);
      return {
        ...c,
        convertedToExpenseAmount: converted,
        status: converted >= c.committedAmount ? ('fully_expensed' as const) : ('partially_expensed' as const),
      };
    });

    onUpdateState(
      appendFinancialAudit(
        {
          ...state,
          budgetCommitments: updatedCommits,
          budgetExpenses: [newExp, ...state.budgetExpenses],
        },
        {
          actorName,
          actorRole,
          action: expCommitId
            ? 'تحويل التزام محجوز إلى مصروف فعلي (بدون ازدواج خصم)'
            : 'تسجيل مصروف فعلي مباشر على اعتماد',
          entityType: 'budget_expenses',
          entityId: newExp.id,
          documentNumber: newExp.documentNumber,
          afterSummary: `${newExp.amount} ج.م`,
        }
      )
    );
    setExpDoc('');
    setExpDesc('');
    setExpAmount('');
    setExpCommitId('');
    onNotify('تم تسجيل المصروف الفعلي وتحديث نسبة التنفيذ والمتاح بدقة.');
  };

  const handleAddTreasuryAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trCode.trim() || !trName.trim() || !trGlAccountId) {
      onNotify('يرجى إدخال كود واسم الخزينة/البنك وربطه بحساب في دليل الحسابات.');
      return;
    }
    const acc = {
      id: `tr-${Date.now()}`,
      code: trCode.trim(),
      nameAr: trName.trim(),
      kind: trKind,
      bankName: trKind === 'bank' ? trBankName.trim() : undefined,
      branchId: 'b-11',
      glAccountId: trGlAccountId,
      custodianName: trCustodian.trim() || actorName,
      isActive: true,
    };
    onUpdateState(
      appendFinancialAudit(
        { ...state, treasuryAccounts: [...state.treasuryAccounts, acc] },
        {
          actorName,
          actorRole,
          action: trKind === 'bank' ? 'إضافة حساب بنكي' : 'إضافة خزينة فرعية/رئيسية',
          entityType: 'treasury_accounts',
          entityId: acc.id,
          afterSummary: `${acc.code} - ${acc.nameAr}`,
        }
      )
    );
    setTrCode('');
    setTrName('');
    setTrBankName('');
    setTrCustodian('');
    onNotify('تمت إضافة حساب الخزينة/البنك بنجاح.');
  };

  const handleAddTreasuryTx = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(txAmount);
    if (!txAccountId || !txCounterparty.trim() || !txDocNo.trim() || !Number.isFinite(amt) || amt <= 0) {
      onNotify('يرجى استكمال بيانات حركة الخزينة/البنك ورقم المستند والمبلغ.');
      return;
    }
    const tx = {
      id: `ttx-${Date.now()}`,
      txNumber: `TR-${state.treasuryTransactions.length + 1}`,
      txDate: new Date().toISOString().slice(0, 10),
      txType,
      treasuryAccountId: txAccountId,
      counterparty: txCounterparty.trim(),
      documentNumber: txDocNo.trim(),
      paymentMethod: txMethod,
      amount: round2(amt),
      status: 'draft' as const,
      createdBy: actorName,
    };
    onUpdateState(
      appendFinancialAudit(
        { ...state, treasuryTransactions: [tx, ...state.treasuryTransactions] },
        {
          actorName,
          actorRole,
          action: 'تسجيل حركة نقدية/بنكية (مسودة)',
          entityType: 'bank_transactions',
          entityId: tx.id,
          documentNumber: tx.documentNumber,
          afterSummary: `${tx.txNumber}: ${tx.amount} ج.م`,
        }
      )
    );
    setTxCounterparty('');
    setTxDocNo('');
    setTxAmount('');
    onNotify(`تم تسجيل الحركة (${tx.txNumber}) بحالة مسودة وبانتظار المراجعة والاعتماد.`);
  };

  const handleCreateReconciliation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recBankId) {
      onNotify('يرجى اختيار الحساب البنكي للمطابقة.');
      return;
    }
    const stmt = Number(recStmtBal || 0);
    const book = Number(recBookBal || 0);
    const outChq = Number(recOutCheques || 0);
    const depTr = Number(recDepositsTransit || 0);
    const bankChg = Number(recBankCharges || 0);
    const adjustedBankBalance = round2(stmt + depTr - outChq);
    const adjustedBookBalance = round2(book - bankChg);
    const variance = round2(adjustedBankBalance - adjustedBookBalance);

    const rec = {
      id: `rec-${Date.now()}`,
      bankAccountId: recBankId,
      periodId: state.periods[0]?.id || 'fp-2026-07',
      statementDate: new Date().toISOString().slice(0, 10),
      statementEndingBalance: round2(stmt),
      bookEndingBalance: round2(book),
      outstandingCheques: round2(outChq),
      depositsInTransit: round2(depTr),
      bankChargesUnrecorded: round2(bankChg),
      adjustedBankBalance,
      adjustedBookBalance,
      variance,
      status: Math.abs(variance) < 0.01 ? ('reconciled' as const) : ('open' as const),
      preparedBy: actorName,
      notes: recNotes.trim() || 'مطابقة كشف البنك بالدفاتر دون تعديل يدوي للرصيد',
    };

    onUpdateState(
      appendFinancialAudit(
        { ...state, bankReconciliations: [rec, ...state.bankReconciliations] },
        {
          actorName,
          actorRole,
          action: 'إعداد مذكرة مطابقة بنكية',
          entityType: 'bank_reconciliations',
          entityId: rec.id,
          afterSummary: `فرق المطابقة: ${variance} ج.م`,
        }
      )
    );
    setRecNotes('');
    onNotify(
      Math.abs(variance) < 0.01
        ? 'تمت المطابقة البنكية بنجاح بدون فروق (صفر فرق).'
        : `تم حفظ المطابقة البنكية برصد فرق قدره ${formatArabicNumber(variance)} ج.م — يلزم إنشاء قيد تسوية محاسبي معتمد لمعالجته.`
    );
  };

  // ==================== RENDER: TAB 1 - COA, PERIODS, COST CENTERS ====================
  if (activeSubTab === 'coa') {
    const draftPendingCount = state.accounts.filter((a) => a.status === 'pending_review').length;
    return (
      <div className="space-y-4">
        {/* Governance Notice + Actions */}
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5 max-w-2xl">
            <h4 className="text-xs font-black text-[#102A43] flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#164E83]" />
              <span>دليل الحسابات الموحد (Chart of Accounts) — حوكمة رسمية بدون أكواد مفترضة</span>
            </h4>
            <p className="text-[11px] font-bold text-slate-600">
              يمنع النظام تكرار الأكواد أو الترحيل على الحسابات التجميعية أو غير النشطة. يمكنك إدخال دليل وزارة المالية المعتمد مباشرة أو تحميل مسودة استرشادية لمراجعتها وتعديل أكوادها قبل التفعيل.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleLoadDraftCoaTemplate}
              className="px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-[#102A43] text-[11px] font-black cursor-pointer whitespace-nowrap"
            >
              تحميل مسودة حسابات للمراجعة (DRAFT)
            </button>
            {draftPendingCount > 0 && (
              <button
                type="button"
                onClick={handleActivateAllDraftAccounts}
                className="px-3 py-2 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-[11px] font-black cursor-pointer whitespace-nowrap"
              >
                اعتماد وتفعيل الحسابات المراجعة ({toArabicNumerals(draftPendingCount)})
              </button>
            )}
          </div>
        </div>

        {/* Add Account Form */}
        <form onSubmit={handleAddAccount} className="rounded-2xl bg-white border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 items-end">
          <div>
            <label className="text-[10.5px] font-black text-slate-700 block mb-1">كود الحساب المعتمد</label>
            <input
              value={coaCode}
              onChange={(e) => setCoaCode(e.target.value)}
              placeholder="مثال: 110101"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[#102A43]"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="text-[10.5px] font-black text-slate-700 block mb-1">اسم الحساب بالعربية</label>
            <input
              value={coaNameAr}
              onChange={(e) => setCoaNameAr(e.target.value)}
              placeholder="اسم الحساب وفق دليل الجهة المعتمد"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[#102A43]"
            />
          </div>
          <div>
            <label className="text-[10.5px] font-black text-slate-700 block mb-1">التصنيف الرئيسي</label>
            <select
              value={coaType}
              onChange={(e) => setCoaType(e.target.value as AccountType)}
              className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[#102A43] bg-white"
            >
              {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((k) => (
                <option key={k} value={k}>
                  {ACCOUNT_TYPE_LABELS[k].ar}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10.5px] font-black text-slate-700 block mb-1">الحساب الأب</label>
            <select
              value={coaParentId}
              onChange={(e) => setCoaParentId(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[#102A43] bg-white"
            >
              {state.accounts
                .filter((a) => a.isGroup)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.code} - {g.nameAr}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[10.5px] font-black text-slate-700 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={coaIsGroup}
                onChange={(e) => setCoaIsGroup(e.target.checked)}
                className="accent-[#102A43]"
              />
              <span>تجميعي</span>
            </label>
            <button
              type="submit"
              className="flex-1 py-2 px-3 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-xs font-black flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة</span>
            </button>
          </div>
        </form>

        {/* Hierarchical COA Table */}
        <div className="rounded-2xl bg-white border border-slate-200 overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-[#102A43] text-white text-[11px]">
                <th className="py-2.5 px-3 font-black">الكود</th>
                <th className="py-2.5 px-3 font-black">اسم الحساب</th>
                <th className="py-2.5 px-3 font-black">التصنيف</th>
                <th className="py-2.5 px-3 font-black">الطبيعة</th>
                <th className="py-2.5 px-3 font-black">الترحيل</th>
                <th className="py-2.5 px-3 font-black">الحالة</th>
                <th className="py-2.5 px-3 font-black">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.accounts.map((acc) => (
                <tr key={acc.id} className={acc.isGroup ? 'bg-slate-50/90 font-black' : 'hover:bg-slate-50'}>
                  <td className="py-2 px-3 font-mono font-black text-[#164E83]">{acc.code}</td>
                  <td className="py-2 px-3 font-bold text-[#102A43]">
                    <span style={{ paddingRight: `${(acc.level - 1) * 14}px` }}>{acc.nameAr}</span>
                  </td>
                  <td className="py-2 px-3 font-bold text-slate-600">{ACCOUNT_TYPE_LABELS[acc.type].ar}</td>
                  <td className="py-2 px-3 font-bold text-slate-700">{acc.normalBalance === 'debit' ? 'مدين' : 'دائن'}</td>
                  <td className="py-2 px-3 font-bold text-slate-600">
                    {acc.isGroup ? 'تجميعي (يمنع الترحيل)' : 'تفصيلي (قابل للترحيل)'}
                  </td>
                  <td className="py-2 px-3 font-black">
                    <span
                      className={
                        acc.status === 'active'
                          ? 'text-emerald-700'
                          : acc.status === 'pending_review'
                          ? 'text-amber-700'
                          : 'text-rose-700'
                      }
                    >
                      {acc.status === 'active' ? 'نشط ومعتمد' : acc.status === 'pending_review' ? 'قيد المراجعة' : 'موقوف'}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    {!acc.isGroup && (
                      <button
                        type="button"
                        onClick={() => handleToggleAccountStatus(acc)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-[10.5px] font-black text-[#102A43] cursor-pointer whitespace-nowrap"
                      >
                        {acc.status === 'active' ? 'إيقاف' : 'اعتماد وتفعيل'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Fiscal Periods & Cost Centers Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Fiscal Periods */}
          <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
            <h4 className="text-xs font-black text-[#102A43] flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-[#164E83]" />
              <span>الفترات المحاسبية والإقفال الدوري (السنة المالية {state.policy.activeFiscalYearId})</span>
            </h4>
            <div className="flex items-center gap-2">
              <input
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="سبب استثنائي موثق (مطلوب فقط عند إعادة فتح فترة مغلقة)"
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] font-bold text-[#102A43]"
              />
            </div>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {state.periods.map((p) => {
                const readiness = evaluatePeriodClosingReadiness(p, state.journalEntries, state.bankReconciliations);
                return (
                  <div key={p.id} className="p-2.5 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <p className="font-black text-[#102A43]">{p.nameAr}</p>
                      <p className="text-[10.5px] font-bold text-slate-500 num-cell">
                        {p.startDate} ← {p.endDate} ·{' '}
                        {p.status === 'closed'
                          ? 'مغلقة'
                          : p.status === 'reopened_exception'
                          ? 'مفتوحة استثنائياً'
                          : readiness.canClose
                          ? 'جاهزة للإقفال'
                          : readiness.blockers[0]}
                      </p>
                    </div>
                    {p.status !== 'closed' ? (
                      <button
                        type="button"
                        onClick={() => handleCloseOrReopenPeriod(p.id, 'close')}
                        className="px-2.5 py-1.5 rounded-lg bg-[#102A43] text-[#C6A15B] text-[10.5px] font-black flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <Lock className="w-3 h-3" />
                        <span>إقفال الفترة</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCloseOrReopenPeriod(p.id, 'reopen')}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-[10.5px] font-black flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <Unlock className="w-3 h-3" />
                        <span>فتح استثنائي</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cost Centers */}
          <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
            <h4 className="text-xs font-black text-[#102A43] flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#164E83]" />
              <span>مراكز التكلفة الهرمية ({toArabicNumerals(state.costCenters.length)})</span>
            </h4>
            <form onSubmit={handleAddCostCenter} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                value={ccCode}
                onChange={(e) => setCcCode(e.target.value)}
                placeholder="الكود"
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold"
              />
              <input
                value={ccNameAr}
                onChange={(e) => setCcNameAr(e.target.value)}
                placeholder="اسم مركز التكلفة"
                className="sm:col-span-2 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold"
              />
              <button
                type="submit"
                className="py-1.5 px-3 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black cursor-pointer whitespace-nowrap"
              >
                إضافة مركز
              </button>
              <select
                value={ccLevel}
                onChange={(e) => setCcLevel(e.target.value as typeof ccLevel)}
                className="sm:col-span-2 px-2.5 py-1.5 rounded-xl border border-slate-200 text-[11px] font-bold bg-white"
              >
                <option value="administration">إدارة تموينية</option>
                <option value="department">قسم تخصصي</option>
                <option value="branch">فرع</option>
                <option value="unit">وحدة تشغيلية</option>
                <option value="project">مشروع / نشاط</option>
              </select>
              <select
                value={ccBranchId}
                onChange={(e) => setCcBranchId(e.target.value)}
                className="sm:col-span-2 px-2.5 py-1.5 rounded-xl border border-slate-200 text-[11px] font-bold bg-white"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.arabicName}
                  </option>
                ))}
              </select>
            </form>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-60 overflow-y-auto">
              {state.costCenters.map((cc) => (
                <div key={cc.id} className="p-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-black text-[#164E83] ml-2">{cc.code}</span>
                    <span className="font-bold text-[#102A43]">{cc.nameAr}</span>
                  </div>
                  <span className="text-[10.5px] font-bold text-slate-500">{cc.levelType}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== RENDER: TAB 2 - JOURNAL ENTRIES & GENERAL LEDGER ====================
  if (activeSubTab === 'journal') {
    const draftSumDebit = round2(jeLines.reduce((s, l) => s + (Number(l.debit) || 0), 0));
    const draftSumCredit = round2(jeLines.reduce((s, l) => s + (Number(l.credit) || 0), 0));
    const isDraftBalanced = draftSumDebit > 0 && Math.abs(draftSumDebit - draftSumCredit) < 0.005;

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          {(
            [
              { id: 'list', label: `دفتر اليومية (${toArabicNumerals(state.journalEntries.length)})` },
              { id: 'create', label: 'إنشاء قيد مزدوج جديد' },
              {
                id: 'review',
                label: `المراجعة والاعتماد (${toArabicNumerals(
                  state.journalEntries.filter((e) => e.status !== 'posted' && e.status !== 'cancelled').length
                )})`,
              },
              { id: 'gl', label: 'الأستاذ العام وميزان المراجعة' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setJournalSubView(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition-colors whitespace-nowrap ${
                journalSubView === t.id
                  ? 'bg-[#102A43] text-[#C6A15B]'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Subview: Create Double-Entry Journal */}
        {journalSubView === 'create' && (
          <form onSubmit={handleCreateJournalEntry} className="rounded-2xl bg-white border border-slate-200 p-4 space-y-4">
            {postingAccounts.length < 2 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-black flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  يلزم وجود حسابين تفصيليين نشطين على الأقل في «دليل الحسابات» قبل إنشاء القيود اليومية.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[10.5px] font-black text-slate-700 block mb-1">تاريخ القيد</label>
                <input type="date" value={jeDate} onChange={(e) => setJeDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
              </div>
              <div>
                <label className="text-[10.5px] font-black text-slate-700 block mb-1">الفترة المحاسبية</label>
                <select value={jePeriodId} onChange={(e) => setJePeriodId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white">
                  {state.periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameAr} ({p.status === 'closed' ? 'مغلقة' : 'مفتوحة'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10.5px] font-black text-slate-700 block mb-1">نوع القيد</label>
                <select value={jeType} onChange={(e) => setJeType(e.target.value as JournalEntryType)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white">
                  {(Object.keys(JOURNAL_ENTRY_TYPE_LABELS) as JournalEntryType[]).map((k) => (
                    <option key={k} value={k}>
                      {JOURNAL_ENTRY_TYPE_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10.5px] font-black text-slate-700 block mb-1">رقم المستند المؤيد (إلزامي)</label>
                <input value={jeDocNo} onChange={(e) => setJeDocNo(e.target.value)} placeholder="مثال: سند/2026/104" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10.5px] font-black text-slate-700 block mb-1">بيان القيد المحاسبي</label>
                <input value={jeDesc} onChange={(e) => setJeDesc(e.target.value)} placeholder="شرح دقيق للعملية المالية والمستند المؤيد..." className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
              </div>
              <div>
                <label className="text-[10.5px] font-black text-slate-700 block mb-1">الإدارة التموينية</label>
                <select value={jeBranchId} onChange={(e) => setJeBranchId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white">
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.arabicName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10.5px] font-black text-slate-700 block mb-1">مركز التكلفة</label>
                <select value={jeCostCenterId} onChange={(e) => setJeCostCenterId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white">
                  {state.costCenters.map((cc) => (
                    <option key={cc.id} value={cc.id}>
                      {cc.code} - {cc.nameAr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Double-Entry Lines */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#102A43]">أسطر القيد المزدوج (مدين / دائن)</span>
                <button
                  type="button"
                  onClick={() =>
                    setJeLines((prev) => [
                      ...prev,
                      { id: `ln-${Date.now()}`, accountId: '', description: '', debit: 0, credit: 0 },
                    ])
                  }
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#102A43] text-[11px] font-black cursor-pointer"
                >
                  + إضافة سطر
                </button>
              </div>

              <div className="space-y-2">
                {jeLines.map((line, idx) => (
                  <div key={line.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <select
                      value={line.accountId}
                      onChange={(e) =>
                        setJeLines((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, accountId: e.target.value } : l))
                        )
                      }
                      className="md:col-span-4 px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold"
                    >
                      <option value="">-- اختر الحساب التفصيلي --</option>
                      {postingAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} — {a.nameAr}
                        </option>
                      ))}
                    </select>
                    <input
                      value={line.description}
                      onChange={(e) =>
                        setJeLines((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, description: e.target.value } : l))
                        )
                      }
                      placeholder="بيان السطر"
                      className="md:col-span-3 px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.debit || ''}
                      onChange={(e) => {
                        const v = Number(e.target.value || 0);
                        setJeLines((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, debit: v, credit: v > 0 ? 0 : l.credit } : l))
                        );
                      }}
                      placeholder="مدين (ج.م)"
                      className="md:col-span-2 px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-black num-cell"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.credit || ''}
                      onChange={(e) => {
                        const v = Number(e.target.value || 0);
                        setJeLines((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, credit: v, debit: v > 0 ? 0 : l.debit } : l))
                        );
                      }}
                      placeholder="دائن (ج.م)"
                      className="md:col-span-2 px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-black num-cell"
                    />
                    <button
                      type="button"
                      disabled={jeLines.length <= 2}
                      onClick={() => setJeLines((prev) => prev.filter((_, i) => i !== idx))}
                      className="md:col-span-1 py-2 px-2 rounded-lg text-rose-700 hover:bg-rose-50 disabled:opacity-30 text-xs font-black cursor-pointer"
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>

              {/* Live Double-Entry Balance Bar */}
              <div
                className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs font-black ${
                  isDraftBalanced
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-4 num-cell">
                  <span>إجمالي المدين: {formatArabicNumber(draftSumDebit)} ج.م</span>
                  <span>إجمالي الدائن: {formatArabicNumber(draftSumCredit)} ج.م</span>
                  <span>الفرق: {formatArabicNumber(round2(Math.abs(draftSumDebit - draftSumCredit)))} ج.م</span>
                </div>
                <span>{isDraftBalanced ? '✓ القيد متوازن وجاهز للحفظ كمسودة' : '✗ القيد غير متوازن — يمنع الترحيل'}</span>
              </div>

              {jeErrors.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold space-y-1">
                  {jeErrors.map((err, i) => (
                    <p key={i}>• {err}</p>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-xs font-black cursor-pointer"
              >
                حفظ القيد كمسودة وإرساله للمراجعة
              </button>
            </div>
          </form>
        )}

        {/* Subviews: All Journal Entries OR Pending Review/Approval */}
        {(journalSubView === 'list' || journalSubView === 'review') && (
          <div className="space-y-2.5">
            {state.journalEntries
              .filter((e) => (journalSubView === 'review' ? e.status !== 'posted' && e.status !== 'cancelled' : true))
              .map((entry) => (
                <div key={entry.id} className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <span className="font-mono font-black text-[#164E83] ml-2">{entry.entryNumber}</span>
                      <span className="text-xs font-black text-[#102A43]">{entry.description}</span>
                      <p className="text-[10.5px] font-bold text-slate-500 mt-0.5 num-cell">
                        {entry.entryDate} · {JOURNAL_ENTRY_TYPE_LABELS[entry.entryType]} · مستند: {entry.documentNumber} · المحرر: {entry.createdBy}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-black text-[#102A43] num-cell ml-2">
                        {formatArabicNumber(entry.totalDebit)} ج.م · {ENTRY_STATUS_LABELS[entry.status]}
                      </span>
                      {entry.status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => handleTransitionEntry(entry, 'review')}
                          className="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 text-[10.5px] font-black cursor-pointer"
                        >
                          مراجعة
                        </button>
                      )}
                      {entry.status === 'under_review' && (
                        <button
                          type="button"
                          onClick={() => handleTransitionEntry(entry, 'approve')}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[10.5px] font-black cursor-pointer"
                        >
                          اعتماد
                        </button>
                      )}
                      {entry.status === 'approved' && (
                        <button
                          type="button"
                          onClick={() => handleTransitionEntry(entry, 'post')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-[10.5px] font-black cursor-pointer"
                        >
                          ترحيل للأستاذ العام
                        </button>
                      )}
                      {entry.status !== 'posted' && entry.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => handleTransitionEntry(entry, 'cancel')}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-[10.5px] font-black cursor-pointer"
                        >
                          إلغاء
                        </button>
                      )}
                      {entry.status === 'posted' && (
                        <button
                          type="button"
                          onClick={() => handleCreateReversalEntry(entry)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#102A43] text-[10.5px] font-black flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>قيد عكسي</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[11px]">
                    {entry.lines.map((l) => {
                      const acc = state.accounts.find((a) => a.id === l.accountId);
                      return (
                        <div key={l.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="font-bold text-[#102A43] truncate">
                            {acc ? `${acc.code} - ${acc.nameAr}` : l.accountId}
                          </span>
                          <span className="font-black num-cell shrink-0 mr-2">
                            {l.debit > 0
                              ? `مدين ${formatArabicNumber(l.debit)}`
                              : `دائن ${formatArabicNumber(l.credit)}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            {state.journalEntries.filter((e) => (journalSubView === 'review' ? e.status !== 'posted' && e.status !== 'cancelled' : true)).length === 0 && (
              <div className="py-10 text-center rounded-2xl border border-dashed border-slate-300 bg-white text-xs font-bold text-slate-500">
                لا توجد قيود يومية مسجلة في هذا العرض حتى الآن.
              </div>
            )}
          </div>
        )}

        {/* Subview: General Ledger & Trial Balance */}
        {journalSubView === 'gl' && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-black text-[#102A43] flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-[#164E83]" />
                  <span>ميزان المراجعة المستخرج حصرياً من القيود المرحّلة (Trial Balance)</span>
                </h4>
                <span className={`text-xs font-black ${trialBalance.isBalanced ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {trialBalance.isBalanced ? '✓ ميزان المراجعة متوازن بالكامل' : '✗ يوجد عدم توازن'}
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#102A43] text-white text-[11px]">
                      <th className="py-2 px-3">الكود</th>
                      <th className="py-2 px-3">اسم الحساب</th>
                      <th className="py-2 px-3">مجموع المدين</th>
                      <th className="py-2 px-3">مجموع الدائن</th>
                      <th className="py-2 px-3">رصيد مدين</th>
                      <th className="py-2 px-3">رصيد دائن</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 num-cell">
                    {trialBalance.rows.map((r) => (
                      <tr key={r.accountId} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-black text-[#164E83]">{r.code}</td>
                        <td className="py-2 px-3 font-bold text-[#102A43]">{r.nameAr}</td>
                        <td className="py-2 px-3 font-bold">{formatArabicNumber(r.totalDebit)}</td>
                        <td className="py-2 px-3 font-bold">{formatArabicNumber(r.totalCredit)}</td>
                        <td className="py-2 px-3 font-black text-emerald-800">{formatArabicNumber(r.netDebit)}</td>
                        <td className="py-2 px-3 font-black text-sky-900">{formatArabicNumber(r.netCredit)}</td>
                      </tr>
                    ))}
                    {trialBalance.rows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500 font-bold">
                          لا توجد قيود مرحّلة بعد — تُحتسب أرصدة الأستاذ العام وميزان المراجعة تلقائياً فور ترحيل القيود المعتمدة.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {trialBalance.rows.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-100 font-black text-[#102A43] num-cell">
                        <td colSpan={2} className="py-2.5 px-3">الإجمالي العام</td>
                        <td className="py-2.5 px-3">{formatArabicNumber(trialBalance.sumDebit)}</td>
                        <td className="py-2.5 px-3">{formatArabicNumber(trialBalance.sumCredit)}</td>
                        <td className="py-2.5 px-3">{formatArabicNumber(trialBalance.sumNetDebit)}</td>
                        <td className="py-2.5 px-3">{formatArabicNumber(trialBalance.sumNetCredit)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* General Ledger Account Filter */}
            <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-black text-[#102A43]">كشف حركة دفتر الأستاذ العام حسب الحساب</h4>
                <select
                  value={glAccountFilter}
                  onChange={(e) => setGlAccountFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                >
                  <option value="all">كل الحسابات المرحّلة</option>
                  {postingAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} — {a.nameAr}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 text-xs">
                {state.journalEntries
                  .filter((e) => e.status === 'posted')
                  .flatMap((e) =>
                    e.lines
                      .filter((l) => glAccountFilter === 'all' || l.accountId === glAccountFilter)
                      .map((l) => ({ entry: e, line: l }))
                  )
                  .slice(0, 40)
                  .map(({ entry, line }) => {
                    const acc = state.accounts.find((a) => a.id === line.accountId);
                    return (
                      <div key={`${entry.id}-${line.id}`} className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <div>
                          <span className="font-mono font-black text-[#164E83] ml-2">{entry.entryNumber}</span>
                          <span className="font-bold text-[#102A43]">{acc?.nameAr || line.accountId}</span>
                          <span className="text-[10.5px] text-slate-500 mr-2">({entry.entryDate} · مستند {entry.documentNumber})</span>
                        </div>
                        <span className="font-black num-cell">
                          {line.debit > 0 ? `مدين: ${formatArabicNumber(line.debit)} ج.م` : `دائن: ${formatArabicNumber(line.credit)} ج.م`}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== RENDER: TAB 3 - BUDGET & APPROPRIATIONS ====================
  if (activeSubTab === 'budget') {
    return (
      <div className="space-y-4">
        {/* Create Budget Allocation */}
        <form onSubmit={handleAddBudget} className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
          <h4 className="text-xs font-black text-[#102A43] flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-[#164E83]" />
            <span>تسجيل اعتماد مالي بالموازنة ({state.policy.activeFiscalYearId})</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
            <input value={bgtCode} onChange={(e) => setBgtCode(e.target.value)} placeholder="كود البند" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
            <input value={bgtTitle} onChange={(e) => setBgtTitle(e.target.value)} placeholder="اسم بند الاعتماد" className="lg:col-span-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
            <select value={bgtAccountId} onChange={(e) => setBgtAccountId(e.target.value)} className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white">
              <option value="">-- الحساب المرتبط --</option>
              {state.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} - {a.nameAr}
                </option>
              ))}
            </select>
            <input type="number" min="0" step="0.01" value={bgtAmount} onChange={(e) => setBgtAmount(e.target.value)} placeholder="قيمة الاعتماد (ج.م)" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-black num-cell" />
            <button type="submit" className="py-2 px-3 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black cursor-pointer">
              + إضافة اعتماد
            </button>
            <select value={bgtBranchId} onChange={(e) => setBgtBranchId(e.target.value)} className="sm:col-span-2 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white">
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.arabicName}</option>
              ))}
            </select>
            <input value={bgtDocRef} onChange={(e) => setBgtDocRef(e.target.value)} placeholder="رقم سند/قرار اعتماد الموازنة" className="sm:col-span-4 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold" />
          </div>
        </form>

        {/* Commitments & Actual Expenses (No Double Deduction) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <form onSubmit={handleAddCommitment} className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2.5">
            <h4 className="text-xs font-black text-[#102A43]">حجز التزام مالي (Commitment)</h4>
            <select value={comAllocId} onChange={(e) => setComAllocId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white">
              <option value="">-- اختر بند الاعتماد --</option>
              {state.budgetAllocations.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.titleAr}</option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-2">
              <input value={comDesc} onChange={(e) => setComDesc(e.target.value)} placeholder="بيان الالتزام / التعاقد" className="col-span-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
              <input type="number" min="0" step="0.01" value={comAmount} onChange={(e) => setComAmount(e.target.value)} placeholder="المبلغ" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-black num-cell" />
            </div>
            <button type="submit" className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black cursor-pointer">
              حجز الالتزام والتحقق من المتاح
            </button>
          </form>

          <form onSubmit={handleAddBudgetExpense} className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2.5">
            <h4 className="text-xs font-black text-[#102A43]">تسجيل مصروف فعلي (مع منع ازدواج خصم الالتزام)</h4>
            <div className="grid grid-cols-2 gap-2">
              <select value={expAllocId} onChange={(e) => setExpAllocId(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white">
                <option value="">-- بند الاعتماد --</option>
                {state.budgetAllocations.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} — {a.titleAr}</option>
                ))}
              </select>
              <select value={expCommitId} onChange={(e) => setExpCommitId(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white">
                <option value="">مصروف مباشر مستقل (بدون التزام مسبق)</option>
                {state.budgetCommitments
                  .filter((c) => c.allocationId === expAllocId && c.status !== 'fully_expensed')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      صرف من الالتزام {c.commitmentNumber} ({formatArabicNumber(c.committedAmount)} ج.م)
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input value={expDoc} onChange={(e) => setExpDoc(e.target.value)} placeholder="رقم مستند الصرف" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
              <input value={expDesc} onChange={(e) => setExpDesc(e.target.value)} placeholder="البيان" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
              <input type="number" min="0" step="0.01" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder="المبلغ" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-black num-cell" />
            </div>
            <button type="submit" className="w-full py-2 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-xs font-black cursor-pointer">
              إثبات المصروف الفعلي
            </button>
          </form>
        </div>

        {/* Budget Execution Table */}
        <div className="rounded-2xl bg-white border border-slate-200 overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-[#102A43] text-white text-[11px]">
                <th className="py-2.5 px-3">الكود</th>
                <th className="py-2.5 px-3">بند الاعتماد</th>
                <th className="py-2.5 px-3">الاعتماد المعدّل</th>
                <th className="py-2.5 px-3">الالتزام المحجوز المفتوح</th>
                <th className="py-2.5 px-3">المصروف الفعلي</th>
                <th className="py-2.5 px-3">المتاح للصرف</th>
                <th className="py-2.5 px-3">نسبة التنفيذ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 num-cell">
              {state.budgetAllocations.map((alloc) => {
                const m = computeBudgetMetrics(alloc, state.budgetCommitments, state.budgetExpenses);
                return (
                  <tr key={alloc.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-black text-[#164E83]">{alloc.code}</td>
                    <td className="py-2.5 px-3 font-bold text-[#102A43]">{alloc.titleAr}</td>
                    <td className="py-2.5 px-3 font-bold">{formatArabicNumber(m.adjustedBudget)}</td>
                    <td className="py-2.5 px-3 font-bold text-amber-800">{formatArabicNumber(m.reservedCommitmentsOpen)}</td>
                    <td className="py-2.5 px-3 font-bold text-sky-900">{formatArabicNumber(m.actualExpensesTotal)}</td>
                    <td className={`py-2.5 px-3 font-black ${m.availableBalance < 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
                      {formatArabicNumber(m.availableBalance)}
                    </td>
                    <td className="py-2.5 px-3 font-black">{toArabicNumerals(m.executionPercent)}٪</td>
                  </tr>
                );
              })}
              {state.budgetAllocations.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-bold">
                    لم يتم إدخال بنود موازنة واعتمادات مالية بعد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ==================== RENDER: TAB 4 - TREASURY, BANKS & RECONCILIATION ====================
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Add Cashbox / Bank */}
        <form onSubmit={handleAddTreasuryAccount} className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2.5">
          <h4 className="text-xs font-black text-[#102A43] flex items-center gap-1.5">
            <Landmark className="w-4 h-4 text-[#164E83]" />
            <span>تعريف خزينة أو حساب بنكي</span>
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <select value={trKind} onChange={(e) => setTrKind(e.target.value as 'cashbox' | 'bank')} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white">
              <option value="cashbox">خزينة نقدية / عهدة</option>
              <option value="bank">حساب بنكي / خزانة موحدة</option>
            </select>
            <input value={trCode} onChange={(e) => setTrCode(e.target.value)} placeholder="كود الخزينة/البنك" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
            <input value={trName} onChange={(e) => setTrName(e.target.value)} placeholder="الاسم الرسمي" className="col-span-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
            {trKind === 'bank' && (
              <input value={trBankName} onChange={(e) => setTrBankName(e.target.value)} placeholder="اسم البنك (مثل: البنك المركزي / الأهلي)" className="col-span-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
            )}
            <select value={trGlAccountId} onChange={(e) => setTrGlAccountId(e.target.value)} className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white">
              <option value="">-- الحساب المحاسبي المرتبط --</option>
              {state.accounts.filter((a) => !a.isGroup).map((a) => (
                <option key={a.id} value={a.id}>{a.code} - {a.nameAr}</option>
              ))}
            </select>
            <input value={trCustodian} onChange={(e) => setTrCustodian(e.target.value)} placeholder="أمين الخزينة / المسؤول" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
          </div>
          <button type="submit" className="w-full py-2 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black cursor-pointer">
            حفظ الحساب النقدي / البنكي
          </button>
        </form>

        {/* Record Treasury Transaction */}
        <form onSubmit={handleAddTreasuryTx} className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2.5">
          <h4 className="text-xs font-black text-[#102A43] flex items-center gap-1.5">
            <ArrowLeftRight className="w-4 h-4 text-[#164E83]" />
            <span>تسجيل حركة مقبوضات / مدفوعات / شيكات / أوامر دفع</span>
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <select value={txAccountId} onChange={(e) => setTxAccountId(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white">
              <option value="">-- اختر الخزينة أو البنك --</option>
              {state.treasuryAccounts.map((t) => (
                <option key={t.id} value={t.id}>{t.nameAr}</option>
              ))}
            </select>
            <select value={txType} onChange={(e) => setTxType(e.target.value as typeof txType)} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white">
              <option value="receipt">مقبوضات / تحصيل</option>
              <option value="payment">مدفوعات / صرف</option>
              <option value="deposit">إيداع بنكي</option>
              <option value="withdrawal">سحب</option>
              <option value="transfer">تحويل</option>
              <option value="cheque">شيك</option>
              <option value="payment_order">أمر دفع إلكتروني</option>
              <option value="custody">عهدة نقدية</option>
            </select>
            <input value={txCounterparty} onChange={(e) => setTxCounterparty(e.target.value)} placeholder="الطرف المقابل / المستفيد" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
            <input value={txDocNo} onChange={(e) => setTxDocNo(e.target.value)} placeholder="رقم المستند / الإيصال" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
            <select value={txMethod} onChange={(e) => setTxMethod(e.target.value as typeof txMethod)} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white">
              <option value="أمر دفع إلكتروني">أمر دفع إلكتروني</option>
              <option value="تحويل بنكي">تحويل بنكي</option>
              <option value="شيك">شيك</option>
              <option value="نقدي">نقدي</option>
            </select>
            <input type="number" min="0" step="0.01" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} placeholder="القيمة (ج.م)" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-black num-cell" />
          </div>
          <button type="submit" className="w-full py-2 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black cursor-pointer">
            تسجيل الحركة كمسودة للمراجعة
          </button>
        </form>
      </div>

      {/* Bank Reconciliation Form (No direct manual balance overwrite!) */}
      <form onSubmit={handleCreateReconciliation} className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-black text-[#102A43] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#164E83]" />
            <span>المطابقة البنكية بين كشف البنك والدفاتر (Bank Reconciliation)</span>
          </h4>
          <span className="text-[10.5px] font-bold text-slate-500">
            يُحظر تعديل رصيد البنك يدوياً — تُعالج الفروق بقيد تسوية محاسبي معتمد فقط
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <select value={recBankId} onChange={(e) => setRecBankId(e.target.value)} className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white">
            <option value="">-- الحساب البنكي --</option>
            {state.treasuryAccounts.filter((t) => t.kind === 'bank').map((b) => (
              <option key={b.id} value={b.id}>{b.nameAr}</option>
            ))}
          </select>
          <input type="number" step="0.01" value={recStmtBal} onChange={(e) => setRecStmtBal(e.target.value)} placeholder="رصيد كشف البنك" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-black num-cell" />
          <input type="number" step="0.01" value={recBookBal} onChange={(e) => setRecBookBal(e.target.value)} placeholder="الرصيد الدفتري" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-black num-cell" />
          <input type="number" step="0.01" value={recOutCheques} onChange={(e) => setRecOutCheques(e.target.value)} placeholder="شيكات قائمة" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-black num-cell" />
          <input type="number" step="0.01" value={recDepositsTransit} onChange={(e) => setRecDepositsTransit(e.target.value)} placeholder="إيداعات تحت التسوية" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-black num-cell" />
          <input type="number" step="0.01" value={recBankCharges} onChange={(e) => setRecBankCharges(e.target.value)} placeholder="مصروفات بنكية" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-black num-cell" />
        </div>
        <div className="flex flex-wrap gap-2">
          <input value={recNotes} onChange={(e) => setRecNotes(e.target.value)} placeholder="ملاحظات المطابقة والبنود المعلقة..." className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
          <button type="submit" className="px-4 py-2 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black cursor-pointer whitespace-nowrap">
            احتساب وحفظ المطابقة
          </button>
        </div>

        {state.bankReconciliations.length > 0 && (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
            {state.bankReconciliations.map((rec) => (
              <div key={rec.id} className="p-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="num-cell">
                  <span className="font-black text-[#102A43] ml-2">{rec.statementDate}</span>
                  <span className="font-bold text-slate-600">
                    البنك المعدل: {formatArabicNumber(rec.adjustedBankBalance)} | الدفاتر المعدلة: {formatArabicNumber(rec.adjustedBookBalance)}
                  </span>
                </div>
                <span className={`font-black num-cell flex items-center gap-1 ${Math.abs(rec.variance) < 0.01 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {Math.abs(rec.variance) < 0.01 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  <span>الفرق: {formatArabicNumber(rec.variance)} ج.م</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}
