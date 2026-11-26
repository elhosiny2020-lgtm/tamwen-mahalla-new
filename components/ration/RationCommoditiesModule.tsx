'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BellRing,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileBarChart2,
  History,
  MessageSquareWarning,
  Package,
  Plus,
  Printer,
  Scale,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBasket,
  Store,
  Users,
  Warehouse,
} from 'lucide-react';
import {
  CitizenIssueTransactionRecord,
  CommodityPriceHistoryRecord,
  MerchantFollowupLogRecord,
  RationAuditLogRecord,
  RationCardRecord,
  RationCommodityRecord,
  RationComplaintRecord,
  RationDepartmentSettings,
  RationFieldInspectionRecord,
  RationMerchantRecord,
  RationQuotaRecord,
  RationWarehouseRecord,
  VillageBeneficiaryStatRecord,
  WarehouseLedgerMovementRecord,
  WarehousePurchaseReceiptRecord,
  WarehouseStocktakeRecord,
  WarehouseTransferRecord,
  buildRationSmartAlerts,
  computeQuotaMetrics,
  factoryResetRationCommoditiesStore,
  loadCitizenIssues,
  loadMerchantFollowups,
  loadRationAuditLogs,
  loadRationCards,
  loadRationCommodities,
  loadRationComplaints,
  loadRationInspections,
  loadRationMerchants,
  loadRationPriceHistory,
  loadRationQuotas,
  loadRationSettings,
  loadRationWarehouses,
  loadVillageBeneficiaryStats,
  loadWarehouseLedger,
  loadWarehouseReceipts,
  loadWarehouseStocktakes,
  loadWarehouseTransfers,
  saveCitizenIssues,
  saveMerchantFollowups,
  saveRationAuditLogs,
  saveRationCards,
  saveRationCommodities,
  saveRationComplaints,
  saveRationInspections,
  saveRationMerchants,
  saveRationPriceHistory,
  saveRationQuotas,
  saveRationSettings,
  saveRationWarehouses,
  saveVillageBeneficiaryStats,
  saveWarehouseLedger,
  saveWarehouseReceipts,
  saveWarehouseStocktakes,
  saveWarehouseTransfers,
} from '@/lib/ration-commodities-store';
import { MAHALLA_LOCAL_UNITS, MAHALLA_VILLAGES } from '@/lib/bakery-math';
import { formatArabicCurrency, formatArabicNumber, formatDateArabic, toArabicNumerals } from '@/lib/utils';
import FactoryResetButton from '../FactoryResetButton';
import TableToolbar from '../TableToolbar';
import {
  EditableFieldSpec,
  TableActionButtons,
  UniversalCrudModal,
} from '../trade/TradeSharedCrudUi';
import RationWarehouseAndCardsView from './RationWarehouseAndCardsView';
import RationControlReportsView from './RationControlReportsView';

export type RationScreenKey =
  | 'dashboard'
  | 'commodities_registry'
  | 'merchants_registry'
  | 'quotas_management'
  | 'warehouses_purchases'
  | 'ration_cards'
  | 'beneficiaries_db'
  | 'citizen_issues'
  | 'field_control'
  | 'ration_complaints'
  | 'smart_alerts'
  | 'reports_center'
  | 'print_export'
  | 'settings_audit';

interface RationCommoditiesModuleProps {
  currentUserName: string;
}

let rationUidCounter = 1;
function createRationRecordId(prefix: string): string {
  rationUidCounter += 1;
  return `${prefix}-${Date.now()}-${rationUidCounter}`;
}

export default function RationCommoditiesModule({ currentUserName }: RationCommoditiesModuleProps) {
  const todayRef = '2026-11-25';

  const [activeScreen, setActiveScreen] = useState<RationScreenKey>('dashboard');
  const [navSearch, setNavSearch] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [pinnedMode, setPinnedMode] = useState<'none' | 'manual'>('none');

  // فلاتر لوحة المؤشرات
  const [periodFilter, setPeriodFilter] = useState('نوفمبر ٢٠٢٦');
  const [villageFilter, setVillageFilter] = useState('ALL');
  const [merchantFilter, setMerchantFilter] = useState('ALL');
  const [commodityFilter, setCommodityFilter] = useState('ALL');

  // حالة كافة كيانات قسم السلع التموينية
  const [commodities, setCommoditiesState] = useState<RationCommodityRecord[]>(() => loadRationCommodities());
  const [priceHistory, setPriceHistoryState] = useState<CommodityPriceHistoryRecord[]>(() => loadRationPriceHistory());
  const [merchants, setMerchantsState] = useState<RationMerchantRecord[]>(() => loadRationMerchants());
  const [followups, setFollowupsState] = useState<MerchantFollowupLogRecord[]>(() => loadMerchantFollowups());
  const [quotas, setQuotasState] = useState<RationQuotaRecord[]>(() => loadRationQuotas());
  const [warehouses, setWarehousesState] = useState<RationWarehouseRecord[]>(() => loadRationWarehouses());
  const [receipts, setReceiptsState] = useState<WarehousePurchaseReceiptRecord[]>(() => loadWarehouseReceipts());
  const [ledger, setLedgerState] = useState<WarehouseLedgerMovementRecord[]>(() => loadWarehouseLedger());
  const [transfers, setTransfersState] = useState<WarehouseTransferRecord[]>(() => loadWarehouseTransfers());
  const [stocktakes, setStocktakesState] = useState<WarehouseStocktakeRecord[]>(() => loadWarehouseStocktakes());
  const [cards, setCardsState] = useState<RationCardRecord[]>(() => loadRationCards());
  const [beneficiaryStats, setBeneficiaryStatsState] = useState<VillageBeneficiaryStatRecord[]>(() => loadVillageBeneficiaryStats());
  const [citizenIssues, setCitizenIssuesState] = useState<CitizenIssueTransactionRecord[]>(() => loadCitizenIssues());
  const [inspections, setInspectionsState] = useState<RationFieldInspectionRecord[]>(() => loadRationInspections());
  const [complaints, setComplaintsState] = useState<RationComplaintRecord[]>(() => loadRationComplaints());
  const [auditLogs, setAuditLogsState] = useState<RationAuditLogRecord[]>(() => loadRationAuditLogs());
  const [settings, setSettingsState] = useState<RationDepartmentSettings>(() => loadRationSettings());
  const [closedAlertIds, setClosedAlertIds] = useState<Record<string, boolean>>({});

  const [merchantStatusFilter, setMerchantStatusFilter] = useState('ALL');
  const [commodityStatusFilter, setCommodityStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [crudModal, setCrudModal] = useState<{
    title: string;
    mode: 'view' | 'edit';
    record: Record<string, unknown>;
    fields: EditableFieldSpec[];
    onSave?: (updated: Record<string, unknown>) => void;
  } | null>(null);

  // دوال الحفظ التلقائي
  const setCommodities = (v: RationCommodityRecord[]) => { setCommoditiesState(v); saveRationCommodities(v); };
  const setPriceHistory = (v: CommodityPriceHistoryRecord[]) => { setPriceHistoryState(v); saveRationPriceHistory(v); };
  const setMerchants = (v: RationMerchantRecord[]) => { setMerchantsState(v); saveRationMerchants(v); };
  const setFollowups = (v: MerchantFollowupLogRecord[]) => { setFollowupsState(v); saveMerchantFollowups(v); };
  const setQuotas = (v: RationQuotaRecord[]) => { setQuotasState(v); saveRationQuotas(v); };
  const setWarehouses = (v: RationWarehouseRecord[]) => { setWarehousesState(v); saveRationWarehouses(v); };
  const setReceipts = (v: WarehousePurchaseReceiptRecord[]) => { setReceiptsState(v); saveWarehouseReceipts(v); };
  const setLedger = (v: WarehouseLedgerMovementRecord[]) => { setLedgerState(v); saveWarehouseLedger(v); };
  const setTransfers = (v: WarehouseTransferRecord[]) => { setTransfersState(v); saveWarehouseTransfers(v); };
  const setStocktakes = (v: WarehouseStocktakeRecord[]) => { setStocktakesState(v); saveWarehouseStocktakes(v); };
  const setCards = (v: RationCardRecord[]) => { setCardsState(v); saveRationCards(v); };
  const setBeneficiaryStats = (v: VillageBeneficiaryStatRecord[]) => { setBeneficiaryStatsState(v); saveVillageBeneficiaryStats(v); };
  const setCitizenIssues = (v: CitizenIssueTransactionRecord[]) => { setCitizenIssuesState(v); saveCitizenIssues(v); };
  const setInspections = (v: RationFieldInspectionRecord[]) => { setInspectionsState(v); saveRationInspections(v); };
  const setComplaints = (v: RationComplaintRecord[]) => { setComplaintsState(v); saveRationComplaints(v); };
  const setSettings = (v: RationDepartmentSettings) => { setSettingsState(v); saveRationSettings(v); };

  const notify = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg((prev) => (prev === msg ? null : prev)), 4000);
  };

  const logAudit = (
    screenName: string,
    actionType: 'إضافة' | 'تعديل' | 'حذف' | 'قيد عكسي' | 'اعتماد',
    details: string
  ) => {
    const entry: RationAuditLogRecord = {
      id: createRationRecordId('ral'),
      timestamp: new Date().toLocaleString('ar-EG'),
      userName: currentUserName,
      screenName,
      actionType,
      details,
    };
    const next = [entry, ...auditLogs];
    setAuditLogsState(next);
    saveRationAuditLogs(next);
  };

  const handleFactoryReset = () => {
    factoryResetRationCommoditiesStore();
    setCommoditiesState([]);
    setPriceHistoryState([]);
    setMerchantsState([]);
    setFollowupsState([]);
    setQuotasState([]);
    setWarehousesState([]);
    setReceiptsState([]);
    setLedgerState([]);
    setTransfersState([]);
    setStocktakesState([]);
    setCardsState([]);
    setBeneficiaryStatsState([]);
    setCitizenIssuesState([]);
    setInspectionsState([]);
    setComplaintsState([]);
    setAuditLogsState(loadRationAuditLogs());
    notify('تم تنفيذ إعادة ضبط المصنع ومسح جميع جداول قسم السلع التموينية بالكامل.');
  };

  const smartAlerts = useMemo(
    () =>
      buildRationSmartAlerts({
        todayRef,
        settings,
        commodities,
        merchants,
        quotas,
        ledger,
        stocktakes,
        cards,
        warehouses,
      }),
    [todayRef, settings, commodities, merchants, quotas, ledger, stocktakes, cards, warehouses]
  );

  const openAlertsCount = useMemo(
    () => smartAlerts.filter((a) => !closedAlertIds[a.id]).length,
    [smartAlerts, closedAlertIds]
  );

  // ==================== شريط التنقل العلوي المنظم (٤ مجموعات لـ ١٤ شاشة) ====================
  const navGroups = useMemo(
    () => [
      {
        title: 'القيادة والسلع والتجار والحصص',
        items: [
          { id: 'dashboard' as RationScreenKey, label: '١. لوحة المؤشرات والرسوم (٢٠ مؤشر · ١١ رسم)', icon: BarChart3, count: 20 },
          { id: 'commodities_registry' as RationScreenKey, label: '٢. سجل السلع التموينية وتاريخ الأسعار', icon: ShoppingBasket, count: commodities.length },
          { id: 'merchants_registry' as RationScreenKey, label: '٣. سجل التجار التموينيين والتراخيص (٣٠ حقلاً)', icon: Store, count: merchants.length },
          { id: 'quotas_management' as RationScreenKey, label: '٤. إدارة الحصص التموينية ونسب التنفيذ', icon: Scale, count: quotas.length },
        ],
      },
      {
        title: 'المخازن والبطاقات والمستفيدون والصرف',
        items: [
          { id: 'warehouses_purchases' as RationScreenKey, label: '٥. المخازن والمشتريات والحركة والجرد', icon: Warehouse, count: warehouses.length + ledger.length },
          { id: 'ration_cards' as RationScreenKey, label: '٦. متابعة البطاقات التموينية (الخصوصية)', icon: CreditCard, count: cards.length },
          { id: 'beneficiaries_db' as RationScreenKey, label: '٧. قاعدة المستفيدين (٢٠٢٣ · ٢٠٢٤ · ٢٠٢٥)', icon: Users, count: beneficiaryStats.length },
          { id: 'citizen_issues' as RationScreenKey, label: '٨. سجل عمليات صرف المواطنين (POS)', icon: CheckCircle2, count: citizenIssues.length },
        ],
      },
      {
        title: 'الرقابة والشكاوى والتنبيهات الذكية',
        items: [
          { id: 'field_control' as RationScreenKey, label: '٩. الرقابة الميدانية ومؤشرات أداء التجار', icon: ShieldCheck, count: inspections.length },
          { id: 'ration_complaints' as RationScreenKey, label: '١٠. سجل الشكاوى التموينية (٥ حالات)', icon: MessageSquareWarning, count: complaints.length },
          { id: 'smart_alerts' as RationScreenKey, label: '١١. نظام التنبيهات الذكي المركزي', icon: BellRing, count: openAlertsCount },
        ],
      },
      {
        title: 'التقارير والطباعة والإعدادات والتدقيق',
        items: [
          { id: 'reports_center' as RationScreenKey, label: '١٢. مركز التقارير الشامل (٥٠ تقريراً)', icon: FileBarChart2, count: 50 },
          { id: 'print_export' as RationScreenKey, label: '١٣. قسم الطباعة الرسمية A4 و Excel', icon: Printer, count: 50 },
          { id: 'settings_audit' as RationScreenKey, label: '١٤. إعدادات القسم وسجل التدقيق', icon: Settings, count: auditLogs.length },
        ],
      },
    ],
    [commodities.length, merchants.length, quotas.length, warehouses.length, ledger.length, cards.length, beneficiaryStats.length, citizenIssues.length, inspections.length, complaints.length, openAlertsCount, auditLogs.length]
  );

  // ==================== حساب الـ ٢٠ مؤشراً تفاعلياً للوحة القيادة ====================
  const dashboardMetrics = useMemo(() => {
    const fMerchants = merchants.filter((m) => (villageFilter === 'ALL' || m.village === villageFilter) && (merchantFilter === 'ALL' || m.merchantName === merchantFilter));
    const fQuotas = quotas.filter(
      (q) =>
        (villageFilter === 'ALL' || q.village === villageFilter) &&
        (merchantFilter === 'ALL' || q.merchantName === merchantFilter) &&
        (commodityFilter === 'ALL' || q.commodityName === commodityFilter)
    );
    const totalApprovedQuota = fQuotas.reduce((acc, q) => acc + computeQuotaMetrics(q).effectiveApproved, 0);
    const totalSuppliedQuota = fQuotas.reduce((acc, q) => acc + q.suppliedQuantity, 0);
    const totalDispensedQuota = fQuotas.reduce((acc, q) => acc + q.dispensedQuantity, 0);
    const avgExecutionPct = totalApprovedQuota > 0 ? Number(((totalDispensedQuota / totalApprovedQuota) * 100).toFixed(1)) : 0;
    const avgSupplyPct = totalApprovedQuota > 0 ? Number(((totalSuppliedQuota / totalApprovedQuota) * 100).toFixed(1)) : 0;
    const expiredMerchantDocs = fMerchants.filter(
      (m) => m.licenseExpiryDate < todayRef || m.taxCardExpiryDate < todayRef || m.commercialRegisterExpiryDate < todayRef
    ).length;
    const totalBen2025 = beneficiaryStats
      .filter((v) => villageFilter === 'ALL' || v.village === villageFilter)
      .reduce((acc, v) => acc + (v.yearlySnapshots.find((s) => s.year === 2025)?.beneficiariesCount || 0), 0);
    const totalCards2025 = beneficiaryStats
      .filter((v) => villageFilter === 'ALL' || v.village === villageFilter)
      .reduce((acc, v) => acc + (v.yearlySnapshots.find((s) => s.year === 2025)?.cardsCount || 0), 0);
    const totalMonthlySupport = beneficiaryStats
      .filter((v) => villageFilter === 'ALL' || v.village === villageFilter)
      .reduce((acc, v) => acc + (v.yearlySnapshots.find((s) => s.year === 2025)?.monthlySupportValueEgp || 0), 0);
    const totalLedgerStock = ledger.reduce((acc, l) => acc + l.computedClosingBalance, 0);
    const totalPurchaseVal = receipts.reduce((acc, r) => acc + r.totalValueEgp, 0);
    const stockDeficits = stocktakes.filter((s) => s.varianceQty < 0).length;
    const pendingTransfers = transfers.filter((t) => t.approvalStatus === 'بانتظار الاعتماد').length;
    const activeCards = cards.filter((c) => c.status === 'نشطة').length;
    const suspendedCards = cards.filter((c) => c.status !== 'نشطة').length;
    const totalCitizenSupport = citizenIssues.reduce((acc, c) => acc + c.totalSupportUsedEgp, 0);
    const openComplaints = complaints.filter((c) => c.status !== 'مغلقة' && c.status !== 'تم الرد').length;
    const urgentAlerts = smartAlerts.filter((a) => !closedAlertIds[a.id] && (a.severity === 'عاجل' || a.severity === 'مرتفع')).length;
    const avgCompliance =
      inspections.length > 0
        ? Math.round(inspections.reduce((acc, i) => acc + i.complianceScore, 0) / inspections.length)
        : 0;

    return {
      kpis: [
        { title: 'إجمالي السلع التموينية', value: toArabicNumerals(commodities.length), sub: `${toArabicNumerals(commodities.filter((c) => c.status === 'نشط').length)} سلعة نشطة`, target: 'commodities_registry' as RationScreenKey, tone: 'navy' },
        { title: 'سلع غير متوفرة / حرجة', value: toArabicNumerals(commodities.filter((c) => c.status !== 'نشط').length), sub: 'تستوجب استعاضة فورية', target: 'commodities_registry' as RationScreenKey, tone: 'red' },
        { title: 'إجمالي التجار والمنافذ', value: toArabicNumerals(fMerchants.length), sub: 'بقالين + جمعيتي + مجمعات', target: 'merchants_registry' as RationScreenKey, tone: 'blue' },
        { title: 'منافذ بمستندات منتهية', value: toArabicNumerals(expiredMerchantDocs), sub: 'ترخيص / ضريبية / سجل', target: 'merchants_registry' as RationScreenKey, tone: 'red' },
        { title: 'إجمالي الحصة المعتمدة', value: formatArabicNumber(totalApprovedQuota), sub: 'وحدة مقررة للفترة', target: 'quotas_management' as RationScreenKey, tone: 'navy' },
        { title: 'الكمية الموردة فعلياً', value: formatArabicNumber(totalSuppliedQuota), sub: `نسبة التوريد ${toArabicNumerals(avgSupplyPct)}٪`, target: 'quotas_management' as RationScreenKey, tone: 'emerald' },
        { title: 'الكمية المنصرفة للمواطنين', value: formatArabicNumber(totalDispensedQuota), sub: `نسبة التنفيذ ${toArabicNumerals(avgExecutionPct)}٪`, target: 'quotas_management' as RationScreenKey, tone: 'emerald' },
        { title: 'المتبقي للصرف بالحصص', value: formatArabicNumber(Math.max(0, totalApprovedQuota - totalDispensedQuota)), sub: 'المعتمدة - المنصرفة', target: 'quotas_management' as RationScreenKey, tone: 'amber' },
        { title: 'المخازن التموينية النشطة', value: toArabicNumerals(warehouses.length), sub: 'سعة تخزينية معتمدة', target: 'warehouses_purchases' as RationScreenKey, tone: 'blue' },
        { title: 'الرصيد المخزني الآلي', value: formatArabicNumber(totalLedgerStock), sub: 'وحدة في دفتر الحركة', target: 'warehouses_purchases' as RationScreenKey, tone: 'navy' },
        { title: 'قيمة التوريدات والمشتريات', value: formatArabicCurrency(totalPurchaseVal), sub: `${toArabicNumerals(receipts.length)} إذن استلام`, target: 'warehouses_purchases' as RationScreenKey, tone: 'emerald' },
        { title: 'تحويلات بانتظار الاعتماد', value: toArabicNumerals(pendingTransfers), sub: 'بين المخازن المركزية', target: 'warehouses_purchases' as RationScreenKey, tone: 'amber' },
        { title: 'محاضر جرد بها عجز', value: toArabicNumerals(stockDeficits), sub: 'تستوجب المساءلة القانونية', target: 'warehouses_purchases' as RationScreenKey, tone: 'red' },
        { title: 'بطاقات تموينية نشطة', value: toArabicNumerals(activeCards), sub: `${toArabicNumerals(suspendedCards)} موقوفة/بدل تالف`, target: 'ration_cards' as RationScreenKey, tone: 'blue' },
        { title: 'مستفيدو القرى (٢٠٢٥)', value: formatArabicNumber(totalBen2025), sub: `${formatArabicNumber(totalCards2025)} بطاقة مسجلة`, target: 'beneficiaries_db' as RationScreenKey, tone: 'navy' },
        { title: 'إجمالي الدعم الشهري', value: formatArabicCurrency(totalMonthlySupport), sub: 'مخصصات القرى والوحدات', target: 'beneficiaries_db' as RationScreenKey, tone: 'emerald' },
        { title: 'عمليات صرف المواطنين', value: toArabicNumerals(citizenIssues.length), sub: `دعم ${formatArabicCurrency(totalCitizenSupport)}`, target: 'citizen_issues' as RationScreenKey, tone: 'blue' },
        { title: 'متوسط التزام التجار', value: `${toArabicNumerals(avgCompliance)}٪`, sub: `${toArabicNumerals(inspections.length)} زيارة تفتيشية`, target: 'field_control' as RationScreenKey, tone: 'emerald' },
        { title: 'شكاوى قيد الفحص', value: toArabicNumerals(openComplaints), sub: `من إجمالي ${toArabicNumerals(complaints.length)} شكوى`, target: 'ration_complaints' as RationScreenKey, tone: 'amber' },
        { title: 'تنبيهات عاجلة ومرتفعة', value: toArabicNumerals(urgentAlerts), sub: `إجمالي المفتوحة: ${toArabicNumerals(openAlertsCount)}`, target: 'smart_alerts' as RationScreenKey, tone: 'red' },
      ],
      totalApprovedQuota,
      totalSuppliedQuota,
      totalDispensedQuota,
    };
  }, [commodities, merchants, quotas, warehouses, ledger, receipts, stocktakes, transfers, cards, beneficiaryStats, citizenIssues, inspections, complaints, smartAlerts, closedAlertIds, openAlertsCount, villageFilter, merchantFilter, commodityFilter, todayRef]);

  // ==================== حقول CRUD للشاشات ٢، ٣، ٤ ====================
  const commodityFields: EditableFieldSpec[] = [
    { key: 'commodityCode', label: 'كود السلعة' },
    { key: 'commodityName', label: 'اسم السلعة التموينية' },
    { key: 'category', label: 'تصنيف السلعة', type: 'select', options: settings.commodityCategories },
    { key: 'unit', label: 'وحدة الصرف' },
    { key: 'packWeightOrSize', label: 'الوزن / الحجم الصافي' },
    { key: 'officialSubsidizedPriceEgp', label: 'السعر التمويني الرسمي (ج.م)', type: 'number' },
    { key: 'wholesalePriceEgp', label: 'سعر الجملة (ج.م)', type: 'number' },
    { key: 'merchantMarginEgp', label: 'هامش ربح التاجر (ج.م)', type: 'number' },
    { key: 'officialFreePriceEgp', label: 'السعر الحر الاسترشادي (ج.م)', type: 'number' },
    { key: 'maxQuantityPerBeneficiary', label: 'الحد الأقصى للفرد', type: 'number' },
    { key: 'maxQuantityPerCard', label: 'الحد الأقصى للبطاقة', type: 'number' },
    { key: 'supplySource', label: 'مصدر التوريد الرسمي' },
    { key: 'storageNature', label: 'طبيعة التخزين', type: 'select', options: ['جاف', 'مبرد', 'حساس للرطوبة', 'معلب'] },
    { key: 'shelfLifeMonths', label: 'مدة الصلاحية (شهر)', type: 'number' },
    { key: 'minSafetyStock', label: 'حد الأمان المخزني', type: 'number' },
    { key: 'reorderLevel', label: 'حد إعادة الطلب', type: 'number' },
    { key: 'status', label: 'حالة السلعة', type: 'select', options: ['نشط', 'موقوف مؤقتاً', 'غير متوفر', 'ملغى'] },
    { key: 'notes', label: 'ملاحظات' },
  ];

  const merchantFields: EditableFieldSpec[] = [
    { key: 'merchantCode', label: 'كود التاجر' },
    { key: 'fileNumber', label: 'رقم الملف' },
    { key: 'merchantName', label: 'اسم التاجر التمويني' },
    { key: 'outletTradeName', label: 'الاسم التجاري للمنفذ' },
    { key: 'outletType', label: 'نوع المنفذ', type: 'select', options: ['بقال تمويني', 'مشروع جمعيتي', 'مجمع استهلاكي'] },
    { key: 'nationalId', label: 'الرقم القومي' },
    { key: 'phoneNumber', label: 'الهاتف الأرضي' },
    { key: 'mobileNumber', label: 'رقم المحمول' },
    { key: 'email', label: 'البريد الإلكتروني' },
    { key: 'supplyAdministration', label: 'الإدارة التموينية' },
    { key: 'supplyOffice', label: 'مكتب التموين' },
    { key: 'localUnit', label: 'الوحدة المحلية', type: 'select', options: MAHALLA_LOCAL_UNITS },
    { key: 'village', label: 'القرية', type: 'select', options: MAHALLA_VILLAGES },
    { key: 'detailedAddress', label: 'العنوان التفصيلي' },
    { key: 'gpsCoordinates', label: 'الإحداثيات الجغرافية GPS' },
    { key: 'posMachineNumber', label: 'رقم ماكينة POS' },
    { key: 'smartCardCode', label: 'كود البطاقة الذكية للتاجر' },
    { key: 'wholesaleBranchName', label: 'فرع الجملة المربوط عليه' },
    { key: 'licenseNumber', label: 'رقم الترخيص' },
    { key: 'licenseExpiryDate', label: 'تاريخ انتهاء الترخيص', type: 'date' },
    { key: 'taxCardNumber', label: 'رقم البطاقة الضريبية' },
    { key: 'taxCardExpiryDate', label: 'تاريخ انتهاء البطاقة الضريبية', type: 'date' },
    { key: 'commercialRegisterNumber', label: 'رقم السجل التجاري' },
    { key: 'commercialRegisterExpiryDate', label: 'تاريخ انتهاء السجل التجاري', type: 'date' },
    { key: 'insuranceAmountEgp', label: 'قيمة التأمين المالي (ج.م)', type: 'number' },
    { key: 'linkedCardsCount', label: 'عدد البطاقات المربوطة', type: 'number' },
    { key: 'linkedBeneficiariesCount', label: 'عدد المستفيدين المربوطين', type: 'number' },
    { key: 'monthlyApprovedQuotaValueEgp', label: 'قيمة الاستعاضة الشهرية (ج.م)', type: 'number' },
    { key: 'status', label: 'حالة التاجر', type: 'select', options: ['نشط', 'موقوف مؤقتاً', 'تحت المراجعة', 'مغلق', 'منتهي الترخيص', 'مخالف', 'مسحوب الترخيص'] },
    { key: 'notes', label: 'ملاحظات رقابية' },
  ];

  const quotaFields: EditableFieldSpec[] = [
    { key: 'quotaCode', label: 'كود الحصة' },
    { key: 'periodLabel', label: 'اسم الفترة' },
    { key: 'periodicity', label: 'دورية الحصة', type: 'select', options: ['يومي', 'أسبوعي', 'شهري', 'ربع سنوي', 'سنوي', 'موسمي'] },
    { key: 'startDate', label: 'تاريخ بداية الفترة', type: 'date' },
    { key: 'endDate', label: 'تاريخ نهاية الفترة', type: 'date' },
    { key: 'village', label: 'القرية', type: 'select', options: MAHALLA_VILLAGES },
    { key: 'localUnit', label: 'الوحدة المحلية', type: 'select', options: MAHALLA_LOCAL_UNITS },
    { key: 'merchantName', label: 'التاجر التمويني', type: 'select', options: merchants.length ? merchants.map((m) => m.merchantName) : ['محمود إبراهيم الششتاوي'] },
    { key: 'commodityName', label: 'السلعة التموينية', type: 'select', options: commodities.length ? commodities.map((c) => c.commodityName) : ['سكر معبأ تمويني ١ كجم'] },
    { key: 'unit', label: 'الوحدة' },
    { key: 'originalApprovedQuota', label: 'الحصة الأصلية المعتمدة (تُحفظ دون تغيير)', type: 'number' },
    { key: 'amendedApprovedQuota', label: 'الحصة المعتمدة بعد التعديل الموثق', type: 'number' },
    { key: 'suppliedQuantity', label: 'الكمية الموردة فعلياً', type: 'number' },
    { key: 'dispensedQuantity', label: 'الكمية المنصرفة للمواطنين', type: 'number' },
    { key: 'amendmentReason', label: 'سبب تعديل الحصة (إن وجد)' },
    { key: 'amendmentDecreeNumber', label: 'رقم قرار / موافقة التعديل' },
    { key: 'status', label: 'حالة الحصة', type: 'select', options: ['مفتوحة للصرف', 'مكتملة', 'متأخرة التوريد', 'معدلة بقرار'] },
    { key: 'approvedBy', label: 'جهة الاعتماد' },
  ];

  const openAddCommodity = () => {
    const rec: RationCommodityRecord = {
      id: createRationRecordId('rc'),
      commodityCode: `COM-NEW-${commodities.length + 1}`,
      commodityName: '',
      category: settings.commodityCategories[0] || 'السكر والزيوت الأساسية',
      unit: 'كيس ١ كجم',
      packWeightOrSize: '١ كجم',
      officialSubsidizedPriceEgp: 15,
      wholesalePriceEgp: 14.5,
      merchantMarginEgp: 0.5,
      officialFreePriceEgp: 25,
      maxQuantityPerBeneficiary: 1,
      maxQuantityPerCard: 4,
      supplySource: 'الشركة العامة لتجارة الجملة',
      storageNature: 'جاف',
      shelfLifeMonths: 12,
      minSafetyStock: 1000,
      reorderLevel: 2000,
      status: 'نشط',
      notes: '',
    };
    setCrudModal({
      title: 'إضافة سلعة تموينية جديدة إلى السجل الرسمي',
      mode: 'edit',
      record: rec as unknown as Record<string, unknown>,
      fields: commodityFields,
      onSave: (u) => {
        const item = u as unknown as RationCommodityRecord;
        setCommodities([item, ...commodities]);
        logAudit('سجل السلع التموينية', 'إضافة', `إضافة سلعة تموينية (${item.commodityName})`);
        notify(`تمت إضافة السلعة (${item.commodityName}) بنجاح.`);
      },
    });
  };

  const openPriceUpdateModal = (c: RationCommodityRecord) => {
    const fields: EditableFieldSpec[] = [
      { key: 'commodityName', label: 'السلعة', readOnly: true },
      { key: 'previousPriceEgp', label: 'السعر السابق (ج.م)', type: 'number', readOnly: true },
      { key: 'newPriceEgp', label: 'السعر الجديد (ج.م)', type: 'number' },
      { key: 'effectiveDate', label: 'تاريخ سريان السعر الجديد', type: 'date' },
      { key: 'priceSource', label: 'مصدر القرار السعري' },
      { key: 'decreeNumber', label: 'رقم القرار الوزاري / المنشور' },
      { key: 'approvalStatus', label: 'حالة الاعتماد', type: 'select', options: ['معتمد', 'قيد المراجعة'] },
    ];
    setCrudModal({
      title: `تحديث السعر الرسمي وتوثيقه في سجل تاريخ الأسعار: ${c.commodityName}`,
      mode: 'edit',
      record: {
        commodityName: c.commodityName,
        previousPriceEgp: c.officialSubsidizedPriceEgp,
        newPriceEgp: c.officialSubsidizedPriceEgp,
        effectiveDate: todayRef,
        priceSource: 'قرار وزير التموين والتجارة الداخلية',
        decreeNumber: '',
        approvalStatus: 'معتمد',
      },
      fields,
      onSave: (u) => {
        const newP = Number(u.newPriceEgp) || c.officialSubsidizedPriceEgp;
        const hist: CommodityPriceHistoryRecord = {
          id: createRationRecordId('ph'),
          commodityId: c.id,
          commodityCode: c.commodityCode,
          commodityName: c.commodityName,
          previousPriceEgp: c.officialSubsidizedPriceEgp,
          newPriceEgp: newP,
          effectiveDate: String(u.effectiveDate || todayRef),
          priceSource: String(u.priceSource || ''),
          decreeNumber: String(u.decreeNumber || '—'),
          updatedBy: currentUserName,
          approvalStatus: (u.approvalStatus as 'معتمد' | 'قيد المراجعة') || 'معتمد',
          recordedAt: todayRef,
        };
        setPriceHistory([hist, ...priceHistory]);
        setCommodities(commodities.map((x) => (x.id === c.id ? { ...x, officialSubsidizedPriceEgp: newP } : x)));
        logAudit('سجل تاريخ الأسعار', 'تعديل', `تحديث سعر ${c.commodityName} من ${c.officialSubsidizedPriceEgp} إلى ${newP} ج.م`);
        notify(`تم توثيق السعر الجديد (${formatArabicCurrency(newP)}) في سجل تاريخ الأسعار غير القابل للتعديل.`);
      },
    });
  };

  const openAddMerchant = () => {
    const rec: RationMerchantRecord = {
      id: createRationRecordId('rm'),
      merchantCode: `MER-GH-${String(merchants.length + 1).padStart(3, '0')}`,
      fileNumber: `FILE-2026-${100 + merchants.length + 1}`,
      merchantName: '',
      outletTradeName: '',
      outletType: 'بقال تمويني',
      nationalId: '',
      phoneNumber: '',
      mobileNumber: '',
      email: '',
      supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
      supplyOffice: 'مكتب تموين مركز المحلة',
      localUnit: MAHALLA_LOCAL_UNITS[0],
      village: MAHALLA_VILLAGES[0],
      detailedAddress: '',
      gpsCoordinates: '',
      posMachineNumber: '',
      smartCardCode: '',
      wholesaleBranchName: 'فرع الجملة بالمحلة الكبرى ١',
      licenseNumber: '',
      licenseExpiryDate: '2028-11-25',
      taxCardNumber: '',
      taxCardExpiryDate: '2028-11-25',
      commercialRegisterNumber: '',
      commercialRegisterExpiryDate: '2028-11-25',
      insuranceAmountEgp: 50000,
      linkedCardsCount: 800,
      linkedBeneficiariesCount: 3200,
      monthlyApprovedQuotaValueEgp: 160000,
      status: 'نشط',
      notes: '',
    };
    setCrudModal({
      title: 'إضافة تاجر تمويني / منفذ جمعيتي جديد (٣٠ حقلاً كاملاً)',
      mode: 'edit',
      record: rec as unknown as Record<string, unknown>,
      fields: merchantFields,
      onSave: (u) => {
        const item = u as unknown as RationMerchantRecord;
        setMerchants([item, ...merchants]);
        logAudit('سجل التجار التموينيين', 'إضافة', `تسجيل التاجر (${item.merchantName}) — ${item.village}`);
        notify(`تم تسجيل التاجر التمويني (${item.merchantName}) بنجاح.`);
      },
    });
  };

  const openAddQuota = () => {
    const rec: RationQuotaRecord = {
      id: createRationRecordId('rq'),
      quotaCode: `QTA-2026-11-${String(quotas.length + 1).padStart(2, '0')}`,
      periodLabel: 'نوفمبر ٢٠٢٦',
      periodicity: 'شهري',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
      village: MAHALLA_VILLAGES[0],
      localUnit: MAHALLA_LOCAL_UNITS[0],
      merchantId: merchants[0]?.id || 'rm-1',
      merchantName: merchants[0]?.merchantName || '',
      commodityId: commodities[0]?.id || 'rc-1',
      commodityName: commodities[0]?.commodityName || '',
      unit: commodities[0]?.unit || 'كيس ١ كجم',
      originalApprovedQuota: 4000,
      amendedApprovedQuota: 4000,
      suppliedQuantity: 4000,
      dispensedQuantity: 3200,
      amendmentReason: '—',
      amendmentDecreeNumber: '—',
      status: 'مفتوحة للصرف',
      approvedBy: currentUserName,
    };
    setCrudModal({
      title: 'إضافة حصة تموينية جديدة (حساب آلي لنسب التنفيذ والتوريد)',
      mode: 'edit',
      record: rec as unknown as Record<string, unknown>,
      fields: quotaFields,
      onSave: (u) => {
        const item = u as unknown as RationQuotaRecord;
        setQuotas([item, ...quotas]);
        logAudit('إدارة الحصص التموينية', 'إضافة', `اعتماد حصة ${item.quotaCode} للتاجر ${item.merchantName}`);
        notify(`تمت إضافة الحصة التموينية (${item.quotaCode}) بنجاح.`);
      },
    });
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* الترويسة المؤسسية لقسم السلع التموينية */}
      <div className="bg-gradient-to-l from-[#102A43] via-[#164E83] to-[#102A43] text-white rounded-2xl p-5 border-2 border-[#C6A15B]/50 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#C6A15B]/20 border border-[#C6A15B] flex items-center justify-center shrink-0">
              <ShoppingBasket className="w-6 h-6 text-[#C6A15B]" />
            </div>
            <div>
              <span className="text-[11px] font-black text-[#C6A15B] block">
                منظومة التموين والتجارة الداخلية بالغربية — قاعدة بيانات حكومية متكاملة
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white">
                قسم السلع التموينية — إدارة السلع والتجار والحصص والمخازن والبطاقات والمستفيدين
              </h2>
              <p className="text-xs font-bold text-blue-100 mt-1">
                ١٤ شاشة تشغيلية ورقابية · ٢٠ مؤشر أداء تفاعلي · ١١ رسماً بيانياً · ٥٠ تقريراً رسمياً · رصد فوري للتراخيص والضريبية والسجل التجاري
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FactoryResetButton
              sectionName="قسم السلع التموينية"
              onConfirmReset={handleFactoryReset}
            />
          </div>
        </div>
      </div>

      {/* شريط التنقل العلوي المنظم بنفس نمط BakeryNavigationGrid مع بحث فوري واحتواء تلقائي للنص */}
      <div className="bg-white rounded-2xl border-2 border-[#102A43]/15 p-3.5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-[#164E83]" />
            <span className="text-xs font-black text-[#102A43]">
              التنقل السريع بين شاشات قسم السلع التموينية (١٤ شاشة متكاملة)
            </span>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              placeholder="بحث سريع في شاشات القسم..."
              className="w-full pr-8 pl-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50 focus:bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {navGroups.map((grp) => {
            const visibleItems = grp.items.filter((it) => !navSearch || it.label.includes(navSearch));
            if (visibleItems.length === 0) return null;
            return (
              <div key={grp.title} className="bg-slate-50/80 rounded-xl border border-slate-200 p-2.5 space-y-1.5">
                <div className="text-[11px] font-black text-[#164E83] px-1 pb-1 border-b border-slate-200/80 break-words">
                  {grp.title}
                </div>
                <div className="space-y-1">
                  {visibleItems.map((it) => {
                    const Icon = it.icon;
                    const isActive = activeScreen === it.id;
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => setActiveScreen(it.id)}
                        className={`w-full text-right px-2.5 py-2 rounded-xl text-[11px] font-black flex items-start justify-between gap-2 transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#102A43] text-[#C6A15B] shadow-sm'
                            : 'bg-white hover:bg-blue-50 text-[#102A43] border border-slate-200/70'
                        }`}
                      >
                        <div className="flex items-start gap-1.5 min-w-0">
                          <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span className="leading-snug break-words whitespace-normal">{it.label}</span>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-black num-cell shrink-0 ${
                            isActive ? 'bg-[#C6A15B] text-[#102A43]' : 'bg-slate-100 text-[#164E83]'
                          }`}
                        >
                          {toArabicNumerals(it.count)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {toastMsg && (
        <div className="bg-emerald-50 border-2 border-emerald-600 text-emerald-900 rounded-xl px-4 py-2.5 text-xs font-black flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ==================== الشاشة ١: لوحة المؤشرات (٢٠ بطاقة قابلة للضغط + ١١ رسماً بيانياً) ==================== */}
      {activeScreen === 'dashboard' && (
        <div className="space-y-5">
          {/* شريط الفلاتر الشاملة */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 flex flex-wrap items-center gap-2.5 text-xs shadow-xs">
            <span className="font-black text-[#102A43]">تصفية مؤشرات لوحة القيادة:</span>
            <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} className="px-3 py-1.5 rounded-xl border border-slate-300 font-black bg-slate-50">
              <option value="نوفمبر ٢٠٢٦">الفترة: نوفمبر ٢٠٢٦</option>
              <option value="الربع الرابع ٢٠٢٦">الربع الرابع ٢٠٢٦</option>
              <option value="العام المالي ٢٠٢٦">العام الكامل ٢٠٢٦</option>
            </select>
            <select value={villageFilter} onChange={(e) => setVillageFilter(e.target.value)} className="px-3 py-1.5 rounded-xl border border-slate-300 font-black bg-slate-50">
              <option value="ALL">القرية: جميع القرى والوحدات</option>
              {Array.from(new Set(merchants.map((m) => m.village))).map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <select value={merchantFilter} onChange={(e) => setMerchantFilter(e.target.value)} className="px-3 py-1.5 rounded-xl border border-slate-300 font-black bg-slate-50">
              <option value="ALL">التاجر: جميع التجار والمنافذ</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.merchantName}>{m.merchantName}</option>
              ))}
            </select>
            <select value={commodityFilter} onChange={(e) => setCommodityFilter(e.target.value)} className="px-3 py-1.5 rounded-xl border border-slate-300 font-black bg-slate-50">
              <option value="ALL">السلعة: جميع السلع التموينية</option>
              {commodities.map((c) => (
                <option key={c.id} value={c.commodityName}>{c.commodityName}</option>
              ))}
            </select>
          </div>

          {/* ٢٠ بطاقة مؤشر قابلة للضغط مع احتواء تلقائي كامل للنص */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {dashboardMetrics.kpis.map((kpi) => {
              const borderTone =
                kpi.tone === 'red'
                  ? 'border-red-300 hover:border-red-600 bg-red-50/40'
                  : kpi.tone === 'emerald'
                  ? 'border-emerald-300 hover:border-emerald-600 bg-emerald-50/35'
                  : kpi.tone === 'amber'
                  ? 'border-amber-300 hover:border-amber-600 bg-amber-50/40'
                  : kpi.tone === 'blue'
                  ? 'border-blue-300 hover:border-[#164E83] bg-blue-50/30'
                  : 'border-[#102A43]/25 hover:border-[#102A43] bg-white';
              const valueTone =
                kpi.tone === 'red'
                  ? 'text-red-700'
                  : kpi.tone === 'emerald'
                  ? 'text-emerald-800'
                  : kpi.tone === 'amber'
                  ? 'text-amber-800'
                  : 'text-[#102A43]';
              return (
                <button
                  key={kpi.title}
                  type="button"
                  onClick={() => setActiveScreen(kpi.target)}
                  className={`p-3.5 rounded-2xl border-2 text-right transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between min-h-[104px] ${borderTone}`}
                >
                  <span className="text-[11px] font-black text-slate-700 leading-snug break-words whitespace-normal block">
                    {kpi.title}
                  </span>
                  <span className={`text-lg sm:text-xl font-black num-cell mt-1.5 leading-tight break-words block ${valueTone}`}>
                    {kpi.value}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 mt-1 leading-snug break-words whitespace-normal block">
                    {kpi.sub} ← فتح الشاشة
                  </span>
                </button>
              );
            })}
          </div>

          {/* ١١ رسماً بيانياً تفاعلياً لقسم السلع التموينية */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* رسم ١: نسب تنفيذ الحصص التموينية لكل قرية */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
              <h4 className="text-xs font-black text-[#102A43]">١. نسب تنفيذ صرف الحصص التموينية</h4>
              {quotas.map((q) => {
                const m = computeQuotaMetrics(q);
                return (
                  <div key={q.id} className="space-y-1 text-[11px]">
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-700 truncate">{q.village} — {q.commodityName}</span>
                      <span className="num-cell font-black text-[#164E83]">{toArabicNumerals(m.executionRatePct)}٪</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-[#164E83] h-full rounded-full" style={{ width: `${Math.min(100, m.executionRatePct)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* رسم ٢: نسب التوريد مقابل الحصة المعتمدة */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
              <h4 className="text-xs font-black text-[#102A43]">٢. نسب التوريد الفعلي من فروع الجملة</h4>
              {quotas.map((q) => {
                const m = computeQuotaMetrics(q);
                return (
                  <div key={q.id} className="space-y-1 text-[11px]">
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-700 truncate">{q.merchantName}</span>
                      <span className={`num-cell font-black ${m.supplyRatePct < 80 ? 'text-red-700' : 'text-emerald-700'}`}>{toArabicNumerals(m.supplyRatePct)}٪</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className={`${m.supplyRatePct < 80 ? 'bg-red-600' : 'bg-emerald-600'} h-full rounded-full`} style={{ width: `${Math.min(100, m.supplyRatePct)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* رسم ٣: مقارنة المعتمد والمورد والمنصرف الإجمالي */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
              <h4 className="text-xs font-black text-[#102A43]">٣. توازن الحصص (المعتمدة / الموردة / المنصرفة)</h4>
              {[
                { label: 'الحصة المعتمدة', val: dashboardMetrics.totalApprovedQuota, color: 'bg-[#102A43]' },
                { label: 'المورد فعلياً', val: dashboardMetrics.totalSuppliedQuota, color: 'bg-[#164E83]' },
                { label: 'المنصرف للمواطنين', val: dashboardMetrics.totalDispensedQuota, color: 'bg-emerald-600' },
              ].map((b) => {
                const pct = dashboardMetrics.totalApprovedQuota > 0 ? Math.round((b.val / dashboardMetrics.totalApprovedQuota) * 100) : 0;
                return (
                  <div key={b.label} className="space-y-1 text-[11px]">
                    <div className="flex justify-between font-black">
                      <span>{b.label}</span>
                      <span className="num-cell">{formatArabicNumber(b.val)} ({toArabicNumerals(pct)}٪)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div className={`${b.color} h-full rounded-full`} style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* رسم ٤: تطور أعداد المستفيدين ٢٠٢٣ - ٢٠٢٤ - ٢٠٢٥ */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
              <h4 className="text-xs font-black text-[#102A43]">٤. المقارنة التاريخية للمستفيدين (٢٠٢٣ – ٢٠٢٥)</h4>
              {[2023, 2024, 2025].map((yr) => {
                const sum = beneficiaryStats.reduce((a, v) => a + (v.yearlySnapshots.find((s) => s.year === yr)?.beneficiariesCount || 0), 0);
                const maxSum = Math.max(1, beneficiaryStats.reduce((a, v) => a + (v.yearlySnapshots.find((s) => s.year === 2025)?.beneficiariesCount || 0), 0));
                const pct = Math.round((sum / maxSum) * 100);
                return (
                  <div key={yr} className="space-y-1 text-[11px]">
                    <div className="flex justify-between font-black">
                      <span>عام {toArabicNumerals(yr)}</span>
                      <span className="num-cell text-[#164E83]">{formatArabicNumber(sum)} مستفيد</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-[#C6A15B] h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* رسم ٥: توزيع التجار حسب نوع المنفذ */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
              <h4 className="text-xs font-black text-[#102A43]">٥. توزيع المنافذ التموينية حسب النوع</h4>
              {(['بقال تمويني', 'مشروع جمعيتي', 'مجمع استهلاكي'] as const).map((tp) => {
                const cnt = merchants.filter((m) => m.outletType === tp).length;
                const pct = merchants.length ? Math.round((cnt / merchants.length) * 100) : 0;
                return (
                  <div key={tp} className="space-y-1 text-[11px]">
                    <div className="flex justify-between font-bold">
                      <span>{tp}</span>
                      <span className="num-cell font-black">{toArabicNumerals(cnt)} ({toArabicNumerals(pct)}٪)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-[#102A43] h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* رسم ٦: نسب إشغال المخازن المركزية */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
              <h4 className="text-xs font-black text-[#102A43]">٦. نسب إشغال السعة التخزينية بالمخازن</h4>
              {warehouses.map((w) => {
                const pct = w.capacityTons > 0 ? Math.round((w.currentOccupancyTons / w.capacityTons) * 100) : 0;
                return (
                  <div key={w.id} className="space-y-1 text-[11px]">
                    <div className="flex justify-between font-bold">
                      <span className="truncate">{w.warehouseName}</span>
                      <span className="num-cell font-black">{toArabicNumerals(pct)}٪</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-700 h-full rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* رسم ٧: حالة السلع التموينية وتوافرها */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
              <h4 className="text-xs font-black text-[#102A43]">٧. مقارنة السعر التمويني بالسعر الحر</h4>
              {commodities.slice(0, 4).map((c) => {
                const savePct = c.officialFreePriceEgp > 0 ? Math.round(((c.officialFreePriceEgp - c.officialSubsidizedPriceEgp) / c.officialFreePriceEgp) * 100) : 0;
                return (
                  <div key={c.id} className="space-y-1 text-[11px]">
                    <div className="flex justify-between font-bold">
                      <span className="truncate">{c.commodityName}</span>
                      <span className="num-cell text-emerald-700 font-black">دعم {toArabicNumerals(savePct)}٪</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${Math.min(100, savePct)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* رسم ٨: توزيع البطاقات التموينية حسب الحالة */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
              <h4 className="text-xs font-black text-[#102A43]">٨. توزيع البطاقات التموينية حسب الحالة</h4>
              {(['نشطة', 'موقوفة لحين التحديث', 'بدل فاقد/تالف'] as const).map((st) => {
                const cnt = cards.filter((c) => c.status === st).length;
                const pct = cards.length ? Math.round((cnt / cards.length) * 100) : 0;
                return (
                  <div key={st} className="space-y-1 text-[11px]">
                    <div className="flex justify-between font-bold">
                      <span>{st}</span>
                      <span className="num-cell font-black">{toArabicNumerals(cnt)} ({toArabicNumerals(pct)}٪)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className={`${st === 'نشطة' ? 'bg-emerald-600' : 'bg-amber-500'} h-full rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* رسم ٩: مؤشرات التزام التجار التفتيشية */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
              <h4 className="text-xs font-black text-[#102A43]">٩. مؤشرات التزام التجار في الرقابة الميدانية</h4>
              {inspections.map((i) => (
                <div key={i.id} className="space-y-1 text-[11px]">
                  <div className="flex justify-between font-bold">
                    <span className="truncate">{i.merchantName}</span>
                    <span className="num-cell font-black">{toArabicNumerals(i.complianceScore)}٪</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className={`${i.complianceScore >= 80 ? 'bg-emerald-600' : 'bg-red-600'} h-full rounded-full`} style={{ width: `${i.complianceScore}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* رسم ١٠: توزيع التنبيهات الذكية حسب مستوى الخطورة */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
              <h4 className="text-xs font-black text-[#102A43]">١٠. توزيع التنبيهات الذكية حسب الخطورة</h4>
              {(['عاجل', 'مرتفع', 'متوسط', 'منخفض'] as const).map((sev) => {
                const cnt = smartAlerts.filter((a) => a.severity === sev).length;
                const pct = smartAlerts.length ? Math.round((cnt / smartAlerts.length) * 100) : 0;
                return (
                  <div key={sev} className="space-y-1 text-[11px]">
                    <div className="flex justify-between font-bold">
                      <span>{sev}</span>
                      <span className="num-cell font-black">{toArabicNumerals(cnt)}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className={`${sev === 'عاجل' ? 'bg-red-600' : sev === 'مرتفع' ? 'bg-amber-500' : 'bg-[#164E83]'} h-full rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* رسم ١١: حالة معالجة شكاوى المواطنين */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5 md:col-span-2">
              <h4 className="text-xs font-black text-[#102A43]">١١. مؤشر معالجة شكاوى السلع التموينية وتوزيع الدعم الشهري حسب القرية</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {beneficiaryStats.map((v) => {
                  const s25 = v.yearlySnapshots.find((s) => s.year === 2025);
                  return (
                    <div key={v.id} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-black text-[#102A43] block">{v.village}</span>
                        <span className="text-[10.5px] font-bold text-slate-500">{formatArabicNumber(s25?.beneficiariesCount || 0)} مستفيد</span>
                      </div>
                      <span className="num-cell font-black text-emerald-800">{formatArabicCurrency(s25?.monthlySupportValueEgp || 0)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== الشاشة ٢: سجل السلع التموينية + سجل تاريخ الأسعار غير القابل للتعديل ==================== */}
      {activeScreen === 'commodities_registry' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border-2 border-[#102A43]/20 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-[#102A43]">٢. سجل السلع التموينية (١٨ حقلاً) وسجل تاريخ الأسعار الموثق</h3>
              <p className="text-[11px] font-bold text-slate-600">
                أي تحديث للسعر الرسمي يُسجل تلقائياً في سجل تاريخ الأسعار غير القابل للحذف مع رقم القرار الوزاري وتاريخ السريان
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select value={commodityStatusFilter} onChange={(e) => setCommodityStatusFilter(e.target.value)} className="px-3 py-1.5 rounded-xl border border-slate-300 font-black bg-white">
                <option value="ALL">جميع الحالات</option>
                <option value="نشط">نشط</option>
                <option value="غير متوفر">غير متوفر</option>
                <option value="موقوف مؤقتاً">موقوف مؤقتاً</option>
              </select>
              <button type="button" onClick={openAddCommodity} className="px-3.5 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] font-black flex items-center gap-1 cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة سلعة تموينية</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <TableToolbar
              tableName="سجل السلع التموينية"
              totalRows={commodities.length}
              pinnedCount={pinnedMode === 'manual' ? 1 : 0}
              onClearPins={() => setPinnedMode('none')}
              onManualPin={() => setPinnedMode('manual')}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2.5 border border-slate-700">الكود / اسم السلعة</th>
                    <th className="p-2.5 border border-slate-700">التصنيف والوحدة</th>
                    <th className="p-2.5 border border-slate-700 text-center">السعر التمويني / الحر</th>
                    <th className="p-2.5 border border-slate-700 text-center">الجملة / هامش التاجر</th>
                    <th className="p-2.5 border border-slate-700 text-center">الحد الأقصى (فرد/بطاقة)</th>
                    <th className="p-2.5 border border-slate-700 text-center">حد الأمان / الحالة</th>
                    <th className="p-2.5 border border-slate-700 text-center">تحديث السعر</th>
                    <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {commodities
                    .filter((c) => commodityStatusFilter === 'ALL' || c.status === commodityStatusFilter)
                    .map((c) => (
                      <tr key={c.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-2.5">
                          <span className="num-cell text-[10.5px] font-black text-[#164E83] block">{c.commodityCode}</span>
                          <span className="font-black text-[#102A43]">{c.commodityName}</span>
                        </td>
                        <td className="p-2.5">
                          <span className="font-bold text-slate-800 block">{c.category}</span>
                          <span className="text-[10.5px] font-bold text-slate-500">{c.unit} ({c.packWeightOrSize})</span>
                        </td>
                        <td className="p-2.5 text-center num-cell">
                          <span className="font-black text-emerald-800 block">{formatArabicCurrency(c.officialSubsidizedPriceEgp)}</span>
                          <span className="text-[10.5px] font-bold text-slate-500">حر: {formatArabicCurrency(c.officialFreePriceEgp)}</span>
                        </td>
                        <td className="p-2.5 text-center num-cell font-bold">
                          {formatArabicCurrency(c.wholesalePriceEgp)} / +{formatArabicCurrency(c.merchantMarginEgp)}
                        </td>
                        <td className="p-2.5 text-center num-cell font-black">
                          {toArabicNumerals(c.maxQuantityPerBeneficiary)} / {toArabicNumerals(c.maxQuantityPerCard)}
                        </td>
                        <td className="p-2.5 text-center">
                          <span className="num-cell text-[10.5px] font-bold block">أمان: {formatArabicNumber(c.minSafetyStock)}</span>
                          <span className={`font-black ${c.status === 'نشط' ? 'text-emerald-700' : 'text-red-700'}`}>{c.status}</span>
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => openPriceUpdateModal(c)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#164E83] border border-blue-200 text-[10.5px] font-black cursor-pointer"
                          >
                            تحديث السعر
                          </button>
                        </td>
                        <td className="p-2.5 text-center">
                          <TableActionButtons
                            recordLabel={c.commodityName}
                            onView={() => setCrudModal({ title: `سلعة تموينية: ${c.commodityName}`, mode: 'view', record: c as unknown as Record<string, unknown>, fields: commodityFields })}
                            onAdd={openAddCommodity}
                            onEdit={() =>
                              setCrudModal({
                                title: `تعديل السلعة: ${c.commodityName}`,
                                mode: 'edit',
                                record: c as unknown as Record<string, unknown>,
                                fields: commodityFields,
                                onSave: (u) => {
                                  setCommodities(commodities.map((x) => (x.id === c.id ? (u as unknown as RationCommodityRecord) : x)));
                                  logAudit('سجل السلع التموينية', 'تعديل', `تحديث بيانات السلعة ${c.commodityName}`);
                                  notify('تم تحديث بيانات السلعة.');
                                },
                              })
                            }
                            onDelete={() => {
                              setCommodities(commodities.filter((x) => x.id !== c.id));
                              logAudit('سجل السلع التموينية', 'حذف', `حذف السلعة ${c.commodityName}`);
                              notify('تم حذف السلعة من السجل.');
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* سجل تاريخ الأسعار غير القابل للتعديل */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <h4 className="text-xs font-black text-[#102A43] flex items-center gap-2">
              <History className="w-4 h-4 text-[#164E83]" />
              <span>سجل تاريخ الأسعار الرسمي (غير قابل للحذف — محمي للتدقيق القانوني)</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2 border border-slate-700">السلعة</th>
                    <th className="p-2 border border-slate-700 text-center">السعر السابق</th>
                    <th className="p-2 border border-slate-700 text-center">السعر الجديد</th>
                    <th className="p-2 border border-slate-700 text-center">تاريخ السريان</th>
                    <th className="p-2 border border-slate-700">المصدر ورقم القرار</th>
                    <th className="p-2 border border-slate-700">المستخدم والاعتماد</th>
                  </tr>
                </thead>
                <tbody>
                  {priceHistory.map((p) => (
                    <tr key={p.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2 font-black text-[#102A43]">{p.commodityName} ({p.commodityCode})</td>
                      <td className="p-2 text-center num-cell font-bold text-slate-600">{formatArabicCurrency(p.previousPriceEgp)}</td>
                      <td className="p-2 text-center num-cell font-black text-emerald-800">{formatArabicCurrency(p.newPriceEgp)}</td>
                      <td className="p-2 text-center num-cell font-bold">{formatDateArabic(p.effectiveDate)}</td>
                      <td className="p-2 font-bold text-slate-700">{p.priceSource} — {p.decreeNumber}</td>
                      <td className="p-2 font-black text-[#164E83]">{p.updatedBy} ({p.approvalStatus})</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== الشاشة ٣: سجل التجار التموينيين (٣٠ حقلاً) + سجل متابعة التاجر ==================== */}
      {activeScreen === 'merchants_registry' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border-2 border-[#102A43]/20 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-[#102A43]">
                ٣. سجل التجار التموينيين ومنافذ جمعيتي والمجمعات (٣٠ حقلاً كاملاً + التراخيص والضريبية والسجل التجاري)
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                يشمل رقم الترخيص وانتهاؤه والبطاقة الضريبية وانتهاؤها والسجل التجاري وانتهاؤه بكالندر عربي و٧ حالات رسمية للتاجر
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث بالتاجر / القرية / POS..."
                  className="pr-8 pl-3 py-1.5 rounded-xl border border-slate-300 font-bold w-52"
                />
              </div>
              <select value={merchantStatusFilter} onChange={(e) => setMerchantStatusFilter(e.target.value)} className="px-3 py-1.5 rounded-xl border border-slate-300 font-black bg-white">
                <option value="ALL">جميع الحالات (٧ حالات)</option>
                <option value="نشط">نشط</option>
                <option value="موقوف مؤقتاً">موقوف مؤقتاً</option>
                <option value="تحت المراجعة">تحت المراجعة</option>
                <option value="مغلق">مغلق</option>
                <option value="منتهي الترخيص">منتهي الترخيص</option>
                <option value="مخالف">مخالف</option>
                <option value="مسحوب الترخيص">مسحوب الترخيص</option>
              </select>
              <button type="button" onClick={openAddMerchant} className="px-3.5 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] font-black flex items-center gap-1 cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة تاجر تمويني</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <TableToolbar
              tableName="سجل التجار التموينيين"
              totalRows={merchants.length}
              pinnedCount={pinnedMode === 'manual' ? 2 : 0}
              onClearPins={() => setPinnedMode('none')}
              onManualPin={() => setPinnedMode('manual')}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2.5 border border-slate-700">الكود / التاجر والمنفذ</th>
                    <th className="p-2.5 border border-slate-700">القرية / POS / الجملة</th>
                    <th className="p-2.5 border border-slate-700">الترخيص وانتهاؤه</th>
                    <th className="p-2.5 border border-slate-700">البطاقة الضريبية وانتهاؤها</th>
                    <th className="p-2.5 border border-slate-700">السجل التجاري وانتهاؤه</th>
                    <th className="p-2.5 border border-slate-700 text-center">البطاقات / الاستعاضة</th>
                    <th className="p-2.5 border border-slate-700 text-center">الحالة</th>
                    <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {merchants
                    .filter(
                      (m) =>
                        (merchantStatusFilter === 'ALL' || m.status === merchantStatusFilter) &&
                        (!searchQuery || m.merchantName.includes(searchQuery) || m.village.includes(searchQuery) || m.posMachineNumber.includes(searchQuery))
                    )
                    .map((m) => (
                      <tr key={m.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-2.5">
                          <span className="num-cell text-[10.5px] font-black text-[#164E83] block">{m.merchantCode} · {m.outletType}</span>
                          <span className="font-black text-[#102A43] block">{m.merchantName}</span>
                          <span className="text-[10.5px] font-bold text-slate-500">{m.outletTradeName}</span>
                        </td>
                        <td className="p-2.5">
                          <span className="font-bold text-slate-800 block">{m.village}</span>
                          <span className="num-cell text-[10.5px] font-black text-[#164E83] block">{m.posMachineNumber}</span>
                          <span className="text-[10px] font-bold text-slate-500">{m.wholesaleBranchName}</span>
                        </td>
                        <td className="p-2.5 num-cell">
                          <span className="font-black block">{m.licenseNumber}</span>
                          <span className={`text-[10.5px] font-bold ${m.licenseExpiryDate < todayRef ? 'text-red-700 font-black' : 'text-slate-600'}`}>
                            {formatDateArabic(m.licenseExpiryDate)}
                          </span>
                        </td>
                        <td className="p-2.5 num-cell">
                          <span className="font-black block">{m.taxCardNumber}</span>
                          <span className={`text-[10.5px] font-bold ${m.taxCardExpiryDate < todayRef ? 'text-red-700 font-black' : 'text-slate-600'}`}>
                            {formatDateArabic(m.taxCardExpiryDate)}
                          </span>
                        </td>
                        <td className="p-2.5 num-cell">
                          <span className="font-black block">{m.commercialRegisterNumber}</span>
                          <span className={`text-[10.5px] font-bold ${m.commercialRegisterExpiryDate < todayRef ? 'text-red-700 font-black' : 'text-slate-600'}`}>
                            {formatDateArabic(m.commercialRegisterExpiryDate)}
                          </span>
                        </td>
                        <td className="p-2.5 text-center num-cell">
                          <span className="font-black text-[#102A43] block">{formatArabicNumber(m.linkedCardsCount)} بطاقة</span>
                          <span className="text-[10.5px] font-black text-emerald-800">{formatArabicCurrency(m.monthlyApprovedQuotaValueEgp)}</span>
                        </td>
                        <td className="p-2.5 text-center font-black">
                          <span className={m.status === 'نشط' ? 'text-emerald-700' : 'text-red-700'}>{m.status}</span>
                        </td>
                        <td className="p-2.5 text-center">
                          <TableActionButtons
                            recordLabel={m.merchantName}
                            onView={() => setCrudModal({ title: `ملف التاجر (٣٠ حقلاً): ${m.merchantName}`, mode: 'view', record: m as unknown as Record<string, unknown>, fields: merchantFields })}
                            onAdd={openAddMerchant}
                            onEdit={() =>
                              setCrudModal({
                                title: `تعديل ملف التاجر: ${m.merchantName}`,
                                mode: 'edit',
                                record: m as unknown as Record<string, unknown>,
                                fields: merchantFields,
                                onSave: (u) => {
                                  setMerchants(merchants.map((x) => (x.id === m.id ? (u as unknown as RationMerchantRecord) : x)));
                                  logAudit('سجل التجار التموينيين', 'تعديل', `تحديث بيانات التاجر ${m.merchantName}`);
                                  notify('تم تحديث بيانات التاجر التمويني.');
                                },
                              })
                            }
                            onDelete={() => {
                              setMerchants(merchants.filter((x) => x.id !== m.id));
                              logAudit('سجل التجار التموينيين', 'حذف', `حذف سجل التاجر ${m.merchantName}`);
                              notify('تم حذف سجل التاجر.');
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* سجل متابعة التاجر */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-[#102A43] flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[#164E83]" />
                <span>سجل متابعة التجار التموينيين (الإنذارات والزيارات وتجديد المستندات)</span>
              </h4>
              <button
                type="button"
                onClick={() => {
                  const fFields: EditableFieldSpec[] = [
                    { key: 'merchantName', label: 'التاجر التمويني', type: 'select', options: merchants.map((x) => x.merchantName) },
                    { key: 'logDate', label: 'تاريخ الإجراء', type: 'date' },
                    { key: 'eventType', label: 'نوع الحدث', type: 'select', options: ['زيارة تفتيشية', 'شكوى مواطن', 'إنذار إداري', 'إيقاف مؤقت', 'تجديد مستندات'] },
                    { key: 'summary', label: 'بيان المتابعة' },
                    { key: 'status', label: 'الحالة', type: 'select', options: ['مفتوح', 'تمت المعالجة'] },
                  ];
                  setCrudModal({
                    title: 'إضافة قيد جديد بسجل متابعة التاجر',
                    mode: 'edit',
                    record: {
                      id: `mfl-${Date.now()}`,
                      merchantId: merchants[0]?.id || '',
                      merchantCode: merchants[0]?.merchantCode || '',
                      merchantName: merchants[0]?.merchantName || '',
                      logDate: todayRef,
                      eventType: 'زيارة تفتيشية',
                      summary: '',
                      recordedBy: currentUserName,
                      status: 'مفتوح',
                    },
                    fields: fFields,
                    onSave: (u) => {
                      setFollowups([u as unknown as MerchantFollowupLogRecord, ...followups]);
                      notify('تمت إضافة قيد المتابعة للتاجر.');
                    },
                  });
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#164E83] text-xs font-black cursor-pointer"
              >
                + إضافة قيد متابعة
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2 border border-slate-700">التاريخ</th>
                    <th className="p-2 border border-slate-700">التاجر</th>
                    <th className="p-2 border border-slate-700">نوع الحدث</th>
                    <th className="p-2 border border-slate-700">الملخص</th>
                    <th className="p-2 border border-slate-700 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {followups.map((f) => (
                    <tr key={f.id} className="border-b border-slate-200">
                      <td className="p-2 num-cell font-bold">{formatDateArabic(f.logDate)}</td>
                      <td className="p-2 font-black text-[#102A43]">{f.merchantName}</td>
                      <td className="p-2 font-bold text-[#164E83]">{f.eventType}</td>
                      <td className="p-2 font-bold text-slate-700">{f.summary}</td>
                      <td className="p-2 text-center font-black">{f.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== الشاشة ٤: إدارة الحصص التموينية (٢٠ حقلاً + المعادلات الدقيقة) ==================== */}
      {activeScreen === 'quotas_management' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border-2 border-[#102A43]/20 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-[#102A43]">
                ٤. إدارة الحصص التموينية (٢٠ حقلاً · احتساب آلي للمتبقي ونسبة التنفيذ ونسبة التوريد)
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                المتبقي = المعتمدة - المنصرفة · المتبقي للتوريد = المعتمدة - الموردة · تُحفظ الحصة الأصلية دوماً عند التعديل الموثق بقرار
              </p>
            </div>
            <button type="button" onClick={openAddQuota} className="px-3.5 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black flex items-center gap-1 cursor-pointer">
              <Plus className="w-3.5 h-3.5" />
              <span>اعتماد حصة تموينية جديدة</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <TableToolbar
              tableName="جدول الحصص التموينية ونسب التنفيذ"
              totalRows={quotas.length}
              pinnedCount={pinnedMode === 'manual' ? 1 : 0}
              onClearPins={() => setPinnedMode('none')}
              onManualPin={() => setPinnedMode('manual')}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2.5 border border-slate-700">الكود / الفترة والدورية</th>
                    <th className="p-2.5 border border-slate-700">القرية والتاجر والسلعة</th>
                    <th className="p-2.5 border border-slate-700 text-center">الأصلية / المعتمدة</th>
                    <th className="p-2.5 border border-slate-700 text-center">المورد / متبقي التوريد</th>
                    <th className="p-2.5 border border-slate-700 text-center">المنصرف / المتبقي</th>
                    <th className="p-2.5 border border-slate-700 text-center">نسبة التنفيذ / التوريد</th>
                    <th className="p-2.5 border border-slate-700 text-center">الحالة</th>
                    <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {quotas.map((q) => {
                    const m = computeQuotaMetrics(q);
                    return (
                      <tr key={q.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-2.5 num-cell">
                          <span className="font-black text-[#164E83] block">{q.quotaCode}</span>
                          <span className="text-[10.5px] font-bold text-slate-600">{q.periodLabel} ({q.periodicity})</span>
                        </td>
                        <td className="p-2.5">
                          <span className="font-black text-[#102A43] block">{q.commodityName}</span>
                          <span className="text-[10.5px] font-bold text-slate-600">{q.merchantName} — {q.village}</span>
                        </td>
                        <td className="p-2.5 text-center num-cell">
                          <span className="text-[10.5px] text-slate-500 block">أصلية: {formatArabicNumber(q.originalApprovedQuota)}</span>
                          <span className="font-black text-[#102A43]">معتمدة: {formatArabicNumber(m.effectiveApproved)}</span>
                        </td>
                        <td className="p-2.5 text-center num-cell">
                          <span className="font-black text-emerald-800 block">{formatArabicNumber(q.suppliedQuantity)}</span>
                          <span className="text-[10.5px] font-bold text-amber-800">متبقي: {formatArabicNumber(m.remainingToSupply)}</span>
                        </td>
                        <td className="p-2.5 text-center num-cell">
                          <span className="font-black text-[#164E83] block">{formatArabicNumber(q.dispensedQuantity)}</span>
                          <span className="text-[10.5px] font-bold text-slate-600">متبقي: {formatArabicNumber(m.remainingToDispense)}</span>
                        </td>
                        <td className="p-2.5 text-center num-cell font-black">
                          <span className="text-[#164E83] block">تنفيذ: {toArabicNumerals(m.executionRatePct)}٪</span>
                          <span className={m.supplyRatePct < 80 ? 'text-red-700' : 'text-emerald-700'}>توريد: {toArabicNumerals(m.supplyRatePct)}٪</span>
                        </td>
                        <td className="p-2.5 text-center font-black">{q.status}</td>
                        <td className="p-2.5 text-center">
                          <TableActionButtons
                            recordLabel={q.quotaCode}
                            onView={() => setCrudModal({ title: `تفاصيل الحصة: ${q.quotaCode}`, mode: 'view', record: q as unknown as Record<string, unknown>, fields: quotaFields })}
                            onAdd={openAddQuota}
                            onEdit={() =>
                              setCrudModal({
                                title: `تعديل / توثيق تعديل الحصة: ${q.quotaCode}`,
                                mode: 'edit',
                                record: q as unknown as Record<string, unknown>,
                                fields: quotaFields,
                                onSave: (u) => {
                                  const raw = u as unknown as RationQuotaRecord;
                                  // الحفاظ الدائم على الحصة الأصلية المعتمدة
                                  const preserved: RationQuotaRecord = { ...raw, originalApprovedQuota: q.originalApprovedQuota };
                                  setQuotas(quotas.map((x) => (x.id === q.id ? preserved : x)));
                                  logAudit('إدارة الحصص التموينية', 'تعديل', `تعديل الحصة ${q.quotaCode} مع الحفاظ على الحصة الأصلية (${q.originalApprovedQuota})`);
                                  notify('تم تحديث الحصة مع الحفاظ على الحصة الأصلية المعتمدة.');
                                },
                              })
                            }
                            onDelete={() => {
                              setQuotas(quotas.filter((x) => x.id !== q.id));
                              logAudit('إدارة الحصص التموينية', 'حذف', `حذف الحصة ${q.quotaCode}`);
                              notify('تم حذف الحصة التموينية.');
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== الشاشات ٥ – ٨ ==================== */}
      {(activeScreen === 'warehouses_purchases' ||
        activeScreen === 'ration_cards' ||
        activeScreen === 'beneficiaries_db' ||
        activeScreen === 'citizen_issues') && (
        <RationWarehouseAndCardsView
          activeScreen={activeScreen}
          todayRef={todayRef}
          currentUserName={currentUserName}
          maskSensitiveByDefault={settings.maskSensitiveCardDataByDefault}
          commodities={commodities}
          merchants={merchants}
          warehouses={warehouses}
          setWarehouses={setWarehouses}
          receipts={receipts}
          setReceipts={setReceipts}
          ledger={ledger}
          setLedger={setLedger}
          transfers={transfers}
          setTransfers={setTransfers}
          stocktakes={stocktakes}
          setStocktakes={setStocktakes}
          cards={cards}
          setCards={setCards}
          beneficiaryStats={beneficiaryStats}
          setBeneficiaryStats={setBeneficiaryStats}
          citizenIssues={citizenIssues}
          setCitizenIssues={setCitizenIssues}
          onLogAudit={logAudit}
          onNotify={notify}
        />
      )}

      {/* ==================== الشاشات ٩ – ١٤ ==================== */}
      {(activeScreen === 'field_control' ||
        activeScreen === 'ration_complaints' ||
        activeScreen === 'smart_alerts' ||
        activeScreen === 'reports_center' ||
        activeScreen === 'print_export' ||
        activeScreen === 'settings_audit') && (
        <RationControlReportsView
          activeScreen={activeScreen}
          todayRef={todayRef}
          currentUserName={currentUserName}
          commodities={commodities}
          priceHistory={priceHistory}
          merchants={merchants}
          quotas={quotas}
          warehouses={warehouses}
          receipts={receipts}
          ledger={ledger}
          transfers={transfers}
          stocktakes={stocktakes}
          cards={cards}
          beneficiaryStats={beneficiaryStats}
          citizenIssues={citizenIssues}
          inspections={inspections}
          setInspections={setInspections}
          complaints={complaints}
          setComplaints={setComplaints}
          smartAlerts={smartAlerts}
          closedAlertIds={closedAlertIds}
          onCloseAlert={(id) => {
            setClosedAlertIds((prev) => ({ ...prev, [id]: true }));
            logAudit('نظام التنبيهات الذكي', 'اعتماد', `إغلاق التنبيه ${id}`);
            notify('تمت معالجة وإغلاق التنبيه بنجاح.');
          }}
          auditLogs={auditLogs}
          settings={settings}
          onUpdateSettings={(next) => {
            setSettings(next);
            notify('تم حفظ إعدادات قسم السلع التموينية.');
          }}
          onLogAudit={logAudit}
          onNotify={notify}
          onNavigateScreen={(s) => setActiveScreen(s)}
        />
      )}

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
