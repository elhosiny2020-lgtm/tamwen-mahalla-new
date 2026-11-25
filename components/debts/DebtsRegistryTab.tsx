'use client';

import React, { useMemo, useState } from 'react';
import {
  Search,
  PlusCircle,
  Printer,
  Download,
  Bookmark,
  CheckCircle2,
  XCircle,
  Eye,
  CreditCard,
  CalendarPlus,
  Scale,
  X,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import {
  BakeryDebtItem,
  BakeryDebtRecord,
  BakeryRecord,
  DebtApprovalStatus,
  DebtModuleSettings,
  DebtSettlementRecord,
} from '@/types';
import {
  compareTableValues,
  formatArabicCurrency,
  formatArabicDecimal,
  formatArabicPercent,
  formatDateArabic,
  normalizeSearchText,
  toArabicNumerals,
} from '@/lib/utils';
import { round2 } from '@/lib/debts-engine';
import { exportCsvUtf8Bom } from '@/lib/debts-data';
import SmartAutoFitTable, { SmartTableColumn } from '@/components/SmartAutoFitTable';
import {
  ApprovalStatusBadge,
  DebtPaymentBadge,
  DebtScheduleBadge,
  OfficialPrintModal,
} from './DebtsSharedUi';

interface DebtsRegistryTabProps {
  userId: string;
  currentUserName: string;
  bakeries: BakeryRecord[];
  debts: BakeryDebtRecord[];
  items: BakeryDebtItem[];
  settlements: DebtSettlementRecord[];
  settings: DebtModuleSettings;
  todayRef: string;
  onCreateDebt: (
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
  ) => void;
  onChangeApproval: (debtId: string, newStatus: DebtApprovalStatus, reason?: string) => void;
  onApplySettlement: (
    debtId: string,
    type: DebtSettlementRecord['settlementType'],
    amount: number,
    reason: string,
    referenceDoc: string
  ) => void;
  onSaveFavoriteFilter: (fav: { id: string; name: string; search: string; status: string; authority: string }) => void;
  onOpenBakeryProfile: (bakeryId: string) => void;
  onOpenPayModal: (debt: BakeryDebtRecord) => void;
  onOpenScheduleModal: (debt: BakeryDebtRecord) => void;
}

export default function DebtsRegistryTab({
  userId,
  currentUserName,
  bakeries,
  debts,
  items,
  settlements,
  settings,
  todayRef,
  onCreateDebt,
  onChangeApproval,
  onApplySettlement,
  onSaveFavoriteFilter,
  onOpenBakeryProfile,
  onOpenPayModal,
  onOpenScheduleModal,
}: DebtsRegistryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('الكل');
  const [approvalFilter, setApprovalFilter] = useState<string>('الكل');
  const [authorityFilter, setAuthorityFilter] = useState<string>('الكل');
  const [villageFilter, setVillageFilter] = useState<string>('الكل');
  const [sortKey, setSortKey] = useState<string>('serialNumber');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pinnedCols, setPinnedCols] = useState<string[]>([
    'serialNumber',
    'debtNumber',
    'bakeryName',
    'ownerName',
    'posNumber',
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [detailDebtId, setDetailDebtId] = useState<string | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [settlementDebt, setSettlementDebt] = useState<BakeryDebtRecord | null>(null);
  const [settleType, setSettleType] = useState<DebtSettlementRecord['settlementType']>('تسوية معتمدة');
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleReason, setSettleReason] = useState('');
  const [settleDoc, setSettleDoc] = useState('');
  const [showPrint, setShowPrint] = useState(false);
  const [favName, setFavName] = useState('');

  // نموذج إضافة مديونية جديدة (4 أجزاء)
  const [fBakeryId, setFBakeryId] = useState<string>(bakeries[0]?.id || '');
  const [fAuthority, setFAuthority] = useState<string>(settings.authorities[0] || '');
  const [fViolationType, setFViolationType] = useState<string>(settings.violationCategories[0] || '');
  const [fMinutesNumber, setFMinutesNumber] = useState<string>('');
  const [fViolationDate, setFViolationDate] = useState<string>(todayRef);
  const [fDueDate, setFDueDate] = useState<string>(todayRef);
  const [fDescription, setFDescription] = useState<string>('');
  const [fNotes, setFNotes] = useState<string>('');
  const [fAttachmentRef, setFAttachmentRef] = useState<string>('');
  const [fOriginal, setFOriginal] = useState<number>(0);
  const [fPrior, setFPrior] = useState<number>(0);
  const [fAdditions, setFAdditions] = useState<number>(0);
  const [fDisposals, setFDisposals] = useState<number>(0);
  const [fSettlements, setFSettlements] = useState<number>(0);
  const [fAdvance, setFAdvance] = useState<number>(0);
  const [formErr, setFormErr] = useState<string>('');

  const selectedBakery = useMemo(
    () => bakeries.find((b) => b.id === fBakeryId) || bakeries[0],
    [bakeries, fBakeryId]
  );

  const previewMath = useMemo(() => {
    const gross = round2(Math.max(0, fOriginal) + Math.max(0, fPrior) + Math.max(0, fAdditions) + Math.max(0, fDisposals));
    const net = Math.max(0, round2(gross - Math.max(0, fSettlements)));
    const paid = Math.min(net, Math.max(0, round2(fAdvance)));
    const rem = Math.max(0, round2(net - paid));
    const payPct = net > 0 ? round2((paid / net) * 100) : 0;
    const remPct = net > 0 ? round2((rem / net) * 100) : 0;
    return { gross, net, paid, rem, payPct, remPct };
  }, [fOriginal, fPrior, fAdditions, fDisposals, fSettlements, fAdvance]);

  const existingOpenBakeryDebts = useMemo(() => {
    if (!selectedBakery) return [];
    return debts.filter((d) => d.bakeryId === selectedBakery.id && d.remainingAmount > 0);
  }, [debts, selectedBakery]);

  const villagesList = useMemo(
    () => ['الكل', ...Array.from(new Set(debts.map((d) => d.village).filter(Boolean)))],
    [debts]
  );

  const filteredDebts = useMemo(() => {
    const q = normalizeSearchText(searchTerm);
    const list = debts.filter((d) => {
      if (statusFilter !== 'الكل' && d.paymentStatus !== statusFilter) return false;
      if (approvalFilter !== 'الكل' && d.approvalStatus !== approvalFilter) return false;
      if (authorityFilter !== 'الكل' && d.issuingAuthority !== authorityFilter) return false;
      if (villageFilter !== 'الكل' && d.village !== villageFilter) return false;
      if (!q) return true;
      return normalizeSearchText(
        `${d.debtNumber} ${d.bakeryName} ${d.ownerName} ${d.posNumber} ${d.minutesNumber} ${d.phone} ${d.village} ${d.localUnit} ${d.violationType}`
      ).includes(q);
    });
    return [...list].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      return compareTableValues(av, bv, sortAsc);
    });
  }, [debts, searchTerm, statusFilter, approvalFilter, authorityFilter, villageFilter, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredDebts.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedDebts = useMemo(
    () => filteredDebts.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredDebts, safePage, pageSize]
  );

  const detailDebt = useMemo(
    () => debts.find((d) => d.id === detailDebtId) || null,
    [debts, detailDebtId]
  );
  const detailItems = useMemo(
    () => items.filter((i) => i.debtId === detailDebtId),
    [items, detailDebtId]
  );
  const detailSettlements = useMemo(
    () => settlements.filter((s) => s.debtId === detailDebtId),
    [settlements, detailDebtId]
  );

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const submitNewDebt = (targetStatus: DebtApprovalStatus) => {
    setFormErr('');
    if (!selectedBakery) {
      setFormErr('يرجى اختيار المخبز أولاً.');
      return;
    }
    if (!fMinutesNumber.trim()) {
      setFormErr('يجب إدخال رقم المحضر / رقم المرجع.');
      return;
    }
    if (previewMath.gross <= 0) {
      setFormErr('يجب إدخال قيمة مالية موجبة للمديونية.');
      return;
    }
    if (debts.some((d) => d.minutesNumber.trim() === fMinutesNumber.trim() && d.approvalStatus !== 'مرفوض')) {
      setFormErr('رقم المحضر مسجل مسبقاً في مديونية أخرى؛ يمنع التكرار المالي.');
      return;
    }

    onCreateDebt({
      bakeryId: selectedBakery.id,
      bakeryFileNumber: selectedBakery.bakeryNumber,
      bakeryName: selectedBakery.name,
      ownerName: selectedBakery.ownerName,
      posNumber: selectedBakery.posNumber,
      village: selectedBakery.village,
      localUnit: selectedBakery.localUnit,
      phone: selectedBakery.phone,
      issuingAuthority: fAuthority,
      violationType: fViolationType,
      minutesNumber: fMinutesNumber.trim(),
      violationDate: fViolationDate,
      dueDate: fDueDate,
      description: fDescription.trim() || fViolationType,
      notes: fNotes.trim(),
      attachmentRef: fAttachmentRef.trim(),
      recordedBy: currentUserName,
      recordedByUserId: userId,
      approvalStatus: targetStatus,
      approvedBy: targetStatus === 'معتمد' ? currentUserName : undefined,
      approvedAt: targetStatus === 'معتمد' ? new Date().toISOString() : undefined,
      originalAmount: round2(fOriginal),
      priorViolationsAmount: round2(fPrior),
      additionsAmount: round2(fAdditions),
      disposalsAmount: round2(fDisposals),
      approvedSettlementsAmount: round2(fSettlements),
      advancePaidAmount: round2(fAdvance),
    });

    setShowAddModal(false);
    setFMinutesNumber('');
    setFDescription('');
    setFNotes('');
    setFOriginal(0);
    setFPrior(0);
    setFAdditions(0);
    setFDisposals(0);
    setFSettlements(0);
    setFAdvance(0);
  };

  // الأعمدة الكاملة (تشمل وضع رقم الماكينة POS مباشرة بجوار اسم صاحب المخبز + حقول نقص الوزن)
  const columns: SmartTableColumn<BakeryDebtRecord>[] = useMemo(
    () => [
      {
        key: 'serialNumber',
        label: 'م',
        headerText: 'م',
        type: 'numeric',
        sortable: true,
        render: (r) => <span className="num-cell font-black text-slate-700">{toArabicNumerals(r.serialNumber)}</span>,
      },
      {
        key: 'debtNumber',
        label: 'رقم المديونية',
        headerText: 'رقم المديونية',
        type: 'numeric',
        sortable: true,
        render: (r) => <span className="num-cell font-black text-[#102A43]">{toArabicNumerals(r.debtNumber)}</span>,
      },
      {
        key: 'bakeryFileNumber',
        label: 'رقم المخبز',
        headerText: 'رقم المخبز',
        type: 'numeric',
        sortable: true,
        render: (r) => <span className="num-cell font-bold">{toArabicNumerals(r.bakeryFileNumber)}</span>,
      },
      {
        key: 'bakeryName',
        label: 'اسم المخبز',
        headerText: 'اسم المخبز',
        type: 'text',
        sortable: true,
        render: (r) => (
          <button
            type="button"
            onClick={() => onOpenBakeryProfile(r.bakeryId)}
            className="font-black text-[#164E83] hover:underline cursor-pointer text-right"
          >
            {r.bakeryName}
          </button>
        ),
      },
      {
        key: 'ownerName',
        label: 'اسم صاحب المخبز',
        headerText: 'اسم صاحب المخبز',
        type: 'text',
        sortable: true,
        render: (r) => <span className="font-black text-slate-800">{r.ownerName}</span>,
      },
      {
        key: 'posNumber',
        label: 'رقم ماكينة POS',
        headerText: 'رقم ماكينة POS',
        type: 'numeric',
        sortable: true,
        render: (r) => (
          <button
            type="button"
            onClick={() => onOpenBakeryProfile(r.bakeryId)}
            className="num-cell font-black px-2 py-0.5 rounded bg-slate-100 hover:bg-[#102A43] hover:text-white transition-colors cursor-pointer"
          >
            {toArabicNumerals(r.posNumber)}
          </button>
        ),
      },
      {
        key: 'village',
        label: 'القرية',
        headerText: 'القرية',
        type: 'text',
        sortable: true,
        render: (r) => <span className="font-bold text-slate-700">{r.village}</span>,
      },
      {
        key: 'localUnit',
        label: 'الوحدة المحلية',
        headerText: 'الوحدة المحلية',
        type: 'text',
        sortable: true,
        render: (r) => <span className="font-bold text-slate-600">{r.localUnit}</span>,
      },
      {
        key: 'phone',
        label: 'الهاتف',
        headerText: 'الهاتف',
        type: 'numeric',
        sortable: true,
        render: (r) => <span className="num-cell font-bold">{toArabicNumerals(r.phone)}</span>,
      },
      {
        key: 'issuingAuthority',
        label: 'الجهة الصادر عنها',
        headerText: 'الجهة الصادر عنها',
        type: 'text',
        sortable: true,
        render: (r) => <span className="font-bold text-slate-700">{r.issuingAuthority}</span>,
      },
      {
        key: 'violationType',
        label: 'نوع المخالفة',
        headerText: 'نوع المخالفة',
        type: 'text',
        sortable: true,
        render: (r) => <span className="font-black text-[#102A43]">{r.violationType}</span>,
      },
      {
        key: 'minutesNumber',
        label: 'رقم المحضر',
        headerText: 'رقم المحضر',
        type: 'numeric',
        sortable: true,
        render: (r) => <span className="num-cell font-bold">{toArabicNumerals(r.minutesNumber)}</span>,
      },
      {
        key: 'violationDate',
        label: 'تاريخ المخالفة',
        headerText: 'تاريخ المخالفة',
        type: 'date',
        sortable: true,
        render: (r) => <span className="num-cell font-bold">{formatDateArabic(r.violationDate)}</span>,
      },
      {
        key: 'dueDate',
        label: 'تاريخ الاستحقاق',
        headerText: 'تاريخ الاستحقاق',
        type: 'date',
        sortable: true,
        render: (r) => <span className="num-cell font-black">{formatDateArabic(r.dueDate)}</span>,
      },
      {
        key: 'originalAmount',
        label: 'قيمة المخالفة',
        headerText: 'قيمة المخالفة',
        type: 'currency',
        sortable: true,
        render: (r) => <span className="num-cell font-bold">{formatArabicCurrency(r.originalAmount)}</span>,
      },
      {
        key: 'priorViolationsAmount',
        label: 'مخالفات سابقة',
        headerText: 'مخالفات سابقة',
        type: 'currency',
        sortable: true,
        render: (r) => <span className="num-cell font-bold">{formatArabicCurrency(r.priorViolationsAmount)}</span>,
      },
      {
        key: 'additionsAmount',
        label: 'الإضافات',
        headerText: 'الإضافات',
        type: 'currency',
        sortable: true,
        render: (r) => <span className="num-cell font-bold">{formatArabicCurrency(r.additionsAmount)}</span>,
      },
      {
        key: 'disposalsAmount',
        label: 'التصرفات',
        headerText: 'التصرفات',
        type: 'currency',
        sortable: true,
        render: (r) => <span className="num-cell font-bold">{formatArabicCurrency(r.disposalsAmount)}</span>,
      },
      {
        key: 'approvedSettlementsAmount',
        label: 'التسويات',
        headerText: 'التسويات',
        type: 'currency',
        sortable: true,
        render: (r) => <span className="num-cell font-bold text-teal-700">{formatArabicCurrency(r.approvedSettlementsAmount)}</span>,
      },
      {
        key: 'netDueAmount',
        label: 'صافي المديونية',
        headerText: 'صافي المديونية',
        type: 'currency',
        sortable: true,
        render: (r) => <span className="num-cell font-black text-[#102A43]">{formatArabicCurrency(r.netDueAmount)}</span>,
      },
      {
        key: 'totalPaidAmount',
        label: 'إجمالي المدفوعات',
        headerText: 'إجمالي المدفوعات',
        type: 'currency',
        sortable: true,
        render: (r) => <span className="num-cell font-black text-emerald-700">{formatArabicCurrency(r.totalPaidAmount)}</span>,
      },
      {
        key: 'remainingAmount',
        label: 'المتبقي',
        headerText: 'المتبقي',
        type: 'currency',
        sortable: true,
        render: (r) => (
          <span className={`num-cell font-black ${r.remainingAmount > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
            {formatArabicCurrency(r.remainingAmount)}
          </span>
        ),
      },
      {
        key: 'paymentPercentage',
        label: 'نسبة السداد',
        headerText: 'نسبة السداد',
        type: 'numeric',
        sortable: true,
        render: (r) => <span className="num-cell font-black">{formatArabicPercent(r.paymentPercentage, 1)}</span>,
      },
      {
        key: 'remainingPercentage',
        label: 'نسبة المتبقي',
        headerText: 'نسبة المتبقي',
        type: 'numeric',
        sortable: true,
        render: (r) => <span className="num-cell font-bold text-slate-600">{formatArabicPercent(r.remainingPercentage, 1)}</span>,
      },
      {
        key: 'delayDays',
        label: 'أيام التأخير',
        headerText: 'أيام التأخير',
        type: 'numeric',
        sortable: true,
        render: (r) => (
          <span className={`num-cell font-black ${r.delayDays > 0 ? 'text-red-700' : 'text-slate-500'}`}>
            {r.delayDays > 0 ? `${toArabicNumerals(r.delayDays)} يوم` : '٠'}
          </span>
        ),
      },
      {
        key: 'shortageGrams',
        label: 'نقص الوزن (جم)',
        headerText: 'نقص الوزن (جم)',
        type: 'numeric',
        sortable: true,
        render: (r) => (
          <span className="num-cell font-bold text-slate-700">
            {r.shortageGrams ? `${formatArabicDecimal(r.shortageGrams, 2)} جم` : '—'}
          </span>
        ),
      },
      {
        key: 'paymentStatus',
        label: 'حالة السداد',
        headerText: 'حالة السداد',
        type: 'badge',
        sortable: true,
        render: (r) => <DebtPaymentBadge status={r.paymentStatus} />,
      },
      {
        key: 'scheduleStatus',
        label: 'حالة الجدولة',
        headerText: 'حالة الجدولة',
        type: 'badge',
        sortable: true,
        render: (r) => <DebtScheduleBadge status={r.scheduleStatus} />,
      },
      {
        key: 'approvalStatus',
        label: 'حالة الاعتماد',
        headerText: 'حالة الاعتماد',
        type: 'badge',
        sortable: true,
        render: (r) => <ApprovalStatusBadge status={r.approvalStatus} />,
      },
      {
        key: 'recordedBy',
        label: 'المسجل / المسؤول',
        headerText: 'المسجل / المسؤول',
        type: 'text',
        sortable: true,
        render: (r) => <span className="font-bold text-slate-700">{r.recordedBy}</span>,
      },
      {
        key: 'actions',
        label: 'الإجراءات',
        headerText: 'الإجراءات',
        type: 'actions',
        render: (r) => (
          <div className="flex items-center gap-1 whitespace-nowrap">
            <button
              type="button"
              onClick={() => setDetailDebtId(r.id)}
              title="عرض مكونات المديونية"
              className="p-1 rounded bg-slate-100 hover:bg-[#102A43] hover:text-white text-[#102A43] cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            {r.approvalStatus === 'معتمد' && r.remainingAmount > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => onOpenPayModal(r)}
                  title="تسجيل دفعة تحصيل"
                  className="p-1 rounded bg-emerald-50 hover:bg-emerald-700 hover:text-white text-emerald-800 cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenScheduleModal(r)}
                  title="جدولة السداد"
                  className="p-1 rounded bg-blue-50 hover:bg-blue-700 hover:text-white text-blue-800 cursor-pointer"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSettlementDebt(r);
                    setSettleAmount(0);
                    setSettleReason('');
                    setSettleDoc('');
                  }}
                  title="تسوية / خصم معتمد"
                  className="p-1 rounded bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-800 cursor-pointer"
                >
                  <Scale className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            {(r.approvalStatus === 'مسودة' || r.approvalStatus === 'قيد المراجعة') && (
              <>
                <button
                  type="button"
                  onClick={() => onChangeApproval(r.id, 'معتمد')}
                  title="اعتماد المديونية"
                  className="p-1 rounded bg-emerald-100 hover:bg-emerald-700 hover:text-white text-emerald-900 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRejectTargetId(r.id);
                    setRejectReason('');
                  }}
                  title="رفض مع ذكر السبب"
                  className="p-1 rounded bg-red-100 hover:bg-red-700 hover:text-white text-red-900 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        ),
      },
    ],
    [onOpenBakeryProfile, onOpenPayModal, onOpenScheduleModal, onChangeApproval]
  );

  const itemColumns: SmartTableColumn<BakeryDebtItem>[] = useMemo(
    () => [
      { key: 'itemNumber', label: 'رقم البند', headerText: 'رقم البند', type: 'numeric', sortable: true, render: (i) => <span className="num-cell font-black">{toArabicNumerals(i.itemNumber)}</span> },
      { key: 'itemType', label: 'نوع البند', headerText: 'نوع البند', type: 'badge', sortable: true, render: (i) => <span className="font-black text-[#102A43]">{i.itemType}</span> },
      { key: 'description', label: 'البيان', headerText: 'البيان', type: 'text', sortable: true, render: (i) => <span className="font-bold">{i.description}</span> },
      { key: 'dueDate', label: 'الاستحقاق', headerText: 'الاستحقاق', type: 'date', sortable: true, render: (i) => <span className="num-cell font-bold">{formatDateArabic(i.dueDate)}</span> },
      { key: 'amount', label: 'المبلغ', headerText: 'المبلغ', type: 'currency', sortable: true, render: (i) => <span className="num-cell font-black">{formatArabicCurrency(i.amount)}</span> },
      { key: 'paidAmount', label: 'المسدد', headerText: 'المسدد', type: 'currency', sortable: true, render: (i) => <span className="num-cell font-black text-emerald-700">{formatArabicCurrency(i.paidAmount)}</span> },
      { key: 'remainingAmount', label: 'المتبقي', headerText: 'المتبقي', type: 'currency', sortable: true, render: (i) => <span className="num-cell font-black text-red-700">{formatArabicCurrency(i.remainingAmount)}</span> },
      { key: 'status', label: 'الحالة', headerText: 'الحالة', type: 'badge', sortable: true, render: (i) => <span className="px-2 py-0.5 rounded bg-slate-100 font-black text-[10px]">{i.status}</span> },
      { key: 'notes', label: 'ملاحظات', headerText: 'ملاحظات', type: 'text', render: (i) => <span className="font-bold text-slate-600">{i.notes || '—'}</span> },
    ],
    []
  );

  const handleExportCsv = () => {
    const headers = [
      'م', 'رقم المديونية', 'اسم المخبز', 'صاحب المخبز', 'رقم ماكينة POS', 'القرية', 'الوحدة المحلية',
      'الجهة', 'نوع المخالفة', 'رقم المحضر', 'تاريخ الاستحقاق', 'صافي المستحق', 'المسدد', 'المتبقي',
      'نسبة السداد %', 'أيام التأخير', 'حالة السداد', 'حالة الاعتماد',
    ];
    const rows = filteredDebts.map((d) => [
      d.serialNumber, d.debtNumber, d.bakeryName, d.ownerName, d.posNumber, d.village, d.localUnit,
      d.issuingAuthority, d.violationType, d.minutesNumber, d.dueDate, d.netDueAmount, d.totalPaidAmount,
      d.remainingAmount, d.paymentPercentage, d.delayDays, d.paymentStatus, d.approvalStatus,
    ]);
    exportCsvUtf8Bom(`سجل_مديونيات_المخابز_${todayRef}`, headers, rows);
  };

  return (
    <div className="space-y-4">
      {/* شريط الفلاتر والبحث المتقدم والأزرار */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="ابحث باسم المخبز، صاحب المخبز، رقم ماكينة POS، رقم المديونية، المحضر، الهاتف أو القرية..."
              className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-300 text-[12px] font-bold focus:outline-none focus:border-[#102A43]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#102A43] text-white font-black text-[11px] hover:bg-[#164E83] cursor-pointer flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4 text-[#C6A15B]" />
              إضافة مديونية جديدة
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-2 rounded-xl bg-emerald-700 text-white font-black text-[11px] hover:bg-emerald-800 cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              تصدير Excel (CSV)
            </button>
            <button
              type="button"
              onClick={() => setShowPrint(true)}
              className="px-3 py-2 rounded-xl bg-slate-100 text-[#102A43] border border-slate-300 font-black text-[11px] hover:bg-slate-200 cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              طباعة السجل A4
            </button>
          </div>
        </div>

        {/* الفلاتر المتعددة والفلاتر المفضلة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-[11px] font-black bg-slate-50"
          >
            <option value="الكل">حالة السداد: الكل</option>
            <option value="غير مسدد">غير مسدد</option>
            <option value="مسدد جزئيًا">مسدد جزئيًا</option>
            <option value="مسدد بالكامل">مسدد بالكامل</option>
            <option value="متأخر">متأخر</option>
          </select>

          <select
            value={approvalFilter}
            onChange={(e) => { setApprovalFilter(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-[11px] font-black bg-slate-50"
          >
            <option value="الكل">حالة الاعتماد: الكل</option>
            <option value="معتمد">معتمد</option>
            <option value="قيد المراجعة">قيد المراجعة</option>
            <option value="مسودة">مسودة</option>
            <option value="مرفوض">مرفوض</option>
          </select>

          <select
            value={authorityFilter}
            onChange={(e) => { setAuthorityFilter(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-[11px] font-black bg-slate-50"
          >
            <option value="الكل">الجهة المصدرة: الكل</option>
            {settings.authorities.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <select
            value={villageFilter}
            onChange={(e) => { setVillageFilter(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-[11px] font-black bg-slate-50"
          >
            {villagesList.map((v) => (
              <option key={v} value={v}>{v === 'الكل' ? 'القرية: الكل' : v}</option>
            ))}
          </select>

          <div className="flex items-center gap-1">
            <input
              type="text"
              value={favName}
              onChange={(e) => setFavName(e.target.value)}
              placeholder="اسم الفلتر المفضل..."
              className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-slate-300 text-[11px] font-bold"
            />
            <button
              type="button"
              onClick={() => {
                if (!favName.trim()) return;
                onSaveFavoriteFilter({
                  id: `fav-${Date.now()}`,
                  name: favName.trim(),
                  search: searchTerm,
                  status: statusFilter,
                  authority: authorityFilter,
                });
                setFavName('');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-[#C6A15B] text-[#102A43] font-black text-[10px] cursor-pointer shrink-0 flex items-center gap-1"
            >
              <Bookmark className="w-3 h-3" />
              حفظ
            </button>
          </div>
        </div>

        {/* أزرار الفلاتر المفضلة المحفوظة */}
        {settings.favoriteFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-black text-slate-500">فلاتر سريعة محفوظة:</span>
            {settings.favoriteFilters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setSearchTerm(f.search);
                  setStatusFilter(f.status);
                  setAuthorityFilter(f.authority);
                  setPage(1);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#102A43] hover:text-white text-[#102A43] font-black text-[10px] transition-colors cursor-pointer"
              >
                {f.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('الكل');
                setApprovalFilter('الكل');
                setAuthorityFilter('الكل');
                setVillageFilter('الكل');
              }}
              className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 font-black text-[10px] cursor-pointer"
            >
              إعادة ضبط الفلاتر
            </button>
          </div>
        )}
      </div>

      {/* الجدول الرئيسي عبر SmartAutoFitTable */}
      <SmartAutoFitTable
        tableId="bakery-debts-main-registry"
        userId={userId}
        rows={pagedDebts}
        totalCount={filteredDebts.length}
        getRowId={(r) => r.id}
        columns={columns}
        sortKey={sortKey}
        sortAsc={sortAsc}
        onSort={handleSort}
        selectable
        selectedIds={selectedIds}
        onToggleSelect={(id) =>
          setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
        }
        onClearSelection={() => setSelectedIds([])}
        pinnedKeys={pinnedCols}
        onTogglePinColumn={(key) =>
          setPinnedCols((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
        }
        onPinAll={() => setPinnedCols(columns.filter((c) => c.type !== 'actions').map((c) => c.key))}
        onUnpinAll={() => setPinnedCols([])}
        onResetPinDefaults={() =>
          setPinnedCols(['serialNumber', 'debtNumber', 'bakeryName', 'ownerName', 'posNumber'])
        }
        maxHeightClass="max-h-[58vh]"
      />

      {/* شريط الترقيم وحجم الصفحة */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-xl border border-slate-200 px-4 py-2.5 text-[11px] font-black text-slate-700">
        <div className="flex items-center gap-2">
          <span>عدد الصفوف بالصفحة:</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="px-2 py-1 rounded border border-slate-300 bg-slate-50 font-black"
          >
            {[10, 15, 25, 50, 100].map((sz) => (
              <option key={sz} value={sz}>{toArabicNumerals(sz)}</option>
            ))}
          </select>
          <span className="num-cell text-slate-500">
            إجمالي المطابق: {toArabicNumerals(filteredDebts.length)} مديونية
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-2.5 py-1 rounded bg-slate-100 disabled:opacity-40 cursor-pointer"
          >
            السابق
          </button>
          <span className="num-cell">
            صفحة {toArabicNumerals(safePage)} من {toArabicNumerals(totalPages)}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-2.5 py-1 rounded bg-slate-100 disabled:opacity-40 cursor-pointer"
          >
            التالي
          </button>
        </div>
      </div>

      {/* عارض تفاصيل ومكونات المديونية (القسم 4) */}
      {detailDebt && (
        <div className="bg-white rounded-2xl border-2 border-[#102A43] p-5 shadow-lg space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-black text-[14px] text-[#102A43]">
                التفصيل المحاسبي لمكونات المديونية رقم {toArabicNumerals(detailDebt.debtNumber)} — {detailDebt.bakeryName} (POS: {toArabicNumerals(detailDebt.posNumber)})
              </h3>
              <p className="text-[11px] font-bold text-slate-600 mt-0.5">
                {detailDebt.description} | المرفقات: {detailDebt.attachmentRef || 'لا يوجد'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDetailDebtId(null)}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <SmartAutoFitTable
            tableId="debt-items-detail"
            userId={userId}
            rows={detailItems}
            totalCount={detailItems.length}
            getRowId={(i) => i.id}
            columns={itemColumns}
            maxHeightClass="max-h-[32vh]"
          />

          {detailSettlements.length > 0 && (
            <div className="bg-teal-50/60 border border-teal-200 rounded-xl p-3 space-y-1.5">
              <p className="font-black text-[11px] text-teal-900">التسويات والخصومات المعتمدة على هذه المديونية:</p>
              {detailSettlements.map((s) => (
                <div key={s.id} className="text-[11px] font-bold text-teal-800 flex flex-wrap justify-between gap-2">
                  <span>{s.settlementType} — {s.reason} (مرجع: {s.referenceDoc})</span>
                  <span className="num-cell font-black">{formatArabicCurrency(s.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* نافذة إضافة مديونية جديدة (4 أجزاء منظمة) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-black text-base text-[#102A43] flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#C6A15B]" />
                إضافة مديونية جديدة على مخبز — إدارة تموين مركز المحلة الكبرى
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg bg-slate-100 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formErr && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 font-black text-[11px] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {formErr}
              </div>
            )}

            {/* الجزء الأول: بيانات المخبز */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-3">
              <h4 className="font-black text-[12px] text-[#102A43]">الجزء الأول: بيانات المخبز (تُجلب تلقائياً من السجل الأساسي)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10.5px] font-black text-slate-700 mb-1">اختر المخبز</label>
                  <select
                    value={fBakeryId}
                    onChange={(e) => setFBakeryId(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-[11px] font-black"
                  >
                    {bakeries.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} — {b.posNumber} ({b.ownerName})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 px-3 py-2 text-[11px]">
                  <span className="text-slate-500 font-bold block">صاحب المخبز / رقم الماكينة POS</span>
                  <span className="font-black text-[#102A43]">
                    {selectedBakery?.ownerName} · <span className="num-cell text-[#164E83]">{toArabicNumerals(selectedBakery?.posNumber)}</span>
                  </span>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 px-3 py-2 text-[11px]">
                  <span className="text-slate-500 font-bold block">القرية / الوحدة المحلية / الهاتف</span>
                  <span className="font-black text-slate-800">
                    {selectedBakery?.village} · {selectedBakery?.localUnit} · <span className="num-cell">{toArabicNumerals(selectedBakery?.phone)}</span>
                  </span>
                </div>
              </div>
              {existingOpenBakeryDebts.length > 0 && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 text-[10.5px] font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  تنبيه تكرار المخابز: يوجد للمخبز حالياً {toArabicNumerals(existingOpenBakeryDebts.length)} مديونية مفتوحة بإجمالي متبقي{' '}
                  <span className="num-cell font-black">
                    {formatArabicCurrency(existingOpenBakeryDebts.reduce((s, d) => s + d.remainingAmount, 0))}
                  </span>
                </div>
              )}
            </div>

            {/* الجزء الثاني: بيانات المديونية */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-3">
              <h4 className="font-black text-[12px] text-[#102A43]">الجزء الثاني: بيانات المديونية والمحضر والمرفقات</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10.5px] font-black text-slate-700 mb-1">الجهة الصادر عنها المديونية</label>
                  <select value={fAuthority} onChange={(e) => setFAuthority(e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-[11px] font-black">
                    {settings.authorities.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10.5px] font-black text-slate-700 mb-1">نوع المخالفة</label>
                  <select value={fViolationType} onChange={(e) => setFViolationType(e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-[11px] font-black">
                    {settings.violationCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10.5px] font-black text-slate-700 mb-1">رقم المحضر / المرجع</label>
                  <input type="text" value={fMinutesNumber} onChange={(e) => setFMinutesNumber(e.target.value)} placeholder="مثال: محضر-2026-210" className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-[11px] font-bold" />
                </div>
                <div>
                  <label className="block text-[10.5px] font-black text-slate-700 mb-1">تاريخ المخالفة</label>
                  <input type="date" value={fViolationDate} onChange={(e) => setFViolationDate(e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-[11px] font-bold" />
                </div>
                <div>
                  <label className="block text-[10.5px] font-black text-slate-700 mb-1">تاريخ الاستحقاق</label>
                  <input type="date" value={fDueDate} onChange={(e) => setFDueDate(e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-[11px] font-bold" />
                </div>
                <div>
                  <label className="block text-[10.5px] font-black text-slate-700 mb-1">مرجع المستند / المرفق</label>
                  <input type="text" value={fAttachmentRef} onChange={(e) => setFAttachmentRef(e.target.value)} placeholder="رقم حافظة المحاضر / صورة المستند" className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-[11px] font-bold" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10.5px] font-black text-slate-700 mb-1">وصف المديونية</label>
                  <input type="text" value={fDescription} onChange={(e) => setFDescription(e.target.value)} placeholder="بيان تفصيلي لسبب المديونية..." className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-[11px] font-bold" />
                </div>
                <div>
                  <label className="block text-[10.5px] font-black text-slate-700 mb-1">ملاحظات</label>
                  <input type="text" value={fNotes} onChange={(e) => setFNotes(e.target.value)} placeholder="ملاحظات إدارية..." className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-[11px] font-bold" />
                </div>
              </div>
            </div>

            {/* الجزء الثالث: البنود المالية والحساب التلقائي اللحظي */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-3">
              <h4 className="font-black text-[12px] text-[#102A43]">الجزء الثالث: البنود المالية (الإجماليات تُحسب تلقائياً دون تعديل يدوي)</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {[
                  { label: 'قيمة المخالفة (ج.م)', val: fOriginal, set: setFOriginal },
                  { label: 'مخالفات سابقة', val: fPrior, set: setFPrior },
                  { label: 'الإضافات', val: fAdditions, set: setFAdditions },
                  { label: 'التصرفات', val: fDisposals, set: setFDisposals },
                  { label: 'تسويات/خصومات معتمدة', val: fSettlements, set: setFSettlements },
                  { label: 'سداد مقدم (إن وجد)', val: fAdvance, set: setFAdvance },
                ].map((fld) => (
                  <div key={fld.label}>
                    <label className="block text-[10px] font-black text-slate-700 mb-1">{fld.label}</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={fld.val}
                      onChange={(e) => fld.set(Math.max(0, Number(e.target.value) || 0))}
                      className="num-cell w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-[12px] font-black"
                    />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200">
                <div className="bg-white rounded-lg p-2.5 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block">إجمالي قبل التسويات</span>
                  <span className="num-cell text-[13px] font-black text-[#102A43]">{formatArabicCurrency(previewMath.gross)}</span>
                </div>
                <div className="bg-white rounded-lg p-2.5 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block">صافي المديونية المستحقة</span>
                  <span className="num-cell text-[13px] font-black text-[#164E83]">{formatArabicCurrency(previewMath.net)}</span>
                </div>
                <div className="bg-white rounded-lg p-2.5 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block">المتبقي للسداد</span>
                  <span className="num-cell text-[13px] font-black text-red-700">{formatArabicCurrency(previewMath.rem)}</span>
                </div>
                <div className="bg-white rounded-lg p-2.5 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block">نسبة السداد / المتبقي</span>
                  <span className="num-cell text-[12px] font-black text-emerald-700">
                    {formatArabicPercent(previewMath.payPct, 1)} / {formatArabicPercent(previewMath.remPct, 1)}
                  </span>
                </div>
              </div>
            </div>

            {/* الجزء الرابع: أزرار الاعتماد */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button type="button" onClick={() => submitNewDebt('مسودة')} className="px-4 py-2 rounded-xl bg-slate-200 text-slate-800 font-black text-[11px] hover:bg-slate-300 cursor-pointer">
                حفظ كمسودة
              </button>
              <button type="button" onClick={() => submitNewDebt('قيد المراجعة')} className="px-4 py-2 rounded-xl bg-amber-500 text-white font-black text-[11px] hover:bg-amber-600 cursor-pointer">
                حفظ وإرسال للمراجعة
              </button>
              <button type="button" onClick={() => submitNewDebt('معتمد')} className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-black text-[11px] hover:bg-emerald-800 cursor-pointer flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                حفظ واعتماد فوري
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة رفض مديونية مع ذكر السبب */}
      {rejectTargetId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 w-full max-w-md space-y-3">
            <h4 className="font-black text-[13px] text-red-900">رفض اعتماد المديونية</h4>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="اكتب سبب الرفض الإلزامي..."
              className="w-full p-2.5 rounded-xl border border-slate-300 text-[11px] font-bold"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRejectTargetId(null)} className="px-3 py-1.5 rounded-lg bg-slate-100 font-black text-[11px] cursor-pointer">إلغاء</button>
              <button
                type="button"
                onClick={() => {
                  if (!rejectReason.trim()) return;
                  onChangeApproval(rejectTargetId, 'مرفوض', rejectReason.trim());
                  setRejectTargetId(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-red-700 text-white font-black text-[11px] cursor-pointer"
              >
                تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة التسوية / الخصم / عكس الحركة */}
      {settlementDebt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 w-full max-w-md space-y-3">
            <h4 className="font-black text-[13px] text-[#102A43]">
              تسوية مالية معتمدة — {settlementDebt.bakeryName} ({toArabicNumerals(settlementDebt.debtNumber)})
            </h4>
            <div className="space-y-2.5">
              <div>
                <label className="block text-[10.5px] font-black mb-1">نوع الإجراء المالي</label>
                <select value={settleType} onChange={(e) => setSettleType(e.target.value as DebtSettlementRecord['settlementType'])} className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-black">
                  <option value="تسوية معتمدة">تسوية معتمدة (تخصم من المديونية)</option>
                  <option value="خصم معتمد">خصم إداري معتمد</option>
                  <option value="رد مبلغ">رد مبلغ مسدد بالزيادة</option>
                  <option value="عكس حركة">عكس حركة محاسبية</option>
                </select>
              </div>
              <div>
                <label className="block text-[10.5px] font-black mb-1">المبلغ (ج.م)</label>
                <input type="number" min={0} step="0.01" value={settleAmount} onChange={(e) => setSettleAmount(Math.max(0, Number(e.target.value) || 0))} className="num-cell w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[12px] font-black" />
              </div>
              <div>
                <label className="block text-[10.5px] font-black mb-1">رقم القرار / المستند المرجعي</label>
                <input type="text" value={settleDoc} onChange={(e) => setSettleDoc(e.target.value)} placeholder="قرار لجنة / مستند رقم..." className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-[11px] font-bold" />
              </div>
              <div>
                <label className="block text-[10.5px] font-black mb-1">سبب التسوية المعتمد</label>
                <textarea rows={2} value={settleReason} onChange={(e) => setSettleReason(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 text-[11px] font-bold" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setSettlementDebt(null)} className="px-3 py-1.5 rounded-lg bg-slate-100 font-black text-[11px] cursor-pointer">إلغاء</button>
              <button
                type="button"
                onClick={() => {
                  if (settleAmount <= 0 || !settleReason.trim()) return;
                  onApplySettlement(settlementDebt.id, settleType, settleAmount, settleReason.trim(), settleDoc.trim() || 'مستند داخلي');
                  setSettlementDebt(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-[#102A43] text-white font-black text-[11px] cursor-pointer"
              >
                اعتماد التسوية
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة الطباعة الرسمية A4 للسجل */}
      <OfficialPrintModal
        open={showPrint}
        onClose={() => setShowPrint(false)}
        title="كشف سجل مديونيات أصحاب المخابز"
        subtitle={`إجمالي السجلات: ${toArabicNumerals(filteredDebts.length)} مديونية · صافي المستحق: ${formatArabicCurrency(filteredDebts.reduce((s, d) => s + d.netDueAmount, 0))}`}
        docNumber={`REG-${todayRef.replace(/-/g, '')}`}
        printedBy={currentUserName}
        todayRef={todayRef}
      >
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-[#102A43] text-white">
              <th className="border border-slate-400 p-1.5">م</th>
              <th className="border border-slate-400 p-1.5">رقم المديونية</th>
              <th className="border border-slate-400 p-1.5">اسم المخبز</th>
              <th className="border border-slate-400 p-1.5">صاحب المخبز</th>
              <th className="border border-slate-400 p-1.5">ماكينة POS</th>
              <th className="border border-slate-400 p-1.5">المخالفة / المحضر</th>
              <th className="border border-slate-400 p-1.5">الصافي</th>
              <th className="border border-slate-400 p-1.5">المسدد</th>
              <th className="border border-slate-400 p-1.5">المتبقي</th>
              <th className="border border-slate-400 p-1.5">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {filteredDebts.map((d) => (
              <tr key={d.id} className="even:bg-slate-50">
                <td className="border border-slate-300 p-1.5 num-cell">{toArabicNumerals(d.serialNumber)}</td>
                <td className="border border-slate-300 p-1.5 num-cell font-black">{toArabicNumerals(d.debtNumber)}</td>
                <td className="border border-slate-300 p-1.5 font-black">{d.bakeryName}</td>
                <td className="border border-slate-300 p-1.5 font-bold">{d.ownerName}</td>
                <td className="border border-slate-300 p-1.5 num-cell font-black">{toArabicNumerals(d.posNumber)}</td>
                <td className="border border-slate-300 p-1.5">{d.violationType} ({toArabicNumerals(d.minutesNumber)})</td>
                <td className="border border-slate-300 p-1.5 num-cell font-bold">{formatArabicCurrency(d.netDueAmount)}</td>
                <td className="border border-slate-300 p-1.5 num-cell text-emerald-800">{formatArabicCurrency(d.totalPaidAmount)}</td>
                <td className="border border-slate-300 p-1.5 num-cell font-black text-red-800">{formatArabicCurrency(d.remainingAmount)}</td>
                <td className="border border-slate-300 p-1.5 font-black">{d.paymentStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </OfficialPrintModal>
    </div>
  );
}
