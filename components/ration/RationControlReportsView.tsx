'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ClipboardList,
  Download,
  FileBarChart2,
  MessageSquareWarning,
  Plus,
  Printer,
  Search,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import {
  ALL_50_RATION_REPORTS,
  CitizenIssueTransactionRecord,
  CommodityPriceHistoryRecord,
  RationAuditLogRecord,
  RationCardRecord,
  RationCommodityRecord,
  RationComplaintRecord,
  RationDepartmentSettings,
  RationFieldInspectionRecord,
  RationMerchantRecord,
  RationQuotaRecord,
  RationSmartAlertRecord,
  RationWarehouseRecord,
  VillageBeneficiaryStatRecord,
  WarehouseLedgerMovementRecord,
  WarehousePurchaseReceiptRecord,
  WarehouseStocktakeRecord,
  WarehouseTransferRecord,
  computeQuotaMetrics,
  maskNationalIdOrCard,
} from '@/lib/ration-commodities-store';
import { MAHALLA_VILLAGES } from '@/lib/bakery-math';
import { formatArabicCurrency, formatArabicNumber, formatDateArabic, toArabicNumerals } from '@/lib/utils';
import { exportCsvUtf8Bom } from '@/lib/debts-data';
import { OfficialPrintModal } from '../debts/DebtsSharedUi';
import {
  EditableFieldSpec,
  TableActionButtons,
  UniversalCrudModal,
} from '../trade/TradeSharedCrudUi';

export type RationControlReportsScreenKey =
  | 'field_control'
  | 'ration_complaints'
  | 'smart_alerts'
  | 'reports_center'
  | 'print_export'
  | 'settings_audit';

interface RationControlReportsViewProps {
  activeScreen: RationControlReportsScreenKey;
  todayRef: string;
  currentUserName: string;
  commodities: RationCommodityRecord[];
  priceHistory: CommodityPriceHistoryRecord[];
  merchants: RationMerchantRecord[];
  quotas: RationQuotaRecord[];
  warehouses: RationWarehouseRecord[];
  receipts: WarehousePurchaseReceiptRecord[];
  ledger: WarehouseLedgerMovementRecord[];
  transfers: WarehouseTransferRecord[];
  stocktakes: WarehouseStocktakeRecord[];
  cards: RationCardRecord[];
  beneficiaryStats: VillageBeneficiaryStatRecord[];
  citizenIssues: CitizenIssueTransactionRecord[];
  inspections: RationFieldInspectionRecord[];
  setInspections: (next: RationFieldInspectionRecord[]) => void;
  complaints: RationComplaintRecord[];
  setComplaints: (next: RationComplaintRecord[]) => void;
  smartAlerts: RationSmartAlertRecord[];
  closedAlertIds: Record<string, boolean>;
  onCloseAlert: (id: string) => void;
  auditLogs: RationAuditLogRecord[];
  settings: RationDepartmentSettings;
  onUpdateSettings: (next: RationDepartmentSettings) => void;
  onLogAudit: (screen: string, actionType: 'إضافة' | 'تعديل' | 'حذف' | 'قيد عكسي' | 'اعتماد', details: string) => void;
  onNotify: (msg: string) => void;
  onNavigateScreen: (screen: RationControlReportsScreenKey) => void;
}

export default function RationControlReportsView({
  activeScreen,
  todayRef,
  currentUserName,
  commodities,
  priceHistory,
  merchants,
  quotas,
  warehouses,
  receipts,
  ledger,
  transfers,
  stocktakes,
  cards,
  beneficiaryStats,
  citizenIssues,
  inspections,
  setInspections,
  complaints,
  setComplaints,
  smartAlerts,
  closedAlertIds,
  onCloseAlert,
  auditLogs,
  settings,
  onUpdateSettings,
  onLogAudit,
  onNotify,
  onNavigateScreen,
}: RationControlReportsViewProps) {
  const [complaintStatusFilter, setComplaintStatusFilter] = useState('ALL');
  const [alertCategoryFilter, setAlertCategoryFilter] = useState('ALL');
  const [alertSeverityFilter, setAlertSeverityFilter] = useState('ALL');
  const [reportSearch, setReportSearch] = useState('');
  const [reportGroupFilter, setReportGroupFilter] = useState('ALL');
  const [selectedReportId, setSelectedReportId] = useState('rrep-01');
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [showOfficialPrintModal, setShowOfficialPrintModal] = useState(false);
  const [selectedExportCols, setSelectedExportCols] = useState<Record<number, boolean>>({});
  const [newCategoryInput, setNewCategoryInput] = useState('');

  const [crudModal, setCrudModal] = useState<{
    title: string;
    mode: 'view' | 'edit';
    record: Record<string, unknown>;
    fields: EditableFieldSpec[];
    onSave?: (updated: Record<string, unknown>) => void;
  } | null>(null);

  // بناء بيانات التقرير المختار من بين الـ ٥٠ تقريراً
  const activeReport = useMemo(
    () => ALL_50_RATION_REPORTS.find((r) => r.id === selectedReportId) || ALL_50_RATION_REPORTS[0],
    [selectedReportId]
  );

  const activeReportData = useMemo((): { headers: string[]; rows: (string | number)[][]; summary: string } => {
    const n = activeReport.num;
    if (n <= 8) {
      if (n === 3) {
        return {
          headers: ['الكود', 'السلعة', 'السعر السابق', 'السعر الجديد', 'تاريخ السريان', 'القرار الوزاري', 'المستخدم', 'الاعتماد'],
          rows: priceHistory.map((p) => [p.commodityCode, p.commodityName, p.previousPriceEgp, p.newPriceEgp, p.effectiveDate, p.decreeNumber, p.updatedBy, p.approvalStatus]),
          summary: `إجمالي التعديلات السعرية الموثقة: ${toArabicNumerals(priceHistory.length)}`,
        };
      }
      return {
        headers: ['الكود', 'السلعة', 'التصنيف', 'الوحدة', 'السعر التمويني', 'سعر الجملة', 'هامش التاجر', 'السعر الحر', 'حد الأمان', 'الحالة'],
        rows: commodities.map((c) => [c.commodityCode, c.commodityName, c.category, c.unit, c.officialSubsidizedPriceEgp, c.wholesalePriceEgp, c.merchantMarginEgp, c.officialFreePriceEgp, c.minSafetyStock, c.status]),
        summary: `إجمالي السلع التموينية بالتقرير: ${toArabicNumerals(commodities.length)} سلعة`,
      };
    }
    if (n <= 18) {
      return {
        headers: ['كود التاجر', 'اسم التاجر', 'المنفذ', 'النوع', 'القرية', 'رقم POS', 'رقم الترخيص', 'انتهاء الترخيص', 'البطاقة الضريبية', 'انتهاء الضريبية', 'السجل التجاري', 'انتهاء السجل', 'الحالة'],
        rows: merchants.map((m) => [m.merchantCode, m.merchantName, m.outletTradeName, m.outletType, m.village, m.posMachineNumber, m.licenseNumber, m.licenseExpiryDate, m.taxCardNumber, m.taxCardExpiryDate, m.commercialRegisterNumber, m.commercialRegisterExpiryDate, m.status]),
        summary: `إجمالي التجار التموينيين بالتقرير: ${toArabicNumerals(merchants.length)} تاجر ومنفذ`,
      };
    }
    if (n <= 26) {
      return {
        headers: ['كود الحصة', 'الفترة', 'القرية', 'التاجر', 'السلعة', 'الأصلية', 'المعتمدة', 'الموردة', 'المنصرفة', 'المتبقي', 'نسبة التنفيذ٪', 'نسبة التوريد٪', 'الحالة'],
        rows: quotas.map((q) => {
          const m = computeQuotaMetrics(q);
          return [q.quotaCode, q.periodLabel, q.village, q.merchantName, q.commodityName, q.originalApprovedQuota, m.effectiveApproved, q.suppliedQuantity, q.dispensedQuantity, m.remainingToDispense, `${m.executionRatePct}%`, `${m.supplyRatePct}%`, q.status];
        }),
        summary: `إجمالي الحصص التموينية: ${toArabicNumerals(quotas.length)} حصة`,
      };
    }
    if (n <= 34) {
      if (n === 28) {
        return {
          headers: ['رقم الإذن', 'التاريخ', 'المخزن', 'المورد', 'السلعة', 'الكمية', 'القيمة ج.م', 'الصلاحية', 'الاعتماد'],
          rows: receipts.map((r) => [r.receiptNumber, r.receiptDate, r.warehouseName, r.supplierName, r.commodityName, r.quantityReceived, r.totalValueEgp, r.expiryDate, r.approvalStatus]),
          summary: `إجمالي أذون الاستلام: ${toArabicNumerals(receipts.length)}`,
        };
      }
      if (n === 30) {
        return {
          headers: ['رقم التحويل', 'التاريخ', 'من مخزن', 'إلى مخزن', 'السلعة', 'الكمية', 'الاعتماد'],
          rows: transfers.map((t) => [t.transferNumber, t.transferDate, t.fromWarehouseName, t.toWarehouseName, t.commodityName, t.quantity, t.approvalStatus]),
          summary: `إجمالي التحويلات بين المخازن: ${toArabicNumerals(transfers.length)}`,
        };
      }
      if (n === 31) {
        return {
          headers: ['محضر الجرد', 'التاريخ', 'المخزن', 'السلعة', 'الدفتري', 'الفعلي', 'الفرق', 'النتيجة'],
          rows: stocktakes.map((s) => [s.stocktakeNumber, s.stocktakeDate, s.warehouseName, s.commodityName, s.bookBalance, s.actualPhysicalCount, s.varianceQty, s.status]),
          summary: `إجمالي محاضر الجرد: ${toArabicNumerals(stocktakes.length)}`,
        };
      }
      if (n === 27 || n === 34) {
        return {
          headers: ['كود المخزن', 'اسم المخزن', 'القرية', 'الأمين', 'السعة (طن)', 'الإشغال', 'الترخيص', 'انتهاء الترخيص', 'الضريبية', 'السجل التجاري'],
          rows: warehouses.map((w) => [w.warehouseCode, w.warehouseName, w.village, w.managerName, w.capacityTons, w.currentOccupancyTons, w.licenseNumber, w.licenseExpiryDate, w.taxCardNumber, w.commercialRegisterNumber]),
          summary: `إجمالي المخازن: ${toArabicNumerals(warehouses.length)}`,
        };
      }
      return {
        headers: ['رقم القيد', 'التاريخ', 'المخزن', 'السلعة', 'افتتاحي', 'وارد', 'منصرف', 'تالف', 'الرصيد الآلي'],
        rows: ledger.map((l) => [l.movementNumber, l.movementDate, l.warehouseName, l.commodityName, l.openingBalance, l.incomingQty, l.dispensedQty, l.damagedQty, l.computedClosingBalance]),
        summary: `إجمالي حركات دفتر المخازن: ${toArabicNumerals(ledger.length)}`,
      };
    }
    if (n <= 43) {
      if (n >= 37 && n <= 40) {
        const targetYear = n === 37 ? 2023 : n === 38 ? 2024 : 2025;
        return {
          headers: ['القرية', 'الوحدة المحلية', 'السنة', 'البطاقات', 'المستفيدون', 'الدعم الشهري (ج.م)', 'السكر (كجم)', 'الزيت (زجاجة)'],
          rows: beneficiaryStats.map((v) => {
            const sn = v.yearlySnapshots.find((s) => s.year === targetYear) || v.yearlySnapshots[0];
            return [v.village, v.localUnit, targetYear, sn?.cardsCount || 0, sn?.beneficiariesCount || 0, sn?.monthlySupportValueEgp || 0, sn?.dispensedSugarKg || 0, sn?.dispensedOilBottles || 0];
          }),
          summary: `إحصاء المستفيدين لعام ${toArabicNumerals(targetYear)} — عدد القرى: ${toArabicNumerals(beneficiaryStats.length)}`,
        };
      }
      if (n >= 41) {
        return {
          headers: ['الرقم المرجعي', 'التاريخ', 'رقم البطاقة', 'المواطن', 'التاجر', 'القرية', 'السلع المنصرفة', 'الدعم ج.م', 'الحالة'],
          rows: citizenIssues.map((tx) => [tx.referenceNumber, tx.issueDate, maskNationalIdOrCard(tx.cardNumber, !settings.maskSensitiveCardDataByDefault), tx.headOfFamilyName, tx.merchantName, tx.village, tx.itemsSummary, tx.totalSupportUsedEgp, tx.status]),
          summary: `إجمالي عمليات صرف المواطنين: ${toArabicNumerals(citizenIssues.length)}`,
        };
      }
      return {
        headers: ['رقم البطاقة', 'رب الأسرة', 'الأفراد', 'النوع', 'القرية', 'التاجر المربوط', 'الدعم الشهري', 'الحالة'],
        rows: cards.map((c) => [maskNationalIdOrCard(c.cardNumber, !settings.maskSensitiveCardDataByDefault), c.headOfFamilyName, c.beneficiariesCount, c.cardType, c.village, c.assignedMerchantName, c.monthlySupportValueEgp, c.status]),
        summary: `إجمالي البطاقات التموينية: ${toArabicNumerals(cards.length)}`,
      };
    }
    if (n === 47) {
      return {
        headers: ['رقم الشكوى', 'التاريخ', 'المواطن', 'القرية', 'التاجر', 'الموضوع', 'المكلف بالفحص', 'الحالة'],
        rows: complaints.map((c) => [c.complaintNumber, c.complaintDate, c.citizenName, c.village, c.targetMerchantName, c.subject, c.assignedInspector, c.status]),
        summary: `إجمالي الشكاوى التموينية: ${toArabicNumerals(complaints.length)}`,
      };
    }
    if (n === 48) {
      return {
        headers: ['كود التنبيه', 'المجموعة', 'البيان', 'الجهة/السجل', 'القرية', 'الخطورة', 'الإجراء المقترح'],
        rows: smartAlerts.map((a) => [a.alertCode, a.category, a.title, a.entityName, a.village, a.severity, a.recommendedAction]),
        summary: `إجمالي التنبيهات الذكية: ${toArabicNumerals(smartAlerts.length)}`,
      };
    }
    if (n === 50) {
      return {
        headers: ['التوقيت', 'المستخدم', 'الشاشة', 'نوع الحركة', 'التفاصيل'],
        rows: auditLogs.map((l) => [l.timestamp, l.userName, l.screenName, l.actionType, l.details]),
        summary: `إجمالي قيود سجل التدقيق: ${toArabicNumerals(auditLogs.length)}`,
      };
    }
    return {
      headers: ['رقم المرور', 'التاريخ', 'التاجر', 'القرية', 'المفتش', 'إعلان الأسعار', 'مطابقة الرصيد', 'نسبة الالتزام٪', 'الحالة'],
      rows: inspections.map((i) => [i.inspectionNumber, i.inspectionDate, i.merchantName, i.village, i.inspectorName, i.pricesDeclared, i.stockMatchesBook, `${i.complianceScore}%`, i.status]),
      summary: `إجمالي زيارات الرقابة والتفتيش: ${toArabicNumerals(inspections.length)}`,
    };
  }, [activeReport, commodities, priceHistory, merchants, quotas, warehouses, receipts, ledger, transfers, stocktakes, cards, beneficiaryStats, citizenIssues, inspections, complaints, smartAlerts, auditLogs, settings.maskSensitiveCardDataByDefault]);

  // ==================== الشاشة ٩: الرقابة والمتابعة التموينية ومؤشرات أداء التاجر ====================
  if (activeScreen === 'field_control') {
    const inspectionFields: EditableFieldSpec[] = [
      { key: 'inspectionNumber', label: 'رقم زيارة التفتيش' },
      { key: 'inspectionDate', label: 'تاريخ المرور الميداني', type: 'date' },
      { key: 'merchantName', label: 'التاجر / المنفذ التمويني', type: 'select', options: merchants.length ? merchants.map((m) => m.merchantName) : ['محمود إبراهيم الششتاوي'] },
      { key: 'village', label: 'القرية', type: 'select', options: MAHALLA_VILLAGES },
      { key: 'inspectorName', label: 'اسم المفتش' },
      { key: 'pricesDeclared', label: 'إعلان الأسعار التموينية', type: 'select', options: ['نعم', 'لا'] },
      { key: 'stockMatchesBook', label: 'مطابقة الرصيد الدفتري', type: 'select', options: ['مطابق', 'عجز', 'زيادة'] },
      { key: 'violationsFound', label: 'المخالفات المضبوطة' },
      { key: 'reportNumberIfAny', label: 'رقم المحضر (إن وجد)' },
      { key: 'complianceScore', label: 'مؤشر الالتزام (من ١٠٠)', type: 'number' },
      { key: 'reviewRecommendation', label: 'التوصية للمراجعة البشرية' },
      { key: 'status', label: 'الحالة', type: 'select', options: ['تم الفحص والمطابقة', 'محضر محرر', 'قيد المراجعة'] },
    ];

    const openAddInspection = () => {
      const rec: RationFieldInspectionRecord = {
        id: `rfi-${Date.now()}`,
        inspectionNumber: `INS-RAT-2026-${String(inspections.length + 1).padStart(2, '0')}`,
        inspectionDate: todayRef,
        merchantCode: merchants[0]?.merchantCode || 'MER-GH-001',
        merchantName: merchants[0]?.merchantName || '',
        village: MAHALLA_VILLAGES[0],
        inspectorName: currentUserName,
        pricesDeclared: 'نعم',
        stockMatchesBook: 'مطابق',
        violationsFound: 'لا توجد مخالفات',
        reportNumberIfAny: '—',
        complianceScore: 95,
        reviewRecommendation: 'منفذ منضبط',
        status: 'تم الفحص والمطابقة',
      };
      setCrudModal({
        title: 'تسجيل مرور تفتيشي ورقابي جديد على منفذ تمويني',
        mode: 'edit',
        record: rec as unknown as Record<string, unknown>,
        fields: inspectionFields,
        onSave: (u) => {
          setInspections([u as unknown as RationFieldInspectionRecord, ...inspections]);
          onLogAudit('الرقابة والمتابعة التموينية', 'إضافة', `تسجيل مرور تفتيشي ${String(u.inspectionNumber)}`);
          onNotify('تم تسجيل المرور التفتيشي وتحديث مؤشر أداء التاجر.');
        },
      });
    };

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border-2 border-[#102A43]/20 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-[#102A43] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#164E83]" />
              <span>٩. الرقابة والمتابعة التموينية الميدانية ومؤشرات أداء التجار (للمراجعة البشرية)</span>
            </h3>
            <p className="text-[11px] font-bold text-slate-600">
              متابعة مطابقة الأرصدة وإعلان الأسعار والمحاضر مع مؤشرات أداء استرشادية لكل تاجر تُعرض على القيادة للمراجعة واتخاذ القرار
            </p>
          </div>
          <button
            type="button"
            onClick={openAddInspection}
            className="px-3.5 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>تسجيل زيارة تفتيشية</span>
          </button>
        </div>

        {/* بطاقات مؤشرات أداء التجار للمراجعة البشرية */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {merchants.map((m) => {
            const mInsps = inspections.filter((i) => i.merchantName === m.merchantName);
            const avgScore =
              mInsps.length > 0
                ? Math.round(mInsps.reduce((a, b) => a + b.complianceScore, 0) / mInsps.length)
                : m.status === 'نشط'
                ? 92
                : 60;
            const mComplaints = complaints.filter((c) => c.targetMerchantName === m.merchantName).length;
            return (
              <div key={m.id} className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10.5px] font-bold text-slate-500 block">{m.village} · {m.outletType}</span>
                    <h4 className="text-xs font-black text-[#102A43] break-words">{m.merchantName}</h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded-lg text-[11px] font-black num-cell shrink-0 ${avgScore >= 85 ? 'bg-emerald-100 text-emerald-800' : avgScore >= 70 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                    {toArabicNumerals(avgScore)}٪
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${avgScore >= 85 ? 'bg-emerald-600' : avgScore >= 70 ? 'bg-amber-500' : 'bg-red-600'}`}
                    style={{ width: `${Math.min(100, avgScore)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10.5px] font-bold text-slate-600">
                  <span>تفتيشات: {toArabicNumerals(mInsps.length)}</span>
                  <span>شكاوى: {toArabicNumerals(mComplaints)}</span>
                  <span className={m.licenseExpiryDate < todayRef ? 'text-red-700 font-black' : 'text-emerald-700'}>
                    {m.licenseExpiryDate < todayRef ? 'ترخيص منتهي' : 'مستندات سارية'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* جدول الزيارات التفتيشية */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-[#102A43] text-white">
                <th className="p-2.5 border border-slate-700">رقم المرور / التاريخ</th>
                <th className="p-2.5 border border-slate-700">التاجر والقرية</th>
                <th className="p-2.5 border border-slate-700">المفتش</th>
                <th className="p-2.5 border border-slate-700 text-center">الأسعار / الرصيد</th>
                <th className="p-2.5 border border-slate-700">المخالفات والمحضر</th>
                <th className="p-2.5 border border-slate-700 text-center">مؤشر الالتزام</th>
                <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {inspections.map((ins) => (
                <tr key={ins.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-2.5 num-cell">
                    <span className="font-black text-[#164E83] block">{ins.inspectionNumber}</span>
                    <span className="text-[10.5px] font-bold text-slate-500">{formatDateArabic(ins.inspectionDate)}</span>
                  </td>
                  <td className="p-2.5">
                    <span className="font-black text-[#102A43] block">{ins.merchantName}</span>
                    <span className="text-[10.5px] font-bold text-slate-500">{ins.village}</span>
                  </td>
                  <td className="p-2.5 font-bold text-slate-700">{ins.inspectorName}</td>
                  <td className="p-2.5 text-center font-black">
                    <span className={ins.pricesDeclared === 'نعم' ? 'text-emerald-700' : 'text-red-700'}>أسعار: {ins.pricesDeclared}</span>
                    <span className={`block text-[10.5px] ${ins.stockMatchesBook === 'مطابق' ? 'text-emerald-700' : 'text-red-700'}`}>
                      رصيد: {ins.stockMatchesBook}
                    </span>
                  </td>
                  <td className="p-2.5">
                    <span className="font-bold text-slate-800 block">{ins.violationsFound}</span>
                    <span className="text-[10.5px] font-black text-red-700">{ins.reportNumberIfAny}</span>
                  </td>
                  <td className="p-2.5 text-center num-cell font-black">{toArabicNumerals(ins.complianceScore)}٪</td>
                  <td className="p-2.5 text-center">
                    <TableActionButtons
                      recordLabel={ins.inspectionNumber}
                      onView={() => setCrudModal({ title: `تفتيش: ${ins.inspectionNumber}`, mode: 'view', record: ins as unknown as Record<string, unknown>, fields: inspectionFields })}
                      onAdd={openAddInspection}
                      onEdit={() =>
                        setCrudModal({
                          title: `تعديل تفتيش: ${ins.inspectionNumber}`,
                          mode: 'edit',
                          record: ins as unknown as Record<string, unknown>,
                          fields: inspectionFields,
                          onSave: (u) => {
                            setInspections(inspections.map((x) => (x.id === ins.id ? (u as unknown as RationFieldInspectionRecord) : x)));
                            onNotify('تم تحديث سجل التفتيش.');
                          },
                        })
                      }
                      onDelete={() => {
                        setInspections(inspections.filter((x) => x.id !== ins.id));
                        onNotify('تم حذف سجل التفتيش.');
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {crudModal && (
          <UniversalCrudModal
            title={crudModal.title}
            mode={crudModal.mode}
            record={crudModal.record}
            fields={crudModal.fields}
            todayRef={todayRef}
            onClose={() => setCrudModal(null)}
            onSave={crudModal.onSave}
          />
        )}
      </div>
    );
  }

  // ==================== الشاشة ١٠: سجل الشكاوى التموينية (٥ حالات) ====================
  if (activeScreen === 'ration_complaints') {
    const complaintFields: EditableFieldSpec[] = [
      { key: 'complaintNumber', label: 'رقم الشكوى' },
      { key: 'complaintDate', label: 'تاريخ الورود', type: 'date' },
      { key: 'citizenName', label: 'اسم المواطن الشاكي' },
      { key: 'citizenPhone', label: 'هاتف المواطن' },
      { key: 'village', label: 'القرية', type: 'select', options: MAHALLA_VILLAGES },
      { key: 'targetMerchantName', label: 'التاجر / المنفذ المشكو في حقه', type: 'select', options: merchants.length ? merchants.map((m) => m.merchantName) : ['محمود إبراهيم الششتاوي'] },
      { key: 'subject', label: 'موضوع الشكوى' },
      { key: 'details', label: 'تفاصيل الشكوى' },
      { key: 'assignedInspector', label: 'المفتش المكلف بالفحص' },
      { key: 'status', label: 'حالة الشكوى', type: 'select', options: ['جديدة', 'قيد الفحص', 'محالة', 'تم الرد', 'مغلقة'] },
      { key: 'resolutionReply', label: 'الرد الرسمي ونتيجة الفحص' },
    ];

    const filteredComplaints = complaints.filter(
      (c) => complaintStatusFilter === 'ALL' || c.status === complaintStatusFilter
    );

    const openAddComplaint = () => {
      const rec: RationComplaintRecord = {
        id: `rcmp-${Date.now()}`,
        complaintNumber: `CMP-RAT-2026-${100 + complaints.length + 1}`,
        complaintDate: todayRef,
        citizenName: '',
        citizenPhone: '',
        village: MAHALLA_VILLAGES[0],
        targetMerchantName: merchants[0]?.merchantName || '',
        subject: '',
        details: '',
        assignedInspector: currentUserName,
        status: 'جديدة',
        resolutionReply: '',
      };
      setCrudModal({
        title: 'تسجيل شكوى تموينية جديدة',
        mode: 'edit',
        record: rec as unknown as Record<string, unknown>,
        fields: complaintFields,
        onSave: (u) => {
          setComplaints([u as unknown as RationComplaintRecord, ...complaints]);
          onLogAudit('سجل الشكاوى', 'إضافة', `قيد شكوى جديدة ${String(u.complaintNumber)}`);
          onNotify('تم قيد الشكوى التموينية بنجاح.');
        },
      });
    };

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border-2 border-[#102A43]/20 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-[#102A43] flex items-center gap-2">
              <MessageSquareWarning className="w-4 h-4 text-amber-700" />
              <span>١٠. سجل شكاوى المواطنين بقطاع السلع التموينية</span>
            </h3>
            <p className="text-[11px] font-bold text-slate-600">
              متابعة دورة حياة الشكوى عبر ٥ حالات رسمية (جديدة · قيد الفحص · محالة · تم الرد · مغلقة)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={complaintStatusFilter}
              onChange={(e) => setComplaintStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 font-black bg-white"
            >
              <option value="ALL">جميع الحالات ({toArabicNumerals(complaints.length)})</option>
              <option value="جديدة">جديدة</option>
              <option value="قيد الفحص">قيد الفحص</option>
              <option value="محالة">محالة</option>
              <option value="تم الرد">تم الرد</option>
              <option value="مغلقة">مغلقة</option>
            </select>
            <button
              type="button"
              onClick={openAddComplaint}
              className="px-3.5 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] font-black flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة شكوى جديدة</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-[#102A43] text-white">
                <th className="p-2.5 border border-slate-700">رقم الشكوى / التاريخ</th>
                <th className="p-2.5 border border-slate-700">المواطن والقرية</th>
                <th className="p-2.5 border border-slate-700">المنفذ المشكو في حقه</th>
                <th className="p-2.5 border border-slate-700">الموضوع والرد</th>
                <th className="p-2.5 border border-slate-700 text-center">الحالة</th>
                <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredComplaints.map((c) => (
                <tr key={c.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-2.5 num-cell">
                    <span className="font-black text-[#164E83] block">{c.complaintNumber}</span>
                    <span className="text-[10.5px] font-bold text-slate-500">{formatDateArabic(c.complaintDate)}</span>
                  </td>
                  <td className="p-2.5">
                    <span className="font-black text-[#102A43] block">{c.citizenName}</span>
                    <span className="text-[10.5px] font-bold text-slate-500">{c.village} · {c.citizenPhone}</span>
                  </td>
                  <td className="p-2.5 font-bold text-slate-800">{c.targetMerchantName}</td>
                  <td className="p-2.5">
                    <span className="font-black text-[#102A43] block">{c.subject}</span>
                    <span className="text-[10.5px] font-bold text-slate-600">{c.resolutionReply || 'بانتظار نتيجة الفحص'}</span>
                  </td>
                  <td className="p-2.5 text-center">
                    <select
                      value={c.status}
                      onChange={(e) => {
                        const nextSt = e.target.value as RationComplaintRecord['status'];
                        setComplaints(complaints.map((x) => (x.id === c.id ? { ...x, status: nextSt } : x)));
                        onLogAudit('سجل الشكاوى', 'تعديل', `تغيير حالة الشكوى ${c.complaintNumber} إلى ${nextSt}`);
                        onNotify(`تم تحديث حالة الشكوى (${c.complaintNumber}) إلى ${nextSt}.`);
                      }}
                      className="px-2 py-1 rounded-lg border border-slate-300 text-[11px] font-black bg-white"
                    >
                      <option value="جديدة">جديدة</option>
                      <option value="قيد الفحص">قيد الفحص</option>
                      <option value="محالة">محالة</option>
                      <option value="تم الرد">تم الرد</option>
                      <option value="مغلقة">مغلقة</option>
                    </select>
                  </td>
                  <td className="p-2.5 text-center">
                    <TableActionButtons
                      recordLabel={c.complaintNumber}
                      onView={() => setCrudModal({ title: `شكوى: ${c.complaintNumber}`, mode: 'view', record: c as unknown as Record<string, unknown>, fields: complaintFields })}
                      onAdd={openAddComplaint}
                      onEdit={() =>
                        setCrudModal({
                          title: `تعديل شكوى: ${c.complaintNumber}`,
                          mode: 'edit',
                          record: c as unknown as Record<string, unknown>,
                          fields: complaintFields,
                          onSave: (u) => {
                            setComplaints(complaints.map((x) => (x.id === c.id ? (u as unknown as RationComplaintRecord) : x)));
                            onNotify('تم تحديث بيانات الشكوى.');
                          },
                        })
                      }
                      onDelete={() => {
                        setComplaints(complaints.filter((x) => x.id !== c.id));
                        onNotify('تم حذف الشكوى.');
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {crudModal && (
          <UniversalCrudModal
            title={crudModal.title}
            mode={crudModal.mode}
            record={crudModal.record}
            fields={crudModal.fields}
            todayRef={todayRef}
            onClose={() => setCrudModal(null)}
            onSave={crudModal.onSave}
          />
        )}
      </div>
    );
  }

  // ==================== الشاشة ١١: نظام التنبيهات الذكي ====================
  if (activeScreen === 'smart_alerts') {
    const enriched = smartAlerts.map((a) => (closedAlertIds[a.id] ? { ...a, status: 'تمت المعالجة' as const } : a));
    const filtered = enriched.filter(
      (a) =>
        (alertCategoryFilter === 'ALL' || a.category === alertCategoryFilter) &&
        (alertSeverityFilter === 'ALL' || a.severity === alertSeverityFilter)
    );

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border-2 border-[#102A43]/20 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-[#102A43] flex items-center gap-2">
              <BellRing className="w-4 h-4 text-red-700" />
              <span>١١. نظام التنبيهات الذكي لقسم السلع التموينية</span>
            </h3>
            <p className="text-[11px] font-bold text-slate-600">
              يراقب السلع والمخزون والتجار وتواريخ انتهاء التراخيص والبطاقات الضريبية والسجلات التجارية والحصص والبطاقات وفق ٥ مستويات خطورة
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={alertCategoryFilter}
              onChange={(e) => setAlertCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 font-black bg-white"
            >
              <option value="ALL">جميع المجموعات ({toArabicNumerals(enriched.length)})</option>
              <option value="تنبيهات السلع والمخزون">تنبيهات السلع والمخزون</option>
              <option value="تنبيهات التجار والتراخيص">تنبيهات التجار والتراخيص</option>
              <option value="تنبيهات الحصص والتوريد">تنبيهات الحصص والتوريد</option>
              <option value="تنبيهات البطاقات والصرف">تنبيهات البطاقات والصرف</option>
            </select>
            <select
              value={alertSeverityFilter}
              onChange={(e) => setAlertSeverityFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 font-black bg-white"
            >
              <option value="ALL">جميع مستويات الخطورة (٥ مستويات)</option>
              <option value="عاجل">عاجل</option>
              <option value="مرتفع">مرتفع</option>
              <option value="متوسط">متوسط</option>
              <option value="منخفض">منخفض</option>
              <option value="معلوماتي">معلوماتي</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-[#102A43] text-white">
                <th className="p-2.5 border border-slate-700">الكود</th>
                <th className="p-2.5 border border-slate-700">المجموعة / التنبيه</th>
                <th className="p-2.5 border border-slate-700">الجهة والقرية</th>
                <th className="p-2.5 border border-slate-700 text-center">درجة الخطورة</th>
                <th className="p-2.5 border border-slate-700">الإجراء المقترح</th>
                <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-2.5 num-cell font-black text-[#164E83]">{a.alertCode}</td>
                  <td className="p-2.5">
                    <span className="text-[10.5px] font-bold text-slate-500 block">{a.category}</span>
                    <span className="font-black text-[#102A43]">{a.title}</span>
                  </td>
                  <td className="p-2.5">
                    <span className="font-bold text-slate-800 block">{a.entityName}</span>
                    <span className="text-[10.5px] font-bold text-slate-500">{a.village}</span>
                  </td>
                  <td className="p-2.5 text-center font-black">
                    <span className={a.severity === 'عاجل' ? 'text-red-700' : a.severity === 'مرتفع' ? 'text-amber-700' : 'text-[#164E83]'}>
                      {a.severity}
                    </span>
                  </td>
                  <td className="p-2.5 font-bold text-slate-700">{a.recommendedAction}</td>
                  <td className="p-2.5 text-center">
                    {a.status === 'تمت المعالجة' ? (
                      <span className="text-emerald-700 font-black flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>تمت المعالجة</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onCloseAlert(a.id)}
                        className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-black cursor-pointer"
                      >
                        تأكيد المعالجة
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ==================== الشاشة ١٢: مركز التقارير (٥٠ تقريراً رسمياً مصنفاً) ====================
  if (activeScreen === 'reports_center') {
    const groups = Array.from(new Set(ALL_50_RATION_REPORTS.map((r) => r.group)));
    const filteredReps = ALL_50_RATION_REPORTS.filter(
      (r) =>
        (reportGroupFilter === 'ALL' || r.group === reportGroupFilter) &&
        (!reportSearch || r.title.includes(reportSearch) || r.group.includes(reportSearch))
    );

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border-2 border-[#102A43]/20 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-[#102A43] flex items-center gap-2">
              <FileBarChart2 className="w-4 h-4 text-[#164E83]" />
              <span>١٢. مركز تقارير قسم السلع التموينية (٥٠ تقريراً رسمياً مصنفاً مع معاينة فورية)</span>
            </h3>
            <p className="text-[11px] font-bold text-slate-600">
              اختر أي تقرير من القائمة الجانبية لمعاينته فوراً أو التوجه إلى قسم الطباعة والتصدير الرسمي
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                exportCsvUtf8Bom(
                  `${activeReport.title.replace(/\s+/g, '_')}.csv`,
                  activeReportData.headers,
                  activeReportData.rows
                );
                onNotify(`تم تصدير (${activeReport.title}) إلى Excel UTF-8 بنجاح.`);
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير Excel</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateScreen('print_export')}
              className="px-3 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] font-black flex items-center gap-1 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>إعدادات الطباعة الرسمية A4</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-3 space-y-2.5 max-h-[600px] overflow-y-auto">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
                placeholder="ابحث داخل الـ ٥٠ تقريراً..."
                className="w-full pr-8 pl-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold"
              />
            </div>
            <select
              value={reportGroupFilter}
              onChange={(e) => setReportGroupFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-black bg-slate-50"
            >
              <option value="ALL">جميع التصنيفات ({toArabicNumerals(ALL_50_RATION_REPORTS.length)} تقريراً)</option>
              {groups.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <div className="space-y-1">
              {filteredReps.map((rep) => (
                <button
                  key={rep.id}
                  type="button"
                  onClick={() => setSelectedReportId(rep.id)}
                  className={`w-full text-right px-3 py-2 rounded-xl text-[11.5px] font-black transition-all cursor-pointer ${
                    selectedReportId === rep.id
                      ? 'bg-[#102A43] text-[#C6A15B]'
                      : 'bg-slate-50 hover:bg-blue-50 text-[#102A43]'
                  }`}
                >
                  <span className="block">{rep.title}</span>
                  <span className={`text-[10px] font-bold ${selectedReportId === rep.id ? 'text-blue-200' : 'text-slate-500'}`}>
                    {rep.group}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div>
                <span className="text-[10.5px] font-black text-[#164E83] block">{activeReport.group}</span>
                <h4 className="text-sm font-black text-[#102A43]">{activeReport.title}</h4>
              </div>
              <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                {activeReportData.summary}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    {activeReportData.headers.map((h) => (
                      <th key={h} className="p-2 border border-slate-700 whitespace-nowrap">{h}</th>
                    ))}
                    <th className="p-2 border border-slate-700 whitespace-nowrap text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {activeReportData.rows.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                      {row.map((cell, ci) => (
                        <td key={ci} className="p-2 num-cell font-bold text-slate-800">
                          {toArabicNumerals(String(cell))}
                        </td>
                      ))}
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => onNavigateScreen('print_export')}
                          className="px-2 py-0.5 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer"
                        >
                          طباعة
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== الشاشة ١٣: قسم الطباعة والتصدير الرسمي ====================
  if (activeScreen === 'print_export') {
    const visibleIndexes = activeReportData.headers
      .map((_, idx) => idx)
      .filter((idx) => selectedExportCols[idx] !== false);
    const chosenHeaders = visibleIndexes.map((idx) => activeReportData.headers[idx]);
    const chosenRows = activeReportData.rows.map((r) => visibleIndexes.map((idx) => r[idx]));

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border-2 border-[#102A43]/20 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-[#102A43] flex items-center gap-2">
                <Printer className="w-4 h-4 text-[#164E83]" />
                <span>١٣. قسم الطباعة الرسمية A4 (طولي / عرضي) والتصدير المخصص Excel UTF-8</span>
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                اختر التقرير والأعمدة المطلوبة واتجاه الورقة للطباعة الرسمية بترويسة وتوقيعات مديرية التموين بالغربية
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={selectedReportId}
                onChange={(e) => {
                  setSelectedReportId(e.target.value);
                  setSelectedExportCols({});
                }}
                className="px-3 py-2 rounded-xl border border-slate-300 font-black bg-white max-w-xs"
              >
                {ALL_50_RATION_REPORTS.map((r) => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
              <select
                value={printOrientation}
                onChange={(e) => setPrintOrientation(e.target.value as 'portrait' | 'landscape')}
                className="px-3 py-2 rounded-xl border border-slate-300 font-black bg-white"
              >
                <option value="landscape">طباعة عرضية (A4 Landscape)</option>
                <option value="portrait">طباعة طولية (A4 Portrait)</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  exportCsvUtf8Bom(
                    `${activeReport.title.replace(/\s+/g, '_')}.csv`,
                    chosenHeaders,
                    chosenRows
                  );
                  onNotify('تم تصدير الأعمدة المختارة إلى Excel UTF-8 بنجاح.');
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تصدير Excel بالأعمدة المحددة</span>
              </button>
              <button
                type="button"
                onClick={() => setShowOfficialPrintModal(true)}
                className="px-3.5 py-2 rounded-xl bg-[#102A43] text-[#C6A15B] font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>معاينة وطباعة رسمية A4</span>
              </button>
            </div>
          </div>

          {/* اختيار الأعمدة المطلوب تضمينها */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
            <span className="text-xs font-black text-[#102A43] block">
              حدد الأعمدة المطلوبة في الطباعة والتصدير ({toArabicNumerals(chosenHeaders.length)} من {toArabicNumerals(activeReportData.headers.length)} عمود):
            </span>
            <div className="flex flex-wrap gap-2">
              {activeReportData.headers.map((h, idx) => {
                const checked = selectedExportCols[idx] !== false;
                return (
                  <label
                    key={h}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                      checked ? 'bg-blue-50 border-[#164E83] text-[#102A43]' : 'bg-white border-slate-200 text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setSelectedExportCols((prev) => ({ ...prev, [idx]: e.target.checked }))
                      }
                    />
                    <span>{h}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  {chosenHeaders.map((h) => (
                    <th key={h} className="p-2 border border-slate-700">{h}</th>
                  ))}
                  <th className="p-2 border border-slate-700 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {chosenRows.map((r, ri) => (
                  <tr key={ri} className="border-b border-slate-200">
                    {r.map((c, ci) => (
                      <td key={ci} className="p-2 num-cell font-bold">{toArabicNumerals(String(c))}</td>
                    ))}
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => setShowOfficialPrintModal(true)}
                        className="px-2 py-1 rounded bg-[#102A43]/10 text-[#102A43] text-[10px] font-black hover:bg-[#102A43]/20"
                      >
                        معاينة
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showOfficialPrintModal && (
          <OfficialPrintModal
            title={activeReport.title}
            subtitle={`قسم السلع التموينية — مديرية التموين والتجارة الداخلية بالغربية (${activeReport.group} · ${printOrientation === 'landscape' ? 'أفقي A4' : 'رأسي A4'})`}
            docNumber={`RAT-RPT-${String(activeReport.id).padStart(2, '0')}`}
            printedBy={currentUserName}
            todayRef={todayRef}
            onClose={() => setShowOfficialPrintModal(false)}
          >
            <div className="space-y-3 text-xs">
              <table className="w-full text-right border-collapse border border-slate-400">
                <thead>
                  <tr className="bg-slate-200">
                    {chosenHeaders.map((h) => (
                      <th key={h} className="p-1.5 border border-slate-400 font-black">{h}</th>
                    ))}
                    <th className="p-1.5 border border-slate-400 font-black print:hidden text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {chosenRows.map((r, ri) => (
                    <tr key={ri}>
                      {r.map((c, ci) => (
                        <td key={ci} className="p-1.5 border border-slate-400 num-cell">{toArabicNumerals(String(c))}</td>
                      ))}
                      <td className="p-1.5 border border-slate-400 print:hidden text-center">
                        <button
                          type="button"
                          onClick={() => setShowOfficialPrintModal(false)}
                          className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-black hover:bg-slate-300"
                        >
                          إغلاق
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-2 bg-slate-100 border font-black">{activeReportData.summary}</div>
            </div>
          </OfficialPrintModal>
        )}
      </div>
    );
  }

  // ==================== الشاشة ١٤: إعدادات قسم السلع التموينية وسجل التدقيق ====================
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border-2 border-[#102A43]/20 p-4 space-y-4">
        <div>
          <h3 className="text-sm font-black text-[#102A43] flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#164E83]" />
            <span>١٤. إعدادات قسم السلع التموينية وقوائم التصنيفات وسجل التدقيق والمراجعة</span>
          </h3>
          <p className="text-[11px] font-bold text-slate-600">
            تعديل حدود التنبيهات الذكية وإخفاء بيانات البطاقات وقائمة تصنيفات السلع التموينية مع مراجعة سجل التدقيق
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
            <label className="font-black text-[#102A43] block">حد التنبيه قبل انتهاء الترخيص / الضريبية (بالأيام)</label>
            <input
              type="number"
              value={settings.licenseWarningDays}
              onChange={(e) => onUpdateSettings({ ...settings, licenseWarningDays: Number(e.target.value) || 60 })}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-black bg-white"
            />
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
            <label className="font-black text-[#102A43] block">نسبة التحذير لتأخر توريد الحصص (٪)</label>
            <input
              type="number"
              value={settings.quotaDelayWarningPercent}
              onChange={(e) => onUpdateSettings({ ...settings, quotaDelayWarningPercent: Number(e.target.value) || 75 })}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-black bg-white"
            />
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
            <label className="font-black text-[#102A43] block">حماية خصوصية البطاقات افتراضياً</label>
            <label className="flex items-center gap-2 font-bold text-slate-700 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.maskSensitiveCardDataByDefault}
                onChange={(e) => onUpdateSettings({ ...settings, maskSensitiveCardDataByDefault: e.target.checked })}
              />
              <span>إخفاء الرقم القومي ورقم البطاقة جزئياً افتراضياً</span>
            </label>
          </div>
        </div>

        {/* قائمة تصنيفات السلع التموينية القابلة للتعديل */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5 text-xs">
          <h4 className="font-black text-[#102A43]">قائمة تصنيفات السلع التموينية القابلة للإضافة والتعديل</h4>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryInput}
              onChange={(e) => setNewCategoryInput(e.target.value)}
              placeholder="أضف تصنيف سلع جديد..."
              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 font-bold bg-white"
            />
            <button
              type="button"
              onClick={() => {
                if (!newCategoryInput.trim()) return;
                onUpdateSettings({
                  ...settings,
                  commodityCategories: [...settings.commodityCategories, newCategoryInput.trim()],
                });
                setNewCategoryInput('');
                onNotify('تمت إضافة تصنيف السلع التموينية الجديد.');
              }}
              className="px-4 py-1.5 rounded-lg bg-[#102A43] text-[#C6A15B] font-black cursor-pointer"
            >
              إضافة التصنيف
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {settings.commodityCategories.map((cat) => (
              <span key={cat} className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 font-bold text-[#102A43]">
                {cat}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* سجل التدقيق والمراجعة */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <h4 className="text-sm font-black text-[#102A43] flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-[#164E83]" />
          <span>سجل التدقيق والمراجعة غير القابل للحذف ({toArabicNumerals(auditLogs.length)} قيد)</span>
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-[#102A43] text-white">
                <th className="p-2 border border-slate-700">التوقيت</th>
                <th className="p-2 border border-slate-700">المستخدم</th>
                <th className="p-2 border border-slate-700">الشاشة</th>
                <th className="p-2 border border-slate-700 text-center">الإجراء</th>
                <th className="p-2 border border-slate-700">التفاصيل الموثقة</th>
                <th className="p-2 border border-slate-700 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-2 num-cell font-bold text-slate-600">{log.timestamp}</td>
                  <td className="p-2 font-black text-[#102A43]">{log.userName}</td>
                  <td className="p-2 font-bold text-[#164E83]">{log.screenName}</td>
                  <td className="p-2 text-center font-black">
                    <span className={log.actionType === 'قيد عكسي' || log.actionType === 'حذف' ? 'text-red-700' : 'text-emerald-700'}>
                      {log.actionType}
                    </span>
                  </td>
                  <td className="p-2 font-bold text-slate-700">{log.details}</td>
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => onNotify(`قيد مراجعة (${log.screenName}): ${log.details}`)}
                      className="px-2 py-0.5 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer"
                    >
                      معاينة
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
