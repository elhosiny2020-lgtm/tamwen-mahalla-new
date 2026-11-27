'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Download,
  FileCheck2,
  FileText,
  Flame,
  Fuel,
  Gavel,
  LayoutDashboard,
  Package,
  Plus,
  Printer,
  Scale,
  Search,
  SearchCheck,
  Settings,
  ShieldAlert,
  ShoppingBag,
  Store,
  Truck,
  Warehouse,
  X,
} from 'lucide-react';
import { BakeryRecord, InspectionRecord, User } from '@/types';
import {
  ButaneDistributorMovementRecord,
  ButaneDistributorRecord,
  ButaneVillageAllocationRecord,
  ButaneWarehouseMovementRecord,
  ButaneWarehouseRecord,
  CommercialActivityRecord,
  CommercialEstablishmentRecord,
  CommercialLicenseRecord,
  CommercialSeizureRecord,
  CommercialSettlementRecord,
  CommercialViolationCatalogItem,
  CommercialViolationLineItem,
  CommercialViolationReportRecord,
  CommodityAvailabilityStatus,
  CommodityPriceObservationRecord,
  EstablishmentStatus,
  FuelStationDailyMovementRecord,
  FuelStationInspectionRecord,
  FuelStationRecord,
  InternalTradeSettings,
  MarketCommodityRecord,
  OwnershipType,
  PetroleumAllocationRecord,
  SeizureMovementRecord,
  SeizureMovementType,
  SettlementStatusType,
  TradeInspectionCampaignRecord,
  computeLicenseAlertStatus,
  factoryResetInternalTradeStore,
  generateInternalTradeSmartAlerts,
  loadButaneAllocations,
  loadButaneDistributorMovements,
  loadButaneDistributors,
  loadButaneWarehouseMovements,
  loadButaneWarehouses,
  loadCommercialActivities,
  loadCommercialEstablishments,
  loadCommercialLicenses,
  loadCommercialSeizures,
  loadCommercialSettlements,
  loadCommercialViolationCatalog,
  loadCommercialViolationReports,
  loadFuelInspections,
  loadFuelMovements,
  loadFuelStations,
  loadMarketCommodities,
  loadPetroleumAllocations,
  loadPriceObservations,
  loadSeizureMovements,
  loadTradeCampaigns,
  loadTradeSettings,
  saveButaneAllocations,
  saveButaneDistributorMovements,
  saveButaneDistributors,
  saveButaneWarehouseMovements,
  saveButaneWarehouses,
  saveCommercialActivities,
  saveCommercialEstablishments,
  saveCommercialLicenses,
  saveCommercialSeizures,
  saveCommercialSettlements,
  saveCommercialViolationReports,
  saveFuelInspections,
  saveFuelMovements,
  saveFuelStations,
  saveMarketCommodities,
  savePetroleumAllocations,
  savePriceObservations,
  saveSeizureMovements,
  saveTradeCampaigns,
  saveTradeSettings,
} from '@/lib/internal-trade-store';
import {
  formatArabicCurrency,
  formatArabicNumber,
  formatDateArabic,
  normalizeSearchText,
  toArabicNumerals,
} from '@/lib/utils';
import { exportCsvUtf8Bom } from '@/lib/debts-data';
import { round2 } from '@/lib/debts-engine';
import AnimatedStatCard from './AnimatedStatCard';
import SmartAutoFitTable, { SmartTableColumn } from './SmartAutoFitTable';
import { OfficialPrintModal } from './debts/DebtsSharedUi';
import InternalTradeEnergyAndComparisonView from './trade/InternalTradeEnergyAndComparisonView';
import InternalTradeAlertsReportsSettingsView from './trade/InternalTradeAlertsReportsSettingsView';
import FactoryResetButton from './FactoryResetButton';
import BakeryInspectionModule from './BakeryInspectionModule';
import {
  EditableFieldSpec,
  TableActionButtons,
  UniversalCrudModal,
} from './trade/TradeSharedCrudUi';

export type InternalTradeScreenId =
  | 'dashboard'
  | 'establishments'
  | 'activities'
  | 'licenses'
  | 'campaigns'
  | 'violations'
  | 'field_inspection'
  | 'field_violations'
  | 'settlements'
  | 'seizures'
  | 'markets'
  | 'butane_management'
  | 'butane_beneficiaries'
  | 'petroleum_management'
  | 'petroleum_beneficiaries'
  | 'fuel_stations'
  | 'butane_warehouses'
  | 'butane_distributors'
  | 'village_comparison'
  | 'smart_alerts'
  | 'reports_center'
  | 'settings_and_schema';

interface NavGroupConfig {
  groupId: string;
  groupTitle: string;
  items: {
    id: InternalTradeScreenId;
    num: number;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

const INTERNAL_TRADE_NAV_GROUPS: NavGroupConfig[] = [
  {
    groupId: 'grp-core',
    groupTitle: 'القيادة والمنشآت والتراخيص',
    items: [
      { id: 'dashboard', num: 1, label: '١. لوحة التحكم الرئيسية', icon: LayoutDashboard },
      { id: 'establishments', num: 2, label: '٢. سجل المحلات والمنشآت التجارية', icon: Store },
      { id: 'activities', num: 3, label: '٣. الأنشطة التجارية', icon: Briefcase },
      { id: 'licenses', num: 4, label: '٤. التراخيص التجارية', icon: FileCheck2 },
    ],
  },
  {
    groupId: 'grp-oversight',
    groupTitle: 'الحملات والمخالفات والمضبوطات والأسواق',
    items: [
      { id: 'campaigns', num: 5, label: '٥. الحملات التموينية التجارية', icon: SearchCheck },
      { id: 'violations', num: 6, label: '٦. المخالفات والمحاضر التجارية', icon: FileText },
      { id: 'field_inspection', num: 7, label: '٧. الحملات والتفتيش التمويني', icon: SearchCheck },
      { id: 'field_violations', num: 8, label: '٨. المخالفات والمحاضر والنيابات', icon: Gavel },
      { id: 'settlements', num: 9, label: '٩. التصالحات والتسويات', icon: Scale },
      { id: 'seizures', num: 10, label: '١٠. المضبوطات والتحفظات', icon: Package },
      { id: 'markets', num: 11, label: '١١. متابعة الأسواق والأسعار', icon: ShoppingBag },
    ],
  },
  {
    groupId: 'grp-energy',
    groupTitle: 'تداول البوتاجاز والمواد البترولية والمحطات',
    items: [
      { id: 'butane_management', num: 12, label: '١٢. إدارة أسطوانات البوتاجاز', icon: Flame },
      { id: 'butane_beneficiaries', num: 13, label: '١٣. نصيب الفرد والمستفيدون من البوتاجاز', icon: Flame },
      { id: 'petroleum_management', num: 14, label: '١٤. إدارة المواد البترولية', icon: Fuel },
      { id: 'petroleum_beneficiaries', num: 15, label: '١٥. نصيب الفرد والمستفيدون من المواد البترولية', icon: Fuel },
      { id: 'fuel_stations', num: 16, label: '١٦. محطات الوقود والرقابة اليومية', icon: Fuel },
      { id: 'butane_warehouses', num: 17, label: '١٧. مستودعات البوتاجاز', icon: Warehouse },
      { id: 'butane_distributors', num: 18, label: '١٨. سجل الموزعين', icon: Truck },
    ],
  },
  {
    groupId: 'grp-analytics',
    groupTitle: 'المقارنات والتنبيهات والتقارير والإعدادات',
    items: [
      { id: 'village_comparison', num: 19, label: '١٩. المقارنة بين القرى والوحدات', icon: BarChart3 },
      { id: 'smart_alerts', num: 20, label: '٢٠. التنبيهات الذكية', icon: ShieldAlert },
      { id: 'reports_center', num: 21, label: '٢١. مركز التقارير والطباعة', icon: Printer },
      { id: 'settings_and_schema', num: 22, label: '٢٢. الإعدادات وقوائم البيانات', icon: Settings },
    ],
  },
];

interface InternalTradeModuleProps {
  currentUser: User;
  todayRef: string;
  initialScreen?: InternalTradeScreenId;
  bakeries?: BakeryRecord[];
  inspections?: InspectionRecord[];
  onAddInspection?: (record: Omit<InspectionRecord, 'id'>) => void;
  onUpdateInspectionStatus?: (id: string, status: InspectionRecord['status']) => void;
  onSelectBakeryDetails?: (bakery: BakeryRecord) => void;
}

export default function InternalTradeModule({
  currentUser,
  todayRef,
  initialScreen = 'dashboard',
  bakeries = [],
  inspections = [],
  onAddInspection,
  onUpdateInspectionStatus,
  onSelectBakeryDetails,
}: InternalTradeModuleProps) {
  const [activeScreen, setActiveScreen] = useState<InternalTradeScreenId>(initialScreen);
  const [screenSearchQuery, setScreenSearchQuery] = useState<string>('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'grp-core': true,
    'grp-oversight': true,
    'grp-energy': true,
    'grp-analytics': true,
  });

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setActiveScreen(initialScreen);
    });
    return () => cancelAnimationFrame(frame);
  }, [initialScreen]);

  // حالة جميع قواعد بيانات قسم التجارة الداخلية
  const [settings, setSettings] = useState<InternalTradeSettings>(() => loadTradeSettings());
  const [establishments, setEstablishments] = useState<CommercialEstablishmentRecord[]>(() =>
    loadCommercialEstablishments()
  );
  const [activities, setActivities] = useState<CommercialActivityRecord[]>(() =>
    loadCommercialActivities()
  );
  const [licenses, setLicenses] = useState<CommercialLicenseRecord[]>(() =>
    loadCommercialLicenses()
  );
  const [campaigns, setCampaigns] = useState<TradeInspectionCampaignRecord[]>(() =>
    loadTradeCampaigns()
  );
  const [violationCatalog] = useState<CommercialViolationCatalogItem[]>(() =>
    loadCommercialViolationCatalog()
  );
  const [reports, setReports] = useState<CommercialViolationReportRecord[]>(() =>
    loadCommercialViolationReports()
  );
  const [settlements, setSettlements] = useState<CommercialSettlementRecord[]>(() =>
    loadCommercialSettlements()
  );
  const [seizures, setSeizures] = useState<CommercialSeizureRecord[]>(() =>
    loadCommercialSeizures()
  );
  const [seizureMovements, setSeizureMovements] = useState<SeizureMovementRecord[]>(() =>
    loadSeizureMovements()
  );
  const [commodities] = useState<MarketCommodityRecord[]>(() => loadMarketCommodities());
  const [priceObservations, setPriceObservations] = useState<CommodityPriceObservationRecord[]>(() =>
    loadPriceObservations()
  );
  const [butaneAllocations, setButaneAllocations] = useState<ButaneVillageAllocationRecord[]>(() =>
    loadButaneAllocations()
  );
  const [petroleumAllocations, setPetroleumAllocations] = useState<PetroleumAllocationRecord[]>(() =>
    loadPetroleumAllocations()
  );
  const [fuelStations, setFuelStations] = useState<FuelStationRecord[]>(() => loadFuelStations());
  const [fuelMovements, setFuelMovements] = useState<FuelStationDailyMovementRecord[]>(() =>
    loadFuelMovements()
  );
  const [fuelInspections, setFuelInspections] = useState<FuelStationInspectionRecord[]>(() =>
    loadFuelInspections()
  );
  const [butaneWarehouses, setButaneWarehouses] = useState<ButaneWarehouseRecord[]>(() =>
    loadButaneWarehouses()
  );
  const [butaneWarehouseMovements, setButaneWarehouseMovements] = useState<ButaneWarehouseMovementRecord[]>(() =>
    loadButaneWarehouseMovements()
  );
  const [butaneDistributors, setButaneDistributors] = useState<ButaneDistributorRecord[]>(() =>
    loadButaneDistributors()
  );
  const [butaneDistributorMovements, setButaneDistributorMovements] = useState<ButaneDistributorMovementRecord[]>(() =>
    loadButaneDistributorMovements()
  );

  const [closedAlertIds, setClosedAlertIds] = useState<Record<string, { closedAt: string; notes: string }>>({});
  const [toastMessage, setToastMessage] = useState<string>('');

  // فلاتر السجلات عند الضغط على البطاقات الإحصائية في لوحة التحكم
  const [estFilterMode, setEstFilterMode] = useState<'ALL' | 'LICENSED' | 'UNLICENSED' | 'MISMATCHED'>('ALL');
  const [licFilterMode, setLicFilterMode] = useState<'ALL' | 'VALID' | 'EXPIRING' | 'EXPIRED'>('ALL');
  const [campFilterMode, setCampFilterMode] = useState<'ALL' | 'DONE' | 'ONGOING'>('ALL');
  const [repFilterMode, setRepFilterMode] = useState<'ALL' | 'SETTLED' | 'UNSETTLED'>('ALL');
  const [tableSearch, setTableSearch] = useState<string>('');

  // النوافذ المنبثقة للإضافة والتفاصيل
  const [showAddEstModal, setShowAddEstModal] = useState<boolean>(false);
  const [selectedEstDetails, setSelectedEstDetails] = useState<CommercialEstablishmentRecord | null>(null);
  const [showAddLicModal, setShowAddLicModal] = useState<boolean>(false);
  const [showAddCampaignModal, setShowAddCampaignModal] = useState<boolean>(false);
  const [selectedCampaignReport, setSelectedCampaignReport] = useState<TradeInspectionCampaignRecord | null>(null);
  const [showAddViolationModal, setShowAddViolationModal] = useState<boolean>(false);
  const [showAddSettlementModal, setShowAddSettlementModal] = useState<boolean>(false);
  const [showAddSeizureMovementModal, setShowAddSeizureMovementModal] = useState<boolean>(false);
  const [showInventoryPrintModal, setShowInventoryPrintModal] = useState<boolean>(false);
  const [showAddPriceObsModal, setShowAddPriceObsModal] = useState<boolean>(false);
  const [crudModalState, setCrudModalState] = useState<{
    mode: 'view' | 'edit';
    title: string;
    record: Record<string, unknown>;
    fields: EditableFieldSpec[];
    onSave?: (updated: Record<string, unknown>) => void;
  } | null>(null);

  const notify = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3800);
  };

  // تحديث وحفظ الإعدادات
  const handleUpdateSettings = (next: InternalTradeSettings) => {
    setSettings(next);
    saveTradeSettings(next);
  };

  // التنبيهات الذكية المحسوبة حياً
  const smartAlerts = useMemo(
    () =>
      generateInternalTradeSmartAlerts({
        establishments,
        licenses,
        campaigns,
        reports,
        settlements,
        seizures,
        priceObservations,
        fuelStations,
        fuelMovements,
        butaneWarehouses,
        settings,
        todayRef,
      }),
    [
      establishments,
      licenses,
      campaigns,
      reports,
      settlements,
      seizures,
      priceObservations,
      fuelStations,
      fuelMovements,
      butaneWarehouses,
      settings,
      todayRef,
    ]
  );

  // ==================== المؤشرات الإحصائية الـ ٢٠ للوحة التحكم الرئيسية ====================
  const dashboardKpis = useMemo(() => {
    const totalEstablishments = establishments.length;
    const licensedEstablishments = establishments.filter((e) => e.isLicensed).length;
    const unlicensedEstablishments = totalEstablishments - licensedEstablishments;

    let validLicenses = 0;
    let expiringLicenses = 0;
    let expiredLicenses = 0;
    licenses.forEach((lic) => {
      const ev = computeLicenseAlertStatus(
        lic.expiryDate,
        true,
        todayRef,
        settings.licenseAlertThresholdsDays
      );
      if (ev.status === 'منتهي') expiredLicenses++;
      else if (ev.status.includes('قارب')) expiringLicenses++;
      else validLicenses++;
    });

    const totalActivities = activities.length;
    const completedCampaigns = campaigns.filter((c) => c.status === 'منفذة').length;
    const ongoingCampaigns = campaigns.filter((c) => c.status === 'جاري تنفيذها').length;
    const totalViolationReports = reports.length;
    const settledReports = reports.filter((r) => r.isSettled || r.reportStatus === 'متصالح').length;
    const unsettledReports = totalViolationReports - settledReports;
    const totalFinesAndDueAmountEgp = reports.reduce((acc, r) => acc + r.totalFineAmountEgp, 0);
    const totalCollectedSettlementsEgp = settlements.reduce((acc, s) => acc + s.paidAmountEgp, 0);
    const totalSeizuresRecords = seizures.length;
    const totalActiveCustodyHolds = seizures.filter((s) => s.currentActualBalance > 0).length;
    const followedUpEstablishments = establishments.filter((e) => Boolean(e.lastInspectionDate)).length;
    const monitoredMarketsCount = new Set(priceObservations.map((o) => o.marketName)).size;
    const fuelStationsCount = fuelStations.length;
    const butaneWarehousesCount = butaneWarehouses.length;
    const butaneDistributorsCount = butaneDistributors.length;

    return {
      totalEstablishments,
      licensedEstablishments,
      unlicensedEstablishments,
      validLicenses,
      expiringLicenses,
      expiredLicenses,
      totalActivities,
      completedCampaigns,
      ongoingCampaigns,
      totalViolationReports,
      settledReports,
      unsettledReports,
      totalFinesAndDueAmountEgp,
      totalCollectedSettlementsEgp,
      totalSeizuresRecords,
      totalActiveCustodyHolds,
      followedUpEstablishments,
      monitoredMarketsCount,
      fuelStationsCount,
      butaneWarehousesCount,
      butaneDistributorsCount,
    };
  }, [
    establishments,
    licenses,
    todayRef,
    settings.licenseAlertThresholdsDays,
    activities,
    campaigns,
    reports,
    settlements,
    seizures,
    priceObservations,
    fuelStations,
    butaneWarehouses,
    butaneDistributors,
  ]);

  // ==================== نماذج الإضافة والتحديث ====================

  // ١. إضافة منشأة تجارية جديدة (٢٥ حقلاً + البطاقة الضريبية والسجل التجاري ورقم الترخيص وتاريخ انتهائها)
  const [estName, setEstName] = useState('');
  const [estOwner, setEstOwner] = useState('');
  const [estNatId, setEstNatId] = useState('28205121601988');
  const [estPhone, setEstPhone] = useState('01005566778');
  const [estManager, setEstManager] = useState('');
  const [estOwnership, setEstOwnership] = useState<OwnershipType>('ملك');
  const [estVillage, setEstVillage] = useState('صفط تراب');
  const [estLocalUnit, setEstLocalUnit] = useState('الوحدة المحلية بصفط تراب');
  const [estStreet, setEstStreet] = useState('شارع الجمهورية');
  const [estCategory, setEstCategory] = useState(settings.establishmentCategories[0] || 'سوبر ماركت');
  const [estCommReg, setEstCommReg] = useState('98412 محلة');
  const [estCommRegExp, setEstCommRegExp] = useState('2028-05-01');
  const [estTaxCard, setEstTaxCard] = useState('541-852-963');
  const [estTaxCardExp, setEstTaxCardExp] = useState('2028-05-01');
  const [estLicenseNo, setEstLicenseNo] = useState('ر.ت/٢٠٢٦/٥٩٠');
  const [estLicenseExp, setEstLicenseExp] = useState('2028-05-01');
  const [estIsLicensed, setEstIsLicensed] = useState(true);
  const [estStatus, setEstStatus] = useState<EstablishmentStatus>('تعمل');
  const [estPrimaryAct, setEstPrimaryAct] = useState(activities[0]?.id || 'act-01');
  const [estSecondaryActs, setEstSecondaryActs] = useState<string[]>(['act-02']);
  const [estHasMismatch, setEstHasMismatch] = useState(false);
  const [estMismatchNote, setEstMismatchNote] = useState('');

  const handleCreateEstablishment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!estName.trim() || !estOwner.trim()) return;
    const seq = establishments.length + 1;
    const newEst: CommercialEstablishmentRecord = {
      id: `est-${Date.now()}`,
      autoCode: `TRD-GH-2026-${String(seq).padStart(3, '0')}`,
      fileNumber: `ملف-ت/${4100 + seq * 7}`,
      name: estName.trim(),
      ownerName: estOwner.trim(),
      ownerNationalId: estNatId,
      phone: estPhone,
      email: 'merchant@supply-gh.gov.eg',
      managerName: estManager.trim() || estOwner.trim(),
      managerPhone: estPhone,
      ownershipType: estOwnership,
      detailedAddress: `${estStreet} — قرية ${estVillage}`,
      governorate: 'الغربية',
      districtCenter: 'مركز المحلة الكبرى',
      supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
      village: estVillage,
      localUnit: estLocalUnit,
      street: estStreet,
      buildingNumber: `${seq * 3}`,
      geoLocation: '30.9450, 31.1820',
      activityStartDate: todayRef,
      commercialRegisterNumber: estCommReg,
      commercialRegisterExpiryDate: estCommRegExp,
      taxCardNumber: estTaxCard,
      taxCardExpiryDate: estTaxCardExp,
      licenseNumber: estIsLicensed ? estLicenseNo : 'بدون ترخيص',
      licenseExpiryDate: estIsLicensed ? estLicenseExp : '—',
      status: estStatus,
      category: estCategory,
      isLicensed: estIsLicensed,
      primaryActivityId: estPrimaryAct,
      secondaryActivityIds: estSecondaryActs,
      hasUnregisteredOrMismatchedActivity: estHasMismatch,
      unregisteredActivityDetails: estHasMismatch ? estMismatchNote : undefined,
      lastInspectionDate: todayRef,
      notes: 'منشأة مضافة حديثاً بالسجل الرسمي',
      attachments: ['ملف_المنشأة_الرسمي.pdf'],
      createdAt: new Date().toISOString(),
    };
    const next = [newEst, ...establishments];
    setEstablishments(next);
    saveCommercialEstablishments(next);
    setShowAddEstModal(false);
    setEstName('');
    setEstOwner('');
    notify(`تم قيد المنشأة التجارية (${newEst.name}) بكود تلقائي (${newEst.autoCode}) وربط أنشطتها بنجاح.`);
  };

  // ٢. إضافة ترخيص تجاري جديد مرتبط بالجهة المختصة الفعلية
  const [licNumber, setLicNumber] = useState(`ر.ت/٢٠٢٦/${Math.floor(500 + licenses.length * 19)}`);
  const [licEstId, setLicEstId] = useState(establishments[0]?.id || 'est-101');
  const [licTypeIdx, setLicTypeIdx] = useState(0);
  const [licExpiryDate, setLicExpiryDate] = useState('2026-12-20');

  const handleCreateLicense = (e: React.FormEvent) => {
    e.preventDefault();
    const targetEst = establishments.find((x) => x.id === licEstId) || establishments[0];
    if (!targetEst) return;
    const chosenType = settings.licenseTypes[licTypeIdx] || settings.licenseTypes[0];
    const evalStatus = computeLicenseAlertStatus(
      licExpiryDate,
      true,
      todayRef,
      settings.licenseAlertThresholdsDays
    );
    const primAct = activities.find((a) => a.id === targetEst.primaryActivityId);

    const newLic: CommercialLicenseRecord = {
      id: `lic-${Date.now()}`,
      licenseNumber: licNumber,
      establishmentId: targetEst.id,
      establishmentCode: targetEst.autoCode,
      establishmentName: targetEst.name,
      ownerName: targetEst.ownerName,
      taxCardNumber: targetEst.taxCardNumber,
      taxCardExpiryDate: targetEst.taxCardExpiryDate,
      commercialRegisterNumber: targetEst.commercialRegisterNumber,
      commercialRegisterExpiryDate: targetEst.commercialRegisterExpiryDate,
      licenseType: chosenType.title,
      competentAuthority: chosenType.competentAuthority,
      licensedActivityName: primAct?.name || 'نشاط تجاري معتمد',
      issueDate: todayRef,
      expiryDate: licExpiryDate,
      status: evalStatus.status,
      fileNumber: targetEst.fileNumber,
      licenseImage: 'صورة_الترخيص_الرسمي.jpg',
      attachedDocuments: ['موافقة_الجهة_المختصة.pdf'],
      supplyAdministration: targetEst.supplyAdministration,
      village: targetEst.village,
      localUnit: targetEst.localUnit,
      responsibleEmployee: currentUser.fullName,
      lastReviewDate: todayRef,
      notes: `صادر عن ${chosenType.competentAuthority}`,
    };
    const next = [newLic, ...licenses];
    setLicenses(next);
    saveCommercialLicenses(next);
    setShowAddLicModal(false);
    notify(`تم تسجيل الترخيص (${newLic.licenseNumber}) وربطه بالجهة المختصة (${chosenType.competentAuthority}).`);
  };

  // ٣. إنشاء حملة تموينية جديدة
  const [cmpVillage, setCmpVillage] = useState('الهياتم');
  const [cmpType, setCmpType] = useState(settings.campaignTypes[0] || 'حملات متابعة الأسواق');
  const [cmpLeader, setCmpLeader] = useState(currentUser.fullName);
  const [cmpTargeted, setCmpTargeted] = useState(15);
  const [cmpInspected, setCmpInspected] = useState(14);
  const [cmpSummary, setCmpSummary] = useState('مرور ميداني شامل وفحص الفواتير والإعلان عن الأسعار');

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    const seq = campaigns.length + 15;
    const newCmp: TradeInspectionCampaignRecord = {
      id: `cmp-${Date.now()}`,
      campaignNumber: `CMP-TRD-2026-0${seq}`,
      campaignDate: todayRef,
      startTime: '09:30',
      endTime: '15:00',
      supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
      campaignScope: `أسواق ومحال قرية ${cmpVillage}`,
      village: cmpVillage,
      localUnit: `الوحدة المحلية بـ ${cmpVillage}`,
      targetStreetsAndAreas: `الشارع العمومي ومنطقة الأسواق بـ ${cmpVillage}`,
      campaignType: cmpType,
      campaignLeader: cmpLeader,
      campaignMembers: ['مفتش/ سامي عبد القادر', 'مفتش/ طارق أبو زيد'],
      participatingAuthorities: ['إدارة تموين مركز المحلة الكبرى', 'مباحث التموين'],
      targetedEstablishmentsCount: cmpTargeted,
      inspectedEstablishmentsCount: cmpInspected,
      violationsCount: 0,
      reportsCount: 0,
      seizuresCount: 0,
      status: 'منفذة',
      resultSummary: cmpSummary,
      notes: 'تم قيد الحملة وربطها بسجل المحاضر',
      attachments: ['تقرير_الحملة.pdf'],
    };
    const next = [newCmp, ...campaigns];
    setCampaigns(next);
    saveTradeCampaigns(next);
    setShowAddCampaignModal(false);
    notify(`تم إنشاء الحملة التموينية (${newCmp.campaignNumber}) بنجاح.`);
  };

  // ٤. تسجيل محضر مخالفة تجارية متعدد البنود (مرتبط بالحملة والمنشأة والسند القانوني)
  const [vrReportNo, setVrReportNo] = useState(`جنحة-ت-٢٠٢٦-${Math.floor(1170 + reports.length * 9)}`);
  const [vrCampaignId, setVrCampaignId] = useState(campaigns[0]?.id || '');
  const [vrEstId, setVrEstId] = useState(establishments[0]?.id || 'est-101');
  const [vrAuthority, setVrAuthority] = useState('إدارة تموين مركز المحلة الكبرى');
  const [vrInspector, setVrInspector] = useState('مفتش/ سامي عبد القادر');
  const [vrDraftItems, setVrDraftItems] = useState<CommercialViolationLineItem[]>(() => {
    const first = violationCatalog[0];
    return [
      {
        id: 'vli-1',
        catalogId: first.id,
        groupTitle: first.groupTitle,
        violationTitle: first.title,
        detailedDescription: first.title,
        seizedQuantity: 0,
        unit: first.unit,
        fineAmountEgp: first.hasAutomaticFinancialFine ? first.defaultBaseFineEgp : 0,
        legalBasis: first.legalBasisDecree,
        competentAuthority: first.competentAuthority,
        approvedMeasure: first.approvedPenaltyMeasure,
      },
    ];
  });

  const handleAddViolationLine = () => {
    const first = violationCatalog[0];
    setVrDraftItems((prev) => [
      ...prev,
      {
        id: `vli-${Date.now()}-${prev.length + 1}`,
        catalogId: first.id,
        groupTitle: first.groupTitle,
        violationTitle: first.title,
        detailedDescription: first.title,
        seizedQuantity: 0,
        unit: first.unit,
        fineAmountEgp: first.hasAutomaticFinancialFine ? first.defaultBaseFineEgp : 0,
        legalBasis: first.legalBasisDecree,
        competentAuthority: first.competentAuthority,
        approvedMeasure: first.approvedPenaltyMeasure,
      },
    ]);
  };

  const handleCreateViolationReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (reports.some((r) => r.reportNumber.trim() === vrReportNo.trim())) {
      notify('تنبيه: رقم المحضر مسجل مسبقاً؛ يمنع تكرار أرقام المحاضر.');
      return;
    }
    const targetEst = establishments.find((x) => x.id === vrEstId) || establishments[0];
    const targetCmp = campaigns.find((c) => c.id === vrCampaignId);
    if (!targetEst) return;

    const totalFine = vrDraftItems.reduce((acc, i) => acc + (Number(i.fineAmountEgp) || 0), 0);
    const seizedText =
      vrDraftItems
        .filter((i) => i.seizedQuantity > 0)
        .map((i) => `${i.seizedQuantity} ${i.unit}`)
        .join(' + ') || 'لا توجد مضبوطات عينية';

    const newRep: CommercialViolationReportRecord = {
      id: `cvr-${Date.now()}`,
      reportNumber: vrReportNo,
      campaignId: targetCmp?.id,
      campaignNumber: targetCmp?.campaignNumber,
      reportDate: todayRef,
      reportTime: '11:45',
      establishmentId: targetEst.id,
      establishmentCode: targetEst.autoCode,
      establishmentName: targetEst.name,
      ownerName: targetEst.ownerName,
      activityType: targetEst.category,
      supplyAdministration: targetEst.supplyAdministration,
      village: targetEst.village,
      localUnit: targetEst.localUnit,
      issuingAuthority: vrAuthority,
      inspectorName: vrInspector,
      competentCaseNumber: `${Math.floor(18600 + reports.length * 15)} جنح المحلة ٢٠٢٦`,
      items: vrDraftItems,
      totalSeizedQuantitySummary: seizedText,
      totalFineAmountEgp: totalFine,
      legalBasisSummary: vrDraftItems.map((i) => i.legalBasis).join(' | '),
      reportStatus: 'معتمد',
      isSettled: false,
      attachments: ['صورة_المحضر_الرسمي.pdf'],
      notes: `محضر متعدد البنود (${vrDraftItems.length} مخالفة)`,
    };

    const nextReps = [newRep, ...reports];
    setReports(nextReps);
    saveCommercialViolationReports(nextReps);

    if (targetCmp) {
      const nextCmps = campaigns.map((c) =>
        c.id === targetCmp.id
          ? {
              ...c,
              reportsCount: c.reportsCount + 1,
              violationsCount: c.violationsCount + vrDraftItems.length,
            }
          : c
      );
      setCampaigns(nextCmps);
      saveTradeCampaigns(nextCmps);
    }

    setShowAddViolationModal(false);
    notify(`تم تحرير وقيد المحضر (${newRep.reportNumber}) بـ ${toArabicNumerals(vrDraftItems.length)} بنود مخالفات وربطه بالحملة.`);
  };

  // ٥. تسجيل تصالح وتحصيل فعلي بموجب إيصال رسمي
  const [stlReportId, setStlReportId] = useState(reports[0]?.id || 'cvr-401');
  const [stlApprovedAmt, setStlApprovedAmt] = useState(25000);
  const [stlPaidAmt, setStlPaidAmt] = useState(25000);
  const [stlReceiptNo, setStlReceiptNo] = useState('إيصال-حكومي-٩٩٥١٠٠');
  const [stlStatus, setStlStatus] = useState<SettlementStatusType>('تم السداد');

  const handleCreateSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    const targetRep = reports.find((r) => r.id === stlReportId) || reports[0];
    if (!targetRep) return;

    if ((stlStatus === 'تم السداد' || stlStatus === 'مغلق') && !stlReceiptNo.trim()) {
      notify('قاعدة إلزامية: لا يتم اعتبار المبلغ محصلاً أو إغلاق المحضر بالتصالح إلا بعد إدخال رقم إيصال السداد الرسمي.');
      return;
    }

    const rem = Math.max(0, stlApprovedAmt - stlPaidAmt);
    const newStl: CommercialSettlementRecord = {
      id: `stl-${Date.now()}`,
      reportId: targetRep.id,
      reportNumber: targetRep.reportNumber,
      settlementRequestNumber: `طلب-تصالح/٢٠٢٦/${320 + settlements.length}`,
      establishmentId: targetRep.establishmentId,
      establishmentName: targetRep.establishmentName,
      traderName: targetRep.ownerName,
      violationTypeSummary: targetRep.items.map((i) => i.violationTitle).join(' + '),
      supplyAdministration: targetRep.supplyAdministration,
      village: targetRep.village,
      localUnit: targetRep.localUnit,
      dueAmountEgp: targetRep.totalFineAmountEgp,
      approvedSettlementAmountEgp: stlApprovedAmt,
      requestDate: todayRef,
      approvalDate: todayRef,
      competentAuthority: 'لجنة التصالحات التموينية والنيابة المختصة',
      status: rem === 0 && stlPaidAmt > 0 ? 'تم السداد' : stlStatus,
      paymentReceiptNumber: stlReceiptNo,
      paymentDate: stlPaidAmt > 0 ? todayRef : undefined,
      paidAmountEgp: stlPaidAmt,
      remainingAmountEgp: rem,
      documents: ['إيصال_السداد_الرسمي.pdf'],
      approvedBy: currentUser.fullName,
      notes: 'قيد تصالح معتمد بالسجل المالي',
    };

    const nextStls = [newStl, ...settlements];
    setSettlements(nextStls);
    saveCommercialSettlements(nextStls);

    // تحديث حالة المحضر إلى متصالح فقط عند استيفاء السداد والموافقة
    if (rem === 0 && stlPaidAmt > 0) {
      const nextReps = reports.map((r) =>
        r.id === targetRep.id ? { ...r, reportStatus: 'متصالح' as const, isSettled: true } : r
      );
      setReports(nextReps);
      saveCommercialViolationReports(nextReps);
    }

    setShowAddSettlementModal(false);
    notify(`تم تسجيل التصالح (${newStl.settlementRequestNumber}) وتحديث الموقف المالي والقانوني للمحضر.`);
  };

  // ٦. تسجيل حركة في دفتر المضبوطات والتحفظات (بموجب قرار موثق من الجهة المختصة)
  const [szmSeizureId, setSzmSeizureId] = useState(seizures[0]?.id || 'sz-601');
  const [szmType, setSzmType] = useState<SeizureMovementType>('الإفراج');
  const [szmQuantity, setSzmQuantity] = useState<number>(500);
  const [szmDecisionRef, setSzmDecisionRef] = useState<string>('قرار النيابة العامة رقم ٤٤٢٠ لسنة ٢٠٢٦');
  const [szmDeliveredBy, setSzmDeliveredBy] = useState<string>('أمين العهدة/ مصطفى كامل عبد ربه');
  const [szmReceivedBy, setSzmReceivedBy] = useState<string>('لجنة التنفيذ التموينية');

  const handleCreateSeizureMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const targetSz = seizures.find((s) => s.id === szmSeizureId) || seizures[0];
    if (!targetSz) return;

    if (!szmDecisionRef.trim()) {
      notify('قاعدة إلزامية: يمنع التصرف في المضبوطات إلا بناءً على قرار موثق من الجهة المختصة.');
      return;
    }

    const isOutflow =
      szmType === 'التسليم' ||
      szmType === 'الإفراج' ||
      szmType === 'الإعدام' ||
      szmType === 'التسليم للجهة المختصة';

    if (isOutflow && szmQuantity > targetSz.currentActualBalance) {
      notify(`تنبيه: الكمية المطلوب التصرف فيها (${szmQuantity}) تتجاوز الرصيد الفعلي الحالي في العهدة (${targetSz.currentActualBalance}).`);
      return;
    }

    const newMov: SeizureMovementRecord = {
      id: `szm-${Date.now()}`,
      movementNumber: `MV-SZ-2026-00${seizureMovements.length + 1}`,
      seizureId: targetSz.id,
      seizureNumber: targetSz.seizureNumber,
      reportNumber: targetSz.reportNumber,
      movementType: szmType,
      quantity: szmQuantity,
      unit: targetSz.unit,
      movementDate: todayRef,
      movementTime: '13:00',
      deliveredBy: szmDeliveredBy,
      receivedBy: szmReceivedBy,
      custodyLocationBefore: targetSz.custodyLocation,
      custodyLocationAfter: isOutflow ? 'تم التنفيذ وفق القرار الرسمي' : targetSz.custodyLocation,
      officialDecisionReference: szmDecisionRef,
      isApproved: true,
      approvedBy: currentUser.fullName,
      auditTrailNote: `حركة معتمدة غير قابلة للحذف بموجب (${szmDecisionRef})`,
    };

    const nextMovs = [newMov, ...seizureMovements];
    setSeizureMovements(nextMovs);
    saveSeizureMovements(nextMovs);

    const newBalance = isOutflow
      ? round2(targetSz.currentActualBalance - szmQuantity)
      : szmType === 'الإضافة'
      ? round2(targetSz.currentActualBalance + szmQuantity)
      : targetSz.currentActualBalance;

    const nextSeizures = seizures.map((s) =>
      s.id === targetSz.id
        ? {
            ...s,
            currentActualBalance: newBalance,
            disposalDecisionNumber: szmDecisionRef,
            disposalDecisionText: `${szmType} كمية ${szmQuantity} ${targetSz.unit}`,
            legalStatus:
              szmType === 'الإفراج'
                ? ('صدر قرار إفراج' as const)
                : szmType === 'الإعدام'
                ? ('صدر قرار إعدام' as const)
                : s.legalStatus,
          }
        : s
    );
    setSeizures(nextSeizures);
    saveCommercialSeizures(nextSeizures);

    setShowAddSeizureMovementModal(false);
    notify(`تم تسجيل حركة المضبوطات (${newMov.movementNumber}) وتحديث الرصيد الفعلي للعهدة إلى (${newBalance} ${targetSz.unit}).`);
  };

  // ٧. رصد أسعار سلعة في السوق مع التمييز بين السعر المرصود والسعر الرسمي المعتمد
  const [obsCommodityId, setObsCommodityId] = useState(commodities[0]?.id || 'cmd-01');
  const [obsMarketName, setObsMarketName] = useState('سوق صفط تراب الرئيسي');
  const [obsVillage, setObsVillage] = useState('صفط تراب');
  const [obsMinPrice, setObsMinPrice] = useState(28);
  const [obsMaxPrice, setObsMaxPrice] = useState(30);
  const [obsAnnouncedPrice, setObsAnnouncedPrice] = useState(29);
  const [obsObservedPrice, setObsObservedPrice] = useState(29);
  const [obsHasOfficialPrice, setObsHasOfficialPrice] = useState(true);
  const [obsOfficialPrice, setObsOfficialPrice] = useState(30);
  const [obsOfficialDecree, setObsOfficialDecree] = useState('قرار مجلس الوزراء للسلع الاستراتيجية ٢٠٢٦');
  const [obsOfficialDate, setObsOfficialDate] = useState('2026-01-01');
  const [obsAvailability, setObsAvailability] = useState<CommodityAvailabilityStatus>('متوفر');

  const handleCreatePriceObservation = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = commodities.find((c) => c.id === obsCommodityId) || commodities[0];
    if (!cmd) return;

    if (obsHasOfficialPrice && (!obsOfficialDecree.trim() || !obsOfficialDate.trim())) {
      notify('قاعدة إلزامية: لا يعتبر أي سعر رسمياً إلا بإدخال مصدره وقرار تحديده وتاريخ سريانه.');
      return;
    }

    const newObs: CommodityPriceObservationRecord = {
      id: `obs-${Date.now()}`,
      commodityId: cmd.id,
      commodityName: cmd.name,
      category: cmd.category,
      packageOrWeight: `١ ${cmd.unit}`,
      unit: cmd.unit,
      minPriceEgp: obsMinPrice,
      maxPriceEgp: obsMaxPrice,
      avgPriceEgp: round2((obsMinPrice + obsMaxPrice) / 2),
      announcedPriceEgp: obsAnnouncedPrice,
      observedPriceEgp: obsObservedPrice,
      officialPriceEgp: obsHasOfficialPrice ? obsOfficialPrice : undefined,
      officialPriceSourceDecree: obsHasOfficialPrice ? obsOfficialDecree : undefined,
      officialPriceEffectiveDate: obsHasOfficialPrice ? obsOfficialDate : undefined,
      marketName: obsMarketName,
      establishmentName: 'منفذ بيع معتمد بالسوق',
      village: obsVillage,
      localUnit: `الوحدة المحلية بـ ${obsVillage}`,
      supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
      observationDate: todayRef,
      inspectorName: currentUser.fullName,
      priceSource: 'رصد ميداني مباشر',
      availabilityStatus: obsAvailability,
      notes: obsHasOfficialPrice
        ? `مقارن بالسعر الرسمي بموجب (${obsOfficialDecree})`
        : 'سلعة حرة التداول وفق العرض والطلب',
    };

    const next = [newObs, ...priceObservations];
    setPriceObservations(next);
    savePriceObservations(next);
    setShowAddPriceObsModal(false);
    notify(`تم تسجيل رصد سعر (${cmd.name}) في (${obsMarketName}) بنجاح.`);
  };

  // ==================== أعمدة الجداول التفاعلية ====================

  const establishmentEditableFields: EditableFieldSpec[] = useMemo(
    () => [
      { key: 'autoCode', label: 'كود المنشأة' },
      { key: 'fileNumber', label: 'رقم الملف' },
      { key: 'name', label: 'اسم المحل أو المنشأة' },
      { key: 'ownerName', label: 'اسم التاجر / المالك' },
      { key: 'category', label: 'التصنيف' },
      { key: 'village', label: 'القرية' },
      { key: 'localUnit', label: 'الوحدة المحلية' },
      { key: 'taxCardNumber', label: 'رقم البطاقة الضريبية' },
      { key: 'taxCardExpiryDate', label: 'تاريخ انتهاء البطاقة الضريبية', type: 'date' },
      { key: 'commercialRegisterNumber', label: 'رقم السجل التجاري' },
      { key: 'commercialRegisterExpiryDate', label: 'تاريخ انتهاء السجل التجاري', type: 'date' },
      { key: 'licenseNumber', label: 'رقم الترخيص' },
      { key: 'licenseExpiryDate', label: 'تاريخ انتهاء الترخيص', type: 'date' },
      { key: 'status', label: 'حالة المنشأة' },
    ],
    []
  );

  const establishmentColumns: SmartTableColumn<CommercialEstablishmentRecord>[] = useMemo(
    () => [
      { key: 'autoCode', label: 'كود المنشأة', headerText: 'كود المنشأة', type: 'code', defaultWidth: 130, render: (e) => <span className="font-black text-[#164E83]">{e.autoCode}</span> },
      { key: 'fileNumber', label: 'رقم الملف', headerText: 'رقم الملف', type: 'code', defaultWidth: 100, render: (e) => <span className="font-bold text-slate-700">{e.fileNumber}</span> },
      {
        key: 'name',
        label: 'اسم المحل أو المنشأة',
        headerText: 'اسم المحل أو المنشأة',
        type: 'name',
        defaultWidth: 205,
        render: (e) => (
          <button
            type="button"
            onClick={() => setSelectedEstDetails(e)}
            className="font-black text-[#102A43] hover:text-[#164E83] underline cursor-pointer text-right"
          >
            {e.name}
          </button>
        ),
      },
      { key: 'ownerName', label: 'اسم التاجر / المالك', headerText: 'اسم التاجر / المالك', type: 'name', defaultWidth: 165, render: (e) => <span className="font-black text-slate-800">{e.ownerName}</span> },
      { key: 'category', label: 'التصنيف', headerText: 'التصنيف', type: 'status', defaultWidth: 120, render: (e) => <span className="font-bold text-[#164E83]">{e.category}</span> },
      { key: 'village', label: 'القرية / الوحدة المحلية', headerText: 'القرية / الوحدة المحلية', type: 'text', defaultWidth: 160, render: (e) => <span className="font-bold">{e.village} — {e.localUnit}</span> },
      { key: 'taxCardNumber', label: 'البطاقة الضريبية', headerText: 'البطاقة الضريبية', type: 'code', align: 'center', defaultWidth: 125, render: (e) => <span className="num-cell font-black text-[#102A43]">{e.taxCardNumber}</span> },
      {
        key: 'taxCardExpiryDate',
        label: 'انتهاء البطاقة الضريبية',
        headerText: 'انتهاء البطاقة الضريبية',
        type: 'date',
        align: 'center',
        defaultWidth: 135,
        render: (e) => (
          <span className={`num-cell font-black ${e.taxCardExpiryDate < todayRef ? 'text-red-700' : 'text-slate-800'}`}>
            {formatDateArabic(e.taxCardExpiryDate)}
          </span>
        ),
      },
      { key: 'commercialRegisterNumber', label: 'السجل التجاري', headerText: 'السجل التجاري', type: 'code', align: 'center', defaultWidth: 125, render: (e) => <span className="num-cell font-black text-[#102A43]">{e.commercialRegisterNumber}</span> },
      {
        key: 'commercialRegisterExpiryDate',
        label: 'انتهاء السجل التجاري',
        headerText: 'انتهاء السجل التجاري',
        type: 'date',
        align: 'center',
        defaultWidth: 135,
        render: (e) => (
          <span className={`num-cell font-black ${e.commercialRegisterExpiryDate < todayRef ? 'text-red-700' : 'text-slate-800'}`}>
            {formatDateArabic(e.commercialRegisterExpiryDate)}
          </span>
        ),
      },
      { key: 'licenseNumber', label: 'رقم الترخيص', headerText: 'رقم الترخيص', type: 'code', align: 'center', defaultWidth: 125, render: (e) => <span className="num-cell font-black text-[#164E83]">{e.licenseNumber}</span> },
      {
        key: 'licenseExpiryDate',
        label: 'انتهاء الترخيص',
        headerText: 'انتهاء الترخيص',
        type: 'date',
        align: 'center',
        defaultWidth: 130,
        render: (e) => (
          <span className={`num-cell font-black ${e.licenseExpiryDate !== '—' && e.licenseExpiryDate < todayRef ? 'text-red-700' : 'text-emerald-800'}`}>
            {e.licenseExpiryDate && e.licenseExpiryDate !== '—' ? formatDateArabic(e.licenseExpiryDate) : '—'}
          </span>
        ),
      },
      {
        key: 'isLicensed',
        label: 'موقف الترخيص',
        headerText: 'موقف الترخيص',
        type: 'status',
        align: 'center',
        defaultWidth: 115,
        render: (e) => (
          <span className={`font-black ${e.isLicensed ? 'text-emerald-700' : 'text-red-700'}`}>
            {e.isLicensed ? 'مرخص' : 'غير مرخص'}
          </span>
        ),
      },
      { key: 'status', label: 'حالة المنشأة', headerText: 'حالة المنشأة', type: 'status', align: 'center', defaultWidth: 115, render: (e) => <span className="font-black text-[#102A43]">{e.status}</span> },
      {
        key: 'actions',
        label: 'الإجراءات',
        headerText: 'الإجراءات',
        type: 'actions',
        align: 'center',
        defaultWidth: 235,
        render: (e) => (
          <TableActionButtons
            onView={() =>
              setCrudModalState({
                mode: 'view',
                title: `بيانات المنشأة التجارية: ${e.name}`,
                record: e as unknown as Record<string, unknown>,
                fields: establishmentEditableFields,
              })
            }
            onAdd={() => setShowAddEstModal(true)}
            onEdit={() =>
              setCrudModalState({
                mode: 'edit',
                title: `تعديل بيانات المنشأة التجارية: ${e.name}`,
                record: e as unknown as Record<string, unknown>,
                fields: establishmentEditableFields,
                onSave: (updated) => {
                  const next = establishments.map((item) =>
                    item.id === e.id ? ({ ...item, ...updated } as CommercialEstablishmentRecord) : item
                  );
                  setEstablishments(next);
                  saveCommercialEstablishments(next);
                  notify(`تم تحديث بيانات المنشأة (${e.name}) بنجاح.`);
                },
              })
            }
            onDelete={() => {
              const next = establishments.filter((item) => item.id !== e.id);
              setEstablishments(next);
              saveCommercialEstablishments(next);
              notify(`تم حذف المنشأة (${e.name}) من السجل.`);
            }}
          />
        ),
      },
    ],
    [establishments, establishmentEditableFields, todayRef]
  );

  // فلترة القوائم الجانبية العشرين بالبحث السريع
  const filteredNavGroups = useMemo(() => {
    const q = normalizeSearchText(screenSearchQuery);
    if (!q) return INTERNAL_TRADE_NAV_GROUPS;
    return INTERNAL_TRADE_NAV_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((item) => normalizeSearchText(item.label).includes(q)),
    })).filter((g) => g.items.length > 0);
  }, [screenSearchQuery]);

  const activeNavItem = useMemo(() => {
    for (const grp of INTERNAL_TRADE_NAV_GROUPS) {
      const found = grp.items.find((i) => i.id === activeScreen);
      if (found) return found;
    }
    return INTERNAL_TRADE_NAV_GROUPS[0].items[0];
  }, [activeScreen]);

  // الانتقال المباشر عند النقر على أي بطاقة إحصائية في لوحة التحكم
  const handleJumpFromDashboardCard = (
    target: InternalTradeScreenId,
    filterPreset?: {
      est?: typeof estFilterMode;
      lic?: typeof licFilterMode;
      camp?: typeof campFilterMode;
      rep?: typeof repFilterMode;
    }
  ) => {
    if (filterPreset?.est) setEstFilterMode(filterPreset.est);
    if (filterPreset?.lic) setLicFilterMode(filterPreset.lic);
    if (filterPreset?.camp) setCampFilterMode(filterPreset.camp);
    if (filterPreset?.rep) setRepFilterMode(filterPreset.rep);
    setActiveScreen(target);
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* ترويسة قسم التجارة الداخلية الموحدة */}
      <div className="bg-[#102A43] text-white rounded-2xl p-5 border-2 border-[#C6A15B]/40 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#C6A15B] text-[#102A43] flex items-center justify-center shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-black text-[#C6A15B] block">
                مديرية التموين والتجارة الداخلية بمحافظة الغربية — إدارة تموين مركز المحلة الكبرى
              </span>
              <h2 className="text-lg font-black text-white">
                قسم التجارة الداخلية — إدارة ومتابعة المنشآت التجارية والأسواق والسلع والأنشطة التموينية والمواد البترولية
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveScreen('smart_alerts')}
              className="px-3.5 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>التنبيهات الذكية ({toArabicNumerals(smartAlerts.length)})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveScreen('village_comparison')}
              className="px-3.5 py-2 rounded-xl bg-[#164E83] hover:bg-[#1e609e] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <BarChart3 className="w-4 h-4" />
              <span>مقارنة القرى والوحدات</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveScreen('reports_center')}
              className="px-3.5 py-2 rounded-xl bg-[#C6A15B] hover:bg-[#b58f48] text-[#102A43] text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>مركز التقارير (٣٩ تقريراً)</span>
            </button>
            <FactoryResetButton
              sectionName="قسم التجارة الداخلية"
              sectionKey="internal_trade"
              tableSummary={[
                { tableName: 'سجل المحلات والمنشآت التجارية والأنشطة', count: establishments.length + activities.length },
                { tableName: 'سجل التراخيص والتجديدات', count: licenses.length },
                { tableName: 'سجل الحملات والمحاضر والتصالحات والمضبوطات', count: campaigns.length + reports.length + settlements.length + seizures.length },
                { tableName: 'سجل مستودعات البوتاجاز ومحطات الوقود والمواد البترولية', count: butaneWarehouses.length + fuelStations.length + butaneAllocations.length + petroleumAllocations.length },
                { tableName: 'سجل رصد الأسعار والأسواق', count: priceObservations.length },
              ]}
              onCaptureBackup={() => ({
                establishments,
                activities,
                licenses,
                campaigns,
                reports,
                settlements,
                seizures,
                priceObservations,
                butaneWarehouses,
                fuelStations,
              })}
              compact
              onConfirmReset={() => {
                factoryResetInternalTradeStore();
                setEstablishments([]);
                setActivities([]);
                setLicenses([]);
                setCampaigns([]);
                setReports([]);
                setSettlements([]);
                setSeizures([]);
                setSeizureMovements([]);
                setPriceObservations([]);
                setButaneAllocations([]);
                setPetroleumAllocations([]);
                setFuelStations([]);
                setFuelMovements([]);
                setFuelInspections([]);
                setButaneWarehouses([]);
                setButaneWarehouseMovements([]);
                setButaneDistributors([]);
                setButaneDistributorMovements([]);
                setClosedAlertIds({});
                notify('تم تنفيذ إعادة ضبط المصنع ومسح جميع البيانات المدخلة في جداول قسم التجارة الداخلية بالكامل.');
              }}
            />
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-between">
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage('')} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* شريط التنقل العلوي المنظم لقسم التجارة الداخلية (٢٠ شاشة في ٤ مجموعات أعلى الصفحة بنفس نمط منظومة المخابز) */}
      <nav
        aria-label="قائمة شاشات قسم التجارة الداخلية"
        className="bg-white rounded-2xl border-2 border-[#102A43]/15 p-3.5 space-y-3 shadow-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-[#164E83]" />
            <span className="text-xs font-black text-[#102A43]">
              خريطة شاشات قسم التجارة الداخلية (٢٢ شاشة مترابطة)
            </span>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2" />
            <input
              type="text"
              value={screenSearchQuery}
              onChange={(e) => setScreenSearchQuery(e.target.value)}
              placeholder="بحث سريع في شاشات التجارة الداخلية (٢٢)..."
              className="w-full pr-9 pl-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {filteredNavGroups.map((grp) => {
            const isOpen = openGroups[grp.groupId] ?? true;
            return (
              <div key={grp.groupId} className="border border-slate-200 rounded-xl overflow-hidden bg-[#FAFBFD] flex flex-col">
                <button
                  type="button"
                  onClick={() =>
                    setOpenGroups((prev) => ({ ...prev, [grp.groupId]: !isOpen }))
                  }
                  className="w-full px-3 py-2 bg-[#102A43] text-white hover:bg-[#164E83] flex items-center justify-between text-[11px] font-black cursor-pointer transition-colors"
                >
                  <span className="break-words text-right leading-snug">{grp.groupTitle}</span>
                  {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-[#C6A15B] shrink-0" /> : <ChevronLeft className="w-3.5 h-3.5 text-[#C6A15B] shrink-0" />}
                </button>
                {isOpen && (
                  <div className="p-1.5 space-y-1 bg-white flex-1">
                    {grp.items.map((item) => {
                      const IconComp = item.icon;
                      const isActive = activeScreen === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setEstFilterMode('ALL');
                            setLicFilterMode('ALL');
                            setCampFilterMode('ALL');
                            setRepFilterMode('ALL');
                            setActiveScreen(item.id);
                          }}
                          className={`w-full text-right px-2.5 py-1.5 rounded-lg text-[11px] font-black flex items-start gap-2 transition-all cursor-pointer border ${
                            isActive
                              ? 'bg-[#102A43] text-[#C6A15B] border-[#C6A15B]/60 shadow-xs'
                              : 'bg-slate-50/70 text-[#102A43] border-slate-200/80 hover:bg-blue-50 hover:border-[#164E83]/40'
                          }`}
                        >
                          <IconComp className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span className="leading-snug break-words whitespace-normal">{item.label}</span>
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

      {/* مساحة الشاشة النشطة بكامل العرض */}
      <div className="space-y-4">
        {/* شريط عنوان الشاشة النشطة */}
        <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-[#164E83]">الشاشة النشطة:</span>
            <h3 className="text-sm font-black text-[#102A43]">{activeNavItem.label}</h3>
          </div>
          <div className="text-[11px] font-bold text-slate-600">
            التاريخ المرجعي: {formatDateArabic(todayRef)} · المستخدم: {currentUser.fullName}
          </div>
        </div>

          {/* ==================== ١. لوحة التحكم الرئيسية (٢٠ بطاقة قابلة للنقر + ١١ رسماً بيانياً) ==================== */}
          {activeScreen === 'dashboard' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <AnimatedStatCard
                  title="١. إجمالي المحلات والمنشآت التجارية"
                  value={dashboardKpis.totalEstablishments}
                  unit="منشأة مسجلة"
                  indicator="اضغط لفتح السجل"
                  icon={Store}
                  theme="navy"
                  onClick={() => handleJumpFromDashboardCard('establishments', { est: 'ALL' })}
                />
                <AnimatedStatCard
                  title="٢. المنشآت المرخصة"
                  value={dashboardKpis.licensedEstablishments}
                  unit="منشأة مرخصة"
                  indicator="ملتزمة بالترخيص"
                  icon={CheckCircle2}
                  theme="green"
                  onClick={() => handleJumpFromDashboardCard('establishments', { est: 'LICENSED' })}
                />
                <AnimatedStatCard
                  title="٣. المنشآت غير المرخصة"
                  value={dashboardKpis.unlicensedEstablishments}
                  unit="منشأة بدون ترخيص"
                  indicator="تستوجب المعاينة"
                  icon={AlertTriangle}
                  theme="red"
                  onClick={() => handleJumpFromDashboardCard('establishments', { est: 'UNLICENSED' })}
                />
                <AnimatedStatCard
                  title="٤. التراخيص السارية"
                  value={dashboardKpis.validLicenses}
                  unit="ترخيص ساري"
                  indicator="سجل التراخيص"
                  icon={FileCheck2}
                  theme="green"
                  onClick={() => handleJumpFromDashboardCard('licenses', { lic: 'VALID' })}
                />
                <AnimatedStatCard
                  title="٥. التراخيص التي قاربت على الانتهاء"
                  value={dashboardKpis.expiringLicenses}
                  unit="ترخيص للتجديد"
                  indicator="تنبيهات ٩٠-٧ أيام"
                  icon={AlertTriangle}
                  theme="gold"
                  onClick={() => handleJumpFromDashboardCard('licenses', { lic: 'EXPIRING' })}
                />
                <AnimatedStatCard
                  title="٦. التراخيص المنتهية"
                  value={dashboardKpis.expiredLicenses}
                  unit="ترخيص منتهي"
                  indicator="تستوجب الإنذار"
                  icon={ShieldAlert}
                  theme="red"
                  onClick={() => handleJumpFromDashboardCard('licenses', { lic: 'EXPIRED' })}
                />
                <AnimatedStatCard
                  title="٧. إجمالي الأنشطة التجارية"
                  value={dashboardKpis.totalActivities}
                  unit="نشاط معتمد"
                  indicator="جملة وتجزئة وخدمة"
                  icon={Briefcase}
                  theme="blue"
                  onClick={() => handleJumpFromDashboardCard('activities')}
                />
                <AnimatedStatCard
                  title="٨. الحملات التموينية المنفذة"
                  value={dashboardKpis.completedCampaigns}
                  unit="حملة مكتملة"
                  indicator="المرور الميداني"
                  icon={SearchCheck}
                  theme="green"
                  onClick={() => handleJumpFromDashboardCard('campaigns', { camp: 'DONE' })}
                />
                <AnimatedStatCard
                  title="٩. الحملات الجاري تنفيذها"
                  value={dashboardKpis.ongoingCampaigns}
                  unit="حملة نشطة"
                  indicator="متابعة ميدانية"
                  icon={SearchCheck}
                  theme="gold"
                  onClick={() => handleJumpFromDashboardCard('campaigns', { camp: 'ONGOING' })}
                />
                <AnimatedStatCard
                  title="١٠. إجمالي المخالفات والمحاضر"
                  value={dashboardKpis.totalViolationReports}
                  unit="محضر رسمي"
                  indicator="سجل المحاضر"
                  icon={FileText}
                  theme="red"
                  onClick={() => handleJumpFromDashboardCard('violations', { rep: 'ALL' })}
                />
                <AnimatedStatCard
                  title="١١. المحاضر التي تم التصالح عليها"
                  value={dashboardKpis.settledReports}
                  unit="محضر متصالح"
                  indicator="تم السداد والإغلاق"
                  icon={Scale}
                  theme="green"
                  onClick={() => handleJumpFromDashboardCard('violations', { rep: 'SETTLED' })}
                />
                <AnimatedStatCard
                  title="١٢. المحاضر التي لم يتم التصالح عليها"
                  value={dashboardKpis.unsettledReports}
                  unit="محضر قيد الإجراء"
                  indicator="نيابة / متابعة"
                  icon={Gavel}
                  theme="red"
                  onClick={() => handleJumpFromDashboardCard('violations', { rep: 'UNSETTLED' })}
                />
                <AnimatedStatCard
                  title="١٣. إجمالي الغرامات والمبالغ المستحقة"
                  value={dashboardKpis.totalFinesAndDueAmountEgp}
                  format="currency"
                  unit="ج.م"
                  indicator="التصالحات والتسويات"
                  icon={Scale}
                  theme="gold"
                  onClick={() => handleJumpFromDashboardCard('settlements')}
                />
                <AnimatedStatCard
                  title="١٤. إجمالي المضبوطات"
                  value={dashboardKpis.totalSeizuresRecords}
                  unit="سجل ضبط"
                  indicator="دفتر المضبوطات"
                  icon={Package}
                  theme="purple"
                  onClick={() => handleJumpFromDashboardCard('seizures')}
                />
                <AnimatedStatCard
                  title="١٥. إجمالي التحفظات التموينية النشطة"
                  value={dashboardKpis.totalActiveCustodyHolds}
                  unit="عهدة تحت التحفظ"
                  indicator="بانتظار قرار تصرف"
                  icon={Package}
                  theme="red"
                  onClick={() => handleJumpFromDashboardCard('seizures')}
                />
                <AnimatedStatCard
                  title="١٦. عدد المنشآت التي تمت متابعتها"
                  value={dashboardKpis.followedUpEstablishments}
                  unit="منشأة تم المرور عليها"
                  indicator="تغطية رقابية"
                  icon={Building2}
                  theme="blue"
                  onClick={() => handleJumpFromDashboardCard('establishments', { est: 'ALL' })}
                />
                <AnimatedStatCard
                  title="١٧. عدد الأسواق التي تتم مراقبتها"
                  value={dashboardKpis.monitoredMarketsCount}
                  unit="سوق رئيسي وفرعي"
                  indicator="متابعة الأسعار"
                  icon={ShoppingBag}
                  theme="navy"
                  onClick={() => handleJumpFromDashboardCard('markets')}
                />
                <AnimatedStatCard
                  title="١٨. عدد محطات الوقود"
                  value={dashboardKpis.fuelStationsCount}
                  unit="محطة تموين سيارات"
                  indicator="سجل ٢١ بترول"
                  icon={Fuel}
                  theme="blue"
                  onClick={() => handleJumpFromDashboardCard('fuel_stations')}
                />
                <AnimatedStatCard
                  title="١٩. عدد مستودعات البوتاجاز"
                  value={dashboardKpis.butaneWarehousesCount}
                  unit="مستودع رئيسي"
                  indicator="حركة المستودعات"
                  icon={Warehouse}
                  theme="gold"
                  onClick={() => handleJumpFromDashboardCard('butane_warehouses')}
                />
                <AnimatedStatCard
                  title="٢٠. عدد موزعي أسطوانات البوتاجاز"
                  value={dashboardKpis.butaneDistributorsCount}
                  unit="موزع معتمد"
                  indicator="سجل الموزعين"
                  icon={Truck}
                  theme="green"
                  onClick={() => handleJumpFromDashboardCard('butane_distributors')}
                />
              </div>

              {/* الرسوم البيانية التفاعلية الـ ١١ للوحة التحكم */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
                  <h4 className="text-xs font-black text-[#102A43]">
                    ١. توزيع المنشآت التجارية والأنشطة حسب القرية والوحدة المحلية
                  </h4>
                  {['صفط تراب', 'الهياتم', 'محلة أبو علي', 'بشبيش', 'البنوان'].map((vil) => {
                    const cnt = establishments.filter((e) => e.village === vil).length;
                    const pct = Math.max(15, Math.round((cnt / Math.max(1, establishments.length)) * 100));
                    return (
                      <div key={vil} className="space-y-1 text-xs">
                        <div className="flex justify-between font-black">
                          <span>قرية {vil}</span>
                          <span className="num-cell text-[#164E83]">{toArabicNumerals(cnt)} منشأة ({toArabicNumerals(pct)}٪)</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#102A43] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
                  <h4 className="text-xs font-black text-[#102A43]">
                    ٢. موقف التراخيص التجارية والتصالحات والمبالغ المحصلة
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-slate-600 font-bold block">تراخيص سارية</span>
                      <span className="num-cell font-black text-emerald-800 text-base">{toArabicNumerals(dashboardKpis.validLicenses)}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                      <span className="text-slate-600 font-bold block">قاربت على الانتهاء</span>
                      <span className="num-cell font-black text-amber-800 text-base">{toArabicNumerals(dashboardKpis.expiringLicenses)}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-200">
                      <span className="text-slate-600 font-bold block">تراخيص منتهية</span>
                      <span className="num-cell font-black text-red-800 text-base">{toArabicNumerals(dashboardKpis.expiredLicenses)}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                    <div className="flex justify-between font-black">
                      <span>إجمالي مبالغ المخالفات المستحقة:</span>
                      <span className="num-cell text-[#102A43]">{formatArabicCurrency(dashboardKpis.totalFinesAndDueAmountEgp)}</span>
                    </div>
                    <div className="flex justify-between font-black">
                      <span>المبالغ المحصلة فعلياً بإيصالات التصالح:</span>
                      <span className="num-cell text-emerald-700">{formatArabicCurrency(dashboardKpis.totalCollectedSettlementsEgp)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
                  <h4 className="text-xs font-black text-[#102A43]">
                    ٣. توزيع المخالفات والمحاضر والمضبوطات حسب النوع والسلعة
                  </h4>
                  {seizures.map((sz) => (
                    <div key={sz.id} className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5">
                      <div>
                        <span className="font-black text-[#102A43] block">{sz.productName} ({sz.commodityCategory})</span>
                        <span className="text-[10.5px] font-bold text-slate-500">محضر: {sz.reportNumber} · {sz.village}</span>
                      </div>
                      <span className="num-cell font-black text-red-700">{formatArabicNumber(sz.currentActualBalance)} {sz.unit}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
                  <h4 className="text-xs font-black text-[#102A43]">
                    ٤. حركة البوتاجاز والمواد البترولية ومقارنة أسعار السلع بالقرى
                  </h4>
                  {butaneAllocations.map((b) => {
                    const pct = Math.round((b.distributedQuantityCylinders / Math.max(1, b.allocatedQuotaCylinders)) * 100);
                    return (
                      <div key={b.id} className="space-y-1 text-xs">
                        <div className="flex justify-between font-black">
                          <span>بوتاجاز {b.village} ({formatArabicNumber(b.beneficiariesCountCurrent)} مستفيد)</span>
                          <span className="num-cell text-emerald-700">
                            {formatArabicNumber(b.distributedQuantityCylinders)} / {formatArabicNumber(b.allocatedQuotaCylinders)} أسطوانة ({toArabicNumerals(pct)}٪)
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-700 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ==================== ٢. سجل المحلات والمنشآت التجارية ==================== */}
          {activeScreen === 'establishments' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-black text-[#102A43]">
                    ٢. سجل المحلات والمنشآت التجارية الشامل (٢٥ حقلاً + ربط الأنشطة المتعددة)
                  </h4>
                  <p className="text-[11px] font-bold text-slate-600">
                    المصدر الرئيسي لبيانات التجار والمنشآت والتراخيص والسجلات التجارية والبطاقات الضريبية
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={estFilterMode}
                    onChange={(e) => setEstFilterMode(e.target.value as typeof estFilterMode)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-black"
                  >
                    <option value="ALL">جميع المنشآت ({toArabicNumerals(establishments.length)})</option>
                    <option value="LICENSED">المنشآت المرخصة فقط</option>
                    <option value="UNLICENSED">المنشآت غير المرخصة فقط</option>
                    <option value="MISMATCHED">منشآت تمارس نشاطاً غير مسجل / مخالف للترخيص</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddEstModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة منشأة تجارية جديدة</span>
                  </button>
                </div>
              </div>

              <SmartAutoFitTable
                tableId="internal_trade_establishments"
                userId={currentUser.id}
                rows={establishments.filter((e) => {
                  if (estFilterMode === 'LICENSED' && !e.isLicensed) return false;
                  if (estFilterMode === 'UNLICENSED' && e.isLicensed) return false;
                  if (estFilterMode === 'MISMATCHED' && !e.hasUnregisteredOrMismatchedActivity) return false;
                  return true;
                })}
                totalCount={establishments.length}
                getRowId={(e) => e.id}
                columns={establishmentColumns}
                onNotify={notify}
              />
            </div>
          )}

          {/* ==================== ٣. قاعدة بيانات الأنشطة التجارية ==================== */}
          {activeScreen === 'activities' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-black text-[#102A43]">
                      ٣. دليل الأنشطة التجارية وربط الأنشطة الرئيسية والفرعية بالمنشآت
                    </h4>
                    <p className="text-[11px] font-bold text-slate-600">
                      يوضح طبيعة كل نشاط (جملة / تجزئة / توزيع / تخزين / تصنيع / خدمة) والجهة المختصة بالترخيص والمستندات والاشتراطات
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEstFilterMode('MISMATCHED');
                      setActiveScreen('establishments');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-black cursor-pointer"
                  >
                    عرض المنشآت ذات النشاط غير المطابق للترخيص
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#102A43] text-white">
                        <th className="p-2.5 border border-slate-700">كود النشاط</th>
                        <th className="p-2.5 border border-slate-700">اسم النشاط</th>
                        <th className="p-2.5 border border-slate-700 text-center">طبيعة النشاط</th>
                        <th className="p-2.5 border border-slate-700">الجهة المختصة بالترخيص</th>
                        <th className="p-2.5 border border-slate-700">المستندات والاشتراطات المنظمة</th>
                        <th className="p-2.5 border border-slate-700 text-center">المنشآت المرتبطة</th>
                        <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activities.map((act) => {
                        const linkedCount = establishments.filter(
                          (e) =>
                            e.primaryActivityId === act.id ||
                            e.secondaryActivityIds.includes(act.id)
                        ).length;
                        const actFields: EditableFieldSpec[] = [
                          { key: 'code', label: 'كود النشاط' },
                          { key: 'name', label: 'اسم النشاط' },
                          { key: 'category', label: 'التصنيف' },
                          { key: 'nature', label: 'طبيعة النشاط' },
                          { key: 'competentAuthority', label: 'الجهة المختصة بالترخيص' },
                          { key: 'requiredDocuments', label: 'المستندات المطلوبة' },
                          { key: 'regulations', label: 'الاشتراطات المنظمة' },
                          { key: 'status', label: 'الحالة' },
                        ];
                        return (
                          <tr key={act.id} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="p-2.5 font-black text-[#164E83]">{act.code}</td>
                            <td className="p-2.5 font-black text-[#102A43]">{act.name}</td>
                            <td className="p-2.5 text-center font-black">{act.nature}</td>
                            <td className="p-2.5 font-bold text-slate-800">{act.competentAuthority}</td>
                            <td className="p-2.5 text-[11px] font-bold text-slate-600">
                              <span className="block">المستندات: {act.requiredDocuments}</span>
                              <span className="block text-[#102A43]">الاشتراطات: {act.regulations}</span>
                            </td>
                            <td className="p-2.5 text-center num-cell font-black text-[#164E83]">
                              {toArabicNumerals(linkedCount)} منشأة
                            </td>
                            <td className="p-2.5 text-center">
                              <TableActionButtons
                                onView={() =>
                                  setCrudModalState({
                                    mode: 'view',
                                    title: `تفاصيل النشاط التجاري: ${act.name}`,
                                    record: act as unknown as Record<string, unknown>,
                                    fields: actFields,
                                  })
                                }
                                onAdd={() => {
                                  const newAct: CommercialActivityRecord = {
                                    ...act,
                                    id: `act-${Date.now()}`,
                                    code: `ACT-${activities.length + 10}`,
                                    name: `${act.name} (فرعي جديد)`,
                                  };
                                  const next = [newAct, ...activities];
                                  setActivities(next);
                                  saveCommercialActivities(next);
                                  notify(`تمت إضافة نشاط تجاري جديد (${newAct.code}) بنجاح.`);
                                }}
                                onEdit={() =>
                                  setCrudModalState({
                                    mode: 'edit',
                                    title: `تعديل النشاط التجاري: ${act.name}`,
                                    record: act as unknown as Record<string, unknown>,
                                    fields: actFields,
                                    onSave: (updated) => {
                                      const next = activities.map((x) =>
                                        x.id === act.id ? ({ ...x, ...updated } as CommercialActivityRecord) : x
                                      );
                                      setActivities(next);
                                      saveCommercialActivities(next);
                                      notify(`تم تحديث النشاط التجاري (${act.name}) بنجاح.`);
                                    },
                                  })
                                }
                                onDelete={() => {
                                  const next = activities.filter((x) => x.id !== act.id);
                                  setActivities(next);
                                  saveCommercialActivities(next);
                                  notify(`تم حذف النشاط التجاري (${act.name}).`);
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

          {/* ==================== ٤. قاعدة بيانات التراخيص التجارية ==================== */}
          {activeScreen === 'licenses' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-black text-[#102A43]">
                    ٤. تراخيص المحلات والمنشآت التجارية والتنبيهات الذكية (٩٠ / ٦٠ / ٣٠ / ١٥ / ٧ أيام)
                  </h4>
                  <p className="text-[11px] font-bold text-slate-600">
                    كل ترخيص مرتبط بالبطاقة الضريبية والسجل التجاري وتواريخ انتهائها والجهة المختصة الفعلية بإصداره
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={licFilterMode}
                    onChange={(e) => setLicFilterMode(e.target.value as typeof licFilterMode)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-black"
                  >
                    <option value="ALL">جميع التراخيص ({toArabicNumerals(licenses.length)})</option>
                    <option value="VALID">التراخيص السارية</option>
                    <option value="EXPIRING">التراخيص التي قاربت على الانتهاء</option>
                    <option value="EXPIRED">التراخيص المنتهية</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddLicModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>تسجيل ترخيص تجاري جديد</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#102A43] text-white">
                      <th className="p-2.5 border border-slate-700">اسم المنشأة وصاحبها</th>
                      <th className="p-2.5 border border-slate-700 text-center">رقم البطاقة الضريبية</th>
                      <th className="p-2.5 border border-slate-700 text-center">انتهاء البطاقة الضريبية</th>
                      <th className="p-2.5 border border-slate-700 text-center">رقم السجل التجاري</th>
                      <th className="p-2.5 border border-slate-700 text-center">انتهاء السجل التجاري</th>
                      <th className="p-2.5 border border-slate-700 text-center">رقم الترخيص</th>
                      <th className="p-2.5 border border-slate-700 text-center">انتهاء الترخيص</th>
                      <th className="p-2.5 border border-slate-700">نوع الترخيص والجهة المختصة</th>
                      <th className="p-2.5 border border-slate-700 text-center">حالة الترخيص</th>
                      <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {licenses
                      .filter((l) => {
                        const ev = computeLicenseAlertStatus(
                          l.expiryDate,
                          true,
                          todayRef,
                          settings.licenseAlertThresholdsDays
                        );
                        if (licFilterMode === 'VALID' && ev.status !== 'ساري') return false;
                        if (licFilterMode === 'EXPIRING' && !ev.status.includes('قارب')) return false;
                        if (licFilterMode === 'EXPIRED' && ev.status !== 'منتهي') return false;
                        return true;
                      })
                      .map((l) => {
                        const ev = computeLicenseAlertStatus(
                          l.expiryDate,
                          true,
                          todayRef,
                          settings.licenseAlertThresholdsDays
                        );
                        const licFields: EditableFieldSpec[] = [
                          { key: 'establishmentName', label: 'اسم المنشأة' },
                          { key: 'ownerName', label: 'صاحب المنشأة' },
                          { key: 'taxCardNumber', label: 'رقم البطاقة الضريبية' },
                          { key: 'taxCardExpiryDate', label: 'تاريخ انتهاء البطاقة الضريبية', type: 'date' },
                          { key: 'commercialRegisterNumber', label: 'رقم السجل التجاري' },
                          { key: 'commercialRegisterExpiryDate', label: 'تاريخ انتهاء السجل التجاري', type: 'date' },
                          { key: 'licenseNumber', label: 'رقم الترخيص' },
                          { key: 'expiryDate', label: 'تاريخ انتهاء الترخيص', type: 'date' },
                          { key: 'licenseType', label: 'نوع الترخيص' },
                          { key: 'competentAuthority', label: 'الجهة المختصة' },
                          { key: 'village', label: 'القرية' },
                          { key: 'responsibleEmployee', label: 'الموظف المسؤول' },
                        ];
                        return (
                          <tr key={l.id} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="p-2.5">
                              <span className="font-black text-[#102A43] block">{l.establishmentName}</span>
                              <span className="text-[11px] font-bold text-slate-600">{l.ownerName} · {l.village}</span>
                            </td>
                            <td className="p-2.5 text-center num-cell font-black text-[#102A43]">{l.taxCardNumber}</td>
                            <td className={`p-2.5 text-center num-cell font-black ${l.taxCardExpiryDate < todayRef ? 'text-red-700' : 'text-slate-800'}`}>
                              {formatDateArabic(l.taxCardExpiryDate)}
                            </td>
                            <td className="p-2.5 text-center num-cell font-black text-[#102A43]">{l.commercialRegisterNumber}</td>
                            <td className={`p-2.5 text-center num-cell font-black ${l.commercialRegisterExpiryDate < todayRef ? 'text-red-700' : 'text-slate-800'}`}>
                              {formatDateArabic(l.commercialRegisterExpiryDate)}
                            </td>
                            <td className="p-2.5 text-center font-black text-[#164E83]">{l.licenseNumber}</td>
                            <td className="p-2.5 text-center num-cell font-black">{formatDateArabic(l.expiryDate)}</td>
                            <td className="p-2.5">
                              <span className="font-black text-slate-800 block">{l.licenseType}</span>
                              <span className="text-[10.5px] font-bold text-[#164E83]">{l.competentAuthority}</span>
                            </td>
                            <td className="p-2.5 text-center font-black">
                              <span
                                className={
                                  ev.status === 'منتهي'
                                    ? 'text-red-700'
                                    : ev.status.includes('قارب')
                                    ? 'text-amber-700'
                                    : 'text-emerald-700'
                                }
                              >
                                {ev.status} {ev.daysRemaining !== null ? `(${toArabicNumerals(ev.daysRemaining)} يوم)` : ''}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <TableActionButtons
                                onView={() =>
                                  setCrudModalState({
                                    mode: 'view',
                                    title: `بيانات الترخيص التجاري: ${l.licenseNumber}`,
                                    record: l as unknown as Record<string, unknown>,
                                    fields: licFields,
                                  })
                                }
                                onAdd={() => setShowAddLicModal(true)}
                                onEdit={() =>
                                  setCrudModalState({
                                    mode: 'edit',
                                    title: `تعديل الترخيص التجاري: ${l.licenseNumber}`,
                                    record: l as unknown as Record<string, unknown>,
                                    fields: licFields,
                                    onSave: (updated) => {
                                      const next = licenses.map((x) =>
                                        x.id === l.id ? ({ ...x, ...updated } as CommercialLicenseRecord) : x
                                      );
                                      setLicenses(next);
                                      saveCommercialLicenses(next);
                                      notify(`تم تحديث الترخيص (${l.licenseNumber}) بنجاح.`);
                                    },
                                  })
                                }
                                onDelete={() => {
                                  const next = licenses.filter((x) => x.id !== l.id);
                                  setLicenses(next);
                                  saveCommercialLicenses(next);
                                  notify(`تم حذف الترخيص (${l.licenseNumber}).`);
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
          )}

          {/* ==================== ٥. إدارة الحملات التموينية والتفتيش ==================== */}
          {activeScreen === 'campaigns' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-black text-[#102A43]">
                    ٥. الحملات التموينية والمرور الميداني (مرتبطة بالمحاضر والمخالفات والمضبوطات)
                  </h4>
                  <p className="text-[11px] font-bold text-slate-600">
                    اضغط على «تقرير الحملة الكامل» لاستعراض وطباعة جميع المحاضر والمخالفات والمضبوطات الناتجة عن الحملة
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={campFilterMode}
                    onChange={(e) => setCampFilterMode(e.target.value as typeof campFilterMode)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-black"
                  >
                    <option value="ALL">جميع الحملات ({toArabicNumerals(campaigns.length)})</option>
                    <option value="DONE">الحملات المنفذة</option>
                    <option value="ONGOING">الحملات الجاري تنفيذها</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddCampaignModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>تسجيل حملة تموينية جديدة</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#102A43] text-white">
                      <th className="p-2.5 border border-slate-700">رقم الحملة والتاريخ</th>
                      <th className="p-2.5 border border-slate-700">نوع الحملة ونطاقها</th>
                      <th className="p-2.5 border border-slate-700">رئيس الحملة والجهات المشاركة</th>
                      <th className="p-2.5 border border-slate-700 text-center">المنشآت (مفحوص / مستهدف)</th>
                      <th className="p-2.5 border border-slate-700 text-center">المحاضر والمضبوطات</th>
                      <th className="p-2.5 border border-slate-700 text-center">الحالة والتقرير</th>
                      <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns
                      .filter((c) => {
                        if (campFilterMode === 'DONE' && c.status !== 'منفذة') return false;
                        if (campFilterMode === 'ONGOING' && c.status !== 'جاري تنفيذها') return false;
                        return true;
                      })
                      .map((cmp) => {
                        const linkedReps = reports.filter((r) => r.campaignId === cmp.id);
                        const linkedSzs = seizures.filter((s) => s.campaignId === cmp.id);
                        const cmpFields: EditableFieldSpec[] = [
                          { key: 'campaignNumber', label: 'رقم الحملة' },
                          { key: 'campaignDate', label: 'تاريخ الحملة', type: 'date' },
                          { key: 'campaignType', label: 'نوع الحملة' },
                          { key: 'campaignLeader', label: 'رئيس الحملة' },
                          { key: 'village', label: 'القرية' },
                          { key: 'campaignScope', label: 'نطاق الحملة' },
                          { key: 'targetedEstablishmentsCount', label: 'عدد المنشآت المستهدفة', type: 'number' },
                          { key: 'inspectedEstablishmentsCount', label: 'عدد المنشآت المفحوصة', type: 'number' },
                          { key: 'status', label: 'الحالة' },
                          { key: 'resultSummary', label: 'ملخص النتائج' },
                        ];
                        return (
                          <tr key={cmp.id} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="p-2.5">
                              <span className="font-black text-[#164E83] block">{cmp.campaignNumber}</span>
                              <span className="text-[10.5px] font-bold text-slate-600">{formatDateArabic(cmp.campaignDate)} ({toArabicNumerals(cmp.startTime)} - {toArabicNumerals(cmp.endTime)})</span>
                            </td>
                            <td className="p-2.5">
                              <span className="font-black text-[#102A43] block">{cmp.campaignType}</span>
                              <span className="text-[10.5px] font-bold text-slate-600">{cmp.campaignScope}</span>
                            </td>
                            <td className="p-2.5">
                              <span className="font-black text-slate-800 block">{cmp.campaignLeader}</span>
                              <span className="text-[10.5px] font-bold text-slate-500">{cmp.participatingAuthorities.join(' + ')}</span>
                            </td>
                            <td className="p-2.5 text-center num-cell font-black">
                              {toArabicNumerals(cmp.inspectedEstablishmentsCount)} / {toArabicNumerals(cmp.targetedEstablishmentsCount)}
                            </td>
                            <td className="p-2.5 text-center num-cell font-black">
                              <span className="text-red-700">{toArabicNumerals(linkedReps.length)} محضر</span> · <span className="text-[#164E83]">{toArabicNumerals(linkedSzs.length)} ضبط</span>
                            </td>
                            <td className="p-2.5 text-center space-y-1">
                              <span className={`block text-xs font-black ${cmp.status === 'منفذة' ? 'text-emerald-700' : 'text-amber-700'}`}>
                                {cmp.status}
                              </span>
                              <button
                                type="button"
                                onClick={() => setSelectedCampaignReport(cmp)}
                                className="px-2.5 py-1 rounded-lg bg-[#102A43] text-[#C6A15B] text-[10.5px] font-black cursor-pointer"
                              >
                                تقرير الحملة الكامل
                              </button>
                            </td>
                            <td className="p-2.5 text-center">
                              <TableActionButtons
                                onView={() => setSelectedCampaignReport(cmp)}
                                onAdd={() => setShowAddCampaignModal(true)}
                                onEdit={() =>
                                  setCrudModalState({
                                    mode: 'edit',
                                    title: `تعديل بيانات الحملة: ${cmp.campaignNumber}`,
                                    record: cmp as unknown as Record<string, unknown>,
                                    fields: cmpFields,
                                    onSave: (updated) => {
                                      const next = campaigns.map((x) =>
                                        x.id === cmp.id ? ({ ...x, ...updated } as TradeInspectionCampaignRecord) : x
                                      );
                                      setCampaigns(next);
                                      saveTradeCampaigns(next);
                                      notify(`تم تحديث بيانات الحملة (${cmp.campaignNumber}) بنجاح.`);
                                    },
                                  })
                                }
                                onDelete={() => {
                                  const next = campaigns.filter((x) => x.id !== cmp.id);
                                  setCampaigns(next);
                                  saveTradeCampaigns(next);
                                  notify(`تم حذف الحملة (${cmp.campaignNumber}).`);
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
          )}

          {/* ==================== ٦. سجل المخالفات والمحاضر التجارية ==================== */}
          {activeScreen === 'violations' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-black text-[#102A43]">
                    ٦. سجل المخالفات والمحاضر التجارية (متعدد البنود ومرتبط بالسند القانوني والقرار الوزاري)
                  </h4>
                  <p className="text-[11px] font-bold text-slate-600">
                    يضم ٥١ نوع مخالفة تجارية وتموينية مصنفة في ٦ مجموعات مع منع فرض غرامة تلقائية دون سند قانوني سارٍ
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={repFilterMode}
                    onChange={(e) => setRepFilterMode(e.target.value as typeof repFilterMode)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-black"
                  >
                    <option value="ALL">جميع المحاضر ({toArabicNumerals(reports.length)})</option>
                    <option value="SETTLED">المحاضر التي تم التصالح عليها</option>
                    <option value="UNSETTLED">المحاضر التي لم يتم التصالح عليها</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddViolationModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>تحرير محضر مخالفة تجارية جديد</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#102A43] text-white">
                      <th className="p-2.5 border border-slate-700">رقم المحضر والحملة</th>
                      <th className="p-2.5 border border-slate-700">التاريخ والوقت</th>
                      <th className="p-2.5 border border-slate-700">المنشأة والتاجر</th>
                      <th className="p-2.5 border border-slate-700">الجهة المحررة والمفتش</th>
                      <th className="p-2.5 border border-slate-700">بنود المخالفات والسند القانوني</th>
                      <th className="p-2.5 border border-slate-700 text-center">المضبوطات</th>
                      <th className="p-2.5 border border-slate-700 text-center">المبلغ المستحق</th>
                      <th className="p-2.5 border border-slate-700 text-center">الحالة</th>
                      <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports
                      .filter((r) => {
                        if (repFilterMode === 'SETTLED' && !r.isSettled) return false;
                        if (repFilterMode === 'UNSETTLED' && r.isSettled) return false;
                        return true;
                      })
                      .map((r) => {
                        const repFields: EditableFieldSpec[] = [
                          { key: 'reportNumber', label: 'رقم المحضر' },
                          { key: 'reportDate', label: 'تاريخ المحضر', type: 'date' },
                          { key: 'establishmentName', label: 'اسم المنشأة' },
                          { key: 'ownerName', label: 'اسم التاجر' },
                          { key: 'village', label: 'القرية' },
                          { key: 'issuingAuthority', label: 'الجهة المحررة' },
                          { key: 'inspectorName', label: 'المفتش' },
                          { key: 'totalSeizedQuantitySummary', label: 'المضبوطات' },
                          { key: 'totalFineAmountEgp', label: 'المبلغ المستحق (ج.م)', type: 'number' },
                          { key: 'reportStatus', label: 'حالة المحضر' },
                        ];
                        return (
                          <tr key={r.id} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="p-2.5">
                              <span className="font-black text-[#102A43] block">{r.reportNumber}</span>
                              <span className="text-[10.5px] font-bold text-[#164E83]">حملة: {r.campaignNumber || 'مرور منفرد'}</span>
                            </td>
                            <td className="p-2.5 num-cell font-bold">
                              {formatDateArabic(r.reportDate)} · {toArabicNumerals(r.reportTime)}
                            </td>
                            <td className="p-2.5">
                              <span className="font-black text-[#102A43] block">{r.establishmentName}</span>
                              <span className="text-[11px] font-bold text-slate-600">{r.ownerName} · {r.village}</span>
                            </td>
                            <td className="p-2.5">
                              <span className="font-bold text-slate-800 block">{r.issuingAuthority}</span>
                              <span className="text-[11px] font-bold text-slate-500">{r.inspectorName}</span>
                            </td>
                            <td className="p-2.5">
                              {r.items.map((it) => (
                                <div key={it.id} className="mb-1">
                                  <span className="font-black text-red-800">{it.violationTitle}</span>
                                  <span className="block text-[10px] font-bold text-slate-500">السند: {it.legalBasis}</span>
                                </div>
                              ))}
                            </td>
                            <td className="p-2.5 text-center font-bold">{r.totalSeizedQuantitySummary}</td>
                            <td className="p-2.5 text-center num-cell font-black text-[#102A43]">
                              {formatArabicCurrency(r.totalFineAmountEgp)}
                            </td>
                            <td className="p-2.5 text-center font-black">
                              <span className={r.isSettled ? 'text-emerald-700' : 'text-red-700'}>
                                {r.reportStatus}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <TableActionButtons
                                onView={() =>
                                  setCrudModalState({
                                    mode: 'view',
                                    title: `تفاصيل المحضر: ${r.reportNumber}`,
                                    record: r as unknown as Record<string, unknown>,
                                    fields: repFields,
                                  })
                                }
                                onAdd={() => setShowAddViolationModal(true)}
                                onEdit={() =>
                                  setCrudModalState({
                                    mode: 'edit',
                                    title: `تعديل المحضر: ${r.reportNumber}`,
                                    record: r as unknown as Record<string, unknown>,
                                    fields: repFields,
                                    onSave: (updated) => {
                                      const next = reports.map((x) =>
                                        x.id === r.id ? ({ ...x, ...updated } as CommercialViolationReportRecord) : x
                                      );
                                      setReports(next);
                                      saveCommercialViolationReports(next);
                                      notify(`تم تحديث المحضر (${r.reportNumber}) بنجاح.`);
                                    },
                                  })
                                }
                                onDelete={() => {
                                  const next = reports.filter((x) => x.id !== r.id);
                                  setReports(next);
                                  saveCommercialViolationReports(next);
                                  notify(`تم حذف المحضر (${r.reportNumber}).`);
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
          )}

          {/* ==================== ٧. التصالحات والتسويات ==================== */}
          {activeScreen === 'settlements' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-black text-[#102A43]">
                    ٧. قاعدة بيانات التصالحات والتسويات والمبالغ المحصلة
                  </h4>
                  <p className="text-[11px] font-bold text-slate-600">
                    لا يتم تغيير حالة المحضر إلى متصالح أو احتساب المبلغ محصلاً إلا بعد استيفاء الموافقة وتسجيل رقم إيصال السداد الفعلي
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddSettlementModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>تسجيل طلب تصالح / إيصال سداد</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#102A43] text-white">
                      <th className="p-2.5 border border-slate-700">رقم طلب التصالح</th>
                      <th className="p-2.5 border border-slate-700">رقم المحضر</th>
                      <th className="p-2.5 border border-slate-700">المنشأة والتاجر</th>
                      <th className="p-2.5 border border-slate-700 text-center">المبلغ المستحق</th>
                      <th className="p-2.5 border border-slate-700 text-center">قيمة التصالح المعتمدة</th>
                      <th className="p-2.5 border border-slate-700 text-center">المبلغ المسدد الفعلي</th>
                      <th className="p-2.5 border border-slate-700 text-center">المتبقي</th>
                      <th className="p-2.5 border border-slate-700 text-center">رقم إيصال السداد</th>
                      <th className="p-2.5 border border-slate-700 text-center">حالة الطلب</th>
                      <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlements.map((s) => {
                      const stlFields: EditableFieldSpec[] = [
                        { key: 'settlementRequestNumber', label: 'رقم طلب التصالح' },
                        { key: 'reportNumber', label: 'رقم المحضر' },
                        { key: 'establishmentName', label: 'اسم المنشأة' },
                        { key: 'traderName', label: 'اسم التاجر' },
                        { key: 'dueAmountEgp', label: 'المبلغ المستحق (ج.م)', type: 'number' },
                        { key: 'approvedSettlementAmountEgp', label: 'قيمة التصالح المعتمدة (ج.م)', type: 'number' },
                        { key: 'paidAmountEgp', label: 'المبلغ المسدد الفعلي (ج.م)', type: 'number' },
                        { key: 'remainingAmountEgp', label: 'المتبقي (ج.م)', type: 'number' },
                        { key: 'paymentReceiptNumber', label: 'رقم إيصال السداد' },
                        { key: 'status', label: 'حالة الطلب' },
                      ];
                      return (
                        <tr key={s.id} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="p-2.5 font-black text-[#164E83]">{s.settlementRequestNumber}</td>
                          <td className="p-2.5 font-black text-[#102A43]">{s.reportNumber}</td>
                          <td className="p-2.5">
                            <span className="font-black block">{s.establishmentName}</span>
                            <span className="text-[10.5px] font-bold text-slate-500">{s.traderName}</span>
                          </td>
                          <td className="p-2.5 text-center num-cell font-bold">{formatArabicCurrency(s.dueAmountEgp)}</td>
                          <td className="p-2.5 text-center num-cell font-black text-[#102A43]">{formatArabicCurrency(s.approvedSettlementAmountEgp)}</td>
                          <td className="p-2.5 text-center num-cell font-black text-emerald-700">{formatArabicCurrency(s.paidAmountEgp)}</td>
                          <td className="p-2.5 text-center num-cell font-black text-red-700">{formatArabicCurrency(s.remainingAmountEgp)}</td>
                          <td className="p-2.5 text-center font-bold">{s.paymentReceiptNumber || '—'}</td>
                          <td className="p-2.5 text-center font-black text-[#102A43]">{s.status}</td>
                          <td className="p-2.5 text-center">
                            <TableActionButtons
                              onView={() =>
                                setCrudModalState({
                                  mode: 'view',
                                  title: `بيانات التصالح: ${s.settlementRequestNumber}`,
                                  record: s as unknown as Record<string, unknown>,
                                  fields: stlFields,
                                })
                              }
                              onAdd={() => setShowAddSettlementModal(true)}
                              onEdit={() =>
                                setCrudModalState({
                                  mode: 'edit',
                                  title: `تعديل التصالح: ${s.settlementRequestNumber}`,
                                  record: s as unknown as Record<string, unknown>,
                                  fields: stlFields,
                                  onSave: (updated) => {
                                    const next = settlements.map((x) =>
                                      x.id === s.id ? ({ ...x, ...updated } as CommercialSettlementRecord) : x
                                    );
                                    setSettlements(next);
                                    saveCommercialSettlements(next);
                                    notify(`تم تحديث طلب التصالح (${s.settlementRequestNumber}) بنجاح.`);
                                  },
                                })
                              }
                              onDelete={() => {
                                const next = settlements.filter((x) => x.id !== s.id);
                                setSettlements(next);
                                saveCommercialSettlements(next);
                                notify(`تم حذف طلب التصالح (${s.settlementRequestNumber}).`);
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
          )}

          {/* ==================== ٨. المضبوطات والتحفظات التموينية ودفتر حركتها ==================== */}
          {activeScreen === 'seizures' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-black text-[#102A43]">
                      ٨. قاعدة بيانات المضبوطات والتحفظات التموينية ودفتر حركة العهدة
                    </h4>
                    <p className="text-[11px] font-bold text-slate-600">
                      يحسب الرصيد الفعلي للعهدة من الحركات المعتمدة فقط، ويمنع التصرف إلا بقرار موثق من الجهة المختصة مع حفظ الأثر التدقيقي
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowInventoryPrintModal(true)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-black flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>إصدار محضر جرد ومطابقة</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddSeizureMovementModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-xs font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>تسجيل حركة مضبوطات (بقرار موثق)</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#102A43] text-white">
                        <th className="p-2.5 border border-slate-700">رقم المضبوطات والمحضر</th>
                        <th className="p-2.5 border border-slate-700">المنشأة والتاجر</th>
                        <th className="p-2.5 border border-slate-700">السلعة المضبوطة وحالتها</th>
                        <th className="p-2.5 border border-slate-700 text-center">الكمية الأولية</th>
                        <th className="p-2.5 border border-slate-700 text-center">الرصيد الفعلي الحالي بالعهدة</th>
                        <th className="p-2.5 border border-slate-700 text-center">القيمة التقديرية</th>
                        <th className="p-2.5 border border-slate-700">مكان التحفظ وأمين العهدة</th>
                        <th className="p-2.5 border border-slate-700 text-center">الحالة القانونية وقرار التصرف</th>
                        <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seizures.map((sz) => {
                        const szFields: EditableFieldSpec[] = [
                          { key: 'seizureNumber', label: 'رقم المضبوطات' },
                          { key: 'reportNumber', label: 'رقم المحضر' },
                          { key: 'establishmentName', label: 'اسم المنشأة' },
                          { key: 'traderName', label: 'اسم التاجر' },
                          { key: 'productName', label: 'السلعة المضبوطة' },
                          { key: 'initialQuantity', label: 'الكمية الأولية', type: 'number' },
                          { key: 'currentActualBalance', label: 'الرصيد الفعلي الحالي', type: 'number' },
                          { key: 'unit', label: 'الوحدة' },
                          { key: 'estimatedValueEgp', label: 'القيمة التقديرية (ج.م)', type: 'number' },
                          { key: 'custodyLocation', label: 'مكان التحفظ' },
                          { key: 'custodianName', label: 'أمين العهدة' },
                          { key: 'legalStatus', label: 'الحالة القانونية' },
                        ];
                        return (
                          <tr key={sz.id} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="p-2.5">
                              <span className="font-black text-[#164E83] block">{sz.seizureNumber}</span>
                              <span className="text-[10.5px] font-bold text-slate-600">{sz.reportNumber}</span>
                            </td>
                            <td className="p-2.5">
                              <span className="font-black text-[#102A43] block">{sz.establishmentName}</span>
                              <span className="text-[10.5px] font-bold text-slate-500">{sz.traderName} · {sz.village}</span>
                            </td>
                            <td className="p-2.5">
                              <span className="font-black block">{sz.productName}</span>
                              <span className="text-[10.5px] font-bold text-red-700">{sz.commodityCondition} — {sz.seizureReason}</span>
                            </td>
                            <td className="p-2.5 text-center num-cell font-bold">
                              {formatArabicNumber(sz.initialQuantity)} {sz.unit}
                            </td>
                            <td className="p-2.5 text-center num-cell font-black text-[#102A43]">
                              {formatArabicNumber(sz.currentActualBalance)} {sz.unit}
                            </td>
                            <td className="p-2.5 text-center num-cell font-bold text-slate-700">
                              {formatArabicCurrency(sz.estimatedValueEgp)}
                            </td>
                            <td className="p-2.5">
                              <span className="font-bold block">{sz.custodyLocation}</span>
                              <span className="text-[10.5px] font-bold text-slate-500">{sz.custodianName}</span>
                            </td>
                            <td className="p-2.5 text-center">
                              <span className="font-black text-[#102A43] block">{sz.legalStatus}</span>
                              <span className="text-[10px] font-bold text-emerald-800">
                                {sz.disposalDecisionNumber || 'تنبيه: لم يصدر قرار تصرف بعد'}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <TableActionButtons
                                onView={() =>
                                  setCrudModalState({
                                    mode: 'view',
                                    title: `تفاصيل سجل المضبوطات: ${sz.seizureNumber}`,
                                    record: sz as unknown as Record<string, unknown>,
                                    fields: szFields,
                                  })
                                }
                                onAdd={() => setShowAddSeizureMovementModal(true)}
                                onEdit={() =>
                                  setCrudModalState({
                                    mode: 'edit',
                                    title: `تعديل سجل المضبوطات: ${sz.seizureNumber}`,
                                    record: sz as unknown as Record<string, unknown>,
                                    fields: szFields,
                                    onSave: (updated) => {
                                      const next = seizures.map((x) =>
                                        x.id === sz.id ? ({ ...x, ...updated } as CommercialSeizureRecord) : x
                                      );
                                      setSeizures(next);
                                      saveCommercialSeizures(next);
                                      notify(`تم تحديث سجل المضبوطات (${sz.seizureNumber}) بنجاح.`);
                                    },
                                  })
                                }
                                onDelete={() => {
                                  const next = seizures.filter((x) => x.id !== sz.id);
                                  setSeizures(next);
                                  saveCommercialSeizures(next);
                                  notify(`تم حذف سجل المضبوطات (${sz.seizureNumber}).`);
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

              {/* دفتر حركة المضبوطات المستقل */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                <h5 className="text-xs font-black text-[#102A43]">
                  دفتر حركة المضبوطات المعتمد (الاستلام · النقل · الإضافة · التسليم · الإفراج · الإعدام) — سجل تدقيقي غير قابل للحذف
                </h5>
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-800 text-white">
                        <th className="p-2 border border-slate-700">رقم الحركة</th>
                        <th className="p-2 border border-slate-700">رقم المضبوطات والمحضر</th>
                        <th className="p-2 border border-slate-700 text-center">نوع الحركة</th>
                        <th className="p-2 border border-slate-700 text-center">الكمية</th>
                        <th className="p-2 border border-slate-700">التاريخ والوقت</th>
                        <th className="p-2 border border-slate-700">المُسلّم والمُستلِم</th>
                        <th className="p-2 border border-slate-700">قرار الجهة المختصة الموثق</th>
                        <th className="p-2 border border-slate-700 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seizureMovements.map((mv) => {
                        const mvFields: EditableFieldSpec[] = [
                          { key: 'movementNumber', label: 'رقم الحركة' },
                          { key: 'seizureNumber', label: 'رقم المضبوطات' },
                          { key: 'reportNumber', label: 'رقم المحضر' },
                          { key: 'movementType', label: 'نوع الحركة' },
                          { key: 'quantity', label: 'الكمية', type: 'number' },
                          { key: 'unit', label: 'الوحدة' },
                          { key: 'movementDate', label: 'تاريخ الحركة', type: 'date' },
                          { key: 'deliveredBy', label: 'المُسلّم' },
                          { key: 'receivedBy', label: 'المُستلِم' },
                          { key: 'officialDecisionReference', label: 'قرار الجهة المختصة الموثق' },
                        ];
                        return (
                          <tr key={mv.id} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="p-2 font-black text-[#164E83]">{mv.movementNumber}</td>
                            <td className="p-2 font-bold">{mv.seizureNumber} ({mv.reportNumber})</td>
                            <td className="p-2 text-center font-black text-[#102A43]">{mv.movementType}</td>
                            <td className="p-2 text-center num-cell font-black">{formatArabicNumber(mv.quantity)} {mv.unit}</td>
                            <td className="p-2 num-cell font-bold">{formatDateArabic(mv.movementDate)} · {toArabicNumerals(mv.movementTime)}</td>
                            <td className="p-2 font-bold">{mv.deliveredBy} ← {mv.receivedBy}</td>
                            <td className="p-2 font-black text-emerald-800">{mv.officialDecisionReference}</td>
                            <td className="p-2 text-center">
                              <TableActionButtons
                                onView={() =>
                                  setCrudModalState({
                                    mode: 'view',
                                    title: `تفاصيل حركة المضبوطات: ${mv.movementNumber}`,
                                    record: mv as unknown as Record<string, unknown>,
                                    fields: mvFields,
                                  })
                                }
                                onAdd={() => setShowAddSeizureMovementModal(true)}
                                onEdit={() =>
                                  setCrudModalState({
                                    mode: 'edit',
                                    title: `تعديل حركة المضبوطات: ${mv.movementNumber}`,
                                    record: mv as unknown as Record<string, unknown>,
                                    fields: mvFields,
                                    onSave: (updated) => {
                                      const next = seizureMovements.map((x) =>
                                        x.id === mv.id ? ({ ...x, ...updated } as SeizureMovementRecord) : x
                                      );
                                      setSeizureMovements(next);
                                      saveSeizureMovements(next);
                                      notify(`تم تحديث حركة المضبوطات (${mv.movementNumber}) بنجاح.`);
                                    },
                                  })
                                }
                                onDelete={() => {
                                  notify('تنبيه رقابي: حركات دفتر المضبوطات المعتمدة ذات أثر تدقيقي لا يمكن حذفها.');
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

          {/* ==================== ٩. متابعة الأسواق والسلع والأسعار ==================== */}
          {activeScreen === 'markets' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-black text-[#102A43]">
                      ٩. متابعة الأسواق والسلع والأسعار داخل السوق المصري بمحافظة الغربية
                    </h4>
                    <p className="text-[11px] font-bold text-slate-600">
                      يميز النظام بين السعر المرصود والسعر الرسمي المعتمد (الذي يشترط إدخال قرار تحديده ومصدره وتاريخ سريانه)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddPriceObsModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>تسجيل رصد أسعار يومي بالسوق</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#102A43] text-white">
                        <th className="p-2.5 border border-slate-700">السلعة والتصنيف</th>
                        <th className="p-2.5 border border-slate-700">السوق والقرية</th>
                        <th className="p-2.5 border border-slate-700 text-center">أقل / أعلى / متوسط السعر</th>
                        <th className="p-2.5 border border-slate-700 text-center">السعر المعلن</th>
                        <th className="p-2.5 border border-slate-700 text-center">السعر المرصود</th>
                        <th className="p-2.5 border border-slate-700 text-center">السعر الرسمي المعتمد ومصدره</th>
                        <th className="p-2.5 border border-slate-700 text-center">حالة التوافر</th>
                        <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priceObservations.map((obs) => {
                        const isOverOfficial =
                          obs.officialPriceEgp !== undefined && obs.observedPriceEgp > obs.officialPriceEgp;
                        const obsFields: EditableFieldSpec[] = [
                          { key: 'commodityName', label: 'السلعة' },
                          { key: 'category', label: 'التصنيف' },
                          { key: 'marketName', label: 'اسم السوق' },
                          { key: 'village', label: 'القرية' },
                          { key: 'minPriceEgp', label: 'أقل سعر (ج.م)', type: 'number' },
                          { key: 'maxPriceEgp', label: 'أعلى سعر (ج.م)', type: 'number' },
                          { key: 'announcedPriceEgp', label: 'السعر المعلن (ج.م)', type: 'number' },
                          { key: 'observedPriceEgp', label: 'السعر المرصود (ج.م)', type: 'number' },
                          { key: 'officialPriceEgp', label: 'السعر الرسمي (ج.م)', type: 'number' },
                          { key: 'officialPriceSourceDecree', label: 'مصدر السعر الرسمي' },
                          { key: 'availabilityStatus', label: 'حالة التوافر' },
                        ];
                        return (
                          <tr key={obs.id} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="p-2.5">
                              <span className="font-black text-[#102A43] block">{obs.commodityName}</span>
                              <span className="text-[10.5px] font-bold text-slate-500">{obs.category} · {obs.packageOrWeight}</span>
                            </td>
                            <td className="p-2.5">
                              <span className="font-black block">{obs.marketName}</span>
                              <span className="text-[10.5px] font-bold text-slate-500">{obs.village} · {formatDateArabic(obs.observationDate)}</span>
                            </td>
                            <td className="p-2.5 text-center num-cell font-bold">
                              {formatArabicNumber(obs.minPriceEgp)} / {formatArabicNumber(obs.maxPriceEgp)} (متوسط: {formatArabicNumber(obs.avgPriceEgp)} ج.م)
                            </td>
                            <td className="p-2.5 text-center num-cell font-bold">{formatArabicCurrency(obs.announcedPriceEgp)}</td>
                            <td className="p-2.5 text-center num-cell font-black">
                              <span className={isOverOfficial ? 'text-red-700' : 'text-[#102A43]'}>
                                {formatArabicCurrency(obs.observedPriceEgp)}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              {obs.officialPriceEgp ? (
                                <div>
                                  <span className="num-cell font-black text-emerald-800">{formatArabicCurrency(obs.officialPriceEgp)}</span>
                                  <span className="block text-[10px] font-bold text-slate-500">{obs.officialPriceSourceDecree}</span>
                                </div>
                              ) : (
                                <span className="text-slate-500 font-bold">تداول حر غير مسعر</span>
                              )}
                            </td>
                            <td className="p-2.5 text-center font-black">
                              <span className={obs.availabilityStatus === 'متوفر' ? 'text-emerald-700' : 'text-amber-700'}>
                                {obs.availabilityStatus}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <TableActionButtons
                                onView={() =>
                                  setCrudModalState({
                                    mode: 'view',
                                    title: `تفاصيل رصد سعر السلعة: ${obs.commodityName}`,
                                    record: obs as unknown as Record<string, unknown>,
                                    fields: obsFields,
                                  })
                                }
                                onAdd={() => setShowAddPriceObsModal(true)}
                                onEdit={() =>
                                  setCrudModalState({
                                    mode: 'edit',
                                    title: `تعديل رصد سعر السلعة: ${obs.commodityName}`,
                                    record: obs as unknown as Record<string, unknown>,
                                    fields: obsFields,
                                    onSave: (updated) => {
                                      const next = priceObservations.map((x) =>
                                        x.id === obs.id ? ({ ...x, ...updated } as CommodityPriceObservationRecord) : x
                                      );
                                      setPriceObservations(next);
                                      savePriceObservations(next);
                                      notify(`تم تحديث رصد سعر (${obs.commodityName}) بنجاح.`);
                                    },
                                  })
                                }
                                onDelete={() => {
                                  const next = priceObservations.filter((x) => x.id !== obs.id);
                                  setPriceObservations(next);
                                  savePriceObservations(next);
                                  notify(`تم حذف سجل رصد السعر (${obs.commodityName}).`);
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

          {/* ==================== ٧ و ٨: الحملات والتفتيش التمويني والمخالفات والمحاضر والنيابات (المدمجة من الشريط الأيمن) ==================== */}
          {(activeScreen === 'field_inspection' || activeScreen === 'field_violations') && (
            <BakeryInspectionModule
              bakeries={bakeries}
              inspections={inspections}
              currentUser={currentUser}
              activeFocus={activeScreen === 'field_inspection' ? 'ins-campaigns' : 'ins-violations'}
              todayRef={todayRef}
              onAddInspection={onAddInspection || (() => undefined)}
              onUpdateStatus={onUpdateInspectionStatus || (() => undefined)}
              onSelectBakeryDetails={onSelectBakeryDetails || (() => undefined)}
            />
          )}

          {/* ==================== الشاشات ١٢ إلى ١٩: البوتاجاز، المواد البترولية، المحطات، المستودعات، الموزعين، المقارنة ==================== */}
          {(activeScreen === 'butane_management' ||
            activeScreen === 'butane_beneficiaries' ||
            activeScreen === 'petroleum_management' ||
            activeScreen === 'petroleum_beneficiaries' ||
            activeScreen === 'fuel_stations' ||
            activeScreen === 'butane_warehouses' ||
            activeScreen === 'butane_distributors' ||
            activeScreen === 'village_comparison') && (
            <InternalTradeEnergyAndComparisonView
              activeScreen={activeScreen}
              userId={currentUser.id}
              currentUserName={currentUser.fullName}
              todayRef={todayRef}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              establishments={establishments}
              licenses={licenses}
              campaigns={campaigns}
              reports={reports}
              settlements={settlements}
              priceObservations={priceObservations}
              butaneAllocations={butaneAllocations}
              onSaveButaneAllocations={(next) => {
                setButaneAllocations(next);
                saveButaneAllocations(next);
              }}
              petroleumAllocations={petroleumAllocations}
              onSavePetroleumAllocations={(next) => {
                setPetroleumAllocations(next);
                savePetroleumAllocations(next);
              }}
              fuelStations={fuelStations}
              onSaveFuelStations={(next) => {
                setFuelStations(next);
                saveFuelStations(next);
              }}
              fuelMovements={fuelMovements}
              onSaveFuelMovements={(next) => {
                setFuelMovements(next);
                saveFuelMovements(next);
              }}
              fuelInspections={fuelInspections}
              onSaveFuelInspections={(next) => {
                setFuelInspections(next);
                saveFuelInspections(next);
              }}
              butaneWarehouses={butaneWarehouses}
              onSaveButaneWarehouses={(next) => {
                setButaneWarehouses(next);
                saveButaneWarehouses(next);
              }}
              butaneWarehouseMovements={butaneWarehouseMovements}
              onSaveButaneWarehouseMovements={(next) => {
                setButaneWarehouseMovements(next);
                saveButaneWarehouseMovements(next);
              }}
              butaneDistributors={butaneDistributors}
              onSaveButaneDistributors={(next) => {
                setButaneDistributors(next);
                saveButaneDistributors(next);
              }}
              butaneDistributorMovements={butaneDistributorMovements}
              onSaveButaneDistributorMovements={(next) => {
                setButaneDistributorMovements(next);
                saveButaneDistributorMovements(next);
              }}
              onNotify={notify}
            />
          )}

          {/* ==================== الشاشات ١٨ إلى ٢٠: التنبيهات الذكية، مركز التقارير، الإعدادات وSupabase ==================== */}
          {(activeScreen === 'smart_alerts' ||
            activeScreen === 'reports_center' ||
            activeScreen === 'settings_and_schema') && (
            <InternalTradeAlertsReportsSettingsView
              activeScreen={activeScreen}
              currentUserName={currentUser.fullName}
              todayRef={todayRef}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              alerts={smartAlerts}
              closedAlertIds={closedAlertIds}
              onCloseAlert={(id, notes) => {
                setClosedAlertIds((prev) => ({
                  ...prev,
                  [id]: { closedAt: todayRef, notes },
                }));
                notify('تم توثيق معالجة التنبيه وإغلاقه بنجاح.');
              }}
              establishments={establishments}
              activities={activities}
              licenses={licenses}
              campaigns={campaigns}
              reports={reports}
              settlements={settlements}
              seizures={seizures}
              seizureMovements={seizureMovements}
              commodities={commodities}
              priceObservations={priceObservations}
              butaneAllocations={butaneAllocations}
              petroleumAllocations={petroleumAllocations}
              fuelStations={fuelStations}
              fuelMovements={fuelMovements}
              fuelInspections={fuelInspections}
              butaneWarehouses={butaneWarehouses}
              butaneWarehouseMovements={butaneWarehouseMovements}
              butaneDistributors={butaneDistributors}
              butaneDistributorMovements={butaneDistributorMovements}
              onNotify={notify}
            />
          )}
      </div>

      {/* ==================== النوافذ المنبثقة للإضافة والتفاصيل ==================== */}

      {/* نافذة المعاينة والتعديل الموحدة لجميع جداول قسم التجارة الداخلية */}
      {crudModalState && (
        <UniversalCrudModal
          mode={crudModalState.mode}
          title={crudModalState.title}
          record={crudModalState.record}
          fields={crudModalState.fields}
          todayRef={todayRef}
          onClose={() => setCrudModalState(null)}
          onSave={crudModalState.onSave}
        />
      )}

      {/* ١. نافذة إضافة منشأة تجارية جديدة */}
      {showAddEstModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateEstablishment}
            className="bg-white rounded-2xl border-2 border-[#102A43] max-w-2xl w-full p-5 space-y-3 text-xs max-h-[90vh] overflow-y-auto"
          >
            <h4 className="text-sm font-black text-[#102A43] border-b pb-2">
              قيد منشأة تجارية جديدة في سجل المحلات والمنشآت التجارية
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-black block mb-1">اسم المحل أو المنشأة *</label>
                <input required type="text" value={estName} onChange={(e) => setEstName(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg font-bold" />
              </div>
              <div>
                <label className="font-black block mb-1">اسم التاجر / صاحب المنشأة *</label>
                <input required type="text" value={estOwner} onChange={(e) => setEstOwner(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg font-bold" />
              </div>
              <div>
                <label className="font-black block mb-1">تصنيف المنشأة</label>
                <select value={estCategory} onChange={(e) => setEstCategory(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg font-bold">
                  {settings.establishmentCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="font-black block mb-1">النشاط الرئيسي للمنشأة</label>
                <select value={estPrimaryAct} onChange={(e) => setEstPrimaryAct(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg font-bold">
                  {activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="font-black block mb-1">القرية</label>
                <input type="text" value={estVillage} onChange={(e) => setEstVillage(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg font-bold" />
              </div>
              <div>
                <label className="font-black block mb-1">الوحدة المحلية</label>
                <input type="text" value={estLocalUnit} onChange={(e) => setEstLocalUnit(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg font-bold" />
              </div>
              <div>
                <label className="font-black block mb-1">رقم البطاقة الضريبية وتاريخ انتهائها</label>
                <div className="flex gap-1.5">
                  <input type="text" value={estTaxCard} onChange={(e) => setEstTaxCard(e.target.value)} className="w-1/2 px-2 py-1.5 border rounded-lg font-bold" placeholder="رقم البطاقة الضريبية" />
                  <input type="date" value={estTaxCardExp} onChange={(e) => setEstTaxCardExp(e.target.value)} className="w-1/2 px-2 py-1.5 border rounded-lg font-bold" />
                </div>
              </div>
              <div>
                <label className="font-black block mb-1">رقم السجل التجاري وتاريخ انتهائه</label>
                <div className="flex gap-1.5">
                  <input type="text" value={estCommReg} onChange={(e) => setEstCommReg(e.target.value)} className="w-1/2 px-2 py-1.5 border rounded-lg font-bold" placeholder="رقم السجل التجاري" />
                  <input type="date" value={estCommRegExp} onChange={(e) => setEstCommRegExp(e.target.value)} className="w-1/2 px-2 py-1.5 border rounded-lg font-bold" />
                </div>
              </div>
              <div>
                <label className="font-black block mb-1">رقم الترخيص وتاريخ انتهائه</label>
                <div className="flex gap-1.5">
                  <input type="text" value={estLicenseNo} onChange={(e) => setEstLicenseNo(e.target.value)} className="w-1/2 px-2 py-1.5 border rounded-lg font-bold" placeholder="رقم الترخيص" />
                  <input type="date" value={estLicenseExp} onChange={(e) => setEstLicenseExp(e.target.value)} className="w-1/2 px-2 py-1.5 border rounded-lg font-bold" />
                </div>
              </div>
              <div>
                <label className="font-black block mb-1">موقف الترخيص وحالة المنشأة</label>
                <div className="flex gap-1.5">
                  <select value={estIsLicensed ? 'YES' : 'NO'} onChange={(e) => setEstIsLicensed(e.target.value === 'YES')} className="w-1/2 px-2 py-1.5 border rounded-lg font-bold">
                    <option value="YES">مرخصة</option>
                    <option value="NO">غير مرخصة</option>
                  </select>
                  <select value={estStatus} onChange={(e) => setEstStatus(e.target.value as EstablishmentStatus)} className="w-1/2 px-2 py-1.5 border rounded-lg font-bold">
                    <option value="تعمل">تعمل</option>
                    <option value="متوقفة مؤقتاً">متوقفة مؤقتاً</option>
                    <option value="مغلقة">مغلقة</option>
                    <option value="تحتاج إلى معاينة">تحتاج إلى معاينة</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="chk-mismatch"
                checked={estHasMismatch}
                onChange={(e) => setEstHasMismatch(e.target.checked)}
              />
              <label htmlFor="chk-mismatch" className="font-black text-red-800">
                المنشأة تمارس نشاطاً إضافياً غير مسجل أو غير مطابق للترخيص
              </label>
            </div>
            {estHasMismatch && (
              <input
                type="text"
                placeholder="وصف النشاط غير المسجل أو المخالف للترخيص..."
                value={estMismatchNote}
                onChange={(e) => setEstMismatchNote(e.target.value)}
                className="w-full px-3 py-1.5 border border-red-300 rounded-lg font-bold"
              />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddEstModal(false)} className="px-4 py-1.5 rounded-xl bg-slate-200 font-black cursor-pointer">إلغاء</button>
              <button type="submit" className="px-4 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] font-black cursor-pointer">حفظ المنشأة بالسجل</button>
            </div>
          </form>
        </div>
      )}

      {/* نافذة ملف المنشأة التجارية الكامل (٢٥ حقلاً) */}
      {selectedEstDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setSelectedEstDetails(null)}>
          <div className="bg-white rounded-2xl border-2 border-[#102A43] max-w-2xl w-full p-5 space-y-3 text-xs" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <span className="text-[11px] font-black text-[#164E83]">{selectedEstDetails.autoCode} · {selectedEstDetails.fileNumber}</span>
                <h4 className="text-base font-black text-[#102A43]">{selectedEstDetails.name}</h4>
              </div>
              <button type="button" onClick={() => setSelectedEstDetails(null)} className="px-3 py-1 rounded-lg bg-slate-100 font-black cursor-pointer">إغلاق ✕</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="bg-slate-50 p-2.5 rounded-xl border"><span className="text-slate-500 block">التاجر / المالك</span><span className="font-black">{selectedEstDetails.ownerName}</span></div>
              <div className="bg-slate-50 p-2.5 rounded-xl border"><span className="text-slate-500 block">المدير المسؤول</span><span className="font-black">{selectedEstDetails.managerName}</span></div>
              <div className="bg-slate-50 p-2.5 rounded-xl border"><span className="text-slate-500 block">رقم الهاتف</span><span className="font-black num-cell">{toArabicNumerals(selectedEstDetails.phone)}</span></div>
              <div className="bg-slate-50 p-2.5 rounded-xl border"><span className="text-slate-500 block">نوع الملكية</span><span className="font-black">{selectedEstDetails.ownershipType}</span></div>
              <div className="bg-slate-50 p-2.5 rounded-xl border"><span className="text-slate-500 block">القرية / الوحدة المحلية</span><span className="font-black">{selectedEstDetails.village} — {selectedEstDetails.localUnit}</span></div>
              <div className="bg-slate-50 p-2.5 rounded-xl border"><span className="text-slate-500 block">العنوان التفصيلي</span><span className="font-bold">{selectedEstDetails.detailedAddress}</span></div>
              <div className="bg-slate-50 p-2.5 rounded-xl border"><span className="text-slate-500 block">البطاقة الضريبية وانتهاؤها</span><span className="font-black num-cell">{selectedEstDetails.taxCardNumber} ({formatDateArabic(selectedEstDetails.taxCardExpiryDate)})</span></div>
              <div className="bg-slate-50 p-2.5 rounded-xl border"><span className="text-slate-500 block">السجل التجاري وانتهاؤه</span><span className="font-black num-cell">{selectedEstDetails.commercialRegisterNumber} ({formatDateArabic(selectedEstDetails.commercialRegisterExpiryDate)})</span></div>
              <div className="bg-slate-50 p-2.5 rounded-xl border"><span className="text-slate-500 block">رقم الترخيص وانتهاؤه</span><span className="font-black num-cell">{selectedEstDetails.licenseNumber} ({selectedEstDetails.licenseExpiryDate !== '—' ? formatDateArabic(selectedEstDetails.licenseExpiryDate) : '—'})</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ٢. نافذة تسجيل ترخيص تجاري جديد */}
      {showAddLicModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleCreateLicense} className="bg-white rounded-2xl border-2 border-[#102A43] max-w-lg w-full p-5 space-y-3 text-xs">
            <h4 className="text-sm font-black text-[#102A43] border-b pb-2">تسجيل ترخيص تجاري وربطه بالجهة المختصة الفعلية</h4>
            <div className="space-y-2.5">
              <div>
                <label className="font-black block mb-1">المنشأة التجارية</label>
                <select value={licEstId} onChange={(e) => setLicEstId(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg font-bold">
                  {establishments.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.village})</option>)}
                </select>
              </div>
              <div>
                <label className="font-black block mb-1">رقم الترخيص الرسمي</label>
                <input type="text" value={licNumber} onChange={(e) => setLicNumber(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg font-black" />
              </div>
              <div>
                <label className="font-black block mb-1">نوع الترخيص والجهة المختصة</label>
                <select value={licTypeIdx} onChange={(e) => setLicTypeIdx(Number(e.target.value))} className="w-full px-3 py-1.5 border rounded-lg font-bold">
                  {settings.licenseTypes.map((lt, idx) => (
                    <option key={lt.title} value={idx}>{lt.title} — ({lt.competentAuthority})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-black block mb-1">تاريخ انتهاء الترخيص</label>
                <input type="date" value={licExpiryDate} onChange={(e) => setLicExpiryDate(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg font-black" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddLicModal(false)} className="px-4 py-1.5 rounded-xl bg-slate-200 font-black cursor-pointer">إلغاء</button>
              <button type="submit" className="px-4 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] font-black cursor-pointer">حفظ الترخيص</button>
            </div>
          </form>
        </div>
      )}

      {/* ٣. نافذة تسجيل حملة تموينية جديدة */}
      {showAddCampaignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleCreateCampaign} className="bg-white rounded-2xl border-2 border-[#102A43] max-w-lg w-full p-5 space-y-3 text-xs">
            <h4 className="text-sm font-black text-[#102A43] border-b pb-2">تسجيل حملة تموينية ومرور ميداني</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-black block mb-1">نوع الحملة</label>
                <select value={cmpType} onChange={(e) => setCmpType(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg font-bold">
                  {settings.campaignTypes.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="font-black block mb-1">القرية المستهدفة</label>
                <input type="text" value={cmpVillage} onChange={(e) => setCmpVillage(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg font-bold" />
              </div>
              <div>
                <label className="font-black block mb-1">رئيس الحملة</label>
                <input type="text" value={cmpLeader} onChange={(e) => setCmpLeader(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg font-bold" />
              </div>
              <div>
                <label className="font-black block mb-1">عدد المنشآت المفحوصة</label>
                <input type="number" value={cmpInspected} onChange={(e) => setCmpInspected(Number(e.target.value))} className="w-full px-3 py-1.5 border rounded-lg font-black" />
              </div>
            </div>
            <div>
              <label className="font-black block mb-1">ملخص نتيجة الحملة</label>
              <input type="text" value={cmpSummary} onChange={(e) => setCmpSummary(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg font-bold" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddCampaignModal(false)} className="px-4 py-1.5 rounded-xl bg-slate-200 font-black cursor-pointer">إلغاء</button>
              <button type="submit" className="px-4 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] font-black cursor-pointer">حفظ الحملة</button>
            </div>
          </form>
        </div>
      )}

      {/* نافذة التقرير الكامل للحملة التموينية ونتائجها المترابطة */}
      {selectedCampaignReport && (
        <OfficialPrintModal
          title={`تقرير نتائج الحملة التموينية رقم (${selectedCampaignReport.campaignNumber})`}
          subtitle={`${selectedCampaignReport.campaignType} — القرية: ${selectedCampaignReport.village} — رئيس الحملة: ${selectedCampaignReport.campaignLeader}`}
          docNumber={selectedCampaignReport.campaignNumber}
          printedBy={currentUser.fullName}
          todayRef={todayRef}
          onClose={() => setSelectedCampaignReport(null)}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border rounded-xl">
              <p className="font-black">نطاق الحملة: {selectedCampaignReport.targetStreetsAndAreas}</p>
              <p className="font-bold mt-1">الجهات المشاركة: {selectedCampaignReport.participatingAuthorities.join(' — ')}</p>
              <p className="font-bold mt-1">ملخص النتائج: {selectedCampaignReport.resultSummary}</p>
            </div>
            <h5 className="font-black text-[#102A43]">المحاضر والمخالفات المحررة خلال الحملة:</h5>
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="p-2 border">رقم المحضر</th>
                  <th className="p-2 border">المنشأة</th>
                  <th className="p-2 border">المخالفات والسند القانوني</th>
                  <th className="p-2 border">المضبوطات</th>
                  <th className="p-2 border">المبلغ المستحق</th>
                  <th className="p-2 border print:hidden">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {reports
                  .filter((r) => r.campaignId === selectedCampaignReport.id)
                  .map((r) => (
                    <tr key={r.id}>
                      <td className="p-2 border font-black">{r.reportNumber}</td>
                      <td className="p-2 border font-bold">{r.establishmentName}</td>
                      <td className="p-2 border font-bold">{r.items.map((i) => `${i.violationTitle} (${i.legalBasis})`).join(' + ')}</td>
                      <td className="p-2 border font-bold">{r.totalSeizedQuantitySummary}</td>
                      <td className="p-2 border font-black">{formatArabicCurrency(r.totalFineAmountEgp)}</td>
                      <td className="p-2 border print:hidden">
                        <button
                          type="button"
                          onClick={() => setSelectedCampaignReport(null)}
                          className="px-2 py-0.5 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer"
                        >
                          إغلاق المعينة
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </OfficialPrintModal>
      )}

      {/* ٤. نافذة تحرير محضر مخالفة تجارية متعدد البنود */}
      {showAddViolationModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleCreateViolationReport} className="bg-white rounded-2xl border-2 border-[#102A43] max-w-3xl w-full p-5 space-y-3 text-xs max-h-[90vh] overflow-y-auto">
            <h4 className="text-sm font-black text-[#102A43] border-b pb-2">
              تحرير محضر مخالفة تجارية رسمي متعدد البنود (مرتبط بالحملة والمنشأة والسند القانوني)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-black block mb-1">رقم المحضر</label>
                <input type="text" value={vrReportNo} onChange={(e) => setVrReportNo(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg font-black" />
              </div>
              <div>
                <label className="font-black block mb-1">الحملة التموينية المرتبطة</label>
                <select value={vrCampaignId} onChange={(e) => setVrCampaignId(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg font-bold">
                  <option value="">مرور منفرد</option>
                  {campaigns.map((c) => <option key={c.id} value={c.id}>{c.campaignNumber} ({c.village})</option>)}
                </select>
              </div>
              <div>
                <label className="font-black block mb-1">المنشأة التجارية المخالفة</label>
                <select value={vrEstId} onChange={(e) => setVrEstId(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg font-bold">
                  {establishments.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.village})</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-[#102A43]">بنود المخالفات المسجلة داخل المحضر الواحد:</span>
                <button
                  type="button"
                  onClick={handleAddViolationLine}
                  className="px-3 py-1 rounded-lg bg-[#164E83] text-white font-black cursor-pointer"
                >
                  + إضافة مخالفة أخرى لنفس المحضر
                </button>
              </div>

              {vrDraftItems.map((line, idx) => (
                <div key={line.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <label className="font-black block mb-1">نوع المخالفة ({toArabicNumerals(idx + 1)})</label>
                      <select
                        value={line.catalogId}
                        onChange={(e) => {
                          const cat = violationCatalog.find((c) => c.id === e.target.value);
                          if (!cat) return;
                          setVrDraftItems((prev) =>
                            prev.map((it) =>
                              it.id === line.id
                                ? {
                                    ...it,
                                    catalogId: cat.id,
                                    groupTitle: cat.groupTitle,
                                    violationTitle: cat.title,
                                    detailedDescription: cat.title,
                                    unit: cat.unit,
                                    legalBasis: cat.legalBasisDecree,
                                    competentAuthority: cat.competentAuthority,
                                    approvedMeasure: cat.approvedPenaltyMeasure,
                                    fineAmountEgp: cat.hasAutomaticFinancialFine ? cat.defaultBaseFineEgp : 0,
                                  }
                                : it
                            )
                          );
                        }}
                        className="w-full px-2.5 py-1.5 border rounded-lg font-bold bg-white"
                      >
                        {violationCatalog.map((c) => (
                          <option key={c.id} value={c.id}>[{c.groupTitle}] {c.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-black block mb-1">المبلغ المستحق / الغرامة (ج.م)</label>
                      <input
                        type="number"
                        value={line.fineAmountEgp}
                        onChange={(e) =>
                          setVrDraftItems((prev) =>
                            prev.map((it) =>
                              it.id === line.id ? { ...it, fineAmountEgp: Number(e.target.value) } : it
                            )
                          )
                        }
                        className="w-full px-2.5 py-1.5 border rounded-lg font-black bg-white"
                      />
                    </div>
                  </div>
                  <div className="text-[10.5px] font-bold text-[#164E83]">
                    السند القانوني: {line.legalBasis} · الجهة المختصة: {line.competentAuthority}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddViolationModal(false)} className="px-4 py-1.5 rounded-xl bg-slate-200 font-black cursor-pointer">إلغاء</button>
              <button type="submit" className="px-4 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] font-black cursor-pointer">اعتماد وقيد المحضر</button>
            </div>
          </form>
        </div>
      )}

      {/* ٥. نافذة تسجيل تصالح وتحصيل فعلي */}
      {showAddSettlementModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleCreateSettlement} className="bg-white rounded-2xl border-2 border-[#102A43] max-w-lg w-full p-5 space-y-3 text-xs">
            <h4 className="text-sm font-black text-[#102A43] border-b pb-2">تسجيل طلب تصالح وتحصيل مبلغ بموجب إيصال رسمي</h4>
            <div className="space-y-2.5">
              <div>
                <label className="font-black block mb-1">المحضر المرتبط</label>
                <select value={stlReportId} onChange={(e) => setStlReportId(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg font-bold">
                  {reports.map((r) => (
                    <option key={r.id} value={r.id}>{r.reportNumber} — {r.establishmentName} ({formatArabicCurrency(r.totalFineAmountEgp)})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-black block mb-1">قيمة التصالح المعتمدة (ج.م)</label>
                  <input type="number" value={stlApprovedAmt} onChange={(e) => setStlApprovedAmt(Number(e.target.value))} className="w-full px-3 py-1.5 border rounded-lg font-black" />
                </div>
                <div>
                  <label className="font-black block mb-1">المبلغ المسدد الفعلي (ج.م)</label>
                  <input type="number" value={stlPaidAmt} onChange={(e) => setStlPaidAmt(Number(e.target.value))} className="w-full px-3 py-1.5 border rounded-lg font-black" />
                </div>
              </div>
              <div>
                <label className="font-black block mb-1">رقم إيصال السداد الرسمي (إلزامي لاعتماد السداد)</label>
                <input type="text" value={stlReceiptNo} onChange={(e) => setStlReceiptNo(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg font-black" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddSettlementModal(false)} className="px-4 py-1.5 rounded-xl bg-slate-200 font-black cursor-pointer">إلغاء</button>
              <button type="submit" className="px-4 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] font-black cursor-pointer">حفظ التصالح والإيصال</button>
            </div>
          </form>
        </div>
      )}

      {/* ٦. نافذة تسجيل حركة مضبوطات بقرار موثق */}
      {showAddSeizureMovementModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleCreateSeizureMovement} className="bg-white rounded-2xl border-2 border-[#102A43] max-w-lg w-full p-5 space-y-3 text-xs">
            <h4 className="text-sm font-black text-[#102A43] border-b pb-2">تسجيل حركة في دفتر المضبوطات والتحفظات</h4>
            <div className="space-y-2.5">
              <div>
                <label className="font-black block mb-1">سجل المضبوطات</label>
                <select value={szmSeizureId} onChange={(e) => setSzmSeizureId(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg font-bold">
                  {seizures.map((s) => (
                    <option key={s.id} value={s.id}>{s.seizureNumber} — {s.productName} (الرصيد: {s.currentActualBalance} {s.unit})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-black block mb-1">نوع الحركة</label>
                  <select value={szmType} onChange={(e) => setSzmType(e.target.value as SeizureMovementType)} className="w-full px-3 py-1.5 border rounded-lg font-bold">
                    <option value="الإفراج">الإفراج</option>
                    <option value="الإعدام">الإعدام</option>
                    <option value="التسليم للجهة المختصة">التسليم للجهة المختصة</option>
                    <option value="النقل">النقل</option>
                    <option value="الإضافة">الإضافة</option>
                  </select>
                </div>
                <div>
                  <label className="font-black block mb-1">الكمية</label>
                  <input type="number" value={szmQuantity} onChange={(e) => setSzmQuantity(Number(e.target.value))} className="w-full px-3 py-1.5 border rounded-lg font-black" />
                </div>
              </div>
              <div>
                <label className="font-black block mb-1">رقم وتاريخ قرار النيابة / الجهة المختصة الموثق *</label>
                <input required type="text" value={szmDecisionRef} onChange={(e) => setSzmDecisionRef(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg font-black" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddSeizureMovementModal(false)} className="px-4 py-1.5 rounded-xl bg-slate-200 font-black cursor-pointer">إلغاء</button>
              <button type="submit" className="px-4 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] font-black cursor-pointer">اعتماد الحركة وتحديث الرصيد</button>
            </div>
          </form>
        </div>
      )}

      {/* نافذة محضر جرد ومطابقة المضبوطات والتحفظات */}
      {showInventoryPrintModal && (
        <OfficialPrintModal
          title="محضر جرد ومطابقة المضبوطات والتحفظات التموينية"
          subtitle="مخازن التحفظات التموينية — قسم التجارة الداخلية — إدارة تموين مركز المحلة الكبرى"
          docNumber={`INV-SZ-${todayRef}`}
          printedBy={currentUser.fullName}
          todayRef={todayRef}
          onClose={() => setShowInventoryPrintModal(false)}
        >
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-2 border">رقم المضبوطات</th>
                <th className="p-2 border">رقم المحضر</th>
                <th className="p-2 border">السلعة</th>
                <th className="p-2 border">الكمية الأولية</th>
                <th className="p-2 border">الرصيد الفعلي الحالي</th>
                <th className="p-2 border">مكان التحفظ وأمين العهدة</th>
                <th className="p-2 border">الحالة القانونية</th>
                <th className="p-2 border print:hidden">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {seizures.map((sz) => (
                <tr key={sz.id}>
                  <td className="p-2 border font-black">{sz.seizureNumber}</td>
                  <td className="p-2 border font-bold">{sz.reportNumber}</td>
                  <td className="p-2 border font-bold">{sz.productName}</td>
                  <td className="p-2 border text-center">{formatArabicNumber(sz.initialQuantity)} {sz.unit}</td>
                  <td className="p-2 border text-center font-black">{formatArabicNumber(sz.currentActualBalance)} {sz.unit}</td>
                  <td className="p-2 border">{sz.custodyLocation} ({sz.custodianName})</td>
                  <td className="p-2 border font-bold">{sz.legalStatus}</td>
                  <td className="p-2 border print:hidden">
                    <button
                      type="button"
                      onClick={() => setShowInventoryPrintModal(false)}
                      className="px-2 py-0.5 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer"
                    >
                      عودة للسجل
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </OfficialPrintModal>
      )}

      {/* ٧. نافذة تسجيل رصد أسعار سلعة بالسوق */}
      {showAddPriceObsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleCreatePriceObservation} className="bg-white rounded-2xl border-2 border-[#102A43] max-w-xl w-full p-5 space-y-3 text-xs">
            <h4 className="text-sm font-black text-[#102A43] border-b pb-2">تسجيل رصد أسعار وتوافر السلع بالأسواق</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-black block mb-1">السلعة</label>
                <select value={obsCommodityId} onChange={(e) => setObsCommodityId(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg font-bold">
                  {commodities.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.category})</option>)}
                </select>
              </div>
              <div>
                <label className="font-black block mb-1">اسم السوق والقرية</label>
                <input type="text" value={obsMarketName} onChange={(e) => setObsMarketName(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg font-bold" />
              </div>
              <div>
                <label className="font-black block mb-1">السعر المعلن (ج.م)</label>
                <input type="number" value={obsAnnouncedPrice} onChange={(e) => setObsAnnouncedPrice(Number(e.target.value))} className="w-full px-3 py-1.5 border rounded-lg font-black" />
              </div>
              <div>
                <label className="font-black block mb-1">السعر المرصود فعلياً (ج.م)</label>
                <input type="number" value={obsObservedPrice} onChange={(e) => setObsObservedPrice(Number(e.target.value))} className="w-full px-3 py-1.5 border rounded-lg font-black" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="chk-off-prc" checked={obsHasOfficialPrice} onChange={(e) => setObsHasOfficialPrice(e.target.checked)} />
              <label htmlFor="chk-off-prc" className="font-black text-[#102A43]">السلعة لها سعر رسمي محدد بقرار وزاري سارٍ</label>
            </div>
            {obsHasOfficialPrice && (
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border">
                <div>
                  <label className="font-black block mb-1">السعر الرسمي</label>
                  <input type="number" value={obsOfficialPrice} onChange={(e) => setObsOfficialPrice(Number(e.target.value))} className="w-full px-2 py-1 border rounded font-black bg-white" />
                </div>
                <div>
                  <label className="font-black block mb-1">قرار ومصدر التسعير *</label>
                  <input type="text" value={obsOfficialDecree} onChange={(e) => setObsOfficialDecree(e.target.value)} className="w-full px-2 py-1 border rounded font-bold bg-white" />
                </div>
                <div>
                  <label className="font-black block mb-1">تاريخ السريان *</label>
                  <input type="date" value={obsOfficialDate} onChange={(e) => setObsOfficialDate(e.target.value)} className="w-full px-2 py-1 border rounded font-bold bg-white" />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddPriceObsModal(false)} className="px-4 py-1.5 rounded-xl bg-slate-200 font-black cursor-pointer">إلغاء</button>
              <button type="submit" className="px-4 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] font-black cursor-pointer">حفظ الرصد</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
