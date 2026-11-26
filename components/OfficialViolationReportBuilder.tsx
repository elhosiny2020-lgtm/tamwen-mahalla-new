'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FilePlus2,
  FileText,
  Paperclip,
  Plus,
  Scale,
  Search,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import {
  BakeryRecord,
  OfficialViolationReportRecord,
  ViolationCatalogItem,
  ViolationIssuingAuthorityConfig,
  ViolationReportLineItem,
} from '@/types';
import {
  formatArabicCurrency,
  formatDateArabic,
  normalizeSearchText,
  toArabicNumerals,
} from '@/lib/utils';
import {
  loadOfficialViolationReports,
  loadViolationAuthorities,
  loadViolationCatalog,
  saveOfficialViolationReports,
  saveViolationAuthorities,
  saveViolationCatalog,
} from '@/lib/major-debts-tasks-chat-store';
import { exportCsvUtf8Bom, loadDebtsStore, saveDebtsStore } from '@/lib/debts-data';
import { buildInitialDebtItems, computeDebtFinancials, round2 } from '@/lib/debts-engine';
import SmartAutoFitTable, { SmartTableColumn } from './SmartAutoFitTable';

interface OfficialViolationReportBuilderProps {
  userId: string;
  currentUserName: string;
  bakeries: BakeryRecord[];
  todayRef: string;
  onSelectBakeryDetails: (bakery: BakeryRecord) => void;
  onNotify?: (msg: string) => void;
}

export default function OfficialViolationReportBuilder({
  userId,
  currentUserName,
  bakeries,
  todayRef,
  onSelectBakeryDetails,
  onNotify,
}: OfficialViolationReportBuilderProps) {
  const [authorities, setAuthorities] = useState<ViolationIssuingAuthorityConfig[]>(() =>
    loadViolationAuthorities()
  );
  const [catalog, setCatalog] = useState<ViolationCatalogItem[]>(() => loadViolationCatalog());
  const [reports, setReports] = useState<OfficialViolationReportRecord[]>(() =>
    loadOfficialViolationReports()
  );

  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [authorityFilter, setAuthorityFilter] = useState<string>('ALL');
  const [pinnedCols, setPinnedCols] = useState<string[]>([
    'reportNumber',
    'ownerName',
    'posNumber',
    'bakeryName',
  ]);
  const [localToast, setLocalToast] = useState<string>('');

  const notify = useCallback(
    (msg: string) => {
      setLocalToast(msg);
      setTimeout(() => setLocalToast(''), 3500);
      onNotify?.(msg);
    },
    [onNotify]
  );

  // حقول تحرير محضر جديد متعدد البنود
  const activeAuthorities = useMemo(
    () => authorities.filter((a) => a.isActive),
    [authorities]
  );
  const activeCatalog = useMemo(() => catalog.filter((c) => c.isActive), [catalog]);

  const [fBakeryId, setFBakeryId] = useState<string>(bakeries[0]?.id || '');
  const [fAuthorityName, setFAuthorityName] = useState<string>(
    activeAuthorities[0]?.name || 'إدارة تموين مركز المحلة الكبرى'
  );
  const [fSubDept, setFSubDept] = useState<string>('قسم الرقابة التموينية على المخابز');
  const [fInspector, setFInspector] = useState<string>(currentUserName);
  const [fReportNum, setFReportNum] = useState<string>(
    `محضر-2026-${Math.floor(200 + reports.length * 7)}`
  );
  const [fCaseNum, setFCaseNum] = useState<string>('');
  const [fReportDate, setFReportDate] = useState<string>(todayRef);
  const [fLocation, setFLocation] = useState<string>('مركز المحلة الكبرى');
  const [fStatus, setFStatus] = useState<OfficialViolationReportRecord['reportStatus']>('معتمد');
  const [fAttachmentsInput, setFAttachmentsInput] = useState<string>('صورة_المحضر_الرسمي.pdf');
  const [fNotes, setFNotes] = useState<string>('');
  const [fAutoTransferToDebt, setFAutoTransferToDebt] = useState<boolean>(true);
  const [fError, setFError] = useState<string>('');

  // بنود المخالفات داخل المحضر الواحد
  const [draftItems, setDraftItems] = useState<ViolationReportLineItem[]>(() => {
    const firstCat = INITIAL_CAT_FALLBACK(loadViolationCatalog());
    return [
      {
        id: 'line-1',
        catalogItemId: firstCat.id,
        groupTitle: firstCat.groupTitle,
        violationTypeTitle: firstCat.title,
        detailedDescription: firstCat.title,
        quantity: 1,
        unit: firstCat.defaultUnit,
        decreeOrArticleRef: `${firstCat.legalBasisDecree} — ${firstCat.legalArticle}`,
        competentAuthority: firstCat.competentAuthority,
        approvedMeasure: firstCat.approvedActionAndPenalty,
        fineAmountEgp: firstCat.hasFinancialFineByDefault ? firstCat.defaultBaseFineEgp : 0,
        dueDate: todayRef,
        notes: '',
      },
    ];
  });

  // إدارة إضافة جهة محررة أو نوع مخالفة جديد من الإعدادات
  const [newAuthName, setNewAuthName] = useState<string>('');
  const [newAuthCat, setNewAuthCat] = useState<string>('لجان رقابية');
  const [newCatGroup, setNewCatGroup] = useState<ViolationCatalogItem['groupCode']>('ح');
  const [newCatTitle, setNewCatTitle] = useState<string>('');
  const [newCatDecree, setNewCatDecree] = useState<string>('القرار الوزاري ١٧٥ لسنة ٢٠٢٤');
  const [newCatArticle, setNewCatArticle] = useState<string>('المادة ١٤');
  const [newCatMeasure, setNewCatMeasure] = useState<string>('غرامة مالية معتمدة وفق القرار');
  const [newCatUnit, setNewCatUnit] = useState<string>('محضر');
  const [newCatFine, setNewCatFine] = useState<number>(0);

  const handleAddLineItem = () => {
    const first = activeCatalog[0] || catalog[0];
    if (!first) return;
    setDraftItems((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}-${prev.length + 1}`,
        catalogItemId: first.id,
        groupTitle: first.groupTitle,
        violationTypeTitle: first.title,
        detailedDescription: first.title,
        quantity: 1,
        unit: first.defaultUnit,
        decreeOrArticleRef: `${first.legalBasisDecree} — ${first.legalArticle}`,
        competentAuthority: first.competentAuthority,
        approvedMeasure: first.approvedActionAndPenalty,
        fineAmountEgp: first.hasFinancialFineByDefault ? first.defaultBaseFineEgp : 0,
        dueDate: todayRef,
        notes: '',
      },
    ]);
  };

  const handleSelectCatalogForLine = (lineId: string, catalogId: string) => {
    const found = catalog.find((c) => c.id === catalogId);
    if (!found) return;
    setDraftItems((prev) =>
      prev.map((item) =>
        item.id === lineId
          ? {
              ...item,
              catalogItemId: found.id,
              groupTitle: found.groupTitle,
              violationTypeTitle: found.title,
              detailedDescription: found.title,
              unit: found.defaultUnit,
              decreeOrArticleRef: `${found.legalBasisDecree} — ${found.legalArticle}`,
              competentAuthority: found.competentAuthority,
              approvedMeasure: found.approvedActionAndPenalty,
              fineAmountEgp: found.hasFinancialFineByDefault
                ? round2(found.defaultBaseFineEgp * (item.quantity || 1))
                : 0,
            }
          : item
      )
    );
  };

  const draftTotalFine = useMemo(
    () => round2(draftItems.reduce((s, i) => s + (Number(i.fineAmountEgp) || 0), 0)),
    [draftItems]
  );

  // ترحيل محضر معتمد إلى قسم المديونيات مع منع التكرار
  const handleTransferReportToDebts = useCallback(
    (rep: OfficialViolationReportRecord): { ok: boolean; debtNumber?: string; error?: string } => {
      if (rep.reportStatus !== 'معتمد') {
        return { ok: false, error: 'لا يتم ترحيل المحضر للمديونيات إلا بعد اعتماده رسمياً.' };
      }
      if (rep.totalFineAmountEgp <= 0) {
        return { ok: false, error: 'المحضر لا يتضمن قيمة مالية مستحقة للترحيل.' };
      }
      if (rep.linkedDebtId) {
        return { ok: false, error: `تم ترحيل هذا المحضر مسبقاً برقم مديونية (${rep.linkedDebtNumber}).` };
      }

      const store = loadDebtsStore();
      const duplicate = store.debts.find(
        (d) => d.minutesNumber.trim() === rep.reportNumber.trim() && d.approvalStatus !== 'مرفوض'
      );
      if (duplicate) {
        return {
          ok: false,
          error: `رقم المحضر (${rep.reportNumber}) مرحل بالفعل في سجل المديونيات برقم (${duplicate.debtNumber})؛ يمنع التكرار.`,
        };
      }

      const serial = store.debts.length + 1;
      const debtNumber = `DBT-2026-${String(serial).padStart(3, '0')}`;
      const debtId = `debt-${Date.now()}`;

      const summaryTitles = rep.items.map((i) => i.violationTypeTitle).join(' + ');
      const summaryDecrees = rep.items.map((i) => i.decreeOrArticleRef).join(' | ');

      const newDebt = computeDebtFinancials(
        {
          id: debtId,
          serialNumber: serial,
          debtNumber,
          bakeryId: rep.bakeryId,
          bakeryFileNumber: rep.bakeryNumber,
          bakeryName: rep.bakeryName,
          ownerName: rep.ownerName,
          posNumber: rep.posNumber,
          village: rep.village,
          localUnit: rep.localUnit,
          phone: rep.phone,
          issuingAuthority: rep.issuingAuthoritySnapshot,
          violationType: summaryTitles,
          minutesNumber: rep.reportNumber,
          violationDate: rep.reportDate,
          dueDate: rep.items[0]?.dueDate || todayRef,
          description: `محضر متعدد البنود (${rep.items.length} مخالفات): ${summaryTitles} — السند: ${summaryDecrees}`,
          notes: rep.notes,
          recordedBy: currentUserName,
          recordedByUserId: userId,
          approvalStatus: 'معتمد',
          approvedBy: currentUserName,
          approvedAt: new Date().toISOString(),
          originalAmount: rep.totalFineAmountEgp,
          priorViolationsAmount: 0,
          additionsAmount: 0,
          disposalsAmount: 0,
          approvedSettlementsAmount: 0,
          advancePaidAmount: 0,
          grossBeforeSettlements: rep.totalFineAmountEgp,
          netDueAmount: rep.totalFineAmountEgp,
          totalPaidAmount: 0,
          remainingAmount: rep.totalFineAmountEgp,
          paymentPercentage: 0,
          remainingPercentage: 100,
          paymentStatus: 'غير مسدد',
          scheduleStatus: 'غير مجدول',
          delayDays: 0,
          createdAt: new Date().toISOString(),
        },
        [],
        [],
        todayRef
      );

      const nextDebts = [newDebt, ...store.debts];
      const nextItems = [...buildInitialDebtItems(newDebt), ...store.items];
      saveDebtsStore({
        ...store,
        debts: nextDebts,
        items: nextItems,
      });

      const updatedReports = reports.map((r) =>
        r.id === rep.id
          ? {
              ...r,
              linkedDebtId: debtId,
              linkedDebtNumber: debtNumber,
              transferredToDebtsAt: new Date().toISOString(),
              transferredBy: currentUserName,
            }
          : r
      );
      setReports(updatedReports);
      saveOfficialViolationReports(updatedReports);
      return { ok: true, debtNumber };
    },
    [currentUserName, reports, todayRef, userId]
  );

  const handleSaveNewReport = (e: React.FormEvent) => {
    e.preventDefault();
    setFError('');
    const targetB = bakeries.find((b) => b.id === fBakeryId) || bakeries[0];
    if (!targetB) return;

    if (!fReportNum.trim()) {
      setFError('يرجى إدخال رقم المحضر الرسمي.');
      return;
    }
    if (reports.some((r) => r.reportNumber.trim() === fReportNum.trim())) {
      setFError(`رقم المحضر (${fReportNum}) مسجل مسبقاً؛ يمنع تكرار نفس المحضر.`);
      return;
    }

    // التحقق من وجود سند قانوني لأي بند يتضمن غرامة مالية
    for (const item of draftItems) {
      if (item.fineAmountEgp > 0 && !item.decreeOrArticleRef.trim()) {
        setFError(
          `البند (${item.violationTypeTitle}) يتضمن غرامة مالية بدون سند قانوني معتمد. لا يجوز إنشاء غرامة تلقائية دون سند قانوني.`
        );
        return;
      }
    }

    const newRec: OfficialViolationReportRecord = {
      id: `ovr-${Date.now()}`,
      reportNumber: fReportNum.trim(),
      caseNumber: fCaseNum.trim() || undefined,
      bakeryId: targetB.id,
      bakeryNumber: targetB.bakeryNumber,
      bakeryName: targetB.name,
      ownerName: targetB.ownerName,
      posNumber: targetB.posNumber,
      village: targetB.village,
      localUnit: targetB.localUnit,
      phone: targetB.phone,
      issuingAuthoritySnapshot: fAuthorityName, // حفظ الجهة كما كانت وقت التحرير
      subDepartmentName: fSubDept.trim(),
      inspectorName: fInspector.trim(),
      reportDate: fReportDate,
      reportLocation: fLocation.trim() || targetB.village,
      reportStatus: fStatus,
      paymentStatus: draftTotalFine > 0 ? 'غير مسدد' : 'غير مستحق',
      items: draftItems,
      totalFineAmountEgp: draftTotalFine,
      attachmentsList: fAttachmentsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      notes: fNotes.trim(),
      createdBy: currentUserName,
      createdAt: new Date().toISOString(),
    };

    const nextList = [newRec, ...reports];
    setReports(nextList);
    saveOfficialViolationReports(nextList);

    if (fAutoTransferToDebt && newRec.reportStatus === 'معتمد' && newRec.totalFineAmountEgp > 0) {
      // ترحيل فوري للمديونيات
      const store = loadDebtsStore();
      if (!store.debts.some((d) => d.minutesNumber.trim() === newRec.reportNumber)) {
        const serial = store.debts.length + 1;
        const debtNumber = `DBT-2026-${String(serial).padStart(3, '0')}`;
        const debtId = `debt-${Date.now()}`;
        const summaryTitles = newRec.items.map((i) => i.violationTypeTitle).join(' + ');
        const newDebt = computeDebtFinancials(
          {
            id: debtId,
            serialNumber: serial,
            debtNumber,
            bakeryId: newRec.bakeryId,
            bakeryFileNumber: newRec.bakeryNumber,
            bakeryName: newRec.bakeryName,
            ownerName: newRec.ownerName,
            posNumber: newRec.posNumber,
            village: newRec.village,
            localUnit: newRec.localUnit,
            phone: newRec.phone,
            issuingAuthority: newRec.issuingAuthoritySnapshot,
            violationType: summaryTitles,
            minutesNumber: newRec.reportNumber,
            violationDate: newRec.reportDate,
            dueDate: newRec.items[0]?.dueDate || todayRef,
            description: `محضر مخالفات (${newRec.items.length} بنود): ${summaryTitles}`,
            notes: newRec.notes,
            recordedBy: currentUserName,
            recordedByUserId: userId,
            approvalStatus: 'معتمد',
            approvedBy: currentUserName,
            approvedAt: new Date().toISOString(),
            originalAmount: newRec.totalFineAmountEgp,
            priorViolationsAmount: 0,
            additionsAmount: 0,
            disposalsAmount: 0,
            approvedSettlementsAmount: 0,
            advancePaidAmount: 0,
            grossBeforeSettlements: newRec.totalFineAmountEgp,
            netDueAmount: newRec.totalFineAmountEgp,
            totalPaidAmount: 0,
            remainingAmount: newRec.totalFineAmountEgp,
            paymentPercentage: 0,
            remainingPercentage: 100,
            paymentStatus: 'غير مسدد',
            scheduleStatus: 'غير مجدول',
            delayDays: 0,
            createdAt: new Date().toISOString(),
          },
          [],
          [],
          todayRef
        );
        saveDebtsStore({
          ...store,
          debts: [newDebt, ...store.debts],
          items: [...buildInitialDebtItems(newDebt), ...store.items],
        });
        const withLink = nextList.map((r) =>
          r.id === newRec.id
            ? {
                ...r,
                linkedDebtId: debtId,
                linkedDebtNumber: debtNumber,
                transferredToDebtsAt: new Date().toISOString(),
                transferredBy: currentUserName,
              }
            : r
        );
        setReports(withLink);
        saveOfficialViolationReports(withLink);
        notify(
          `تم اعتماد المحضر (${newRec.reportNumber}) وترحيله تلقائياً إلى مديونيات المخبز برقم (${debtNumber}).`
        );
        setShowCreateModal(false);
        return;
      }
    }

    notify(`تم حفظ المحضر الرسمي (${newRec.reportNumber}) بنجاح.`);
    setShowCreateModal(false);
  };

  const filteredReports = useMemo(() => {
    const q = normalizeSearchText(searchTerm);
    return reports.filter((r) => {
      if (authorityFilter !== 'ALL' && r.issuingAuthoritySnapshot !== authorityFilter) return false;
      if (!q) return true;
      const itemsText = r.items.map((i) => `${i.violationTypeTitle} ${i.decreeOrArticleRef}`).join(' ');
      return normalizeSearchText(
        `${r.reportNumber} ${r.caseNumber || ''} ${r.bakeryName} ${r.ownerName} ${r.posNumber} ${r.village} ${r.issuingAuthoritySnapshot} ${r.inspectorName} ${itemsText}`
      ).includes(q);
    });
  }, [reports, authorityFilter, searchTerm]);

  const reportColumns: SmartTableColumn<OfficialViolationReportRecord>[] = useMemo(
    () => [
      {
        key: 'reportNumber',
        label: 'رقم المحضر',
        headerText: 'رقم المحضر',
        type: 'numeric',
        render: (r) => (
          <span className="num-cell font-black text-[#102A43]">
            {toArabicNumerals(r.reportNumber)}
          </span>
        ),
      },
      {
        key: 'ownerName',
        label: 'اسم صاحب المخبز',
        headerText: 'اسم صاحب المخبز',
        type: 'name',
        render: (r) => {
          const b = bakeries.find((x) => x.id === r.bakeryId);
          return (
            <button
              type="button"
              onClick={() => b && onSelectBakeryDetails(b)}
              className="font-black text-[#102A43] hover:text-[#164E83] hover:underline cursor-pointer text-right"
            >
              {r.ownerName}
            </button>
          );
        },
      },
      {
        key: 'posNumber',
        label: 'رقم ماكينة POS',
        headerText: 'رقم ماكينة POS',
        type: 'numeric',
        render: (r) => {
          const b = bakeries.find((x) => x.id === r.bakeryId);
          return (
            <button
              type="button"
              onClick={() => b && onSelectBakeryDetails(b)}
              className="num-cell font-black px-2 py-0.5 rounded bg-slate-100 hover:bg-[#102A43] hover:text-white text-[#102A43] cursor-pointer"
            >
              {toArabicNumerals(r.posNumber)}
            </button>
          );
        },
      },
      {
        key: 'bakeryName',
        label: 'المخبز والقرية',
        headerText: 'المخبز والقرية',
        type: 'name',
        render: (r) => (
          <div>
            <span className="font-black text-[#164E83] block">{r.bakeryName}</span>
            <span className="text-[10px] font-bold text-slate-500">{r.village}</span>
          </div>
        ),
      },
      {
        key: 'issuingAuthoritySnapshot',
        label: 'الجهة المحررة للمحضر',
        headerText: 'الجهة المحررة للمحضر',
        type: 'text',
        render: (r) => (
          <div>
            <span className="font-black text-slate-800 block">{r.issuingAuthoritySnapshot}</span>
            <span className="text-[10px] font-bold text-slate-500">{r.inspectorName}</span>
          </div>
        ),
      },
      {
        key: 'reportDate',
        label: 'تاريخ المحضر',
        headerText: 'تاريخ المحضر',
        type: 'date',
        render: (r) => <span className="num-cell font-bold">{formatDateArabic(r.reportDate)}</span>,
      },
      {
        key: 'items',
        label: 'بنود المخالفات والسند القانوني',
        headerText: 'بنود المخالفات والسند القانوني',
        type: 'longText',
        render: (r) => (
          <div className="space-y-1">
            {r.items.map((item, idx) => (
              <div key={item.id} className="text-[10.5px] bg-slate-50 px-2 py-1 rounded border border-slate-200">
                <span className="font-black text-[#102A43]">
                  {toArabicNumerals(idx + 1)}) {item.violationTypeTitle}
                </span>{' '}
                <span className="text-slate-600 font-bold">
                  ({toArabicNumerals(item.quantity)} {item.unit}) — {item.decreeOrArticleRef}
                </span>
              </div>
            ))}
          </div>
        ),
      },
      {
        key: 'totalFineAmountEgp',
        label: 'إجمالي الغرامة',
        headerText: 'إجمالي الغرامة',
        type: 'currency',
        render: (r) => (
          <span className="num-cell font-black text-red-700">
            {formatArabicCurrency(r.totalFineAmountEgp)}
          </span>
        ),
      },
      {
        key: 'reportStatus',
        label: 'حالة المحضر والمديونية',
        headerText: 'حالة المحضر والمديونية',
        type: 'badge',
        render: (r) => (
          <div className="space-y-1">
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-300 text-[10px] font-black inline-block">
              {r.reportStatus}
            </span>
            {r.linkedDebtNumber ? (
              <span className="num-cell block text-[10px] font-black text-[#164E83]">
                مرحل: {toArabicNumerals(r.linkedDebtNumber)}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'actions',
        label: 'الربط بالمديونيات',
        headerText: 'الربط بالمديونيات',
        type: 'actions',
        render: (r) =>
          r.linkedDebtId ? (
            <span className="text-[10.5px] font-black text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>تم الترحيل</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                const res = handleTransferReportToDebts(r);
                if (!res.ok) notify(res.error || 'تعذر الترحيل');
                else notify(`تم ترحيل المحضر إلى المديونيات برقم ${res.debtNumber}`);
              }}
              className="px-2.5 py-1 rounded bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-[10px] font-black flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>ترحيل للمديونيات</span>
            </button>
          ),
      },
    ],
    [bakeries, onSelectBakeryDetails, handleTransferReportToDebts, notify]
  );

  return (
    <div className="bg-white rounded-2xl border-2 border-[#102A43]/20 p-4 shadow-xs space-y-3">
      {localToast && (
        <div className="p-3 rounded-xl bg-emerald-800 text-white text-xs font-black flex items-center justify-between">
          <span>{localToast}</span>
          <button type="button" onClick={() => setLocalToast('')} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#102A43] text-[#C6A15B] flex items-center justify-center">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-[#102A43]">
              منظومة تحرير محاضر مخالفات المخابز متعددة البنود والربط التلقائي بالمديونيات
            </h3>
            <p className="text-[11px] font-bold text-slate-600">
              قوائم منسدلة رسمية للجهات المحررة ({toArabicNumerals(authorities.length)} جهة) والدليل الشامل لأنواع المخالفات ({toArabicNumerals(catalog.length)} نوعاً في ٨ مجموعات أ–ح) مرتبطة بالسند القانوني
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#102A43] text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            <Settings2 className="w-4 h-4 text-[#164E83]" />
            <span>إدارة قوائم الجهات وأنواع المخالفات</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setFReportNum(`محضر-2026-${Math.floor(210 + reports.length * 9)}`);
              setFError('');
              setShowCreateModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#C6A15B] hover:bg-[#b58f48] text-[#102A43] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>تحرير محضر مخالفات جديد (متعدد البنود)</span>
          </button>
        </div>
      </div>

      {/* فلاتر البحث والجهة المحررة */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex-1 min-w-[230px]">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث برقم المحضر، رقم القضية، رقم ماكينة POS، صاحب المخبز، نوع المخالفة..."
            className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50 focus:bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={authorityFilter}
            onChange={(e) => setAuthorityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-black text-[#102A43] bg-white"
          >
            <option value="ALL">جميع الجهات المحررة للمحاضر</option>
            {authorities.map((a) => (
              <option key={a.id} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() =>
              exportCsvUtf8Bom(
                `سجل_محاضر_مخالفات_المخابز_${todayRef}`,
                [
                  'رقم المحضر',
                  'رقم القضية',
                  'صاحب المخبز',
                  'رقم ماكينة POS',
                  'المخبز',
                  'القرية',
                  'الجهة المحررة',
                  'المفتش',
                  'تاريخ المحضر',
                  'عدد المخالفات بالمحضر',
                  'إجمالي الغرامة',
                  'حالة المحضر',
                  'رقم المديونية المرحل إليها',
                ],
                filteredReports.map((r) => [
                  r.reportNumber,
                  r.caseNumber || '—',
                  r.ownerName,
                  r.posNumber,
                  r.bakeryName,
                  r.village,
                  r.issuingAuthoritySnapshot,
                  r.inspectorName,
                  r.reportDate,
                  r.items.length,
                  r.totalFineAmountEgp,
                  r.reportStatus,
                  r.linkedDebtNumber || 'غير مرحل',
                ])
              )
            }
            className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      <SmartAutoFitTable
        tableId="official_multi_item_violation_reports"
        userId={userId}
        rows={filteredReports}
        totalCount={reports.length}
        getRowId={(r) => r.id}
        columns={reportColumns}
        pinnedKeys={pinnedCols}
        onPinAll={() => setPinnedCols(['reportNumber', 'ownerName', 'posNumber', 'bakeryName'])}
        onUnpinAll={() => setPinnedCols([])}
        onTogglePinColumn={(k) =>
          setPinnedCols((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]))
        }
        onResetPinDefaults={() =>
          setPinnedCols(['reportNumber', 'ownerName', 'posNumber', 'bakeryName'])
        }
        emptyMessage="لا توجد محاضر مخالفات مطابقة حالياً."
      />

      {/* نافذة تحرير محضر مخالفات متعدد البنود */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white rounded-2xl border-2 border-[#102A43] shadow-2xl max-w-4xl w-full overflow-hidden my-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#102A43] text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10.5px] font-black text-[#C6A15B] block">
                  تحرير محضر مخالفات تموينية رسمي — مربوط بالسند القانوني وسجل المديونيات
                </span>
                <h3 className="text-base font-black">
                  إدراج محضر جديد مع إمكانية تسجيل أكثر من مخالفة في المحضر الواحد
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSaveNewReport}
              className="p-5 space-y-4 text-xs max-h-[82vh] overflow-y-auto"
            >
              {fError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-red-900 font-black">
                  {fError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="sm:col-span-2">
                  <label className="block font-black text-[#102A43] mb-1">
                    المخبز (مرتبط بصاحب المخبز ورقم ماكينة POS) *
                  </label>
                  <select
                    value={fBakeryId}
                    onChange={(e) => setFBakeryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-black bg-white"
                  >
                    {bakeries.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} — POS: {b.posNumber} — صاحب المخبز: {b.ownerName} ({b.village})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-black text-[#102A43] mb-1">
                    الجهة المحررة للمحضر (تحفظ كما كانت وقت التحرير) *
                  </label>
                  <select
                    value={fAuthorityName}
                    onChange={(e) => setFAuthorityName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-black bg-white"
                  >
                    {activeAuthorities.map((a) => (
                      <option key={a.id} value={a.name}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-black text-slate-700 mb-1">
                    اسم الإدارة أو الجهة الفرعية
                  </label>
                  <input
                    type="text"
                    value={fSubDept}
                    onChange={(e) => setFSubDept(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-bold bg-white"
                  />
                </div>

                <div>
                  <label className="block font-black text-slate-700 mb-1">
                    اسم المفتش أو محرر المحضر *
                  </label>
                  <input
                    type="text"
                    required
                    value={fInspector}
                    onChange={(e) => setFInspector(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-bold bg-white"
                  />
                </div>

                <div>
                  <label className="block font-black text-slate-700 mb-1">
                    رقم المحضر (منع التكرار) *
                  </label>
                  <input
                    type="text"
                    required
                    value={fReportNum}
                    onChange={(e) => setFReportNum(e.target.value)}
                    className="num-cell w-full px-3 py-1.5 rounded-xl border border-slate-300 font-black bg-white"
                  />
                </div>

                <div>
                  <label className="block font-black text-slate-700 mb-1">
                    تاريخ المحضر *
                  </label>
                  <input
                    type="date"
                    required
                    value={fReportDate}
                    onChange={(e) => setFReportDate(e.target.value)}
                    className="num-cell w-full px-3 py-1.5 rounded-xl border border-slate-300 font-black bg-white"
                  />
                </div>

                <div>
                  <label className="block font-black text-slate-700 mb-1">
                    مكان تحرير المحضر
                  </label>
                  <input
                    type="text"
                    value={fLocation}
                    onChange={(e) => setFLocation(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-bold bg-white"
                  />
                </div>

                <div>
                  <label className="block font-black text-slate-700 mb-1">
                    رقم القضية بالجهة المختصة (إن وجد)
                  </label>
                  <input
                    type="text"
                    value={fCaseNum}
                    onChange={(e) => setFCaseNum(e.target.value)}
                    placeholder="مثال: جنحة ٤١٢ لسنة ٢٠٢٦"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-bold bg-white"
                  />
                </div>

                <div>
                  <label className="block font-black text-slate-700 mb-1">حالة المحضر</label>
                  <select
                    value={fStatus}
                    onChange={(e) =>
                      setFStatus(e.target.value as OfficialViolationReportRecord['reportStatus'])
                    }
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-black bg-white"
                  >
                    <option value="مسودة">مسودة</option>
                    <option value="قيد المراجعة">قيد المراجعة</option>
                    <option value="معتمد">معتمد</option>
                    <option value="محال للجهة المختصة">محال للجهة المختصة</option>
                    <option value="مغلق">مغلق</option>
                  </select>
                </div>

                <div>
                  <label className="block font-black text-slate-700 mb-1">
                    المرفقات والصور والمستندات
                  </label>
                  <input
                    type="text"
                    value={fAttachmentsInput}
                    onChange={(e) => setFAttachmentsInput(e.target.value)}
                    placeholder="أسماء الملفات مفصولة بفاصلة..."
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-bold bg-white"
                  />
                </div>
              </div>

              {/* بنود المخالفات المفصولة داخل المحضر الواحد */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-black text-[#102A43]">
                    بنود المخالفات المسجلة داخل المحضر ({toArabicNumerals(draftItems.length)} مخالفة) — كل مخالفة مفصولة بحساباتها وسندها القانوني
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="px-3 py-1.5 rounded-xl bg-[#164E83] hover:bg-[#102A43] text-white font-black flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة مخالفة أخرى لنفس المحضر</span>
                  </button>
                </div>

                {draftItems.map((line, idx) => (
                  <div
                    key={line.id}
                    className="p-3.5 rounded-xl border-2 border-slate-200 bg-[#FAFBFD] space-y-2.5"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="font-black text-[#102A43]">
                        المخالفة رقم ({toArabicNumerals(idx + 1)}) بالمحضر
                      </span>
                      {draftItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setDraftItems((prev) => prev.filter((x) => x.id !== line.id))
                          }
                          className="text-red-700 hover:text-red-900 font-black flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف البند</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      <div className="sm:col-span-2">
                        <label className="block font-black text-slate-700 mb-1">
                          نوع المخالفة (من الدليل المعتمد أ–ح) *
                        </label>
                        <select
                          value={line.catalogItemId}
                          onChange={(e) => handleSelectCatalogForLine(line.id, e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-black bg-white"
                        >
                          {(['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح'] as const).map((gCode) => {
                            const groupItems = activeCatalog.filter((c) => c.groupCode === gCode);
                            if (groupItems.length === 0) return null;
                            return (
                              <optgroup key={gCode} label={groupItems[0].groupTitle}>
                                {groupItems.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.title} ({c.legalBasisDecree})
                                  </option>
                                ))}
                              </optgroup>
                            );
                          })}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-black text-slate-700 mb-1">
                          رقم القرار أو المادة القانونية السارية (إلزامي للغرامة) *
                        </label>
                        <input
                          type="text"
                          value={line.decreeOrArticleRef}
                          onChange={(e) =>
                            setDraftItems((prev) =>
                              prev.map((x) =>
                                x.id === line.id ? { ...x, decreeOrArticleRef: e.target.value } : x
                              )
                            )
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white"
                        />
                      </div>

                      <div>
                        <label className="block font-black text-slate-700 mb-1">
                          الكمية / مقدار المخالفة
                        </label>
                        <input
                          type="number"
                          min={0.1}
                          step="0.5"
                          value={line.quantity}
                          onChange={(e) => {
                            const qty = Number(e.target.value) || 1;
                            const cat = catalog.find((c) => c.id === line.catalogItemId);
                            setDraftItems((prev) =>
                              prev.map((x) =>
                                x.id === line.id
                                  ? {
                                      ...x,
                                      quantity: qty,
                                      fineAmountEgp:
                                        cat && cat.hasFinancialFineByDefault
                                          ? round2(cat.defaultBaseFineEgp * qty)
                                          : x.fineAmountEgp,
                                    }
                                  : x
                              )
                            );
                          }}
                          className="num-cell w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-black bg-white"
                        />
                      </div>

                      <div>
                        <label className="block font-black text-slate-700 mb-1">وحدة القياس</label>
                        <input
                          type="text"
                          value={line.unit}
                          onChange={(e) =>
                            setDraftItems((prev) =>
                              prev.map((x) =>
                                x.id === line.id ? { ...x, unit: e.target.value } : x
                              )
                            )
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white"
                        />
                      </div>

                      <div>
                        <label className="block font-black text-slate-700 mb-1">
                          قيمة الغرامة المستحقة (ج.م)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={line.fineAmountEgp}
                          onChange={(e) =>
                            setDraftItems((prev) =>
                              prev.map((x) =>
                                x.id === line.id
                                  ? { ...x, fineAmountEgp: Number(e.target.value) || 0 }
                                  : x
                              )
                            )
                          }
                          className="num-cell w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-black text-red-700 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block font-black text-slate-700 mb-1">
                          تاريخ الاستحقاق
                        </label>
                        <input
                          type="date"
                          value={line.dueDate}
                          onChange={(e) =>
                            setDraftItems((prev) =>
                              prev.map((x) =>
                                x.id === line.id ? { ...x, dueDate: e.target.value } : x
                              )
                            )
                          }
                          className="num-cell w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-black bg-white"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-black text-slate-700 mb-1">
                          وصف تفصيلي للمخالفة
                        </label>
                        <input
                          type="text"
                          value={line.detailedDescription}
                          onChange={(e) =>
                            setDraftItems((prev) =>
                              prev.map((x) =>
                                x.id === line.id
                                  ? { ...x, detailedDescription: e.target.value }
                                  : x
                              )
                            )
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-black text-slate-700 mb-1">
                          الإجراء والجزاء المعتمد والجهة المختصة
                        </label>
                        <input
                          type="text"
                          value={`${line.approvedMeasure} (${line.competentAuthority})`}
                          readOnly
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold bg-slate-100 text-slate-700"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-300 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-black text-[#102A43] block">
                    إجمالي المبالغ المستحقة بالمحضر:{' '}
                    <span className="num-cell text-red-700 text-sm">
                      {formatArabicCurrency(draftTotalFine)}
                    </span>
                  </span>
                  <label className="flex items-center gap-1.5 font-bold text-slate-700 mt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fAutoTransferToDebt}
                      onChange={(e) => setFAutoTransferToDebt(e.target.checked)}
                    />
                    <span>
                      ترحيل المحضر المعتمد تلقائياً إلى حساب المخبز في قسم المديونيات مع حفظ رقم المحضر ومصدر المديونية
                    </span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-300 font-black cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] font-black cursor-pointer"
                  >
                    اعتماد وحفظ المحضر
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة إعدادات وإدارة الجهات المحررة للمحاضر وأنواع المخالفات */}
      {showSettingsModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            className="bg-white rounded-2xl border-2 border-[#102A43] shadow-2xl max-w-4xl w-full overflow-hidden my-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#102A43] text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10.5px] font-black text-[#C6A15B] block">
                  إعدادات القوائم التصنيفية لمحاضر المخالفات (قابلة للإضافة والتعديل والتعطيل)
                </span>
                <h3 className="text-base font-black">
                  إدارة الجهات المحررة للمحاضر والدليل القانوني لأنواع المخالفات (أ–ح)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 rounded-lg bg-white/15 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 text-xs max-h-[80vh] overflow-y-auto">
              {/* أولاً: إدارة الجهات المحررة للمحضر */}
              <div className="space-y-2.5">
                <h4 className="font-black text-[#102A43] text-sm">
                  ١. قائمة الجهات المحررة للمحضر (تعديل الأسماء لا يغير المحاضر القديمة المؤرشفة)
                </h4>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={newAuthName}
                    onChange={(e) => setNewAuthName(e.target.value)}
                    placeholder="اسم الجهة المحررة الجديدة..."
                    className="flex-1 min-w-[200px] px-3 py-1.5 rounded-xl border border-slate-300 font-bold"
                  />
                  <input
                    type="text"
                    value={newAuthCat}
                    onChange={(e) => setNewAuthCat(e.target.value)}
                    placeholder="التصنيف..."
                    className="px-3 py-1.5 rounded-xl border border-slate-300 font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newAuthName.trim()) return;
                      const next: ViolationIssuingAuthorityConfig[] = [
                        ...authorities,
                        {
                          id: `auth-${Date.now()}`,
                          name: newAuthName.trim(),
                          category: newAuthCat.trim() || 'جهات رقابية',
                          isActive: true,
                        },
                      ];
                      setAuthorities(next);
                      saveViolationAuthorities(next);
                      setNewAuthName('');
                    }}
                    className="px-4 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] font-black cursor-pointer"
                  >
                    + إضافة جهة محررة
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {authorities.map((a) => (
                    <div
                      key={a.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                        a.isActive ? 'bg-slate-50 border-slate-200' : 'bg-slate-100 opacity-60'
                      }`}
                    >
                      <span className="font-black text-[#102A43] truncate">{a.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = authorities.map((x) =>
                            x.id === a.id ? { ...x, isActive: !x.isActive } : x
                          );
                          setAuthorities(next);
                          saveViolationAuthorities(next);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-black cursor-pointer ${
                          a.isActive ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'
                        }`}
                      >
                        {a.isActive ? 'مفعل' : 'معطل'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* ثانياً: إضافة نوع مخالفة جديد مع السند القانوني */}
              <div className="space-y-2.5 pt-3 border-t border-slate-200">
                <h4 className="font-black text-[#102A43] text-sm">
                  ٢. إضافة نوع مخالفة جديد مربوط بالقرار أو المادة القانونية السارية
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={newCatGroup}
                    onChange={(e) =>
                      setNewCatGroup(e.target.value as ViolationCatalogItem['groupCode'])
                    }
                    className="px-3 py-1.5 rounded-xl border border-slate-300 font-bold"
                  >
                    <option value="أ">أ- مخالفات إنتاج الخبز والمواصفات</option>
                    <option value="ب">ب- مخالفات التصرف في الدقيق والحصص</option>
                    <option value="ج">ج- مخالفات التشغيل والإنتاج</option>
                    <option value="د">د- مخالفات النظافة والصحة والسلامة</option>
                    <option value="هـ">هـ- مخالفات اللوحات والإعلانات والإفصاح</option>
                    <option value="و">و- مخالفات الميزان والتعامل مع المواطنين</option>
                    <option value="ز">ز- مخالفات التراخيص والمستندات والسجلات</option>
                    <option value="ح">ح- مخالفات مالية وإدارية أخرى</option>
                  </select>
                  <input
                    type="text"
                    value={newCatTitle}
                    onChange={(e) => setNewCatTitle(e.target.value)}
                    placeholder="مسمى نوع المخالفة..."
                    className="px-3 py-1.5 rounded-xl border border-slate-300 font-bold"
                  />
                  <input
                    type="text"
                    value={newCatDecree}
                    onChange={(e) => setNewCatDecree(e.target.value)}
                    placeholder="رقم القرار الوزاري أو القانون..."
                    className="px-3 py-1.5 rounded-xl border border-slate-300 font-bold"
                  />
                  <input
                    type="text"
                    value={newCatArticle}
                    onChange={(e) => setNewCatArticle(e.target.value)}
                    placeholder="المادة القانونية..."
                    className="px-3 py-1.5 rounded-xl border border-slate-300 font-bold"
                  />
                  <input
                    type="number"
                    min={0}
                    value={newCatFine}
                    onChange={(e) => setNewCatFine(Number(e.target.value) || 0)}
                    placeholder="الغرامة الأساسية (٠ إذا كانت إدارية)"
                    className="num-cell px-3 py-1.5 rounded-xl border border-slate-300 font-black"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newCatTitle.trim() || !newCatDecree.trim()) return;
                      const groupTitleMap: Record<ViolationCatalogItem['groupCode'], string> = {
                        أ: 'أ- مخالفات إنتاج الخبز والمواصفات',
                        ب: 'ب- مخالفات التصرف في الدقيق والحصص',
                        ج: 'ج- مخالفات التشغيل والإنتاج',
                        د: 'د- مخالفات النظافة والصحة والسلامة',
                        'هـ': 'هـ- مخالفات اللوحات والإعلانات والإفصاح',
                        و: 'و- مخالفات الميزان والتعامل مع المواطنين',
                        ز: 'ز- مخالفات التراخيص والمستندات والسجلات',
                        ح: 'ح- مخالفات مالية وإدارية أخرى',
                      };
                      const next: ViolationCatalogItem[] = [
                        {
                          id: `vc-${Date.now()}`,
                          code: `CUST-${catalog.length + 1}`,
                          groupCode: newCatGroup,
                          groupTitle: groupTitleMap[newCatGroup],
                          title: newCatTitle.trim(),
                          legalBasisDecree: newCatDecree.trim(),
                          legalArticle: newCatArticle.trim(),
                          competentAuthority: 'إدارة الرقابة التموينية',
                          approvedActionAndPenalty: newCatMeasure,
                          defaultUnit: newCatUnit,
                          hasFinancialFineByDefault: newCatFine > 0,
                          defaultBaseFineEgp: newCatFine,
                          isActive: true,
                        },
                        ...catalog,
                      ];
                      setCatalog(next);
                      saveViolationCatalog(next);
                      setNewCatTitle('');
                    }}
                    className="px-4 py-1.5 rounded-xl bg-emerald-700 text-white font-black cursor-pointer"
                  >
                    + حفظ نوع المخالفة بالدليل
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function INITIAL_CAT_FALLBACK(list: ViolationCatalogItem[]): ViolationCatalogItem {
  return (
    list[0] || {
      id: 'vc-a1',
      code: 'A-01',
      groupCode: 'أ',
      groupTitle: 'أ- مخالفات إنتاج الخبز والمواصفات',
      title: 'نقص وزن الرغيف',
      legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤',
      legalArticle: 'المادة ١٤',
      competentAuthority: 'إدارة الرقابة التموينية',
      approvedActionAndPenalty: 'غرامة طبقاً لمعادلة الحصة التأمينية',
      defaultUnit: 'جرام',
      hasFinancialFineByDefault: true,
      defaultBaseFineEgp: 1750,
      isActive: true,
    }
  );
}
