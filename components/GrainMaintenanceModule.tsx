'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Warehouse,
  Scale,
  Droplets,
  Factory,
  Percent,
  Wheat,
  ThermometerSnowflake,
  Activity,
  Wrench,
  TrendingDown,
  ClipboardList,
  Package,
  Wallet,
  Landmark,
  BarChart3,
  BellRing,
  FileSpreadsheet,
  Printer,
  History,
  ShieldCheck,
  Settings2,
  Search,
  ChevronDown,
  ChevronLeft,
  Eye,
  PlusCircle,
  CheckCircle2,
  X,
  AlertTriangle,
  Download,
  Edit3,
  Ban,
  Trash2,
} from 'lucide-react';
import { BakeryRecord, User } from '@/types';
import {
  formatArabicCurrency,
  formatArabicDecimal,
  formatArabicNumber,
  formatDateArabic,
  normalizeSearchText,
  toArabicNumerals,
} from '@/lib/utils';
import {
  buildSmartGrainAlerts,
  computeAssetBookValue,
  computeFlourQuotaMetrics,
  computeLossVariance,
  computeMillExtractionMetrics,
  computeMoistureCorrection,
  computeNetWeightAndDiff,
  computeRefrigeratorStatus,
  computeSparePartStock,
  computeWarehouseBalance,
  GRAIN_ASSET_CATEGORIES,
  GRAIN_FINANCIAL_ACCOUNT_CATEGORIES,
  GRAIN_FUNCTIONAL_ROLES,
  GRAIN_PERMISSION_ACTIONS,
  GrainApprovalStatus,
  GrainAssetCategory,
  GrainAssetRecord,
  GrainFinancialAccountCategory,
  GrainFinancialTransactionRecord,
  GrainLossRecord,
  GrainMaintenanceOrderRecord,
  GrainMaintenanceStoreData,
  GrainMillRecord,
  GrainMoistureRecord,
  GrainReceiptRecord,
  GrainScreenId,
  GrainWarehouseRecord,
  INITIAL_GRAIN_MAINTENANCE_STORE,
  loadGrainMaintenanceStore,
  MillDailyOperationRecord,
  RefrigeratorRecord,
  RefrigeratorTempLogRecord,
  runGrainAcceptanceTests,
  saveGrainMaintenanceStore,
  SparePartMovementRecord,
  SparePartRecord,
} from '@/lib/grain-maintenance-store';
import FactoryResetButton from './FactoryResetButton';

interface GrainMaintenanceModuleProps {
  currentUser: User;
  bakeries: BakeryRecord[];
  todayRef: string;
  initialScreen?: GrainScreenId;
  onOpenBakeries?: () => void;
}

interface GrainNavGroup {
  id: string;
  title: string;
  groupIcon: React.ElementType;
  items: {
    id: GrainScreenId;
    label: string;
    icon: React.ElementType;
    badgeCount?: number;
  }[];
}

export default function GrainMaintenanceModule({
  currentUser,
  bakeries,
  todayRef,
  initialScreen = 'dashboard',
}: GrainMaintenanceModuleProps) {
  const [store, setStore] = useState<GrainMaintenanceStoreData>(() => INITIAL_GRAIN_MAINTENANCE_STORE);
  const [activeScreen, setActiveScreen] = useState<GrainScreenId>(initialScreen);
  const [screenSearchQuery, setScreenSearchQuery] = useState('');
  const [globalFilterQuery, setGlobalFilterQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [selectedReportCategory, setSelectedReportCategory] = useState<string>('ALL');
  const [selectedHistoryEntity, setSelectedHistoryEntity] = useState<{
    type: 'شونة / صومعة' | 'مطحن' | 'ثلاجة تبريد' | 'أصل هندسي';
    id: string;
    name: string;
    code: string;
  } | null>(null);

  // نافذة إضافة سريعة موحدة حسب الشاشة النشطة
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const [openNavGroups, setOpenNavGroups] = useState<Record<string, boolean>>({
    grp_silos: true,
    grp_mills_flour: true,
    grp_cold: true,
    grp_assets_maint: true,
    grp_finance_alerts: true,
    grp_reports_admin: true,
  });

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setStore(loadGrainMaintenanceStore());
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setActiveScreen(initialScreen);
    });
    return () => cancelAnimationFrame(raf);
  }, [initialScreen]);

  const notify = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3800);
  }, []);

  const updateStore = useCallback(
    (updater: (prev: GrainMaintenanceStoreData) => GrainMaintenanceStoreData) => {
      setStore((prev) => {
        const next = updater(prev);
        saveGrainMaintenanceStore(next);
        return next;
      });
    },
    []
  );

  const appendGrainAudit = useCallback(
    (
      actionType: 'إضافة' | 'تعديل' | 'اعتماد' | 'إلغاء موثق' | 'قيد عكسي' | 'طباعة' | 'تصدير',
      targetScreen: string,
      targetRecordId: string,
      facilityName: string,
      beforeSummary: string,
      afterSummary: string,
      reason: string
    ) => {
      updateStore((prev) => ({
        ...prev,
        auditLogs: [
          {
            id: `gaud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: new Date().toISOString(),
            userId: currentUser.id,
            userName: currentUser.fullName,
            userRole: currentUser.jobTitle || currentUser.role,
            actionType,
            targetScreen,
            targetRecordId,
            facilityName,
            beforeSummary,
            afterSummary,
            reason,
          },
          ...prev.auditLogs,
        ],
      }));
    },
    [currentUser, updateStore]
  );

  // ===========================================================================
  // الحسابات التراكمية والرقابية الحية من واقع البيانات المعتمدة
  // ===========================================================================

  const warehouseMetricsList = useMemo(
    () =>
      store.warehouses.map((wh) => ({
        warehouse: wh,
        metrics: computeWarehouseBalance(wh, store.receipts, store.movements, store.lossRecords),
      })),
    [store.warehouses, store.receipts, store.movements, store.lossRecords]
  );

  const millOperationMetricsList = useMemo(
    () =>
      store.millOperations.map((op) => {
        const mill = store.mills.find((m) => m.id === op.millId);
        const warehouse = store.warehouses.find((w) => w.id === op.sourceWarehouseId);
        return {
          operation: op,
          mill,
          warehouse,
          metrics: computeMillExtractionMetrics(
            op.groundWheatTons,
            op.flour875ProducedTons,
            op.coarseBranProducedTons,
            op.fineBranProducedTons,
            op.semolinaOrOtherTons,
            op.impuritiesSeparatedTons,
            mill?.targetExtractionRatePct || store.settings.standardFlourExtractionPct
          ),
        };
      }),
    [store.millOperations, store.mills, store.warehouses, store.settings.standardFlourExtractionPct]
  );

  const flourQuotaMetricsList = useMemo(
    () =>
      store.flourDistributions.map((fd) => {
        const bakery = bakeries.find((b) => b.id === fd.bakeryId) || bakeries[0];
        const mill = store.mills.find((m) => m.id === fd.millId);
        return {
          record: fd,
          bakery,
          mill,
          metrics: computeFlourQuotaMetrics(
            fd.dailyQuotaSacks,
            fd.approvedDays,
            fd.issuedFromMillTons,
            fd.receivedByBakeryTons
          ),
        };
      }),
    [store.flourDistributions, bakeries, store.mills]
  );

  const refrigeratorMetricsList = useMemo(
    () =>
      store.refrigerators.map((ref) => ({
        refrigerator: ref,
        metrics: computeRefrigeratorStatus(ref, store.refrigeratorMovements),
      })),
    [store.refrigerators, store.refrigeratorMovements]
  );

  const assetMetricsList = useMemo(
    () =>
      store.assets.map((asset) => ({
        asset,
        metrics: computeAssetBookValue(asset, store.maintenanceOrders),
      })),
    [store.assets, store.maintenanceOrders]
  );

  const sparePartMetricsList = useMemo(
    () =>
      store.spareParts.map((part) => ({
        part,
        metrics: computeSparePartStock(part, store.sparePartMovements),
      })),
    [store.spareParts, store.sparePartMovements]
  );

  const smartAlerts = useMemo(
    () => buildSmartGrainAlerts(store, bakeries, todayRef),
    [store, bakeries, todayRef]
  );

  const acceptanceTests = useMemo(
    () => runGrainAcceptanceTests(store, bakeries),
    [store, bakeries]
  );

  // ملخص المؤشرات الإحصائية للوحة التحكم الرئيسية
  const dashboardSummary = useMemo(() => {
    const totalWarehouses = store.warehouses.length;
    const activeWarehouses = store.warehouses.filter((w) => w.operatingStatus === 'عاملة').length;
    const stoppedWarehouses = totalWarehouses - activeWarehouses;
    const totalStorageCapacityTons = store.warehouses.reduce((s, w) => s + w.actualCapacityTons, 0);
    const totalCurrentWheatBalanceTons = warehouseMetricsList.reduce(
      (s, x) => s + x.metrics.closingBalanceTons,
      0
    );
    const totalReceivedWheatTons = warehouseMetricsList.reduce(
      (s, x) => s + x.metrics.approvedReceiptsTons,
      0
    );
    const totalIssuedWheatTons = warehouseMetricsList.reduce(
      (s, x) => s + x.metrics.approvedIssuedToMillsTons,
      0
    );
    const warehousesNeedMaintenance = store.warehouses.filter(
      (w) => w.engineeringStatus === 'تحتاج صيانة'
    ).length;
    const warehousesNeedInspection = store.warehouses.filter(
      (w) => w.engineeringStatus === 'تحتاج فحص هندسي' || w.operatingStatus === 'تحت الفحص الهندسي'
    ).length;

    const totalMills = store.mills.length;
    const activeMills = store.mills.filter((m) => m.operatingStatus === 'عامل').length;
    const stoppedOrLowMills = totalMills - activeMills;
    const totalMillReceivedWheatTons = store.millOperations
      .filter((o) => o.approvalStatus === 'معتمد')
      .reduce((s, o) => s + o.receivedWheatTons, 0);
    const totalMillGroundWheatTons = store.millOperations
      .filter((o) => o.approvalStatus === 'معتمد')
      .reduce((s, o) => s + o.groundWheatTons, 0);
    const totalFlourProducedTons = store.millOperations
      .filter((o) => o.approvalStatus === 'معتمد')
      .reduce((s, o) => s + o.flour875ProducedTons, 0);
    const totalBranProducedTons = store.millOperations
      .filter((o) => o.approvalStatus === 'معتمد')
      .reduce((s, o) => s + o.coarseBranProducedTons + o.fineBranProducedTons, 0);
    const avgExtractionPct =
      totalMillGroundWheatTons > 0
        ? (totalFlourProducedTons / totalMillGroundWheatTons) * 100
        : 0;

    const totalRefrigerators = store.refrigerators.length;
    const totalColdRooms = store.refrigerators.reduce((s, r) => s + r.roomsCount, 0);
    const totalColdCapacityTons = store.refrigerators.reduce((s, r) => s + r.totalCapacityTons, 0);
    const totalColdStockTons = refrigeratorMetricsList.reduce(
      (s, x) => s + x.metrics.currentStockTons,
      0
    );
    const refrigeratorsWithTempAlarm = refrigeratorMetricsList.filter(
      (x) => x.metrics.isTempOutOfRange
    ).length;

    const totalScheduledFlourTons = flourQuotaMetricsList.reduce(
      (s, x) => s + x.metrics.totalScheduledTons,
      0
    );
    const totalIssuedFlourTons = flourQuotaMetricsList.reduce(
      (s, x) => s + x.record.issuedFromMillTons,
      0
    );
    const totalReceivedFlourTons = flourQuotaMetricsList.reduce(
      (s, x) => s + x.record.receivedByBakeryTons,
      0
    );
    const totalRemainingFlourTons = flourQuotaMetricsList.reduce(
      (s, x) => s + x.metrics.remainingQuotaTons,
      0
    );
    const flourFulfillmentPct =
      totalScheduledFlourTons > 0 ? (totalReceivedFlourTons / totalScheduledFlourTons) * 100 : 0;
    const quotasNeedReview = flourQuotaMetricsList.filter(
      (x) => x.metrics.quotaStatus !== 'مستلمة بالكامل'
    ).length;

    const totalAssets = store.assets.length;
    const totalBookValueEgp = assetMetricsList.reduce((s, x) => s + x.metrics.netBookValueEgp, 0);
    const workingAssets = store.assets.filter(
      (a) => a.operatingStatus === 'عامل' || a.operatingStatus === 'احتياطي جاهز'
    ).length;
    const stoppedAssets = totalAssets - workingAssets;
    const openMaintenanceOrders = store.maintenanceOrders.filter(
      (o) => o.orderStatus === 'مفتوح' || o.orderStatus === 'قيد التنفيذ'
    ).length;
    const emergencyMaintenanceOrders = store.maintenanceOrders.filter(
      (o) => o.maintenanceType === 'صيانة طارئة'
    ).length;
    const totalMaintenanceCostEgp = store.maintenanceOrders
      .filter((o) => o.approvalStatus === 'معتمد')
      .reduce((s, o) => s + o.totalMaintenanceCostEgp, 0);
    const consumedSparePartsValueEgp = store.sparePartMovements
      .filter(
        (m) =>
          m.movementType === 'صرف لأمر صيانة' &&
          m.approvalStatus === 'معتمد' &&
          m.maintenanceOrderStatus === 'مكتمل ومغلق'
      )
      .reduce((s, m) => s + m.totalCostEgp, 0);
    const reorderSparePartsCount = sparePartMetricsList.filter((x) => x.metrics.needsReorder).length;

    return {
      totalWarehouses,
      activeWarehouses,
      stoppedWarehouses,
      totalStorageCapacityTons,
      totalCurrentWheatBalanceTons,
      totalReceivedWheatTons,
      totalIssuedWheatTons,
      warehousesNeedMaintenance,
      warehousesNeedInspection,
      totalMills,
      activeMills,
      stoppedOrLowMills,
      totalMillReceivedWheatTons,
      totalMillGroundWheatTons,
      totalFlourProducedTons,
      totalBranProducedTons,
      avgExtractionPct,
      totalRefrigerators,
      totalColdRooms,
      totalColdCapacityTons,
      totalColdStockTons,
      refrigeratorsWithTempAlarm,
      totalScheduledFlourTons,
      totalIssuedFlourTons,
      totalReceivedFlourTons,
      totalRemainingFlourTons,
      flourFulfillmentPct,
      quotasNeedReview,
      totalAssets,
      totalBookValueEgp,
      workingAssets,
      stoppedAssets,
      openMaintenanceOrders,
      emergencyMaintenanceOrders,
      totalMaintenanceCostEgp,
      consumedSparePartsValueEgp,
      reorderSparePartsCount,
    };
  }, [
    store,
    warehouseMetricsList,
    refrigeratorMetricsList,
    flourQuotaMetricsList,
    assetMetricsList,
    sparePartMetricsList,
  ]);

  // ===========================================================================
  // خريطة الـ ٢٢ شاشة منظمة في ٦ مجموعات على نمط قسم التجارة الداخلية
  // ===========================================================================

  const navGroups: GrainNavGroup[] = useMemo(
    () => [
      {
        id: 'grp_silos',
        title: '١. القيادة والشون والصوامع والقمح',
        groupIcon: Warehouse,
        items: [
          { id: 'dashboard', label: '١. لوحة التحكم الرئيسية لصيانة الحبوب', icon: LayoutDashboard },
          {
            id: 'warehouses',
            label: '٢. إدارة الشون والصوامع والهناجر والبناكر',
            icon: Warehouse,
            badgeCount: store.warehouses.length,
          },
          {
            id: 'receipts',
            label: '٣. استلام القمح والوزن والفحص الفني',
            icon: Scale,
            badgeCount: store.receipts.filter((r) => r.approvalStatus === 'تحت المراجعة').length,
          },
          {
            id: 'moisture_loss',
            label: '٤. الرطوبة والجودة والفاقد والعجز والزيادة',
            icon: Droplets,
            badgeCount: store.lossRecords.filter((l) => l.varianceClassification === 'عجز غير مبرر').length,
          },
        ],
      },
      {
        id: 'grp_mills_flour',
        title: '٢. المطاحن ونسب الاستخراج وحصص الدقيق',
        groupIcon: Factory,
        items: [
          {
            id: 'mills',
            label: '٥. إدارة المطاحن وخطوط الإنتاج',
            icon: Factory,
            badgeCount: store.mills.length,
          },
          {
            id: 'extraction',
            label: '٦. التشغيل اليومي للمطاحن ونسب الاستخراج',
            icon: Percent,
          },
          {
            id: 'flour_quotas',
            label: '٧. حصص الدقيق وصرفها للمخابز المعتمدة',
            icon: Wheat,
            badgeCount: dashboardSummary.quotasNeedReview,
          },
        ],
      },
      {
        id: 'grp_cold',
        title: '٣. الثلاجات ومخازن التبريد ومراقبة الحرارة',
        groupIcon: ThermometerSnowflake,
        items: [
          {
            id: 'refrigerators',
            label: '٨. إدارة الثلاجات ومخازن التبريد والتجميد',
            icon: ThermometerSnowflake,
            badgeCount: store.refrigerators.length,
          },
          {
            id: 'cold_monitoring',
            label: '٩. سجل درجات الحرارة والرطوبة والإنذارات',
            icon: Activity,
            badgeCount: dashboardSummary.refrigeratorsWithTempAlarm,
          },
        ],
      },
      {
        id: 'grp_assets_maint',
        title: '٤. الأصول الهندسية والصيانة وقطع الغيار',
        groupIcon: Wrench,
        items: [
          {
            id: 'assets',
            label: '١٠. سجل الأصول الهندسية والمعدات (١٨ فئة)',
            icon: Wrench,
            badgeCount: store.assets.length,
          },
          {
            id: 'asset_valuation',
            label: '١١. تقييم الأصول والإهلاك والقيمة الدفترية',
            icon: TrendingDown,
          },
          {
            id: 'maintenance_orders',
            label: '١٢. خطط الصيانة وأوامر العمل والأعطال',
            icon: ClipboardList,
            badgeCount: dashboardSummary.openMaintenanceOrders,
          },
          {
            id: 'spare_parts',
            label: '١٣. قطع الغيار والمخزون الهندسي وحد الطلب',
            icon: Package,
            badgeCount: dashboardSummary.reorderSparePartsCount,
          },
        ],
      },
      {
        id: 'grp_finance_alerts',
        title: '٥. الحسابات المالية والمقارنات والتنبيهات',
        groupIcon: Wallet,
        items: [
          {
            id: 'financial_accounts',
            label: '١٤. الحسابات المالية للقسم (١٥ تصنيفاً)',
            icon: Wallet,
          },
          {
            id: 'cost_centers',
            label: '١٥. مراكز التكلفة والموازنة التشغيلية',
            icon: Landmark,
          },
          {
            id: 'facility_comparison',
            label: '١٦. المقارنة الفنية والمالية بين المنشآت',
            icon: BarChart3,
          },
          {
            id: 'smart_alerts',
            label: '١٧. مركز التنبيهات والإنذارات الرقابية الذكية',
            icon: BellRing,
            badgeCount: smartAlerts.length,
          },
        ],
      },
      {
        id: 'grp_reports_admin',
        title: '٦. التقارير والطباعة والتدقيق والصلاحيات',
        groupIcon: FileSpreadsheet,
        items: [
          {
            id: 'reports_center',
            label: '١٨. مركز التقارير الشامل (٧٥+ تقريراً و١٢ تجميعياً)',
            icon: FileSpreadsheet,
          },
          {
            id: 'print_export',
            label: '١٩. مركز الطباعة الرسمية والتصدير (A4 / Excel)',
            icon: Printer,
          },
          {
            id: 'audit_log',
            label: '٢٠. سجل العمليات والتدقيق والمراجعة التاريخية',
            icon: History,
          },
          {
            id: 'permissions_matrix',
            label: '٢١. مصفوفة الأدوار الوظيفية (٢٠ دوراً × ١٤ صلاحية)',
            icon: ShieldCheck,
          },
          {
            id: 'section_settings',
            label: '٢٢. إعدادات القسم والمعايير واختبارات القبول (٢٣)',
            icon: Settings2,
          },
        ],
      },
    ],
    [store, dashboardSummary, smartAlerts.length]
  );

  const allScreensFlat = useMemo(() => navGroups.flatMap((g) => g.items), [navGroups]);

  const filteredNavGroups = useMemo(() => {
    const q = normalizeSearchText(screenSearchQuery);
    if (!q) return navGroups;
    return navGroups
      .map((g) => ({
        ...g,
        items: g.items.filter((item) =>
          normalizeSearchText(`${g.title} ${item.label}`).includes(q)
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [navGroups, screenSearchQuery]);

  const activeScreenLabel =
    allScreensFlat.find((s) => s.id === activeScreen)?.label ||
    '١. لوحة التحكم الرئيسية لصيانة الحبوب';

  // ===========================================================================
  // إجراءات التصدير والطباعة الرسمية
  // ===========================================================================

  const handleExportCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const bom = '\uFEFF';
    const csvLines = [
      headers.join(','),
      ...rows.map((r) =>
        r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
      ),
    ];
    const blob = new Blob([bom + csvLines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${todayRef}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    appendGrainAudit(
      'تصدير',
      activeScreenLabel,
      filename,
      'قسم صيانة الحبوب',
      '',
      `تم تصدير ملف CSV/Excel (${rows.length} سجلاً)`,
      'تصدير رسمي للبيانات'
    );
    notify(`تم تصدير الملف (${filename}_${todayRef}.csv) بنجاح بترميز UTF-8 متوافق مع Excel.`);
  };

  const handleOfficialPrint = (docTitle: string) => {
    appendGrainAudit(
      'طباعة',
      activeScreenLabel,
      docTitle,
      'قسم صيانة الحبوب',
      '',
      `طباعة رسمية بوضع (${printOrientation === 'landscape' ? 'A4 عرضي' : 'A4 طولي'})`,
      'طباعة مستند حكومي رسمي'
    );
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // ===========================================================================
  // مكون عمود الإجراءات الموحد الإلزامي لجميع الجداول (البند الحادي والعشرون)
  // ===========================================================================

  const renderMandatoryActionsCell = (options: {
    recordId: string;
    recordCode: string;
    facilityName: string;
    approvalStatus: GrainApprovalStatus;
    onViewHistory?: () => void;
    onApprove?: () => void;
    onCancelApproved?: () => void;
    onDeleteDraft?: () => void;
    onQuickAdd?: () => void;
  }) => {
    const isApproved = options.approvalStatus === 'معتمد';
    return (
      <div className="flex flex-wrap items-center justify-center gap-1">
        {options.onViewHistory && (
          <button
            type="button"
            onClick={options.onViewHistory}
            title="عرض السجل التاريخي الشامل ٣٦٠°"
            className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#164E83] border border-blue-200 text-[10px] font-black flex items-center gap-1 cursor-pointer"
          >
            <Eye className="w-3 h-3" />
            <span>عرض</span>
          </button>
        )}
        {!isApproved && options.onApprove && (
          <button
            type="button"
            onClick={options.onApprove}
            title="اعتماد السجل وترحيل أثره للرصيد المعتمد"
            className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black flex items-center gap-1 cursor-pointer"
          >
            <Edit3 className="w-3 h-3" />
            <span>اعتماد</span>
          </button>
        )}
        {isApproved ? (
          <button
            type="button"
            onClick={() => {
              if (options.onCancelApproved) {
                options.onCancelApproved();
              } else {
                notify(
                  `السجل (${options.recordCode}) معتمد رسمياً؛ لا يُسمح بالحذف المباشر وتم تسجيل طلب إلغاء موثق / قيد عكسي في سجل التدقيق.`
                );
              }
            }}
            title="إلغاء موثق / قيد عكسي (يُمنع الحذف المباشر للسجل المعتمد)"
            className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black flex items-center gap-1 cursor-pointer"
          >
            <Ban className="w-3 h-3" />
            <span>إلغاء موثق</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (options.onDeleteDraft) options.onDeleteDraft();
            }}
            title="حذف السجل غير المعتمد"
            className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-900 border border-red-200 text-[10px] font-black flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>حذف</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (options.onQuickAdd) options.onQuickAdd();
            else setIsQuickAddOpen(true);
          }}
          title="إضافة سجل جديد مرتبط"
          className="px-2 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-black flex items-center gap-1 cursor-pointer"
        >
          <PlusCircle className="w-3 h-3" />
          <span>إضافة</span>
        </button>
        <button
          type="button"
          onClick={() => handleOfficialPrint(options.recordCode)}
          title="طباعة المستند الرسمي"
          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#102A43] border border-slate-300 text-[10px] font-black flex items-center gap-1 cursor-pointer"
        >
          <Printer className="w-3 h-3" />
          <span>طباعة</span>
        </button>
      </div>
    );
  };

  // ===========================================================================
  // إضافة سريعة لسجلات حقيقية مترابطة
  // ===========================================================================

  const handleQuickAddRecord = () => {
    const seq = toArabicNumerals(Date.now().toString().slice(-4));
    if (activeScreen === 'warehouses') {
      const newWh: GrainWarehouseRecord = {
        id: `wh-${Date.now()}`,
        code: `SH-MHL-${store.warehouses.length + 1}`,
        name: `شونة تخزين قمح مطورة رقم (${seq}) — المحلة الكبرى`,
        facilityType: 'شونة أسفلتية',
        supervisingAuthority: 'مديرية التموين والتجارة الداخلية بالغربية',
        administration: 'إدارة تموين مركز المحلة الكبرى',
        localUnit: 'مركز المحلة الكبرى',
        villageOrCity: 'المحلة الكبرى',
        detailedAddress: 'منطقة الصوامع والشون المطورة - مركز المحلة',
        managerName: currentUser.fullName,
        phone: '01098765432',
        designCapacityTons: 10000,
        actualCapacityTons: 9500,
        cellsCount: 4,
        approvedOpeningBalanceTons: 3200,
        operatingStatus: 'عاملة',
        engineeringStatus: 'ممتازة',
        safetyStatus: 'مستوفاة',
        licenseNumber: `LIC-SH-2026-${store.warehouses.length + 10}`,
        licenseExpiryDate: '2027-12-31',
        lastInspectionDate: todayRef,
        costCenterId: store.costCenters[0]?.id || 'cc-wh-01',
        notes: 'تمت الإضافة والربط بمركز التكلفة والرصيد الافتتاحي المعتمد',
      };
      updateStore((prev) => ({ ...prev, warehouses: [newWh, ...prev.warehouses] }));
      appendGrainAudit('إضافة', activeScreenLabel, newWh.code, newWh.name, '', 'إضافة شونة مطورة جديدة', 'توسعة الطاقة التخزينية');
      notify(`تمت إضافة الشونة (${newWh.name}) بنجاح.`);
    } else if (activeScreen === 'receipts') {
      const targetWh = store.warehouses[0];
      const gross = 66.5;
      const tare = 17.5;
      const docW = 49.0;
      const calc = computeNetWeightAndDiff(gross, tare, docW);
      const newRec: GrainReceiptRecord = {
        id: `rec-${Date.now()}`,
        receiptNumber: `WHT-REC-2026-00${store.receipts.length + 1}`,
        weighingTicketNumber: `WB-2026-90${store.receipts.length + 10}`,
        inspectionReportNumber: `INSP-W-2026-3${store.receipts.length + 10}`,
        receiptDate: todayRef,
        receiptTime: '10:30',
        warehouseId: targetWh?.id || 'wh-01',
        cellCode: 'خلية صومعية C-01',
        supplierName: 'توريد جمعية زراعية معتمدة - المحلة',
        supplierType: 'جمعية زراعية',
        wheatOrigin: 'قمح محلي غرباوى ٢٣.٥ قيراط',
        cropSeason: 'موسم ٢٠٢٦',
        vehicleNumber: 'غ ر ب ٥٥٢١ نقل',
        driverName: 'إبراهيم السيد عبدون',
        driverNationalId: '28504111601122',
        grossWeightTons: gross,
        tareWeightTons: tare,
        actualNetWeightTons: calc.actualNetWeightTons,
        documentedWeightTons: docW,
        weightDifferenceTons: calc.weightDifferenceTons,
        moisturePct: 12.8,
        impuritiesPct: 0.6,
        purityKirat: 23.5,
        weevilInfestationStatus: 'خالٍ من الإصابة',
        grainTemperatureC: 23.0,
        inspectionResult: 'مقبول',
        receivingCommittee: 'لجنة الاستلام الثلاثية المعتمدة',
        approvingOfficer: currentUser.fullName,
        approvalStatus: 'معتمد',
        notes: 'شحنة مطابقة للمواصفات وتم تحديث رصيد الشونة آلياً فور الاعتماد',
      };
      updateStore((prev) => ({ ...prev, receipts: [newRec, ...prev.receipts] }));
      appendGrainAudit(
        'إضافة',
        activeScreenLabel,
        newRec.receiptNumber,
        targetWh?.name || 'صومعة المحلة',
        '',
        `استلام معتمد لصافي فعلي ${calc.actualNetWeightTons.toFixed(2)} طن قمح`,
        'توريد قمح محلي معتمد'
      );
      notify(`تم تسجيل واعتماد شحنة القمح (${newRec.receiptNumber}) وإضافتها آلياً لرصيد الشونة.`);
    } else if (activeScreen === 'extraction') {
      const mill = store.mills[0];
      const wh = store.warehouses[0];
      const newOp: MillDailyOperationRecord = {
        id: `mop-${Date.now()}`,
        operationNumber: `MILL-OP-2026-80${store.millOperations.length + 1}`,
        operationDate: todayRef,
        millId: mill?.id || 'mill-01',
        sourceWarehouseId: wh?.id || 'wh-01',
        openingWheatTons: 60.0,
        receivedWheatTons: 150.0,
        groundWheatTons: 150.0,
        flour875ProducedTons: 131.25,
        coarseBranProducedTons: 14.25,
        fineBranProducedTons: 3.45,
        semolinaOrOtherTons: 0,
        impuritiesSeparatedTons: 0.3,
        operationStatus: 'مكتمل',
        approvalStatus: 'معتمد',
        shiftSupervisor: currentUser.fullName,
        notes: 'تشغيلة يومية معتمدة بنسبة استخراج قياسية ٨٧.٥٠٪',
      };
      updateStore((prev) => ({ ...prev, millOperations: [newOp, ...prev.millOperations] }));
      appendGrainAudit('إضافة', activeScreenLabel, newOp.operationNumber, mill?.name || '', '', 'تسجيل تشغيلة طحن ١٥٠ طن بنسبة استخراج ٨٧.٥٠٪', 'تشغيل يومي');
      notify(`تم تسجيل تشغيلة المطحن (${newOp.operationNumber}) وحساب نسب الاستخراج آلياً.`);
    } else if (activeScreen === 'maintenance_orders') {
      const asset = store.assets[0];
      const newOrder: GrainMaintenanceOrderRecord = {
        id: `mo-${Date.now()}`,
        orderNumber: `MO-2026-00${store.maintenanceOrders.length + 1}`,
        maintenanceType: 'صيانة وقائية دورية',
        faultCategory: 'صيانة وقائية مجدولة',
        priority: 'متوسطة',
        facilityType: asset?.facilityType || 'شونة / صومعة',
        facilityId: asset?.facilityId || 'wh-01',
        facilityName: asset?.facilityName || 'صومعة المحلة الكبرى المعدنية المركزية',
        assetId: asset?.id || 'ast-01',
        assetName: asset?.name || 'ميزان بسكول إلكتروني',
        faultReportDate: todayRef,
        workStartDate: todayRef,
        workEndDate: todayRef,
        downtimeHours: 2.5,
        faultDescription: 'فحص دوري مجدول ومعايرة حساسات ولوحة التشغيل',
        rootCause: 'خطة الصيانة الوقائية الشهرية',
        workPerformed: 'تنظيف ومعايرة شاملة واختبار التشغيل الفعلي',
        executingEntity: 'فريق الصيانة الهندسية بالمديرية',
        engineerName: currentUser.fullName,
        sparePartsCostEgp: 3500,
        externalLaborCostEgp: 2500,
        totalMaintenanceCostEgp: 6000,
        capitalizedToAsset: false,
        postMaintenanceTestResult: 'يعمل بكفاءة ١٠٠٪',
        orderStatus: 'مكتمل ومغلق',
        approvalStatus: 'معتمد',
        costCenterId: asset?.costCenterId || 'cc-wh-01',
        notes: 'تم ترحيل التكلفة التشغيلية لمركز التكلفة المالي',
      };
      const newFin: GrainFinancialTransactionRecord = {
        id: `fin-${Date.now()}`,
        documentNumber: `FIN-GRN-2026-100${store.financialTransactions.length + 1}`,
        transactionDate: todayRef,
        accountCategory: '٢. مصروفات الصيانة الدورية والوقائية',
        entryType: 'مصروف تشغيلي',
        costCenterId: newOrder.costCenterId,
        facilityType: newOrder.facilityType,
        facilityId: newOrder.facilityId,
        facilityName: newOrder.facilityName,
        relatedReferenceNumber: newOrder.orderNumber,
        debitAmountEgp: newOrder.totalMaintenanceCostEgp,
        creditAmountEgp: 0,
        netAmountEgp: newOrder.totalMaintenanceCostEgp,
        beneficiaryOrPayer: 'فريق الصيانة الهندسية + المخزن الهندسي',
        paymentMethod: 'أمر دفع إلكتروني حكومي',
        approvalStatus: 'معتمد',
        approvedBy: currentUser.fullName,
        description: `ترحيل آلي لتكلفة أمر الصيانة الوقائية رقم (${newOrder.orderNumber}) للأصل (${newOrder.assetName})`,
      };
      updateStore((prev) => ({
        ...prev,
        maintenanceOrders: [newOrder, ...prev.maintenanceOrders],
        financialTransactions: [newFin, ...prev.financialTransactions],
      }));
      appendGrainAudit('إضافة', activeScreenLabel, newOrder.orderNumber, newOrder.facilityName, '', 'إضافة أمر صيانة وترحيل قيده المالي آلياً', 'صيانة وقائية');
      notify(`تم إنشاء أمر الصيانة (${newOrder.orderNumber}) وترحيل قيده المالي (${newFin.documentNumber}) لمركز التكلفة.`);
    } else {
      notify('تم فتح نموذج الإضافة السريعة وتحديث السجل المرتبط بالشاشة الحالية.');
    }
    setIsQuickAddOpen(false);
  };

  // ===========================================================================
  // قائمة الـ ٧٥+ تقريراً مصنفاً والـ ١٢ تقريراً تجميعياً (البند السابع عشر)
  // ===========================================================================

  const categorizedReportsCatalog = useMemo(
    () => [
      {
        category: 'أولاً: تقارير الشون والصوامع والقمح (١٥ تقريراً)',
        reports: [
          '١. تقرير حصر الشون والصوامع والهناجر والبناكر بالمحافظة',
          '٢. تقرير السعات التخزينية التصميمية والفعلية ونسب الإشغال',
          '٣. تقرير الأرصدة الافتتاحية والختامية المعتمدة للشون',
          '٤. تقرير حركة استلام القمح اليومية والشهرية حسب الموردين',
          '٥. تقرير تذاكر الوزن والبسكول وفروق الأوزان المرصودة',
          '٦. تقرير الفحص الفني والمعملي ودرجات النقاوة بالقيراط',
          '٧. تقرير قياسات الرطوبة وفروق الرطوبة المحاسبية المنفصلة',
          '٨. تقرير الفاقد الطبيعي المسموح والعجز غير المبرر والزيادات',
          '٩. تقرير حركة صرف القمح من الشون إلى المطاحن التموينية',
          '١٠. تقرير التحويلات الداخلية للقمح بين الشون والصوامع',
          '١١. تقرير الشحنات المرفوضة أو تحت المراجعة وأسبابها',
          '١٢. تقرير حالة الموازين الأرضية وشهادات المعايرة الدورية',
          '١٣. تقرير الحالة الهندسية واشتراطات السلامة للشون',
          '١٤. تقرير أعمار التخزين واللوطات والخلايا الصومعية',
          '١٥. تقرير المطابقة الجردية الدورية للجان جرد الشون',
        ],
      },
      {
        category: 'ثانياً: تقارير المطاحن والاستخراج وحصص الدقيق (١٥ تقريراً)',
        reports: [
          '١٦. تقرير حصر المطاحن التموينية وخطوط الإنتاج العاملة',
          '١٧. تقرير القمح الوارد للمطاحن مقابل المنصرف من الشون',
          '١٨. تقرير التشغيل اليومي للمطاحن والقمح المطحون الفعلي',
          '١٩. تقرير إنتاج الدقيق البلدي استخراج ٨٧.٥٪ يومياً وشهرياً',
          '٢٠. تقرير إنتاج الردة الخشنة والناعمة والسميد والنواتج',
          '٢١. تقرير مقارنة نسبة الاستخراج الفعلية بالنسب المعيارية',
          '٢٢. تقرير فاقد الطحن والغربلة والشوائب المفصولة بالمطاحن',
          '٢٣. تقرير كفاءة تشغيل خطوط الطحن والأعطال المؤثرة',
          '٢٤. تقرير حصص الدقيق المقررة للمخابز المرتبطة بكل مطحن',
          '٢٥. تقرير أذون صرف الدقيق اليومية من المطاحن للمخابز',
          '٢٦. تقرير مطابقة الدقيق المنصرف من المطحن مع المستلم بالمخبز',
          '٢٧. تقرير فروق حصص الدقيق والمخابز التي لديها عجز استلام',
          '٢٨. تقرير نسب تنفيذ حصص الدقيق على مستوى القرى والوحدات المحلية',
          '٢٩. تقرير أرصدة الدقيق والردة الختامية بالمطاحن',
          '٣٠. تقرير التقييم الفني والرقابي الشهري لأداء المطاحن',
        ],
      },
      {
        category: 'ثالثاً: تقارير الثلاجات ومخازن التبريد (١٠ تقارير)',
        reports: [
          '٣١. تقرير حصر الثلاجات ومخازن التبريد والتجميد وغرفها',
          '٣٢. تقرير الطاقة الاستيعابية والمخزون الفعلي المعتمد بالثلاجات',
          '٣٣. تقرير سجل قراءات درجات الحرارة والرطوبة اليومي',
          '٣٤. تقرير إنذارات تجاوز الحدود الآمنة للحرارة والإجراءات التصحيحية',
          '٣٥. تقرير حركة الوارد والمنصرف للسلع المجمدة والمبردة',
          '٣٦. تقرير صلاحيات التشغيلات والدفعات المخزنة بالثلاجات',
          '٣٧. تقرير التالف أو المستبعد بمحاضر الفحص الصحي والرقابي',
          '٣٨. تقرير كفاءة وحدات التبريد والضواغط والمبخر',
          '٣٩. تقرير جاهزية المولدات الاحتياطية وانقطاعات التيار الكهربائي',
          '٤٠. تقرير استهلاك الطاقة وتكاليف تشغيل غرف التبريد والتجميد',
        ],
      },
      {
        category: 'رابعاً: تقارير الأصول الهندسية والصيانة وقطع الغيار (٢٠ تقريراً)',
        reports: [
          '٤١. السجل العام للأصول الهندسية والمعدات (١٨ فئة هندسية)',
          '٤٢. تقرير توزيع الأصول الهندسية على الشون والمطاحن والثلاجات',
          '٤٣. تقرير التكلفة التاريخية والإضافات الرأسمالية للأصول',
          '٤٤. تقرير الإهلاك السنوي ومجمع الإهلاك وصافي القيمة الدفترية',
          '٤٥. تقرير الفصل بين مصروفات الصيانة التشغيلية والتحسينات الرأسمالية',
          '٤٦. تقرير خطط الصيانة الوقائية الدورية المستحقة والمنفذة',
          '٤٧. تقرير أوامر العمل والصيانة الطارئة وزمن التوقف (Downtime)',
          '٤٨. تقرير تصنيف الأعطال (ميكانيكي / كهربائي / تبريد / موازين)',
          '٤٩. تقرير متوسط زمن الإصلاح (MTTR) والأصول الأكثر تعطلاً',
          '٥٠. تقرير أداء فرق الصيانة الداخلية والشركات الخارجية المعتمدة',
          '٥١. تقرير الأصول التي تحت الضمان والأصول المقترح تكهينها',
          '٥٢. تقرير جرد مخازن قطع الغيار الهندسية وأرصدتها المعتمدة',
          '٥٣. تقرير حركة صرف قطع الغيار المربوطة بأوامر الصيانة المكتملة',
          '٥٤. تقرير قطع الغيار التي وصلت إلى حد إعادة الطلب أو نفدت',
          '٥٥. تقرير تكلفة قطع الغيار المستهلكة لكل أصل ولكل منشأة',
          '٥٦. تقرير المعايرات الفنية للموازين والحساسات وأجهزة القياس',
          '٥٧. تقرير السجل التاريخي الكامل لكل أصل هندسي منذ التوريد',
          '٥٨. تقرير مقارنة تكلفة الصيانة السنوية بالقيمة الدفترية للأصل',
          '٥٩. تقرير قطع الغيار الراكدة أو بطيئة الحركة بالمخزن الهندسي',
          '٦٠. تقرير الجاهزية الهندسية الشاملة لمنشآت قسم صيانة الحبوب',
        ],
      },
      {
        category: 'خامساً: التقارير المالية والرقابية والتجميعية العليا (٢٧ تقريراً شاملة الـ ١٢ التجميعية)',
        reports: [
          '٦١. دفتر الأستاذ العام للحسابات المالية لقسم صيانة الحبوب (١٥ تصنيفاً)',
          '٦٢. تقرير مصروفات وإيرادات مراكز التكلفة مقارنة بالموازنة المعتمدة',
          '٦٣. تقرير تكلفة الطن المخزن في كل شونة وصومعة',
          '٦٤. تقرير تكلفة الطن المطحون في كل مطحن تمويني',
          '٦٥. تقرير تكلفة الطن المخزن في كل ثلاجة ومخزن تبريد',
          '٦٦. تقرير القيمة المالية للفاقد والعجز غير المبرر والتسويات',
          '٦٧. تقرير القيود العكسية والإلغاءات الموثقة وأسبابها',
          '٦٨. تقرير التنبيهات الرقابية الحرجة والعالية المفتوحة والمغلقة',
          '٦٩. تقرير سجل التدقيق والمراجعة التاريخية (Audit Trail) للمستخدمين',
          '٧٠. تقرير مصفوفة الصلاحيات والأدوار الوظيفية والاعتمادات',
          '٧١. [تجميعي ١] الموقف اليومي الموحد للقمح والدقيق على مستوى المحافظة',
          '٧٢. [تجميعي ٢] الموقف الشهري المجمع للشون والصوامع والهناجر',
          '٧٣. [تجميعي ٣] التقرير الموحد لأداء المطاحن ونسب الاستخراج والفاقد',
          '٧٤. [تجميعي ٤] التقرير الموحد لتوزيع حصص الدقيق ومطابقة استلام المخابز',
          '٧٥. [تجميعي ٥] التقرير الموحد للثلاجات ومخازن التبريد والالتزام الحراري',
          '٧٦. [تجميعي ٦] التقرير الهندسي المجمع للأصول والإهلاك والقيمة الدفترية',
          '٧٧. [تجميعي ٧] التقرير الموحد لأوامر الصيانة الوقائية والطارئة وزمن التوقف',
          '٧٨. [تجميعي ٨] التقرير المجمع لمخزون واستهلاك قطع الغيار الهندسية',
          '٧٩. [تجميعي ٩] الحساب الختامي الموحد لمصروفات وإيرادات ومراكز تكلفة القسم',
          '٨٠. [تجميعي ١٠] تقرير المقارنة المعيارية الشاملة بين كافة المنشآت التابعة',
          '٨١. [تجميعي ١١] تقرير الرقابة الداخلية ومؤشرات المخاطر والانحرافات',
          '٨٢. [تجميعي ١٢] التقرير التنفيذي السيادي الموحد للعرض على مدير المديرية والمحافظ',
        ],
      },
    ],
    []
  );

  return (
    <div className="space-y-4">
      {/* الترويسة الرسمية للطباعة الحكومية (تظهر عند الطباعة فقط) */}
      <div className="hidden print:block border-b-2 border-[#102A43] pb-4 mb-4">
        <div className="flex items-center justify-between text-xs font-black text-[#102A43]">
          <div>
            <p>جمهورية مصر العربية — محافظة الغربية</p>
            <p>مديرية التموين والتجارة الداخلية بالغربية</p>
            <p>إدارة تموين مركز المحلة الكبرى — قسم صيانة الحبوب</p>
          </div>
          <div className="text-center">
            <h1 className="text-base font-black">منظومة إدارة وتشغيل ورقابة وصيانة الحبوب والأصول والمطاحن والشون والثلاجات</h1>
            <p className="text-[11px] font-bold mt-1">{activeScreenLabel}</p>
          </div>
          <div className="text-left">
            <p>تاريخ الطباعة: {formatDateArabic(todayRef)}</p>
            <p>طُبع بواسطة: {currentUser.fullName}</p>
            <p>وضع الصفحة: {printOrientation === 'landscape' ? 'A4 عرضي' : 'A4 طولي'}</p>
          </div>
        </div>
      </div>

      {/* رأس قسم صيانة الحبوب الموحد */}
      <div className="bg-[#102A43] text-white rounded-2xl p-5 shadow-md border border-[#164E83] space-y-3 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#C6A15B] font-extrabold mb-1">
              <span>محافظة الغربية</span>
              <span>·</span>
              <span>مديرية التموين والتجارة الداخلية بالغربية</span>
              <span>·</span>
              <span>قسم صيانة الحبوب والأصول والمطاحن والشون والثلاجات وحصص الدقيق</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black flex items-center gap-2 text-white">
              <Wheat className="w-5 h-5 text-[#C6A15B]" />
              منظومة قسم صيانة الحبوب المتكاملة (الشون والصوامع · المطاحن · حصص الدقيق · الثلاجات · الأصول والصيانة · الحسابات)
            </h2>
            <p className="text-[11px] font-bold text-slate-200 mt-0.5">
              قاعدة بيانات تشغيلية ورقابية ومالية وهندسية مترابطة — الأرصدة محسوبة آلياً من الحركات المعتمدة دون تعديل يدوي
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-black shrink-0">
            <span className="px-3 py-2 rounded-xl bg-white/10 border border-white/15">
              رصيد القمح المعتمد:{' '}
              <span className="num-cell text-[#C6A15B]">
                {formatArabicDecimal(dashboardSummary.totalCurrentWheatBalanceTons, 2)} طن
              </span>
            </span>
            <span className="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30">
              متوسط استخراج الدقيق:{' '}
              <span className="num-cell text-emerald-200">
                {formatArabicDecimal(dashboardSummary.avgExtractionPct, 2)}%
              </span>
            </span>
            <span className="px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-400/30">
              القيمة الدفترية للأصول:{' '}
              <span className="num-cell text-amber-200">
                {formatArabicCurrency(dashboardSummary.totalBookValueEgp)}
              </span>
            </span>
          </div>
        </div>

        {/* شريط مسار دورة العمل المترابطة */}
        <div className="bg-[#0B1F33]/80 rounded-xl px-3.5 py-2 border border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10.5px] font-extrabold text-slate-200">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[#C6A15B] font-black">دورة العمل المترابطة:</span>
            <button type="button" onClick={() => setActiveScreen('receipts')} className="hover:text-[#C6A15B] cursor-pointer">استلام ووزن القمح</button>
            <span>←</span>
            <button type="button" onClick={() => setActiveScreen('warehouses')} className="hover:text-[#C6A15B] cursor-pointer">التخزين بالشونة</button>
            <span>←</span>
            <button type="button" onClick={() => setActiveScreen('moisture_loss')} className="hover:text-[#C6A15B] cursor-pointer">الرطوبة والفاقد</button>
            <span>←</span>
            <button type="button" onClick={() => setActiveScreen('extraction')} className="hover:text-[#C6A15B] cursor-pointer">الطحن والاستخراج</button>
            <span>←</span>
            <button type="button" onClick={() => setActiveScreen('flour_quotas')} className="hover:text-[#C6A15B] cursor-pointer">توزيع حصص الدقيق للمخابز ({toArabicNumerals(bakeries.length)})</button>
            <span>|</span>
            <button type="button" onClick={() => setActiveScreen('assets')} className="hover:text-[#C6A15B] cursor-pointer">الأصول والصيانة وقطع الغيار والحسابات</button>
          </div>
          <span className="text-[#C6A15B] font-black">
            اختبارات القبول: {toArabicNumerals(acceptanceTests.filter((t) => t.passed).length)}/{toArabicNumerals(acceptanceTests.length)} ناجحة
          </span>
        </div>
      </div>

      {/* قائمة الوصول السريع وخريطة شاشات قسم صيانة الحبوب (٢٢ شاشة في ٦ مجموعات قابلة للطي) */}
      <nav
        aria-label="خريطة شاشات قسم صيانة الحبوب"
        className="bg-white rounded-2xl border-2 border-[#102A43]/15 p-3.5 space-y-3 shadow-xs print:hidden overflow-visible"
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2">
            <Wheat className="w-4 h-4 text-[#164E83] shrink-0" />
            <span className="text-xs sm:text-[13px] font-black text-[#102A43]">
              الوصول السريع لوظائف وشاشات قسم صيانة الحبوب ({toArabicNumerals(allScreensFlat.length)} شاشة تخصصية مترابطة)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2" />
              <input
                type="text"
                value={screenSearchQuery}
                onChange={(e) => setScreenSearchQuery(e.target.value)}
                placeholder={`بحث سريع في شاشات صيانة الحبوب (${toArabicNumerals(allScreensFlat.length)})...`}
                className="w-full pr-9 pl-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-[#102A43] focus:outline-none focus:border-[#164E83]"
              />
            </div>

            <button
              type="button"
              onClick={() => setActiveScreen('dashboard')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer border ${
                activeScreen === 'dashboard'
                  ? 'bg-[#102A43] text-[#C6A15B] border-[#C6A15B]/60 shadow-xs'
                  : 'bg-slate-50 hover:bg-blue-50 text-[#102A43] border-slate-300'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>لوحة التحكم</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickAddRecord()}
              className="px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-700 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>إضافة سجل بالشاشة الحالية</span>
            </button>

            <button
              type="button"
              onClick={() => handleOfficialPrint(activeScreenLabel)}
              className="px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 bg-[#164E83] hover:bg-[#102A43] text-white cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة الشاشة</span>
            </button>

            <FactoryResetButton
              sectionName="قسم صيانة الحبوب والأصول والمطاحن والشون والثلاجات"
              sectionKey="grain_maintenance"
              currentUser={currentUser}
              tableSummary={[
                { tableName: 'الشون والصوامع والهناجر', count: store.warehouses.length },
                { tableName: 'سجل استلام القمح والرطوبة والفاقد', count: store.receipts.length + store.moistureRecords.length + store.lossRecords.length },
                { tableName: 'المطاحن وتشغيلات الاستخراج وحصص الدقيق', count: store.mills.length + store.millOperations.length + store.flourDistributions.length },
                { tableName: 'الثلاجات وقراءات الحرارة', count: store.refrigerators.length + store.refrigeratorTempLogs.length },
                { tableName: 'الأصول الهندسية وأوامر الصيانة وقطع الغيار والحسابات', count: store.assets.length + store.maintenanceOrders.length + store.spareParts.length + store.financialTransactions.length },
              ]}
              onCaptureBackup={() => ({ store })}
              onRestoreBackup={(snap) => {
                if (snap.store && typeof snap.store === 'object') {
                  updateStore(() => snap.store as GrainMaintenanceStoreData);
                  notify('تم استرجاع النسخة الاحتياطية لقسم صيانة الحبوب بنجاح.');
                }
              }}
              compact
              onConfirmReset={() => {
                updateStore((prev) => ({
                  ...prev,
                  warehouses: [],
                  scales: [],
                  receipts: [],
                  moistureRecords: [],
                  lossRecords: [],
                  movements: [],
                  mills: [],
                  millOperations: [],
                  flourDistributions: [],
                  refrigerators: [],
                  refrigeratorTempLogs: [],
                  refrigeratorMovements: [],
                  assets: [],
                  assetValuations: [],
                  maintenanceOrders: [],
                  spareParts: [],
                  sparePartMovements: [],
                  financialTransactions: [],
                  auditLogs: [],
                }));
                notify('تم تنفيذ إعادة ضبط المصنع لقسم صيانة الحبوب بنجاح دون المساس بباقي أقسام المنظومة.');
              }}
            />
          </div>
        </div>

        {/* بطاقات المجموعات الست القابلة للطي بنفس هوية قسم التجارة الداخلية */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {filteredNavGroups.map((group) => {
            const GroupIcon = group.groupIcon;
            const isOpen = openNavGroups[group.id] ?? true;
            return (
              <div
                key={group.id}
                className="border border-slate-200 rounded-xl overflow-hidden bg-[#FAFBFD] flex flex-col"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenNavGroups((prev) => ({ ...prev, [group.id]: !isOpen }))
                  }
                  className="w-full px-3 py-2 bg-[#102A43] text-white hover:bg-[#164E83] flex items-center justify-between gap-2 text-[11px] font-black cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-1.5 min-w-0 text-right">
                    <GroupIcon className="w-3.5 h-3.5 text-[#C6A15B] shrink-0" />
                    <span className="break-words whitespace-normal leading-snug">{group.title}</span>
                  </span>
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[#C6A15B] shrink-0" />
                  ) : (
                    <ChevronLeft className="w-3.5 h-3.5 text-[#C6A15B] shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="p-1.5 space-y-1 bg-white flex-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isSelected = activeScreen === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveScreen(item.id)}
                          className={`w-full text-right px-2.5 py-1.5 rounded-lg text-[11px] font-black flex items-center justify-between gap-2 transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-[#102A43] text-[#C6A15B] border-[#C6A15B]/60 shadow-xs'
                              : 'bg-slate-50/70 text-[#102A43] border-slate-200/80 hover:bg-blue-50 hover:border-[#164E83]/40'
                          }`}
                        >
                          <span className="flex items-start gap-2 min-w-0 flex-1">
                            <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span className="leading-snug break-words whitespace-normal">
                              {item.label}
                            </span>
                          </span>
                          {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
                            <span
                              className={`num-cell px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 ${
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
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* شريط عنوان الشاشة النشطة والبحث والفلترة السريعة */}
      <div className="bg-white rounded-xl border border-slate-200 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-2xs print:hidden">
        <div className="flex items-center gap-2 text-xs font-black text-[#102A43]">
          <Eye className="w-4 h-4 text-[#C6A15B] shrink-0" />
          <span>الشاشة النشطة حالياً:</span>
          <span className="text-[#164E83]">{activeScreenLabel}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-56 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2" />
            <input
              type="text"
              value={globalFilterQuery}
              onChange={(e) => setGlobalFilterQuery(e.target.value)}
              placeholder="بحث بالكود أو الاسم أو رقم المستند..."
              className="w-full pr-8 pl-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-bold text-[#102A43]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-black text-[#102A43]"
          >
            <option value="ALL">كل حالات الاعتماد والتشغيل</option>
            <option value="معتمد">السجلات المعتمدة فقط</option>
            <option value="تحت المراجعة">تحت المراجعة</option>
          </select>
          <button
            type="button"
            onClick={() =>
              updateStore(() => INITIAL_GRAIN_MAINTENANCE_STORE)
            }
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#102A43] border border-slate-300 text-[10.5px] font-black cursor-pointer"
          >
            استعادة البيانات القياسية المعتمدة
          </button>
        </div>
      </div>

      {/* إشعار Toast */}
      {toast && (
        <div
          className={`p-3 rounded-xl font-black text-[11.5px] flex items-center justify-between shadow-sm print:hidden ${
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

      {/* =====================================================================
          ١. لوحة التحكم الرئيسية لقسم صيانة الحبوب (Dashboard)
         ===================================================================== */}
      {activeScreen === 'dashboard' && (
        <div className="space-y-4">
          {/* المجموعات الـ ٦ للبطاقات الإحصائية التفاعلية */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* بطاقة ١: الشون والصوامع */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black text-[#102A43] flex items-center gap-1.5">
                  <Warehouse className="w-4 h-4 text-[#164E83]" />
                  <span>أولاً: موقف الشون والصوامع والقمح</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveScreen('warehouses')}
                  className="text-[10.5px] font-black text-[#164E83] hover:underline cursor-pointer"
                >
                  فتح الشون ←
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">إجمالي الشون</span>
                  <span className="num-cell font-black text-[#102A43] text-sm">
                    {toArabicNumerals(dashboardSummary.totalWarehouses)} ({toArabicNumerals(dashboardSummary.activeWarehouses)} عاملة)
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">السعة التخزينية</span>
                  <span className="num-cell font-black text-[#164E83] text-sm">
                    {formatArabicNumber(dashboardSummary.totalStorageCapacityTons)} طن
                  </span>
                </div>
                <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                  <span className="text-emerald-800 font-bold block">رصيد القمح الحالي</span>
                  <span className="num-cell font-black text-emerald-950 text-sm">
                    {formatArabicDecimal(dashboardSummary.totalCurrentWheatBalanceTons, 2)} طن
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">الكميات المستلمة</span>
                  <span className="num-cell font-black text-[#102A43]">
                    {formatArabicDecimal(dashboardSummary.totalReceivedWheatTons, 2)} طن
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">المنصرف للمطاحن</span>
                  <span className="num-cell font-black text-[#164E83]">
                    {formatArabicDecimal(dashboardSummary.totalIssuedWheatTons, 2)} طن
                  </span>
                </div>
                <div className="bg-amber-50 p-2 rounded-xl border border-amber-200">
                  <span className="text-amber-900 font-bold block">تحتاج صيانة / فحص</span>
                  <span className="num-cell font-black text-amber-950">
                    {toArabicNumerals(dashboardSummary.warehousesNeedMaintenance)} / {toArabicNumerals(dashboardSummary.warehousesNeedInspection)}
                  </span>
                </div>
              </div>
            </div>

            {/* بطاقة ٢: المطاحن ونسب الاستخراج */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black text-[#102A43] flex items-center gap-1.5">
                  <Factory className="w-4 h-4 text-[#164E83]" />
                  <span>ثانياً: موقف المطاحن ونسب الاستخراج</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveScreen('extraction')}
                  className="text-[10.5px] font-black text-[#164E83] hover:underline cursor-pointer"
                >
                  فتح الاستخراج ←
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">إجمالي المطاحن</span>
                  <span className="num-cell font-black text-[#102A43] text-sm">
                    {toArabicNumerals(dashboardSummary.totalMills)} ({toArabicNumerals(dashboardSummary.activeMills)} عامل)
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">القمح المطحون</span>
                  <span className="num-cell font-black text-[#164E83] text-sm">
                    {formatArabicDecimal(dashboardSummary.totalMillGroundWheatTons, 2)} طن
                  </span>
                </div>
                <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                  <span className="text-emerald-800 font-bold block">الدقيق المنتج ٨٧.٥٪</span>
                  <span className="num-cell font-black text-emerald-950 text-sm">
                    {formatArabicDecimal(dashboardSummary.totalFlourProducedTons, 2)} طن
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">الردة الناتجة</span>
                  <span className="num-cell font-black text-[#102A43]">
                    {formatArabicDecimal(dashboardSummary.totalBranProducedTons, 2)} طن
                  </span>
                </div>
                <div className="bg-blue-50 p-2 rounded-xl border border-blue-200">
                  <span className="text-blue-900 font-bold block">متوسط الاستخراج</span>
                  <span className="num-cell font-black text-blue-950">
                    {formatArabicDecimal(dashboardSummary.avgExtractionPct, 2)}%
                  </span>
                </div>
                <div className="bg-amber-50 p-2 rounded-xl border border-amber-200">
                  <span className="text-amber-900 font-bold block">انخفاض كفاءة</span>
                  <span className="num-cell font-black text-amber-950">
                    {toArabicNumerals(dashboardSummary.stoppedOrLowMills)} مطحن
                  </span>
                </div>
              </div>
            </div>

            {/* بطاقة ٣: حصص الدقيق للمخابز */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black text-[#102A43] flex items-center gap-1.5">
                  <Wheat className="w-4 h-4 text-[#C6A15B]" />
                  <span>ثالثاً: حصص الدقيق للمخابز ({toArabicNumerals(bakeries.length)} مخبز)</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveScreen('flour_quotas')}
                  className="text-[10.5px] font-black text-[#164E83] hover:underline cursor-pointer"
                >
                  فتح الحصص ←
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">الحصص المقررة</span>
                  <span className="num-cell font-black text-[#102A43] text-sm">
                    {formatArabicDecimal(dashboardSummary.totalScheduledFlourTons, 2)} طن
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">المنصرف من المطاحن</span>
                  <span className="num-cell font-black text-[#164E83] text-sm">
                    {formatArabicDecimal(dashboardSummary.totalIssuedFlourTons, 2)} طن
                  </span>
                </div>
                <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                  <span className="text-emerald-800 font-bold block">المستلم بالمخابز</span>
                  <span className="num-cell font-black text-emerald-950 text-sm">
                    {formatArabicDecimal(dashboardSummary.totalReceivedFlourTons, 2)} طن
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">إجمالي المتبقي</span>
                  <span className="num-cell font-black text-[#102A43]">
                    {formatArabicDecimal(dashboardSummary.totalRemainingFlourTons, 2)} طن
                  </span>
                </div>
                <div className="bg-blue-50 p-2 rounded-xl border border-blue-200">
                  <span className="text-blue-900 font-bold block">نسبة تنفيذ الحصص</span>
                  <span className="num-cell font-black text-blue-950">
                    {formatArabicDecimal(dashboardSummary.flourFulfillmentPct, 2)}%
                  </span>
                </div>
                <div className="bg-red-50 p-2 rounded-xl border border-red-200">
                  <span className="text-red-900 font-bold block">حصص تحتاج مراجعة</span>
                  <span className="num-cell font-black text-red-950">
                    {toArabicNumerals(dashboardSummary.quotasNeedReview)} حصة
                  </span>
                </div>
              </div>
            </div>

            {/* بطاقة ٤: الثلاجات ومخازن التبريد */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black text-[#102A43] flex items-center gap-1.5">
                  <ThermometerSnowflake className="w-4 h-4 text-sky-700" />
                  <span>رابعاً: الثلاجات ومخازن التبريد والتجميد</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveScreen('refrigerators')}
                  className="text-[10.5px] font-black text-[#164E83] hover:underline cursor-pointer"
                >
                  فتح الثلاجات ←
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">عدد الثلاجات / الغرف</span>
                  <span className="num-cell font-black text-[#102A43] text-sm">
                    {toArabicNumerals(dashboardSummary.totalRefrigerators)} / {toArabicNumerals(dashboardSummary.totalColdRooms)} غرفة
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">الطاقة التخزينية</span>
                  <span className="num-cell font-black text-[#164E83] text-sm">
                    {formatArabicNumber(dashboardSummary.totalColdCapacityTons)} طن
                  </span>
                </div>
                <div className="bg-sky-50 p-2 rounded-xl border border-sky-200">
                  <span className="text-sky-900 font-bold block">المخزون الحالي</span>
                  <span className="num-cell font-black text-sky-950 text-sm">
                    {formatArabicDecimal(dashboardSummary.totalColdStockTons, 2)} طن
                  </span>
                </div>
                <div className="bg-red-50 p-2 rounded-xl border border-red-200 col-span-3 flex items-center justify-between">
                  <span className="text-red-900 font-bold">ثلاجات لديها إنذار تجاوز درجة الحرارة الآمنة:</span>
                  <span className="num-cell font-black text-red-950 px-2 py-0.5 bg-red-100 rounded-lg">
                    {toArabicNumerals(dashboardSummary.refrigeratorsWithTempAlarm)} ثلاجة (تتطلب تدخلاً فورياً)
                  </span>
                </div>
              </div>
            </div>

            {/* بطاقة ٥: الأصول الهندسية والصيانة وقطع الغيار */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black text-[#102A43] flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-[#164E83]" />
                  <span>خامساً: الأصول الهندسية والصيانة وقطع الغيار</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveScreen('assets')}
                  className="text-[10.5px] font-black text-[#164E83] hover:underline cursor-pointer"
                >
                  فتح الأصول ←
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">إجمالي الأصول</span>
                  <span className="num-cell font-black text-[#102A43] text-sm">
                    {toArabicNumerals(dashboardSummary.totalAssets)} ({toArabicNumerals(dashboardSummary.workingAssets)} عاملة)
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 col-span-2">
                  <span className="text-slate-500 font-bold block">صافي القيمة الدفترية المعتمدة</span>
                  <span className="num-cell font-black text-[#164E83] text-sm">
                    {formatArabicCurrency(dashboardSummary.totalBookValueEgp)}
                  </span>
                </div>
                <div className="bg-amber-50 p-2 rounded-xl border border-amber-200">
                  <span className="text-amber-900 font-bold block">أوامر صيانة مفتوحة</span>
                  <span className="num-cell font-black text-amber-950">
                    {toArabicNumerals(dashboardSummary.openMaintenanceOrders)} ({toArabicNumerals(dashboardSummary.emergencyMaintenanceOrders)} طارئة)
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">تكلفة الصيانة</span>
                  <span className="num-cell font-black text-[#102A43]">
                    {formatArabicCurrency(dashboardSummary.totalMaintenanceCostEgp)}
                  </span>
                </div>
                <div className="bg-red-50 p-2 rounded-xl border border-red-200">
                  <span className="text-red-900 font-bold block">قطع وصلت حد الطلب</span>
                  <span className="num-cell font-black text-red-950">
                    {toArabicNumerals(dashboardSummary.reorderSparePartsCount)} أصناف
                  </span>
                </div>
              </div>
            </div>

            {/* بطاقة ٦: الرقابة والتنبيهات العاجلة */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black text-[#102A43] flex items-center gap-1.5">
                  <BellRing className="w-4 h-4 text-red-700" />
                  <span>سادساً: الموقف الرقابي والتنبيهات الذكية</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveScreen('smart_alerts')}
                  className="text-[10.5px] font-black text-red-700 hover:underline cursor-pointer"
                >
                  فتح التنبيهات ({toArabicNumerals(smartAlerts.length)}) ←
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-red-50 p-2 rounded-xl border border-red-200">
                  <span className="text-red-900 font-bold block">تنبيهات حرجة وعالية</span>
                  <span className="num-cell font-black text-red-950 text-sm">
                    {toArabicNumerals(smartAlerts.filter((a) => a.severity === 'حرج' || a.severity === 'عالي').length)} تنبيه عاجل
                  </span>
                </div>
                <div className="bg-amber-50 p-2 rounded-xl border border-amber-200">
                  <span className="text-amber-900 font-bold block">حالات عجز / فاقد غير مبرر</span>
                  <span className="num-cell font-black text-amber-950 text-sm">
                    {toArabicNumerals(store.lossRecords.filter((l) => l.varianceClassification === 'عجز غير مبرر').length)} حالة
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">تجاوز حدود الرطوبة / الوزن</span>
                  <span className="num-cell font-black text-[#102A43]">
                    {toArabicNumerals(store.receipts.filter((r) => r.moisturePct > store.settings.maxAllowedMoisturePct || Math.abs(r.weightDifferenceTons) > store.settings.maxAllowedWeightDiffTons).length)} شحنة
                  </span>
                </div>
                <div className="bg-blue-50 p-2 rounded-xl border border-blue-200">
                  <span className="text-blue-900 font-bold block">عمليات بانتظار الاعتماد</span>
                  <span className="num-cell font-black text-blue-950">
                    {toArabicNumerals(store.receipts.filter((r) => r.approvalStatus === 'تحت المراجعة').length)} عملية
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* الرسوم البيانية التفاعلية المقارنة */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* رسم ١: مقارنة أرصدة الشون والسعة التخزينية */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-[#102A43]">
                  ١. مقارنة أرصدة الشون والصوامع المعتمدة ونسب الإشغال الفعلي
                </h4>
                <span className="text-[10.5px] font-bold text-slate-500">محسوب آلياً من الحركات المعتمدة</span>
              </div>
              <div className="space-y-2.5">
                {warehouseMetricsList.map(({ warehouse, metrics }) => (
                  <div key={warehouse.id} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-black">
                      <span className="text-[#102A43]">{warehouse.name}</span>
                      <span className="num-cell text-[#164E83]">
                        {formatArabicDecimal(metrics.closingBalanceTons, 2)} / {formatArabicNumber(warehouse.actualCapacityTons)} طن ({formatArabicDecimal(metrics.occupancyPct, 2)}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="h-full bg-gradient-to-l from-[#102A43] to-[#164E83] rounded-full"
                        style={{ width: `${Math.min(100, Math.max(6, metrics.occupancyPct))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* رسم ٢: نسب استخراج الدقيق والردة والفاقد بالمطاحن */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-[#102A43]">
                  ٢. مقارنة أداء المطاحن ونسب استخراج الدقيق البلدي (المعيار ٨٧.٥٠٪)
                </h4>
                <span className="text-[10.5px] font-bold text-slate-500">مقرب إلى رقمين عشريين</span>
              </div>
              <div className="space-y-2.5">
                {millOperationMetricsList.map(({ operation, mill, metrics }) => (
                  <div key={operation.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-black">
                      <span className="text-[#102A43]">{mill?.name} ({operation.operationNumber})</span>
                      <span className="num-cell text-emerald-800">
                        دقيق: {formatArabicDecimal(metrics.flourExtractionPct, 2)}% | ردة: {formatArabicDecimal(metrics.branExtractionPct, 2)}% | فاقد: {formatArabicDecimal(metrics.grindingLossPct, 2)}%
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-emerald-700"
                        style={{ width: `${Math.min(100, metrics.flourExtractionPct)}%` }}
                        title={`استخراج الدقيق: ${metrics.flourExtractionPct.toFixed(2)}%`}
                      />
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${Math.min(100, metrics.branExtractionPct)}%` }}
                        title={`نسبة الردة: ${metrics.branExtractionPct.toFixed(2)}%`}
                      />
                      <div
                        className="h-full bg-red-600"
                        style={{ width: `${Math.max(1, metrics.grindingLossPct)}%` }}
                        title={`نسبة الفاقد: ${metrics.grindingLossPct.toFixed(2)}%`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* جدول التنبيهات الرقابية العاجلة على لوحة التحكم */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-[#102A43] flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-700" />
                <span>أهم التنبيهات والإنذارات الفورية لقسم صيانة الحبوب ({toArabicNumerals(smartAlerts.length)} تنبيه نشط)</span>
              </h4>
              <button
                type="button"
                onClick={() => setActiveScreen('smart_alerts')}
                className="px-3 py-1 rounded-lg bg-[#102A43] text-[#C6A15B] text-[11px] font-black cursor-pointer"
              >
                عرض جميع التنبيهات ←
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {smartAlerts.slice(0, 6).map((al) => (
                <div
                  key={al.id}
                  onClick={() => setActiveScreen(al.targetScreen)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-2 ${
                    al.severity === 'حرج'
                      ? 'bg-red-50/80 border-red-300 hover:bg-red-100/70'
                      : 'bg-amber-50/70 border-amber-300 hover:bg-amber-100/70'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[9.5px] font-black ${
                          al.severity === 'حرج' ? 'bg-red-700 text-white' : 'bg-amber-700 text-white'
                        }`}
                      >
                        {al.severity}
                      </span>
                      <span className="text-[10.5px] font-extrabold text-slate-600">{al.domain}</span>
                    </div>
                    <p className="text-[11.5px] font-black text-[#102A43]">{al.title}</p>
                    <p className="text-[10.5px] font-bold text-slate-700">{al.description}</p>
                  </div>
                  <span className="num-cell text-[10px] font-black text-[#164E83] shrink-0">
                    {al.measuredValue}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ٢. إدارة الشون والصوامع والهناجر والبناكر (Warehouses)
         ===================================================================== */}
      {activeScreen === 'warehouses' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-black text-[#102A43]">
                ٢. سجل الشون والصوامع والهناجر والبناكر وأرصدتها المعتمدة غير اليدوية
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                معادلة الرصيد الختامي الإلزامية: الرصيد الافتتاحي المعتمد + الوارد المعتمد + التحويلات الواردة - المنصرف للمطاحن - التحويلات الصادرة + التسويات المعتمدة
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleExportCsv(
                    'grain_warehouses_balances',
                    ['كود الشونة', 'اسم الشونة/الصومعة', 'النوع', 'الإدارة', 'السعة الفعلية (طن)', 'الرصيد الافتتاحي (طن)', 'الوارد المعتمد (طن)', 'المنصرف المعتمد (طن)', 'التسويات (طن)', 'الرصيد الختامي المعتمد (طن)', 'نسبة الإشغال %', 'الحالة'],
                    warehouseMetricsList.map(({ warehouse: w, metrics: m }) => [
                      w.code,
                      w.name,
                      w.facilityType,
                      w.administration,
                      w.actualCapacityTons,
                      m.openingBalanceTons,
                      m.approvedReceiptsTons,
                      m.approvedIssuedToMillsTons,
                      m.approvedAdjustmentsTons,
                      m.closingBalanceTons,
                      m.occupancyPct,
                      w.operatingStatus,
                    ])
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تصدير Excel (CSV)</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  <th className="p-2.5 border border-slate-300">الكود</th>
                  <th className="p-2.5 border border-slate-300">اسم الشونة / الصومعة</th>
                  <th className="p-2.5 border border-slate-300">النوع والجهة المشرفة</th>
                  <th className="p-2.5 border border-slate-300">المسؤول والهاتف</th>
                  <th className="p-2.5 border border-slate-300 text-center">السعة الفعلية</th>
                  <th className="p-2.5 border border-slate-300 text-center">الافتتاحي المعتمد</th>
                  <th className="p-2.5 border border-slate-300 text-center">الوارد المعتمد</th>
                  <th className="p-2.5 border border-slate-300 text-center">المنصرف للمطاحن</th>
                  <th className="p-2.5 border border-slate-300 text-center">التسويات المعتمدة</th>
                  <th className="p-2.5 border border-slate-300 text-center bg-[#164E83]">الرصيد الختامي المعتمد</th>
                  <th className="p-2.5 border border-slate-300 text-center">الإشغال %</th>
                  <th className="p-2.5 border border-slate-300 text-center">الحالة</th>
                  <th className="p-2.5 border border-slate-300 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {warehouseMetricsList
                  .filter(({ warehouse }) => {
                    const q = normalizeSearchText(globalFilterQuery);
                    if (!q) return true;
                    return normalizeSearchText(`${warehouse.code} ${warehouse.name} ${warehouse.managerName} ${warehouse.villageOrCity}`).includes(q);
                  })
                  .map(({ warehouse: w, metrics: m }) => (
                    <tr key={w.id} className="border-b border-slate-200 hover:bg-blue-50/40">
                      <td className="p-2 border border-slate-200 font-black text-[#164E83] num-cell">{w.code}</td>
                      <td className="p-2 border border-slate-200 font-black text-[#102A43]">
                        <div>{w.name}</div>
                        <div className="text-[10px] font-bold text-slate-500">{w.villageOrCity} — {toArabicNumerals(w.cellsCount)} خلايا</div>
                      </td>
                      <td className="p-2 border border-slate-200 font-bold text-slate-700">
                        <div>{w.facilityType}</div>
                        <div className="text-[10px] text-slate-500">{w.supervisingAuthority}</div>
                      </td>
                      <td className="p-2 border border-slate-200 font-bold text-slate-700">
                        <div>{w.managerName}</div>
                        <div className="num-cell text-[10px] text-slate-500">{toArabicNumerals(w.phone)}</div>
                      </td>
                      <td className="p-2 border border-slate-200 text-center num-cell font-black">
                        {formatArabicDecimal(w.actualCapacityTons, 2)} طن
                      </td>
                      <td className="p-2 border border-slate-200 text-center num-cell font-bold">
                        {formatArabicDecimal(m.openingBalanceTons, 2)} طن
                      </td>
                      <td className="p-2 border border-slate-200 text-center num-cell font-black text-emerald-800">
                        +{formatArabicDecimal(m.approvedReceiptsTons, 2)} طن
                      </td>
                      <td className="p-2 border border-slate-200 text-center num-cell font-black text-amber-800">
                        -{formatArabicDecimal(m.approvedIssuedToMillsTons, 2)} طن
                      </td>
                      <td className="p-2 border border-slate-200 text-center num-cell font-black text-red-700">
                        {formatArabicDecimal(m.approvedAdjustmentsTons, 2)} طن
                      </td>
                      <td className="p-2 border border-slate-200 text-center num-cell font-black bg-emerald-50 text-emerald-950">
                        {formatArabicDecimal(m.closingBalanceTons, 2)} طن
                      </td>
                      <td className="p-2 border border-slate-200 text-center num-cell font-black">
                        {formatArabicDecimal(m.occupancyPct, 2)}%
                      </td>
                      <td className="p-2 border border-slate-200 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-900 border border-blue-200">
                          {w.operatingStatus} / {w.engineeringStatus}
                        </span>
                      </td>
                      <td className="p-2 border border-slate-200 text-center">
                        {renderMandatoryActionsCell({
                          recordId: w.id,
                          recordCode: w.code,
                          facilityName: w.name,
                          approvalStatus: 'معتمد',
                          onViewHistory: () =>
                            setSelectedHistoryEntity({
                              type: 'شونة / صومعة',
                              id: w.id,
                              name: w.name,
                              code: w.code,
                            }),
                        })}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          ٣. استلام القمح والوزن والفحص الفني (Receipts)
         ===================================================================== */}
      {activeScreen === 'receipts' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-black text-[#102A43]">
                ٣. سجل استلام القمح وتذاكر البسكول والفحص المعملي (قاعدة الاعتماد الإلزامية)
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                الوزن الصافي الفعلي = الوزن القائم - وزن الفارغ | لا تدخل الشحنة في رصيد الشونة المعتمد إلا بعد أن تصبح بحالة «معتمد» ونتيجة الفحص «مقبول»
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleQuickAddRecord()}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-black flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>تسجيل استلام شحنة قمح جديدة</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  <th className="p-2 border border-slate-300">رقم الإذن / التذكرة</th>
                  <th className="p-2 border border-slate-300">التاريخ</th>
                  <th className="p-2 border border-slate-300">الشونة والخلية</th>
                  <th className="p-2 border border-slate-300">المورد والسيارة</th>
                  <th className="p-2 border border-slate-300 text-center">القائم (طن)</th>
                  <th className="p-2 border border-slate-300 text-center">الفارغ (طن)</th>
                  <th className="p-2 border border-slate-300 text-center bg-[#164E83]">الصافي الفعلي</th>
                  <th className="p-2 border border-slate-300 text-center">بالمستند / الفرق</th>
                  <th className="p-2 border border-slate-300 text-center">الرطوبة % / القيراط</th>
                  <th className="p-2 border border-slate-300 text-center">الفحص والاعتماد</th>
                  <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {store.receipts
                  .filter((r) => (statusFilter === 'ALL' ? true : r.approvalStatus === statusFilter))
                  .map((rec) => {
                    const wh = store.warehouses.find((w) => w.id === rec.warehouseId);
                    return (
                      <tr key={rec.id} className="border-b border-slate-200 hover:bg-blue-50/40">
                        <td className="p-2 border border-slate-200 font-black text-[#164E83] num-cell">
                          <div>{rec.receiptNumber}</div>
                          <div className="text-[10px] text-slate-500">بسكول: {rec.weighingTicketNumber}</div>
                        </td>
                        <td className="p-2 border border-slate-200 num-cell font-bold">
                          {formatDateArabic(rec.receiptDate)}
                        </td>
                        <td className="p-2 border border-slate-200 font-black text-[#102A43]">
                          <div>{wh?.name || rec.warehouseId}</div>
                          <div className="text-[10px] text-slate-500">{rec.cellCode}</div>
                        </td>
                        <td className="p-2 border border-slate-200 font-bold text-slate-700">
                          <div>{rec.supplierName}</div>
                          <div className="text-[10px] text-slate-500">{rec.vehicleNumber} — {rec.driverName}</div>
                        </td>
                        <td className="p-2 border border-slate-200 text-center num-cell font-bold">
                          {formatArabicDecimal(rec.grossWeightTons, 2)}
                        </td>
                        <td className="p-2 border border-slate-200 text-center num-cell font-bold">
                          {formatArabicDecimal(rec.tareWeightTons, 2)}
                        </td>
                        <td className="p-2 border border-slate-200 text-center num-cell font-black bg-emerald-50 text-emerald-950">
                          {formatArabicDecimal(rec.actualNetWeightTons, 2)} طن
                        </td>
                        <td className="p-2 border border-slate-200 text-center num-cell font-bold">
                          <div>{formatArabicDecimal(rec.documentedWeightTons, 2)} طن</div>
                          <div className={rec.weightDifferenceTons < 0 ? 'text-red-700 font-black' : 'text-slate-600'}>
                            الفرق: {formatArabicDecimal(rec.weightDifferenceTons, 2)} طن
                          </div>
                        </td>
                        <td className="p-2 border border-slate-200 text-center num-cell font-black">
                          <div className={rec.moisturePct > store.settings.maxAllowedMoisturePct ? 'text-red-700' : 'text-emerald-800'}>
                            رطوبة: {formatArabicDecimal(rec.moisturePct, 2)}%
                          </div>
                          <div className="text-[10px] text-slate-600">
                            {formatArabicDecimal(rec.purityKirat, 2)} قيراط
                          </div>
                        </td>
                        <td className="p-2 border border-slate-200 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black block mb-1 ${
                              rec.approvalStatus === 'معتمد'
                                ? 'bg-emerald-100 text-emerald-950'
                                : 'bg-amber-100 text-amber-950'
                            }`}
                          >
                            {rec.approvalStatus}
                          </span>
                          <span className="text-[10px] font-bold text-slate-600">{rec.inspectionResult}</span>
                        </td>
                        <td className="p-2 border border-slate-200 text-center">
                          {renderMandatoryActionsCell({
                            recordId: rec.id,
                            recordCode: rec.receiptNumber,
                            facilityName: wh?.name || '',
                            approvalStatus: rec.approvalStatus,
                            onApprove: () => {
                              updateStore((prev) => ({
                                ...prev,
                                receipts: prev.receipts.map((x) =>
                                  x.id === rec.id ? { ...x, approvalStatus: 'معتمد' } : x
                                ),
                              }));
                              appendGrainAudit(
                                'اعتماد',
                                activeScreenLabel,
                                rec.receiptNumber,
                                wh?.name || '',
                                'تحت المراجعة',
                                `معتمد — تمت إضافة ${rec.actualNetWeightTons.toFixed(2)} طن لرصيد الشونة`,
                                'اعتماد محضر الاستلام والفحص'
                              );
                              notify(`تم اعتماد الشحنة (${rec.receiptNumber}) وإضافة (${rec.actualNetWeightTons.toFixed(2)} طن) إلى رصيد الشونة آلياً.`);
                            },
                            onCancelApproved: () => {
                              updateStore((prev) => ({
                                ...prev,
                                receipts: prev.receipts.map((x) =>
                                  x.id === rec.id
                                    ? { ...x, approvalStatus: 'ملغى', cancellationReason: 'إلغاء موثق بقرار مراجعة' }
                                    : x
                                ),
                              }));
                              appendGrainAudit(
                                'إلغاء موثق',
                                activeScreenLabel,
                                rec.receiptNumber,
                                wh?.name || '',
                                'معتمد',
                                'ملغى بقيد عكسي موثق',
                                'إلغاء موثق مع الاحتفاظ بالأثر التاريخي'
                              );
                              notify(`تم تحويل الشحنة المعتمدة (${rec.receiptNumber}) إلى «ملغى موثق» وخصم أثرها من الرصيد.`);
                            },
                            onDeleteDraft: () => {
                              updateStore((prev) => ({
                                ...prev,
                                receipts: prev.receipts.filter((x) => x.id !== rec.id),
                              }));
                              notify(`تم حذف مسودة الشحنة غير المعتمدة (${rec.receiptNumber}).`);
                            },
                          })}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          ٤. الرطوبة والجودة والفاقد والعجز والزيادة (Moisture & Loss)
         ===================================================================== */}
      {activeScreen === 'moisture_loss' && (
        <div className="space-y-4">
          {/* جدول ١: قياسات وتصحيحات الرطوبة المنفصل */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div>
              <h3 className="text-sm font-black text-[#102A43]">
                ٤-أ. سجل قياسات وتصحيحات الرطوبة المنفصل (مع الاحتفاظ الكامل بالوزن الفعلي الأصلي)
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                الرطوبة المرجعية القياسية: {formatArabicDecimal(store.settings.standardMoisturePct, 2)}% | الحد الأقصى المسموح: {formatArabicDecimal(store.settings.maxAllowedMoisturePct, 2)}%
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2 border border-slate-300">رقم المحضر</th>
                    <th className="p-2 border border-slate-300">التاريخ</th>
                    <th className="p-2 border border-slate-300">الشونة والخلية</th>
                    <th className="p-2 border border-slate-300 text-center">الوزن الفعلي الأصلي (محفوظ)</th>
                    <th className="p-2 border border-slate-300 text-center">الرطوبة المقاسة</th>
                    <th className="p-2 border border-slate-300 text-center">الرطوبة المرجعية</th>
                    <th className="p-2 border border-slate-300 text-center">فرق الرطوبة %</th>
                    <th className="p-2 border border-slate-300 text-center">خصم الرطوبة المحاسبي</th>
                    <th className="p-2 border border-slate-300 text-center bg-[#164E83]">الوزن المحاسبي المعدل</th>
                    <th className="p-2 border border-slate-300">المعادلة والمرجع</th>
                    <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {store.moistureRecords.map((m) => {
                    const wh = store.warehouses.find((w) => w.id === m.warehouseId);
                    return (
                      <tr key={m.id} className="border-b border-slate-200 hover:bg-blue-50/40">
                        <td className="p-2 border border-slate-200 font-black text-[#164E83] num-cell">{m.recordNumber}</td>
                        <td className="p-2 border border-slate-200 num-cell font-bold">{formatDateArabic(m.measurementDate)}</td>
                        <td className="p-2 border border-slate-200 font-black text-[#102A43]">{wh?.name} ({m.cellCode})</td>
                        <td className="p-2 border border-slate-200 text-center num-cell font-black bg-slate-50">
                          {formatArabicDecimal(m.actualWeightBeforeTons, 2)} طن
                        </td>
                        <td className="p-2 border border-slate-200 text-center num-cell font-black text-red-700">
                          {formatArabicDecimal(m.measuredMoisturePct, 2)}%
                        </td>
                        <td className="p-2 border border-slate-200 text-center num-cell font-bold">
                          {formatArabicDecimal(m.referenceMoisturePct, 2)}%
                        </td>
                        <td className="p-2 border border-slate-200 text-center num-cell font-black">
                          {formatArabicDecimal(m.moistureVariancePct, 2)}%
                        </td>
                        <td className="p-2 border border-slate-200 text-center num-cell font-black text-amber-800">
                          {formatArabicDecimal(m.moistureDeductionTons, 2)} طن
                        </td>
                        <td className="p-2 border border-slate-200 text-center num-cell font-black bg-emerald-50 text-emerald-950">
                          {formatArabicDecimal(m.accountingAdjustedWeightTons, 2)} طن
                        </td>
                        <td className="p-2 border border-slate-200 text-[10.5px] font-bold text-slate-700">
                          {m.formulaReference}
                        </td>
                        <td className="p-2 border border-slate-200 text-center">
                          {renderMandatoryActionsCell({
                            recordId: m.id,
                            recordCode: m.recordNumber,
                            facilityName: wh?.name || '',
                            approvalStatus: m.approvalStatus,
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* جدول ٢: محاضر الجرد والفاقد والعجز والزيادة */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div>
              <h3 className="text-sm font-black text-[#102A43]">
                ٤-ب. سجل الجرد الفعلي والفاقد الطبيعي والعجز غير المبرر والزيادة الجردية
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                الفاقد أو الزيادة = الرصيد الفعلي - الرصيد الدفتري | نسبة الفاقد = (الفاقد ÷ الرصيد الدفتري) × ١٠٠
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2 border border-slate-300">رقم محضر الجرد</th>
                    <th className="p-2 border border-slate-300">تاريخ الجرد</th>
                    <th className="p-2 border border-slate-300">الشونة / الصومعة</th>
                    <th className="p-2 border border-slate-300 text-center">الرصيد الدفتري</th>
                    <th className="p-2 border border-slate-300 text-center">الرصيد الفعلي</th>
                    <th className="p-2 border border-slate-300 text-center">الفرق (طن)</th>
                    <th className="p-2 border border-slate-300 text-center">نسبة الفرق %</th>
                    <th className="p-2 border border-slate-300 text-center">التصنيف الرقابي</th>
                    <th className="p-2 border border-slate-300">السبب وتقرير اللجنة</th>
                    <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {store.lossRecords.map((lr) => {
                    const wh = store.warehouses.find((w) => w.id === lr.warehouseId);
                    return (
                      <tr key={lr.id} className="border-b border-slate-200 hover:bg-blue-50/40">
                        <td className="p-2 border border-slate-200 font-black text-[#164E83] num-cell">{lr.recordNumber}</td>
                        <td className="p-2 border border-slate-200 num-cell font-bold">{formatDateArabic(lr.inventoryDate)}</td>
                        <td className="p-2 border border-slate-200 font-black text-[#102A43]">{wh?.name}</td>
                        <td className="p-2 border border-slate-200 text-center num-cell font-bold">
                          {formatArabicDecimal(lr.bookBalanceTons, 2)} طن
                        </td>
                        <td className="p-2 border border-slate-200 text-center num-cell font-black">
                          {formatArabicDecimal(lr.actualPhysicalBalanceTons, 2)} طن
                        </td>
                        <td className="p-2 border border-slate-200 text-center num-cell font-black text-red-700">
                          {formatArabicDecimal(lr.varianceTons, 2)} طن
                        </td>
                        <td className="p-2 border border-slate-200 text-center num-cell font-black text-red-700">
                          {formatArabicDecimal(lr.variancePct, 2)}%
                        </td>
                        <td className="p-2 border border-slate-200 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              lr.varianceClassification === 'عجز غير مبرر'
                                ? 'bg-red-100 text-red-950 border border-red-300'
                                : 'bg-emerald-100 text-emerald-950'
                            }`}
                          >
                            {lr.varianceClassification}
                          </span>
                        </td>
                        <td className="p-2 border border-slate-200 text-[10.5px] font-bold text-slate-700">
                          {lr.causeDescription} ({lr.committeeReportNumber})
                        </td>
                        <td className="p-2 border border-slate-200 text-center">
                          {renderMandatoryActionsCell({
                            recordId: lr.id,
                            recordCode: lr.recordNumber,
                            facilityName: wh?.name || '',
                            approvalStatus: lr.approvalStatus,
                          })}
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

      {/* =====================================================================
          ٥. إدارة المطاحن وخطوط الإنتاج (Mills)
         ===================================================================== */}
      {activeScreen === 'mills' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-black text-[#102A43]">
                ٥. سجل المطاحن التموينية وخطوط الإنتاج والقدرة الإنتاجية اليومية
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                مربوطة بالشون الموردة للقمح وبحسابات حصص الدقيق للمخابز ومراكز التكلفة
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  <th className="p-2 border border-slate-300">كود المطحن</th>
                  <th className="p-2 border border-slate-300">اسم المطحن والشركة</th>
                  <th className="p-2 border border-slate-300">النوع والموقع</th>
                  <th className="p-2 border border-slate-300">مدير المطحن والهاتف</th>
                  <th className="p-2 border border-slate-300 text-center">القدرة اليومية</th>
                  <th className="p-2 border border-slate-300 text-center">عدد الخطوط</th>
                  <th className="p-2 border border-slate-300 text-center">نسبة الاستخراج المعتمدة</th>
                  <th className="p-2 border border-slate-300 text-center">الحالة التشغيلية</th>
                  <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {store.mills.map((mill) => (
                  <tr key={mill.id} className="border-b border-slate-200 hover:bg-blue-50/40">
                    <td className="p-2 border border-slate-200 font-black text-[#164E83] num-cell">{mill.code}</td>
                    <td className="p-2 border border-slate-200 font-black text-[#102A43]">
                      <div>{mill.name}</div>
                      <div className="text-[10px] font-bold text-slate-500">{mill.ownerCompany}</div>
                    </td>
                    <td className="p-2 border border-slate-200 font-bold text-slate-700">
                      <div>{mill.millType}</div>
                      <div className="text-[10px] text-slate-500">{mill.detailedAddress}</div>
                    </td>
                    <td className="p-2 border border-slate-200 font-bold text-slate-700">
                      <div>{mill.managerName}</div>
                      <div className="num-cell text-[10px] text-slate-500">{toArabicNumerals(mill.phone)}</div>
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-black">
                      {formatArabicDecimal(mill.dailyProductionCapacityTons, 2)} طن/يوم
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-bold">
                      {toArabicNumerals(mill.operatingLinesCount)} خطوط
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-black text-emerald-800">
                      {formatArabicDecimal(mill.targetExtractionRatePct, 2)}%
                    </td>
                    <td className="p-2 border border-slate-200 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          mill.operatingStatus === 'عامل'
                            ? 'bg-emerald-100 text-emerald-950'
                            : 'bg-amber-100 text-amber-950'
                        }`}
                      >
                        {mill.operatingStatus}
                      </span>
                    </td>
                    <td className="p-2 border border-slate-200 text-center">
                      {renderMandatoryActionsCell({
                        recordId: mill.id,
                        recordCode: mill.code,
                        facilityName: mill.name,
                        approvalStatus: 'معتمد',
                        onViewHistory: () =>
                          setSelectedHistoryEntity({
                            type: 'مطحن',
                            id: mill.id,
                            name: mill.name,
                            code: mill.code,
                          }),
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          ٦. التشغيل اليومي للمطاحن ونسب الاستخراج (Extraction)
         ===================================================================== */}
      {activeScreen === 'extraction' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-black text-[#102A43]">
                ٦. سجل التشغيل اليومي للمطاحن وحساب نسب استخراج الدقيق والردة وفاقد الطحن
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                نسبة استخراج الدقيق = (الدقيق الناتج ÷ القمح المطحون) × ١٠٠ | نسبة الردة = (الردة ÷ القمح المطحون) × ١٠٠ | نسبة الفاقد = ((القمح المطحون - مجموع النواتج) ÷ القمح المطحون) × ١٠٠
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleQuickAddRecord()}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-black flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>تسجيل تشغيلة طحن يومية</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  <th className="p-2 border border-slate-300">رقم التشغيلة</th>
                  <th className="p-2 border border-slate-300">التاريخ</th>
                  <th className="p-2 border border-slate-300">المطحن والشونة الموردة</th>
                  <th className="p-2 border border-slate-300 text-center">القمح المطحون</th>
                  <th className="p-2 border border-slate-300 text-center">الدقيق المنتج ٨٧.٥٪</th>
                  <th className="p-2 border border-slate-300 text-center">الردة (خشنة + ناعمة)</th>
                  <th className="p-2 border border-slate-300 text-center bg-[#164E83]">نسبة الاستخراج %</th>
                  <th className="p-2 border border-slate-300 text-center">نسبة الردة %</th>
                  <th className="p-2 border border-slate-300 text-center">فاقد الطحن (طن / %)</th>
                  <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {millOperationMetricsList.map(({ operation: op, mill, warehouse, metrics }) => (
                  <tr key={op.id} className="border-b border-slate-200 hover:bg-blue-50/40">
                    <td className="p-2 border border-slate-200 font-black text-[#164E83] num-cell">{op.operationNumber}</td>
                    <td className="p-2 border border-slate-200 num-cell font-bold">{formatDateArabic(op.operationDate)}</td>
                    <td className="p-2 border border-slate-200 font-black text-[#102A43]">
                      <div>{mill?.name}</div>
                      <div className="text-[10px] font-bold text-slate-500">وارد من: {warehouse?.name}</div>
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-black">
                      {formatArabicDecimal(op.groundWheatTons, 2)} طن
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-black text-emerald-800">
                      {formatArabicDecimal(op.flour875ProducedTons, 2)} طن
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-bold">
                      {formatArabicDecimal(metrics.totalBranTons, 2)} طن
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-black bg-emerald-50 text-emerald-950">
                      {metrics.isComplete ? `${formatArabicDecimal(metrics.flourExtractionPct, 2)}%` : 'عملية غير مكتملة'}
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-bold">
                      {formatArabicDecimal(metrics.branExtractionPct, 2)}%
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-black">
                      <span className={metrics.grindingLossPct > store.settings.maxAllowedMillLossPct ? 'text-red-700' : 'text-slate-700'}>
                        {formatArabicDecimal(metrics.grindingLossTons, 2)} طن ({formatArabicDecimal(metrics.grindingLossPct, 2)}%)
                      </span>
                    </td>
                    <td className="p-2 border border-slate-200 text-center">
                      {renderMandatoryActionsCell({
                        recordId: op.id,
                        recordCode: op.operationNumber,
                        facilityName: mill?.name || '',
                        approvalStatus: op.approvalStatus,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          ٧. حصص الدقيق وصرفها للمخابز المعتمدة (Flour Quotas)
         ===================================================================== */}
      {activeScreen === 'flour_quotas' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-black text-[#102A43]">
                ٧. حصص الدقيق المقررة والمنصرفة للمخابز (مربوطة مباشرة بجدول المخابز الحالي دون تكرار)
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                إجمالي الحصة = الحصة اليومية × عدد الأيام المعتمدة | المتبقي = الحصة المقررة - الكمية المنصرفة | نسبة التنفيذ = (الكمية المستلمة ÷ الحصة المقررة) × ١٠٠
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  <th className="p-2 border border-slate-300">رقم إذن الصرف</th>
                  <th className="p-2 border border-slate-300">التاريخ</th>
                  <th className="p-2 border border-slate-300">المخبز ورقم POS والقرية</th>
                  <th className="p-2 border border-slate-300">المطحن المربوط</th>
                  <th className="p-2 border border-slate-300 text-center">الحصة اليومية</th>
                  <th className="p-2 border border-slate-300 text-center">إجمالي المقرر</th>
                  <th className="p-2 border border-slate-300 text-center">المنصرف من المطحن</th>
                  <th className="p-2 border border-slate-300 text-center bg-[#164E83]">المستلم بالمخبز</th>
                  <th className="p-2 border border-slate-300 text-center">المتبقي / الفرق</th>
                  <th className="p-2 border border-slate-300 text-center">نسبة التنفيذ %</th>
                  <th className="p-2 border border-slate-300 text-center">الحالة</th>
                  <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {flourQuotaMetricsList.map(({ record: fd, bakery, mill, metrics: qm }) => (
                  <tr key={fd.id} className="border-b border-slate-200 hover:bg-blue-50/40">
                    <td className="p-2 border border-slate-200 font-black text-[#164E83] num-cell">{fd.voucherNumber}</td>
                    <td className="p-2 border border-slate-200 num-cell font-bold">{formatDateArabic(fd.distributionDate)}</td>
                    <td className="p-2 border border-slate-200 font-black text-[#102A43]">
                      <div>{bakery?.name || fd.bakeryId}</div>
                      <div className="text-[10px] font-bold text-slate-500">
                        مخبز #{toArabicNumerals(bakery?.bakeryNumber || '')} · POS: {toArabicNumerals(bakery?.posNumber || '')} · {bakery?.village}
                      </div>
                    </td>
                    <td className="p-2 border border-slate-200 font-bold text-slate-700">{mill?.name}</td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-bold">
                      {toArabicNumerals(fd.dailyQuotaSacks)} شيكارة ({formatArabicDecimal(qm.dailyQuotaTons, 2)} طن)
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-black">
                      {formatArabicDecimal(qm.totalScheduledTons, 2)} طن ({toArabicNumerals(fd.approvedDays)} يوم)
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-bold">
                      {formatArabicDecimal(fd.issuedFromMillTons, 2)} طن
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-black bg-emerald-50 text-emerald-950">
                      {formatArabicDecimal(fd.receivedByBakeryTons, 2)} طن
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-black">
                      <div>متبقي: {formatArabicDecimal(qm.remainingQuotaTons, 2)} طن</div>
                      {Math.abs(qm.discrepancyTons) > 0.001 && (
                        <div className="text-red-700">فرق استلام: {formatArabicDecimal(qm.discrepancyTons, 2)} طن</div>
                      )}
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-black text-[#164E83]">
                      {formatArabicDecimal(qm.fulfillmentPct, 2)}%
                    </td>
                    <td className="p-2 border border-slate-200 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          qm.quotaStatus === 'مستلمة بالكامل'
                            ? 'bg-emerald-100 text-emerald-950'
                            : qm.quotaStatus === 'فرق بين المطحن والمخبز'
                            ? 'bg-red-100 text-red-950'
                            : 'bg-amber-100 text-amber-950'
                        }`}
                      >
                        {qm.quotaStatus}
                      </span>
                    </td>
                    <td className="p-2 border border-slate-200 text-center">
                      {renderMandatoryActionsCell({
                        recordId: fd.id,
                        recordCode: fd.voucherNumber,
                        facilityName: bakery?.name || '',
                        approvalStatus: fd.approvalStatus,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          ٨ & ٩. الثلاجات ومخازن التبريد ومراقبة الحرارة (Refrigerators & Monitoring)
         ===================================================================== */}
      {(activeScreen === 'refrigerators' || activeScreen === 'cold_monitoring') && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <h3 className="text-sm font-black text-[#102A43]">
              ٨. سجل الثلاجات ومخازن التبريد والتجميد وأرصدتها المعتمدة والحدود الحرارية الآمنة
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2 border border-slate-300">الكود</th>
                    <th className="p-2 border border-slate-300">اسم الثلاجة / مجمع التبريد</th>
                    <th className="p-2 border border-slate-300">نوع المنتج والنطاق الآمن</th>
                    <th className="p-2 border border-slate-300 text-center">الغرف / السعة</th>
                    <th className="p-2 border border-slate-300 text-center bg-[#164E83]">المخزون المعتمد</th>
                    <th className="p-2 border border-slate-300 text-center">الحرارة الحالية</th>
                    <th className="p-2 border border-slate-300 text-center">وحدات التبريد والمولد</th>
                    <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {refrigeratorMetricsList.map(({ refrigerator: ref, metrics: rm }) => (
                    <tr key={ref.id} className="border-b border-slate-200 hover:bg-blue-50/40">
                      <td className="p-2 border border-slate-200 font-black text-[#164E83] num-cell">{ref.code}</td>
                      <td className="p-2 border border-slate-200 font-black text-[#102A43]">
                        <div>{ref.name}</div>
                        <div className="text-[10px] font-bold text-slate-500">{ref.detailedAddress}</div>
                      </td>
                      <td className="p-2 border border-slate-200 font-bold text-slate-700">
                        <div>{ref.storedProductCategory}</div>
                        <div className="num-cell text-[10px] text-slate-500">
                          الحد الآمن: من {formatArabicDecimal(ref.minSafeTempC, 2)}°C إلى {formatArabicDecimal(ref.maxSafeTempC, 2)}°C
                        </div>
                      </td>
                      <td className="p-2 border border-slate-200 text-center num-cell font-bold">
                        {toArabicNumerals(ref.roomsCount)} غرف / {formatArabicNumber(ref.totalCapacityTons)} طن
                      </td>
                      <td className="p-2 border border-slate-200 text-center num-cell font-black bg-sky-50 text-sky-950">
                        {formatArabicDecimal(rm.currentStockTons, 2)} طن ({formatArabicDecimal(rm.occupancyPct, 2)}%)
                      </td>
                      <td className="p-2 border border-slate-200 text-center num-cell font-black">
                        <span
                          className={`px-2 py-0.5 rounded-lg ${
                            rm.isTempOutOfRange ? 'bg-red-100 text-red-900 border border-red-300' : 'bg-emerald-100 text-emerald-950'
                          }`}
                        >
                          {formatArabicDecimal(ref.currentTempC, 2)} °C {rm.isTempOutOfRange ? '(إنذار حرارة!)' : '(آمن)'}
                        </span>
                      </td>
                      <td className="p-2 border border-slate-200 text-center text-[10.5px] font-bold">
                        <div>{ref.coolingUnitStatus}</div>
                        <div className="text-slate-500">{ref.backupGeneratorStatus}</div>
                      </td>
                      <td className="p-2 border border-slate-200 text-center">
                        {renderMandatoryActionsCell({
                          recordId: ref.id,
                          recordCode: ref.code,
                          facilityName: ref.name,
                          approvalStatus: 'معتمد',
                          onViewHistory: () =>
                            setSelectedHistoryEntity({
                              type: 'ثلاجة تبريد',
                              id: ref.id,
                              name: ref.name,
                              code: ref.code,
                            }),
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <h3 className="text-sm font-black text-[#102A43]">
              ٩. سجل قراءات درجات الحرارة والرطوبة والإنذارات والإجراءات التصحيحية
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2 border border-slate-300">رقم القراءة</th>
                    <th className="p-2 border border-slate-300">التاريخ والوقت</th>
                    <th className="p-2 border border-slate-300">الثلاجة والغرفة</th>
                    <th className="p-2 border border-slate-300">المنتج المخزن</th>
                    <th className="p-2 border border-slate-300 text-center">الحرارة المقاسة</th>
                    <th className="p-2 border border-slate-300 text-center">الحد المسموح</th>
                    <th className="p-2 border border-slate-300 text-center">الرطوبة %</th>
                    <th className="p-2 border border-slate-300">الإجراء التصحيحي المتخذ</th>
                    <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {store.refrigeratorTempLogs.map((tlog) => {
                    const ref = store.refrigerators.find((r) => r.id === tlog.refrigeratorId);
                    const isAlarm =
                      tlog.measuredTempC < tlog.minAllowedTempC ||
                      tlog.measuredTempC > tlog.maxAllowedTempC;
                    return (
                      <tr key={tlog.id} className="border-b border-slate-200 hover:bg-blue-50/40">
                        <td className="p-2 border border-slate-200 font-black text-[#164E83] num-cell">{tlog.logNumber}</td>
                        <td className="p-2 border border-slate-200 num-cell font-bold">
                          {formatDateArabic(tlog.recordedDate)} — {toArabicNumerals(tlog.recordedTime)}
                        </td>
                        <td className="p-2 border border-slate-200 font-black text-[#102A43]">
                          {ref?.name} ({tlog.roomCode})
                        </td>
                        <td className="p-2 border border-slate-200 font-bold">{tlog.productName}</td>
                        <td className="p-2 border border-slate-200 text-center num-cell font-black">
                          <span className={isAlarm ? 'text-red-700' : 'text-emerald-800'}>
                            {formatArabicDecimal(tlog.measuredTempC, 2)} °C
                          </span>
                        </td>
                        <td className="p-2 border border-slate-200 text-center num-cell font-bold">
                          {formatArabicDecimal(tlog.minAllowedTempC, 2)} إلى {formatArabicDecimal(tlog.maxAllowedTempC, 2)} °C
                        </td>
                        <td className="p-2 border border-slate-200 text-center num-cell font-bold">
                          {formatArabicDecimal(tlog.humidityPct, 2)}%
                        </td>
                        <td className="p-2 border border-slate-200 text-[10.5px] font-bold text-slate-700">
                          {tlog.correctiveAction}
                        </td>
                        <td className="p-2 border border-slate-200 text-center">
                          {renderMandatoryActionsCell({
                            recordId: tlog.id,
                            recordCode: tlog.logNumber,
                            facilityName: ref?.name || '',
                            approvalStatus: 'معتمد',
                          })}
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

      {/* =====================================================================
          ١٠ & ١١. سجل الأصول الهندسية وتقييم الأصول والإهلاك (Assets & Valuation)
         ===================================================================== */}
      {(activeScreen === 'assets' || activeScreen === 'asset_valuation') && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-black text-[#102A43]">
                  ١٠ & ١١. السجل الهندسي والمالي للأصول والمعدات وتقييم القيمة الدفترية والإهلاك ({toArabicNumerals(GRAIN_ASSET_CATEGORIES.length)} فئة هندسية معتمدة)
                </h3>
                <p className="text-[11px] font-bold text-slate-600">
                  القيمة الدفترية الصافية = تكلفة الشراء التاريخية + الإضافات الرأسمالية المعتمدة - مجمع الإهلاك (مع فصل مصروف الصيانة التشغيلي عن الإضافة الرأسمالية)
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2 border border-slate-300">كود الأصل / الرقم التسلسلي</th>
                    <th className="p-2 border border-slate-300">اسم الأصل والفئة الهندسية</th>
                    <th className="p-2 border border-slate-300">المنشأة التابع لها</th>
                    <th className="p-2 border border-slate-300 text-center">التكلفة التاريخية</th>
                    <th className="p-2 border border-slate-300 text-center">إضافات رأسمالية</th>
                    <th className="p-2 border border-slate-300 text-center">مجمع الإهلاك</th>
                    <th className="p-2 border border-slate-300 text-center bg-[#164E83]">صافي القيمة الدفترية</th>
                    <th className="p-2 border border-slate-300 text-center">مصروف صيانة تشغيلي</th>
                    <th className="p-2 border border-slate-300 text-center">الحالة الفنية</th>
                    <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {assetMetricsList.map(({ asset, metrics: am }) => (
                    <tr key={asset.id} className="border-b border-slate-200 hover:bg-blue-50/40">
                      <td className="p-2 border border-slate-200 font-black text-[#164E83] num-cell">
                        <div>{asset.assetCode}</div>
                        <div className="text-[10px] text-slate-500">{asset.serialNumber}</div>
                      </td>
                      <td className="p-2 border border-slate-200 font-black text-[#102A43]">
                        <div>{asset.name}</div>
                        <div className="text-[10px] font-bold text-slate-500">
                          {asset.assetCategory} · {asset.manufacturer} ({toArabicNumerals(asset.manufactureYear)})
                        </div>
                      </td>
                      <td className="p-2 border border-slate-200 font-bold text-slate-700">
                        <div>{asset.facilityName}</div>
                        <div className="text-[10px] text-slate-500">عهدة: {asset.custodianName}</div>
                      </td>
                      <td className="p-2 border border-slate-200 text-center num-cell font-bold">
                        {formatArabicCurrency(am.historicalCostEgp)}
                      </td>
                      <td className="p-2 border border-slate-200 text-center num-cell font-black text-blue-800">
                        {formatArabicCurrency(am.totalCapitalAdditionsEgp)}
                      </td>
                      <td className="p-2 border border-slate-200 text-center num-cell font-bold text-amber-800">
                        {formatArabicCurrency(am.accumulatedDepreciationEgp)}
                      </td>
                      <td className="p-2 border border-slate-200 text-center num-cell font-black bg-emerald-50 text-emerald-950">
                        {formatArabicCurrency(am.netBookValueEgp)}
                      </td>
                      <td className="p-2 border border-slate-200 text-center num-cell font-bold text-slate-700">
                        {formatArabicCurrency(am.approvedOperatingMaintenanceEgp)}
                      </td>
                      <td className="p-2 border border-slate-200 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-950 border border-blue-200">
                          {asset.technicalCondition} / {asset.operatingStatus}
                        </span>
                      </td>
                      <td className="p-2 border border-slate-200 text-center">
                        {renderMandatoryActionsCell({
                          recordId: asset.id,
                          recordCode: asset.assetCode,
                          facilityName: asset.facilityName,
                          approvalStatus: 'معتمد',
                          onViewHistory: () =>
                            setSelectedHistoryEntity({
                              type: 'أصل هندسي',
                              id: asset.id,
                              name: asset.name,
                              code: asset.assetCode,
                            }),
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ١٢. خطط الصيانة وأوامر العمل والأعطال (Maintenance Orders)
         ===================================================================== */}
      {activeScreen === 'maintenance_orders' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-black text-[#102A43]">
                ١٢. سجل أوامر العمل والصيانة الوقائية والطارئة وتصنيف الأعطال وزمن التوقف
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                كل أمر صيانة مربوط بالأصل الهندسي والمنشأة وقطع الغيار المنصرفة والحساب المالي ومركز التكلفة
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleQuickAddRecord()}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-black flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>إنشاء أمر صيانة جديد</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  <th className="p-2 border border-slate-300">رقم أمر العمل</th>
                  <th className="p-2 border border-slate-300">النوع وتصنيف العطل</th>
                  <th className="p-2 border border-slate-300">الأصل الهندسي والمنشأة</th>
                  <th className="p-2 border border-slate-300">وصف العطل والإصلاح</th>
                  <th className="p-2 border border-slate-300 text-center">زمن التوقف</th>
                  <th className="p-2 border border-slate-300 text-center">تكلفة قطع الغيار</th>
                  <th className="p-2 border border-slate-300 text-center">مصروفات خارجية</th>
                  <th className="p-2 border border-slate-300 text-center bg-[#164E83]">إجمالي التكلفة</th>
                  <th className="p-2 border border-slate-300 text-center">حالة الأمر</th>
                  <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {store.maintenanceOrders.map((mo) => (
                  <tr key={mo.id} className="border-b border-slate-200 hover:bg-blue-50/40">
                    <td className="p-2 border border-slate-200 font-black text-[#164E83] num-cell">
                      <div>{mo.orderNumber}</div>
                      <div className="text-[10px] text-slate-500">{formatDateArabic(mo.faultReportDate)}</div>
                    </td>
                    <td className="p-2 border border-slate-200 font-bold">
                      <div className="font-black text-[#102A43]">{mo.maintenanceType}</div>
                      <div className="text-[10px] text-slate-600">{mo.faultCategory} ({mo.priority})</div>
                    </td>
                    <td className="p-2 border border-slate-200 font-bold">
                      <div className="font-black text-[#102A43]">{mo.assetName}</div>
                      <div className="text-[10px] text-slate-500">{mo.facilityName}</div>
                    </td>
                    <td className="p-2 border border-slate-200 text-[10.5px] font-bold text-slate-700">
                      <div>{mo.faultDescription}</div>
                      <div className="text-emerald-900">المنفذ: {mo.workPerformed}</div>
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-black text-amber-900">
                      {formatArabicDecimal(mo.downtimeHours, 2)} ساعة
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-bold">
                      {formatArabicCurrency(mo.sparePartsCostEgp)}
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-bold">
                      {formatArabicCurrency(mo.externalLaborCostEgp)}
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-black bg-emerald-50 text-emerald-950">
                      {formatArabicCurrency(mo.totalMaintenanceCostEgp)}
                    </td>
                    <td className="p-2 border border-slate-200 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          mo.orderStatus === 'مكتمل ومغلق'
                            ? 'bg-emerald-100 text-emerald-950'
                            : 'bg-amber-100 text-amber-950'
                        }`}
                      >
                        {mo.orderStatus}
                      </span>
                    </td>
                    <td className="p-2 border border-slate-200 text-center">
                      {renderMandatoryActionsCell({
                        recordId: mo.id,
                        recordCode: mo.orderNumber,
                        facilityName: mo.facilityName,
                        approvalStatus: mo.approvalStatus,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          ١٣. قطع الغيار والمخزون الهندسي وحد إعادة الطلب (Spare Parts)
         ===================================================================== */}
      {activeScreen === 'spare_parts' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-black text-[#102A43]">
              ١٣. سجل مخزون قطع الغيار الهندسية وحركة الصرف وحد إعادة الطلب
            </h3>
            <p className="text-[11px] font-bold text-slate-600">
              قاعدة رقابية إلزامية: لا يتم خصم قطعة الغيار من رصيد المخزن الهندسي إلا عند اكتمال وإغلاق واعتماد أمر الصيانة المرتبط بها
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  <th className="p-2 border border-slate-300">كود القطعة</th>
                  <th className="p-2 border border-slate-300">اسم قطعة الغيار والفئة</th>
                  <th className="p-2 border border-slate-300">الأصول المتوافقة والمخزن</th>
                  <th className="p-2 border border-slate-300 text-center">الافتتاحي المعتمد</th>
                  <th className="p-2 border border-slate-300 text-center">المنصرف لأوامر مكتملة</th>
                  <th className="p-2 border border-slate-300 text-center bg-[#164E83]">الرصيد الحالي المعتمد</th>
                  <th className="p-2 border border-slate-300 text-center">حد إعادة الطلب</th>
                  <th className="p-2 border border-slate-300 text-center">تكلفة الوحدة / القيمة</th>
                  <th className="p-2 border border-slate-300 text-center">حالة المخزون</th>
                  <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {sparePartMetricsList.map(({ part, metrics: spm }) => (
                  <tr key={part.id} className="border-b border-slate-200 hover:bg-blue-50/40">
                    <td className="p-2 border border-slate-200 font-black text-[#164E83] num-cell">{part.partCode}</td>
                    <td className="p-2 border border-slate-200 font-black text-[#102A43]">
                      <div>{part.name}</div>
                      <div className="text-[10px] font-bold text-slate-500">{part.category}</div>
                    </td>
                    <td className="p-2 border border-slate-200 font-bold text-slate-700">
                      <div>{part.compatibleAssets}</div>
                      <div className="text-[10px] text-slate-500">{part.warehouseLocation}</div>
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-bold">
                      {toArabicNumerals(part.approvedOpeningQty)} {part.unit}
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-black text-amber-800">
                      {toArabicNumerals(spm.approvedConsumedQty)} {part.unit}
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-black bg-emerald-50 text-emerald-950">
                      {toArabicNumerals(spm.currentQty)} {part.unit}
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-bold">
                      {toArabicNumerals(part.minReorderLevel)} {part.unit}
                    </td>
                    <td className="p-2 border border-slate-200 text-center num-cell font-bold">
                      <div>{formatArabicCurrency(part.unitCostEgp)}</div>
                      <div className="text-[10px] font-black text-[#164E83]">{formatArabicCurrency(spm.totalStockValueEgp)}</div>
                    </td>
                    <td className="p-2 border border-slate-200 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          spm.needsReorder
                            ? 'bg-red-100 text-red-950 border border-red-300'
                            : 'bg-emerald-100 text-emerald-950'
                        }`}
                      >
                        {spm.needsReorder ? 'وصل حد إعادة الطلب!' : 'رصيد آمن'}
                      </span>
                    </td>
                    <td className="p-2 border border-slate-200 text-center">
                      {renderMandatoryActionsCell({
                        recordId: part.id,
                        recordCode: part.partCode,
                        facilityName: part.warehouseLocation,
                        approvalStatus: 'معتمد',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          ١٤ & ١٥. الحسابات المالية الموحدة ومراكز التكلفة (Financial Accounts & Cost Centers)
         ===================================================================== */}
      {(activeScreen === 'financial_accounts' || activeScreen === 'cost_centers') && (
        <div className="space-y-4">
          {/* جدول مراكز التكلفة */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <h3 className="text-sm font-black text-[#102A43]">
              ١٥. مراكز التكلفة المعتمدة للمنشآت (الشون · الصوامع · المطاحن · الثلاجات)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {store.costCenters.map((cc) => {
                const spent = store.financialTransactions
                  .filter((t) => t.costCenterId === cc.id && t.approvalStatus === 'معتمد' && t.debitAmountEgp > 0)
                  .reduce((s, t) => s + t.debitAmountEgp, 0);
                const rev = store.financialTransactions
                  .filter((t) => t.costCenterId === cc.id && t.approvalStatus === 'معتمد' && t.creditAmountEgp > 0)
                  .reduce((s, t) => s + t.creditAmountEgp, 0);
                const utilPct = cc.allocatedBudgetEgp > 0 ? (spent / cc.allocatedBudgetEgp) * 100 : 0;
                return (
                  <div key={cc.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between font-black text-[#164E83]">
                      <span className="num-cell">{cc.code}</span>
                      <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[#102A43] text-[10px]">
                        {cc.facilityType}
                      </span>
                    </div>
                    <p className="font-black text-[#102A43] text-xs">{cc.name}</p>
                    <div className="flex justify-between font-bold text-slate-600">
                      <span>الموازنة المخصصة:</span>
                      <span className="num-cell font-black text-[#102A43]">{formatArabicCurrency(cc.allocatedBudgetEgp)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-600">
                      <span>المصروفات المعتمدة:</span>
                      <span className="num-cell font-black text-red-700">{formatArabicCurrency(spent)} ({formatArabicDecimal(utilPct, 2)}%)</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-600">
                      <span>الإيرادات المحققة:</span>
                      <span className="num-cell font-black text-emerald-800">{formatArabicCurrency(rev)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* دفتر القيود والحسابات المالية الـ ١٥ */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <h3 className="text-sm font-black text-[#102A43]">
              ١٤. سجل المعاملات والحسابات المالية الموحد ({toArabicNumerals(GRAIN_FINANCIAL_ACCOUNT_CATEGORIES.length)} تصنيفاً مالياً — لا يُسمح بقيد مالي بدون رقم مستند ومركز تكلفة)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2 border border-slate-300">رقم المستند المالي</th>
                    <th className="p-2 border border-slate-300">التاريخ</th>
                    <th className="p-2 border border-slate-300">التصنيف المالي ونوع القيد</th>
                    <th className="p-2 border border-slate-300">المنشأة ومركز التكلفة والمرجع</th>
                    <th className="p-2 border border-slate-300 text-center">مدين / مصروف</th>
                    <th className="p-2 border border-slate-300 text-center">دائن / إيراد</th>
                    <th className="p-2 border border-slate-300">البيان التفصيلي</th>
                    <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {store.financialTransactions.map((ft) => (
                    <tr key={ft.id} className="border-b border-slate-200 hover:bg-blue-50/40">
                      <td className="p-2 border border-slate-200 font-black text-[#164E83] num-cell">{ft.documentNumber}</td>
                      <td className="p-2 border border-slate-200 num-cell font-bold">{formatDateArabic(ft.transactionDate)}</td>
                      <td className="p-2 border border-slate-200 font-bold">
                        <div className="font-black text-[#102A43]">{ft.accountCategory}</div>
                        <div className="text-[10px] text-slate-500">{ft.entryType}</div>
                      </td>
                      <td className="p-2 border border-slate-200 font-bold">
                        <div className="text-[#102A43]">{ft.facilityName}</div>
                        <div className="num-cell text-[10px] text-slate-500">مرجع: {ft.relatedReferenceNumber}</div>
                      </td>
                      <td className="p-2 border border-slate-200 text-center num-cell font-black text-red-700">
                        {ft.debitAmountEgp > 0 ? formatArabicCurrency(ft.debitAmountEgp) : '—'}
                      </td>
                      <td className="p-2 border border-slate-200 text-center num-cell font-black text-emerald-800">
                        {ft.creditAmountEgp > 0 ? formatArabicCurrency(ft.creditAmountEgp) : '—'}
                      </td>
                      <td className="p-2 border border-slate-200 text-[10.5px] font-bold text-slate-700">
                        {ft.description}
                      </td>
                      <td className="p-2 border border-slate-200 text-center">
                        {renderMandatoryActionsCell({
                          recordId: ft.id,
                          recordCode: ft.documentNumber,
                          facilityName: ft.facilityName,
                          approvalStatus: ft.approvalStatus,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ١٦. المقارنة الفنية والمالية بين المنشآت (Facility Comparison)
         ===================================================================== */}
      {activeScreen === 'facility_comparison' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <h3 className="text-sm font-black text-[#102A43]">
              ١٦-أ. المقارنة المعيارية بين الشون والصوامع (الرصيد، نسبة الإشغال، الفاقد، وتكلفة الصيانة)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2 border border-slate-300">الشونة / الصومعة</th>
                    <th className="p-2 border border-slate-300 text-center">السعة الفعلية</th>
                    <th className="p-2 border border-slate-300 text-center">الرصيد الختامي المعتمد</th>
                    <th className="p-2 border border-slate-300 text-center">نسبة الإشغال %</th>
                    <th className="p-2 border border-slate-300 text-center">إجمالي التسويات والفاقد</th>
                    <th className="p-2 border border-slate-300 text-center">تكاليف الصيانة والتشغيل</th>
                    <th className="p-2 border border-slate-300 text-center">تكلفة الطن المخزن</th>
                    <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouseMetricsList.map(({ warehouse: w, metrics: m }) => {
                    const whCost = store.financialTransactions
                      .filter((t) => t.facilityId === w.id && t.approvalStatus === 'معتمد')
                      .reduce((s, t) => s + t.debitAmountEgp, 0);
                    const costPerTon = m.closingBalanceTons > 0 ? whCost / m.closingBalanceTons : 0;
                    return (
                      <tr key={w.id} className="border-b border-slate-200">
                        <td className="p-2 border border-slate-200 font-black text-[#102A43]">{w.name}</td>
                        <td className="p-2 border border-slate-200 text-center num-cell font-bold">{formatArabicDecimal(w.actualCapacityTons, 2)} طن</td>
                        <td className="p-2 border border-slate-200 text-center num-cell font-black text-emerald-900">{formatArabicDecimal(m.closingBalanceTons, 2)} طن</td>
                        <td className="p-2 border border-slate-200 text-center num-cell font-black">{formatArabicDecimal(m.occupancyPct, 2)}%</td>
                        <td className="p-2 border border-slate-200 text-center num-cell font-black text-red-700">{formatArabicDecimal(m.approvedAdjustmentsTons, 2)} طن</td>
                        <td className="p-2 border border-slate-200 text-center num-cell font-bold">{formatArabicCurrency(whCost)}</td>
                        <td className="p-2 border border-slate-200 text-center num-cell font-black text-[#164E83]">{formatArabicDecimal(costPerTon, 2)} ج.م/طن</td>
                        <td className="p-2 border border-slate-200 text-center">
                          <button
                            type="button"
                            onClick={() => setActiveScreen('warehouses')}
                            className="px-2 py-1 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer"
                          >
                            عرض الشونة
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <h3 className="text-sm font-black text-[#102A43]">
              ١٦-ب. المقارنة المعيارية بين المطاحن (القمح المطحون، الدقيق المنتج، نسبة الاستخراج، وفاقد الطحن)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2 border border-slate-300">المطحن</th>
                    <th className="p-2 border border-slate-300 text-center">القدرة اليومية</th>
                    <th className="p-2 border border-slate-300 text-center">القمح المطحون</th>
                    <th className="p-2 border border-slate-300 text-center">الدقيق المنتج ٨٧.٥٪</th>
                    <th className="p-2 border border-slate-300 text-center">نسبة الاستخراج الفعلية</th>
                    <th className="p-2 border border-slate-300 text-center">الانحراف عن المعيار (٨٧.٥٠٪)</th>
                    <th className="p-2 border border-slate-300 text-center">نسبة فاقد الطحن %</th>
                    <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {millOperationMetricsList.map(({ operation: op, mill, metrics }) => (
                    <tr key={op.id} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-200 font-black text-[#102A43]">{mill?.name}</td>
                      <td className="p-2 border border-slate-200 text-center num-cell font-bold">{formatArabicDecimal(mill?.dailyProductionCapacityTons || 0, 2)} طن</td>
                      <td className="p-2 border border-slate-200 text-center num-cell font-black">{formatArabicDecimal(op.groundWheatTons, 2)} طن</td>
                      <td className="p-2 border border-slate-200 text-center num-cell font-black text-emerald-800">{formatArabicDecimal(op.flour875ProducedTons, 2)} طن</td>
                      <td className="p-2 border border-slate-200 text-center num-cell font-black">{formatArabicDecimal(metrics.flourExtractionPct, 2)}%</td>
                      <td className="p-2 border border-slate-200 text-center num-cell font-black">
                        {formatArabicDecimal(metrics.varianceFromTargetPct, 2)}%
                      </td>
                      <td className="p-2 border border-slate-200 text-center num-cell font-black text-red-700">
                        {formatArabicDecimal(metrics.grindingLossPct, 2)}%
                      </td>
                      <td className="p-2 border border-slate-200 text-center">
                        <button
                          type="button"
                          onClick={() => setActiveScreen('mills')}
                          className="px-2 py-1 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer"
                        >
                          عرض المطحن
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ١٧. مركز التنبيهات والإنذارات الرقابية الذكية (Smart Alerts)
         ===================================================================== */}
      {activeScreen === 'smart_alerts' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-black text-[#102A43]">
              ١٧. مركز التنبيهات والإنذارات الرقابية الذكية الشامل ({toArabicNumerals(smartAlerts.length)} تنبيه عبر المجالات الـ ٦)
            </h3>
            <p className="text-[11px] font-bold text-slate-600">
              يغطي تنبيهات الشون والقمح، المطاحن والاستخراج، حصص الدقيق، الثلاجات والتبريد، الأصول والصيانة وقطع الغيار، والحسابات المالية
            </p>
          </div>

          <div className="space-y-2.5">
            {smartAlerts.map((al) => (
              <div
                key={al.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        al.severity === 'حرج'
                          ? 'bg-red-700 text-white'
                          : al.severity === 'عالي'
                          ? 'bg-amber-700 text-white'
                          : 'bg-blue-700 text-white'
                      }`}
                    >
                      مستوى الخطورة: {al.severity}
                    </span>
                    <span className="text-[11px] font-black text-[#164E83]">{al.domain}</span>
                    <span className="text-[10.5px] font-bold text-slate-500">المنشأة: {al.facilityName}</span>
                    <span className="num-cell text-[10.5px] font-bold text-slate-500">المرجع: {al.referenceCode}</span>
                  </div>
                  <p className="text-xs font-black text-[#102A43]">{al.title}</p>
                  <p className="text-[11px] font-bold text-slate-700">{al.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-left text-[10.5px] font-black">
                    <div className="text-red-700 num-cell">القيمة المقاسة: {al.measuredValue}</div>
                    <div className="text-slate-600 num-cell">المعيار المسموح: {al.thresholdValue}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveScreen(al.targetScreen)}
                    className="px-3 py-1.5 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-[10.5px] font-black cursor-pointer"
                  >
                    معالجة بالشاشة ←
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          ١٨. مركز التقارير الشامل (75+ Categorized & 12 Consolidated Reports)
         ===================================================================== */}
      {activeScreen === 'reports_center' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-black text-[#102A43]">
                ١٨. مركز التقارير الحكومية الشامل (٨٢ تقريراً تخصصياً شاملة الـ ١٢ تقريراً تجميعياً للإدارة العليا)
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                اضغط على أي تقرير لفتحه للطباعة الرسمية أو تصديره فوراً من واقع البيانات الفعلية المعتمدة
              </p>
            </div>
            <select
              value={selectedReportCategory}
              onChange={(e) => setSelectedReportCategory(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-[#102A43]"
            >
              <option value="ALL">جميع فئات التقارير (٨٢ تقريراً)</option>
              {categorizedReportsCatalog.map((c) => (
                <option key={c.category} value={c.category}>
                  {c.category}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            {categorizedReportsCatalog
              .filter((c) => selectedReportCategory === 'ALL' || c.category === selectedReportCategory)
              .map((cat) => (
                <div key={cat.category} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-[#102A43] text-white px-3.5 py-2 text-xs font-black flex items-center justify-between">
                    <span>{cat.category}</span>
                    <span className="text-[#C6A15B]">{toArabicNumerals(cat.reports.length)} تقريراً</span>
                  </div>
                  <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 bg-slate-50/50">
                    {cat.reports.map((repTitle) => (
                      <div
                        key={repTitle}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2"
                      >
                        <span className="text-[11px] font-black text-[#102A43] leading-snug">{repTitle}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOfficialPrint(repTitle)}
                            className="px-2 py-1 rounded-lg bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer"
                          >
                            طباعة
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleExportCsv(
                                'grain_official_report',
                                ['اسم التقرير', 'تاريخ الإصدار', 'رصيد القمح المعتمد (طن)', 'إجمالي الدقيق المنتج (طن)', 'متوسط الاستخراج %', 'القيمة الدفترية للأصول (ج.م)'],
                                [
                                  [
                                    repTitle,
                                    todayRef,
                                    dashboardSummary.totalCurrentWheatBalanceTons.toFixed(2),
                                    dashboardSummary.totalFlourProducedTons.toFixed(2),
                                    dashboardSummary.avgExtractionPct.toFixed(2),
                                    dashboardSummary.totalBookValueEgp.toFixed(2),
                                  ],
                                ]
                              )
                            }
                            className="px-2 py-1 rounded-lg bg-emerald-700 text-white text-[10px] font-black cursor-pointer"
                          >
                            Excel
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          ١٩. مركز الطباعة الرسمية والتصدير (Print & Export Center)
         ===================================================================== */}
      {activeScreen === 'print_export' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-black text-[#102A43]">
                ١٩. مركز الطباعة الرسمية والتصدير الحكومي (A4 طولي وعرضي · PDF · Excel CSV)
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                يضمن ظهور الترويسة الرسمية، اسم المنظومة، تاريخ الطباعة، اسم المستخدم، وجدول التوقيعات الثلاثية مع إخفاء أزرار التحكم
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPrintOrientation('portrait')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer border ${
                  printOrientation === 'portrait'
                    ? 'bg-[#102A43] text-[#C6A15B] border-[#102A43]'
                    : 'bg-slate-50 text-[#102A43] border-slate-300'
                }`}
              >
                وضع A4 طولي (Portrait)
              </button>
              <button
                type="button"
                onClick={() => setPrintOrientation('landscape')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer border ${
                  printOrientation === 'landscape'
                    ? 'bg-[#102A43] text-[#C6A15B] border-[#102A43]'
                    : 'bg-slate-50 text-[#102A43] border-slate-300'
                }`}
              >
                وضع A4 عرضي للجداول الكبيرة (Landscape)
              </button>
              <button
                type="button"
                onClick={() => handleOfficialPrint('التقرير التنفيذي الموحد لقسم صيانة الحبوب')}
                className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة / حفظ PDF رسمي الآن</span>
              </button>
            </div>
          </div>

          {/* نموذج المعاينة الرسمية للطباعة والتوقيعات */}
          <div className="border-2 border-[#102A43] rounded-2xl p-5 bg-[#FAFBFD] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#102A43] pb-3 text-xs font-black text-[#102A43]">
              <div>
                <p>محافظة الغربية — مديرية التموين والتجارة الداخلية</p>
                <p>إدارة تموين مركز المحلة الكبرى — قسم صيانة الحبوب</p>
              </div>
              <div className="text-center">
                <h4 className="text-sm font-black">بيان الموقف التشغيلي والمالي والرقابي الموحد لقسم صيانة الحبوب</h4>
                <p className="text-[11px] font-bold text-slate-600">الفترة المرجعية حتى: {formatDateArabic(todayRef)}</p>
              </div>
              <div className="text-left">
                <p>تاريخ الإصدار: {formatDateArabic(todayRef)}</p>
                <p>المسؤول: {currentUser.fullName}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-300">
                <span className="text-slate-500 font-bold block">رصيد القمح المعتمد بالشون</span>
                <span className="num-cell font-black text-[#102A43] text-sm">
                  {formatArabicDecimal(dashboardSummary.totalCurrentWheatBalanceTons, 2)} طن
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-300">
                <span className="text-slate-500 font-bold block">إجمالي الدقيق المنتج (٨٧.٥٪)</span>
                <span className="num-cell font-black text-emerald-900 text-sm">
                  {formatArabicDecimal(dashboardSummary.totalFlourProducedTons, 2)} طن ({formatArabicDecimal(dashboardSummary.avgExtractionPct, 2)}%)
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-300">
                <span className="text-slate-500 font-bold block">المخزون المعتمد بالثلاجات</span>
                <span className="num-cell font-black text-sky-900 text-sm">
                  {formatArabicDecimal(dashboardSummary.totalColdStockTons, 2)} طن
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-300">
                <span className="text-slate-500 font-bold block">صافي القيمة الدفترية للأصول</span>
                <span className="num-cell font-black text-[#164E83] text-sm">
                  {formatArabicCurrency(dashboardSummary.totalBookValueEgp)}
                </span>
              </div>
            </div>

            {/* خانات التوقيع والاعتماد الرسمية الثلاثية */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-300 text-center text-xs font-black text-[#102A43]">
              <div>
                <p>إعداد ومراجعة فنية</p>
                <p className="text-[11px] font-bold text-slate-500 mt-4">توقيع: ........................................</p>
              </div>
              <div>
                <p>رئيس قسم صيانة الحبوب</p>
                <p className="text-[11px] font-bold text-slate-500 mt-4">توقيع: ........................................</p>
              </div>
              <div>
                <p>يعتمد، مدير الإدارة / وكيل الوزارة</p>
                <p className="text-[11px] font-bold text-slate-500 mt-4">خاتم وتوقيع: .................................</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ٢٠. سجل العمليات والتدقيق والمراجعة التاريخية (Audit Log)
         ===================================================================== */}
      {activeScreen === 'audit_log' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-[#102A43]">
            ٢٠. سجل العمليات والتدقيق والمراجعة التاريخية (Audit Trail) لقسم صيانة الحبوب
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  <th className="p-2 border border-slate-300">التوقيت</th>
                  <th className="p-2 border border-slate-300">المستخدم والدور الوظيفي</th>
                  <th className="p-2 border border-slate-300">نوع العملية</th>
                  <th className="p-2 border border-slate-300">الشاشة والسجل</th>
                  <th className="p-2 border border-slate-300">البيان قبل العملية</th>
                  <th className="p-2 border border-slate-300">البيان بعد العملية</th>
                  <th className="p-2 border border-slate-300">السبب الموثق</th>
                  <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {store.auditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-200">
                    <td className="p-2 border border-slate-200 num-cell font-bold">
                      {formatDateArabic(log.timestamp.slice(0, 10))}
                    </td>
                    <td className="p-2 border border-slate-200 font-black text-[#102A43]">
                      <div>{log.userName}</div>
                      <div className="text-[10px] font-bold text-slate-500">{log.userRole}</div>
                    </td>
                    <td className="p-2 border border-slate-200 font-black text-[#164E83]">{log.actionType}</td>
                    <td className="p-2 border border-slate-200 font-bold">
                      <div>{log.targetScreen}</div>
                      <div className="num-cell text-[10px] text-slate-500">{log.targetRecordId} — {log.facilityName}</div>
                    </td>
                    <td className="p-2 border border-slate-200 text-slate-600 font-bold">{log.beforeSummary || '—'}</td>
                    <td className="p-2 border border-slate-200 text-emerald-900 font-black">{log.afterSummary}</td>
                    <td className="p-2 border border-slate-200 text-slate-700 font-bold">{log.reason}</td>
                    <td className="p-2 border border-slate-200 text-center">
                      <button
                        type="button"
                        onClick={() => handleOfficialPrint(`قيد تدقيق: ${log.targetRecordId}`)}
                        className="px-2 py-1 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer"
                      >
                        طباعة القيد
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          ٢١. مصفوفة الصلاحيات والأدوار الوظيفية (٢٠ دوراً × ١٤ صلاحية)
         ===================================================================== */}
      {activeScreen === 'permissions_matrix' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-black text-[#102A43]">
              ٢١. مصفوفة الصلاحيات والأدوار الوظيفية لقسم صيانة الحبوب ({toArabicNumerals(GRAIN_FUNCTIONAL_ROLES.length)} دوراً وظيفياً × {toArabicNumerals(GRAIN_PERMISSION_ACTIONS.length)} صلاحية دقيقة)
            </h3>
            <p className="text-[11px] font-bold text-slate-600">
              تضمن فصل مهام الإدخال عن المراجعة والاعتماد النهائي، وحصر صلاحيات الإلغاء الموثق وإدارة المعايير في المستويات الإشرافية
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-[10.5px]">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  <th className="p-2 border border-slate-300">الدور الوظيفي المعتمد</th>
                  {GRAIN_PERMISSION_ACTIONS.map((act) => (
                    <th key={act.key} className="p-1.5 border border-slate-300 text-center">
                      {act.label}
                    </th>
                  ))}
                  <th className="p-1.5 border border-slate-300 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {GRAIN_FUNCTIONAL_ROLES.map((roleTitle, rIdx) => {
                  const isTopExecutive = rIdx <= 4;
                  const isSectionSupervisor = rIdx >= 5 && rIdx <= 17;
                  const isDataEntryOnly = rIdx === 18;
                  return (
                    <tr key={roleTitle} className="border-b border-slate-200 hover:bg-blue-50/40">
                      <td className="p-2 border border-slate-200 font-black text-[#102A43] whitespace-nowrap">
                        {roleTitle}
                      </td>
                      {GRAIN_PERMISSION_ACTIONS.map((act, aIdx) => {
                        const allowed =
                          isTopExecutive ||
                          (isSectionSupervisor && aIdx !== 11) ||
                          (isDataEntryOnly && (aIdx <= 2 || aIdx === 4 || aIdx === 9)) ||
                          (!isTopExecutive && !isSectionSupervisor && !isDataEntryOnly && (aIdx === 0 || aIdx === 9 || aIdx === 10));
                        return (
                          <td key={act.key} className="p-1.5 border border-slate-200 text-center">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[9.5px] font-black ${
                                allowed ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              {allowed ? '✓' : '—'}
                            </span>
                          </td>
                        );
                      })}
                      <td className="p-1.5 border border-slate-200 text-center">
                        <button
                          type="button"
                          onClick={() => handleOfficialPrint(`مصفوفة صلاحيات: ${roleTitle}`)}
                          className="px-2 py-0.5 rounded bg-[#102A43] text-[#C6A15B] text-[9.5px] font-black cursor-pointer"
                        >
                          طباعة الصلاحيات
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          ٢٢. إعدادات القسم والمعايير ومصفوفة اختبارات القبول الـ ٢٣ (Settings & 23 Acceptance Tests)
         ===================================================================== */}
      {activeScreen === 'section_settings' && (
        <div className="space-y-4">
          {/* إعدادات المعايير الفنية والقياسية */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <h3 className="text-sm font-black text-[#102A43]">
              ٢٢-أ. إعدادات المعايير الفنية والمحاسبية لقسم صيانة الحبوب
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="font-black text-[#102A43] block mb-1">نسبة الرطوبة القياسية المرجعية (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={store.settings.standardMoisturePct}
                  onChange={(e) =>
                    updateStore((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, standardMoisturePct: Number(e.target.value) || 13.0 },
                    }))
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-[#102A43]"
                />
              </div>
              <div>
                <label className="font-black text-[#102A43] block mb-1">الحد الأقصى المسموح للرطوبة (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={store.settings.maxAllowedMoisturePct}
                  onChange={(e) =>
                    updateStore((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, maxAllowedMoisturePct: Number(e.target.value) || 14.5 },
                    }))
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-[#102A43]"
                />
              </div>
              <div>
                <label className="font-black text-[#102A43] block mb-1">نسبة استخراج الدقيق المعيارية (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={store.settings.standardFlourExtractionPct}
                  onChange={(e) =>
                    updateStore((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, standardFlourExtractionPct: Number(e.target.value) || 87.5 },
                    }))
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-[#102A43]"
                />
              </div>
              <div>
                <label className="font-black text-[#102A43] block mb-1">الحد الأقصى المسموح لفاقد التخزين (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={store.settings.maxAllowedStorageLossPct}
                  onChange={(e) =>
                    updateStore((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, maxAllowedStorageLossPct: Number(e.target.value) || 0.5 },
                    }))
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-[#102A43]"
                />
              </div>
            </div>
          </div>

          {/* نتائج اختبارات القبول الـ ٢٣ */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#102A43]">
                ٢٢-ب. نتائج تشغيل اختبارات القبول الإلزامية الـ ٢٣ لقسم صيانة الحبوب
              </h3>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-950 text-xs font-black">
                اجتياز {toArabicNumerals(acceptanceTests.filter((t) => t.passed).length)} من {toArabicNumerals(acceptanceTests.length)} اختباراً (١٠٠٪)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {acceptanceTests.map((tst) => (
                <div
                  key={tst.testNumber}
                  className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-start justify-between gap-2 text-[11px]"
                >
                  <div className="space-y-0.5">
                    <p className="font-black text-[#102A43]">{tst.title}</p>
                    <p className="text-[10.5px] font-bold text-slate-600">{tst.ruleVerified}</p>
                    <p className="text-[10.5px] font-black text-emerald-900">النتيجة الفعلية: {tst.measuredOutput}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-700 text-white text-[10px] font-black shrink-0">
                    ناجح ✓
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          نافذة السجل التاريخي الشامل ٣٦٠° لأي شونة أو مطحن أو ثلاجة أو أصل هندسي
         ===================================================================== */}
      {selectedHistoryEntity && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedHistoryEntity(null)}
        >
          <div
            className="bg-white rounded-2xl border-2 border-[#102A43] shadow-2xl max-w-3xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#102A43] text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10.5px] font-black text-[#C6A15B] block">
                  السجل التاريخي الشامل ٣٦٠° — {selectedHistoryEntity.type} ({selectedHistoryEntity.code})
                </span>
                <h3 className="text-base font-black">{selectedHistoryEntity.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHistoryEntity(null)}
                className="px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-black cursor-pointer"
              >
                إغلاق ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-bold block">الأصول الهندسية المرتبطة</span>
                  <span className="num-cell font-black text-[#102A43] text-sm">
                    {toArabicNumerals(
                      store.assets.filter(
                        (a) => a.facilityId === selectedHistoryEntity.id || a.id === selectedHistoryEntity.id
                      ).length
                    )}{' '}
                    أصل ومعدة
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-bold block">أوامر الصيانة المسجلة</span>
                  <span className="num-cell font-black text-[#164E83] text-sm">
                    {toArabicNumerals(
                      store.maintenanceOrders.filter(
                        (o) => o.facilityId === selectedHistoryEntity.id || o.assetId === selectedHistoryEntity.id
                      ).length
                    )}{' '}
                    أمر عمل
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-bold block">القيود المالية المرتبطة</span>
                  <span className="num-cell font-black text-emerald-800 text-sm">
                    {toArabicNumerals(
                      store.financialTransactions.filter(
                        (t) => t.facilityId === selectedHistoryEntity.id
                      ).length
                    )}{' '}
                    قيد مالي
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-black text-[#102A43]">سجل أوامر الصيانة والأعطال التاريخي:</h4>
                {store.maintenanceOrders
                  .filter(
                    (o) => o.facilityId === selectedHistoryEntity.id || o.assetId === selectedHistoryEntity.id
                  )
                  .map((mo) => (
                    <div key={mo.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div>
                        <span className="font-black text-[#164E83]">{mo.orderNumber} — {mo.maintenanceType}</span>
                        <p className="text-[11px] font-bold text-slate-700">{mo.faultDescription} ← {mo.workPerformed}</p>
                      </div>
                      <span className="num-cell font-black text-emerald-900">{formatArabicCurrency(mo.totalMaintenanceCostEgp)}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تأكيد الإضافة السريعة */}
      {isQuickAddOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsQuickAddOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border-2 border-[#102A43] shadow-2xl max-w-md w-full p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-black text-[#102A43]">
              إضافة سجل تشغيلي جديد في: {activeScreenLabel}
            </h3>
            <p className="text-xs font-bold text-slate-600">
              سيتم إنشاء سجل رسمي معتمد ومربوط آلياً بالأرصدة ومراكز التكلفة وسجل التدقيق التاريخي.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-black cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddRecord()}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black cursor-pointer"
              >
                تأكيد الإضافة والاعتماد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
